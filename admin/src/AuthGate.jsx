import React, {useEffect,useState} from 'react';
import {api} from './api.js';
export default function AuthGate({children}) {
  const [state,setState] = useState({loading:true});
  useEffect(() => {
    if (import.meta.env.VITE_ADMIN_AUTH !== 'required') { setState({local:true}); return; }
    let active=true;
    api('/api/session').then(value=>{if(active)setState({user:value.user,mode:value.mode});}).catch(() => {if(active) setState({error:true});});
    return () => {active=false;};
  },[]);
  if(state.local) return children(null);
  if(state.loading) return <p className="auth-status">로그인 확인 중…</p>;
  if(state.error) return <p className="auth-status">로그인을 확인하지 못했습니다. <a href="/login">다시 로그인</a></p>;
  return children(state.user,state.mode);
}
