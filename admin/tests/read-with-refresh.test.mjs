import test from 'node:test';
import assert from 'node:assert/strict';
import {readWithRefresh} from '../src/readWithRefresh.js';
const cached={requests:[{id:1}],sync:{state:'cached',updatedAt:1}},fresh={requests:[{id:2}],sync:{state:'fresh',updatedAt:2}};

test('saved content publishes before live response; search and pagination survive follow-up',async()=>{
 const published=[],paths=[];let release,finished=false;
 const pending=readWithRefresh('/api/requests?status=failed&page=2&q=Members',{publish:v=>published.push(v),read:async path=>{paths.push(path);return paths.length===1?cached:new Promise(resolve=>{release=resolve;});}}).then(value=>{finished=true;return value;});
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(published,[cached]);assert.equal(finished,false);
 assert.equal(paths[0],'/api/requests?status=failed&page=2&q=Members&cached=1');
 assert.equal(paths[1],'/api/requests?status=failed&page=2&q=Members&fresh=1');release(fresh);assert.deepEqual(await pending,fresh);assert.deepEqual(published,[cached,fresh]);
});
test('refresh failures preserve saved content and propagate errors rather than reporting success',async()=>{
 const published=[];let count=0;
 await assert.rejects(readWithRefresh('/api/history?page=2',{publish:v=>published.push(v),read:async()=>{if(++count===1)return cached;throw Error('Unavailable');}}),/Unavailable/);
 assert.deepEqual(published,[cached]);assert.equal(count,2);
});
test('navigation prevents old responses and unnecessary refreshes; detail reads never use snapshot protocol',async()=>{
 let current=true,reads=0,release;const values=[];
 const work=readWithRefresh('/api/history?page=2',{isCurrent:()=>current,publish:v=>values.push(v),read:async()=>++reads===1?cached:new Promise(resolve=>{release=resolve;})});
 await new Promise(resolve=>setImmediate(resolve));current=false;release(fresh);assert.equal(await work,null);assert.deepEqual(values,[cached]);
 reads=0;assert.equal(await readWithRefresh('/api/requests',{isCurrent:()=>false,publish:()=>assert.fail(),read:async()=>{reads++;return cached;}}),null);assert.equal(reads,1);
 for(const path of ['/api/history/1','/api/pulls/1','/api/requests/1']){
  reads=0;await readWithRefresh(path,{publish:()=>{},read:async()=>{reads++;return cached;}});assert.equal(reads,1);
 }
});
