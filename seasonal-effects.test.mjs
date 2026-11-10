import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSeasonalEffects} from './dist/seasonal-effects.js';

function fixture({stored=null,reduced=false,blocked=false}={}){
 const events=()=>({listeners:new Map(),addEventListener(k,h){this.listeners.set(k,h);},removeEventListener(k,h){if(this.listeners.get(k)===h)this.listeners.delete(k);}});
 const input={name:'seasonal-motion'},status={},scene={attributes:{},setAttribute(k,v){this.attributes[k]=v;},remove(){this.removed=true;}};
 const document={...events(),documentElement:{dataset:{}},hidden:false,createElement:()=>scene,body:{prepend(node){this.scene=node;}},querySelector(selector){return selector.startsWith('input')?input:status;}};
 const media={...events(),matches:reduced};
 const storage={value:stored,getItem(){if(blocked)throw Error('blocked');return this.value;},setItem(k,v){if(blocked)throw Error('blocked');this.key=k;this.value=v;}};
 const effects=mountSeasonalEffects({document,storage,media});
 const change=checked=>{input.checked=checked;document.listeners.get('change')({target:input});};
 return {document,media,input,status,storage,scene,effects,change};
}

test('seasonal motion pauses offscreen and on request without losing the saved choice',()=>{
 const f=fixture();
 assert.equal(f.document.documentElement.dataset.seasonalMotion,'running');
 assert.equal(f.input.checked,true);
 assert.equal(f.scene.attributes['aria-hidden'],'true');assert.ok(Object.hasOwn(f.scene.attributes,'inert'));
 assert.equal((f.scene.innerHTML.match(/<i /g)||[]).length,24,'bounded particles, never an accumulating animation loop');
 f.document.hidden=true;f.document.listeners.get('visibilitychange')();
 assert.equal(f.document.documentElement.dataset.seasonalMotion,'paused');assert.equal(f.input.checked,true);
 f.document.hidden=false;f.document.listeners.get('visibilitychange')();
 assert.equal(f.document.documentElement.dataset.seasonalMotion,'running');
 f.change(false);
 assert.equal(f.storage.key,'manor-christmas-motion');assert.equal(f.storage.value,'off');
 assert.equal(f.document.documentElement.dataset.seasonalMotion,'paused');
 f.effects.refresh();assert.equal(f.input.checked,false,'opening the picker preserves a manual pause');
 f.effects.destroy();
 assert.equal(f.document.listeners.size,0);assert.equal(f.media.listeners.size,0);assert.equal(f.scene.removed,true);
 assert.equal(f.document.documentElement.dataset.seasonalMotion,undefined);
 assert.equal(fixture({stored:'off'}).document.documentElement.dataset.seasonalMotion,'paused');
});

test('system reduced motion overrides animation and restores the personal choice when released',()=>{
 for(const stored of ['on','off']){
  const f=fixture({stored,reduced:true});
  assert.equal(f.input.disabled,true);assert.equal(f.input.checked,false);
  assert.equal(f.document.documentElement.dataset.seasonalMotion,'paused');
  f.change(true);assert.equal(f.storage.value,stored,'a disabled control cannot replace the saved choice');
  f.media.matches=false;f.media.listeners.get('change')();
  assert.equal(f.input.disabled,false);assert.equal(f.input.checked,stored==='on');
  assert.equal(f.document.documentElement.dataset.seasonalMotion,stored==='on'?'running':'paused');
  f.media.matches=true;f.media.listeners.get('change')();
  assert.equal(f.document.documentElement.dataset.seasonalMotion,'paused');
 }
});

test('blocked storage still allows animation to be stopped for the visit',()=>{
 const f=fixture({blocked:true});
 f.change(false);
 assert.equal(f.input.checked,false);assert.equal(f.document.documentElement.dataset.seasonalMotion,'paused');
 assert.match(f.status.textContent,/이번 방문/);
 f.change(true);assert.equal(f.document.documentElement.dataset.seasonalMotion,'running');
});
