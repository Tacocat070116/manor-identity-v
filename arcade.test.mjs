import test from 'node:test';
import assert from 'node:assert/strict';
import {encounters, shuffleEncounters, dealStages} from './dist/arcade-events.js';
import {mountArcade, encounterTiming} from './dist/arcade.js';

class Element {
 handlers=new Map();
 dataset={};children=[];attributes={};hidden=false;
 style={setProperty:(key,value)=>{this.style[key]=value;}};
 addEventListener(type,fn){this.handlers.set(type,fn);}
 removeEventListener(type){this.handlers.delete(type);}
 emit(type,detail={}){this.handlers.get(type)?.({target:this,preventDefault(){},...detail});}
 setAttribute(key,value){this.attributes[key]=value;}
 closest(key){return key==='button'?this:null;}
 contains(){return false;}
 append(child){this.children.push(child);}
 remove(){}
 focus(){}
}

function setup() {
 const root=new Element(), doc=new Element(), win=new Element();
 const nodes=new Map(),timers=new Map(),frames=new Map();
 let now=0,serial=0;
 const el=selector=>{
  if(!nodes.has(selector))nodes.set(selector,new Element());
  return nodes.get(selector);
 };
 root.ownerDocument=doc;doc.defaultView=win;doc.documentElement=new Element();doc.body=new Element();
 root.querySelector=el;root.querySelectorAll=doc.querySelectorAll=()=>[];
 doc.querySelector=()=>null;
 el('.px-hearts').children=[new Element(),new Element(),new Element()];
 Object.assign(win,{
  performance:{now:()=>now},
  MutationObserver:class{observe(){} disconnect(){}},
  setTimeout(fn,delay){timers.set(++serial,{fn,at:now+delay});return serial;},
  clearTimeout(id){timers.delete(id);},
  requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},
  cancelAnimationFrame(id){frames.delete(id);}
 });
 const dispose=mountArcade(root);
 function advance(ms){
  now+=ms;
  for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}
  for(const [id,fn] of [...frames]){frames.delete(id);fn(now);}
 }
 const target=el('.px-primary'), controls=el('.px-inputs');
 function touch(side){
  target.dataset.side=side;
  const e={target,button:0,pointerId:1,isPrimary:true};
  controls.emit('pointerdown',e);
  controls.emit('pointerup',e);
  controls.emit('click',{target,detail:0});
 }
 return {el,doc,win,advance,touch,dispose,timers,frames,phase:()=>el('.px-cabinet').dataset.phase};
}

function startWith(t,card){
 function generator(seed){
  return ()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
 }
 let seed=1;
 while(seed<10000 && shuffleEncounters(generator(seed))[0]!==card)seed++;
 assert.ok(seed<10000);
 t.mock.method(Math,'random',generator(seed));
}

test('each deck deals every encounter exactly once and changes between games',()=>{
 const names=encounters.map(e=>e.hunter+'/'+e.name);
 assert.equal(new Set(names).size,38);
 assert.equal(new Set(encounters.map(e=>e.kind)).size,5);
 const first=shuffleEncounters(()=>0), last=shuffleEncounters(()=>.999);
 assert.deepEqual(new Set(first),new Set(encounters));
 assert.deepEqual(new Set(last),new Set(encounters));
 assert.notDeepEqual(first,last);
 assert.notEqual(shuffleEncounters(()=>0,first[0].kind)[0].kind,first[0].kind);
});

