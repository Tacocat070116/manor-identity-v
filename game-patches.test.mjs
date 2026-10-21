import * as themeUI from './dist/themes.js';
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

test('official character summaries retain their reviewed source records',()=>{
 assert.equal(Object.keys(latest.characters).length,89);
 const editorial=JSON.parse(fs.readFileSync('research/patches/latest-character-changes.json'));
 for(const [id,change] of Object.entries(latest.characters)){
  assert.ok(characters[id]);const note=catalog.entries.find(e=>e.id===change.patchId);
  assert.ok(note);assert.equal(note.scope,'live');assert.equal(note.dateStatus,'confirmed');assert.equal(note.effectiveDate,change.date);
  assert.ok(note.characterIds.includes(id));assert.ok(note.sources.some(s=>s.url===change.sourceUrl));
  assert.ok(change.types.every(t=>['balance','fix'].includes(t)));
  assert.deepEqual(change.summary,editorial.characters[id].summary);assert.ok(change.summary.every(s=>s.length>10));
  assert.deepEqual(change.summaryImpacts,editorial.characters[id].summaryImpacts);
  assert.equal(change.summaryImpacts.length,change.summary.length);
  assert.ok(change.summaryImpacts.every(impact=>['buff','nerf','adjustment','fix'].includes(impact)));
  if(!change.types.includes('balance'))assert.ok(change.summaryImpacts.every(impact=>impact==='fix'));
 }
 assert.deepEqual(latest.characters.c60.summaryImpacts,['buff','adjustment','fix']);
 assert.deepEqual(latest.characters.c42.summaryImpacts,['nerf','adjustment']);
});

