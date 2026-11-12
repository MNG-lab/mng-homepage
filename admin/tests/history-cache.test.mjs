import test from 'node:test';
import assert from 'node:assert/strict';
import {websiteHistory} from '../worker/website-history.js';
import {websitePaths} from '../shared/website-policy.js';
import {database} from './d1.mjs';

test('history feeds run three at a time and settle in-flight writers before reporting failure',async()=>{
 const db=database();let active=0,peak=0,calls=0,fail=false;
 const options={db,cache:'parallel:',base:'main',current:'a'.repeat(40),pulls:[],tree:async()=>({tree:[]}),graphql:async(q,v)=>{
  calls++;active++;peak=Math.max(peak,active);
  try{await new Promise(resolve=>setTimeout(resolve,10));if(fail&&v.path===websitePaths[0])throw Error('temporary');return {repository:{object:{history:{nodes:[],pageInfo:{hasNextPage:false}}}}};}
  finally{active--;}
 }};
 await websiteHistory(options);assert.equal(peak,3);assert.equal(active,0);assert.equal(calls,websitePaths.length);
 fail=true;calls=0;
 await assert.rejects(websiteHistory({...options,refresh:true}),/temporary/);
 assert.equal(calls,3,'no next batch is started after a failure');assert.equal(active,0);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM github_catalog_sync WHERE lease IS NOT NULL').get().n,0,'all cache leases are released');db.sqlite.close();
});

test('completed history snapshots skip repeated work and track HEAD, PR edits and direct changes',async()=>{
 const db=database(),a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),d='d'.repeat(40);
 const pr={number:85,title:'Home 이미지',url:'https://example.test/85',mergedAt:'2026-11-11T12:00:00Z',mergeCommit:{oid:b},baseRefName:'main',baseRepository:{nameWithOwner:'MNG-lab/mng-homepage'},headRefName:'codex/issue-83-1'};
 const record=(oid,pulls)=>({oid,messageHeadline:'Home 직접 수정',committedDate:oid===d?'2026-11-12T12:00:00Z':'2026-11-11T12:00:00Z',url:'https://example.test/'+oid,associatedPullRequests:{pageInfo:{hasNextPage:false},nodes:pulls}});
 let nodes=[record(b,[pr])],graphs=0,trees=0;
 const options={db,cache:'production:',base:'main',current:a,pulls:[{number:85,title:pr.title,merged:true,mergeSha:b,mergedAt:pr.mergedAt,head:{ref:pr.headRefName}}],graphql:async(q,v)=>{graphs++;return {repository:{object:{history:{nodes:v.path==='src/content'?nodes:[],pageInfo:{hasNextPage:false}}}}};},tree:async sha=>{trees++;return {tree:[{path:'src/content/home.js',mode:'100644',type:'blob',sha:sha===d?'new':'old'}]};}};
 const first=await websiteHistory(options);assert.equal(first.currentRevision.version,1);assert.equal(graphs,websitePaths.length);
 const treeCount=trees;
 assert.deepEqual(await websiteHistory(options),first);assert.equal(trees,treeCount);assert.equal(graphs,websitePaths.length);
 db.sqlite.exec('UPDATE github_catalog_sync SET checked_at=0');await websiteHistory(options);assert.equal(trees,treeCount,'unchanged HEAD and PR data reuse the complete result beyond feed TTL');
 options.pulls=[{...options.pulls[0],title:'Home 사진 수정'}];assert.equal((await websiteHistory(options)).currentRevision.title,'Home 사진 수정');assert.ok(trees>treeCount);
 options.current=c;assert.equal((await websiteHistory(options)).current,c,'foundation-only HEAD changes must not reuse an older HEAD');
 nodes=[record(d,[]),...nodes];options.current=d;
 const changed=await websiteHistory(options);assert.equal(changed.currentRevision.kind,'direct');assert.equal(changed.currentRevision.version,2);assert.equal(changed.revisions.length,2);
 const beforeForced=graphs;await websiteHistory({...options,refresh:true});assert.equal(graphs,beforeForced+websitePaths.length,'explicit repair bypasses snapshots');
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM website_versions').get().n,2);
 assert.equal(db.sqlite.prepare("SELECT count(*) n FROM github_catalog WHERE kind LIKE '%website-history-v2:%'").get().n,1,'one bounded snapshot per environment and base');
 const other=await websiteHistory({...options,cache:'preview:',base:'codex/admin-sandbox',pulls:[]});assert.equal(other.current,d);assert.equal(db.sqlite.prepare("SELECT count(*) n FROM github_catalog WHERE kind LIKE '%website-history-v2:%'").get().n,2);
 db.sqlite.close();
});

test('failed and unresolved history never become reusable completed snapshots',async()=>{
 const db=database(),a='a'.repeat(40),b='b'.repeat(40);let fail=true,graphs=0;
 const options={db,cache:'retry:',base:'main',current:a,pulls:[],graphql:async(q,v)=>{graphs++;if(fail)throw Error('temporary');return {repository:{object:{history:{nodes:v.path==='src/content'?[{oid:b,messageHeadline:'old',committedDate:'2026-11-11T12:00:00Z',associatedPullRequests:{pageInfo:{hasNextPage:false},nodes:[]}}]:[],pageInfo:{hasNextPage:false}}}}};},tree:async sha=>({tree:[{path:'src/content/home.js',mode:'100644',type:'blob',sha}]})};
 await assert.rejects(websiteHistory(options),/temporary/);fail=false;
 assert.equal((await websiteHistory(options)).currentRevision.kind,'snapshot');
 assert.equal(db.sqlite.prepare("SELECT count(*) n FROM github_catalog WHERE kind LIKE '%website-history-v2:%'").get().n,0);
 const previous=graphs;await websiteHistory(options);assert.ok(graphs>previous,'unresolved history must still attempt repair');
 db.sqlite.close();
});
