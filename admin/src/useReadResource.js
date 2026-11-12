import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './api.js';

// Reads keep their last result. Only the current resource can publish a new one.
export default function useReadResource(path,{scopeKey=path,cache,refreshKey,interval=0,shouldPoll=()=>true,onLoad=()=>{}}={}) {
 const cacheKey=JSON.stringify([path,scopeKey]);
 const [result,setResult]=useState(null),[failure,setFailure]=useState(null),[pending,setPending]=useState(null);
 const latest=useRef({path,scopeKey,onLoad,shouldPoll}),sequence=useRef(0),active=useRef(null),lastValue=useRef(null);
 latest.current={path,scopeKey,onLoad,shouldPoll};
 const refresh=useCallback(({force=false}={})=>{
  if(!path)return Promise.resolve(null);
  if(!force&&active.current?.path===path&&active.current?.scopeKey===scopeKey)return active.current.promise;
  const seq=++sequence.current,read={path,scopeKey};
  const isCurrent=()=>seq===sequence.current&&latest.current.path===path&&latest.current.scopeKey===scopeKey;
  setPending({path,scopeKey});
  read.promise=(async()=>{
   try{
    const value=await api(path);
    if(!isCurrent())return null;
    const snapshot={path,scopeKey,value,updatedAt:Date.now()};
    // Optional, session-owned snapshots are only for display; every visit revalidates.
    if(cache){cache.delete(cacheKey);cache.set(cacheKey,snapshot);if(cache.size>40)cache.delete(cache.keys().next().value);}
    lastValue.current=snapshot;setResult(snapshot);setFailure(null);latest.current.onLoad(value);
    return true;
   }catch(e){if(!isCurrent())return null;if(cache&&[403,404].includes(e.status)){cache.delete(cacheKey);setResult(null);lastValue.current=null;}setFailure({path,scopeKey,message:e.message});return false;}
   finally{if(isCurrent())setPending(null);if(active.current===read)active.current=null;}
  })();
  active.current=read;return read.promise;
 },[path,scopeKey,cache,cacheKey]);
 useEffect(()=>{
  refresh({force:true});
  const update=()=>{if(document.visibilityState==='visible')void refresh();};
  const timer=interval?setInterval(()=>{const stored=lastValue.current,value=stored?.path===path&&stored?.scopeKey===scopeKey?stored.value:null;if(latest.current.shouldPoll(value))update();},interval):null;
  if(interval)document.addEventListener('visibilitychange',update);
  return()=>{++sequence.current;active.current=null;clearInterval(timer);if(interval)document.removeEventListener('visibilitychange',update);};
 },[refresh,refreshKey,interval]);
 const matches=value=>value?.path===path&&value?.scopeKey===scopeKey;
 const snapshot=matches(result)?result:cache?.get(cacheKey);
 const data=path&&snapshot?snapshot.value:null,error=path&&matches(failure)?failure.message:'';
 return {data,error,updatedAt:path&&snapshot?snapshot.updatedAt:null,loading:!!path&&(matches(pending)||(!matches(result)&&!error)),refresh};
}
