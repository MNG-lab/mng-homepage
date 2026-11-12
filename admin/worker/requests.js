import {validateSourceRevert,claimSourceRevert} from './revert-request.js';
import {deployment} from '../shared/deployment.js';
import {issueType} from '../shared/github-sync.js';
import {extractImages,MAX_IMAGES} from '../shared/images.js';
import {normalizeRequest,requestBody} from '../shared/request-form.js';
import {uploadAttachment,requestAttachments} from './attachments.js';
import {allReads} from './github-catalog.js';
import {listQuery,paginateRequests,requestSummary,requestCatalog} from './request-list.js';
import {historyPage,paginateHistory} from './history-list.js';
import {relatedRequest} from '../shared/version.js';
import {assertRetryCredential} from './request-recovery.js';
import {createGitHub,GitHubError} from './github.js';
import {listSnapshot} from './list-snapshot.js';
const reply=(data,status=200)=>Response.json(data,{status});
export function requestsAPI({github=createGitHub}={}) {
 return async function(request,env,user) {
  const url=new URL(request.url);
  if(env.GITHUB_ENABLED!=='true' || !env.DB) return reply({error:'GitHub 연결을 준비 중입니다.'},503);
  if(!user || !['owner','admin','editor'].includes(user.role)) return reply({error:'권한이 없습니다.'},403);
  if(!['GET','HEAD'].includes(request.method) && request.headers.get('Origin')!==env.APP_ORIGIN) return reply({error:'잘못된 요청 출처입니다.'},403);
  try {
   // Only list endpoints can use display snapshots. Validate filters before
   // reading a snapshot, and create GitHub credentials only for a live read.
   if(request.method==='GET'&&(url.pathname==='/api/requests'||url.pathname==='/api/history')){
    const history=url.pathname==='/api/history';
    const query=history?historyPage(url.searchParams):listQuery(url.searchParams);
    const {value,sync}=await listSnapshot(env,history?'history':'requests',{
     // Opt in: tabs running the previous frontend still receive live results.
     fresh:url.searchParams.get('cached')!=='1'||url.searchParams.get('fresh')==='1',
     load:async()=>{const gh=await github(env);return history?gh.history():requestCatalog(gh,env);}
    });
    const data=history?paginateHistory(value,query):url.searchParams.get('view')==='catalog'?{requests:value}:url.searchParams.get('view')==='summary'?requestSummary(value):paginateRequests(value,query);
    return reply({...data,sync});
   }
   const gh=await github(env);
   const removal=url.pathname.match(/^\/api\/attachments\/([a-f\d-]{36})\/remove$/);
   if(removal&&request.method==='POST'){
    const row=await env.DB.prepare('SELECT * FROM attachments WHERE id=?').bind(removal[1]).first();
    if(!row||row.actor_sub!==user.sub)return reply({error:'첨부 사진을 찾을 수 없습니다.'},404);
    if(await env.DB.prepare('SELECT id FROM requests WHERE id=?').bind(row.request_id).first())return reply({error:'이미 접수한 요청의 사진은 제거할 수 없습니다.'},409);
    await env.DB.prepare('UPDATE attachments SET removed=1 WHERE id=? AND actor_sub=?').bind(row.id,user.sub).run();
    return reply({removed:true});
   }
   const upload=url.pathname.match(/^\/api\/attachments\/([a-f\d-]{36})$/);
   if(upload&&request.method==='POST')return reply(await uploadAttachment(request,env,user,gh,upload[1]),201);
   const requestDetail=url.pathname.match(/^\/api\/requests\/([1-9]\d*)$/);
   if(requestDetail&&request.method==='GET'){
    const id=Number(requestDetail[1]);
    const issue=await gh.issue(id);
    const run=await gh.latestRun(id,{type:issueType(issue,deployment(env))});
    const record=(await requestCatalog(gh,env,{issue,run}))[0];
    if(record.pull?.merged&&record.kind!=='revert'&&!record.restoration)record.revertSafety=await gh.revertEligibility(record.pull.number);
    return reply({request:record});
   }
   const detail=url.pathname.match(/^\/api\/pulls\/([1-9]\d*)$/);
   if(detail&&request.method==='GET')return reply(await gh.detail(Number(detail[1])));
   const plan=url.pathname.match(/^\/api\/history\/([1-9]\d*|commit-[a-f0-9]{40})$/);
   if(plan&&request.method==='GET') {
    const id=plan[1].startsWith('commit-')?plan[1]:Number(plan[1]);
    const [value,change,pulls]=await allReads([gh.restorePlan(id),gh.versionChanges(id),gh.pulls()]);
    let revision=value.revision||pulls.find(p=>p.number===id&&p.merged);
    if(!revision)throw new GitHubError('반영된 버전을 찾을 수 없습니다.',404);
    if(gh.versionedRevision)revision=await gh.versionedRevision(revision);
    return reply({source:value.source,current:value.current,target:value.target,changes:value.changes,currentContent:value.currentContent,restoreSafety:value.restoreSafety,changedPages:change.pages,changesTruncated:change.truncated,revision:{...revision,requestId:relatedRequest(revision)}});
   }
   const close=url.pathname.match(/^\/api\/requests\/([1-9]\d*)\/close$/);
   if(close&&request.method==='POST') {
    if(user.role==='editor')return reply({error:'관리자만 요청을 종료할 수 있습니다.'},403);
    return reply(await gh.close(Number(close[1])));
   }
   const restore=url.pathname.match(/^\/api\/history\/([1-9]\d*|commit-[a-f0-9]{40})\/restore$/);
   const retry=url.pathname.match(/^\/api\/requests\/([1-9]\d*)\/retry$/);
   if((restore||retry)&&request.method==='POST') {
    if(user.role==='editor')return reply({error:'관리자만 실행할 수 있습니다.'},403);
    const body=await request.json();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.requestId||''))return reply({error:'요청 식별자가 필요합니다.'},400);
    if(restore&&!/^[a-f0-9]{40}$/.test(body.base||''))return reply({error:'현재 기준 정보가 필요합니다.'},400);
    const payload=JSON.stringify({path:url.pathname,base:body.base||null});
    const reserved=await env.DB.prepare("INSERT OR IGNORE INTO operations(id,actor,payload,state) VALUES (?,?,?,'pending')").bind(body.requestId,user.sub,payload).run();
    if(!reserved.meta.changes) {
     const row=await env.DB.prepare('SELECT * FROM operations WHERE id=?').bind(body.requestId).first();
     if(row.actor!==user.sub||row.payload!==payload)return reply({error:'이미 사용된 식별자입니다.'},409);
     return row.result?reply(JSON.parse(row.result)):reply({error:'이미 처리 중이거나 결과 확인이 필요합니다. 목록을 확인해 주세요.'},409);
    }
    const claim=async resource=>{
     const lock=await env.DB.prepare('INSERT OR IGNORE INTO operation_claims(resource,operation) VALUES (?,?)').bind(resource,body.requestId).run();
     if(!lock.meta.changes)throw new GitHubError('같은 작업이 이미 접수됐습니다. 목록에서 결과를 확인해 주세요.',409);
    };
    let result;
    try {
     if(restore){await claim(`restore:${restore[1]}:${body.base}`);result=await gh.restore(restore[1].startsWith('commit-')?restore[1]:Number(restore[1]),body.base,body.requestId,async issue=>{await env.DB.prepare('UPDATE operations SET issue=? WHERE id=?').bind(issue,body.requestId).run();});}
     else {await gh.retry(Number(retry[1]),claim,run=>assertRetryCredential(env,Number(retry[1]),run));result={issue:Number(retry[1])};}
    } catch(e) {
     if(e instanceof GitHubError&&[400,403,404,409].includes(e.status))await env.DB.prepare('DELETE FROM operations WHERE id=? AND NOT EXISTS(SELECT 1 FROM operation_claims WHERE operation=?)').bind(body.requestId,body.requestId).run();
     await env.DB.prepare("UPDATE operations SET state='uncertain' WHERE id=?").bind(body.requestId).run();throw e;
    }
    await env.DB.prepare("UPDATE operations SET state='complete',result=? WHERE id=?").bind(JSON.stringify(result),body.requestId).run();
    return reply(result,201);
   }
   if(url.pathname==='/api/requests' && request.method==='POST') {
    if(!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'JSON 요청이 필요합니다.'},415);
    const raw=await request.text();
    if(raw.length>48000) return reply({error:'요청이 너무 깁니다.'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'잘못된 요청입니다.'},400);}
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.requestId||'')) return reply({error:'요청 식별자를 확인해 주세요.'},400);
    try{body=normalizeRequest(body);}catch(e){throw new GitHubError(e.message,400);}
    if(body.kind==='rollback'&&user.role==='editor')return reply({error:'관리자만 변경 취소를 요청할 수 있습니다.'},403);
    const attachments=await requestAttachments(env,user,body);
    if(extractImages(requestBody(body,deployment(env),attachments)).length>MAX_IMAGES)throw new GitHubError('파일과 링크를 합쳐 사진은 8개까지 첨부할 수 있습니다.',400);
    const payload=JSON.stringify(body);
    const insert=await env.DB.prepare("INSERT OR IGNORE INTO requests (id,actor_sub,payload,state) VALUES (?,?,?,'creating')").bind(body.requestId,user.sub,payload).run();
    if(!insert.meta.changes) {
      const row=await env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(body.requestId).first();
      if(!row || row.actor_sub!==user.sub || row.payload!==payload) return reply({error:'다른 요청에 사용된 식별자입니다.'},409);
      if(row.issue_number) return reply({issue:row.issue_number,state:row.state});
      return reply({error:'이미 처리 중이거나 결과 확인이 필요한 요청입니다. 새 요청을 만들지 말고 목록을 확인해 주세요.'},409);
    }
    if(body.sourceRequest){
      try {
        const source=await validateSourceRevert(gh,env,body);
        if(source.reversal){
          await env.DB.prepare('DELETE FROM requests WHERE id=?').bind(body.requestId).run();
          return reply({issue:source.reversal.requestId,warning:'이미 접수한 변경 취소 요청을 열었습니다.'});
        }
        await claimSourceRevert(gh,env,body,source);
      }catch(error){
        // No issue was created yet. A denied or stale source can be corrected safely.
        await env.DB.prepare('DELETE FROM requests WHERE id=?').bind(body.requestId).run();
        throw error;
      }
    }
    let issue;
    try {issue=await gh.createRequest(body,attachments);} catch(error) {
      await env.DB.prepare("UPDATE requests SET state='uncertain' WHERE id=?").bind(body.requestId).run();
      throw error;
    }
    await env.DB.prepare("UPDATE requests SET issue_number=?,state='created' WHERE id=?").bind(issue.number,body.requestId).run();
    await env.DB.prepare("UPDATE requests SET state='dispatching' WHERE id=?").bind(body.requestId).run();
    try {await (body.kind==='rollback'?gh.dispatchRollback(issue.number):gh.dispatch(issue.number));} catch {
      // An HTTP timeout does not prove dispatch failed. Never auto-dispatch twice.
      return reply({issue:issue.number,state:'dispatching',warning:'이슈는 생성됐습니다. 작업 실행 응답을 확인하지 못해 중복 실행하지 않았습니다.'},202);
    }
    await env.DB.prepare("UPDATE requests SET state='dispatched' WHERE id=?").bind(body.requestId).run();
    return reply({issue:issue.number,state:'dispatched'},201);
   }
   const match=url.pathname.match(/^\/api\/pulls\/([1-9]\d*)\/approve$/);
   if(match && request.method==='POST') {
     if(!['owner','admin'].includes(user.role)) return reply({error:'관리자만 승인할 수 있습니다.'},403);
     const body=await request.json();
     const merged=await gh.merge(Number(match[1]),body.head);
     if(!merged.merged) return reply({error:'PR이 반영되지 않았습니다. 상태를 확인해 주세요.'},409);
     return reply({merged:true,sha:merged.sha,warning:merged.warning});
   }
   return reply({error:'지원하지 않는 작업입니다.'},404);
  } catch(error) {
    return reply({error:error instanceof GitHubError?error.message:'요청을 처리하지 못했습니다. 잠시 후 목록을 확인해 주세요.'},error instanceof GitHubError?error.status:502);
  }
 };
}
