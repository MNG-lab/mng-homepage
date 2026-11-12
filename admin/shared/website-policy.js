// One allowlist for version identity, snapshot restores and change cancellation.
// Everything else, including unknown new directories, stays protected.
export const websitePaths=['src/content','src/pages','src/styles','src/design-tokens.ts','public/media','public/favicon.png','public/favicon.ico'];
export function isWebsitePath(path){
 return typeof path==='string'&&!/[\u0000-\u001f\u007f\\]/.test(path)&&!path.split('/').some(p=>!p||p==='.'||p==='..')&&websitePaths.some(root=>path===root||path.startsWith(root+'/'));
}
export function changedPaths(files){return [...new Set(files.flatMap(f=>[f.filename||f.path,f.previous_filename].filter(Boolean)))];}
export function rollbackScope(files){
 const paths=changedPaths(files),blocked=paths.filter(p=>!isWebsitePath(p));
 return {allowed:paths.length>0&&!blocked.length,blocked,paths};
}
export function websiteEntries(tree){
 if(tree.truncated||!Array.isArray(tree.tree))throw Error('홈페이지 파일을 모두 확인하지 못했습니다. 다시 시도해 주세요.');
 const entries=tree.tree.filter(e=>e.type!=='tree'&&isWebsitePath(e.path));
 if(entries.some(e=>e.type!=='blob'||e.mode!=='100644'))throw Error('자동으로 되돌릴 수 없는 파일 형식입니다. 개발 담당자에게 확인해 주세요.');
 return entries.map(({path,mode,type,sha})=>({path,mode,type,sha})).sort((a,b)=>a.path.localeCompare(b.path));
}
export const websiteSignature=tree=>JSON.stringify(websiteEntries(tree).map(e=>[e.path,e.sha]));
export function foundationChanges(current,target){
 const protectedEntries=tree=>new Map(tree.tree.filter(e=>e.type!=='tree'&&(e.path.startsWith('src/')||e.path==='index.html')&&!isWebsitePath(e.path)).map(e=>[e.path,`${e.mode}:${e.sha}`]));
 const a=protectedEntries(current),b=protectedEntries(target);
 return [...new Set([...a.keys(),...b.keys()])].filter(path=>a.get(path)!==b.get(path));
}
export function websiteRestore(current,target){
 const now=websiteEntries(current),then=websiteEntries(target),a=new Map(now.map(e=>[e.path,e])),b=new Map(then.map(e=>[e.path,e]));
 const paths=[...new Set([...a.keys(),...b.keys()])].filter(path=>a.get(path)?.sha!==b.get(path)?.sha);
 const blocked=paths.length?foundationChanges(current,target):[];
 return {changes:paths,restoreSafety:{allowed:!blocked.length,blocked,reason:blocked.length?'이후에 홈페이지의 공통 기능이 업데이트되어 이 버전으로 되돌릴 수 없습니다. 원하는 내용을 새 수정 요청으로 남겨 주세요.':null},
  entries:paths.map(path=>b.get(path)||{path,mode:a.get(path).mode,type:'blob',sha:null})};
}
