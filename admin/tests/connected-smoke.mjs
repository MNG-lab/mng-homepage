import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {paginateRequests,requestSummary,listQuery} from '../worker/request-list.js';
const server=spawn('npm',['run','admin:preview','--','--port','4193'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let records=[],submissions=0,approvals=0,restores=0,readFailures=1,delayedNewList=0;const sha='a'.repeat(40);let role='owner';let sameSnapshot=false;let previewState='building';let historyCurrent=sha;let deviceFlow=null;let deviceStarts=0,holdDeviceRead=false,heldDeviceRead,releaseDeviceRead,holdLogin=false,releaseLogin,retries=0;
 let members=[{email:'owner@example.test',role:'owner',joined:1,active:1}],transfer=null,failMemberSave=false;const settingsWrites=[];
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;const body=req.method()==='POST'?req.postDataJSON():null;
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
  if(path==='/api/session'||path==='/api/session/refresh')return route.fulfill({json:{user:{email:'owner@example.test',role},mode:'github'}});
  if(path==='/api/requests'){
   if(body){submissions++;delayedNewList=0;assert.match(body.requestId,/^[0-9a-f-]{36}$/);records=[{id:123,title:body.title,description:body.description,url:'https://github.com/MNG-lab/mng-homepage/issues/123',state:'open',createdAt:'2026-11-10T01:00:00Z',pull:null}];return route.fulfill({json:{issue:123}});}
   if(readFailures-->0)return route.abort('failed');
   const rows=delayedNewList-->0?[]:records;
   return route.fulfill({json:url.searchParams.get('view')==='summary'?requestSummary(rows):paginateRequests(rows,listQuery(url.searchParams))});
  }
  if(/^\/api\/requests\/\d+$/.test(path)){const record=records.find(r=>r.id===Number(path.split('/').at(-1)));return route.fulfill({status:record?200:404,json:record?{request:record}:{error:'요청이 없습니다.'}});}
  if(path==='/api/pulls/124')return route.fulfill({json:{head:sha,preview:{head:sha,state:previewState,url:previewState==='ready'?'https://fc3ef735.mng-homepage.pages.dev':null},files:[{path:'src/App.jsx',additions:1,deletions:1,patch:'-old\n+new'}],ci:{status:'completed',conclusion:'success',url:'https://github.com/MNG-lab/mng-homepage/actions'}}});
  if(path==='/api/pulls/124/approve'){approvals++;assert.equal(body.head,sha);records[0].pull.merged=true;records[0].pull.state='closed';records[0].state='closed';return route.fulfill({json:{merged:true}});}
  if(path==='/api/history')return route.fulfill({json:{current:historyCurrent,revisions:records.filter(r=>r.pull?.merged).map(r=>({...r.pull,mergeSha:sha,requestId:r.id,mergedAt:'2026-11-10T02:00:00Z',title:r.title,displayTitle:'이름으로 알아보는 복원 지점'}))}});
  if(path==='/api/history/124')return route.fulfill({json:{source:124,current:sha,target:'b'.repeat(40),changes:sameSnapshot?[]:['src'],changedPages:['Members'],changesTruncated:false}});
  if(path==='/api/history/124/restore'){restores++;assert.equal(body.base,sha);assert.ok(body.requestId);return route.fulfill({json:{issue:123}});}
  if(path==='/api/settings')return route.fulfill({json:{role,members,audit:[],transfer}});
  if(path==='/api/settings/members'){
   settingsWrites.push({path,body});if(failMemberSave){failMemberSave=false;return route.fulfill({status:502,json:{error:'테스트용 저장 오류'}});}
   const member=members.find(m=>m.email===body.email);if(member)Object.assign(member,body);else members.push({...body,joined:1});return route.fulfill({json:{ok:true}});
  }
  if(path==='/api/settings/transfer'){settingsWrites.push({path,body});transfer={from_email:'owner@example.test',to_email:body.email,expires_at:Date.now()+86400000};return route.fulfill({json:{ok:true}});}
  if(path==='/api/settings/transfer/cancel'){settingsWrites.push({path,body});transfer=null;return route.fulfill({json:{ok:true}});}
  if(path==='/api/settings/transfer/accept'){settingsWrites.push({path,body});transfer=null;role='owner';return route.fulfill({json:{ok:true,reload:true}});}
  return route.fulfill({status:404,json:{error:'Unexpected test route '+path}});
 });
 await page.goto('http://127.0.0.1:4193/dashboard');await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();await page.getByRole('region',{name:'작업 요약'}).waitFor();await page.getByText('확인을 기다리는 작업이 없습니다.',{exact:true}).waitFor();assert.equal(await page.getByRole('alert').count(),0);
 assert.equal(await page.locator('.auth-session').count(),0);assert.equal(await page.locator('.brand').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true);
 await page.getByRole('button',{name:'요청 관리',exact:true}).click();await page.getByRole('heading',{name:'요청 관리',exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'작업 요약'}).count(),0);
 await page.goBack();await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();await page.goForward();await page.getByRole('heading',{name:'요청 관리',exact:true}).waitFor();
 await page.getByRole('button',{name:'새 수정 요청',exact:true}).click();await page.getByLabel('요청 제목',{exact:true}).fill('Connected test');await page.getByLabel('어떻게 바꾸면 될까요?',{exact:true}).fill('Update Members test content');await page.getByRole('button',{name:'수정 요청 보내기',exact:true}).click();
 await page.waitForURL('**/requests/123');await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();assert.equal(submissions,1);
 await page.reload();await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();
 await page.getByRole('button',{name:'홈페이지 버전',exact:true}).click();await page.getByText('아직 반영된 버전이 없습니다.',{exact:true}).waitFor();assert.equal(await page.getByLabel('요청 검색').count(),0);
 records[0].pull={number:124,head:{sha},state:'open',merged:false,url:'https://github.com/MNG-lab/mng-homepage/pull/124'};
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByText('배포 중',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'변경된 홈페이지 미리보기',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true}).count(),0);
 previewState='failed';await page.getByRole('button',{name:'배포 상태 새로고침',exact:true}).click();await page.getByText('미리보기 배포 실패',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true}).count(),0);
 previewState='ready';await page.getByRole('button',{name:'배포 상태 새로고침',exact:true}).click();await page.getByText('미리보기 준비 완료',{exact:true}).waitFor();const previewLink=page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true});assert.equal(await previewLink.getAttribute('href'),'https://fc3ef735.mng-homepage.pages.dev');assert.equal(await previewLink.getAttribute('target'),'_blank');
 await page.getByRole('button',{name:'이 변경을 테스트 브랜치에 반영',exact:true}).click();assert.equal(approvals,0);await page.getByRole('button',{name:'확인하고 진행',exact:true}).click();await page.getByText('수정 반영 완료',{exact:true}).first().waitFor();assert.equal(approvals,1);
 await page.getByRole('button',{name:'홈페이지 버전',exact:true}).click();await page.getByText('현재 버전',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).count(),0);await page.getByRole('link',{name:'현재 버전 보기',exact:true}).click();await page.getByRole('heading',{name:'이 버전에서 반영한 변경',exact:true}).waitFor();assert.equal(restores,0);
 await page.getByRole('link',{name:'관련 요청 보기 →',exact:true}).click();await page.waitForURL('**/requests/123?tab=past');await page.getByRole('link',{name:'반영된 버전 보기',exact:true}).waitFor();
 await page.getByRole('link',{name:'목록으로 돌아가기',exact:true}).click();await page.waitForURL('**/requests?tab=past');await page.getByRole('link',{name:'반영된 버전 보기 →',exact:true}).waitFor();
 await page.getByRole('button',{name:/^처리 중/}).click();await page.getByText('지금 처리할 요청이 없습니다. 완료된 작업은 지난 요청에서 확인하세요.').waitFor();
 await page.goBack();await page.getByRole('link',{name:'반영된 버전 보기 →',exact:true}).waitFor();
 await page.getByRole('link',{name:'반영된 버전 보기 →',exact:true}).click();await page.getByRole('link',{name:'← 홈페이지 버전 목록',exact:true}).click();
 historyCurrent='c'.repeat(40);await page.getByRole('button',{name:'새로고침',exact:true}).click();await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).click();await page.waitForURL('**/history/124#restore');await page.getByText('이름으로 알아보는 복원 지점',{exact:true}).waitFor();await page.getByRole('button',{name:'이 버전으로 되돌리기 요청'}).click();assert.equal(restores,0);await page.getByRole('button',{name:'되돌리기 요청 만들기'}).click();await page.waitForURL('**/requests/123');assert.equal(restores,1);
 records[0].restoration={number:120,name:'Members 소개 수정',mergedAt:'2026-11-09T01:00:00Z'};records[0].pull.restoration=records[0].restoration;
 await page.goto('http://127.0.0.1:4193/dashboard');await page.getByText('되돌리기 완료',{exact:true}).waitFor();await page.getByText('이전 버전으로 되돌리기',{exact:true}).waitFor();
 await page.getByRole('button',{name:'홈페이지 버전',exact:true}).click();await page.getByText('이전 버전으로 되돌림',{exact:true}).waitFor();await page.getByText('‘Members 소개 수정’ 버전으로 되돌렸습니다',{exact:true}).waitFor();await page.getByRole('link',{name:'해당 버전 보기 →',exact:true}).waitFor();

 await page.getByRole('button',{name:'요청 관리',exact:true}).click();await page.getByLabel('요청 검색').fill('missing');await page.getByText('조건에 맞는 요청이 없습니다.').waitFor();
 // 47 records: status/search are applied by the server before slicing.
 records=Array.from({length:47},(_,i)=>({id:1000-i,title:`Members 수정 ${i+1}`,description:'검색 본문',state:'open',createdAt:new Date(Date.UTC(2026,10,10,0,0,47-i)).toISOString(),run:i<42?{id:1000-i,attempt:1,status:'completed',conclusion:'failure'}:null}));
 await page.goto('http://127.0.0.1:4193/requests?status=failed&q=Members&page=2');
 await page.getByRole('navigation',{name:'요청 목록 페이지'}).locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();
 assert.equal(await page.locator('.connected-list>li').count(),20);
 assert.equal(await page.getByLabel('요청 검색').inputValue(),'Members');
 assert.equal(await page.getByLabel('상태',{exact:true}).inputValue(),'failed');
 await page.locator('.connected-list>li a').first().click();await page.waitForURL('**/requests/980?**');
 await page.reload();await page.getByRole('heading',{name:'Members 수정 21',exact:true}).waitFor();
 await page.getByRole('link',{name:'목록으로 돌아가기',exact:true}).click();
 await page.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.match(page.url(),/page=2/);
 const pager=page.getByRole('navigation',{name:'요청 목록 페이지'});
 await pager.getByRole('button',{name:'3페이지',exact:true}).click();await pager.locator('button[aria-current="page"]').filter({hasText:/^3$/}).waitFor();
 assert.equal(await page.locator('.connected-list>li').count(),2);assert.equal(await pager.getByRole('button',{name:'다음'}).isDisabled(),true);
 await page.goBack();await pager.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();await page.reload();await pager.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();
 await page.getByLabel('요청 검색').fill('검색 본문');await page.waitForURL('**q=**');
 await pager.locator('button[aria-current="page"]').filter({hasText:/^1$/}).waitFor();assert.equal(new URL(page.url()).searchParams.get('q'),'검색 본문');
 await page.getByLabel('상태',{exact:true}).selectOption('working');await pager.locator('button[aria-current="page"]').filter({hasText:/^1$/}).waitFor();assert.equal(await page.locator('.connected-list>li').count(),5);
 assert.equal(new URL(page.url()).searchParams.get('q'),'검색 본문');
 await page.goto('http://127.0.0.1:4193/requests?page=999');await page.waitForURL('**page=3');await pager.locator('button[aria-current="page"]').filter({hasText:/^3$/}).waitFor();
 const activeRecords=records;
 records=[...activeRecords,...Array.from({length:25},(_,i)=>({id:2000+i,title:`Members 지난 요청 ${i+1}`,description:'검색 본문',state:'closed',pull:{number:3000+i,merged:true,state:'closed'}}))];
 await page.goto('http://127.0.0.1:4193/requests?q=Members');await page.locator('button[aria-current="page"]').filter({hasText:/^1$/}).waitFor();
 await page.getByRole('button',{name:/^지난 요청/}).click();await page.locator('button[aria-current="page"]').filter({hasText:/^1$/}).waitFor();assert.equal(new URL(page.url()).searchParams.get('q'),'Members');
 await pager.getByRole('button',{name:'다음',exact:true}).click();await page.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await page.locator('.managed-requests>li').count(),5);
 await page.reload();await page.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await page.getByRole('button',{name:/^지난 요청/}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:/^처리 중/}).click();await page.locator('button[aria-current="page"]').filter({hasText:/^1$/}).waitFor();await page.goBack();await page.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();
 records=activeRecords;
 await page.goto('http://127.0.0.1:4193/dashboard');await page.locator('.stat-card').filter({hasText:'확인이 필요한 실패'}).getByText('42',{exact:false}).waitFor();assert.equal(await page.locator('.connected-list').first().locator('li').count(),5);
 records=records.map((r,i)=>({...r,auth:i<25?{renewed:false}:null,run:{id:r.id,attempt:1,status:'completed',conclusion:'failure'}}));
 await page.goto('http://127.0.0.1:4193/settings?recovery_page=2#codex-connection');
 const recoveryPager=page.getByRole('navigation',{name:'인증 문제로 멈춘 요청 페이지'});
 await recoveryPager.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await page.locator('.recovery-requests li').count(),3);
 const recoveryRecords=records.filter(r=>r.auth).slice(0,4);
 records=recoveryRecords;await page.goto('http://127.0.0.1:4193/settings#codex-connection');
 await recoveryPager.getByRole('button',{name:'2페이지',exact:true}).click();await recoveryPager.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await page.locator('.recovery-requests li').count(),1);
 await page.reload();await recoveryPager.locator('button[aria-current="page"]').filter({hasText:/^2$/}).waitFor();
 records=recoveryRecords.slice(0,3);await page.reload();await page.waitForURL('**/settings#codex-connection');await page.locator('.recovery-requests li').nth(2).waitFor();assert.equal(await recoveryPager.count(),0);
 records=[];await page.reload();await page.getByText('현재 인증 문제로 멈춘 요청이 없습니다.',{exact:true}).waitFor();assert.equal(await recoveryPager.count(),0);
 assert.equal(await page.getByText('연결 상태는 5초, 요청 목록은 30초마다 확인합니다.',{exact:false}).count(),0);
 deviceFlow={id:'previous-login',kind:'login',state:'connected',code:null};
 records=[{id:123,title:'중단된 Members 수정',state:'open',description:'기존 요청',run:{id:100,attempt:1,status:'completed',conclusion:'failure'},auth:{renewed:false}}];
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByRole('link',{name:'Codex 다시 연결하러 가기'}).click();
 await page.getByRole('heading',{name:'구성원 관리'}).waitFor();await page.getByRole('heading',{name:'Codex 연결',exact:true}).waitFor();
 await page.getByText('Codex를 다시 연결해 주세요',{exact:true}).waitFor();
 assert.equal(await page.getByText('Codex 재연결 완료',{exact:true}).count(),0);
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
 await page.getByRole('heading',{name:'Codex 연결',exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Codex 인증 갱신',exact:true}).count(),0);assert.equal(await page.locator('input[type="file"]').count(),0);
 assert.equal(await page.getByRole('button',{name:'구성원 저장',exact:true}).evaluate(el=>{const button=el.getBoundingClientRect(),select=el.closest('form').querySelector('select').getBoundingClientRect();return button.top-select.bottom>=20;}),true);


 // Settings confirmations and results stay beside their controls; writes still require confirmation.
 const memberForm=page.getByRole('region',{name:'구성원 추가·수정',exact:true});
 await memberForm.getByLabel('Google 계정',{exact:true}).fill('next@gmail.com');await memberForm.getByLabel('권한',{exact:true}).selectOption('admin');
 await memberForm.getByRole('button',{name:'구성원 저장',exact:true}).click();assert.equal(settingsWrites.length,0);
 await memberForm.getByRole('dialog').getByRole('button',{name:'취소',exact:true}).click();assert.equal(settingsWrites.length,0);
 await memberForm.getByRole('button',{name:'구성원 저장',exact:true}).click();failMemberSave=true;
 await memberForm.getByRole('dialog').getByRole('button',{name:'확인하고 저장',exact:true}).click();await memberForm.getByRole('alert').filter({hasText:'테스트용 저장 오류'}).waitFor();assert.equal(settingsWrites.length,1);
 await memberForm.getByRole('dialog').getByRole('button',{name:'확인하고 저장',exact:true}).click();await memberForm.getByRole('status').filter({hasText:'구성원 정보를 저장했습니다.'}).waitFor();assert.deepEqual(settingsWrites.at(-1).body,{email:'next@gmail.com',role:'admin',active:true});
 const memberList=page.getByRole('region',{name:'등록된 구성원',exact:true}),memberRow=memberList.locator('li').filter({hasText:'next@gmail.com'});
 await memberRow.getByRole('button',{name:'권한 수정',exact:true}).click();assert.equal(await memberForm.getByLabel('Google 계정',{exact:true}).inputValue(),'next@gmail.com');assert.equal(await memberForm.getByLabel('권한',{exact:true}).inputValue(),'admin');
 await memberRow.getByRole('button',{name:'접근 중지',exact:true}).click();assert.equal(settingsWrites.length,2);
 await memberList.getByRole('dialog').getByRole('button',{name:'접근 중지',exact:true}).click();await memberList.getByRole('status').filter({hasText:'접근을 중지했습니다.'}).waitFor();assert.equal(settingsWrites.at(-1).body.active,false);
 await memberRow.getByRole('button',{name:'다시 허용',exact:true}).click();assert.equal(settingsWrites.length,3);await memberList.getByRole('dialog').getByRole('button',{name:'접근 허용',exact:true}).click();await memberList.getByRole('status').filter({hasText:'접근을 다시 허용했습니다.'}).waitFor();assert.equal(settingsWrites.at(-1).body.active,true);
 const transferPanel=page.getByRole('region',{name:'최고 관리자 변경',exact:true});
 await transferPanel.getByLabel('후임 담당자',{exact:true}).selectOption('next@gmail.com');await transferPanel.getByRole('button',{name:'최고 관리자 변경 요청',exact:true}).click();assert.equal(settingsWrites.length,4);
 await transferPanel.getByRole('dialog').getByRole('button',{name:'확인하고 요청',exact:true}).click();await transferPanel.getByRole('heading',{name:'후임자의 수락을 기다리고 있습니다',exact:true}).waitFor();assert.equal(settingsWrites.at(-1).body.email,'next@gmail.com');
 await transferPanel.getByRole('button',{name:'변경 요청 취소',exact:true}).click();await transferPanel.getByRole('status').filter({hasText:'최고 관리자 변경 요청을 취소했습니다.'}).waitFor();assert.equal(settingsWrites.at(-1).path,'/api/settings/transfer/cancel');

 await page.goto('http://127.0.0.1:4193/requests/99999');await page.getByRole('heading',{name:'요청을 찾을 수 없어요'}).waitFor();
 await page.setViewportSize({width:390,height:844});
 for(const route of ['dashboard','requests','history','settings']){await page.goto('http://127.0.0.1:4193/'+route);await page.locator('.connected-main').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile overflow: '+route);}
 await page.screenshot({path:'/private/tmp/mng-settings-mobile.png',fullPage:true});
 sameSnapshot=true;await page.goto('http://127.0.0.1:4193/history/124');await page.getByRole('button',{name:'현재와 같은 상태입니다'}).waitFor();assert.equal(await page.getByRole('button',{name:'현재와 같은 상태입니다'}).isDisabled(),true);
 role='editor';transfer={from_email:'previous@gmail.com',to_email:'owner@example.test',expires_at:Date.now()+86400000};await page.goto('http://127.0.0.1:4193/settings');
 const incoming=page.getByRole('region',{name:'최고 관리자 변경 요청',exact:true});await incoming.getByRole('button',{name:'최고 관리자 역할 수락',exact:true}).click();assert.equal(settingsWrites.length,6);assert.equal(await page.getByRole('heading',{name:'구성원 관리',exact:true}).count(),0);
 await incoming.getByRole('dialog').getByRole('button',{name:'확인하고 수락',exact:true}).click();await page.getByRole('heading',{name:'구성원 관리',exact:true}).waitFor();assert.equal(settingsWrites.at(-1).path,'/api/settings/transfer/accept');
 role='editor';await page.goto('http://127.0.0.1:4193/settings');await page.getByRole('heading',{name:'로그인 정보'}).waitFor();assert.equal(await page.getByRole('heading',{name:'구성원 관리'}).count(),0);await page.goto('http://127.0.0.1:4193/history/124');await page.getByText('되돌리면 달라지는 범위:',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'이 버전으로 되돌리기 요청'}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: distinct dashboard/requests/history/settings, routes, back/forward, submission, diff/CI approval confirmation, restoration, server pagination, URL search/status/back/reload, old detail links, independent summaries/recovery pages, scoped settings confirmation/error/success, member access and ownership offer/cancel/accept, owner/editor UI, mobile layout, no runtime errors');
} finally {await browser?.close();server.kill('SIGTERM');}
