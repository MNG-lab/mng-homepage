import test from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT, decodeJwt} from 'jose';
import {createHandler} from '../worker/index.js';
const env = {APP_ORIGIN:'https://admin.example.test',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'test-secret',SESSION_SECRET:'a'.repeat(64),MEMBERS_JSON:JSON.stringify({'owner@gmail.com':{role:'owner'}}),ASSETS:{fetch:async()=>new Response('private app')}};
const req=(path,opts={})=>new Request(env.APP_ORIGIN+path,opts);
const cookiePair=s=>s.split(';')[0];
async function begin(handler) {
 const r=await handler(req('/auth/google/start'),env);
 const cookie=cookiePair(r.headers.get('set-cookie'));
 const p=decodeJwt(cookie.split('=')[1]);
 return {cookie,p,url:new URL(r.headers.get('location'))};
}
async function token(payload, expiry='1h') {
 return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuer(env.APP_ORIGIN).setAudience('mng-session').setExpirationTime(expiry).sign(new TextEncoder().encode(env.SESSION_SECRET));
}
test('all private assets and APIs require authentication; host and missing config fail closed',async()=>{
 const h=createHandler();
 for(const p of ['/dashboard','/assets/app.js','/settings']) assert.equal((await h(req(p),env)).headers.get('location'),'/login');
 assert.equal((await h(req('/api/session'),env)).status,401);
 assert.equal((await h(new Request('https://other.test/login'),env)).status,400);
 assert.equal((await h(req('/login'),{...env,SESSION_SECRET:''})).status,503);
 assert.equal((await h(req('/login'),env)).status,200);
});
test('login uses state, nonce, PKCE and secure cookie; rejects invalid state before exchange',async()=>{
 let exchanges=0;
 const h=createHandler({fetchToken:async()=>{exchanges++; throw Error();}});
 const {cookie,p,url}=await begin(h);
 assert.equal(url.searchParams.get('scope'),'openid email');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('state'),p.state);
 assert.equal(url.searchParams.get('nonce'),p.nonce);
 assert.ok(p.verifier.length>=43);
 const result=await h(req('/auth/google/callback?code=abc&state=wrong',{headers:{Cookie:cookie}}),env);
 assert.equal(result.headers.get('location'),'/login?error=1');assert.equal(exchanges,0);
});
test('verified identity gets session; wrong nonce, unknown email and unverified email fail',async()=>{
 for(const variant of ['ok','nonce','email','unverified']) {
  let p;
  const h=createHandler({fetchToken:async(_,options)=>{assert.equal(options.body.get('code_verifier'),p.verifier);return Response.json({id_token:'mock'});},verifyIdentity:async()=>({sub:'google-sub',email:variant==='email'?'stranger@gmail.com':'owner@gmail.com',email_verified:variant!=='unverified',nonce:variant==='nonce'?'wrong':p.nonce})});
  const flow=await begin(h);p=flow.p;
  const r=await h(req(`/auth/google/callback?code=abc&state=${p.state}`,{headers:{Cookie:flow.cookie}}),env);
  assert.equal(r.headers.get('location'),variant==='ok'?'/dashboard':'/login?error=1');
  if(variant==='ok') {
   const c=r.headers.getSetCookie().find(x=>x.startsWith('__Host-mng_session='));
   assert.match(c,/HttpOnly; Secure; SameSite=Lax/);
   assert.match(c,/Max-Age=21600/);
   const claims=decodeJwt(cookiePair(c).split('=')[1]);assert.equal(claims.exp-claims.iat,21600);
   const session=await h(req('/api/session',{headers:{Cookie:cookiePair(c)}}),env);
   assert.equal((await session.json()).user.role,'owner');
  }
 }
});
test('roles are resolved on each request, revoked memberships and expired or tampered sessions fail',async()=>{
 const h=createHandler(); const jwt=await token({email:'owner@gmail.com',sub:'google-sub'});
 const r=()=>req('/api/session',{headers:{Cookie:`__Host-mng_session=${jwt}`}});
 assert.equal((await(await h(r(),{...env,MEMBERS_JSON:JSON.stringify({'owner@gmail.com':{role:'editor'}})})).json()).user.role,'editor');
 assert.equal((await h(r(),{...env,MEMBERS_JSON:'{}'})).status,401);
 assert.equal((await h(r(),{...env,MEMBERS_JSON:JSON.stringify({'owner@gmail.com':{role:'owner',sub:'other'}})})).status,401);
 for(const value of [jwt+'bad',await token({email:'owner@gmail.com',sub:'google-sub'},'0s')]) assert.equal((await h(req('/api/session',{headers:{Cookie:`__Host-mng_session=${value}`}}),env)).status,401);
});
test('logout requires same-origin POST and preview denies all mutation APIs',async()=>{
 const h=createHandler();
 assert.equal((await h(req('/auth/logout'),env)).status,403);
 assert.equal((await h(req('/auth/logout',{method:'POST',headers:{Origin:'https://evil.test'}}),env)).status,403);
 const r=await h(req('/auth/logout',{method:'POST',headers:{Origin:env.APP_ORIGIN}}),env);
 assert.match(r.headers.get('set-cookie'),/Max-Age=0/);
 const jwt=await token({email:'owner@gmail.com',sub:'google-sub'});
 assert.equal((await h(req('/api/requests',{method:'POST',headers:{Cookie:`__Host-mng_session=${jwt}`}}),env)).status,404);
});

