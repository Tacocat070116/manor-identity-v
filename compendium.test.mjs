import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {statsFor,pairEvidence} from './dist/model.js';
import {tournamentRelations,observedDetails,expandTournamentDetails,characterEvidence,contextEvidence} from './dist/compendium-model.js';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const db=read('dist/data.json'),matches=read('dist/matches.json'),details=expandTournamentDetails(read('dist/tournament-details.json'));
const expansion=JSON.parse(gunzipSync(fs.readFileSync('research/refresh/2026-10-29/tournament/update-delta.json.gz')));
const official=read('research/refresh/2026-10-31/tournament/verified-additions.json');
const report=read('research/refresh/2026-10-21/reconciliation.json');
const october=read('research/refresh/2026-10-27/reconciliation.json');
const patch=read('research/refresh/2026-10-27/patch-review.json');
const survivor={id:'a',name:'A',side:'생존자'},hunter={id:'h',name:'H',side:'감시자'};
const fixture=[['2026-10-18','M','h',['a','b','c','d'],'IVL','승',1],['2026-10-17','M','h',['a','b','c','e'],'IVL','패',3],['2026-06-01','N','h2',['a','b','d','e'],'IJL',null,null]];

test('opponents and companions use team perspective and only known results',()=>{
 const s=tournamentRelations(fixture,survivor);
 assert.equal(s.appearances,3);
 assert.deepEqual(s.opponents.find(r=>r.id==='h'),{id:'h',appearances:2,results:2,win:1,draw:0,loss:1,unknown:0,winRate:.5,share:2/3});
 assert.equal(s.opponents.find(r=>r.id==='h2').winRate,null);
 assert.equal(s.companions.find(r=>r.id==='b').share,1);
 assert.equal(s.companions.find(r=>r.id==='b').results,2);
 assert.equal(s.companions.some(r=>r.id==='a'),false);
 assert.equal(s.companions.reduce((n,r)=>n+r.appearances,0),9);
 const h=tournamentRelations(fixture,hunter);
 assert.equal(h.companions.length,0);
 assert.equal(h.opponents.reduce((n,r)=>n+r.appearances,0),8);
 assert.equal(h.opponents.find(r=>r.id==='d').winRate,1);
});

test('relationship filters change both numerators and denominators',()=>{
 const s=tournamentRelations(fixture,survivor,{days:30,map:'M',tournament:'IVL'});
 assert.equal(s.appearances,2);
 assert.equal(s.companions.find(r=>r.id==='d').share,.5);
 assert.equal(s.maps.length,1);
 assert.equal(tournamentRelations(fixture,survivor,{map:'missing'}).maps.length,0);
 assert.equal(statsFor(fixture,survivor,{opponent:'h'}).winRate,.5);
 assert.equal(statsFor([],survivor).winRate,null);
 assert.equal(statsFor(fixture.slice(0,1),survivor).winRate,0);
 assert.equal(statsFor(fixture.slice(0,1),survivor).smallSample,true);
});

test('observed talent and individual metrics retain their own missing-data denominators',()=>{
 const row={id:'1-1',date:'2026-10-18',map:'M',tournament:'IVL',hunter:'h',survivors:['a','b','c','d'],hunterTalents:[],source:'https://example.com/1',players:[{id:'a',talents:['마지막 희망','위기 모면'],decode:0,rescues:0,kite:30,escaped:false}]};
 const second={...row,id:'1-2',players:[{id:'a',talents:[],decode:null,rescues:null,kite:90,escaped:null}]};
 const o=observedDetails([row,second],survivor);
 assert.equal(o.appearances,2);assert.equal(o.talentSamples,1);
 assert.equal(o.builds[0].share,1);assert.equal(o.metrics.decode.count,1);assert.equal(o.metrics.decode.mean,0);
 assert.equal(o.metrics.kite.mean,60);assert.equal(o.metrics.escaped.count,1);assert.equal(o.metrics.escaped.mean,0);
 assert.equal(o.sources.length,1);
 assert.equal(observedDetails([row],hunter).talentSamples,0);
 assert.equal(observedDetails([row],survivor,{tournament:'IJL'}).appearances,0);
});

