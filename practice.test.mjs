import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {practiceData as data,practiceEntryFor,selectPractice,practiceFeedback,practiceKey,readPracticeProgress,markPracticeViewed} from './dist/practice-model.js';
import {practicePageHTML,practiceExerciseHTML,mountPractice} from './dist/practice.js';

const db=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const characters=Object.fromEntries(db.characters.map(character=>[character.id,character]));
const clone=()=>structuredClone(data);
function memoryStorage(){const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};}

test('limited BETA has four supported perspectives, eight conditions, and traceable approved matchup records',()=>{
 assert.equal(data.stage,'BETA');assert.equal(data.scenarios.length,4);
 assert.deepEqual([...new Set(data.scenarios.map(scene=>scene.own))].sort(),['c16','c40','c58','c72']);
 assert.equal(data.scenarios.reduce((n,scene)=>n+scene.variants.length,0),8);
 assert.equal(new Set(data.scenarios.map(scene=>scene.id)).size,4);
 for(const source of data.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.support&&source.type);}
 for(const scene of data.scenarios){
  assert.ok(characters[scene.own]&&characters[scene.opponent]);assert.notEqual(characters[scene.own].side,characters[scene.opponent].side);
  for(const id of scene.sourceIds)assert.ok(data.sources.find(source=>source.id===id),id);
  for(const id of scene.evidenceIds){const evidence=db.matchups.find(item=>item.id===id);assert.equal(evidence?.status,'반영');assert.ok([evidence.hunter,evidence.survivor].includes(characters[scene.own].name));assert.ok([evidence.hunter,evidence.survivor].includes(characters[scene.opponent].name));}
  assert.ok(scene.limits.length>=2&&scene.mechanic);
  for(const variant of scene.variants){
   assert.equal(new Set(variant.facts.map(item=>item.id)).size,variant.facts.length);
   assert.ok(scene.reasons.some(reason=>reason.id===variant.reasonId));
   assert.deepEqual(Object.keys(variant.feedback).sort(),scene.actions.map(action=>action.id).sort());
   for(const feedback of Object.values(variant.feedback)){
    assert.ok(['supported','conditional','caution','unknown'].includes(feedback.kind));
    assert.ok(feedback.text&&feedback.title&&feedback.clues.length);
    for(const clue of feedback.clues)assert.ok(variant.facts.some(fact=>fact.id===clue));
   }
  }
 }
});

test('unsupported, held, missing and malformed routes cannot invent a scenario or silently change a condition',()=>{
 assert.equal(practiceEntryFor('c01'),undefined);assert.equal(practiceEntryFor('c72','c10'),undefined);
 assert.equal(practiceEntryFor('c72','c16')?.id,'perfume-order');
 const missing=selectPractice(data,{scene:'does-not-exist'});assert.equal(missing.scene,null);assert.equal(missing.unavailable,true);
 const unsupported=selectPractice(data,{character:'c01'});assert.equal(unsupported.unsupported,true);assert.equal(unsupported.scene,null);
 assert.equal(selectPractice(data,{character:'c01',scene:'perfume-order',variant:'before'}).scene,null,'unsupported character cannot open a different character\'s explanation');
 assert.equal(selectPractice(data,{scene:'perfume-order',variant:'unknown'}).scene,null);
 assert.equal(selectPractice(data,{character:'c40',scene:'perfume-order'}).scene,null);
 const held=clone();held.scenarios[0].status='held';
 assert.equal(selectPractice(held,{scene:'perfume-order'}).scene,null);assert.equal(practiceEntryFor('c72',null,held),undefined);
 assert.equal(selectPractice(data,{}).scene,null);
});

