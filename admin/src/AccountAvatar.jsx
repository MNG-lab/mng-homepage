import React,{useState} from 'react';

export default function AccountAvatar({picture}) {
 const [failed,setFailed]=useState(null);
 return <span className="header-account-avatar" aria-hidden="true">
  {picture&&picture!==failed?<img src={picture} alt="" width="40" height="40" referrerPolicy="no-referrer" onError={()=>setFailed(picture)}/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg>}
 </span>;
}
