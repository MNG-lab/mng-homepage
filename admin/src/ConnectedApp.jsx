import React,{useEffect,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {api,requestState,labels,date,description as cleanDescription} from './api.js';
import History from './History.jsx';
import Settings from './Settings.jsx';
import RequestDetail from './RequestDetail.jsx';
const pages=['Home','Research','Professor','Members','Publications','Gallery','Contact'];
function RequestRows({requests}) {return <ul className="connected-list">{requests.map(r=><li key={r.id}><Link to={`/requests/${r.id}`}><div><strong>{r.title}</strong><small>#{r.id} · {date(r.createdAt)}</small></div><span className={`state-pill ${requestState(r)}`}>{labels[requestState(r)]}</span></Link></li>)}</ul>;}
export default function ConnectedApp({user}) {
 const location=useLocation(),navigate=useNavigate();
 const [requests,setRequests]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [title,setTitle]=useState(''),[page,setPage]=useState('Members'),[description,setDescription]=useState('');
 const [requestId,setRequestId]=useState(()=>sessionStorage.getItem('mng-request-id')||crypto.randomUUID());
 const [query,setQuery]=useState('');
 const detailId=location.pathname.match(/^\/requests\/(\d+)$/)?.[1];
 const selected=requests.find(r=>String(r.id)===detailId);
 const isDashboard=location.pathname==='/dashboard'||location.pathname==='/';
 const isSettings=location.pathname==='/settings',isNew=location.pathname==='/requests/new',isHistory=location.pathname.startsWith('/history');
 const filter=new URLSearchParams(location.search).get('status')||'all';
 const pageTitle=isDashboard?'대시보드':isNew?'새 수정 요청':isHistory?'변경 이력':isSettings?'설정':detailId?'요청 상세':'수정 요청';
 const needsReview=requests.filter(r=>requestState(r)==='review');
 const working=requests.filter(r=>requestState(r)==='working');
 const failed=requests.filter(r=>requestState(r)==='failed');
 const visible=requests.filter(r=>(filter==='all'||requestState(r)===filter)&&`${r.id} ${r.title} ${cleanDescription(r.description)}`.toLowerCase().includes(query.toLowerCase()));
 async function refresh(){try{const data=await api('/api/requests');setRequests(data.requests);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{refresh();const id=setInterval(()=>{if(document.visibilityState==='visible')refresh();},30000);return()=>clearInterval(id);},[]);
 useEffect(()=>{document.title=`${pageTitle} · MNG 홈페이지 관리`;setNotice('');},[location.pathname,pageTitle]);
 async function submit(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');sessionStorage.setItem('mng-request-id',requestId);
  try{const data=await api('/api/requests',{requestId,title,page,description});sessionStorage.removeItem('mng-request-id');setRequestId(crypto.randomUUID());setTitle('');setDescription('');await refresh();navigate(`/requests/${data.issue}`);setNotice(data.warning||'요청을 접수했습니다. 작업 상태는 자동으로 갱신됩니다.');}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="app-shell">
  <aside className="sidebar"><Link className="brand" to="/dashboard"><span className="brand-symbol">m<span>·</span></span><span>MNG Lab<small>홈페이지 관리</small></span></Link><div className="workspace-label">WORKSPACE <span>연동 테스트</span></div>
   <nav aria-label="주 메뉴">{[['/dashboard','대시보드'],['/requests','수정 요청'],['/history','변경 이력'],['/settings','설정']].map(([path,label])=><button key={path} className={`nav-item ${location.pathname===path||location.pathname.startsWith(path+'/')?'active':''}`} onClick={()=>navigate(path)}>{label}</button>)}</nav>
   <div className="sidebar-bottom"><div className="help-card"><strong>운영 홈페이지와 분리돼요</strong><p>테스트 환경에서 작성·검토·복원을 체험하세요.</p></div><div className="profile"><div><strong>{user.role==='owner'?'최고 관리자':user.role==='admin'?'관리자':'편집자'}</strong><small>{user.email}</small></div></div></div>
  </aside>
  <div className="main-wrap"><header className="topbar"><span>{pageTitle}</span><div className="connected-top-actions"><span className="demo-pill">GitHub 연동 테스트</span><form method="post" action="/auth/logout"><button className="text-button" type="submit">로그아웃</button></form></div></header>
   <main className="connected-main"><div className="connected-heading"><div><h1>{pageTitle}</h1><p>{isDashboard?'확인할 작업과 최근 요청을 한눈에 살펴보세요.':isHistory?'반영된 순서와 복원 가능한 시점을 확인하세요.':isSettings?'구성원과 서비스 연결을 관리하세요.':'수정할 내용을 요청하고 진행 상황을 확인하세요.'}</p></div>{!isNew&&<button className="primary" onClick={()=>navigate('/requests/new')}>새 수정 요청</button>}</div>
    <div className="inline-note">테스트 환경입니다. main 및 운영 홈페이지에는 반영되지 않습니다.</div>
    {error&&<p role="alert" className="error-note">{error} <button className="text-button" onClick={refresh}>다시 불러오기</button></p>}{notice&&<p role="status">{notice}</p>}
    {isDashboard?<>
     <section className="stats" aria-label="작업 요약">{[['확인할 변경',needsReview.length,'변경 내용을 검토하고 반영하세요.','review'],['진행 중',working.length,'요청한 작업이 진행되고 있어요.','working'],['확인이 필요한 실패',failed.length,'실행 결과를 확인하고 다시 시도하세요.','failed']].map(([label,count,text,state])=><button className="stat-card" key={state} onClick={()=>navigate(`/requests?status=${state}`)}><span>{label}</span><div>{loading?'—':count}<small>건</small></div><p>{text}</p></button>)}</section>
     <section className="panel connected-panel"><h2>지금 확인할 작업</h2>{loading?<p>불러오는 중…</p>:needsReview.length||failed.length?<RequestRows requests={[...needsReview,...failed]}/>:<p className="connected-empty">확인을 기다리는 작업이 없습니다.</p>}</section>
     <section className="panel connected-panel"><div className="connected-heading"><h2>최근 수정 요청</h2><Link className="text-button" to="/requests">전체 요청 보기 →</Link></div>{requests.length?<RequestRows requests={requests.slice(0,5)}/>:<p className="connected-empty">첫 수정 요청을 작성해 보세요.</p>}</section>
    </>:isHistory?<History user={user}/>:isSettings?<Settings user={user}/>:isNew?<form className="panel connected-panel connected-form" onSubmit={submit}>
     <label>어느 페이지인가요?<select value={page} onChange={e=>setPage(e.target.value)}>{pages.map(p=><option key={p}>{p}</option>)}</select></label><label>요청 제목<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>어떻게 바꾸면 될까요?<textarea required rows={7} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="어느 부분을 어떤 내용으로 바꿀지 적어 주세요."/></label><p>내용은 공개 GitHub 이슈에 등록됩니다. 비밀번호·토큰·개인정보는 입력하지 마세요.</p><div className="connected-heading"><button type="button" className="secondary" onClick={()=>navigate('/requests')}>취소</button><button className="primary" disabled={busy}>{busy?'접수 중…':'수정 요청 보내기'}</button></div>
    </form>:selected?<RequestDetail key={selected.id} request={selected} user={user} refresh={refresh}/>:detailId?<section className="panel connected-panel"><h2>{loading?'요청을 불러오는 중…':'요청을 찾을 수 없어요'}</h2><Link to="/requests">요청 목록으로 돌아가기</Link></section>:<section className="panel connected-panel">
     <div className="connected-heading"><h2>요청 목록</h2><button className="secondary" onClick={refresh}>새로고침</button></div>
     <div className="request-tools"><label>요청 검색<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="제목, 내용, 요청 번호"/></label><label>상태<select value={filter} onChange={e=>navigate(e.target.value==='all'?'/requests':`/requests?status=${e.target.value}`)}><option value="all">전체</option>{Object.entries(labels).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label></div>
     {loading?<p>불러오는 중…</p>:visible.length?<RequestRows requests={visible}/>:<p className="connected-empty">{requests.length?'조건에 맞는 요청이 없습니다.':'아직 수정 요청이 없습니다.'}</p>}
    </section>}
   </main></div>
 </div>;
}
