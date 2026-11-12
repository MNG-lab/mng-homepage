import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportPKCS8} from 'jose';
import {installationAuth} from '../worker/github-auth.js';

const key=async()=>exportPKCS8((await generateKeyPair('RS256',{extractable:true})).privateKey);
const normal={contents:'write',issues:'write',pull_requests:'write',actions:'write'},secrets={secrets:'write'};
async function fixture(){
 const env={GITHUB_APP_ID:'1',GITHUB_INSTALLATION_ID:'2',GITHUB_APP_PRIVATE_KEY:await key()},calls=[];
 let issued=0,expiry=Date.now()+3600000,status=200,authStatus=200;
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/access_tokens')){issued++;return Response.json({token:'token-'+issued,expires_at:expiry?new Date(expiry).toISOString():undefined},{status:authStatus});}
  return Response.json({ok:true},{status});
 };
 return {env,fetcher,calls,get issued(){return issued;},set expiry(v){expiry=v;},set status(v){status=v;},set authStatus(v){authStatus=v;}};
}
test('installation credentials are reused with strict installation, key and permission isolation',async()=>{
 const f=await fixture();
 const a=await installationAuth(f.env,f.fetcher,normal),b=await installationAuth({...f.env},f.fetcher,normal);
 await a('https://api.github.com/test',{method:'GET'},true);await b('https://api.github.com/test',{method:'GET'},true);
 assert.equal(f.issued,1);assert.equal(f.calls.at(-1).options.headers.Authorization,'Bearer token-1');
 assert.deepEqual(JSON.parse(f.calls[0].options.body),{repositories:['mng-homepage'],permissions:normal});
 await installationAuth(f.env,f.fetcher,secrets);assert.equal(f.issued,2);assert.deepEqual(JSON.parse(f.calls.at(-1).options.body).permissions,secrets);
 await installationAuth(f.env,f.fetcher,normal);assert.equal(f.issued,2,'a secrets token cannot replace the regular token');
 await installationAuth({...f.env,GITHUB_INSTALLATION_ID:'3'},f.fetcher,normal);assert.equal(f.issued,3);
 await installationAuth({...f.env,GITHUB_APP_ID:'4'},f.fetcher,normal);assert.equal(f.issued,4);
 await installationAuth({...f.env,GITHUB_APP_PRIVATE_KEY:await key()},f.fetcher,normal);assert.equal(f.issued,5);
});
test('refresh happens before expiry; missing expiry and failed issuances are never reused',async()=>{
 const f=await fixture();f.expiry=Date.now()+30000;
 await installationAuth(f.env,f.fetcher,normal);f.expiry=Date.now()+3600000;await installationAuth(f.env,f.fetcher,normal);assert.equal(f.issued,2);
 const missing=await fixture();missing.expiry=null;await installationAuth(missing.env,missing.fetcher,normal);await installationAuth(missing.env,missing.fetcher,normal);assert.equal(missing.issued,2);
 const failed=await fixture();failed.authStatus=500;await assert.rejects(installationAuth(failed.env,failed.fetcher,normal));failed.authStatus=200;await installationAuth(failed.env,failed.fetcher,normal);assert.equal(failed.issued,2);
});
test('revoked credentials refresh a read once; writes, network failures and 403 are not replayed',async()=>{
 const f=await fixture(),read=await installationAuth(f.env,f.fetcher,normal);f.status=401;
 assert.equal((await read('https://api.github.com/read',{method:'GET'},true)).status,401);assert.equal(f.issued,2);assert.equal(f.calls.filter(c=>c.url.endsWith('/read')).length,2);
 f.status=200;await read('https://api.github.com/read',{method:'GET'},true);assert.equal(f.issued,3,'second rejection must invalidate the replacement too');
 f.status=401;await read('https://api.github.com/write',{method:'POST',body:'{}'},false);assert.equal(f.calls.filter(c=>c.url.endsWith('/write')).length,1);assert.equal(f.issued,3);
 f.status=403;const next=await installationAuth(f.env,f.fetcher,normal);await next('https://api.github.com/read',{method:'GET'},true);assert.equal(f.issued,4);assert.equal(f.calls.filter(c=>c.url.endsWith('/read')).length,4);
 const network=async(url,options)=>{if(url.endsWith('/access_tokens'))return f.fetcher(url,options);throw Error('network');};
 const broken=await installationAuth(f.env,network,normal);await assert.rejects(broken('https://api.github.com/read',{method:'GET'},true),/network/);assert.equal(f.issued,5);
});
