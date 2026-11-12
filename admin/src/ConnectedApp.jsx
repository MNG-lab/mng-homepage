import {production,review} from './environment.js';
import organizationAvatar from "./assets/mng-lab-avatar.png";
import React,{useEffect,useState,useRef,useMemo} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {api,requestState,requestLabel,requestTitle,isRestoration,isRevert,labels,date} from './api.js';
import {appliedVersion} from '../shared/version.js';
import {paginateRequests} from '../shared/request-list.js';
import Pagination from './Pagination.jsx';
import LoadingIndicator from './LoadingIndicator.jsx';
import RefreshButton from './RefreshButton.jsx';
import ActionButton from './ActionButton.jsx';
import History from './History.jsx';
import Settings from './Settings.jsx';
import RequestDetail from './RequestDetail.jsx';
import NewRequest from './NewRequest.jsx';
import AccountAvatar from './AccountAvatar.jsx';
import SidebarQuickLinks from './SidebarQuickLinks.jsx';
function RequestRows({requests,search='',manage=false}) {return <ul className={`connected-list ${manage?'managed-requests':''}`}>{requests.map(r=>{const state=requestState(r);return <li key={r.id}><Link to={`/requests/${r.id}${search}`}><div><span className={`request-kind ${isRestoration(r)?'restore':''}`}>{isRevert(r)?'특정 변경 취소':isRestoration(r)?'이전 버전으로 되돌리기':'홈페이지 수정'}</span><strong>{requestTitle(r)}</strong><small>요청 #{r.id} · {date(r.createdAt)} 접수</small>{appliedVersion(r)&&<span className="request-result-version">반영 <b>{appliedVersion(r)}</b></span>}</div><div className="request-row-state"><span className={`state-pill ${state}`}>{requestLabel(r)}</span>{manage&&<span className="request-row-action">{state==='review'?'변경 확인 →':state==='failed'?(r.failure?.retryable===false?'안내 확인 →':'재실행 확인 →'):state==='auth_required'?'연결 상태 확인 →':'요청 보기 →'}</span>}</div></Link>{manage&&appliedVersion(r)&&<Link className="request-version-link" to={`/history/${r.pull.number}`}>{appliedVersion(r)} 보기 →</Link>}</li>;})}</ul>;}
export default function ConnectedApp({user}) {
 const location=useLocation(),navigate=useNavigate();
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [catalog,setCatalog]=useState(null);
 const readCache=useRef(new Map());
 const params=new URLSearchParams(location.search),query=params.get('q')||'',filter=params.get('status')||'all';
 const refreshSequence=useRef(0),activeRead=useRef(null);
 const detailId=location.pathname.match(/^\/requests\/(\d+)$/)?.[1];
 const isDashboard=location.pathname==='/dashboard'||location.pathname==='/';
 const isSettings=location.pathname==='/settings',isNew=location.pathname==='/requests/new',isHistory=location.pathname.startsWith('/history');
 const isRequestList=!isDashboard&&!isSettings&&!isNew&&!isHistory&&!detailId;
 const listPage=params.get('page')||'1',recoveryPage=params.get('recovery_page')||'1';
 const tab=['active','past'].includes(params.get('tab'))?params.get('tab'):['done','closed'].includes(filter)?'past':'active';
 const tabStatuses=Object.entries(labels).filter(([value])=>['done','closed'].includes(value)===(tab==='past'));
 function switchTab(value){changeList({tab:value,status:'all',q:query,page:1});}
 const path=isHistory||isNew?null:detailId?`/api/requests/${detailId}`:isDashboard?'/api/requests?view=summary':isSettings?`/api/requests?status=auth_required&page_size=3&page=${recoveryPage}`:'/api/requests?view=catalog';
 const listView=useMemo(()=>catalog?paginateRequests(catalog.requests,{q:query,status:filter,scope:tab,page:Number.isSafeInteger(Number(listPage))&&Number(listPage)>0?Number(listPage):1}):null,[catalog,query,filter,tab,listPage]);
 const displayedData=data?.path===path?data:isDashboard?readCache.current.get(path):null;
 const current=isRequestList?listView:displayedData?.value,requests=current?.requests||[],selected=current?.request;
 const counts=current?.counts||{},attention=current?.attention||[],recent=current?.recent||[];
 const pageTitle=isDashboard?'대시보드':isNew?'새 수정 요청':isHistory?'홈페이지 버전':isSettings?'설정':detailId?'요청 상세':'요청 관리';
 function changeList(values,{replace=false}={}){
  const next=new URLSearchParams(location.search);
  for(const [key,value] of Object.entries(values))if(!value||value==='all'||(key==='page'&&value===1))next.delete(key);else next.set(key,String(value));
  navigate({pathname:'/requests',search:next.toString()},{replace});
 }
 function changeRecovery(value){const next=new URLSearchParams(location.search);if(value===1)next.delete('recovery_page');else next.set('recovery_page',value);navigate({pathname:'/settings',search:next.toString(),hash:location.hash});}
 function refresh(){
  if(!path)return Promise.resolve(null);
  // Manual refresh and automatic polling share the same read and outcome.
  if(activeRead.current?.path===path)return activeRead.current.promise;
  const seq=++refreshSequence.current,read={path};setLoading(true);
  read.promise=(async()=>{
   try{
    const value=await api(path);
    if(seq!==refreshSequence.current)return null;
    if(isRequestList)setCatalog(value);
    else {
     const snapshot={path,value,updatedAt:Date.now()};
     setData(snapshot);if(isDashboard)readCache.current.set(path,snapshot);
     // Detail reads after approval, closing, retrying, or creation update the
     // cached list too, without another full GitHub catalogue request.
     if(value.request)setCatalog(previous=>previous?{requests:[value.request,...previous.requests.filter(r=>r.id!==value.request.id)].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')||b.id-a.id)}:previous);
    }
    setError('');
    if(value.pagination&&String(value.pagination.page)!==(isSettings?recoveryPage:listPage)){
     if(isSettings)changeRecovery(value.pagination.page);else changeList({page:value.pagination.page},{replace:true});
    }
    return true;
   }catch(e){if(seq===refreshSequence.current){setError(e.status===404&&detailId?'':e.message);if(e.status===404){setData({path,value:{}});if(detailId)setCatalog(previous=>previous?{requests:previous.requests.filter(r=>r.id!==Number(detailId))}:previous);}return false;}return null;}
   finally{if(seq===refreshSequence.current)setLoading(false);if(activeRead.current===read)activeRead.current=null;}
  })();
  activeRead.current=read;return read.promise;
 }
 useEffect(()=>{
  if(!path){++refreshSequence.current;setLoading(false);setError('');return;}
  if(isRequestList){
   setError('');
   // Revalidate on each visit; tabs, filters, and pages share this API path.
   refresh();
   return()=>{++refreshSequence.current;activeRead.current=null;};
  }
  setError('');refresh();const update=()=>{if(document.visibilityState==='visible')refresh();};
  const timer=setInterval(update,30000);document.addEventListener('visibilitychange',update);
  return()=>{++refreshSequence.current;activeRead.current=null;clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[path]);
 useEffect(()=>{
  if(isRequestList&&listView&&String(listView.pagination.page)!==listPage)changeList({page:listView.pagination.page},{replace:true});
 },[isRequestList,listView,listPage]);
 useEffect(()=>{document.title=`${pageTitle} · MNG 홈페이지 관리 어드민`;setNotice('');},[location.pathname,pageTitle]);
 return <div className="app-shell">
  <aside className="sidebar"><Link className="brand" to="/dashboard"><img className="brand-symbol brand-avatar" src={organizationAvatar} alt="" width="40" height="40"/><span>MNG Lab<small>홈페이지 관리 어드민</small></span></Link><div className="workspace-label">WORKSPACE <span>{review?'화면 검토':production?'운영':'연동 테스트'}</span></div>
   <nav aria-label="주 메뉴">{[['/dashboard','대시보드'],['/requests','요청 관리'],['/history','홈페이지 버전'],['/settings','설정']].map(([path,label])=><button key={path} className={`nav-item ${location.pathname===path||location.pathname.startsWith(path+'/')?'active':''}`} onClick={()=>navigate(path)}>{label}</button>)}</nav>
   <SidebarQuickLinks/>
  </aside>
  <div className="main-wrap"><header className="topbar connected-topbar">
   <span className="topbar-page-title">{pageTitle}</span>
   <div className="connected-top-actions">
    <div className="header-account" role="group" aria-label="현재 로그인한 사용자">
     <AccountAvatar picture={user.picture}/>
     <div className="header-account-info">
      <span className="header-account-email" title={user.email}>{user.email}</span>
      <span className={`role-badge role-badge-${user.role}`}>{user.role==='owner'?'최고 관리자':user.role==='admin'?'관리자':'편집자'}</span>
     </div>
    </div>
    <form method="post" action="/auth/logout"><button className="text-button header-logout" type="submit">로그아웃</button></form>
   </div>
  </header>
   <main className="connected-main"><div className="connected-heading"><div><h1>{pageTitle}</h1><p>{isDashboard?'확인할 작업과 최근 요청을 한눈에 살펴보세요.':isHistory?'현재 홈페이지를 확인하고, 필요한 이전 버전을 찾아보세요.':isSettings?'구성원과 서비스 연결을 관리하세요.':isNew?'바꾸고 싶은 내용을 알려 주세요.':detailId?'요청의 진행 상황을 확인하고 필요한 작업을 처리하세요.':'검토·재실행이 필요한 요청을 확인하고 처리하세요.'}</p></div>{!isNew&&!isHistory&&<div className="action-row">{isDashboard&&<RefreshButton onRefresh={refresh} loading={loading} description="대시보드"/>}<button className="primary" onClick={()=>navigate('/requests/new')}>새 수정 요청</button></div>}</div>
    {review&&<aside className="review-environment" aria-label="검토 환경 안내"><p><strong>검토용 화면</strong> · 제출과 변경 취소를 직접 눌러보세요. 실제 GitHub 요청·DB·운영 홈페이지에는 반영되지 않습니다.</p><div className="action-row"><Link to="/history?example=current">현재 버전</Link><Link to="/history?example=direct">직접 수정</Link><Link to="/history/201?example=protected#restore">되돌리기 제한</Link><Link to="/requests/101">변경 취소 제한</Link><Link to="/requests/new">새 작성 폼</Link><Link to="/requests/101">완료된 요청 예시</Link><a href="/review/templates" target="_blank" rel="noreferrer">GitHub 양식 비교 ↗</a></div></aside>}
    {!production&&<div className="inline-note">테스트 환경입니다. main 및 운영 홈페이지에는 반영되지 않습니다.</div>}
    {error&&!isHistory&&<p role="alert" className="error-note">{error} {location.pathname!=='/requests'&&<RefreshButton key={path} onRefresh={refresh} label="다시 불러오기" description={pageTitle}/>}</p>}{notice&&<p role="status" className="inline-note">{notice}</p>}
    {isDashboard?<>
     <section className="stats" aria-label="작업 요약">{[['확인할 변경',counts.review||0,'변경 내용을 검토하고 반영하세요.','review'],['진행 중',counts.working||0,'요청한 작업이 진행되고 있어요.','working'],['확인이 필요한 실패',counts.failed||0,'실패 원인과 필요한 조치를 확인하세요.','failed']].map(([label,count,text,state])=><button className="stat-card" key={state} onClick={()=>navigate(`/requests?status=${state}`)}><span>{label}</span><div>{!current?'—':count}<small>건</small></div><p>{text}</p></button>)}</section>
     <section className="panel connected-panel"><h2>지금 확인할 작업</h2>{!current&&!error?<LoadingIndicator label="확인할 작업 불러오는 중"/>:attention.length?<RequestRows requests={attention}/>:<p className="connected-empty">확인을 기다리는 작업이 없습니다.</p>}</section>
     <section className="panel connected-panel"><div className="connected-heading"><h2>최근 작업</h2><Link className="text-button" to="/requests">요청 관리로 이동 →</Link></div>{!current&&!error?<LoadingIndicator label="최근 작업 불러오는 중"/>:recent.length?<RequestRows requests={recent}/>:<p className="connected-empty">첫 수정 요청을 작성해 보세요.</p>}</section>
    </>:isHistory?<History user={user} refresh={refresh} cache={readCache.current}/>:isSettings?<Settings cache={readCache.current} user={user} requests={requests} refresh={refresh} pagination={current?.pagination} connectionRequired={current?.connectionRequired} onPageChange={changeRecovery} loading={loading||!current}/>:isNew?<NewRequest user={user} onSubmitted={result=>{navigate(`/requests/${result.issue}`);setNotice(result.warning||'요청을 접수했습니다. 작업 상태는 자동으로 갱신됩니다.');}} onCancel={()=>navigate('/requests')}/>:selected?<RequestDetail key={selected.id} request={selected} user={user} refresh={refresh} requestLoading={loading} requestError={error} requestUpdatedAt={data?.updatedAt} listSearch={location.search}/>:detailId?<section className="panel connected-panel"><>{loading?<LoadingIndicator label="요청 불러오는 중"/>:<h2>{error?'요청을 불러오지 못했어요':'요청을 찾을 수 없어요'}</h2>}</><Link to={`/requests${location.search}`}>요청 목록으로 돌아가기</Link></section>:<section className="panel connected-panel">
     <div className="connected-heading"><h2>{tab==='active'?'처리할 요청':'지난 요청'}</h2><RefreshButton key={path} onRefresh={refresh} loading={loading}/></div>
     <div className="request-tabs" role="group" aria-label="요청 구분">{[['active','처리 중'],['past','지난 요청']].map(([value,label])=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>switchTab(value)}>{label} {current?.scopeCounts&&<span>({current.scopeCounts[value]})</span>}</button>)}</div>
     <p className="request-tab-description">{tab==='active'?'자동 수정 중이거나 검토·재실행이 필요한 요청입니다.':'반영을 마쳤거나 종료한 요청입니다. 반영된 홈페이지는 버전 화면에서 확인할 수 있습니다.'}</p>
     <div className="request-tools"><label>요청 검색<input type="search" value={query} maxLength={200} onChange={e=>changeList({q:e.target.value,page:1},{replace:true})} placeholder="제목, 내용, 요청 번호, 버전 번호"/></label><label>상태<select aria-label="상태" value={filter} onChange={e=>changeList({status:e.target.value,q:query,page:1})}><option value="all">전체</option>{tabStatuses.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label></div>
     <div aria-busy={loading||(!current&&!error)}>{!current?(error?<p>목록을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:<LoadingIndicator label="요청 목록 불러오는 중"/>):requests.length?<RequestRows requests={requests} search={location.search} manage/>:<p className="connected-empty">{query||filter!=='all'?'조건에 맞는 요청이 없습니다.':tab==='active'?'지금 처리할 요청이 없습니다. 완료된 작업은 지난 요청에서 확인하세요.':'아직 지난 요청이 없습니다.'}</p>}</div>
     <Pagination value={current?.pagination} loading={loading&&!current} onChange={value=>changeList({page:value})}/>
    </section>}
   </main></div>
 </div>;
}
