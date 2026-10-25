import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCarouselSession,carouselItems,carouselPose,mountHeroCarousel} from './dist/carousel.js';
const roster=JSON.parse(fs.readFileSync('dist/data.json','utf8')).characters;
function seeded(seed=17){return ()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}

class Target{
 listeners=new Map();
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type,properties={}){
  const event={type,target:this,cancelable:true,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...properties};
  for(const fn of [...(this.listeners.get(type)||[])])fn(event);
  return event;
 }
 listenerCount(){return [...this.listeners.values()].reduce((n,set)=>n+set.size,0);}
}
class Element extends Target{
 constructor(classes='',parent=null){super();this.classes=new Set(classes.split(' '));this.parent=parent;this.children=[];parent?.children.push(this);this.ownerDocument=parent?.ownerDocument;this.dataset={};this.style={};this.attributes={};this.textContent='';this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
 matches(selector){if(selector===':focus-visible')return !!this.keyboard;return selector.startsWith('.')?this.classes.has(selector.slice(1)):selector==='[data-carousel]'&&'carousel' in this.dataset;}
 closest(selector){return this.matches(selector)?this:this.parent?.closest(selector)||null;}
 contains(node){return !!node&&(node===this||this.children.some(child=>child.contains(node)));}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)||child.tag===selector?[child]:[]),...child.querySelectorAll(selector)]);}
 querySelector(selector){if(selector.startsWith('[data-carousel='))return this.querySelectorAll('[data-carousel]').find(el=>el.dataset.carousel===selector.match(/"([^"]+)"/)[1]);return this.querySelectorAll(selector)[0]||null;}
 setAttribute(name,value){this.attributes[name]=value;}
 getBoundingClientRect(){return {width:335};}
 focus(){this.ownerDocument.activeElement=this;}
}
function harness({reduced=false,index=0}={}){
 let time=0,serial=0;const tasks=new Map(),observers=[];
 const win=new Target(),doc=new Target(),media=new Target();
 media.matches=reduced;doc.hidden=false;doc.defaultView=win;
 const enqueue=(fn,delay,raf=false)=>{const id=++serial;tasks.set(id,{fn,at:time+delay,raf});return id;};
 Object.assign(win,{performance:{now:()=>time},setTimeout:(fn,delay)=>enqueue(fn,delay),clearTimeout:id=>tasks.delete(id),requestAnimationFrame:fn=>enqueue(fn,16,true),cancelAnimationFrame:id=>tasks.delete(id),matchMedia:()=>media,Image:class{}});
 for(const name of ['ResizeObserver','IntersectionObserver'])win[name]=class{constructor(callback){this.callback=callback;this.name=name;this.connected=false;observers.push(this);}observe(){this.connected=true;}disconnect(){this.connected=false;}};
 function advance(ms){
  const end=time+ms;let count=0;
  while(true){const next=[...tasks].filter(([,task])=>task.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
   assert.ok(++count<10000,'scheduler must not spin');const [id,task]=next;tasks.delete(id);time=task.at;task.fn(task.raf?time:undefined);
  }time=end;
 }
 const session=createCarouselSession(roster,seeded());session.index=index;
 const root=new Element('hero-carousel');root.ownerDocument=doc;
 const stage=new Element('hero-stage',root);
 for(const {index,character} of carouselItems(session)){
  const card=new Element('art-card',stage);card.dataset={id:character.id,index:String(index)};card.offsetWidth=140;card.offsetHeight=178;
  const image=new Element('',card);image.tag='img';image.src=character.portrait;
  const label=new Element('',card);label.tag='span';label.textContent=character.name;
 }
 // Touch captures the hit card implicitly. Capture changes are processed before
 // the next pointer event; lostpointercapture bubbles from the old target.
 const captures=new Map(),pendingCaptures=new Map();
 for(const element of [stage,...stage.children]){
  element.setPointerCapture=id=>pendingCaptures.set(id,element);
  element.hasPointerCapture=id=>pendingCaptures.get(id)===element;
  element.releasePointerCapture=id=>{if(element.hasPointerCapture(id))pendingCaptures.delete(id);};
 }
 function processCapture(id){
  const previous=captures.get(id);
  if(previous===pendingCaptures.get(id))return;
  if(previous)stage.emit('lostpointercapture',{target:previous,pointerId:id,cancelable:false});
  const next=pendingCaptures.get(id);
  if(next){stage.emit('gotpointercapture',{target:next,pointerId:id,cancelable:false});captures.set(id,next);}
  else captures.delete(id);
 }
 const controls={};for(const action of ['previous','toggle','next']){controls[action]=new Element('carousel-control',root);controls[action].dataset.carousel=action;}
 const status=new Element('carousel-status',root),selected=[];
 const mount=()=>mountHeroCarousel(root,session,{onSelect:id=>selected.push(id),icon:name=>name});
 let dispose=mount();
 const click=target=>root.emit('click',{target});
 const current=()=>stage.children.find(el=>el.tabIndex===0);
 const pointer=(type,x,y,extra={})=>{
  const properties={pointerId:1,isPrimary:true,pointerType:'touch',button:0,clientX:x,clientY:y,...extra},id=properties.pointerId;
  if(type==='pointerdown'){
   properties.target??=current();
   if(properties.pointerType!=='mouse')properties.target.setPointerCapture(id);
  }else{processCapture(id);properties.target??=captures.get(id)||stage;}
  const event=(type==='pointerdown'?stage:win).emit(type,properties);
  if(type==='pointerup'||type==='pointercancel'){pendingCaptures.delete(id);processCapture(id);}
  return event;
 };
 const visibleIds=()=>stage.children.map(el=>el.dataset.id);
 return {win,doc,media,root,stage,session,controls,status,selected,tasks,observers,advance,click,pointer,current,visibleIds,dispose:()=>dispose(),remount:()=>{dispose=mount();}};
}

test('all 89 characters appear once per shuffled loop, including reverse wrap',()=>{
 const before=roster.map(c=>c.id),a=createCarouselSession(roster,seeded(1)),b=createCarouselSession(roster,seeded(2));
 assert.deepEqual(roster.map(c=>c.id),before);assert.notDeepEqual(a.roster.map(c=>c.id),before);assert.notDeepEqual(a.roster.map(c=>c.id),b.roster.map(c=>c.id));
 const sequence=Array.from({length:89},(_,index)=>carouselItems(a,index)[2].character.id);
 assert.equal(new Set(sequence).size,89);assert.deepEqual([...sequence].sort(),[...before].sort());
 assert.equal(carouselItems(a,-1)[2].character.id,sequence.at(-1));assert.equal(carouselItems(a,89)[2].character.id,sequence[0]);
 for(const index of [-1000,-1,0,88,89,1000])assert.equal(new Set(carouselItems(a,index).map(item=>item.character.id)).size,5);
});

test('card poses stay finite and within narrow mobile and desktop stages during a turn',()=>{
 for(const [width,cw,ch] of [[280,140,178],[335,140,178],[420,162,204],[520,184,224]]){
  for(let offset=-2.5;offset<=2.5;offset+=.05){
   const p=carouselPose(offset,width,cw,ch);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.opacity>=0&&p.opacity<=1);
   if(p.opacity<.01)continue;
   const rz=p.rotation*Math.PI/180,ry=p.tilt*Math.PI/180;
   for(const x of [-cw/2,cw/2])for(const y of [-ch/2,ch/2]){
    const rotatedX=(x*Math.cos(rz)-y*Math.sin(rz))*p.scale;
    const screenX=(p.x+rotatedX*Math.cos(ry))*900/(900-p.z+rotatedX*Math.sin(ry));
    assert.ok(Math.abs(screenX)<width/2,`${width}px card edge at ${screenX}`);
   }
  }
 }
});

