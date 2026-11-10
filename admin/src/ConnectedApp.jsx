import React,{useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
const pages=['Home','Research','Professor','Members','Publications','Gallery','Contact'];
async function api(path,body) {
 const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'});
 if(response.status===401) {window.location.assign('/login');throw Error('로그인이 만료됐습니다.');}
 const data=await response.json();if(!response.ok)throw Error(data.error||'처리하지 못했습니다.');return data;
}
function status(request) {return request.pull?.merged?'테스트 반영 완료':request.pull?.state==='closed'?'PR 닫힘':request.pull?'변경 확인 필요':request.state==='closed'?'요청 종료':'작업 접수됨';}
export default function ConnectedApp({user}) {
 const location=useLocation(),navigate=useNavigate();
 const [requests,setRequests]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [title,setTitle]=useState(''),[page,setPage]=useState('Members'),[description,setDescription]=useState('');
 const [requestId,setRequestId]=useState(()=>sessionStorage.getItem('mng-request-id')||crypto.randomUUID());
 const selected=requests.find(r=>String(r.id)===location.pathname.match(/^\/requests\/(\d+)$/)?.[1]);
 const isDashboard=location.pathname==='/dashboard' || location.pathname==='/';
 const detailId=location.pathname.match(/^\/requests\/(\d+)$/)?.[1];
 const isSettings=location.pathname==='/settings';
 const isNew=location.pathname==='/requests/new';
 const isHistory=location.pathname==='/history';
 async function refresh() {try{const data=await api('/api/requests');setRequests(data.requests);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{refresh();const id=setInterval(()=>{if(document.visibilityState==='visible')refresh();},15000);return()=>clearInterval(id);},[]);
 const pageTitle=isDashboard?'대시보드':isNew?'새 수정 요청':isHistory?'변경 이력':isSettings?'설정':detailId?'요청 상세':'수정 요청';
 const needsReview=requests.filter(r=>r.pull?.state==='open'&&!r.pull.draft);
 const inProgress=requests.filter(r=>r.state==='open'&&!r.pull);
 const completed=requests.filter(r=>r.pull?.merged);
 const visibleRequests=isHistory?completed:requests;
 useEffect(()=>{document.title=`${pageTitle} · MNG 홈페이지 관리`;},[pageTitle]);
 async function submit(event) {
  event.preventDefault();if(busy)return;setBusy(true);setError('');sessionStorage.setItem('mng-request-id',requestId);
  try{const data=await api('/api/requests',{requestId,title,page,description});sessionStorage.removeItem('mng-request-id');setRequestId(crypto.randomUUID());setTitle('');setDescription('');await refresh();navigate(`/requests/${data.issue}`);setNotice(data.warning||'GitHub 테스트 요청이 접수됐습니다.');}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function approve(request) {
  if(busy)return;setBusy(true);setError('');
  try{await api(`/api/pulls/${request.pull.number}/approve`,{head:request.pull.head.sha});setNotice('테스트 브랜치에 반영했습니다. 운영 홈페이지는 변경되지 않습니다.');await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <div className="app-shell"><aside className="sidebar"><a className="brand" href="/dashboard"><span className="brand-symbol">m<span>·</span></span><span>MNG Lab<small>홈페이지 관리</small></span></a><div className="workspace-label">WORKSPACE <span>연동 테스트</span></div><nav aria-label="주 메뉴">{[['/dashboard','대시보드'],['/requests','수정 요청'],['/history','변경 이력'],['/settings','설정']].map(([path,label])=><button key={path} className={`nav-item ${(location.pathname===path || (path==='/requests' && location.pathname.startsWith('/requests/')))?'active':''}`} onClick={()=>navigate(path)}>{label}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><strong>운영 홈페이지와 분리돼요</strong><p>실제 이슈와 PR이 생성되지만 테스트 브랜치에만 반영됩니다.</p></div><div className="profile"><div><strong>{user.role==='owner'?'최고 관리자':user.role==='admin'?'관리자':'편집자'}</strong><small>{user.email}</small></div></div></div></aside><div className="main-wrap"><header className="topbar"><span>{pageTitle}</span><div className="connected-top-actions"><span className="demo-pill">GitHub 연동 테스트</span><form method="post" action="/auth/logout"><button className="text-button" type="submit">로그아웃</button></form></div></header><main className="connected-main"><div className="connected-heading"><div><h1>{pageTitle}</h1><p>{isDashboard?"확인할 작업과 최근 변경을 한눈에 살펴보세요.":isHistory?"테스트 환경에 반영된 변경 기록입니다.":isSettings?"로그인 계정과 서비스 연결 상태를 확인하세요.":"수정 요청과 진행 상황을 확인하세요."}</p></div><button className="primary" onClick={()=>navigate('/requests/new')}>새 수정 요청</button></div><div className="inline-note">테스트 대상: codex/admin-sandbox · main 및 운영 배포에는 반영되지 않습니다.</div>{error&&<p role="alert" className="error-note">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {isDashboard?<>
 <section className="stats" aria-label="작업 요약">
  {[["확인할 변경",needsReview.length,"준비된 변경 내용을 검토하세요."],["진행 중",inProgress.length,"접수된 작업의 결과를 기다리고 있어요."],["반영 완료",completed.length,"테스트 환경의 반영 기록이에요."]].map(([label,count,description],index)=><button className="stat-card" key={label} onClick={()=>navigate(index===2?'/history':'/requests')}><span>{label}</span><div>{loading?'—':count}<small>건</small></div><p>{description}</p></button>)}
 </section>
 <section className="panel connected-panel"><h2>지금 확인할 작업</h2>{loading?<p>작업을 확인하고 있어요…</p>:needsReview.length?<ul className="connected-list">{needsReview.map(r=><li key={r.id}><button onClick={()=>navigate(`/requests/${r.id}`)}><strong>{r.title}</strong><span>변경 확인하기 →</span></button></li>)}</ul>:<p className="connected-empty">확인을 기다리는 변경이 없습니다.</p>}</section>
 <section className="panel connected-panel"><div className="connected-heading"><h2>최근 수정 요청</h2><button className="text-button" onClick={()=>navigate('/requests')}>전체 요청 보기 →</button></div>{!loading&&!requests.length?<p className="connected-empty">첫 수정 요청을 작성해 보세요.</p>:<ul className="connected-list">{requests.slice(0,5).map(r=><li key={r.id}><button onClick={()=>navigate(`/requests/${r.id}`)}><strong>#{r.id} {r.title}</strong><span>{status(r)}</span></button></li>)}</ul>}</section>
 </>:isSettings?<section className="panel connected-panel"><h2>연결 상태</h2><p>Google 로그인 · GitHub App 연결</p><p>최고 관리자 이전과 인증 갱신 UI는 준비 중입니다.</p></section>:isNew?<form className="panel connected-panel connected-form" onSubmit={submit}><label>어느 페이지인가요?<select value={page} onChange={e=>setPage(e.target.value)}>{pages.map(p=><option key={p}>{p}</option>)}</select></label><label>요청 제목<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>어떻게 바꾸면 될까요?<textarea required rows={7} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)}/></label><p>내용은 공개 GitHub 이슈에 등록됩니다. 비밀번호·토큰·개인정보는 입력하지 마세요.</p><div className="connected-heading"><button type="button" className="secondary" onClick={()=>navigate('/requests')}>취소</button><button className="primary" disabled={busy}>{busy?'접수 중…':'수정 요청 보내기'}</button></div></form>:selected?<section className="panel connected-panel"><span className="page-tag">#{selected.id} · {status(selected)}</span><h2>{selected.title}</h2><pre className="connected-description">{selected.description.replace(/<!--[\s\S]*?-->\s*/g,'')}</pre><div className="connected-heading"><a className="secondary" href={selected.url} target="_blank" rel="noreferrer">GitHub 이슈 보기</a>{selected.pull&&<a className="secondary" href={selected.pull.url} target="_blank" rel="noreferrer">변경 내용(PR) 확인</a>}</div>{selected.pull?.state==='open'&&user.role!=='editor'&&<div className="inline-note"><p>PR의 변경 내용을 확인한 뒤 승인하세요. 해당 커밋의 CI가 통과해야 하며, 테스트 브랜치에만 반영됩니다.</p><button className="primary" disabled={busy} onClick={()=>approve(selected)}>이 변경을 테스트 브랜치에 반영</button></div>}<button className="text-button" onClick={()=>navigate('/requests')}>목록으로 돌아가기</button></section>:detailId?<section className="panel connected-panel"><h2>{loading?'요청을 불러오는 중…':'요청을 찾을 수 없어요'}</h2><p>{loading?'잠시 기다려 주세요.':'요청 번호를 확인하거나 목록에서 다시 선택해 주세요.'}</p><button className="secondary" onClick={()=>navigate('/requests')}>요청 목록으로 돌아가기</button></section>:<section className="panel connected-panel"><div className="connected-heading"><h2>{isHistory?'테스트 반영 기록':'요청 목록'}</h2><button className="secondary" onClick={refresh}>새로고침</button></div>{loading?<p>불러오는 중…</p>:<ul className="connected-list">{visibleRequests.map(r=><li key={r.id}><button onClick={()=>navigate(`/requests/${r.id}`)}><strong>#{r.id} {r.title}</strong><span>{status(r)}</span></button></li>)}</ul>}{!loading&&!visibleRequests.length&&<p className="connected-empty">{isHistory?'아직 반영된 변경이 없습니다.':'아직 수정 요청이 없습니다.'}</p>}</section>}
 </main></div></div>;
}
