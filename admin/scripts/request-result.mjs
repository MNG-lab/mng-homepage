import {ADMIN_ORIGIN} from '../shared/hosting.js';
export async function reportRequestResult({issue,reason,failureCode=null}){
 const endpoint=ADMIN_ORIGIN+'/api/internal/request-result';
 const url=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience',endpoint);
 const identity=await fetch(url,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!identity.ok)throw Error('Runner identity unavailable');
 const {value}=await identity.json();
 for(let attempt=0;attempt<2;attempt++){
  try{const result=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:JSON.stringify({issue,reason,failureCode}),signal:AbortSignal.timeout(15000),redirect:'error'});if(!result.ok)throw Error('Result unavailable');return;}catch(e){if(attempt===1)throw e;}
 }
}
