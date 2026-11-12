import React from 'react';
import {Link} from 'react-router-dom';

export default function RequestFailureNote({failure}){
 return <aside className="request-failure-note" aria-labelledby="request-failure-title">
  <div className="request-failure-heading"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v1"/></svg><h3 id="request-failure-title">{failure.title}</h3></div>
  <p>{failure.description}</p>
  {failure.unchanged&&<p className="request-failure-preserved">이 요청으로 홈페이지가 변경되지는 않았습니다.</p>}
  <div className="request-failure-next"><strong>이렇게 진행해 주세요</strong><p>{failure.next}</p>{failure.unchanged&&<Link className="secondary" to="/requests/new">새 수정 요청 작성</Link>}</div>
  {failure.unchanged&&<small>같은 요청을 다시 실행해도 해결되지 않아 재실행할 수 없습니다.</small>}
 </aside>;
}
