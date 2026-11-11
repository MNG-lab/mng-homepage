import test from 'node:test';
import assert from 'node:assert/strict';
import {describePulls,selectQualityRun,REPOSITORY} from '../worker/github.js';
import {api,ciLabel,progress} from '../src/api.js';
const sha='a'.repeat(40);
test('restoration names resolve old and nested restoration records without changing stored titles',()=>{
 const pulls=[{number:1,title:'[Admin Preview] Members 소개 수정'}, {number:2,title:'[Admin Preview] 시점 복원: PR #1',body:`<!-- restore:1:${sha} -->`},{number:3,title:'[Admin Preview] 시점 복원: PR #2',body:`<!-- restore:2:${sha} -->`}];
 const result=describePulls(pulls);assert.equal(result[0].displayTitle,'Members 소개 수정');assert.equal(result[2].displayTitle,'Members 소개 수정 상태로 복원');assert.equal(result[2].restoration.number,2);assert.equal(pulls[2].title,'[Admin Preview] 시점 복원: PR #2');
 assert.equal(describePulls([{number:1,title:'loop',body:`<!-- restore:1:${sha} -->`}])[0].displayTitle,'이전 홈페이지 상태로 복원');
});
test('merged CI fallback matches exact repo, branch, SHA and event; cannot relax approval matching',()=>{
 const pr={head:{sha,ref:'admin-preview/issue-2-3'},merged_at:'2026-11-10'};
 const run={id:1,path:'.github/workflows/ci-quality.yml',head_sha:sha,head_branch:pr.head.ref,event:'pull_request',head_repository:{full_name:REPOSITORY},repository:{full_name:REPOSITORY},pull_requests:[],status:'completed',conclusion:'success'};
 assert.equal(selectQualityRun([run],pr,3,true),run);
 assert.equal(selectQualityRun([run],pr,3,false),undefined);
 assert.equal(selectQualityRun([run],{...pr,merged_at:null},3,true),undefined);
 for(const change of [{head_sha:'b'.repeat(40)},{head_branch:'other'},{event:'push'},{head_repository:{full_name:'other/repo'}},{repository:{full_name:'other/repo'}},{pull_requests:[{number:99}]}])assert.equal(selectQualityRun([{...run,...change}],pr,3,true),undefined);
 assert.equal(selectQualityRun([{...run,pull_requests:[{number:3}]}],pr,3,false).id,1);
});
test('progress describes queued, running, failed, review, restoration and merged states without inventing percentage',()=>{
 const r={state:'open'};
 assert.equal(progress(r)[1].text,'실행 확인 대기');
 assert.equal(progress({...r,run:{status:'queued'}})[1].state,'waiting');
 assert.equal(progress({...r,run:{status:'in_progress'}})[1].state,'active');
 assert.equal(progress({...r,run:{status:'completed',conclusion:'failure'}})[1].state,'failed');
 assert.equal(progress({...r,pull:{state:'open'}},{ci:{status:'completed',conclusion:'success'}})[2].text,'승인 대기');
 assert.equal(progress({...r,pull:{state:'open'}},{ci:{status:'completed',conclusion:'failure'}})[2].state,'failed');
 assert.equal(progress({...r,restoration:{},pull:{state:'open'}})[1].label,'되돌리기 준비');
 assert.equal(progress({...r,pull:{merged:true}}).every(s=>s.state==='complete'),true);
 assert.equal(progress({...r,state:'closed'})[1].state,'stopped');
 assert.equal(ciLabel({ci:null}),'검사 기록 없음');assert.equal(ciLabel({ci:{status:'completed',conclusion:'cancelled'}}),'검사 취소');assert.equal(ciLabel(null,'timeout'),'검사 조회 실패');
});
test('read calls deduplicate and recover after transient transport errors; writes never retry',async()=>{
 const original=globalThis.fetch;let count=0;
 try {
  globalThis.fetch=async()=>{count++;if(count===1)throw new TypeError('Failed to fetch');return Response.json({ok:true});};
  const [a,b]=await Promise.all([api('/test/read'),api('/test/read')]);assert.deepEqual(a,{ok:true});assert.deepEqual(b,a);assert.equal(count,2);
  count=0;globalThis.fetch=async()=>{count++;throw new TypeError('Failed to fetch');};
  await assert.rejects(api('/test/write',{}),/중복 제출하지/);assert.equal(count,1);
  await assert.rejects(api('/test/offline'),/마지막으로 확인한/);assert.equal(count,3);
  globalThis.fetch=async()=>Response.json({ok:true});assert.deepEqual(await api('/test/offline'),{ok:true});
 } finally {globalThis.fetch=original;}
});
test('read retries temporary HTTP failures but not permission failures; handles non-JSON errors',async()=>{
 const original=globalThis.fetch;let count=0;
 try {
  globalThis.fetch=async()=>{count++;return count===1?new Response('unavailable',{status:503}):Response.json({ok:true});};
  assert.deepEqual(await api('/test/503'),{ok:true});assert.equal(count,2);
  count=0;globalThis.fetch=async()=>{count++;return Response.json({error:'권한 없음'},{status:403});};
  await assert.rejects(api('/test/403'),/권한 없음/);assert.equal(count,1);
  globalThis.fetch=async()=>new Response('<html>bad gateway</html>',{status:502});await assert.rejects(api('/test/html'),/조회 응답/);
 } finally {globalThis.fetch=original;}
});


test('request labels distinguish restored content without calling historical edits cancelled',async()=>{
 const {requestLabel,requestTitle}=await import('../src/api.js');
 assert.equal(requestLabel({pull:{merged:true}}),'수정 반영 완료');
 const restore={pull:{merged:true},restoration:{name:'Members 소개 수정'}};
 assert.equal(requestLabel(restore),'되돌리기 완료');
 assert.equal(requestTitle(restore),'‘Members 소개 수정’ 버전으로 되돌리기');
 assert.equal(requestLabel({...restore,pull:{merged:false,state:'open'}}),'확인 필요');
});
