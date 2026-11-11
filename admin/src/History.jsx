import React,{useEffect,useState,useRef} from 'react';
import {Link,useNavigate,useLocation} from 'react-router-dom';
import {api} from './api.js';
import {relatedRequest,versionLabel,versionReference} from '../shared/version.js';
import LoadingIndicator from './LoadingIndicator.jsx';
const versionDate=value=>value?new Date(value).toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'반영 날짜 확인 중';
const summary=r=>r.restoration?`${versionReference(r.restoration)}으로 되돌렸습니다`:r.displayTitle||r.title?.replace(/^\[Admin Preview\] /,'')||'홈페이지 변경';
const requestId=r=>r.requestId||relatedRequest(r);
function VersionInfo({revision:r}){
 return <><div className="version-kind"><span className="version-number">{versionLabel(r.number)}</span><span className={`state-pill ${r.restoration?'review':'done'}`}>{r.restoration?'이전 버전으로 되돌림':'수정 반영'}</span></div><p className="version-summary">{summary(r)}</p>{r.restoration&&<p className="restoration-note">되돌아간 버전: {versionLabel(r.restoration.number)}{r.restoration.mergedAt?' · '+versionDate(r.restoration.mergedAt):''} <Link to={`/history/${r.restoration.number}`}>해당 버전 보기 →</Link></p>}</>;
}
function RequestLink({revision:r}){return requestId(r)?<Link className="text-button" to={`/requests/${requestId(r)}?tab=past`}>요청 #{requestId(r)} 보기 →</Link>:null;}
export default function History({user,refresh}) {
 const navigate=useNavigate(),location=useLocation();const id=location.pathname.match(/^\/history\/(\d+)$/)?.[1];
 const [data,setData]=useState(null),[plan,setPlan]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const [planRetry,setPlanRetry]=useState(0),[listError,setListError]=useState(''),[planError,setPlanError]=useState('');
 const listSequence=useRef(0),operation=useRef(crypto.randomUUID());
 async function load(){const seq=++listSequence.current;try{const value=await api('/api/history');if(seq===listSequence.current){setData(value);setListError('');}}catch(e){if(seq===listSequence.current)setListError(e.message);}}
 useEffect(()=>{load();return()=>{++listSequence.current;};},[]);
 useEffect(()=>{let active=true;setError('');setPlanError('');setPlan(null);setConfirm(false);operation.current=crypto.randomUUID();if(id)api(`/api/history/${id}`).then(p=>{if(active)setPlan(p);}).catch(e=>{if(active)setPlanError(e.message);});return()=>{active=false;};},[id,planRetry]);
 useEffect(()=>{if(plan&&location.hash==='#restore')document.getElementById('restore-version')?.scrollIntoView({block:'start'});},[plan,location.hash]);
 async function restore(){setBusy(true);setError('');try{const result=await api(`/api/history/${id}/restore`,{base:plan.current,requestId:operation.current});await refresh();navigate(`/requests/${result.issue}`);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const selected=data?.revisions.find(r=>String(r.number)===id),current=data?.revisions.find(r=>r.mergeSha===data.current),previous=data?.revisions.filter(r=>r.mergeSha!==data.current)||[];
 const selectedCurrent=selected&&selected.mergeSha===data.current;
 return <>
 {(error||listError||planError)&&<p role="alert" className="error-note">{error||planError||listError} <button className="text-button" onClick={()=>{load();setPlanRetry(n=>n+1);}}>다시 불러오기</button></p>}
 <div className="version-toolbar"><p>홈페이지에 반영된 상태를 날짜별로 확인합니다. 진행 중인 작업은 <Link to="/requests">요청 관리</Link>에서 확인하세요.</p><button className="secondary" onClick={load}>새로고침</button></div>
 {id?<>
  <section className="panel connected-panel version-detail"><Link className="text-button" to="/history">← 홈페이지 버전 목록</Link>{selected?<div className="version-detail-title"><span className={`state-pill ${selectedCurrent?'current':''}`}>{selectedCurrent?'현재 버전':'이전 버전'}</span><h2>{versionDate(selected.mergedAt)}</h2><p>반영 당시의 홈페이지 전체 상태입니다.</p></div>:!data&&!listError?<LoadingIndicator label="버전 정보 불러오는 중"/>:<h2>{listError?'버전 정보를 불러오지 못했어요':'버전 정보를 찾을 수 없어요'}</h2>}
   {selected&&<><VersionInfo revision={selected}/><RequestLink revision={selected}/></>}
   {plan&&<div className="version-changes"><h3>이 버전에서 반영한 변경</h3><div className="version-page-tags">{plan.changedPages?.length?plan.changedPages.map(name=><span key={name}>{name}</span>):<span>홈페이지 변경</span>}</div>{plan.changesTruncated&&<p>변경 파일이 많아 일부 범위만 표시합니다. 전체 내용은 관련 요청에서 확인하세요.</p>}</div>}
   {selected&&<details className="technical-details"><summary>개발 정보</summary><p>PR #{selected.number} · {selected.mergeSha?.slice(0,7)}</p><a href={selected.url} target="_blank" rel="noreferrer">GitHub 작업 기록 ↗</a></details>}
  </section>
  <section className="panel connected-panel version-restore" id="restore-version"><h2>{selectedCurrent?'현재 홈페이지 상태':'이 버전으로 되돌리기'}</h2>{plan?<><div className="restore-explanation"><strong>{plan.changes.length?'홈페이지 전체를 선택한 버전의 내용으로 되돌립니다.':'지금 홈페이지와 같은 내용입니다.'}</strong><p>선택한 버전 이후에 반영한 다른 페이지의 변경도 함께 되돌아갑니다. 요청과 버전 기록, 로그인·관리자 설정은 유지됩니다.</p><p>되돌리면 달라지는 범위: {plan.changes.length?plan.changes.map(name=>({'src':'페이지 내용·디자인','public':'이미지·첨부 파일','index.html':'공통 페이지 설정'}[name]||name)).join(', '):'없음'}</p></div>{user.role!=='editor'&&<button className="primary" disabled={busy||!plan.changes.length} onClick={()=>setConfirm(true)}>{plan.changes.length?'이 버전으로 되돌리기 요청':'현재와 같은 상태입니다'}</button>}{confirm&&<div className="confirmation"><h3>되돌리기 요청을 만들까요?</h3><p><strong>선택한 버전: {selected&&versionLabel(selected.number)}{selected&&` · ${versionDate(selected.mergedAt)}`}</strong></p><p>{selected&&summary(selected)}</p><p>아직 홈페이지는 바뀌지 않습니다. 되돌릴 내용을 준비한 뒤 미리보기를 확인하고 승인해야 홈페이지에 반영됩니다.</p><div className="action-row"><button className="primary" disabled={busy} onClick={restore}>{busy?'요청을 만드는 중…':'되돌리기 요청 만들기'}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>취소</button></div></div>}</>:planError?<p>되돌릴 내용을 확인하지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:<LoadingIndicator label="홈페이지 상태 비교 중"/>}</section>
 </>:!data?<section className="panel connected-panel">{listError?<p>버전 정보를 불러오지 못했습니다.</p>:<LoadingIndicator label="홈페이지 버전 불러오는 중"/>}</section>:!data.revisions.length?<section className="panel connected-panel"><h2>아직 반영된 버전이 없습니다.</h2><p>요청을 승인해 홈페이지에 반영하면 여기에 버전이 남습니다.</p><Link className="secondary" to="/requests">요청 관리로 이동</Link></section>:<>
  <section className="panel connected-panel current-version-card" aria-label="현재 홈페이지 버전">{current?<><div className="connected-heading"><span className="state-pill current">현재 버전</span><span className="version-environment">테스트 홈페이지</span></div><h2>현재 반영된 홈페이지</h2><p className="version-date">{versionDate(current.mergedAt)} 반영</p><VersionInfo revision={current}/><div className="action-row"><Link className="primary" to={`/history/${current.number}`}>현재 버전 보기</Link><RequestLink revision={current}/></div></>:<><h2>현재 버전 확인이 필요합니다</h2><p>현재 테스트 브랜치와 일치하는 반영 기록을 찾지 못했습니다. 아래에는 확인된 이전 버전만 표시합니다.</p></>}</section>
  <section className="panel connected-panel previous-versions"><div className="connected-heading"><h2>이전 버전</h2><span className="version-count">{previous.length}개</span></div><p className="version-help">버전 번호와 반영 내용을 확인하고 돌아갈 버전을 선택하세요. 되돌린 결과도 새로운 버전으로 기록됩니다.</p>{previous.length?<div className="version-list">{previous.map(r=><article className="version-card" key={r.number}><h3>{versionDate(r.mergedAt)}</h3><VersionInfo revision={r}/><div className="action-row"><Link className="secondary" to={`/history/${r.number}`}>버전 보기</Link>{user.role!=='editor'&&<Link className="text-button" to={`/history/${r.number}#restore`}>이 버전으로 되돌리기</Link>}</div><RequestLink revision={r}/></article>)}</div>:<p className="connected-empty">현재 버전 이전의 기록은 없습니다.</p>}</section>
 </>}
 </>;
}
