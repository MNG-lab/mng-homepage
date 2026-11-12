// Publish saved data immediately but keep the caller's loading state until the
// separate live read completes. Detail reads and mutations never enter this path.
export async function readWithRefresh(path,{read,publish,isCurrent=()=>true}){
 const url=new URL(path,'https://admin.invalid');
 const list=['/api/requests','/api/history'].includes(url.pathname);
 if(list)url.searchParams.set('cached','1');
 const value=await read(list?url.pathname+url.search:path);
 if(!isCurrent())return null;
 publish(value);
 if(value.sync?.state!=='cached')return value;
 if(!list)return value;
 url.searchParams.delete('cached');
 url.searchParams.set('fresh','1');
 const current=await read(url.pathname+url.search);
 if(!isCurrent())return null;
 if(current.sync?.state==='cached')throw Error('최신 상태를 확인하지 못했습니다. 저장된 내용을 표시합니다. 다시 불러와 주세요.');
 publish(current);
 return current;
}
