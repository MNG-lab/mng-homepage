export async function api(path,body) {
 const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'});
 if(response.status===401){window.location.assign('/login');throw Error('로그인이 만료됐습니다.');}
 const data=await response.json();if(!response.ok)throw Error(data.error||'처리하지 못했습니다.');return data;
}
export function requestState(r) {
 if(r.pull?.merged)return 'done';
 if(r.state==='closed'||r.pull?.state==='closed')return 'closed';
 if(r.pull)return 'review';
 if(r.run?.status==='completed'&&['failure','cancelled','timed_out'].includes(r.run.conclusion))return 'failed';
 return 'working';
}
export const labels={done:'반영 완료',closed:'종료',review:'확인 필요',failed:'작업 실패',working:'진행 중'};
export const date=value=>value?new Date(value).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
export function description(body) {return (body||'').replace(/<!--[\s\S]*?-->\s*/g,'').split('## 수정 요청\n')[1]?.split('\n\n운영 홈페이지')[0]||(body||'').replace(/<!--[\s\S]*?-->\s*/g,'');}
