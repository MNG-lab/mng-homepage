import {revisionKey} from '../shared/version.js';

export function attachVersions(records,versions) {
 const bySha=new Map(versions.filter(r=>r.version).map(r=>[r.mergeSha,r.version]));
 const byKey=new Map(versions.filter(r=>r.version).map(r=>[revisionKey(r),r.version]));
 const targetVersion=target=>{const key=String(target.key||target.number||'');return byKey.get(key)||(key.startsWith('commit-')?bySha.get(key.slice(7)):null)||null;};
 return records.map(r=>({...r,version:r.merged?bySha.get(r.mergeSha)||null:null,...(r.restoration?{restoration:{...r.restoration,version:targetVersion(r.restoration)}}:{})}));
}

export async function numberWebsiteVersions(db,scope,revisions) {
 if(!db)throw Error('홈페이지 버전 저장소를 확인해 주세요.');
 const bySha=new Map();
 for(const revision of revisions){
  if(revision.kind==='snapshot')continue; // An unverified fallback must not consume a permanent number.
  if(!/^[a-f0-9]{40}$/.test(revision.mergeSha))throw Error('반영된 커밋을 확인하지 못했습니다.');
  const previous=bySha.get(revision.mergeSha);
  if(!previous||revision.number&&!previous.number)bySha.set(revision.mergeSha,revision);
 }
 const ordered=[...bySha.values()].sort((a,b)=>(a.mergedAt||'').localeCompare(b.mergedAt||'')||a.mergeSha.localeCompare(b.mergeSha));
 const saved=(await db.prepare('SELECT sha,version FROM website_versions WHERE scope=?').bind(scope).all()).results;
 const existing=new Set(saved.map(row=>row.sha));
 const missing=ordered.filter(r=>!existing.has(r.mergeSha));
 // Each conditional INSERT allocates MAX+1 atomically. Duplicate reads consume
 // no sequence value, and D1 batch transactions preserve the initial ordering.
 const statements=missing.map(r=>db.prepare('INSERT INTO website_versions(scope,sha,version) SELECT ?,?,(SELECT COALESCE(MAX(version),0)+1 FROM website_versions WHERE scope=?) WHERE NOT EXISTS(SELECT 1 FROM website_versions WHERE scope=? AND sha=?)').bind(scope,r.mergeSha,scope,scope,r.mergeSha));
 for(let i=0;i<statements.length;i+=200)await db.batch(statements.slice(i,i+200));
 const rows=missing.length?(await db.prepare('SELECT sha,version FROM website_versions WHERE scope=?').bind(scope).all()).results:saved;
 const numbers=new Map(rows.map(row=>[row.sha,row.version]));
 return attachVersions(ordered,ordered.map(r=>({...r,version:numbers.get(r.mergeSha)}))).sort((a,b)=>b.version-a.version);
}
