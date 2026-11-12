import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const server=spawn('npm',['run','admin:preview','--','--port','4198'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4198')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let record={id:103,kind:'revert',title:'요청 #101 변경 취소',description:'소개 문구를 이전 내용으로 되돌려 주세요.',state:'open',url:'/example-issue',createdAt:'2026-11-12T01:00:00Z',run:{id:203,attempt:1,status:'completed',conclusion:'failure',url:'/example-run'},failure:{code:'rollback_conflict',retryable:false}};
 let hold=false,held=false,release,failures=0,closes=0;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session'||path==='/api/session/refresh')return route.fulfill({json:{user:{email:'owner@example.test',role:'owner'},mode:'github'}});
  if(path==='/api/requests/103'){
   if(hold){hold=false;held=true;await new Promise(resolve=>{release=resolve;});}
   if(failures-->0)return route.fulfill({status:503,json:{error:'조회 연결을 확인해 주세요.'}});
   return route.fulfill({json:{request:record}});
  }
  if(path==='/api/requests/103/close'){closes++;record={...record,state:'closed'};return route.fulfill({json:{ok:true}});}
  throw Error('Unexpected API: '+path);
 });
 await page.clock.install();
 await page.goto('http://127.0.0.1:4198/requests/103');
 await page.getByRole('heading',{name:'수정 내용이 충돌해 반영하지 못했어요',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).count(),0);
 assert.equal(await page.getByText('현재 홈페이지는 그대로예요.',{exact:true}).count(),1);
 assert.equal(await page.getByRole('link',{name:'새 수정 요청 작성',exact:true}).getAttribute('href'),'/requests/new');
 assert.equal(await page.getByText(/작업의 퍼센트/).count(),0);
 const indicator=page.locator('.auto-refresh-status'),time=indicator.locator('time');await time.waitFor();
 const checked=await time.getAttribute('datetime');
 // A real timer tick starts a held read. No manual refresh or simulated UI state.
 hold=true;await page.clock.runFor(30010);
 for(let i=0;i<100&&!held;i++)await new Promise(r=>setTimeout(r,20));assert.equal(held,true);
 await page.clock.runFor(1100);await indicator.locator('.spinner').waitFor();
 assert.equal(await time.getAttribute('datetime'),checked,'no false success while pending');
 assert.match(await indicator.innerText(),/상태 확인 중/);
 release();await indicator.filter({hasText:'자동 업데이트'}).waitFor();
 assert.notEqual(await time.getAttribute('datetime'),checked);assert.equal(await indicator.locator('.spinner').count(),0);
 failures=2;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await indicator.filter({hasText:'상태 확인 중'}).waitFor();await page.clock.runFor(1000);
 await indicator.filter({hasText:'업데이트 지연'}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'수정 내용이 충돌해 반영하지 못했어요',exact:true}).count(),1);
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await indicator.filter({hasText:'자동 업데이트'}).waitFor();
 for(const [code,title] of [['rollback_no_changes','이미 취소되었거나, 취소할 내용이 없어요'],['rollback_unverified','작업이 멈춘 원인을 확인하지 못했어요']]){
  record.failure={code,retryable:false};await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByRole('heading',{name:title,exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).count(),0);
 }
 record.failure=null;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).waitFor();
 // A polling result must invalidate an already open retry confirmation too.
 await page.getByRole('button',{name:'이 요청 다시 실행',exact:true}).click();
 record.failure={code:'rollback_conflict',retryable:false};await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await page.getByRole('heading',{name:'수정 내용이 충돌해 반영하지 못했어요',exact:true}).waitFor();
 assert.equal(await page.getByRole('dialog').getByRole('button',{name:'확인하고 진행',exact:true}).isDisabled(),true);
 await page.getByRole('dialog').getByRole('button',{name:'취소',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/private/tmp/mng-conflict-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'요청 닫기',exact:true}).click();
 const dialog=page.getByRole('dialog');assert.match(await dialog.innerText(),/GitHub 이슈를 닫고 ‘지난 요청’으로/);
 await dialog.getByRole('button',{name:'요청 닫기',exact:true}).click();
 await page.locator('.state-pill.closed').waitFor();assert.equal(closes,1);
 assert.deepEqual(errors,[]);console.log('Request conflict, retry, automatic polling, errors and close UI passed.');
}finally{await browser?.close();server.kill('SIGTERM');}
