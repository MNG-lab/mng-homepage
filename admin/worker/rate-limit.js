const rejected=()=>Response.json({error:'요청이 많습니다. 잠시 후 다시 시도해 주세요.'},{status:429,headers:{'Retry-After':'60'}});

export async function limitRequests(request,env) {
 const path=new URL(request.url).pathname;
 // A user must still be able to end a session after hitting a rate limit.
 // Logout separately requires same-origin POST and a valid signature before DB work.
 if(path==='/auth/logout')return null;
 // Cloudflare supplies this header. Never trust a client-supplied X-Forwarded-For.
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const key=`mng-admin-preview:${ip}`;
 if(!(await env.REQUEST_LIMITER.limit({key})).success)return rejected();
 if(path==='/auth/google/start'||path==='/auth/google/callback'){
  if(!(await env.LOGIN_LIMITER.limit({key})).success)return rejected();
 }else if(path.startsWith('/api/')&&!['GET','HEAD','OPTIONS'].includes(request.method)&&path!=='/api/session/refresh'){
  if(!(await env.WRITE_LIMITER.limit({key})).success)return rejected();
 }
 return null;
}
