import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {queryBanRecords,banRecordPage} from './dist/model.js';
import {summaryEvidence} from './dist/compendium-model.js';
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const db=read('dist/data.json');
const fixture=[
 ['2026-10-20','A','h1',['s1','s2','s3'],'IVL'],
 ['2026-10-21','B','h1',['s1'],'IVL'],
 ['2026-09-01','A','h2',['s1','s2'],'IJL'],
 ['2026-10-22','A','h3',['s3'],'IVL'],
];
test('ban query counts only observed subset matches without smoothing or invented candidates',()=>{
 const original=structuredClone(fixture),r=queryBanRecords(fixture,['s1','s2','']);
 assert.equal(r.base,4);assert.equal(r.matched,2);assert.deepEqual(r.groups,[{id:'h1',count:1,share:.5},{id:'h2',count:1,share:.5}]);
 assert.equal(r.firstDate,'2026-09-01');assert.equal(r.lastDate,'2026-10-20');assert.deepEqual(fixture,original);
 assert.equal(r.groups.reduce((n,g)=>n+g.count,0),r.matched);
 assert.ok(r.groups.every(g=>!('score' in g)&&g.count>0));
});
test('ban query combines time, map, tournament and exclusions and handles empty selections',()=>{
 assert.equal(queryBanRecords(fixture,['s1'],{days:30}).matched,2);
 const r=queryBanRecords(fixture,['s1'],{map:'A',tournament:'IVL'});assert.equal(r.matched,1);
 assert.equal(queryBanRecords(fixture,['s1'],{excluded:['h1']}).matched,1);
 assert.ok(queryBanRecords(fixture,['s1','s1']).error);assert.ok(queryBanRecords(fixture,[]).error);
 const none=queryBanRecords(fixture,['s9']);assert.equal(none.matched,0);assert.deepEqual(none.groups,[]);assert.equal(none.firstDate,'');
});
test('record pages retain each historical row and clamp stale page numbers',()=>{
 const rows=Array.from({length:41},(_,i)=>i);
 assert.deepEqual([1,2,3].flatMap(p=>banRecordPage(rows,p).rows),rows);
 assert.equal(banRecordPage(rows,999).page,3);assert.equal(banRecordPage(rows,-2).page,1);
 assert.deepEqual(banRecordPage([],2),{page:1,pages:1,total:0,rows:[]});
});
test('compact matchup projections resolve direction, pair and approval before presenting advice',()=>{
 const own=db.characters.find(c=>c.name==='묘지기'),item=own.easy.find(c=>c.name==='사도');
 assert.equal(summaryEvidence(db.matchups,own,item,'easy').primary.situation,'구출');
 assert.equal(summaryEvidence(db.matchups,own,item,'hard'),null);
 assert.equal(summaryEvidence(db.matchups,own,{...item,name:'의사'},'easy'),null);
 assert.equal(summaryEvidence(db.matchups.map(m=>m.id===item.evidence?{...m,status:'보류'}:m),own,item,'easy'),null);
 const contextItem=own.hard.find(c=>c.name==='우산의 영혼'),resolved=summaryEvidence(db.matchups,own,contextItem,'hard');
 assert.equal(resolved.primary.situation,'추격');assert.ok(resolved.contexts.some(m=>m.situation==='구출'));
});

test('content gate catches isolated role, introduction and guide edits until a whole-bundle review is recorded',async()=>{
 const {contentBundles,contentFingerprint,validateContentReviews}=await import('./scripts/content-consistency.mjs');
 const original=contentBundles(db,read('dist/specialties.json'),read('dist/introductions.json'));
 const register=read('research/editorial/content-review.json');
 assert.equal(validateContentReviews(original,register),89);
 for(const field of ['specialties','specialtyReasons','introduction','strengths','use','hold','caution']){
  const changed=structuredClone(original),bundle=changed.get('c24');
  if(Array.isArray(bundle[field]))bundle[field]=[...bundle[field],'다른 설명'];
  else if(typeof bundle[field]==='object')bundle[field]={...bundle[field],캠핑:'다른 역할 이유'};
  else bundle[field]+=' 다른 설명';
  assert.throws(()=>validateContentReviews(changed,register),/c24/);
  const reviewed=structuredClone(register);reviewed.characters.c24.fingerprint=contentFingerprint(bundle);
  delete reviewed.characters.c24.baselineFingerprint;
  assert.throws(()=>validateContentReviews(changed,reviewed,original),/변경 전/);
  reviewed.characters.c24.baselineFingerprint=contentFingerprint(original.get('c24'));
  assert.equal(validateContentReviews(changed,reviewed,original),89);
 }
});

test('legacy broad situation details cannot contradict the current reviewed activity label',async()=>{
 const {evidenceDetail}=await import('./dist/compendium-model.js');
 assert.equal(evidenceDetail({situation:'구출',situationDetail:'추격·구출'}),'');
 assert.equal(evidenceDetail({situation:'추격',situationDetail:'첫 추격·삽 소모'}),'첫 추격·삽 소모');
 assert.equal(evidenceDetail({situation:'커버',situationDetail:'태클·풍선 구출 제한'}),'태클·풍선 구출 제한');
});


test('request IDs work without randomUUID and preserve UUID version and variant',async()=>{
 const {requestId}=await import('./dist/request-id.js');
 assert.equal(requestId({randomUUID:()=> 'native-id'}),'native-id');
 let seed=0;
 const crypto={getRandomValues(bytes){return bytes.fill(++seed);}};
 const first=requestId(crypto),second=requestId(crypto);
 assert.match(first,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 assert.notEqual(first,second);
});
