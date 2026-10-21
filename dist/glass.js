/* A shared, viewport-aligned environment is painted once per palette/resize.
   Each visible lens resamples that actual background through a curved rim.
   Canvas 2D is intentional: Safari does not need SVG backdrop displacement.
   No DOM duplication, screenshots, external assets, pixel reads or idle loop. */
export const glassTargets=[
 '.nav-shell','.category-toggle','.category-panel','.hero-carousel-footer',
 '.character-card','.quick-link','.character-hero','.panel:not(.relation-card)',
 '.selection-card','.brief-card','.evidence-card','.stat-box','.ban-slot','.rank-card',
 '.source-card','.health-card','.statistics-overview>div','.gp-filter-form','.gp-detail','.character-patch','.gp-home-link',
 '.fb-summary','.fb-card','.fb-detail'
].join(',');

export function mixColor(a,b,t){
 const rgb=value=>value.replace('#','').match(/../g).map(v=>parseInt(v,16));
 return '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
export function lensMetrics(width,height,dpr=1){
 const ratio=Math.min(Math.max(dpr,1),1.5,2048/Math.max(1,width),4096/Math.max(1,height),Math.sqrt(460000/Math.max(1,width*height)));
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),ratio};
}
export function lensSample(rect,zoom){
 // The optical axis passes through the centre; scrolling changes only the
 // sampled scene coordinates, never the UI or its foreground content.
 return {x:rect.left+rect.width/2-rect.width/(2*zoom),y:rect.top+rect.height/2-rect.height/(2*zoom),width:rect.width/zoom,height:rect.height/zoom};
}

export function paintScene(ctx,width,height,palette){
 const {bg,ambientOne,ambientTwo,surface}=palette;
 ctx.clearRect(0,0,width,height);
 ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
 const wash=(x,y,rx,ry,color,opacity)=>{
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,color);g.addColorStop(1,color+'00');
  ctx.globalAlpha=opacity;ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
 };
 wash(width*.9,height*.05,width*.8,height*.9,ambientOne,.76);
 wash(width*.03,height*.9,width*.75,height*.85,ambientTwo,.62);
 wash(width*.24,height*.12,width*.6,height*.58,surface,.48);
 // A broad, soft fold gives transparent glass something to transmit and bend.
 // It is painted into the environment, not attached as a stripe to each card.
 ctx.save();ctx.filter='blur(18px)';
 const fold=ctx.createLinearGradient(width*.3,height, width*.9,0);
 fold.addColorStop(0,mixColor(bg,ambientTwo,.5));
 fold.addColorStop(.48,mixColor(bg,ambientOne,.9));
 fold.addColorStop(1,mixColor(bg,surface,.7));
 ctx.strokeStyle=fold;ctx.globalAlpha=.55;ctx.lineWidth=Math.max(84,width*.13);ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(width*1.12,-height*.12);
 ctx.bezierCurveTo(width*.38,height*.2,width*.94,height*.62,width*.46,height*1.12);
 ctx.stroke();ctx.restore();
 wash(width*.72,height*.42,width*.27,height*.56,surface,.30);
}

function roundedPath(ctx,x,y,w,h,r){
 if(w<=0||h<=0)return;
 const radius=Math.max(0,Math.min(r,w/2,h/2));
 ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);
 ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}

