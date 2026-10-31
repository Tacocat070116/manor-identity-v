const AUTO_INTERVAL=3000;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const wrap=(index,length)=>((index%length)+length)%length;

export function createCarouselSession(characters,random=Math.random){
 const roster=[...characters];
 for(let i=roster.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[roster[i],roster[j]]=[roster[j],roster[i]];}
 return {roster,index:0,paused:null};
}

export function carouselItems(session,center=session.index){
 return Array.from({length:5},(_,i)=>{const index=center+i-2;return {index,character:session.roster[wrap(index,session.roster.length)]};});
}

export function carouselPose(offset,width,cardWidth,cardHeight,compact=false){
 const turn=clamp(offset,-2.5,2.5),step=(compact?36:22)*Math.PI/180,angle=turn*step;
 // Desktop cards fan around their lower half. Mobile cards rise from and
 // descend toward the stage's lower edge along a full semicircle.
 const edge=2.5*step;
 const room=(width/2-12-cardWidth/2*Math.cos(edge)-cardHeight/2*Math.sin(edge))/Math.sin(edge);
 const radius=compact?Math.min(cardHeight*.64,width*.38):Math.max(0,Math.min(cardHeight*.48,room));
 return {x:Math.sin(angle)*radius,y:(1-Math.cos(angle))*radius,z:0,scale:1,tilt:0,rotation:turn*(compact?36:22),opacity:clamp((2.5-Math.abs(offset))/.55,0,1),layer:Math.round(150-Math.abs(offset)*20)};
}

