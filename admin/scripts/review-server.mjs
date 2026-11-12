// Local UX review only. No credentials, remote API calls, or persistent database.
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {database} from '../tests/d1.mjs';
import {requestsAPI} from '../worker/requests.js';
import {GitHubError} from '../worker/github.js';
import {normalizeRequest,requestBody,simpleFieldLabels} from '../shared/request-form.js';
import {deployment} from '../shared/deployment.js';
import {parseRollback} from '../shared/rollback.js';
import {branchRequest} from '../shared/github-sync.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),assets=resolve(root,'dist-admin-review');
const port=Number(process.env.MNG_REVIEW_PORT||4196),origin=`http://127.0.0.1:${port}`;
if(!Number.isInteger(port)||port<1024||port>65535||!existsSync(resolve(assets,'index.html')))throw Error('Build admin:build:review first');
const config=deployment({ADMIN_ENV:'production'}),DB=database(),env={DB,ADMIN_ENV:'production',APP_ORIGIN:origin,GITHUB_ENABLED:'true'};
const user={sub:'local-review-owner',email:'review@example.test',role:'owner'},repo='MNG-lab/mng-homepage';
const issues=new Map(),pulls=new Map(),images=new Map(),runs=new Map();let next=300;
const stamp=()=>new Date().toISOString(),sha=value=>createHash('sha1').update(String(value)).digest('hex');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const document=(title,body)=>`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:16px/1.8 system-ui,sans-serif;color:#24334c;background:#f5f7fb;max-width:900px;margin:48px auto;padding:0 24px}section{background:white;border:1px solid #dce4ee;border-radius:14px;padding:28px;margin:24px 0}a{color:#315e9f}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 monospace;background:#f5f7fb;padding:20px;border-radius:8px}small{color:#6c7b91}h1,h2{line-height:1.4}code{background:#edf2f8;padding:2px 5px}li{margin:8px 0}</style><a href="/requests/new">← 검토용 어드민</a><h1>${esc(title)}</h1>${body}</html>`;
function makePull(number,issue,{merged=false,kind='change'}={}){
 const body=`<!-- issue:${issue.number} -->\n\nCloses #${issue.number}`,head={ref:`${kind==='revert'?'codex/rollback':'admin'}/issue-${issue.number}-${number}`.replace('codex/rollback/','codex/rollback-'),sha:sha(number),repo:{full_name:repo}};
 return {number,title:issue.title,displayTitle:issue.title,url:`/review/external?kind=pr&id=${number}`,html_url:`/review/external?kind=pr&id=${number}`,state:merged?'closed':'open',merged,mergedAt:merged?stamp():null,merged_at:merged?stamp():null,mergeSha:merged?sha('merge'+number):null,merge_commit_sha:merged?sha('merge'+number):null,head,base:{ref:'main',repo:{full_name:repo}},draft:false,body,restoration:null};
}
for(const [id,page,title,description] of [[101,'Members','Members 소개 문구 수정','연구원 소개를 새로운 문구로 변경했습니다.'],[102,'Home','Home 연구 이미지 추가','소개문 아래에 연구 이미지 한 장을 추가했습니다.']]){
 const input=normalizeRequest({requestId:crypto.randomUUID(),title,page,description});
 const issue={number:id,title,body:requestBody(input,config),labels:[{name:'admin-request'}],state:'closed',created_at:stamp(),html_url:`/review/external?kind=issue&id=${id}`};
 issues.set(id,issue);pulls.set(id+100,makePull(id+100,issue,{merged:true}));
}
const gh={
 async list(){return [...issues.values()];},async pulls(){return [...pulls.values()];},async runs(){return [...runs.values()];},
 async issue(id){const issue=issues.get(id);if(!issue)throw new GitHubError('요청을 찾을 수 없습니다.',404);return issue;},
 async pull(id){const pull=pulls.get(id);if(!pull)throw new GitHubError('변경을 찾을 수 없습니다.',404);return pull;},
 async latestRun(id){return runs.get(id)||null;},
 async createRequest(input,attachments=[]){const value=normalizeRequest(input),number=next++,issue={number,title:value.title,body:requestBody(value,config,attachments),labels:[{name:value.kind==='rollback'?'rollback-request':'admin-request'}],state:'open',created_at:stamp(),html_url:`/review/external?kind=issue&id=${number}`};issues.set(number,issue);return issue;},
 async dispatch(id){const i=await this.issue(id),number=next++;pulls.set(number,makePull(number,i));runs.set(id,{id:number,issue:id,workflow:'codex',event:'workflow_dispatch',status:'completed',conclusion:'success',url:`/review/external?kind=run&id=${id}`});},
 async dispatchRollback(id){const i=await this.issue(id);parseRollback(i);const number=next++;pulls.set(number,makePull(number,i,{kind:'revert'}));runs.set(id,{id:number,issue:id,workflow:'rollback',event:'workflow_dispatch',status:'completed',conclusion:'success',url:`/review/external?kind=run&id=${id}`});},
 async storeAttachment({path,content}){const url=`https://raw.githubusercontent.com/${repo}/${sha(content)}/${path}`;images.set(url,Buffer.from(content,'base64'));return url;},
 async detail(id){const p=await this.pull(id);return {head:p.head.sha,canApprove:true,preview:{head:p.head.sha,state:'ready',url:`/review/website/${id}`},ci:{status:'completed',conclusion:'success',url:`/review/external?kind=check&id=${id}`},files:[{path:'src/content/example.js',additions:1,deletions:1,patch:'- 변경 전 내용 (검토 예시)\n+ 요청한 내용 (검토 예시)'}],truncated:false};},
 async merge(id,head){const p=await this.pull(id);if(p.head.sha!==head||p.state!=='open')throw new GitHubError('변경을 다시 확인해 주세요.',409);Object.assign(p,{state:'closed',merged:true,mergedAt:stamp(),merged_at:stamp(),mergeSha:sha('merge'+id),merge_commit_sha:sha('merge'+id)});const i=issues.get(branchRequest(p.head.ref).issue);i.state='closed';return {merged:true,sha:p.mergeSha};},
 async close(id){(await this.issue(id)).state='closed';for(const p of pulls.values())if(branchRequest(p.head.ref)?.issue===id&&!p.merged)p.state='closed';return {ok:true};},
 async history(){return {current:sha('merge202'),revisions:[...pulls.values()].filter(p=>p.merged).map(p=>({...p,requestId:branchRequest(p.head.ref)?.issue})).reverse()};},
 async restorePlan(id){const p=await this.pull(id);return {source:id,current:sha('merge202'),target:p.mergeSha,changes:2};},
 async versionChanges(){return {pages:['Home','Members'],truncated:false};}
};
const handler=requestsAPI({github:async()=>gh});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 const send=(status,body,type='text/html; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);};
 try {
  if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`)return send(403,'Local review only');
  const url=new URL(req.url,origin);
  if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers.origin!==origin&&req.headers.origin!==`http://localhost:${port}`)return send(403,'Invalid origin');
  if(url.pathname==='/api/session'||url.pathname==='/api/session/refresh')return send(200,JSON.stringify({user,mode:'github'}),'application/json');
  if(url.pathname==='/auth/logout'){res.writeHead(303,{Location:'/requests/new'});return res.end();}
  if(url.pathname==='/review/image'){const bytes=images.get(url.searchParams.get('url'));return bytes?send(200,bytes,bytes[0]===137?'image/png':bytes[0]===255?'image/jpeg':bytes.toString('ascii',0,3)==='GIF'?'image/gif':'image/webp'):send(404,'Review image missing');}
  if(url.pathname==='/review/templates'){
   const names=['change-request','rollback-request','rollback-simple-request'];
   return send(200,document('GitHub 이슈 양식 변경안',`<p>이 브랜치의 실제 양식입니다. 아직 main에 반영하지 않았습니다. GitHub는 제목을 직접 입력해야 하고 조건부로 입력란을 접을 수 없어, 아래 추가 항목도 함께 표시됩니다.</p><section><h2>홈페이지 수정 요청</h2><ol>${Object.entries(simpleFieldLabels).map(([key,label])=>`<li><strong>${esc(label)}</strong> ${['page','description'].includes(key)?'· 필수':'· 추가 정보'}</li>`).join('')}</ol><p>필수: 페이지와 수정 내용. 수정 유형·현재 상태·제출 전 체크박스는 제거했습니다.</p></section><section><h2>변경 취소</h2><p>어드민: 완료된 요청 → 이 변경 취소 → 이유 입력 → 검토 요청 생성.<br>GitHub: PR/커밋 번호를 직접 지정하는 개발자용 양식과 직전 변경 취소 양식을 유지합니다.</p></section>${names.map(name=>`<section><details><summary>${esc(name)}.yml 원문 보기</summary><pre>${esc(readFileSync(resolve(root,'.github/ISSUE_TEMPLATE',name+'.yml'),'utf8'))}</pre></details></section>`).join('')}`));
  }
  if(url.pathname.startsWith('/review/'))return send(200,document('검토용 예시 화면','<section><h2>실제 외부 서비스로 연결하지 않습니다</h2><p>이번 미리보기에서는 요청 작성·변경 취소·검토·반영의 화면 흐름을 확인할 수 있습니다. 실제 GitHub 이슈나 PR은 생성하지 않습니다.</p><a href="/requests/101">완료된 요청 예시로 돌아가기</a></section>'));
  if(url.pathname.startsWith('/api/')){
   if(url.pathname.startsWith('/api/settings')||url.pathname.startsWith('/api/device'))return send(503,JSON.stringify({error:'이번 검토 화면에서는 수정 요청과 변경 취소를 확인해 주세요. 운영 설정은 연결하지 않았습니다.'}),'application/json');
   let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>11*1024*1024)return send(413,'Too large');chunks.push(chunk);}
   const headers=new Headers(req.headers);if(headers.has('Origin'))headers.set('Origin',origin);
   const request=new Request(origin+url.pathname+url.search,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await handler(request,env,user);return send(response.status,Buffer.from(await response.arrayBuffer()),response.headers.get('Content-Type'));
  }
  const file=resolve(assets,'.'+decodeURIComponent(url.pathname));
  if(file!==assets&&!file.startsWith(assets+'/'))return send(403,'Invalid path');
  const target=existsSync(file)&&extname(file)?file:resolve(assets,'index.html');return send(200,readFileSync(target),types[extname(target)]||'application/octet-stream');
 }catch(error){console.error(error.message);return send(500,JSON.stringify({error:'로컬 검토 화면을 처리하지 못했습니다.'}),'application/json');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local review: ${origin}/requests/new — no external writes`));
