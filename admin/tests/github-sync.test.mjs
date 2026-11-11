import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import {issueType,branchRequest,runIdentity,selectRequestPull} from '../shared/github-sync.js';
import {deployment} from '../shared/deployment.js';
import {createGitHub,assertManagedIssue,assertManagedPull,REPOSITORY} from '../worker/github.js';
import {requestCatalog} from '../worker/request-list.js';
import {requestState} from '../shared/requests.js';
import {requestLabel,isRevert} from '../src/api.js';
import {requestResultAPI,validRequestClaims} from '../worker/request-recovery.js';
import {database} from './d1.mjs';
const env={ADMIN_ENV:'production',GITHUB_REPOSITORY:REPOSITORY,GITHUB_BASE:'main',GITHUB_WORKFLOW_REF:'main',GITHUB_ENABLED:'true',APP_ORIGIN:'https://admin.example'};
const config=deployment(env),sha='a'.repeat(40),base={ref:'main',repo:{full_name:REPOSITORY}},repo=base.repo;
const issue=(number,label='codex-auto')=>({number,title:'GitHub 수정 요청',state:'open',body:'### 수정 내용\n소개 문구 수정',labels:[{name:label}],created_at:'2026-11-11T00:00:00Z'});
const pr=(number,request,kind='issue')=>({number,title:'변경',state:'open',base,head:{repo,ref:`codex/${kind}-${request}-123`,sha},draft:false,mergeable:true});
const run=(id,issueId=50,workflow='codex')=>({id,run_attempt:1,head_branch:'main',event:'issues',path:`.github/workflows/${workflow==='rollback'?'rollback-from-issue':'codex-comment'}.yml`,display_title:`${workflow==='rollback'?'Rollback':'Codex'} request #${issueId}`,created_at:'2026-11-11T00:00:00Z',status:'completed',conclusion:'failure',html_url:`https://github.com/${REPOSITORY}/actions/runs/${id}`});
test('only recognized GitHub request labels and generated same-repository main PRs are eligible',()=>{
 for(const label of ['codex-auto','rollback-request','rollback-simple-request'])assertManagedIssue(issue(1,label),config);
 for(const label of ['enhancement','admin-preview'])assert.throws(()=>assertManagedIssue(issue(1,label),config));
 assert.throws(()=>assertManagedIssue({...issue(1),pull_request:{}},config));
 assert.throws(()=>assertManagedIssue({...issue(1),labels:[{name:'codex-auto'},{name:'admin-preview'}]},config));
 assertManagedPull(pr(51,50),sha,config);assertManagedPull(pr(12,11,'rollback-issue'),sha,config);
 for(const value of [{...pr(51,50),base:{...base,ref:'other'}},{...pr(51,50),head:{...pr(51,50).head,repo:{full_name:'attacker/fork'}}},{...pr(51,50),head:{repo,ref:'manual-feature',sha}}])assert.throws(()=>assertManagedPull(value,sha,config));
 assert.equal(branchRequest('codex/rollback-issue-11-123').kind,'revert');assert.equal(branchRequest('codex/issue-0-123'),null);
});
test('run correlation binds workflow, branch, event and exact issue or PR number',()=>{
 assert.equal(runIdentity(run(1),config).issue,50);
 assert.equal(runIdentity(run(2,11,'rollback'),config).workflow,'rollback');
 assert.equal(runIdentity({...run(1),display_title:'Codex PR #51',event:'issue_comment'},config).pullNumber,51);
 for(const value of ['50','#50','https://github.com/MNG-lab/mng-homepage/issues/50'])assert.equal(runIdentity({...run(1),event:'workflow_dispatch',display_title:'Codex request #'+value},config).issue,50);
 for(const changed of [{head_branch:'other'},{path:'.github/workflows/other.yml'},{event:'push'},{display_title:'Codex request #https://github.com/other/repo/issues/50'},{display_title:'Codex comment-to-code'}])assert.equal(runIdentity({...run(1),...changed},config),null);
 assert.equal(runIdentity(run(1),deployment()),null);
});
test('catalog imports historical requests, prioritizes open PRs, keeps revert semantics, and follows external state',async()=>{
 const DB=database();let pulls=[{...pr(51,50),state:'closed',merged:true},{...pr(60,50),state:'closed'},pr(52,50),pr(12,11,'rollback-issue')];
 const api={list:async()=>[issue(50),issue(11,'rollback-request')],pulls:async()=>pulls,runs:async()=>[{id:1,issue:50,title:'Codex request #50',status:'completed',conclusion:'failure'},{id:2,pullNumber:52,title:'Codex PR #52',status:'completed',conclusion:'success'}]};
 let rows=await requestCatalog(api,{...env,DB}),change=rows.find(r=>r.id===50),revert=rows.find(r=>r.id===11);
 assert.equal(change.pull.number,52);assert.equal(change.run.id,2);assert.equal(requestState(change),'review');assert.equal(revert.kind,'revert');assert.equal(isRevert(revert),true);
 assert.equal(requestLabel({...revert,pull:{...revert.pull,merged:true}}),'변경 취소 완료');
 pulls=pulls.map(p=>p.number===52?{...p,state:'closed',merged:true}:p);change=(await requestCatalog(api,{...env,DB})).find(r=>r.id===50);assert.equal(requestState(change),'done');assert.equal(change.pull.number,52);
 assert.equal(selectRequestPull([pr(51,50),{...pr(52,50),state:'closed'}],50).number,51);
});
async function setup({kind='change',active=false,scope='site'}={}){
 const calls=[],DB=database(),i=issue(50,kind==='revert'?'rollback-request':'codex-auto'),r=run(200,50,kind==='revert'?'rollback':'codex'),p=pr(51,50,kind==='revert'?'rollback-issue':'issue');
 const {privateKey}=await generateKeyPair('RS256',{extractable:true});
 const gh=await createGitHub({...env,DB,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)},async(url,options)=>{
  calls.push({url,method:options.method,body:options.body&&JSON.parse(options.body)});
  if(url.includes('access_tokens'))return Response.json({token:'mock'});
  if(url.includes('/pulls?'))return Response.json(active?[p]:[]);
  if(url.endsWith('/issues/50'))return Response.json(i);
  if(url.endsWith('/pulls/51'))return Response.json(p);
  if(url.includes('/pulls/51/files'))return Response.json([{filename:scope==='site'?'src/content/members.js':'.github/workflows/test.yml'}]);
  if(url.includes('/actions/runs?'))return Response.json({workflow_runs:[{path:'.github/workflows/ci-quality.yml',head_sha:sha,pull_requests:[{number:51}],status:'completed',conclusion:'success'}]});
  if(url.includes('/actions/workflows/'))return url.endsWith('/dispatches')?new Response(null,{status:204}):Response.json({workflow_runs:url.includes(kind==='revert'?'rollback-from-issue':'codex-comment')?[r]:[]});
  if(url.endsWith('/actions/runs/200'))return Response.json(r);
  if(url.endsWith('/pulls/51/merge'))return Response.json({merged:true,sha});
  return new Response(null,{status:204});
 });return {gh,calls,i,p,r,DB};
}
test('GitHub issue retry uses shared current automation; rollback retries its exact run and refuses duplicates',async()=>{
 const normal=await setup();let claims=[];await normal.gh.retry(50,async key=>claims.push(key));assert.deepEqual(normal.calls.at(-1).body,{ref:'main',inputs:{issue:'50',admin_request:'true'}});assert.deepEqual(claims,['retry:50:200:1']);
 const rollback=await setup({kind:'revert'});await rollback.gh.retry(50,async()=>{});assert.ok(rollback.calls.at(-1).url.endsWith('/actions/runs/200/rerun'));
 const running=await setup({active:true});await assert.rejects(running.gh.retry(50,async()=>assert.fail('claimed duplicate')),/실패가 확인/);
});
test('admin approves only checked website changes from GitHub and closes the original issue',async()=>{
 const good=await setup({active:true});await good.gh.merge(51,sha);assert.ok(good.calls.some(c=>c.url.endsWith('/issues/50')&&c.body?.state_reason==='completed'));
 const bad=await setup({active:true,scope:'infrastructure'});await assert.rejects(bad.gh.merge(51,sha),/범위를 벗어나는/);assert.ok(!bad.calls.some(c=>c.url.endsWith('/merge')));
 const closed=await setup({active:true});closed.i.state='closed';await assert.rejects(closed.gh.merge(51,sha),/종료된 요청/);
 const close=await setup({active:true});await close.gh.close(50);assert.ok(close.calls.some(c=>c.url.endsWith('/pulls/51')&&c.body?.state==='closed'));assert.ok(close.calls.some(c=>c.url.endsWith('/issues/50')&&c.body?.state==='closed'));
});
test('direct GitHub authentication reports bind exact signed main workflow and request run',async()=>{
 const p={sub:`repo:${REPOSITORY}:ref:refs/heads/main`,repository:REPOSITORY,repository_id:'1164495587',repository_owner_id:'263300045',ref:'refs/heads/main',event_name:'issues',run_attempt:'1',run_id:'200',sha,workflow_ref:`${REPOSITORY}/.github/workflows/codex-comment.yml@refs/heads/main`};
 assert.equal(validRequestClaims(p,env),true);assert.equal(validRequestClaims({...p,job_workflow_ref:'wrong'},env),false);assert.equal(validRequestClaims({...p,event_name:'push'},env),false);
 const DB=database(),r={...run(200),head_sha:sha};const handler=requestResultAPI({verifyRunner:async()=>p,github:async()=>({issue:async()=>issue(50),run:async()=>r})});
 const post=id=>new Request(env.APP_ORIGIN+'/api/internal/request-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({issue:id,reason:'auth_required'})});
 assert.equal((await handler(post(50),{...env,DB})).status,200);assert.equal(DB.sqlite.prepare('SELECT reason FROM request_run_results').get().reason,'auth_required');assert.equal((await handler(post(51),{...env,DB})).status,403);
});

test('skipped bot events cannot hide an actual failed request run',async()=>{
 const {privateKey}=await generateKeyPair('RS256',{extractable:true});
 const gh=await createGitHub({...env,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)},async url=>{
  if(url.includes('access_tokens'))return Response.json({token:'mock'});
  if(url.includes('rollback-from-issue'))return Response.json({workflow_runs:[]});
  return Response.json({workflow_runs:[{...run(200),conclusion:'skipped'},run(100)]});
 });
 assert.deepEqual((await gh.runs()).map(r=>r.id),[100]);
});
