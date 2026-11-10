import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('npm',['run','admin:preview','--','--port','4193'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});let submissions=0;
 await page.route('**/api/session',route=>route.fulfill({json:{user:{email:'owner@example.test',role:'owner'},mode:'github'}}));
 const record={id:123,title:'Connected test',description:'Test request',url:'https://github.com/MNG-lab/mng-homepage/issues/123',state:'open',pull:null};
 await page.route('**/api/requests',async route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();assert.equal(body.page,'Members');assert.equal(body.title,'Connected test');assert.match(body.requestId,/^[a-f0-9-]{36}$/);submissions++;await route.fulfill({json:{issue:123,state:'dispatched'},status:201});}
  else await route.fulfill({json:{requests:submissions?[record]:[]}});
 });
 await page.goto('http://127.0.0.1:4193/dashboard');
 await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();
 await page.getByRole('region',{name:'작업 요약'}).waitFor();
 assert.equal(await page.locator('.auth-session').count(),0);
 assert.equal(await page.locator('.brand').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'logo must not be covered');
 await page.screenshot({path:'/private/tmp/mng-dashboard-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'수정 요청',exact:true}).click();
 await page.getByRole('heading',{name:'수정 요청',exact:true}).waitFor();
 assert.equal(await page.getByRole('region',{name:'작업 요약'}).count(),0);
 await page.goBack();
 await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();
 await page.goForward();
 await page.getByRole('heading',{name:'수정 요청',exact:true}).waitFor();
 await page.getByRole('button',{name:'새 수정 요청',exact:true}).click();
 await page.waitForURL('**/requests/new');
 await page.getByLabel('요청 제목',{exact:true}).fill('Connected test');
 await page.getByLabel('어떻게 바꾸면 될까요?',{exact:true}).fill('Test request');
 await page.getByRole('button',{name:'수정 요청 보내기',exact:true}).click();
 await page.waitForURL('**/requests/123');
 await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();
 assert.equal(submissions,1);
 assert.equal(await page.getByRole('button',{name:'이 변경을 테스트 브랜치에 반영',exact:true}).count(),0);
 await page.reload();await page.getByRole('heading',{name:'Connected test',exact:true}).waitFor();
 await page.getByRole('button',{name:'변경 이력',exact:true}).click();
 await page.getByText('아직 반영된 변경이 없습니다.',{exact:true}).waitFor();
 await page.goto('http://127.0.0.1:4193/requests/99999');
 await page.getByRole('heading',{name:'요청을 찾을 수 없어요',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'대시보드',exact:true}).click();
 await page.getByRole('heading',{name:'대시보드',exact:true}).waitFor();
 assert.equal(await page.locator('.brand').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'no mobile horizontal overflow');
 await page.getByRole('button',{name:'로그아웃',exact:true}).waitFor();
 await page.screenshot({path:'/private/tmp/mng-dashboard-mobile.png',fullPage:true});
 console.log('PASS: dashboard/list separation, uncovered logo, mobile layout, back/forward, empty history, unknown detail');
 console.log('PASS: authenticated GitHub view, request submission, UUID, routing, refresh, no simulated approval');
}finally{await browser?.close();server.kill('SIGTERM');}
