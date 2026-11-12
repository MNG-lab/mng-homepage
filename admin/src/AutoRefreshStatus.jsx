import React,{useEffect,useState} from 'react';

export default function AutoRefreshStatus({busy,error,updatedAt}){
 const [showSpinner,setShowSpinner]=useState(false);
 useEffect(()=>{
  if(!busy){setShowSpinner(false);return;}
  // Fast reads update the timestamp without flashing a spinner on every poll.
  const timer=setTimeout(()=>setShowSpinner(true),1000);
  return()=>clearTimeout(timer);
 },[busy]);
 const time=updatedAt?new Date(updatedAt).toLocaleTimeString('ko-KR',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}):null;
 return <div className={`auto-refresh-status ${busy?'is-loading':error?'is-error':''}`} role="status" aria-live="off" aria-label={busy?'상태 확인 중':error?'업데이트 지연':`자동 업데이트 · ${time||''} 확인`}>
  {busy&&showSpinner?<span className="spinner" aria-hidden="true"/>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{error&&!busy?<><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></>:busy?<><path d="M20 7v5h-5"/><path d="M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6"/></>:<path d="m5 12 4 4L19 6"/>}</svg>}
  <span>{busy?'상태 확인 중':error?'업데이트 지연':'자동 업데이트'}</span>
  {time&&<time dateTime={new Date(updatedAt).toISOString()}>{time} 확인</time>}
 </div>;
}
