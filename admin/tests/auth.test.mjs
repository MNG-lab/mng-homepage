import test from 'node:test';
import assert from 'node:assert/strict';
import {SignJWT, decodeJwt} from 'jose';
import {createHandler} from '../worker/index.js';
import {createSession} from '../worker/sessions.js';
import {database} from './d1.mjs';
import {googleProfilePicture} from '../worker/profile-picture.js';
const allow={limit:async()=>({success:true})};
const env = {APP_ORIGIN:'https://admin.example.test',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'test-secret',SESSION_SECRET:'a'.repeat(64),MEMBERS_JSON:JSON.stringify({'owner@gmail.com':{role:'owner'}}),DB:database(),REQUEST_LIMITER:allow,LOGIN_LIMITER:allow,WRITE_LIMITER:allow,ASSETS:{fetch:async()=>new Response('private app')}};
const req=(path,opts={})=>new Request(env.APP_ORIGIN+path,opts);
const cookiePair=s=>s.split(';')[0];
async function begin(handler) {
 const r=await handler(req('/auth/google/start'),env);
 const cookie=cookiePair(r.headers.get('set-cookie'));
 const p=decodeJwt(cookie.split('=')[1]);
 return {cookie,p,url:new URL(r.headers.get('location'))};
}
async function token(payload, expiry='1h',saved=true) {
 const sid=saved?await createSession(env,payload.email,payload.sub):undefined;
 return new SignJWT({...payload,...(sid?{sid}:{})}).setProtectedHeader({alg:'HS256'}).setIssuer(env.APP_ORIGIN).setAudience('mng-session').setExpirationTime(expiry).sign(new TextEncoder().encode(env.SESSION_SECRET));
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
 assert.equal(url.searchParams.get('scope'),'openid email profile');
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

test('verified Google picture stays in the server session through renewal; missing or unsafe pictures do not block login',async()=>{
 const picture='https://lh3.googleusercontent.com/a/example=s96-c';
 for(const supplied of [picture,undefined,'https://untrusted.example/photo.png']){
  let p;
  const h=createHandler({fetchToken:async()=>Response.json({id_token:'mock'}),verifyIdentity:async()=>({sub:'google-sub',email:'owner@gmail.com',email_verified:true,nonce:p.nonce,picture:supplied})});
  const flow=await begin(h);p=flow.p;
  const callback=await h(req(`/auth/google/callback?code=abc&state=${p.state}`,{headers:{Cookie:flow.cookie}}),env);
  assert.equal(callback.headers.get('location'),'/dashboard');
  const cookie=cookiePair(callback.headers.getSetCookie().find(c=>c.startsWith('__Host-mng_session='))),jwt=cookie.split('=')[1];
  assert.equal(decodeJwt(jwt).picture,undefined,'profile URL is not added to the cookie');
  const response=await h(req('/api/session',{headers:{Cookie:cookie}}),env),user=(await response.json()).user;
  assert.equal(user.picture,supplied===picture?picture:null);assert.equal(user.role,'owner');assert.equal(user.sessionId,undefined);
  assert.equal((await (await h(refreshRequest(jwt),env)).json()).user.picture,user.picture);
  assert.match(response.headers.get('Content-Security-Policy'),/img-src[^;]+https:\/\/\*\.googleusercontent\.com/);
 }
});

test('profile URLs allow only HTTPS Google image hosts without credentials',()=>{
 for(const value of ['https://lh3.googleusercontent.com/a/photo=s96-c','https://lh3.ggpht.com/a/photo'])assert.equal(googleProfilePicture(value),value);
 for(const value of [null,{},'javascript:alert(1)','data:image/png;base64,abc','http://lh3.googleusercontent.com/a','https://googleusercontent.com.attacker.test/a','https://attackergoogleusercontent.com/a','https://name:pass@lh3.googleusercontent.com/a','https://lh3.googleusercontent.com:8443/a','https://localhost/a','x'.repeat(2049)])assert.equal(googleProfilePicture(value),null);
});

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

test('logout revokes all renewed cookies for the session but not a separate login',async()=>{
 const h=createHandler(),jwt=await token({email:'owner@gmail.com',sub:'google-sub'});
 const another=await token({email:'owner@gmail.com',sub:'google-sub'});
 const renewed=await h(refreshRequest(jwt),env);
 const newCookie=cookiePair(renewed.headers.get('set-cookie'));
 assert.equal('sessionId' in (await renewed.json()).user,false);
 const logout=await h(req('/auth/logout',{method:'POST',headers:{Origin:env.APP_ORIGIN,Cookie:newCookie}}),env);
 assert.equal(logout.status,303);
 for(const value of [jwt,newCookie.split('=')[1]]){
  assert.equal((await h(req('/api/session',{headers:{Cookie:`__Host-mng_session=${value}`}}),env)).status,401);
  assert.equal((await h(refreshRequest(value),env)).status,401);
 }
 assert.equal((await h(req('/api/session',{headers:{Cookie:`__Host-mng_session=${another}`}}),env)).status,200);
 const rows=JSON.stringify(env.DB.sqlite.prepare('SELECT * FROM sessions').all());
 assert.ok(!rows.includes(another));assert.ok(!rows.includes(decodeJwt(another).sid));
});

test('concurrent renewals cannot resurrect logout, even if their response arrives last',async()=>{
 for(const updated of [false,true]){
  const h=createHandler(),jwt=await token({email:'owner@gmail.com',sub:'google-sub'});
  let ready,release;const started=new Promise(r=>{ready=r;}),gate=new Promise(r=>{release=r;});
  const held={...env,DB:{...env.DB,prepare(sql){
   const statement=env.DB.prepare(sql);
   if(sql.startsWith('UPDATE sessions')){const run=statement.run;statement.run=async()=>{const result=updated?await run():null;ready();await gate;return result||run();};}
   return statement;
  }}};
  const pending=h(refreshRequest(jwt),held);await started;
  const logout=await h(req('/auth/logout',{method:'POST',headers:{Origin:env.APP_ORIGIN,Cookie:`__Host-mng_session=${jwt}`}}),env);
  assert.equal(logout.status,303);release();const response=await pending;
  assert.equal(response.status,updated?200:401);
  const value=response.headers.get('set-cookie')?.split(';')[0].split('=')[1]||jwt;
  assert.equal((await h(refreshRequest(value),env)).status,401);
  assert.equal((await h(req('/api/session',{headers:{Cookie:`__Host-mng_session=${value}`}}),env)).status,401);
 }
});

test('stateless legacy cookies and missing or expired server sessions fail closed',async()=>{
 const h=createHandler(),payload={email:'owner@gmail.com',sub:'google-sub'};
 assert.equal((await h(refreshRequest(await token(payload,'6h',false)),env)).status,401);
 const jwt=await token(payload,'6h');
 env.DB.sqlite.prepare('UPDATE sessions SET expires_at=0').run();
 assert.equal((await h(refreshRequest(jwt),env)).status,401);
 env.DB.sqlite.prepare('DELETE FROM sessions').run();
 assert.equal((await h(refreshRequest(jwt),env)).status,401);
});

test('logout storage failure does not claim success or clear the only usable cookie',async()=>{
 const h=createHandler(),jwt=await token({email:'owner@gmail.com',sub:'google-sub'});
 const broken={...env,DB:{prepare(){throw Error('unavailable');}}};
 const r=await h(req('/auth/logout',{method:'POST',headers:{Origin:env.APP_ORIGIN,Cookie:`__Host-mng_session=${jwt}`}}),broken);
 assert.equal(r.status,503);assert.equal(r.headers.get('set-cookie'),null);
});

test('rate limits reject before DB work, use the Cloudflare IP and preserve logout',async()=>{
 const h=createHandler(),keys=[];
 const denied={...env,REQUEST_LIMITER:{limit:async({key})=>{keys.push(key);return{success:false};}},DB:{prepare(){assert.fail('limited request must not touch DB');}}};
 for(const path of ['/login','/api/requests','/api/internal/device-login']){
  const r=await h(req(path,{headers:{'CF-Connecting-IP':'192.0.2.1','X-Forwarded-For':crypto.randomUUID()}}),denied);
  assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');assert.equal(r.headers.get('cache-control'),'no-store');
 }
 assert.deepEqual([...new Set(keys)],['mng-admin:192.0.2.1']);
 assert.equal((await h(req('/auth/google/start'),{...env,LOGIN_LIMITER:{limit:async()=>({success:false})}})).status,429);
 const jwt=await token({email:'owner@gmail.com',sub:'google-sub'});
 const writeLimited={...env,WRITE_LIMITER:{limit:async()=>({success:false})}};
 assert.equal((await h(req('/api/requests',{method:'POST'}),writeLimited)).status,429);
 assert.equal((await h(refreshRequest(jwt),writeLimited)).status,200,'normal refresh uses the general limit');
 const logout=await h(req('/auth/logout',{method:'POST',headers:{Origin:env.APP_ORIGIN,Cookie:`__Host-mng_session=${jwt}`}}),{...env,REQUEST_LIMITER:denied.REQUEST_LIMITER});
 assert.equal(logout.status,303);
 assert.equal((await h(req('/login'),{...env,REQUEST_LIMITER:undefined})).status,503,'missing limiter must fail closed');
});

test('migration maintenance blocks reads, writes and callbacks before touching data',async()=>{
 const fail=()=>assert.fail('database or asset access during migration');
 const blocked={...env,ADMIN_MAINTENANCE:'true',DB:{prepare:fail},ASSETS:{fetch:fail}};
 for(const [path,method] of [['/login','GET'],['/api/session','GET'],['/api/requests','POST'],['/api/internal/device-login','POST'],['/api/internal/request-result','POST']]){
  const response=await createHandler()(req(path,{method}),blocked);assert.equal(response.status,503);assert.equal(response.headers.get('Retry-After'),'120');assert.equal(response.headers.get('Cache-Control'),'no-store');
 }
 assert.equal((await createHandler()(req('/login'),{...env,ADMIN_MAINTENANCE:'false'})).status,200);
});
