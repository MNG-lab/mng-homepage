import {readCatalog,saveCatalog,invalidateCatalog,allReads} from './github-catalog.js';
import {previewStatus} from './preview.js';
import nacl from 'tweetnacl';
import {blake2b} from '@noble/hashes/blake2.js';
import {SignJWT, importPKCS8} from 'jose';

export const REPOSITORY = 'MNG-lab/mng-homepage';
export const TEST_BASE = 'codex/admin-sandbox';
export const WORKFLOW_REF = 'codex/admin-portal';
export const TEST_LABEL = 'admin-preview';
const API = 'https://api.github.com';
const permissions = {contents:'write',issues:'write',pull_requests:'write',actions:'write'};

export class GitHubError extends Error {
  constructor(message, status=502) { super(message); this.status=status; }
}
export function assertPreviewConfig(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_TEST_BASE !== TEST_BASE || env.GITHUB_WORKFLOW_REF !== WORKFLOW_REF) {
    throw new GitHubError('테스트 저장소·브랜치 설정을 확인해 주세요.',503);
  }
}
export function assertTestPull(pr, expectedHead) {
  if (pr.base?.repo?.full_name !== REPOSITORY || pr.head?.repo?.full_name !== REPOSITORY || pr.base?.ref !== TEST_BASE || !/^admin-preview\/issue-[1-9]\d*-\d+$/.test(pr.head?.ref || '') || (expectedHead && pr.head.sha !== expectedHead)) {
    throw new GitHubError('테스트 대상이 아니거나 변경 내용이 갱신된 PR입니다.',409);
  }
}
export function assertTestIssue(issue) {
  if (issue.pull_request || !issue.labels?.some(label => label.name === TEST_LABEL) || !issue.body?.startsWith('<!-- mng-admin-preview:v1 -->\n')) {
    throw new GitHubError('어드민 테스트 요청이 아닙니다.',404);
  }
}
function number(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new GitHubError('올바른 요청 번호가 필요합니다.',400);
  return value;
}
export function describePulls(pulls) {
  const byId=new Map(pulls.map(p=>[p.number,p]));
  const clean=p=>(p.title||'이전 변경').replace(/^\[Admin Preview\] /,'');
  function sourceName(p,seen=new Set()) {
    if(seen.has(p.number))return '이전 홈페이지';
    seen.add(p.number);
    const match=p.body?.match(/<!-- restore:([1-9]\d*):[a-f0-9]{40} -->/);
    const source=match&&byId.get(Number(match[1]));
    return source?sourceName(source,seen):clean(p);
  }
  return pulls.map(p=>{
    const match=p.body?.match(/<!-- restore:([1-9]\d*):[a-f0-9]{40} -->/);
    const target=match&&byId.get(Number(match[1]));
    const restoration=match?{number:Number(match[1]),name:target?sourceName(target):'이전 홈페이지',mergedAt:target?.mergedAt||null}:null;
    return {...p,restoration,displayTitle:restoration?`${restoration.name} 상태로 복원`:clean(p)};
  });
}
export function selectQualityRun(runs,pr,id,allowMergedFallback=false) {
 return runs.filter(r=>r.path==='.github/workflows/ci-quality.yml'&&r.head_sha===pr.head.sha&&(
  r.pull_requests?.some(p=>p.number===id)||
  (allowMergedFallback&&!!pr.merged_at&&r.event==='pull_request'&&r.head_branch===pr.head.ref&&r.head_repository?.full_name===REPOSITORY&&r.repository?.full_name===REPOSITORY&&!r.pull_requests?.length)
 )).sort((a,b)=>b.id-a.id)[0];
}
function isRequestRun(r){return r.head_branch===WORKFLOW_REF&&r.event==='workflow_dispatch'&&r.path==='.github/workflows/codex-comment.yml'&&/^Admin preview #[1-9]\d*$/.test(r.display_title||'');}
function runSummary(r){return {id:r.id,attempt:r.run_attempt,createdAt:r.created_at,title:r.display_title,status:r.status,conclusion:r.conclusion,url:r.html_url};}
export async function createGitHub(env, fetcher=fetch, options={}) {
  assertPreviewConfig(env);
  if (!/^\d+$/.test(env.GITHUB_APP_ID || '') || !/^\d+$/.test(env.GITHUB_INSTALLATION_ID || '') || !env.GITHUB_APP_PRIVATE_KEY) throw new GitHubError('GitHub App 연결이 필요합니다.',503);
  const privateKey=await importPKCS8(env.GITHUB_APP_PRIVATE_KEY,'RS256');
  const now=Math.floor(Date.now()/1000);
  const jwt=await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(env.GITHUB_APP_ID).setIssuedAt(now-60).setExpirationTime(now+540).sign(privateKey);
  const headers=(token)=>({'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'mng-admin-preview','Content-Type':'application/json'});
  const r=await fetcher(`${API}/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`,{method:'POST',headers:headers(jwt),body:JSON.stringify({repositories:['mng-homepage'],permissions:options.secrets?{secrets:'write'}:permissions}),redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new GitHubError('GitHub App 인증에 실패했습니다.');
  const installation=await r.json();
  if(!installation.token) throw new GitHubError('GitHub 인증 응답이 올바르지 않습니다.');
  async function call(path, method='GET', body) {
    // Internal, relative repository paths only. Never accept arbitrary URLs.
    if (!path.startsWith('/') || path.split('/').some(segment=>segment==='..'||segment==='.') || path.includes('://')) throw new GitHubError('잘못된 GitHub 경로입니다.',400);
    const response=await fetcher(`${API}/repos/${REPOSITORY}${path}`,{method,headers:headers(installation.token),body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new GitHubError(response.status===409 || response.status===422 ? 'GitHub 상태가 변경되었습니다. 새로고침 후 확인해 주세요.' : 'GitHub 요청을 완료하지 못했습니다.',response.status===404?404:response.status===409||response.status===422?409:502);
    const text=await response.text();
    if(method!=='GET')await invalidateCatalog(env.DB);
    return text?JSON.parse(text):null;
  }
  return {
    async list(options={}) {
      return readCatalog(env.DB,'issues',async(page,since)=>{
        const batch=await call(`/issues?state=all&sort=updated&direction=desc&per_page=100&page=${page}${since?'&since='+encodeURIComponent(since):''}`);
        return {items:batch.filter(issue=>{try{assertTestIssue(issue);return true;}catch{return false;}}).map(i=>({number:i.number,title:i.title,body:i.body,html_url:i.html_url,state:i.state,created_at:i.created_at,updated_at:i.updated_at})),removed:batch.filter(issue=>{try{assertTestIssue(issue);return false;}catch{return true;}}).map(i=>i.number),done:batch.length<100};
      },options);
    },
    async pulls(options={}) {
      const pulls=await readCatalog(env.DB,'pulls',async(page,since)=>{
        const batch=await call(`/pulls?state=all&sort=updated&direction=desc&per_page=100&page=${page}`);
        const valid=batch.filter(p=>{try{assertTestPull(p);return true;}catch{return false;}});
        return {items:valid.map(p=>({number:p.number,title:p.title,url:p.html_url,state:p.state,merged:!!p.merged_at,head:{ref:p.head.ref,sha:p.head.sha},draft:p.draft,mergedAt:p.merged_at,mergeSha:p.merge_commit_sha,body:p.body})),removed:batch.filter(p=>!valid.includes(p)).map(p=>p.number),done:batch.length<100||!!(since&&batch.at(-1)?.updated_at<since)};
      },options);
      return describePulls(pulls);
    },
    async issue(id) {const issue=await call(`/issues/${number(id)}`);assertTestIssue(issue);return issue;},
    async createRequest(input) {
      if (typeof input.title!=='string' || !input.title.trim() || input.title.length>100 || typeof input.description!=='string' || !input.description.trim() || input.description.length>5000 || !['Home','Research','Professor','Members','Publications','Gallery','Contact'].includes(input.page)) throw new GitHubError('요청 제목·페이지·내용을 확인해 주세요.',400);
      if(!/^[0-9a-f-]{36}$/.test(input.requestId || '')) throw new GitHubError('요청 식별자가 필요합니다.',400);
      // No personal email or credentials are copied into the public repository.
      return call('/issues','POST',{title:`[Admin Preview] ${input.title.trim()}`,body:`<!-- mng-admin-preview:v1 -->\n<!-- request-id:${input.requestId} -->\n\n## 테스트 대상\n${TEST_BASE}\n\n## 페이지\n${input.page}\n\n## 수정 요청\n${input.description.trim()}\n\n운영 홈페이지에 반영되지 않는 어드민 연동 테스트 요청입니다.`,labels:[TEST_LABEL]});
    },
    async automationHead() {return (await call(`/git/ref/heads/${WORKFLOW_REF}`)).object.sha;},
    async dispatchDevice(id) {
      if(!/^[0-9a-f-]{36}$/.test(id))throw new GitHubError('잘못된 연결 요청입니다.',400);
      return call('/actions/workflows/codex-comment.yml/dispatches','POST',{ref:WORKFLOW_REF,inputs:{issue:'0',device_session:id}});
    },
    async dispatch(id) {
      await this.issue(id);
      return call('/actions/workflows/codex-comment.yml/dispatches','POST',{ref:WORKFLOW_REF,inputs:{issue:String(number(id))}});
    },
    async pull(id) {const pr=await call(`/pulls/${number(id)}`);assertTestPull(pr);return pr;},
    async current() {return (await call(`/git/ref/heads/${TEST_BASE}`)).object.sha;},
    async history() {
      const [pulls,current]=await allReads([this.pulls(),this.current()]);
      return {current,revisions:pulls.filter(p=>p.merged).sort((a,b)=>b.mergedAt.localeCompare(a.mergedAt))};
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
      return {head:pr.head.sha,preview,files:files.map(f=>({path:f.filename,additions:f.additions,deletions:f.deletions,patch:f.patch||null})),truncated:files.length===100,ci:ci?{status:ci.status,conclusion:ci.conclusion,url:ci.html_url}:null};
    },
    async run(id) {return call(`/actions/runs/${number(id)}`);},
    async runs(options={}) {
      // Do not add branch/event filters here: GitHub caps filtered run searches
      // at 1,000. Page the workflow itself and validate branch/event locally.
      const runs=await readCatalog(env.DB,'runs',async(page,since)=>{
        const batch=(await call(`/actions/workflows/codex-comment.yml/runs?per_page=100&page=${page}`)).workflow_runs||[];
        return {items:batch.filter(isRequestRun).map(runSummary),done:batch.length<100||!!(since&&batch.at(-1)?.created_at<since)};
      },options);
      const latest=new Map();
      for(const run of runs.sort((a,b)=>b.id-a.id))if(!latest.has(run.title))latest.set(run.title,run);
      // Creation-date feeds do not update when an existing run finishes.
      // Refresh active runs directly, and persist their final status.
      const active=[...latest.values()].filter(r=>r.status!=='completed'),updated=[];
      for(let i=0;i<active.length;i+=4)await allReads(active.slice(i,i+4).map(async old=>{
        const fresh=await this.refreshRun(old);latest.set(old.title,fresh);if(!fresh.unavailable)updated.push(fresh);
      }));
      await saveCatalog(env.DB,'runs',updated);
      return [...latest.values()].sort((a,b)=>b.id-a.id);
    },
    async requestRun(id) {
      const run=await this.run(id);
      if(!isRequestRun(run))throw new GitHubError('요청의 실행 기록을 확인할 수 없습니다.',409);
      return runSummary(run);
    },
    async refreshRun(old,required=false){
      try{return await this.requestRun(old.id);}
      catch(error){if(!required&&error.status===404)return {...old,unavailable:true};throw error;}
    },
    async latestRun(id,{force=false}={}) {
      const run=(await this.runs({force})).find(r=>r.title===`Admin preview #${number(id)}`);
      if(!run)return null;
      // Also observes external reruns of old run IDs and their new attempt.
      const fresh=await this.refreshRun(run,force);
      if(fresh.title!==run.title)throw new GitHubError('요청과 실행 기록이 일치하지 않습니다.',409);
      if(!fresh.unavailable)await saveCatalog(env.DB,'runs',[fresh]);return fresh;
    },
    async retry(id,claim,beforeRetry=async()=>{}) {
      const issue=await this.issue(id);
      const [pulls,run]=await allReads([this.pulls({force:true}),this.latestRun(id,{force:true})]);
      if(issue.state!=='open'||pulls.some(p=>p.head.ref.startsWith(`admin-preview/issue-${id}-`)&&(p.state==='open'||p.merged))||!run||run.status!=='completed'||!['failure','cancelled','timed_out'].includes(run.conclusion))throw new GitHubError('실패가 확인된 열린 요청만 다시 실행할 수 있습니다.',409);
      await beforeRetry(run);
      await claim(`retry:${id}:${run.id}:${run.attempt||1}`);
      return this.dispatch(id);
    },
    async close(id) {
      const issue=await this.issue(id);
      const pulls=(await this.pulls({force:true})).filter(p=>p.head.ref.startsWith(`admin-preview/issue-${id}-`)&&p.state==='open');
      for(const pull of pulls){await this.pull(pull.number);await call(`/pulls/${pull.number}`,'PATCH',{state:'closed'});}
      if(issue.state!=='closed')await call(`/issues/${number(id)}`,'PATCH',{state:'closed',state_reason:'not_planned'});
      return {ok:true};
    },
    async restorePlan(id,expectedBase) {
      const source=await this.pull(id);
      if(!source.merged_at||!source.merge_commit_sha)throw new GitHubError('반영된 변경만 복원 지점으로 선택할 수 있습니다.',400);
      const current=await this.current();
      if(expectedBase&&current!==expectedBase)throw new GitHubError('새 변경이 반영되었습니다. 이력을 새로고침해 주세요.',409);
      const comparison=await call(`/compare/${source.merge_commit_sha}...${current}`);
      if(!['ahead','identical'].includes(comparison.status))throw new GitHubError('현재 이력에 속하지 않는 복원 지점입니다.',409);
      const [baseCommit,targetCommit]=await Promise.all([call(`/git/commits/${current}`),call(`/git/commits/${source.merge_commit_sha}`)]);
      const [baseTree,targetTree]=await Promise.all([call(`/git/trees/${baseCommit.tree.sha}`),call(`/git/trees/${targetCommit.tree.sha}`)]);
      const site=new Set(['src','public','index.html']);
      const entries=[...baseTree.tree.filter(e=>!site.has(e.path)),...targetTree.tree.filter(e=>site.has(e.path))].map(({path,mode,type,sha})=>({path,mode,type,sha}));
      if(baseTree.truncated||targetTree.truncated)throw new GitHubError('복원 파일 정보를 모두 읽지 못했습니다.',409);
      const changes=[...site].filter(path=>baseTree.tree.find(e=>e.path===path)?.sha!==targetTree.tree.find(e=>e.path===path)?.sha);
      return {source:id,current,target:source.merge_commit_sha,entries,changes,title:source.title};
    },
    async restore(id,expectedBase,requestId,onIssue) {
      const plan=await this.restorePlan(id,expectedBase);
      if(!plan.changes.length)throw new GitHubError('현재 홈페이지가 이미 선택한 시점과 같습니다.',409);
      const source=(await this.pulls()).find(p=>p.number===id);
      const name=(source?.restoration?.name||source?.displayTitle||plan.title.replace(/^\[Admin Preview\] /,'')).slice(0,75);
      const title=`${name} 상태로 복원`;
      const issue=await this.createRequest({requestId,title,page:'Home',description:`‘${name}’ 반영 직후의 홈페이지 전체 상태로 복원합니다. 이후 변경은 현재 홈페이지에서 제외되지만 이력은 남습니다.`});
      await onIssue(issue.number);
      const tree=await call('/git/trees','POST',{tree:plan.entries});
      const commit=await call('/git/commits','POST',{message:`Restore website snapshot from PR #${id}`,tree:tree.sha,parents:[plan.current]});
      const branch=`admin-preview/issue-${issue.number}-${Date.now()}`;
      await call('/git/refs','POST',{ref:`refs/heads/${branch}`,sha:commit.sha});
      const pr=await call('/pulls','POST',{title:`[Admin Preview] ${title}`,head:branch,base:TEST_BASE,body:`<!-- mng-admin-preview:v1 -->\n<!-- issue:${issue.number} -->\n<!-- restore:${id}:${plan.current} -->\n\n‘${name}’ 반영 직후 홈페이지 전체 상태로 복원합니다. src/, public/, index.html만 복원하며 요청과 이력은 보존합니다.`});
      return {issue:issue.number,pull:pr.number};
    },
    async credentialStatus() {
      try {const secret=await call('/actions/secrets/CODEX_AUTH_JSON_PREVIEW');return {configured:true,updatedAt:secret.updated_at};}
      catch(e){if(e.status===404)return {configured:false};throw e;}
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
        await call('/actions/secrets/CODEX_AUTH_JSON_PREVIEW','PUT',{key_id:key.key_id,encrypted_value:btoa(String.fromCharCode(...sealed))});
      } finally {secret.fill(0);ephemeral.secretKey.fill(0);message.fill(0);}
    },
    async merge(id, expectedHead) {
      if(!/^[a-f0-9]{40}$/.test(expectedHead || '')) throw new GitHubError('확인한 커밋 정보가 필요합니다.',400);
      const pr=await this.pull(id);assertTestPull(pr,expectedHead);
      if(pr.state!=='open' || pr.draft || pr.mergeable!==true) throw new GitHubError('지금 반영할 수 없는 PR입니다.',409);
      const runs=await call(`/actions/runs?head_sha=${expectedHead}&event=pull_request&per_page=100`);
      const quality=(runs.workflow_runs || []).filter(run=>run.path==='.github/workflows/ci-quality.yml' && run.head_sha===expectedHead && run.pull_requests?.some(p=>p.number===id)).sort((a,b)=>b.id-a.id)[0];
      if(!quality || quality.status!=='completed' || quality.conclusion!=='success') throw new GitHubError('현재 변경에 대한 CI 검증이 통과해야 반영할 수 있습니다.',409);
      // Reject infrastructure changes, including PRs created outside the admin UI.
      const files=await call(`/pulls/${number(id)}/files?per_page=100`);
      if(!files.length||files.length>=100||files.some(f=>![f.filename,f.previous_filename].filter(Boolean).every(path=>/^(src\/|public\/|index\.html$)/.test(path))))throw new GitHubError('홈페이지 범위를 벗어나는 변경은 반영할 수 없습니다.',409);
      const restore=pr.body?.match(/<!-- restore:([1-9]\d*):([a-f0-9]{40}) -->/);
      let result;
      if(restore) {
        const plan=await this.restorePlan(Number(restore[1]),restore[2]);
        const tree=await call('/git/trees','POST',{tree:plan.entries});
        const head=await call(`/git/commits/${expectedHead}`);
        if(head.tree.sha!==tree.sha)throw new GitHubError('복원 내용이 변경되었습니다. 다시 준비해 주세요.',409);
        const merged=await call('/git/commits','POST',{message:`Merge restore PR #${id}`,tree:tree.sha,parents:[plan.current,expectedHead]});
        // Non-forced fast-forward rejects a concurrent deployment after the base check.
        await call(`/git/refs/heads/${TEST_BASE}`,'PATCH',{sha:merged.sha,force:false});
        result={merged:true,sha:merged.sha};
      } else result=await call(`/pulls/${number(id)}/merge`,'PUT',{sha:expectedHead,merge_method:'merge'});
      if(result.merged) {
        const issue=Number(pr.head.ref.match(/^admin-preview\/issue-(\d+)-/)[1]);
        try {await this.issue(issue);await call(`/issues/${issue}`,'PATCH',{state:'closed',state_reason:'completed'});}catch{result.warning='변경은 반영됐지만 원본 요청 종료에 실패했습니다. 요청 목록에서 종료해 주세요.';}
      }
      return result;
    },
  };
}
