import React from 'react';
import {date} from './api.js';

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

export default function AuditLog({records=[]}) {
 return <section className="panel connected-panel" aria-labelledby="audit-heading">
  <h2 id="audit-heading">관리 기록</h2>
  {records.length?<ul className="audit-list">{records.map((record,index)=>{
   const action=Object.hasOwn(actions,record.action)?actions[record.action]:unknownAction;
   const timestamp=record.created_at+'Z';
   return <li key={index}>
    <div className="audit-entry-heading"><strong>{action.title}</strong><time dateTime={timestamp}>{date(timestamp)}</time></div>
    {action.description&&<p className="audit-description">{action.description}</p>}
    <dl className="audit-people">
     {action.targetLabel&&record.target&&<div><dt>{action.targetLabel}</dt><dd>{record.target}</dd></div>}
     <div><dt>{action.actorLabel||'처리한 사람'}</dt><dd>{record.actor}</dd></div>
    </dl>
   </li>;
  })}</ul>:<p>아직 관리 기록이 없습니다.</p>}
 </section>;
}
