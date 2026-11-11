import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {api,date,requestState,requestTitle} from './api.js';
import CopyButton from './CopyButton.jsx';
const active=['queued','waiting','saving'];
const states={auth_required:'Codex를 다시 연결해 주세요',queued:'작업을 준비하고 있습니다',waiting:'로그인을 기다리고 있습니다',saving:'새 인증을 저장하고 있습니다',connected:'Codex 재연결 완료',expired:'연결 시간이 지났습니다',failed:'연결을 완료하지 못했습니다',uncertain:'처리 결과를 확인해야 합니다'};
export default function CodexConnection({requests=[],refresh=async()=>{},onConnected=()=>{}}){
 const [flow,setFlow]=useState(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[readError,setReadError]=useState(''),[pending,setPending]=useState(null),[consent,setConsent]=useState(false);
 const [retrying,setRetrying]=useState(null),[notice,setNotice]=useState(''),[submitted,setSubmitted]=useState([]);
 const retryIds=useRef(new Map()),connectedId=useRef(null);
 const stopped=requests.filter(r=>r.auth&&requestState(r)==='auth_required');
 const inflight=useRef(null),mounted=useRef(true),sequence=useRef(0),submitting=useRef(false);
 function load(force=false){
  if(submitting.current)return Promise.resolve();
  if(inflight.current&&!force)return inflight.current;
  const current=++sequence.current;
  const task=api('/api/settings/device-login').then(data=>{
   if(mounted.current&&current===sequence.current){setFlow(data.flow);setLoaded(true);setReadError('');}
  }).catch(e=>{if(mounted.current&&current===sequence.current)setReadError(e.message);}).finally(()=>{if(inflight.current===task)inflight.current=null;});
  inflight.current=task;return task;
 }
 useEffect(()=>{
  mounted.current=true;load(true);
  const update=()=>{if(document.visibilityState==='visible')load();};
  const timer=setInterval(update,5000);
  document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);window.addEventListener('online',update);
  return()=>{mounted.current=false;++sequence.current;clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);window.removeEventListener('online',update);};
 },[]);
 useEffect(()=>{
  if(flow?.state==='connected'&&connectedId.current!==flow.id){connectedId.current=flow.id;void refresh();void onConnected();}
 },[flow?.id,flow?.state]);
 useEffect(()=>{if(window.location.hash==='#codex-connection')document.getElementById('codex-connection')?.scrollIntoView();},[]);
 async function retry(r){
  const key=`${r.id}:${r.run.id}:${r.run.attempt||1}`;
  if(retrying||submitted.includes(key))return;
  if(!retryIds.current.has(key))retryIds.current.set(key,crypto.randomUUID());
  setRetrying(key);setError('');setNotice('');
  try{await api(`/api/requests/${r.id}/retry`,{requestId:retryIds.current.get(key)});setSubmitted(v=>[...v,key]);setNotice(`#${r.id} 요청을 다시 접수했습니다. 요청 상세에서 진행 상황과 만들어진 PR을 확인하세요.`);await refresh();}
  catch(e){setError(e.message);}finally{setRetrying(null);}
 }
 async function start(kind){
  if(submitting.current||active.includes(flow?.state))return;
  submitting.current=true;++sequence.current;setPending(kind);setError('');setNotice('');
  try{
   const result=await api('/api/settings/device-login/start',{kind});
   if(mounted.current){setFlow({id:result.id,kind,state:'queued',code:null});setLoaded(true);}
  }catch(e){if(mounted.current)setError(e.message);}
  finally{
   submitting.current=false;
   if(mounted.current){setPending(null);void load(true);}
  }
 }
 const busy=!!pending,running=active.includes(flow?.state);
 const needsConnection=stopped.some(r=>!r.auth.renewed);
 const view=pending?{kind:pending,state:'submitting'}:needsConnection&&(!flow||flow.state==='connected')?{kind:'login',state:'auth_required'}:flow;
 const processing=busy||['queued','saving'].includes(view?.state)||(view?.state==='waiting'&&!view.code);
 const success=view?.state==='connected',warning=['auth_required','expired','failed','uncertain'].includes(view?.state);
 function buttonContent(kind,label){
  if(kind!==view?.kind||(!busy&&!running))return label;
  const text=busy?'연결 요청 중…':view.state==='saving'?'인증 저장 중…':view.state==='waiting'&&view.code?'로그인 승인 대기':'로그인 준비 중…';
  return <>{processing&&<span className="spinner" aria-hidden="true"/>}{text}</>;
 }
 return <section className="panel connected-panel" id="codex-connection" aria-label="Codex 연결"><span className="state-pill review">테스트 환경의 실제 수정 요청에 사용</span><h2>Codex 연결</h2><p>홈페이지 자동 수정에 사용할 ChatGPT 계정으로 로그인하세요. 인증 문제로 멈춘 요청은 다시 연결한 뒤 이어서 실행할 수 있습니다.</p>
 <ol className="connection-steps"><li>브라우저에서 로그인</li><li>새 인증 저장</li><li>멈춘 요청 다시 실행</li></ol>
 <details className="device-help"><summary>처음 연결할 때 확인해 주세요</summary><ol className="guide-steps"><li>ChatGPT의 <strong>설정 → 보안 → 기기 코드 로그인</strong>을 활성화하세요. 팀·회사 워크스페이스는 관리자의 허용이 필요할 수 있습니다.</li><li>이 화면에서 ‘Codex 다시 연결’을 누르세요. OpenAI 페이지에서는 홈페이지 자동 수정에 사용할 계정으로 로그인하세요.</li><li>코드를 입력하고 승인한 뒤 이 화면으로 돌아오세요. 파일을 고르거나 터미널을 열 필요가 없습니다.</li></ol><a className="text-button" href="https://developers.openai.com/codex/auth/" target="_blank" rel="noreferrer">공식 기기 로그인 안내 ↗</a></details>
 <label className="connection-consent"><input type="checkbox" disabled={busy||running} checked={consent} onChange={e=>setConsent(e.target.checked)}/> 로그인한 계정의 인증으로 테스트 환경의 Codex 인증을 저장·교체하는 데 동의합니다. 운영 인증은 유지됩니다.</label>
 <div className="action-row connection-actions"><button className="primary" disabled={busy||running||!consent||!loaded} aria-busy={processing} onClick={()=>start('login')}>{buttonContent('login','Codex 다시 연결')}</button></div>
 {(error||readError)&&<p role="alert" className="error-note">{error||readError}</p>}
 <div className={`connection-state ${success?'is-success':warning?'is-warning':''}`} role="status" aria-live="polite"><div className="connection-state-heading">{processing?<span className="spinner" aria-hidden="true"/>:success?<span className="connection-check" aria-hidden="true">✓</span>:null}<strong>{busy?'연결 요청을 보내고 있습니다':view?states[view.state]||'상태 확인 중':loaded?'Codex를 연결할 수 있습니다':'상태를 불러오는 중…'}</strong></div>
 {busy&&<p>요청이 접수되면 진행 상태가 자동으로 바뀝니다. 잠시만 기다려 주세요.</p>}
 {view?.state==='queued'&&<p>실행 환경을 준비하고 있습니다. 준비가 끝나면 로그인 코드가 자동으로 표시됩니다.</p>}
 {view?.state==='waiting'&&(view.code?<><p>OpenAI 페이지를 열고 아래 일회용 코드를 입력해 승인하세요.</p><div className="device-code"><code>{view.code}</code><CopyButton value={view.code}/></div><a className="primary" href="https://auth.openai.com/codex/device" target="_blank" rel="noopener noreferrer">OpenAI에서 로그인하기 ↗</a><p className="progress-note">승인 후 자동으로 인증을 저장합니다. 연결 대기 기한: {date(view.expiresAt)}</p></>:<p>OpenAI 로그인 코드를 준비하고 있습니다.</p>)}
 {view?.state==='auth_required'&&<p>이전 연결 이후 인증 문제로 멈춘 요청이 있습니다. 위에서 다시 로그인한 뒤 아래 요청을 실행해 주세요.</p>}
 {view?.state==='connected'&&<p>새 인증을 저장했습니다. 아래에 멈춘 요청이 있으면 다시 실행하세요. 홈페이지 변경은 PR을 검토하고 승인한 뒤 반영됩니다.</p>}
 {view?.state==='expired'&&<p>연결 시간이 지났습니다. 다시 연결해 새 코드를 받아 주세요.</p>}
 {view?.state==='failed'&&<p>로그인을 완료하지 못했습니다. 기기 코드 로그인 설정을 확인하고 다시 연결해 주세요.</p>}
 {view?.state==='uncertain'&&<p>처리 결과를 확인하지 못했습니다. 작업 기록과 인증 갱신 시간을 확인해 주세요.</p>}
 </div>
 <div className="connection-status-tools"><button className="text-button" disabled={busy} onClick={()=>{void load(true);void refresh();}}>상태 새로고침</button>{!busy&&flow?.runUrl&&<a className="text-button" href={flow.runUrl} target="_blank" rel="noreferrer">연결 작업 기록 ↗</a>}</div>
 <div className="recovery-requests"><h3>인증 문제로 멈춘 요청</h3>{stopped.length?<><p>다시 실행하면 원래 요청으로 자동 수정을 시작합니다. Codex 사용량이 발생하며, 생성된 PR은 검토 후 승인해야 합니다.</p><ul>{stopped.map(r=>{const key=`${r.id}:${r.run.id}:${r.run.attempt||1}`,waiting=retrying===key||submitted.includes(key);return <li key={key}><div><Link to={`/requests/${r.id}`}>#{r.id} · {requestTitle(r)}</Link><small>{r.retry?.state==='uncertain'?'재실행 접수 여부를 확인해 주세요.':r.auth.renewed?'새 인증 저장됨 · 다시 실행할 수 있습니다':'위에서 Codex를 다시 연결해 주세요.'}</small></div><button className="secondary" disabled={busy||running||!!retrying||waiting||!r.auth.renewed||!!r.retry} aria-busy={retrying===key} onClick={()=>retry(r)}>{retrying===key?<><span className="spinner" aria-hidden="true"/>접수 중…</>:submitted.includes(key)?'재실행 접수됨':'이 요청 다시 실행'}</button></li>;})}</ul></>:<p className="connected-empty">현재 인증 문제로 멈춘 요청이 없습니다.</p>}</div>
 {notice&&<p role="status" className="inline-note">{notice}</p>}
 <p className="progress-note">연결 상태는 5초, 요청 목록은 30초마다 확인합니다. 로그인 화면에서 돌아오면 연결 상태를 바로 갱신합니다.</p>
 </section>;
}
