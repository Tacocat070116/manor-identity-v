import test from 'node:test';
import assert from 'node:assert/strict';
import {createRankedLoader} from './dist/ranked-data.js';

const characters={h:{id:'h',name:'감시자',side:'감시자'},s:{id:'s',name:'생존자',side:'생존자'}};
const row=['h',20,40,30,30,5];
function catalog(){return {
 datasets:['one','two'].map(id=>({id,server:'asia',season:'S1',tier:'all',path:'ranked/asia-s1.json'})),
 assetVersions:{'ranked/asia-s1.json':'123456abcdef'}
};}

test('concurrent snapshots share one partition and reuse its hydrated rows',async()=>{
 const data=catalog();let calls=0,finish,started;
 const requested=new Promise(resolve=>{started=resolve;});
 const source=createRankedLoader({characters,loadIndex:async()=>data,loadJSON:async(url,_message,options)=>{
  calls++;assert.equal(url,'ranked/asia-s1.json?v=123456abcdef');assert.equal(options.cache,'no-cache');
  await new Promise(resolve=>{finish=resolve;started();});
  return {datasets:data.datasets.map(d=>({id:d.id,rows:[row]}))};
 }});
 const a=source.load({snapshot:'one'}),b=source.load({snapshot:'two'});
 await requested;finish();
 assert.equal(await a,data);assert.equal(await b,data);assert.equal(calls,1);
 assert.deepEqual(data.datasets[1].rows,[{...characters.h,pick:20,win:40,draw:30,loss:30,ban:5}]);
 const rows=data.datasets[0].rows;await source.load({snapshot:'one'});
 assert.equal(calls,1);assert.equal(data.datasets[0].rows,rows);
});

test('invalid rows cannot partially hydrate a partition and the next request retries',async()=>{
 const data=catalog();let calls=0;
 const source=createRankedLoader({characters,loadIndex:async()=>data,loadJSON:async()=>{
  calls++;return {datasets:[{id:'one',rows:[row]},{id:'two',rows:[calls===1?['unknown',1,2,3,4,5]:row]}]};
 }});
 await assert.rejects(source.load({snapshot:'one'}),/캐릭터 정보/);
 assert.ok(data.datasets.every(d=>!d.rows));
 await source.load({snapshot:'two'});assert.equal(calls,2);
 assert.ok(data.datasets.every(d=>d.rows.length===1));
});

test('a missing selected snapshot never commits sibling rows and can be retried',async()=>{
 const data=catalog();let calls=0;
 const source=createRankedLoader({characters,loadIndex:async()=>data,loadJSON:async()=>({datasets:(++calls===1?data.datasets.slice(1):data.datasets).map(d=>({id:d.id,rows:[row]}))})});
 await assert.rejects(source.load({snapshot:'one'}),/통계 항목/);
 assert.ok(data.datasets.every(d=>!d.rows));
 await source.load({snapshot:'one'});assert.equal(calls,2);
});

test('partition paths and versions are checked before sending any request',async()=>{
 for(const [path,version] of [['../data.json','123456abcdef'],['ranked/asia-s1.json','old']]){
  const data=catalog();data.datasets[0].path=path;data.assetVersions[path]=version;
  let calls=0;
  const source=createRankedLoader({characters,loadIndex:async()=>data,loadJSON:async()=>{calls++;}});
  await assert.rejects(source.load({snapshot:'one'}),/자료 경로/);assert.equal(calls,0);
 }
});
