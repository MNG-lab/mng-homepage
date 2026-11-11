import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/github-target.mjs',import.meta.url));
test('existing PR reuse retains the source issue and refuses closed or ambiguous requests',()=>{
 const dir=mkdtempSync(join(tmpdir(),'github-target-test-'));
 try{
  writeFileSync(join(dir,'gh'),`#!${process.execPath}\nconst path=process.argv.at(-1); const repo={full_name:'MNG-lab/mng-homepage'};const pr={number:51,state:'open',base:{ref:'main',repo},head:{ref:'codex/issue-50-123',repo}};console.log(JSON.stringify(path.includes('/pulls?')?[Array.from({length:Number(process.env.PR_COUNT||1)},()=>pr)]:{number:50,state:process.env.ISSUE_STATE||'open'}));\n`,{mode:0o700});
  writeFileSync(join(dir,'git'),`#!${process.execPath}\nimport {appendFileSync} from 'node:fs';appendFileSync(process.env.GIT_CALLS,JSON.stringify(process.argv.slice(2))+'\\n');\n`,{mode:0o700});
  const env={...process.env,PATH:dir+':'+process.env.PATH,GITHUB_REPOSITORY:'MNG-lab/mng-homepage',TARGET_KIND:'issue',NUMBER:'50',GITHUB_ENV:join(dir,'environment'),GIT_CALLS:join(dir,'calls')};
  let result=spawnSync(process.execPath,[script],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const vars=Object.fromEntries(readFileSync(env.GITHUB_ENV,'utf8').trim().split('\n').map(line=>line.split('=')));
  assert.equal(vars.SOURCE_ISSUE,'50');assert.equal(vars.PR_NUMBER,'51');assert.equal(vars.NUMBER,'51');assert.equal(vars.TARGET_KIND,'pr');assert.equal(vars.TARGET_REF,'codex/issue-50-123');
  assert.deepEqual(readFileSync(env.GIT_CALLS,'utf8').trim().split('\n').map(JSON.parse),[['fetch','origin','codex/issue-50-123:codex/issue-50-123'],['checkout','codex/issue-50-123']]);
  result=spawnSync(process.execPath,[script],{env:{...env,PR_COUNT:'2'},encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/Multiple open PRs/);
  result=spawnSync(process.execPath,[script,'check'],{env:{...env,ISSUE_STATE:'closed'},encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/was closed/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
