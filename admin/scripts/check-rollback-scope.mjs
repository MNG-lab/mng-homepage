// Runs only code checked out from the trusted base, never code from the PR.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {rollbackScope,websiteEntries,foundationChanges} from '../shared/website-policy.js';
import {branchRequest} from '../shared/github-sync.js';
const pr=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')).pull_request;
const repo='MNG-lab/mng-homepage';
if(pr?.base?.repo?.full_name!==repo||pr.base.ref!=='main')throw Error('Unexpected repository');
const rollback=branchRequest(pr.head.ref)?.kind==='revert'||/<!-- restore:/.test(pr.body||'');
if(!rollback){console.log('Not a rollback PR.');process.exit(0);}
if(pr.head.repo?.full_name!==repo)throw Error('Rollback must stay in this repository.');
const api=path=>JSON.parse(execFileSync('gh',['api',`repos/${repo}/${path}`],{encoding:'utf8'}));
const files=[];
for(let page=1;;page++){const batch=api(`pulls/${pr.number}/files?per_page=100&page=${page}`);files.push(...batch);if(batch.length<100)break;}
const scope=rollbackScope(files);
if(!scope.allowed)throw Error('운영 기능을 변경하는 되돌리기는 반영할 수 없습니다: '+scope.blocked.join(', '));
const tree=sha=>{const commit=api(`git/commits/${sha}`);return api(`git/trees/${commit.tree.sha}?recursive=1`);};
const comparison=api(`compare/${pr.base.sha}...${pr.head.sha}`);
const [base,ancestor,head]=[pr.base.sha,comparison.merge_base_commit.sha,pr.head.sha].map(tree);
websiteEntries(base);websiteEntries(ancestor);websiteEntries(head);
if(foundationChanges(base,ancestor).length)throw Error('공통 기능이 업데이트되었습니다. 최신 상태에서 되돌리기를 다시 준비해 주세요.');
console.log('Rollback changes only permitted website files.');
