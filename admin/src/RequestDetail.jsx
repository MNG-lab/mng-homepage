import React,{useEffect,useState,useRef} from 'react';
import {Link} from 'react-router-dom';
import {api,requestState,labels,date,description,ciLabel,progress} from './api.js';
export default function RequestDetail({request:r,user,refresh}) {
 const [detail,setDetail]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(null),[notice,setNotice]=useState('');
 const [detailError,setDetailError]=useState(''),[reload,setReload]=useState(0);
 const preview=detailError||detail?.head!==r.pull?.head.sha?null:detail?.preview;
 const previewText={pending:'배포 대기',building:'배포 중',ready:'미리보기 준비 완료',failed:'미리보기 배포 실패',cancelled:'미리보기 배포 취소',url_pending:'배포 완료 · 주소 확인 중',unavailable:'배포 상태 조회 실패'};
 const previewReady=preview?.state==='ready'&&preview.head===r.pull?.head.sha&&detail?.head===r.pull?.head.sha&&!!preview.url;
 const retryId=useRef(crypto.randomUUID());const state=requestState(r);
 useEffect(()=>{
  let active=true,inflight=false,shouldPoll=true;
  const load=async()=>{if(!r.pull||inflight)return;inflight=true;try{const data=await api(`/api/pulls/${r.pull.number}`);if(active){setDetail(data);setDetailError('');shouldPoll=r.pull.state==='open'||['pending','building','url_pending','unavailable'].includes(data.preview?.state);}}catch(e){if(active)setDetailError(e.message);}finally{inflight=false;}};
  setDetail(null);setDetailError('');load();
  const update=()=>{if(document.visibilityState==='visible')load();};
  const timer=r.pull?setInterval(()=>{if(shouldPoll)update();},15000):null;
  document.addEventListener('visibilitychange',update);
  return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[r.pull?.number,r.pull?.head.sha,r.pull?.state,reload]);
 async function act(){setBusy(true);setError('');try{
  let result;if(confirm==='approve')result=await api(`/api/pulls/${r.pull.number}/approve`,{head:detail.head});
  else result=await api(`/api/requests/${r.id}/${confirm}`,confirm==='retry'?{requestId:retryId.current}:{});
  setNotice(result.warning||'처리했습니다. 최신 상태를 확인해 주세요.');setConfirm(null);await refresh();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 return <>
 <section className="panel connected-panel"><div className="connected-heading"><span className={`state-pill ${state}`}>{labels[state]}</span><small>#{r.id} · {date(r.createdAt)}</small></div><h2>{r.title}</h2><pre className="connected-description">{description(r.description)}</pre>
 <ol className="request-progress" aria-label="작업 단계">{progress(r,detail,{approving:busy&&confirm==='approve'}).map(step=><li key={step.label} className={step.state} aria-current={step.state==='active'?'step':undefined}><strong>{step.label}</strong><small>{step.text}</small></li>)}</ol><p className="progress-note">GitHub 상태를 기준으로 표시합니다. 요청은 30초, 검사는 15초마다 갱신하며 작업의 퍼센트 진행률은 아닙니다.</p>
 {state==='failed'&&<p className="error-note">자동 작업을 완료하지 못했습니다. 실행 기록에서 원인을 확인한 뒤 다시 시도해 주세요.</p>}
 <div className="action-row"><a className="text-button" href={r.url} target="_blank" rel="noreferrer">원본 요청 ↗</a>{r.run&&<a className="text-button" href={r.run.url} target="_blank" rel="noreferrer">실행 기록 ↗</a>}{r.pull&&<a className="text-button" href={r.pull.url} target="_blank" rel="noreferrer">PR 보기 ↗</a>}</div>
 </section>
 {r.pull&&<section className="panel connected-panel preview-panel" aria-label="홈페이지 미리보기"><div className="connected-heading"><h2>홈페이지 미리보기</h2><span role="status" className={`state-pill ${previewReady?'done':preview?.state==='failed'?'failed':''}`}>{detailError?'배포 상태 조회 실패':previewText[preview?.state]||'배포 상태 확인 중'}</span></div><p>반영 전에 실제 홈페이지를 열어 내용과 디자인을 확인하세요. 이 미리보기는 검토 중인 변경에 고정되어 있습니다.</p><div className="action-row">{previewReady?<a className="primary" href={preview.url} target="_blank" rel="noopener noreferrer">변경된 홈페이지 미리보기 ↗</a>:<button className="primary" disabled>변경된 홈페이지 미리보기</button>}<button className="text-button" onClick={()=>setReload(n=>n+1)}>배포 상태 새로고침</button>{preview?.logsUrl&&<a className="text-button" href={preview.logsUrl} target="_blank" rel="noopener noreferrer">배포 기록 ↗</a>}</div>{preview?.state==='failed'||preview?.state==='cancelled'?<p className="error-note">미리보기를 준비하지 못했습니다. 배포 기록을 확인해 주세요.</p>:!previewReady&&<p className="progress-note">현재 변경의 배포가 완료되고 주소가 확인되면 버튼이 활성화됩니다. 이전 변경의 미리보기는 표시하지 않습니다.</p>}{preview?.head&&<p className="progress-note">검토 중인 변경: {preview.head.slice(0,7)} · 진행 중인 배포는 15초마다 갱신합니다.</p>}</section>}
 {r.pull&&<section className="panel connected-panel"><div className="connected-heading"><h2>변경 내용</h2><span>{ciLabel(detail,detailError)}</span></div>{detailError&&<p role="alert" className="error-note">{detailError} <button className="text-button" onClick={()=>setReload(n=>n+1)}>검사 다시 불러오기</button></p>}{!detail?<p>{detailError?'조회하지 못했습니다. 다시 불러오기를 눌러 주세요.':'변경 내용을 불러오고 있습니다.'}</p>:<><p>추가·삭제된 내용을 확인한 뒤 반영해 주세요.</p>{detail.files.map(f=><details className="file-diff" key={f.path}><summary>{f.path} <span>+{f.additions} / −{f.deletions}</span></summary><pre>{f.patch||'이미지·대용량 파일은 PR에서 확인해 주세요.'}</pre></details>)}{detail.truncated&&<p>변경 파일이 많습니다. 전체 내용은 PR에서 확인하세요.</p>}{detail.ci&&<a className="text-button" href={detail.ci.url} target="_blank" rel="noreferrer">검사 결과 ↗</a>}</>}</section>}
 {error&&<p role="alert" className="error-note">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <div className="action-row"><Link className="secondary" to="/requests">목록으로 돌아가기</Link>{user.role!=='editor'&&<>{state==='review'&&<button className="primary" disabled={busy||!!detailError||detail?.ci?.conclusion!=='success'||r.pull?.draft} onClick={()=>setConfirm('approve')}>이 변경을 테스트 브랜치에 반영</button>}{state==='failed'&&<button className="primary" disabled={busy} onClick={()=>setConfirm('retry')}>다시 실행</button>}{!['done','closed'].includes(state)&&<button className="secondary" disabled={busy} onClick={()=>setConfirm('close')}>요청 종료</button>}</>}</div>
 {confirm&&<section role="dialog" aria-modal="false" aria-labelledby="confirm-title" className="panel connected-panel confirmation"><h2 id="confirm-title">{confirm==='approve'?'확인한 변경을 반영할까요?':confirm==='retry'?'자동 수정을 다시 실행할까요?':'요청을 종료할까요?'}</h2><p>{confirm==='approve'?'테스트 홈페이지 상태가 변경됩니다. 검토한 커밋이 바뀌거나 검사가 통과하지 않았다면 반영되지 않습니다.':confirm==='retry'?'Codex 작업을 다시 실행합니다. 실행 비용이 발생할 수 있습니다.':'열린 PR도 닫힙니다. 진행 중인 작업은 결과를 게시하기 전에 요청 상태를 다시 확인합니다.'}</p><div className="action-row"><button className="primary" disabled={busy} onClick={act}>{busy?'처리 중…':'확인하고 진행'}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>취소</button></div></section>}
 </>;
}
