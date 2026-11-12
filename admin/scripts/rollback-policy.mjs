import {execFileSync} from 'node:child_process';
import {isWebsitePath,rollbackScope,websiteEntries,foundationChanges} from '../shared/website-policy.js';
export const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export const protectedRollback=()=>Object.assign(Error('운영 기능을 보호하기 위해 자동 취소를 중단했습니다.'),{failureCode:'rollback_protected'});
const emptyTree='4b825dc642cb6eb9a060e54bf8d69288fbee4904';
export function commitPaths(sha){
 const parent=git('rev-list','--parents','-n','1',sha).split(' ')[1]||emptyTree;
 return git('diff','--name-only','--no-renames','-z',parent,sha).split('\0').filter(Boolean);
}
export function latestWebsiteCommit(base){
 for(const sha of git('rev-list','--first-parent',base).split('\n'))if(commitPaths(sha).some(isWebsitePath))return sha;
 throw Object.assign(Error('취소할 홈페이지 변경이 없습니다.'),{failureCode:'rollback_no_changes'});
}
export function gitTree(sha){
 return {tree:git('ls-tree','-rz',sha).split('\0').filter(Boolean).map(row=>{const [info,path]=row.split('\t'),[mode,type,sha]=info.split(' ');return {path,mode,type,sha};})};
}
export function assertRollbackTarget(sha,base){
 if(!rollbackScope(commitPaths(sha).map(filename=>({filename}))).allowed)throw protectedRollback();
 const source=gitTree(sha),current=gitTree(base);
 try{websiteEntries(source);websiteEntries(current);}catch{throw protectedRollback();}
 if(foundationChanges(current,source).length)throw protectedRollback();
}
export function assertRollbackResult(base,result){
 const paths=git('diff','--name-only','--no-renames','-z',base,result).split('\0').filter(Boolean);
 if(!rollbackScope(paths.map(filename=>({filename}))).allowed)throw protectedRollback();
 try{websiteEntries(gitTree(result));}catch{throw protectedRollback();}
}
