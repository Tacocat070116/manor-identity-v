import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {statsFor} from './dist/model.js';
import {tournamentRelations,observedDetails,characterEvidence} from './dist/compendium-model.js';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const db=read('dist/data.json'),matches=read('dist/matches.json'),details=read('dist/tournament-details.json');
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
 assert.equal(matches.length,16757+94+october.added.length);
 assert.equal(matches.filter(r=>r[5]!==null).length,16725+94+12-1+october.added.length);
 for(const r of report.filledResults)assert.deepEqual(matches[r.index].slice(5),r.result);
 for(const r of report.conflictingResults)assert.deepEqual(matches[r.index].slice(5),[null,null]);
 for(const {row} of report.added){assert.equal(new Set(row[3]).size,4);assert.ok(row[0]<='2026-10-21');}
});

test('detail source identities and talent side mappings are valid; old and full bans stay separate',()=>{
 assert.equal(details.rows.length,1650);assert.equal(new Set(details.rows.map(r=>r.id)).size,1650);
 const talents=read('research/persona-icons.json').talents;
 const byId=new Map(db.characters.map(c=>[c.id,c]));
 for(const r of details.rows){
  assert.equal(byId.get(r.hunter).side,'감시자');assert.equal(new Set(r.survivors).size,4);
  assert.ok(r.source.endsWith('/'+r.id.split('-')[0]));
  r.hunterTalents.forEach(t=>assert.ok(talents.some(x=>x.name===t&&x.side==='감시자')));
  for(const p of r.players){assert.ok(r.survivors.includes(p.id));p.talents.forEach(t=>assert.ok(talents.some(x=>x.name===t&&x.side==='생존자')));}
 }
 const full=read('dist/bans-observed.json'),legacy=read('dist/bans.json');
 assert.equal(legacy.length,15516);assert.equal(full.length,db.meta.refresh.observedBans);
 for(const r of full){assert.ok(r[0]<='2026-10-27');assert.equal(new Set(r[3]).size,r[3].length);r[3].forEach(id=>assert.equal(byId.get(id).side,'생존자'));}
});

test('all 89 characters have consistent team totals and source-backed updated core descriptions',()=>{
 const edits=read('research/refresh/2026-10-21/guide-edits.json').records;
 const languageEdits=new Map(read('research/localization/2026-10-22/edits.json').map(e=>[e.path,e]));
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
   assert.equal(c[field],change?.after[field]??before,c.name+' '+field+' matches the recorded revision');
  }
  for(const field of ['use','hold','caution']){
   const change=patch.characters.find(e=>e.id===c.id);
   if(change?.before[field])assert.equal(change.before[field],guideEdit.after[field],c.name+' patch retains guide history');
   assert.equal(c[field],change?.after[field]??guideEdit.after[field],c.name+' '+field+' matches the guide revision');
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


test('October refresh preserves existing records and reconciles every newly collected round',()=>{
 assert.equal(october.added.length,102);
 assert.equal(october.duplicateRounds,0);
 assert.deepEqual(october.filledResults,[]);
 assert.deepEqual(october.conflictingResults,[]);
 assert.deepEqual(october.excluded,[]);
 assert.equal(october.heldBans.length,2);
 assert.equal(october.observedBans-october.previousObservedBans,100);
 assert.deepEqual(matches.slice(october.previousMatches),october.added.map(x=>x.row));
 const raw=read('research/refresh/2026-10-27/match-log.json');
 const rounds=raw.matches.flatMap(m=>m.rounds);
 assert.equal(rounds.length,102);
 assert.deepEqual([...new Set(rounds.map(r=>r.id))].sort(),[...october.addedRoundIds].sort());
 assert.equal(db.meta.recordLatest,'2026-10-26');
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
 assert.equal(read('dist/ranked/index.json').meta.collectedAt,'2026-10-17');
 for(const name of ['statistics.zip','badges.csv','manifest.json'])assert.ok(!fs.existsSync('dist/ranked/'+name));
});
