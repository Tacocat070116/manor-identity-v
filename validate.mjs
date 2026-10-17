import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {statsFor,rankBans,pairEvidence,safeUrl,filterRows} from './dist/model.js';
const read=n=>JSON.parse(fs.readFileSync('dist/'+n,'utf8'));
const db=read('data.json'),matches=read('matches.json'),bans=read('bans.json'),specialties=read('specialties.json');
assert.equal(Object.keys(specialties.characters).length,db.characters.length);
Object.assign(db.meta,specialties.meta);
for(const ch of db.characters)Object.assign(ch,specialties.characters[ch.id]);
const c=n=>db.characters.find(x=>x.name===n),ids=new Set(db.characters.map(c=>c.id));
const allowedSpecialties={생존자:['어그로','커버','구출','운영','해독'],감시자:['사냥','캠핑','운영']};
assert.equal(db.characters.length,89);assert.equal(ids.size,89);
assert.equal(matches.length,16757);assert.equal(bans.length,15516);
assert.equal(db.sources.length,202);assert.equal(db.matchups.filter(x=>x.status==='반영').length,447);
assert.equal(db.characters.reduce((n,c)=>n+10-c.hard.length-c.easy.length,0),223);
for(const ch of db.characters){
 assert.ok(Array.isArray(ch.specialties)&&ch.specialties.length>=1&&ch.specialties.length<=2,ch.name+' 1–2 role tags');
 assert.equal(new Set(ch.specialties).size,ch.specialties.length,ch.name+' unique role tags');
 assert.deepEqual(Object.keys(ch.specialtyReasons).sort(),[...ch.specialties].sort(),ch.name+' reason per tag');
 for(const tag of ch.specialties){
  assert.ok(allowedSpecialties[ch.side]?.includes(tag),ch.name+' '+tag);
  assert.ok(typeof ch.specialtyReasons[tag]==='string'&&ch.specialtyReasons[tag].length>15,ch.name+' '+tag+' reason');
 }
 for(const url of ch.specialtySources||[])assert.ok(safeUrl(url),ch.name+' specialty source');
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
const handlers={};
function node(){return {innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){}},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},focus(){},select(){}};}
const context={console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,setTimeout,clearTimeout,document:{documentElement:{dataset:{}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},addEventListener(type,handler){handlers[type]=handler;}},window:{addEventListener(){},scrollTo(){},scrollY:0},location:{hash:'',origin:'https://example.test',pathname:'/'},localStorage:{getItem(){return null;},setItem(){}},matchMedia(){return {matches:false};},statsFor,rankBans,pairEvidence,safeUrl,REFERENCE_DATE:'2026-10-16',__data:db,__matches:matches,__bans:bans,__handlers:handlers};
let source=fs.readFileSync('dist/app.js','utf8').split('\n').slice(1).join('\n').replace(/\nboot\(\);\s*$/,'');
source+=`
db=__data;byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));
state.own=byName['블러디 퀸'].id;state.a=state.own;state.b=byName['붉은 나비'].id;
globalThis.audit={templates:[],checked:0,roleCards:[]};
for(const c of db.characters){audit.roleCards.push({id:c.id,card:card(c),selection:selectionCard(c,'compare-a','캐릭터 A'),valid:validSpecialties(c.side,c)});}
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
state.view='explore';state.favoriteOnly=false;state.search='';state.sort='name';
audit.specialtyResults=[];
for(const [side,roles] of Object.entries(specialtyGroups)){for(const role of roles){state.side=side;state.specialty=role;updateExplorer();audit.specialtyResults.push({side,role,html:$('#explorer-results').innerHTML});}}
state.side='생존자';state.specialty='커버';state.search='선 지자';state.favoriteOnly=true;state.favorites=new Set([byName['선지자'].id,byName['용병'].id]);updateExplorer();audit.combinedFilter=$('#explorer-results').innerHTML;
state.search='교수';state.favorites=new Set([byName['교수'].id,byName['용병'].id]);updateExplorer();audit.secondaryCombinedFilter=$('#explorer-results').innerHTML;
state.specialty='구출';__handlers.click({target:{closest:()=>({dataset:{action:'side',side:'감시자'}})}});audit.resetInvalidSpecialty=state.specialty;
state.specialty='운영';__handlers.click({target:{closest:()=>({dataset:{action:'side',side:'생존자'}})}});audit.keepSharedSpecialty=state.specialty;
__handlers.click({target:{closest:()=>({dataset:{action:'reset-explore'}})}});audit.resetExplore=[state.side,state.specialty,state.search,state.favoriteOnly];
audit.invalidRoles=[undefined,{specialties:[]},{specialties:['어그로','커버','구출']},{specialties:['커버','커버']},{specialties:['사냥']},{specialties:['어그로'],specialtyReasons:{}}].map(role=>validSpecialties('생존자',role));
footer();audit.footer=$('#footer').innerHTML;
`;
vm.runInNewContext(source,context,{timeout:15000});
assert.equal(context.audit.checked,356);
assert.ok(context.audit.condition.includes('구버전 중국어'));
assert.ok(context.audit.escape.includes('&lt;img'));assert.ok(context.audit.sameSide);
assert.equal(context.audit.cleanBans.length,1);
for(const {side,role,html} of context.audit.specialtyResults){
 const expected=db.characters.filter(ch=>ch.side===side&&ch.specialties.includes(role)).map(ch=>ch.id).sort();
 const actual=[...html.matchAll(/class="character-card"[^>]*data-id="(c\d+)"/g)].map(m=>m[1]).sort();
 assert.ok(expected.length>0,side+' '+role+' populated');
 assert.deepEqual(actual,expected,side+' '+role+' filtered roster');
}
assert.ok(context.audit.combinedFilter.includes('data-id="'+c('선지자').id+'"'));
assert.ok(!context.audit.combinedFilter.includes('data-id="'+c('용병').id+'"'));
assert.equal(context.audit.resetInvalidSpecialty,'');
assert.equal(context.audit.keepSharedSpecialty,'운영');
assert.ok(context.audit.secondaryCombinedFilter.includes('data-id="'+c('교수').id+'"'));
assert.ok(!context.audit.secondaryCombinedFilter.includes('data-id="'+c('용병').id+'"'));
assert.ok(context.audit.invalidRoles.every(result=>result===false));
assert.ok(db.characters.some(ch=>ch.specialties.length===1));
assert.ok(db.characters.some(ch=>ch.specialties.length===2));
for(const result of context.audit.roleCards){
 const ch=db.characters.find(c=>c.id===result.id);
 assert.ok(result.valid,ch.name+' runtime role validation');
 assert.ok(!result.card.includes('특화')&&!result.selection.includes('특화'),ch.name+' short labels');
 const cardTags=[...result.card.matchAll(/<span>#([^<]+)<\/span>/g)].map(m=>m[1]);
 const selectionTags=[...result.selection.matchAll(/class="tag specialty-tag">#([^<]+)<\/span>/g)].map(m=>m[1]);
 assert.deepEqual(cardTags,ch.specialties,ch.name+' ordered card tags');
 assert.deepEqual(selectionTags,ch.specialties,ch.name+' ordered compare tags');
}
assert.deepEqual(Array.from(context.audit.resetExplore),['전체','','',false]);
for(const html of context.audit.templates){assert.ok(html.length>100);assert.ok(!html.includes('undefined'));assert.ok(!html.includes('NaN'));}
fs.writeFileSync('qa-summary.json',JSON.stringify({status:'passed',characters:89,portraits:89,templateVariants:356,matchRecords:matches.length,banRecords:bans.length,goldenCases:['훌라발루 695/694/296','의사+샤먼 5판, 광기의 눈 12.2113946894%'],visualBrowserQA:'not available; not performed'},null,2));
console.log('PASS: 89 portraits, 356 character template variants, data integrity, result direction, sample gates, date/map/tournament filtering, ban smoothing, exclusions, URL sanitization, and native-sheet golden cases.');