test('autoplay starts each turn three seconds apart including animation, and crosses the deck boundary',()=>{
 const h=harness({index:88});const initial=h.current().dataset.id;
 const initialTransform=h.current().style.transform;
 h.advance(2999);assert.equal(h.current().style.transform,initialTransform);
 h.advance(101);assert.equal(h.session.index,88);assert.notEqual(h.current().style.transform,initialTransform);
 h.advance(900);assert.equal(h.session.index,89);assert.notEqual(h.current().dataset.id,initial);
 assert.equal(h.current().dataset.id,h.session.roster[0].id);assert.equal(new Set(h.visibleIds()).size,5);
 const settledTransform=h.current().style.transform;
 h.advance(1999);assert.equal(h.current().style.transform,settledTransform);
 h.advance(101);assert.equal(h.session.index,89);assert.notEqual(h.current().style.transform,settledTransform);
 h.advance(900);assert.equal(h.session.index,90);assert.equal(h.stage.children.length,5);h.dispose();
});

test('touch drags from all three visible cards survive capture transfer, track movement and suppress the release click',()=>{
 for(const offset of [-1,0,1])for(const direction of [-1,1]){
  const h=harness(),first=h.current(),target=h.stage.children.find(el=>Number(el.dataset.index)===offset),before=first.style.transform;
  h.pointer('pointerdown',160,80,{target});assert.ok(target.hasPointerCapture(1));
  h.advance(16);h.pointer('pointermove',160+55*direction,82);h.advance(16);
  const firstMove=first.style.transform;assert.notEqual(firstMove,before);assert.ok(h.stage.hasPointerCapture(1));
  h.pointer('pointermove',160+125*direction,82);h.advance(16);
  assert.ok(h.root.classes.has('is-dragging'),'child capture loss must not end the drag');
  assert.notEqual(first.style.transform,firstMove,'finger movement continues after capture transfers');
  h.pointer('pointerup',160+125*direction,82);
  const click=h.click(first);assert.ok(click.defaultPrevented);assert.equal(h.selected.length,0);
  h.advance(900);assert.ok(h.session.index*direction<=-1&&h.session.index*direction>=-3);assert.equal(new Set(h.visibleIds()).size,5);
  h.click(h.current());assert.deepEqual(h.selected,[h.current().dataset.id]);h.dispose();
 }
});

