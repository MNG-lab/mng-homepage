import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../scripts/check-rollback-scope.mjs',import.meta.url));
test('trusted PR check allows content-only rollback but rejects protected renames and later foundations',()=>{
 const root=mkdtempSync(join(tmpdir(),'mng-scope-')),bin=join(root,'bin');mkdirSync(bin);
 const fixture=join(root,'api.json'),event=join(root,'event.json');
 const pr={number:12,base:{ref:'main',sha:'base',repo:{full_name:'MNG-lab/mng-homepage'}},head:{ref:'codex/rollback-issue-11-1',sha:'head',repo:{full_name:'MNG-lab/mng-homepage'}}};
 writeFileSync(event,JSON.stringify({pull_request:pr}));
 writeFileSync(join(bin,'gh'),`#!/usr/bin/env node
 const fs=require('fs'),path=process.argv[3].replace('repos/MNG-lab/mng-homepage/',''),data=JSON.parse(fs.readFileSync(process.env.SCOPE_FIXTURE));
 if(!Object.hasOwn(data,path))throw Error('Unexpected API '+path);
 console.log(JSON.stringify(data[path]));
 `,{mode:0o755});
 const entry=(path,sha)=>({path,sha,type:'blob',mode:'100644'});
 const tree=(core,content)=>({tree:[entry('src/App.jsx',core),entry('src/content/home.js',content)]});
 const data={'pulls/12/files?per_page=100&page=1':[{filename:'src/content/home.js'}],'compare/base...head':{merge_base_commit:{sha:'ancestor'}},'git/commits/base':{tree:{sha:'base-tree'}},'git/commits/ancestor':{tree:{sha:'ancestor-tree'}},'git/commits/head':{tree:{sha:'head-tree'}},'git/trees/base-tree?recursive=1':tree('same','new'),'git/trees/ancestor-tree?recursive=1':tree('same','new'),'git/trees/head-tree?recursive=1':tree('same','old')};
 const run=changes=>{writeFileSync(fixture,JSON.stringify({...data,...changes}));return execFileSync(process.execPath,[script],{env:{...process.env,PATH:bin+':'+process.env.PATH,GITHUB_EVENT_PATH:event,SCOPE_FIXTURE:fixture},stdio:'pipe',encoding:'utf8'});};
 try{
  assert.match(run({}),/only permitted website files/);
  assert.throws(()=>run({'pulls/12/files?per_page=100&page=1':[{filename:'src/content/home.js',previous_filename:'src/App.jsx'}]}));
  assert.throws(()=>run({'git/trees/base-tree?recursive=1':tree('new-foundation','new')}));
  writeFileSync(event,JSON.stringify({pull_request:{...pr,head:{...pr.head,ref:'developer/admin-update'}}}));
  assert.match(run({}),/Not a rollback PR/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
