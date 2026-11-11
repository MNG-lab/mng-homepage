import React, {useCallback,useEffect,useState} from 'react';
import {api} from './api.js';
import LoadingIndicator from './LoadingIndicator.jsx';
import SessionActivity from './SessionActivity.jsx';
export default function AuthGate({children}) {
  const [state,setState] = useState({loading:true}),[retry,setRetry]=useState(0);
  const updateSession=useCallback(value=>setState({user:value.user,mode:value.mode}),[]);
  useEffect(() => {
    if (import.meta.env.VITE_ADMIN_AUTH !== 'required') { setState({local:true}); return; }
    let active=true;setState({loading:true});
    api('/api/session').then(value=>{if(active)setState({user:value.user,mode:value.mode});}).catch(() => {if(active) setState({error:true});});
    return () => {active=false;};
  },[retry]);
  if(state.local) return children(null);
  if(state.loading) return <LoadingIndicator label="로그인 확인 중" fullPage/>;
  if(state.error) return <div className="auth-status" role="alert"><p>로그인 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.</p><button className="secondary" onClick={()=>setRetry(n=>n+1)}>다시 확인</button></div>;
  return <><SessionActivity onSession={updateSession}/>{children(state.user,state.mode)}</>;
}
