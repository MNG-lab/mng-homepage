import {websitePaths,websiteSignature} from '../shared/website-policy.js';
import {readCatalog} from './github-catalog.js';
import {relatedRequest} from '../shared/version.js';

const query=`query WebsiteHistory($ref:String!,$path:String!,$after:String,$since:GitTimestamp){repository(owner:"MNG-lab",name:"mng-homepage"){object(expression:$ref){... on Commit{history(first:100,path:$path,after:$after,since:$since){pageInfo{hasNextPage endCursor} nodes{oid messageHeadline committedDate url associatedPullRequests(first:10){pageInfo{hasNextPage} nodes{number title url mergedAt baseRefName baseRepository{nameWithOwner} headRefName mergeCommit{oid}}}}}}}}}`;
// Cursor checkpoints use the existing read-cache tables. No credentials or new DB.
export async function websiteHistory({db,cache,base,current,pulls,graphql,tree,refresh=false}){
 const events=[];
 // Sequential feeds bound GitHub subrequests; readCatalog resumes large imports.
 for(const path of websitePaths){
  const kind=cache+'website-v1:'+path,cursors=new Map();
  const rows=await readCatalog(db,kind,async(page,since)=>{
   if(page===1&&db&&!refresh){
    const completed=await db.prepare('SELECT payload FROM github_catalog WHERE kind=? AND id=0').bind(kind+':cursor').first();
    if(completed&&JSON.parse(completed.payload).ref===current)return {items:[],done:true};
   }
   const saved=page>1?(db?await db.prepare('SELECT payload FROM github_catalog WHERE kind=? AND id=?').bind(kind+':cursor',page).first():cursors.get(page)):null;
   const cursor=saved?JSON.parse(saved.payload):null;
   if(page>1&&!cursor)throw Error('홈페이지 이력의 이어 읽기 정보를 확인하지 못했습니다.');
   const ref=cursor?.ref||current,data=await graphql(query,{ref,path,after:cursor?.after||null,since:null});
   const history=data.repository?.object?.history;
   if(!history||history.nodes.some(n=>n.associatedPullRequests.pageInfo.hasNextPage))throw Error('홈페이지 변경 기록을 모두 확인하지 못했습니다.');
   if(history.pageInfo.hasNextPage)cursors.set(page+1,{payload:JSON.stringify({ref,after:history.pageInfo.endCursor})});
   if(history.pageInfo.hasNextPage&&db)await db.prepare('INSERT OR REPLACE INTO github_catalog(kind,id,payload) VALUES (?,?,?)').bind(kind+':cursor',page+1,JSON.stringify({ref,after:history.pageInfo.endCursor})).run();
   if(!history.pageInfo.hasNextPage&&db)await db.prepare('INSERT OR REPLACE INTO github_catalog(kind,id,payload) VALUES (?,?,?)').bind(kind+':cursor',0,JSON.stringify({ref})).run();
   // Prefix SHA ids so SQLite numeric affinity cannot round all-numeric hashes.
   return {items:history.nodes.map(n=>({...n,id:"commit:"+n.oid})),done:!history.pageInfo.hasNextPage};
  },{force:refresh});
  events.push(...rows);
 }
 const revisions=new Map(),byNumber=new Map(pulls.map(p=>[p.number,p]));
 for(const event of events){
  const matching=event.associatedPullRequests.nodes.filter(p=>p.mergedAt&&p.mergeCommit?.oid&&p.baseRefName===base&&p.baseRepository?.nameWithOwner==='MNG-lab/mng-homepage').sort((a,b)=>b.mergedAt.localeCompare(a.mergedAt));
  const pull=matching[0],known=pull&&byNumber.get(pull.number);
  const revision=pull?{...known,number:pull.number,key:String(pull.number),title:pull.title,url:pull.url,merged:true,mergeSha:pull.mergeCommit.oid,mergedAt:pull.mergedAt,head:{ref:pull.headRefName},requestId:relatedRequest({head:{ref:pull.headRefName}})}:
   {key:'commit-'+event.oid,kind:'direct',title:event.messageHeadline,url:event.url,mergeSha:event.oid,mergedAt:event.committedDate,merged:true};
  revisions.set(revision.key,revision);
 }
 const ordered=[...revisions.values()].sort((a,b)=>b.mergedAt.localeCompare(a.mergedAt)||b.mergeSha.localeCompare(a.mergeSha));
 const snapshot=await tree(current),signature=websiteSignature(snapshot);
 const latest=ordered[0];
 const same=latest&&websiteSignature(await tree(latest.mergeSha))===signature;
 if(latest&&!same&&!refresh)return websiteHistory({db,cache,base,current,pulls,graphql,tree,refresh:true});
 // A later content state without a matching request is still a normal version.
 const currentRevision=same?latest:latest?{key:'commit-'+current,kind:'snapshot',title:'현재 홈페이지',url:`https://github.com/MNG-lab/mng-homepage/commit/${current}`,mergeSha:current,merged:true,mergedAt:latest.mergedAt}:null;
 return {current,currentRevision,revisions:currentRevision&&!same?[currentRevision,...ordered]:ordered};
}
