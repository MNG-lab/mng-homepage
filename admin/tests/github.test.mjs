import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import {createGitHub,assertDeploymentConfig,assertManagedPull,assertManagedIssue,REPOSITORY,TEST_BASE,WORKFLOW_REF} from '../worker/github.js';
const env={GITHUB_REPOSITORY:REPOSITORY,GITHUB_TEST_BASE:TEST_BASE,GITHUB_WORKFLOW_REF:WORKFLOW_REF,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2'};
const sha='a'.repeat(40);
const pr={base:{repo:{full_name:REPOSITORY},ref:TEST_BASE},head:{repo:{full_name:REPOSITORY},ref:'admin-preview/issue-123-456',sha},state:'open',draft:false,mergeable:true};
const issue={number:123,labels:[{name:'admin-preview'}],body:'<!-- mng-admin-preview:v1 -->\nrequest'};
test('production branches, other repositories, forks and stale heads are rejected',()=>{
 assertDeploymentConfig(env);assertManagedPull(pr,sha);assertManagedIssue(issue);
 for(const key of ['GITHUB_REPOSITORY','GITHUB_TEST_BASE','GITHUB_WORKFLOW_REF']) assert.throws(()=>assertDeploymentConfig({...env,[key]:'main'}));
 assert.throws(()=>assertManagedPull({...pr,base:{...pr.base,ref:'main'}}));
 assert.throws(()=>assertManagedPull({...pr,head:{...pr.head,repo:{full_name:'other/repo'}}}));
 assert.throws(()=>assertManagedPull({...pr,head:{...pr.head,ref:'codex/issue-123-456'}}));
 assert.throws(()=>assertManagedPull(pr,'b'.repeat(40)));
 assert.throws(()=>assertManagedIssue({...issue,labels:[{name:'codex-auto'}]}));
 assert.throws(()=>assertManagedIssue({...issue,pull_request:{}}));
});
test('installation token is restricted to one repo; requests never add production triggers',async()=>{
 const {privateKey}=await generateKeyPair('RS256',{extractable:true});
 const config={...env,GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)};
 const calls=[];
 const gh=await createGitHub(config,async(url,options)=>{
  assert.equal(options.redirect,'manual');
  const body=options.body?JSON.parse(options.body):null;calls.push({url,body,method:options.method});
  if(url.includes('/access_tokens')) return Response.json({token:'mock'});
  if(url.endsWith('/issues/123')) return Response.json(issue);
  if(url.endsWith('/pulls/123/files?per_page=100'))return Response.json([{filename:'src/App.jsx'}]);
  if(url.endsWith('/pulls/123')) return Response.json(pr);
  if(url.includes('/actions/runs?')) return Response.json({workflow_runs:[{id:1,path:'.github/workflows/ci-quality.yml',head_sha:sha,pull_requests:[{number:123}],status:'completed',conclusion:'success'}]});
  if(url.endsWith('/dispatches')) return new Response(null,{status:204});
  return Response.json({number:123,merged:true});
 });
 assert.deepEqual(calls[0].body.repositories,['mng-homepage']);
 assert.equal(calls[0].body.permissions.secrets,undefined);
 await gh.createRequest({title:'Update members',description:'Test text',page:'Members',requestId:'12345678-1234-1234-1234-123456789abc'});
 assert.deepEqual(calls.at(-1).body.labels,['admin-preview']);
 assert.ok(!calls.at(-1).body.body.includes('@gmail.com'));
 await gh.dispatch(123);assert.equal(calls.at(-1).body.ref,WORKFLOW_REF);
 const count=calls.length;
 await assert.rejects(gh.merge(123,'b'.repeat(40)));assert.equal(calls.length,count+1);
 await gh.merge(123,sha);assert.deepEqual(calls.find(c=>c.url.endsWith('/merge')).body,{sha,merge_method:'merge'});
 await assert.rejects(gh.issue('../main'));
});

test('retry uses original issue and fresh workflow, rejecting closed requests, existing PRs and active runs',async()=>{
 const {privateKey}=await generateKeyPair('RS256',{extractable:true});
 let issueState='open',pulls=[],status='completed',dispatches=0,checks=0,claimed;
 const gh=await createGitHub({...env,GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)},async(url,options)=>{
  if(url.includes('/access_tokens'))return Response.json({token:'mock'});
  if(url.endsWith('/issues/123'))return Response.json({...issue,state:issueState});
  if(url.includes('/pulls?'))return Response.json(pulls);
  const run={id:456,run_attempt:2,head_branch:WORKFLOW_REF,event:'workflow_dispatch',path:'.github/workflows/codex-comment.yml',created_at:'2026-11-10T00:00:00Z',display_title:'Admin preview #123',status,conclusion:status==='completed'?'failure':null};
  if(url.includes('/workflows/codex-comment.yml/runs?'))return Response.json({workflow_runs:[run]});
  if(url.endsWith('/actions/runs/456'))return Response.json(run);
  if(url.endsWith('/dispatches')){dispatches++;assert.deepEqual(JSON.parse(options.body),{ref:WORKFLOW_REF,inputs:{issue:'123'}});return new Response(null,{status:204});}
  throw Error('Unexpected URL '+url);
 });
 const retry=()=>gh.retry(123,async key=>{claimed=key;},async run=>{assert.equal(run.attempt,2);checks++;});
 issueState='closed';await assert.rejects(retry());issueState='open';
 pulls=[pr];await assert.rejects(retry());pulls=[];
 status='in_progress';await assert.rejects(retry());status='completed';
 assert.equal(dispatches,0);assert.equal(checks,0);
 await retry();assert.equal(dispatches,1);assert.equal(checks,1);assert.equal(claimed,'retry:123:456:2');
});
