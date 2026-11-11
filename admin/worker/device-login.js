import {deployment} from '../shared/deployment.js';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {createGitHub,GitHubError,REPOSITORY,WORKFLOW_REF,assertDeploymentConfig} from './github.js';
import {audit} from './management.js';
import {recordCredentialUpdate} from './request-recovery.js';
const keys=createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const endpoint='/api/internal/device-login';
const active="('queued','waiting','saving','testing')";
const json=(body,status=200)=>Response.json(body,{status});
function trustedRunner(p,env={}){
 const WORKFLOW_REF=deployment(env).ref;
 return p.sub===`repo:${REPOSITORY}:ref:refs/heads/${WORKFLOW_REF}`&&p.repository===REPOSITORY&&p.repository_id==='1164495587'&&p.repository_owner_id==='263300045'&&
 p.ref===`refs/heads/${WORKFLOW_REF}`&&p.event_name==='workflow_dispatch'&&p.run_attempt==='1'&&
 p.workflow_ref===`${REPOSITORY}/.github/workflows/codex-comment.yml@refs/heads/${WORKFLOW_REF}`&&
 p.job_workflow_ref===`${REPOSITORY}/.github/workflows/admin-device-login.yml@refs/heads/${WORKFLOW_REF}`&&
 /^[a-f0-9]{40}$/.test(p.sha||'')&&p.job_workflow_sha===p.sha&&/^\d+$/.test(p.run_id||'');
}
export const validClaims=(p,row,env={})=>trustedRunner(p,env)&&p.sha===row.sha&&(!row.run_id||row.run_id===p.run_id);
async function verify(token,env){return (await jwtVerify(token,keys,{algorithms:['RS256'],issuer:'https://token.actions.githubusercontent.com',audience:env.APP_ORIGIN+endpoint,maxTokenAge:'10m'})).payload;}
export function deviceAPI({github=createGitHub,verifyRunner=verify}={}){return async(request,env,user)=>{
 try{
  const config=assertDeploymentConfig(env);
  if(env.GITHUB_ENABLED!=='true'||env.MEMBERS_DB!=='true')return json({error:'연결 기능을 사용할 수 없습니다.'},503);
  const path=new URL(request.url).pathname;
  if(path===endpoint){
   if(request.method!=='POST'||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'허용되지 않은 콜백입니다.'},403);
   let claims;try{claims=await verifyRunner(request.headers.get('Authorization')?.replace(/^Bearer /,''),env);}catch{return json({error:'실행 인증에 실패했습니다.'},403);}
   if(!trustedRunner(claims,env))return json({error:'허용되지 않은 실행입니다.'},403);
   const raw=await request.text();if(raw.length>40000)return json({error:'입력이 너무 큽니다.'},413);
   const body=JSON.parse(raw);
   if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/.test(body.id))return json({error:'잘못된 연결 요청입니다.'},400);
   const row=await env.DB.prepare('SELECT * FROM device_flows WHERE id=?').bind(body.id).first();
   if(!row||row.environment!==config.mode||row.kind!=='login'||row.expires_at<Date.now()||!validClaims(claims,row,env))return json({error:'허용되지 않은 실행입니다.'},403);
   const member=await env.DB.prepare("SELECT * FROM members WHERE email=? AND sub=? AND role='owner' AND active=1").bind(row.owner,row.subject).first();
   if(!member)return json({error:'최고 관리자 권한이 변경되었습니다.'},403);
   if(body.phase==='hello'){
    const changed=await env.DB.prepare("UPDATE device_flows SET run_id=?,state=? WHERE id=? AND state='queued' AND run_id IS NULL").bind(claims.run_id,'waiting',row.id).run();
    if(!changed.meta.changes&&row.run_id!==claims.run_id)return json({error:'이미 실행 중입니다.'},409);
    return json({ok:true,kind:row.kind});
   }
   if(row.run_id!==claims.run_id)return json({error:'실행이 등록되지 않았습니다.'},403);
   if(body.phase==='challenge'&&row.kind==='login'&&row.state==='waiting'&&/^[A-Z0-9]{4}-[A-Z0-9]{5}$/.test(body.code||'')){
    await env.DB.prepare("UPDATE device_flows SET code=? WHERE id=? AND state='waiting'").bind(body.code,row.id).run();return json({ok:true});
   }
   if(body.phase==='save'&&row.kind==='login'){
    if(row.state==='connected')return json({ok:true});
    if(typeof body.auth!=='string'||body.auth.length>32000)return json({error:'잘못된 인증 파일입니다.'},400);
    const value=JSON.parse(body.auth);if(!value?.tokens?.access_token||!value.tokens.refresh_token)return json({error:'로그인 정보가 없습니다.'},400);
    const claimed=await env.DB.prepare("UPDATE device_flows SET state='saving',code=NULL WHERE id=? AND state='waiting'").bind(row.id).run();
    if(!claimed.meta.changes)return json({error:'이미 처리 중입니다.'},409);
    try{await (await github(env,fetch,{secrets:true})).updateCodex(body.auth);}
    catch{await env.DB.prepare("UPDATE device_flows SET state='uncertain' WHERE id=? AND state='saving'").bind(row.id).run();return json({error:'저장 결과를 확인하지 못했습니다.'},502);}
    await recordCredentialUpdate(env);
    await env.DB.prepare("UPDATE device_flows SET state='connected' WHERE id=? AND state='saving'").bind(row.id).run();
    await audit(env,{email:row.owner},'codex.device_connected',config.secret);return json({ok:true});
   }
   const next=body.phase==='failed'?'failed':null;
   if(!next||!['waiting','testing'].includes(row.state))return json({error:'지원하지 않는 상태 변경입니다.'},409);
   await env.DB.prepare("UPDATE device_flows SET state=?,code=NULL WHERE id=? AND state IN ('waiting','testing')").bind(next,row.id).run();return json({ok:true});
  }
  if(!user||user.role!=='owner')return json({error:'최고 관리자만 연결할 수 있습니다.'},403);
  const latest=()=>env.DB.prepare("SELECT * FROM device_flows WHERE owner=? AND subject=? AND environment=? AND kind='login' ORDER BY created_at DESC,rowid DESC LIMIT 1").bind(user.email,user.sub,config.mode).first();
  if(request.method==='GET'){
   const row=await latest();
   const state=row&&row.expires_at<Date.now()&&['queued','waiting','saving','testing'].includes(row.state)?'expired':row?.state;
   return json({flow:row?{id:row.id,kind:row.kind,state,code:state==='waiting'?row.code:null,expiresAt:row.expires_at,runUrl:row.run_id?`https://github.com/${REPOSITORY}/actions/runs/${row.run_id}`:null}:null});
  }
  if(request.method!=='POST'||request.headers.get('Origin')!==env.APP_ORIGIN||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'허용되지 않은 요청입니다.'},403);
  const raw=await request.text();if(raw.length>1000)return json({error:'입력이 너무 큽니다.'},413);
  const body=JSON.parse(raw);
  if(path!=='/api/settings/device-login/start'||body.kind!=='login')return json({error:'잘못된 요청입니다.'},400);
  // Only an authenticated owner's valid start request cleans up expired flows.
  // Public callbacks and status polling never run this write.
  await env.DB.prepare(`UPDATE device_flows SET state='expired',code=NULL WHERE expires_at<? AND state IN ${active}`).bind(Date.now()).run();
  const gh=await github(env),sha=await gh.automationHead(),id=crypto.randomUUID();
  try{await env.DB.prepare("INSERT INTO device_flows(id,owner,subject,kind,sha,environment,state,created_at,expires_at) VALUES (?,?,?,?,?,?,'queued',?,?)").bind(id,user.email,user.sub,body.kind,sha,config.mode,Date.now(),Date.now()+15*60000).run();}
  catch{return json({error:'다른 연결 작업이 진행 중입니다. 현재 상태를 확인해 주세요.'},409);}
  try{await gh.dispatchDevice(id);}catch{await env.DB.prepare("UPDATE device_flows SET state='uncertain' WHERE id=? AND state='queued'").bind(id).run();return json({error:'실행 접수 결과를 확인하지 못했습니다. 상태를 새로고침해 주세요.'},502);}
  return json({ok:true,id},202);
 }catch(e){return json({error:e instanceof GitHubError?e.message:'연결 상태를 처리하지 못했습니다. 새로고침해 주세요.'},e instanceof GitHubError?e.status:502);}
};}
