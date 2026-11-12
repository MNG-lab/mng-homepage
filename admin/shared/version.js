import {branchRequest} from './github-sync.js';
const pages=['Home','Research','Professor','Members','Publications','Gallery','Contact'];
export function changedAreas(files){
 const result=new Set();
 for(const file of files){
  for(const path of [file.filename,file.previous_filename].filter(Boolean)){
   const page=pages.find(name=>[`src/pages/${name}Page.jsx`,`src/pages/${name}DetailPage.jsx`,`src/content/${name.toLowerCase()}-data.js`,`src/content/${name.toLowerCase()}-content.js`].includes(path));
   if(page)result.add(page);
   else if(path.startsWith('src/')||path==='index.html')result.add('공통 화면·설정');
   else if(path.startsWith('public/'))result.add('이미지·첨부 파일');
  }
 }
 return [...result];
}
export const relatedRequest=revision=>branchRequest(revision.head?.ref)?.issue||null;

// Display numbers come from the durable website ledger; GitHub IDs stay in URLs.
export const versionLabel=number=>Number.isSafeInteger(number)&&number>0?`버전 ${number}`:'';
export const revisionKey=revision=>revision.key||String(revision.number);
export const revisionLabel=revision=>versionLabel(revision.version)||'버전 확인 중';
export function revisionMethod(revision){
 if(revision.restoration)return '되돌리기';
 const request=branchRequest(revision.head?.ref);
 return request?.kind==='revert'?'변경 취소':request?'AI 수정':'직접 수정';
}
export const appliedVersion=request=>versionLabel(request.pull?.merged?request.pull.version:null);
export function versionReference(target){
 const label=versionLabel(target?.version),name=target?.name;
 return label?(name?`${label} ‘${name}’`:label):name?`‘${name}’ 버전`:'이전 버전';
}
