import {createGitHub,GitHubError} from './github.js';
const reply=(data,status=200)=>Response.json(data,{status});
export function requestsAPI({github=createGitHub}={}) {
 return async function(request,env,user) {
  const url=new URL(request.url);
  if(env.GITHUB_ENABLED!=='true' || !env.DB) return reply({error:'GitHub 테스트 연결을 준비 중입니다.'},503);
  if(!user || !['owner','admin','editor'].includes(user.role)) return reply({error:'권한이 없습니다.'},403);
  if(!['GET','HEAD'].includes(request.method) && request.headers.get('Origin')!==env.APP_ORIGIN) return reply({error:'잘못된 요청 출처입니다.'},403);
  try {
   const gh=await github(env);
   if(url.pathname==='/api/requests' && request.method==='GET') {
    const [issues,pulls]=await Promise.all([gh.list(),gh.pulls()]);
    return reply({requests:issues.map(issue=>({id:issue.number,title:issue.title.replace(/^\[Admin Preview\] /,''),description:issue.body,url:issue.html_url,state:issue.state,createdAt:issue.created_at,pull:pulls.filter(p=>p.head.ref.startsWith(`admin-preview/issue-${issue.number}-`)).sort((a,b)=>b.number-a.number)[0]||null}))});
   }
   if(url.pathname==='/api/requests' && request.method==='POST') {
    if(!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'JSON 요청이 필요합니다.'},415);
    const raw=await request.text();
    if(raw.length>12000) return reply({error:'요청이 너무 깁니다.'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'잘못된 요청입니다.'},400);}
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.requestId||'')) return reply({error:'요청 식별자를 확인해 주세요.'},400);
    const payload=JSON.stringify({title:body.title,page:body.page,description:body.description});
    const insert=await env.DB.prepare("INSERT OR IGNORE INTO requests (id,actor_sub,payload,state) VALUES (?,?,?,'creating')").bind(body.requestId,user.sub,payload).run();
    if(!insert.meta.changes) {
      const row=await env.DB.prepare('SELECT * FROM requests WHERE id=?').bind(body.requestId).first();
      if(!row || row.actor_sub!==user.sub || row.payload!==payload) return reply({error:'다른 요청에 사용된 식별자입니다.'},409);
      if(row.issue_number) return reply({issue:row.issue_number,state:row.state});
      return reply({error:'이미 처리 중이거나 결과 확인이 필요한 요청입니다. 새 요청을 만들지 말고 목록을 확인해 주세요.'},409);
    }
    let issue;
    try {issue=await gh.createRequest(body);} catch(error) {
      await env.DB.prepare("UPDATE requests SET state='uncertain' WHERE id=?").bind(body.requestId).run();
      throw error;
    }
    await env.DB.prepare("UPDATE requests SET issue_number=?,state='created' WHERE id=?").bind(issue.number,body.requestId).run();
    await env.DB.prepare("UPDATE requests SET state='dispatching' WHERE id=?").bind(body.requestId).run();
    try {await gh.dispatch(issue.number);} catch {
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
     return reply({merged:true,sha:merged.sha});
   }
   return reply({error:'지원하지 않는 작업입니다.'},404);
  } catch(error) {
    return reply({error:error instanceof GitHubError?error.message:'요청을 처리하지 못했습니다. 잠시 후 목록을 확인해 주세요.'},error instanceof GitHubError?error.status:502);
  }
 };
}
