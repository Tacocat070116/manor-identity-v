import * as synergyModel from './dist/synergy-model.js';
import * as compendium from './dist/compendium-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as themeUI from './dist/themes.js';
import * as model from './dist/model.js';
import * as releases from './dist/releases.js';
import {createStatisticsUI} from './dist/statistics.js';
import {selectRanked} from './dist/statistics-model.js';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const db=read('dist/data.json');
const specialties=read('dist/specialties.json');
for(const c of db.characters)Object.assign(c,specialties.characters[c.id]);
const byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));
const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
async function harness(hash){
 const nodes=new Map(),handlers={},history=[],scrolls=[],tipMounts=[],synergyMounts=[];let tipsDisposed=0,synergyDisposed=0;
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){}},addEventListener(){},focus(options){this.focusOptions=options;}});
 const context={...compendium,...themeUI,...model,...releases,createStatisticsUI,selectRanked,__db:db,__releases:read('dist/releases.json'),
  URL,URLSearchParams,Intl,setTimeout:()=>0,clearTimeout(){},location:{hash},
  mountSynergy:(root,options)=>{synergyMounts.push(options);return ()=>synergyDisposed++;},
  mountMatchupTips:(root,options)=>{tipMounts.push(options);return ()=>tipsDisposed++;},
  localStorage:{getItem:()=>null},matchMedia:()=>({matches:false}),
  document:{documentElement:{dataset:{}},addEventListener(type,handler){handlers[type]=handler;},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}},
  fetch:async path=>({ok:true,json:async()=>read('dist/'+path.split('?')[0])})
 };
 context.window={scrollY:180,scrollTo:options=>scrolls.push(options),addEventListener(){},history:{pushState(_state,_unused,hash){history.push(hash);context.location.hash=hash;}}};
 Object.assign(context,synergyModel);vm.runInNewContext(source+`\ndb=__db;byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));releaseLog=__releases;navigationController={update(){}};globalThis.app={state,readRoute,render,swapSelections,selectionSwap,currentViewParams};`,context);
 context.app.readRoute();await context.app.render();
 return {...context.app,nodes,handlers,history,scrolls,context,tipMounts,synergyMounts,synergyDisposed:()=>synergyDisposed,tipsDisposed:()=>tipsDisposed,html:()=>nodes.get('#page-body').innerHTML,params:()=>new URLSearchParams(context.location.hash.slice(1))};
}

test('matchup swap reverses perspective, retains situation and focus, and can be reversed again',async()=>{
 const h=await harness('#v=matchup&own=c16&opp=c37&situation=추격');
 const before=h.html();
 assert.match(before,/data-action="swap-selection"/);
 await h.swapSelections('matchup');
 assert.equal(h.state.own,'c37');assert.equal(h.state.opponent,'c16');
 assert.equal(h.tipMounts.at(-1).ownId,'c37');assert.equal(h.tipMounts.at(-1).opponentId,'c16');assert.equal(h.tipsDisposed(),1);
 assert.equal(h.params().get('own'),'c37');assert.equal(h.params().get('opp'),'c16');
 assert.equal(h.state.situation,'추격');assert.equal(h.params().get('situation'),'추격');
 assert.ok(h.html().includes('경계할 핵심 스킬</h3><p>'+byId.c16.skill));
 assert.ok(h.html().includes('내 스킬을 아낄 때</h3><p>'+byId.c37.hold));
 assert.equal(h.scrolls.at(-1).top,180);
 assert.equal(h.nodes.get('[data-action="swap-selection"]').focusOptions.preventScroll,true);
 await h.swapSelections('matchup');
 assert.equal(h.state.own,'c16');assert.equal(h.state.opponent,'c37');
 assert.equal(h.html(),before,'two swaps restore the same guide');
 assert.equal(h.history.length,2);
 // A browser history traversal can restore the same pair and situation.
 h.context.location.hash=h.history[0];h.readRoute();
 assert.equal(h.state.own,'c37');assert.equal(h.state.situation,'추격');
});

test('character tips deep link restores the player section and clears it when leaving',async()=>{
 const h=await harness('#v=character&c=c37&tab=tips');
 assert.equal(h.state.tab,'tips');assert.equal(h.tipMounts[0].ownId,'c37');assert(h.html().includes('유저 상대법'));
 h.context.location.hash='#v=character&c=c37&tab=overview';h.readRoute();await h.render();assert.equal(h.tipsDisposed(),1);
});

test('synergy links restore pair and post, dispose on exit, and do not create a hunter-only board',async()=>{
 const id='90000000-0000-4000-8000-000000000001';
 const h=await harness('#v=character&c=c58&tab=synergy&partner=c55&post='+id);
 assert.equal(h.state.tab,'synergy');assert.equal(h.synergyMounts[0].postId,id);assert.equal(h.synergyMounts[0].partnerId,'c55');
 h.context.location.hash='#v=character&c=c58';h.readRoute();await h.render();assert.equal(h.synergyDisposed(),1);
 assert.ok(h.html().includes('활용법</dt>'));assert.ok(h.html().includes('조합 제안·이야기 보기'));
 h.context.location.hash='#v=character&c=c01&tab=synergy';h.readRoute();await h.render();assert.equal(h.state.tab,'overview');assert.ok(!h.html().includes('data-tab="synergy"'));
});

test('comparison swap retains active statistics filters and changes both rendered columns',async()=>{
 const h=await harness('#v=compare&a=c16&b=c15&scope=all&server=cn&days=30&tour=IVL');
 const filters=JSON.stringify(h.state.statistics),stats=JSON.stringify(h.state.stats);
 await h.swapSelections('compare');
 assert.equal(h.state.a,'c15');assert.equal(h.state.b,'c16');
 assert.equal(h.params().get('a'),'c15');assert.equal(h.params().get('b'),'c16');
 assert.equal(h.params().get('days'),'30');assert.equal(h.params().get('tour'),'IVL');
 assert.equal(JSON.stringify(h.state.statistics),filters);assert.equal(JSON.stringify(h.state.stats),stats);
 assert.ok(h.html().indexOf('캐릭터 A 붉은 나비 변경')<h.html().indexOf('캐릭터 B 블러디 퀸 변경'));
 assert.ok(h.html().indexOf(byId.c15.difficultyReason)<h.html().indexOf(byId.c16.difficultyReason));
});

test('empty, invalid or stale swap requests leave the selection and route untouched',async()=>{
 const h=await harness('#v=matchup&own=c16');
 assert.match(h.html(),/data-action="swap-selection"[^>]* disabled/);
 const initial=h.context.location.hash;
 await h.swapSelections('matchup');await h.swapSelections('compare');
 h.state.opponent='c15';await h.swapSelections('matchup');
 h.state.opponent='unknown';await h.swapSelections('matchup');
 assert.equal(h.history.length,0);assert.equal(h.context.location.hash,initial);assert.equal(h.state.own,'c16');
});
