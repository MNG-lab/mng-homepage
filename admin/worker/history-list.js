import {GitHubError} from './github.js';

export const historyPageSize=6;
export function historyPage(params){
 const raw=params.get('page')||'1';
 if(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new GitHubError('페이지 번호를 확인해 주세요.',400);
 return Number(raw);
}
export function paginateHistory({current,revisions,currentRevision:resolved},requestedPage=1){
 const currentRevision=resolved===undefined?revisions.find(revision=>revision.mergeSha===current)||null:resolved;
 const previous=revisions.filter(revision=>revision.mergeSha!==currentRevision?.mergeSha);
 const total=previous.length,pages=Math.max(1,Math.ceil(total/historyPageSize)),page=Math.min(requestedPage,pages);
 return {current,currentRevision,totalVersions:revisions.length,revisions:previous.slice((page-1)*historyPageSize,page*historyPageSize),pagination:{page,pageSize:historyPageSize,total,pages}};
}
