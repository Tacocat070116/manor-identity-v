import test from 'node:test';
import assert from 'node:assert/strict';
import {mountNavigation} from './dist/navigation.js';

class Target{
 listeners=new Map();
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type){for(const fn of this.listeners.get(type)||[])fn();}
 count(){return [...this.listeners.values()].reduce((n,s)=>n+s.size,0);}
}
function transformed(value,width,height){
 const m=value.match(/translate3d\(([^,]+),([^,]+),0\) scale\(([^,]+),([^)]+)\)/);
 assert.ok(m,'valid transform');
 const [x,y,sx,sy]=m.slice(1).map(parseFloat);
 return {x:x+width/2-width*sx/2,y:y+height/2-height*sy/2,width:width*sx,height:height*sy};
}
function harness({reduced=false,animate=true,observe=true}={}){
 const win=new Target(),media=new Target();media.matches=reduced;
 win.matchMedia=()=>media;
 const views=['explore','matchup','compare','bans','statistics','feedback'],animations=[],observers=[];
 let width=362,pill;
 const frame={left:14,top:700};
 const nav={dataset:{},clientLeft:1,clientTop:1,prepend(el){pill=el;},getBoundingClientRect:()=>({...frame,width,height:width?66:0})};
 const mobile=views.map((view,i)=>link(view,()=>width?{left:frame.left+9+i*(width-18)/6,top:frame.top+9,width:(width-18)/6,height:48}:{left:0,top:0,width:0,height:0}));
 const desktop=views.map(view=>link(view));
 const links=[...desktop,...mobile];nav.contains=el=>mobile.includes(el);
 const themeButton=link('theme');
 function link(view,rect){
  const classes=new Set(),attrs={};
  return {dataset:{view},attrs,classes,innerHTML:'',classList:{toggle(c,on){on?classes.add(c):classes.delete(c);}},setAttribute(k,v){attrs[k]=v;},removeAttribute(k){delete attrs[k];},getBoundingClientRect:rect};
 }
 if(observe)win.ResizeObserver=class{
  constructor(callback){this.callback=callback;this.targets=[];this.disconnected=false;observers.push(this);}
  observe(target){this.targets.push(target);}
  disconnect(){this.disconnected=true;}
 };
 const doc={defaultView:win,createElement(){
  const el={style:{},attrs:{},visual:null,hidden:false,setAttribute(k,v){this.attrs[k]=v;},remove(){this.removed=true;},getBoundingClientRect(){
   const b=this.visual||transformed(this.style.transform,parseFloat(this.style.width),parseFloat(this.style.height));
   return {left:frame.left+1+b.x,top:frame.top+1+b.y,width:b.width,height:b.height};
  }};
  if(animate)el.animate=(frames,options)=>{
   const motion={frames,options,cancelled:false,onfinish:null,cancel(){this.cancelled=true;el.visual=null;}};
   animations.push(motion);return motion;
  };
  return el;
 }};
 const root={ownerDocument:doc,querySelectorAll:()=>links,querySelector:s=>s==='.mobile-nav'?nav:themeButton};
 const controller=mountNavigation(root,{icon:n=>'icon:'+n});
 return {controller,nav,mobile,desktop,links,media,win,themeButton,animations,observers,pill:()=>pill,
  update:(view,theme='light')=>controller.update({view,theme}),
  resize(w){width=w;if(observers.length)observers[0].callback();else win.emit('resize');}
 };
}
const close=(a,b)=>assert.ok(Math.abs(a-b)<.00001,a+' equals '+b);

test('selection follows routing immediately while one noninteractive glass layer moves',()=>{
 const h=harness();h.update('explore');
 assert.equal(h.animations.length,0);assert.equal(h.pill().attrs['aria-hidden'],'true');
 assert.equal(h.mobile[0].attrs['aria-current'],'page');
 const pill=h.pill();h.update('feedback');
 assert.equal(h.pill(),pill);assert.equal(h.animations.length,1);
 assert.equal(h.mobile[5].attrs['aria-current'],'page');assert.equal(h.desktop[5].attrs['aria-current'],'page');
 assert.equal(h.mobile[0].attrs['aria-current'],undefined);
 assert.ok(h.animations[0].options.duration>=520&&h.animations[0].options.duration<=660);
 const frames=h.animations[0].frames,w=parseFloat(pill.style.width),height=parseFloat(pill.style.height);
 const start=transformed(frames[0].transform,w,height),end=transformed(frames.at(-1).transform,w,height);
 close(start.x,8);close(end.x,8+5*w);close(end.width,w);close(end.height,48);
 assert.ok(frames.slice(1,-1).some(f=>transformed(f.transform,w,height).width>w));
 h.update('feedback','dark');assert.equal(h.animations.length,1);
 assert.equal(h.themeButton.innerHTML,'icon:sun');assert.match(h.themeButton.attrs['aria-label'],/라이트/);
 h.controller.destroy();
});

test('rapid changes continue from the actual in-flight position and keep link identity',()=>{
 const h=harness();h.update('explore');h.update('statistics');
 const previous=h.animations[0],links=[...h.links],visual={x:105.25,y:9.5,width:64.75,height:46.25};
 h.pill().visual=visual;h.update('matchup');
 assert.ok(previous.cancelled);assert.equal(h.animations.length,2);
 const pill=h.pill(),first=h.animations[1].frames[0];
 const from=transformed(first.transform,parseFloat(pill.style.width),parseFloat(pill.style.height));
 for(const key of ['x','y','width','height'])close(from[key],visual[key]);
 assert.ok(h.links.every((link,i)=>link===links[i]));
 h.update('matchup');assert.equal(h.animations.length,2);
 h.update('character');assert.equal(h.mobile[0].attrs['aria-current'],'page');
 h.controller.destroy();
});

test('reduced motion, resize, hidden desktop layout and non-menu routes settle without stale animation',()=>{
 const h=harness({reduced:true});h.update('explore');h.update('bans');assert.equal(h.animations.length,0);
 h.media.matches=false;h.media.emit('change');h.update('feedback');assert.equal(h.animations.length,1);
 h.media.matches=true;h.media.emit('change');assert.ok(h.animations[0].cancelled);
 h.resize(400);close(parseFloat(h.pill().style.width),(400-18)/6);
 h.resize(0);assert.ok(h.pill().hidden);assert.equal(h.nav.dataset.navMotion,undefined);
 h.update('compare');h.resize(320);assert.equal(h.pill().hidden,false);assert.equal(h.animations.length,1);
 h.update('sources');assert.ok(h.pill().hidden);assert.ok(h.links.every(link=>!link.classes.has('active')));
 h.update('character');assert.equal(h.mobile[0].attrs['aria-current'],'page');assert.equal(h.pill().hidden,false);
 h.controller.destroy();assert.ok(h.observers[0].disconnected);assert.equal(h.media.count(),0);assert.equal(h.win.count(),0);
});

test('unavailable animation and resize APIs retain immediate selection and clean teardown',()=>{
 const h=harness({animate:false,observe:false});h.update('explore');h.update('statistics');h.resize(340);
 assert.equal(h.mobile[4].attrs['aria-current'],'page');assert.equal(h.animations.length,0);
 close(parseFloat(h.pill().style.width),(340-18)/6);
 h.win.emit('pageshow');h.controller.destroy();assert.ok(h.pill().removed);
 h.update('feedback');assert.equal(h.mobile[4].attrs['aria-current'],'page');assert.equal(h.win.count(),0);
});
