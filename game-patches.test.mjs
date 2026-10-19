import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectGamePatches,patchRoute,validPatchDate,patchTypes} from './dist/game-patches-model.js';
import {gamePatchesHTML,mountGamePatches} from './dist/game-patches.js';
import * as model from './dist/model.js';
import * as releaseUI from './dist/releases.js';
const read=p=>JSON.parse(fs.readFileSync('dist/'+p,'utf8'));
const catalog=read('patches/archive.json'),latest=read('patches/characters.json');
const characters=Object.fromEntries(read('data.json').characters.map(c=>[c.id,c]));

test('archive retains every accepted source once, dates and characters are internally consistent',()=>{
 const inventory=JSON.parse(fs.readFileSync('research/patches/source-inventory.json'));
 assert.ok(catalog.entries.length>400);
 assert.equal(catalog.meta.startDate,'2018-07-11');assert.equal(catalog.meta.latestDate,'2026-10-15');
 assert.equal(new Set(catalog.entries.map(e=>e.id)).size,catalog.entries.length);
 const urls=[];
 for(const entry of catalog.entries){
  assert.ok(validPatchDate(entry.date));assert.ok(entry.date<=catalog.meta.checkedAt);
  assert.ok(['live','test'].includes(entry.scope));assert.ok(entry.sources.length);assert.ok(entry.summary.length);
  assert.ok(entry.types.every(t=>Object.hasOwn(patchTypes,t)));
  assert.equal(new Set(entry.characterIds).size,entry.characterIds.length);
  for(const id of entry.characterIds){assert.ok(Object.hasOwn(characters,id));assert.ok(entry.characterChanges[id].length);}
  if(entry.dateStatus==='confirmed')assert.equal(entry.effectiveDate,entry.date);else assert.equal(entry.effectiveDate,null);
  for(const source of entry.sources){
   const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.ok(['www.identityvgame.com','www.identityv.jp','identityv.jp'].includes(url.hostname));
   assert.ok(source.title);urls.push(source.url);
  }
 }
 assert.equal(urls.length,catalog.meta.sourceCount);assert.equal(new Set(urls).size,urls.length);
 assert.deepEqual([...urls].sort(),inventory.sources.map(s=>s.url).sort());
 assert.ok(inventory.excluded.every(s=>!urls.includes(s.url)));
 assert.equal(catalog.meta.years.reduce((n,y)=>n+y.count,0),catalog.entries.filter(e=>e.scope==='live').length);
});

test('migration dates, misleading test titles and unresolved dates retain reviewed interpretations',()=>{
 const byURL=url=>catalog.entries.find(e=>e.sources.some(s=>s.url.endsWith(url)));
 assert.equal(byURL('35356_955826.html').effectiveDate,'2018-07-18');
 assert.equal(byURL('35356_955823.html').effectiveDate,null);
 assert.equal(byURL('35288_956484.html').effectiveDate,'2021-06-24');
 assert.equal(byURL('35288_1279963.html').effectiveDate,'2025-12-31');
 assert.equal(byURL('35356_1304826.html').scope,'test');
 const misleading=catalog.entries.filter(e=>e.scope==='live'&&e.sources.some(s=>/Maintenance Content Test Server/.test(s.title)));
 assert.ok(misleading.length>=4);
 assert.ok(selectGamePatches(catalog,characters).matches.every(e=>e.scope==='live'));
 assert.ok(selectGamePatches(catalog,characters,{scope:'test'}).matches.every(e=>e.scope==='test'));
 assert.ok(selectGamePatches(catalog,characters,{since:'2018-07-01'}).matches.every(e=>e.dateStatus==='confirmed'&&e.effectiveDate>'2018-07-01'));
});

test('a character and change-type filter must match the same character change',()=>{
 const entry={id:'fixture',date:'2026-10-15',effectiveDate:'2026-10-15',dateStatus:'confirmed',scope:'live',title:'테스트',types:['balance','cosmetic'],characterIds:['c01','c02'],characterChanges:{c01:['cosmetic'],c02:['balance']},summary:['본문']};
 const data={entries:[entry]};
 assert.equal(selectGamePatches(data,characters,{c:'c01',type:'balance'}).matches.length,0);
 assert.equal(selectGamePatches(data,characters,{c:'c01',type:'gameplay'}).matches.length,0);
 assert.equal(selectGamePatches(data,characters,{c:'c02',type:'balance'}).matches.length,1);
 assert.equal(selectGamePatches(data,characters,{since:'2026-10-15'}).matches.length,0);
 assert.equal(selectGamePatches(data,characters,{since:'2026-10-14'}).matches.length,1);
});

