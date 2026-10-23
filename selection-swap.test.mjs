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
 const nodes=new Map(),handlers={},history=[],scrolls=[],tipMounts=[];let tipsDisposed=0;
 const node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},classList:{add(){},remove(){}},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(options){this.focusOptions=options;}});
 const context={...themeUI,...model,...releases,createStatisticsUI,selectRanked,__db:db,__releases:read('dist/releases.json'),
  URL,URLSearchParams,Intl,setTimeout:()=>0,clearTimeout(){},location:{hash},
  mountMatchupTips:(root,options)=>{tipMounts.push(options);return ()=>tipsDisposed++;},
  localStorage:{getItem:()=>null},matchMedia:()=>({matches:false}),
  document:{documentElement:{dataset:{}},addEventListener(type,handler){handlers[type]=handler;},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}},
  fetch:async path=>({ok:true,json:async()=>read('dist/'+path.split('?')[0])})
 };
 context.window={scrollY:180,scrollTo:options=>scrolls.push(options),addEventListener(){},history:{pushState(_state,_unused,hash){history.push(hash);context.location.hash=hash;}}};
 vm.runInNewContext(source+`\ndb=__db;byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));releaseLog=__releases;navigationController={update(){}};globalThis.app={state,heroMatchup,readRoute,render,swapSelections,selectionSwap,currentViewParams,openPicker,selectCharacter,openHeroMatchup,heroMatchupReady};`,context);
 context.app.readRoute();await context.app.render();
 return {...context.app,nodes,handlers,history,scrolls,context,tipMounts,tipsDisposed:()=>tipsDisposed,html:()=>nodes.get('#page-body').innerHTML,params:()=>new URLSearchParams(context.location.hash.slice(1))};
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

test('homepage waits for a chosen pair, then opens the right perspective without a stale situation',async()=>{
 const h=await harness('#v=explore');
 h.state.own='c16';h.state.opponent='c37';h.state.situation='구출';await h.render();
 assert.match(h.html(),/data-action="hero-matchup"[^>]* disabled/);
 assert.equal(h.heroMatchupReady(),false,'matchup defaults are not preselected on the homepage');
 h.openHeroMatchup();assert.equal(h.params().get('v'),'explore');
 h.openPicker('hero-own');h.selectCharacter('c16');
 assert.equal(h.params().get('v'),'explore','picking a character stays on the homepage');
 assert.equal(h.nodes.get('[data-action="hero-matchup"]').disabled,true);
 h.openPicker('hero-opponent');h.selectCharacter('c37');
 assert.equal(h.heroMatchupReady(),true);
 assert.equal(h.nodes.get('[data-action="hero-matchup"]').disabled,false);
 assert.match(h.nodes.get('#hero-matchup-fields').innerHTML,/블러디 퀸/);
 assert.match(h.nodes.get('#hero-matchup-fields').innerHTML,/곡예사/);
 h.handlers.click({target:{closest:()=>({dataset:{action:'hero-matchup'}})}});
 assert.equal(h.params().get('own'),'c16');assert.equal(h.params().get('opp'),'c37');assert.equal(h.params().get('v'),'matchup');
 assert.equal(h.state.situation,'');assert.equal(h.params().has('situation'),false);
 h.readRoute();await h.render();
 assert.equal(h.tipMounts.at(-1).ownId,'c16');assert.equal(h.tipMounts.at(-1).opponentId,'c37');
 h.context.location.hash='#v=explore';h.readRoute();await h.render();
 assert.equal(h.heroMatchup.own,'c16');assert.equal(h.heroMatchup.opponent,'c37','returning retains the chosen pair');
});

test('homepage supports opponent first, faction filtering, aliases, cancellation and invalid selections',async()=>{
 const h=await harness('#v=explore');
 const options=()=>[...h.nodes.get('#picker-results').innerHTML.matchAll(/data-id="(c\d+)"/g)].map(m=>m[1]);
 h.openPicker('hero-opponent');h.selectCharacter('c16');
 h.openPicker('hero-own');assert.ok(options().length>0);assert.ok(options().every(id=>byId[id].side==='생존자'));
 h.selectCharacter('c15');h.selectCharacter('unknown');assert.equal(h.heroMatchup.own,'');assert.equal(h.nodes.get('#picker').open,true);
 h.handlers.click({target:{closest:()=>({dataset:{action:'close-dialog',dialog:'picker'}})}});
 assert.equal(h.nodes.get('#picker').open,false);assert.equal(h.heroMatchup.opponent,'c16');assert.equal(h.heroMatchup.own,'');
 h.openPicker('hero-own');h.selectCharacter('c37');assert.equal(h.heroMatchupReady(),true);
 h.openPicker('hero-opponent');assert.ok(options().every(id=>byId[id].side==='감시자'));
 h.handlers.input({target:{id:'picker-search',value:'qnfrdmsskql'}});assert.deepEqual(options(),['c15']);
 h.selectCharacter('c15');h.openHeroMatchup();assert.equal(h.params().get('own'),'c37');assert.equal(h.params().get('opp'),'c15');
});

test('changing my faction clears an incompatible opponent and disables submission',async()=>{
 const h=await harness('#v=explore');
 h.openPicker('hero-own');h.selectCharacter('c16');h.openPicker('hero-opponent');h.selectCharacter('c37');
 h.openPicker('hero-own');h.selectCharacter('c79');
 assert.equal(h.heroMatchup.own,'c79');assert.equal(h.heroMatchup.opponent,'');assert.equal(h.heroMatchupReady(),false);
 assert.equal(h.nodes.get('[data-action="hero-matchup"]').disabled,true);
 assert.match(h.nodes.get('#hero-matchup-hint').textContent,/진영이 바뀌어 상대 선택을 해제/);
 assert.equal(h.nodes.get('[data-mode="hero-own"]').focusOptions.preventScroll,true);
 h.openHeroMatchup();assert.equal(h.params().get('v'),'explore');
 h.openPicker('hero-opponent');h.selectCharacter('c15');h.state.view='compare';h.openHeroMatchup();
 assert.equal(h.params().get('v'),'explore','stale homepage submission does not navigate');
});