test('refresh reconciliation adds only nonduplicate valid rounds and resolves explicit missing outcomes',()=>{
 assert.equal(report.collectedRounds,1550);
 assert.equal(report.duplicateRounds+report.added.length+report.excluded.length,report.collectedRounds);
 assert.equal(report.added.length,94);assert.equal(report.filledResults.length,12);assert.equal(report.conflictingResults.length,1);
 assert.equal(report.added.filter(r=>r.row[0]>'2026-10-05').length,90);
 assert.equal(matches.length,16757+94+october.added.length+expansion.addedMatches.length+official.addedMatches.length);
 assert.equal(matches.filter(r=>r[5]!==null).length,16725+94+12-1+october.added.length+expansion.addedMatches.length+official.addedMatches.length);
 for(const r of report.filledResults)assert.deepEqual(matches[r.index].slice(5),r.result);
 for(const r of report.conflictingResults)assert.deepEqual(matches[r.index].slice(5),[null,null]);
 for(const {row} of report.added){assert.equal(new Set(row[3]).size,4);assert.ok(row[0]<='2026-10-21');}
});

test('detail source identities and talent side mappings are valid; old and full bans stay separate',()=>{
 assert.equal(details.rows.length,16930);assert.equal(new Set(details.rows.map(r=>r.id)).size,16930);
 const talents=read('research/persona-icons.json').talents;
 const byId=new Map(db.characters.map(c=>[c.id,c]));
 for(const r of details.rows){
  assert.equal(byId.get(r.hunter).side,'감시자');assert.equal(new Set(r.survivors).size,4);
  assert.ok(r.id.startsWith('weibo-')?official.addedDetails.some(d=>d.id===r.id&&d.source===r.source):r.id.startsWith('bwiki-')?r.source.startsWith('https://website.homeworkkun.top/赛事数据展示/data/'):r.source.endsWith('/'+r.id.split('-')[0]));
  r.hunterTalents.forEach(t=>assert.ok(talents.some(x=>x.name===t&&x.side==='감시자')));
  for(const p of r.players){assert.ok(r.survivors.includes(p.id));p.talents.forEach(t=>assert.ok(talents.some(x=>x.name===t&&x.side==='생존자')));}
 }
 const full=read('dist/bans-observed.json'),legacy=read('dist/bans.json');
 assert.equal(legacy.length,15516);assert.equal(full.length,db.meta.statisticsRefresh.after.observedBans);
  for(const r of full){assert.ok(r[0]<='2026-10-31');assert.equal(new Set(r[3]).size,r[3].length);r[3].forEach(id=>assert.equal(byId.get(id).side,'생존자'));}
});

test('all 89 characters have consistent team totals and source-backed updated core descriptions',()=>{
 const edits=read('research/refresh/2026-10-21/guide-edits.json').records;
 const languageEdits=new Map(read('research/localization/2026-10-22/edits.json').map(e=>[e.path,e]));
 const terminologyEdits=new Map(read('research/localization/2026-10-27/edits.json').map(e=>[e.path,e]));
 const terminologyFollowup=new Map(read('research/localization/2026-10-27-followup/edits.json').map(e=>[e.path,e]));
 const latest=(index,field,previous)=>{
  const history=[...terminologyEdits.values(),...terminologyFollowup.values(),...['2026-10-29','2026-10-30','2026-10-31'].flatMap(date=>read('research/editorial/'+date+'/consistency-edits.json').edits)];
  for(const edit of history.filter(e=>e.path===`dist/data.json/characters/${index}/${field}`)){
   assert.equal(edit.before,previous,`${index} ${field} preserves terminology history`);
   previous=edit.after;
  }
  return previous;
 };
 const guideEdits=new Map(read('research/editorial/2026-10-25/skill-guide-edits.json').records.map(e=>[e.id,e]));
 assert.equal(edits.length,89);
 assert.equal(guideEdits.size,89);
 for(const [index,c] of db.characters.entries()){
  const r=tournamentRelations(matches,c),s=statsFor(matches,c);
  assert.equal(r.appearances,s.appearances);
  assert.equal(r.maps.reduce((n,x)=>n+x.results,0),s.results);
  assert.equal(r.opponents.reduce((n,x)=>n+x.appearances,0),s.appearances*(c.side==='감시자'?4:1));
  if(c.side==='생존자')assert.equal(r.companions.reduce((n,x)=>n+x.appearances,0),s.appearances*3);
  const e=edits.find(e=>e.id===c.id);
  const guideEdit=guideEdits.get(c.id);
  for(const field of ['skill','caution']){
   const languageEdit=languageEdits.get(`dist/data.json/characters/${index}/${field}`);
   if(languageEdit)assert.equal(languageEdit.before,e[field],c.name+' '+field+' retains its reviewed source wording');
   const previous=languageEdit?.after??e[field];
   if(field==='caution')assert.equal(guideEdit.before[field],previous,c.name+' caution retains its editorial history');
   const before=field==='caution'?guideEdit.after[field]:previous;
   const change=patch.characters.find(e=>e.id===c.id);
   if(change?.before[field])assert.equal(change.before[field],before,c.name+' patch retains editorial history');
   assert.equal(c[field],latest(index,field,change?.after[field]??before),c.name+' '+field+' matches the recorded revision');
  }
  for(const field of ['use','hold','caution']){
   const change=patch.characters.find(e=>e.id===c.id);
   if(change?.before[field])assert.equal(change.before[field],guideEdit.after[field],c.name+' patch retains guide history');
   assert.equal(c[field],latest(index,field,change?.after[field]??guideEdit.after[field]),c.name+' '+field+' matches the guide revision');
  }
  assert.equal(c.reviewedAt,'2026-10-21');
 }
});