test('filter URLs, invalid dates, pagination and missing notes remain deterministic',()=>{
 assert.equal(validPatchDate('2026-02-30'),false);assert.equal(validPatchDate('2024-02-29'),true);
 for(const c of ['bad','__proto__','constructor'])assert.equal(selectGamePatches(catalog,characters,{c}).matches.length,0);
 assert.equal(selectGamePatches(catalog,characters,{since:'broken'}).invalid,true);
 const one=selectGamePatches(catalog,characters),two=selectGamePatches(catalog,characters,{page:2});
 assert.equal(one.entries.length,16);assert.ok(!one.entries.some(e=>two.entries.includes(e)));
 const huge=selectGamePatches(catalog,characters,{page:99999});assert.equal(huge.page,huge.pages);
 assert.equal(selectGamePatches(catalog,characters,{note:'missing'}).missingNote,true);
 const p={c:'c01',since:'2025-01-01',q:'거미 & 수정',page:3};const url=new URLSearchParams(patchRoute(p).slice(1));
 for(const [key,value] of Object.entries(p))assert.equal(url.get(key),String(value));
 assert.equal(url.get('v'),'gamepatches');
 assert.ok(selectGamePatches(catalog,characters,{q:'거미줄'}).matches.some(e=>e.date==='2026-07-02'));
});

test('latest character cards link only to confirmed live notices and editorial summaries',()=>{
 assert.equal(Object.keys(latest.characters).length,89);
 const editorial=JSON.parse(fs.readFileSync('research/patches/latest-character-changes.json'));
 for(const [id,change] of Object.entries(latest.characters)){
  assert.ok(characters[id]);const note=catalog.entries.find(e=>e.id===change.patchId);
  assert.ok(note);assert.equal(note.scope,'live');assert.equal(note.dateStatus,'confirmed');assert.equal(note.effectiveDate,change.date);
  assert.ok(note.characterIds.includes(id));assert.ok(note.sources.some(s=>s.url===change.sourceUrl));
  assert.ok(change.types.every(t=>['balance','fix'].includes(t)));
  assert.deepEqual(change.summary,editorial.characters[id].summary);assert.ok(change.summary.every(s=>s.length>10));
 }
});

test('archive templates escape source text and mounted filtering is disposed on leaving',()=>{
 const bad=structuredClone(catalog);bad.entries[0].title='<script>bad</script>';bad.entries[0].summary=['<img src=x onerror=bad>'];bad.entries[0].sources[0].url='javascript:bad()';
 const html=gamePatchesHTML(bad,characters,{note:bad.entries[0].id,q:'" onfocus="bad'});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('javascript:'));assert.ok(html.includes('&lt;script&gt;'));
 const handlers={},root={innerHTML:'',addEventListener:(k,h)=>handlers[k]=h,removeEventListener:k=>delete handlers[k]};let next;
 const dispose=mountGamePatches(root,{catalog,characters,navigate:p=>next=p});
 handlers.submit({target:{matches:()=>true,elements:{namedItem:key=>({value:({c:'c01',since:'2020-01-01',scope:'live'})[key]||''})}},preventDefault(){}});
 assert.deepEqual(next,{v:'gamepatches',c:'c01',scope:'live',since:'2020-01-01'});dispose();assert.equal(handlers.submit,undefined);
});

test('app lazily loads archive, retains hash filters and disposes its controller without changing statistics',async()=>{
 const nodes=new Map(),fetches=[],mounts=[];let disposed=0;
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={...model,...releaseUI,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
  document:{documentElement:{dataset:{}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener(){}},window:{addEventListener(){},scrollTo(){}},location:{hash:'#v=character&c=c01'},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false}),
  mountNavigation:()=>({update(){}}),mountGamePatches:(root,opts)=>{mounts.push(opts);root.innerHTML='archive';return ()=>disposed++;},
  fetch:async url=>{fetches.push(url);return {ok:true,json:async()=>read(url.split('?')[0])};}
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 vm.runInNewContext(source+'\nglobalThis.app={boot,readRoute,render,state};',context);await context.app.boot();
 assert.equal(fetches.some(url=>url.startsWith('patches/archive')),false);assert.ok(nodes.get('#page-body').innerHTML.includes('최근 게임 변경'));
 context.location.hash='#v=gamepatches&c=c01&since=2020-01-01&q=거미';context.app.readRoute();await context.app.render();
 assert.equal(mounts[0].params.c,'c01');assert.equal(mounts[0].params.since,'2020-01-01');assert.equal(context.app.state.statistics.search,'');
 assert.equal(context.document.title,'게임 패치노트 · MANOR');
 context.location.hash='#v=patchnotes';context.app.readRoute();await context.app.render();assert.equal(disposed,1);
 context.location.hash='#v=gamepatches';context.app.readRoute();await context.app.render();assert.equal(fetches.filter(url=>url.startsWith('patches/archive')).length,1);
 context.location.hash='#v=practice';context.app.readRoute();assert.equal(context.app.state.view,'explore');
 assert.ok(!nodes.get('#header').innerHTML.includes('#v=practice'));
});
