/* A seamless ambient field is cached once per palette/resize.
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

export function ambientPattern(seed=0x4d414e4f){
 // A stable layout for this visit, shared by all palettes. Integer-frequency
 // waves make an irregular field whose colour AND slope meet at tile edges.
 const random=()=>{seed=(seed+0x6D2B79F5)|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return ((n^n>>>14)>>>0)/4294967296;};
 return Array.from({length:12},(_,i)=>{
  const x=Math.floor(random()*5)-2,y=Math.floor(random()*5)-2||1;
  return {x,y,phase:random()*Math.PI*2,weight:1/(1+x*x+y*y),color:i%3};
 });
}

export function sampleAmbient(x,y,waves){
 const sums=[0,0,0],weights=[0,0,0];
 for(const w of waves){sums[w.color]+=Math.cos(Math.PI*2*(w.x*x+w.y*y)+w.phase)*w.weight;weights[w.color]+=w.weight;}
 return sums.map((v,i)=>(1+v/weights[i])/2);
}

export function ambientOffset(scroll,height,reduced=false){
 return reduced?0:((scroll*.24)%height+height)%height;
}

export function paintScene(ctx,width,height,palette,seed){
 // Write a small, seamless texture once. CanvasPattern interpolates and wraps
 // it; no screen pixels are read and scrolling never regenerates this field.
 const pw=ctx.canvas.width,ph=ctx.canvas.height,pixels=ctx.createImageData(pw,ph);
 const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
 const base=rgb(palette.bg),colors=[palette.ambientOne,palette.ambientTwo,palette.surface].map(rgb),opacity=[.36,.30,.12];
 const weights=[0,0,0],waves=ambientPattern(seed).map(w=>{
  weights[w.color]+=w.weight;
  return {...w,cx:Float64Array.from({length:pw},(_,x)=>Math.cos(Math.PI*2*w.x*(x+.5)/pw)),sx:Float64Array.from({length:pw},(_,x)=>Math.sin(Math.PI*2*w.x*(x+.5)/pw))};
 });
 const sums=[0,0,0],alpha=[0,0,0];
 for(let y=0;y<ph;y++){
  for(const w of waves){const phase=Math.PI*2*w.y*(y+.5)/ph+w.phase;w.cy=Math.cos(phase)*w.weight;w.sy=Math.sin(phase)*w.weight;}
  for(let x=0;x<pw;x++){
   sums.fill(0);
   for(const w of waves)sums[w.color]+=w.cx[x]*w.cy-w.sx[x]*w.sy;
   for(let i=0;i<3;i++){const t=Math.max(0,Math.min(1,(1+sums[i]/weights[i])/2));alpha[i]=t*t*(3-2*t)*opacity[i];}
   const index=(y*pw+x)*4;
   for(let c=0;c<3;c++){let value=base[c];for(let i=0;i<3;i++)value+=(colors[i][c]-value)*alpha[i];pixels.data[index+c]=Math.round(value);}
   pixels.data[index+3]=255;
  }
 }
 ctx.putImageData(pixels,0,0);
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
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const supported=window.CSS?.supports('backdrop-filter','blur(1px)')||window.CSS?.supports('-webkit-backdrop-filter','blur(1px)');
 if(!supported)return ()=>{};
 const scene=document.createElement('canvas'),context=scene.getContext('2d');
 if(!context)return ()=>{};
 const texture=document.createElement('canvas'),textureContext=texture.getContext('2d');
 if(!textureContext)return ()=>{};
 const seed=Math.floor(Math.random()*4294967296);
 scene.className='glass-scene';scene.setAttribute('aria-hidden','true');
 const materials=new Map();let frame=0,dirtyScene=true,dirtyScan=true,palette,viewport,stopped=false,tile,pattern,lastOffset=NaN;
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
  tile={width:Math.min(1600,Math.max(720,viewport.width)),height:Math.max(960,viewport.height)};
  const ratio=Math.min(1,320/Math.max(tile.width,tile.height));
  const tileSize={width:Math.max(1,Math.round(tile.width*ratio)),height:Math.max(1,Math.round(tile.height*ratio))};
  texture.width=tileSize.width;texture.height=tileSize.height;
  textureContext.setTransform(tileSize.width/tile.width,0,0,tileSize.height/tile.height,0,0);
  paintScene(textureContext,tile.width,tile.height,palette,seed);
  pattern=context.createPattern(texture,'repeat');lastOffset=NaN;
 }
 function drawEnvironment(){
  const offset=ambientOffset(window.scrollY||0,tile.height,motion.matches);
  if(offset===lastOffset)return;
  lastOffset=offset;
  context.clearRect(0,0,viewport.width,viewport.height);
  context.save();context.translate(0,-offset);
  context.scale(tile.width/texture.width,tile.height/texture.height);
  context.fillStyle=pattern;
  context.fillRect(0,offset*texture.height/tile.height,viewport.width*texture.width/tile.width,viewport.height*texture.height/tile.height);
  context.restore();
 }
 function render(){
  frame=0;if(stopped||document.hidden)return;
  if(reduce.matches||forced.matches){scene.remove();root.classList.remove('glass-ready');return;}
  if(!scene.isConnected){document.body.prepend(scene);root.classList.add('glass-ready');dirtyScene=true;}
  if(dirtyScan){dirtyScan=false;scan();}
  if(dirtyScene){dirtyScene=false;paintEnvironment();}
  drawEnvironment();
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
 reduce.addEventListener('change',preference);forced.addEventListener('change',preference);motion.addEventListener('change',preference);
 schedule();
 return ()=>{
  stopped=true;if(frame)window.cancelAnimationFrame(frame);
  changes.disconnect();theme.disconnect();resize.disconnect();visible.disconnect();
  window.removeEventListener('resize',resized);window.removeEventListener('scroll',schedule,true);
  document.removeEventListener('visibilitychange',schedule);
  reduce.removeEventListener('change',preference);forced.removeEventListener('change',preference);motion.removeEventListener('change',preference);
  for(const [element,item]of materials){item.canvas.remove();element.classList.remove('glass-material');if(item.anchor)element.classList.remove('glass-anchor');}
  scene.remove();root.classList.remove('glass-ready');
  texture.width=texture.height=1;
 };
}

if(typeof document!=='undefined'&&typeof window!=='undefined')mountGlass(document,window);
