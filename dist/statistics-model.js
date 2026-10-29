import {filterRows,matchesCharacter} from './model.js?v=7daffcd45847';

export const SERVER_LABELS={asia:'아시아',cn:'중국'};
export const TIER_LABELS={all:'전체 랭크',peak7:'최고 7티어','7':'7티어','6':'6티어','5':'5티어','4':'4티어','3':'3티어','2':'2티어','1':'1티어'};
export const TIER_ORDER=['all','peak7','7','6','5','4','3','2','1'];
export const METRIC_LABELS={pick:'픽률',win:'승률',draw:'무승부율',loss:'패배율',ban:'밴율',appearances:'출전 수',name:'이름'};
const seasonNumber=s=>Number(String(s).match(/\d+/)?.[0]||0);
export const compareSnapshots=(a,b)=>seasonNumber(b.season)-seasonNumber(a.season)||String(b.asOf||b.periodEnd||'').localeCompare(String(a.asOf||a.periodEnd||''))||(b.priority||0)-(a.priority||0)||a.id.localeCompare(b.id);

// A ranked dataset is a published aggregate, never an individual match sample.
// Selecting one cohort avoids averaging overlapping seasons, ranks or sources.
export function selectRanked(data,filters={}){
 const sets=(data?.datasets||[]).filter(d=>d.status!=='held'&&Object.hasOwn(SERVER_LABELS,d.server));
 const servers=Object.keys(SERVER_LABELS).filter(s=>sets.some(d=>d.server===s));
 const server=servers.includes(filters.server)?filters.server:(servers.includes('asia')?'asia':servers[0]||'');
 const region=sets.filter(d=>d.server===server).sort(compareSnapshots);
 const seasons=[...new Set(region.map(d=>d.season))];
 const season=seasons.includes(filters.season)?filters.season:region.find(d=>!d.excludeFromDefault)?.season||seasons[0]||'';
 const seasonSets=region.filter(d=>d.season===season);
 const tiers=TIER_ORDER.filter(t=>seasonSets.some(d=>d.tier===t));
 const tier=tiers.includes(filters.tier)?filters.tier:tiers[0]||'';
 const snapshots=seasonSets.filter(d=>d.tier===tier);
 const dataset=snapshots.find(d=>d.id===filters.snapshot)||snapshots.find(d=>!d.excludeFromDefault)||snapshots[0]||null;
 return {servers,seasons,tiers,snapshots,dataset,filters:{server,season,tier,snapshot:dataset?.id||''}};
}

export function tournamentStatistics(matches,bans,characters,filters={}){
 const games=filterRows(matches,filters),banRows=filterRows(bans,filters);
 const map=new Map(characters.map(c=>[c.id,{id:c.id,name:c.name,side:c.side,appearances:0,results:0,wins:0,draws:0,losses:0,unknown:0,banCount:c.side==='생존자'?0:null}]));
 for(const g of games){
  for(const id of new Set([g[2],...g[3]])){
   const r=map.get(id);if(!r)continue;r.appearances++;
   if(!['승','무','패'].includes(g[5])){r.unknown++;continue;}
   r.results++;if(g[5]==='무')r.draws++;else if((g[5]==='승')===(r.side==='감시자'))r.wins++;else r.losses++;
  }
 }
 for(const b of banRows)for(const id of new Set(b[3])){const r=map.get(id);if(r?.banCount!==null&&r?.banCount!==undefined)r.banCount++;}
 const rows=[...map.values()].map(r=>({...r,pick:games.length?r.appearances/games.length*100:null,win:r.results>0?r.wins/r.results*100:null,draw:r.results>0?r.draws/r.results*100:null,loss:r.results>0?r.losses/r.results*100:null,ban:banRows.length&&r.banCount!==null?r.banCount/banRows.length*100:null}));
 return {rows,games:games.length,banGames:banRows.length,results:games.filter(g=>['승','무','패'].includes(g[5])).length,first:games.reduce((v,g)=>!v||g[0]<v?g[0]:v,''),last:games.reduce((v,g)=>g[0]>v?g[0]:v,'')};
}

export function sortStatistics(rows,{side='생존자',search='',sort='pick',direction='desc'}={}){
 const key=Object.hasOwn(METRIC_LABELS,sort)?sort:'pick';
 return rows.filter(r=>(side==='전체'||r.side===side)&&matchesCharacter(r,search)).sort((a,b)=>{
  if(key==='name')return a.name.localeCompare(b.name,'ko')*(direction==='asc'?1:-1);
  const x=a[key],y=b[key];if(x==null&&y==null)return a.name.localeCompare(b.name,'ko');if(x==null)return 1;if(y==null)return -1;
  return (direction==='asc'?x-y:y-x)||a.name.localeCompare(b.name,'ko');
 });
}

export function rankedCharacter(dataset,id){return dataset?.rows?.find(r=>r.id===id)||null;}
export function cohortLabel(d){return d?[SERVER_LABELS[d.server]||d.server,d.season,TIER_LABELS[d.tier]||d.tier].join(' · '):'공개 자료 없음';}
export function snapshotLabel(d){return d.asOf?`${d.asOf} 기준`:d.periodEnd?`${d.periodEnd}까지`:d.timeLabel||'시즌 집계';}
export function resultPercentages(row){return ['win','draw','loss'].every(k=>Number.isFinite(row?.[k]))?[row.win,row.draw,row.loss]:null;}
