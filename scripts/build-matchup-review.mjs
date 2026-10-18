import fs from 'node:fs';
import assert from 'node:assert/strict';

// Rebuild only the approved matchup review. Character prose and manual sheet
// edits outside this review are deliberately not rewritten.
const directory='research/matchups/2026-10-19';
const read=name=>JSON.parse(fs.readFileSync(name,'utf8'));
const patch=read(`${directory}/patch-review.json`);
const date=patch.reviewedAt;
const groups=['a','b','c','d'].map(group=>read(`${directory}/group-${group}.json`));
const supplement=read(`${directory}/supplement.json`);
const reviews=[...groups,supplement];
const db=read('dist/data.json');
const byName=new Map(db.characters.map(c=>[c.name,c]));
const byId=new Map(db.matchups.map(m=>[m.id,m]));

function canonical(value){
 const u=new URL(value);assert.ok(['http:','https:'].includes(u.protocol));
 let host=u.hostname.replace(/^www\./,'');
 if(/(^|\.)namu\.(moe|wiki)$/.test(host))host='namu.wiki';
 const query=new URLSearchParams([...u.searchParams].filter(([key])=>!/^utm_|^(fbclid|gclid)$/.test(key)));
 query.sort();
 return host+decodeURIComponent(u.pathname).replace(/\/$/,'')+(query.size?'?'+query:'');
}
// Conservative publication families. Mirrors, official translations, and
// multiple pages on one community wiki never create independent corroboration.
function family(value){
 const u=new URL(value),host=u.hostname.replace(/^www\./,'');
 if(/(^|\.)namu\.(moe|wiki)$/.test(host))return 'namuwiki';
 if(/(^|\.)wikiwiki\.jp$/.test(host)&&u.pathname.includes('identity5ch'))return 'identity5ch';
 if(/identityvgame\.com$|(^|\.)(idv|id5)\.163\.com$/.test(host))return 'netease-official';
 const source=sourceUpdates.get(canonical(value));
 const invited=/netease|official|yuebao/i.test(source?.sourceFamily||'')||/공식.*(공략|초청)|官方|特邀/.test((source?.title||'')+' '+(source?.notes||''));
 // Invited guides reposted by different Chinese portals are still the same
 // publication lineage. Conservatively group them with the official publisher.
 if(invited&&/taptap\.(cn|io)$|3dmgame\.com$|17173\.com$|18183\.com$|4399\.(cn|com)$|xiaomi\.com$/.test(host))return 'netease-official';
 if(host==='wiki.biligame.com')return 'bwiki';
 if(/taptap\.(cn|io)$/.test(host))return 'taptap';
 return host;
}

const covered=new Set();
for(const group of groups){
 assert.equal(group.reviewedAt,date);
 for(const item of group.records){
  assert.ok(byId.has(item.id),`Unknown reviewed record ${item.id}`);
  assert.ok(!covered.has(item.id),`Duplicate review ${item.id}`);
  covered.add(item.id);
 }
}
const baseline=db.matchups.filter(m=>Number(m.id.slice(1))<=patch.baselineRecords);
assert.equal(covered.size,patch.baselineRecords,'Every original evidence record must be reviewed');
for(const m of baseline)assert.ok(covered.has(m.id),`Missing review ${m.id}`);

let next=patch.baselineRecords;
for(const review of reviews){
 for(const update of review.records){
  const target=byId.get(update.id);
  Object.assign(target,update);
 }
 for(const addition of review.additions){
  const id='M'+String(++next).padStart(3,'0');
  const target={...addition,id};
  if(byId.has(id))Object.assign(byId.get(id),target);
  else {db.matchups.push(target);byId.set(id,target);}
 }
}

const sourceUpdates=new Map();
for(const s of [...reviews.flatMap(r=>r.sources),...patch.sources]){
 s.region=({KR:'한국',JP:'일본',CN:'중국'}[s.region]||s.region);
 const key=canonical(s.url),existing=sourceUpdates.get(key);
 if(existing){
  existing.scope=[...new Set([existing.scope,s.scope].flatMap(x=>Array.isArray(x)?x:String(x||'').split(/\s*·\s*/)))].filter(Boolean).join(' · ');
  if(s.notes&&!existing.notes.includes(s.notes))existing.notes+=' '+s.notes;
 }else sourceUpdates.set(key,{...s,notes:s.notes||'',scope:Array.isArray(s.scope)?s.scope.join(' · '):s.scope||''});
}