export function paintLens(ctx,scene,rect,radius,palette,viewport){
 const w=rect.width,h=rect.height,depth=Math.min(20,radius*.8,w*.16,h*.28);
 ctx.clearRect(0,0,w,h);
 const transmit=(zoom,opacity,reflection=false)=>{
  const sample=lensSample(rect,zoom);
  ctx.globalAlpha=opacity;
  ctx.save();
  if(reflection){ctx.translate(w,0);ctx.scale(-1,1);}
  // Drawing the entire scene avoids invalid source rectangles at viewport edges.
  ctx.translate(-sample.x*zoom,-sample.y*zoom);ctx.scale(zoom,zoom);
  ctx.drawImage(scene,0,0,scene.width,scene.height,0,0,viewport.width,viewport.height);
  ctx.restore();
 };
 ctx.save();ctx.beginPath();roundedPath(ctx,0,0,w,h,radius);ctx.clip();
 // One continuous sample, never separately clipped concentric bands. Their
 // antialiased edges used to accumulate into visible contour lines on phones.
 transmit(1+18/Math.max(w,h),.32);
 transmit(1.018,.045,true);
 ctx.globalAlpha=1;
 const reflection=ctx.createRadialGradient(w*.12,-h*.3,0,w*.12,-h*.3,Math.max(w*.82,h*.7));
 reflection.addColorStop(0,palette.light+'48');reflection.addColorStop(.6,palette.light+'10');reflection.addColorStop(1,palette.light+'00');
 ctx.fillStyle=reflection;ctx.fillRect(0,0,w,h);
 // Feather using only a blurred silhouette, with its source shape outside the
 // canvas. Including the solid source would leave another hard inner contour.
 // Shadows work in Safari without CanvasRenderingContext2D.filter; their
 // offsets/blur use device pixels, independently of the current transform.
 const scale=ctx.getTransform?.()?.d||1,offset=h+depth*4;
 ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.82;
 ctx.fillStyle='#000';ctx.shadowColor='#000';ctx.shadowBlur=depth*1.1*scale;ctx.shadowOffsetY=-offset*scale;
 ctx.beginPath();roundedPath(ctx,depth,depth+offset,w-2*depth,h-2*depth,Math.max(0,radius-depth));ctx.fill();ctx.restore();
 transmit(1.008,.045);
 ctx.restore();ctx.globalAlpha=1;
}

