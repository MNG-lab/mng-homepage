import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {loginPage} from '../worker/login-page.js';
const server=spawn('npm',['run','admin:preview','--','--port','4194'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4194')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-11-11T00:00:00Z')});
 let refreshes=0,reads=0,failInitial=false,refreshStatus=200,hold=false,release,logoutCalls=0;
 const identity={user:{email:'owner@example.test',role:'editor'},mode:'github'};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({status:failInitial?503:200,json:failInitial?{error:'Temporary service failure'}:identity});
  if(path==='/api/session/refresh'){
   refreshes++;assert.equal(route.request().method(),'POST');
   if(hold)await new Promise(resolve=>{release=resolve;});
   return route.fulfill({status:refreshStatus,json:refreshStatus===200?identity:{error:'Temporary service failure'}});
  }
  if(path==='/api/requests'){reads++;return route.fulfill({json:{requests:[],counts:{},recent:[],attention:[],scopeCounts:{active:0,past:0},pagination:{page:1,pages:1,total:0,pageSize:20}}});}
  if(path==='/api/history')return route.fulfill({json:{current:'a'.repeat(40),revisions:[]}});
  return route.fulfill({status:404,json:{error:'Unexpected test route'}});
 });
 await page.route('**/auth/logout',async route=>{logoutCalls++;assert.equal(route.request().method(),'POST');return route.fulfill({status:303,headers:{Location:'/login'},body:''});});
 await page.route('**/login',route=>route.fulfill({contentType:'text/html',body:'<h1>로그인</h1>'}));
 async function renewed(action,status=200){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/session/refresh');await action();assert.equal((await response).status(),status);}
 await renewed(()=>page.goto('http://127.0.0.1:4194/dashboard'));
 await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();assert.equal(refreshes,1);
 const beforeReads=reads;const poll=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/requests');await page.clock.fastForward(3600000);await poll;
 assert.ok(reads>beforeReads);assert.equal(refreshes,1,'polling must not renew an idle session');
 await renewed(()=>page.getByRole('button',{name:'요청 관리',exact:true}).click());assert.equal(refreshes,2);
 await page.getByRole('button',{name:'대시보드',exact:true}).click();assert.equal(refreshes,2,'rapid activity is throttled');
 await page.clock.fastForward(61000);
 await renewed(()=>page.getByRole('button',{name:'새 수정 요청',exact:true}).click());
 await page.clock.fastForward(61000);
 await renewed(()=>page.getByRole('textbox',{name:'요청 제목',exact:true}).pressSequentially('Session test'));
 const afterTyping=refreshes;await page.clock.fastForward(61000);
 await page.evaluate(()=>{document.dispatchEvent(new Event('pointerdown'));window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(refreshes,afterTyping,'synthetic events and window focus must not renew');
 refreshStatus=503;
 await renewed(()=>page.getByRole('textbox',{name:'요청 제목',exact:true}).press('x'),503);
 assert.match(page.url(),/requests\/new$/);assert.equal(await page.getByRole('textbox',{name:'요청 제목'}).inputValue(),'Session testx');
 await page.clock.fastForward(11000);refreshStatus=200;
 await renewed(()=>page.getByRole('textbox',{name:'요청 제목',exact:true}).press('y'));
 assert.equal(await page.getByRole('textbox',{name:'요청 제목'}).inputValue(),'Session testxy');
 // Logout must clear the cookie after any in-flight renewal, not before it.
 await page.clock.fastForward(61000);hold=true;
 const held=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/session/refresh');
 await page.getByRole('textbox',{name:'요청 제목',exact:true}).press('z');await held;
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();assert.equal(logoutCalls,0);
 hold=false;release();await page.waitForURL('**/login');assert.equal(logoutCalls,1);
 // Initial lookup outages offer retry and do not send the user to login.
 failInitial=true;
 await page.goto('http://127.0.0.1:4194/dashboard');await page.clock.fastForward(1000);
 await page.getByRole('button',{name:'다시 확인',exact:true}).waitFor();assert.match(page.url(),/dashboard$/);
 failInitial=false;await renewed(()=>page.getByRole('button',{name:'다시 확인',exact:true}).click());
 await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();
 // A confirmed expired session still requires login.
 await page.clock.fastForward(61000);refreshStatus=401;
 await renewed(()=>page.getByRole('button',{name:'요청 관리',exact:true}).click(),401);await page.waitForURL('**/login');
 await page.setViewportSize({width:390,height:844});
 for(const error of [false,true]){
  await page.setContent(await loginPage(error).text());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'login must fit a narrow screen');
  assert.equal(await page.getByRole('alert').count(),error?1:0);
  if(error)assert.equal(await page.getByRole('alert').evaluate(el=>getComputedStyle(el).color),'rgb(180, 35, 24)');
  await page.getByRole('link',{name:'Google 계정으로 로그인'}).focus();
  assert.equal(await page.getByRole('link',{name:'Google 계정으로 로그인'}).evaluate(el=>el===document.activeElement),true);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: activity-only renewal, idle polling, throttling, real typing, transient failure recovery, logout ordering, initial retry, expired session login');
} finally {await browser?.close();server.kill('SIGTERM');}
