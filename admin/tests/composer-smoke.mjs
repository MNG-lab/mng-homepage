import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {requestBody} from '../shared/request-form.js';
import {deployment} from '../shared/deployment.js';
const server=spawn('npm',['run','admin:preview','--','--port','4195'],{stdio:'ignore'});let browser;
try {
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4195')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const image=readFileSync(new URL('../src/assets/mng-lab-avatar.png',import.meta.url));let role='owner',uploadCount=0,failUpload=true,created=[],record;
 const completed={id:101,title:'Members 소개 수정',description:'소개 문구 수정',kind:'change',state:'closed',createdAt:new Date().toISOString(),pull:{number:201,merged:true,mergeSha:'a'.repeat(40),head:{ref:'admin/issue-101-11',sha:'b'.repeat(40)},state:'closed'}};
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(path==='/api/session'||path==='/api/session/refresh')return route.fulfill({json:{user:{email:'owner@example.test',role},mode:'github'}});
  if(/^\/api\/attachments\/[a-f\d-]+$/.test(path)){
   uploadCount++;assert.equal(Buffer.from(request.postDataBuffer()).compare(image),0);
   if(failUpload){failUpload=false;return route.fulfill({status:503,json:{error:'첨부 전송 테스트 오류'}});}
   return route.fulfill({json:{id:path.split('/').at(-1),url:'https://raw.githubusercontent.com/MNG-lab/mng-homepage/'+ 'a'.repeat(40)+'/requests/'+request.headers()['x-request-id']+'/'+path.split('/').at(-1)+'.png'}});
  }
  if(path==='/api/requests'&&request.method()==='POST'){
   const body=request.postDataJSON();created.push(body);record={id:123,title:body.title,description:requestBody(body,deployment({ADMIN_ENV:'production'})),kind:body.kind==='rollback'?'revert':'change',state:'open',createdAt:new Date().toISOString(),url:'https://github.com/MNG-lab/mng-homepage/issues/123'};return route.fulfill({json:{issue:123}});
  }
  if(path==='/api/requests/123')return route.fulfill({json:{request:record}});
  if(path==='/api/requests/101')return route.fulfill({json:{request:completed}});
  if(path==='/api/pulls/201')return route.fulfill({json:{pull:completed.pull,head:'b'.repeat(40),files:[],preview:{state:'ready'},ci:{status:'completed',conclusion:'success'}}});
  return route.fulfill({json:{requests:[],counts:{},recent:[],attention:[],pagination:{page:1,pages:1}}});
 });
 await page.goto('http://127.0.0.1:4195/requests/new');
 assert.equal(await page.getByRole('button',{name:'변경 취소',exact:true}).count(),0);
 assert.equal(await page.getByLabel('수정 유형',{exact:true}).count(),0);
 await page.getByLabel('어느 페이지인가요?',{exact:true}).selectOption('Multiple');
 await page.getByLabel('다른 페이지 주소',{exact:true}).fill('https://dglab.yonsei.ac.kr/\nhttps://dglab.yonsei.ac.kr/members');
 await page.getByLabel('어떻게 바꾸면 될까요?',{exact:true}).fill('첫 사진을 소개에 넣고 두 번째 사진을 참고해 주세요.');
 await page.getByText('추가로 전달할 내용',{exact:true}).click();
 await page.getByLabel('정확히 넣을 문구',{exact:true}).fill('KR: 연구실\nEN: Lab');
 const input=page.getByLabel('첨부할 사진 선택',{exact:true});
 await input.setInputFiles({name:'reference.png',mimeType:'image/png',buffer:image});
 await page.getByRole('img',{name:'첨부 사진 1: reference.png'}).waitFor();
 await page.locator('.attachment-grid input').fill('Home 소개 사진');
 // Clipboard and drag/drop use the same file validation path as file selection.
 await page.locator('.request-compose').evaluate((element,base64)=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([bytes],'clipboard.png',{type:'image/png'}));element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:transfer}));},image.toString('base64'));
 assert.equal(await page.locator('.attachment-grid li').count(),2);
 await page.getByRole('button',{name:'clipboard.png 첨부 제거'}).click();
 await page.locator('.attachment-dropzone').evaluate((element,base64)=>{const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([bytes],'dropped.png',{type:'image/png'}));element.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));},image.toString('base64'));
 assert.equal(await page.locator('.attachment-grid li').count(),2);
 await page.screenshot({path:'/private/tmp/mng-composer-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'/private/tmp/mng-composer-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1100});
 await page.getByRole('button',{name:'수정 요청 보내기',exact:true}).click();await page.getByRole('alert').filter({hasText:'첨부 전송 테스트 오류'}).waitFor();assert.equal(created.length,0);
 await page.getByRole('button',{name:'수정 요청 보내기',exact:true}).click();await page.waitForURL('**/requests/123');assert.equal(created.length,1);assert.equal(created[0].attachments.length,2);assert.equal(created[0].attachments[0].caption,'Home 소개 사진');assert.equal(uploadCount,3);
 await page.getByRole('heading',{name:'정확히 넣을 문구',exact:true}).waitFor();assert.equal(await page.getByText('KR: 연구실\nEN: Lab',{exact:true}).count(),1);
 assert.equal(created[0].title,'첫 사진을 소개에 넣고 두 번째 사진을 참고해 주세요.');
 await page.goto('http://127.0.0.1:4195/requests/101');await page.getByRole('button',{name:'이 변경 취소',exact:true}).click();
 await page.getByLabel('취소하려는 이유',{exact:true}).fill('모바일에서 문구가 겹칩니다.');
 assert.equal(await page.getByLabel('PR 번호',{exact:true}).count(),0);
 await page.getByRole('button',{name:'변경 취소 요청 만들기',exact:true}).click();await page.waitForURL('**/requests/123');
 assert.equal(created.at(-1).rollbackType,'pr');assert.equal(created.at(-1).rollbackTarget,'201');assert.equal(created.at(-1).sourceRequest,101);assert.equal(created.at(-1).sourceMergeSha,'a'.repeat(40));
 completed.reversal={requestId:123,state:'pending'};await page.goto('http://127.0.0.1:4195/requests/101');await page.getByRole('link',{name:'변경 취소 요청 #123 보기 →'}).waitFor();assert.equal(await page.getByRole('button',{name:'이 변경 취소',exact:true}).count(),0);
 completed.reversal=null;role='editor';await page.goto('http://127.0.0.1:4195/requests/101');await page.getByRole('heading',{name:completed.title,exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'이 변경 취소',exact:true}).count(),0);
 await page.goto('http://127.0.0.1:4195/requests/new');await page.getByRole('button',{name:'제목 수정',exact:true}).click();await page.getByRole('textbox',{name:'요청 제목',exact:true}).fill('직접 쓴 제목');await page.reload();assert.equal(await page.getByRole('textbox',{name:'요청 제목',exact:true}).inputValue(),'직접 쓴 제목');
 assert.deepEqual(errors,[]);console.log('composer smoke: simplified form, auto/editable title, photos, retry, mobile, request-bound cancellation and role guards passed');
}finally{await browser?.close();server.kill('SIGTERM');}
