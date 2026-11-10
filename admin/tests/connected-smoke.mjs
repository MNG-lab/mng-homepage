import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('npm',['run','admin:preview','--','--port','4193'],{stdio:'ignore'});
let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage();let submissions=0;
 await page.route('**/api/session',route=>route.fulfill({json:{user:{email:'owner@example.test',role:'owner'},mode:'github'}}));
 const record={id:123,title:'Connected test',description:'Test request',url:'https://github.com/MNG-lab/mng-homepage/issues/123',state:'open',pull:null};
 await page.route('**/api/requests',async route=>{
  if(route.request().method()==='POST'){const body=route.request().postDataJSON();assert.equal(body.page,'Members');assert.equal(body.title,'Connected test');assert.match(body.requestId,/^[a-f0-9-]{36}$/);submissions++;await route.fulfill({json:{issue:123,state:'dispatched'},status:201});}
  else await route.fulfill({json:{requests:submissions?[record]:[]}});
 });
 await page.goto('http://127.0.0.1:4193/dashboard');
 await page.getByRole('heading',{name:'테스트 수정 요청',exact:true}).waitFor();
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
 console.log('PASS: authenticated GitHub view, request submission, UUID, routing, refresh, no simulated approval');
}finally{await browser?.close();server.kill('SIGTERM');}
