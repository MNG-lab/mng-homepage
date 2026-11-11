import {runIdentity} from '../shared/github-sync.js';
import {deployment} from '../shared/deployment.js';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {createGitHub,GitHubError,REPOSITORY,WORKFLOW_REF,assertPreviewConfig} from './github.js';
const endpoint='/api/internal/request-result';
const keys=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
export function validRequestClaims(p,env={}){
 const WORKFLOW_REF=deployment(env).ref;
 const base=p.sub===`repo:${REPOSITORY}:ref:refs/heads/${WORKFLOW_REF}`&&p.repository===REPOSITORY&&p.repository_id==='1164495587'&&p.repository_owner_id==='263300045'&&p.ref===`refs/heads/${WORKFLOW_REF}`&&/^[1-9]\d*$/.test(p.run_attempt||'')&&/^[1-9]\d*$/.test(p.run_id||'')&&/^[a-f0-9]{40}$/.test(p.sha||'')&&p.workflow_ref===`${REPOSITORY}/.github/workflows/codex-comment.yml@refs/heads/${WORKFLOW_REF}`;
 const reusable=p.event_name==='workflow_dispatch'&&p.job_workflow_sha===p.sha&&p.job_workflow_ref===`${REPOSITORY}/.github/workflows/admin-preview.yml@refs/heads/${WORKFLOW_REF}`;
 const direct=deployment(env).mode==='production'&&['issues','issue_comment','workflow_dispatch'].includes(p.event_name)&&!p.job_workflow_ref&&!p.job_workflow_sha;
 return base&&(reusable||direct);
}
async function verify(token,env){return (await jwtVerify(token,keys,{algorithms:['RS256'],issuer:'https://token.actions.githubusercontent.com',audience:env.APP_ORIGIN+endpoint,maxTokenAge:'10m'})).payload;}
export const recordCredentialUpdate=env=>env.DB.prepare(`INSERT INTO ${deployment(env).credentialTable}(id,updated_at) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at`).bind(Date.now()).run();
const updatedAt=async env=>(await env.DB.prepare(`SELECT updated_at FROM ${deployment(env).credentialTable} WHERE id=1`).first())?.updated_at||0;
export async function recoveryMetadata(env){
 const [results,claims,updated]=await Promise.all([
  env.DB.prepare('SELECT run_id,attempt,issue,reason FROM request_run_results').all(),
  env.DB.prepare("SELECT resource,operations.state FROM operation_claims JOIN operations ON operation_claims.operation=operations.id WHERE resource LIKE 'retry:%'").all(),updatedAt(env)
 ]);
 const byRun=new Map(results.results.map(r=>[`${r.run_id}:${r.attempt}`,r]));
 const byClaim=new Map(claims.results.map(r=>[r.resource,r.state]));
 return (issue,run)=>{
  if(!run||run.status!=='completed'||!['failure','cancelled','timed_out'].includes(run.conclusion))return {};
  const result=byRun.get(`${run.id}:${run.attempt||1}`),claim=byClaim.get(`retry:${issue}:${run.id}:${run.attempt||1}`)||byClaim.get(`retry:${issue}:${run.id}`);
  return {auth:result?.issue===issue&&result.reason==='auth_required'?{renewed:updated>Date.parse(run.createdAt)}:null,retry:claim?{state:claim==='complete'?'pending':'uncertain'}:null};
 };
}
export async function assertRetryCredential(env,issue,run){
 const row=await env.DB.prepare('SELECT reason FROM request_run_results WHERE run_id=? AND attempt=? AND issue=?').bind(String(run.id),run.attempt||1,issue).first();
 if(row?.reason==='auth_required'&&!((await updatedAt(env))>Date.parse(run.createdAt)))throw new GitHubError('최고 관리자가 Codex를 다시 연결한 뒤 실행해 주세요.',409);
}
export function requestResultAPI({github=createGitHub,verifyRunner=verify}={}){return async(request,env)=>{
 try{
  const config=assertPreviewConfig(env),WORKFLOW_REF=config.ref;
  if(env.GITHUB_ENABLED!=='true'||!env.DB)return Response.json({error:'Unavailable'}, {status:503});
  if(request.method!=='POST'||!request.headers.get('Content-Type')?.startsWith('application/json'))return Response.json({error:'Forbidden'}, {status:403});
  let p;try{p=await verifyRunner(request.headers.get('Authorization')?.replace(/^Bearer /,''),env);}catch{return Response.json({error:'Invalid runner'}, {status:403});}
  if(!validRequestClaims(p,env))return Response.json({error:'Invalid runner'}, {status:403});
  const raw=await request.text();if(raw.length>1000)return Response.json({error:'Too large'}, {status:413});
  const body=JSON.parse(raw);
  if(!Number.isSafeInteger(body.issue)||body.issue<1||!['success','auth_required','failed'].includes(body.reason))return Response.json({error:'Invalid result'}, {status:400});
  const gh=await github(env);const [issue,run]=await Promise.all([gh.issue(body.issue),gh.run(Number(p.run_id))]);
  if(issue.number!==body.issue||run.head_sha!==p.sha||run.run_attempt!==Number(p.run_attempt)||run.head_branch!==WORKFLOW_REF||run.path!=='.github/workflows/codex-comment.yml'||run.event!==p.event_name||runIdentity(run,config)?.issue!==body.issue)return Response.json({error:'Run mismatch'}, {status:403});
  await env.DB.prepare('INSERT OR IGNORE INTO request_run_results(run_id,attempt,issue,sha,reason,created_at) VALUES (?,?,?,?,?,?)').bind(p.run_id,Number(p.run_attempt),body.issue,p.sha,body.reason,Date.now()).run();
  const saved=await env.DB.prepare('SELECT issue,sha,reason FROM request_run_results WHERE run_id=? AND attempt=?').bind(p.run_id,Number(p.run_attempt)).first();
  if(saved.issue!==body.issue||saved.sha!==p.sha||saved.reason!==body.reason)return Response.json({error:'Result already recorded'}, {status:409});
  return Response.json({ok:true});
 }catch{return Response.json({error:'Could not record result'}, {status:502});}
};}