test('mouse dragging still works and losing the stage capture really cancels the gesture',()=>{
 const h=harness();
 h.pointer('pointerdown',200,80,{pointerType:'mouse'});h.advance(16);h.pointer('pointermove',120,80,{pointerType:'mouse'});h.advance(16);
 h.pointer('pointermove',100,80,{pointerType:'mouse'});h.advance(16);
 assert.ok(h.root.classes.has('is-dragging'));assert.ok(h.stage.hasPointerCapture(1));
 h.stage.releasePointerCapture(1);h.pointer('pointermove',80,80,{pointerType:'mouse'});
 assert.equal(h.root.classes.has('is-dragging'),false);h.advance(900);
 const index=h.session.index,transform=h.current().style.transform;
 h.pointer('pointermove',10,80,{pointerType:'mouse'});h.advance(16);
 assert.equal(h.session.index,index);assert.equal(h.current().style.transform,transform);h.dispose();
});

test('vertical gestures preserve page scrolling and a normal tap still opens the shown character',()=>{
 const h=harness(),initial=h.current().dataset.id;
 h.pointer('pointerdown',100,50);const move=h.pointer('pointermove',103,100);assert.equal(move.defaultPrevented,false);
 h.pointer('pointercancel',103,100);h.advance(800);assert.equal(h.session.index,0);assert.equal(h.stage.hasPointerCapture(1),false);
 h.pointer('pointerdown',100,50);h.pointer('pointerup',100,50);h.click(h.current());assert.deepEqual(h.selected,[initial]);h.dispose();
});

