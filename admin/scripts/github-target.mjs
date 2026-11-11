import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {branchRequest} from '../shared/github-sync.js';
const repo='MNG-lab/mng-homepage',kind=process.env.TARGET_KIND,id=Number(process.env.NUMBER);
if(process.env.GITHUB_REPOSITORY!==repo||!Number.isSafeInteger(id)||id<1)throw Error('Invalid request');
const gh=(...args)=>execFileSync('gh',args,{encoding:'utf8'}).trim();
const git=(...args)=>execFileSync('git',args,{stdio:'inherit'});
const current=JSON.parse(gh('api',`repos/${repo}/${kind==='pr'?'pulls':'issues'}/${id}`));
if(current.state!=='open')throw Error('The request or PR was closed; no changes will be published');
if(kind==='pr'){
 if(current.base.ref!=='main'||current.base.repo.full_name!==repo||current.head.repo.full_name!==repo)throw Error('Only same-repository main PRs are supported');
 const source=branchRequest(current.head.ref)?.issue;
 if(source&&JSON.parse(gh('api',`repos/${repo}/issues/${source}`)).state!=='open')throw Error('The source issue was closed');
}else if(process.argv[2]!=='check'){
 const prs=JSON.parse(gh('api','--paginate','--slurp',`repos/${repo}/pulls?state=open&base=main&per_page=100`)).flat().filter(p=>p.head.repo.full_name===repo&&branchRequest(p.head.ref)?.issue===id);
 if(prs.length>1)throw Error('Multiple open PRs exist; comment on the intended PR instead');
 if(prs.length){const pr=prs[0];git('fetch','origin',`${pr.head.ref}:${pr.head.ref}`);git('checkout',pr.head.ref);appendFileSync(process.env.GITHUB_ENV,`TARGET_KIND=pr\nPR_NUMBER=${pr.number}\nNUMBER=${pr.number}\nTARGET_REF=${pr.head.ref}\n`);}
}
