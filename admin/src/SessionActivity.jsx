import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';
import {api} from './api.js';

// Only navigation and real input extend a session. Polling, focus, and timers do not.
export default function SessionActivity({onSession}) {
 const location=useLocation(),renewRef=useRef(()=>{});
 useEffect(()=>{
  let stopped=false,pending=null,nextAttempt=0;
  function renew() {
   if(stopped||pending||document.visibilityState!=='visible'||Date.now()<nextAttempt)return;
   nextAttempt=Date.now()+10000;
   pending=api('/api/session/refresh',{}).then(value=>{
    nextAttempt=Date.now()+60000;
    if(!stopped)onSession(value);
   }).catch(()=>{
    // Keep the current screen on temporary failures; the next activity retries.
    // The API helper redirects only when the server confirms authentication failed.
    nextAttempt=Date.now()+10000;
   }).finally(()=>{pending=null;});
  }
  function activity(event) {
   if(event.isTrusted&&!event.target?.closest?.('form[action="/auth/logout"]'))renew();
  }
  function logout(event) {
   if(stopped||!event.target?.matches?.('form[action="/auth/logout"]'))return;
   stopped=true;
   // Ensure an in-flight refresh cannot write a cookie after logout clears it.
   if(pending){event.preventDefault();const form=event.target;void pending.then(()=>{if(form.isConnected)form.requestSubmit();});}
  }
  renewRef.current=renew;
  const events=['pointerdown','keydown','wheel','touchstart'];
  for(const event of events)document.addEventListener(event,activity,{capture:true,passive:true});
  document.addEventListener('submit',logout,true);
  return()=>{stopped=true;renewRef.current=()=>{};for(const event of events)document.removeEventListener(event,activity,true);document.removeEventListener('submit',logout,true);};
 },[onSession]);
 useEffect(()=>{renewRef.current();},[location.key]);
 return null;
}
