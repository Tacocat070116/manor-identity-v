import {SERVER_LABELS,TIER_LABELS,METRIC_LABELS,selectRanked,sortStatistics,tournamentStatistics,rankedCharacter,cohortLabel,snapshotLabel,resultPercentages} from './statistics-model.js?v=f7a052d6be7b';

export function createStatisticsUI({characters,esc,num,portrait,icon,commonFilters}){
 const byId=Object.fromEntries(characters.map(c=>[c.id,c]));
 const percent=n=>Number.isFinite(n)?`${n.toFixed(1)}%`:'—';
 const select=(key,label,choices,value)=>`<label class="filter-label${key==='snapshot'?' statistics-snapshot-filter':''}">${label}<select class="filter-select" data-stat-filter="${key}">${choices.map(([v,t])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 function snapshotChoice(d){
  // The season has its own filter; retain the complete period without internal source IDs.
  const kind={daily:'일별',weekly:'주별','season-cumulative':'시즌 누적'}[d.periodKind];
  const start=d.periodStart,end=d.periodEnd||d.asOf;
  if(!kind||!end)return d.timeLabel||snapshotLabel(d);
  const date=value=>value.replaceAll('-','.');
  const period=start&&start!==end?date(start)+'–'+date(start.slice(0,4)===end.slice(0,4)?end.slice(5):end):date(end);
  return `${kind} · ${period}`;
 }
 const noData=(message='선택한 조건의 공개 통계가 없습니다.')=>`<div class="statistics-empty">${icon('chart')}<p>${esc(message)}</p></div>`;
 function scopeSwitch(scope){return `<div class="statistics-switch segmented" role="group" aria-label="통계 종류">${[['all','전체'],['tournament','대회'],['ranked','랭킹전']].map(([v,t])=>`<button type="button" data-action="statistics-scope" data-value="${v}" class="${scope===v?'active':''}" aria-pressed="${scope===v}">${t}</button>`).join('')}</div>`;}
 function rankFilters(data,filters){
  const s=selectRanked(data,filters);Object.assign(filters,s.filters);
  if(!s.dataset)return '';
  return `<div class="statistics-filters">${select('server','서버',s.servers.map(v=>[v,SERVER_LABELS[v]]),s.filters.server)}${select('season','시즌',s.seasons.map(v=>[v,v]),s.filters.season)}${select('tier','랭크',s.tiers.map(v=>[v,TIER_LABELS[v]]),s.filters.tier)}${s.snapshots.length>1?select('snapshot','자료 시점',s.snapshots.map(d=>[d.id,snapshotChoice(d)]),s.filters.snapshot):`<span class="date-pill">${icon('clock')}${esc(snapshotLabel(s.dataset))}</span>`}</div>`;
 }
 function resultBar(row){
  const rates=resultPercentages(row);if(!rates)return '';
  return `<div class="stack-bar statistics-result" role="img" aria-label="승 ${percent(rates[0])}, 무승부 ${percent(rates[1])}, 패 ${percent(rates[2])}">${rates.map((n,i)=>`<span class="stack-${['win','draw','loss'][i]}" style="width:${n}%"></span>`).join('')}</div><div class="bar-legend"><span><i class="stack-win"></i>승 ${percent(rates[0])}</span><span><i class="stack-draw"></i>무 ${percent(rates[1])}</span><span><i class="stack-loss"></i>패 ${percent(rates[2])}</span></div>`;
 }
 function metricCards(row,compact=false){return `<div class="statistics-metrics ${compact?'compact':''}">${['pick','win','draw','ban'].map(k=>`<div><span>${METRIC_LABELS[k]}</span><strong>${percent(row?.[k])}</strong></div>`).join('')}</div>`;}
 function cohortNote(d){
  if(!d)return '';
  const basis=[d.pickBasis==='selection-share'?'픽률 = 같은 진영의 전체 선택 중 해당 캐릭터의 비중. 생존자·감시자 각각 합계 약 100%.':'픽률 = 원문의 출현율. 분모가 다른 자료와 직접 합산하지 않습니다.',d.banBasis==='ban-selection-share'?'밴율 = 전체 밴 선택 중 해당 캐릭터의 비중. 밴된 경기의 비율과 다릅니다.':'밴율은 원문 값을 보존했습니다.'];
  return `${d.status==='needs-review'?'<div class="note warm">정정 확인이 필요한 과거 통계입니다. 정확성이 확인될 때까지 참고용으로만 살펴보세요.</div>':''}<div class="statistics-source"><span>${esc(cohortLabel(d))} · ${esc(d.timeLabel||snapshotLabel(d))}</span></div><p class="statistics-caption">${esc(basis.join(' '))} 수록 진영: ${esc((d.availableSides||[]).join(' · '))}.</p>`;
 }
 function table(rows,kind,settings){
  const filtered=sortStatistics(rows,settings);
  if(!filtered.length)return noData();
  const keys=['pick','win','draw','loss','ban',...(kind==='tournament'?['appearances']:[])];
  return `<div class="statistics-table-wrap" tabindex="0" role="region" aria-label="${kind==='ranked'?'랭킹전':'대회'} 캐릭터 통계 표 · 가로로 스크롤"><table class="statistics-table"><thead><tr><th scope="col">캐릭터</th>${keys.map(k=>`<th scope="col" aria-sort="${settings.sort===k?(settings.direction==='asc'?'ascending':'descending'):'none'}"><button type="button" data-action="statistics-sort" data-value="${k}">${METRIC_LABELS[k]}${settings.sort===k?(settings.direction==='asc'?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${filtered.map(r=>{const c=byId[r.id];return `<tr><th scope="row">${c?`<button class="statistics-character" data-action="character" data-id="${c.id}">${portrait(c)}<span>${esc(c.name)}${r.results!==undefined?`<small>결과 ${num(r.results)}경기${r.results<50?' · 적은 표본':''}</small>`:''}</span></button>`:`<span class="statistics-character">${esc(r.name)}</span>`}</th>${keys.map(k=>`<td${settings.sort===k?' class="statistics-sorted"':''}>${k==='appearances'?num(r.appearances):percent(r[k])}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div><p class="statistics-caption">${filtered.length}개 캐릭터 · —는 미공개·결과 없음·해당 없음이며, 0%와 다릅니다.</p>`;
 }
 function sharedFilters(settings){return `<div class="toolbar statistics-toolbar"><div class="segmented" role="group" aria-label="통계 진영">${['생존자','감시자'].map(v=>`<button data-action="statistics-side" data-value="${v}" class="${settings.side===v?'active':''}" aria-pressed="${settings.side===v}">${v}</button>`).join('')}</div><label class="search-box">${icon('search')}<input id="statistics-search" value="${esc(settings.search||'')}" placeholder="캐릭터 검색" aria-label="통계에서 캐릭터 검색" autocomplete="off"></label>${select('sort','정렬',['pick','win','draw','ban','name'].map(v=>[v,METRIC_LABELS[v]]),settings.sort)}</div>`;}
 function badgePanel(data,settings){
  if(settings.server!=='cn')return '';
  if(data?.badgesError)return `<p class="statistics-caption">${esc(data.badgesError)}</p>`;
  const ds=data?.badges||[];if(!ds.length)return '';
  const selected=ds.find(d=>d.id===settings.badgeSnapshot)||[...ds].sort((a,b)=>b.asOf.localeCompare(a.asOf))[0];
  const grouped=new Map();
  for(const r of selected.rows){if(r.side!==settings.side||!r.name.includes(settings.search||''))continue;const key=r.id||r.characterId;if(!grouped.has(key))grouped.set(key,{...r,id:key,positions:{}});grouped.get(key).positions[r.rankPosition]=r.score;}
  const positions=[1,10,11,100,101,300,301,500];
  return `<details class="statistics-coverage"${settings.badgeSnapshot?' open':''}><summary>중국 캐릭터 인지 점수 기록 · ${esc(selected.asOf)}</summary><p class="statistics-caption">공개 순위의 인지 점수입니다. 픽률·승률·경기 수를 뜻하지 않습니다.</p>${select('badgeSnapshot','기록 날짜',ds.map(d=>[d.id,d.asOf]),selected.id)}<div class="statistics-table-wrap section-gap" tabindex="0" role="region" aria-label="중국 캐릭터 인지 점수 표"><table class="statistics-table"><thead><tr><th scope="col">캐릭터</th>${positions.map(p=>`<th scope="col">${p}위</th>`).join('')}</tr></thead><tbody>${[...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(r=>`<tr><th scope="row"><button class="statistics-character" data-action="character" data-id="${r.id}">${portrait(byId[r.id])}<span>${esc(r.name)}</span></button></th>${positions.map(p=>`<td>${r.positions[p]==null?'—':num(r.positions[p])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
 }
 function page({data,matches,bans,settings,tournamentFilters,errors={}}){
  const ranked=selectRanked(data,settings),d=ranked.dataset;
  const tour=tournamentStatistics(matches||[],bans||[],characters,tournamentFilters);
  const count=data?.datasets.reduce((n,d)=>n+(d.rowCount??d.rows?.length??0),0)||0;
  const showRank=settings.scope!=='tournament',showTour=settings.scope!=='ranked';
  return `<div class="page-title"><div class="eyebrow">THE NUMBERS OF THE MANOR</div><h1>대회·랭킹전 통계</h1><p>캐릭터별 픽률·승률·밴율을 대회와 랭킹전으로 나눠 확인하세요. 자료에 따라 제공하는 항목이 다릅니다.</p></div>${scopeSwitch(settings.scope)}<div class="statistics-overview"><div><span>보유 대회 경기</span><strong>${num(matches?.length||0)}</strong><small>개별 경기 기록</small></div><div><span>랭킹전 공개 통계</span><strong>${num(count)}</strong><small>캐릭터·랭크·시점별 항목</small></div><div><span>최근 대회 경기</span><strong class="statistics-date">${esc((matches||[]).reduce((latest,r)=>r[0]>latest?r[0]:latest,'')||'—')}</strong><small>랭킹전 수집 ${esc(data?.meta.collectedAt||'—')}</small></div></div>${sharedFilters(settings)}${settings.scope==='all'?'<p class="statistics-caption">전체에서는 대회와 랭킹전을 각각 보여줍니다. 집계 기준이 달라 수치를 합치지 않습니다.</p>':''}
  ${showRank?`<section class="statistics-section" aria-labelledby="ranked-title"><div class="heading-inline"><h2 id="ranked-title">${icon('chart')}랭킹전</h2><span>공개 집계 자료</span></div>${errors.ranked?noData(errors.ranked):`${rankFilters(data,settings)}${cohortNote(d)}${d?table(d.rows||[],'ranked',settings):noData()}${badgePanel(data,settings)}<p class="statistics-caption">픽률·밴율은 원문 기준입니다. 실제 경기 수는 공개되지 않았으며, 전체 승률로 특정 상대와의 상성을 계산하지 않습니다.</p>`}</section>`:''}
  ${showTour?`<section class="statistics-section" aria-labelledby="tournament-title"><div class="heading-inline"><h2 id="tournament-title">${icon('swords')}대회</h2><span>개별 경기에서 집계</span></div>${commonFilters('statistics')}${errors.tournament?noData(errors.tournament):`<div class="statistics-source"><span>${esc(tour.first||'—')} ~ ${esc(tour.last||'—')}</span><span>출전 ${num(tour.games)}경기 · 결과 확인 ${num(tour.results)}경기 · 선밴 ${num(tour.banGames)}건</span></div>${table(tour.rows,'tournament',settings)}<p class="statistics-caption">픽률 = 해당 캐릭터 출전 경기 ÷ 조건 내 전체 경기. 생존자 4명이 출전하므로 생존자 픽률 합계는 400%입니다. 승·무·패는 확인된 결과가 있으면 표시하며 50경기 미만에는 적은 표본을 표시합니다. 밴율은 별도의 생존자 선밴 기록 기준이며 감시자 밴 자료는 없습니다.</p>`}</section>`:''}${errors.ranked||errors.tournament?'<button class="btn" data-action="retry">자료 다시 불러오기</button>':''}`;
 }
 function character(c,{data,settings,tournamentHTML,rankError}){
  const filters=rankFilters(data,settings),d=selectRanked(data,settings).dataset,r=rankedCharacter(d,c.id);
  return `${scopeSwitch(settings.scope)}${settings.scope!=='ranked'?`<section class="statistics-section"><div class="heading-inline"><h2>대회</h2><span>경기 기록 기준</span></div>${tournamentHTML}</section>`:''}${settings.scope!=='tournament'?`<section class="statistics-section"><div class="heading-inline"><h2>랭킹전</h2><span>공개 집계 기준</span></div>${filters}${rankError?noData(rankError):`${cohortNote(d)}${r?`<div class="panel">${metricCards(r)}${resultBar(r)}<p class="statistics-caption">픽률·밴율은 원문 기준 · 실제 경기 수 미공개</p></div>`:noData(`${c.name}의 통계가 이 자료에 없습니다. 다른 시즌·서버·랭크를 선택해 보세요.`)}`}</section>`:''}<a class="text-link" href="#v=statistics">모든 캐릭터 통계 보기 ↗</a>`;
 }
 function compareCharacter(c,{data,settings,tournament}){
  const d=selectRanked(data,settings).dataset,r=rankedCharacter(d,c.id),s=tournament;
  return `${settings.scope!=='ranked'?`<div class="panel"><h2 class="panel-title">${icon('swords')}대회</h2><p class="large-value">${s.winRate===null?'결과 없음':percent(s.winRate*100)}</p><p class="muted small">출전 ${num(s.appearances)} · 결과 확인 ${num(s.results)}${s.results>0&&s.results<50?' · 적은 표본':''}</p>${s.results>0?resultBar({win:s.win/s.results*100,draw:s.draw/s.results*100,loss:s.loss/s.results*100}):''}</div>`:''}${settings.scope!=='tournament'?`<div class="panel"><h2 class="panel-title">${icon('chart')}랭킹전</h2>${r?`${metricCards(r,true)}${resultBar(r)}`:noData('이 조건의 통계가 없습니다.')}<p class="statistics-caption">${esc(cohortLabel(d))} · 경기 수 미공개</p></div>`:''}`;
 }
 return {scopeSwitch,rankFilters,page,character,compareCharacter};
}
