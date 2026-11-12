import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPair,exportPKCS8} from 'jose';
import {normalizeRequest,requestBody,requestTypes,requestSections,fieldLabels} from '../shared/request-form.js';
import {imageType,extractImages,MAX_IMAGE_BYTES,readBounded} from '../shared/images.js';
import {parseRollback} from '../shared/rollback.js';
import {downloadImages} from '../scripts/request-images.mjs';
import {deployment} from '../shared/deployment.js';
import {runIdentity} from '../shared/github-sync.js';
import {requestsAPI} from '../worker/requests.js';
import {createGitHub} from '../worker/github.js';
import {database} from './d1.mjs';
const requestId='12345678-1234-4234-9234-123456789abc',id='22345678-1234-4234-9234-123456789abc';
const origin='https://admin.mng-lab.workers.dev',user={sub:'owner',role:'owner'};
const change={requestId,title:'이미지와 문구 변경',page:'Multiple',targetUrls:'https://dglab.yonsei.ac.kr/\nhttps://dglab.yonsei.ac.kr/members',description:'첨부 사진을 추가합니다.',currentState:'기존 사진 없음',sourceLinks:'https://example.com/reference',exactText:'KR: 연구\nEN: Research',outOfScope:'다른 페이지 유지',notes:'메모'};
const image=readFileSync(new URL('../src/assets/mng-lab-avatar.png',import.meta.url));
const url=`https://raw.githubusercontent.com/MNG-lab/mng-homepage/${'a'.repeat(40)}/requests/${requestId}/${id}.png`;
const post=(path,body,headers={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const upload=(value=image,headers={})=>new Request(origin+`/api/attachments/${id}`,{method:'POST',headers:{Origin:origin,'X-Request-Id':requestId,'X-File-Name':encodeURIComponent('참고 사진.png'),...headers},body:value});

test('every existing change type preserves all issue form fields and image captions',()=>{
 const template=readFileSync(new URL('../../.github/ISSUE_TEMPLATE/change-request.yml',import.meta.url),'utf8');
 for(const requestType of requestTypes){
  assert.ok(template.includes(requestType));
  const value=normalizeRequest({...change,requestType,attachments:[{id,caption:'홈 소개 이미지'}]});
  const body=requestBody(value,deployment({ADMIN_ENV:'production'}),[{id,name:'참고 사진.png',caption:'홈 소개 이미지',url}]);
  for(const label of Object.values(fieldLabels))assert.ok(body.includes('### '+label));
  assert.match(body,/국문·영문/);assert.equal(extractImages(body)[0].url,url);
  assert.equal(requestSections(body).find(s=>s.label==='정확한 문구 (있으면 필수)').text,change.exactText);
 }
 assert.throws(()=>normalizeRequest({...change,targetUrls:'javascript:alert(1)'}));
 assert.throws(()=>normalizeRequest({...change,attachments:[{id},{id}]}));
 assert.throws(()=>normalizeRequest({...change,kind:'unknown'}));
});
test('all rollback templates round-trip without treating free text as shell code',()=>{
 for(const rollbackType of ['latest','pr','commit']){
  const value=normalizeRequest({requestId,kind:'rollback',title:'취소',rollbackType,rollbackTarget:rollbackType==='pr'?'#85':'6a0c363',reason:'$(touch /tmp/never)\n`not a command`',expectedResult:'기존 내용 유지'});
  const body=requestBody(value,deployment({ADMIN_ENV:'production'}));
  const parsed=parseRollback({body,labels:[rollbackType==='latest'?'rollback-simple-request':'rollback-request']});
  assert.equal(parsed.type,rollbackType);assert.equal(parsed.reason,value.reason);assert.equal(parsed.expected,value.expectedResult);
 }
 assert.throws(()=>parseRollback({labels:['rollback-request'],body:'### 롤백 유형\npr\n### 롤백 대상\n85; echo unsafe'}));
 const run={head_branch:'main',event:'workflow_dispatch',path:'.github/workflows/rollback-from-issue.yml',display_title:'Rollback request #91'};
 assert.equal(runIdentity(run,deployment({ADMIN_ENV:'production'})).issue,91);
});
test('upload validates bytes, origin, ownership and size; retries reuse the same stored photo',async()=>{
 const DB=database(),env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB};let writes=0,received;
 const api=requestsAPI({github:async()=>({storeAttachment:async value=>{writes++;received=value;return url;}})});
 assert.equal((await api(upload(image,{Origin:'https://evil.test'}),env,user)).status,403);
 assert.equal((await api(upload(Buffer.from('<script>bad</script>')),env,user)).status,415);
 assert.equal((await api(upload(image,{'Content-Length':String(MAX_IMAGE_BYTES+1)}),env,user)).status,413);
 assert.equal(writes,0);
 assert.equal((await api(upload(),env,user)).status,201);
 assert.equal(received.branch,'admin-attachments');assert.match(received.blobSha,/^[a-f\d]{40}$/);assert.equal(Buffer.from(received.content,'base64').compare(image),0);
 assert.equal((await api(upload(),env,user)).status,201);assert.equal(writes,1);
 assert.equal((await api(upload(),env,{...user,sub:'other'})).status,409);
 const changed=Buffer.from(image);changed[changed.length-1]^=1;
 assert.equal((await api(upload(changed),env,user)).status,409);
 assert.equal(DB.sqlite.prepare('SELECT count(*) n FROM attachments').get().n,1);
});
test('submission binds uploaded photos to the actor and request; rollback uses its own workflow',async()=>{
 const DB=database(),env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB};let attachments,creates=0,dispatches=0,rollbacks=0;
 const api=requestsAPI({github:async()=>({storeAttachment:async()=>url,createRequest:async(_,images)=>{creates++;attachments=images;return {number:90+creates};},dispatch:async()=>{dispatches++;},dispatchRollback:async()=>{rollbacks++;}})});
 await api(upload(),env,user);
 const input={...change,attachments:[{id,caption:'설명'}]};
 assert.equal((await api(post('/api/requests',input),env,{...user,sub:'other'})).status,400);assert.equal(creates,0);
 assert.equal((await api(post('/api/requests',input),env,user)).status,201);assert.equal(attachments[0].url,url);assert.equal(attachments[0].caption,'설명');
 assert.equal((await api(post('/api/requests',input),env,user)).status,200);assert.equal(creates,1);assert.equal(dispatches,1);
 assert.equal((await api(post(`/api/attachments/${id}/remove`,{}),env,user)).status,409);
 const rollback={requestId:'32345678-1234-4234-9234-123456789abc',kind:'rollback',title:'변경 취소',rollbackType:'pr',rollbackTarget:'85',reason:'문제',expectedResult:'정상'};
 assert.equal((await api(post('/api/requests',rollback),env,{...user,role:'editor'})).status,403);
 assert.equal((await api(post('/api/requests',rollback),env,user)).status,201);assert.equal(rollbacks,1);assert.equal(dispatches,1);
 assert.equal((await api(post('/api/requests',{...change,title:''}),env,user)).status,400);
});
test('removed drafts cannot be attached, while upload caps count concurrent reservations',async()=>{
 const DB=database(),env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB};const api=requestsAPI({github:async()=>({storeAttachment:async()=>url})});
 await api(upload(),env,user);assert.equal((await api(post(`/api/attachments/${id}/remove`,{}),env,user)).status,200);
 assert.equal((await api(post('/api/requests',{...change,attachments:[{id}]}),env,user)).status,400);
 for(let n=0;n<8;n++)DB.sqlite.prepare('INSERT INTO attachments(id,request_id,actor_sub,name,media_type,size,digest,path) VALUES (?,?,?,?,?,?,?,?)').run('quota'+n,requestId,'owner','photo','image/png',1,'digest','path');
 const next=new Request(origin+'/api/attachments/42345678-1234-4234-9234-123456789abc',{method:'POST',headers:{Origin:origin,'X-Request-Id':requestId,'X-File-Name':'photo.png'},body:image});
 assert.equal((await api(next,env,user)).status,409);
});
test('GitHub uploads use an isolated branch and immutable URLs, never update main or existing content',async()=>{
 const {privateKey}=await generateKeyPair('RS256',{extractable:true});let exists=false,sha='b'.repeat(40);const writes=[];
 const env={GITHUB_REPOSITORY:'MNG-lab/mng-homepage',ADMIN_ENV:'production',GITHUB_BASE:'main',GITHUB_WORKFLOW_REF:'main',GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)};
 const gh=await createGitHub(env,async(path,options)=>{
  if(path.includes('/access_tokens'))return Response.json({token:'mock'});
  if(path.includes('/git/ref/heads/admin-attachments'))return Response.json({object:{sha:'a'.repeat(40)}});
  if(options.method==='GET')return exists?Response.json({sha}):new Response('',{status:404});
  writes.push(JSON.parse(options.body));exists=true;return Response.json({commit:{sha:'c'.repeat(40)}});
 });
 const input={path:`requests/${requestId}/${id}.png`,branch:'admin-attachments',content:image.toString('base64'),blobSha:sha};
 assert.match(await gh.storeAttachment(input),new RegExp('/'+'c'.repeat(40)+'/requests/'));assert.equal(writes[0].branch,'admin-attachments');assert.equal(writes[0].sha,undefined);
 await gh.storeAttachment(input);assert.equal(writes.length,1);
 await assert.rejects(gh.storeAttachment({...input,blobSha:'d'.repeat(40)}));
 await assert.rejects(gh.storeAttachment({...input,branch:'main'}));assert.equal(writes.length,1);
});
test('image download handles GitHub HTML and redirects, rejects scripts, large bodies and private addresses',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'mng-request-images-'));
 try{
  const original='https://github.com/user-attachments/assets/da5eedab-2e8f-4841-9076-e410cd7ed30d';let calls=0;
  const files=await downloadImages(`<img src="${original}" />`,directory,async(_,options)=>{assert.equal(options.redirect,'manual');calls++;return calls===1?new Response(null,{status:302,headers:{location:'https://github-production-user-asset-6210df.s3.amazonaws.com/example'}}):new Response(image);});
  assert.equal(files.length,1);assert.equal(readFileSync(files[0].path).compare(image),0);assert.equal(imageType(image).type,'image/png');
  await assert.rejects(downloadImages(`![x](${original})`,directory,async()=>new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data'}})));
  await assert.rejects(downloadImages(`![x](${original})`,directory,async()=>new Response('<html>not an image</html>')));
  assert.deepEqual(extractImages('![x](javascript:alert(1)) ![y](https://evil.test/image.png)'),[]);
  await assert.rejects(readBounded(new Response(new Uint8Array(30)),20));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
