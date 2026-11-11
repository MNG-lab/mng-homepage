import test from 'node:test';
import assert from 'node:assert/strict';
import {requestsAPI} from '../worker/requests.js';
const origin='https://preview.example.test';
const user={sub:'owner-sub',role:'owner'};
const body={requestId:'12345678-1234-4234-9234-123456789abc',title:'Test',page:'Members',description:'Update text'};
function db() {
 const rows=new Map();
 return {prepare(sql){let args;return {bind(...values){args=values;return this;},async first(){return rows.get(args[0])||null;},async run(){
  if(sql.startsWith('INSERT')) {if(rows.has(args[0]))return {meta:{changes:0}};rows.set(args[0],{id:args[0],actor_sub:args[1],payload:args[2],state:'creating'});}
  else {const id=args.at(-1);const row=rows.get(id);row.state=sql.match(/state='([^']+)'/)[1];if(sql.includes('issue_number=?'))row.issue_number=args[0];}
  return {meta:{changes:1}};
 }}}};
}
const request=(path='/api/requests',value=body,headers={})=>new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(value)});
test('same-origin and editor approval rules reject before any GitHub mutation',async()=>{
 let writes=0;const api=requestsAPI({github:async()=>({merge:async()=>{writes++;}})});const env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB:db()};
 assert.equal((await api(request('/api/requests',body,{Origin:'https://evil.test'}),env,user)).status,403);
 assert.equal((await api(request('/api/pulls/1/approve',{head:'a'.repeat(40)}),env,{...user,role:'editor'})).status,403);
 assert.equal(writes,0);
});
test('duplicate submissions create and dispatch only one issue; ownership and payload cannot be changed',async()=>{
 let creates=0,dispatches=0;
 const api=requestsAPI({github:async()=>({createRequest:async()=>{creates++;return {number:123};},dispatch:async()=>{dispatches++;}})});
 const env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB:db()};
 assert.equal((await api(request(),env,user)).status,201);
 assert.equal((await api(request(),env,user)).status,200);
 assert.equal(creates,1);assert.equal(dispatches,1);
 assert.equal((await api(request(),env,{...user,sub:'other'})).status,409);
 assert.equal((await api(request('/api/requests',{...body,title:'Changed'}),env,user)).status,409);
});
test('ambiguous dispatch failure is not retried and records existing issue',async()=>{
 let count=0;const api=requestsAPI({github:async()=>({createRequest:async()=>({number:123}),dispatch:async()=>{count++;throw Error('timeout');}})});
 const env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB:db()};
 assert.equal((await api(request(),env,user)).status,202);
 const repeat=await(await api(request(),env,user)).json();assert.equal(repeat.issue,123);assert.equal(repeat.state,'dispatching');assert.equal(count,1);
});
test('ambiguous issue creation failure keeps reservation instead of creating duplicate',async()=>{
 let count=0;const api=requestsAPI({github:async()=>({createRequest:async()=>{count++;throw Error();}})});
 const env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',DB:db()};
 assert.equal((await api(request(),env,user)).status,502);
 assert.equal((await api(request(),env,user)).status,409);assert.equal(count,1);
});
