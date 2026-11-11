import {spawn,spawnSync} from 'node:child_process';
import {createPublicKey,publicEncrypt,constants} from 'node:crypto';
import {mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function encryptChallenge(output,publicKey) {
 const text=output.replace(/\x1b\[[0-9;]*m/g,'');
 if(!text.includes('https://auth.openai.com/codex/device'))return null;
 const code=text.match(/\b[A-Z0-9]{4}-[A-Z0-9]{5}\b/)?.[0];
 if(!code)return null;
 const key=createPublicKey({key:Buffer.from(publicKey,'base64'),format:'der',type:'spki'});
 if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<2048)throw Error('Invalid public key');
 return publicEncrypt({key,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(JSON.stringify({url:'https://auth.openai.com/codex/device',code}))).toString('base64');
}
export function inspectAuth(raw) {
 if(raw.length>32000)throw Error('Unexpected credential size');
 const auth=JSON.parse(raw),t=auth.tokens||{};
 return {valid_json:true,has_access_token:typeof t.access_token==='string'&&!!t.access_token,has_refresh_token:typeof t.refresh_token==='string'&&!!t.refresh_token,has_id_token:typeof t.id_token==='string'&&!!t.id_token};
}
async function main(){
 process.umask(0o077);
 const dir=process.env.RUNNER_TEMP;if(!dir)throw Error('Runner temp required');
 const home=path.join(dir,'device-proof-home'),resultPath=path.join(dir,'device-proof-result.json');
 const cmd=path.join(dir,'device-proof-cli/node_modules/.bin/codex');
 const env={...process.env,CODEX_HOME:home};
 for(const key of ['OPENAI_API_KEY','CODEX_API_KEY','CODEX_ACCESS_TOKEN','PROOF_PUBLIC_KEY','GITHUB_TOKEN','GH_TOKEN'])delete env[key];
 let child,timer,output='',sent=false,result={success:false,error:'login_failed'};
 const cleanup=async()=>{child?.kill('SIGTERM');await rm(home,{recursive:true,force:true});};
 process.once('SIGTERM',()=>{cleanup().finally(()=>process.exit(1));});
 try{
  await mkdir(home,{recursive:true,mode:0o700});
  child=spawn(cmd,['-c','cli_auth_credentials_store="file"','login','--device-auth'],{cwd:home,env,stdio:['ignore','pipe','pipe']});
  const code=await new Promise((resolve,reject)=>{
   const consume=chunk=>{
    if(sent)return;output=(output+chunk.toString()).slice(-65536);
    try{const encrypted=encryptChallenge(output,process.env.PROOF_PUBLIC_KEY);if(encrypted){sent=true;output='';writeFile(path.join(dir,'device-proof-challenge.enc'),encrypted,{mode:0o600}).catch(reject);}}catch(e){reject(e);}
   };
   child.stdout.on('data',consume);child.stderr.on('data',consume);
   child.once('error',reject);child.once('close',resolve);
   timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('Login timeout'));},10*60*1000);
  });
  if(code!==0)throw Error('Login failed');
  const flags=inspectAuth(await readFile(path.join(home,'auth.json'),'utf8'));
  const mode=(await stat(path.join(home,'auth.json'))).mode&0o777;
  const status=spawnSync(cmd,['-c','cli_auth_credentials_store="file"','login','status'],{cwd:home,env,encoding:'utf8',timeout:15000});
  const loggedIn=status.status===0&&/Logged in using ChatGPT/.test(status.stdout+status.stderr);
  result={success:sent&&flags.has_access_token&&flags.has_refresh_token&&flags.has_id_token&&loggedIn&&mode===0o600,...flags,logged_in_using_chatgpt:loggedIn,file_mode:mode.toString(8)};
 }catch{result={success:false,error:'device_login_or_validation_failed'};}
 finally{clearTimeout(timer);output='';await cleanup();await writeFile(resultPath,JSON.stringify({...result,cleaned:true})+'\n',{mode:0o600});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
