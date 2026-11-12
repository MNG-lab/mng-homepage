import React,{useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {api,requestTitle,isRestoration,isRevert} from './api.js';
import {appliedVersion} from '../shared/version.js';
import ActionButton from './ActionButton.jsx';
export default function RevertRequest({request:r,user}) {
 const navigate=useNavigate(),requestId=useRef(crypto.randomUUID());
 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[expected,setExpected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!r.pull?.merged||isRevert(r)||isRestoration(r))return null;
 if(r.reversal)return <section className="panel connected-panel revert-request"><div><h2>{r.reversal.state==='done'?'이 변경은 취소되었습니다':'변경 취소 요청이 있습니다'}</h2><p>{r.reversal.state==='done'?'변경 취소의 반영 결과를 확인할 수 있습니다.':'이미 접수한 요청에서 진행 상황과 변경 내용을 확인하세요.'}</p></div><Link className="secondary" to={`/requests/${r.reversal.requestId}`}>변경 취소 요청 #{r.reversal.requestId} 보기 →</Link></section>;
 if(user.role==='editor'||!r.pull.mergeSha)return null;
 async function submit(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try {
   const result=await api('/api/requests',{requestId:requestId.current,kind:'rollback',title:`요청 #${r.id} 변경 취소`,rollbackType:'pr',rollbackTarget:String(r.pull.number),sourceRequest:r.id,sourceMergeSha:r.pull.mergeSha,reason:reason.trim(),expectedResult:expected.trim()||'이 요청에서 반영한 변경을 취소하고 이후의 다른 변경은 유지합니다. 충돌하면 검토를 위해 중단합니다.'});
   navigate(`/requests/${result.issue}`);
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <section className="panel connected-panel revert-request" aria-label="이 변경 취소">
  <div className="revert-request-intro"><div><h2>이 요청의 변경을 취소하려면</h2><p>이 요청에서 반영한 내용만 취소합니다. 이후의 다른 변경은 유지합니다.</p></div>{!open&&<button type="button" className="secondary revert-trigger" onClick={()=>setOpen(true)}><span aria-hidden="true">↶ </span>이 변경 취소</button>}</div>
  {open&&<form onSubmit={submit} className="revert-request-form">
   <div className="revert-source"><span>취소할 변경</span><strong>요청 #{r.id} · {requestTitle(r)}</strong><small>{appliedVersion(r)}에 반영된 내용</small></div>
   <label className="request-field"><span>취소하려는 이유<span className="request-required-mark" aria-hidden="true"> *</span></span><textarea aria-label="취소하려는 이유" required maxLength={5000} rows={3} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} placeholder="예: 반영 후 모바일에서 소개 문구가 겹쳐 보여요."/></label>
   <details className="revert-extra"><summary>추가로 확인할 내용</summary><label className="request-field">취소 후 확인할 내용<textarea maxLength={5000} rows={3} disabled={busy} value={expected} onChange={e=>setExpected(e.target.value)} placeholder="예: 이전 문구로 돌아오고, 나중에 추가한 사진은 유지됩니다."/></label></details>
   <p className="inline-note">취소할 내용을 담은 검토 요청을 만듭니다. 승인 전에는 홈페이지가 바뀌지 않으며, 이후 변경과 겹치면 충돌로 멈출 수 있습니다.</p>
   {error&&<p className="error-note" role="alert">{error}</p>}
   <div className="action-row"><ActionButton type="submit" busy={busy} busyLabel="취소 요청 접수 중…">변경 취소 요청 만들기</ActionButton><button type="button" className="secondary" disabled={busy} onClick={()=>setOpen(false)}>닫기</button></div>
  </form>}
 </section>;
}
