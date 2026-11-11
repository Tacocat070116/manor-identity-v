import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMapInput} from './dist/maps-input.js';

function inputFixture(t,{tool='select'}={}){
 const handlers=new Map(),captures=new Set(),frames=new Map(),attrs=new Map();
 const moved=[],placed=[];let nextFrame=0,box=[0,0,1000,1000];
 const original=Object.fromEntries(['DOMPoint','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.assign(globalThis,{
  DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(matrix){return matrix.transform(this);}},
  requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},
  cancelAnimationFrame:id=>frames.delete(id)
 });
 const item={dataset:{mapItem:'item'},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 const svg={setAttribute(k,v){if(k==='viewBox')box=v.split(' ').map(Number);},getScreenCTM:()=>({inverse:()=>({transform:p=>({x:box[0]+p.x*box[2]/1000,y:box[1]+p.y*box[3]/1000})})})};
 const stage={
  addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:name=>handlers.delete(name),
  setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
  getBoundingClientRect:()=>({x:0,y:0,width:1000,height:1000}),
  querySelector:selector=>selector==='svg'?svg:item,
  querySelectorAll:()=>attrs.has('transform')?[item]:[]
 };
 const input=mountMapInput(stage,{bounds:{width:1000,height:1000},getTool:()=>tool,onPoint:p=>placed.push(p),onSelect:()=>{},onMove:(...args)=>moved.push(args)});
 t.after(()=>{input.destroy();for(const [key,value]of Object.entries(original)){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}});
 return {input,attrs,moved,placed,frames,
  emit(type,id,x,y,onItem=false){handlers.get(type)?.({button:0,pointerId:id,clientX:x,clientY:y,target:{closest:selector=>onItem&&selector==='[data-map-item]'?item:null}});},
  frame(){for(const [id,fn]of frames){frames.delete(id);fn();}}
 };
}

test('switching a marker drag to a pinch clears its preview without committing a move',t=>{
 const f=inputFixture(t);f.emit('pointerdown',1,100,100,true);f.emit('pointermove',1,140,130);f.frame();
 assert.equal(f.attrs.get('transform'),'translate(40 30)');
 f.emit('pointerdown',2,300,300);
 assert.equal(f.attrs.has('transform'),false);
 f.emit('pointerup',1,140,130);f.emit('pointerup',2,300,300);
 assert.equal(f.moved.length,0);assert.equal(f.placed.length,0);
});

test('an additional finger during a pinch never adds an unintended tactical marker',t=>{
 const f=inputFixture(t,{tool:'note'});f.emit('pointerdown',1,200,200);f.emit('pointerdown',2,600,600);
 f.emit('pointerdown',3,800,800);f.emit('pointerup',3,800,800);
 f.emit('pointerup',1,200,200);f.emit('pointerup',2,600,600);
 assert.equal(f.placed.length,0);
});

test('the remaining finger can pan after a pinch and cancellation clears pending drag work',t=>{
 const f=inputFixture(t);f.input.setView({scale:2,x:200,y:200});
 f.emit('pointerdown',1,200,200);f.emit('pointerdown',2,600,600);f.emit('pointerup',2,600,600);
 f.emit('lostpointercapture',2,600,600);
 f.emit('pointermove',1,300,200);assert.equal(f.input.getView().x,150);
 f.emit('pointerup',1,300,200);assert.equal(f.placed.length,0);
 f.emit('pointerdown',1,100,100,true);f.emit('pointermove',1,150,150);
 f.emit('pointercancel',1,150,150);f.frame();
 assert.equal(f.attrs.has('transform'),false);assert.equal(f.moved.length,0);
});

test('ordinary marker dragging commits once and releasing the pointer clears its preview',t=>{
 const f=inputFixture(t);f.emit('pointerdown',1,100,100,true);f.emit('pointermove',1,160,145);f.frame();
 f.emit('pointerup',1,160,145);f.emit('lostpointercapture',1,160,145);
 assert.deepEqual(f.moved,[['item',60,45]]);assert.equal(f.attrs.has('transform'),false);
 assert.equal(f.placed.length,0);assert.equal(f.frames.size,0);
});
