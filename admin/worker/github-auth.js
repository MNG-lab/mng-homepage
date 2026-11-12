import {SignJWT,importPKCS8} from 'jose';
import {GitHubError} from './github.js';

// Completed credentials only: never share request-owned I/O promises between Workers requests.
// Tokens are neither persisted in D1 nor returned to the browser.
const caches=new WeakMap(),margin=60000;
const headers=token=>({Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'mng-admin','Content-Type':'application/json'});

export async function installationAuth(env,fetcher,permissions){
 let cache=caches.get(fetcher);if(!cache){cache=new Map();caches.set(fetcher,cache);}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.GITHUB_APP_PRIVATE_KEY));
 const fingerprint=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const key=JSON.stringify([env.GITHUB_APP_ID,env.GITHUB_INSTALLATION_ID,fingerprint,permissions]);
 const valid=value=>value&&value.expiresAt>Date.now()+margin;
 function invalidate(value){if(cache.get(key)?.token===value.token)cache.delete(key);}
 async function get(){
  const saved=cache.get(key);if(valid(saved))return saved;
  cache.delete(key);
  const privateKey=await importPKCS8(env.GITHUB_APP_PRIVATE_KEY,'RS256'),now=Math.floor(Date.now()/1000);
  const jwt=await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(env.GITHUB_APP_ID).setIssuedAt(now-60).setExpirationTime(now+540).sign(privateKey);
  const response=await fetcher(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`,{method:'POST',headers:headers(jwt),body:JSON.stringify({repositories:['mng-homepage'],permissions}),redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new GitHubError('GitHub App 인증에 실패했습니다.');
  const value=await response.json();
  if(typeof value.token!=='string'||!value.token)throw new GitHubError('GitHub 인증 응답이 올바르지 않습니다.');
  const credential={token:value.token,expiresAt:Date.parse(value.expires_at)};
  // A response without a valid expiry remains usable once, but must not enter the cache.
  if(valid(credential)){cache.set(key,credential);if(cache.size>8)cache.delete(cache.keys().next().value);}
  return credential;
 }
 let credential=await get();
 return async(url,options={},retryRead=false)=>{
  if(Number.isFinite(credential.expiresAt)&&!valid(credential))credential=await get();
  const used=credential;
  let response=await fetcher(url,{...options,headers:headers(used.token)});
  if(response.status===401){
   invalidate(used);credential={...used,expiresAt:0};
   // Only reads may be replayed. Writes keep the existing no-automatic-retry contract.
   if(retryRead){await response.body?.cancel();credential=await get();response=await fetcher(url,{...options,headers:headers(credential.token)});if(response.status===401){invalidate(credential);credential={...credential,expiresAt:0};}}
  }
  return response;
 };
}
