import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import {requestsAPI} from '../worker/requests.js';
import {createGitHub,REPOSITORY,TEST_BASE,WORKFLOW_REF} from '../worker/github.js';
import {readCatalog,invalidateCatalog} from '../worker/github-catalog.js';
import {database} from './d1.mjs';
const origin='https://test.example',user={sub:'owner',role:'owner'};
const issue=id=>({number:id,title:`[Admin Preview] Members ${id}`,body:'<!-- mng-admin-preview:v1 -->\n\n## 수정 요청\n검색 본문\n\n운영 홈페이지',labels:[{name:'admin-preview'}],state:'open',created_at:'2025-01-01T00:00:00Z'});
const run=id=>({id,run_attempt:1,display_title:`Admin preview #${id}`,head_branch:WORKFLOW_REF,event:'workflow_dispatch',path:'.github/workflows/codex-comment.yml',created_at:'2025-01-02T00:00:00Z',status:'completed',conclusion:'failure',html_url:`https://github.com/${REPOSITORY}/actions/runs/${id}`});
const env=DB=>({DB,APP_ORIGIN:origin,GITHUB_ENABLED:'true',GITHUB_REPOSITORY:REPOSITORY,GITHUB_TEST_BASE:TEST_BASE,GITHUB_WORKFLOW_REF:WORKFLOW_REF,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2'});

test('server returns 20 rows after search and status filtering, with global summary and independent detail',async()=>{
 const config=env(database());
 const issues=Array.from({length:47},(_,i)=>issue(i+1));
 const runs=issues.filter(i=>i.number<=42).map(i=>({id:i.number,title:`Admin preview #${i.number}`,attempt:1,status:'completed',conclusion:'failure',createdAt:'2025-01-02T00:00:00Z'}));
 const gh={list:async()=>issues,pulls:async()=>[],runs:async()=>runs,issue:async id=>issue(id),latestRun:async id=>runs.find(r=>r.id===id)};
 const api=requestsAPI({github:async()=>gh});
 const get=async query=>{const response=await api(new Request(origin+'/api/requests'+query),config,user);return {status:response.status,...await response.json()};};
 let page=await get('?page=2');assert.equal(page.requests.length,20);assert.equal(page.requests[0].id,27);assert.deepEqual(page.pagination,{page:2,pageSize:20,total:47,pages:3});
 page=await get('?status=failed&q=Members&page=3');assert.equal(page.requests.length,2);assert.deepEqual(page.requests.map(r=>r.id),[2,1]);assert.equal(page.pagination.total,42);
 page=await get('?status=working&q='+encodeURIComponent('검색 본문'));assert.equal(page.requests.length,5);assert.equal(page.pagination.total,5);
 page=await get('?q=absent&page=99');assert.equal(page.requests.length,0);assert.equal(page.pagination.page,1);assert.equal(page.pagination.total,0);
 page=await get('?page=999');assert.equal(page.pagination.page,3);assert.equal(page.requests.length,7);
 const summary=await get('?view=summary');assert.deepEqual(summary.counts,{review:0,working:5,failed:42});assert.equal(summary.recent.length,5);assert.equal(summary.attention.length,5);
 const detail=await get('/1');assert.equal(detail.request.id,1);assert.equal(detail.request.run.id,1);
 for(const query of ['?page_size=0','?page_size=4','?page_size=1000','?page=0','?page=-1','?page=1.5','?page=99999999999999999','?status=unknown','?q='+'a'.repeat(201)])assert.equal((await get(query)).status,400);
 // Auth-failed requests count with failures, but also have their own paged filter.
 config.DB.sqlite.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?)').run('1',1,1,'a'.repeat(40),'auth_required',1);
 page=await get('?status=auth_required');assert.equal(page.requests[0].id,1);assert.equal(page.requests[0].auth.renewed,false);assert.equal(page.connectionRequired,true);
 assert.equal((await get('?status=failed')).pagination.total,42);
 // The settings recovery list uses three rows; the normal request list stays at 20.
 for(const id of [2,3,4])config.DB.sqlite.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?)').run(String(id),1,id,'a'.repeat(40),'auth_required',1);
 page=await get('?status=auth_required&page_size=3');assert.deepEqual(page.requests.map(r=>r.id),[4,3,2]);assert.deepEqual(page.pagination,{page:1,pageSize:3,total:4,pages:2});
 page=await get('?status=auth_required&page_size=3&page=2');assert.deepEqual(page.requests.map(r=>r.id),[1]);assert.equal(page.connectionRequired,true);
 page=await get('?status=auth_required&page_size=3&page=99');assert.equal(page.pagination.page,2);
 config.DB.sqlite.prepare('DELETE FROM request_run_results WHERE issue=?').run('4');
 page=await get('?status=auth_required&page_size=3&page=2');assert.deepEqual(page.pagination,{page:1,pageSize:3,total:3,pages:1});
 assert.equal((await get('?status=auth_required')).pagination.pageSize,20);
});