test('pause and resume controls govern autoplay',()=>{
 const h=harness();h.click(h.controls.toggle);assert.equal(h.session.paused,true);assert.equal(h.controls.toggle.attributes['aria-pressed'],'false');
 h.advance(20000);assert.equal(h.session.index,0);h.click(h.controls.toggle);h.advance(5500);assert.equal(h.session.index,1);
 assert.equal(h.controls.toggle.attributes['aria-pressed'],'true');h.dispose();
});

test('reduced motion starts paused and manual controls change cards without animation',()=>{
 const h=harness({reduced:true});assert.equal(h.session.paused,true);h.advance(20000);assert.equal(h.session.index,0);
 h.click(h.controls.next);assert.equal(h.session.index,1);assert.equal(h.tasks.size,0);assert.match(h.status.textContent,/2 \/ 89/);
 h.click(h.controls.previous);assert.equal(h.session.index,0);h.dispose();
});

test('background and offscreen pauses resume without accumulating missed turns',()=>{
 const h=harness();h.doc.hidden=true;h.doc.emit('visibilitychange');h.advance(20000);assert.equal(h.session.index,0);
 h.doc.hidden=false;h.doc.emit('visibilitychange');h.advance(5500);assert.equal(h.session.index,1);
 const observer=h.observers.find(o=>o.name==='IntersectionObserver');observer.callback([{isIntersecting:false}]);h.advance(20000);assert.equal(h.session.index,1);
 observer.callback([{isIntersecting:true}]);h.advance(5500);assert.equal(h.session.index,2);h.dispose();
});

test('hover and keyboard focus pause autoplay, and arrows announce and focus the new card',()=>{
 const h=harness();h.root.emit('pointerenter',{pointerType:'mouse'});h.advance(10000);assert.equal(h.session.index,0);
 h.root.emit('pointerleave',{pointerType:'mouse'});const card=h.current();card.keyboard=true;h.root.emit('focusin',{target:card});h.advance(10000);assert.equal(h.session.index,0);
 h.root.emit('keydown',{key:'ArrowRight',target:card});h.advance(900);assert.equal(h.session.index,1);assert.equal(h.doc.activeElement,h.current());assert.ok(h.status.textContent.includes(h.session.roster[1].name));
 h.root.emit('focusout',{relatedTarget:null});h.advance(6500);assert.equal(h.session.index,2);h.dispose();
});

test('cancellation and cleanup remove gesture capture, listeners, observers, timers and frames',()=>{
 const h=harness();h.pointer('pointerdown',200,80);h.advance(16);h.pointer('pointermove',120,80);h.advance(16);h.pointer('pointercancel',120,80);h.advance(900);
 assert.equal(h.stage.hasPointerCapture(1),false);assert.equal(h.root.classes.has('is-dragging'),false);assert.ok(Number.isInteger(h.session.index));
 h.click(h.controls.next);h.advance(100);h.dispose();const index=h.session.index;
 assert.equal(h.tasks.size,0);for(const target of [h.root,h.stage,h.win,h.doc,h.media])assert.equal(target.listenerCount(),0);
 assert.ok(h.observers.every(o=>!o.connected));h.advance(50000);assert.equal(h.session.index,index);
 h.remount();assert.equal(h.tasks.size,1);h.advance(5500);assert.equal(h.session.index,index+1);h.dispose();
});

test('pausing during a turn finishes that turn smoothly and does not start another',()=>{
 const h=harness();h.advance(3200);const transform=h.current().style.transform;
 h.click(h.controls.toggle);assert.equal(h.current().style.transform,transform);
 h.advance(1200);assert.equal(h.session.index,1);h.advance(20000);assert.equal(h.session.index,1);h.dispose();
});

test('changed motion preferences are respected on return and browser shortcut keys remain native',()=>{
 const h=harness();const event=h.root.emit('keydown',{key:'ArrowLeft',altKey:true,target:h.current()});assert.equal(event.defaultPrevented,false);
 h.dispose();h.media.matches=true;h.remount();assert.equal(h.session.paused,true);h.advance(20000);assert.equal(h.session.index,0);h.dispose();
});
