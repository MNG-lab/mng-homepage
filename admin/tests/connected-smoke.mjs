import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const server=spawn('npm',['run','admin:preview','--','--port','4193'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let records=[],submissions=0,approvals=0,restores=0,readFailures=1;const sha='a'.repeat(40);let role='owner';let sameSnapshot=false;let previewState='building';
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;const body=req.method()==='POST'?req.postDataJSON():null;
  if(path==='/api/session')return route.fulfill({json:{user:{email:'owner@example.test',role},mode:'github'}});
  if(path==='/api/requests'){
   if(body){submissions++;assert.match(body.requestId,/^[0-9a-f-]{36}$/);records=[{id:123,title:body.title,description:body.description,url:'https://github.com/MNG-lab/mng-homepage/issues/123',state:'open',createdAt:'2026-11-10T01:00:00Z',pull:null}];return route.fulfill({json:{issue:123}});}
   if(readFailures-->0)return route.abort('failed');
   return route.fulfill({json:{requests:records}});
  }
  if(path==='/api/pulls/124')return route.fulfill({json:{head:sha,preview:{head:sha,state:previewState,url:previewState==='ready'?'https://fc3ef735.mng-homepage.pages.dev':null},files:[{path:'src/App.jsx',additions:1,deletions:1,patch:'-old\n+new'}],ci:{status:'completed',conclusion:'success',url:'https://github.com/MNG-lab/mng-homepage/actions'}}});
  if(path==='/api/pulls/124/approve'){approvals++;assert.equal(body.head,sha);records[0].pull.merged=true;records[0].pull.state='closed';records[0].state='closed';return route.fulfill({json:{merged:true}});}
  if(path==='/api/history')return route.fulfill({json:{current:sha,revisions:records.filter(r=>r.pull?.merged).map(r=>({...r.pull,mergeSha:sha,mergedAt:'2026-11-10T02:00:00Z',title:r.title,displayTitle:'이름으로 알아보는 복원 지점'}))}});
  if(path==='/api/history/124')return route.fulfill({json:{source:124,current:sha,target:'b'.repeat(40),changes:sameSnapshot?[]:['src']}});
  if(path==='/api/history/124/restore'){restores++;assert.equal(body.base,sha);assert.ok(body.requestId);return route.fulfill({json:{issue:123}});}
  if(path==='/api/settings')return route.fulfill({json:{role,members:[{email:'owner@example.test',role:'owner',joined:1,active:1}],audit:[],transfer:null}});
  return route.fulfill({status:404,json:{error:'Unexpected test route '+path}});
 });
 await page.goto('http://127.0.0.1:4193/dashboard');await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();await page.getByRole('region',{name:'작업 요약'}).waitFor();await page.getByText('확인을 기다리는 작업이 없습니다.',{exact:true}).waitFor();assert.equal(await page.getByRole('alert').count(),0);
 assert.equal(await page.locator('.auth-session').count(),0);assert.equal(await page.locator('.brand').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true);
 await page.getByRole('button',{name:'수정 요청',exact:true}).click();await page.getByRole('heading',{name:'수정 요청',exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'작업 요약'}).count(),0);
 await page.goBack();await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();await page.goForward();await page.getByRole('heading',{name:'수정 요청',exact:true}).waitFor();
 await page.getByRole('button',{name:'새 수정 요청',exact:true}).click();await page.getByLabel('요청 제목',{exact:true}).fill('Connected test');await page.getByLabel('어떻게 바꾸면 될까요?',{exact:true}).fill('Update Members test content');await page.getByRole('button',{name:'수정 요청 보내기',exact:true}).click();
 await page.waitForURL('**/requests/123');await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();assert.equal(submissions,1);
 await page.reload();await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();
 await page.getByRole('button',{name:'변경 이력',exact:true}).click();await page.getByText('아직 반영된 변경이 없습니다.',{exact:true}).waitFor();assert.equal(await page.getByLabel('요청 검색').count(),0);
 records[0].pull={number:124,head:{sha},state:'open',merged:false,url:'https://github.com/MNG-lab/mng-homepage/pull/124'};
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByText('배포 중',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'변경된 홈페이지 미리보기',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true}).count(),0);
 previewState='failed';await page.getByRole('button',{name:'배포 상태 새로고침',exact:true}).click();await page.getByText('미리보기 배포 실패',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true}).count(),0);
 previewState='ready';await page.getByRole('button',{name:'배포 상태 새로고침',exact:true}).click();await page.getByText('미리보기 준비 완료',{exact:true}).waitFor();const previewLink=page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true});assert.equal(await previewLink.getAttribute('href'),'https://fc3ef735.mng-homepage.pages.dev');assert.equal(await previewLink.getAttribute('target'),'_blank');
 await page.getByRole('button',{name:'이 변경을 테스트 브랜치에 반영',exact:true}).click();assert.equal(approvals,0);await page.getByRole('button',{name:'확인하고 진행',exact:true}).click();await page.getByText('반영 완료',{exact:true}).first().waitFor();assert.equal(approvals,1);
 await page.getByRole('button',{name:'변경 이력',exact:true}).click();await page.getByRole('link',{name:'복원할 시점 확인'}).click();await page.waitForURL('**/history/124');await page.getByRole('heading',{name:'이름으로 알아보는 복원 지점',exact:true}).waitFor();await page.getByRole('button',{name:'이 시점으로 복원 요청'}).click();assert.equal(restores,0);await page.getByRole('button',{name:'복원 요청 만들기'}).click();await page.waitForURL('**/requests/123');assert.equal(restores,1);
 await page.getByRole('button',{name:'수정 요청',exact:true}).click();await page.getByLabel('요청 검색').fill('missing');await page.getByText('조건에 맞는 요청이 없습니다.').waitFor();
 await page.getByRole('button',{name:'설정',exact:true}).click();await page.getByRole('heading',{name:'구성원 관리'}).waitFor();await page.getByRole('heading',{name:'최고 관리자 인수인계'}).waitFor();await page.getByRole('heading',{name:'Codex 인증 갱신'}).waitFor();
 await page.goto('http://127.0.0.1:4193/requests/99999');await page.getByRole('heading',{name:'요청을 찾을 수 없어요'}).waitFor();
 await page.setViewportSize({width:390,height:844});
 for(const route of ['dashboard','requests','history','settings']){await page.goto('http://127.0.0.1:4193/'+route);await page.locator('.connected-main').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile overflow: '+route);}
 await page.screenshot({path:'/private/tmp/mng-settings-mobile.png',fullPage:true});
 sameSnapshot=true;await page.goto('http://127.0.0.1:4193/history/124');await page.getByRole('button',{name:'현재와 같은 상태입니다'}).waitFor();assert.equal(await page.getByRole('button',{name:'현재와 같은 상태입니다'}).isDisabled(),true);
 role='editor';await page.goto('http://127.0.0.1:4193/settings');await page.getByRole('heading',{name:'내 계정과 연결'}).waitFor();assert.equal(await page.getByRole('heading',{name:'구성원 관리'}).count(),0);await page.goto('http://127.0.0.1:4193/history/124');await page.getByText('달라지는 범위:',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'이 시점으로 복원 요청'}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: distinct dashboard/requests/history/settings, routes, back/forward, submission, diff/CI approval confirmation, restoration, search, owner/editor UI, mobile layout, no runtime errors');
} finally {await browser?.close();server.kill('SIGTERM');}
