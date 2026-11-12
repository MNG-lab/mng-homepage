import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import nacl from 'tweetnacl';
import {blake2b} from '@noble/hashes/blake2.js';
import {createGitHub,REPOSITORY,TEST_BASE,WORKFLOW_REF} from '../worker/github.js';
const current='a'.repeat(40),target='b'.repeat(40),head='c'.repeat(40),tree='d'.repeat(40);
const {privateKey}=await generateKeyPair('RS256',{extractable:true});
const env={GITHUB_REPOSITORY:REPOSITORY,GITHUB_TEST_BASE:TEST_BASE,GITHUB_WORKFLOW_REF:WORKFLOW_REF,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)};
const base={repo:{full_name:REPOSITORY},ref:TEST_BASE};
const source={base,head:{repo:base.repo,ref:'admin-preview/issue-1-1',sha:target},merged_at:'2026-11-10',merge_commit_sha:target};
const restorePR={base,head:{repo:base.repo,ref:'admin-preview/issue-2-2',sha:head},state:'open',draft:false,mergeable:true,body:`<!-- restore:1:${current} -->`};
async function setup({race=false,ci='success',foundation=false}={}){
 const calls=[];const gh=await createGitHub(env,async(url,options)=>{
 const body=options.body?JSON.parse(options.body):null;calls.push({url,body,method:options.method});
 if(url.includes('/access_tokens'))return Response.json({token:'mock'});
 if(url.endsWith('/pulls/1'))return Response.json(source);
 if(url.endsWith('/repos/'+REPOSITORY+'/commits/'+target))return Response.json({sha:target,html_url:'https://github.com/'+REPOSITORY+'/commit/'+target,commit:{message:'Direct website update',committer:{date:'2026-11-10T00:00:00Z'}},files:[{filename:'src/pages/HomePage.jsx'}]});
 if(url.endsWith('/pulls/2'))return Response.json(restorePR);
 if(url.endsWith('/git/ref/heads/'+TEST_BASE))return Response.json({object:{sha:current}});
 if(url.includes('/compare/'))return Response.json({status:'ahead'});
 if(url.endsWith('/git/commits/'+current))return Response.json({tree:{sha:'current-tree'}});
 if(url.endsWith('/git/commits/'+target))return Response.json({tree:{sha:'target-tree'}});
 if(url.endsWith('/git/commits/'+head))return Response.json({tree:{sha:tree}});
 const entry=(path,sha)=>({path,sha,mode:'100644',type:'blob'});
 if(url.endsWith('/git/trees/current-tree?recursive=1'))return Response.json({sha:'current-tree',tree:[entry('.github/workflows/build.yml','new-workflow'),entry('admin/worker/index.js','new-admin'),entry('src/App.jsx','current-core'),entry('src/pages/HomePage.jsx','new-page'),entry('public/media/new.png','new-image')]});
 if(url.endsWith('/git/trees/target-tree?recursive=1'))return Response.json({sha:'target-tree',tree:[entry('.github/workflows/build.yml','old-workflow'),entry('admin/worker/index.js','old-admin'),entry('src/App.jsx',foundation?'old-core':'current-core'),entry('src/pages/HomePage.jsx','old-page'),entry('public/media/old.png','old-image')]});
 if(url.includes('/files?'))return Response.json([{filename:'src/pages/HomePage.jsx'}]);
 if(url.includes('/actions/runs?'))return Response.json({workflow_runs:[{id:1,path:'.github/workflows/ci-quality.yml',head_sha:head,pull_requests:[{number:2}],status:'completed',conclusion:ci}]});
 if(url.endsWith('/git/trees'))return Response.json({sha:tree});
 if(url.endsWith('/git/commits'))return Response.json({sha:'e'.repeat(40)});
 if(url.endsWith('/git/refs/heads/'+TEST_BASE))return Response.json({}, {status:race?422:200});
 if(url.endsWith('/issues/2'))return Response.json({labels:[{name:'admin-preview'}],body:'<!-- mng-admin-preview:v1 -->\n'});
 return Response.json({number:2});
 });return {gh,calls};
}
test('restore preserves current infrastructure and replaces only site snapshot; stale base rejected',async()=>{
 const {gh,calls}=await setup();const plan=await gh.restorePlan(1,current);
 assert.deepEqual(await gh.versionChanges(1),{pages:['Home'],truncated:false});
 assert.equal(plan.baseTree,'current-tree');assert.equal(plan.restoreSafety.allowed,true);assert.ok(plan.entries.every(e=>e.path.startsWith('src/pages/')||e.path.startsWith('public/media/')));assert.equal(plan.entries.find(e=>e.path==='public/media/new.png').sha,null);assert.equal(plan.entries.find(e=>e.path==='src/pages/HomePage.jsx').sha,'old-page');
 await assert.rejects(gh.restorePlan(1,target),/새 변경/);
 assert.ok(!calls.some(c=>c.method!=='GET'&&!c.url.includes('access_tokens')));
});
test('restore approval requires CI and advances only test ref without force; concurrent deployment rejected',async()=>{
 const {gh,calls}=await setup();assert.equal((await gh.merge(2,head)).merged,true);
 const update=calls.find(c=>c.method==='PATCH'&&c.url.includes('/git/refs/'));assert.equal(update.body.force,false);assert.ok(update.url.endsWith(TEST_BASE));
 const commit=calls.find(c=>c.method==='POST'&&c.url.endsWith('/git/commits'));assert.deepEqual(commit.body.parents,[current,head]);
 await assert.rejects((await setup({race:true})).gh.merge(2,head),/상태가 변경/);
 const failed=await setup({ci:'failure'});await assert.rejects(failed.gh.merge(2,head),/CI 검증/);assert.ok(!failed.calls.some(c=>c.method==='PATCH'));
});
test('a shared FE foundation change blocks snapshot creation and approval before writes',async()=>{
 const {gh,calls}=await setup({foundation:true});const plan=await gh.restorePlan(1,current);
 assert.equal(plan.restoreSafety.allowed,false);assert.deepEqual(plan.restoreSafety.blocked,['src/App.jsx']);
 await assert.rejects(gh.restore(1,current,'request',async()=>{}),/공통 기능/);
 await assert.rejects(gh.merge(2,head),/공통 기능/);
 assert.ok(!calls.some(c=>c.method!=='GET'&&!c.url.includes('access_tokens')));
});
test('request cancellation eligibility checks later foundation changes before submission',async()=>{
 assert.equal((await (await setup()).gh.revertEligibility(1)).allowed,true);
 const {gh,calls}=await setup({foundation:true}),result=await gh.revertEligibility(1);
 assert.equal(result.allowed,false);assert.match(result.reason,/공통 기능/);
 assert.ok(!calls.some(c=>c.method!=='GET'&&!c.url.includes('access_tokens')));
});
test('a direct commit has a usable restore plan without inventing a PR number',async()=>{
 const {gh}=await setup();const id='commit-'+target,plan=await gh.restorePlan(id,current);
 assert.equal(plan.revision.kind,'direct');assert.equal(plan.revision.number,undefined);assert.equal(plan.revision.key,id);
 assert.equal(plan.restoreSafety.allowed,true);assert.equal(plan.currentContent,false);
 assert.deepEqual(await gh.versionChanges(id),{pages:['Home'],truncated:false});
});
test('credential endpoint uses only preview secret and sealed ciphertext decrypts correctly',async()=>{
 const recipient=nacl.box.keyPair();const calls=[];
 const gh=await createGitHub(env,async(url,options)=>{const body=options.body?JSON.parse(options.body):null;calls.push({url,body});if(url.includes('access_tokens'))return Response.json({token:'mock'});if(url.endsWith('/public-key'))return Response.json({key:btoa(String.fromCharCode(...recipient.publicKey)),key_id:'key'});return new Response(null,{status:204});},{secrets:true});
 const auth=JSON.stringify({tokens:{access_token:'private-test-access',refresh_token:'private-test-refresh'}});await gh.updateCodex(auth);
 assert.deepEqual(calls[0].body.permissions,{secrets:'write'});assert.ok(calls.at(-1).url.endsWith('/actions/secrets/CODEX_AUTH_JSON_PREVIEW'));
 const cipher=Uint8Array.from(atob(calls.at(-1).body.encrypted_value),c=>c.charCodeAt(0));const ephemeral=cipher.slice(0,32);const nonce=blake2b(new Uint8Array([...ephemeral,...recipient.publicKey]),{dkLen:24});
 assert.equal(new TextDecoder().decode(nacl.box.open(cipher.slice(32),nonce,ephemeral,recipient.secretKey)),auth);
 assert.ok(!JSON.stringify(calls).includes('private-test-access'));
 await assert.rejects(gh.updateCodex('{}'),/인증 파일/);
});
