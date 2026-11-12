import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './d1.mjs';
import {listSnapshot} from '../worker/list-snapshot.js';
import {requestsAPI} from '../worker/requests.js';
import {GitHubError} from '../worker/github.js';
const origin='https://admin.example.test',user={sub:'owner',role:'owner'};
const config=()=>({DB:database(),ADMIN_ENV:'production',GITHUB_ENABLED:'true',GITHUB_REPOSITORY:'MNG-lab/mng-homepage',APP_ORIGIN:origin});
const issue=id=>({number:id,title:'Request '+id,body:'<!-- mng-admin:v1 -->',labels:[{name:'admin-request'}],state:'open',created_at:'2026-11-12T01:00:00Z'});

test('list snapshots serve complete saved records without GitHub, then refresh all filters and pages',async()=>{
 const env=config();let reads=0,rows=[issue(1)],revisions=[{number:1,mergeSha:'a',version:1}];
 const gh={list:async()=>rows,pulls:async()=>[],runs:async()=>[],history:async()=>({current:'a',currentRevision:revisions[0],revisions})};
 const handle=requestsAPI({github:async()=>{reads++;return gh;}});
 const get=async(path,who=user)=>handle(new Request(origin+path+(path.includes('?')?'&':'?')+'cached=1'),env,who);
 let data=await (await get('/api/requests?view=catalog')).json();assert.equal(data.sync.state,'fresh');assert.equal(reads,1);
 rows=[issue(2),issue(1)];
 data=await (await get('/api/requests?view=summary')).json();assert.equal(data.sync.state,'cached');assert.equal(data.recent.length,1);assert.equal(reads,1);
 data=await (await get('/api/requests?view=catalog&fresh=1')).json();assert.equal(data.sync.state,'fresh');assert.equal(data.requests.length,2);assert.equal(reads,2);
 data=await (await get('/api/requests?q=Request+2')).json();assert.deepEqual(data.requests.map(r=>r.id),[2]);assert.equal(reads,2);
 assert.equal((await get('/api/requests?view=catalog',null)).status,403);
 assert.equal((await get('/api/requests?page=-1')).status,400);assert.equal(reads,2);
 await get('/api/history');const before=reads;
 revisions=[...revisions,...Array.from({length:8},(_,i)=>({number:i+2,version:i+2,mergeSha:String(i+2)}))];
 data=await (await get('/api/history?page=2')).json();assert.equal(data.totalVersions,1);assert.equal(reads,before);
 data=await (await get('/api/history?page=2&fresh=1')).json();assert.equal(data.totalVersions,9);assert.equal(data.pagination.page,2);assert.equal(data.revisions.length,2);
 rows=[issue(3)];
 data=await (await handle(new Request(origin+'/api/requests?view=catalog'),env,user)).json();
 assert.equal(data.sync.state,'fresh');assert.deepEqual(data.requests.map(r=>r.id),[3],'old frontend tabs without cache opt-in continue receiving updates');
 env.DB.sqlite.close();
});

test('failed refresh retains saved data, isolates environments/installations, and rejects older writes',async()=>{
 const env=config();let time=1,loads=0;
 const read=(options={})=>listSnapshot(env,'requests',{now:()=>time++,load:async()=>{loads++;return {value:'first'};},...options});
 await read();const saved=await read();assert.equal(loads,1);
 await assert.rejects(read({fresh:true,load:async()=>{throw Error('GitHub unavailable');}}),/unavailable/);
 assert.deepEqual(await read(),saved);
 let release;
 const slow=read({fresh:true,load:()=>new Promise(resolve=>{release=resolve;})});
 await Promise.resolve();await read({fresh:true,load:async()=>({value:'newer'})});release({value:'older'});await slow;
 assert.equal((await read()).value.value,'newer');
 env.GITHUB_INSTALLATION_ID='new-install';assert.equal((await read()).sync.state,'fresh');
 env.ADMIN_ENV='preview';assert.equal((await read()).sync.state,'fresh');
 await read({fresh:true,load:async()=>({large:'x'.repeat(512001)})});
 assert.equal((await read()).sync.state,'fresh','oversized new results discard older saved lists instead of leaving them indefinitely');
 env.DB.sqlite.close();
});

test('saved lists cannot authorize approval or restore, and detail endpoints still query live state',async()=>{
 const env=config();await listSnapshot(env,'requests',{load:async()=>[]});await listSnapshot(env,'history',{load:async()=>({revisions:[]})});
 const calls=[];
 const handle=requestsAPI({github:async()=>({
  detail:async id=>{calls.push('detail:'+id);return {head:'new-head'};},
  merge:async(id,head)=>{calls.push('merge:'+id+':'+head);throw new GitHubError('PR changed',409);},
  restore:async(id,base)=>{calls.push('restore:'+id+':'+base);throw new GitHubError('Base changed',409);}
 })});
 const send=(path,body)=>handle(new Request(origin+path,body?{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),env,user);
 assert.equal((await (await send('/api/pulls/1')).json()).head,'new-head');
 assert.equal((await send('/api/pulls/1/approve',{head:'old-head'})).status,409);
 const base='a'.repeat(40);assert.equal((await send('/api/history/1/restore',{base,requestId:crypto.randomUUID()})).status,409);
 assert.deepEqual(calls,['detail:1','merge:1:old-head','restore:1:'+base]);env.DB.sqlite.close();
});
