import * as themeUI from './dist/themes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {matchesCharacter,keyboardSearchKey,sortCharacters} from './dist/character-search.js';
import {characterSearchData} from './dist/character-search-data.js';
import {sortStatistics} from './dist/statistics-model.js';
import {selectGamePatches} from './dist/game-patches-model.js';
import * as model from './dist/model.js';
import * as releaseUI from './dist/releases.js';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const characters=read('dist/data.json').characters;
const byId=Object.fromEntries(characters.map(c=>[c.id,c]));
const find=q=>characters.filter(c=>matchesCharacter(c,q)).map(c=>c.id);

test('Korean, English keyboard, mixed input, initials and requested nicknames find the same character',()=>{
 for(const query of ['붉은 나비','붉은나비','  붉은  나비  ','qnfrdmsskql','QNFRDMSSKQL','붉은skql','ㅂㅇㄴㅂ','ᄇᄋᄂᄇ','미치코빠칭코','미치코 빠칭코','GEISHA','Michiko'])assert.ok(find(query).includes('c15'),query);
 for(const query of ['블러디퀸','블퀸','마리','akfl','Mary','bloody queen','ㅂㄹㄷㅋ'])assert.deepEqual(find(query),['c16'],query);
 assert.equal(keyboardSearchKey('붉은 나비'),'qnfrdmsskql');
 assert.ok(find('클레오').includes('c53'));assert.ok(find('Cléo Decroux').includes('c53'));
 assert.equal(find('존재하지않는캐릭터이름').length,0);
 assert.equal(find('<script>bad</script>').length,0);
 assert.equal(find('   ').length,89);
});

test('all 89 characters have searchable curated aliases and preserve identities with shared real names',()=>{
 const source=read('research/search/characters.json');
 assert.deepEqual(Object.keys(characterSearchData).sort(),characters.map(c=>c.id).sort());
 assert.ok(Object.values(characterSearchData).reduce((n,c)=>n+c.aliases.length,0)>500);
 for(const c of characters){
  assert.ok(matchesCharacter(c,c.name));
  assert.deepEqual(characterSearchData[c.id].aliases,source.characters[c.id].aliases);
  for(const alias of characterSearchData[c.id].aliases)assert.ok(matchesCharacter(c,alias),c.name+' / '+alias);
  assert.ok(source.characters[c.id].sources.every(s=>new URL(s).protocol==='https:'));
 }
 assert.deepEqual(find('노튼'),['c35','c79']);
 assert.deepEqual(find('오르페우스'),['c23','c59']);
 assert.deepEqual(find('루키노'),['c30','c41']);
 assert.deepEqual(find('마이크 모튼'),['c36','c37']);
 assert.deepEqual(find('멜리'),['c24','c38']);
});

test('default sorting uses global release order, supports both directions and keeps missing dates last',()=>{
 const input=[...characters],result=sortCharacters(input);
 assert.deepEqual(result.slice(0,6).map(c=>c.id),['c60','c11','c53','c33','c80','c24']);
 assert.deepEqual(input,characters,'sorting never mutates the catalogue');
 assert.ok(result.indexOf(byId.c19)>result.indexOf(byId.c58));
 assert.ok(result.indexOf(byId.c57)>result.indexOf(byId.c08)&&result.indexOf(byId.c57)<result.indexOf(byId.c15));
 const old=sortCharacters([byId.c60,byId.c15,byId.c16],'release-asc');
 assert.deepEqual(old.map(c=>c.id),['c15','c16','c60']);
 assert.deepEqual(sortCharacters([byId.c15,byId.c01,byId.c37],'name').map(c=>c.name),['거미','곡예사','붉은 나비']);
 const unknown={id:'future',name:'가상 캐릭터'};
 for(const order of ['release','release-asc'])assert.equal(sortCharacters([unknown,byId.c15],order).at(-1),unknown);
 assert.deepEqual(sortCharacters([byId.c02,byId.c04],'release').map(c=>c.name),['공장장','광대']);
 const easy=sortCharacters(characters,'easy'),hard=sortCharacters(characters,'hard');
 assert.equal(easy[0].difficulty,1);assert.equal(hard[0].difficulty,5);
});