test('read cache resumes a large import, hides partial totals, reuses reads, and removes invalidated records',async()=>{
 const db=database();let calls=0;
 const fetchPage=async page=>{calls++;return {items:Array.from({length:page===4?1:100},(_,i)=>({number:(page-1)*100+i+1,title:'request'})),done:page===4};};
 await assert.rejects(readCatalog(db,'issues',fetchPage),e=>e.status===503);
 assert.equal(db.sqlite.prepare('SELECT page,lease_until FROM github_catalog_sync').get().page,4);
 assert.equal(db.sqlite.prepare('SELECT lease_until FROM github_catalog_sync').get().lease_until,0);
 const rows=await readCatalog(db,'issues',fetchPage);assert.equal(rows.length,301);assert.equal(calls,4);
 await readCatalog(db,'issues',fetchPage);assert.equal(calls,4);
 await invalidateCatalog(db);
 const updated=await readCatalog(db,'issues',async(page,since)=>{assert.equal(page,1);assert.ok(since);return {items:[{number:2,title:'changed'}],removed:[1],done:true};});
 assert.equal(updated.length,300);assert.equal(updated.find(r=>r.number===2).title,'changed');assert.equal(updated.some(r=>r.number===1),false);
 // Concurrent initial imports report progress instead of an empty success.
 await db.prepare('INSERT INTO github_catalog_sync(kind,lease,lease_until) VALUES (?,?,?)').bind('runs','other',Date.now()+90000).run();
 await assert.rejects(readCatalog(db,'runs',async()=>{throw Error('must not fetch');}),e=>e.status===503);
});

test('old requests beyond 1,000 runs remain queryable and retryable; direct attempt checks and claims block stale retries',async()=>{
 const config=env(database()),{privateKey}=await generateKeyPair('RS256',{extractable:true});config.GITHUB_APP_PRIVATE_KEY=await exportPKCS8(privateKey);
 const rows=Array.from({length:1205},(_,i)=>run(1205-i));let dispatches=0,attempt=1,status='completed',deleted=false;const visited=[];
 const gh=await createGitHub(config,async(url,options)=>{
  if(url.includes('/access_tokens'))return Response.json({token:'test'});
  if(url.includes('/workflows/codex-comment.yml/runs?')){
   const params=new URL(url).searchParams;
   assert.equal(params.has('branch'),false);assert.equal(params.has('event'),false);assert.equal(params.has('created'),false);
   const page=Number(params.get('page'));visited.push(page);return Response.json({workflow_runs:rows.slice((page-1)*100,page*100)});
  }
  if(url.endsWith('/actions/runs/1')&&deleted)return new Response(null,{status:404});
  if(url.endsWith('/actions/runs/1'))return Response.json({...run(1),run_attempt:attempt,status,conclusion:status==='completed'?'failure':null});
  if(url.includes('/pulls?'))return Response.json([]);
  if(url.endsWith('/issues/1'))return Response.json(issue(1));
  if(url.endsWith('/dispatches')){dispatches++;assert.equal(JSON.parse(options.body).ref,WORKFLOW_REF);return new Response(null,{status:204});}
  throw Error('Unexpected path: '+url);
 });
 for(let i=0;i<4;i++)await assert.rejects(gh.runs(),e=>e.status===503);
 assert.equal((await gh.runs()).length,1205);assert.equal(visited.at(-1),13);
 assert.equal((await gh.latestRun(1)).id,1);
 const api=requestsAPI({github:async()=>gh});
 const detail=await (await api(new Request(origin+'/api/requests/1'),config,user)).json();assert.equal(detail.request.run.id,1);
 const retry=()=>api(new Request(origin+'/api/requests/1/retry',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID()})}),config,user);
 config.DB.sqlite.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?)').run('1',1,1,'a'.repeat(40),'auth_required',1);
 assert.equal((await retry()).status,409);assert.equal(dispatches,0);
 config.DB.sqlite.prepare('INSERT INTO codex_credential_state VALUES (1,?)').run(Date.now());
 assert.equal((await retry()).status,201);assert.equal(dispatches,1);
 assert.equal((await retry()).status,409);assert.equal(dispatches,1);
 // GitHub can re-run an old ID in-place. Never trust its cached terminal state.
 attempt=2;status='in_progress';const direct=await gh.latestRun(1);assert.equal(direct.attempt,2);assert.equal(direct.status,'in_progress');
 assert.equal((await retry()).status,409);assert.equal(dispatches,1);
 deleted=true;const retained=await (await api(new Request(origin+'/api/requests/1'),config,user)).json();assert.equal(retained.request.id,1);assert.equal(retained.request.run.unavailable,true);
 assert.equal((await retry()).status,404);assert.equal(dispatches,1);
});


