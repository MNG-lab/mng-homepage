import {allReads} from './github-catalog.js';
import {requestState,description} from '../shared/requests.js';
import {recoveryMetadata} from './request-recovery.js';
import {GitHubError} from './github.js';
export const pageSize=20;
const statuses=new Set(['all','done','closed','review','failed','auth_required','working']);
export function listQuery(params){
 const q=(params.get('q')||'').trim(),status=params.get('status')||'all',raw=params.get('page')||'1';
 if(q.length>200||!statuses.has(status)||!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new GitHubError('검색어·상태·페이지 번호를 확인해 주세요.',400);
 return {q,status,page:Number(raw)};
}
export function paginateRequests(requests,{q='',status='all',page=1}){
 const needle=q.toLocaleLowerCase('ko-KR');
 const found=requests.filter(r=>(status==='all'||requestState(r)===status||(status==='failed'&&requestState(r)==='auth_required'))&&`${r.id} ${r.title} ${description(r.description)}`.toLocaleLowerCase('ko-KR').includes(needle));
 const total=found.length,pages=Math.max(1,Math.ceil(total/pageSize)),current=Math.min(page,pages);
 return {requests:found.slice((current-1)*pageSize,current*pageSize),pagination:{page:current,pageSize,total,pages},query:{q,status},connectionRequired:found.some(r=>requestState(r)==='auth_required'&&!r.auth.renewed)};
}
export function requestSummary(requests){
 const counts={review:0,working:0,failed:0};
 for(const r of requests){const state=requestState(r);if(state==='review'||state==='working')counts[state]++;else if(state==='failed'||state==='auth_required')counts.failed++;}
 return {counts,recent:requests.slice(0,5),attention:requests.filter(r=>['review','failed','auth_required'].includes(requestState(r))).slice(0,5)};
}
export async function requestCatalog(gh,env,{issue:single,run:singleRun}={}){
 const [issues,pulls,runs,recovery]=await allReads([single?[single]:gh.list(),gh.pulls(),single?[]:gh.runs(),recoveryMetadata(env)]);
 const byIssue=new Map(),byTitle=new Map(runs.map(run=>[run.title,run]));
 for(const pull of [...pulls].sort((a,b)=>a.number-b.number)){const id=Number(pull.head.ref.match(/^admin-preview\/issue-(\d+)-/)?.[1]);byIssue.set(id,pull);}
 return issues.map(issue=>{
  const pull=byIssue.get(issue.number)||null,restoration=pull?.restoration||null,run=single?singleRun:byTitle.get(`Admin preview #${issue.number}`)||null;
  return {id:issue.number,title:restoration?pull.displayTitle:issue.title.replace(/^\[Admin Preview\] /,''),description:restoration?`‘${restoration.name}’ 반영 직후의 홈페이지 전체 상태로 복원합니다. 이후 변경은 현재 홈페이지에서 제외되지만 이력은 남습니다.`:issue.body,restoration,url:issue.html_url,state:issue.state,createdAt:issue.created_at,run,pull,...(!pull&&issue.state==='open'?recovery(issue.number,run):{})};
 }).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')||b.id-a.id);
}