test('a full deck plays 30 solo encounters and every stage of eight branching routes',()=>{
 const x=setup(), seen=new Set();let total=0,stagesPlayed=0;
 x.touch();
 while(Number(x.el('[data-round]').textContent)<=encounters.length){
  assert.ok(++stagesPlayed<=48);
  assert.equal(x.phase(),'warning');
  const board=x.el('.px-cabinet'), {kind,variant}=board.dataset;
  if(variant==='fusion')assert.equal(x.el('[data-name]').textContent,'조각상');
  x.advance(2500);
  assert.equal(x.phase(),'active');
  const title=x.el('[data-name]').textContent;
  const label=x.el('[data-hunter]').textContent;
  seen.add(label.includes(' · ')?label.split(' · ')[0]:title);
  if(variant==='fusion')assert.equal(title,'숭고의 형상');
  const encounter=encounters.find(e=>e.name===title);
  const window=encounterTiming(encounter,Number(x.el('[data-round]').textContent)).window;
  assert.equal(board.dataset.effect,encounter.effect);
  assert.equal(board.dataset.performance,'strike');
  total+=['beat','gauge'].includes(kind)?2:1;
  if(kind==='lane')x.touch(board.dataset.side);
  else if(kind==='tap')x.touch();
  else if(kind==='dodge'){
   x.advance(parseFloat(board.style['--travel'])-window+10);assert.equal(board.dataset.ready,'yes');x.touch();
  }
  else {
   const stages=variant==='double'?2:1;
   for(let i=0;i<stages;i++){
    const meter=x.el('.px-meter').style;
    const center=(parseFloat(meter['--start'])+parseFloat(meter['--width'])/2)/100;
    x.advance(parseFloat(board.style['--travel'])*(variant==='reverse'?1-center:center));
    x.touch();
    if(i+1<stages)assert.equal(x.phase(),'active');
   }
  }
  assert.equal(x.phase(),'result',title);
  assert.equal(board.dataset.hit,'yes',title);
  x.advance(1200);
 }
 assert.equal(stagesPlayed,48);assert.equal(seen.size,38);assert.equal(x.el('[data-round]').textContent,'39');
 assert.equal(x.el('.px-hearts').attributes['aria-label'],'남은 하트 3개');
 assert.equal(Number(x.el('[data-score]').textContent),total);
 x.dispose();
 assert.equal(x.timers.size+x.frames.size,0);
 assert.equal(x.doc.documentElement.dataset.arcade,undefined);
});

test('background suspends the same encounter and each early touchscreen input costs only one heart',()=>{
 const x=setup();x.touch();const name=x.el('[data-name]').textContent;
 x.doc.hidden=true;x.doc.emit('visibilitychange');x.advance(12000);
 assert.equal(x.phase(),'paused');
 x.doc.hidden=false;x.touch();assert.equal(x.phase(),'warning');
 assert.equal(x.el('[data-name]').textContent,name);
 for(const lives of [2,1,0]){
  x.touch();
  assert.equal(x.el('.px-hearts').attributes['aria-label'],'남은 하트 '+lives+'개');
  x.advance(1150);
 }
 assert.equal(x.phase(),'over');x.touch();
 assert.equal(x.el('[data-round]').textContent,'1');
 assert.equal(x.el('.px-hearts').attributes['aria-label'],'남은 하트 3개');
 x.dispose();
});

test('dodge opens at impact and closes at the deadline, including between animation frames',t=>{
 t.mock.method(Math,'random',()=>.999);
 const move=encounters.find(e=>e.effect==='statue'), timing=encounterTiming(move,1,.86+.999*.30);
 for(const [delay,hit] of [[0,false],[timing.hitAt-1,false],[timing.hitAt,true],[timing.duration-1,true],[timing.duration,false]]){
  const x=setup();x.touch();x.advance(2500);
  assert.equal(x.el('.px-cabinet').dataset.effect,'statue');
  x.advance(delay);
  x.touch();assert.equal(x.el('.px-cabinet').dataset.hit,hit?'yes':'no');
  x.dispose();
 }
});

for(const name of ['찰나의 생멸','연이은 생멸','밀랍 사격','사진관의 섬광']){
 test(name+' scores on first contact and ignores a release in the next round',t=>{
  const card=encounters.find(e=>e.name===name);
  assert.equal(card.kind,'tap');startWith(t,card);
  const x=setup();x.touch();x.advance(2200);x.advance(137);
  const target=x.el('.px-primary'), controls=x.el('.px-inputs');
  const pointer={target,button:0,pointerId:7,isPrimary:true};
  assert.equal(x.el('.px-meter').hidden,true);
  controls.emit('pointerdown',pointer);
  assert.equal(x.phase(),'result');assert.match(x.el('.px-dialogue strong').textContent,/137ms$/);
  assert.equal(x.el('[data-score]').textContent,'1');
  x.advance(1200);assert.equal(x.phase(),'warning');
  controls.emit('pointerup',pointer);controls.emit('click',{target,detail:1});
  assert.equal(x.phase(),'warning');assert.equal(x.el('.px-hearts').attributes['aria-label'],'남은 하트 3개');
  x.dispose();
 });
}

