import {isRevert} from '../shared/github-sync.js';
import {production,review} from './environment.js';
import React,{useEffect,useState,useRef} from 'react';
import {Link,useNavigate,useLocation} from 'react-router-dom';
import {api} from './api.js';
import {relatedRequest,versionLabel,revisionKey,revisionLabel} from '../shared/version.js';
import LoadingIndicator from './LoadingIndicator.jsx';
import Pagination from './Pagination.jsx';
import RefreshButton from './RefreshButton.jsx';
import ActionButton from './ActionButton.jsx';
import useReadResource from './useReadResource.js';
const versionDate=value=>value?new Date(value).toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'반영 날짜 확인 중';
const versionTitle=r=>r.restoration?r.restoration.name||'이전 버전으로 되돌리기':r.displayTitle||r.title?.replace(/^\[Admin Preview\] /,'')||'홈페이지 변경';
const requestId=r=>r.requestId||relatedRequest(r);
function VersionHeader({revision:r,current=false,level=3,environment=false,listSearch=''}){
 const Heading=`h${level}`;
 return <header className="version-header">
  {(current||environment)&&<div className="version-heading-row">{current&&<span className="version-current"><span aria-hidden="true"/>현재 버전</span>}{environment&&<span className="version-environment">{production?'운영 홈페이지':'테스트 홈페이지'}</span>}</div>}
  <Heading className="version-title">{versionTitle(r)}</Heading>
  <div className="version-meta">
   <span className="version-number" aria-label={`반영된 ${revisionLabel(r)}`}>{revisionLabel(r)}</span>
   <span className="version-kind">{r.kind==='direct'?'GitHub':r.restoration?'되돌리기':isRevert({pull:r})?'변경 취소':'수정'}</span>
   {r.restoration&&<span className="version-target">대상 <Link to={`/history/${r.restoration.key||r.restoration.number}${listSearch}`} aria-label={`되돌린 대상 ${versionLabel(r.restoration.number)} 상세 보기`}>{versionLabel(r.restoration.number)||'직접 수정'}</Link></span>}
   <time dateTime={r.mergedAt||undefined}>{versionDate(r.mergedAt)} 반영</time>
   {requestId(r)&&<Link className="version-request" to={`/requests/${requestId(r)}?tab=past`}>요청 #{requestId(r)}</Link>}
  </div>
 </header>;
}
export default function History({user,refresh}) {
 const navigate=useNavigate(),location=useLocation(),latestLocation=useRef(location);
 latestLocation.current=location;
 const id=location.pathname.match(/^\/history\/([1-9]\d*|commit-[a-f0-9]{40})$/)?.[1],page=new URLSearchParams(location.search).get('page')||'1';
 const example=review?new URLSearchParams(location.search).get('example'):null;
 const reviewQuery=example?`example=${encodeURIComponent(example)}`:'';
 const search=new URLSearchParams();if(page!=='1')search.set('page',page);if(example)search.set('example',example);
 const listSearch=search.size?'?'+search.toString():'';
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const operation=useRef(crypto.randomUUID()),lastList=useRef(null);
 const list=useReadResource(id?null:`/api/history?page=${encodeURIComponent(page)}${reviewQuery?'&'+reviewQuery:''}`,{onLoad:value=>{if(String(value.pagination.page)!==page)changePage(value.pagination.page,{replace:true});}});
 const detail=useReadResource(id?`/api/history/${id}${reviewQuery?'?'+reviewQuery:''}`:null);
 if(list.data)lastList.current=list.data;
 const data=list.data||lastList.current,plan=detail.data,listError=list.error,planError=detail.error;
 function changePage(value,{replace=false}={}){
  const current=latestLocation.current,params=new URLSearchParams(current.search);
  if(value===1)params.delete('page');else params.set('page',String(value));
  navigate({pathname:'/history',search:params.toString(),hash:current.hash},{replace});
 }
 useEffect(()=>{setError('');setConfirm(false);operation.current=crypto.randomUUID();},[id]);
 useEffect(()=>{if(plan&&location.hash==='#restore')document.getElementById('restore-version')?.scrollIntoView({block:'start'});},[plan,location.hash]);
 async function restore(){setBusy(true);setError('');try{const result=await api(`/api/history/${id}/restore${reviewQuery?'?'+reviewQuery:''}`,{base:plan.current,requestId:operation.current});await refresh();navigate(`/requests/${result.issue}`);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const selected=plan?.revision,current=data?.currentRevision,previous=data?.revisions||[];
 const selectedCurrent=selected&&(plan.currentContent??selected.mergeSha===plan.current);
 const restoreBlocked=plan?.restoreSafety?.allowed===false;
 const activeError=error||(id?planError:listError),waiting=!list.data||String(list.data.pagination.page)!==page;
 function reload(){setConfirm(false);return id?detail.refresh():list.refresh();}
 return <>
 {activeError&&<p role="alert" className="error-note">{activeError} <RefreshButton key={`retry:${id||page}`} onRefresh={reload} label="다시 불러오기" description={id?'버전 정보':'홈페이지 버전 목록'}/></p>}
 <div className="version-toolbar"><p>홈페이지에 반영된 상태를 날짜별로 확인합니다. 진행 중인 작업은 <Link to="/requests">요청 관리</Link>에서 확인하세요.</p><RefreshButton key={id||page} onRefresh={reload} description={id?'버전 정보':'홈페이지 버전 목록'}/></div>
 {id?<>
  <section className="panel connected-panel version-detail"><Link className="text-button" to={`/history${listSearch}`}>← 홈페이지 버전 목록</Link>{selected?<><VersionHeader revision={selected} current={selectedCurrent} level={2} listSearch={listSearch}/><p className="version-scope">반영 당시의 홈페이지 내용입니다. 공통 기능과 운영 설정은 최신 상태를 유지합니다.</p></>:!planError?<LoadingIndicator label="버전 정보 불러오는 중"/>:<h2>버전 정보를 불러오지 못했어요</h2>}
   {plan&&<div className="version-changes"><h3>이 버전에서 반영한 변경</h3><div className="version-page-tags">{plan.changedPages?.length?plan.changedPages.map(name=><span key={name}>{name}</span>):<span>홈페이지 변경</span>}</div>{plan.changesTruncated&&<p>변경 파일이 많아 일부 범위만 표시합니다. 전체 내용은 관련 요청에서 확인하세요.</p>}</div>}
   {selected&&<details className="technical-details"><summary>개발 정보</summary><p>{selected.kind==='direct'?'직접 수정':`PR #${selected.number}`} · {selected.mergeSha?.slice(0,7)}</p><a href={selected.url} target="_blank" rel="noreferrer">GitHub 작업 기록 ↗</a></details>}
  </section>
  <section className="panel connected-panel version-restore" id="restore-version"><h2>{selectedCurrent?'현재 홈페이지 상태':'이 버전으로 되돌리기'}</h2><p className="version-safety-note">문구·페이지·스타일·이미지만 되돌립니다. 어드민과 공통 기능, 운영 설정은 유지됩니다.</p>{plan?<>{restoreBlocked&&<div className="restore-blocked" role="note"><h3>공통 기능 업데이트 이후의 버전을 선택해 주세요</h3><p>{plan.restoreSafety.reason}</p><Link className="secondary" to="/requests/new">새 수정 요청 작성</Link></div>}{!restoreBlocked&&<div className="restore-explanation"><strong>{plan.changes.length?'선택한 버전의 문구·페이지·스타일·이미지로 되돌립니다.':'지금 홈페이지와 같은 내용입니다.'}</strong><p>선택한 버전 이후에 반영한 다른 페이지의 변경도 함께 되돌아갑니다. 요청과 버전 기록, 로그인·관리자 설정은 유지됩니다.</p><p>되돌리면 달라지는 범위: {plan.changes.length?(plan.changedPages?.length?plan.changedPages:['홈페이지 내용']).join(', '):'없음'}</p></div>}{user.role!=='editor'&&!restoreBlocked&&<button className="primary" disabled={busy||detail.loading||!!planError||!plan.changes.length} onClick={()=>setConfirm(true)}>{plan.changes.length?'이 버전으로 되돌리기 요청':'현재와 같은 상태입니다'}</button>}{confirm&&!restoreBlocked&&<div className="confirmation"><h3>되돌리기 요청을 만들까요?</h3><p><strong>선택: {selected&&revisionLabel(selected)}{selected&&` · ${versionDate(selected.mergedAt)}`}</strong></p><p>{selected&&versionTitle(selected)}</p><p>아직 홈페이지는 바뀌지 않습니다. 되돌릴 내용을 준비한 뒤 미리보기를 확인하고 승인해야 홈페이지에 반영됩니다.</p><div className="action-row"><ActionButton busy={busy} busyLabel="접수 중…" disabled={detail.loading||!!planError} onClick={restore}>되돌리기 요청 만들기</ActionButton><button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>취소</button></div></div>}</>:planError?<p>되돌릴 내용을 확인하지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:<LoadingIndicator label="홈페이지 상태 비교 중"/>}</section>
 </>:!data?<section className="panel connected-panel">{listError?<p>버전 정보를 불러오지 못했습니다.</p>:<LoadingIndicator label="홈페이지 버전 불러오는 중"/>}</section>:!data.totalVersions?<section className="panel connected-panel"><h2>아직 반영된 버전이 없습니다.</h2><p>수정 요청과 GitHub에서 직접 반영한 홈페이지 변경이 여기에 표시됩니다.</p><Link className="secondary" to="/requests">요청 관리로 이동</Link></section>:<>
  <section className="panel connected-panel current-version-card" aria-label="현재 홈페이지 버전">{current?<><VersionHeader revision={current} current level={2} environment listSearch={listSearch}/><div className="action-row version-actions"><Link className="primary" to={`/history/${revisionKey(current)}${listSearch}`}>현재 버전 보기</Link></div></>:<><h2>최근 홈페이지 변경</h2><p>현재 홈페이지의 변경 기록을 불러오지 못했습니다. 새로고침해 주세요.</p></>}</section>
  <section className="panel connected-panel previous-versions"><div className="connected-heading"><h2>이전 버전</h2><span className="version-count">{data.pagination.total}개</span></div><p className="version-help">반영 내용을 확인하고 돌아갈 버전을 선택하세요. 공통 기능이 달라진 이전 버전은 자동으로 되돌리지 않습니다. 되돌린 결과도 새로운 버전으로 기록됩니다.</p>{waiting?(listError?<p>이전 버전을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:<LoadingIndicator label="이전 버전 불러오는 중"/>):previous.length?<div className="version-list" role="list" aria-label="이전 버전 목록">{previous.map(r=><article className="version-card" role="listitem" key={revisionKey(r)}><VersionHeader revision={r} listSearch={listSearch}/><div className="version-row-actions"><Link className="secondary" to={`/history/${revisionKey(r)}${listSearch}`}>버전 보기</Link>{user.role!=='editor'&&<Link className="secondary version-restore-link" to={`/history/${revisionKey(r)}${listSearch}#restore`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6"/></svg>이 버전으로 되돌리기</Link>}</div></article>)}</div>:<p className="connected-empty">현재 버전 이전의 기록은 없습니다.</p>}{!listError&&data.pagination.pages>1&&<Pagination value={data.pagination} loading={list.loading} onChange={changePage} label="홈페이지 버전 페이지"/>}</section>
 </>}
 </>;
}
