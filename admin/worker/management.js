import {GitHubError} from './github.js';
const json=(data,status=200)=>Response.json(data,{status});
export async function readMember(env,email,sub,bind=false) {
 if(env.MEMBERS_DB!=='true') {
  const member=JSON.parse(env.MEMBERS_JSON||'{}')[email];
  return member&&(!member.sub||member.sub===sub)?{email,sub,role:member.role}:null;
 }
 let row=await env.DB.prepare('SELECT * FROM members WHERE email=? AND active=1').bind(email).first();
 if(!row || (row.sub && row.sub!==sub)) return null;
 if(bind&&!row.sub) {
  await env.DB.prepare('UPDATE members SET sub=? WHERE email=? AND sub IS NULL AND active=1').bind(sub,email).run();
  row=await env.DB.prepare('SELECT * FROM members WHERE email=? AND active=1').bind(email).first();
 }
 return row&&(!row.sub||row.sub===sub)?{email,sub,role:row.role}:null;
}
export const audit=(env,user,action,target)=>env.DB.prepare('INSERT INTO audit(actor,action,target) VALUES (?,?,?)').bind(user.email||user.sub,action,String(target)).run();
export function managementAPI() {return async(request,env,user)=>{
 try {
  if(env.MEMBERS_DB!=='true') return json({error:'사용자 관리를 준비 중입니다.'},503);
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&path==='/api/settings') {
   const transfer=await env.DB.prepare('SELECT * FROM ownership WHERE id=1 AND expires_at>?').bind(Date.now()).first();
   const data={role:user.role,transfer:transfer&&(user.role==='owner'||transfer.to_email===user.email)?transfer:null};
   if(user.role==='owner') {
    data.members=(await env.DB.prepare('SELECT email,role,active,sub IS NOT NULL AS joined FROM members ORDER BY email').all()).results;
    data.audit=(await env.DB.prepare('SELECT actor,action,target,created_at FROM audit ORDER BY id DESC LIMIT 30').all()).results;
   }
   return json(data);
  }
  if(request.method!=='POST'||request.headers.get('Origin')!==env.APP_ORIGIN) return json({error:'허용되지 않은 요청입니다.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'JSON 요청이 필요합니다.'},415);
  const raw=await request.text();if(raw.length>40000)return json({error:'입력이 너무 큽니다.'},413);
  const body=JSON.parse(raw);
  if(path==='/api/settings/transfer/accept') {
   const transfer=await env.DB.prepare('SELECT * FROM ownership WHERE id=1 AND to_email=? AND expires_at>?').bind(user.email,Date.now()).first();
   if(!transfer) throw new GitHubError('유효한 이전 요청이 없습니다.',409);
   // A single SQLite statement changes both roles. A concurrent cancellation or revocation makes it a no-op.
   const result=await env.DB.prepare(`UPDATE members SET role=CASE WHEN email=? THEN 'owner' ELSE 'admin' END WHERE active=1 AND email IN (?,?) AND EXISTS(SELECT 1 FROM ownership WHERE id=1 AND from_email=? AND to_email=? AND expires_at>?) AND EXISTS(SELECT 1 FROM members WHERE email=? AND role='owner' AND active=1) AND EXISTS(SELECT 1 FROM members WHERE email=? AND active=1 AND sub IS NOT NULL)`).bind(user.email,transfer.from_email,user.email,transfer.from_email,user.email,Date.now(),transfer.from_email,user.email).run();
   if(result.meta.changes!==2)throw new GitHubError('이전 요청이 변경되었습니다.',409);
   await env.DB.prepare('DELETE FROM ownership WHERE id=1 AND from_email=? AND to_email=?').bind(transfer.from_email,user.email).run();
   await audit(env,user,'ownership.accept',transfer.from_email);return json({ok:true,reload:true});
  }
  if(user.role!=='owner')return json({error:'최고 관리자만 변경할 수 있습니다.'},403);
  if(path==='/api/settings/members') {
   const email=String(body.email||'').trim().toLowerCase();
   if(!/^[a-z0-9.+_-]+@gmail\.com$/.test(email)||!['admin','editor'].includes(body.role)||typeof body.active!=='boolean')throw new GitHubError('Gmail 계정과 권한을 확인해 주세요.',400);
   const result=await env.DB.prepare(`INSERT INTO members(email,role,active) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,active=excluded.active WHERE members.role!='owner'`).bind(email,body.role,body.active?1:0).run();
   if(!result.meta.changes)throw new GitHubError('최고 관리자는 이전 절차로만 변경할 수 있습니다.',409);
   await audit(env,user,'member.update',email);return json({ok:true});
  }
  if(path==='/api/settings/transfer') {
   const member=await env.DB.prepare('SELECT * FROM members WHERE email=? AND active=1 AND sub IS NOT NULL').bind(String(body.email||'').toLowerCase()).first();
   if(!member||member.email===user.email)throw new GitHubError('로그인을 마친 다른 구성원을 선택해 주세요.',400);
   await env.DB.prepare('INSERT OR REPLACE INTO ownership(id,from_email,to_email,expires_at) VALUES (1,?,?,?)').bind(user.email,member.email,Date.now()+86400000).run();
   await audit(env,user,'ownership.offer',member.email);return json({ok:true});
  }
  if(path==='/api/settings/transfer/cancel') {await env.DB.prepare('DELETE FROM ownership WHERE id=1 AND from_email=?').bind(user.email).run();await audit(env,user,'ownership.cancel','');return json({ok:true});}
  return json({error:'지원하지 않는 작업입니다.'},404);
 } catch(e){return json({error:e instanceof GitHubError?e.message:'설정을 변경하지 못했습니다. 상태를 다시 확인해 주세요.'},e instanceof GitHubError?e.status:502);}
};}