test('single-source and opposite situational evidence remain reachable without promoting held records',()=>{
 let all=0;
 for(const c of db.characters)for(const kind of ['hard','easy']){
  const records=characterEvidence(db.matchups,c,kind);all+=records.length;
  for(const m of records){assert.equal(m.status,'반영');assert.ok(m.sourceSupport.length&&m.condition);assert.equal(m.advantage===c.name,kind==='easy');}
  c[kind].forEach(i=>assert.ok(records.some(m=>m.id===i.evidence)));
 }
 assert.ok(all>=800);
 assert.ok(db.matchups.some(m=>m.listEligible&&m.sourceFamilies.length===1));
 assert.equal(db.matchups.filter(m=>m.status==='보류').length,49);
 assert.ok(db.characters.some(c=>c.easy.some(a=>c.hard.some(b=>a.name===b.name))));
});

test('Grave Keeper chase disadvantage keeps the separate rescue exception reachable',()=>{
 const grave=db.characters.find(c=>c.name==='묘지기'),wu=db.characters.find(c=>c.name==='우산의 영혼');
 for(const [own,other,kind] of [[grave,wu,'hard'],[wu,grave,'easy']]){
  assert.ok(own[kind].some(i=>i.name===other.name&&i.evidence==='M131'));
  assert.ok(!characterEvidence(db.matchups,own,kind==='hard'?'easy':'hard').some(m=>m.hunter===wu.name&&m.survivor===grave.name));
 }
 const chase=pairEvidence(db.matchups,grave,wu,'추격'),rescue=pairEvidence(db.matchups,grave,wu,'구출');
 assert.deepEqual(chase.map(m=>m.advantage),[wu.name]);
 assert.deepEqual(rescue.map(m=>m.advantage),[grave.name]);
 assert.match(chase[0].condition,/돌진/);
 assert.match(rescue[0].condition,/잠행 시작 동작을 마쳐야/);
 assert.match(rescue[0].condition,/삽이 남아/);
 assert.match(rescue[0].condition,/먼저 추격받아/);
 assert.deepEqual(contextEvidence(db.matchups,'M131'),rescue);
 assert.deepEqual(pairEvidence(db.matchups,wu,grave,'구출'),rescue);
});

test('situation labels describe activities while legacy detail filters keep working',()=>{
 const allowed=new Set(['추격','구출','커버','운영']);
 for(const m of db.matchups.filter(m=>m.status==='반영')){
  assert.ok(m.situation.split('·').every(s=>allowed.has(s)),m.id);
  assert.ok(m.situationDetail,m.id);
 }
 for(const [id,phase] of [['M003','구출'],['M209','커버'],['M247','구출'],['M249','추격'],['M265','운영'],['M321','구출']])assert.equal(db.matchups.find(m=>m.id===id).situation,phase,id);
 const professor=db.characters.find(c=>c.name==='교수'),wu=db.characters.find(c=>c.name==='우산의 영혼');
 assert.ok(pairEvidence(db.matchups,professor,wu,'추격').some(m=>m.id==='M315'));
 assert.ok(pairEvidence(db.matchups,professor,wu,'일반 공격 방어').some(m=>m.id==='M315'));
 assert.equal(pairEvidence(db.matchups,professor,wu,'구출').length,0);
});

test('conditional notes never leak from held records or another pair',()=>{
 const primary={id:'one',status:'반영',hunter:'A',survivor:'B'};
 const valid={id:'two',status:'반영',contextFor:'one',hunter:'A',survivor:'B'};
 assert.deepEqual(contextEvidence([primary,valid,{...valid,id:'held',status:'보류'},{...valid,id:'wrong',survivor:'C'}],'one'),[valid]);
 assert.deepEqual(contextEvidence([valid],'one'),[]);
});


