import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {isAuthFailure} from './codex-errors.mjs';
const endpoint='https://mng-admin-preview.chominho96-aaa.workers.dev/api/internal/request-result';
const issue=Number(process.env.REQUEST_ISSUE),home=path.join(process.env.RUNNER_TEMP,'admin-preview-codex');
if(!Number.isSafeInteger(issue)||issue<1||process.env.GITHUB_REPOSITORY!=='MNG-lab/mng-homepage'||process.env.GITHUB_REF!=='refs/heads/codex/admin-portal')throw Error('Invalid preview invocation');
process.umask(0o077);
async function report(reason){
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
 const identity=await fetch(url,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(15000)});
 if(!identity.ok)throw Error('Runner identity unavailable');
 const {value}=await identity.json();
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:JSON.stringify({issue,reason}),signal:AbortSignal.timeout(15000),redirect:'error'});if(!result.ok)throw Error('Result unavailable');return;}catch(e){if(attempt===1)throw e;}
 }
}
async function generate(){
 const auth=process.env.CODEX_AUTH_JSON_PREVIEW;
 if(!auth)return 'auth_required';
 try{const value=JSON.parse(auth);if(!value.tokens?.access_token||!value.tokens?.refresh_token)return 'auth_required';}catch{return 'auth_required';}
 if(!process.env.CODEX_MODEL)return 'failed';
 await mkdir(home,{recursive:true,mode:0o700});await writeFile(path.join(home,'auth.json'),auth,{mode:0o600});
 const childEnv={...process.env,CODEX_HOME:home};
 for(const key of Object.keys(childEnv))if(/^(ACTIONS_|GITHUB_TOKEN$|GH_TOKEN$|OPENAI_API_KEY$|CODEX_API_KEY$|CODEX_ACCESS_TOKEN$|CODEX_AUTH_JSON_PREVIEW$|CODEX_CLI_KEY$)/.test(key))delete childEnv[key];
 const prompt=await readFile(path.join(process.env.RUNNER_TEMP,'admin-preview-prompt.txt'));
 const result=await new Promise((resolve,reject)=>{
  const child=spawn(path.join(process.env.RUNNER_TEMP,'codex-cli/node_modules/.bin/codex'),['-c','cli_auth_credentials_store="file"','--ask-for-approval','never','exec','--json','--sandbox','workspace-write','--model',process.env.CODEX_MODEL,'-'],{env:childEnv,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';const timer=setTimeout(()=>child.kill('SIGTERM'),14*60000);
  child.stdout.on('data',b=>{stdout=(stdout+b.toString()).slice(-1048576);});child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-65536);});
  child.stdin.on('error',()=>{});child.stdin.end(prompt);
  child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr});});
 });
 return result.code===0?'success':isAuthFailure(result.stdout,result.stderr)?'auth_required':'failed';
}
let reason='failed';
try{reason=await generate();}catch{}finally{await rm(home,{recursive:true,force:true});}
try{await report(reason);}catch{console.error('Could not report the execution result to the admin.');process.exitCode=1;}
console.log({success:'Website changes generated. Continue with validation and PR review.',auth_required:'Codex reconnection required. The owner can reconnect in admin settings, then retry this request.',failed:'Codex did not complete the request. Check configuration or retry after investigating.'}[reason]);
if(reason!=='success')process.exitCode=1;