test('one keypress or assistive click blocks a chain attack, within the reaction window',t=>{
 const card=encounters.find(e=>e.name==='암실에서 탈출');
 for(const input of ['Space','Enter','click','early','timeout']){
  startWith(t,card);
  const x=setup();x.touch();
  const target=x.el('.px-primary');
  assert.equal(x.el('.px-cabinet').dataset.kind,'tap');
  if(input==='early')x.touch();
  else{
   x.advance(2200);
   const duration=parseFloat(x.el('.px-cabinet').style['--travel']);
   x.advance(input==='timeout'?duration:duration-1);
   if(input==='click')x.el('.px-inputs').emit('click',{target,detail:0});
   else if(input!=='timeout'){
    x.doc.emit('keydown',{target,code:input,repeat:true});assert.equal(x.phase(),'active');
    x.doc.emit('keydown',{target,code:input,repeat:false});
   }
  }
  const success=input!=='early'&&input!=='timeout';
  assert.equal(x.phase(),'result');assert.equal(x.el('[data-score]').textContent,success?'1':'0');
  assert.equal(x.el('.px-hearts').attributes['aria-label'],success?'남은 하트 3개':'남은 하트 2개');
  x.advance(1200);
  if(success)assert.match(x.el('[data-hunter]').textContent,/암실에서 탈출 · 2\/2/);
  else assert.equal(x.el('[data-round]').textContent,'2');
  x.dispose();
 }
});

test('the higher speed has a playable floor and previous records are shown separately',t=>{
 for(const e of encounters.filter(e=>!e.stages)){
  const first=encounterTiming(e,1), last=encounterTiming(e,21);
  assert.ok(last.duration<first.duration);
  assert.deepEqual(encounterTiming(e,90),last);
  assert.equal(first.window,245); assert.equal(last.window,165);
  if(e.kind==='dodge')assert.equal(last.duration-last.hitAt,165);
 }
 const store=new Map([['manor-arcade-surprise-best-v1','81'],['manor-arcade-surprise-nightmare-v1','7']]);
 const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>store.get(key)}});
 t.after(()=>{if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;});
 const x=setup();
 assert.equal(x.el('[data-best]').textContent,'7');assert.match(x.el('[data-legacy]').textContent,/81점/);
 x.dispose();
});


test('every route has achievable alternatives with different second or opening actions',()=>{
 const routes=encounters.filter(card=>card.stages);
 assert.equal(routes.length,8);
 for(const card of routes){
  const first=dealStages(card,()=>0),last=dealStages(card,()=>.999);
  assert.ok(first.length>=2&&first.length<=3);
  assert.ok(first.every(m=>m&&encounters.includes(m)&&!m.stages));
  assert.notDeepEqual(first,last);
  assert.ok(new Set(first.map(m=>m.kind)).size>=2);
 }
});

test('resuming an interrupted warning retains its cues and orientation',()=>{
 const x=setup();x.touch();
 const board=x.el('.px-cabinet');
 const state=()=>[board.dataset.facing, board.dataset.side,board.style['--tell'],x.el('[data-name]').textContent];
 const before=state();
 x.doc.hidden=true;x.doc.emit('visibilitychange');x.doc.hidden=false;
 x.touch();assert.equal(x.phase(),'warning');assert.deepEqual(state(),before);
 x.dispose();
});

test('a pending attack survives pause and failing it ends the route with one lost heart',t=>{
 const route=encounters.find(card=>card.name==='판자 뒤의 매복');
 startWith(t,route);
 const x=setup();x.touch();x.advance(2200);
 const board=x.el('.px-cabinet');x.touch(board.dataset.side);
 assert.equal(x.phase(),'result');assert.equal(x.el('[data-score]').textContent,'1');
 x.doc.hidden=true;x.doc.emit('visibilitychange');x.advance(5000);
 x.doc.hidden=false;x.touch();assert.equal(x.phase(),'warning');
 assert.match(x.el('[data-hunter]').textContent,/판자 뒤의 매복 · 2\/2/);
 x.touch();x.advance(1200);
 assert.equal(x.el('[data-round]').textContent,'2');
 assert.equal(x.el('.px-hearts').attributes['aria-label'],'남은 하트 2개');
 assert.equal(x.el('[data-score]').textContent,'1');x.dispose();
});
