import {issueType,selectRequestPull} from '../shared/github-sync.js';
import {findReversal} from '../shared/revert-request.js';
import {deployment} from '../shared/deployment.js';
import {GitHubError} from './github.js';
export async function validateSourceRevert(gh,env,body) {
 const source=await gh.issue(body.sourceRequest),config=deployment(env);
 if(config.mode!=='production'||issueType(source,config)?.kind!=='change')throw new GitHubError('완료된 홈페이지 수정 요청에서 변경을 취소해 주세요.',400);
 const pulls=await gh.pulls({force:true}),selected=selectRequestPull(pulls,source.number);
 if(!selected?.merged||selected.restoration||selected.body?.includes('<!-- restore:')||Number(body.rollbackTarget.replace(/^#/,''))!==selected.number)throw new GitHubError('취소할 변경이 달라졌습니다. 원래 요청을 다시 열어 주세요.',409);
 const fresh=await gh.pull(selected.number);
 if(!fresh.merged_at||!fresh.merge_commit_sha||fresh.merge_commit_sha!==body.sourceMergeSha)throw new GitHubError('반영된 버전을 다시 확인해 주세요.',409);
 const safety=await gh.revertEligibility(selected.number);
 if(!safety.allowed)throw new GitHubError(safety.reason,409);
 const reversal=findReversal(await gh.list({force:true}),pulls,{...selected,mergeSha:fresh.merge_commit_sha});
 if(reversal?.state==='done')throw new GitHubError('이미 취소된 변경입니다. 변경 취소 요청의 결과를 확인해 주세요.',409);
 return {reversal,pulls,resource:`request-revert:${selected.number}:${fresh.merge_commit_sha}`};
}
export async function claimSourceRevert(gh,env,body,source) {
 const previous=await env.DB.prepare('SELECT operation FROM operation_claims WHERE resource=?').bind(source.resource).first();
 if(previous&&previous.operation!==body.requestId){
  const row=await env.DB.prepare('SELECT issue_number FROM requests WHERE id=?').bind(previous.operation).first();
  if(!row?.issue_number)throw new GitHubError('변경 취소를 이미 접수 중입니다. 잠시 후 원래 요청에서 확인해 주세요.',409);
  const issue=await gh.issue(row.issue_number),pull=selectRequestPull(source.pulls,issue.number);
  if(pull?.merged||pull?.state==='open'||issue.state!=='closed')throw new GitHubError('이미 접수한 변경 취소 요청을 확인해 주세요.',409);
  // A closed, unmerged attempt can be requested again. Uncertain writes stay reserved.
  await env.DB.prepare('DELETE FROM operation_claims WHERE resource=? AND operation=?').bind(source.resource,previous.operation).run();
 }
 const claim=await env.DB.prepare('INSERT OR IGNORE INTO operation_claims(resource,operation) VALUES (?,?)').bind(source.resource,body.requestId).run();
 if(!claim.meta.changes)throw new GitHubError('같은 변경 취소를 이미 접수 중입니다. 잠시 후 원래 요청에서 확인해 주세요.',409);
}
