import React,{useEffect,useState,useRef} from 'react';
import {Link,useNavigate,useLocation} from 'react-router-dom';
import {api} from './api.js';
import {relatedRequest,versionLabel} from '../shared/version.js';
import LoadingIndicator from './LoadingIndicator.jsx';
import Pagination from './Pagination.jsx';
const versionDate=value=>value?new Date(value).toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'반영 날짜 확인 중';
const versionTitle=r=>r.restoration?r.restoration.name||'이전 버전으로 되돌리기':r.displayTitle||r.title?.replace(/^\[Admin Preview\] /,'')||'홈페이지 변경';
const requestId=r=>r.requestId||relatedRequest(r);
function VersionHeader({revision:r,current=false,level=3,environment=false,listSearch=''}){
 const Heading=`h${level}`;
 return <header className="version-header">
  {(current||environment)&&<div className="version-heading-row">{current&&<span className="version-current"><span aria-hidden="true"/>현재 버전</span>}{environment&&<span className="version-environment">테스트 홈페이지</span>}</div>}
  <Heading className="version-title">{versionTitle(r)}</Heading>
  <div className="version-meta">
   <span className="version-number" aria-label={`반영된 ${versionLabel(r.number)}`}>{versionLabel(r.number)}</span>
   <span className="version-kind">{r.restoration?'되돌리기':'수정'}</span>
   {r.restoration&&<span className="version-target">대상 <Link to={`/history/${r.restoration.number}${listSearch}`} aria-label={`되돌린 대상 ${versionLabel(r.restoration.number)} 상세 보기`}>{versionLabel(r.restoration.number)}</Link></span>}
   <time dateTime={r.mergedAt||undefined}>{versionDate(r.mergedAt)} 반영</time>
   {requestId(r)&&<Link className="version-request" to={`/requests/${requestId(r)}?tab=past`}>요청 #{requestId(r)}</Link>}
  </div>
 </header>;
}
export default function History({user,refresh}) {
 const navigate=useNavigate(),location=useLocation(),latestLocation=useRef(location);
 latestLocation.current=location;
 const id=location.pathname.match(/^\/history\/(\d+)$/)?.[1],page=new URLSearchParams(location.search).get('page')||'1';
 const listSearch=page==='1'?'':`?page=${encodeURIComponent(page)}`;
 const [data,setData]=useState(null),[dataPage,setDataPage]=useState(null),[listLoading,setListLoading]=useState(true);
 const [detail,setDetail]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const [planRetry,setPlanRetry]=useState(0),[listError,setListError]=useState(''),[planError,setPlanError]=useState('');
 const listSequence=useRef(0),operation=useRef(crypto.randomUUID());
 const plan=detail&&detail.id===id?detail.value:null;
 function changePage(value,{replace=false}={}){
  const current=latestLocation.current,params=new URLSearchParams(current.search);
  if(value===1)params.delete('page');else params.set('page',String(value));
  navigate({pathname:'/history',search:params.toString(),hash:current.hash},{replace});
 }
 async function load(){
  if(id)return;
  const seq=++listSequence.current;setListLoading(true);setListError('');
  try{
   const value=await api(`/api/history?page=${encodeURIComponent(page)}`);
   if(seq!==listSequence.current)return;
   setData(value);setDataPage(String(value.pagination.page));
   if(String(value.pagination.page)!==page)changePage(value.pagination.page,{replace:true});
  }catch(e){if(seq===listSequence.current)setListError(e.message);}
  finally{if(seq===listSequence.current)setListLoading(false);}
 }
 useEffect(()=>{if(!id)load();return()=>{++listSequence.current;};},[id,page]);
 useEffect(()=>{let active=true;setError('');setPlanError('');setDetail(null);setConfirm(false);operation.current=crypto.randomUUID();if(id)api(`/api/history/${id}`).then(value=>{if(active)setDetail({id,value});}).catch(e=>{if(active)setPlanError(e.message);});return()=>{active=false;};},[id,planRetry]);
 useEffect(()=>{if(plan&&location.hash==='#restore')document.getElementById('restore-version')?.scrollIntoView({block:'start'});},[plan,location.hash]);
 async function restore(){setBusy(true);setError('');try{const result=await api(`/api/history/${id}/restore`,{base:plan.current,requestId:operation.current});await refresh();navigate(`/requests/${result.issue}`);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const selected=plan?.revision,current=data?.currentRevision,previous=data?.revisions||[];
 const selectedCurrent=selected&&selected.mergeSha===plan.current;
 const activeError=error||(id?planError:listError),waiting=listLoading||(!listError&&dataPage!==page);
 function reload(){if(id)setPlanRetry(n=>n+1);else load();}
 return <>
 {activeError&&<p role="alert" className="error-note">{activeError} <button className="text-button" onClick={reload}>다시 불러오기</button></p>}
 <div className="version-toolbar"><p>홈페이지에 반영된 상태를 날짜별로 확인합니다. 진행 중인 작업은 <Link to="/requests">요청 관리</Link>에서 확인하세요.</p><button className="secondary" onClick={reload}>새로고침</button></div>
 {id?<>
  <section className="panel connected-panel version-detail"><Link className="text-button" to={`/history${listSearch}`}>← 홈페이지 버전 목록</Link>{selected?<><VersionHeader revision={selected} current={selectedCurrent} level={2} listSearch={listSearch}/><p className="version-scope">반영 당시의 홈페이지 전체 상태입니다.</p></>:!planError?<LoadingIndicator label="버전 정보 불러오는 중"/>:<h2>버전 정보를 불러오지 못했어요</h2>}
   {plan&&<div className="version-changes"><h3>이 버전에서 반영한 변경</h3><div className="version-page-tags">{plan.changedPages?.length?plan.changedPages.map(name=><span key={name}>{name}</span>):<span>홈페이지 변경</span>}</div>{plan.changesTruncated&&<p>변경 파일이 많아 일부 범위만 표시합니다. 전체 내용은 관련 요청에서 확인하세요.</p>}</div>}
   {selected&&<details className="technical-details"><summary>개발 정보</summary><p>PR #{selected.number} · {selected.mergeSha?.slice(0,7)}</p><a href={selected.url} target="_blank" rel="noreferrer">GitHub 작업 기록 ↗</a></details>}
  </section>
  <section className="panel connected-panel version-restore" id="restore-version"><h2>{selectedCurrent?'현재 홈페이지 상태':'이 버전으로 되돌리기'}</h2>{plan?<><div className="restore-explanation"><strong>{plan.changes.length?'홈페이지 전체를 선택한 버전의 내용으로 되돌립니다.':'지금 홈페이지와 같은 내용입니다.'}</strong><p>선택한 버전 이후에 반영한 다른 페이지의 변경도 함께 되돌아갑니다. 요청과 버전 기록, 로그인·관리자 설정은 유지됩니다.</p><p>되돌리면 달라지는 범위: {plan.changes.length?plan.changes.map(name=>({'src':'페이지 내용·디자인','public':'이미지·첨부 파일','index.html':'공통 페이지 설정'}[name]||name)).join(', '):'없음'}</p></div>{user.role!=='editor'&&<button className="primary" disabled={busy||!plan.changes.length} onClick={()=>setConfirm(true)}>{plan.changes.length?'이 버전으로 되돌리기 요청':'현재와 같은 상태입니다'}</button>}{confirm&&<div className="confirmation"><h3>되돌리기 요청을 만들까요?</h3><p><strong>선택: {selected&&versionLabel(selected.number)}{selected&&` · ${versionDate(selected.mergedAt)}`}</strong></p><p>{selected&&versionTitle(selected)}</p><p>아직 홈페이지는 바뀌지 않습니다. 되돌릴 내용을 준비한 뒤 미리보기를 확인하고 승인해야 홈페이지에 반영됩니다.</p><div className="action-row"><button className="primary" disabled={busy} onClick={restore}>{busy?'요청을 만드는 중…':'되돌리기 요청 만들기'}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>취소</button></div></div>}</>:planError?<p>되돌릴 내용을 확인하지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:<LoadingIndicator label="홈페이지 상태 비교 중"/>}</section>
 </>:!data?<section className="panel connected-panel">{listError?<p>버전 정보를 불러오지 못했습니다.</p>:<LoadingIndicator label="홈페이지 버전 불러오는 중"/>}</section>:!data.totalVersions?<section className="panel connected-panel"><h2>아직 반영된 버전이 없습니다.</h2><p>요청을 승인해 홈페이지에 반영하면 여기에 버전이 남습니다.</p><Link className="secondary" to="/requests">요청 관리로 이동</Link></section>:<>
  <section className="panel connected-panel current-version-card" aria-label="현재 홈페이지 버전">{current?<><VersionHeader revision={current} current level={2} environment listSearch={listSearch}/><div className="action-row version-actions"><Link className="primary" to={`/history/${current.number}${listSearch}`}>현재 버전 보기</Link></div></>:<><h2>현재 버전 확인이 필요합니다</h2><p>현재 테스트 브랜치와 일치하는 반영 기록을 찾지 못했습니다. 아래에는 확인된 이전 버전만 표시합니다.</p></>}</section>
  <section className="panel connected-panel previous-versions"><div className="connected-heading"><h2>이전 버전</h2><span className="version-count">{data.pagination.total}개</span></div><p className="version-help">버전 번호와 반영 내용을 확인하고 돌아갈 버전을 선택하세요. 되돌린 결과도 새로운 버전으로 기록됩니다.</p>{waiting?<LoadingIndicator label="이전 버전 불러오는 중"/>:listError?<p>이전 버전을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:previous.length?<div className="version-list" role="list" aria-label="이전 버전 목록">{previous.map(r=><article className="version-card" role="listitem" key={r.number}><VersionHeader revision={r} listSearch={listSearch}/><div className="version-row-actions"><Link className="secondary" to={`/history/${r.number}${listSearch}`}>버전 보기</Link>{user.role!=='editor'&&<Link className="secondary version-restore-link" to={`/history/${r.number}${listSearch}#restore`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6"/></svg>이 버전으로 되돌리기</Link>}</div></article>)}</div>:<p className="connected-empty">현재 버전 이전의 기록은 없습니다.</p>}{!listError&&data.pagination.pages>1&&<Pagination value={data.pagination} loading={waiting} onChange={changePage} label="홈페이지 버전 페이지"/>}</section>
 </>}
 </>;
}
