import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {matchupBrief} from './dist/matchup-model.js';
const db=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));
const own=byName['블러디 퀸'],opp=byName['교수'];

test('identical mirror/scales evidence becomes one conclusion with every source retained',()=>{
 const brief=matchupBrief(db.matchups,own,opp);
 assert.equal(brief.groups.length,1);
 assert.equal(brief.opportunities.length,1);assert.equal(brief.threats.length,0);
 assert.deepEqual(brief.groups[0].records.map(r=>r.id),['M080','M241']);
 assert.deepEqual(brief.groups[0].situations,['거울 추격','추격']);
 assert.match(brief.groups[0].summary,/거울상만 맞히는 공격/);
 assert.match(brief.groups[0].condition,/본체의 평타는 비늘로 막을 수/);
 const reverse=matchupBrief(db.matchups,opp,own);
 assert.equal(reverse.opportunities.length,0);assert.equal(reverse.threats.length,1);
 assert.deepEqual(reverse.groups[0].records,brief.groups[0].records);
 assert.equal(reverse.groups[0].condition,brief.groups[0].condition);
});

test('filtering preserves relevant sources and separates held, missing and unfiltered records',()=>{
 const exact=matchupBrief(db.matchups,own,opp,'거울 추격');
 assert.deepEqual(exact.groups[0].records.map(r=>r.id),['M080']);
 assert.equal(exact.total,2);
 assert.deepEqual(matchupBrief(db.matchups,own,opp,'없는 상황').groups,[]);
 const held=matchupBrief(db.matchups,own,byName['기상학자']);
 assert.ok(held.held.length);assert.ok(held.held.every(row=>row.status==='보류'));
 assert.ok(held.groups.every(group=>group.records.every(row=>row.status==='반영')));
 const missing=matchupBrief([],own,opp);assert.deepEqual(missing.groups,[]);assert.deepEqual(missing.held,[]);
 for(const invalid of [undefined,own,byName['붉은 나비']])assert.deepEqual(matchupBrief(db.matchups,own,invalid).groups,[]);
});

test('different conditions and opposing opportunities are not merged into an overall verdict',()=>{
 const row=db.matchups.find(r=>r.id==='M080');
 const records=[row,{...row,id:'other-condition',condition:'다른 적용 조건'},
  {...row,id:'opposite',advantage:opp.name}, {...row,id:'held',status:'보류',advantage:null},
  {...row,id:'invalid-direction',advantage:'알 수 없음'}];
 const brief=matchupBrief(records,own,opp);
 assert.equal(brief.groups.length,3);assert.equal(brief.opportunities.length,2);assert.equal(brief.threats.length,1);
 assert.equal(brief.held.length,1);assert.equal(brief.total,3);
 assert.ok(!brief.groups.some(g=>g.records.some(r=>r.id==='held'||r.id==='invalid-direction')));
});

test('every accepted pair retains all evidence and reverses perspective without mutating reviewed data',()=>{
 const before=JSON.stringify(db.matchups);
 const pairs=[...new Map(db.matchups.filter(r=>r.status==='반영').map(r=>[r.hunter+'|'+r.survivor,[r.hunter,r.survivor]])).values()];
 assert.equal(pairs.length,375);
 for(const [hunter,survivor] of pairs){
  const a=matchupBrief(db.matchups,byName[hunter],byName[survivor]);
  const b=matchupBrief(db.matchups,byName[survivor],byName[hunter]);
  const expected=db.matchups.filter(r=>r.status==='반영'&&r.hunter===hunter&&r.survivor===survivor);
  assert.deepEqual(a.groups.flatMap(g=>g.records.map(r=>r.id)).sort(),expected.map(r=>r.id).sort());
  assert.deepEqual(a.opportunities.map(g=>g.id),b.threats.map(g=>g.id));
  assert.deepEqual(a.threats.map(g=>g.id),b.opportunities.map(g=>g.id));
  assert.ok(a.groups.every(g=>g.summary&&g.condition&&g.records.length));
 }
 assert.equal(JSON.stringify(db.matchups),before);
});
