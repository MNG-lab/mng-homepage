import React,{useEffect,useRef,useState} from 'react';

export default function RefreshButton({onRefresh}) {
 const [state,setState]=useState('idle');
 const running=useRef(false),mounted=useRef(true),resetTimer=useRef(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(resetTimer.current);};},[]);
 async function refresh(){
  if(running.current)return;
  running.current=true;clearTimeout(resetTimer.current);setState('loading');
  let result=false;
  try{result=await onRefresh();}catch{result=false;}
  finally{running.current=false;}
  if(!mounted.current)return;
  setState(result===null?'idle':result?'success':'error');
  if(result)resetTimer.current=setTimeout(()=>setState('idle'),2000);
 }
 const busy=state==='loading';
 const label={idle:'새로고침',loading:'새로고침 중…',success:'새로고침 완료',error:'새로고침 재시도'}[state];
 const message={idle:'',loading:'요청 목록을 새로고침하고 있습니다.',success:'요청 목록을 새로고침했습니다.',error:'새로고침하지 못했습니다. 다시 시도해 주세요.'}[state];
 return <>
  <button type="button" className={`secondary refresh-button is-${state}`} disabled={busy} aria-busy={busy} onClick={refresh}>
   {busy?<span className="spinner" aria-hidden="true"/>:<svg className="refresh-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{state==='success'?<path d="m5 12 4 4L19 6"/>:<><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3l1 3M4 12l1 3a8 8 0 0 0 13 3"/></>}</svg>}
   <span>{label}</span>
  </button>
  <span className="sr-only refresh-announcement" role="status" aria-live="polite" aria-atomic="true">{message}</span>
 </>;
}
