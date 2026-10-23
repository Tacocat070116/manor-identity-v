import test from 'node:test';
import assert from 'node:assert/strict';
import {mountNavigation} from './dist/navigation.js';

class Target{
 listeners=new Map();
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type,detail={}){
  const event={target:this,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...detail};
  for(const fn of this.listeners.get(type)||[])fn(event);
  return event;
 }
 count(){return [...this.listeners.values()].reduce((n,s)=>n+s.size,0);}
}
function harness({reduced=false,animationSupport=true}={}){
 const doc=new Target(),win=new Target(),media=new Target(),reducedMotion=new Target(),animations=[];
 reducedMotion.matches=reduced;
 doc.defaultView=win;win.matchMedia=query=>query.includes('reduced-motion')?reducedMotion:media;
 function element(parent=null){
  const node=new Target(),classes=new Set();
  Object.assign(node,{parent,dataset:{},attrs:{},classes,textContent:'',innerHTML:'',inert:false,
   classList:{toggle(name,on){on?classes.add(name):classes.delete(name);}},
   setAttribute(name,value){this.attrs[name]=value;},removeAttribute(name){delete this.attrs[name];},
   contains(other){for(let p=other;p;p=p.parent)if(p===this)return true;return false;},
   focus(){doc.activeElement=this;doc.emit('focusin',{target:this});},
   closest(selector){for(let p=this;p;p=p.parent)if(selector==='.nav-item'&&p.dataset.view)return p;return null;}
  });
  return node;
 }
 const nav=element(),toggle=element(nav),panel=element(nav),currentIcon=element(toggle),currentLabel=element(toggle),themeButton=element(),outside=element();
 const naturalWidth=()=>currentLabel.textContent==='MANOR 업데이트'?248:currentLabel.textContent==='밴 분석'?184:150;
 toggle.getBoundingClientRect=()=>({width:toggle.activeAnimation?.sampleWidth??naturalWidth()});
 if(animationSupport)for(const target of [toggle,currentLabel])target.animate=(frames,options)=>{
  const animation={frames,options,target,sampleWidth:parseFloat(frames[0].width),cancelled:false,
   cancel(){this.cancelled=true;if(target.activeAnimation===this)target.activeAnimation=null;},
   finish(){if(target.activeAnimation===this)target.activeAnimation=null;this.onfinish?.();}
  };
  target.activeAnimation=animation;animations.push(animation);return animation;
 };
 const entries=[['explore','도감','grid'],['matchup','매치업','swords'],['compare','비교','compare'],['bans','밴 분석','shield'],['statistics','통계','chart'],['feedback','피드백','message'],['patchnotes','MANOR 업데이트','spark']];
 const links=entries.map(([view,navLabel,navIcon])=>Object.assign(element(panel),{dataset:{view,navLabel,navIcon}}));
 nav.querySelector=s=>s==='[data-nav-toggle]'?toggle:panel;
 panel.querySelectorAll=()=>links;
 toggle.querySelector=s=>s==='[data-nav-current-icon]'?currentIcon:currentLabel;
 const root={ownerDocument:doc,querySelector:s=>s==='.category-nav'?nav:themeButton};
 const controller=mountNavigation(root,{icon:n=>'icon:'+n});
 return {controller,doc,win,media,reducedMotion,animations,nav,toggle,panel,links,currentIcon,currentLabel,themeButton,outside,element,
  update:(view,theme='light')=>controller.update({view,theme,themeLabel:theme==='dark'?'다크':'화이트'}),
  isOpen:()=>toggle.attrs['aria-expanded']==='true'
 };
}
function assertClosed(h){
 assert.equal(h.isOpen(),false);assert.equal(h.panel.inert,true);assert.equal(h.panel.attrs['aria-hidden'],'true');
 assert.ok(h.links.every(link=>link.attrs.tabindex==='-1'));
}
test('one collapsed menu reports the current route, including character pages and unknown routes',()=>{
 const h=harness();h.update('feedback');assertClosed(h);
 assert.equal(h.currentLabel.textContent,'피드백');assert.equal(h.currentIcon.innerHTML,'icon:message');
 assert.match(h.toggle.attrs['aria-label'],/열기.*피드백/);
 assert.equal(h.links.filter(link=>link.attrs['aria-current']==='page').length,1);
 const sameLinks=[...h.links];h.update('character');
 assert.equal(h.currentLabel.textContent,'도감');assert.equal(h.links[0].attrs['aria-current'],'page');
 h.update('unknown');assert.equal(h.currentLabel.textContent,'메뉴');
 assert.ok(h.links.every(link=>!link.attrs['aria-current']));
 h.update('patchnotes','dark');assert.equal(h.currentLabel.textContent,'MANOR 업데이트');
 assert.equal(h.themeButton.innerHTML,'icon:palette');assert.equal(h.themeButton.attrs['aria-label'],'컬러 테마 선택 · 현재 다크');
 assert.ok(h.links.every((link,i)=>link===sameLinks[i]));h.controller.destroy();
});
test('touch/click toggles reverse immediately and hidden links stay outside the tab order',()=>{
 const h=harness();h.update('explore');
 for(let i=0;i<30;i++){
  h.toggle.emit('click');assert.equal(h.isOpen(),true);
  assert.equal(h.panel.inert,false);assert.equal(h.panel.attrs['aria-hidden'],'false');
  assert.ok(h.links.every(link=>link.attrs.tabindex===undefined));
  h.doc.emit('pointerdown',{target:h.links[2],pointerType:'touch'});assert.equal(h.isOpen(),true);
  h.toggle.emit('click');assertClosed(h);
 }
 assert.equal(h.toggle.count(),2);h.controller.destroy();
});
test('normal link selection closes the menu without intercepting native navigation',()=>{
 const h=harness();h.update('compare');h.toggle.emit('click');h.links[2].focus();
 const child=h.element(h.links[2]),event=h.panel.emit('click',{target:child});
 assert.equal(event.defaultPrevented,false);assertClosed(h);assert.equal(h.doc.activeElement,h.toggle);
 for(const detail of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){
  if(!h.isOpen())h.toggle.emit('click');
  h.panel.emit('click',{target:h.links[4],...detail});assert.equal(h.isOpen(),true);
 }
 h.panel.emit('click',{target:h.links[4]});assertClosed(h);
 h.update('statistics');assert.equal(h.currentLabel.textContent,'통계');h.controller.destroy();
});
test('keyboard opening, Escape and tabbing away preserve a useful focus position',()=>{
 const h=harness();h.update('bans');h.toggle.focus();
 const down=h.toggle.emit('keydown',{key:'ArrowDown'});assert.ok(down.defaultPrevented);
 assert.equal(h.isOpen(),true);assert.equal(h.doc.activeElement,h.links[3]);
 const escape=h.doc.emit('keydown',{key:'Escape'});assert.ok(escape.defaultPrevented);
 assertClosed(h);assert.equal(h.doc.activeElement,h.toggle);
 h.toggle.emit('keydown',{key:'ArrowUp'});assert.equal(h.doc.activeElement,h.links.at(-1));
 h.outside.focus();assertClosed(h);assert.equal(h.doc.activeElement,h.outside);
 assert.equal(h.doc.emit('keydown',{key:'Escape'}).defaultPrevented,false);
 assert.equal(h.toggle.emit('keydown',{key:'Tab'}).defaultPrevented,false);h.controller.destroy();
});
test('outside pointer actions dismiss without blocking the page or stealing new focus',()=>{
 const h=harness();h.update('explore');h.toggle.emit('click');h.links[0].focus();
 const event=h.doc.emit('pointerdown',{target:h.outside,pointerType:'touch'});
 assert.equal(event.defaultPrevented,false);assertClosed(h);
 assert.equal(h.doc.activeElement,h.toggle);h.outside.focus();assert.equal(h.doc.activeElement,h.outside);
 h.toggle.emit('click');h.doc.emit('pointerdown',{target:h.toggle});assert.equal(h.isOpen(),true);
 h.toggle.emit('click');assertClosed(h);h.controller.destroy();
});
test('routing closes the disclosure while same-route theme updates retain its state',()=>{
 const h=harness();h.update('explore');h.toggle.emit('click');
 h.update('explore','dark');assert.equal(h.isOpen(),true);
 h.links[0].focus();h.update('character','dark');assertClosed(h);
 assert.equal(h.currentLabel.textContent,'도감');assert.equal(h.doc.activeElement,h.toggle);
 h.toggle.emit('click');h.update('feedback');assertClosed(h);
 assert.equal(h.currentLabel.textContent,'피드백');h.controller.destroy();
});
test('breakpoint changes, page restoration and teardown cannot leave an invisible focused menu',()=>{
 const h=harness();h.update('explore');
 for(const [target,type] of [[h.media,'change'],[h.win,'pagehide'],[h.win,'pageshow']]){
  h.toggle.emit('click');h.links[1].focus();target.emit(type);
  assertClosed(h);assert.equal(h.doc.activeElement,h.toggle);
 }
 h.toggle.emit('click');h.links[5].focus();h.controller.destroy();assertClosed(h);
 assert.equal(h.doc.activeElement,h.toggle);
 for(const target of [h.toggle,h.panel,h.doc,h.win,h.media,h.reducedMotion])assert.equal(target.count(),0);
 h.toggle.emit('click');h.update('feedback');assertClosed(h);assert.equal(h.currentLabel.textContent,'도감');
 h.controller.destroy();
});
test('category width stays within its endpoints and interruptions continue from the visible width',()=>{
 const h=harness();h.update('explore');assert.equal(h.animations.length,0);
 h.update('patchnotes');const first=h.toggle.activeAnimation;
 assert.equal(parseFloat(first.frames[0].width),150);
 assert.equal(parseFloat(first.frames.at(-1).width),248);
 assert.ok(first.frames.every(frame=>parseFloat(frame.width)>=150&&parseFloat(frame.width)<=248));
 assert.equal(first.options.easing,'cubic-bezier(.4,0,.2,1)');
 assert.equal(first.options.duration,640);
 assert.ok(first.frames.every(frame=>Number.isFinite(parseFloat(frame.width))));
 first.sampleWidth=235;
 h.update('bans');const second=h.toggle.activeAnimation;
 assert.equal(first.cancelled,true);assert.equal(parseFloat(second.frames[0].width),235);
 assert.equal(parseFloat(second.frames.at(-1).width),184);
 assert.ok(second.frames.every(frame=>parseFloat(frame.width)>=184&&parseFloat(frame.width)<=235));
 h.update('bans','dark');assert.equal(h.toggle.activeAnimation,second);
 second.finish();assert.equal(h.toggle.getBoundingClientRect().width,184);
 h.update('explore');assert.equal(parseFloat(h.toggle.activeAnimation.frames.at(-1).width),150);
 h.controller.destroy();assert.equal(h.toggle.activeAnimation,null);assert.equal(h.currentLabel.activeAnimation,null);
});
test('reduced motion, unsupported animation and viewport changes retain natural layout',()=>{
 for(const options of [{reduced:true},{animationSupport:false}]){
  const h=harness(options);h.update('explore');h.update('patchnotes');
  assert.equal(h.animations.length,0);assert.equal(h.toggle.getBoundingClientRect().width,248);h.controller.destroy();
 }
 const h=harness();h.update('explore');h.update('patchnotes');
 h.reducedMotion.matches=true;h.reducedMotion.emit('change');
 assert.equal(h.toggle.activeAnimation,null);assert.equal(h.currentLabel.activeAnimation,null);
 h.update('explore');assert.equal(h.toggle.getBoundingClientRect().width,150);
 h.reducedMotion.matches=false;h.update('patchnotes');const previous=h.toggle.activeAnimation;
 h.win.emit('resize');assert.equal(previous.cancelled,true);assert.equal(h.toggle.getBoundingClientRect().width,248);
 h.controller.destroy();
});
