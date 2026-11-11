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
export const relatedRequest=revision=>Number(revision.head?.ref?.match(/^admin-preview\/issue-([1-9]\d*)-\d+$/)?.[1])||null;
