import {GitHubError} from './github.js';
const ttl=15000;
const progress=()=>new GitHubError('이전 요청 기록을 불러오는 중입니다. 잠시 후 다시 확인해 주세요.',503);
export async function saveCatalog(db,kind,items,removed=[]){
 if(!db||(!items.length&&!removed.length))return;
 const statements=items.map(item=>db.prepare('INSERT INTO github_catalog(kind,id,payload) VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload WHERE github_catalog.payload<>excluded.payload').bind(kind,item.id??item.number,JSON.stringify(item)));
 statements.push(...removed.map(id=>db.prepare('DELETE FROM github_catalog WHERE kind=? AND id=?').bind(kind,id)));
 for(let i=0;i<statements.length;i+=200)await db.batch(statements.slice(i,i+200));
}
export async function invalidateCatalog(db){
 if(db)await db.prepare('UPDATE github_catalog_sync SET checked_at=0').run();
}
// Each source reports its own continuation condition. A checkpoint survives a
// timeout or a large first import; never return a silently truncated catalogue.
export async function readCatalog(db,kind,fetchPage,{force=false}={}){
 if(!db){const all=[];for(let page=1;;page++){const batch=await fetchPage(page,null);all.push(...batch.items);if(batch.done)return all;}}
 await db.prepare('INSERT OR IGNORE INTO github_catalog_sync(kind) VALUES (?)').bind(kind).run();
 let state=await db.prepare('SELECT * FROM github_catalog_sync WHERE kind=?').bind(kind).first();
 const now=Date.now();
 if(force||state.boundary||now-state.checked_at>=ttl){
  const lease=crypto.randomUUID();
  const lock=await db.prepare('UPDATE github_catalog_sync SET lease=?,lease_until=? WHERE kind=? AND lease_until<?').bind(lease,now+90000,kind,now).run();
  if(!lock.meta.changes){if(force||!state.since||state.boundary)throw progress();}
  else {
   try{
    state=await db.prepare('SELECT * FROM github_catalog_sync WHERE kind=?').bind(kind).first();
    const boundary=state.boundary||new Date(now).toISOString();
    const since=state.since?new Date(Date.parse(state.since)-120000).toISOString():null;
    let page=state.page;
    for(let step=0;step<3;step++,page++){
     const batch=await fetchPage(page,since);
     await saveCatalog(db,kind,batch.items,batch.removed);
     if(batch.done){
      await db.prepare('UPDATE github_catalog_sync SET since=?,boundary=NULL,page=1,checked_at=? WHERE kind=? AND lease=?').bind(boundary,Date.now(),kind,lease).run();
      break;
     }
     await db.prepare('UPDATE github_catalog_sync SET boundary=?,page=? WHERE kind=? AND lease=?').bind(boundary,page+1,kind,lease).run();
     if(step===2)throw progress();
    }
   }finally{await db.prepare('UPDATE github_catalog_sync SET lease=NULL,lease_until=0 WHERE kind=? AND lease=?').bind(kind,lease).run();}
  }
 }
 return (await db.prepare('SELECT payload FROM github_catalog WHERE kind=? ORDER BY id DESC').bind(kind).all()).results.map(row=>JSON.parse(row.payload));
}

// Settle all cache writers before returning an error, so their leases and page
// checkpoints are not abandoned when a Worker response ends the invocation.
export async function allReads(promises){
 const results=await Promise.allSettled(promises),failure=results.find(r=>r.status==='rejected');
 if(failure)throw failure.reason;
 return results.map(r=>r.value);
}
