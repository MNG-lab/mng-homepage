import test from 'node:test';
import assert from 'node:assert/strict';
import {managementAPI,readMember} from '../worker/management.js';
import {database} from './d1.mjs';
const owner={email:'chominho96@gmail.com',sub:'owner',role:'owner',authTime:Math.floor(Date.now()/1000)};
const origin='https://test.example';
const post=(path,body={},source=origin)=>new Request(origin+'/api/settings'+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)});
const setup=()=>({APP_ORIGIN:origin,MEMBERS_DB:'true',DB:database()});
test('member changes require owner, same origin and fresh authentication; owner cannot be removed',async()=>{
 const env=setup(),handle=managementAPI();const body={email:'editor@gmail.com',role:'editor',active:true};
 for(const [user,source] of [[{...owner,role:'editor'},origin],[owner,'https://evil.test'],[{...owner,authTime:1},origin]])assert.equal((await handle(post('/members',body,source),env,user)).status,403);
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
test('credential update excludes plaintext from audit and is owner-only',async()=>{
 const env=setup();let value;const handle=managementAPI({github:async()=>({updateCodex:async(auth)=>{value=auth;}})});
 const auth='sensitive-test-value';assert.equal((await handle(post('/codex',{auth}),env,{...owner,role:'admin'})).status,403);
 assert.equal((await handle(post('/codex',{auth}),env,owner)).status,200);assert.equal(value,auth);
 assert.ok(!JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM audit').all()).includes(auth));
});
