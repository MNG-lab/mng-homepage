import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../scripts/rollback-job.mjs',import.meta.url));
const identity={...process.env,GIT_AUTHOR_NAME:'chominho96',GIT_AUTHOR_EMAIL:'chominho96@naver.com',GIT_COMMITTER_NAME:'chominho96',GIT_COMMITTER_EMAIL:'chominho96@naver.com'};
function fixture(type) {
 const root=mkdtempSync(join(tmpdir(),'mng-rollback-')),site=join(root,'site'),remote=join(root,'origin.git'),bin=join(root,'bin');mkdirSync(site);mkdirSync(bin);
 const git=(...args)=>execFileSync('git',args,{cwd:site,env:identity,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','--bare',remote);git('init','-b','main');git('remote','add','origin',remote);
 const commit=(name,value)=>{writeFileSync(join(site,name),value);git('add',name);git('commit','-m',name);return git('rev-parse','HEAD');};
 commit('base.txt','base');const first=commit('first.txt','first'),second=commit('second.txt','second');git('push','origin','main');
 const body=type==='latest'?'### 롤백 사유\n\nrestore':`### 롤백 유형\n\n${type}\n\n### 롤백 대상\n\n${type==='pr'?'85':first}\n\n### 롤백 사유\n\nrestore`;
 const state=join(root,'state.json');writeFileSync(state,JSON.stringify({issue:{number:91,state:'open',body,user:{login:'chominho96'},author_association:'OWNER',labels:[{name:type==='latest'?'rollback-simple-request':'rollback-request'}]},comments:[],pulls:[],first,created:0,failPR:false}));
 writeFileSync(join(bin,'gh'),`#!/usr/bin/env node
const fs=require('fs'),args=process.argv.slice(2),file=process.env.ROLLBACK_TEST_STATE,state=JSON.parse(fs.readFileSync(file));
function save(){fs.writeFileSync(file,JSON.stringify(state));}
if(args[0]==='api'){
 const p=args[1];let value;
 if(p.endsWith('/issues/91'))value=state.issue;
 else if(p.includes('/issues/91/comments?'))value=state.comments;
 else if(p.includes('/pulls?'))value=state.pulls;
 else if(p.endsWith('/pulls/85'))value={merged_at:'2026-11-10',merge_commit_sha:state.first,base:{ref:'main',repo:{full_name:'MNG-lab/mng-homepage'}}};
 else if(p.startsWith('users/'))value={id:123};
 else throw Error('Unexpected API '+p);
 console.log(JSON.stringify(value));
}else if(args[0]==='issue'&&args[1]==='comment'){
 state.comments.push({user:{login:'mng-ai-code-bot[bot]'},body:args[args.indexOf('--body')+1]});save();
}else if(args[0]==='pr'&&args[1]==='create'){
 if(state.failPR){state.failPR=false;save();process.exit(1);}
 state.created++;state.body=fs.readFileSync(args[args.indexOf('--body-file')+1],'utf8');save();console.log('https://github.com/MNG-lab/mng-homepage/pull/92');
}else throw Error('Unexpected command '+args.join(' '));
`);execFileSync('chmod',['+x',join(bin,'gh')]);
 const output=join(root,'step-output');writeFileSync(output,'');
 const env={...identity,GITHUB_OUTPUT:output,PATH:bin+':'+process.env.PATH,GITHUB_REPOSITORY:'MNG-lab/mng-homepage',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'issues',REQUEST_ISSUE:'91',GITHUB_RUN_ID:'100',BOT_SLUG:'mng-ai-code-bot',RUNNER_TEMP:root,ROLLBACK_TEST_STATE:state};
 return {root,site,remote,git,first,second,state,commit,output,execute:()=>execFileSync(process.execPath,[script],{cwd:site,env,stdio:'pipe'}),read:()=>JSON.parse(readFileSync(state))};
}
test('all rollback modes create a review branch and keep main unchanged',()=>{
 for(const type of ['latest','pr','commit']){
  const f=fixture(type);try{
   f.execute();assert.equal(f.git('rev-parse','main'),f.second);assert.equal(f.git('rev-parse','origin/main'),f.second);
   const tree=f.git('ls-tree','--name-only','HEAD');assert.ok(tree.includes(type==='latest'?'first.txt':'second.txt'));assert.ok(!tree.includes(type==='latest'?'second.txt':'first.txt'));
   assert.equal(f.read().created,1);assert.match(f.read().body,/Closes #91/);assert.match(f.read().comments[0].body,/mng-rollback-target:/);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 }
});
test('retry after a pushed branch keeps the original target and recovers PR creation',()=>{
 const f=fixture('latest');try{
  writeFileSync(f.state,JSON.stringify({...f.read(),failPR:true}));assert.throws(f.execute);assert.equal(readFileSync(f.output,'utf8'),'');
  const published=f.git('rev-parse','HEAD');f.git('checkout','main');f.git('branch','-D','codex/rollback-issue-91-100');const newer=f.commit('later.txt','later');f.git('push','origin','main');
  f.execute();assert.equal(f.git('rev-parse','main'),newer);assert.equal(f.git('ls-remote','--heads','origin','refs/heads/codex/rollback-issue-91-100').split(/\s/)[0],published);
  assert.equal(f.read().created,1);assert.ok(f.read().body.includes(f.second));assert.ok(!f.read().body.includes(newer));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('actual Git conflict and empty revert report different non-retryable results without a PR',()=>{
 for(const code of ['rollback_conflict','rollback_no_changes']){
  const f=fixture('pr');try{
   if(code==='rollback_conflict')f.commit('first.txt','changed later');
   else f.git('revert','--no-edit',f.first);
   f.git('push','origin','main');const base=f.git('rev-parse','main');
   assert.throws(f.execute);
   assert.equal(f.git('rev-parse','main'),base);assert.equal(f.git('rev-parse','origin/main'),base);
   assert.equal(f.git('ls-remote','--heads','origin','refs/heads/codex/rollback-issue-91-100'),'');
   assert.equal(f.git('ls-files','--unmerged'),'');assert.equal(f.read().created,0);
   assert.equal(readFileSync(f.output,'utf8'),`failure_code=${code}\n`);
   assert.match(f.read().comments.at(-1).body,/홈페이지가 변경되지는 않았습니다|현재 홈페이지는 그대로예요/);
  }finally{rmSync(f.root,{recursive:true,force:true});}
 }
});