export function mountGlass(document,window){
 const root=document.documentElement;
 const reduce=window.matchMedia('(prefers-reduced-transparency: reduce)');
 const forced=window.matchMedia('(forced-colors: active)');
 const supported=window.CSS?.supports('backdrop-filter','blur(1px)')||window.CSS?.supports('-webkit-backdrop-filter','blur(1px)');
 if(!supported)return ()=>{};
 const scene=document.createElement('canvas'),context=scene.getContext('2d');
 if(!context)return ()=>{};
 scene.className='glass-scene';scene.setAttribute('aria-hidden','true');
 const materials=new Map();let frame=0,dirtyScene=true,dirtyScan=true,palette,viewport,stopped=false;
 const schedule=()=>{if(!frame&&!document.hidden&&!stopped)frame=window.requestAnimationFrame(render);};
 const resize=new window.ResizeObserver(schedule);
 const visible=new window.IntersectionObserver(entries=>{for(const entry of entries){const item=materials.get(entry.target);if(item)item.visible=entry.isIntersecting;}schedule();},{rootMargin:'40px'});
 function scan(){
 for(const [element,item]of materials)if(!element.isConnected){resize.unobserve(element);visible.unobserve(element);item.canvas.remove();element.classList.remove('glass-material');if(item.anchor)element.classList.remove('glass-anchor');materials.delete(element);}
  document.querySelectorAll(glassTargets).forEach(element=>{
   if(materials.has(element))return;
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
   canvas.className='glass-optics';canvas.setAttribute('aria-hidden','true');
   const style=window.getComputedStyle(element),anchor=style.position==='static';
   if(anchor)element.classList.add('glass-anchor');
   element.classList.add('glass-material');element.append(canvas);
   materials.set(element,{canvas,ctx,anchor,visible:true,radius:parseFloat(style.borderTopLeftRadius)||16});
   resize.observe(element);visible.observe(element);
  });
 }
 function paintEnvironment(){
  const style=window.getComputedStyle(root),value=name=>style.getPropertyValue(name).trim();
  const sheen='#'+value('--sheen-rgb').split(',').map(v=>Number(v).toString(16).padStart(2,'0')).join('');
  const light=mixColor(value('--surface-solid'),sheen,.4);
  palette={bg:value('--bg'),surface:value('--surface-solid'),ambientOne:value('--ambient-one'),ambientTwo:value('--ambient-two'),light};
  viewport={width:root.clientWidth,height:window.innerHeight};
  const size=lensMetrics(viewport.width,viewport.height,window.devicePixelRatio);
  scene.width=size.width;scene.height=size.height;
  context.setTransform(size.width/viewport.width,0,0,size.height/viewport.height,0,0);
  paintScene(context,viewport.width,viewport.height,palette);
 }
 function render(){
  frame=0;if(stopped||document.hidden)return;
  if(reduce.matches||forced.matches){scene.remove();root.classList.remove('glass-ready');return;}
  if(!scene.isConnected){document.body.prepend(scene);root.classList.add('glass-ready');dirtyScene=true;}
  if(dirtyScan){dirtyScan=false;scan();}
  if(dirtyScene){dirtyScene=false;paintEnvironment();}
  // Batch layout reads before canvas writes. Offscreen cards cost no drawing.
  const jobs=[];
  for(const [element,item]of materials)if(item.visible){
   const rect=element.getBoundingClientRect();
   if(rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<viewport.height&&rect.right>0&&rect.left<viewport.width){
    const style=window.getComputedStyle(element),radius=parseFloat(style.borderTopLeftRadius)||16;
    // Keep fractional CSS pixels on dense/mobile grids; rounding to clientWidth
    // can stretch the optical edge relative to the actual rounded border.
    const left=parseFloat(style.borderLeftWidth)||0,right=parseFloat(style.borderRightWidth)||0;
    const top=parseFloat(style.borderTopWidth)||0,bottom=parseFloat(style.borderBottomWidth)||0;
    const box={left:rect.left+left,top:rect.top+top,width:rect.width-left-right,height:rect.height-top-bottom};
    jobs.push({item,box,radius});
   }
  }
  for(const {item,box,radius}of jobs){
   // Canvas covers the padding box, inside the existing one-pixel border.
   if(!box.width||!box.height)continue;
   const size=lensMetrics(box.width,box.height,window.devicePixelRatio);
   if(item.canvas.width!==size.width)item.canvas.width=size.width;
   if(item.canvas.height!==size.height)item.canvas.height=size.height;
   item.ctx.setTransform(size.width/box.width,0,0,size.height/box.height,0,0);
   paintLens(item.ctx,scene,box,radius-1,palette,viewport);
  }
 }
 const changes=new window.MutationObserver(records=>{
  if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('glass-optics')&&!n.classList?.contains('glass-scene')))){dirtyScan=true;schedule();}
 });
 changes.observe(document.body,{childList:true,subtree:true});
 const theme=new window.MutationObserver(()=>{dirtyScene=true;schedule();});
 theme.observe(root,{attributes:true,attributeFilter:['data-theme']});
 const resized=()=>{dirtyScene=true;schedule();};
 const preference=()=>{dirtyScene=true;dirtyScan=true;schedule();};
 window.addEventListener('resize',resized,{passive:true});
 window.addEventListener('scroll',schedule,{passive:true,capture:true});
 document.addEventListener('visibilitychange',schedule);
 reduce.addEventListener('change',preference);forced.addEventListener('change',preference);
 schedule();
 return ()=>{
  stopped=true;if(frame)window.cancelAnimationFrame(frame);
  changes.disconnect();theme.disconnect();resize.disconnect();visible.disconnect();
  window.removeEventListener('resize',resized);window.removeEventListener('scroll',schedule,true);
  document.removeEventListener('visibilitychange',schedule);
  reduce.removeEventListener('change',preference);forced.removeEventListener('change',preference);
  for(const [element,item]of materials){item.canvas.remove();element.classList.remove('glass-material');if(item.anchor)element.classList.remove('glass-anchor');}
  scene.remove();root.classList.remove('glass-ready');
 };
}

if(typeof document!=='undefined'&&typeof window!=='undefined')mountGlass(document,window);
