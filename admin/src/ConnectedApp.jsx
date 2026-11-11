import organizationAvatar from "./assets/mng-lab-avatar.png";
import React,{useEffect,useState,useRef} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {api,requestState,requestLabel,requestTitle,isRestoration,labels,date} from './api.js';
import {appliedVersion} from '../shared/version.js';
import Pagination from './Pagination.jsx';
import LoadingIndicator from './LoadingIndicator.jsx';
import RefreshButton from './RefreshButton.jsx';
import History from './History.jsx';
import Settings from './Settings.jsx';
import RequestDetail from './RequestDetail.jsx';
const pages=['Home','Research','Professor','Members','Publications','Gallery','Contact'];
function RequestRows({requests,search='',manage=false}) {return <ul className={`connected-list ${manage?'managed-requests':''}`}>{requests.map(r=>{const state=requestState(r);return <li key={r.id}><Link to={`/requests/${r.id}${search}`}><div><span className={`request-kind ${isRestoration(r)?'restore':''}`}>{isRestoration(r)?'이전 버전으로 되돌리기':'홈페이지 수정'}</span><strong>{requestTitle(r)}</strong><small>요청 #{r.id} · {date(r.createdAt)} 접수</small>{appliedVersion(r)&&<span className="request-result-version">반영 <b>{appliedVersion(r)}</b></span>}</div><div className="request-row-state"><span className={`state-pill ${state}`}>{requestLabel(r)}</span>{manage&&<span className="request-row-action">{state==='review'?'변경 확인 →':state==='failed'?'재실행 확인 →':state==='auth_required'?'연결 상태 확인 →':'요청 보기 →'}</span>}</div></Link>{manage&&r.pull?.merged&&<Link className="request-version-link" to={`/history/${r.pull.number}`}>{appliedVersion(r)} 보기 →</Link>}</li>;})}</ul>;}
export default function ConnectedApp({user}) {
 const location=useLocation(),navigate=useNavigate();
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [title,setTitle]=useState(''),[page,setPage]=useState('Members'),[description,setDescription]=useState('');
 const [requestId,setRequestId]=useState(()=>sessionStorage.getItem('mng-request-id')||crypto.randomUUID());
 const params=new URLSearchParams(location.search),query=params.get('q')||'',filter=params.get('status')||'all';
 const [draftQuery,setDraftQuery]=useState(query);
 const refreshSequence=useRef(0),activeRead=useRef(null);
 const detailId=location.pathname.match(/^\/requests\/(\d+)$/)?.[1];
 const isDashboard=location.pathname==='/dashboard'||location.pathname==='/';
 const isSettings=location.pathname==='/settings',isNew=location.pathname==='/requests/new',isHistory=location.pathname.startsWith('/history');
 const listPage=params.get('page')||'1',recoveryPage=params.get('recovery_page')||'1';
 const tab=['active','past'].includes(params.get('tab'))?params.get('tab'):['done','closed'].includes(filter)?'past':'active';
 const tabStatuses=Object.entries(labels).filter(([value])=>['done','closed'].includes(value)===(tab==='past'));
 function switchTab(value){changeList({tab:value,status:'all',q:draftQuery,page:1});}
 const path=isHistory||isNew?null:detailId?`/api/requests/${detailId}`:isDashboard?'/api/requests?view=summary':isSettings?`/api/requests?status=auth_required&page_size=3&page=${recoveryPage}`:`/api/requests?${new URLSearchParams({q:query,status:filter,page:listPage,scope:tab})}`;
 const current=data?.path===path?data.value:null,requests=current?.requests||[],selected=current?.request;
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
  if(location.pathname==='/requests'&&activeRead.current?.path===path)return activeRead.current.promise;
  const seq=++refreshSequence.current,read={path};setLoading(true);
  read.promise=(async()=>{
   try{
    const value=await api(path);
    if(seq!==refreshSequence.current)return null;
    setData({path,value});setError('');
    if(value.pagination&&String(value.pagination.page)!==(isSettings?recoveryPage:listPage)){
     if(isSettings)changeRecovery(value.pagination.page);else changeList({page:value.pagination.page},{replace:true});
    }
    return true;
   }catch(e){if(seq===refreshSequence.current){setError(e.status===404&&detailId?'':e.message);if(e.status===404)setData({path,value:{}});return false;}return null;}
   finally{if(seq===refreshSequence.current)setLoading(false);if(activeRead.current===read)activeRead.current=null;}
  })();
  activeRead.current=read;return read.promise;
 }
 useEffect(()=>{
  if(!path){++refreshSequence.current;setLoading(false);setError('');return;}
  setError('');refresh();const update=()=>{if(document.visibilityState==='visible')refresh();};
  const timer=setInterval(update,30000);document.addEventListener('visibilitychange',update);
  return()=>{++refreshSequence.current;activeRead.current=null;clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[path]);
 useEffect(()=>{setDraftQuery(query);},[query,location.key]);
 useEffect(()=>{
  if(location.pathname!=='/requests'||draftQuery===query)return;
  const timer=setTimeout(()=>changeList({q:draftQuery,page:1},{replace:true}),350);
  return()=>clearTimeout(timer);
 },[draftQuery,query,location.pathname,location.search]);
 useEffect(()=>{document.title=`${pageTitle} · MNG 홈페이지 관리 어드민`;setNotice('');},[location.pathname,pageTitle]);
 async function submit(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');sessionStorage.setItem('mng-request-id',requestId);
  try{const data=await api('/api/requests',{requestId,title,page,description});sessionStorage.removeItem('mng-request-id');setRequestId(crypto.randomUUID());setTitle('');setDescription('');setData({path:`/api/requests/${data.issue}`,value:{request:{id:data.issue,title:title.trim(),description,state:'open',createdAt:new Date().toISOString(),url:`https://github.com/MNG-lab/mng-homepage/issues/${data.issue}`,pull:null,run:null}}});navigate(`/requests/${data.issue}`);setNotice(data.warning||'요청을 접수했습니다. 작업 상태는 자동으로 갱신됩니다.');}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="app-shell">
  <aside className="sidebar"><Link className="brand" to="/dashboard"><img className="brand-symbol brand-avatar" src={organizationAvatar} alt="" width="40" height="40"/><span>MNG Lab<small>홈페이지 관리 어드민</small></span></Link><div className="workspace-label">WORKSPACE <span>연동 테스트</span></div>
   <nav aria-label="주 메뉴">{[['/dashboard','대시보드'],['/requests','요청 관리'],['/history','홈페이지 버전'],['/settings','설정']].map(([path,label])=><button key={path} className={`nav-item ${location.pathname===path||location.pathname.startsWith(path+'/')?'active':''}`} onClick={()=>navigate(path)}>{label}</button>)}</nav>
   <div className="sidebar-bottom"><div className="help-card"><strong>운영 홈페이지와 분리돼요</strong><p>테스트 환경에서 수정 요청과 이전 버전으로 되돌리기를 확인하세요.</p></div><div className="profile"><div><strong>{user.role==='owner'?'최고 관리자':user.role==='admin'?'관리자':'편집자'}</strong><small>{user.email}</small></div></div></div>
  </aside>
  <div className="main-wrap"><header className="topbar"><span>{pageTitle}</span><div className="connected-top-actions"><span className="demo-pill">GitHub 연동 테스트</span><form method="post" action="/auth/logout"><button className="text-button" type="submit">로그아웃</button></form></div></header>
   <main className="connected-main"><div className="connected-heading"><div><h1>{pageTitle}</h1><p>{isDashboard?'확인할 작업과 최근 요청을 한눈에 살펴보세요.':isHistory?'현재 홈페이지를 확인하고, 필요한 이전 버전을 찾아보세요.':isSettings?'구성원과 서비스 연결을 관리하세요.':isNew?'바꾸고 싶은 내용을 알려 주세요.':detailId?'요청의 진행 상황을 확인하고 필요한 작업을 처리하세요.':'검토·재실행이 필요한 요청을 확인하고 처리하세요.'}</p></div>{!isNew&&!isHistory&&<button className="primary" onClick={()=>navigate('/requests/new')}>새 수정 요청</button>}</div>
    <div className="inline-note">테스트 환경입니다. main 및 운영 홈페이지에는 반영되지 않습니다.</div>
    {error&&!isHistory&&<p role="alert" className="error-note">{error} <button className="text-button" onClick={refresh}>다시 불러오기</button></p>}{notice&&<p role="status">{notice}</p>}
    {isDashboard?<>
     <section className="stats" aria-label="작업 요약">{[['확인할 변경',counts.review||0,'변경 내용을 검토하고 반영하세요.','review'],['진행 중',counts.working||0,'요청한 작업이 진행되고 있어요.','working'],['확인이 필요한 실패',counts.failed||0,'실행 결과를 확인하고 다시 시도하세요.','failed']].map(([label,count,text,state])=><button className="stat-card" key={state} onClick={()=>navigate(`/requests?status=${state}`)}><span>{label}</span><div>{!current?'—':count}<small>건</small></div><p>{text}</p></button>)}</section>
     <section className="panel connected-panel"><h2>지금 확인할 작업</h2>{!current&&!error?<LoadingIndicator label="확인할 작업 불러오는 중"/>:attention.length?<RequestRows requests={attention}/>:<p className="connected-empty">확인을 기다리는 작업이 없습니다.</p>}</section>
     <section className="panel connected-panel"><div className="connected-heading"><h2>최근 작업</h2><Link className="text-button" to="/requests">요청 관리로 이동 →</Link></div>{!current&&!error?<LoadingIndicator label="최근 작업 불러오는 중"/>:recent.length?<RequestRows requests={recent}/>:<p className="connected-empty">첫 수정 요청을 작성해 보세요.</p>}</section>
    </>:isHistory?<History user={user} refresh={refresh}/>:isSettings?<Settings user={user} requests={requests} refresh={refresh} pagination={current?.pagination} connectionRequired={current?.connectionRequired} onPageChange={changeRecovery} loading={loading||!current}/>:isNew?<form className="panel connected-panel connected-form" onSubmit={submit}>
     <label>어느 페이지인가요?<select value={page} onChange={e=>setPage(e.target.value)}>{pages.map(p=><option key={p}>{p}</option>)}</select></label><label>요청 제목<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>어떻게 바꾸면 될까요?<textarea required rows={7} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="어느 부분을 어떤 내용으로 바꿀지 적어 주세요."/></label><p>내용은 공개 GitHub 이슈에 등록됩니다. 비밀번호·토큰·개인정보는 입력하지 마세요.</p><div className="connected-heading"><button type="button" className="secondary" onClick={()=>navigate('/requests')}>취소</button><button className="primary" disabled={busy}>{busy?'접수 중…':'수정 요청 보내기'}</button></div>
    </form>:selected?<RequestDetail key={selected.id} request={selected} user={user} refresh={refresh} listSearch={location.search}/>:detailId?<section className="panel connected-panel"><>{loading?<LoadingIndicator label="요청 불러오는 중"/>:<h2>{error?'요청을 불러오지 못했어요':'요청을 찾을 수 없어요'}</h2>}</><Link to={`/requests${location.search}`}>요청 목록으로 돌아가기</Link></section>:<section className="panel connected-panel">
     <div className="connected-heading"><h2>{tab==='active'?'처리할 요청':'지난 요청'}</h2><RefreshButton key={path} onRefresh={refresh}/></div>
     <div className="request-tabs" role="group" aria-label="요청 구분">{[['active','처리 중'],['past','지난 요청']].map(([value,label])=><button key={value} type="button" aria-pressed={tab===value} onClick={()=>switchTab(value)}>{label} {current?.scopeCounts&&<span>{current.scopeCounts[value]}</span>}</button>)}</div>
     <p className="request-tab-description">{tab==='active'?'자동 수정 중이거나 검토·재실행이 필요한 요청입니다.':'반영을 마쳤거나 종료한 요청입니다. 반영된 홈페이지는 버전 화면에서 확인할 수 있습니다.'}</p>
     <div className="request-tools"><label>요청 검색<input type="search" value={draftQuery} maxLength={200} onChange={e=>setDraftQuery(e.target.value)} placeholder="제목, 내용, 요청 번호, 버전 번호"/></label><label>상태<select aria-label="상태" value={filter} onChange={e=>changeList({status:e.target.value,q:draftQuery,page:1})}><option value="all">전체</option>{tabStatuses.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label></div>
     <div aria-busy={loading||(!current&&!error)}>{!current?(error?<p>목록을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.</p>:<LoadingIndicator label="요청 목록 불러오는 중"/>):requests.length?<RequestRows requests={requests} search={location.search} manage/>:<p className="connected-empty">{query||filter!=='all'?'조건에 맞는 요청이 없습니다.':tab==='active'?'지금 처리할 요청이 없습니다. 완료된 작업은 지난 요청에서 확인하세요.':'아직 지난 요청이 없습니다.'}</p>}</div>
     <Pagination value={current?.pagination} loading={loading} onChange={value=>changeList({page:value})}/>
    </section>}
   </main></div>
 </div>;
}