export function mountHeroCarousel(root,session,{onSelect,icon}){
 if(!root||session.roster.length<5)return ()=>{};
 const doc=root.ownerDocument,win=doc.defaultView;
 const stage=root.querySelector('.hero-stage');
 const cards=[...stage.querySelectorAll('.art-card')].map(element=>({element,image:element.querySelector('img'),label:element.querySelector('span'),index:Number(element.dataset.index)}));
 const toggle=root.querySelector('[data-carousel="toggle"]');
 const status=root.querySelector('.carousel-status');
 const media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const compact=win.matchMedia('(max-width: 640px)');
 if(media.matches||session.paused===null)session.paused=media.matches;
 let position=session.index,width=0,cardWidth=0,cardHeight=0,paintFrame=0,motionFrame=0,autoTimer=0;
 let destroyed=false,inView=true,hovered=false,keyboardFocus=false,drag=null,blockedClickUntil=0,resumeAt=0;
 const removers=[],preloaded=new Set();
 const now=()=>win.performance.now();
 const listen=(target,type,handler,options)=>{target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));};
 const clearAuto=()=>{win.clearTimeout(autoTimer);autoTimer=0;};
 const stopMotion=()=>{win.cancelAnimationFrame(motionFrame);motionFrame=0;};
 const canPlay=()=>!destroyed&&!session.paused&&!hovered&&!keyboardFocus&&!drag&&inView&&!doc.hidden;
 function updateToggle(){
  toggle.innerHTML=icon(session.paused?'play':'pause');
  toggle.setAttribute('aria-pressed',String(!session.paused));
  toggle.setAttribute('title',session.paused?'자동 넘김 시작':'자동 넘김 일시 정지');
 }
 function scheduleAuto(delay=AUTO_INTERVAL){
  clearAuto();
  if(canPlay()&&!motionFrame)autoTimer=win.setTimeout(()=>{autoTimer=0;if(canPlay())animateTo(Math.round(position)+1,{automatic:true});},Math.max(delay,resumeAt-now()));
 }
 function preload(index){
  const c=session.roster[wrap(index,session.roster.length)];
  if(preloaded.has(c.id))return;
  preloaded.add(c.id);
  const image=new win.Image();image.decoding='async';image.src=c.portrait;
 }
 function paint(){
  if(destroyed)return;
  const center=Math.round(position),wanted=carouselItems(session,center);
  const missing=wanted.filter(item=>!cards.some(card=>card.index===item.index));
  const recycled=cards.filter(card=>!wanted.some(item=>item.index===card.index));
  missing.forEach((item,i)=>{
   const card=recycled[i],c=item.character;
   card.index=item.index;card.element.dataset.index=String(item.index);card.element.dataset.id=c.id;
   card.element.setAttribute('aria-label',c.name+' 공략 보기');
   delete card.image.dataset.fallback;card.image.src=c.portrait;card.image.alt=c.name;card.label.textContent=c.name;
  });
  for(const card of cards){
   const offset=card.index-position,p=carouselPose(offset,width,cardWidth,cardHeight,compact.matches);
   card.element.style.transform=`translate3d(calc(-50% + ${p.x.toFixed(2)}px),calc(-50% + ${p.y.toFixed(2)}px),${p.z.toFixed(2)}px) rotateY(${p.tilt.toFixed(2)}deg) rotateZ(${p.rotation.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`;
   card.element.style.opacity=String(p.opacity);card.element.style.zIndex=String(p.layer);
   card.element.style.pointerEvents=p.opacity>.5?'auto':'none';
   card.element.tabIndex=card.index===center?0:-1;
   card.element.setAttribute('aria-hidden',String(p.opacity<.01));
  }
  preload(center-3);preload(center+3);
 }
 function queuePaint(){if(!paintFrame)paintFrame=win.requestAnimationFrame(()=>{paintFrame=0;paint();});}
 function measure(){
  width=stage.getBoundingClientRect().width;cardWidth=cards[0].element.offsetWidth;cardHeight=cards[0].element.offsetHeight;
  if(drag){drag.origin=position;drag.startX=drag.lastX;drag.startY=drag.lastY;drag.step=Math.max(90,width*.43);}
  paint();
 }
 function finish(target,{announce=false,focusCard=false,delay=AUTO_INTERVAL}={}){
  position=target;session.index=target;paint();
  if(announce){const c=session.roster[wrap(target,session.roster.length)];status.textContent=c.name+' · '+(wrap(target,session.roster.length)+1)+' / '+session.roster.length;}
  if(focusCard)cards.find(card=>card.index===target)?.element.focus({preventScroll:true});
  scheduleAuto(delay);
 }
 function animateTo(target,{automatic=false,announce=false,focusCard=false}={}){
  clearAuto();stopMotion();
  const from=position,distance=Math.abs(target-from);
  if(media.matches||distance<.001){finish(target,{announce,focusCard});return;}
  const started=now(),duration=automatic?900:clamp(380+distance*170,400,720);
  function frame(time){
   if(destroyed)return;
   const t=clamp((time-started)/duration,0,1);
   const eased=automatic?t*t*(3-2*t):1-Math.pow(1-t,3);
   position=from+(target-from)*eased;paint();
   if(t<1)motionFrame=win.requestAnimationFrame(frame);
   else{motionFrame=0;finish(target,{announce,focusCard,delay:automatic?Math.max(0,AUTO_INTERVAL-(time-started)):AUTO_INTERVAL});}
  }
  motionFrame=win.requestAnimationFrame(frame);
 }
 function pauseMotion(){clearAuto();stopMotion();position=Math.round(position);session.index=position;paint();}
 function releasePointer(){
  if(!drag)return null;
  const previous=drag;drag=null;root.classList.remove('is-dragging');
  if(stage.hasPointerCapture?.(previous.id))stage.releasePointerCapture(previous.id);
  return previous;
 }
 function pointerDown(e){
  if(drag||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  clearAuto();stopMotion();
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,origin:position,lastPosition:position,lastTime:now(),velocity:0,step:Math.max(90,width*.43),moving:false};
 }
 function pointerMove(e){
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(!drag.moving){
   if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
   if(Math.abs(dy)>Math.abs(dx)){releasePointer();animateTo(Math.round(position));return;}
   drag.moving=true;root.classList.add('is-dragging');stage.setPointerCapture?.(e.pointerId);
  }
  if(e.cancelable)e.preventDefault();
  const time=now();position=drag.origin-dx/drag.step;
  const elapsed=Math.max(8,time-drag.lastTime);
  drag.velocity=drag.velocity*.45+(position-drag.lastPosition)/elapsed*.55;
  drag.lastPosition=position;drag.lastTime=time;drag.lastX=e.clientX;drag.lastY=e.clientY;
  queuePaint();
 }
 function pointerEnd(e,cancelled=false){
  if(!drag||(e.pointerId!==undefined&&e.pointerId!==drag.id))return;
  const previous=releasePointer();
  if(previous.moving)blockedClickUntil=now()+500;
  const momentum=!cancelled&&previous.moving&&now()-previous.lastTime<100?clamp(previous.velocity*150,-1.1,1.1):0;
  resumeAt=now()+6000;
  animateTo(Math.round(position+momentum),{announce:previous.moving});
 }
 function click(e){
  const card=e.target.closest('.art-card');
  if(stage.contains(e.target)&&now()<blockedClickUntil){e.preventDefault();e.stopPropagation();return;}
  if(card){e.preventDefault();e.stopPropagation();onSelect(card.dataset.id);return;}
  const control=e.target.closest('[data-carousel]');if(!control)return;
  e.preventDefault();e.stopPropagation();
  if(control.dataset.carousel==='toggle'){
   session.paused=!session.paused;keyboardFocus=false;updateToggle();
   if(session.paused)clearAuto();else scheduleAuto();
  }else{resumeAt=now()+6000;animateTo(Math.round(position)+(control.dataset.carousel==='next'?1:-1),{announce:true});}
 }
 function visibility(){
  if(doc.hidden){releasePointer();pauseMotion();}else scheduleAuto();
 }
 listen(stage,'pointerdown',pointerDown);
 listen(win,'pointermove',pointerMove,{passive:false});
 listen(win,'pointerup',pointerEnd);
 listen(win,'pointercancel',e=>pointerEnd(e,true));
 // Touch implicitly captures the card first. Its bubbling capture loss during
 // transfer to the stage is not a cancelled drag.
 listen(stage,'lostpointercapture',e=>{if(e.target===stage)pointerEnd(e,true);});
 listen(stage,'dragstart',e=>e.preventDefault());
 listen(root,'click',click);
 listen(root,'keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;
  e.preventDefault();keyboardFocus=true;resumeAt=now()+6000;
  animateTo(Math.round(position)+(e.key==='ArrowRight'?1:-1),{announce:true,focusCard:!!e.target.closest('.art-card')});
 });
 listen(root,'pointerenter',e=>{if(e.pointerType==='mouse'){hovered=true;clearAuto();}});
 listen(root,'pointerleave',e=>{if(e.pointerType==='mouse'){hovered=false;scheduleAuto();}});
 listen(root,'focusin',e=>{if(e.target.matches(':focus-visible')){keyboardFocus=true;clearAuto();}});
 listen(root,'focusout',e=>{if(!root.contains(e.relatedTarget)){keyboardFocus=false;scheduleAuto();}});
 listen(doc,'visibilitychange',visibility);
 listen(win,'blur',()=>pointerEnd({},true));
 listen(media,'change',()=>{if(media.matches){session.paused=true;releasePointer();pauseMotion();updateToggle();}});
 listen(compact,'change',measure);
 if(win.ResizeObserver){const observer=new win.ResizeObserver(measure);observer.observe(stage);removers.push(()=>observer.disconnect());}
 else listen(win,'resize',measure);
 if(win.IntersectionObserver){
  const observer=new win.IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(!inView){releasePointer();pauseMotion();}else scheduleAuto();},{threshold:0});
  observer.observe(root);removers.push(()=>observer.disconnect());
 }
 for(const card of cards){card.image.draggable=false;preloaded.add(card.element.dataset.id);}
 measure();updateToggle();scheduleAuto();
 return ()=>{destroyed=true;clearAuto();stopMotion();win.cancelAnimationFrame(paintFrame);releasePointer();session.index=Math.round(position);removers.forEach(remove=>remove());};
}