test('statistics aliases preserve faction, rates and metric sorting',()=>{
 const rows=['c15','c16','c35','c79'].map((id,i)=>({...byId[id],pick:i,win:0}));
 assert.deepEqual(sortStatistics(rows,{side:'감시자',search:'qnfrdmsskql'}).map(c=>c.id),['c15']);
 assert.deepEqual(sortStatistics(rows,{side:'생존자',search:'노튼'}).map(c=>c.id),['c79']);
 assert.deepEqual(sortStatistics(rows,{side:'전체',search:'노튼',sort:'pick'}).map(c=>c.id),['c79','c35']);
 assert.equal(sortStatistics(rows,{side:'감시자',search:'마리'})[0].win,0);
});

test('patch content search combines aliases with dates and existing text filters',()=>{
 const entry=(id,characterIds,title)=>({id,date:'2026-10-15',scope:'live',title,summary:['오류 수정'],types:['fix'],characterIds,characterChanges:Object.fromEntries(characterIds.map(id=>[id,['fix']]))});
 const catalog={entries:[entry('geisha',['c15'],'추격 수정'),entry('mary',['c16'],'거울 수정'),entry('other',['c37'],'다른 변경')]};
 for(const q of ['미치코빠칭코','qnfrdmsskql','붉은나비','붉은 나비'])assert.deepEqual(selectGamePatches(catalog,byId,{q}).matches.map(e=>e.id),['geisha']);
 assert.deepEqual(selectGamePatches(catalog,byId,{q:'마리 오류 2026'}).matches.map(e=>e.id),['mary']);
 assert.equal(selectGamePatches(catalog,byId,{q:'마리',c:'c15'}).matches.length,0);
 assert.equal(selectGamePatches(catalog,byId,{q:'마리 없는단어'}).matches.length,0);
});

test('live app input/change handlers apply search and sorting in catalogue, comparison and bans',async()=>{
 const nodes=new Map(),handlers={};
 const node=()=>({innerHTML:'',textContent:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},showModal(){},focus(){}});
 const context={...themeUI,...model,...releaseUI,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
  document:{documentElement:{dataset:{}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener(k,h){handlers[k]=h;}},
  window:{addEventListener(){},scrollTo(){}},location:{hash:'#v=character&c=c15'},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false}),
  mountNavigation:()=>({update(){}}),fetch:async url=>({ok:true,json:async()=>read('dist/'+url.split('?')[0])})
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 vm.runInNewContext(source+'\nglobalThis.app={boot,state,openPicker,updateExplorer};',context);
 const app=context.app;await app.boot();assert.equal(app.state.sort,'release');
 const ids=selector=>[...nodes.get(selector).innerHTML.matchAll(/data-id="(c\d+)"/g)].map(m=>m[1]);
 app.updateExplorer();assert.equal(ids('#explorer-results')[0],'c60');
 handlers.input({target:{id:'character-search',value:'qnfrdmsskql'}});assert.deepEqual(ids('#explorer-results'),['c15']);
 handlers.input({target:{id:'character-search',value:''}});
 handlers.change({target:{id:'character-sort',value:'name',dataset:{}}});assert.equal(ids('#explorer-results')[0],'c01');
 app.state.favoriteOnly=true;app.state.favorites.add('c16');
 handlers.input({target:{id:'character-search',value:'마리'}});assert.deepEqual(ids('#explorer-results'),['c16']);
 app.openPicker();assert.equal(ids('#picker-results')[0],'c60','favorites do not override release sorting');
 handlers.input({target:{id:'picker-search',value:'미치코빠칭코'}});assert.deepEqual(ids('#picker-results'),['c15']);
 context.document.querySelector('#picker-search').value='';
 handlers.change({target:{id:'picker-sort',value:'name',dataset:{}}});assert.equal(ids('#picker-results')[0],'c01');
 app.state.a='c35';app.openPicker('compare-b');
 handlers.input({target:{id:'picker-search',value:'노튼'}});assert.deepEqual(ids('#picker-results'),[],'comparison excludes selected character and opposite faction');
 app.state.bans=['c79','',''];app.openPicker('ban-1');
 handlers.input({target:{id:'picker-search',value:'노튼'}});assert.deepEqual(ids('#picker-results'),[],'ban picker excludes duplicate survivor and hunter');
 app.state.bans=['','',''];app.openPicker('ban-1');
 handlers.input({target:{id:'picker-search',value:'노튼'}});assert.deepEqual(ids('#picker-results'),['c79']);
});
