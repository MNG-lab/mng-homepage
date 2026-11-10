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
export async function createGitHub(env, fetcher=fetch) {
  assertPreviewConfig(env);
  if (!/^\d+$/.test(env.GITHUB_APP_ID || '') || !/^\d+$/.test(env.GITHUB_INSTALLATION_ID || '') || !env.GITHUB_APP_PRIVATE_KEY) throw new GitHubError('GitHub App 연결이 필요합니다.',503);
  const privateKey=await importPKCS8(env.GITHUB_APP_PRIVATE_KEY,'RS256');
  const now=Math.floor(Date.now()/1000);
  const jwt=await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(env.GITHUB_APP_ID).setIssuedAt(now-60).setExpirationTime(now+540).sign(privateKey);
  const headers=(token)=>({'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'mng-admin-preview','Content-Type':'application/json'});
  const r=await fetcher(`${API}/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`,{method:'POST',headers:headers(jwt),body:JSON.stringify({repositories:['mng-homepage'],permissions}),redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new GitHubError('GitHub App 인증에 실패했습니다.');
  const installation=await r.json();
  if(!installation.token) throw new GitHubError('GitHub 인증 응답이 올바르지 않습니다.');
  async function call(path, method='GET', body) {
    // Internal, relative repository paths only. Never accept arbitrary URLs.
    if (!path.startsWith('/') || path.includes('..') || path.includes('://')) throw new GitHubError('잘못된 GitHub 경로입니다.',400);
    const response=await fetcher(`${API}/repos/${REPOSITORY}${path}`,{method,headers:headers(installation.token),body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new GitHubError(response.status===409 || response.status===422 ? 'GitHub 상태가 변경되었습니다. 새로고침 후 확인해 주세요.' : 'GitHub 요청을 완료하지 못했습니다.',response.status===404?404:response.status===409||response.status===422?409:502);
    return response.status===204?null:response.json();
  }
  return {
    async list() {
      // Bounded pagination; report truncation instead of silently hiding older data.
      const result=[];
      for(let page=1;page<=10;page++) {
        const batch=await call(`/issues?state=all&labels=${TEST_LABEL}&per_page=100&page=${page}`);
        for(const issue of batch) { try{assertTestIssue(issue);result.push(issue);}catch{} }
        if(batch.length<100) return result;
      }
      throw new GitHubError('조회 범위가 너무 큽니다. 기간별 조회가 필요합니다.');
    },
    async pulls() {
      const result=[];
      for(let page=1;page<=10;page++) {
        const batch=await call(`/pulls?state=all&base=${encodeURIComponent(TEST_BASE)}&per_page=100&page=${page}`);
        for(const pull of batch) {try{assertTestPull(pull);result.push(pull);}catch{}}
        if(batch.length<100) return result.map(p=>({number:p.number,title:p.title,url:p.html_url,state:p.state,merged:!!p.merged_at,head:{ref:p.head.ref,sha:p.head.sha},draft:p.draft}));
      }
      throw new GitHubError('PR 조회 범위를 초과했습니다.');
    },
    async issue(id) {const issue=await call(`/issues/${number(id)}`);assertTestIssue(issue);return issue;},
    async createRequest(input) {
      if (typeof input.title!=='string' || !input.title.trim() || input.title.length>100 || typeof input.description!=='string' || !input.description.trim() || input.description.length>5000 || !['Home','Research','Professor','Members','Publications','Gallery','Contact'].includes(input.page)) throw new GitHubError('요청 제목·페이지·내용을 확인해 주세요.',400);
      if(!/^[0-9a-f-]{36}$/.test(input.requestId || '')) throw new GitHubError('요청 식별자가 필요합니다.',400);
      // No personal email or credentials are copied into the public repository.
      return call('/issues','POST',{title:`[Admin Preview] ${input.title.trim()}`,body:`<!-- mng-admin-preview:v1 -->\n<!-- request-id:${input.requestId} -->\n\n## 테스트 대상\n${TEST_BASE}\n\n## 페이지\n${input.page}\n\n## 수정 요청\n${input.description.trim()}\n\n운영 홈페이지에 반영되지 않는 어드민 연동 테스트 요청입니다.`,labels:[TEST_LABEL]});
    },
    async dispatch(id) {
      await this.issue(id);
      return call('/actions/workflows/codex-comment.yml/dispatches','POST',{ref:WORKFLOW_REF,inputs:{issue:String(number(id))}});
    },
    async pull(id) {const pr=await call(`/pulls/${number(id)}`);assertTestPull(pr);return pr;},
    async merge(id, expectedHead) {
      if(!/^[a-f0-9]{40}$/.test(expectedHead || '')) throw new GitHubError('확인한 커밋 정보가 필요합니다.',400);
      const pr=await this.pull(id);assertTestPull(pr,expectedHead);
      if(pr.state!=='open' || pr.draft || pr.mergeable!==true) throw new GitHubError('지금 반영할 수 없는 PR입니다.',409);
      const runs=await call(`/actions/runs?head_sha=${expectedHead}&event=pull_request&per_page=100`);
      const quality=(runs.workflow_runs || []).filter(run=>run.path==='.github/workflows/ci-quality.yml' && run.head_sha===expectedHead && run.pull_requests?.some(p=>p.number===id)).sort((a,b)=>b.id-a.id)[0];
      if(!quality || quality.status!=='completed' || quality.conclusion!=='success') throw new GitHubError('현재 변경에 대한 CI 검증이 통과해야 반영할 수 있습니다.',409);
      // Never enable automatic merge or retry a changed head.
      return call(`/pulls/${number(id)}/merge`,'PUT',{sha:expectedHead,merge_method:'merge'});
    },
  };
}
