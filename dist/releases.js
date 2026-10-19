const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const releaseTypes=['추가','개선','수정','데이터'];
export const releaseLabel=log=>`BETA v${log.version}`;
const dateLabel=date=>date.replaceAll('-','.');
const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();

export function selectReleases(log,{query='',type='전체'}={}){
 const terms=normalize(query).split(' ').filter(Boolean);
 return log.releases.filter(release=>{
  const haystack=normalize([release.date,dateLabel(release.date),release.title,release.version?'BETA v'+release.version:'',...release.changes.map(c=>c.type+' '+c.text)].join(' '));
  return (type==='전체'||release.changes.some(change=>change.type===type))&&terms.every(term=>haystack.includes(term));
 });
}

export function releaseNotesList(log,filters={}){
 const entries=selectReleases(log,filters),groups=new Map();
 for(const entry of entries){if(!groups.has(entry.date))groups.set(entry.date,[]);groups.get(entry.date).push(entry);}
 return `<p class="release-count" role="status" aria-live="polite">전체 ${log.releases.length}건 중 ${entries.length}건${filters.type&&filters.type!=='전체'?' · '+esc(filters.type):''}</p>${entries.length?[...groups].map(([date,releases])=>`<section class="release-day" aria-labelledby="release-day-${esc(date)}"><div class="release-date"><h2 id="release-day-${esc(date)}"><time datetime="${esc(date)}">${dateLabel(date)}</time></h2><span>${releases.length}개의 기록</span></div><ol class="release-entries">${releases.map(release=>`<li><article class="panel release-card ${release.id===log.releases[0].id?'release-latest':''}"><div class="release-card-meta">${release.version?`<span class="tag green">${esc(releaseLabel(release))}</span>`:release.id==='opening'?'<span class="tag green">BETA 오픈</span>':'<span class="release-archive-label">업데이트</span>'}${release.id===log.releases[0].id?'<span class="release-current">최신 업데이트</span>':''}</div><h3>${esc(release.title)}</h3><ul class="release-changes">${release.changes.map(change=>`<li><span class="release-kind" data-kind="${esc(change.type)}">${esc(change.type)}</span><span>${esc(change.text)}</span></li>`).join('')}</ul></article></li>`).join('')}</ol></section>`).join(''):'<div class="empty"><h2>일치하는 업데이트가 없습니다.</h2><p>검색어를 바꾸거나 변경 유형을 전체로 선택해 보세요.</p></div>'}`;
}

export function releaseNotesPage(log,filters,{icon}){
 return `<div class="page-title"><div class="eyebrow">MANOR UPDATES</div><h1>패치노트</h1><p>장원의 시작부터, 오늘의 변화까지.</p></div><section class="panel release-summary" aria-label="사이트 버전과 오픈일"><div><span class="release-summary-label">현재 버전</span><strong class="release-version">${esc(releaseLabel(log))}</strong><p>함께 다듬어 가는 베타 서비스입니다.</p></div><dl><div><dt>베타 오픈</dt><dd><time datetime="${log.openedAt}">${dateLabel(log.openedAt)}</time></dd></div><div><dt>최근 업데이트</dt><dd><time datetime="${log.releases[0].date}">${dateLabel(log.releases[0].date)}</time></dd></div></dl></section><div class="toolbar release-toolbar"><label class="search-box">${icon('search')}<input id="release-search" type="search" value="${esc(filters.query)}" placeholder="업데이트 내용 검색" aria-label="패치노트 검색" autocomplete="off"></label><label class="filter-label">변경 유형<select id="release-type" class="filter-select">${['전체',...releaseTypes].map(type=>`<option value="${type}" ${filters.type===type?'selected':''}>${type}</option>`).join('')}</select></label></div><p class="release-guide">${esc(log.historyNote)}</p><div id="release-results">${releaseNotesList(log,filters)}</div><a class="text-link release-feedback-link" href="#v=feedback">개선 의견 보내기 ${icon('arrow')}</a>`;
}
