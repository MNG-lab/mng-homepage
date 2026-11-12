import test from 'node:test';
import assert from 'node:assert/strict';
import {requestResultAPI,validRequestClaims,recoveryMetadata,recordCredentialUpdate} from '../worker/request-recovery.js';
import {requestsAPI} from '../worker/requests.js';
import {isAuthFailure} from '../scripts/codex-errors.mjs';
import {requestState,requestLabel} from '../src/api.js';
import {database} from './d1.mjs';
const sha='a'.repeat(40),origin='https://test.example',owner={sub:'owner',role:'owner'};
const claims={sub:'repo:MNG-lab/mng-homepage:ref:refs/heads/codex/admin-portal',repository:'MNG-lab/mng-homepage',repository_id:'1164495587',repository_owner_id:'263300045',ref:'refs/heads/codex/admin-portal',event_name:'workflow_dispatch',run_attempt:'1',run_id:'123',sha,job_workflow_sha:sha,workflow_ref:'MNG-lab/mng-homepage/.github/workflows/codex-comment.yml@refs/heads/codex/admin-portal',job_workflow_ref:'MNG-lab/mng-homepage/.github/workflows/admin-request.yml@refs/heads/codex/admin-portal'};
const run={id:123,attempt:1,createdAt:new Date(Date.now()-60000).toISOString(),status:'completed',conclusion:'failure'};
const ghRun={head_sha:sha,run_attempt:1,head_branch:'codex/admin-portal',path:'.github/workflows/codex-comment.yml',event:'workflow_dispatch',display_title:'Admin preview #5'};
const post=(path,body)=>new Request(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Authorization:'Bearer mock'},body:JSON.stringify(body)});
const callback=reason=>post('/api/internal/request-result',{issue:5,reason});
function setup(){const env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',GITHUB_REPOSITORY:'MNG-lab/mng-homepage',GITHUB_TEST_BASE:'codex/admin-sandbox',GITHUB_WORKFLOW_REF:'codex/admin-portal',DB:database()};const github=async()=>({issue:async()=>({number:5}),run:async()=>ghRun});return {env,handle:requestResultAPI({github,verifyRunner:async()=>claims}),github};}
test('request result binds signed identity, exact workflow SHA, issue, run and attempt',async()=>{
 assert.equal(validRequestClaims(claims),true);
 for(const key of Object.keys(claims))assert.equal(validRequestClaims({...claims,[key]:'wrong'}),false,key);
 const {env,handle,github}=setup();
 assert.equal((await requestResultAPI({github,verifyRunner:async()=>{throw Error('bad');}})(callback('auth_required'),env)).status,403);
 for(const change of [{display_title:'Admin preview #6'},{head_sha:'b'.repeat(40)},{run_attempt:2},{head_branch:'main'},{path:'.github/workflows/other.yml'},{event:'push'}]){
  const handler=requestResultAPI({verifyRunner:async()=>claims,github:async()=>({...await github(),run:async()=>({...ghRun,...change})})});
  assert.equal((await handler(callback('auth_required'),env)).status,403);
 }
 assert.equal((await handle(callback('auth_required'),env)).status,200);
 assert.equal((await handle(callback('auth_required'),env)).status,200);
 assert.equal((await handle(callback('success'),env)).status,409);
 assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM request_run_results').get().n,1);
});
test('only latest failed attempt is blocked; renewal enables retry without changing request history',async()=>{
 const {env,handle}=setup();await handle(callback('auth_required'),env);
 let metadata=await recoveryMetadata(env);
 assert.deepEqual(metadata(5,run).auth,{renewed:false});
 assert.equal(metadata(6,run).auth,null);
 assert.equal(metadata(5,{...run,id:124}).auth,null);
 assert.equal(metadata(5,{...run,attempt:2}).auth,null);
 assert.deepEqual(metadata(5,{...run,status:'in_progress',conclusion:null}),{});
 await recordCredentialUpdate(env);metadata=await recoveryMetadata(env);
 assert.deepEqual(metadata(5,run).auth,{renewed:true});
 const request={state:'open',run,...metadata(5,run)};
 assert.equal(requestState(request),'auth_required');assert.equal(requestLabel(request),'다시 실행 가능');
 assert.equal(requestState({...request,retry:{state:'pending'}}),'working');
 assert.equal(requestState({...request,pull:{state:'open'}}),'review');
 assert.equal(requestState({...request,state:'closed'}),'closed');
});
test('renewal gate is server-side; repeat clicks dispatch exactly once, including stale clients',async()=>{
 const {env,handle}=setup();await handle(callback('auth_required'),env);let dispatches=0;
 const retry=requestsAPI({github:async()=>({retry:async(id,claim,check)=>{await check(run);await claim('retry:5:123:1');dispatches++;}})});
 const body={requestId:crypto.randomUUID()},req=()=>post('/api/requests/5/retry',body);
 assert.equal((await retry(req(),env,owner)).status,409);assert.equal(dispatches,0);
 await recordCredentialUpdate(env);
 assert.equal((await retry(req(),env,{...owner,role:'editor'})).status,403);
 assert.equal((await retry(req(),env,owner)).status,201);
 assert.equal((await retry(req(),env,owner)).status,200);
 assert.equal((await retry(post('/api/requests/5/retry',{requestId:crypto.randomUUID()}),env,owner)).status,409);
 assert.equal(dispatches,1);
 assert.deepEqual((await recoveryMetadata(env))(5,run).retry,{state:'pending'});
});
test('ambiguous retry cannot dispatch again and is not reported as accepted',async()=>{
 const {env,handle}=setup();await handle(callback('auth_required'),env);await recordCredentialUpdate(env);let dispatches=0;
 const retry=requestsAPI({github:async()=>({retry:async(id,claim,check)=>{await check(run);await claim('retry:5:123:1');dispatches++;throw Error('network');}})});
 assert.equal((await retry(post('/api/requests/5/retry',{requestId:crypto.randomUUID()}),env,owner)).status,502);
 assert.equal((await retry(post('/api/requests/5/retry',{requestId:crypto.randomUUID()}),env,owner)).status,409);
 assert.equal(dispatches,1);assert.deepEqual((await recoveryMetadata(env))(5,run).retry,{state:'uncertain'});
});
test('auth classification excludes tool output, rate limits, quota and ordinary generation failures',()=>{
 const event=message=>JSON.stringify({type:'turn.failed',error:{message}});
 for(const message of ['refresh_token_reused','Your refresh token has expired. Please log in again.','401 Unauthorized','invalid_grant'])assert.equal(isAuthFailure(event(message)),true);
 for(const message of ['429 Too Many Requests','quota exceeded','403 Forbidden','model not found','network timeout'])assert.equal(isAuthFailure(event(message)),false);
 assert.equal(isAuthFailure(JSON.stringify({type:'item.completed',item:{text:'401 Unauthorized refresh_token_reused'}})),false);
 assert.equal(isAuthFailure('user says 401 Unauthorized'),false);
 assert.equal(isAuthFailure('','Error: refresh_token_expired'),true);
});

test('rollback results require their own signed workflow and exact run attempt',async()=>{
 const {env:base}=setup(),env={...base,ADMIN_ENV:'production',GITHUB_WORKFLOW_REF:'main',GITHUB_TEST_BASE:'main'};
 const signed={...claims,sub:'repo:MNG-lab/mng-homepage:ref:refs/heads/main',ref:'refs/heads/main',workflow_ref:'MNG-lab/mng-homepage/.github/workflows/rollback-from-issue.yml@refs/heads/main'};delete signed.job_workflow_ref;delete signed.job_workflow_sha;
 const actual={...ghRun,head_branch:'main',path:'.github/workflows/rollback-from-issue.yml',display_title:'Rollback request #5'};
 const github=async()=>({issue:async()=>({number:5}),run:async()=>actual});
 const handle=requestResultAPI({github,verifyRunner:async()=>signed});
 const result=(failureCode='rollback_conflict',reason='failed')=>post('/api/internal/request-result',{issue:5,reason,failureCode});
 assert.equal(validRequestClaims(signed,env),true);
 for(const changes of [{event_name:'push'},{job_workflow_ref:'anything'},{ref:'refs/heads/feature'},{workflow_ref:signed.workflow_ref.replace('@refs/heads/main','@refs/heads/feature')}])assert.equal(validRequestClaims({...signed,...changes},env),false);
 assert.equal((await handle(result('rollback_conflict','success'),env)).status,400);
 assert.equal((await handle(result('made_up'),env)).status,400);
 assert.equal((await handle(result(),env)).status,200);
 assert.equal((await handle(result(),env)).status,200);
 assert.equal((await handle(result('rollback_no_changes'),env)).status,409);
 const stale=requestResultAPI({github:async()=>({...await github(),run:async()=>({...actual,run_attempt:2})}),verifyRunner:async()=>signed});
 assert.equal((await stale(result(),env)).status,403);
 const codex=setup();assert.equal((await codex.handle(result(),codex.env)).status,400);
 let metadata=await recoveryMetadata(env),failed={...run,workflow:'rollback'};
 assert.deepEqual(metadata(5,failed).failure,{code:'rollback_conflict',retryable:false});
 assert.equal(metadata(6,failed).failure.code,'rollback_unverified');
 assert.equal(metadata(5,{...failed,attempt:2}).failure.code,'rollback_unverified');
 assert.deepEqual(metadata(5,{...failed,status:'in_progress'}),{});
 assert.equal(metadata(5,{...run,id:999,workflow:'codex'}).failure,null);
 let dispatches=0;
 const retry=requestsAPI({github:async()=>({retry:async(id,claim,check)=>{await check(failed);await claim('retry:5:123:1');dispatches++;}})});
 const retryRequest=()=>post('/api/requests/5/retry',{requestId:crypto.randomUUID()});
 for(const code of ['rollback_conflict','rollback_no_changes']){
  env.DB.sqlite.prepare('UPDATE request_run_results SET failure_code=?').run(code);
  const response=await retry(retryRequest(),env,owner);assert.equal(response.status,409);assert.ok((await response.json()).error);
 }
 env.DB.sqlite.prepare('DELETE FROM request_run_results').run();
 assert.equal((await retry(retryRequest(),env,owner)).status,409,'unknown rollback failure must not bypass the gate');
 assert.equal(dispatches,0);assert.equal(env.DB.sqlite.prepare('SELECT count(*) n FROM operation_claims').get().n,0);
 env.DB.sqlite.prepare("INSERT INTO request_run_results(run_id,attempt,issue,sha,reason,created_at) VALUES ('123',1,5,?,'failed',?)").run(sha,Date.now());
 assert.equal((await retry(retryRequest(),env,owner)).status,201,'verified transient failure remains retryable');
 assert.equal(dispatches,1);
});
