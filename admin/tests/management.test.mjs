import test from 'node:test';
import assert from 'node:assert/strict';
import {managementAPI,readMember} from '../worker/management.js';
import {database} from './d1.mjs';
const owner={email:'chominho96@gmail.com',sub:'owner',role:'owner',authTime:Math.floor(Date.now()/1000)-1800};
const origin='https://test.example';
const post=(path,body={},source=origin)=>new Request(origin+'/api/settings'+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)});
const setup=()=>({APP_ORIGIN:origin,MEMBERS_DB:'true',DB:database()});
test('member changes accept an existing login, require owner and same origin; owner cannot be removed',async()=>{
 const env=setup(),handle=managementAPI();const body={email:'editor@gmail.com',role:'editor',active:true};
 for(const [user,source] of [[{...owner,role:'editor'},origin],[owner,'https://evil.test']])assert.equal((await handle(post('/members',body,source),env,user)).status,403);
 assert.equal((await handle(post('/members',{...body,email:owner.email,active:false}),env,owner)).status,409);
 assert.equal((await handle(post('/members',body),env,owner)).status,200);
 assert.equal((await readMember(env,body.email,'editor-sub',true)).role,'editor');
 assert.equal(await readMember(env,body.email,'other-sub'),null);
 await handle(post('/members',{...body,active:false}),env,owner);
 assert.equal(await readMember(env,body.email,'editor-sub'),null);
});
test('ownership needs candidate login and acceptance; updates roles atomically and preserves one owner',async()=>{
 const env=setup(),handle=managementAPI();const candidate={email:'next@gmail.com',sub:'next',role:'editor',authTime:owner.authTime};
 await readMember(env,owner.email,owner.sub,true);
 await handle(post('/members',{email:candidate.email,role:'editor',active:true}),env,owner);
 assert.equal((await handle(post('/transfer',{email:candidate.email}),env,owner)).status,400);
 await readMember(env,candidate.email,candidate.sub,true);
 assert.equal((await handle(post('/transfer',{email:candidate.email}),env,owner)).status,200);
 assert.equal((await handle(post('/transfer/accept'),env,{...candidate,email:'other@gmail.com'})).status,409);
 assert.equal((await handle(post('/transfer/accept'),env,candidate)).status,200);
 assert.equal((await readMember(env,candidate.email,candidate.sub)).role,'owner');
 assert.equal((await readMember(env,owner.email,owner.sub)).role,'admin');
 assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM members WHERE role='owner'").get().n,1);
 assert.equal((await handle(post('/transfer/accept'),env,candidate)).status,409);
});
test('cancelled and expired ownership requests cannot be accepted',async()=>{
 const env=setup(),handle=managementAPI();await readMember(env,owner.email,owner.sub,true);
 const next={email:'next@gmail.com',sub:'next',role:'editor',authTime:owner.authTime};
 await handle(post('/members',{email:next.email,role:next.role,active:true}),env,owner);await readMember(env,next.email,next.sub,true);
 await handle(post('/transfer',{email:next.email}),env,owner);await handle(post('/transfer/cancel'),env,owner);
 assert.equal((await handle(post('/transfer/accept'),env,next)).status,409);
 await handle(post('/transfer',{email:next.email}),env,owner);env.DB.sqlite.exec('UPDATE ownership SET expires_at=0');
 assert.equal((await handle(post('/transfer/accept'),env,next)).status,409);
});
test('retired manual credential upload cannot change credentials or mark them renewed',async()=>{
 const env=setup(),handle=managementAPI();
 const response=await handle(post('/codex',{auth:'sensitive-test-value'}),env,owner);
 assert.equal(response.status,404);
 assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM codex_credential_state').get().n,0);
 assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM audit').get().n,0);
});
test('settings load membership and audit without GitHub configuration or Secrets access',async()=>{
 const env=setup(),handle=managementAPI();
 const response=await handle(new Request(origin+'/api/settings'),env,owner);
 assert.equal(response.status,200);const data=await response.json();
 assert.ok(data.members.some(m=>m.email===owner.email));assert.deepEqual(data.audit,[]);
 assert.equal(Object.hasOwn(data,'credential'),false);
});
