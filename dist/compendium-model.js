import {filterRows,cutoff} from './model.js?v=e238acfa45e9';

function countResult(target,result,hunter){
 target.appearances++;
 if(!['승','무','패'].includes(result)){target.unknown++;return;}
 target.results++;
 if(result==='무')target.draw++;
 else if((result==='승')===hunter)target.win++;
 else target.loss++;
}
const empty=id=>({id,appearances:0,results:0,win:0,draw:0,loss:0,unknown:0});
const finish=(map,total)=>[...map.values()].map(r=>({...r,winRate:r.results?r.win/r.results:null,share:total?r.appearances/total:0})).sort((a,b)=>b.appearances-a.appearances||a.id.localeCompare(b.id,'ko'));

// A survivor's outcome belongs to the four-person team. An opposing survivor
// appearing in a hunter's row does not mean that survivor was chased.
export function tournamentRelations(rows,character,filters={}){
 const games=filterRows(rows,filters).filter(r=>r[2]===character.id||r[3].includes(character.id));
 const opponents=new Map(),companions=new Map(),maps=new Map();
 const hunter=character.side==='감시자';
 const add=(map,id,row)=>{if(!map.has(id))map.set(id,empty(id));countResult(map.get(id),row[5],hunter);};
 for(const r of games){
  for(const id of new Set(hunter?r[3]:[r[2]]))add(opponents,id,r);
  if(!hunter)for(const id of new Set(r[3]))if(id!==character.id)add(companions,id,r);
  add(maps,r[1],r);
 }
 return {appearances:games.length,opponents:finish(opponents,games.length),companions:finish(companions,games.length),maps:finish(maps,games.length)};
}

export function observedDetails(rows,character,filters={}){
 const start=cutoff(filters.days,filters.reference),builds=new Map();
 const metrics=Object.fromEntries(['decode','rescues','kite','escaped'].map(k=>[k,{count:0,total:0,mean:null}]));
 let appearances=0,talentSamples=0;
 const sources=[];
 for(const r of rows){
  if((start&&r.date<start)||(filters.map&&r.map!==filters.map)||(filters.tournament&&r.tournament!==filters.tournament))continue;
  if(r.hunter!==character.id&&!r.survivors.includes(character.id))continue;
  appearances++;sources.push({date:r.date,url:r.source});
  const p=r.players.find(x=>x.id===character.id);
  const talents=[...new Set(p?p.talents:r.hunterTalents)].sort((a,b)=>a.localeCompare(b,'ko'));
  if(talents.length){
   talentSamples++;const key=talents.join(' + ');
   if(!builds.has(key))builds.set(key,{talents,count:0});
   builds.get(key).count++;
  }
  if(p)for(const [k,v] of Object.entries(metrics)){
   if(p[k]!==null&&p[k]!==undefined&&Number.isFinite(Number(p[k]))){v.count++;v.total+=Number(p[k]);}
  }
 }
 for(const v of Object.values(metrics))v.mean=v.count?v.total/v.count:null;
 return {appearances,talentSamples,builds:[...builds.values()].map(b=>({...b,share:b.count/talentSamples})).sort((a,b)=>b.count-a.count||a.talents.join().localeCompare(b.talents.join(),'ko')),metrics,sources:[...new Map(sources.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>[s.url,s])).values()]};
}

export function characterEvidence(records,character,kind){
 const seen=new Set();
 return records.filter(m=>{
  if(m.status!=='반영'||!m.listEligible||![m.hunter,m.survivor].includes(character.name)||(m.advantage===character.name)!==(kind==='easy'))return false;
  const key=JSON.stringify([m.hunter,m.survivor,m.advantage,m.situation,m.summary,m.condition]);
  if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>(b.listPriority||3)-(a.listPriority||3)||a.id.localeCompare(b.id));
}
