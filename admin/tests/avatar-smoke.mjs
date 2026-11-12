import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
const port=reservation.address().port,origin=`http://127.0.0.1:${port}`;await new Promise(resolve=>reservation.close(resolve));
const server=spawn(process.execPath,[fileURLToPath(new URL('../../node_modules/vite/bin/vite.js',import.meta.url)),'preview','--config','admin/vite.config.js','--port',String(port)],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error('Avatar test server failed');try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}});
 let picture='https://lh3.googleusercontent.com/example.png',photoReads=0;
 const image=readFileSync(new URL('../src/assets/mng-lab-avatar.png',import.meta.url));
 await page.route('https://lh3.googleusercontent.com/**',route=>{photoReads++;return picture.endsWith('/broken.png')?route.abort():route.fulfill({contentType:'image/png',body:image});});
 await page.route('**/api/**',route=>route.fulfill({json:route.request().url().includes('/session')?{user:{email:'owner@example.test',role:'owner',picture},mode:'github'}:{requests:[],counts:{},attention:[],recent:[]}}));
 await page.goto(origin+'/dashboard');
 const avatar=page.locator('.header-account-avatar'),photo=avatar.locator('img');
 await photo.waitFor();await photo.evaluate(img=>img.decode());
 assert.equal(await photo.getAttribute('referrerpolicy'),'no-referrer');
 assert.deepEqual(await photo.evaluate(img=>[img.clientWidth,img.clientHeight,getComputedStyle(img).borderRadius]),[40,40,'50%']);
 await page.getByRole('button',{name:'요청 관리',exact:true}).click();assert.equal(await photo.count(),1);assert.equal(photoReads,1);
 await page.setViewportSize({width:390,height:844});assert.deepEqual(await photo.evaluate(img=>[img.clientWidth,img.clientHeight]),[36,36]);
 picture='https://lh3.googleusercontent.com/broken.png';await page.reload();await avatar.locator('svg').waitFor();assert.equal(await photo.count(),0);assert.equal(photoReads,2);
 picture=null;await page.reload();await avatar.locator('svg').waitFor();assert.equal(photoReads,2,'missing photo must not make an external request');
 picture='https://lh3.googleusercontent.com/new.png';await page.reload();await photo.waitFor();await photo.evaluate(img=>img.decode());assert.equal(photoReads,3);
 console.log('PASS: circular Google avatar, mobile size, route reuse, no referrer, missing/broken photo fallback, and next-login photo refresh');
}finally{await browser?.close();server.kill('SIGTERM');}
