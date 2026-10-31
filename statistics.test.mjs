import * as synergyModel from './dist/synergy-model.js';
import * as compendium from './dist/compendium-model.js';
import * as themeUI from './dist/themes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {createStatisticsUI} from './dist/statistics.js';
import {selectRanked,tournamentStatistics,sortStatistics,rankedCharacter} from './dist/statistics-model.js';
import * as model from './dist/model.js';
import * as releaseUI from './dist/releases.js';

const read=p=>JSON.parse(fs.readFileSync('dist/'+p,'utf8'));
const catalog=read('ranked/index.json'),db=read('data.json');
const byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));
const parts=new Map();
for(const d of catalog.datasets){
 if(!parts.has(d.path))parts.set(d.path,read(d.path));
 d.rows=parts.get(d.path).datasets.find(x=>x.id===d.id).rows.map(([id,pick,win,draw,loss,ban])=>({id,name:byId[id].name,side:byId[id].side,pick,win,draw,loss,ban}));
}
catalog.badges=read('ranked/badges.json').datasets;

test('all imported rows retain their source rates, characters and distinct cohorts',()=>{
 const inputs=JSON.parse(gunzipSync(fs.readFileSync('research/ranked/normalized-inputs.json.gz')));
 const original=[...inputs.cn.datasets,...inputs.global.datasets];
 assert.equal(catalog.datasets.length,421);
 assert.equal(catalog.datasets.reduce((n,d)=>n+d.rows.length,0),32667);
 assert.ok(catalog.datasets.every(d=>['asia','cn'].includes(d.server)));
 assert.equal(new Set(catalog.datasets.map(d=>d.id)).size,catalog.datasets.length);
 for(const d of catalog.datasets){
  const source=original.find(x=>x.id===d.id);
  assert.ok(source,d.id);assert.equal(d.rows.length,source.rows.length);
  assert.equal(new Set(d.rows.map(r=>r.id)).size,d.rows.length);
  for(const r of d.rows){
   assert.ok(byId[r.id]);assert.equal(byId[r.id].side,r.side);
   let src=source.rows.find(x=>(x.characterId||x.id)===r.id||x.name===r.name);
   if(!src&&d.server==='asia')src=source.rows.find(x=>x.pick===r.pick&&x.win===r.win&&x.draw===r.draw&&x.ban===r.ban);
   assert.ok(src,`${d.id} ${r.name}`);
   for(const key of ['pick','win','draw','loss','ban']){assert.equal(r[key],src[key]);assert.ok(r[key]===null||Number.isFinite(r[key])&&r[key]>=0&&r[key]<=100);}
   if(r.loss!==null)assert.ok(Math.abs(r.win+r.draw+r.loss-100)<.21);
  }
 }
 assert.equal(catalog.badges.reduce((n,d)=>n+d.rows.length,0),1384);
});

test('rank selection does not pool sources, periods, ranks or servers; review-needed seasons are opt-in',()=>{
 const asia=selectRanked(catalog,{server:'asia',tier:'all'});
 assert.equal(asia.dataset.season,'S43');assert.equal(asia.dataset.rows.length,36);
 assert.ok(asia.dataset.rows.every(r=>r.side==='감시자'));
 const cn=selectRanked(catalog,{server:'cn',tier:'all'});
 assert.equal(cn.dataset.season,'S43');assert.equal(cn.dataset.excludeFromDefault,false);
 const review=selectRanked(catalog,{server:'cn',season:'S44',tier:'all'});
 assert.equal(review.dataset.status,'needs-review');assert.equal(review.dataset.excludeFromDefault,true);
 const period=selectRanked(catalog,{server:'cn',season:'S40',tier:'all'});
 assert.ok(period.snapshots.length>1);
 const chosen=selectRanked(catalog,{...period.filters,snapshot:period.snapshots.at(-1).id});
 assert.equal(chosen.dataset.id,period.snapshots.at(-1).id);
 assert.ok(!cn.dataset.rows.some(r=>r.id==='c60'));assert.equal(rankedCharacter(cn.dataset,'c60'),null);
 const unsupported={id:'retired-global',server:'global-unknown',season:'S42',tier:'peak7',rows:[]};
 const stale={...catalog,datasets:[...catalog.datasets,unsupported]};
 for(const server of ['global-unknown','naeu','unrecognized']){
  const selected=selectRanked(stale,{server,season:'S42',tier:'peak7',snapshot:unsupported.id});
  assert.deepEqual(selected.servers,['asia','cn']);assert.equal(selected.dataset.server,'asia');
 }
 assert.equal(selectRanked({datasets:[unsupported]}).dataset,null);
});

