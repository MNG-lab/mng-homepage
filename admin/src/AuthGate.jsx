import React, {useEffect,useState} from 'react';
export default function AuthGate({children}) {
  const [state,setState] = useState({loading:true});
  useEffect(() => {
    if (import.meta.env.VITE_ADMIN_AUTH !== 'required') { setState({local:true}); return; }
    let active=true;
    fetch('/api/session',{credentials:'same-origin',cache:'no-store'}).then(async response => {
      if (response.status===401) { window.location.assign('/login'); return; }
      if (!response.ok) throw new Error('Failed');
      const value=await response.json();
      if (active) setState({user:value.user});
    }).catch(() => {if(active) setState({error:true});});
    return () => {active=false;};
  },[]);
  if(state.local) return children(null);
  if(state.loading) return <p className="auth-status">로그인 확인 중…</p>;
  if(state.error) return <p className="auth-status">로그인을 확인하지 못했습니다. <a href="/login">다시 로그인</a></p>;
  return <><div className="auth-session"><span>{state.user.email} · {state.user.role === 'owner' ? '최고 관리자' : state.user.role === 'admin' ? '관리자' : '편집자'} · 요청·복원은 데모입니다</span><form method="post" action="/auth/logout"><button type="submit">로그아웃</button></form></div>{children(state.user)}</>;
}
