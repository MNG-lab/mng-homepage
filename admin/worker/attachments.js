import {Buffer} from 'node:buffer';
import {UUID} from '../shared/request-form.js';
import {imageType,readBounded,MAX_IMAGES,MAX_REQUEST_IMAGE_BYTES,ATTACHMENT_BRANCH} from '../shared/images.js';
import {GitHubError} from './github.js';

export async function uploadAttachment(request,env,user,gh,id) {
  const requestId=request.headers.get('X-Request-Id');
  let name;try{name=decodeURIComponent(request.headers.get('X-File-Name')||'');}catch{throw new GitHubError('파일 이름을 확인해 주세요.',400);}
  if(!UUID.test(id)||!UUID.test(requestId||'')||!name||name.length>180||/[\x00-\x1f\x7f]/.test(name))throw new GitHubError('첨부 사진 정보를 확인해 주세요.',400);
  let bytes;try{bytes=await readBounded(request);}catch(e){throw new GitHubError(e.message,e.status||400);}
  const media=imageType(bytes);if(!media)throw new GitHubError('JPG, PNG, GIF, WebP 사진 파일을 선택해 주세요.',415);
  const digest=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  const existing=await env.DB.prepare('SELECT * FROM attachments WHERE id=?').bind(id).first();
  if(existing&&(existing.removed||existing.actor_sub!==user.sub||existing.request_id!==requestId||existing.digest!==digest||existing.name!==name))throw new GitHubError('다른 사진에 사용된 식별자입니다.',409);
  if(existing?.url)return {id,name:existing.name,url:existing.url,size:existing.size};
  if(await env.DB.prepare('SELECT id FROM requests WHERE id=?').bind(requestId).first())throw new GitHubError('이미 접수한 요청에는 사진을 추가할 수 없습니다.',409);
  const path=`requests/${requestId}/${id}.${media.extension}`;
  if(!existing) {
    // One conditional statement also protects quotas under concurrent uploads.
    const added=await env.DB.prepare(`INSERT OR IGNORE INTO attachments(id,request_id,actor_sub,name,media_type,size,digest,path)
      SELECT ?,?,?,?,?,?,?,? WHERE
      (SELECT count(*) FROM attachments WHERE request_id=? AND removed=0) < ? AND
      (SELECT coalesce(sum(size),0) FROM attachments WHERE request_id=? AND removed=0) + ? <= ? AND
      (SELECT count(*) FROM attachments WHERE actor_sub=? AND created_at>unixepoch()-86400) < 100`).bind(id,requestId,user.sub,name,media.type,bytes.length,digest,path,requestId,MAX_IMAGES,requestId,bytes.length,MAX_REQUEST_IMAGE_BYTES,user.sub).run();
    if(!added.meta.changes)throw new GitHubError('첨부 한도에 도달했습니다. 요청당 사진 8개·전체 40MB까지 보낼 수 있습니다. 사용하지 않는 사진을 제외하거나 잠시 후 다시 시도해 주세요.',409);
  }
  const blob=Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]);
  const blobSha=Buffer.from(await crypto.subtle.digest('SHA-1',blob)).toString('hex');
  const url=await gh.storeAttachment({path,content:Buffer.from(bytes).toString('base64'),blobSha,branch:ATTACHMENT_BRANCH});
  await env.DB.prepare('UPDATE attachments SET url=? WHERE id=? AND actor_sub=?').bind(url,id,user.sub).run();
  return {id,name,url,size:bytes.length};
}

export async function requestAttachments(env,user,input) {
  const result=[];
  for(const attachment of input.attachments||[]) {
    const row=await env.DB.prepare('SELECT * FROM attachments WHERE id=?').bind(attachment.id).first();
    if(!row||row.removed||!row.url||row.actor_sub!==user.sub||row.request_id!==input.requestId)throw new GitHubError('사진 업로드를 완료한 뒤 다시 보내 주세요.',400);
    result.push({id:row.id,name:row.name,url:row.url,size:row.size,caption:attachment.caption});
  }
  return result;
}
