import {readFile} from 'node:fs/promises';
import {isAuthFailure} from './codex-errors.mjs';
const endpoint='https://mng-admin-preview.chominho96-aaa.workers.dev/api/internal/request-result';
// Reports only issue runs. PR-comment updates are already visible through PR SHA/CI.
if(process.env.GITHUB_REPOSITORY!=='MNG-lab/mng-homepage'||process.env.GITHUB_REF!=='refs/heads/main')throw Error('Invalid runner');
const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
const raw=event.issue?.pull_request?null:event.issue?.number||event.inputs?.issue;
const match=String(raw||'').match(/^(?:#?([1-9]\d*)|https:\/\/github\.com\/MNG-lab\/mng-homepage\/issues\/([1-9]\d*))$/),issue=match&&Number(match[1]||match[2]);
if(issue){
 const read=path=>readFile(path,'utf8').catch(()=>'');
 const reason=process.env.CODEX_CREDENTIAL_PRESENT==='false'?'auth_required':process.env.CODEX_OUTCOME==='success'?'success':isAuthFailure(await read('/tmp/codex_out.txt'),await read('/tmp/codex_err.txt'))?'auth_required':'failed';
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
 const identity=await fetch(url,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(15000)});
 if(!identity.ok)throw Error('Runner identity unavailable');
 const {value}=await identity.json();
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:JSON.stringify({issue,reason}),signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw Error('Admin result could not be recorded');
 console.log('Request status recorded.');
}
