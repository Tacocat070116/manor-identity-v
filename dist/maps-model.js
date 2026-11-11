import {MAP_SCHEMA,MAP_REVISIONS,MAP_LIMITS,validatePlan} from './maps-schema.js?v=2f4ecdd53a25';
export {validatePlan,MAP_LIMITS} from './maps-schema.js?v=2f4ecdd53a25';
export const MAP_MODES={explore:'탐색',guides:'공략',tactics:'전술'};
export const LAYERS={terrain:'지형',landmarks:'구역 이름',pallet:'판자',window:'창틀',cipher:'해독기',chair:'의자',gate:'출입구',spawn:'시작 위치',notes:'전술 표식'};
export const TOOL_LABELS={select:'선택·이동',pan:'지도 이동',character:'캐릭터',path:'경로',arrow:'화살표',number:'번호',note:'메모',area:'강조 영역',pallet:'판자',window:'창틀',cipher:'해독기',chair:'의자',spawn:'시작 위치',gate:'출입구'};
export const STATE_LABELS={ready:'사용 가능',used:'사용함',blocked:'막힘',complete:'완료',injured:'부상',rescued:'구출됨'};
export const SITUATIONS={kite:'어그로',hunt:'사냥',rescue:'구출',decode:'해독',endgame:'탈출·운영'};
export const clone=value=>structuredClone(value);
export {requestId as makeId} from './request-id.js?v=58ef88b53202';
import {requestId as makeId} from './request-id.js?v=58ef88b53202';
export function emptyStep(title='1단계'){return {id:makeId(),title,note:'',duration:3,items:[]};}
export function newPlan(map,title){return {schema:MAP_SCHEMA,id:makeId(),title:title||map.name+' 전술',mapId:map.id,mapRevision:MAP_REVISIONS[map.id],conditions:{server:'global',mode:'standard',layout:'reference',faction:'survivor',characterId:'',situation:'kite',note:''},steps:[emptyStep()]};}
export function createHistory(initial,{limit=40}={}){
 let value=validatePlan(initial),past=[],future=[];
 return {get:()=>value,canUndo:()=>!!past.length,canRedo:()=>!!future.length,
  change(update){const draft=clone(value);update(draft);const next=validatePlan(draft);if(JSON.stringify(next)===JSON.stringify(value))return false;past.push(value);if(past.length>limit)past.shift();value=next;future=[];return true;},
  undo(){if(!past.length)return false;future.push(value);value=past.pop();return true;},
  redo(){if(!future.length)return false;past.push(value);value=future.pop();return true;},
  replace(next){value=validatePlan(next);past=[];future=[];}
 };
}
export function changeConditions(plan,conditions){
 const changed=JSON.stringify(plan.conditions)!==JSON.stringify(conditions);plan.conditions=conditions;
 if(changed)for(const step of plan.steps)for(const item of step.items)if(['path','arrow'].includes(item.kind))item.needsReview=true;
}
export function duplicateStep(plan,index){if(plan.steps.length>=MAP_LIMITS.steps)throw Error('단계는 16개까지 만들 수 있습니다.');const step=clone(plan.steps[index]);step.id=makeId();step.title=(step.title+' 복사').slice(0,60);step.items.forEach(i=>{i.id=makeId();});plan.steps.splice(index+1,0,step);}
export function createItem(kind,point,floor,{label='',characterId='',color='green',points=[]}={}){return {id:makeId(),kind,floor,x:point[0],y:point[1],points,label,color,state:'ready',characterId,radius:65,needsReview:false};}
export function moveItem(item,dx,dy,bounds){
 const points=item.points.length?item.points:[[item.x,item.y]],xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 dx=Math.max(-Math.min(...xs),Math.min(bounds.width-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(bounds.height-Math.max(...ys),dy));
 item.x=Math.round((item.x+dx)*10)/10;item.y=Math.round((item.y+dy)*10)/10;item.points=item.points.map(([x,y])=>[Math.round((x+dx)*10)/10,Math.round((y+dy)*10)/10]);
}
export function visibleItems(plan,step,floor,layers){return plan.steps[step]?.items.filter(i=>i.floor===floor&&layers.has(Object.hasOwn(LAYERS,i.kind)?i.kind:'notes'))||[];}
export function guideMatches(guide,conditions){return (!guide.faction||guide.faction===conditions.faction)&&(!guide.characterIds?.length||guide.characterIds.includes(conditions.characterId))&&(!guide.situation||guide.situation===conditions.situation);}
export function planFromGuide(map,guide){const plan=newPlan(map,guide.title);Object.assign(plan.conditions,{faction:guide.faction,situation:guide.situation,note:guide.start});plan.steps=guide.steps.map((s,i)=>({...emptyStep((i+1)+' · '+s.title),note:[s.text,'이유: '+s.reason,'전환 조건: '+s.switch,'대안: '+s.alternative].join('\n'),items:s.focus?[createItem('area',[s.focus.x,s.focus.y],s.floor||'ground',{label:s.title,color:guide.faction==='hunter'?'red':'green'})]:[]}));return plan;}