test('tournament pick rates, result perspective, sample gates and distinct ban denominator are correct',()=>{
 const characters=[{id:'h',name:'감시자',side:'감시자'},...['a','b','c','d'].map(id=>({id,name:id,side:'생존자'}))];
 const matches=Array.from({length:100},(_,i)=>['2026-10-01','맵','h',['a','b','c','d'],'IVL',i<40?'승':i<70?'무':'패',2]);
 const bans=Array.from({length:20},(_,i)=>['2026-10-01','맵','h',i<5?['a','b']:['b'],'IVL']);
 const s=tournamentStatistics(matches,bans,characters,{days:0});
 assert.equal(s.games,100);assert.equal(s.banGames,20);
 assert.equal(s.rows[0].win,40);assert.equal(s.rows[1].win,30);assert.equal(s.rows[1].draw,30);
 assert.equal(s.rows[1].ban,25);assert.equal(s.rows[0].ban,null);
 assert.equal(s.rows.filter(r=>r.side==='생존자').reduce((n,r)=>n+r.pick,0),400);
 const tiny=tournamentStatistics(matches.slice(0,49),[],characters,{days:0});
 assert.equal(tiny.rows[0].win,40/49*100);assert.equal(tiny.rows[0].pick,100);assert.equal(tiny.rows[1].ban,null);
 const empty=tournamentStatistics(matches,bans,characters,{map:'없는 맵'});assert.equal(empty.games,0);assert.equal(empty.rows[0].pick,null);
});

test('missing values sort last and zero remains a real zero',()=>{
 const rows=[{name:'A',side:'감시자',win:null},{name:'B',side:'감시자',win:0},{name:'C',side:'감시자',win:60}];
 assert.deepEqual(sortStatistics(rows,{side:'감시자',sort:'win'}).map(r=>r.name),['C','B','A']);
 assert.deepEqual(sortStatistics(rows,{side:'감시자',sort:'win',direction:'asc'}).map(r=>r.name),['B','C','A']);
});

function runtime(){
 const nodes=new Map(),handlers={},fetches=[];
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){},showModal(){},close(){}});
 const context={...compendium,...themeUI,...model,...releaseUI,createStatisticsUI,selectRanked,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
 document:{documentElement:{dataset:{}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},getElementById(id){return nodes.get('#'+id);},addEventListener(t,h){handlers[t]=h;}},
 window:{addEventListener(){},scrollTo(){},scrollY:0,history:{replaceState(_a,_b,url){context.location.hash=url;}}},
 location:{hash:'#v=statistics',origin:'https://example.test',pathname:'/'},localStorage:{getItem(){return null;},setItem(){}},matchMedia:()=>({matches:false}),
 mountNavigation:()=>({update(){}}),mountHeroCarousel:()=>()=>{},createCarouselSession:()=>({}),carouselItems:()=>[],
 fetch:async url=>{fetches.push(url);return {ok:true,json:async()=>read(url.split('?')[0])};}
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 Object.assign(context,synergyModel);vm.runInNewContext(source+'\nglobalThis.app={boot,render,readRoute,state,loadRanked,refreshStatistics,statisticsParams,syncStatisticsRoute,getStatisticsUI};',context);
 return {context,nodes,handlers,fetches,app:context.app};
}

