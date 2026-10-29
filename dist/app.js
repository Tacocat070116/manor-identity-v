import {mountRecoveryPage} from './participation.js?v=e5e72b89eb98';
import {tournamentRelations,observedDetails,characterEvidence,contextEvidence} from './compendium-model.js?v=4d1d84b011d2';
import {mountNavigation} from './navigation.js?v=e004cdac4973';
import {colorThemes,resolveTheme,readTheme,applyTheme,themeOptions} from './themes.js?v=20b623b7cbb2';
import {statsFor, rankBans, pairEvidence, REFERENCE_DATE, matchesCharacter, sortCharacters, characterSortOptions} from './model.js?v=4af73c4d1266';
import {createCarouselSession,carouselItems,mountHeroCarousel} from './carousel.js?v=98b4e768f28e';
import {createStatisticsUI} from './statistics.js?v=c5861ae86927';
import {mountFeedback} from './feedback.js?v=4b5f00f06573';
import {mountMatchupTips} from './matchup-tips.js?v=7b49a2bf9f3e';
import {mountCreators} from './creators.js?v=1e99826218f8';
import {selectRanked} from './statistics-model.js?v=45f34accabdb';
import {releaseLabel,releaseNotesPage,releaseNotesList,releaseTypes} from './releases.js?v=faf9431158c2';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>new Intl.NumberFormat('ko-KR').format(n);
const pct=n=>`${(n*100).toFixed(1)}%`;
const paths={
palette:'<path d="M12 3a9 9 0 1 0 0 18h1.2a2.3 2.3 0 0 0 1.6-3.9 1.3 1.3 0 0 1 .9-2.2H18a3 3 0 0 0 3-3 9 9 0 0 0-9-8.9Z"/><circle cx="7" cy="11" r=".9"/><circle cx="10" cy="7" r=".9"/><circle cx="15" cy="7.5" r=".9"/>',
key:'<circle cx="8" cy="8" r="4.5"/><path d="m11.2 11.2 9.3 9.3m-3-3 3-3m-6 0 3-3"/>',
check:'<path d="m5 12 4 4L19 6"/>',
search:'<circle cx="10.25" cy="10.25" r="6.75"/><path d="m15.1 15.1 5.4 5.4"/>',
grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
swords:'<path d="m13.5 7.5 3.5-3.5 4-1-1 4-3.5 3.5"/><path d="M14 17 4 7 3 3l4 1 10 10-3 3Z"/><path d="m12.5 18.5 6-6m-13 0 6 6M15.5 15.5 20 20M8.5 15.5 4 20m14.5 1.5 3-3m-19 0 3 3"/>',
compare:'<path d="M8 4H4v16h4m8-16h4v16h-4M12 3v18"/>',
swap:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
shield:'<path d="m12 3 8 3v5.5c0 4.2-2.8 7.3-8 9.5-5.2-2.2-8-5.3-8-9.5V6l8-3Z"/><path d="m8.5 11.5 2.5 2.5 4.5-5"/>',
message:'<path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/>',
book:'<path d="M12 6v15M3 3c3.5 0 6.5 1 9 3 2.5-2 5.5-3 9-3v15c-3.5 0-6.5 1-9 3-2.5-2-5.5-3-9-3V3Z"/>',
star:'<path d="m12 3.4 2.8 5.7 6.3.9-4.55 4.45 1.07 6.25L12 17.75 6.38 20.7l1.07-6.25L2.9 10l6.3-.9L12 3.4Z"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.75m0 13.5v2.75M2.5 12h2.75m13.5 0h2.75M5.3 5.3l1.95 1.95m9.5 9.5 1.95 1.95M5.3 18.7l1.95-1.95m9.5-9.5 1.95-1.95"/>',
moon:'<path d="M20.45 13.65A8.5 8.5 0 0 1 10.35 3.55 8.5 8.5 0 1 0 20.45 13.65Z"/>',
arrow:'<path d="M3.4 12h16m-6-6 6 6-6 6"/>',
back:'<path d="M20.6 12h-16m6-6-6 6 6 6"/>',
down:'<path d="m6 8.7 6 6 6-6"/>',
close:'<path d="m6 6 12 12M6 18 18 6"/>',
plus:'<path d="M12 4v16M4 12h16"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
share:'<path d="M12 15V3m-4 4 4-4 4 4"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
spark:'<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
chart:'<path d="M3.5 3.5v17h17M8 16v-5m5 5V7m5 9V9"/>',
globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M4.5 7h15M4.5 17h15"/>',
external:'<path d="M13 4h7v7m0-7L10 14M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
play:'<path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>',
pause:'<path d="M9 5v14M15 5v14" stroke-width="2.4"/>',
'role-kite':'<path d="M8 4h4l1 5 7 4a3 3 0 0 1 1 2.2V19H5v-6l3-9ZM5 16h16M12 9l-2 2m5 0-2 2M2 7h3m-3 3h2"/>',
'role-cover':'<path d="M12 2 3 6v5c0 5 4 8 9 11 5-3 9-6 9-11V6zM8 15a4 4 0 0 1 8 0"/><circle cx="12" cy="9" r="2.5"/>',
'role-rescue':'<path d="M2 13h4v8H2zM6 14l3-3h4a2 2 0 0 1 0 4h-3m3 0 5-3a2 2 0 0 1 2 3l-5 5H6M16 2v6m-3-3h6"/>',
'role-control':'<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="19" r="2"/><path d="M7 6h10M5 8v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8M12 14v3"/>',
'role-decode':'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M6 9V3h12v6M9 6h6M7 13h1m3 0h2m3 0h1M7 17h1m3 0h2m3 0h1"/>',
'role-hunt':'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
'role-camp':'<path d="M7 14V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9M3 10v7h18v-7M3 14h18M6 17v4m12-4v4M10 7h4"/>'
};
const icon=n=>{const name=Object.hasOwn(paths,n)?n:'info';return `<svg class="icon icon-${name}" aria-hidden="true" focusable="false" viewBox="0 0 24 24">${paths[name]}</svg>`;};
const state={view:'explore',character:'',tab:'overview',own:'',opponent:'',a:'',b:'',search:'',side:'전체',specialty:'',sort:'release',favoriteOnly:false,stats:{days:0,map:'',tournament:''},statistics:{scope:'all',side:'감시자',server:'asia',season:'',tier:'all',snapshot:'',sort:'pick',direction:'desc',search:'',badgeSnapshot:''},banSource:'observed',banFilters:{days:0,map:'',tournament:'',excluded:[]},bans:['','',''],situation:'',favorites:new Set(),theme:'light'};
let themeStorage;
try{themeStorage=localStorage;state.favorites=new Set(JSON.parse(localStorage.getItem('manor-favorites')||'[]'));}catch{}
state.theme=readTheme(themeStorage,matchMedia('(prefers-color-scheme:dark)').matches).id;
applyTheme(state.theme,{document,remember:false});
let db,byId,byName,renderToken=0,pickerContext,toastTimer,matchesPromise,bansPromise;
let heroSession,disposeHeroCarousel=()=>{},disposeFeedback=()=>{};
let disposeMatchupTips=()=>{};
let disposeCreators=()=>{},disposeRecovery=()=>{};
let statisticsUI,rankedPromise,rankedData,rankedError='',statisticsSearchTimer;
let navigationController,detailsPromise,observedBansPromise;
let releaseLog;
const releaseFilters={query:'',type:'전체'};
const rankedFiles=new Map();
const loadRanked=async()=>{
 const data=await(rankedPromise||=fetch('ranked/index.json?v=e2c666f8f5df').then(r=>{if(!r.ok)throw Error('랭킹전 자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{rankedPromise=null;throw e;}));
 const s=selectRanked(data,state.statistics);Object.assign(state.statistics,s.filters);
 if(s.dataset&&!s.dataset.rows){
  const path=s.dataset.path;
  if(!/^ranked\/[a-z0-9-]+\.json$/.test(path||''))throw Error('랭킹전 자료 경로를 확인하지 못했습니다.');
  if(!rankedFiles.has(path))rankedFiles.set(path,fetch(path+'?v=20261017').then(r=>{if(!r.ok)throw Error('선택한 시즌 자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{rankedFiles.delete(path);throw e;}));
  const part=await rankedFiles.get(path);
  for(const entry of part.datasets){const target=data.datasets.find(d=>d.id===entry.id);if(target)target.rows=entry.rows.map(r=>{const c=byId[r[0]];if(!c)throw Error('통계 캐릭터 정보를 확인하지 못했습니다.');return {id:c.id,name:c.name,side:c.side,pick:r[1],win:r[2],draw:r[3],loss:r[4],ban:r[5]};});}
  if(!s.dataset.rows)throw Error('선택한 통계 항목을 확인하지 못했습니다.');
 }
 if(s.filters.server==='cn'&&!data.badges){
  const path='ranked/badges.json';
  if(!rankedFiles.has(path))rankedFiles.set(path,fetch(path+'?v=20261017').then(r=>{if(!r.ok)throw Error('인지 점수 자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{rankedFiles.delete(path);throw e;}));
  try{data.badges=(await rankedFiles.get(path)).datasets;}catch(e){data.badgesError=e.message;}
 }
 rankedData=data;rankedError='';return data;
};
const loadMatches=()=>matchesPromise||=fetch('matches.json?v=e9e58d54f975').then(r=>{if(!r.ok)throw Error('경기 자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{matchesPromise=null;throw e;});
const loadBans=()=>bansPromise||=fetch('bans.json?v=ea94c7967200').then(r=>{if(!r.ok)throw Error('밴 자료를 불러오지 못했습니다.');return r.json();}).catch(e=>{bansPromise=null;throw e;});
const loadDetails=()=>detailsPromise||=fetch('tournament-details.json?v=1d033d96cda4').then(r=>{if(!r.ok)throw Error('세부 대회 기록을 불러오지 못했습니다.');return r.json();}).catch(e=>{detailsPromise=null;throw e;});
const loadObservedBans=()=>observedBansPromise||=fetch('bans-observed.json?v=e41c726e4ddb').then(r=>{if(!r.ok)throw Error('공개 밴 기록을 불러오지 못했습니다.');return r.json();}).catch(e=>{observedBansPromise=null;throw e;});
const portrait=(c,priority=false)=>`<img src="${esc(c.portrait)}" alt="${esc(c.name)}" width="200" height="200" ${priority?'fetchpriority="high"':'loading="lazy"'} decoding="async">`;
const personaTalents={
 '히든카드':{id:'trump-card',side:'감시자'},
 '만류':{id:'detention',side:'감시자'},
 '요란법석':{id:'insolence',side:'감시자'},
 '밀폐 공간':{id:'confined-space',side:'감시자'},
 '마지막 희망':{id:'borrowed-time',side:'생존자'},
 '위기 모면':{id:'tide-turner',side:'생존자'},
 '플라이휠 효과':{id:'flywheel-effect',side:'생존자'},
 '무릎 반사':{id:'knee-jerk-reflex',side:'생존자'}
};
function personaBuild(c){
 const [direction,build,...extra]=String(c.persona||'').split('|').map(part=>part.trim());
 const names=(build||'').split('+').map(name=>name.trim());
 if(extra.length||names.length!==2||!names.every(name=>personaTalents[name]?.side===c.side))return `<p class="large-value">${esc(c.persona)}</p>`;
 return `<div class="persona-build" role="group" aria-label="${esc(c.persona)}"><p class="persona-direction">${esc(direction)}</p><div class="persona-talents">${names.map(name=>`<div class="persona-talent"><span class="persona-talent-art"><img src="assets/persona/${personaTalents[name].id}.png" alt="" width="48" height="48" loading="lazy" decoding="async"></span><span class="persona-talent-name">${esc(name)}</span></div>`).join('')}</div></div>`;
}
function playGuide(c){
 return `<div class="panel play-guide"><h2 class="panel-title">${icon('clock')}실전 운용 가이드</h2><p class="guide-skill-summary">${esc(c.skill)}</p><section class="play-guide-section"><h3 class="small-heading">스킬을 사용해야 할 때</h3><p>${esc(c.use)}</p></section><section class="play-guide-section"><h3 class="small-heading">스킬을 아껴야 할 때</h3><p>${esc(c.hold)}</p></section><section class="play-guide-section play-guide-caution"><h3 class="small-heading">${icon('info')}주의할 점</h3><p>${esc(c.caution)}</p></section></div>`;
}
const difficulty=n=>`<span class="difficulty" role="img" aria-label="난이도 ${Number(n)}/5">${[1,2,3,4,5].map(i=>`<i class="${i<=n?'on':''}"></i>`).join('')}</span>`;
const chip=(t,tone='')=>`<span class="tag ${tone}">${esc(t)}</span>`;
const specialtyGroups={생존자:['추격','커버','구출','운영','해독'],감시자:['추격','캠핑','운영']};
const specialtyIcons={커버:'role-cover',구출:'role-rescue',운영:'role-control',해독:'role-decode',캠핑:'role-camp'};
// The reviewed data is ordered per character: main role first, optional supporting role second.
const specialtyPriority=i=>i?'서브':'메인';
const primarySpecialtyIcon=c=>icon(c.specialties[0]==='추격'?(c.side==='생존자'?'role-kite':'role-hunt'):specialtyIcons[c.specialties[0]]);
const specialtyLabels=c=>c.specialties.map((t,i)=>`${specialtyPriority(i)} #${t}`).join(', ');
const specialtyTags=(c,compact=false)=>c.specialties.map((t,i)=>`<span class="${compact?'card-role':'tag specialty-tag'} is-${i?'secondary':'primary'}" data-specialty="${esc(t)}" data-priority="${i?'secondary':'primary'}" title="${specialtyPriority(i)} 역할: ${esc(t)}"><span class="visually-hidden">${specialtyPriority(i)} </span>#${esc(t)}</span>`).join('');
const specialtyExplanation=c=>c.specialties.map((t,i)=>`<p><strong>${specialtyPriority(i)} · #${esc(t)}</strong> · ${esc(c.specialtyReasons[t])}</p>`).join('');
const validSpecialties=(side,role)=>Array.isArray(role?.specialties)&&role.specialties.length>=1&&role.specialties.length<=2&&new Set(role.specialties).size===role.specialties.length&&role.specialties.every(t=>specialtyGroups[side]?.includes(t)&&typeof role.specialtyReasons?.[t]==='string'&&role.specialtyReasons[t].length>15);
const availableSpecialties=(side=state.side)=>side==='전체'?[...new Set(Object.values(specialtyGroups).flat())]:specialtyGroups[side]||[];
function specialtyFilters(){return `<div class="specialty-toolbar"><div class="specialty-label">역할 태그</div><div class="specialty-options" role="group" aria-label="캐릭터 역할 태그 필터">${['',...availableSpecialties()].map(v=>`<button type="button" data-action="specialty" data-specialty="${v}" class="specialty-filter ${state.specialty===v?'active':''}" aria-pressed="${state.specialty===v}">${v?'#'+esc(v):'전체 태그'}</button>`).join('')}</div></div>`;}

const char=(id,fallback='블러디 퀸')=>byId[id]||byName[fallback]||db.characters[0];
const options=(values,selected,all='전체')=>`<option value="">${all}</option>${values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('')}`;
const route=p=>'#'+new URLSearchParams(p).toString();
function navigate(p){const next=route(p);if(location.hash===next){readRoute();render();}else location.hash=next;}
function readRoute(){
 const p=new URLSearchParams(location.hash.slice(1));
 state.view=['explore','character','matchup','compare','bans','statistics','creators','feedback','recovery','patchnotes'].includes(p.get('v'))?p.get('v'):'explore';
 for(const [key,field]of[['c','character'],['own','own'],['opp','opponent'],['a','a'],['b','b']])if(byId[p.get(key)])state[field]=p.get(key);
 if(state.view==='matchup'&&p.has('own')&&!p.has('opp'))state.opponent='';
 state.tab=['overview','matchups','tips','stats'].includes(p.get('tab'))?p.get('tab'):'overview';
 if(['statistics','character','compare'].includes(state.view))for(const [param,key] of [['scope','scope'],['server','server'],['season','season'],['tier','tier'],['snap','snapshot'],['rs','side'],['sort','sort'],['order','direction'],['q','search'],['badge','badgeSnapshot']])if(p.has(param))state.statistics[key]=p.get(param);
 if(!['all','tournament','ranked'].includes(state.statistics.scope))state.statistics.scope='all';
 if(!['생존자','감시자'].includes(state.statistics.side))state.statistics.side='생존자';
 if(!['pick','win','draw','loss','ban','appearances','name'].includes(state.statistics.sort))state.statistics.sort='pick';
 if(!['asc','desc'].includes(state.statistics.direction))state.statistics.direction='desc';
 state.feedbackPost=/^[0-9a-f-]{36}$/.test(p.get('post')||'')?p.get('post'):'';
 state.creatorPost=/^[0-9a-f-]{36}$/.test(p.get('channel')||'')?p.get('channel'):'';
 const f=state.view==='bans'?state.banFilters:state.stats;
 if(p.has('days')&&[0,30,90,365].includes(Number(p.get('days'))))f.days=Number(p.get('days'));
 if(p.has('map'))f.map=db.maps.includes(p.get('map'))?p.get('map'):'';
 if(p.has('tour'))f.tournament=['COA','IVL','IJL','IVC','IVT','IVS'].includes(p.get('tour'))?p.get('tour'):'';
 if(state.view==='bans'&&p.has('banSource'))state.banSource=p.get('banSource')==='legacy'?'legacy':'observed';
 if(state.view==='bans'&&p.has('ex'))state.banFilters.excluded=p.get('ex').split(',').filter(id=>byId[id]?.side==='감시자').slice(0,2);
 if(state.view==='matchup'&&p.has('situation'))state.situation=p.get('situation');
 if(p.has('bans')){const used=new Set();state.bans=p.get('bans').split(',').slice(0,3).map(id=>{if(byId[id]?.side!=='생존자'||used.has(id))return '';used.add(id);return id;}).concat(['','','']).slice(0,3);}
 if(byId[state.own]?.side===byId[state.opponent]?.side)state.opponent='';
 if(byId[state.a]?.side!==byId[state.b]?.side||state.a===state.b)state.b=db.characters.find(c=>c.side===byId[state.a]?.side&&c.id!==state.a)?.id||'';
}
function header(){
 if(navigationController){navigationController.update({view:state.view,theme:state.theme,themeLabel:resolveTheme(state.theme).name});return;}
 const nav=[['explore','도감','grid'],['matchup','매치업','swords'],['compare','비교','compare'],['bans','밴 분석','shield'],['statistics','통계','chart'],['creators','유튜브','play'],['feedback','피드백','message'],['recovery','복구 코드','key'],['patchnotes','MANOR 업데이트','spark']];
 const current=nav.find(([v])=>v===(state.view==='character'?'explore':state.view))||['explore','도감','grid'];
 const links=nav.map(([v,label,i])=>`<a class="nav-item ${current[0]===v?'active':''}" ${current[0]===v?'aria-current="page"':''} data-view="${v}" data-nav-label="${label}" data-nav-icon="${i}" href="${route({v})}" tabindex="-1">${icon(i)}<span class="nav-item-label">${label}${v==='creators'?'<span class="creator-beta-badge">BETA</span>':''}</span></a>`).join('');
 $('#header').innerHTML=`<div class="nav-shell"><a class="brand" href="#v=explore" aria-label="MANOR 홈"><svg class="brand-mark" viewBox="0 0 32 36" aria-hidden="true"><path d="m3 5 13 26L29 5M10 5l6 12 6-12"/></svg><div><div class="brand-word">MANOR</div><small class="brand-version">${esc(releaseLabel(releaseLog))}</small></div></a><div class="header-actions"><button class="icon-btn global-search" data-action="global-search" aria-label="캐릭터 빠른 검색" title="검색 · Ctrl/⌘ K">${icon('search')}</button><button class="icon-btn" data-action="theme" aria-label="컬러 테마 선택 · 현재 ${resolveTheme(state.theme).name}" aria-haspopup="dialog" aria-controls="theme-picker" title="컬러 테마 선택">${icon('palette')}</button></div></div><div class="category-nav" data-expanded="false"><button type="button" class="category-toggle" data-nav-toggle aria-expanded="false" aria-controls="category-panel" aria-label="카테고리 메뉴 열기 · 현재 ${current[1]}"><span class="category-current-icon" data-nav-current-icon aria-hidden="true">${icon(current[2])}</span><span class="category-current-label" data-nav-current-label>${current[1]}</span><span class="category-toggle-hint" aria-hidden="true">메뉴</span><span class="category-chevron" aria-hidden="true">${icon('down')}</span></button><nav class="category-panel" id="category-panel" aria-label="주 메뉴" aria-hidden="true" inert><p class="category-panel-label">카테고리</p><div class="category-links">${links}</div></nav></div>`;
 navigationController=mountNavigation($('#header'),{icon});
 navigationController.update({view:state.view,theme:state.theme,themeLabel:resolveTheme(state.theme).name});
}
function footer(){$('#footer').innerHTML=`<div class="site-footer"><div><div class="footer-brand">MANOR</div><p>제5인격 비공식 팬 가이드 · <a href="#v=patchnotes">${esc(releaseLabel(releaseLog))}</a><br>캐릭터 이미지 및 게임 저작권 © NetEase. 공식 서비스가 아닙니다.</p></div><div><p>공략 검토 ${db.meta.reviewedAt} · 상성 검토 ${db.meta.matchupReviewedAt||db.meta.reviewedAt}<br>게임 반영 ${esc(db.meta.gamePatchDate)} · 경기 자료 ${db.meta.recordLatest}<br>게임 공지는 확인 후 수동으로 반영합니다.</p></div><div class="footer-links"><a href="#v=recovery">복구 코드</a><a href="#v=patchnotes">MANOR 업데이트</a></div></div>`;}
function updateReleaseNotes(){const root=$('#release-results');if(root)root.innerHTML=releaseNotesList(releaseLog,releaseFilters);}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function title(e,h,d){return `<div class="page-title"><div class="eyebrow">${esc(e)}</div><h1>${esc(h)}</h1><p>${esc(d)}</p></div>`;}
function card(c){return `<button class="character-card" data-action="character" data-id="${c.id}" aria-label="${esc(c.name)}, ${esc(c.side)}, ${esc(specialtyLabels(c))}, 난이도 ${c.difficulty}/5 공략 보기"><div class="portrait-wrap">${portrait(c)}<span class="card-overlay"></span><span class="role-dot" title="메인 역할: ${esc(c.specialties[0])}">${primarySpecialtyIcon(c)}</span>${state.favorites.has(c.id)?`<span class="mini-star">${icon('star')}</span>`:''}</div><div class="card-info"><span class="card-name">${esc(c.name)}</span><span class="card-specialty">${specialtyTags(c,true)}</span><div class="card-bottom"><span>${esc(c.side)}</span>${difficulty(c.difficulty)}</div></div></button>`;}
function heroCarousel(){
 heroSession??=createCarouselSession(db.characters);
 return `<div class="hero-art hero-carousel" id="hero-carousel" role="region" aria-roledescription="캐러셀" aria-label="장원의 캐릭터" aria-describedby="hero-carousel-hint"><div class="hero-stage"><div class="art-orbit" aria-hidden="true"></div>${carouselItems(heroSession).map(({index,character:c})=>`<button class="art-card" type="button" data-id="${c.id}" data-index="${index}" aria-label="${esc(c.name)} 공략 보기" tabindex="${index===heroSession.index?0:-1}">${portrait(c,index===heroSession.index)}<span>${esc(c.name)}</span></button>`).join('')}</div><div class="hero-carousel-footer"><span id="hero-carousel-hint">드래그해서 둘러보기</span><div class="carousel-controls"><button type="button" class="carousel-control" data-carousel="previous" aria-label="이전 캐릭터">${icon('back')}</button><button type="button" class="carousel-control" data-carousel="toggle" aria-label="자동 넘김" aria-pressed="${heroSession.paused!==true}">${icon(heroSession.paused?'play':'pause')}</button><button type="button" class="carousel-control" data-carousel="next" aria-label="다음 캐릭터">${icon('arrow')}</button></div></div><span class="visually-hidden carousel-status" role="status" aria-live="polite" aria-atomic="true"></span></div>`;
}
function explore(){
 return `<section class="hero"><div><div class="eyebrow">A CLEARER WAY TO PLAY</div><h1>다음 한 수를,<br><span>더 선명하게.</span></h1><p>캐릭터의 가능성부터 상대의 빈틈까지.<br>흩어진 장원의 기록을, 당신의 플레이로 연결합니다.</p><div class="hero-actions"><a class="btn primary" href="#characters" data-action="scroll-characters">캐릭터 살펴보기 ${icon('arrow')}</a><a class="btn" href="#v=matchup">상대 대응 찾기 ${icon('swords')}</a></div></div>${heroCarousel()}</section>
 <div class="meta-strip"><span><strong>89</strong>캐릭터</span><span><strong>36</strong>감시자</span><span><strong>53</strong>생존자</span><a class="text-link push-right" href="#v=statistics">대회 · 랭킹전 통계 ↗</a></div>
 <section id="characters" class="scroll-target"><div class="section-heading"><div><h2>장원의 모든 얼굴</h2><p>당신의 캐릭터를 찾고, 한 단계 더 깊이 이해하세요.</p></div><span class="meta">36 감시자 · 53 생존자</span></div><div class="toolbar"><div class="segmented" aria-label="진영 필터">${['전체','감시자','생존자'].map(s=>`<button data-action="side" data-side="${s}" class="${state.side===s&&!state.favoriteOnly?'active':''}" aria-pressed="${state.side===s&&!state.favoriteOnly}">${s}</button>`).join('')}<button data-action="favorites" class="${state.favoriteOnly?'active':''}" aria-pressed="${state.favoriteOnly}">즐겨찾기</button></div><label class="search-box">${icon('search')}<input id="character-search" type="search" placeholder="캐릭터 검색" aria-label="캐릭터 이름 검색" maxlength="120" spellcheck="false" value="${esc(state.search)}" autocomplete="off"></label><select id="character-sort" class="filter-select push-right" aria-label="캐릭터 정렬">${characterSortOptions.map(([v,t])=>`<option value="${v}" ${state.sort===v?'selected':''}>${t}</option>`).join('')}</select></div><p class="search-help">본명·별명·초성·영문 자판으로도 검색할 수 있어요. <span>출시순은 글로벌 서버 기준입니다.</span></p>${specialtyFilters()}<div id="explorer-results"></div></section>
 <div class="quick-links"><a class="quick-link" href="#v=matchup">${icon('swords')}<div><strong>상대가 정해졌다면</strong><p>상황별 대응과 30초 브리핑</p></div></a><a class="quick-link" href="#v=bans">${icon('shield')}<div><strong>밴에서 읽는 다음 수</strong><p>생존자 밴 3개로 감시자 후보 탐색</p></div></a><a class="quick-link" href="#v=compare">${icon('compare')}<div><strong>두 선택 사이에서</strong><p>장단점과 대회·랭킹전 기록 비교</p></div></a></div>`;
}
function updateExplorer(){
 const list=sortCharacters(db.characters.filter(c=>(state.side==='전체'||c.side===state.side)&&(!state.specialty||c.specialties.includes(state.specialty))&&(!state.favoriteOnly||state.favorites.has(c.id))&&matchesCharacter(c,state.search)),state.sort);
 const root=$('#explorer-results');if(!root)return;
 root.innerHTML=`<p class="result-count" role="status">${list.length}명의 캐릭터${state.specialty?' · #'+esc(state.specialty):''}${state.favoriteOnly?' · 이 기기에 저장한 즐겨찾기':''}</p>${favoriteInsight(list)}${list.length?`<div class="character-grid">${list.map(card).join('')}</div>`:`<div class="empty">${icon(state.favoriteOnly?'star':'search')}<h3>${state.favoriteOnly?'아직 저장한 캐릭터가 없습니다.':'검색 결과가 없습니다.'}</h3><p>${state.favoriteOnly?'캐릭터 상세에서 별을 눌러 자주 찾는 캐릭터를 모아 보세요.':'이름이나 필터를 바꿔 다시 찾아보세요.'}</p><button class="btn small" data-action="reset-explore">전체 캐릭터 보기</button></div>`}`;
}
function favoriteInsight(list){
 if(!state.favoriteOnly)return '';
 const groups=['감시자','생존자'].map(side=>{
  const mine=list.filter(c=>c.side===side);if(mine.length<2)return '';
  const counts={};
  mine.forEach(c=>c.hard.forEach(m=>{if(byName[m.name]){counts[m.name]??=[];counts[m.name].push(c.name);}}));
  const overlap=Object.entries(counts).filter(([,names])=>names.length>=2).sort((a,b)=>b[1].length-a[1].length).slice(0,5);
  return `<div class="panel section-gap"><h2 class="panel-title">${icon('shield')}내 ${side} 풀의 공통 주의 상대</h2><p class="muted">저장한 ${mine.length}명의 표시된 어려운 상대를 함께 살펴봤습니다. 실제 승률이나 캐릭터 풀 전체의 안전성을 평가한 값은 아닙니다.</p>${overlap.length?`<div class="matchup-list section-gap">${overlap.map(([name,names])=>`<article class="panel relation-card">${characterHeading(byName[name])}<h4 class="small-heading">${names.length}명에게 공통으로 주의할 상대</h4><p class="relation-copy">${names.map(esc).join(' · ')}</p><p class="muted section-gap">각 캐릭터의 상성 카드에서 적용 상황을 확인하세요.</p></article>`).join('')}</div>`:'<div class="note section-gap">현재 표시된 상성에서 공통 주의 상대는 찾지 못했습니다. 근거가 없는 대진까지 유리하다는 뜻은 아닙니다.</div>'}</div>`;
 }).join('');
 return groups;
}
function listPanel(label,items,tone,ic){return `<div class="panel ${tone}"><h2 class="panel-title">${icon(ic)}${label}</h2><ul class="numbered-list">${items.map((t,i)=>`<li><span class="number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="numbered-copy">${esc(t)}</span></li>`).join('')}</ul></div>`;}
function characterPage(){
 const c=char(state.character);state.character=c.id;
 return `<a class="back-link" href="#v=explore">${icon('back')} 캐릭터 도감</a><section class="character-hero"><div class="tag-row character-hero-tags" aria-label="캐릭터 정보">${chip(c.side,'green')}${specialtyTags(c)}${chip('난이도 '+c.difficulty+'/5')}</div><div class="large-portrait">${portrait(c,true)}</div><h1>${esc(c.name)}</h1><p class="hero-detail" aria-label="캐릭터 간편 소개">${esc(c.introduction)}</p><div class="character-hero-meta"><span class="date-pill">${icon('clock')}공략 검토 ${esc(c.reviewedAt)}</span>${c.gamePatchDate?`<span class="date-pill">${icon('check')}게임 반영 ${esc(c.gamePatchDate)}</span>`:''}</div><div class="char-actions"><button class="btn ${state.favorites.has(c.id)?'favorite-on':''}" data-action="favorite" data-id="${c.id}" aria-pressed="${state.favorites.has(c.id)}">${icon('star')}<span>${state.favorites.has(c.id)?'저장됨':'즐겨찾기'}</span></button><button class="btn quiet share-btn" data-action="share" aria-label="${esc(c.name)} 공략 공유">${icon('share')}<span>공유</span></button><button class="btn primary" data-action="own-matchup" data-id="${c.id}"><span>상대 대응</span>${icon('arrow')}</button></div></section>
 <div class="tab-row character-tabs" role="group" aria-label="캐릭터 상세">${[['overview','한눈에 보기'],['matchups','상성'],['tips','유저 상대법'],['stats','통계']].map(([t,label])=>`<button data-action="character-tab" data-tab="${t}" class="${state.tab===t?'active':''}" aria-pressed="${state.tab===t}">${label}</button>`).join('')}</div>
 <div id="character-content">${state.tab==='overview'?characterOverview(c):state.tab==='matchups'?characterMatchups(c):state.tab==='tips'?'<div id="matchup-tips"></div>':'<div class="skeleton">대회와 랭킹전 통계를 준비하고 있습니다.</div>'}</div>`;
}
function characterHeading(c){return `<div class="character-heading"><button class="character-portrait" data-action="character" data-id="${c.id}" aria-label="${esc(c.name)} 공략 보기">${portrait(c)}</button><div class="character-identity"><h3 class="character-name"><a href="${route({v:'character',c:c.id})}">${esc(c.name)}</a></h3><div class="tag-row">${specialtyTags(c)}</div></div></div>`;}
function synergyCard(l){
 return `<div class="panel relation-card">${byName[l.target]?characterHeading(byName[l.target]):`<h3 class="panel-title">${esc(l.target)}</h3>`}<p>${esc(l.reason)}</p><div class="divider"></div><div class="small-heading">활용 조건</div><p class="muted">${esc(l.when)}</p><p class="muted section-gap">${esc(l.caution)}</p></div>`;
}
function characterOverview(c){
 const links=db.links.filter(r=>r.character===c.name).sort((a,b)=>a.order-b.order);
 return `<div class="specialty-summary"><span class="specialty-summary-icon">${primarySpecialtyIcon(c)}</span><div><h2>역할 태그</h2>${specialtyExplanation(c)}<small>메인 역할을 먼저, 서브 역할을 다음에 표시합니다.</small></div></div><div class="two-col">${listPanel('장점',c.strengths,'green','plus')}${listPanel('주의할 점',c.weaknesses,'warm','info')}</div><div class="two-col section-gap"><div class="panel"><h2 class="panel-title">${icon('spark')}기본 인격</h2>${personaBuild(c)}<p class="muted section-gap">${esc(c.personaReason)}</p><div class="divider"></div><div class="small-heading">이런 상황에서는 다른 선택</div><p>${esc(c.alternative)}</p><a class="text-link section-gap" href="${route({v:'character',c:c.id,tab:'stats'})}">대회에서 실제 선택한 인격 보기 →</a></div>${playGuide(c)}</div><section class="section-gap"><div class="heading-inline"><h2>${c.side==='생존자'?'함께하면 좋은 생존자':'보조 특성 선택'}</h2><span>역할과 상황에 따른 편집 추천</span></div><div class="three-col">${links.slice(0,3).map(synergyCard).join('')}</div>${links.length>3?`<details class="methodology section-gap"><summary>다른 조합 ${links.length-3}개 더 보기</summary><div class="three-col section-gap">${links.slice(3).map(synergyCard).join('')}</div></details>`:''}${c.side==='생존자'?`<a class="text-link section-gap" href="${route({v:'character',c:c.id,tab:'stats'})}">실제 동반 출전 빈도와 팀 결과 보기 →</a>`:''}</section>`;
}
function matchupItem(i){
 const c=byName[i.name];if(!c)return '';
 const [reason,...conditions]=String(i.reason||'').split(/\r?\n조건:\s*/);
 const contexts=contextEvidence(db.matchups,i.evidence);
 return `<article class="panel relation-card">${characterHeading(c)}<p class="relation-copy">${esc(reason)}</p>${conditions.length?`<div class="divider"></div><h4 class="small-heading">활용 조건</h4><p class="relation-copy muted">${esc(conditions.join('\n'))}</p>`:''}${contexts.map(m=>`<aside class="matchup-context"><h4 class="small-heading">다른 상황에서는</h4><p class="relation-copy">[${esc(m.situation)}] ${esc(m.summary)}</p><p class="relation-copy muted">조건: ${esc(m.condition)}</p></aside>`).join('')}</article>`;
}
function matchupLabel(c,kind){return `상대하기 ${kind==='hard'?'어려운':'쉬운'} ${c.side==='생존자'?'감시자':'생존자'}`;}
function characterMatchups(c){
 const item=m=>({name:c.side==='감시자'?m.survivor:m.hunter,reason:`[${m.situation}] ${m.summary}\n조건: ${m.condition}`,evidence:m.id});
 return `<div class="note has-icon">${icon('info')}<span>대괄호는 설명이 적용되는 상황입니다. [추격] 직접 쫓기는 상황 · [구출] 의자에서 구하기 · [커버] 동료 보호·풍선 구출 · [운영] 해독·회복·재정비. 다른 상황의 유불리는 별도 설명이나 반대쪽 목록에서 함께 확인하세요.</span></div><p class="muted small section-gap">상성 검토 ${esc(c.matchupReviewedAt)} · 상황 표기 정리 ${esc(db.meta.matchupSituationReviewedAt)}. 상황별 분석이며 대진 승률 순위가 아닙니다. 표기 정리는 모든 대진의 새로운 실전 검증을 뜻하지 않습니다.</p><div class="two-col section-gap">${['hard','easy'].map(kind=>{
 const all=characterEvidence(db.matchups,c,kind),selected=new Set(c[kind].map(i=>i.evidence)),rest=all.filter(m=>!selected.has(m.id));
 return `<section><div class="heading-inline matchup-section-heading"><h2>${matchupLabel(c,kind)}</h2><span>상황별 ${all.length}건</span></div><div class="matchup-list">${c[kind].map(matchupItem).join('')}${!all.length?'<div class="note">이 방향에서 확인된 상성 정보는 아직 없습니다. 통계 탭에서 실제 상대별 출전 기록을 함께 볼 수 있습니다.</div>':''}</div>${rest.length?`<details class="methodology section-gap"><summary>다른 상대·상황 ${rest.length}건 더 보기</summary><div class="matchup-list section-gap">${rest.map(m=>matchupItem(item(m))).join('')}</div></details>`:''}</section>`;
 }).join('')}</div><a class="text-link section-gap" href="${route({v:'character',c:c.id,tab:'stats'})}">실제 대회의 상대별 결과·동반 조합 보기 →</a>`;
}
function commonFilters(scope){
 const f=scope==='bans'?state.banFilters:state.stats;
 return `<div class="toolbar common-filters"><label class="filter-label">기간<select class="filter-select" data-filter="days" data-scope="${scope}">${[[365,'최근 1년'],[90,'최근 90일'],[30,'최근 30일'],[0,'전체 보유 기록']].map(([v,t])=>`<option value="${v}" ${Number(f.days)===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="filter-label">맵<select class="filter-select" data-filter="map" data-scope="${scope}">${options(db.maps,f.map,'전체 맵')}</select></label><label class="filter-label">대회<select class="filter-select" data-filter="tournament" data-scope="${scope}">${options(['COA','IVL','IJL','IVC','IVT','IVS'],f.tournament,'전체 대회')}</select></label><span class="date-pill push-right">${icon('clock')}기록 최신 ${scope==='bans'?(state.banSource==='legacy'?db.meta.banLatest:db.meta.refresh?.observedBanLatest):db.meta.recordLatest}</span></div>`;
}
function resultChart(s){
 if(!s.results)return `<div class="note">확인된 경기 결과가 없습니다.</div>`;
 return `${s.results<50?`<p class="statistics-caption">적은 표본 · 결과 ${num(s.results)}경기. 한 경기로도 비율이 크게 달라질 수 있습니다.</p>`:''}<div class="stack-bar" role="img" aria-label="승 ${pct(s.win/s.results)}, 무승부 ${pct(s.draw/s.results)}, 패 ${pct(s.loss/s.results)}"><span class="stack-win" style="width:${s.win/s.results*100}%"></span><span class="stack-draw" style="width:${s.draw/s.results*100}%"></span><span class="stack-loss" style="width:${s.loss/s.results*100}%"></span></div><div class="bar-legend"><span><i class="stack-win"></i>승 ${pct(s.win/s.results)}</span><span><i class="stack-draw"></i>무 ${pct(s.draw/s.results)}</span><span><i class="stack-loss"></i>패 ${pct(s.loss/s.results)}</span></div>`;
}
function getStatisticsUI(){return statisticsUI||=createStatisticsUI({characters:db.characters,esc,num,portrait,icon,commonFilters});}
function statisticsParams(){const s=state.statistics;return {scope:s.scope,server:s.server,season:s.season,tier:s.tier,snap:s.snapshot,rs:s.side,sort:s.sort,order:s.direction,q:s.search,badge:s.badgeSnapshot};}
function syncStatisticsRoute(){
 if(!['statistics','compare'].includes(state.view)&&!(state.view==='character'&&state.tab==='stats'))return;
 const p={v:state.view,...statisticsParams(),days:state.stats.days,map:state.stats.map,tour:state.stats.tournament};
 if(state.view==='character'){p.c=state.character;p.tab='stats';}if(state.view==='compare'){p.a=state.a;p.b=state.b;}
 window.history?.replaceState(null,'',route(p));
}
function refreshStatistics(){
 const focused=document.activeElement,id=focused?.id,start=focused?.selectionStart,end=focused?.selectionEnd,y=window.scrollY;
 return render().then(()=>{syncStatisticsRoute();window.scrollTo(0,y);const input=id?document.getElementById?.(id):null;if(input){input.focus({preventScroll:true});if(typeof start==='number')input.setSelectionRange?.(start,end);}});
}
function statsPanel(c,rows,details=null,detailError=''){
 const s=statsFor(rows,c,state.stats),relations=tournamentRelations(rows,c,state.stats);
 return `${commonFilters('stats')}<div class="note">${c.side==='감시자'?'감시자':'생존자 팀'}의 대회 결과입니다. 같은 팀·대진의 기록에는 선수·밴픽·맵의 영향이 함께 포함됩니다. 최근 기간은 ${REFERENCE_DATE} 기준입니다.</div><div class="stats-grid"><div class="stat-box"><label>출전 경기</label><strong>${num(s.appearances)}</strong><small>경기</small></div><div class="stat-box"><label>팀 승률 · 무승부 포함</label><strong>${s.winRate===null?'—':pct(s.winRate)}</strong></div><div class="stat-box"><label>결과 확인</label><strong>${num(s.results)}</strong><small>${s.smallSample?'적은 표본':'경기'}</small></div></div><div class="panel"><div class="chart-heading"><h3>승 · 무 · 패</h3><small>${esc(c.name)} 관점</small></div>${resultChart(s)}<p class="statistics-caption">${num(s.win)}승 · ${num(s.draw)}무 · ${num(s.loss)}패. 결과 미확인 ${num(s.unknown)}경기는 비율에서 제외합니다.</p></div><div class="two-col section-gap"><section class="panel"><h2 class="panel-title">${icon('swords')}${c.side==='감시자'?'상대 팀에 포함된 생존자':'상대한 감시자'}</h2><p class="statistics-caption">1:1 추격 승률이 아닌 해당 대진의 팀 결과입니다.</p>${relationTable(relations.opponents,'상대')}</section><section class="panel"><h2 class="panel-title">${icon(c.side==='생존자'?'globe':'chart')}${c.side==='생존자'?'함께 출전한 생존자':'맵별 결과'}</h2><p class="statistics-caption">${c.side==='생존자'?'동반 출전 빈도와 팀 결과입니다. 승률 상승 효과를 측정한 값은 아닙니다.':'같은 기간·대회·맵 필터를 적용한 결과입니다.'}</p>${relationTable(c.side==='생존자'?relations.companions:relations.maps,c.side==='생존자'?'동료':'맵')}</section></div>${c.side==='생존자'?`<details class="methodology section-gap"><summary>맵별 출전·결과 보기</summary>${relationTable(relations.maps,'맵')}</details>`:''}${details?observationPanel(c,details):detailError?`<div class="note section-gap">${esc(detailError)} <button class="btn small" data-action="retry">다시 불러오기</button></div>`:''}`;
}
function relationTable(rows,label){
 if(!rows.length)return '<p class="muted">선택한 조건의 기록이 없습니다. 기간·맵·대회를 넓혀 보세요.</p>';
 const table=items=>`<div class="insight-table-wrap" tabindex="0" role="region" aria-label="${esc(label)}별 기록 표 · 가로로 스크롤"><table class="insight-table"><thead><tr><th scope="col">${esc(label)}</th><th scope="col">출전</th><th scope="col">승·무·패</th><th scope="col">팀 승률</th></tr></thead><tbody>${items.map(r=>{const c=byId[r.id];return `<tr><th scope="row">${c?`<a class="insight-character" href="${route({v:'character',c:c.id})}">${portrait(c)}<span>${esc(c.name)}</span></a>`:esc(r.id)}</th><td>${num(r.appearances)}<small>${pct(r.share)}</small></td><td>${r.win}·${r.draw}·${r.loss}<small>결과 ${num(r.results)}</small></td><td>${r.winRate===null?'—':pct(r.winRate)}${r.results>0&&r.results<50?'<small>적은 표본</small>':''}</td></tr>`;}).join('')}</tbody></table></div>`;
 return `${table(rows.slice(0,8))}${rows.length>8?`<details class="insight-more"><summary>나머지 ${rows.length-8}개 기록 보기</summary>${table(rows.slice(8))}</details>`:''}<p class="statistics-caption">출전 아래 비율은 이 캐릭터의 조건 내 출전 중 비중입니다.</p>`;
}
function observationPanel(c,data){
 const o=observedDetails(data.rows,c,state.stats);
 if(!o.appearances)return `<div class="panel section-gap"><h2 class="panel-title">${icon('spark')}인격·개인 기록</h2><p class="muted">선택한 조건에는 상세 중계 기록이 없습니다. 전체 출전 통계와 공개 인격의 수집 범위는 다릅니다.</p></div>`;
 const build=b=>`<div class="observed-build"><div class="observed-talents">${b.talents.map(name=>`<span>${personaTalents[name]?`<img src="assets/persona/${personaTalents[name].id}.png" alt="" width="32" height="32" loading="lazy">`:''}${esc(name)}</span>`).join('')}</div><strong>${pct(b.share)}<small>${num(b.count)}회${b.talents.length<2?' · 1종 기재':''}</small></strong></div>`;
 const metric=(key,label,format)=>{const m=o.metrics[key];return `<div><span>${label}</span><strong>${m.mean===null?'—':format(m.mean)}</strong><small>기록 ${num(m.count)}건</small></div>`;};
 return `<section class="panel section-gap"><div class="heading-inline"><h2 class="panel-title">${icon('spark')}대회에서 선택한 인격</h2><span>기재 ${num(o.talentSamples)} / 상세 ${num(o.appearances)}경기</span></div><p class="statistics-caption">위 필터와 같은 조건입니다. 공개 원문에 적힌 최종 인격만 집계하며, 미기재를 미선택으로 처리하지 않습니다.</p>${o.builds.length?o.builds.slice(0,5).map(build).join(''):'<p class="muted">이 캐릭터의 인격 선택은 원문에 기재되지 않았습니다.</p>'}${o.builds.length>5?`<details class="insight-more"><summary>다른 인격 조합 ${o.builds.length-5}개</summary>${o.builds.slice(5).map(build).join('')}</details>`:''}${c.side==='생존자'?`<h3 class="small-heading section-gap">함께 공개된 개인 기록</h3><div class="observation-metrics">${metric('kite','평균 견제 시간',n=>Math.round(n)+'초')}${metric('decode','평균 해독 진도',n=>n.toFixed(1)+'%')}${metric('rescues','평균 구출',n=>n.toFixed(2)+'회')}${metric('escaped','개인 탈출률',pct)}</div><p class="statistics-caption">개인 탈출은 원문 탈출 표시와 팀 탈출 수가 일치한 경기만 사용합니다. 100% 해독은 암호 장치 한 대 분량이며, 역할·선수·경기 길이의 영향을 받습니다.</p>`:''}</section>`;
}
function selectionCard(c,mode,kicker,placeholder='캐릭터 선택'){return `<button class="selection-card" data-action="picker" data-mode="${mode}" aria-label="${esc(kicker)} ${c?esc(c.name):placeholder} 변경">${c?portrait(c):`<span class="placeholder">${icon('plus')}</span>`}<div><p class="kicker">${esc(kicker)}</p><h2>${c?esc(c.name):placeholder}</h2>${c?`<div class="tag-row">${specialtyTags(c)}</div>`:''}</div></button>`;}
function selectionSwap(mode,disabled=false){
 const label=mode==='matchup'?'내 캐릭터와 상대 캐릭터 맞바꾸기':'캐릭터 A와 B 맞바꾸기';
 return `<div class="selection-middle"><button class="icon-btn selection-swap" data-action="swap-selection" data-mode="${mode}" aria-label="${label}" title="${disabled?'두 캐릭터를 선택하면 맞바꿀 수 있어요.':label}" ${disabled?'disabled':''}>${icon('swap')}</button><span class="selection-swap-label" aria-hidden="true">맞바꾸기</span></div>`;
}
function cleanCondition(t){return String(t||'').replace(/추가 공개 자료 \d+문서: 오른쪽 P:S 및 \[커뮤니티 근거\] 참조\.?/g,'').trim();}
function matchupPage(){
 const own=char(state.own);state.own=own.id;const opp=byId[state.opponent];
 const allEvidence=opp?pairEvidence(db.matchups,own,opp):[],evidence=opp?pairEvidence(db.matchups,own,opp,state.situation):[],situations=['추격','구출','커버','운영'].filter(s=>allEvidence.some(e=>e.situation.split('·').includes(s)));
 if(state.situation&&!situations.includes(state.situation)&&allEvidence.some(e=>e.situationDetail===state.situation))situations.push(state.situation);
 return `${title('MATCHUP STUDIO','상대가 보이면, 선택도 보입니다.','내 캐릭터와 상대를 선택하고, 상황별 상성과 대응 방법을 확인하세요.')}<div class="selection-board">${selectionCard(own,'own','내 캐릭터')}${selectionSwap('matchup',!opp)}${selectionCard(opp,'opponent','상대 캐릭터','상대 선택')}</div>
 ${!opp?`<div class="empty">${icon('swords')}<h3>상대할 캐릭터를 선택해주세요.</h3><p>상황별 상성, 경계할 스킬, 추격·구출 대응을 한 화면으로 정리합니다.</p><button class="btn primary" data-action="picker" data-mode="opponent">상대 선택 ${icon('plus')}</button></div>`:
 `<div class="briefing-header"><div><div class="eyebrow">30 SECOND BRIEFING</div><h2>${esc(own.name)} → ${esc(opp.name)}</h2></div><button class="btn small share-btn" data-action="share" aria-label="현재 대진 공유">${icon('share')}<span>공유</span></button></div><div class="briefing"><article class="brief-card"><div class="brief-step">01 · 먼저 볼 것 ${icon('search')}</div><h3>경계할 핵심 스킬</h3><p>${esc(opp.skill)}</p></article><article class="brief-card"><div class="brief-step">02 · 움직이는 방법 ${icon('arrow')}</div><h3>상대에게 대응하기</h3><p>${esc(opp.response)}</p></article><article class="brief-card"><div class="brief-step">03 · 남겨 둘 자원 ${icon('clock')}</div><h3>내 스킬을 아낄 때</h3><p>${esc(own.hold)}</p></article></div><div class="note section-gap">브리핑은 상대 공통 대응과 내 캐릭터의 운영 요약입니다. 두 캐릭터의 상황별 상성과 적용 조건을 함께 확인하세요.</div>
 <section class="section-gap"><div class="section-heading"><div><h2>상황이 바뀌면, 상성도 바뀝니다.</h2><p>추격·구출·커버·운영에서의 유불리를 구분해 확인하세요.</p></div>${situations.length?`<select id="situation-filter" class="filter-select" aria-label="상성 상황 필터">${options(situations,state.situation,'모든 상황')}</select>`:''}</div>${evidence.length?evidence.map(e=>`<article class="evidence-card"><div class="tag-row">${chip(e.situation)}${chip(e.advantage+'의 기회',e.advantage===own.name?'green':'warm')}${e.situationDetail&&e.situationDetail!==e.situation?chip(e.situationDetail):''}</div><h3>[${esc(e.situation)}] ${esc(e.summary)}</h3><p>${esc(cleanCondition(e.condition))}</p></article>`).join(''):`<div class="empty">${icon('book')}<h3>이 대진에서 확인된 상성 정보가 없습니다.</h3><p>일반 대응은 참고할 수 있지만, 유리·불리한 상성으로 확정하지 않습니다.</p></div>`}</section>
 <div class="two-col section-gap"><div class="panel"><h2 class="panel-title">${icon('spark')}상대 대응 팁</h2>${opp.tips.map((t,i)=>`<p class="prose ${i?'section-gap':''}">${esc(t)}</p>`).join('')}</div><div class="panel"><h2 class="panel-title">${icon('shield')}내 인격 기준</h2>${personaBuild(own)}<p class="muted section-gap">${esc(own.personaReason)}</p><div class="divider"></div><p class="muted">대진 전용 최적화로 검증된 추천은 아닙니다. 팀 역할·맵·시작 위치에 맞춰 조정하세요.</p></div></div>`}`;
}
function miniCharacters(items){if(!items.length)return '<p class="muted small">충분히 뒷받침되는 상대가 없습니다.</p>';return `<div class="thumb-row">${items.filter(i=>byName[i.name]).map(i=>{const c=byName[i.name];return `<button class="mini-character" data-action="character" data-id="${c.id}">${portrait(c)}<span>${esc(c.name)}</span></button>`;}).join('')}</div>`;}
function compareColumn(c,rows){
 const s=statsFor(rows,c,state.stats);
 return `<div class="compare-column"><div class="panel"><div class="compare-header">다루는 난이도</div><div class="compare-stars"><strong>${c.difficulty} <small>/ 5</small></strong>${difficulty(c.difficulty)}</div><p class="muted">${esc(c.difficultyReason)}</p></div>${getStatisticsUI().compareCharacter(c,{data:rankedData,settings:state.statistics,tournament:s})}${listPanel('장점',c.strengths,'green','plus')}${listPanel('단점',c.weaknesses,'warm','info')}<div class="panel"><h2 class="panel-title">${icon('spark')}기본 인격</h2>${personaBuild(c)}<p class="muted section-gap">${esc(c.personaReason)}</p></div><div class="panel"><h2 class="panel-title">${matchupLabel(c,'hard')}</h2>${miniCharacters(c.hard)}<div class="divider"></div><h2 class="panel-title">${matchupLabel(c,'easy')}</h2>${miniCharacters(c.easy)}<p class="muted small section-gap">상성 검토 ${esc(c.matchupReviewedAt||c.reviewedAt)}. 상세에서 적용 상황을 확인하세요.</p></div></div>`;
}
function comparePage(rows){const a=char(state.a),b=char(state.b,'붉은 나비');state.a=a.id;state.b=b.id;return `${title('SIDE BY SIDE','두 선택을, 같은 기준으로.','같은 진영의 두 캐릭터를 비교합니다. 난이도와 장단점, 대회·랭킹전 통계를 함께 보세요.')}<div class="selection-board">${selectionCard(a,'compare-a','캐릭터 A')}${selectionSwap('compare')}${selectionCard(b,'compare-b','캐릭터 B')}</div>${getStatisticsUI().scopeSwitch(state.statistics.scope)}${state.statistics.scope!=='ranked'?commonFilters('compare'):''}${state.statistics.scope!=='tournament'?getStatisticsUI().rankFilters(rankedData,state.statistics):''}<div class="note">대회와 랭킹전은 각각의 집계 조건으로 비교합니다. 승률에는 실력·조합·맵·밴픽의 영향이 포함됩니다.${rankedError?' '+esc(rankedError):''}</div><div class="compare-grid section-gap">${compareColumn(a,rows)}${compareColumn(b,rows)}</div>`;}
function banPage(rows){
 const r=rankBans(rows,state.bans,state.banFilters);
 return `${title('DRAFT LENS','밴에서 읽는, 다음 한 수.','감시자가 밴한 생존자를 최대 3명 선택하세요. 같은 밴이 관측된 대회 기록에서 대비할 감시자를 찾습니다.')}<div class="ban-slots">${state.bans.map((id,i)=>{const c=byId[id];return `<div class="ban-slot"><button data-action="picker" data-mode="ban-${i}" aria-label="생존자 밴 ${i+1} ${c?esc(c.name):'선택'}"><span class="label">SURVIVOR BAN 0${i+1}</span>${c?portrait(c):`<span class="slot-empty">${icon('plus')}</span>`}<strong>${c?esc(c.name):'생존자 선택'}</strong></button>${c?`<button class="remove" data-action="remove-ban" data-index="${i}" aria-label="밴 ${i+1} ${esc(c.name)} 선택 해제">${icon('close')}<span>선택 해제</span></button>`:''}</div>`;}).join('')}</div><label class="filter-label section-gap">밴 기록 범위<select id="ban-source" class="filter-select"><option value="observed" ${state.banSource==='observed'?'selected':''}>최근 수집 · 공개 전체 밴</option><option value="legacy" ${state.banSource==='legacy'?'selected':''}>기존 보관 · 생존자 선밴</option></select></label><p class="statistics-caption">${state.banSource==='observed'?'2025 가을·2026 여름 IJL, 2026 여름·가을 IVL. 원문에 기재된 전체 생존자 밴이며 선밴만을 뜻하지 않습니다.':'기존에 수록한 생존자 선밴 기록입니다.'} 두 자료는 밴 단계와 수집 범위가 달라 합산하지 않습니다.</p>${commonFilters('bans')}<details><summary>이미 제외된 감시자 설정</summary><div class="toolbar section-gap">${[0,1].map(i=>`<label class="filter-label">제외 감시자 ${i+1}<select class="filter-select" data-filter="excluded-${i}" data-scope="bans">${options(db.characters.filter(c=>c.side==='감시자').map(c=>c.name),byId[state.banFilters.excluded[i]]?.name,'없음')}</select></label>`).join('')}</div></details>
 ${r.error?`<div class="empty section-gap">${icon('shield')}<h3>${esc(r.error)}</h3><p>선택하지 않은 칸은 비워 두면 됩니다. 중복된 캐릭터는 선택할 수 없습니다.</p></div>`:`<div class="stats-grid"><div class="stat-box"><label>조건에 맞는 기본 기록</label><strong>${num(r.base)}</strong><small>판</small></div><div class="stat-box"><label>선택한 밴이 모두 일치</label><strong>${num(r.matched)}</strong><small>판</small></div><div class="stat-box"><label>표본 상태</label><strong style="font-size:22px">${r.matched===0?'기록 없음':r.matched<30?'적은 표본':'30판 이상'}</strong></div></div>${r.matched<30?`<div class="note warm has-icon">${icon('info')}<span>${r.matched===0?'일치 기록이 없어 후보를 제시하지 않습니다. 기간·맵·대회 조건을 넓혀 보세요.':'일치 표본이 적습니다. 특정 선수·팀·시즌의 밴 성향이 크게 반영될 수 있습니다.'}</span></div>`:''}${r.ranks.length?`<section class="section-gap"><div class="heading-inline"><h2>우선 대비할 감시자</h2><button class="btn small share-btn" data-action="share" aria-label="밴 분석 공유">${icon('share')}<span>공유</span></button></div><div class="rank-list">${r.ranks.map((x,i)=>{const c=byId[x.id];return `<article class="rank-card"><span class="rank-num">0${i+1}</span><button data-action="character" data-id="${c.id}" aria-label="${esc(c.name)} 공략">${portrait(c)}</button><div><h3>${esc(c.name)}</h3><p>일치 ${x.count}판 · 관측 비중 ${pct(x.share)}</p><p>조건 내 기본 비중 ${pct(x.baseline)}</p></div><div class="rank-score"><strong>${pct(x.score)}</strong><small> 보정점수</small><div class="horizontal-bar"><i style="width:${x.score/r.ranks[0].score*100}%"></i></div></div></article>`;}).join('')}</div></section>`:''}`}
 <div class="note section-gap">보정점수는 후보를 정렬하는 지표입니다. 일반 랭크에서 해당 감시자를 만날 확률이 아닙니다. 세트 구분 없이 유효한 전체 세트 기록을 사용합니다.</div>`;
}
function loadError(e){return `<div class="empty">${icon('info')}<h3>자료를 불러오지 못했습니다.</h3><p>${esc(e.message)} 연결 상태를 확인하고 다시 시도하세요.</p><button class="btn primary" data-action="retry">다시 시도</button></div>`;}
async function render({scroll=false}={}){
 disposeHeroCarousel();disposeHeroCarousel=()=>{};disposeFeedback();disposeFeedback=()=>{};disposeMatchupTips();disposeMatchupTips=()=>{};disposeCreators();disposeCreators=()=>{};disposeRecovery();disposeRecovery=()=>{};
 const token=++renderToken;header();footer();if(scroll)window.scrollTo({top:0,behavior:'instant'});
 document.title=`${state.view==='character'?char(state.character).name:({explore:'캐릭터 도감',matchup:'매치업',compare:'캐릭터 비교',bans:'밴 분석',statistics:'통계',creators:'유튜브 채널 BETA',feedback:'피드백',recovery:'복구 코드',patchnotes:'MANOR 업데이트'}[state.view])} · MANOR`;
 $('#main').innerHTML='<div class="shell"><div class="page" id="page-body"></div></div>';const body=$('#page-body');
 if(state.view==='explore'){body.innerHTML=explore();updateExplorer();disposeHeroCarousel=mountHeroCarousel($('#hero-carousel'),heroSession,{onSelect:id=>navigate({v:'character',c:id}),icon});}
 else if(state.view==='character'){body.innerHTML=characterPage();if(state.tab==='tips')disposeMatchupTips=mountMatchupTips($('#matchup-tips'),{characters:byId,ownId:state.character});if(state.tab==='stats'){
  const [t,r,d]=await Promise.allSettled([loadMatches(),loadRanked(),loadDetails()]);if(token!==renderToken)return;
  rankedError=r.status==='rejected'?r.reason.message:'';
  $('#character-content').innerHTML=getStatisticsUI().character(char(state.character),{data:r.status==='fulfilled'?r.value:null,settings:state.statistics,tournamentHTML:t.status==='fulfilled'?statsPanel(char(state.character),t.value,d.status==='fulfilled'?d.value:null,d.status==='rejected'?d.reason.message:''):loadError(t.reason),rankError:rankedError});
 }}
 else if(state.view==='statistics'){
  body.innerHTML='<div class="loading-screen"><span class="loading-orbit" aria-hidden="true"></span><p>대회와 랭킹전의 기록을 펼치고 있습니다.</p></div>';
  const [t,b,r]=await Promise.allSettled([loadMatches(),loadBans(),loadRanked()]);if(token!==renderToken)return;
  body.innerHTML=getStatisticsUI().page({data:r.status==='fulfilled'?r.value:null,matches:t.status==='fulfilled'?t.value:[],bans:b.status==='fulfilled'?b.value:[],settings:state.statistics,tournamentFilters:state.stats,errors:{tournament:t.status==='rejected'?t.reason.message:b.status==='rejected'?b.reason.message:'',ranked:r.status==='rejected'?r.reason.message:''}});
 }
 else if(state.view==='matchup'){
  body.innerHTML=matchupPage();
  const own=char(state.own),opp=byId[state.opponent];
  if(opp){
   body.innerHTML+='<div id="matchup-tips"></div><section class="panel section-gap" id="pair-observations"><p class="muted">대회의 같은 대진을 불러오고 있습니다.</p></section>';
   disposeMatchupTips=mountMatchupTips($('#matchup-tips'),{characters:byId,ownId:own.id,opponentId:opp.id});
   try{const rows=await loadMatches();if(token!==renderToken)return;const s=statsFor(rows,own,{...state.stats,opponent:opp.id});
    $('#pair-observations').innerHTML=`<h2 class="panel-title">${icon('chart')}대회에서 만난 두 캐릭터</h2>${commonFilters('matchup')}<p class="muted">${esc(own.name)} 관점 · 출전 ${num(s.appearances)}경기 · 결과 ${num(s.results)}경기</p>${resultChart(s)}<p class="statistics-caption">${num(s.win)}승 · ${num(s.draw)}무 · ${num(s.loss)}패. 해당 생존자가 팀에 포함된 경기 결과이며, 개인 추격 승률이나 위 상성 설명의 검증 점수가 아닙니다.</p>`;
   }catch(e){if(token===renderToken)$('#pair-observations').innerHTML=loadError(e);}
  }
 }
 else if(state.view==='recovery'){disposeRecovery=mountRecoveryPage(body);}
 else if(state.view==='patchnotes')body.innerHTML=releaseNotesPage(releaseLog,releaseFilters,{icon});
 else if(state.view==='creators'){disposeCreators=mountCreators(body,{characters:byId,postId:state.creatorPost,navigate:id=>navigate({v:'creators',...(id?{channel:id}:{})})});}
 else if(state.view==='feedback'){disposeFeedback=mountFeedback(body,{characters:byId,postId:state.feedbackPost,navigate:id=>navigate({v:'feedback',...(id?{post:id}:{})})});}
 else{body.innerHTML='<div class="loading-screen"><span class="loading-orbit" aria-hidden="true"></span><p>조건에 맞는 기록을 준비하고 있습니다.</p></div>';try{const rows=await(state.view==='bans'?(state.banSource==='legacy'?loadBans():loadObservedBans()):loadMatches());if(state.view==='compare'){try{await loadRanked();}catch(e){rankedError=e.message;}}if(token!==renderToken)return;body.innerHTML=state.view==='bans'?banPage(rows):comparePage(rows);}catch(e){if(token===renderToken)body.innerHTML=loadError(e);}}
}
function openPicker(mode='jump'){
 let side='',excluded=[],heading='캐릭터 빠른 검색';
 if(mode==='opponent'){side=char(state.own).side==='감시자'?'생존자':'감시자';heading='상대 캐릭터 선택';}
 if(mode==='own')heading='내 캐릭터 선택';
 if(mode==='compare-a')heading='캐릭터 A 선택';
 if(mode==='compare-b'){heading='캐릭터 B 선택';side=char(state.a).side;excluded=[state.a];}
 if(mode.startsWith('ban-')){side='생존자';const idx=Number(mode.split('-')[1]);excluded=state.bans.filter((x,i)=>x&&i!==idx);heading=`생존자 밴 ${idx+1}`;}
 pickerContext={mode,side,excluded,sort:'release'};$('#picker').innerHTML=`<div class="dialog-head"><div class="dialog-title"><h2>${heading}</h2><button class="icon-btn" data-action="close-dialog" data-dialog="picker" aria-label="선택 창 닫기">${icon('close')}</button></div><div class="picker-toolbar"><label class="search-box">${icon('search')}<input id="picker-search" type="search" aria-label="캐릭터 이름 검색" placeholder="캐릭터 검색" autocomplete="off" maxlength="120" spellcheck="false"></label><label class="picker-sort"><select id="picker-sort" class="filter-select" aria-label="검색 결과 정렬">${characterSortOptions.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label></div><p class="search-help">초성·영문 자판도 지원해요. 출시순은 글로벌 서버 기준입니다.</p></div><div class="dialog-body"><div id="picker-results"></div></div>`;updatePicker('');$('#picker').showModal();$('#picker-search').focus();
}
function updatePicker(q){const list=sortCharacters(db.characters.filter(c=>(!pickerContext.side||c.side===pickerContext.side)&&!pickerContext.excluded.includes(c.id)&&matchesCharacter(c,q)),pickerContext.sort);$('#picker-results').innerHTML=`<p class="result-count" role="status" aria-live="polite">${list.length}명${pickerContext.side?' · '+pickerContext.side:''}</p><div class="picker-grid">${list.map(c=>`<button class="pick-option" data-action="pick" data-id="${c.id}">${portrait(c)}<span>${esc(c.name)}</span></button>`).join('')}</div>${!list.length?'<div class="empty"><p>일치하는 캐릭터가 없습니다.</p></div>':''}`;}
function selectCharacter(id){
 const m=pickerContext.mode;$('#picker').close();
 if(m==='jump'){navigate({v:'character',c:id});return;}
 if(m==='own'){state.own=id;if(byId[state.opponent]?.side===byId[id].side)state.opponent='';state.situation='';navigate({v:'matchup',own:id,...(state.opponent?{opp:state.opponent}:{})});return;}
 if(m==='opponent'){state.opponent=id;state.situation='';navigate({v:'matchup',own:state.own,opp:id});return;}
 if(m==='compare-a'){state.a=id;if(byId[state.b]?.side!==byId[id].side||state.b===id)state.b=db.characters.find(c=>c.side===byId[id].side&&c.id!==id).id;navigate({v:'compare',a:id,b:state.b});return;}
 if(m==='compare-b'){state.b=id;navigate({v:'compare',a:state.a,b:id});return;}
 if(m.startsWith('ban-')){state.bans[Number(m.split('-')[1])]=id;navigate({v:'bans',bans:state.bans.join(',')});}
}
function currentViewParams(){
 const p={v:state.view};if(state.view==='character'){p.c=state.character;p.tab=state.tab;}if(state.view==='matchup'){p.own=state.own;if(state.opponent)p.opp=state.opponent;}if(state.view==='compare'){p.a=state.a;p.b=state.b;}if(state.view==='bans')p.bans=state.bans.join(',');
 if(['bans','compare'].includes(state.view)||(state.view==='character'&&state.tab==='stats')){const f=state.view==='bans'?state.banFilters:state.stats;p.days=f.days;p.map=f.map;p.tour=f.tournament;if(state.view==='bans'){p.ex=f.excluded.filter(Boolean).join(',');p.banSource=state.banSource;}}
 if(state.view==='statistics'){p.days=state.stats.days;p.map=state.stats.map;p.tour=state.stats.tournament;}
 if(['statistics','compare'].includes(state.view)||(state.view==='character'&&state.tab==='stats'))Object.assign(p,statisticsParams());
 if(state.view==='matchup')p.situation=state.situation;
 return p;
}
async function share(){
 const p=currentViewParams();
 const url=location.origin+location.pathname+route(p);
 if(typeof navigator.share==='function'){
  try{await navigator.share({title:document.title,url});return;}
  catch(error){if(error?.name==='AbortError'||error?.name==='InvalidStateError')return;}
 }
 try{await navigator.clipboard.writeText(url);toast('공유 링크를 복사했습니다.');}
 catch{$('#share-dialog').innerHTML=`<div class="dialog-head"><div class="dialog-title"><h2>공유</h2><button class="icon-btn" data-action="close-dialog" data-dialog="share-dialog" aria-label="공유 창 닫기">${icon('close')}</button></div></div><div class="dialog-body"><p>공유할 링크를 길게 누르거나 선택해 복사하세요.</p><input class="share-link-input" aria-label="공유 링크" value="${esc(url)}" readonly></div>`;$('#share-dialog').showModal();$('#share-dialog input').focus();$('#share-dialog input').select();}
}
function openThemePicker(){
 const dialog=$('#theme-picker');
 dialog.innerHTML=`<div class="dialog-head"><div class="dialog-title"><h2 id="theme-title">${icon('palette')}컬러 테마</h2><button class="icon-btn" data-action="close-dialog" data-dialog="theme-picker" aria-label="테마 선택 창 닫기">${icon('close')}</button></div><p>나의 장원, 나의 색.</p></div><div class="theme-options" role="radiogroup" aria-label="컬러 테마 선택">${themeOptions(state.theme,icon('check'))}</div><p class="theme-status" id="theme-status" role="status">${resolveTheme(state.theme).name} 테마 사용 중 · 선택한 테마는 자동으로 저장돼요.</p>`;
 dialog.showModal();
 dialog.querySelector('input:checked')?.focus();
}
function selectColorTheme(id){
 if(!colorThemes.some(theme=>theme.id===id))return;
 const {theme,saved}=applyTheme(id,{document,storage:themeStorage});
 state.theme=theme.id;header();
 $('#theme-status').textContent=theme.name+' 테마 사용 중 · '+(saved?'다음 방문에도 유지돼요.':'브라우저에서 저장을 허용하지 않아 이번 방문에만 적용돼요.');
}
async function swapSelections(mode){
 if(mode!==state.view||!['matchup','compare'].includes(mode))return;
 const matchup=mode==='matchup',left=byId[matchup?state.own:state.a],right=byId[matchup?state.opponent:state.b];
 if(!left||!right||left.id===right.id||(matchup?left.side===right.side:left.side!==right.side))return;
 const params=currentViewParams(),scrollY=window.scrollY;
 if(matchup){params.own=right.id;params.opp=left.id;}else{params.a=right.id;params.b=left.id;}
 const next=route(params);
 // Keep the selection board in place; history and shared URLs retain the new order and filters.
 window.history.pushState(null,'',next);readRoute();
 await render();
 if(location.hash!==next)return;
 window.scrollTo({top:scrollY,behavior:'instant'});
 $('[data-action="swap-selection"]')?.focus({preventScroll:true});
 toast(`${right.name} · ${left.name} 순서로 맞바꿨어요.`);
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||!db)return;const a=b.dataset.action;
 if(a==='scroll-characters'){e.preventDefault();$('#characters')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return;}
 if(a==='character')navigate({v:'character',c:b.dataset.id});
 if(a==='theme')openThemePicker();
 if(a==='global-search')openPicker();
 if(a==='side'){state.side=b.dataset.side;state.favoriteOnly=false;if(!availableSpecialties().includes(state.specialty))state.specialty='';const y=window.scrollY;render().then(()=>window.scrollTo(0,y));}
 if(a==='specialty'){state.specialty=availableSpecialties().includes(b.dataset.specialty)?b.dataset.specialty:'';document.querySelectorAll('[data-action="specialty"]').forEach(el=>{const active=el.dataset.specialty===state.specialty;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});updateExplorer();}
 if(a==='favorites'){state.favoriteOnly=!state.favoriteOnly;const y=window.scrollY;render().then(()=>window.scrollTo(0,y));}
 if(a==='reset-explore'){state.side='전체';state.specialty='';state.favoriteOnly=false;state.search='';render();}
 if(a==='favorite'){const id=b.dataset.id;if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id);try{localStorage.setItem('manor-favorites',JSON.stringify([...state.favorites]));}catch{toast('이 브라우저에서는 즐겨찾기를 저장할 수 없습니다.');}render();}
 if(a==='character-tab'){state.tab=b.dataset.tab;navigate({v:'character',c:state.character,tab:state.tab});}
 if(a==='own-matchup'){state.own=b.dataset.id;state.opponent='';state.situation='';navigate({v:'matchup',own:state.own});}
 if(a==='picker')openPicker(b.dataset.mode);
 if(a==='swap-selection')swapSelections(b.dataset.mode);
 if(a==='pick')selectCharacter(b.dataset.id);
 if(a==='close-dialog')$('#'+b.dataset.dialog).close();
 if(a==='share')share();
 if(a==='remove-ban'){state.bans[Number(b.dataset.index)]='';navigate({v:'bans',bans:state.bans.join(',')});}
 if(a==='statistics-scope'&&['all','tournament','ranked'].includes(b.dataset.value)){state.statistics.scope=b.dataset.value;refreshStatistics();}
 if(a==='statistics-side'&&['생존자','감시자'].includes(b.dataset.value)){state.statistics.side=b.dataset.value;refreshStatistics();}
 if(a==='statistics-sort'){const v=b.dataset.value;if(['pick','win','draw','loss','ban','appearances','name'].includes(v)){state.statistics.direction=state.statistics.sort===v&&state.statistics.direction==='desc'?'asc':'desc';state.statistics.sort=v;refreshStatistics();}}
 if(a==='retry')render();
});
document.addEventListener('input',e=>{if(!db)return;if(e.target.id==='release-search'){releaseFilters.query=e.target.value;updateReleaseNotes();}if(e.target.id==='statistics-search'){state.statistics.search=e.target.value;clearTimeout(statisticsSearchTimer);statisticsSearchTimer=setTimeout(refreshStatistics,220);}if(e.target.id==='character-search'){state.search=e.target.value;updateExplorer();}if(e.target.id==='picker-search')updatePicker(e.target.value);});
document.addEventListener('change',e=>{if(!db)return;const el=e.target;if(el.id==='ban-source'){state.banSource=el.value==='legacy'?'legacy':'observed';render();return;}if(el.name==='color-theme'){selectColorTheme(el.value);return;}if(el.id==='release-type'){releaseFilters.type=releaseTypes.includes(el.value)?el.value:'전체';updateReleaseNotes();return;}if(el.dataset.statFilter){const k=el.dataset.statFilter;if(['server','season','tier','snapshot','sort','badgeSnapshot'].includes(k)){state.statistics[k]=el.value;if(k==='server'){state.statistics.season='';state.statistics.snapshot='';}if(['season','tier'].includes(k))state.statistics.snapshot='';if(k==='sort')state.statistics.direction=el.value==='name'?'asc':'desc';refreshStatistics();}return;}if(el.id==='character-sort'){state.sort=el.value;updateExplorer();}if(el.id==='picker-sort'){pickerContext.sort=el.value;updatePicker($('#picker-search').value);}if(el.id==='situation-filter'){state.situation=el.value;render();}if(el.dataset.filter){const f=el.dataset.scope==='bans'?state.banFilters:state.stats,n=el.dataset.filter;if(n.startsWith('excluded-'))f.excluded[Number(n.split('-')[1])]=byName[el.value]?.id||'';else f[n]=n==='days'?Number(el.value):el.value;if(el.dataset.scope==='bans')render();else refreshStatistics();}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&db){e.preventDefault();if(!$('#picker').open&&!$('#theme-picker').open)openPicker();}});
for(const d of[$('#picker'),$('#share-dialog'),$('#theme-picker')])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
window.addEventListener('hashchange',()=>{if(!db||location.hash==='#characters')return;readRoute();render({scroll:true});});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&!e.target.dataset.fallback){e.target.dataset.fallback='true';e.target.src='fallback.svg';}},true);
async function boot(){try{
 const responses=await Promise.all([fetch('data.json?v=e5f1594eafaa'),fetch('specialties.json?v=e208be4a70ff'),fetch('introductions.json?v=6a5ab2a1154c'),fetch('releases.json?v=da733c32fe05')]);
 if(responses.some(r=>!r.ok))throw Error('사이트 자료를 불러오지 못했습니다.');
 const [data,specialties,introductions,releases]=await Promise.all(responses.map(r=>r.json()));
 if(releases.stage!=='BETA'||!releases.version||!releases.releases?.length)throw Error('사이트 버전 정보를 확인하지 못했습니다.');
 releaseLog=releases;db=data;Object.assign(db.meta,specialties.meta);
 for(const c of db.characters){const role=specialties.characters[c.id];if(!validSpecialties(c.side,role))throw Error('캐릭터 역할 태그 자료를 확인하지 못했습니다.');Object.assign(c,role);const introduction=introductions.characters[c.id];if(typeof introduction!=='string'||!introduction.trim())throw Error('캐릭터 소개 자료를 확인하지 못했습니다.');c.introduction=introduction;}
 byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));byName=Object.fromEntries(db.characters.map(c=>[c.name,c]));state.character=byName['블러디 퀸'].id;state.own=state.character;state.a=state.character;state.b=byName['붉은 나비'].id;readRoute();await render();
 }catch(e){$('#main').innerHTML=`<div class="shell"><div class="empty section-gap"><h1>장원의 기록을 불러오지 못했습니다.</h1><p>${esc(e.message)}</p><button class="btn primary" id="reload-app">다시 불러오기</button></div></div>`;$('#reload-app')?.addEventListener('click',()=>location.reload());}}
boot();
