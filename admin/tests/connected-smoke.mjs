import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const server=spawn('npm',['run','admin:preview','--','--port','4193'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let records=[],submissions=0,approvals=0,restores=0,readFailures=1;const sha='a'.repeat(40);let role='owner';let sameSnapshot=false;let previewState='building';let historyCurrent=sha;let deviceFlow=null;let deviceStarts=0,holdDeviceRead=false,heldDeviceRead,releaseDeviceRead,holdLogin=false,releaseLogin,retries=0;
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;const body=req.method()==='POST'?req.postDataJSON():null;
  if(path==='/api/settings/device-login'){
   const captured=structuredClone(deviceFlow);
   if(holdDeviceRead){holdDeviceRead=false;heldDeviceRead=true;await new Promise(resolve=>{releaseDeviceRead=resolve;});}
   return route.fulfill({json:{flow:captured}});
  }
  if(path==='/api/settings/device-login/start'){
   deviceStarts++;
   if(body.kind==='login'&&holdLogin)await new Promise(resolve=>{releaseLogin=resolve;});
   deviceFlow={id:'mock-'+deviceStarts,kind:body.kind,state:body.kind==='simulate'?'auth_required':body.kind==='login'?'queued':'completed',code:null};return route.fulfill({json:{ok:true,id:deviceFlow.id}});
  }
  if(path==='/api/requests/123/retry'){retries++;assert.ok(body.requestId);records[0].retry={state:'pending'};return route.fulfill({json:{issue:123}});}
  if(path==='/api/session')return route.fulfill({json:{user:{email:'owner@example.test',role},mode:'github'}});
  if(path==='/api/requests'){
   if(body){submissions++;assert.match(body.requestId,/^[0-9a-f-]{36}$/);records=[{id:123,title:body.title,description:body.description,url:'https://github.com/MNG-lab/mng-homepage/issues/123',state:'open',createdAt:'2026-11-10T01:00:00Z',pull:null}];return route.fulfill({json:{issue:123}});}
   if(readFailures-->0)return route.abort('failed');
   return route.fulfill({json:{requests:records}});
  }
  if(path==='/api/pulls/124')return route.fulfill({json:{head:sha,preview:{head:sha,state:previewState,url:previewState==='ready'?'https://fc3ef735.mng-homepage.pages.dev':null},files:[{path:'src/App.jsx',additions:1,deletions:1,patch:'-old\n+new'}],ci:{status:'completed',conclusion:'success',url:'https://github.com/MNG-lab/mng-homepage/actions'}}});
  if(path==='/api/pulls/124/approve'){approvals++;assert.equal(body.head,sha);records[0].pull.merged=true;records[0].pull.state='closed';records[0].state='closed';return route.fulfill({json:{merged:true}});}
  if(path==='/api/history')return route.fulfill({json:{current:historyCurrent,revisions:records.filter(r=>r.pull?.merged).map(r=>({...r.pull,mergeSha:sha,mergedAt:'2026-11-10T02:00:00Z',title:r.title,displayTitle:'이름으로 알아보는 복원 지점'}))}});
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
 await page.getByRole('button',{name:'이 변경을 테스트 브랜치에 반영',exact:true}).click();assert.equal(approvals,0);await page.getByRole('button',{name:'확인하고 진행',exact:true}).click();await page.getByText('수정 반영 완료',{exact:true}).first().waitFor();assert.equal(approvals,1);
 await page.getByRole('button',{name:'변경 이력',exact:true}).click();await page.getByText('현재 버전',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).count(),0);historyCurrent='c'.repeat(40);await page.getByRole('button',{name:'새로고침',exact:true}).click();await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).click();await page.waitForURL('**/history/124');await page.getByRole('heading',{name:'이름으로 알아보는 복원 지점',exact:true}).waitFor();await page.getByRole('button',{name:'이 버전으로 되돌리기 요청'}).click();assert.equal(restores,0);await page.getByRole('button',{name:'되돌리기 요청 만들기'}).click();await page.waitForURL('**/requests/123');assert.equal(restores,1);
 records[0].restoration={number:120,name:'Members 소개 수정',mergedAt:'2026-11-09T01:00:00Z'};records[0].pull.restoration=records[0].restoration;
 await page.goto('http://127.0.0.1:4193/dashboard');await page.getByText('되돌리기 완료',{exact:true}).waitFor();await page.getByText('이전 버전으로 되돌리기',{exact:true}).waitFor();
 await page.getByRole('button',{name:'변경 이력',exact:true}).click();await page.getByText('이전 버전으로 되돌림',{exact:true}).waitFor();await page.getByText('‘Members 소개 수정’ 버전으로 되돌렸습니다',{exact:true}).waitFor();await page.getByRole('link',{name:'해당 버전 보기 →',exact:true}).waitFor();

 await page.getByRole('button',{name:'수정 요청',exact:true}).click();await page.getByLabel('요청 검색').fill('missing');await page.getByText('조건에 맞는 요청이 없습니다.').waitFor();
 records=[{id:123,title:'중단된 Members 수정',state:'open',description:'기존 요청',run:{id:100,attempt:1,status:'completed',conclusion:'failure'},auth:{renewed:false}}];
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByRole('link',{name:'Codex 다시 연결하러 가기'}).click();
 await page.getByRole('heading',{name:'구성원 관리'}).waitFor();await page.getByRole('heading',{name:'Codex 연결',exact:true}).waitFor();
 await page.getByText('Codex를 연결할 수 있습니다',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'인증 만료 상황 체험하기'}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Codex 다시 연결',exact:true}).isDisabled(),true);
 await page.getByRole('checkbox').check();
 holdDeviceRead=true;heldDeviceRead=false;await page.getByRole('button',{name:'상태 새로고침',exact:true}).click();
 for(let i=0;i<100&&!heldDeviceRead;i++)await new Promise(r=>setTimeout(r,20));assert.equal(heldDeviceRead,true);
 holdLogin=true;await page.getByRole('button',{name:'Codex 다시 연결',exact:true}).click();
 const busyLogin=page.getByRole('button',{name:'연결 요청 중…',exact:true});await busyLogin.waitFor();assert.equal(await busyLogin.getAttribute('aria-busy'),'true');assert.equal(await busyLogin.locator('.spinner').count(),1);assert.equal(await busyLogin.isDisabled(),true);
 for(let i=0;i<100&&!releaseLogin;i++)await new Promise(r=>setTimeout(r,20));assert.ok(releaseLogin);releaseLogin();
 await page.getByText('작업을 준비하고 있습니다',{exact:true}).waitFor();
 releaseDeviceRead();await new Promise(r=>setTimeout(r,150));assert.equal(await page.getByText('작업을 준비하고 있습니다',{exact:true}).count(),1,'stale read must not replace post-submit state');
 deviceFlow={...deviceFlow,state:'waiting',code:'ABCD-12345'};await page.getByText('ABCD-12345',{exact:true}).waitFor({timeout:10000});

 assert.equal(await page.getByRole('link',{name:'OpenAI에서 로그인하기 ↗',exact:true}).getAttribute('href'),'https://auth.openai.com/codex/device');
 records[0].auth.renewed=true;
 deviceFlow={...deviceFlow,state:'connected',code:null};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('Codex 재연결 완료',{exact:true}).waitFor();
 await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).click();
 await page.getByText('현재 인증 문제로 멈춘 요청이 없습니다.',{exact:true}).waitFor();assert.equal(retries,1);assert.equal(deviceStarts,1);
 assert.equal(await page.locator('#codex-connection .connection-state').evaluate(el=>{const actions=document.querySelector('.connection-actions').getBoundingClientRect();return el.getBoundingClientRect().top>=actions.bottom&&el.classList.contains('is-success');}),true);
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByText('재실행 접수됨',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).count(),0);
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('button',{name:'Windows',exact:true}).click();await page.getByText('%USERPROFILE%\\.codex\\auth.json',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Mac',exact:true}).click();await page.getByText('~/.codex/auth.json',{exact:true}).waitFor();
 await page.getByText('파일이 없거나 다시 로그인해야 하나요?',{exact:true}).click();await page.getByRole('button',{name:'로그인 명령 복사',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'구성원 저장',exact:true}).evaluate(el=>{const button=el.getBoundingClientRect(),select=el.closest('form').querySelector('select').getBoundingClientRect();return button.top-select.bottom>=20;}),true);

 await page.goto('http://127.0.0.1:4193/requests/99999');await page.getByRole('heading',{name:'요청을 찾을 수 없어요'}).waitFor();
 await page.setViewportSize({width:390,height:844});
 for(const route of ['dashboard','requests','history','settings']){await page.goto('http://127.0.0.1:4193/'+route);await page.locator('.connected-main').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile overflow: '+route);}
 await page.screenshot({path:'/private/tmp/mng-settings-mobile.png',fullPage:true});
 sameSnapshot=true;await page.goto('http://127.0.0.1:4193/history/124');await page.getByRole('button',{name:'현재와 같은 상태입니다'}).waitFor();assert.equal(await page.getByRole('button',{name:'현재와 같은 상태입니다'}).isDisabled(),true);
 role='editor';await page.goto('http://127.0.0.1:4193/settings');await page.getByRole('heading',{name:'로그인 정보'}).waitFor();assert.equal(await page.getByRole('heading',{name:'구성원 관리'}).count(),0);await page.goto('http://127.0.0.1:4193/history/124');await page.getByText('달라지는 범위:',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'이 버전으로 되돌리기 요청'}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: distinct dashboard/requests/history/settings, routes, back/forward, submission, diff/CI approval confirmation, restoration, search, owner/editor UI, mobile layout, no runtime errors');
} finally {await browser?.close();server.kill('SIGTERM');}
