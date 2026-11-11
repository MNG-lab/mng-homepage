export function requestState(r) {
 if(r.pull?.merged)return 'done';
 if(r.state==='closed'||r.pull?.state==='closed')return 'closed';
 if(r.pull)return 'review';
 if(r.retry?.state==='pending')return 'working';
 if(r.auth)return 'auth_required';
 if(r.run?.status==='completed'&&['failure','cancelled','timed_out'].includes(r.run.conclusion))return 'failed';
 return 'working';
}
export function description(body) {return (body||'').replace(/<!--[\s\S]*?-->\s*/g,'').split('## 수정 요청\n')[1]?.split('\n\n운영 홈페이지')[0]||(body||'').replace(/<!--[\s\S]*?-->\s*/g,'');}
