export const SESSION_TTL = 6 * 60 * 60;
const validId = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
const hash = async id => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id))),b=>b.toString(16).padStart(2,'0')).join('');

// Use the primary database, never a cached/replica membership or revocation result.
// D1's regular prepare() calls go to the primary (no read-replica session).
export async function createSession(env,email,subject) {
 const id=crypto.randomUUID(),now=Date.now();
 await env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now).run();
 await env.DB.prepare('INSERT INTO sessions(id_hash,email,subject,created_at,expires_at) VALUES (?,?,?,?,?)').bind(await hash(id),email,subject,now,now+SESSION_TTL*1000).run();
 return id;
}
export async function readSession(env,claims) {
 if(!validId(claims.sid))return null; // Pre-migration stateless cookies must log in again.
 return env.DB.prepare('SELECT created_at FROM sessions WHERE id_hash=? AND email=? AND subject=? AND expires_at>?').bind(await hash(claims.sid),claims.email,claims.sub,Date.now()).first();
}
export async function renewSession(env,id) {
 if(!validId(id))return false;
 const now=Date.now();
 // UPDATE only: a concurrent logout/delete must never be undone by a renewal.
 const result=await env.DB.prepare('UPDATE sessions SET expires_at=MAX(expires_at,?) WHERE id_hash=? AND expires_at>?').bind(now+SESSION_TTL*1000,await hash(id),now).run();
 return result.meta.changes===1;
}
export async function revokeSession(env,id) {
 if(validId(id))await env.DB.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await hash(id)).run();
}
