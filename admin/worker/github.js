import {rollbackScope,websiteRestore,websiteSignature,websiteEntries,foundationChanges} from '../shared/website-policy.js';
import {websiteHistory} from './website-history.js';
import {attachVersions} from './website-versions.js';
import {normalizeRequest,requestBody} from '../shared/request-form.js';
import {ATTACHMENT_BRANCH} from '../shared/images.js';
import {issueType,branchRequest,runIdentity,matchesRequestRun} from '../shared/github-sync.js';
import {deployment} from '../shared/deployment.js';
import {changedAreas,relatedRequest} from '../shared/version.js';
import {readCatalog,saveCatalog,invalidateCatalog,allReads} from './github-catalog.js';
import {previewStatus} from './preview.js';
import nacl from 'tweetnacl';
import {blake2b} from '@noble/hashes/blake2.js';
import {installationAuth} from './github-auth.js';

export const REPOSITORY = 'MNG-lab/mng-homepage';
export const TEST_BASE = 'codex/admin-sandbox';
export const WORKFLOW_REF = 'codex/admin-portal';
export const TEST_LABEL = 'admin-preview';
const API = 'https://api.github.com';
const siteFilesAllowed=files=>files.length<100&&rollbackScope(files).allowed;
const permissions = {contents:'write',issues:'write',pull_requests:'write',actions:'write'};

