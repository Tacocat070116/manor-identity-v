import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {statsFor,rankBans,pairEvidence,safeUrl,filterRows} from './dist/model.js';
const read=n=>JSON.parse(fs.readFileSync('dist/'+n,'utf8'));
const db=read('data.json'),matches=read('matches.json'),bans=read('bans.json');
const c=n=>db.characters.find(x=>x.name===n),ids=new Set(db.characters.map(c=>c.id));
assert.equal(db.characters.length,89);assert.equal(ids.size,89);
assert.equal(matches.length,16757);assert.equal(bans.length,15516);
assert.equal(db.sources.length,202);assert.equal(db.matchups.filter(x=>x.status==='반영').length,447);
assert.equal(db.characters.reduce((n,c)=>n+10-c.hard.length-c.easy.length,0),223);
for(const ch of db.characters){
 assert.ok(ch.strengths.length<=3&&ch.weaknesses.length<=3);
 assert.ok(ch.hard.length<=5&&ch.easy.length<=5);
 assert.ok(ch.difficulty>=1&&ch.difficulty<=5);
 assert.ok(fs.existsSync('dist/'+ch.portrait),ch.name+' portrait');
 for(const item of [...ch.hard,...ch.easy]){
  assert.ok(c(item.name),item.name);
  if(item.evidence)assert.ok(db.matchups.some(x=>x.id===item.evidence),item.evidence);
 }
}
for(const row of matches){assert.ok(ids.has(row[2]));assert.equal(row[3].length,4);assert.equal(new Set(row[3]).size,4);row[3].forEach(id=>assert.ok(ids.has(id)));}
for(const row of bans){assert.ok(ids.has(row[2]));row[3].forEach(id=>assert.ok(ids.has(id)));assert.ok(row[3].length>=1);}
const hull=statsFor(matches,c('훌라발루'),{days:0});
assert.equal(hull.appearances,695);assert.equal(hull.results,694);assert.equal(hull.win,296);assert.equal(hull.draw,293);assert.equal(hull.loss,105);assert.equal(hull.unknown,1);
const prediction=rankBans(bans,[c('의사').id,c('샤먼').id],{days:0});
assert.equal(prediction.base,15516);assert.equal(prediction.matched,5);
assert.deepEqual(prediction.ranks.map(x=>x.id),['광기의 눈','밀랍인형사','오페라 가수','꿈의 마녀','조각가'].map(n=>c(n).id));
assert.ok(Math.abs(prediction.ranks[0].score-0.12211394689352925)<1e-12);
assert.equal(rankBans(bans,[],{days:0}).ranks.length,0);
assert.ok(rankBans(bans,[c('의사').id,c('의사').id]).error);
const none=rankBans(bans,[c('신동').id],{days:30});assert.equal(none.matched,0);assert.equal(none.ranks.length,0);
const excluded=rankBans(bans,[c('의사').id,c('샤먼').id],{days:0,excluded:[c('광기의 눈').id]});assert.ok(!excluded.ranks.some(x=>x.id===c('광기의 눈').id));assert.equal(excluded.matched,2);
const fixture=Array.from({length:100},(_,i)=>['2026-10-01','테스트 맵','h',['s','s2','s3','s4'],'IVL',i<40?'승':i<70?'무':'패',2]);
assert.equal(statsFor(fixture,{id:'h',side:'감시자'}).winRate,.4);
assert.equal(statsFor(fixture,{id:'s',side:'생존자'}).winRate,.3);
assert.equal(statsFor(fixture.slice(0,49),{id:'h',side:'감시자'}).winRate,null);
assert.equal(filterRows(fixture,{days:30,map:'없는 맵'}).length,0);
assert.equal(filterRows(fixture,{days:30,map:'테스트 맵',tournament:'IVL'}).length,100);
assert.equal(filterRows(fixture,{days:30,tournament:'COA'}).length,0);
assert.equal(safeUrl('javascript:alert(1)'), '');assert.equal(safeUrl('data:text/html,bad'), '');
for(const ch of db.characters){
 const stat=statsFor(matches,ch,{days:0});
 assert.equal(stat.appearances,stat.results+stat.unknown);
 assert.equal(stat.results,stat.win+stat.draw+stat.loss);
}
assert.equal(db.characters.filter(x=>x.side==='감시자').reduce((n,ch)=>n+statsFor(matches,ch,{days:0}).appearances,0),matches.length);
assert.equal(db.characters.filter(x=>x.side==='생존자').reduce((n,ch)=>n+statsFor(matches,ch,{days:0}).appearances,0),matches.length*4);
assert.ok(pairEvidence(db.matchups,c('사도'),c('탐사원')).length>0);
const nodes=new Map();
function node(){return {innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){}},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},select(){}};}
const context={console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,setTimeout,clearTimeout,document:{documentElement:{dataset:{}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},addEventListener(){}},window:{addEventListener(){},scrollTo(){},scrollY:0},location:{hash:'',origin:'https://example.test',pathname:'/'},localStorage:{getItem(){return null;},setItem(){}},matchMedia(){return {matches:false};},statsFor,rankBans,pairEvidence,safeUrl,REFERENCE_DATE:'2026-10-16',__data:db,__matches:matches,__bans:bans};
let source=fs.readFileSync('dist/app.js','utf8').split('\n').slice(1).join('\n').replace(/\nboot\(\);\s*$/,'');
source+=`
db=__data;byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));
state.own=byName['블러디 퀸'].id;state.a=state.own;state.b=byName['붉은 나비'].id;
globalThis.audit={templates:[],checked:0};
audit.templates.push(explore(),sourcesPage(),matchupPage(),comparePage(__matches),banPage(__bans));
for(const c of db.characters){state.character=c.id;for(const t of ['overview','matchups','sources','stats']){state.tab=t;const html=characterPage();if(html.includes('undefined')||html.includes('NaN'))throw Error(c.name+' '+t);audit.checked++;}}
state.own=byName['신동'].id;state.opponent=byName['마음의 짐승'].id;audit.templates.push(matchupPage());
state.own=byName['사도'].id;state.opponent=byName['탐사원'].id;audit.templates.push(matchupPage());
state.bans=[byName['의사'].id,byName['샤먼'].id,''];state.banFilters.days=0;audit.templates.push(banPage(__bans));
audit.templates.push(statsPanel(byName['훌라발루'],__matches));
state.favoriteOnly=true;state.favorites=new Set([byName['거미'].id,byName['사도'].id]);audit.templates.push(favoriteInsight([byName['거미'],byName['사도']]));
audit.condition=cleanCondition('추가 공개 자료 1문서: 오른쪽 P:S 및 [커뮤니티 근거] 참조. 구버전 중국어 글은 일반화하지 않습니다.');
audit.escape=esc('<img src=x onerror=alert(1)>');
location.hash='#v=compare&a='+byName['의사'].id+'&b='+byName['거미'].id;readRoute();audit.sameSide=byId[state.a].side===byId[state.b].side;
location.hash='#v=bans&bans='+byName['의사'].id+','+byName['의사'].id+','+byName['거미'].id;readRoute();audit.cleanBans=state.bans.filter(Boolean);
`;
vm.runInNewContext(source,context,{timeout:15000});
assert.equal(context.audit.checked,356);
assert.ok(context.audit.condition.includes('구버전 중국어'));
assert.ok(context.audit.escape.includes('&lt;img'));assert.ok(context.audit.sameSide);
assert.equal(context.audit.cleanBans.length,1);
for(const html of context.audit.templates){assert.ok(html.length>100);assert.ok(!html.includes('undefined'));assert.ok(!html.includes('NaN'));}
fs.writeFileSync('qa-summary.json',JSON.stringify({status:'passed',characters:89,portraits:89,templateVariants:356,matchRecords:matches.length,banRecords:bans.length,goldenCases:['훌라발루 695/694/296','의사+샤먼 5판, 광기의 눈 12.2113946894%'],visualBrowserQA:'not available; not performed'},null,2));
console.log('PASS: 89 portraits, 356 character template variants, data integrity, result direction, sample gates, date/map/tournament filtering, ban smoothing, exclusions, URL sanitization, and native-sheet golden cases.');
