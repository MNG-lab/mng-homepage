import {execFileSync} from 'node:child_process';
import {writeFileSync,appendFileSync} from 'node:fs';
import {requestFailure} from '../shared/request-failure.js';
import {join} from 'node:path';
import {parseRollback} from '../shared/rollback.js';
import {branchRequest} from '../shared/github-sync.js';
const repo='MNG-lab/mng-homepage',id=process.env.REQUEST_ISSUE;
if(process.env.GITHUB_REPOSITORY!==repo||process.env.GITHUB_REF!=='refs/heads/main'||!/^\d+$/.test(id||'')||Number(id)<1)throw Error('Invalid rollback invocation');
const run=(command,args,options={})=>execFileSync(command,args,{encoding:'utf8',...options}).trim();
const git=(...args)=>run('git',args),gh=(...args)=>run('gh',args);
const api=path=>JSON.parse(gh('api',`repos/${repo}/${path}`));
const issue=api(`issues/${id}`),bot=`${process.env.BOT_SLUG}[bot]`;
if(issue.pull_request||issue.state!=='open')throw Error('열린 이슈만 처리할 수 있습니다.');
const admin=issue.user?.login===bot&&issue.body?.startsWith('<!-- mng-admin:v1 -->\n');
if(!(process.env.GITHUB_EVENT_NAME==='workflow_dispatch'&&admin)&&!['COLLABORATOR','CONTRIBUTOR','MEMBER','OWNER'].includes(issue.author_association))throw Error('요청 작성 권한을 확인하지 못했습니다.');
const existing=()=>api('pulls?state=open&base=main&per_page=100').find(p=>branchRequest(p.head?.ref)?.issue===Number(id));
try {
  const open=existing();if(open){console.log(`Existing review PR: ${open.html_url}`);process.exit(0);}
  const request=parseRollback(issue),base=git('rev-parse','HEAD');
  let sha,reference;
  const comments=[];for(let page=1;;page++){const rows=api(`issues/${id}/comments?per_page=100&page=${page}`);comments.push(...rows);if(rows.length<100)break;}
  const pinned=comments.find(comment=>comment.user?.login===bot&&/^<!-- mng-rollback-target:[a-f\d]{40} -->/.test(comment.body||''))?.body.match(/^<!-- mng-rollback-target:([a-f\d]{40}) -->/)[1];
  if(request.type==='latest'){sha=base;reference=`직전 변경 ${sha.slice(0,7)}`;}
  else if(request.type==='pr'){
    const number=request.target.replace(/^#/,'');const pr=api(`pulls/${number}`);
    if(!pr.merged_at||!pr.merge_commit_sha||pr.base?.ref!=='main'||pr.base?.repo?.full_name!==repo)throw Error('main에 반영된 PR을 지정해 주세요.');
    sha=pr.merge_commit_sha;reference=`PR #${number}`;
  }else{sha=git('rev-parse','--verify',`${request.target}^{commit}`);reference=`커밋 ${sha.slice(0,7)}`;}
  if(pinned){sha=pinned;reference=`취소 대상 커밋 ${sha.slice(0,7)}`;}
  if(!/^[a-f\d]{40}$/.test(sha))throw Error('취소할 커밋을 확인하지 못했습니다.');
  try{git('merge-base','--is-ancestor',sha,base);}catch{throw Error('현재 main 이력에 포함된 변경만 취소할 수 있습니다.');}
  if(!pinned)gh('issue','comment',id,'--repo',repo,'--body',`<!-- mng-rollback-target:${sha} -->\n이번 요청의 취소 대상 커밋: ${sha}\n재실행해도 이 변경을 대상으로 합니다.`);
  const parents=git('rev-list','--parents','-n','1',sha).split(' ').length-1;
  const branch=`codex/rollback-issue-${id}-${process.env.GITHUB_RUN_ID}`;
  if(!/^codex\/rollback-issue-\d+-\d+$/.test(branch))throw Error('잘못된 작업 브랜치입니다.');
  const published=git('ls-remote','--heads','origin',`refs/heads/${branch}`).split(/\s+/)[0];
  if(published){
    if(!/^[a-f\d]{40}$/.test(published))throw Error('기존 작업 브랜치를 확인하지 못했습니다.');
    git('fetch','origin',published);
    const message=git('show','-s','--format=%B',published);
    if(!message.includes(`MNG-Rollback-Target: ${sha}`)||!message.includes(`request #${id}`))throw Error('기존 브랜치가 다른 작업의 결과입니다. 개발 담당자가 확인해 주세요.');
  } else {
  git('checkout','-b',branch);
  try{git('revert',...(parents>1?['-m','1']:[]),'--no-commit',sha);}catch(error){
    // Git's unmerged index, not stderr text, distinguishes a content conflict.
    let conflict=false;try{conflict=!!git('ls-files','--unmerged');}catch{}
    try{git('revert','--abort');}catch{}
    if(conflict)throw Object.assign(Error(requestFailure('rollback_conflict').title),{failureCode:'rollback_conflict'});
    throw error;
  }
  if(!git('status','--porcelain'))throw Object.assign(Error(requestFailure('rollback_no_changes').title),{failureCode:'rollback_no_changes'});
  const botId=JSON.parse(gh('api',`users/${bot}`)).id;
  const env={...process.env,GIT_AUTHOR_NAME:bot,GIT_AUTHOR_EMAIL:`${botId}+${bot}@users.noreply.github.com`,GIT_COMMITTER_NAME:bot,GIT_COMMITTER_EMAIL:`${botId}+${bot}@users.noreply.github.com`};
  run('git',['commit','-m',`revert: ${reference} (request #${id})\n\nMNG-Rollback-Target: ${sha}`],{env});
  }
  if(api(`issues/${id}`).state!=='open'||existing())throw Error('요청이 종료되었거나 검토할 PR이 이미 있습니다.');
  if(!published)run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','origin',`HEAD:refs/heads/${branch}`]);
  const body=join(process.env.RUNNER_TEMP,'rollback-review.md');
  writeFileSync(body,`<!-- issue:${id} -->\n\nCloses #${id}\n\n## 변경 취소\n- 대상: ${reference}\n- 원본 커밋: ${sha}\n\n## 사유\n${request.reason}\n\n## 확인할 내용\n${request.expected}\n\n승인 전 미리보기와 검사를 확인해 주세요. 이 PR은 자동으로 병합하지 않습니다.\n`);
  const url=gh('pr','create','--repo',repo,'--base','main','--head',branch,'--title',`[변경취소] ${reference} — 요청 #${id}`,'--body-file',body);
  gh('issue','comment',id,'--repo',repo,'--body',`변경 취소 PR을 만들었습니다: ${url}`);
  console.log(url);
}catch(error){
  const failure=requestFailure(error.failureCode);
  if(failure&&process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`failure_code=${error.failureCode}\n`);
  const message=failure?`${failure.title}\n\n${failure.description}\n이 요청으로 홈페이지가 변경되지는 않았습니다.\n\n${failure.next}\n같은 요청을 다시 실행해도 해결되지 않습니다.`:`변경 취소 작업을 완료하지 못했습니다. 실행 기록에서 원인을 확인해 주세요.\n\n${error.message.slice(0,1000)}`;
  try{gh('issue','comment',id,'--repo',repo,'--body',message);}catch{}
  throw error;
}
