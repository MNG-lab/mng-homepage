import {spawn} from 'node:child_process';
import {mkdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
const origin='https://mng-admin-preview.chominho96-aaa.workers.dev',endpoint=origin+'/api/internal/device-login';
const id=process.env.DEVICE_SESSION;
if(!/^[0-9a-f-]{36}$/.test(id||'')||process.env.GITHUB_REPOSITORY!=='MNG-lab/mng-homepage'||process.env.GITHUB_REF!=='refs/heads/codex/admin-portal')throw Error('Invalid test session');
process.umask(0o077);
const home=path.join(process.env.RUNNER_TEMP,'device-login-home'),cmd=path.join(process.env.RUNNER_TEMP,'device-cli/node_modules/.bin/codex');
async function callback(phase,body={}){
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
 const response=await fetch(url,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Runner identity unavailable');
 const {value}=await response.json();
 const result=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:JSON.stringify({id,phase,...body}),signal:AbortSignal.timeout(30000),redirect:'error'});
 if(!result.ok)throw Error(`Connection callback failed (${result.status})`);
 return result.json();
}
const childEnv={...process.env,CODEX_HOME:home};
for(const k of Object.keys(childEnv))if(/^(ACTIONS_|GITHUB_TOKEN$|GH_TOKEN$|OPENAI_API_KEY$|CODEX_API_KEY$|CODEX_ACCESS_TOKEN$|CODEX_AUTH_JSON_PREVIEW$|CODEX_MODEL$)/.test(k))delete childEnv[k];
function run(args,onOutput){return new Promise((resolve,reject)=>{
 const child=spawn(cmd,args,{cwd:home,env:childEnv,stdio:['ignore','pipe','pipe']});let output='';
 const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('Login or test timed out'));},10*60000);
 const consume=b=>{output=(output+b.toString()).slice(-65536);onOutput?.(output);};
 child.stdout.on('data',consume);child.stderr.on('data',consume);
 child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);resolve({code,output});});
 });}
try{
 await mkdir(home,{recursive:true,mode:0o700});
 const {kind}=await callback('hello');
 if(kind!=='login')throw Error('Unknown session kind');
  let challengePromise=null;
  const result=await run(['-c','cli_auth_credentials_store="file"','login','--device-auth'],text=>{
   if(challengePromise)return;
   const clean=text.replace(/\x1b\[[0-9;]*m/g,''),code=clean.match(/\b[A-Z0-9]{4}-[A-Z0-9]{5}\b/)?.[0];
   if(code&&clean.includes('https://auth.openai.com/codex/device')){challengePromise=callback('challenge',{code});challengePromise.catch(()=>{});}
  });
  if(challengePromise)await challengePromise;
  if(result.code!==0||!challengePromise)throw Error('Device login failed');
  const auth=await readFile(path.join(home,'auth.json'),'utf8');
  await callback('save',{auth});console.log('Test credential saved.');
}catch(e){console.error('Connection did not complete. Check the admin status.',/^Connection callback failed \(\d{3}\)$/.test(e.message)?e.message:'');try{await callback('failed');}catch{}process.exitCode=1;}
finally{await rm(home,{recursive:true,force:true});}
