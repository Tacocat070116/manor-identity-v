export function clampView(view,bounds){const scale=Math.max(1,Math.min(5,view.scale));return {scale,x:Math.max(0,Math.min(bounds.width-bounds.width/scale,view.x)),y:Math.max(0,Math.min(bounds.height-bounds.height/scale,view.y))};}
export function mountMapInput(stage,{bounds,getTool,onPoint,onSelect,onMove,onLandmark,onView,onFinish,onCancel}){
 let view={x:0,y:0,scale:1},gesture=null,pointers=new Map(),frame=0,pending;
 const svg=()=>stage.querySelector('svg');
 function point(x,y){const matrix=svg()?.getScreenCTM();if(!matrix)return [0,0];const p=new DOMPoint(x,y).matrixTransform(matrix.inverse());return [Math.max(0,Math.min(bounds.width,p.x)),Math.max(0,Math.min(bounds.height,p.y))];}
 function apply(next){view=clampView(next,bounds);svg()?.setAttribute('viewBox',`${view.x} ${view.y} ${bounds.width/view.scale} ${bounds.height/view.scale}`);onView?.(view);}
 function zoom(factor,client){const rect=stage.getBoundingClientRect(),anchor=point(client?.[0]??rect.x+rect.width/2,client?.[1]??rect.y+rect.height/2),scale=Math.max(1,Math.min(5,view.scale*factor)),ratio=view.scale/scale;apply({scale,x:anchor[0]-(anchor[0]-view.x)*ratio,y:anchor[1]-(anchor[1]-view.y)*ratio});}
 const flush=()=>{frame=0;if(pending){const work=pending;pending=null;work();}};
 const schedule=work=>{pending=work;if(!frame)frame=requestAnimationFrame(flush);};
 function down(event){
  if(event.button>0)return;pointers.set(event.pointerId,[event.clientX,event.clientY]);stage.setPointerCapture(event.pointerId);
  if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={kind:'pinch',distance:Math.hypot(a[0]-b[0],a[1]-b[1])};return;}
  const item=event.target.closest('[data-map-item]')?.dataset.mapItem,landmark=event.target.closest('[data-map-landmark]')?.dataset.mapLandmark,tool=getTool();
  gesture={kind:tool==='pan'?'pan':item&&tool==='select'?'item':'tap',item,landmark,start:[event.clientX,event.clientY],world:point(event.clientX,event.clientY),moved:false};
  if(item&&tool==='select')onSelect(item);
 }
 function move(event){
  if(!pointers.has(event.pointerId)||!gesture)return;pointers.set(event.pointerId,[event.clientX,event.clientY]);
  if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(gesture.kind==='pinch'&&gesture.distance>0)zoom(distance/gesture.distance,[(a[0]+b[0])/2,(a[1]+b[1])/2]);gesture={kind:'pinch',distance};return;}
  if(gesture.kind==='pinch')return;
  const g=gesture,dx=event.clientX-g.start[0],dy=event.clientY-g.start[1];if(Math.hypot(dx,dy)>5)g.moved=true;
  if(g.kind==='pan'||g.kind==='tap'&&g.moved&&getTool()==='select'){
   const p=point(event.clientX,event.clientY);apply({...view,x:view.x+g.world[0]-p[0],y:view.y+g.world[1]-p[1]});g.kind='pan';
  }else if(g.kind==='item'&&g.moved){const p=point(event.clientX,event.clientY);g.delta=[p[0]-g.world[0],p[1]-g.world[1]];schedule(()=>stage.querySelector(`[data-map-item="${g.item}"]`)?.setAttribute('transform',`translate(${g.delta.join(' ')})`));}
 }
 function up(event){
  if(!pointers.has(event.pointerId))return;const g=gesture;pointers.delete(event.pointerId);if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  if(frame){cancelAnimationFrame(frame);frame=0;pending=null;}
  if(!g)return;if(g.kind==='item'&&g.moved&&g.delta)onMove(g.item,...g.delta);
  else if(g.kind!=='pinch'&&!g.moved){if(g.landmark&&['pan','select'].includes(getTool()))onLandmark?.(g.landmark);else if(!(g.item&&getTool()==='select'))onPoint(point(event.clientX,event.clientY));}
  gesture=null;
 }
 function cancel(event){pointers.delete(event.pointerId);gesture=null;pending=null;if(frame){cancelAnimationFrame(frame);frame=0;}stage.querySelectorAll('[data-map-item][transform]').forEach(n=>n.removeAttribute('transform'));}
 function wheel(event){if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();zoom(event.deltaY<0?1.1:1/1.1,[event.clientX,event.clientY]);}
 function key(event){if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;const id=event.target.closest('[data-map-item]')?.dataset.mapItem;
  if((event.key==='Enter'||event.key===' ')&&id){event.preventDefault();onSelect(id);return;}
  const landmark=event.target.closest('[data-map-landmark]')?.dataset.mapLandmark;if((event.key==='Enter'||event.key===' ')&&landmark){event.preventDefault();onLandmark?.(landmark);return;}
  if(event.key==='Escape'){onCancel?.();return;}if(event.key==='Enter'){onFinish?.();return;}
  if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.25);}else if(event.key==='-'){event.preventDefault();zoom(.8);}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(delta){event.preventDefault();const distance=event.shiftKey?20:5;if(id&&getTool()==='select')onMove(id,delta[0]*distance,delta[1]*distance);else apply({...view,x:view.x+delta[0]*distance*4/view.scale,y:view.y+delta[1]*distance*4/view.scale});}
 }
 const events=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['wheel',wheel,{passive:false}],['keydown',key]];
 events.forEach(([name,fn,opt])=>stage.addEventListener(name,fn,opt));
 return {getView:()=>view,setView:apply,reset(){apply({x:0,y:0,scale:1});},zoom,focus(p){apply({scale:2.5,x:p.x-bounds.width/5,y:p.y-bounds.height/5});},destroy(){events.forEach(([name,fn,opt])=>stage.removeEventListener(name,fn,opt));if(frame)cancelAnimationFrame(frame);pointers.clear();}};
}
