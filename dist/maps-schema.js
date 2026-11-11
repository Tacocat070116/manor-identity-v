// Shared wire contract. The API uses the same file as lib/maps-schema.mjs.
export const MAP_SCHEMA=1;
export const MAP_REVISIONS={'arms-factory':'reference-2026-04','sacred-heart-hospital':'reference-2026-04','red-church':'reference-2026-04'};
export const MAP_FLOORS={'arms-factory':['ground','f1'],'sacred-heart-hospital':['ground','f1','f2'],'red-church':['ground','f1']};
export const MAP_HEIGHTS={'arms-factory':890,'sacred-heart-hospital':964.3,'red-church':1000};
export const MAP_LIMITS={steps:16,items:60,points:80,bytes:65536,plans:50};
export const ITEM_KINDS=['character','path','arrow','number','note','area','pallet','window','cipher','chair','spawn','gate'];
export const ITEM_STATES=['ready','used','blocked','complete','injured','rescued'];
export const MAP_COLORS=['green','red','blue','gold','purple'];
export const isMapId=id=>typeof id==='string'&&Object.hasOwn(MAP_REVISIONS,id);
export const isPlanId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);
const fail=message=>{throw Error(message);};
function object(value,keys,label){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))fail(label+' 형식을 확인해 주세요.');}
function text(value,max,label){if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(label+'을 확인해 주세요.');return value.normalize('NFC');}
const choice=(value,values,label)=>values.includes(value)?value:fail(label+'을 확인해 주세요.');
const number=(value,min,max,label)=>Number.isFinite(value)&&value>=min&&value<=max?Math.round(value*10)/10:fail(label+' 범위를 확인해 주세요.');
export function validatePlan(input){
 object(input,['schema','id','title','mapId','mapRevision','conditions','steps'],'전술');
 if(input.schema!==MAP_SCHEMA||!isPlanId(input.id)||!isMapId(input.mapId)||input.mapRevision!==MAP_REVISIONS[input.mapId])fail('지원하지 않는 지도 또는 전술 버전입니다.');
 const title=text(input.title,80,'제목').trim();if(!title)fail('전술 제목을 입력해 주세요.');
 const c=input.conditions;object(c,['server','mode','layout','faction','characterId','situation','note'],'적용 조건');
 const conditions={server:choice(c.server,['global','cn'],'서버'),mode:choice(c.mode,['standard','practice'],'모드'),layout:choice(c.layout,['reference','assumed'],'배치'),faction:choice(c.faction,['survivor','hunter'],'진영'),characterId:text(c.characterId,8,'캐릭터'),situation:choice(c.situation,['kite','hunt','rescue','decode','endgame'],'상황'),note:text(c.note,500,'조건 메모')};
 if(conditions.characterId&&!/^c\d{2}$/.test(conditions.characterId))fail('캐릭터를 확인해 주세요.');
 if(!Array.isArray(input.steps)||!input.steps.length||input.steps.length>MAP_LIMITS.steps)fail('전술은 1~16단계로 구성해 주세요.');
 const stepIds=new Set();
 const steps=input.steps.map(s=>{
  object(s,['id','title','note','duration','items'],'단계');
  if(!isPlanId(s.id)||stepIds.has(s.id))fail('단계 ID를 확인해 주세요.');stepIds.add(s.id);
  if(!Array.isArray(s.items)||s.items.length>MAP_LIMITS.items)fail('한 단계에는 표식을 60개까지 배치할 수 있습니다.');
  const ids=new Set();
  const items=s.items.map(i=>{
   object(i,['id','kind','floor','x','y','points','label','color','state','characterId','radius','needsReview'],'표식');
   if(!isPlanId(i.id)||ids.has(i.id))fail('표식 ID를 확인해 주세요.');ids.add(i.id);
   const out={id:i.id,kind:choice(i.kind,ITEM_KINDS,'표식 종류'),floor:choice(i.floor,MAP_FLOORS[input.mapId],'층'),x:number(i.x,0,1000,'가로 좌표'),y:number(i.y,0,MAP_HEIGHTS[input.mapId],'세로 좌표'),label:text(i.label,160,'표식 메모'),color:choice(i.color,MAP_COLORS,'색상'),state:choice(i.state,ITEM_STATES,'상태'),characterId:text(i.characterId,8,'캐릭터'),radius:number(i.radius,12,180,'강조 범위'),needsReview:i.needsReview};
   if(typeof i.needsReview!=='boolean'||out.characterId&&!/^c\d{2}$/.test(out.characterId))fail('표식 정보를 확인해 주세요.');
   if(!Array.isArray(i.points)||i.points.length>MAP_LIMITS.points||(['path','arrow'].includes(i.kind)&&i.points.length<2))fail('경로는 2~80개 지점으로 구성해 주세요.');
   out.points=i.points.map(p=>{if(!Array.isArray(p)||p.length!==2)fail('경로 좌표를 확인해 주세요.');return [number(p[0],0,1000,'경로 가로 좌표'),number(p[1],0,MAP_HEIGHTS[input.mapId],'경로 세로 좌표')];});
   return out;
  });
  return {id:s.id,title:text(s.title,60,'단계 이름'),note:text(s.note,600,'단계 설명'),duration:number(s.duration,1,15,'재생 간격'),items};
 });
 const plan={schema:MAP_SCHEMA,id:input.id,title,mapId:input.mapId,mapRevision:input.mapRevision,conditions,steps};
 if(new TextEncoder().encode(JSON.stringify(plan)).length>MAP_LIMITS.bytes)fail('전술이 너무 큽니다. 단계나 표식을 줄여 주세요.');
 return plan;
}
