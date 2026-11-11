import React,{useEffect,useRef,useState} from 'react';
import CodexConnection from './CodexConnection.jsx';
import AuditLog from './AuditLog.jsx';
import LoadingIndicator from './LoadingIndicator.jsx';
import RefreshButton from './RefreshButton.jsx';
import ActionButton from './ActionButton.jsx';
import useReadResource from './useReadResource.js';
import {api,date} from './api.js';
function RoleBadge({role}) {
 const value=['owner','admin','editor'].includes(role)?role:'editor';
 return <span className={`role-badge role-badge-${value}`}>{{owner:'최고 관리자',admin:'관리자',editor:'편집자'}[value]}</span>;
}
function ActionFeedback({scope,confirmation,feedback,busy,onConfirm,onCancel}) {
 const dialog=useRef(null),change=confirmation?.scope===scope?confirmation:null,result=feedback?.scope===scope?feedback:null;
 useEffect(()=>{if(change){dialog.current?.focus({preventScroll:true});dialog.current?.scrollIntoView({block:'nearest',behavior:'smooth'});}},[change]);
 return <>
  {change&&<div ref={dialog} tabIndex={-1} className="settings-confirmation" role="dialog" aria-modal="false" aria-labelledby={`confirm-${scope}`}><h4 id={`confirm-${scope}`}>{change.title}</h4><p>{change.text}</p><div className="settings-form-actions"><ActionButton busy={busy} onClick={()=>onConfirm(change)}>{change.confirmLabel||'확인하고 저장'}</ActionButton><button className="secondary" disabled={busy} onClick={onCancel}>취소</button></div></div>}
  {result&&<p role={result.error?'alert':'status'} className={`settings-feedback ${result.error?'is-error':'is-success'}`}>{result.message}</p>}
 </>;
}
export default function Settings({user,requests,refresh,pagination,connectionRequired,onPageChange,loading}) {
 const [feedback,setFeedback]=useState(null),[busy,setBusy]=useState(false),[email,setEmail]=useState(''),[role,setRole]=useState('editor'),[target,setTarget]=useState(''),[confirmation,setConfirmation]=useState(null);
 const memberForm=useRef(null),memberEmail=useRef(null);
 const settings=useReadResource('/api/settings'),data=settings.data,error=settings.error;
 const load=()=>settings.refresh({force:true});
 function prepare(change){setFeedback(null);setConfirmation(change);}
 async function action(change){setBusy(true);setFeedback(null);try{const result=await api(change.path,change.body);setFeedback({scope:change.scope,message:change.success});setConfirmation(null);if(result.reload){window.location.reload();return;}await load();}catch(e){setFeedback({scope:change.scope,error:true,message:e.message});}finally{setBusy(false);}}
 const response=scope=><ActionFeedback scope={scope} confirmation={confirmation} feedback={feedback} busy={busy} onConfirm={action} onCancel={()=>{setConfirmation(null);setFeedback(null);}}/>;
 function editMember(member){setEmail(member.email);setRole(member.role);setConfirmation(null);setFeedback(null);memberForm.current?.scrollIntoView({block:'center',behavior:'smooth'});memberEmail.current?.focus({preventScroll:true});}
 function clearMember(){setEmail('');setRole('editor');setConfirmation(null);setFeedback(null);}
 const candidates=data?.members?.filter(m=>m.email!==user.email&&m.active&&m.joined)||[];
 const selectedMember=data?.members?.find(m=>m.email===email.trim().toLowerCase());
 return <>
 <section className="panel connected-panel settings-panel account-panel" aria-labelledby="account-heading">
  <header className="settings-intro"><h2 id="account-heading">로그인 정보</h2></header>
  <dl className="account-identity"><div className="account-email"><dt>Google 계정</dt><dd>{user.email}</dd></div><div className="account-role"><dt>내 권한</dt><dd><RoleBadge role={user.role}/></dd></div></dl>
 </section>
 {error&&<div role="alert" className="settings-feedback is-error">{error} <RefreshButton disabled={busy} onRefresh={settings.refresh} label="설정 다시 불러오기" description="구성원과 권한 정보"/></div>}
 {data?.transfer?.to_email===user.email&&<section className="panel connected-panel settings-panel" aria-labelledby="incoming-heading">
  <header className="settings-intro"><h2 id="incoming-heading">최고 관리자 변경 요청</h2><p>최고 관리자 역할을 넘겨받을지 확인해 주세요.</p></header>
  <div className="settings-guide"><dl className="settings-facts"><div><dt>요청한 사람</dt><dd>{data.transfer.from_email}</dd></div><div><dt>수락 기한</dt><dd>{date(data.transfer.expires_at)}까지</dd></div></dl><p className="settings-help-note">수락하면 구성원 권한과 Codex 연결을 관리할 수 있습니다. 기존 최고 관리자는 관리자로 변경됩니다. GitHub·Cloudflare·Google 관리 권한은 별도로 넘겨받아야 합니다.</p></div>
  <div className="settings-workspace"><h3>역할 수락하기</h3><div className="settings-form-actions"><button className="primary" disabled={busy} onClick={()=>prepare({scope:'incoming',title:'최고 관리자 역할을 수락할까요?',text:'기존 최고 관리자는 관리자로 변경됩니다. 외부 서비스 계정 소유권은 별도로 인수인계해야 합니다.',confirmLabel:'확인하고 수락',path:'/api/settings/transfer/accept',body:{},success:'최고 관리자 역할을 수락했습니다.'})}>최고 관리자 역할 수락</button></div>{response('incoming')}</div>
 </section>}
 {user.role==='owner'&&<>
 <CodexConnection requests={requests} refresh={refresh} onConnected={load} pagination={pagination} connectionRequired={connectionRequired} onPageChange={onPageChange} loading={loading}/>
 <section className="panel connected-panel settings-panel" id="members-panel" aria-labelledby="members-heading">
  <header className="settings-intro"><h2 id="members-heading">구성원 관리</h2><p>이 어드민에 로그인할 사람과 권한을 관리합니다.</p></header>
  <section className="settings-guide" aria-labelledby="roles-heading"><h3 id="roles-heading">권한 안내</h3><dl className="settings-role-guide"><div><dt><RoleBadge role="editor"/></dt><dd>홈페이지 수정 요청을 작성합니다.</dd></div><div><dt><RoleBadge role="admin"/></dt><dd>수정 요청을 작성하고, 수정·되돌리기를 승인합니다.</dd></div><div><dt><RoleBadge role="owner"/></dt><dd>관리자 기능에 더해 구성원 권한과 Codex 연결을 관리합니다.</dd></div></dl><p className="settings-help-note"><strong>새 구성원을 등록할 때</strong>테스트 기간에는 Google 로그인 허용 목록에도 계정을 추가해야 합니다. 등록 후 개발 담당자에게 요청해 주세요.</p></section>
  <section className="settings-block" aria-labelledby="member-list-heading"><h3 id="member-list-heading">등록된 구성원</h3>{!data?<LoadingIndicator label="구성원 불러오는 중"/>:<ul className="member-list">{data.members?.map(m=><li key={m.email}><div><strong>{m.email}</strong><div className="member-meta"><RoleBadge role={m.role}/><small className={!m.active?'member-inactive':''}>{!m.active?'접근 중지':m.joined?'로그인 완료':'첫 로그인 대기'}</small></div></div>{m.role!=='owner'&&<div className="settings-form-actions member-actions"><button className="secondary" disabled={busy} onClick={()=>editMember(m)}>권한 수정</button><button className="text-button" disabled={busy} onClick={()=>prepare({scope:'member-list',title:m.active?'접근을 중지할까요?':'접근을 다시 허용할까요?',text:m.email,confirmLabel:m.active?'접근 중지':'접근 허용',path:'/api/settings/members',body:{email:m.email,role:m.role,active:!m.active},success:m.active?'접근을 중지했습니다.':'접근을 다시 허용했습니다.'})}>{m.active?'접근 중지':'다시 허용'}</button></div>}</li>)}</ul>}{response('member-list')}</section>
  <section ref={memberForm} className="settings-workspace" aria-labelledby="member-form-heading"><div className="settings-block-heading"><h3 id="member-form-heading">구성원 추가·수정</h3><p>Google 계정과 권한을 입력해 주세요. 등록된 계정은 새 권한으로 저장됩니다.</p></div>
   <form className="connected-form" onSubmit={e=>{e.preventDefault();prepare({scope:'member-form',title:'구성원 권한을 저장할까요?',text:`${email} · ${role==='admin'?'관리자':'편집자'} · 로그인 허용`,path:'/api/settings/members',body:{email,role,active:true},success:'구성원 정보를 저장했습니다.'});}}><div className="settings-form-fields"><label>Google 계정<input ref={memberEmail} type="email" required disabled={busy} value={email} placeholder="name@gmail.com" onChange={e=>setEmail(e.target.value)}/></label><label>권한<select aria-label="권한" disabled={busy} value={role} onChange={e=>setRole(e.target.value)}><option value="editor">편집자</option><option value="admin">관리자</option></select></label></div>{selectedMember&&!selectedMember.active&&<p className="settings-help-note">이 계정은 현재 접근이 중지되어 있습니다. 저장하면 접근이 다시 허용됩니다.</p>}<div className="settings-form-actions"><button className="primary" disabled={busy||!data}>구성원 저장</button>{email&&<button type="button" className="text-button" disabled={busy} onClick={clearMember}>입력 지우기</button>}</div></form>{response('member-form')}
  </section>
 </section>
 <section className="panel connected-panel settings-panel" aria-labelledby="transfer-heading">
  <header className="settings-intro"><h2 id="transfer-heading">최고 관리자 변경</h2><p>구성원 권한과 Codex 연결을 관리할 담당자를 바꿉니다.</p></header>
  <section className="settings-guide" aria-labelledby="transfer-guide-heading"><h3 id="transfer-guide-heading">담당자 변경 순서</h3><ol className="settings-steps" role="list">
   <li><span className="settings-step-number" aria-hidden="true">1</span><div><strong>후임자 준비</strong><small>구성원으로 등록하고 한 번 로그인하도록 안내하세요.</small></div></li>
   <li><span className="settings-step-number" aria-hidden="true">2</span><div><strong>변경 요청</strong><small>아래에서 후임자를 선택해 요청을 보내세요.</small></div></li>
   <li><span className="settings-step-number" aria-hidden="true">3</span><div><strong>후임자가 수락</strong><small>후임자가 24시간 안에 본인의 설정 화면에서 수락하면 완료됩니다.</small></div></li>
  </ol><p className="settings-help-note">수락 전까지 내 권한은 유지됩니다. 수락 후에는 후임자가 최고 관리자, 나는 관리자가 됩니다. 별도 이메일은 발송하지 않으니 후임자에게 직접 알려 주세요.</p><details className="settings-help"><summary>외부 서비스 인수인계 체크리스트</summary><p>이 어드민의 역할을 바꿔도 외부 서비스 권한은 자동으로 넘어가지 않습니다.</p><ul><li>Cloudflare 계정 및 Worker/D1 관리 권한</li><li>Google OAuth 프로젝트 관리 권한</li><li>GitHub 조직·저장소 및 GitHub App 관리 권한</li><li>후임자 인증으로 테스트 요청·승인 확인 후 기존 접근 회수</li></ul></details></section>
  <section className="settings-workspace" aria-labelledby="transfer-action-heading">{data?.transfer?<>
   <div className="settings-block-heading settings-heading-row"><h3 id="transfer-action-heading">후임자의 수락을 기다리고 있습니다</h3><span className="state-pill review">수락 대기</span></div><dl className="settings-facts"><div><dt>후임 담당자</dt><dd>{data.transfer.to_email}</dd></div><div><dt>수락 기한</dt><dd>{date(data.transfer.expires_at)}까지</dd></div></dl><div className="settings-form-actions"><button className="secondary" disabled={busy} onClick={()=>action({scope:'transfer',path:'/api/settings/transfer/cancel',body:{},success:'최고 관리자 변경 요청을 취소했습니다.'})}>변경 요청 취소</button></div>
  </>:<><div className="settings-block-heading"><h3 id="transfer-action-heading">변경 요청 보내기</h3><p>로그인을 마친 구성원에게 최고 관리자 역할을 요청합니다.</p></div>{data&&!candidates.length&&<div className="settings-empty"><p>선택할 수 있는 구성원이 없습니다. 구성원을 등록하고 한 번 로그인하도록 안내해 주세요.</p><a className="text-button" href="#members-panel">구성원 관리로 이동 ↑</a></div>}<form className="connected-form" onSubmit={e=>{e.preventDefault();prepare({scope:'transfer',title:'최고 관리자 변경을 요청할까요?',text:`${target}님에게 수락 요청을 만듭니다.`,confirmLabel:'확인하고 요청',path:'/api/settings/transfer',body:{email:target},success:'변경 요청을 보냈습니다. 후임자가 설정 화면에서 수락하면 완료됩니다.'});}}><label>후임 담당자<select aria-label="후임 담당자" required disabled={busy||!data||!candidates.length} value={target} onChange={e=>setTarget(e.target.value)}><option value="">로그인을 완료한 구성원 선택</option>{candidates.map(m=><option key={m.email}>{m.email}</option>)}</select></label><div className="settings-form-actions"><button className="primary" disabled={busy||!target||!candidates.some(m=>m.email===target)}>최고 관리자 변경 요청</button></div></form></>}{response('transfer')}</section>
 </section>
 <AuditLog refreshKey={data}/>
 </>}
 </>;
}