test('live app routes load only selected season files and render all three scopes, details and comparisons',async()=>{
 const {context,nodes,fetches,app}=runtime();await app.boot();
 let html=nodes.get('#page-body').innerHTML;
 assert.match(html,/id="ranked-title"/);assert.match(html,/id="tournament-title"/);
 assert.doesNotMatch(html,/href="https?:|출처 ↗|수집 범위|\bdownload(?:[ =>])|ranked\/statistics.zip/);
 assert.ok(fetches.some(x=>x.startsWith('ranked/asia-s43.json')));
 assert.ok(!fetches.some(x=>x.startsWith('ranked/cn-')));
 app.state.statistics.scope='ranked';await app.render();html=nodes.get('#page-body').innerHTML;
 assert.match(html,/id="ranked-title"/);assert.doesNotMatch(html,/id="tournament-title"/);
 app.state.statistics.scope='tournament';await app.render();html=nodes.get('#page-body').innerHTML;
 assert.doesNotMatch(html,/id="ranked-title"/);assert.match(html,/id="tournament-title"/);
 Object.assign(app.state.statistics,{server:'cn',season:'S44',tier:'all',snapshot:'',scope:'ranked'});await app.render();html=nodes.get('#page-body').innerHTML;
 assert.match(html,/정정 확인이 필요한 과거 통계/);assert.match(html,/인지 점수/);assert.match(html,/2026-08-04/);assert.doesNotMatch(html,/href="https?:|인지 점수 원문|badges.csv|\bdownload(?:[ =>])/);
 app.state.statistics.search='거미';await app.render();assert.match(nodes.get('#page-body').innerHTML,/1개 캐릭터/);
 app.syncStatisticsRoute();assert.match(context.location.hash,/season=S44/);
 app.readRoute();assert.equal(app.state.statistics.server,'cn');assert.equal(app.state.statistics.search,'거미');
 context.location.hash='#v=character&c=c01&tab=stats&scope=all&server=cn&season=S43&tier=all';app.readRoute();await app.render();
 html=nodes.get('#character-content').innerHTML;assert.doesNotMatch(html,/href="https?:|집계 범위·최근 원문|출처 ↗/);assert.match(html,/>대회</);assert.match(html,/>랭킹전</);assert.match(html,/거미|48\.3%/);
 context.location.hash='#v=compare&a=c01&b=c02&scope=ranked&server=cn&season=S43&tier=all';app.readRoute();await app.render();
 html=nodes.get('#page-body').innerHTML;assert.match(html,/랭킹전/);assert.doesNotMatch(html,/class="panel-title">[^<]*대회/);
 assert.doesNotMatch(html,/undefined|NaN/);
 for(const route of ['#v=statistics','#v=character&c=c01&tab=stats','#v=compare&a=c01&b=c02']){
  context.location.hash=route+'&scope=ranked&server=global-unknown&season=S42&tier=peak7&snap=retired-global';
  app.readRoute();await app.render();assert.equal(app.state.statistics.server,'asia');
  const output=nodes.get(route.includes('v=character')?'#character-content':'#page-body').innerHTML;
  assert.match(output,/<option value="asia"/);assert.match(output,/<option value="cn"/);
  assert.doesNotMatch(output,/global-unknown|글로벌|naeu/);
 }
 assert.ok(!fetches.some(url=>url.includes('global-unknown')));
});

test('ranked import survives partial network failure without hiding tournament results',async()=>{
 const {context,nodes,app}=runtime();const fetch=context.fetch;
 context.fetch=async url=>url.startsWith('ranked/')?{ok:false}:fetch(url);
 await app.boot();const html=nodes.get('#page-body').innerHTML;
 assert.match(html,/랭킹전 자료를 불러오지 못했습니다/);assert.match(html,/id="tournament-title"/);assert.match(html,/16,953/);
});


test('overlapping ranked loads retain the latest filters and revalidate dynamic files',async()=>{
 const {context,app}=runtime();context.location.hash='#v=explore';await app.boot();
 const fetch=context.fetch,requests=[];let finishIndex;
 context.fetch=async(url,options)=>{
  requests.push({url,options});
  if(url.startsWith('ranked/index.json'))await new Promise(resolve=>{finishIndex=resolve;});
  return fetch(url);
 };
 const asia=app.loadRanked();
 Object.assign(app.state.statistics,{server:'cn',season:'S43',tier:'all',snapshot:''});
 const china=app.loadRanked();finishIndex();
 const [a,b]=await Promise.all([asia,china]);
 assert.equal(a,b);assert.equal(app.state.statistics.server,'cn');assert.equal(app.state.statistics.season,'S43');
 assert.ok(a.datasets.some(d=>d.server==='asia'&&d.rows));assert.ok(b.datasets.some(d=>d.server==='cn'&&d.rows));
 const dynamic=requests.filter(r=>/^ranked\/(?!index)/.test(r.url));
 assert.ok(dynamic.length>=3);assert.ok(dynamic.every(r=>r.options.cache==='no-cache'&&!r.url.includes('20261017')));
});

test('retrying a failed badge request removes the stale error after recovery',async()=>{
 const {context,app}=runtime();context.location.hash='#v=explore';await app.boot();
 Object.assign(app.state.statistics,{server:'cn',season:'S43',tier:'all'});
 const fetch=context.fetch;let fail=true;
 context.fetch=async url=>url.startsWith('ranked/badges.json')&&fail?{ok:false}:fetch(url);
 const first=await app.loadRanked();assert.match(first.badgesError,/인지 점수/);assert.equal(first.badges,undefined);
 fail=false;const second=await app.loadRanked();assert.ok(second.badges.length);assert.equal(second.badgesError,undefined);
});

test('a slow statistics refresh cannot restore its old URL or scroll after navigation',async()=>{
 const {context,app,nodes}=runtime();context.location.hash='#v=explore';await app.boot();
 const fetch=context.fetch;let finishMatches;
 context.fetch=async url=>{if(url.startsWith('matches.json'))await new Promise(resolve=>{finishMatches=resolve;});return fetch(url);};
 context.location.hash='#v=statistics';app.readRoute();const pending=app.refreshStatistics();
 context.location.hash='#v=explore';app.readRoute();await app.render();
 let scrolls=0;context.window.scrollTo=()=>{scrolls++;};finishMatches();await pending;
 assert.equal(context.location.hash,'#v=explore');assert.equal(scrolls,0);assert.match(nodes.get('#page-body').innerHTML,/A CLEARER WAY TO PLAY/);
});

test('navigation cancels a pending statistics search before another screen is rendered',async()=>{
 const {context,app,handlers}=runtime();await app.boot();
 const timers=new Map();let id=0;
 context.setTimeout=fn=>{timers.set(++id,fn);return id;};context.clearTimeout=id=>timers.delete(id);
 handlers.input({target:{id:'statistics-search',value:'마리'}});assert.equal(timers.size,1);
 context.location.hash='#v=explore';app.readRoute();await app.render();assert.equal(timers.size,0);
});
