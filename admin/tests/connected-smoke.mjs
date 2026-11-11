import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {paginateRequests,requestSummary,listQuery} from '../worker/request-list.js';
import {paginateHistory,historyPage} from '../worker/history-list.js';
const server=spawn('npm',['run','admin:preview','--','--port','4193'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let records=[],submissions=0,approvals=0,restores=0,readFailures=1,delayedNewList=0;const sha='a'.repeat(40);let role='owner';let sameSnapshot=false;let previewState='building';let historyCurrent=sha;let deviceFlow=null;let deviceStarts=0,holdDeviceRead=false,heldDeviceRead,releaseDeviceRead,holdLogin=false,releaseLogin,retries=0;
 let requestListReads=0,requestFailures=0,holdRequestRead=false,heldRequestRead=false,releaseRequestRead;
 let historyRows=null,historyFailures=0,holdHistoryPage=null,releaseHistory,heldHistory=false;
 const knownRevisions=new Map();
 function historyRevisions(){const rows=historyRows||records.filter(r=>r.pull?.merged).map(r=>({...r.pull,mergeSha:sha,requestId:r.id,mergedAt:'2026-11-10T02:00:00Z',title:r.title,displayTitle:'이름으로 알아보는 복원 지점'}));for(const r of rows)knownRevisions.set(r.number,r);return rows;}
 let members=[{email:'owner@example.test',role:'owner',joined:1,active:1}],transfer=null,failMemberSave=false;const settingsWrites=[];
 let auditRecords=[],auditFailures=0,holdAuditPage=null,releaseAudit,heldAudit=false;
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
   const list=url.searchParams.get('view')!=='summary';if(list)requestListReads++;
   if(readFailures-->0)return route.abort('failed');
   if(list&&requestFailures-->0)return route.fulfill({status:503,json:{error:'요청 조회 오류'}});
   const rows=delayedNewList-->0?[]:records,json=list?paginateRequests(rows,listQuery(url.searchParams)):requestSummary(rows);
   if(list&&holdRequestRead){holdRequestRead=false;heldRequestRead=true;await new Promise(resolve=>{releaseRequestRead=resolve;});}
   return route.fulfill({json});
  }
  if(/^\/api\/requests\/\d+$/.test(path)){const record=records.find(r=>r.id===Number(path.split('/').at(-1)));return route.fulfill({status:record?200:404,json:record?{request:record}:{error:'요청이 없습니다.'}});}
  if(path==='/api/pulls/124')return route.fulfill({json:{head:sha,preview:{head:sha,state:previewState,url:previewState==='ready'?'https://fc3ef735.mng-homepage.pages.dev':null},files:[{path:'src/App.jsx',additions:1,deletions:1,patch:'-old\n+new'}],ci:{status:'completed',conclusion:'success',url:'https://github.com/MNG-lab/mng-homepage/actions'}}});
  if(path==='/api/pulls/124/approve'){approvals++;assert.equal(body.head,sha);records[0].pull.merged=true;records[0].pull.state='closed';records[0].state='closed';return route.fulfill({json:{merged:true}});}
  if(path==='/api/history'){
   if(historyFailures-->0)return route.fulfill({status:503,json:{error:'버전 조회 오류'}});
   const value=paginateHistory({current:historyCurrent,revisions:historyRevisions()},historyPage(url.searchParams));
   if(value.pagination.page===holdHistoryPage){holdHistoryPage=null;heldHistory=true;await new Promise(resolve=>{releaseHistory=resolve;});}
   return route.fulfill({json:value});
  }
  if(/^\/api\/history\/\d+$/.test(path)){
   historyRevisions();const id=Number(path.split('/').at(-1)),revision=knownRevisions.get(id);
   return route.fulfill({status:revision?200:404,json:revision?{revision,source:id,current:sha,target:'b'.repeat(40),changes:sameSnapshot?[]:['src'],changedPages:['Members'],changesTruncated:false}:{error:'버전이 없습니다.'}});
  }
  if(/^\/api\/history\/\d+\/restore$/.test(path)){restores++;assert.equal(body.base,sha);assert.ok(body.requestId);return route.fulfill({json:{issue:123}});}
  if(path==='/api/settings')return route.fulfill({json:{role,members,transfer}});
  if(path==='/api/settings/audit'){
   if(auditFailures-->0)return route.fulfill({status:503,json:{error:'관리 기록 조회 오류'}});
   const pages=Math.max(1,Math.ceil(auditRecords.length/5)),page=Math.min(Number(url.searchParams.get('page')||'1'),pages),json={records:auditRecords.slice((page-1)*5,page*5),pagination:{page,pageSize:5,total:auditRecords.length,pages}};
   if(page===holdAuditPage){holdAuditPage=null;heldAudit=true;await new Promise(resolve=>{releaseAudit=resolve;});}
   return route.fulfill({json});
  }
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
 // Manual refresh gives immediate local feedback and retains the current list.
 records=[{id:999,title:'새로고침 확인용 요청',state:'open',description:'내용 유지',createdAt:'2026-11-10T01:00:00Z'}];
 await page.goto('http://127.0.0.1:4193/requests');await page.getByText('새로고침 확인용 요청',{exact:true}).waitFor();
 const refreshControl=page.locator('.refresh-button'),refreshStatus=page.locator('.refresh-announcement');
 assert.equal(await refreshStatus.getAttribute('role'),'status');assert.equal(await refreshStatus.innerText(),'');
 const width=(await refreshControl.boundingBox()).width,reads=requestListReads;
 holdRequestRead=true;heldRequestRead=false;await refreshControl.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'새로고침 중…',exact:true}).waitFor();assert.equal(await refreshControl.isDisabled(),true);assert.equal(await refreshControl.getAttribute('aria-busy'),'true');assert.equal(await refreshControl.locator('.spinner').count(),1);
 await refreshStatus.getByText('요청 목록을 새로고침하고 있습니다.',{exact:true}).waitFor();assert.equal(await page.getByText('새로고침 확인용 요청',{exact:true}).count(),1);assert.equal((await refreshControl.boundingBox()).width,width);
 await page.keyboard.press('Enter');await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await new Promise(r=>setTimeout(r,100));assert.equal(requestListReads,reads+1);assert.equal(heldRequestRead,true);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await refreshControl.locator('.spinner').evaluate(el=>getComputedStyle(el).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
 releaseRequestRead();await page.getByRole('button',{name:'새로고침 완료',exact:true}).waitFor();assert.equal(await refreshControl.isDisabled(),false);assert.equal(await refreshControl.getAttribute('aria-busy'),'false');assert.equal((await refreshControl.boundingBox()).width,width);assert.equal(await refreshStatus.innerText(),'요청 목록을 새로고침했습니다.');
 await page.getByRole('button',{name:'새로고침',exact:true}).waitFor();
 // Automatic polling stays quiet; a click during its read shares the result.
 holdRequestRead=true;heldRequestRead=false;const beforeAuto=requestListReads;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 for(let i=0;i<100&&!heldRequestRead;i++)await new Promise(r=>setTimeout(r,20));assert.equal(heldRequestRead,true);assert.equal(await refreshControl.innerText(),'새로고침');assert.equal(await refreshStatus.innerText(),'');
 await refreshControl.click();await page.getByRole('button',{name:'새로고침 중…',exact:true}).waitFor();assert.equal(requestListReads,beforeAuto+1);releaseRequestRead();await page.getByRole('button',{name:'새로고침 완료',exact:true}).waitFor();
 requestFailures=2;await refreshControl.click();await page.getByRole('button',{name:'새로고침 재시도',exact:true}).waitFor();await page.getByRole('alert').filter({hasText:'요청 조회 오류'}).waitFor();assert.equal(await page.getByText('새로고침 확인용 요청',{exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'새로고침 완료',exact:true}).count(),0);
 await refreshControl.click();await page.getByRole('button',{name:'새로고침 완료',exact:true}).waitFor();assert.equal(await page.getByRole('alert').count(),0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'refresh button mobile overflow');await page.setViewportSize({width:1440,height:1000});
 // A late result from another tab/filter cannot show a success notice in this one.
 holdRequestRead=true;heldRequestRead=false;await refreshControl.click();for(let i=0;i<100&&!heldRequestRead;i++)await new Promise(r=>setTimeout(r,20));assert.equal(heldRequestRead,true);
 await page.getByRole('button',{name:/^지난 요청/}).click();await page.getByText('아직 지난 요청이 없습니다.',{exact:true}).waitFor();releaseRequestRead();await new Promise(r=>setTimeout(r,100));assert.equal(await refreshControl.innerText(),'새로고침');assert.equal(await refreshStatus.innerText(),'');
 records=[];await page.goto('http://127.0.0.1:4193/requests');await page.getByText('지금 처리할 요청이 없습니다. 완료된 작업은 지난 요청에서 확인하세요.').waitFor();
 await page.getByRole('button',{name:'새 수정 요청',exact:true}).click();await page.getByLabel('요청 제목',{exact:true}).fill('Connected test');await page.getByLabel('어떻게 바꾸면 될까요?',{exact:true}).fill('Update Members test content');await page.getByRole('button',{name:'수정 요청 보내기',exact:true}).click();
 await page.waitForURL('**/requests/123');await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();assert.equal(submissions,1);
 await page.reload();await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();
 await page.getByRole('button',{name:'홈페이지 버전',exact:true}).click();await page.getByText('아직 반영된 버전이 없습니다.',{exact:true}).waitFor();assert.equal(await page.getByLabel('요청 검색').count(),0);
 records[0].pull={number:124,head:{sha},state:'open',merged:false,url:'https://github.com/MNG-lab/mng-homepage/pull/124'};
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByText('배포 중',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'변경된 홈페이지 미리보기',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true}).count(),0);
 assert.equal(await page.locator('.request-version-note').count(),0);
 previewState='failed';await page.getByRole('button',{name:'배포 상태 새로고침',exact:true}).click();await page.getByText('미리보기 배포 실패',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true}).count(),0);
 previewState='ready';await page.getByRole('button',{name:'배포 상태 새로고침',exact:true}).click();await page.getByText('미리보기 준비 완료',{exact:true}).waitFor();const previewLink=page.getByRole('link',{name:'변경된 홈페이지 미리보기 ↗',exact:true});assert.equal(await previewLink.getAttribute('href'),'https://fc3ef735.mng-homepage.pages.dev');assert.equal(await previewLink.getAttribute('target'),'_blank');
 await page.getByRole('button',{name:'이 변경을 테스트 브랜치에 반영',exact:true}).click();assert.equal(approvals,0);await page.getByRole('button',{name:'확인하고 진행',exact:true}).click();await page.getByText('수정 반영 완료',{exact:true}).first().waitFor();assert.equal(approvals,1);await page.getByText('이 요청은 V124로 반영되었습니다.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'홈페이지 버전',exact:true}).click();await page.getByText('현재 버전',{exact:true}).waitFor();await page.getByRole('region',{name:'현재 홈페이지 버전'}).getByText('V124',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).count(),0);await page.getByRole('link',{name:'현재 버전 보기',exact:true}).click();await page.getByRole('heading',{name:'이 버전에서 반영한 변경',exact:true}).waitFor();assert.equal(restores,0);
 await page.getByRole('link',{name:'요청 #123 보기 →',exact:true}).click();await page.waitForURL('**/requests/123?tab=past');await page.getByRole('link',{name:'V124 보기',exact:true}).waitFor();
 await page.getByRole('link',{name:'목록으로 돌아가기',exact:true}).click();await page.waitForURL('**/requests?tab=past');await page.getByRole('link',{name:'V124 보기 →',exact:true}).waitFor();
 await page.getByRole('button',{name:/^처리 중/}).click();await page.getByText('지금 처리할 요청이 없습니다. 완료된 작업은 지난 요청에서 확인하세요.').waitFor();
 await page.goBack();await page.getByRole('link',{name:'V124 보기 →',exact:true}).waitFor();
 await page.getByRole('link',{name:'V124 보기 →',exact:true}).click();await page.getByRole('link',{name:'← 홈페이지 버전 목록',exact:true}).click();
 historyCurrent='c'.repeat(40);await page.getByRole('button',{name:'새로고침',exact:true}).click();await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).click();await page.waitForURL('**/history/124#restore');await page.getByText('이름으로 알아보는 복원 지점',{exact:true}).waitFor();await page.getByRole('button',{name:'이 버전으로 되돌리기 요청'}).click();assert.equal(restores,0);assert.match(await page.locator('.confirmation').innerText(),/선택한 버전: V124 ·/);await page.getByRole('button',{name:'되돌리기 요청 만들기'}).click();await page.waitForURL('**/requests/123');assert.equal(restores,1);
 records[0].restoration={number:120,name:'Members 소개 수정',mergedAt:'2026-11-09T01:00:00Z'};records[0].pull.restoration=records[0].restoration;
 await page.goto('http://127.0.0.1:4193/dashboard');await page.getByText('되돌리기 완료',{exact:true}).waitFor();await page.getByText('이전 버전으로 되돌리기',{exact:true}).waitFor();
 await page.getByRole('button',{name:'홈페이지 버전',exact:true}).click();await page.getByText('이전 버전으로 되돌림',{exact:true}).waitFor();await page.getByText('V120 ‘Members 소개 수정’ 버전으로 되돌렸습니다',{exact:true}).waitFor();await page.getByRole('link',{name:'V120 상세 보기 →',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'V120 상세 보기 →',exact:true}).getAttribute('href'),'/history/120');await page.locator('.version-number').filter({hasText:/^V124$/}).waitFor();
 historyCurrent=sha;const shortRestoreName=records[0].restoration.name;records[0].restoration.name='어드민 연결 검증용 파일 추가 (테스트 전용)';
 await page.getByRole('button',{name:'새로고침',exact:true}).click();await page.getByRole('region',{name:'현재 홈페이지 버전'}).getByRole('heading',{name:'V124',exact:true}).waitFor();
 await page.screenshot({path:'/private/tmp/mng-version-design-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'version header mobile overflow');await page.screenshot({path:'/private/tmp/mng-version-design-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});records[0].restoration.name=shortRestoreName;
 await page.goto('http://127.0.0.1:4193/requests/123?tab=past');await page.getByRole('heading',{name:'V120 ‘Members 소개 수정’ 버전으로 되돌리기',exact:true}).waitFor();await page.getByText('이 요청은 V124로 반영되었습니다.',{exact:true}).waitFor();
 await page.goto('http://127.0.0.1:4193/requests?tab=past&q=V124');await page.getByRole('link',{name:'V124 보기 →',exact:true}).waitFor();assert.equal(await page.locator('.connected-list>li').count(),1);await page.locator('.request-result-version').filter({hasText:'반영 버전 V124'}).waitFor();
 await page.getByLabel('요청 검색').fill('V120');await page.waitForURL('**q=V120');await page.getByRole('link',{name:'V124 보기 →',exact:true}).waitFor();

 await page.getByRole('button',{name:'요청 관리',exact:true}).click();await page.waitForURL('http://127.0.0.1:4193/requests');await page.getByText('지금 처리할 요청이 없습니다. 완료된 작업은 지난 요청에서 확인하세요.').waitFor();await page.getByLabel('요청 검색').fill('missing');await page.getByText('조건에 맞는 요청이 없습니다.').waitFor();
 // History has its own six-card server pager; detail lookup does not depend on the visible page.
 historyCurrent=sha;historyRows=Array.from({length:20},(_,i)=>({number:300-i,merged:true,mergeSha:i?String(300-i).padStart(40,'0'):sha,mergedAt:new Date(Date.UTC(2026,10,10,0,0,20-i)).toISOString(),title:`버전 테스트 ${300-i}`,requestId:500-i}));
 await page.goto('http://127.0.0.1:4193/history');
 const historyPager=page.getByRole('navigation',{name:'홈페이지 버전 페이지'});
 await historyPager.getByRole('button',{name:'1페이지',exact:true}).waitFor();assert.equal(await page.locator('.version-card').count(),6);
 await historyPager.getByRole('button',{name:'4페이지',exact:true}).click();await page.waitForURL('**/history?page=4');await page.locator('.version-card .version-number').getByText('V281',{exact:true}).waitFor();
 assert.equal(await page.locator('.version-card').count(),1);await page.getByRole('region',{name:'현재 홈페이지 버전'}).getByText('V300',{exact:true}).waitFor();
 await page.getByRole('link',{name:'버전 보기',exact:true}).click();await page.waitForURL('**/history/281?page=4');await page.locator('.version-detail').getByText('V281',{exact:true}).waitFor();
 await page.reload();await page.locator('.version-detail').getByText('V281',{exact:true}).waitFor();await page.getByRole('link',{name:'← 홈페이지 버전 목록'}).click();await page.waitForURL('**/history?page=4');await page.locator('.version-card').getByText('V281',{exact:true}).waitFor();
 await historyPager.getByRole('button',{name:'2페이지',exact:true}).click();await page.waitForURL('**/history?page=2');await page.locator('.version-card').getByText('V293',{exact:true}).waitFor();
 await page.goBack();await page.waitForURL('**/history?page=4');await page.locator('.version-card').getByText('V281',{exact:true}).waitFor();await page.reload();await page.locator('.version-card').getByText('V281',{exact:true}).waitFor();
 await page.getByRole('link',{name:'이 버전으로 되돌리기',exact:true}).click();await page.waitForURL('**/history/281?page=4#restore');await page.getByRole('button',{name:'이 버전으로 되돌리기 요청'}).click();assert.match(await page.locator('.confirmation').innerText(),/선택한 버전: V281 ·/);await page.getByRole('button',{name:'되돌리기 요청 만들기'}).click();await page.waitForURL('**/requests/123');assert.equal(restores,2);
 await page.goto('http://127.0.0.1:4193/history?page=999');await page.waitForURL('**/history?page=4');await page.locator('.version-card').getByText('V281',{exact:true}).waitFor();
 await historyPager.getByRole('button',{name:'1페이지',exact:true}).click();await page.waitForURL('**/history');await page.locator('.version-card').getByText('V299',{exact:true}).waitFor();
 holdHistoryPage=2;heldHistory=false;await historyPager.getByRole('button',{name:'2페이지',exact:true}).click();
 for(let i=0;i<100&&!heldHistory;i++)await new Promise(r=>setTimeout(r,20));assert.equal(heldHistory,true);await page.getByText('이전 버전 불러오는 중',{exact:true}).waitFor();
 await page.goBack();await page.locator('.version-card').getByText('V299',{exact:true}).waitFor();releaseHistory();await new Promise(r=>setTimeout(r,100));assert.equal(new URL(page.url()).search,'');assert.equal(await page.locator('.version-card').getByText('V293',{exact:true}).count(),0);
 historyFailures=2;await historyPager.getByRole('button',{name:'2페이지',exact:true}).click();await page.getByRole('alert').filter({hasText:'버전 조회 오류'}).waitFor();await page.getByRole('button',{name:'다시 불러오기',exact:true}).click();await page.locator('.version-card').getByText('V293',{exact:true}).waitFor();
 historyRows=historyRows.slice(0,8);await page.reload();await historyPager.getByRole('button',{name:'2페이지',exact:true}).waitFor();assert.equal(await page.locator('.version-card').count(),1);
 historyRows=historyRows.slice(0,7);await page.reload();await page.waitForURL('**/history');await page.locator('.version-card').getByText('V294',{exact:true}).waitFor();assert.equal(await page.locator('.version-card').count(),6);assert.equal(await historyPager.count(),0);
 historyRows=[];await page.reload();await page.getByText('아직 반영된 버전이 없습니다.',{exact:true}).waitFor();assert.equal(await historyPager.count(),0);historyRows=null;
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
 // Opening a completed flow must not replay a success notice or imply the credential is still valid.
 deviceFlow={id:'previous-login',kind:'login',state:'connected',code:null,runUrl:'https://github.com/MNG-lab/mng-homepage/actions/runs/101'};
 await page.reload();await page.getByRole('link',{name:'연결 작업 기록 ↗',exact:true}).waitFor();
 assert.equal(await page.locator('#codex-connection .connection-state').count(),0);
 await page.getByRole('button',{name:'상태 새로고침',exact:true}).click();await page.locator('#codex-connection .connection-state').waitFor({state:'hidden'});
 assert.equal(await page.getByText('Codex 연결 완료',{exact:true}).count(),0);
 records=[{id:123,title:'중단된 Members 수정',state:'open',description:'기존 요청',run:{id:100,attempt:1,status:'completed',conclusion:'failure'},auth:{renewed:false}}];
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByRole('link',{name:'Codex 연결하러 가기'}).click();
 await page.getByRole('heading',{name:'구성원 관리'}).waitFor();await page.getByRole('heading',{name:'Codex 연결',exact:true}).waitFor();
 await page.getByText('Codex를 다시 연결해 주세요',{exact:true}).waitFor();
 assert.equal(await page.getByText('Codex 연결 완료',{exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'인증 만료 상황 체험하기'}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Codex 연결',exact:true}).isDisabled(),true);
 await page.getByRole('checkbox').check();
 holdDeviceRead=true;heldDeviceRead=false;await page.getByRole('button',{name:'상태 새로고침',exact:true}).click();
 for(let i=0;i<100&&!heldDeviceRead;i++)await new Promise(r=>setTimeout(r,20));assert.equal(heldDeviceRead,true);
 holdLogin=true;await page.getByRole('button',{name:'Codex 연결',exact:true}).click();
 const busyLogin=page.getByRole('button',{name:'연결 요청 중…',exact:true});await busyLogin.waitFor();assert.equal(await busyLogin.getAttribute('aria-busy'),'true');assert.equal(await busyLogin.locator('.spinner').count(),1);assert.equal(await busyLogin.isDisabled(),true);
 for(let i=0;i<100&&!releaseLogin;i++)await new Promise(r=>setTimeout(r,20));assert.ok(releaseLogin);releaseLogin();
 await page.getByText('작업을 준비하고 있습니다',{exact:true}).waitFor();
 releaseDeviceRead();await new Promise(r=>setTimeout(r,150));assert.equal(await page.getByText('작업을 준비하고 있습니다',{exact:true}).count(),1,'stale read must not replace post-submit state');
 deviceFlow={...deviceFlow,state:'waiting',code:'ABCD-12345'};await page.getByText('ABCD-12345',{exact:true}).waitFor({timeout:10000});
 // A reload while login is still in progress continues that flow and can show its eventual completion.
 await page.reload();await page.getByText('ABCD-12345',{exact:true}).waitFor();

 assert.equal(await page.getByRole('link',{name:'OpenAI에서 로그인하기 ↗',exact:true}).getAttribute('href'),'https://auth.openai.com/codex/device');
 records[0].auth.renewed=true;
 deviceFlow={...deviceFlow,state:'connected',code:null};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByText('Codex 연결 완료',{exact:true}).waitFor();
 await page.getByRole('button',{name:'상태 새로고침',exact:true}).click();await page.getByText('Codex 연결 완료',{exact:true}).waitFor();
 await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).click();
 await page.getByText('현재 인증 문제로 멈춘 요청이 없습니다.',{exact:true}).waitFor();assert.equal(retries,1);assert.equal(deviceStarts,1);
 assert.equal(await page.locator('#codex-connection .connection-state').evaluate(el=>{const actions=document.querySelector('.connection-actions').getBoundingClientRect();return el.getBoundingClientRect().top>=actions.bottom&&el.classList.contains('is-success');}),true);
 await page.goto('http://127.0.0.1:4193/requests/123');await page.getByText('재실행 접수됨',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).count(),0);
 await page.getByRole('button',{name:'설정',exact:true}).click();
 await page.getByRole('heading',{name:'Codex 연결',exact:true}).waitFor();
 await page.locator('#codex-connection .connection-state').waitFor({state:'hidden'});
 assert.equal(await page.getByText('Codex 연결 완료',{exact:true}).count(),0);
 await page.reload();await page.getByRole('heading',{name:'Codex 연결',exact:true}).waitFor();await page.locator('#codex-connection .connection-state').waitFor({state:'hidden'});
 assert.equal(await page.getByText('Codex 연결 완료',{exact:true}).count(),0);
 assert.equal(await page.getByRole('heading',{name:'Codex 인증 갱신',exact:true}).count(),0);assert.equal(await page.locator('input[type="file"]').count(),0);
 assert.equal(await page.getByRole('button',{name:'구성원 저장',exact:true}).evaluate(el=>{const button=el.getBoundingClientRect(),select=el.closest('form').querySelector('select').getBoundingClientRect();return button.top-select.bottom>=20;}),true);


 // Audit pagination is independent of the stopped-request pager and preserves navigation.
 const auditPanel=page.getByRole('region',{name:'관리 기록',exact:true}),auditPager=page.getByRole('navigation',{name:'관리 기록 페이지',exact:true});
 await auditPanel.getByText('아직 관리 기록이 없습니다.',{exact:true}).waitFor();assert.equal(await auditPager.count(),0);
 const makeAudit=count=>Array.from({length:count},(_,i)=>({id:count-i,action:'member.update',target:`member${count-i}@gmail.com`,actor:'owner@example.test',created_at:'2026-11-11 01:00:00'}));
 auditRecords=makeAudit(5);await page.reload();await auditPanel.locator('li').nth(4).waitFor();assert.equal(await auditPager.count(),0);
 auditRecords=makeAudit(6);await page.reload();await auditPager.getByRole('button',{name:'1페이지',exact:true}).waitFor();assert.equal(await auditPanel.locator('li').count(),5);
 await auditPager.getByRole('button',{name:'2페이지',exact:true}).click();await page.waitForURL('**audit_page=2');await auditPager.locator('[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await auditPanel.locator('li').count(),1);await auditPanel.getByText('member1@gmail.com',{exact:true}).waitFor();
 const beforeAuditRequests=records;
 records=Array.from({length:7},(_,i)=>({id:500+i,title:`연결 대기 ${i}`,state:'open',run:{id:500+i,attempt:1,status:'completed',conclusion:'failure'},auth:{renewed:true}}));
 auditRecords=makeAudit(32);await page.goto('http://127.0.0.1:4193/settings?audit_page=7&recovery_page=2#codex-connection');
 await auditPager.locator('[aria-current="page"]').filter({hasText:/^7$/}).waitFor();await recoveryPager.locator('[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await auditPanel.locator('li').count(),2);await auditPanel.getByText('member1@gmail.com',{exact:true}).waitFor();
 await page.getByRole('region',{name:'구성원 추가·수정',exact:true}).getByLabel('Google 계정',{exact:true}).fill('draft@gmail.com');
 await auditPager.getByRole('button',{name:'이전',exact:true}).click();await auditPager.locator('[aria-current="page"]').filter({hasText:/^6$/}).waitFor();assert.equal(new URL(page.url()).searchParams.get('recovery_page'),'2');assert.equal(new URL(page.url()).hash,'#codex-connection');assert.equal(await page.getByLabel('Google 계정',{exact:true}).inputValue(),'draft@gmail.com');
 await page.goBack();await auditPager.locator('[aria-current="page"]').filter({hasText:/^7$/}).waitFor();await page.reload();await auditPager.locator('[aria-current="page"]').filter({hasText:/^7$/}).waitFor();
 await recoveryPager.getByRole('button',{name:'3페이지',exact:true}).click();await recoveryPager.locator('[aria-current="page"]').filter({hasText:/^3$/}).waitFor();assert.equal(new URL(page.url()).searchParams.get('audit_page'),'7');
 auditRecords=makeAudit(6);await page.goto('http://127.0.0.1:4193/settings?audit_page=999');await page.waitForURL('**audit_page=2');await auditPager.locator('[aria-current="page"]').filter({hasText:/^2$/}).waitFor();
 await auditPager.getByRole('button',{name:'1페이지',exact:true}).click();await auditPager.locator('[aria-current="page"]').filter({hasText:/^1$/}).waitFor();
 holdAuditPage=2;heldAudit=false;await auditPager.getByRole('button',{name:'2페이지',exact:true}).click();for(let i=0;i<100&&!heldAudit;i++)await new Promise(r=>setTimeout(r,20));assert.equal(heldAudit,true);
 await page.goBack();await auditPager.locator('[aria-current="page"]').filter({hasText:/^1$/}).waitFor();releaseAudit();await new Promise(r=>setTimeout(r,150));await auditPanel.getByText('member6@gmail.com',{exact:true}).waitFor();assert.equal(await auditPanel.locator('li').count(),5);
 auditFailures=2;await auditPager.getByRole('button',{name:'2페이지',exact:true}).click();await auditPanel.getByRole('alert').filter({hasText:'관리 기록 조회 오류'}).waitFor();assert.equal(await auditPanel.getByText('아직 관리 기록이 없습니다.',{exact:true}).count(),0);
 await auditPanel.getByRole('button',{name:'관리 기록 다시 불러오기',exact:true}).click();await auditPager.locator('[aria-current="page"]').filter({hasText:/^2$/}).waitFor();assert.equal(await auditPanel.locator('li').count(),1);
 records=beforeAuditRequests;auditRecords=makeAudit(5);await page.goto('http://127.0.0.1:4193/settings?audit_page=2');await page.waitForURL('**/settings');await auditPanel.locator('li').nth(4).waitFor();assert.equal(await auditPager.count(),0);

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
 assert.deepEqual(errors,[]);console.log('PASS: immediate manual refresh feedback, duplicate suppression, shared quiet polling, success/error/retry, reduced motion, stale refresh isolation, distinct dashboard/requests/history/settings, routes, back/forward, submission, diff/CI approval confirmation, restoration, six-card history server pagination/current pinning/old detail/stale reads/retry, server pagination, URL search/status/back/reload, old detail links, independent summaries/recovery pages, five-record audit server pagination, independent pagers/back/reload, stale audit reads and retry, connection completion only for the current visit, in-progress login reload, scoped settings confirmation/error/success, member access and ownership offer/cancel/accept, owner/editor UI, mobile layout, no runtime errors');
} finally {await browser?.close();server.kill('SIGTERM');}