for(const m of db.matchups){
 assert.equal(m.reviewedAt,date,`${m.id} current review date`);
 assert.ok(['반영','보류'].includes(m.status),m.id);
 assert.equal(byName.get(m.hunter)?.side,'감시자',m.id+' hunter');
 assert.equal(byName.get(m.survivor)?.side,'생존자',m.id+' survivor');
 if(m.status==='보류')m.advantage=null;
 else assert.ok([m.hunter,m.survivor].includes(m.advantage),m.id+' direction');
 for(const key of ['summary','condition','situation','basis','patch'])assert.ok(typeof m[key]==='string'&&m[key].trim(),m.id+' '+key);
 m.urls=[...new Map((m.urls||[]).map(u=>[canonical(u),u])).values()];
 m.sourceSupport=(m.sourceSupport||[]).map(s=>{
  assert.ok(sourceUpdates.has(canonical(s.url)),`${m.id}: source manifest missing ${s.url}`);
  assert.ok(['direct','mechanic','exception'].includes(s.support),m.id+' support role');
  assert.ok(typeof s.note==='string'&&s.note.trim(),m.id+' source note');
  return {...s,sourceFamily:family(s.url)};
 });
 assert.ok(m.sourceSupport.length,`${m.id}: reviewed source support required`);
 m.sourceFamilies=[...new Set(m.sourceSupport.map(s=>s.sourceFamily))].sort();
 m.listEligible=m.status==='반영'&&m.listEligible===true&&m.sourceFamilies.length>=2;
 m.type='상황별 상성 재검토';
 m.language=[...new Set(m.sourceSupport.map(s=>sourceUpdates.get(canonical(s.url)).region).map(r=>({한국:'한국어',일본:'일본어',중국:'중국어'}[r]||'공식 공지')))].join(' · ');
 m.documents=m.sourceSupport.length;
 for(const support of m.sourceSupport){
  const s=sourceUpdates.get(canonical(support.url));
  const names=new Set(String(s.scope||'').split(/\s*·\s*/));
  names.add(m.hunter);names.add(m.survivor);s.scope=[...names].filter(Boolean).join(' · ');
 }
}

let sourceId=Math.max(...db.sources.map(s=>Number(s.id.slice(1))));
for(const s of sourceUpdates.values()){
 let target=db.sources.find(old=>canonical(old.url)===canonical(s.url));
 if(!target){target={id:'S'+String(++sourceId).padStart(3,'0')};db.sources.push(target);}
 Object.assign(target,{region:['한국','일본','중국'].includes(s.region)?s.region:'기존 범위 외',site:s.title||new URL(s.url).hostname,type:s.kind||'공략 자료',status:'상성 재검토',scope:s.scope,url:s.url,original:target.original||s.url,date:s.accessedAt||date,note:s.notes,sourceFamily:family(s.url),publishedAt:s.publishedAt||null});
}

const accepted=db.matchups.filter(m=>m.status==='반영');
const pairKey=m=>m.hunter+'\0'+m.survivor;
const directions=new Map();
for(const m of accepted){if(!directions.has(pairKey(m)))directions.set(pairKey(m),new Set());directions.get(pairKey(m)).add(m.advantage);}
const mixedPairs=[...directions].filter(([,values])=>values.size>1).map(([key])=>key);
const mixed=new Set(mixedPairs);
for(const m of accepted){
 if(mixed.has(pairKey(m))){m.listEligible=false;m.listExclusion='상황별 유불리가 반대여서 대표 목록에서 제외';}
 else if(!m.listEligible)m.listExclusion='독립 근거·적용 범위가 대표 목록 기준에 미달';
 else delete m.listExclusion;
}

function score(m){
 const direct=new Set(m.sourceSupport.filter(s=>s.support==='direct').map(s=>s.sourceFamily)).size;
 return (Number(m.listPriority)||3)*100+Math.min(direct,3)*20+Math.min(m.sourceFamilies.length,3)*5+(Number(m.priority)||0)/100;
}
for(const c of db.characters){
 c.matchupReviewedAt=date;
 for(const kind of ['hard','easy']){
  const candidates=accepted.filter(m=>m.listEligible&&(m.hunter===c.name||m.survivor===c.name)&&((m.advantage===c.name)===(kind==='easy'))).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
  const selected=new Map();
  for(const m of candidates){const opponent=m.hunter===c.name?m.survivor:m.hunter;if(!selected.has(opponent))selected.set(opponent,{name:opponent,reason:`[${m.situation}] ${m.summary}\n조건: ${m.condition}`,evidence:m.id});}
  c[kind]=[...selected.values()].slice(0,5);
 }
}

Object.assign(db.meta,{matchupReviewedAt:date,matchupPatchDate:patch.latestConfirmedPatch,matchupCount:accepted.length,heldMatchups:db.matchups.length-accepted.length,sourceCount:db.sources.length,matchupReview:{baselineCommit:patch.baselineCommit,reviewedExisting:covered.size,added:next-patch.baselineRecords,sourceDocuments:sourceUpdates.size,sourceFamilies:new Set([...sourceUpdates.values()].map(s=>family(s.url))).size,excludedMixedPairs:mixedPairs.length,method:'공식 패치 대조 · 독립 출처 교차 검토 · 추격/구출/운영 조건 분리',limitations:patch.limitations}});

const summary={reviewedAt:date,officialPatch:patch.latestConfirmedPatch,characters:db.characters.length,reviewedExisting:covered.size,added:next-patch.baselineRecords,accepted:accepted.length,held:db.meta.heldMatchups,eligibleEvidence:accepted.filter(m=>m.listEligible).length,displayedSlots:db.characters.reduce((n,c)=>n+c.hard.length+c.easy.length,0),capacity:db.characters.length*10,reviewedSourceDocuments:sourceUpdates.size,reviewedSourceFamilies:db.meta.matchupReview.sourceFamilies,mixedPairs:mixedPairs.map(k=>k.split('\0')),characterCoverage:db.characters.map(c=>({id:c.id,name:c.name,hard:c.hard.length,easy:c.easy.length,evidence:accepted.filter(m=>m.hunter===c.name||m.survivor===c.name).length}))};
fs.writeFileSync('dist/data.json',JSON.stringify(db));
fs.writeFileSync(`${directory}/summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,characterCoverage:undefined,mixedPairs:summary.mixedPairs.length},null,2));
