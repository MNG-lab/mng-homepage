import {requestState,requestGroup,description} from './requests.js';
import {appliedVersion,versionLabel,versionReference} from './version.js';
export const pageSize=20;

export function paginateRequests(requests,{q='',status='all',scope='all',page=1,pageSize:limit=pageSize}){
 const needle=q.trim().toLocaleLowerCase('ko-KR');
 const versionNumber=needle.match(/^(?:v\.?\s*|버전\s*)([1-9]\d*)$/)?.[1];
 const matching=requests.filter(r=>{
  const target=r.restoration||r.pull?.restoration,versions=[appliedVersion(r),versionLabel(target?.number)].filter(Boolean);
  if(versionNumber)return versions.includes(versionLabel(Number(versionNumber)));
  return `요청 #${r.id} ${r.title} ${description(r.description)} ${versions.join(' ')} ${target?versionReference(target):''}`.toLocaleLowerCase('ko-KR').includes(needle);
 });
 const scopeCounts={active:0,past:0};for(const request of matching)scopeCounts[requestGroup(request)]++;
 const found=matching.filter(r=>(scope==='all'||requestGroup(r)===scope)&&(status==='all'||requestState(r)===status||(status==='failed'&&requestState(r)==='auth_required')));
 const total=found.length,pages=Math.max(1,Math.ceil(total/limit)),current=Math.min(page,pages);
 return {requests:found.slice((current-1)*limit,current*limit),pagination:{page:current,pageSize:limit,total,pages},query:{q,status,scope},scopeCounts,connectionRequired:found.some(r=>requestState(r)==='auth_required'&&!r.auth.renewed)};
}