test('request groups separate actionable work from completed and closed requests before pagination',async()=>{
 const {paginateRequests,listQuery}=await import('../worker/request-list.js');
 const rows=[{id:1,title:'Members',state:'open'}, {id:2,title:'Members',state:'open',auth:{renewed:false}}, {id:3,title:'Members',state:'open',pull:{state:'open'}}, {id:4,title:'Members',state:'open',pull:{merged:true,state:'closed'}}, {id:5,title:'Members',state:'closed'}, {id:6,title:'Members',state:'open',pull:{state:'closed'}}, {id:7,title:'Members',state:'open',run:{status:'completed',conclusion:'failure'}}];
 const active=paginateRequests(rows,{scope:'active'}),past=paginateRequests(rows,{scope:'past'});
 assert.deepEqual(active.requests.map(r=>r.id),[1,2,3,7]);assert.deepEqual(past.requests.map(r=>r.id),[4,5,6]);
 assert.deepEqual(active.scopeCounts,{active:4,past:3});assert.equal(paginateRequests(rows,{scope:'active',status:'failed'}).pagination.total,2);
 assert.deepEqual(paginateRequests(rows,{scope:'past',status:'done'}).requests.map(r=>r.id),[4]);
 assert.deepEqual(paginateRequests(rows,{scope:'past',q:'absent'}).scopeCounts,{active:0,past:0});
 const many=Array.from({length:47},(_,i)=>({...rows[4],id:i+1}));const page=paginateRequests([...rows.slice(0,3),...many],{scope:'past',page:2});assert.equal(page.requests.length,20);assert.equal(page.pagination.total,47);
 assert.throws(()=>listQuery(new URLSearchParams('scope=invalid')));assert.equal(listQuery(new URLSearchParams()).scope,'all');
});


test('version search matches applied and restore-target identifiers exactly before pagination and status filtering',async()=>{
 const {paginateRequests}=await import('../worker/request-list.js');
 const rows=Array.from({length:22},(_,i)=>({id:300+i,title:'이전 내용으로 되돌리기',state:'closed',pull:{number:400+i,merged:true,restoration:{number:53,name:'Members 소개 수정'}}}));
 rows.push({id:10,title:'Members',state:'closed',pull:{number:53,merged:true}});
 rows.push({id:11,title:'Members',state:'closed',pull:{number:530,merged:true}});
 rows.push({id:12,title:'Draft',state:'open',pull:{number:531,merged:false,state:'open'}});
 rows.push({id:13,title:'Closed',state:'closed',pull:{number:532,merged:false,state:'closed'}});
 let result=paginateRequests(rows,{q:'v53',scope:'past',status:'done',page:2});
 assert.deepEqual(result.requests.map(r=>r.id),[320,321,10]);assert.equal(result.pagination.total,23);
 assert.deepEqual(result.scopeCounts,{active:0,past:23});
 result=paginateRequests(rows,{q:'V53',scope:'active'});assert.equal(result.requests.length,0);
 for(const q of ['V531','V532'])assert.equal(paginateRequests(rows,{q}).pagination.total,0);
 assert.deepEqual(paginateRequests(rows,{q:'V530'}).requests.map(r=>r.id),[11]);
 assert.deepEqual(paginateRequests(rows,{q:'요청 #10'}).requests.map(r=>r.id),[10]);
});
