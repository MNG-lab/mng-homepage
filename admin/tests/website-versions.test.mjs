import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './d1.mjs';
import {numberWebsiteVersions,attachVersions} from '../worker/website-versions.js';
import {revisionLabel,revisionMethod,versionReference,appliedVersion} from '../shared/version.js';
const sha=n=>String(n).padStart(40,'0');
const revision=(n,extra={})=>({key:String(n),number:n,mergeSha:sha(n),mergedAt:new Date(1700000000000+n*1000).toISOString(),merged:true,head:{ref:`codex/issue-${n}-1`},...extra});
test('AI, direct commits and restores share consecutive durable numbers without using PR identifiers',async()=>{
 const db=database(),first=revision(85),direct=revision(86,{number:undefined,key:'commit-'+sha(86),kind:'direct',head:null}),restore=revision(97,{restoration:{key:'85',number:85,name:'Home 이미지'}});
 let rows=await numberWebsiteVersions(db,'main',[restore,first,direct]);
 assert.deepEqual(rows.map(r=>[r.number,r.version]),[[97,3],[undefined,2],[85,1]]);
 assert.deepEqual(rows.map(revisionLabel),['버전 3','버전 2','버전 1']);
 assert.deepEqual(rows.map(revisionMethod),['되돌리기','직접 수정','AI 수정']);
 assert.equal(versionReference(rows[0].restoration),'버전 1 ‘Home 이미지’');
 assert.equal(appliedVersion({pull:rows[0]}),'버전 3');
 // Refresh/concurrent reads and a reordered feed allocate nothing new.
 await Promise.all([numberWebsiteVersions(db,'main',[first,direct,restore]),numberWebsiteVersions(db,'main',[direct,restore,first])]);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM website_versions').get().n,3);
 db.sqlite.exec('DELETE FROM github_catalog; DELETE FROM github_catalog_sync;');
 const olderAuthoredNewCommit=revision(12,{kind:'direct',number:undefined,key:'commit-'+sha(12),head:null});
 rows=await numberWebsiteVersions(db,'main',[olderAuthoredNewCommit,direct,restore,first]);
 assert.equal(rows[0].version,4);assert.equal(rows[0].mergeSha,sha(12));assert.equal(rows.at(-1).version,1);
 // A later associated PR for a known commit must keep its website number.
 const associated=revision(110,{mergeSha:direct.mergeSha});
 rows=await numberWebsiteVersions(db,'main',[first,direct,associated,restore,olderAuthoredNewCommit]);
 assert.equal(rows.filter(r=>r.mergeSha===direct.mergeSha).length,1);assert.equal(rows.find(r=>r.number===110).version,2);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM website_versions').get().n,4);
 assert.equal((await numberWebsiteVersions(db,'preview',[first]))[0].version,1);
});
test('request and restoration references use the same numbers; unmerged or unknown records never borrow PR numbers',async()=>{
 const first=revision(85,{version:1}),direct=revision(86,{key:'commit-'+sha(86),number:undefined,kind:'direct',head:null,version:2});
 const pulls=attachVersions([first,revision(97,{restoration:{key:direct.key,name:'직접 반영한 소개'}}),revision(99,{merged:false}),revision(100)], [first,direct,revision(97,{version:3})]);
 assert.equal(appliedVersion({pull:pulls[0]}),'버전 1');assert.equal(versionReference(pulls[1].restoration),'버전 2 ‘직접 반영한 소개’');
 assert.equal(appliedVersion({pull:pulls[2]}),'');assert.equal(appliedVersion({pull:pulls[3]}),'');
 assert.equal(revisionMethod(revision(10,{head:{ref:'developer/home-update'}})),'직접 수정');
 assert.equal(revisionMethod(revision(11,{head:{ref:'codex/rollback-issue-10-11'}})),'변경 취소');
 const db=database();assert.deepEqual(await numberWebsiteVersions(db,'main',[revision(2,{kind:'snapshot'})]),[]);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM website_versions').get().n,0);
});
