import test from 'node:test';
import assert from 'node:assert/strict';
import {requestsAPI} from '../worker/requests.js';
import {database} from './d1.mjs';
const origin='https://test.example',user={sub:'owner',role:'owner'};
const request=(path,body)=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const setup=()=>({APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB:database()});
test('restoration is administrator-only, idempotent and deduplicated across different IDs',async()=>{
 let count=0;const env=setup(),handle=requestsAPI({github:async()=>({restore:async(id,base,key,onIssue)=>{count++;await onIssue(5);return {issue:5,pull:6};}})});
 const body={requestId:crypto.randomUUID(),base:'a'.repeat(40)};
 assert.equal((await handle(request('/api/history/1/restore',body),env,{...user,role:'editor'})).status,403);
 assert.equal((await handle(request('/api/history/1/restore',body),env,user)).status,201);
 assert.equal((await handle(request('/api/history/1/restore',body),env,user)).status,200);
 assert.equal((await handle(request('/api/history/1/restore',{...body,requestId:crypto.randomUUID()}),env,user)).status,409);
 assert.equal(count,1);
});
test('ambiguous restoration keeps operation and issue; never creates a duplicate',async()=>{
 let count=0;const env=setup(),handle=requestsAPI({github:async()=>({restore:async(id,base,key,onIssue)=>{count++;await onIssue(5);throw Error('timeout');}})});
 const body={requestId:crypto.randomUUID(),base:'a'.repeat(40)};
 assert.equal((await handle(request('/api/history/1/restore',body),env,user)).status,502);
 assert.equal((await handle(request('/api/history/1/restore',body),env,user)).status,409);
 assert.equal(count,1);assert.equal(env.DB.sqlite.prepare('SELECT issue FROM operations').get().issue,5);
});
test('one failed execution cannot be retried twice with different UUIDs',async()=>{
 let count=0;const env=setup(),handle=requestsAPI({github:async()=>({retry:async(id,claim)=>{await claim('retry:5:100');count++;}})});
 assert.equal((await handle(request('/api/requests/5/retry',{requestId:crypto.randomUUID()}),env,user)).status,201);
 assert.equal((await handle(request('/api/requests/5/retry',{requestId:crypto.randomUUID()}),env,user)).status,409);assert.equal(count,1);
});
