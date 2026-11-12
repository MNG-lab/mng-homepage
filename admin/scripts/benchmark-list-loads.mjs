// Read-only live GitHub benchmark. Credentials stay in memory; DB data is local.
// GITHUB_APP_ID=... GITHUB_APP_KEY_FILE=... node admin/scripts/benchmark-list-loads.mjs output.json
import {readFile,writeFile} from 'node:fs/promises';
import {createPrivateKey,createHash} from 'node:crypto';
import {SignJWT,importPKCS8} from 'jose';
import {createGitHub} from '../worker/github.js';
import {requestsAPI} from '../worker/requests.js';
import {database} from '../tests/d1.mjs';

const output=process.argv[2];
if(!output||!process.env.GITHUB_APP_ID||!process.env.GITHUB_APP_KEY_FILE)throw Error('Output path, GITHUB_APP_ID and GITHUB_APP_KEY_FILE are required');
const privateKey=createPrivateKey(await readFile(process.env.GITHUB_APP_KEY_FILE)).export({format:'pem',type:'pkcs8'});
const jwt=await new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuer(process.env.GITHUB_APP_ID).setIssuedAt(Math.floor(Date.now()/1000)-60).setExpirationTime('9m').sign(await importPKCS8(privateKey,'RS256'));
const installationResponse=await fetch('https://api.github.com/repos/MNG-lab/mng-homepage/installation',{headers:{Authorization:`Bearer ${jwt}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
if(!installationResponse.ok)throw Error(`Installation lookup failed (${installationResponse.status})`);
const installation=await installationResponse.json();
let DB=database(); const env={DB,GITHUB_ENABLED:'true',APP_ORIGIN:'https://benchmark.example.test',ADMIN_ENV:'production',GITHUB_REPOSITORY:'MNG-lab/mng-homepage',GITHUB_BASE:'main',GITHUB_WORKFLOW_REF:'main',GITHUB_APP_ID:process.env.GITHUB_APP_ID,GITHUB_INSTALLATION_ID:String(installation.id),GITHUB_APP_PRIVATE_KEY:privateKey};
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
const handle=requestsAPI({github:env=>createGitHub(env,fetcher)}),user={sub:'benchmark',role:'owner'};
const paths={catalog:'/api/requests?view=catalog',history:'/api/history',summary:'/api/requests?view=summary'};
async function sample(name){
 counts={};const start=performance.now();
 const initial=new URL(env.APP_ORIGIN+paths[name]);initial.searchParams.set('cached','1');
 const response=await handle(new Request(initial),env,user);
 if(!response.ok)throw Error('Read failed: '+await response.text());
 let data=await response.json();const firstMs=performance.now()-start,firstCalls={...counts};
 if(data.sync?.state==='cached'){
  const url=new URL(env.APP_ORIGIN+paths[name]);url.searchParams.set('fresh','1');
  const fresh=await handle(new Request(url),env,user);
  if(!fresh.ok)throw Error('Refresh failed: '+await fresh.text());
  data=await fresh.json();
 }
 const {sync,...value}=data;
 return {firstMs:Math.round(firstMs*10)/10,settledMs:Math.round((performance.now()-start)*10)/10,firstCalls,calls:{...counts},digest:createHash('sha256').update(JSON.stringify(value)).digest('hex')};
}
const report={measuredAt:new Date().toISOString(),environment:'Local authenticated request handler + live GitHub API; in-memory SQLite D1 adapter, excludes browser/session and Cloudflare D1 network latency',policy:'Cold samples reset the local DB; returning samples expire feed caches before each read. Installation credentials remain reusable.',cold:[],returning:{}};
for(let i=0;i<3;i++){
 if(i){DB.sqlite.close();DB=database();env.DB=DB;}
 report.cold.push(await sample('catalog'));
}
// Seed both kinds of complete read view before measuring a returning visit.
await sample('history');
for(const name of Object.keys(paths)){
 report.returning[name]=[];
 for(let i=0;i<3;i++){
  DB.sqlite.prepare('UPDATE github_catalog_sync SET checked_at=0').run();
  report.returning[name].push(await sample(name));
 }
}
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));DB.sqlite.close();
