import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as model from './dist/model.js';
import * as compendium from './dist/compendium-model.js';
import * as themes from './dist/themes.js';
import * as synergy from './dist/synergy-model.js';
import * as releases from './dist/releases.js';
import {createStatisticsUI} from './dist/statistics.js';
import {selectRanked} from './dist/statistics-model.js';
import {withRetiredFields} from './scripts/public-payload-history.mjs';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const data=read('dist/data.json'),roles=read('dist/specialties.json'),intros=read('dist/introductions.json');

function guideScreens(payload){
 const db=structuredClone(payload);
 for(const c of db.characters)Object.assign(c,roles.characters[c.id],{introduction:intros.characters[c.id]});
 const nodes=new Map();
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={...model,...compendium,...themes,...synergy,...releases,createStatisticsUI,selectRanked,
  console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,setTimeout,clearTimeout,
  document:{documentElement:{dataset:{}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener(){}},
  window:{addEventListener(){},scrollTo(){},scrollY:0},navigator:{},
  location:{hash:'',origin:'https://example.test',pathname:'/'},localStorage:{getItem(){return null;},setItem(){}},matchMedia:()=>({matches:false}),
  mountNavigation:()=>({update(){}}),mountHeroCarousel:()=>()=>{},createCarouselSession:()=>({}),carouselItems:()=>[],
  __data:db,__releases:read('dist/releases.json'),
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 vm.runInNewContext(source+`
  db=__data;releaseLog=__releases;
  byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));
  globalThis.screens=[explore()];
  for(const c of db.characters){state.character=c.id;for(const tab of ['overview','matchups']){state.tab=tab;screens.push(characterPage());}}
  for(const m of db.matchups){state.own=byName[m.hunter].id;state.opponent=byName[m.survivor].id;state.situation=m.situation;screens.push(matchupPage());}
 `,context);
 return Array.from(context.screens);
}

test('removing retired guide metadata preserves every character and matchup screen',()=>{
 const current=guideScreens(data),original=guideScreens(withRetiredFields('data.json',data));
 assert.equal(current.length,1+89*2+463);
 assert.deepEqual(current,original);
 for(const html of current)assert.doesNotMatch(html,/undefined|NaN/);
});

test('all ranked cohorts render the same rates, warnings and filters without unused source notes',()=>{
 const catalog=read('dist/ranked/index.json'),byId=Object.fromEntries(data.characters.map(c=>[c.id,c]));
 const parts=new Map();
 for(const d of catalog.datasets){
  if(!parts.has(d.path))parts.set(d.path,read('dist/'+d.path));
  d.rows=parts.get(d.path).datasets.find(row=>row.id===d.id).rows.map(([id,pick,win,draw,loss,ban])=>({id,name:byId[id].name,side:byId[id].side,pick,win,draw,loss,ban}));
 }
 const original=withRetiredFields('ranked/index.json',catalog);
 const ui=createStatisticsUI({characters:data.characters,esc:String,num:String,portrait:()=>'',icon:()=>'',commonFilters:()=>''});
 for(const d of catalog.datasets){
  const settings={server:d.server,season:d.season,tier:d.tier,snapshot:d.id,scope:'ranked',side:'생존자',sort:'pick',direction:'desc',search:''};
  const render=source=>ui.page({data:source,matches:[],bans:[],settings:{...settings},tournamentFilters:{}});
  assert.equal(render(catalog),render(original),d.id);
 }
});
