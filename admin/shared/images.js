export const ATTACHMENT_BRANCH='admin-attachments';
export const MAX_IMAGE_BYTES=10*1024*1024;
export const MAX_IMAGES=8;
export const MAX_REQUEST_IMAGE_BYTES=40*1024*1024;
export function imageType(bytes) {
  const prefix=Array.from(bytes.subarray(0,12),x=>String.fromCharCode(x)).join('');
  if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)&&prefix.slice(8,12)==='\0\0\0\r')return {type:'image/png',extension:'png'};
  if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {type:'image/jpeg',extension:'jpg'};
  if(bytes.length>=14&&/^GIF8[79]a/.test(prefix))return {type:'image/gif',extension:'gif'};
  if(bytes.length>=16&&prefix.startsWith('RIFF')&&prefix.slice(8)==='WEBP')return {type:'image/webp',extension:'webp'};
  return null;
}
export function trustedImageURL(value) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
    if(url.hostname==='github.com'&&!/^\/user-attachments\/assets\/[a-f\d-]+$/.test(url.pathname))return null;
    if(url.hostname==='raw.githubusercontent.com'&&!/^\/MNG-lab\/mng-homepage\/[a-f\d]{40}\/requests\/[a-f\d-]+\/[a-f\d-]+\.(png|jpg|webp|gif)$/.test(url.pathname))return null;
    if(!['github.com','raw.githubusercontent.com','user-images.githubusercontent.com','private-user-images.githubusercontent.com'].includes(url.hostname))return null;
    return url.href;
  }catch{return null;}
}
export function extractImages(body='') {
  const images=[];
  for(const match of String(body||'').slice(0,65536).matchAll(/!\[([^\]\n]*)\]\((https:\/\/[^\s)]+)\)|<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["'][^>]*>|(https:\/\/github\.com\/user-attachments\/assets\/[a-f\d-]+)/gi)) {
    const url=trustedImageURL(match[2]||match[3]||match[4]);
    if(url&&!images.some(i=>i.url===url))images.push({url,name:match[1]||`첨부 사진 ${images.length+1}`});
  }
  return images;
}
export async function readBounded(response,max=MAX_IMAGE_BYTES) {
  if(Number(response.headers.get('Content-Length'))>max)throw Object.assign(Error('사진은 파일당 10MB까지 첨부할 수 있습니다.'),{status:413});
  const reader=response.body?.getReader();if(!reader)return new Uint8Array();
  const chunks=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Object.assign(Error('사진은 파일당 10MB까지 첨부할 수 있습니다.'),{status:413});}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
