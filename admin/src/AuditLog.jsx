import React,{useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {api,date} from './api.js';
import Pagination from './Pagination.jsx';
import LoadingIndicator from './LoadingIndicator.jsx';

const actions={
 'codex.device_connected':{title:'Codex 연결 완료',description:'홈페이지 수정에 사용할 Codex 로그인 정보를 저장했습니다.'},
 'codex.updated':{title:'Codex 로그인 정보 변경',description:'홈페이지 수정에 사용할 Codex 로그인 정보를 새로 등록했습니다.'},
 // Older records do not distinguish permission changes from access changes.
 'member.update':{title:'구성원 설정 변경',targetLabel:'대상 계정'},
 'ownership.offer':{title:'최고 관리자 변경 요청',targetLabel:'요청받은 사람'},
 'ownership.accept':{title:'최고 관리자 변경 완료',targetLabel:'이전 최고 관리자',actorLabel:'새 최고 관리자'},
 'ownership.cancel':{title:'최고 관리자 변경 요청 취소'}
};
const unknownAction={title:'관리 작업 기록',description:'이 기록의 자세한 내용을 표시할 수 없습니다.'};

export default function AuditLog({refreshKey}) {
 const location=useLocation(),navigate=useNavigate(),latestLocation=useRef(location);
 latestLocation.current=location;
 const page=new URLSearchParams(location.search).get('audit_page')||'1';
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 function changePage(value,{replace=false}={}) {
  const current=latestLocation.current,params=new URLSearchParams(current.search);
  if(value===1)params.delete('audit_page');else params.set('audit_page',String(value));
  navigate({pathname:current.pathname,search:params.toString(),hash:current.hash},{replace});
 }
 useEffect(()=>{
  let cancelled=false;setLoading(true);setError('');
  api(`/api/settings/audit?page=${encodeURIComponent(page)}`).then(value=>{
   if(cancelled)return;
   setData(value);
   if(String(value.pagination.page)!==page)changePage(value.pagination.page,{replace:true});
  }).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
  return()=>{cancelled=true;};
 },[page,refreshKey,retry]);
 const records=data?.records||[];
 return <section className="panel connected-panel settings-panel" aria-labelledby="audit-heading">
  <header className="settings-intro"><h2 id="audit-heading">관리 기록</h2><p>구성원, 권한, Codex 연결을 변경한 기록입니다.</p></header>
  <div className="settings-block settings-audit">{loading?<LoadingIndicator label="관리 기록 불러오는 중"/>:error?<div className="settings-feedback is-error" role="alert"><p>{error}</p><div className="action-row"><button type="button" className="text-button" onClick={()=>setRetry(value=>value+1)}>관리 기록 다시 불러오기</button></div></div>:records.length?<ul className="audit-list">{records.map(record=>{
   const action=Object.hasOwn(actions,record.action)?actions[record.action]:unknownAction;
   const timestamp=record.created_at+'Z';
   return <li key={record.id}>
    <div className="audit-entry-heading"><strong>{action.title}</strong><time dateTime={timestamp}>{date(timestamp)}</time></div>
    {action.description&&<p className="audit-description">{action.description}</p>}
    <dl className="audit-people">
     {action.targetLabel&&record.target&&<div><dt>{action.targetLabel}</dt><dd>{record.target}</dd></div>}
     <div><dt>{action.actorLabel||'처리한 사람'}</dt><dd>{record.actor}</dd></div>
    </dl>
   </li>;
  })}</ul>:<p className="settings-empty">아직 관리 기록이 없습니다.</p>}
   {!error&&data?.pagination?.pages>1&&<Pagination value={data.pagination} onChange={changePage} loading={loading} label="관리 기록 페이지"/>}
  </div>
 </section>;
}
