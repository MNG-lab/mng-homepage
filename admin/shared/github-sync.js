// Repository issue labels and generated branch names are the shared contract.
export function issueType(issue,config) {
 const labels=new Set((issue.labels||[]).map(x=>typeof x==='string'?x:x.name));
 if(issue.pull_request)return null;
 if(config.mode==='preview')return labels.has(config.label)&&issue.body?.startsWith(config.marker+'\n')?{source:'admin',kind:'change'}:null;
 if(labels.has('admin-preview')||issue.body?.startsWith('<!-- mng-admin-preview:'))return null;
 if(labels.has('admin-request')&&issue.body?.startsWith(config.marker+'\n'))return {source:'admin',kind:'change'};
 if(labels.has('rollback-request')||labels.has('rollback-simple-request'))return {source:issue.body?.startsWith(config.marker+'\n')?'admin':'github',kind:'revert'};
 return labels.has('codex-auto')?{source:'github',kind:'change'}:null;
}
export function branchRequest(ref) {
 const m=String(ref||'').match(/^(admin-preview|admin|codex)\/(rollback-)?issue-([1-9]\d*)-([1-9]\d*)$/);
 if(!m||(m[2]&&m[1]!=='codex'))return null;
 return {issue:Number(m[3]),runId:Number(m[4]),kind:m[2]?'revert':'change',source:m[1]};
}
const id=value=>{const m=String(value).trim().match(/^(?:#?([1-9]\d*)|https:\/\/github\.com\/MNG-lab\/mng-homepage\/issues\/([1-9]\d*))$/);return m?Number(m[1]||m[2]):null;};
export function runIdentity(run,config) {
 if(run.head_branch!==config.ref)return null;
 const title=run.display_title||'',path=run.path;
 if(path==='.github/workflows/codex-comment.yml'){
  if(run.event==='workflow_dispatch'&&title.startsWith(config.runTitle)){
   const issue=id(title.slice(config.runTitle.length));return issue?{issue,workflow:'codex',source:'admin'}:null;
  }
  if(config.mode==='production'&&['issues','issue_comment','pull_request_review_comment','workflow_dispatch'].includes(run.event)){
   const request=title.match(/^Codex request (.+)$/),pr=title.match(/^Codex PR #([1-9]\d*)$/);
   if(request){const issue=id(request[1].replace(/^#/,''));return issue?{issue,workflow:'codex',source:'github'}:null;}
   if(pr)return {pullNumber:Number(pr[1]),workflow:'codex',source:'github'};
  }
 }
 if(config.mode==='production'&&path==='.github/workflows/rollback-from-issue.yml'&&['issues','workflow_dispatch'].includes(run.event)){
  const m=title.match(/^Rollback request #([1-9]\d*)$/);if(m)return {issue:Number(m[1]),workflow:'rollback',source:'github'};
 }
 return null;
}
export function selectRequestPull(pulls,issue) {
 return pulls.filter(p=>branchRequest(p.head?.ref)?.issue===issue).sort((a,b)=>{
  const rank=p=>p.state==='open'?2:p.merged?1:0;
  return rank(b)-rank(a)||b.number-a.number;
 })[0]||null;
}
export const isRevert=request=>request.kind==='revert'||branchRequest(request.pull?.head?.ref)?.kind==='revert';