export class GitHubError extends Error {
  constructor(message, status=502) { super(message); this.status=status; }
}
export function assertDeploymentConfig(env) {
 const c=deployment(env);
 if(env.GITHUB_REPOSITORY!==REPOSITORY||(env.GITHUB_BASE||env.GITHUB_TEST_BASE)!==c.base||env.GITHUB_WORKFLOW_REF!==c.ref)throw new GitHubError('저장소·브랜치 설정을 확인해 주세요.',503);
 return c;
}
export function assertManagedPull(pr,expectedHead,c=deployment()) {
 const link=branchRequest(pr.head?.ref),managed=link&&(c.mode==='production'?['admin','codex'].includes(link.source):link.source==='admin-preview');
 if(pr.base?.repo?.full_name!==REPOSITORY||pr.head?.repo?.full_name!==REPOSITORY||pr.base?.ref!==c.base||(!managed&&!(c.mode==='production'&&pr.merged_at&&!expectedHead))||(expectedHead&&pr.head.sha!==expectedHead))throw new GitHubError('대상이 아니거나 변경 내용이 갱신된 PR입니다.',409);
}
export function assertManagedIssue(issue,c=deployment()) {
 if(!issueType(issue,c))throw new GitHubError('어드민 요청이 아닙니다.',404);
}
function number(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new GitHubError('올바른 요청 번호가 필요합니다.',400);
  return value;
}
export function describePulls(pulls) {
  const byId=new Map(pulls.map(p=>[p.number,p]));
  const clean=p=>(p.title||'이전 변경').replace(/^\[Admin(?: Preview)?\] /,'');
  function sourceName(p,seen=new Set()) {
    if(seen.has(p.number))return '이전 홈페이지';
    seen.add(p.number);
    const match=p.body?.match(/<!-- restore:([1-9]\d*|commit-[a-f0-9]{40}):[a-f0-9]{40} -->/);
    const source=match&&byId.get(Number(match[1]));
    return source?sourceName(source,seen):clean(p);
  }
  return pulls.map(p=>{
    const match=p.body?.match(/<!-- restore:([1-9]\d*|commit-[a-f0-9]{40}):[a-f0-9]{40} -->/);
    const target=match&&byId.get(Number(match[1]));
    const restoration=match?{key:match[1],number:match[1].startsWith('commit-')?null:Number(match[1]),name:target?sourceName(target):match[1].startsWith('commit-')?clean(p).replace(/ 상태로 복원$/,''):'이전 홈페이지',mergedAt:target?.mergedAt||null}:null;
    return {...p,restoration,displayTitle:restoration?`${restoration.name} 상태로 복원`:clean(p)};
  });
}
export function selectQualityRun(runs,pr,id,allowMergedFallback=false) {
 return runs.filter(r=>r.path==='.github/workflows/ci-quality.yml'&&r.head_sha===pr.head.sha&&(
  r.pull_requests?.some(p=>p.number===id)||
  (allowMergedFallback&&!!pr.merged_at&&r.event==='pull_request'&&r.head_branch===pr.head.ref&&r.head_repository?.full_name===REPOSITORY&&r.repository?.full_name===REPOSITORY&&!r.pull_requests?.length)
 )).sort((a,b)=>b.id-a.id)[0];
}
function isRequestRun(r,c=deployment()){return !!runIdentity(r,c);}
function runSummary(r,c=deployment()){return {id:r.id,attempt:r.run_attempt,event:r.event,createdAt:r.created_at,title:r.display_title,status:r.status,conclusion:r.conclusion,url:r.html_url,...runIdentity(r,c)};}
export async function createGitHub(env, fetcher=fetch, options={}) {
  const config=assertDeploymentConfig(env);
  const TEST_BASE=config.base,WORKFLOW_REF=config.ref;
  if (!/^\d+$/.test(env.GITHUB_APP_ID || '') || !/^\d+$/.test(env.GITHUB_INSTALLATION_ID || '') || !env.GITHUB_APP_PRIVATE_KEY) throw new GitHubError('GitHub App 연결이 필요합니다.',503);
  const authenticatedFetch=await installationAuth(env,fetcher,options.secrets?{secrets:'write'}:permissions);
  async function call(path, method='GET', body) {
    // Internal, relative repository paths only. Never accept arbitrary URLs.
    if (!path.startsWith('/') || path.split('/').some(segment=>segment==='..'||segment==='.') || path.includes('://')) throw new GitHubError('잘못된 GitHub 경로입니다.',400);
    const response=await authenticatedFetch(`${API}/repos/${REPOSITORY}${path}`,{method,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)},method==='GET');
    if (!response.ok) throw new GitHubError(response.status===409 || response.status===422 ? 'GitHub 상태가 변경되었습니다. 새로고침 후 확인해 주세요.' : 'GitHub 요청을 완료하지 못했습니다.',response.status===404?404:response.status===409||response.status===422?409:502);
    const text=await response.text();
    if(method!=='GET')await invalidateCatalog(env.DB);
    return text?JSON.parse(text):null;
  }
  const treeReads=new Map();
  let historyRead;
  async function tree(sha){
    if(!/^[a-f0-9]{40}$/.test(sha))throw new GitHubError('버전 정보를 확인해 주세요.',400);
    if(!treeReads.has(sha))treeReads.set(sha,(async()=>{const commit=await call(`/git/commits/${sha}`);return call(`/git/trees/${commit.tree.sha}?recursive=1`);})());
    return treeReads.get(sha);
  }
  async function graphql(query,variables){
    const response=await authenticatedFetch('https://api.github.com/graphql',{method:'POST',body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000),redirect:'manual'},true);
    const result=await response.json();
    if(!response.ok||result.errors||!result.data)throw new GitHubError('홈페이지 변경 기록을 불러오지 못했습니다. 다시 시도해 주세요.');
    return result.data;
  }
  return {
    async list(options={}) {
      return readCatalog(env.DB,config.cache+'issues',async(page,since)=>{
        const batch=await call(`/issues?state=all&sort=updated&direction=desc&per_page=100&page=${page}${since?'&since='+encodeURIComponent(since):''}`);
        return {items:batch.filter(issue=>{try{assertManagedIssue(issue,config);return true;}catch{return false;}}).map(i=>({number:i.number,title:i.title,body:i.body,html_url:i.html_url,state:i.state,created_at:i.created_at,updated_at:i.updated_at,...issueType(i,config)})),removed:batch.filter(issue=>{try{assertManagedIssue(issue,config);return false;}catch{return true;}}).map(i=>i.number),done:batch.length<100};
      },options);
    },
    async pulls(options={}) {
      const pulls=await readCatalog(env.DB,config.cache+'pulls',async(page,since)=>{
        const batch=await call(`/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`);
        const valid=batch.filter(p=>{try{assertManagedPull(p,undefined,config);return true;}catch{return false;}});
        return {items:valid.map(p=>({number:p.number,title:p.title,url:p.html_url,state:p.state,merged:!!p.merged_at,head:{ref:p.head.ref,sha:p.head.sha},draft:p.draft,mergedAt:p.merged_at,mergeSha:p.merge_commit_sha,body:p.body})),removed:batch.filter(p=>!valid.includes(p)).map(p=>p.number),done:batch.length<100||!!(since&&batch.at(-1)?.updated_at<since)};
      },options);
      return describePulls(pulls);
    },
    async issue(id) {const issue=await call(`/issues/${number(id)}`);assertManagedIssue(issue,config);return issue;},
    async createRequest(input,attachments=[]) {
      let value;try{value=normalizeRequest(input);}catch(e){throw new GitHubError(e.message,400);}
      if(value.kind==='rollback'&&config.mode!=='production')throw new GitHubError('변경 취소는 운영 환경에서 사용할 수 있습니다.',400);
      return call('/issues','POST',{title:`${value.kind==='rollback'?'[변경취소] ':config.title}${value.title}`,body:requestBody(value,config,attachments),labels:value.kind==='rollback'?[value.rollbackType==='latest'?'rollback-simple-request':'rollback-request']:[config.label]});
    },
    async storeAttachment({path,content,blobSha,branch}) {
      if(branch!==ATTACHMENT_BRANCH||!/^requests\/[a-f\d-]{36}\/[a-f\d-]{36}\.(png|jpg|gif|webp)$/.test(path))throw new GitHubError('잘못된 첨부 경로입니다.',400);
      for(let attempt=0;attempt<3;attempt++) {
        const head=(await call(`/git/ref/heads/${ATTACHMENT_BRANCH}`)).object.sha;
        try {
          const existing=await call(`/contents/${path}?ref=${head}`);
          if(existing.sha!==blobSha)throw new GitHubError('같은 식별자의 사진 내용이 다릅니다.',409);
          return `https://raw.githubusercontent.com/${REPOSITORY}/${head}/${path}`;
        }catch(e){if(e.status!==404)throw e;}
        try {
          const result=await call(`/contents/${path}`,'PUT',{message:'Store request attachment [skip ci]',branch:ATTACHMENT_BRANCH,content});
          return `https://raw.githubusercontent.com/${REPOSITORY}/${result.commit.sha}/${path}`;
        }catch(e){if(e.status!==409||attempt===2)throw e;}
      }
    },
    async dispatchRollback(id) {
      const issue=await this.issue(id);
      if(config.mode!=='production'||issue.state!=='open'||issueType(issue,config)?.kind!=='revert')throw new GitHubError('열린 변경 취소 요청만 실행할 수 있습니다.',409);
      return call('/actions/workflows/rollback-from-issue.yml/dispatches','POST',{ref:WORKFLOW_REF,inputs:{issue:String(number(id))}});
    },
    async automationHead() {return (await call(`/git/ref/heads/${WORKFLOW_REF}`)).object.sha;},
    async dispatchDevice(id) {
      if(!/^[0-9a-f-]{36}$/.test(id))throw new GitHubError('잘못된 연결 요청입니다.',400);
      return call('/actions/workflows/codex-comment.yml/dispatches','POST',{ref:WORKFLOW_REF,inputs:{issue:'0',device_session:id}});
    },
    async dispatch(id) {
      const issue=await this.issue(id);
      if(issue.state==='closed'||issueType(issue,config)?.kind==='revert')throw new GitHubError('이 요청은 수정 작업으로 실행할 수 없습니다.',409);
      return call('/actions/workflows/codex-comment.yml/dispatches','POST',{ref:WORKFLOW_REF,inputs:{issue:String(number(id)),...(config.mode==='production'?{admin_request:'true'}:{})}});
    },
    async pull(id) {const pr=await call(`/pulls/${number(id)}`);assertManagedPull(pr,undefined,config);return pr;},
    async current() {return (await call(`/git/ref/heads/${TEST_BASE}`)).object.sha;},
    async history(knownPulls) {
      if(!historyRead)historyRead=(async()=>{const [pulls,current]=await allReads([knownPulls||this.pulls(),this.current()]);return websiteHistory({db:env.DB,cache:config.cache,base:TEST_BASE,current,pulls,graphql,tree});})();
      return historyRead;
    },
    async versionedPulls() {
      const pulls=await this.pulls();
      if(!pulls.some(p=>p.merged))return pulls;
      return attachVersions(pulls,(await this.history(pulls)).revisions);
    },
    async versionedRevision(revision) {
      return attachVersions([revision],(await this.history()).revisions)[0];
    },
    async versionChanges(id){
      if(typeof id==='string'&&/^commit-[a-f0-9]{40}$/.test(id)){const commit=await call(`/commits/${id.slice(7)}`);return {pages:changedAreas(commit.files||[]),truncated:(commit.files||[]).length>=300};}
      const pr=await this.pull(id);
      if(!pr.merged_at)throw new GitHubError('반영된 버전만 확인할 수 있습니다.',400);
      const files=await call(`/pulls/${number(id)}/files?per_page=100`);
      return {pages:changedAreas(files),truncated:files.length===100};
    },
    async preview(head) {
      try {
        const checks=[];
        for(let page=1;page<=3;page++) {
          const batch=await call(`/commits/${head}/check-runs?per_page=100&page=${page}`);
          if(!Array.isArray(batch.check_runs))throw new Error('Invalid checks');
          checks.push(...batch.check_runs);
          if(batch.check_runs.length<100)return previewStatus(checks,head);
        }
        return {state:'unavailable',head,url:null};
      } catch {return {state:'unavailable',head,url:null};}
    },
    async detail(id) {
      const pr=await this.pull(id);
      const [files,runs,preview]=await Promise.all([call(`/pulls/${number(id)}/files?per_page=100`),call(`/actions/runs?head_sha=${pr.head.sha}&event=pull_request&per_page=100`),this.preview(pr.head.sha)]);
      const ci=selectQualityRun(runs.workflow_runs||[],pr,id,true);
      return {head:pr.head.sha,preview,canApprove:siteFilesAllowed(files),files:files.map(f=>({path:f.filename,additions:f.additions,deletions:f.deletions,patch:f.patch||null})),truncated:files.length===100,ci:ci?{status:ci.status,conclusion:ci.conclusion,url:ci.html_url}:null};
    },
    async run(id) {return call(`/actions/runs/${number(id)}`);},
    async runs(options={}) {
      // Do not add branch/event filters here: GitHub caps filtered run searches
      // at 1,000. Page the workflow itself and validate branch/event locally.
      const workflows=config.mode==='production'?['codex-comment.yml','rollback-from-issue.yml']:['codex-comment.yml'];
      const runs=(await allReads(workflows.map(workflow=>readCatalog(env.DB,config.cache+(workflow==='codex-comment.yml'?'runs':'rollback-runs'),async(page,since)=>{
        const batch=(await call(`/actions/workflows/${workflow}/runs?per_page=100&page=${page}`)).workflow_runs||[];
        return {items:batch.filter(r=>isRequestRun(r,config)).map(r=>runSummary(r,config)),done:batch.length<100||!!(since&&batch.at(-1)?.created_at<since)};
      },options)))).flat();
      const latest=new Map();
      for(const run of runs)latest.set(run.id,run);
      // Creation-date feeds do not update when an existing run finishes.
      // Refresh active runs directly, and persist their final status.
      const active=[...latest.values()].filter(r=>r.status!=='completed'),updated=[];
      for(let i=0;i<active.length;i+=4)await allReads(active.slice(i,i+4).map(async old=>{
        const fresh=await this.refreshRun(old);latest.set(old.id,fresh);if(!fresh.unavailable)updated.push(fresh);
      }));
      await this.saveRuns(updated);
      return [...latest.values()].filter(r=>r.conclusion!=='skipped').sort((a,b)=>b.id-a.id);
    },
    async saveRuns(runs){for(const kind of ['codex','rollback'])await saveCatalog(env.DB,config.cache+(kind==='rollback'?'rollback-runs':'runs'),runs.filter(r=>(r.workflow||'codex')===kind));},
    async requestRun(id) {
      const run=await this.run(id);
      if(!isRequestRun(run,config))throw new GitHubError('요청의 실행 기록을 확인할 수 없습니다.',409);
      return runSummary(run,config);
    },
    async refreshRun(old,required=false){
      try{return await this.requestRun(old.id);}
      catch(error){if(!required&&error.status===404)return {...old,unavailable:true};throw error;}
    },
    async latestRun(id,{force=false,type=null}={}) {
      const runs=await this.runs({force}),pulls=runs.some(r=>r.pullNumber)?await this.pulls():[];
      const candidates=runs.filter(r=>matchesRequestRun(r,type)&&(r.issue===number(id)||r.title===`${config.runTitle}${id}`||r.pullNumber&&relatedRequest(pulls.find(p=>p.number===r.pullNumber)||{})===id));
      // Also observes external reruns of old run IDs and their new attempt.
      for(const run of candidates){
       const fresh=await this.refreshRun(run,force);
       if(fresh.title!==run.title)throw new GitHubError('요청과 실행 기록이 일치하지 않습니다.',409);
       if(!fresh.unavailable)await this.saveRuns([fresh]);
       if(matchesRequestRun(fresh,type))return fresh;
      }
      return null;
    },
    async retry(id,claim,beforeRetry=async()=>{}) {
      const issue=await this.issue(id);
      const [pulls,run]=await allReads([this.pulls({force:true}),this.latestRun(id,{force:true,type:issueType(issue,config)})]);
      if(issue.state!=='open'||pulls.some(p=>relatedRequest(p)===id&&(p.state==='open'||p.merged))||!run||run.status!=='completed'||!['failure','cancelled','timed_out'].includes(run.conclusion))throw new GitHubError('실패가 확인된 열린 요청만 다시 실행할 수 있습니다.',409);
      if(issueType(issue,config)?.kind==='revert'&&run.workflow!=='rollback')throw new GitHubError('롤백 실행 기록을 확인할 수 없습니다.',409);
      await beforeRetry(run);
      await claim(`retry:${id}:${run.id}:${run.attempt||1}`);
      return issueType(issue,config)?.kind==='revert'?call(`/actions/runs/${run.id}/rerun`,'POST'):this.dispatch(id);
    },
    async close(id) {
      const issue=await this.issue(id);
      const pulls=(await this.pulls({force:true})).filter(p=>relatedRequest(p)===id&&p.state==='open');
      for(const pull of pulls){await this.pull(pull.number);await call(`/pulls/${pull.number}`,'PATCH',{state:'closed'});}
      if(issue.state!=='closed')await call(`/issues/${number(id)}`,'PATCH',{state:'closed',state_reason:'not_planned'});
      return {ok:true};
    },
    async revertEligibility(id) {
      const files=await call(`/pulls/${number(id)}/files?per_page=100`),scope=rollbackScope(files);
      if(files.length>=100||!scope.allowed)return {...scope,allowed:false,reason:files.length>=100?'변경 범위가 커서 자동 취소할 수 없습니다. 원하는 내용을 새 수정 요청으로 남겨 주세요.':'홈페이지와 운영 기능이 함께 수정된 요청입니다. 운영 기능을 유지하려면 원하는 내용을 새 수정 요청으로 남겨 주세요.'};
      const source=await this.pull(id),current=await this.current();
      if(!source.merged_at||!source.merge_commit_sha)throw new GitHubError('반영된 요청만 취소할 수 있습니다.',409);
      const [now,then]=await Promise.all([tree(current),tree(source.merge_commit_sha)]);
      websiteEntries(now);websiteEntries(then);
      const blocked=foundationChanges(now,then);
      return {...scope,blocked,allowed:!blocked.length,reason:blocked.length?'이후에 홈페이지의 공통 기능이 업데이트되어 이 변경을 자동으로 취소할 수 없습니다. 원하는 내용을 새 수정 요청으로 남겨 주세요.':null};
    },
    async restorePlan(id,expectedBase) {
      const direct=typeof id==='string'&&/^commit-[a-f0-9]{40}$/.test(id);
      const source=direct?await call(`/commits/${id.slice(7)}`):await this.pull(id);
      if(!direct&&(!source.merged_at||!source.merge_commit_sha))throw new GitHubError('반영된 변경만 복원 지점으로 선택할 수 있습니다.',400);
      const target=direct?id.slice(7):source.merge_commit_sha,current=await this.current();
      if(expectedBase&&current!==expectedBase)throw new GitHubError('새 변경이 반영되었습니다. 이력을 새로고침해 주세요.',409);
      const comparison=await call(`/compare/${target}...${current}`);
      if(!['ahead','identical'].includes(comparison.status))throw new GitHubError('현재 이력에 속하지 않는 복원 지점입니다.',409);
      const [baseTree,targetTree]=await Promise.all([tree(current),tree(target)]);
      const plan=websiteRestore(baseTree,targetTree);
      return {source:id,current,target,baseTree:baseTree.sha,...plan,currentContent:websiteSignature(baseTree)===websiteSignature(targetTree),title:direct?source.commit.message.split('\n')[0]:source.title,
        revision:direct?{key:id,kind:'direct',title:source.commit.message.split('\n')[0],url:source.html_url,mergeSha:target,mergedAt:source.commit.committer.date,merged:true}:null};
    },
    async restore(id,expectedBase,requestId,onIssue) {
      const plan=await this.restorePlan(id,expectedBase);
      if(!plan.restoreSafety.allowed)throw new GitHubError(plan.restoreSafety.reason,409);
      if(!plan.changes.length)throw new GitHubError('현재 홈페이지가 이미 선택한 시점과 같습니다.',409);
      const source=plan.revision||(await this.pulls()).find(p=>p.number===id);
      const name=(source?.restoration?.name||source?.displayTitle||plan.title.replace(/^\[Admin(?: Preview)?\] /,'')).slice(0,75);
      const title=`${name} 상태로 복원`;
      const issue=await this.createRequest({requestId,title,page:'Home',description:`‘${name}’ 반영 직후의 홈페이지 문구·페이지·스타일·이미지로 되돌립니다. 공통 기능과 운영 설정은 유지하며 변경 이력은 남습니다.`});
      await onIssue(issue.number);
      const tree=await call('/git/trees','POST',{base_tree:plan.baseTree,tree:plan.entries});
      const commit=await call('/git/commits','POST',{message:`Restore website snapshot from ${String(id).startsWith('commit-')?String(id).slice(7):'PR #'+id}`,tree:tree.sha,parents:[plan.current]});
      const branch=`${config.prefix}${issue.number}-${Date.now()}`;
      await call('/git/refs','POST',{ref:`refs/heads/${branch}`,sha:commit.sha});
      const pr=await call('/pulls','POST',{title:`${config.title}${title}`,head:branch,base:TEST_BASE,body:`${config.marker}\n<!-- issue:${issue.number} -->\n<!-- restore:${id}:${plan.current} -->\n\n‘${name}’ 반영 직후의 홈페이지 문구·페이지·스타일·이미지로 되돌립니다. 어드민·공통 기능·워크플로우·설정은 유지합니다.`});
      return {issue:issue.number,pull:pr.number};
    },
    async updateCodex(auth) {
      if(typeof auth!=='string'||auth.length>32000)throw new GitHubError('auth.json 파일을 확인해 주세요.',400);
      let parsed;try{parsed=JSON.parse(auth);}catch{throw new GitHubError('올바른 JSON 파일이 아닙니다.',400);}
      if(!parsed||(!parsed.OPENAI_API_KEY&&!(parsed.tokens?.access_token&&parsed.tokens?.refresh_token)))throw new GitHubError('Codex 인증 파일 형식이 아닙니다.',400);
      const key=await call('/actions/secrets/public-key');
      const recipient=Uint8Array.from(atob(key.key),c=>c.charCodeAt(0));
      const secret=crypto.getRandomValues(new Uint8Array(32));
      const ephemeral=nacl.box.keyPair.fromSecretKey(secret);
      const nonce=blake2b(new Uint8Array([...ephemeral.publicKey,...recipient]),{dkLen:24});
      const message=new TextEncoder().encode(auth);
      try {
        const ciphertext=nacl.box(message,nonce,recipient,ephemeral.secretKey);
        const sealed=new Uint8Array([...ephemeral.publicKey,...ciphertext]);
        await call('/actions/secrets/'+config.secret,'PUT',{key_id:key.key_id,encrypted_value:btoa(String.fromCharCode(...sealed))});
      } finally {secret.fill(0);ephemeral.secretKey.fill(0);message.fill(0);}
    },
    async merge(id, expectedHead) {
      if(!/^[a-f0-9]{40}$/.test(expectedHead || '')) throw new GitHubError('확인한 커밋 정보가 필요합니다.',400);
      const pr=await this.pull(id);assertManagedPull(pr,expectedHead,config);
      if((await this.issue(relatedRequest(pr))).state==='closed')throw new GitHubError('종료된 요청입니다. GitHub에서 요청 상태를 확인해 주세요.',409);
      if(pr.state!=='open' || pr.draft || pr.mergeable!==true) throw new GitHubError('지금 반영할 수 없는 PR입니다.',409);
      const runs=await call(`/actions/runs?head_sha=${expectedHead}&event=pull_request&per_page=100`);
      const quality=(runs.workflow_runs || []).filter(run=>run.path==='.github/workflows/ci-quality.yml' && run.head_sha===expectedHead && run.pull_requests?.some(p=>p.number===id)).sort((a,b)=>b.id-a.id)[0];
      if(!quality || quality.status!=='completed' || quality.conclusion!=='success') throw new GitHubError('현재 변경에 대한 CI 검증이 통과해야 반영할 수 있습니다.',409);
      // Reject infrastructure changes, including PRs created outside the admin UI.
      const files=await call(`/pulls/${number(id)}/files?per_page=100`);
      if(!siteFilesAllowed(files))throw new GitHubError('홈페이지 범위를 벗어나는 변경은 반영할 수 없습니다.',409);
      const restore=pr.body?.match(/<!-- restore:((?:[1-9]\d*|commit-[a-f0-9]{40})):([a-f0-9]{40}) -->/);
      let result;
      if(restore) {
        const plan=await this.restorePlan(restore[1].startsWith('commit-')?restore[1]:Number(restore[1]),restore[2]);
        if(!plan.restoreSafety.allowed)throw new GitHubError(plan.restoreSafety.reason,409);
        const tree=await call('/git/trees','POST',{base_tree:plan.baseTree,tree:plan.entries});
        const head=await call(`/git/commits/${expectedHead}`);
        if(head.tree.sha!==tree.sha)throw new GitHubError('복원 내용이 변경되었습니다. 다시 준비해 주세요.',409);
        const merged=await call('/git/commits','POST',{message:`Merge restore PR #${id}`,tree:tree.sha,parents:[plan.current,expectedHead]});
        // Non-forced fast-forward rejects a concurrent deployment after the base check.
        await call(`/git/refs/heads/${TEST_BASE}`,'PATCH',{sha:merged.sha,force:false});
        result={merged:true,sha:merged.sha};
      } else {
        if(branchRequest(pr.head.ref)?.kind==='revert'){
          const current=await this.current(),comparison=await call(`/compare/${current}...${expectedHead}`);
          const [now,ancestor,head]=await Promise.all([tree(current),tree(comparison.merge_base_commit.sha),tree(expectedHead)]);
          websiteEntries(head);
          if(foundationChanges(now,ancestor).length)throw new GitHubError('공통 기능이 업데이트되었습니다. 최신 상태에서 되돌리기를 다시 준비해 주세요.',409);
        }
        result=await call(`/pulls/${number(id)}/merge`,'PUT',{sha:expectedHead,merge_method:'merge'});
      }
      if(result.merged) {
        const issue=relatedRequest(pr);
        try {await this.issue(issue);await call(`/issues/${issue}`,'PATCH',{state:'closed',state_reason:'completed'});}catch{result.warning='변경은 반영됐지만 원본 요청 종료에 실패했습니다. 요청 목록에서 종료해 주세요.';}
      }
      return result;
    },
  };
}
