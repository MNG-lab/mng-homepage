import React,{useEffect,useRef} from 'react';

export default function ConfirmDialog({title,busy,onClose,children}) {
 const ref=useRef(null);
 useEffect(()=>{
  const dialog=ref.current,overflow=document.body.style.overflow,trigger=document.activeElement;
  document.body.style.overflow='hidden';
  dialog.showModal();
  dialog.querySelector('[data-dialog-cancel]').focus();
  return()=>{dialog.close();document.body.style.overflow=overflow;if(trigger?.isConnected)trigger.focus();};
 },[]);
 return <dialog ref={ref} className="request-confirm-dialog" aria-labelledby="request-confirm-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
  <h2 id="request-confirm-title">{title}</h2>
  {children}
 </dialog>;
}
