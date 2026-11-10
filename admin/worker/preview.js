// Only Cloudflare's installed GitHub App can supply deployment evidence.
const APP_ID=85455;
const ACCOUNT='aaabcbaeabd689d5c50a0f07348d6634';
export function previewStatus(checks,head) {
 const check=checks.filter(c=>c.name==='Cloudflare Pages'&&c.app?.id===APP_ID&&c.app?.slug==='cloudflare-workers-and-pages'&&c.head_sha===head).sort((a,b)=>b.id-a.id)[0];
 if(!check)return {state:'pending',head,url:null};
 let logsUrl=null,deployment=null;
 try {
  const url=new URL(check.details_url);
  const match=url.searchParams.get('to')?.match(new RegExp(`^/${ACCOUNT}/pages/view/mng-homepage/([a-f0-9-]{36})$`));
  if(url.origin==='https://dash.cloudflare.com'&&!url.username&&!url.password&&match){logsUrl=url.href;deployment=match[1];}
 }catch{}
 const base={head,url:null,logsUrl,updatedAt:check.completed_at||check.started_at||null};
 if(check.status!=='completed')return {...base,state:check.status==='queued'?'pending':'building'};
 if(check.conclusion!=='success')return {...base,state:check.conclusion==='cancelled'?'cancelled':'failed'};
 // Never use a mutable branch alias or interpret/render third-party HTML.
 const body=check.output?.summary||'';
 const row=body.match(/<tr>\s*<td>\s*<strong>Preview URL:<\/strong>[\s\S]*?<\/tr>/i)?.[0];
 const href=row?.match(/href=['"]([^'"]+)['"]/i)?.[1];
 try {
  const url=new URL(href);
  const match=url.hostname.match(/^([a-f0-9]{8})\.mng-homepage\.pages\.dev$/);
  if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&url.pathname==='/'&&!url.search&&!url.hash&&match&&deployment?.startsWith(match[1]+'-'))return {...base,state:'ready',url:url.origin};
 }catch{}
 return {...base,state:'url_pending'};
}
