// One disclosure and one set of links serve both the desktop header and mobile dock.
export function mountNavigation(root,{icon}){
 const doc=root.ownerDocument,win=doc.defaultView;
 const nav=root.querySelector('.category-nav');
 const toggle=nav.querySelector('[data-nav-toggle]');
 const panel=nav.querySelector('.category-panel');
 const links=[...panel.querySelectorAll('.nav-item')];
 const currentIcon=toggle.querySelector('[data-nav-current-icon]');
 const currentLabel=toggle.querySelector('[data-nav-current-label]');
 const themeButton=root.querySelector('[data-action="theme"]');
 const mobile=win.matchMedia('(max-width:640px)');
 const reducedMotion=win.matchMedia('(prefers-reduced-motion:reduce)');
 let expanded=false,selected='',routeView='',theme='',destroyed=false;
 let sizeAnimation,labelAnimation;

 function stopMotion(){
  sizeAnimation?.cancel();labelAnimation?.cancel();
  sizeAnimation=labelAnimation=null;
 }
 function changeCurrent(current,view){
  // Continue an interrupted transition from its currently visible width.
  const animate=selected&&!reducedMotion.matches&&typeof toggle.animate==='function';
  const from=animate?toggle.getBoundingClientRect().width:0;
  stopMotion();
  currentLabel.textContent=current?.dataset.navLabel||'메뉴';
  currentIcon.innerHTML=icon(current?.dataset.navIcon||'grid');
  if(!animate)return;
  const to=toggle.getBoundingClientRect().width;
  if(Math.abs(to-from)<.5)return;
  // Bounded ease-in-out has no overshoot or rebound; text is never scaled.
  const motion=toggle.animate([
   {width:from+'px',minWidth:'0px'},
   {width:to+'px',minWidth:'0px'}
  ],{duration:640,easing:'cubic-bezier(.4,0,.2,1)'});
  sizeAnimation=motion;
  motion.onfinish=()=>{if(sizeAnimation===motion)sizeAnimation=null;};
  const label=currentLabel.animate([{opacity:0},{opacity:1}],{duration:420,easing:'ease-out'});
  labelAnimation=label;
  label.onfinish=()=>{if(labelAnimation===label)labelAnimation=null;};
 }

 function labelToggle(){
  toggle.setAttribute('aria-label','카테고리 메뉴 '+(expanded?'닫기':'열기')+' · 현재 '+currentLabel.textContent);
 }
 function setOpen(open,{restoreFocus=false}={}){
  if(destroyed)return;
  expanded=open;
  // Move focus before making its former container inert.
  if(!open&&restoreFocus&&panel.contains(doc.activeElement))toggle.focus({preventScroll:true});
  nav.dataset.expanded=String(open);
  toggle.setAttribute('aria-expanded',String(open));
  panel.inert=!open;
  panel.setAttribute('aria-hidden',String(!open));
  // Also keep collapsed links out of the tab order in older browsers without inert.
  for(const link of links){if(open)link.removeAttribute('tabindex');else link.setAttribute('tabindex','-1');}
  labelToggle();
 }
 function update(next){
  if(destroyed)return;
  if(next.view!==routeView){
   routeView=next.view;
   setOpen(false,{restoreFocus:true});
  }
  const view=next.view==='character'?'explore':next.view;
  if(view!==selected){
   const current=links.find(link=>link.dataset.view===view);
   for(const link of links){
    const active=link===current;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
   }
   changeCurrent(current,view);
   selected=view;
   labelToggle();
  }
  if(next.theme!==theme){
   theme=next.theme;
   themeButton.setAttribute('aria-label','컬러 테마 선택 · 현재 '+(next.themeLabel||theme));
   themeButton.innerHTML=icon('palette');
  }
 }
 const onToggle=()=>setOpen(!expanded);
 function onToggleKey(event){
  if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
  event.preventDefault();setOpen(true);
  (event.key==='ArrowUp'?links.at(-1):links.find(link=>link.dataset.view===selected)||links[0])?.focus();
 }
 function onSelect(event){
  const link=event.target.closest('.nav-item');
  if(!link||!panel.contains(link)||event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  setOpen(false,{restoreFocus:true});
 }
 const onOutside=event=>{if(expanded&&!nav.contains(event.target))setOpen(false,{restoreFocus:true});};
 const onFocus=event=>{if(expanded&&!nav.contains(event.target))setOpen(false);};
 function onEscape(event){
  if(expanded&&event.key==='Escape'){
   event.preventDefault();setOpen(false,{restoreFocus:true});
  }
 }
 const close=()=>{stopMotion();setOpen(false,{restoreFocus:true});};
 const events=[[toggle,'click',onToggle],[toggle,'keydown',onToggleKey],[panel,'click',onSelect],
  [doc,'pointerdown',onOutside],[doc,'focusin',onFocus],[doc,'keydown',onEscape],
  [win,'pagehide',close],[win,'pageshow',close],[mobile,'change',close],
  [win,'resize',stopMotion],[reducedMotion,'change',stopMotion]];
 for(const [target,type,handler] of events)target.addEventListener(type,handler);
 setOpen(false);
 return {update,destroy(){
  if(destroyed)return;
  stopMotion();setOpen(false,{restoreFocus:true});destroyed=true;
  for(const [target,type,handler] of events)target.removeEventListener(type,handler);
 }};
}
