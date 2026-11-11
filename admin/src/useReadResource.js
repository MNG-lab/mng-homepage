import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './api.js';

// Reads keep their last result. Only the current resource can publish a new one.
export default function useReadResource(path,{scopeKey=path,refreshKey,interval=0,shouldPoll=()=>true,onLoad=()=>{}}={}) {
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
    lastValue.current={path,scopeKey,value};setResult({path,scopeKey,value});setFailure(null);latest.current.onLoad(value);
    return true;
   }catch(e){if(!isCurrent())return null;setFailure({path,scopeKey,message:e.message});return false;}
   finally{if(isCurrent())setPending(null);if(active.current===read)active.current=null;}
  })();
  active.current=read;return read.promise;
 },[path,scopeKey]);
 useEffect(()=>{
  refresh({force:true});
  const update=()=>{if(document.visibilityState==='visible')void refresh();};
  const timer=interval?setInterval(()=>{const stored=lastValue.current,value=stored?.path===path&&stored?.scopeKey===scopeKey?stored.value:null;if(latest.current.shouldPoll(value))update();},interval):null;
  if(interval)document.addEventListener('visibilitychange',update);
  return()=>{++sequence.current;active.current=null;clearInterval(timer);if(interval)document.removeEventListener('visibilitychange',update);};
 },[refresh,refreshKey,interval]);
 const matches=value=>value?.path===path&&value?.scopeKey===scopeKey;
 const data=path&&matches(result)?result.value:null,error=path&&matches(failure)?failure.message:'';
 return {data,error,loading:!!path&&(matches(pending)||(!data&&!error)),refresh};
}
