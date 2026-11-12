import test from 'node:test';
import assert from 'node:assert/strict';
import {requestsAPI} from '../worker/requests.js';
import {requestCatalog} from '../worker/request-list.js';
import {normalizeRequest,requestBody,requestSections} from '../shared/request-form.js';
import {parseRollback} from '../shared/rollback.js';
import {findReversal} from '../shared/revert-request.js';
import {deployment} from '../shared/deployment.js';
import {database} from './d1.mjs';
const origin='https://admin.example',merge='a'.repeat(40),owner={sub:'owner',role:'owner'},config=deployment({ADMIN_ENV:'production'});
const input=()=>({requestId:crypto.randomUUID(),kind:'rollback',title:'요청 #101 변경 취소',sourceRequest:101,sourceMergeSha:merge,rollbackType:'pr',rollbackTarget:'201',reason:'문구가 겹쳐 보입니다.',expectedResult:'이후 사진 변경은 유지합니다.'});
function fixture(){
 const DB=database(),env={DB,ADMIN_ENV:'production',APP_ORIGIN:origin,GITHUB_ENABLED:'true'};
 const original={number:101,state:'closed',title:'Members 수정',labels:['admin-request'],body:'<!-- mng-admin:v1 -->\n### 어떻게 바꾸면 될까요?\n소개 수정',created_at:'2026-11-12T00:00:00Z'};
 const source={number:201,merged:true,mergeSha:merge,merged_at:'2026-11-12T00:00:00Z',merge_commit_sha:merge,body:'<!-- issue:101 -->',head:{ref:'admin/issue-101-11',sha:'b'.repeat(40)},state:'closed'};
 const issues=[original],pulls=[source];let creates=0,dispatches=0,failCreate=false;
 const gh={issue:async id=>issues.find(i=>i.number===id),pull:async id=>pulls.find(p=>p.number===id),pulls:async()=>pulls,list:async()=>issues,runs:async()=>[],latestRun:async()=>null,
 createRequest:async value=>{creates++;if(failCreate)throw Error('ambiguous timeout');const issue={number:300+creates,state:'open',title:value.title,labels:['rollback-request'],body:requestBody(value,config)};issues.push(issue);return issue;},dispatchRollback:async()=>{dispatches++;}};
 const handler=requestsAPI({github:async()=>gh}),post=(body,user=owner)=>handler(new Request(origin+'/api/requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env,user);
 return {DB,env,gh,issues,pulls,source,post,count:()=>({creates,dispatches}),fail:()=>{failCreate=true;}};
}
test('request-bound cancellation validates role, actual merged PR, source kind and immutable merge',async()=>{
 const f=fixture();assert.equal((await f.post(input(),{...owner,role:'editor'})).status,403);
 for(const patch of [{rollbackTarget:'999'},{sourceMergeSha:'c'.repeat(40)},{sourceRequest:0}])assert.ok([400,409].includes((await f.post({...input(),...patch})).status));
 f.source.merged=false;assert.equal((await f.post(input())).status,409);f.source.merged=true;
 f.source.restoration={number:1};assert.equal((await f.post(input())).status,409);f.source.restoration=null;
 f.issues[0].labels=['rollback-request'];assert.equal((await f.post(input())).status,400);assert.deepEqual(f.count(),{creates:0,dispatches:0});
});
test('two actors cannot create duplicate cancellation requests; catalog links the existing one and completed outcome',async()=>{
 const f=fixture(),first=input();const responses=await Promise.all([f.post(first),f.post(input(),{sub:'other',role:'admin'})]);
 assert.ok(responses.some(r=>r.status===201));assert.ok(responses.every(r=>[200,201,409].includes(r.status)));assert.deepEqual(f.count(),{creates:1,dispatches:1});
 const repeat=await f.post(first);assert.equal(repeat.status,200);
 const another=await f.post(input());assert.equal((await another.json()).issue,301);assert.equal(f.count().creates,1);
 let source=(await requestCatalog(f.gh,f.env)).find(r=>r.id===101);assert.deepEqual(source.reversal,{requestId:301,state:'pending'});
 const cached=f.issues.map(i=>{const {labels,...row}=i;return {...row,kind:i.number===101?'change':'revert'};});
 assert.deepEqual(findReversal(cached,f.pulls,f.source),{requestId:301,state:'pending'},'catalog rows without labels remain linked');
 f.pulls.push({number:302,head:{ref:'codex/rollback-issue-301-12'},merged:true,state:'closed'});f.issues[1].state='closed';
 source=(await requestCatalog(f.gh,f.env,{issue:f.issues[0]}))[0];assert.deepEqual(source.reversal,{requestId:301,state:'done'});
 assert.equal((await f.post(input())).status,409);
});
test('closed unmerged cancellation can be requested again but uncertain creation cannot duplicate',async()=>{
 const f=fixture();await f.post(input());f.issues[1].state='closed';
 assert.equal((await f.post(input())).status,201);assert.equal(f.count().creates,2);
 const uncertain=fixture();uncertain.fail();assert.equal((await uncertain.post(input())).status,502);assert.equal((await uncertain.post(input())).status,409);assert.equal(uncertain.count().creates,1);
});
test('new and historical GitHub rollback labels remain executable and request details remain readable',()=>{
 for(const [label,type] of [['PR 번호','pr'],['커밋 번호','commit'],['pr','pr'],['commit','commit']]){
  const target=type==='pr'?'201':'123abcd',modern=label.includes('번호');
  const body=`### ${modern?'취소할 대상':'롤백 유형'}\n${label}\n\n### ${modern?'대상 번호':'롤백 대상'}\n${target}\n\n### ${modern?'취소하려는 이유':'롤백 사유'}\n문제 확인`;
  const parsed=parseRollback({labels:['rollback-request'],body});assert.equal(parsed.type,type);assert.equal(parsed.target,target);assert.equal(parsed.reason,'문제 확인');
 }
 const value=normalizeRequest(input()),body=requestBody(value,config);assert.match(body,/<!-- revert-request:101:201:a{40} -->/);assert.equal(parseRollback({body,labels:['rollback-request']}).target,'201');
 assert.ok(requestSections('### 원하는 상태 (수정 결과)\n예전 요청\n\n### 정확한 문구 (있으면 필수)\n원문').some(s=>s.text==='예전 요청'));
});