const refreshRequest=jwt=>req('/api/session/refresh',{method:'POST',headers:{Cookie:`__Host-mng_session=${jwt}`,Origin:env.APP_ORIGIN,'Content-Type':'application/json'},body:'{}'});

test('active sessions renew for six hours, preserve login time, and expire after inactivity',async t=>{
 const start=Date.UTC(2026,10,11);t.mock.timers.enable({apis:['Date'],now:start});
 const authTime=Math.floor(start/1000);
 const jwt=await token({email:'owner@gmail.com',sub:'google-sub',iat:authTime});
 const h=createHandler();
 t.mock.timers.tick(30*60000);
 const refreshed=await h(refreshRequest(jwt),env);assert.equal(refreshed.status,200);
 const cookie=refreshed.headers.get('set-cookie');assert.match(cookie,/Max-Age=21600/);
 const renewed=cookiePair(cookie).split('=')[1],claims=decodeJwt(renewed);
 assert.equal(claims.exp-claims.iat,21600);assert.equal(claims.auth_time,authTime);
 t.mock.timers.tick(61*60000);
 assert.equal((await h(refreshRequest(jwt),env)).status,401,'expired old token cannot renew');
 const current=await h(req('/api/session',{headers:{Cookie:cookiePair(cookie)}}),env);
 assert.equal(current.status,200);assert.equal((await current.json()).user.authTime,authTime);
 assert.equal(current.headers.get('set-cookie'),null,'background reads must not extend expiry');
 t.mock.timers.tick(5*60*60000);
 const expired=await h(refreshRequest(renewed),env);
 assert.equal(expired.status,401);assert.equal(expired.headers.get('set-cookie'),null);
});

test('refresh requires same-origin JSON POST and current membership',async()=>{
 const jwt=await token({email:'owner@gmail.com',sub:'google-sub'}),h=createHandler();
 const headers={Cookie:`__Host-mng_session=${jwt}`};
 assert.equal((await h(req('/api/session/refresh',{headers}),env)).status,405);
 for(const origin of [undefined,'https://other.test']){
  const r=await h(req('/api/session/refresh',{method:'POST',headers:{...headers,...(origin?{Origin:origin}:{}),'Content-Type':'application/json'}}),env);
  assert.equal(r.status,403);assert.equal(r.headers.get('set-cookie'),null);
 }
 assert.equal((await h(req('/api/session/refresh',{method:'POST',headers:{...headers,Origin:env.APP_ORIGIN,'Content-Type':'text/plain'}}),env)).status,403);
 const revoked=await h(refreshRequest(jwt),{...env,MEMBERS_JSON:'{}'});assert.equal(revoked.status,401);assert.equal(revoked.headers.get('set-cookie'),null);
 assert.equal((await h(refreshRequest(jwt+'tampered'),env)).status,401);
 const changed=await h(refreshRequest(jwt),{...env,MEMBERS_JSON:JSON.stringify({'owner@gmail.com':{role:'editor'}})});
 assert.equal((await changed.json()).user.role,'editor');
});

test('temporary membership failure is 503 without clearing the session or redirecting',async()=>{
 const jwt=await token({email:'owner@gmail.com',sub:'google-sub'}),h=createHandler();
 const failing={...env,MEMBERS_DB:'true',DB:{prepare(){throw Error('temporary database outage');}}};
 for(const request of [req('/api/session',{headers:{Cookie:`__Host-mng_session=${jwt}`}}),refreshRequest(jwt),req('/dashboard',{headers:{Cookie:`__Host-mng_session=${jwt}`}})]){
  const r=await h(request,failing);assert.equal(r.status,503);assert.equal(r.headers.get('location'),null);assert.equal(r.headers.get('set-cookie'),null);
 }
 assert.equal((await h(refreshRequest(jwt),env)).status,200,'same session works after recovery');
});

test('login errors have a visible alert and clear retry instructions',async()=>{
 const h=createHandler(),normal=await(await h(req('/login'),env)).text(),error=await(await h(req('/login?error=1'),env)).text();
 assert.doesNotMatch(normal,/role="alert"/);
 assert.match(error,/class="login-error" role="alert"/);assert.match(error,/로그인하지 못했습니다/);assert.match(error,/관리자로 등록된 계정인지 확인한 뒤 다시 시도/);assert.match(error,/color:#b42318/);
 assert.match(error,/href="\/auth\/google\/start"/);assert.doesNotMatch(error,/테스트 브랜치|실제 인증/);
});
