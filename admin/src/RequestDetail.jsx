import React,{useEffect,useState,useRef} from 'react';
import {Link} from 'react-router-dom';
import {api,requestState,labels,date,description} from './api.js';
export default function RequestDetail({request:r,user,refresh}) {
 const [detail,setDetail]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(null),[notice,setNotice]=useState('');
 const retryId=useRef(crypto.randomUUID());const state=requestState(r);
 useEffect(()=>{let active=true;setDetail(null);const load=()=>{if(r.pull)api(`/api/pulls/${r.pull.number}`).then(d=>{if(active)setDetail(d);}).catch(e=>{if(active)setError(e.message);});};load();const timer=r.pull?.state==='open'?setInterval(()=>{if(document.visibilityState==='visible')load();},15000):null;return()=>{active=false;clearInterval(timer);};},[r.pull?.number,r.pull?.head.sha,r.pull?.state]);
 async function act(){setBusy(true);setError('');try{
  let result;if(confirm==='approve')result=await api(`/api/pulls/${r.pull.number}/approve`,{head:detail.head});
  else result=await api(`/api/requests/${r.id}/${confirm}`,confirm==='retry'?{requestId:retryId.current}:{});
  setNotice(result.warning||'처리했습니다. 최신 상태를 확인해 주세요.');setConfirm(null);await refresh();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <>
 <section className="panel connected-panel"><div className="connected-heading"><span className={`state-pill ${state}`}>{labels[state]}</span><small>#{r.id} · {date(r.createdAt)}</small></div><h2>{r.title}</h2><pre className="connected-description">{description(r.description)}</pre>
 <ol className="request-progress"><li className="complete">요청 접수</li><li className={r.pull?'complete':''}>자동 수정</li><li className={state==='done'?'complete':''}>변경 검토</li><li className={state==='done'?'complete':''}>테스트 반영</li></ol>
 {state==='failed'&&<p className="error-note">자동 작업을 완료하지 못했습니다. 실행 기록에서 원인을 확인한 뒤 다시 시도해 주세요.</p>}
 <div className="action-row"><a className="text-button" href={r.url} target="_blank" rel="noreferrer">원본 요청 ↗</a>{r.run&&<a className="text-button" href={r.run.url} target="_blank" rel="noreferrer">실행 기록 ↗</a>}{r.pull&&<a className="text-button" href={r.pull.url} target="_blank" rel="noreferrer">PR 보기 ↗</a>}</div>
 </section>
 {r.pull&&<section className="panel connected-panel"><div className="connected-heading"><h2>변경 내용</h2><span>{detail?.ci?.conclusion==='success'?'검사 통과':detail?.ci?.status==='completed'?'검사 실패':'검사 확인 중'}</span></div>{!detail?<p>변경 내용을 불러오고 있습니다.</p>:<><p>추가·삭제된 내용을 확인한 뒤 반영해 주세요.</p>{detail.files.map(f=><details className="file-diff" key={f.path}><summary>{f.path} <span>+{f.additions} / −{f.deletions}</span></summary><pre>{f.patch||'이미지·대용량 파일은 PR에서 확인해 주세요.'}</pre></details>)}{detail.truncated&&<p>변경 파일이 많습니다. 전체 내용은 PR에서 확인하세요.</p>}{detail.ci&&<a className="text-button" href={detail.ci.url} target="_blank" rel="noreferrer">검사 결과 ↗</a>}</>}</section>}
 {error&&<p role="alert" className="error-note">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <div className="action-row"><Link className="secondary" to="/requests">목록으로 돌아가기</Link>{user.role!=='editor'&&<>{state==='review'&&<button className="primary" disabled={busy||detail?.ci?.conclusion!=='success'||r.pull?.draft} onClick={()=>setConfirm('approve')}>이 변경을 테스트 브랜치에 반영</button>}{state==='failed'&&<button className="primary" disabled={busy} onClick={()=>setConfirm('retry')}>다시 실행</button>}{!['done','closed'].includes(state)&&<button className="secondary" disabled={busy} onClick={()=>setConfirm('close')}>요청 종료</button>}</>}</div>
 {confirm&&<section role="dialog" aria-modal="false" aria-labelledby="confirm-title" className="panel connected-panel confirmation"><h2 id="confirm-title">{confirm==='approve'?'확인한 변경을 반영할까요?':confirm==='retry'?'자동 수정을 다시 실행할까요?':'요청을 종료할까요?'}</h2><p>{confirm==='approve'?'테스트 홈페이지 상태가 변경됩니다. 검토한 커밋이 바뀌거나 검사가 통과하지 않았다면 반영되지 않습니다.':confirm==='retry'?'Codex 작업을 다시 실행합니다. 실행 비용이 발생할 수 있습니다.':'열린 PR도 닫힙니다. 진행 중인 작업은 결과를 게시하기 전에 요청 상태를 다시 확인합니다.'}</p><div className="action-row"><button className="primary" disabled={busy} onClick={act}>{busy?'처리 중…':'확인하고 진행'}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>취소</button></div></section>}
 </>;
}