test('changing the perfume order or observed owl state changes the actual explanation',()=>{
 const perfume=data.scenarios.find(scene=>scene.id==='perfume-order');
 const before=practiceFeedback(perfume,perfume.variants[0],'recover','record');
 const after=practiceFeedback(perfume,perfume.variants[1],'recover','record');
 assert.equal(before.kind,'supported');assert.equal(after.kind,'caution');assert.notEqual(before.text,after.text);
 const queen=data.scenarios.find(scene=>scene.id==='queen-owl');
 assert.equal(practiceFeedback(queen,queen.variants[0],'wait','context').kind,'conditional');
 assert.equal(practiceFeedback(queen,queen.variants[1],'wait','context').kind,'caution');
 for(const action of ['attack','wait'])assert.equal(practiceFeedback(queen,queen.variants[0],action,'context').kind,'conditional');
 assert.equal(practiceFeedback(perfume,perfume.variants[0],'recover','anytime').reasonAligned,false);
 assert.equal(practiceFeedback(perfume,perfume.variants[0],'invented','record'),null);
 assert.equal(practiceFeedback(perfume,perfume.variants[0],'recover','invented'),null);
});

test('all 72 authored action/reason combinations render with evidence, conditions and no missing text',()=>{
 let rendered=0;
 for(const scene of data.scenarios)for(const variant of scene.variants)for(const action of scene.actions)for(const reason of scene.reasons){
  const selection=selectPractice(data,{scene:scene.id,variant:variant.id});
  const session={action:action.id,reason:reason.id,revealed:true};
  const html=practiceExerciseHTML({selection,characters,session});
  assert.ok(!/undefined|NaN/.test(html));assert.ok(html.includes(variant.feedback[action.id].title));
  assert.ok(html.includes(data.reviewLabel));assert.ok(html.includes('기전·해설 근거와 검토 범위'));assert.ok(html.includes('이 장면의 적용 범위와 제외 조건'));
  assert.ok(html.includes('해설의 핵심'));assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
  assert.equal((html.match(/name="practice-action"/g)||[]).length,3);assert.equal((html.match(/name="practice-reason"/g)||[]).length,3);
  assert.ok(html.includes('실전 승률이나 플레이 실력 점수가 아닙니다.'));rendered++;
 }
 assert.equal(rendered,72);
 const html=practicePageHTML({selection:selectPractice(data,{}),characters,session:{}});
 assert.ok(html.includes('BETA · 제한 공개'));assert.ok(html.includes('4개 장면 · 8가지 조건'));assert.ok(!html.includes('practice-form'));
});

test('content is escaped and only HTTPS source links are rendered',()=>{
 const changed=clone();changed.scenarios[0].title='<script>alert(1)</script>';changed.sources[0].url='javascript:alert(1)';
 const html=practiceExerciseHTML({data:changed,selection:selectPractice(changed,{scene:'perfume-order'}),characters,session:{}});
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('href="javascript:'));
});

test('progress counts viewed conditions only and ignores stale, duplicate or corrupt stored records',()=>{
 const storage=memoryStorage(),scene=data.scenarios[0],key=practiceKey(data,scene,scene.variants[0]);
 assert.equal(readPracticeProgress(storage).size,0);
 const progress=new Set();assert.equal(markPracticeViewed(storage,progress,key),true);markPracticeViewed(storage,progress,key);
 assert.equal(readPracticeProgress(storage).size,1);
 storage.setItem('manor-practice-progress',JSON.stringify([key,key,'old:perfume-order:before',null,{}]));assert.deepEqual([...readPracticeProgress(storage)],[key]);
 storage.setItem('manor-practice-progress','{broken');assert.equal(readPracticeProgress(storage).size,0);
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(readPracticeProgress(broken).size,0);assert.equal(markPracticeViewed(broken,new Set(),key),false);
});

