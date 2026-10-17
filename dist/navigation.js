const mix=(a,b,t)=>a+(b-a)*t;
const transform=(box,size)=>'translate3d('+(box.x+box.width/2-size.width/2)+'px,'+(box.y+box.height/2-size.height/2)+'px,0) scale('+(box.width/size.width)+','+(box.height/size.height)+')';

// Retain the links so focus and interrupted glass movement survive routing.
export function mountNavigation(root,{icon}){
 const doc=root.ownerDocument,win=doc.defaultView;
 const links=[...root.querySelectorAll('.nav-item')];
 const nav=root.querySelector('.mobile-nav');
 const mobileLinks=links.filter(link=>nav.contains(link));
 const themeButton=root.querySelector('[data-action="theme"]');
 const media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const pill=doc.createElement('span');
 pill.className='nav-indicator';pill.setAttribute('aria-hidden','true');pill.hidden=true;
 nav.prepend(pill);
 let selected='',theme='',placed=false,animation=null,destroyed=false;
 function stop(){
  if(animation){animation.onfinish=null;animation.cancel();animation=null;}
 }
 function rect(element){
  const box=element.getBoundingClientRect(),frame=nav.getBoundingClientRect();
  return {x:box.left-frame.left-nav.clientLeft,y:box.top-frame.top-nav.clientTop,width:box.width,height:box.height};
 }
 function place(animate=false){
  if(destroyed)return;
  const active=mobileLinks.find(link=>link.dataset.view===selected);
  const target=active&&rect(active);
  if(!target||!target.width||!target.height){
   stop();pill.hidden=true;placed=false;delete nav.dataset.navMotion;return;
  }
  // Capture the current visual position before cancelling an unfinished turn.
  const from=placed?rect(pill):target;
  stop();pill.hidden=false;
  pill.style.width=target.width+'px';pill.style.height=target.height+'px';
  pill.style.transform=transform(target,target);
  nav.dataset.navMotion='ready';
  const distance=Math.hypot(target.x-from.x,target.y-from.y);
  if(animate&&placed&&!media.matches&&typeof pill.animate==='function'&&distance>.5){
   const stretch=Math.min(.18,distance/target.width*.035);
   const frames=[0,.35,.7,1].map(t=>{
    const wave=Math.sin(Math.PI*t);
    const width=mix(from.width,target.width,t)+target.width*stretch*wave;
    const height=mix(from.height,target.height,t)-target.height*.055*wave;
    const cx=mix(from.x+from.width/2,target.x+target.width/2,t);
    const cy=mix(from.y+from.height/2,target.y+target.height/2,t);
    return {offset:t,transform:transform({x:cx-width/2,y:cy-height/2,width,height},target)};
   });
   const motion=pill.animate(frames,{duration:520+Math.min(140,distance*.4),easing:'cubic-bezier(.22,.75,.2,1)'});
   animation=motion;
   motion.onfinish=()=>{if(animation===motion)animation=null;};
  }
  placed=true;
 }
 function update(next){
  if(destroyed)return;
  const view=next.view==='character'?'explore':next.view;
  if(view!==selected){
   selected=view;
   for(const link of links){
    const active=link.dataset.view===view;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
   }
   place(true);
  }
  if(next.theme!==theme){
   theme=next.theme;
   themeButton.setAttribute('aria-label',(theme==='light'?'다크':'라이트')+' 모드로 전환');
   themeButton.innerHTML=icon(theme==='light'?'moon':'sun');
  }
 }
 const settle=()=>place(false);
 const observer=win.ResizeObserver?new win.ResizeObserver(settle):null;
 if(observer){observer.observe(nav);mobileLinks.forEach(link=>observer.observe(link));}
 else win.addEventListener('resize',settle);
 media.addEventListener('change',settle);
 win.addEventListener('pageshow',settle);
 return {update,destroy(){
  destroyed=true;stop();observer?.disconnect();
  win.removeEventListener('resize',settle);win.removeEventListener('pageshow',settle);
  media.removeEventListener('change',settle);
  pill.remove();delete nav.dataset.navMotion;
 }};
}
