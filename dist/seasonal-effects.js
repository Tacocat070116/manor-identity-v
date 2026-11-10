const MOTION_KEY='manor-christmas-motion';

// Fixed, bounded artwork: CSS owns the motion; no timers or animation loop.
function snowMarkup(){
 return Array.from({length:24},(_,i)=>{
  const x=(i*37+7)%100,size=i%5===0?7:3+i%3,duration=16+i%7*2;
  return `<i style="--snow-x:${x}%;--snow-size:${size}px;--snow-drift:${i%2?24:-20}px;--snow-duration:${duration}s;--snow-delay:-${(i*7+3)%duration}s"></i>`;
 }).join('');
}

export function mountSeasonalEffects({document,storage,media}){
 let enabled=true,saved=true;
 try{enabled=storage?.getItem(MOTION_KEY)!=='off';}catch{}
 const scene=document.createElement('div');
 scene.className='seasonal-scene';
 scene.setAttribute('aria-hidden','true');
 scene.setAttribute('inert','');
 scene.innerHTML=`<div class="seasonal-snow">${snowMarkup()}</div><div class="seasonal-canopy"></div>`;
 document.body.prepend(scene);

 function refresh(){
  document.documentElement.dataset.seasonalMotion=enabled&&!media.matches&&!document.hidden?'running':'paused';
  const input=document.querySelector('input[name="seasonal-motion"]');
  if(input){input.checked=enabled&&!media.matches;input.disabled=media.matches;}
  const status=document.querySelector('[data-seasonal-motion-status]');
  if(status)status.textContent=media.matches?'기기의 동작 줄이기 설정이 적용되어 있습니다.':
   (enabled?'눈 내림 · 전구 반짝임 · 오너먼트 움직임':'장식은 유지하고 움직임만 멈춥니다.')+(saved?'':' · 이번 방문에만 적용됩니다.');
 }
 function change(event){
  if(event.target.name!=='seasonal-motion')return;
  if(!media.matches){
   enabled=event.target.checked;
   try{if(!storage)throw Error('Storage unavailable');storage.setItem(MOTION_KEY,enabled?'on':'off');saved=true;}catch{saved=false;}
  }
  refresh();
 }
 document.addEventListener('change',change);
 document.addEventListener('visibilitychange',refresh);
 media.addEventListener('change',refresh);
 refresh();
 return {refresh,destroy(){
  document.removeEventListener('change',change);
  document.removeEventListener('visibilitychange',refresh);
  media.removeEventListener('change',refresh);
  scene.remove();
  delete document.documentElement.dataset.seasonalMotion;
 }};
}