function harness(params={scene:'perfume-order',variant:'before'},session={},storage=memoryStorage()){
 const events=new Map(),nodes=new Map(),navigations=[],messages=[];
 let focused='',scrolled='';
 const root={innerHTML:'',contains:()=>true,ownerDocument:{defaultView:{location:{origin:'https://example.test',pathname:'/manor/'},matchMedia:()=>({matches:true})}},
  querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',disabled:true,focus(){focused=selector;},scrollIntoView(){scrolled=selector;}});return nodes.get(selector);},
  addEventListener(type,listener){events.set(type,listener);},removeEventListener(type){events.delete(type);}};
 const dispose=mountPractice(root,{characters,params,session,storage,navigate:p=>navigations.push(p),toast:m=>messages.push(m)});
 function change(name,value){events.get('change')({target:{name,value,matches:()=>false}});}
 function submit(){let prevented=false;events.get('submit')({target:{matches:s=>s==='[data-practice-form]'},preventDefault(){prevented=true;}});return prevented;}
 function click(action){return events.get('click')({target:{closest:()=>({dataset:{practiceAction:action}})}});}
 return {root,session,storage,dispose,events,nodes,navigations,messages,change,submit,click,focused:()=>focused,scrolled:()=>scrolled};
}

test('practice requires both choices, reveals once, focuses explanation and clears stale feedback on changes',()=>{
 const h=harness();assert.ok(h.root.innerHTML.includes('data-practice-reveal disabled'));
 h.submit();assert.equal(h.session.revealed,false);assert.equal(readPracticeProgress(h.storage).size,0);
 h.change('practice-action','recover');assert.equal(h.root.querySelector('[data-practice-reveal]').disabled,true);
 h.change('practice-reason','record');assert.equal(h.root.querySelector('[data-practice-reveal]').disabled,false);
 assert.equal(h.submit(),true);assert.equal(h.session.revealed,true);assert.equal(readPracticeProgress(h.storage).size,1);
 assert.equal(h.focused(),'#practice-explanation');assert.equal(h.scrolled(),'#practice-explanation');
 assert.ok(h.root.querySelector('[data-practice-exercise]').innerHTML.includes('피해 복귀를 기대할 수 있습니다.'));
 h.change('practice-reason','anytime');assert.equal(h.session.revealed,false);
 assert.ok(!h.root.querySelector('[data-practice-exercise]').innerHTML.includes('id="practice-explanation"'));
 h.submit();assert.equal(readPracticeProgress(h.storage).size,1);
 h.click('retry');assert.equal(h.session.action,'');assert.equal(h.session.reason,'');assert.equal(h.session.revealed,false);
 assert.ok(h.root.querySelector('[data-practice-exercise]').innerHTML.includes('data-practice-reveal disabled'));
 h.dispose();assert.equal(h.events.size,0);
});

test('route changes reset answers, same-scene remount preserves answers, unavailable storage remains usable',()=>{
 const session={};const first=harness(undefined,session);first.change('practice-action','recover');first.change('practice-reason','record');first.submit();first.dispose();
 const same=harness({scene:'perfume-order',variant:'before'},session,first.storage);assert.equal(session.revealed,true);same.dispose();
 const other=harness({scene:'perfume-order',variant:'after'},session,first.storage);assert.equal(session.revealed,false);assert.equal(session.action,'');
 other.change('practice-action','recover');other.change('practice-reason','record');other.submit();
 assert.ok(other.root.querySelector('[data-practice-exercise]').innerHTML.includes('피격 전 건강 상태가 기록돼 있지 않습니다.'));other.dispose();
 const blocked=harness(undefined,{}, {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 blocked.change('practice-action','recover');blocked.change('practice-reason','record');blocked.submit();
 assert.equal(blocked.session.revealed,true);assert.match(blocked.root.querySelector('[data-practice-storage]').textContent,/이번 방문/);blocked.dispose();
});

test('character filtering uses native navigation and clipboard failure leaves report identifiers',async()=>{
 const h=harness();h.events.get('change')({target:{value:'c40',matches:s=>s==='[data-practice-character]'}});
 assert.deepEqual(h.navigations,[{v:'practice',c:'c40'}]);
 await h.click('copy');assert.match(h.root.querySelector('[data-practice-storage]').textContent,/perfume-order \/ before/);h.dispose();
});
