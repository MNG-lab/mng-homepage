import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import nacl from 'tweetnacl';
import {deployment} from '../shared/deployment.js';
import {assertDeploymentConfig,assertManagedPull,assertManagedIssue,createGitHub,REPOSITORY} from '../worker/github.js';
import {validClaims,deviceAPI} from '../worker/device-login.js';
import {validRequestClaims,recordCredentialUpdate,assertRetryCredential} from '../worker/request-recovery.js';
import {requestCatalog} from '../worker/request-list.js';
import {database} from './d1.mjs';
const prod={ADMIN_ENV:'production',GITHUB_BASE:'main',GITHUB_WORKFLOW_REF:'main',GITHUB_REPOSITORY:REPOSITORY,APP_ORIGIN:'https://test.example',GITHUB_ENABLED:'true',MEMBERS_DB:'true'};
const preview={...prod,ADMIN_ENV:'preview',GITHUB_BASE:'codex/admin-sandbox',GITHUB_WORKFLOW_REF:'codex/admin-portal'};
const sha='a'.repeat(40),config=deployment(prod),owner={email:'chominho96@gmail.com',sub:'owner',role:'owner'};
const issue={number:123,title:'[Admin] 운영 수정',state:'open',labels:[{name:'admin-request'}],body:'<!-- mng-admin:v1 -->\n## 수정 요청\n내용'};
const pull={number:124,base:{repo:{full_name:REPOSITORY},ref:'main'},head:{repo:{full_name:REPOSITORY},ref:'admin/issue-123-456',sha},state:'open',draft:false,mergeable:true};
const claims=job=>({sub:`repo:${REPOSITORY}:ref:refs/heads/main`,repository:REPOSITORY,repository_id:'1164495587',repository_owner_id:'263300045',ref:'refs/heads/main',event_name:'workflow_dispatch',run_attempt:'1',run_id:'456',sha,job_workflow_sha:sha,workflow_ref:`${REPOSITORY}/.github/workflows/codex-comment.yml@refs/heads/main`,job_workflow_ref:`${REPOSITORY}/.github/workflows/${job}@refs/heads/main`});
test('production accepts only explicit main configuration and isolates issue/PR writes',()=>{
 assertDeploymentConfig(prod);assertDeploymentConfig(preview);assertManagedPull(pull,sha,config);assertManagedIssue(issue,config);
 for(const altered of [{GITHUB_BASE:'codex/admin-sandbox'},{GITHUB_WORKFLOW_REF:'codex/admin-portal'},{ADMIN_ENV:'typo'},{GITHUB_REPOSITORY:'other/repo'}])assert.throws(()=>assertDeploymentConfig({...prod,...altered}));
 assert.throws(()=>assertManagedIssue(issue));assert.throws(()=>assertManagedPull(pull,sha));
 for(const ref of ['admin-preview/issue-123-456','main'])assert.throws(()=>assertManagedPull({...pull,head:{...pull.head,ref}},sha,config));
 assert.throws(()=>assertManagedPull({...pull,head:{...pull.head,repo:{full_name:'other/repo'}}},sha,config));
 const existing={...pull,head:{...pull.head,ref:'codex/issue-50-10'},merged_at:'2026-11-10'};
 assertManagedPull(existing,undefined,config);assertManagedPull(existing,sha,config);
});
test('production OIDC callbacks cannot be authorized by preview runs',()=>{
 const login=claims('admin-device-login.yml'),run=claims('admin-request.yml');
 assert.equal(validClaims(login,{sha},prod),true);assert.equal(validClaims(login,{sha},preview),false);
 assert.equal(validRequestClaims(run,prod),true);assert.equal(validRequestClaims(run,preview),false);
 for(const field of Object.keys(login))assert.equal(validClaims({...login,[field]:'wrong'},{sha},prod),false,field);
 for(const field of Object.keys(run))assert.equal(validRequestClaims({...run,[field]:'wrong'},prod),false,field);
});
test('production request, dispatch, merge and credential writes use main and CODEX_CLI_KEY only',async()=>{
 const {privateKey}=await generateKeyPair('RS256',{extractable:true}),key=nacl.box.keyPair(),calls=[];
 const gh=await createGitHub({...prod,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)},async(url,options)=>{
  const body=options.body&&JSON.parse(options.body);calls.push({url,method:options.method,body});
  if(url.includes('access_tokens'))return Response.json({token:'mock'});
  if(url.endsWith('/public-key'))return Response.json({key:btoa(String.fromCharCode(...key.publicKey)),key_id:'1'});
  if(url.endsWith('/issues/123')||url.endsWith('/issues'))return Response.json(issue);
  if(url.endsWith('/pulls/124'))return Response.json(pull);
  if(url.endsWith('/pulls/124/files?per_page=100'))return Response.json([{filename:'src/content/home.js'}]);
  if(url.includes('/actions/runs?'))return Response.json({workflow_runs:[{id:500,path:'.github/workflows/ci-quality.yml',head_sha:sha,pull_requests:[{number:124}],status:'completed',conclusion:'success'}]});
  if(url.endsWith('/pulls/124/merge'))return Response.json({merged:true,sha});
  return new Response(null,{status:204});
 });
 await gh.createRequest({requestId:crypto.randomUUID(),title:'제목',page:'Home',description:'설명'});
 assert.deepEqual(calls.at(-1).body.labels,['admin-request']);assert.match(calls.at(-1).body.body,/mng-admin:v1/);
 await gh.dispatch(123);assert.deepEqual(calls.at(-1).body,{ref:'main',inputs:{issue:'123',admin_request:'true'}});
 await gh.updateCodex(JSON.stringify({tokens:{access_token:'do-not-print',refresh_token:'refresh'}}));
 assert.ok(calls.at(-1).url.endsWith('/actions/secrets/CODEX_CLI_KEY'));assert.ok(!JSON.stringify(calls).includes('do-not-print'));
 await gh.merge(124,sha);assert.ok(calls.some(c=>c.url.endsWith('/pulls/124/merge')&&c.body.sha===sha));
 assert.ok(!calls.some(c=>c.url.includes('CODEX_AUTH_JSON_PREVIEW')||JSON.stringify(c.body||{}).includes('admin-sandbox')));
});
test('same DB preserves test data while keeping production catalog and credential status separate',async()=>{
 const DB=database();await recordCredentialUpdate({...preview,DB});
 DB.sqlite.prepare("INSERT INTO request_run_results VALUES ('456',1,123,?,'auth_required',1)").run(sha);
 await assert.rejects(assertRetryCredential({...prod,DB},123,{id:456,attempt:1,createdAt:'2000-01-01'}));
 await recordCredentialUpdate({...prod,DB});await assertRetryCredential({...prod,DB},123,{id:456,attempt:1,createdAt:'2000-01-01'});
 const {privateKey}=await generateKeyPair('RS256',{extractable:true});
 DB.sqlite.prepare('INSERT INTO github_catalog(kind,id,payload) VALUES (?,?,?)').run('issues',70,JSON.stringify({number:70,title:'test only'}));
 const gh=await createGitHub({...prod,DB,GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await exportPKCS8(privateKey)},async url=>url.includes('access_tokens')?Response.json({token:'mock'}):Response.json([issue]));
 assert.deepEqual((await gh.list()).map(i=>i.number),[123]);assert.ok(DB.sqlite.prepare("SELECT * FROM github_catalog WHERE kind='issues' AND id=70").get());
 const requests=await requestCatalog({list:async()=>[issue],pulls:async()=>[pull],runs:async()=>[]},{...prod,DB});assert.equal(requests[0].pull.number,124);
});
test('production device flow ignores preview login history and records a production credential renewal',async()=>{
 const DB=database();DB.sqlite.prepare('UPDATE members SET sub=? WHERE email=?').run(owner.sub,owner.email);
 DB.sqlite.prepare("INSERT INTO device_flows(id,owner,subject,kind,sha,state,created_at,expires_at) VALUES ('old',?,?,'login',?,'connected',1,9999999999999)").run(owner.email,owner.sub,sha);
 let saves=0;const env={...prod,DB},handler=deviceAPI({github:async()=>({automationHead:async()=>sha,dispatchDevice:async()=>{},updateCodex:async()=>{saves++;}}),verifyRunner:async()=>claims('admin-device-login.yml')});
 const get=()=>new Request(prod.APP_ORIGIN+'/api/settings/device-login');
 const post=(path,body)=>new Request(prod.APP_ORIGIN+path,{method:'POST',headers:{Origin:prod.APP_ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await(await handler(get(),env,owner)).json()).flow,null);
 const {id}=await(await handler(post('/api/settings/device-login/start',{kind:'login'}),env,owner)).json();assert.ok(id);
 const callback=(phase,extra={})=>handler(post('/api/internal/device-login',{id,phase,...extra}),env,null);
 assert.equal((await callback('hello')).status,200);
 assert.equal((await callback('save',{auth:JSON.stringify({tokens:{access_token:'private',refresh_token:'private'}})})).status,200);assert.equal(saves,1);
 assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM production_credential_state').get().n,1);
 assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM codex_credential_state').get().n,0);
});

test('deployed origin and trusted callback clients use the same production host',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {ADMIN_ORIGIN}=await import('../shared/hosting.js');
 const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 assert.equal(config.name,'admin');assert.equal(config.vars.APP_ORIGIN,ADMIN_ORIGIN);assert.equal(ADMIN_ORIGIN,'https://admin.mng-lab.workers.dev');assert.equal(config.d1_databases[0].database_name,'mng-admin');
 for(const name of ['device-login-job.mjs','run-request-codex.mjs','report-github-result.mjs']){
  const script=await readFile(new URL('../scripts/'+name,import.meta.url),'utf8');assert.match(script,/import \{ADMIN_ORIGIN\} from '\.\.\/shared\/hosting.js'/);assert.doesNotMatch(script,/chominho96-aaa|mng-admin-preview/);
 }
 const workflow=await readFile(new URL('../../.github/workflows/codex-comment.yml',import.meta.url),'utf8');assert.match(workflow,/git archive[^\n]+admin\/shared\/hosting.js/);assert.match(workflow,/uses: \.\/.github\/workflows\/admin-request.yml/);
});
