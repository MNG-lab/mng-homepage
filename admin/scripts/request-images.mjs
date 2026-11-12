import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {extractImages,trustedImageURL,imageType,readBounded,MAX_REQUEST_IMAGE_BYTES,MAX_IMAGES} from '../shared/images.js';
export async function downloadImages(body,directory,fetcher=fetch) {
  const images=extractImages(body);if(!images.length)return [];
  if(images.length>MAX_IMAGES)throw Error('사진은 한 요청에 8개까지 첨부할 수 있습니다.');
  await mkdir(directory,{recursive:true,mode:0o700});const result=[];let total=0;
  for(const [index,image] of images.entries()) {
    let url=image.url,response;
    for(let redirects=0;redirects<4;redirects++) {
      if(!trustedImageURL(url)&&!(()=>{try{const next=new URL(url);return next.protocol==='https:'&&!next.username&&!next.password&&!next.port&&next.hostname==='github-production-user-asset-6210df.s3.amazonaws.com';}catch{return false;}})())throw Error('첨부 이미지의 전달 주소를 확인할 수 없습니다.');
      response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});
      if(![301,302,303,307,308].includes(response.status))break;
      const location=response.headers.get('location');await response.body?.cancel();
      if(!location)throw Error('이미지 전달 주소가 없습니다.');url=new URL(location,url).href;
    }
    if(!response.ok)throw Error('첨부 사진을 읽지 못했습니다. 공개 이미지 링크를 확인해 주세요.');
    const bytes=await readBounded(response),type=imageType(bytes);total+=bytes.length;
    if(!type||total>MAX_REQUEST_IMAGE_BYTES)throw Error('첨부 사진 형식·용량을 확인해 주세요.');
    const path=resolve(directory,`${index+1}.${type.extension}`);await writeFile(path,bytes,{mode:0o600});result.push({...image,path});
  }
  return result;
}
