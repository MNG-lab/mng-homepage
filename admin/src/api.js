import {requestState} from '../shared/requests.js';
import {versionReference} from '../shared/version.js';
export {requestState,description} from '../shared/requests.js';
const pendingReads=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function perform(path,body) {
 const write=body!==undefined;
 for(let attempt=0;attempt<(write?1:2);attempt++) {
  let response;
  try {response=await fetch(path,{method:write?'POST':'GET',headers:write?{'Content-Type':'application/json'}:{},body:write?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(25000)});}
  catch {
   if(!write&&attempt===0){await pause(700);continue;}
   throw Error(write?'처리 결과를 확인하지 못했습니다. 중복 제출하지 말고 목록의 상태를 확인해 주세요.':'조회 연결이 끊겼습니다. 마지막으로 확인한 내용을 유지합니다. 잠시 후 다시 불러와 주세요.');
  }
  if(response.status===401){window.location.assign('/login');throw Error('로그인이 만료됐습니다.');}
  if(!write&&attempt===0&&[429,502,503,504].includes(response.status)){await response.body?.cancel();await pause(700);continue;}
  let data;try{data=await response.json();}catch{throw Error(write?'처리 결과를 확인하지 못했습니다. 중복 제출하지 말고 목록을 확인해 주세요.':'조회 응답을 읽지 못했습니다. 잠시 후 다시 불러와 주세요.');}
  if(!response.ok){const error=Error(data.error||'처리하지 못했습니다.');error.status=response.status;throw error;}
  if(write)pendingReads.clear();
  return data;
 }
}
export function api(path,body) {
 if(body!==undefined)return perform(path,body);
 if(pendingReads.has(path))return pendingReads.get(path);
 const read=perform(path).finally(()=>{if(pendingReads.get(path)===read)pendingReads.delete(path);});
 pendingReads.set(path,read);return read;
}
export const isRestoration=r=>!!(r.restoration||r.pull?.restoration)||/<!-- restore:/.test(r.pull?.body||'');
export const requestLabel=r=>requestState(r)==='done'?(isRestoration(r)?'되돌리기 완료':'수정 반영 완료'):requestState(r)==='auth_required'&&r.auth?.renewed?'다시 실행 가능':labels[requestState(r)];
export const requestTitle=r=>{const target=r.restoration||r.pull?.restoration;return target?`${versionReference(target)}으로 되돌리기`:r.displayTitle||r.title?.replace(/^\[Admin(?: Preview)?\] /,'');};
export const labels={done:'반영 완료',closed:'종료',review:'확인 필요',failed:'작업 실패',auth_required:'Codex 연결 필요',working:'진행 중'};
export const date=value=>value?new Date(value).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';


export function ciLabel(detail,error) {
 if(error)return '검사 조회 실패';
 if(!detail)return '검사 불러오는 중';
 if(!detail.ci)return '검사 기록 없음';
 if(detail.ci.status!=='completed')return detail.ci.status==='queued'?'검사 대기':'검사 진행 중';
 return {success:'검사 통과',failure:'검사 실패',cancelled:'검사 취소',timed_out:'검사 시간 초과',skipped:'검사 건너뜀',neutral:'검사 완료 (중립)',action_required:'검사 조치 필요'}[detail.ci.conclusion]||'검사 결과 확인 필요';
}
export function progress(r,detail,{approving=false}={}) {
 const state=requestState(r),restore=!!r.restoration||/<!-- restore:/.test(r.pull?.body||'');
 const steps=[{label:'요청 접수',state:'complete',text:'접수 완료'},{label:restore?'되돌리기 준비':'자동 수정',state:'waiting',text:'실행 확인 대기'},{label:'변경 검토',state:'waiting',text:'준비 후 검토'},{label:'홈페이지 반영',state:'waiting',text:'승인 후 반영'}];
 if(state==='done')return steps.map(s=>({...s,state:'complete',text:'완료'}));
 if(r.pull){steps[1]={...steps[1],state:'complete',text:'변경 준비 완료'};steps[2]={...steps[2],state:'active',text:detail?.ci?.conclusion==='success'?'승인 대기':detail?.ci?.status==='completed'?'검사 결과 확인 필요':detail?.ci?'자동 검사 중':'검사 조회 대기'};}
 else if(r.retry?.state==='pending')steps[1]={...steps[1],state:'active',text:'재실행 접수됨'};
 else if(state==='auth_required')steps[1]={...steps[1],state:'stopped',text:r.auth?.renewed?'다시 실행 대기':'Codex 연결 필요'};
 else if(state==='failed')steps[1]={...steps[1],state:'failed',text:'작업 실패'};
 else if(r.run?.status==='in_progress')steps[1]={...steps[1],state:'active',text:'작업 실행 중'};
 else if(r.run?.status==='queued'||r.run?.status==='waiting')steps[1].text='실행 대기';
 else if(r.run?.status==='completed')steps[1]={...steps[1],state:'active',text:'변경 결과 확인 중'};
 if(r.pull&&detail?.ci?.status==='completed'&&detail.ci.conclusion!=='success')steps[2]={...steps[2],state:'failed',text:ciLabel(detail)};
 if(state==='closed'){const i=r.pull?2:1;steps[i]={...steps[i],state:'stopped',text:'요청 종료'};}
 else if(approving){steps[2]={...steps[2],state:'complete',text:'승인 요청 완료'};steps[3]={...steps[3],state:'active',text:'반영 요청 처리 중'};}
 return steps;
}
