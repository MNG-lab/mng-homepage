import {parseRollback} from './rollback.js';
import {selectRequestPull} from './github-sync.js';
export function reversalLookup(issues,pulls) {
 const candidates=[];
 for(const issue of issues){
  if(issue.kind==='change')continue;
  // The catalog keeps the validated kind, but historical cached rows omit labels.
  const parsedIssue=issue.kind==='revert'&&!issue.labels?{...issue,labels:['rollback-request']}:issue;
  let target;try{target=parseRollback(parsedIssue);}catch{continue;}
  const pinned=issue.body?.match(/<!-- revert-request:\d+:(\d+):([a-f\d]{40}) -->/);
  const pull=selectRequestPull(pulls,issue.number),state=pull?.merged?'done':pull?.state==='open'||(issue.state==='open'&&!pull)?'pending':null;
  if(state)candidates.push({target,pinned,requestId:issue.number,state});
 }
 candidates.sort((a,b)=>(b.state==='done')-(a.state==='done')||b.requestId-a.requestId);
 return sourcePull=>{
  if(!sourcePull?.merged)return null;
  const found=candidates.find(({target,pinned})=>pinned?Number(pinned[1])===sourcePull.number&&pinned[2]===sourcePull.mergeSha:target.type==='pr'?Number(target.target.replace(/^#/,''))===sourcePull.number:target.type==='commit'&&sourcePull.mergeSha?.startsWith(target.target));
  return found?{requestId:found.requestId,state:found.state}:null;
 };
}
export const findReversal=(issues,pulls,sourcePull)=>reversalLookup(issues,pulls)(sourcePull);
