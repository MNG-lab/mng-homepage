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

// GitHub PR numbers are immutable identifiers, not deployment sequence numbers.
export const versionLabel=number=>Number.isSafeInteger(number)&&number>0?`버전 ${number}`:'';
export const appliedVersion=request=>versionLabel(request.pull?.merged?request.pull.number:null);
export function versionReference(target){
 const label=versionLabel(target?.number),name=target?.name;
 return label?(name?`${label} ‘${name}’`:label):name?`‘${name}’ 버전`:'이전 버전';
}
