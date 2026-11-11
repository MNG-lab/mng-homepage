import React,{useEffect,useRef,useState} from 'react';

export default function RefreshButton({onRefresh,label='새로고침',description='요청 목록',disabled=false}) {
 const [state,setState]=useState('idle');
 const running=useRef(false),mounted=useRef(true),resetTimer=useRef(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(resetTimer.current);};},[]);
 async function refresh(){
  if(disabled||running.current)return;
  running.current=true;clearTimeout(resetTimer.current);setState('loading');
  let result=false;
  try{result=await onRefresh();}catch{result=false;}
  finally{running.current=false;}
  if(!mounted.current)return;
  setState(result===null?'idle':result?'success':'error');
  if(result)resetTimer.current=setTimeout(()=>setState('idle'),2000);
 }
 const busy=state==='loading';
 const labels={idle:label,loading:'새로고침 중…',success:'새로고침 완료',error:'새로고침 재시도'};
 const message={idle:'',loading:`${description}: 새로고침 중입니다.`,success:`${description}: 새로고침했습니다.`,error:`${description}: 새로고침하지 못했습니다. 다시 시도해 주세요.`}[state];
 return <>
  <button type="button" className={`secondary refresh-button is-${state}`} disabled={busy||disabled} aria-busy={busy} onClick={refresh}>
   {busy?<span className="spinner" aria-hidden="true"/>:<svg className="refresh-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{state==='success'?<path d="m5 12 4 4L19 6"/>:<><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 13 3l1 3M4 12l1 3a8 8 0 0 0 13 3"/></>}</svg>}
   <span className="refresh-labels">{Object.entries(labels).map(([value,text])=><span key={value} className={state===value?'is-visible':''} aria-hidden={state!==value}>{text}</span>)}</span>
  </button>
  <span className="sr-only refresh-announcement" role="status" aria-live="polite" aria-atomic="true">{message}</span>
 </>;
}
