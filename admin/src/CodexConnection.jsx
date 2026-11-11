import React,{useEffect,useRef,useState} from 'react';
import {api,date} from './api.js';
const active=['queued','waiting','saving','testing'];
const states={queued:'작업을 준비하고 있습니다',waiting:'로그인을 기다리고 있습니다',saving:'새 인증을 저장하고 있습니다',connected:'Codex 재연결 완료',testing:'새 인증으로 다시 실행 중',completed:'다시 실행 완료',auth_required:'Codex 재연결이 필요합니다',expired:'연결 시간이 지났습니다',failed:'작업을 완료하지 못했습니다',uncertain:'처리 결과를 확인해야 합니다'};
export default function CodexConnection(){
 const [flow,setFlow]=useState(null),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[readError,setReadError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false),[consent,setConsent]=useState(false);
 const inflight=useRef(false),mounted=useRef(true);
 async function load(){if(inflight.current)return;inflight.current=true;try{const data=await api('/api/settings/device-login');if(mounted.current){setFlow(data.flow);setLoaded(true);setReadError('');}}catch(e){if(mounted.current)setReadError(e.message);}finally{inflight.current=false;}}
 useEffect(()=>{mounted.current=true;load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},5000);return()=>{mounted.current=false;clearInterval(timer);};},[]);
 async function start(kind){setBusy(true);setError('');setCopied(false);try{await api('/api/settings/device-login/start',{kind});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 const running=active.includes(flow?.state),ready=['connected','completed','failed','uncertain'].includes(flow?.state);
 return <section className="panel connected-panel" id="codex-connection" aria-label="Codex 재연결 체험"><span className="state-pill review">테스트 전용 · 운영 인증 유지</span><h2>Codex 재연결 체험</h2><p>인증이 만료되어 작업이 멈췄을 때의 과정을 직접 확인해 보세요. 만료 상황만 재현하며, 브라우저 로그인과 테스트 인증 저장은 실제로 진행합니다.</p>
 <ol className="connection-steps"><li>만료 상황 체험</li><li>브라우저에서 로그인</li><li>새 인증으로 다시 실행</li></ol>
 {(error||readError)&&<p role="alert" className="error-note">{error||readError} <a className="text-button" href="/auth/google/start">다시 로그인하기 →</a></p>}
 <div className="connection-state" aria-live="polite"><strong>{flow?states[flow.state]||'상태 확인 중':loaded?'체험할 준비가 됐습니다':'상태를 불러오는 중…'}</strong>
 {flow?.state==='auth_required'&&<p>{flow.kind==='simulate'?'체험용 작업을 인증 만료 상태로 만들었습니다. 실제 인증은 변경하지 않았습니다.':'Codex가 인증을 사용할 수 없다고 응답했습니다.'} 최고 관리자가 다시 연결하면 작업을 재실행할 수 있습니다.</p>}
 {flow?.state==='queued'&&<p>GitHub Actions를 준비하고 있습니다. 보통 잠시 후 로그인 코드 또는 작업 결과가 표시됩니다.</p>}
 {flow?.state==='waiting'&&flow.kind==='login'&&(flow.code?<><p>아래 버튼으로 OpenAI 페이지를 열고 일회용 코드를 입력해 승인하세요.</p><div className="device-code"><code>{flow.code}</code><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(flow.code);setCopied(true);}catch{setError('코드를 직접 선택해서 복사해 주세요.');}}}>{copied?'복사 완료':'코드 복사'}</button></div><a className="primary" href="https://auth.openai.com/codex/device" target="_blank" rel="noopener noreferrer">OpenAI에서 로그인하기 ↗</a><p className="progress-note">이 화면은 그대로 두세요. 승인 후 자동으로 테스트 인증을 저장합니다. 연결 대기 기한: {date(flow.expiresAt)}</p></>:<p>OpenAI 로그인 코드를 준비하고 있습니다.</p>)}
 {flow?.state==='connected'&&<p>새 인증을 테스트 환경에 저장했습니다. 아래 ‘멈춘 테스트 작업 다시 실행’을 눌러 정상적으로 동작하는지 확인하세요.</p>}
 {flow?.state==='completed'&&<p>새 인증으로 Codex가 정상 응답했습니다. 홈페이지를 수정하지 않는 짧은 확인 작업만 실행했습니다.</p>}
 {flow?.state==='expired'&&<p>연결을 새로 시작해 주세요. 이전 코드는 다시 사용하지 마세요.</p>}
 {flow?.state==='failed'&&<p>로그인 취소, 설정 또는 실행 오류일 수 있습니다. 모든 실패가 인증 만료는 아닙니다. 다시 연결하거나 저장된 인증으로 확인 작업을 실행할 수 있습니다.</p>}
 {flow?.state==='uncertain'&&<p>응답을 확인하지 못했습니다. 작업 기록을 먼저 확인해 주세요. 인증 저장 여부가 불확실하면 확인 작업으로 점검할 수 있습니다.</p>}
 </div>
 <details className="device-help" open={flow?.state==='auth_required'?true:undefined}><summary>처음 연결할 때 확인해 주세요</summary><ol className="guide-steps"><li>ChatGPT의 <strong>설정 → 보안 → 기기 코드 로그인</strong>을 활성화하세요. 팀·회사 워크스페이스는 관리자의 허용이 필요할 수 있습니다.</li><li>이 화면에서 ‘Codex 다시 연결’을 누르세요. OpenAI 페이지에서는 홈페이지 자동 수정에 사용할 계정으로 로그인하세요.</li><li>코드를 입력하고 승인한 뒤 이 화면으로 돌아오세요. 파일을 고르거나 터미널을 열 필요가 없습니다.</li></ol><a className="text-button" href="https://developers.openai.com/codex/auth/" target="_blank" rel="noreferrer">공식 기기 로그인 안내 ↗</a></details>
 {!running&&<label className="connection-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> 로그인한 계정의 인증으로 테스트용 Codex 인증을 저장·교체하는 데 동의합니다. 운영 인증은 유지됩니다.</label>}
 <div className="action-row"><button className="secondary" disabled={busy||running||!loaded} onClick={()=>start('simulate')}>인증 만료 상황 체험하기</button><button className="primary" disabled={busy||running||!consent||!loaded} onClick={()=>start('login')}>Codex 다시 연결</button>{ready&&<button className="primary" disabled={busy||running} onClick={()=>start('verify')}>멈춘 테스트 작업 다시 실행</button>}<button className="text-button" disabled={busy} onClick={load}>상태 새로고침</button>{flow?.runUrl&&<a className="text-button" href={flow.runUrl} target="_blank" rel="noreferrer">작업 기록 ↗</a>}</div><p className="progress-note">진행 상태는 5초마다 갱신됩니다. 재실행은 소량의 Codex 사용량을 소비하며, 홈페이지 수정·배포는 하지 않습니다.</p>
 </section>;
}
