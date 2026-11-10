import {readMember, managementAPI} from './management.js';
import { requestsAPI } from './requests.js';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

const handleRequests = requestsAPI();
const handleManagement = managementAPI();
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const encoder = new TextEncoder();
const ROLES = new Set(['owner', 'admin', 'editor']);
const sessionName = '__Host-mng_session';
const flowName = '__Host-mng_flow';
const ttl = 60 * 60;
const random = () => crypto.randomUUID() + crypto.randomUUID();
function key(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 43) throw new Error('Not configured');
  return encoder.encode(env.SESSION_SECRET);
}
function origin(env) {
  const url = new URL(env.APP_ORIGIN);
  if (url.protocol !== 'https:' || url.origin !== env.APP_ORIGIN) throw new Error('Invalid origin');
  return url.origin;
}
function cookies(request) {
  return Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(x => {
    const i = x.indexOf('=');
    return [x.slice(0, i).trim(), x.slice(i + 1)];
  }));
}
function cookie(name, value, age) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
async function sign(data, env, audience, seconds) {
  return new SignJWT(data).setProtectedHeader({alg:'HS256'}).setIssuer(origin(env))
    .setAudience(audience).setIssuedAt().setExpirationTime(`${seconds}s`).sign(key(env));
}
async function verify(token, env, audience) {
  return (await jwtVerify(token, key(env), {algorithms:['HS256'], issuer:origin(env), audience})).payload;
}
export async function session(request, env) {
  try {
    const p = await verify(cookies(request)[sessionName], env, 'mng-session');
    if (typeof p.email !== 'string' || typeof p.sub !== 'string') return null;
    const member=await readMember(env,p.email,p.sub,true);
    return member?{...member,authTime:p.iat}:null;
  } catch { return null; }
}
function json(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8'}});
}
function redirect(path, headers={}) {
  return new Response(null, {status:303, headers:{Location:path,...headers}});
}
function secure(response) {
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'no-store');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('X-Frame-Options', 'DENY');
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  return result;
}
function loginPage(error=false) {
  return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>MNG 관리자 로그인</title><style>body{font-family:system-ui;background:#f5f7fb;color:#17253e;display:grid;place-items:center;min-height:95vh;margin:0}main{padding:36px;background:white;border:1px solid #dbe2ee;border-radius:18px;max-width:420px;margin:24px}p{line-height:1.7;color:#526079}a{display:block;background:#275edc;color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;margin-top:24px}small{display:block;margin-top:22px;color:#526079}</style><main><h1>MNG 홈페이지 관리</h1><p>허용된 Google 계정으로 로그인해 주세요.</p>${error?'<p role="alert">로그인을 완료하지 못했어요. 허용된 계정인지 확인한 뒤 다시 시도해 주세요.</p>':''}<a href="/auth/google/start">Google 계정으로 로그인</a><small>테스트 환경 · 로그인은 실제 인증이며, 작업은 운영 홈페이지와 분리된 테스트 브랜치에만 반영됩니다.</small></main></html>`, {headers:{'Content-Type':'text/html; charset=utf-8'}});
}
async function verifyGoogle(token, env) {
  return (await jwtVerify(token, googleKeys, {algorithms:['RS256'], issuer:['https://accounts.google.com','accounts.google.com'], audience:env.GOOGLE_CLIENT_ID})).payload;
}
export function createHandler({fetchToken=fetch, verifyIdentity=verifyGoogle}={}) {
  return async function handle(request, env) {
    try {
      const url = new URL(request.url);
      if (url.origin !== origin(env)) return secure(json({error:'Invalid host'},400));
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return secure(json({error:'Login is not configured'},503));
      key(env);
      const path = url.pathname;
      if (path === '/auth/google/start' && request.method === 'GET') {
        const state = random(), nonce = random(), verifier = random();
        const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
        const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
        const transaction = await sign({state,nonce,verifier},env,'mng-flow',600);
        const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        target.search = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:`${origin(env)}/auth/google/callback`,response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'}).toString();
        return secure(redirect(target.href, {'Set-Cookie':cookie(flowName,transaction,600)}));
      }
      if (path === '/auth/google/callback' && request.method === 'GET') {
        try {
          const flow = await verify(cookies(request)[flowName],env,'mng-flow');
          if (!url.searchParams.get('code') || url.searchParams.get('state') !== flow.state || url.searchParams.has('error')) throw new Error('Invalid flow');
          const response = await fetchToken('https://oauth2.googleapis.com/token',{method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:url.searchParams.get('code'),client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:`${origin(env)}/auth/google/callback`,grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(10000)});
          if (!response.ok) throw new Error('Token exchange failed');
          const tokens = await response.json();
          const identity = await verifyIdentity(tokens.id_token,env);
          if (identity.nonce !== flow.nonce || identity.email_verified !== true || typeof identity.sub !== 'string' || typeof identity.email !== 'string') throw new Error('Invalid identity');
          const email = identity.email.toLowerCase();
          const user = await readMember(env,email,identity.sub,true);
          // For non-Google-managed email, require a pre-bound immutable subject.
          const member = JSON.parse(env.MEMBERS_JSON || '{}')[email];
          if (!user || (!email.endsWith('@gmail.com') && !identity.hd && member?.sub !== identity.sub)) throw new Error('Not allowed');
          const token = await sign({email,sub:identity.sub},env,'mng-session',ttl);
          const result = redirect('/dashboard');
          result.headers.append('Set-Cookie',cookie(flowName,'',0));
          result.headers.append('Set-Cookie',cookie(sessionName,token,ttl));
          return secure(result);
        } catch {
          return secure(redirect('/login?error=1',{'Set-Cookie':cookie(flowName,'',0)}));
        }
      }
      if (path === '/auth/logout') {
        if (request.method !== 'POST' || request.headers.get('Origin') !== origin(env)) return secure(json({error:'Forbidden'},403));
        return secure(redirect('/login',{'Set-Cookie':cookie(sessionName,'',0)}));
      }
      const user = await session(request,env);
      if (path === '/login' && request.method === 'GET') return secure(user ? redirect('/dashboard') : loginPage(url.searchParams.has('error')));
      if (!user) return secure(path.startsWith('/api/') ? json({error:'Unauthenticated'},401) : redirect('/login'));
      if (path === '/api/session' && request.method === 'GET') return secure(json({user,mode:env.GITHUB_ENABLED==='true'?'github':'demo'}));
      if (path.startsWith('/api/')) {
        if(env.GITHUB_ENABLED !== 'true') return secure(json({error:'Not implemented in preview'},404));
        return secure(await (path.startsWith('/api/settings')?handleManagement:handleRequests)(request,env,user));
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') return secure(json({error:'Method not allowed'},405));
      return secure(await env.ASSETS.fetch(request));
    } catch { return secure(json({error:'Service unavailable'},503)); }
  };
}
export default {fetch:createHandler()};