test('October refresh preserves existing records and reconciles every newly collected round',()=>{
 assert.equal(october.added.length,102);
 assert.equal(october.duplicateRounds,0);
 assert.deepEqual(october.filledResults,[]);
 assert.deepEqual(october.conflictingResults,[]);
 assert.deepEqual(october.excluded,[]);
 assert.equal(october.heldBans.length,2);
 assert.equal(october.observedBans-october.previousObservedBans,100);
 assert.deepEqual(matches.slice(october.previousMatches,october.previousMatches+october.added.length),october.added.map(x=>expansion.dateCorrections.find(c=>c.id===x.id)?.afterRow||x.row));
 const raw=read('research/refresh/2026-10-27/match-log.json');
 const rounds=raw.matches.flatMap(m=>m.rounds);
 assert.equal(rounds.length,102);
 assert.deepEqual([...new Set(rounds.map(r=>r.id))].sort(),[...october.addedRoundIds].sort());
 assert.equal(db.meta.recordLatest,'2026-10-30');
 for(const entry of october.added){
  const original=rounds.find(r=>r.id===entry.id);
  assert.equal(entry.row[0],original.date);
  assert.equal(entry.row[6],original.escaped);
  assert.equal(entry.row[5],original.escaped<2?'승':original.escaped===2?'무':'패');
 }
 for(const c of db.characters){
  const changed=patch.characters.some(e=>e.id===c.id);
  assert.equal(c.gamePatchDate,changed?'2026-10-22':undefined);
  assert.equal(c.patchCheckedAt,changed?'2026-10-27':undefined);
 }
 assert.equal(read('dist/ranked/index.json').meta.collectedAt,'2026-10-31');
 for(const name of ['statistics.zip','badges.csv','manifest.json'])assert.ok(!fs.existsSync('dist/ranked/'+name));
});


test('expanded tournament records round-trip compact data and preserve reviewed corrections and unknown results',()=>{
 const byId=new Map(details.rows.map(r=>[r.id,r]));
 assert.deepEqual(matches.slice(expansion.summary.before.matches,expansion.summary.after.matches),expansion.addedMatches.map(e=>e.row));
 for(const row of expansion.addedDetails)assert.deepEqual(byId.get(row.id),row);
 for(const fix of expansion.detailCorrections)assert.deepEqual(byId.get(fix.id),fix.after);
 for(const fix of expansion.dateCorrections){assert.deepEqual(matches[fix.coreIndex],fix.afterRow);assert.equal(byId.get(fix.detailId).date,fix.verifiedMatchDate);for(const ban of fix.observedBans)assert.deepEqual(read('dist/bans-observed.json')[ban.index],ban.after);}
 assert.equal(matches.filter(r=>r[5]===null).length,21);assert.ok(matches.every(r=>r[0]<='2026-10-31'));
 assert.equal(read('dist/bans-observed.json').length,16842);
 const counts=Object.fromEntries(['decode','rescues','kite','escaped'].map(k=>[k,details.rows.reduce((n,r)=>n+r.players.filter(p=>p[k]!==null).length,0)]));
 assert.deepEqual(counts,expansion.summary.personalObservations);
 const allNull=expansion.addedDetails.find(r=>r.players.every(p=>p.decode===null));assert.ok(allNull);assert.equal(observedDetails([allNull],{id:allNull.survivors[0],side:'생존자'}).metrics.decode.count,0);
 assert.equal(expandTournamentDetails({meta:{},rows:[]}).rows.length,0);
});

test('official October 30 set observations preserve partial coverage and unknown individual metrics',()=>{
 assert.deepEqual(matches.slice(expansion.summary.after.matches),official.addedMatches.map(x=>x.row));
 assert.deepEqual(read('dist/bans-observed.json').slice(expansion.summary.after.observedBans),official.addedObservedBans.map(x=>x.row));
 const newRows=details.rows.filter(d=>d.id.startsWith('weibo-'));
 assert.deepEqual(newRows,official.addedDetails);assert.equal(newRows.length,2);
 for(const d of newRows){
  assert.equal(d.date,'2026-10-30');assert.equal(d.result,'무');assert.deepEqual(d.hunterTalents,[]);
  for(const p of d.players){assert.deepEqual(p.talents,[]);for(const key of ['decode','rescues','kite','escaped'])assert.equal(p[key],null);}
 }
 assert.equal(read('dist/bans.json').length,15516);
 assert.equal(official.legacyOpeningBansAdded,0);assert.equal(official.individualMetricValuesAdded,0);
 assert.match(details.meta.latestCoverage,/2세트 두 반경기만/);
});
