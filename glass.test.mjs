import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGlass,lensMetrics,lensSample} from './dist/glass.js';

test('optical sampling follows the real backdrop without moving its centre',()=>{
 const rect={left:40,top:240,width:320,height:280},zoom=1.06;
 const original=lensSample(rect,zoom);
 assert.equal(original.x+original.width/2,rect.left+rect.width/2);
 assert.equal(original.y+original.height/2,rect.top+rect.height/2);
 const scrolled=lensSample({...rect,top:rect.top-132},zoom);
 assert.equal(scrolled.y,original.y-132);
 assert.equal(scrolled.width,original.width);
 assert.ok(original.width<rect.width,'magnification samples a smaller real scene area');
});

test('high-density phones and long patch notes have bounded canvas memory',()=>{
 for(const [width,height,dpr]of [[375,667,3],[390,844,3],[1400,900,2],[340,40000,3],[30000,100,2]]){
  const size=lensMetrics(width,height,dpr);
  assert.ok(size.width*size.height<=462000);
  assert.ok(size.width<=2048&&size.height<=4096);
  assert.ok(size.ratio<=1.5);
 }
});

function environment({supported=true,reduced=false,canvasAvailable=true}={}){
 const frames=new Map(),events=new Map(),docEvents=new Map(),mutations=[],intersections=[],resizes=[],canvases=[];
 let sequence=0;
 const media=()=>({matches:false,handlers:new Map(),addEventListener(k,fn){this.handlers.set(k,fn);},removeEventListener(k){this.handlers.delete(k);}});
 const reduce=media(),forced=media();reduce.matches=reduced;
 const classes=()=>{const set=new Set();return {add:c=>set.add(c),remove:c=>set.delete(c),contains:c=>set.has(c)};};
 function element(){return {nodeType:1,classList:classes(),children:[],isConnected:true,clientLeft:1,clientTop:1,clientWidth:318,clientHeight:278,append(n){this.children.push(n);n.parent=this;n.isConnected=true;},prepend(n){this.append(n);},remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},setAttribute(k,v){this[k]=v;},getBoundingClientRect(){return {left:40,top:200,width:320,height:280,bottom:480,right:360};}};}
 const root=element();root.clientWidth=390;
 const target=element(),content={title:'실전 운용 가이드',clicks:0};target.children.push(content);
 const body=element();let targets=[target];
 const document={body,documentElement:root,hidden:false,querySelectorAll:()=>targets,createElement(){
  const canvas=element();canvas.isConnected=false;
  const context=new Proxy({draws:0,drawImage(){this.draws++;},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:()=>{}});
  canvas.getContext=()=>canvasAvailable?context:null;canvas.context=context;canvases.push(canvas);return canvas;
 },addEventListener:(k,fn)=>docEvents.set(k,fn),removeEventListener:k=>docEvents.delete(k)};
 const palette={'--bg':'#e9f1ed','--surface-solid':'#f6faf7','--ambient-one':'#a9d2bb','--ambient-two':'#c2d8b8','--sheen-rgb':'246,250,247'};
 const observer=list=>class {constructor(callback){this.callback=callback;this.items=new Set();list.push(this);}observe(e){this.items.add(e);}unobserve(e){this.items.delete(e);}disconnect(){this.items.clear();this.disconnected=true;}};
 const window={innerHeight:844,devicePixelRatio:3,CSS:{supports:()=>supported},matchMedia:q=>q.includes('transparency')?reduce:forced,
  requestAnimationFrame(fn){const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  getComputedStyle:e=>e===root?{getPropertyValue:k=>palette[k]}:{position:'static',borderTopLeftRadius:'28px'},
  ResizeObserver:observer(resizes),IntersectionObserver:observer(intersections),MutationObserver:observer(mutations),
  addEventListener:(k,fn)=>events.set(k,fn),removeEventListener:k=>events.delete(k)
 };
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 return {window,document,frames,events,docEvents,mutations,intersections,resizes,canvases,target,content,reduce,forced,flush,setTargets:v=>{targets=v;}};
}

test('effects are decorative, single-instance and idle when the page is still',()=>{
 const env=environment(),dispose=mountGlass(env.document,env.window);env.flush();
 assert.equal(env.canvases.length,2,'one shared environment and one visible lens');
 assert.equal(env.frames.size,0,'no perpetual animation loop');
 assert.equal(env.target.children[0],env.content,'existing content is neither cloned nor replaced');
 assert.equal(env.canvases[1]['aria-hidden'],'true');
 const draws=env.canvases[1].context.draws;
 env.events.get('scroll')();env.events.get('scroll')();assert.equal(env.frames.size,1,'scroll events coalesce');env.flush();
 assert.ok(env.canvases[1].context.draws>draws);
 env.intersections[0].callback([{target:env.target,isIntersecting:false}]);env.flush();
 const offscreen=env.canvases[1].context.draws;env.events.get('scroll')();env.flush();assert.equal(env.canvases[1].context.draws,offscreen);
 env.mutations[1].callback([]);env.flush();assert.equal(env.canvases.length,2,'theme changes reuse the existing DOM');
 dispose();assert.deepEqual(env.target.children,[env.content]);assert.equal(env.events.size,0);assert.equal(env.docEvents.size,0);
 assert.equal(env.target.classList.contains('glass-anchor'),false);
 assert.ok([...env.mutations,...env.intersections,...env.resizes].every(o=>o.disconnected));
});

test('route changes release old surfaces; preference changes suspend and restore optics',()=>{
 const env=environment(),dispose=mountGlass(env.document,env.window);env.flush();
 env.reduce.matches=true;env.reduce.handlers.get('change')();env.flush();
 assert.equal(env.document.documentElement.classList.contains('glass-ready'),false);
 assert.equal(env.canvases[0].isConnected,false);
 env.reduce.matches=false;env.reduce.handlers.get('change')();env.flush();
 assert.equal(env.canvases.length,2,'restoring glass does not duplicate canvases');
 env.target.isConnected=false;env.setTargets([]);
 env.mutations[0].callback([{addedNodes:[],removedNodes:[env.target]}]);env.flush();
 assert.equal(env.canvases[1].isConnected,false);assert.equal(env.intersections[0].items.size,0);assert.equal(env.resizes[0].items.size,0);
 dispose();
});

test('unsupported graphics and transparency preferences leave the app usable',()=>{
 for(const options of [{supported:false},{canvasAvailable:false},{reduced:true}]){
  const env=environment(options),dispose=mountGlass(env.document,env.window);env.flush();
  assert.deepEqual(env.target.children,[env.content]);
  assert.equal(env.document.documentElement.classList.contains('glass-ready'),false);
  assert.equal(env.frames.size,0);dispose();
 }
});
