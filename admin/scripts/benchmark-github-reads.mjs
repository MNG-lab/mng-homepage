// Read-only live GitHub benchmark. Credentials stay in memory; DB data is local.
// GITHUB_APP_ID=... GITHUB_APP_KEY_FILE=... node admin/scripts/benchmark-github-reads.mjs output.json
import {readFile,writeFile} from 'node:fs/promises';
import {createPrivateKey,createHash} from 'node:crypto';
import {SignJWT,importPKCS8} from 'jose';
import {createGitHub} from '../worker/github.js';
import {requestCatalog,requestSummary} from '../worker/request-list.js';
import {paginateHistory} from '../worker/history-list.js';
import {database} from '../tests/d1.mjs';

const output=process.argv[2];
if(!output||!process.env.GITHUB_APP_ID||!process.env.GITHUB_APP_KEY_FILE)throw Error('Output path, GITHUB_APP_ID and GITHUB_APP_KEY_FILE are required');
const privateKey=createPrivateKey(await readFile(process.env.GITHUB_APP_KEY_FILE)).export({format:'pem',type:'pkcs8'});
const jwt=await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(process.env.GITHUB_APP_ID).setIssuedAt(Math.floor(Date.now()/1000)-60).setExpirationTime('9m').sign(await importPKCS8(privateKey,'RS256'));
const installationResponse=await fetch('https://api.github.com/repos/MNG-lab/mng-homepage/installation',{headers:{Authorization:`Bearer ${jwt}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
if(!installationResponse.ok)throw Error(`Installation lookup failed (${installationResponse.status})`);
const installation=await installationResponse.json();
const DB=database(),env={DB,ADMIN_ENV:'production',GITHUB_REPOSITORY:'MNG-lab/mng-homepage',GITHUB_BASE:'main',GITHUB_WORKFLOW_REF:'main',GITHUB_APP_ID:process.env.GITHUB_APP_ID,GITHUB_INSTALLATION_ID:String(installation.id),GITHUB_APP_PRIVATE_KEY:privateKey};
let counts={};
const fetcher=async(url,options={})=>{
 const target=new URL(url),method=options.method||'GET';
 if(target.origin!=='https://api.github.com')throw Error('Only GitHub API reads are permitted');
 const auth=target.pathname===`/app/installations/${installation.id}/access_tokens`,graph=target.pathname==='/graphql';
 if(method!=='GET'&&!(auth&&method==='POST')&&!(graph&&method==='POST'&&JSON.parse(options.body).query.startsWith('query ')))throw Error('Benchmark attempted a write');
 const kind=auth?'token':graph?'history':target.pathname.includes('/git/ref/')?'head':target.pathname.includes('/git/commits/')||target.pathname.includes('/git/trees/')?'tree':target.pathname.includes('/actions/')?'runs':target.pathname.endsWith('/pulls')?'pulls':'issues';
 counts[kind]=(counts[kind]||0)+1;
 return fetch(url,options);
};
async function sample(name){
 counts={};const start=performance.now(),gh=await createGitHub(env,fetcher);
 const value=name==='history'?paginateHistory(await gh.history(),1):name==='summary'?requestSummary(await requestCatalog(gh,env)):await requestCatalog(gh,env);
 return {ms:Math.round(performance.now()-start),calls:{...counts},digest:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
}
const report={measuredAt:new Date().toISOString(),environment:'Local Worker functions + live GitHub API; in-memory SQLite D1 adapter, excludes browser/session and Cloudflare D1 network latency',warmPolicy:'Existing feed caches are kept inside their 15-second freshness window for every repeat',cold:{},warm:{}};
report.cold.catalog=await sample('catalog');
for(const name of ['catalog','history','summary']){
 report.warm[name]=[];
 for(let i=0;i<3;i++){
  DB.sqlite.prepare('UPDATE github_catalog_sync SET checked_at=?').run(Date.now());
  report.warm[name].push(await sample(name));
 }
}
await writeFile(output,JSON.stringify(report,null,2)+'\n');
for(const [name,rows] of Object.entries(report.warm))console.log(JSON.stringify({name,medianMs:rows.map(r=>r.ms).sort((a,b)=>a-b)[1],calls:rows.map(r=>r.calls)}));
console.log('Cold catalogue:',report.cold.catalog.ms,'ms; report:',output);
DB.sqlite.close();
