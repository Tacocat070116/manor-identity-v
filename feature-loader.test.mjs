import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureLoader,createStyleLoader} from './dist/feature-loader.js';

test('feature requests share imports and styles, and retry after failure',async()=>{
 let imports=0,styles=0,fail=true;
 const module={mount(){}};
 const load=createFeatureLoader({board:{load:async()=>{imports++;return module;},styles:['shared']}},async()=>{styles++;if(fail)throw Error('offline');});
 const first=load('board'),second=load('board');assert.equal(first,second);
 await assert.rejects(first,/offline/);assert.equal(imports,1);assert.equal(styles,1);
 fail=false;assert.equal(await load('board'),module);assert.equal(imports,2);
 assert.equal(await load('board'),module);assert.equal(imports,2);
 await assert.rejects(load('missing'),/화면 구성/);
});

test('deferred styles keep their original cascade position and failures clear listeners for retry',async()=>{
 const listeners=new Map();let requests=0;
 const link={dataset:{href:'feedback.css?v=abc'},sheet:null,
  addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),
  removeAttribute(name){if(name==='href')this.url='';},
  set href(value){this.url=value;requests++;}
 };
 const load=createStyleLoader({querySelector:()=>link});
 const first=load('feedback');assert.equal(first,load('feedback'));assert.equal(requests,1);
 listeners.get('error')();await assert.rejects(first,/스타일/);assert.equal(listeners.size,0);assert.equal(link.url,'');
 const retry=load('feedback');assert.equal(requests,2);assert.equal(link.url,link.dataset.href);
 link.sheet={};listeners.get('load')();await retry;assert.equal(listeners.size,0);
 await load('feedback');assert.equal(requests,2);
});
