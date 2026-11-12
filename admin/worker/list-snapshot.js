import {deployment} from '../shared/deployment.js';

// Display-only snapshots. Never used by detail, approval, retry or restore APIs.
// The browser displays a saved result, then requests fresh=1 in the background.
export async function listSnapshot(env,name,{fresh=false,load,now=Date.now}={}){
 const config=deployment(env);
 const kind=`${config.cache}list-view-v1:${JSON.stringify([env.GITHUB_REPOSITORY,env.GITHUB_APP_ID,env.GITHUB_INSTALLATION_ID,config.base,config.ref,name])}`;
 if(!fresh){
  const row=await env.DB.prepare('SELECT payload FROM github_catalog WHERE kind=? AND id=0').bind(kind).first();
  if(row){const saved=JSON.parse(row.payload);return {value:saved.value,sync:{state:'cached',updatedAt:saved.updatedAt}};}
 }
 const startedAt=now(),value=await load(),updatedAt=now();
 const payload=JSON.stringify({startedAt,updatedAt,value});
 // Keep one complete snapshot per view. A slower, older read cannot replace
 // a result from a later request. Oversized results remain usable without caching.
 if(new TextEncoder().encode(payload).byteLength<=512000){
  await env.DB.prepare(`INSERT INTO github_catalog(kind,id,payload) VALUES (?,0,?)
   ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload
   WHERE json_extract(github_catalog.payload,'$.startedAt')<=json_extract(excluded.payload,'$.startedAt')`).bind(kind,payload).run();
 }else await env.DB.prepare('DELETE FROM github_catalog WHERE kind=? AND id=0 AND json_extract(payload,\'$.startedAt\')<=?').bind(kind,startedAt).run();
 return {value,sync:{state:'fresh',updatedAt}};
}
