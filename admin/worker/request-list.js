import {reversalLookup} from '../shared/revert-request.js';
import {selectRequestPull,issueType,matchesRequestRun} from '../shared/github-sync.js';
import {deployment} from '../shared/deployment.js';
import {relatedRequest} from '../shared/version.js';
import {allReads} from './github-catalog.js';
import {requestState} from '../shared/requests.js';
import {pageSize} from '../shared/request-list.js';
export {pageSize,paginateRequests} from '../shared/request-list.js';
import {recoveryMetadata} from './request-recovery.js';
import {GitHubError} from './github.js';
const statuses=new Set(['all','done','closed','review','failed','auth_required','working']);
export function listQuery(params){
 const q=(params.get('q')||'').trim(),status=params.get('status')||'all',raw=params.get('page')||'1',scope=params.get('scope')||'all',size=params.get('page_size')||String(pageSize);
 if(!['3','20'].includes(size)||!['all','active','past'].includes(scope)||q.length>200||!statuses.has(status)||!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new GitHubError('검색어·상태·페이지 번호를 확인해 주세요.',400);
 return {q,status,scope,page:Number(raw),pageSize:Number(size)};
}
export function requestSummary(requests){
 const counts={review:0,working:0,failed:0};
 for(const r of requests){const state=requestState(r);if(state==='review'||state==='working')counts[state]++;else if(state==='failed'||state==='auth_required')counts.failed++;}
 return {counts,recent:requests.slice(0,5),attention:requests.filter(r=>['review','failed','auth_required'].includes(requestState(r))).slice(0,5)};
}
export async function requestCatalog(gh,env,{issue:single,run:singleRun}={}){
 const [issues,pulls,runs,recovery]=await allReads([single?[single]:gh.list(),gh.versionedPulls?gh.versionedPulls():gh.pulls(),single?[]:gh.runs(),recoveryMetadata(env)]);
 const allIssues=single&&selectRequestPull(pulls,single.number)?.merged&&gh.list?await gh.list():issues;
 const reversalFor=reversalLookup(allIssues,pulls);
 const associated=run=>run.issue||(run.pullNumber?relatedRequest(pulls.find(p=>p.number===run.pullNumber)||{}):Number(run.title?.match(/#([1-9]\d*)$/)?.[1]));
 const ordered=[...runs].sort((a,b)=>b.id-a.id);
 return issues.map(issue=>{
  const type=issueType(issue,deployment(env))||{source:issue.source,kind:issue.kind};
  const pull=selectRequestPull(pulls,issue.number),restoration=pull?.restoration||null,run=single?(matchesRequestRun(singleRun,type)?singleRun:null):ordered.find(r=>associated(r)===issue.number&&matchesRequestRun(r,type))||null;
  return {...type,reversal:reversalFor(pull),id:issue.number,title:restoration?pull.displayTitle:issue.title.replace(/^\[Admin(?: Preview)?\] /,''),description:restoration?`‘${restoration.name}’의 홈페이지 문구·페이지·스타일·이미지로 되돌립니다. 공통 기능과 운영 설정, 작업 기록은 유지합니다.`:issue.body,restoration,url:issue.html_url,state:issue.state,createdAt:issue.created_at,run,pull,...(!pull&&issue.state==='open'?recovery(issue.number,run):{})};
 }).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')||b.id-a.id);
}
