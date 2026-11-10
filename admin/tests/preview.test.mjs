import test from 'node:test';
import assert from 'node:assert/strict';
import {previewStatus} from '../worker/preview.js';
const sha='a'.repeat(40);
const check={id:10,name:'Cloudflare Pages',app:{id:85455,slug:'cloudflare-workers-and-pages'},head_sha:sha,status:'completed',conclusion:'success',details_url:'https://dash.cloudflare.com/?to=/aaabcbaeabd689d5c50a0f07348d6634/pages/view/mng-homepage/fc3ef735-ef91-48db-a58a-19d67b21874e',output:{summary:"<table><tr><td><strong>Preview URL:</strong> </td><td><a href='https://fc3ef735.mng-homepage.pages.dev'>preview</a></td></tr><tr><td><strong>Branch Preview URL:</strong></td><td><a href='https://branch.mng-homepage.pages.dev'>branch</a></td></tr></table>"}};
test('uses immutable preview from exact commit and trusted Cloudflare check',()=>{
 const p=previewStatus([check],sha);assert.equal(p.state,'ready');assert.equal(p.url,'https://fc3ef735.mng-homepage.pages.dev');assert.equal(p.head,sha);assert.ok(p.logsUrl.startsWith('https://dash.cloudflare.com/'));
 for(const change of [{head_sha:'b'.repeat(40)},{name:'Other'},{app:{id:1,slug:'cloudflare-workers-and-pages'}},{app:{id:85455,slug:'fake'}}])assert.equal(previewStatus([{...check,...change}],sha).state,'pending');
});
test('latest deployment pending or failed never falls back to earlier successful URL',()=>{
 for(const [changes,state] of [[{status:'queued'},'pending'],[{status:'in_progress'},'building'],[{conclusion:'failure'},'failed'],[{conclusion:'cancelled'},'cancelled']]){
 const result=previewStatus([check,{...check,...changes,id:11}],sha);assert.equal(result.state,state);assert.equal(result.url,null);
 }
});
test('rejects mutable, foreign, mismatched, injected or credential-bearing preview URLs',()=>{
 for(const url of ['https://branch.mng-homepage.pages.dev','https://fc3ef735.other.pages.dev','https://fc3ef735.mng-homepage.pages.dev.evil.test','javascript:alert(1)','https://user:pass@fc3ef735.mng-homepage.pages.dev','https://fc3ef735.mng-homepage.pages.dev/?token=test','https://deadbeef.mng-homepage.pages.dev','http://fc3ef735.mng-homepage.pages.dev']){
 const bad={...check,output:{summary:`<tr><td><strong>Preview URL:</strong></td><td><a href='${url}'>preview</a></td></tr>`}};assert.equal(previewStatus([bad],sha).state,'url_pending',url);
 }
 assert.equal(previewStatus([{...check,details_url:'https://evil.test'}],sha).state,'url_pending');
 assert.equal(previewStatus([{...check,output:{summary:check.output.summary.replace('Preview URL:','Branch Preview URL:')}}],sha).state,'url_pending');
});
test('success with missing URL remains unlinked instead of inventing a preview address',()=>{
 const result=previewStatus([{...check,output:{summary:'Deploy successful!'}}],sha);assert.equal(result.state,'url_pending');assert.equal(result.url,null);
});
