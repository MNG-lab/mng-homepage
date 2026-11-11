import test from 'node:test';
import assert from 'node:assert/strict';
import {deviceAPI,validClaims} from '../worker/device-login.js';
import {database} from './d1.mjs';
const origin='https://test.example',sha='a'.repeat(40),owner={email:'chominho96@gmail.com',sub:'owner-sub',role:'owner',authTime:Math.floor(Date.now()/1000)};
const claims={sub:'repo:MNG-lab/mng-homepage:ref:refs/heads/codex/admin-portal',repository:'MNG-lab/mng-homepage',repository_id:'1164495587',repository_owner_id:'263300045',ref:'refs/heads/codex/admin-portal',event_name:'workflow_dispatch',run_attempt:'1',run_id:'123',sha,job_workflow_sha:sha,workflow_ref:'MNG-lab/mng-homepage/.github/workflows/codex-comment.yml@refs/heads/codex/admin-portal',job_workflow_ref:'MNG-lab/mng-homepage/.github/workflows/admin-device-login.yml@refs/heads/codex/admin-portal'};
const post=(path,body,source=origin)=>new Request(origin+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json',Authorization:'Bearer mock'},body:JSON.stringify(body)});
const start=(kind,source)=>post('/api/settings/device-login/start',{kind},source);
const callback=(id,phase,extra={})=>post('/api/internal/device-login',{id,phase,...extra});
function setup(){const DB=database();DB.sqlite.prepare("UPDATE members SET sub=? WHERE email=?").run(owner.sub,owner.email);const env={APP_ORIGIN:origin,GITHUB_ENABLED:'true',MEMBERS_DB:'true',GITHUB_REPOSITORY:'MNG-lab/mng-homepage',GITHUB_TEST_BASE:'codex/admin-sandbox',GITHUB_WORKFLOW_REF:'codex/admin-portal',DB};let saved=0;const gh={automationHead:async()=>sha,dispatchDevice:async()=>{},updateCodex:async()=>{saved++;}};return {env,handle:deviceAPI({github:async()=>gh,verifyRunner:async()=>claims}),saved:()=>saved};}
test('runner claims bind repository IDs, branch, exact workflow SHA and one run',()=>{
 const row={sha};assert.equal(validClaims(claims,row),true);
 for(const key of Object.keys(claims))assert.equal(validClaims({...claims,[key]:'wrong'},row),false,key);
 assert.equal(validClaims(claims,{sha,run_id:'124'}),false);
});
test('owner and same-origin login required without a freshness deadline; concurrent sessions are refused',async()=>{
 const {env,handle}=setup();
 for(const user of [null,{...owner,role:'admin'}])assert.equal((await handle(start('login'),env,user)).status,403);
 assert.equal((await handle(start('login','https://evil.test'),env,owner)).status,403);
 assert.equal((await handle(start('verify'),env,owner)).status,400);
 assert.equal((await handle(start('login'),env,{...owner,authTime:Math.floor(Date.now()/1000)-1800})).status,202);
 assert.equal((await handle(start('login'),env,owner)).status,409);
 assert.equal((await handle(new Request(origin+'/api/settings/device-login'),env,{...owner,role:'editor'})).status,403);
});
test('real login saves once, records renewal and never persists tokens; rehearsal is rejected',async()=>{
 const {env,handle,saved}=setup();
 const {id}=await (await handle(start('login'),env,owner)).json();
 assert.equal((await handle(callback(id,'challenge',{code:'ABCD-12345'}),env)).status,403);
 assert.equal((await handle(callback(id,'hello'),env)).status,200);
 assert.equal((await handle(callback(id,'challenge',{code:'ABCD-12345'}),env)).status,200);
 const auth=JSON.stringify({tokens:{access_token:'sensitive-access',refresh_token:'sensitive-refresh'}});
 assert.equal((await handle(callback(id,'save',{auth}),env)).status,200);
 assert.equal((await handle(callback(id,'save',{auth}),env)).status,200);assert.equal(saved(),1);
 const state=await (await handle(new Request(origin+'/api/settings/device-login'),env,owner)).json();assert.equal(state.flow.state,'connected');assert.equal(state.flow.code,null);
 assert.ok(!JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM device_flows').all()).includes('sensitive'));
 assert.ok(!JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM audit').all()).includes('sensitive'));
 assert.ok(env.DB.sqlite.prepare('SELECT updated_at FROM codex_credential_state').get().updated_at>0);
 for(const kind of ['simulate','verify'])assert.equal((await handle(start(kind),env,owner)).status,400);
});
test('invalid signatures, expired sessions and revoked owners cannot save credentials',async()=>{
 const {env,handle}=setup();const {id}=await (await handle(start('login'),env,owner)).json();
 const rejected=deviceAPI({verifyRunner:async()=>{throw Error('bad signature');}});assert.equal((await rejected(callback(id,'hello'),env)).status,403);
 env.DB.sqlite.prepare("UPDATE members SET role='admin'").run();assert.equal((await handle(callback(id,'hello'),env)).status,403);
 env.DB.sqlite.prepare("UPDATE members SET role='owner'").run();env.DB.sqlite.prepare('UPDATE device_flows SET expires_at=0').run();assert.equal((await handle(callback(id,'hello'),env)).status,403);
});