test('wiki history covers every inspected character and retains date precision and official corrections',()=>{
 const review=JSON.parse(fs.readFileSync('research/patches/character-history-review.json','utf8'));
 const history=latest.history;
 assert.equal(history.meta.auditedCharacters,89);assert.equal(history.meta.withWikiHistory,35);
 assert.equal(history.meta.entryCount,92);assert.equal(history.meta.changeCount,167);
 assert.deepEqual(Object.keys(history.characters).sort(),Object.keys(characters).sort());
 assert.equal(review.audit.filter(a=>a.status==='section-absent').length,54);
 const ids=new Set();let count=0;
 for(const audit of review.audit){
  const actual=history.characters[audit.characterId];
  assert.equal(actual.status,audit.status);
  assert.equal(new URL(actual.sourceUrl).hostname,'namu.wiki');
  assert.ok(new URL(actual.mirrorUrl).hostname.endsWith('namu.moe'));
  assert.equal(actual.entries.length>0,audit.status==='available');
  assert.equal(actual.entries.length,(review.characters[audit.characterId]||[]).length);
  for(const entry of actual.entries){
   assert.ok(!ids.has(entry.id));ids.add(entry.id);count+=entry.changes.length;
   assert.ok(entry.changes.every(c=>['buff','nerf','adjustment'].includes(c.impact)));
   if(entry.precision==='day')assert.ok(validPatchDate(entry.date));
   else if(entry.precision==='month')assert.match(entry.date,/^\d{4}-\d{2}$/);
   else assert.equal(entry.date,null);
   if(entry.officialUrl){const note=catalog.entries.find(n=>n.id===entry.patchId);assert.equal(note.effectiveDate,entry.date);assert.ok(note.sources.some(s=>s.url===entry.officialUrl));}
  }
 }
 assert.equal(ids.size,history.meta.entryCount);assert.equal(count,history.meta.changeCount);
 assert.equal(history.characters.c09.entries[0].date,'2025-09-04');
 assert.ok(history.characters.c36.entries.find(e=>e.date==='2025-12-25').changes[0].text.includes('15 → 18초'));
 assert.ok(history.characters.c80.entries.find(e=>e.date==='2026-07-02').changes[1].text.includes('투우사가 받는'));
 assert.ok(review.excluded.some(e=>e.characterId==='c22'&&e.sourceLines==='489'));
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

test('character patch tab shows only reviewed balance changes and archive routes stay lazy',async()=>{
 const nodes=new Map(),fetches=[],mounts=[],handlers={};let disposed=0;
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={...themeUI,...model,...releaseUI,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
  document:{documentElement:{dataset:{}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener(type,handler){handlers[type]=handler;}},window:{addEventListener(){},scrollTo(){}},location:{hash:'#v=character&c=c60'},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false}),
  mountNavigation:()=>({update(){}}),mountGamePatches:(root,opts)=>{mounts.push(opts);root.innerHTML='archive';return ()=>disposed++;},
  fetch:async url=>{fetches.push(url);return {ok:true,json:async()=>read(url.split('?')[0])};}
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 vm.runInNewContext(source+'\nglobalThis.app={boot,readRoute,render,state,characterPatchHistory,characterPage,characterPatchGroups,patchHistoryEntry};',context);await context.app.boot();
 assert.equal(fetches.some(url=>url.startsWith('patches/archive')),false);
 assert.ok(nodes.get('#page-body').innerHTML.includes('data-tab="patches"'));
 assert.ok(!nodes.get('#page-body').innerHTML.includes('class="character-patch-history"'),'opening a character starts with the guide');
 handlers.click({target:{closest:()=>({dataset:{action:'character-tab',tab:'patches'}})}});
 assert.equal(context.location.hash,'#v=character&c=c60&tab=patches');
 context.app.readRoute();await context.app.render();
 assert.equal(context.app.state.tab,'patches');
 assert.ok(nodes.get('#page-body').innerHTML.includes('aria-label="캐릭터 패치노트"'));
 assert.ok(nodes.get('#page-body').innerHTML.indexOf('character-tabs')<nodes.get('#page-body').innerHTML.indexOf('class="character-patch-history"'));
 assert.ok(nodes.get('#page-body').innerHTML.includes('data-tab="patches" class="active" aria-pressed="true"'));
 for(const tab of ['overview','matchups','stats','sources']){
  context.app.state.tab=tab;
  assert.ok(!context.app.characterPage().includes('class="character-patch-history"'),tab+' must not contain patch notes');
 }
 for(const [id,change] of Object.entries(latest.characters)){
  const detail=context.app.characterPatchHistory(characters[id]);
  const groups=context.app.characterPatchGroups(id);
  if(!groups.some(group=>group.date))assert.ok(!detail.includes('<time'));
  if(!groups.length){assert.ok(detail.includes('현재 수록된 버프·너프·조정 기록이 없습니다'));assert.ok(!detail.includes('이 패치 자세히'));}
  assert.ok(!detail.includes('공략 검토일'));
  assert.ok(detail.includes('밸런스 변경 이력'));assert.ok(detail.includes('type=balance'));
  assert.ok(!detail.includes('data-impact="fix"'));assert.ok(!detail.includes('오류 수정'));
  for(const [index,impact] of change.summaryImpacts.entries()){
   if(impact==='fix')assert.ok(!detail.includes(change.summary[index]),id+' excludes individual fixes in a mixed patch');
   else{assert.ok(detail.includes('data-impact="'+impact+'"'));assert.ok(detail.includes(change.summary[index]));}
  }
  for(const entry of latest.history.characters[id].entries){
   for(const item of entry.changes)assert.ok(detail.includes(item.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')),id+' retains every curated historical change');
   if(entry.patchId)assert.ok(detail.includes('c='+id+'&amp;')||detail.includes('c='+id+'&type=balance&note='+entry.patchId));
  }
  const dates=Array.from(groups.filter(g=>g.date),g=>g.date);
  assert.deepEqual(dates,[...dates].sort().reverse());
 }
 const firstExactDate=id=>context.app.characterPatchGroups(id).find(group=>group.precision==='day')?.date||'';
 assert.equal(firstExactDate('c03'),'','undated records never acquire a fabricated date');
 assert.equal(firstExactDate('c06'),'','a season does not imply an exact day');
 assert.equal(firstExactDate('c43'),'2025-04-24','a newer fix does not hide an older balance update');
 assert.equal(firstExactDate('c09'),'2025-09-04','use the corrected official effective date');
 assert.equal(firstExactDate('c79'),'2024-01-11','month-only rows remain imprecise');
 const undatedHTML=context.app.characterPatchHistory(characters.c22);
 assert.ok(undatedHTML.indexOf('2024.04.11')<undatedHTML.indexOf('날짜 미기재 기록'));
 assert.ok(context.app.characterPatchHistory(characters.c79).includes('월까지만 기재'));
 assert.ok(context.app.characterPatchHistory(characters.c15).includes('패치노트 표가 없습니다'));
 const unsafe=context.app.patchHistoryEntry({date:null,precision:'unknown',basis:'wiki',period:'<img src=x>',note:'<script>bad</script>',changes:[{impact:'buff',text:'<img src=x onerror=bad>'}],sourceUrl:'javascript:bad()'},'c01');
 assert.ok(!unsafe.includes('<script>'));assert.ok(!unsafe.includes('<img src=x'));assert.ok(!unsafe.includes('javascript:'));assert.ok(unsafe.includes('&lt;script&gt;'));
 context.location.hash='#v=character&c=c60&tab=patches';context.app.readRoute();await context.app.render();
 assert.equal(context.app.state.tab,'patches','shared patch-tab URLs restore the selected section');
 assert.equal(fetches.some(url=>url.startsWith('patches/archive')),false);
 context.location.hash='#v=character&c=c60&tab=unknown';context.app.readRoute();await context.app.render();
 assert.equal(context.app.state.tab,'overview');assert.ok(!nodes.get('#page-body').innerHTML.includes('class="character-patch-history"'));
 context.location.hash='#v=gamepatches&c=c01&since=2020-01-01&q=거미';context.app.readRoute();await context.app.render();
 assert.equal(mounts[0].params.c,'c01');assert.equal(mounts[0].params.since,'2020-01-01');assert.equal(context.app.state.statistics.search,'');
 assert.equal(context.document.title,'게임 패치노트 · MANOR');
 context.location.hash='#v=patchnotes';context.app.readRoute();await context.app.render();assert.equal(disposed,1);
 context.location.hash='#v=gamepatches';context.app.readRoute();await context.app.render();assert.equal(fetches.filter(url=>url.startsWith('patches/archive')).length,1);
 context.location.hash='#v=practice';context.app.readRoute();assert.equal(context.app.state.view,'explore');
 assert.ok(!nodes.get('#header').innerHTML.includes('#v=practice'));
});
