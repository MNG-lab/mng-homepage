import test from 'node:test';
import assert from 'node:assert/strict';
import {isWebsitePath,rollbackScope,websiteSignature,websiteEntries,websiteRestore} from '../shared/website-policy.js';
import {websiteHistory} from '../worker/website-history.js';
import {database} from './d1.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const entry=(path,sha)=>({path,sha,mode:'100644',type:'blob'});
const snapshot=(content,core='core',admin='admin')=>({tree:[entry('src/content/home-content.js',content),entry('src/App.jsx',core),entry('admin/src/main.jsx',admin),entry('.github/workflows/build.yml',admin)]});
test('allowlist excludes infrastructure, shared FE foundations, traversal and cross-boundary renames',()=>{
 for(const path of ['src/content/a.js','src/pages/HomePage.jsx','src/styles/a11y.css','public/media/a.png'])assert.equal(isWebsitePath(path),true,path);
 for(const path of ['src/App.jsx','src/main.jsx','src/config/site-routes.js','src/context/LanguageContext.jsx','src/hooks/useViewport.js','src/utils/a.js','src/components/SeoManager.jsx','index.html','public/robots.txt','admin/a.js','.github/workflows/a.yml','scripts/a.js','package.json','package-lock.json','.nvmrc','src/pages/../App.jsx'])assert.equal(isWebsitePath(path),false,path);
 assert.equal(rollbackScope([{filename:'src/pages/a.jsx',previous_filename:'src/App.jsx'}]).allowed,false);
 assert.equal(rollbackScope([{filename:'src/pages/a.jsx'},{filename:'.github/a.yml'}]).allowed,false);
 assert.throws(()=>websiteEntries({truncated:true,tree:[]}));
 assert.throws(()=>websiteEntries({tree:[{...entry('public/media/link','x'),mode:'120000'}]}));
});
test('snapshot restores only allowed additions/deletions; latest admin and workflow code are retained',()=>{
 const current=snapshot('new','same-core','new-admin'),target=snapshot('old','same-core','old-admin');
 current.tree.push(entry('public/media/new.png','new'));target.tree.push(entry('public/media/old.png','old'));
 const plan=websiteRestore(current,target);assert.equal(plan.restoreSafety.allowed,true);
 assert.deepEqual(plan.entries.map(e=>[e.path,e.sha]),[['public/media/new.png',null],['src/content/home-content.js','old'],['public/media/old.png','old']]);
 assert.equal(websiteSignature(snapshot('same','old-core','old-admin')),websiteSignature(snapshot('same','new-core','new-admin')));
 const blocked=websiteRestore(snapshot('new','new-core'),snapshot('old','old-core'));assert.equal(blocked.restoreSafety.allowed,false);assert.deepEqual(blocked.restoreSafety.blocked,['src/App.jsx']);
 assert.equal(websiteRestore(snapshot('same','new-core'),snapshot('same','old-core')).changes.length,0);
 const before=snapshot('old'),after=snapshot('new');after.tree.push(entry('src/config/website-compatibility.js','checkpoint'));
 assert.equal(websiteRestore(after,before).restoreSafety.allowed,false,'checkpoint protects older page-level foundation fixes');
});
test('result migration preserves old records, identity and constraints',()=>{
 const db=new DatabaseSync(':memory:');
 for(const name of ['0004_request_recovery.sql','0009_rollback_failures.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const row=['1',1,83,'a'.repeat(40),'failed',123,'rollback_conflict'];
 db.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?,?)').run(...row);
 const before=db.prepare('SELECT * FROM request_run_results').get();
 db.exec(readFileSync(new URL('../migrations/0010_rollback_protection.sql',import.meta.url),'utf8'));
 assert.deepEqual(db.prepare('SELECT * FROM request_run_results').get(),before);
 assert.throws(()=>db.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?,?)').run(...row));
 db.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?,?)').run('2',1,84,row[3],'failed',124,'rollback_protected');
 assert.throws(()=>db.prepare('INSERT INTO request_run_results VALUES (?,?,?,?,?,?,?)').run('3',1,85,row[3],'failed',125,'unknown'));
 db.close();
});
test('history identifies content independently of main HEAD and includes direct changes without fake PR numbers',async()=>{
 const db=database(),pr={number:85,title:'Home 이미지 추가',url:'https://github.com/MNG-lab/mng-homepage/pull/85',mergedAt:'2026-11-11T12:09:09Z',mergeCommit:{oid:'b'.repeat(40)},baseRefName:'main',baseRepository:{nameWithOwner:'MNG-lab/mng-homepage'},headRefName:'codex/issue-83-42'};
 const record=(oid,date,pull)=>({oid,messageHeadline:'Home 직접 수정',committedDate:date,url:'https://github.com/MNG-lab/mng-homepage/commit/'+oid,associatedPullRequests:{pageInfo:{hasNextPage:false},nodes:pull?[pull]:[]}});
 const nodes=[record('a'.repeat(40),'2026-11-11T12:00:00Z',pr)],trees=new Map([['c'.repeat(40),snapshot('same','new-core','new-admin')],['b'.repeat(40),snapshot('same','old-core','old-admin')]]);let calls=0;
 const options={db,cache:'test:',base:'main',current:'c'.repeat(40),pulls:[],graphql:async(q,vars)=>{calls++;assert.equal(vars.since,null,'old commits merged today must not be missed');return {repository:{object:{history:{nodes:vars.path==='src/content'?nodes:[],pageInfo:{hasNextPage:false}}}}};},tree:async sha=>trees.get(sha)};
 let history=await websiteHistory(options);assert.equal(history.currentRevision.number,85);assert.equal(history.currentRevision.version,1);assert.equal(history.currentRevision.requestId,83);assert.equal(history.revisions.length,1);
 const previous=calls;await websiteHistory(options);assert.equal(calls,previous,'reuse read cache');
 db.sqlite.prepare('UPDATE github_catalog_sync SET checked_at=0').run();await websiteHistory(options);assert.equal(calls,previous,'a completed unchanged HEAD does not reimport its full history');
 nodes.unshift(record('d'.repeat(40),'2026-11-12T12:00:00Z'));trees.set('d'.repeat(40),snapshot('direct'));options.current='d'.repeat(40);
 history=await websiteHistory(options);assert.equal(history.currentRevision.kind,'direct');assert.equal(history.currentRevision.version,2);assert.equal(history.currentRevision.number,undefined);assert.equal(history.revisions.length,2);
 nodes.at(-1).associatedPullRequests.nodes[0]={...pr,mergedAt:null,mergeCommit:null};
 const known={number:85,title:pr.title,merged:true,mergedAt:pr.mergedAt,mergeSha:pr.mergeCommit.oid,head:{ref:pr.headRefName}};
 history=await websiteHistory({...options,db:database(),pulls:[known]});
 assert.equal(history.revisions.find(r=>r.number===85).version,1,'known merged PR metadata repairs an older cached association');
 assert.equal(history.revisions.length,2);
});
test('history follows cursor pages and retains commits beyond the first hundred',async()=>{
 const rows=Array.from({length:101},(_,i)=>({oid:String(i+1).padStart(40,'0'),messageHeadline:'수정 '+i,committedDate:new Date(1700000000000+i*1000).toISOString(),url:'https://example.test',associatedPullRequests:{pageInfo:{hasNextPage:false},nodes:[]}}));
 const graphql=async(q,v)=>{
  const history=v.path==='src/content'?{nodes:v.after?rows.slice(100):rows.slice(0,100),pageInfo:{hasNextPage:!v.after,endCursor:'next'}}:{nodes:[],pageInfo:{hasNextPage:false}};
  return {repository:{object:{history}}};
 };
 const result=await websiteHistory({db:database(),cache:'pages:',base:'main',current:'a'.repeat(40),pulls:[],tree:async()=>snapshot('same'),graphql});
 assert.equal(result.revisions.length,101);
});
