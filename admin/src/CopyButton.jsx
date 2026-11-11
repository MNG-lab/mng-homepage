import React,{useEffect,useRef,useState} from 'react';
export default function CopyButton({value,label='코드 복사'}){
 const [state,setState]=useState('idle');
 const sequence=useRef(0),timer=useRef(null),busy=useRef(false);
 useEffect(()=>{
  ++sequence.current;busy.current=false;setState('idle');
  return()=>{++sequence.current;clearTimeout(timer.current);};
 },[value]);
 async function copy(){
  if(busy.current)return;
  busy.current=true;clearTimeout(timer.current);
  const current=++sequence.current;setState('copying');
  try{
   await navigator.clipboard.writeText(value);
   if(current!==sequence.current)return;
   setState('copied');timer.current=setTimeout(()=>setState('idle'),3000);
  }catch{
   if(current===sequence.current)setState('error');
  }finally{if(current===sequence.current)busy.current=false;}
 }
 return <div className="copy-control"><button type="button" className={`secondary copy-button ${state==='copied'?'is-copied':''}`} disabled={state==='copying'} aria-busy={state==='copying'} aria-live="polite" onClick={copy}>{state==='copying'?<><span className="spinner" aria-hidden="true"/>복사 중…</>:state==='copied'?<><span aria-hidden="true">✓</span>복사 완료</>:label}</button>{state==='error'&&<span className="copy-error" role="status">복사하지 못했습니다. 내용을 직접 선택해서 복사해 주세요.</span>}</div>;
}
