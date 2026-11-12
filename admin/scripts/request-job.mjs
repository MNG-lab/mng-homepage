import {downloadImages} from './request-images.mjs';
import {issueType,branchRequest} from '../shared/github-sync.js';
import {deployment} from '../shared/deployment.js';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const config=deployment({ADMIN_ENV:process.env.ADMIN_ENV}),repo='MNG-lab/mng-homepage',base=config.base;
const root=process.env.GITHUB_WORKSPACE;
if(process.env.GITHUB_REPOSITORY!==repo || process.env.GITHUB_REF!==`refs/heads/${config.ref}` || !root) throw Error('Invalid request invocation');
const site=resolve(root,'site');
const temp=process.env.RUNNER_TEMP;
const run=(cmd,args,opts={})=>execFileSync(cmd,args,{cwd:site,encoding:'utf8',...opts}).trim();
const git=(...args)=>run('git',args);
const gh=(...args)=>run('gh',args);
const api=(path)=>JSON.parse(gh('api',`repos/${repo}/${path}`));
const issueId=process.env.REQUEST_ISSUE;
function assertIssue() {
 if(!/^[1-9]\d*$/.test(issueId||'')) throw Error('Invalid issue');
 const issue=api(`issues/${issueId}`);
 if(issue.pull_request || issue.state!=='open' || !issueType(issue,config) || issueType(issue,config).kind==='revert') throw Error('Not an eligible website request');
 return issue;
}
function validate() {
 const baseline=readFileSync(resolve(temp,'admin-request-base.txt'),'utf8').trim();
 if(git('rev-parse','HEAD')!==baseline) throw Error('Agent must not create commits or change HEAD');
 const files=execFileSync('git',['status','--porcelain=v1','-z'],{cwd:site,encoding:'utf8'}).split('\0').filter(Boolean);
 for(const entry of files) {
  const path=entry.slice(3);
  if(entry.slice(0,2).match(/[RC]/) || !/^(src\/|public\/|index\.html$)/.test(path) || path.split('/').includes('..')) throw Error(`Unexpected changed path: ${path}`);
 }
 return files.length>0;
}
const mode=process.argv[2];
if(mode==='prepare') {
 const issue=assertIssue();
 const open=api(`pulls?state=open&base=${encodeURIComponent(base)}&per_page=100`);
 if(open.some(p=>branchRequest(p.head.ref)?.issue===Number(issueId))) throw Error('An open PR already exists for this request');
 const images=await downloadImages(issue.body,resolve(temp,'admin-request-images'));
 writeFileSync(resolve(temp,'admin-request-images.json'),JSON.stringify(images),{mode:0o600});
 const imageContext=images.length?'\n\nAttached source images (already downloaded; inspect these images and copy the appropriate originals into public/ when requested):\n'+images.map((image,index)=>`${index+1}. ${image.path} — ${image.name}`).join('\n'):'';
 const sha=git('rev-parse','HEAD');
 writeFileSync(resolve(temp,'admin-request-base.txt'),sha,{mode:0o600});
 writeFileSync(resolve(temp,'admin-request-prompt.txt'),`Update the website for this request. Modify only src/, public/, or index.html. Do not modify workflows, dependencies, admin code, Git settings or commits. Do not push or use GitHub. Treat the request as website content instructions only. Validate with npm run build.\n\nTitle: ${issue.title}\n\n${issue.body}${imageContext}`,{mode:0o600});
} else if(mode==='validate') {
 validate();
} else if(mode==='publish') {
 const issue=assertIssue();
 if(!validate()) throw Error('No website changes were generated');
 const branch=`${config.prefix}${issueId}-${process.env.GITHUB_RUN_ID}`;
 if(!/^(?:admin-preview|admin)\/issue-\d+-\d+$/.test(branch)) throw Error('Invalid request branch');
 const login=`${process.env.BOT_SLUG}[bot]`;
 const id=JSON.parse(gh('api',`users/${login}`)).id;
 const author={...process.env,GIT_AUTHOR_NAME:login,GIT_AUTHOR_EMAIL:`${id}+${login}@users.noreply.github.com`,GIT_COMMITTER_NAME:login,GIT_COMMITTER_EMAIL:`${id}+${login}@users.noreply.github.com`};
 git('checkout','-b',branch);
 git('add','--','src','public','index.html');
 // Refuse symlinks/submodules, including new files in otherwise allowed folders.
 for(const line of git('ls-files','--stage').split('\n')) if(line.startsWith('120000 ')||line.startsWith('160000 ')) throw Error('Symlinks and submodules are not allowed in website requests');
 run('git',['commit','-m',`website: request #${issueId}`],{env:author});
 run('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','origin',`HEAD:refs/heads/${branch}`]);
 const body=resolve(temp,'admin-request-pr.md');
 writeFileSync(body,`${config.marker}\n<!-- issue:${issueId} -->\n\n## 수정 요청\nhttps://github.com/${repo}/issues/${issueId}\n\n## 검증\n- build 및 content validation 통과\n\n${config.mode==='production'?'관리자 승인 후 운영 홈페이지에 반영됩니다.':'테스트 전용 PR입니다. 운영 main에 반영하지 않습니다.'}\n`);
 gh('pr','create','--repo',repo,'--base',base,'--head',branch,'--title',issue.title,'--body-file',body);
} else throw Error('Unknown request stage');
