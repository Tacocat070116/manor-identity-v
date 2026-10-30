import {participation,participationBar,openParticipation,refreshParticipationBanners} from './participation.js?v=594fa5eadc10';
import {CREATOR_ORIGIN,CREATOR_TAGS,CREATOR_TAG_BADGES,creatorTagBadges,CREATOR_TAG_GROUPS,CREATOR_TAG_LIMIT,CREATOR_DISCOVERY_TAGS,CREATOR_PATTERNS,CREATOR_FRAMES,CREATOR_LAYOUTS,CREATOR_CORNERS,CREATOR_FONTS,CREATOR_MARKS,CREATOR_PORTRAITS,CREATOR_APPEARANCE_DEFAULT,CREATOR_PRESETS,normalizeAppearance,CREATOR_SERVERS,CREATOR_COLORS,CREATOR_COUNTRIES,CREATOR_TIERS,normalizeCreatorTier,CREATOR_SIDES,CREATOR_REPORTS,creatorEscape as e,normalizeCreator,normalizeTag,normalizeChannel,normalizeVideo,videoThumbnail} from './creators-model.js';
const paths={play:'<path d="m9 7 8 5-8 5V7Z" fill="currentColor" stroke="none"/><rect x="3" y="4" width="18" height="16" rx="5"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',key:'<circle cx="8" cy="8" r="4"/><path d="m11 11 9 9m-3-3 3-3m-6 0 3-3"/>'};
Object.assign(paths,{spark:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>',moon:'<path d="M20 15.8A9 9 0 0 1 8.2 4 9 9 0 1 0 20 15.8Z"/>',heart:'<path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',game:'<path d="M7 7h10c3 0 6 12 3 13-2 1-4-4-6-4h-4c-2 0-4 5-6 4C1 19 4 7 7 7Z"/><path d="M8 10v4m-2-2h4m5-1h.01m2 3h.01"/>'});
Object.assign(paths,{
 sprout:'<path d="M12 21v-9M12 15C5 16 3 12 3 7c6 0 9 2 9 8ZM12 12c0-6 3-9 9-9 0 6-3 9-9 9Z"/>',
 trophy:'<path d="M7 3h10v5a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 13v6m-4 2h8m-8 0v-2h8v2"/>',
 coach:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="m8 22 4-4 4 4M7 8l3 3m-3 0 3-3m3 6h4V8m-3 2 3-3 2 3"/>',
 gem:'<path d="m3 9 4-5h10l4 5-9 12L3 9Zm0 0h18M7 4l5 17 5-17M9 9l3-5 3 5"/>'
});
const icon=name=>`<svg class="creator-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.play}</svg>`;
const date=value=>new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(value));
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const keyPattern=/^[a-f0-9-]{36}\.[a-f0-9]{64}$/;
const blank=()=>({title:'',channelUrl:'',tagline:'',body:'',videoUrl:'',server:'unspecified',color:'mint',country:'unspecified',appearance:{...CREATOR_APPEARANCE_DEFAULT},tags:[],characterIds:[],badges:[],tiers:[]});
const clone=value=>JSON.parse(JSON.stringify(value));
const betaBadge='<span class="creator-beta-badge">BETA</span>';
const displayTiers=records=>(records||[]).flatMap(t=>{const tier=normalizeCreatorTier(t?.side,t?.tier);return tier?[{...t,tier}]:[];});
export function creatorRecommendationBadge({preview=false}={}){
 const art=`<span class="creator-gold-emblem" aria-hidden="true"><span class="creator-gold-medal"></span><svg class="creator-gold-cat" viewBox="0 0 32 32"><path d="M7 13 6 4l8 6a14 14 0 0 1 4 0l8-6-1 9a9 9 0 0 1 3 7c0 7-6 10-12 10S4 27 4 20a9 9 0 0 1 3-7Z"/></svg><span class="creator-gold-spark spark-one">${icon('spark')}</span><span class="creator-gold-spark spark-two">${icon('spark')}</span></span>`;
 return preview?`<span class="creator-recommend-badge" role="img" aria-label="운영자 추천" title="운영자 추천">${art}</span>`:`<button type="button" class="creator-recommend-badge" data-cr="badge-info" data-badge="recommended" aria-label="운영자 추천 배지 안내" title="운영자 추천">${art}</button>`;
}
function promotionBadges(c,{preview=false}={}){
 const badges=creatorTagBadges(c.tags);if(!badges.length)return '';
 return `<div class="creator-promotion-badges" role="group" aria-label="선택한 태그 배지">${badges.map(b=>{const content=icon(b.icon)+`<span>${e(b.label)}</span>`,style=`creator-tag-badge badge-${b.id}`;return preview?`<span class="${style}" title="#${e(b.tag)} 태그 배지">${content}</span>`:`<button type="button" class="${style}" data-cr="badge-info" data-badge="${b.id}" aria-label="${e(b.label)} 태그 배지 안내" title="#${e(b.tag)} 태그 배지">${content}</button>`;}).join('')}</div>`;
}

function safeChannel(url){try{return normalizeChannel(url).url;}catch{return '';}}
function safeVideo(url){try{return normalizeVideo(url);}catch{return '';}}
function achievements(c,chars){
 const tiers=displayTiers(c.tiers);
 const badges=(c.badges||[]).filter(b=>chars[b.characterId]&&['S','A','B','C'].includes(b.grade));
 if(!tiers.length&&!badges.length)return '';
 return `<div class="creator-records">${tiers.map(t=>`<span class="creator-tier">${icon('star')}<span><strong>${e(t.tier)}</strong><small>${e(CREATOR_SIDES[t.side])}${t.season?' · '+e(t.season):''}</small></span></span>`).join('')}${badges.map(b=>`<span class="creator-badge" title="${e(b.season||'시즌 미기재')}"><b class="creator-grade grade-${e(b.grade)}">${e(b.grade)}</b><span><strong>${e(chars[b.characterId].name)}</strong>${b.season?`<small>${e(b.season)}</small>`:''}</span></span>`).join('')}</div>`;
}
function compactAchievements(c,chars,{preview=false}={}){
 const tiers=displayTiers(c.tiers);
 const badges=(c.badges||[]).filter(b=>chars[b.characterId]&&['S','A','B','C'].includes(b.grade));
 const records=[...tiers.slice(0,1).map(t=>({label:CREATOR_SIDES[t.side]+' '+t.tier,season:t.season})),...badges.slice(0,1).map(b=>({label:b.grade+' 휘장 · '+chars[b.characterId].name,season:b.season}))];
 if(!records.length)return '';
 const more=tiers.length+badges.length-records.length;
 return `<div class="creator-records-summary">${records.map(r=>`<span title="${e(r.label+(r.season?' · '+r.season:''))}">${e(r.label)}</span>`).join('')}${more?(preview?`<span>+${more}</span>`:`<button type="button" data-cr="open" data-id="${e(c.id)}" aria-label="${e(c.title)}의 이력 ${more}개 더 보기">+${more}</button>`):''}<small>직접 입력한 이력</small></div>`;
}
export function creatorCard(c,chars,{preview=false,detail=false,admin=false}={}){
 const compact=!detail,color=Object.hasOwn(CREATOR_COLORS,c.color)?c.color:'mint',channel=safeChannel(c.channelUrl),video=safeVideo(c.videoUrl);
 let a;try{a=normalizeAppearance(c.appearance,new Map(Object.entries(chars)));}catch{a={...CREATOR_APPEARANCE_DEFAULT};}
 const portrait=a.portrait==='character'?chars[a.characterId]:null,thumb=portrait?.portrait||(a.portrait==='video'?videoThumbnail(c.videoUrl):'');
 const title=c.title||'나의 채널 이름',tagline=c.tagline||'채널에서 주로 다루는 콘텐츠를 소개해 주세요.';
 const content=thumb?`<div class="creator-cover-letter" aria-hidden="true">${e(Array.from(title).slice(0,2).join(''))}</div><img src="${e(thumb)}" alt="${e(portrait?portrait.name:title+' 대표 영상 썸네일')}" loading="lazy" referrerpolicy="no-referrer">${portrait?'':`<span class="creator-video-mark">${icon('play')}${compact?'':'대표 영상'}</span>`}`:`<div class="creator-cover-letter" aria-hidden="true">${e(Array.from(title).slice(0,2).join(''))}</div>${compact?'':`<span class="creator-cover-word">IDENTITY V · CREATOR</span>${icon('play')}`}`;
 const cover=`<div class="creator-cover ${thumb?'has-video':''}">${!preview&&compact?`<button type="button" data-cr="open" data-id="${e(c.id)}" aria-label="${e(title)} 채널 소개 보기">${content}</button>`:content}</div>`;
 const server=c.server&&c.server!=='unspecified'?CREATOR_SERVERS[c.server]||'':'';
 const kicker=`<div class="creator-card-kicker">${c.origin==='curated'?'<span class="creator-curated-label">MANOR 소개</span>':''}${server?`<span>${e(server)}</span>`:!compact||c.origin!=='curated'?'<span>제5인격 YouTube</span>':''}${c.status==='hidden'?'<span class="creator-hidden">숨김</span>':c.isMine&&!preview?'<span>내 채널</span>':''}${admin&&c.reportCount?`<span class="creator-hidden">미처리 신고 ${c.reportCount}</span>`:''}</div>`;
 const decoration=a.mark!=='none'?`<span class="creator-decoration" aria-hidden="true">${icon(a.mark)}</span>`:'';
 const summary=`${kicker}<div class="creator-card-name-line"><h${detail?'1':'2'}>${!preview&&compact?`<button type="button" data-cr="open" data-id="${e(c.id)}" title="${e(title)}">${e(title)}</button>`:e(title)}</h${detail?'1':'2'}>${!a.label?decoration:''}${c.recommended===true?creatorRecommendationBadge({preview}):''}</div>${promotionBadges(c,{preview})}<p class="creator-tagline">${e(tagline)}</p>`;
 const visibleTags=compact?(c.tags||[]).slice(0,3):c.tags||[],extraTags=(c.tags?.length||0)-visibleTags.length;
 const tags=`<div class="creator-tags">${c.country&&c.country!=='unspecified'&&Object.hasOwn(CREATOR_COUNTRIES,c.country)?preview||detail?`<span class="creator-country-tag">#${e(CREATOR_COUNTRIES[c.country])}</span>`:`<button type="button" class="creator-country-tag" data-cr="country" data-country="${e(c.country)}" title="${e(CREATOR_COUNTRIES[c.country])}">#${e(CREATOR_COUNTRIES[c.country])}</button>`:''}${visibleTags.map(tag=>preview||detail?`<span title="${e(tag)}">#${e(tag)}</span>`:`<button type="button" data-cr="tag" data-tag="${e(tag)}" title="${e(tag)}">#${e(tag)}</button>`).join('')}${extraTags?(preview?`<span class="creator-extra-tags">+${extraTags}</span>`:`<button class="creator-extra-tags" type="button" data-cr="open" data-id="${e(c.id)}" aria-label="${e(title)}의 태그 ${extraTags}개 더 보기">+${extraTags}</button>`):''}</div>`;
 const featured=(c.characterIds||[]).filter(id=>chars[id]);
 const characters=featured.length?`<div class="creator-characters">${featured.map(id=>`<span title="${e(chars[id].name)}"><img src="${e(chars[id].portrait)}" alt="" width="24" height="24" loading="lazy"><span>${e(chars[id].name)}</span></span>`).join('')}</div>`:'';
 const records=compact?compactAchievements(c,chars,{preview}):achievements(c,chars)+((c.tiers?.length||c.badges?.length)?'<p class="creator-self-report">휘장·최고 티어는 작성자가 입력한 이력입니다.</p>':'');
 const story=detail?`${c.origin==='curated'?'<p class="creator-curated-note">공개된 채널 정보를 바탕으로 MANOR가 소개하는 채널입니다. 채널 운영자가 직접 등록한 글은 아닙니다.</p>':''}${c.body?`<div class="creator-story"><h2>채널 소개</h2><p>${e(c.body)}</p></div>`:''}`:'';
 const personal=a.label?`<div class="creator-personal-line">${decoration}<span>${e(a.label)}</span></div>`:'';
 const footer=!preview?`<div class="creator-card-bottom">${channel?`<a class="creator-channel-link" href="${e(channel)}" target="_blank" rel="noopener noreferrer">${compact?'채널 보기':'채널 보러 가기'} ${icon('arrow')}</a>`:''}${detail&&video?`<a href="${e(video)}" target="_blank" rel="noopener noreferrer">대표 영상 보기 ↗</a>`:''}${compact?`<button type="button" class="creator-text-button" data-cr="open" data-id="${e(c.id)}">${admin?'관리':'소개'}</button>`:''}</div>`:'';
 return `<article class="creator-card creator-color-${color} creator-pattern-${a.pattern} creator-frame-${a.frame} creator-layout-${a.layout} creator-corners-${a.corners} creator-font-${a.font} ${compact?'is-compact':'is-detail'}">${compact?`<div class="creator-card-head">${cover}<div class="creator-card-summary">${summary}</div></div>`:cover}<div class="creator-card-body">${compact?'':`<div class="creator-card-summary">${summary}</div>`}${personal}${tags}${characters}${records}${story}${footer}</div></article>`;
}
const selectOptions=(map,current,first)=>`${first?'<option value="">'+e(first)+'</option>':''}${Object.entries(map).map(([value,label])=>`<option value="${e(value)}" ${value===current?'selected':''}>${e(label)}</option>`).join('')}`;
const characterOptions=(characters,selected='')=>`<option value="">캐릭터 선택</option>${Object.values(characters).sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(c=>`<option value="${e(c.id)}" ${c.id===selected?'selected':''}>${e(c.name)}</option>`).join('')}`;
const field=(label,name,value,{max=100,placeholder='',required=false,type='text'}={})=>`<label>${label}${required?'<span class="creator-required">필수</span>':''}<input name="${name}" type="${type}" value="${e(value)}" maxlength="${max}" placeholder="${e(placeholder)}" ${required?'required':''}></label>`;
function studioControls(c,characters){
 const a={...CREATOR_APPEARANCE_DEFAULT,...c.appearance};
 const choose=(name,label,options)=>`<fieldset class="creator-style-options"><legend>${label}</legend><div>${Object.entries(options).map(([value,text])=>`<label><input type="radio" name="appearance-${name}" value="${value}" ${a[name]===value?'checked':''}><span>${name==='mark'&&value!=='none'?icon(value):''}${e(text)}</span></label>`).join('')}</div></fieldset>`;
 return `<section class="creator-studio"><div class="creator-section-heading"><div><h2>카드 스타일</h2><p>스타일을 고르고, 취향대로 하나씩 바꿔 보세요.</p></div></div><div class="creator-presets" role="group" aria-label="카드 스타일 프리셋">${Object.entries(CREATOR_PRESETS).map(([key,p])=>`<button type="button" data-cr="preset" data-preset="${key}" class="creator-color-${p.color}"><span class="creator-preset-art preset-${key}" aria-hidden="true">${icon(p.appearance.mark==='none'?'spark':p.appearance.mark)}</span><span>${e(p.label)}</span></button>`).join('')}</div><fieldset class="creator-color-picker"><legend>카드 색상</legend>${Object.entries(CREATOR_COLORS).map(([value,label])=>`<label class="creator-color-option creator-color-${value}"><input type="radio" name="color" value="${value}" ${value===(c.color||'mint')?'checked':''}><span aria-hidden="true"></span><small>${label}</small></label>`).join('')}</fieldset>${choose('pattern','배경 패턴',CREATOR_PATTERNS)}${choose('layout','이미지 배치',CREATOR_LAYOUTS)}<details class="creator-studio-details"><summary>테두리·글꼴·장식 더 꾸미기</summary>${choose('frame','테두리',CREATOR_FRAMES)}${choose('corners','모서리',CREATOR_CORNERS)}${choose('font','이름 글꼴',CREATOR_FONTS)}${choose('mark','장식',CREATOR_MARKS)}</details><div class="creator-form-grid"><label>카드 대표 이미지<select name="appearance-portrait">${selectOptions(CREATOR_PORTRAITS,a.portrait)}</select></label><label>초상 캐릭터<select name="appearance-characterId">${characterOptions(characters,a.characterId)}</select></label></div><p class="creator-field-help">캐릭터를 고르면 초상 모드로 바뀌어요. 대표 영상이 없으면 채널 이니셜이 표시됩니다.</p>${field('카드 한마디 · 선택','appearance-label',a.label,{max:24,placeholder:'예: 오늘도 즐겁게, 밤 9시에 만나요'})}<div class="creator-studio-actions"><button type="button" class="creator-text-button" data-cr="reset-style">꾸미기만 기본값으로</button><button type="button" class="btn small" data-cr="preview">꾸민 카드 확인</button></div></section>`;
}
export function creatorEditor(c,characters,{editing=false,mobile=false}={}){
 c={...c,country:Object.hasOwn(CREATOR_COUNTRIES,c.country)?c.country:'unspecified',tiers:displayTiers(c.tiers)};
 const optional=(key,label,hint,content)=>`<details class="creator-optional" data-cr-optional="${key}"><summary><span><strong>${label}</strong><small>${hint}</small></span><span class="creator-optional-state" data-cr-optional-state="${key}">${creatorOptionalState(c,key)}</span></summary><div class="creator-optional-body">${content}</div></details>`;
 return `<div class="creator-editor-heading"><button class="creator-text-button" type="button" data-cr="back">← 채널 목록</button><div class="eyebrow">YOUR CHANNEL ${betaBadge}</div><h1>${editing?'채널 소개 수정':'내 채널 소개하기'}</h1><p>이름, 채널 주소, 한 줄 소개만 입력하면 등록할 수 있습니다.</p></div><div class="creator-editor-layout"><form class="creator-form" data-cr-form="editor"><section class="creator-required-fields"><div class="creator-section-heading"><div><h2>채널 기본 정보</h2><p>필수 항목은 3개입니다. 나머지는 등록 후에도 추가할 수 있습니다.</p></div></div>${field('채널 이름','title',c.title,{max:50,required:true,placeholder:'YouTube에 표시되는 채널 이름'})}${field('YouTube 채널 주소','channelUrl',c.channelUrl,{max:300,required:true,placeholder:'https://www.youtube.com/@채널핸들'})}${editing&&c.recommended===true?'<p class="creator-field-help creator-auto-badge-help">다른 채널 주소로 변경하면 운영자 추천 배지가 해제됩니다.</p>':''}${field('한 줄 소개','tagline',c.tagline,{max:120,required:true,placeholder:'예: 생존자 랭킹전과 용병 구출 공략을 올립니다.'})}</section><div class="creator-optional-intro"><h2>필요한 정보만 더하기</h2><p>모두 선택 사항입니다. 펼치거나 접어도 입력 내용은 유지됩니다.</p></div>
 ${optional('channel','채널 상세 정보','대표 영상 · 국가·서버 · 자세한 소개',`<div class="creator-form-grid"><label>활동 국가·지역 · 선택<select name="country">${selectOptions(CREATOR_COUNTRIES,c.country||'unspecified')}</select></label><label>주로 플레이하는 서버<select name="server">${selectOptions(CREATOR_SERVERS,c.server)}</select></label></div><p class="creator-field-help creator-country-help">국가 태그로 표시됩니다. 게임 서버와 별도로 선택해 주세요.</p>${field('대표 영상 주소 · 선택','videoUrl',c.videoUrl,{max:300,placeholder:'영상 또는 Shorts 주소'})}<p class="creator-field-help">대표 영상을 넣으면 썸네일이 카드에 표시됩니다.</p><label>자세한 채널 소개 · 선택<textarea name="body" rows="6" maxlength="1800" placeholder="자주 다루는 콘텐츠, 방송 일정, 시청자에게 전하고 싶은 이야기를 자유롭게 적어주세요.">${e(c.body)}</textarea></label><p class="creator-field-help"><span data-cr-count>${c.body.length}</span> / 1,800자</p>`)}
 ${optional('discovery','태그와 주력 캐릭터','내 채널을 찾기 쉽도록',`<p class="creator-field-help">태그는 최대 ${CREATOR_TAG_LIMIT}개까지 선택할 수 있어요.</p><div class="creator-tag-suggestions" data-cr-list="suggestions"></div><p class="creator-field-help creator-auto-badge-help">새내기 · 프로 · 프로코치 · 캐릭터장인 태그를 고르면 카드에 배지가 붙어요.</p><div class="creator-input-row">${field('나만의 태그','customTag','',{max:240,placeholder:'#차분한해설 #시청자참여'})}<button class="btn" type="button" data-cr="add-tag">추가</button></div><p class="creator-field-help">공백이나 쉼표로 여러 태그를 한 번에 추가할 수 있어요. 앞의 3개가 목록에 먼저 표시됩니다.</p><div class="creator-selected-tags" data-cr-list="tags" aria-label="선택한 태그"></div><p class="creator-field-help" data-cr-tag-count aria-live="polite"></p><label>주로 다루는 캐릭터 · 최대 3명<div class="creator-input-row"><select name="characterPick">${characterOptions(characters)}</select><button class="btn" type="button" data-cr="add-character">추가</button></div></label><div class="creator-edit-chips" data-cr-list="characters"></div>`)}
 ${optional('records','휘장과 최고 티어','없어도 등록할 수 있어요.',`<div class="creator-tier-inputs">${Object.entries(CREATOR_SIDES).map(([side,label])=>{const t=c.tiers.find(t=>t.side===side);return `<div class="creator-form-grid"><label>${label} 최고 티어<select name="tier-${side}"><option value="">표시 안 함</option>${CREATOR_TIERS[side].map(tier=>`<option ${t?.tier===tier?'selected':''}>${e(tier)}</option>`).join('')}</select></label>${field('시즌 · 선택','season-'+side,t?.season||'',{max:24,placeholder:'예: 시즌 42'})}</div>`;}).join('')}</div><div class="creator-badge-builder"><h3>역대 캐릭터 휘장 <small>최대 6개</small></h3><div class="creator-badge-inputs"><label>캐릭터<select name="badgeCharacter">${characterOptions(characters)}</select></label><label>등급<select name="badgeGrade">${['S','A','B','C'].map(g=>`<option value="${g}">${g} 휘장</option>`).join('')}</select></label>${field('시즌 · 선택','badgeSeason','',{max:24,placeholder:'시즌 42'})}<button class="btn" type="button" data-cr="add-badge">추가</button></div><div class="creator-edit-chips" data-cr-list="badges"></div></div><p class="creator-field-help">기록은 직접 입력한 이력으로 표시됩니다.</p>`)}
 ${optional('appearance','카드 꾸미기','색상 · 이미지 · 장식',studioControls(c,characters))}
 <div class="creator-editor-actions"><p>등록하면 모든 방문자에게 공개됩니다. 제5인격 관련 채널을 소개해 주세요.</p><div><button type="button" class="btn" data-cr="preview">미리보기</button><button type="submit" class="btn primary">${editing?'수정 저장':'채널 등록하기'} ${icon('arrow')}</button></div></div><p class="creator-form-error" role="alert" hidden></p></form><aside class="creator-preview"><details ${mobile?'':'open'}><summary>내 카드 미리보기</summary><div data-cr-preview>${creatorCard(c,characters,{preview:true})}</div></details><p>입력한 내용이 미리보기에 바로 반영됩니다.</p></aside></div>`;
}
function creatorOptionalState(c,key){
 if(key==='channel')return [c.country&&c.country!=='unspecified',c.server&&c.server!=='unspecified',c.videoUrl,c.body].filter(Boolean).length?'입력됨':'선택';
 if(key==='discovery')return c.tags.length||c.characterIds.length?`태그 ${c.tags.length} · 캐릭터 ${c.characterIds.length}`:'선택';
 if(key==='records')return c.badges.length||c.tiers.length?`휘장 ${c.badges.length} · 티어 ${c.tiers.length}`:'선택';
 return c.color&&c.color!=='mint'||Object.entries(c.appearance||{}).some(([key,value])=>value!==CREATOR_APPEARANCE_DEFAULT[key])?'적용됨':'기본';
}
export function collectCreatorForm(data,draft){
 const value={...draft};
 for(const name of ['title','channelUrl','tagline','body','videoUrl','server','color','country'])value[name]=String(data.get(name)||'');
 value.appearance=Object.fromEntries(Object.keys(CREATOR_APPEARANCE_DEFAULT).map(key=>[key,String(data.get('appearance-'+key)||'')]));
 value.tiers=Object.keys(CREATOR_SIDES).filter(side=>data.get('tier-'+side)).map(side=>({side,tier:String(data.get('tier-'+side)),season:String(data.get('season-'+side)||'')}));
 return value;
}

const token=()=>participation.read();
const memoryKeys=new Map();
function savedKey(id){if(memoryKeys.has(id))return memoryKeys.get(id);try{const value=localStorage.getItem('manor-creator-key:'+id);return keyPattern.test(value||'')?value:'';}catch{return '';}}
function saveKey(id,value){memoryKeys.set(id,value);try{localStorage.setItem('manor-creator-key:'+id,value);}catch{}}

export function mountCreators(root,{characters={},postId='',navigate,admin=false,origin=CREATOR_ORIGIN}={}){
 let alive=true,busy=false,version=0,mode='public',view='list',items=[],nextPage=null,selected=null,draft=blank(),requestId=uuid(),manageSecret=secret(),searchTimer;
 const filters={q:'',tag:'',server:'',character:'',country:'',status:'',reported:admin?'1':''},controllers=new Set();
 let authorAtOpen=token();
 let lastFocus=null;
 const frame=html=>{if(!alive)return;root.innerHTML=`<section class="creator-board ${admin?'creator-admin':''}"><div class="creator-notice" role="status" aria-live="polite" hidden></div>${html}<dialog class="creator-dialog" aria-label="채널 게시판 대화상자"></dialog></section>`;};
 const notice=(message,error=false)=>{const node=root.querySelector('.creator-notice');if(node){node.hidden=!message;node.textContent=message;node.classList.toggle('is-error',error);}};
 async function api(path,{method='GET',body,guest=true,authorToken,identityRetry=true}={}){
  const requestToken=admin||!guest?'':(authorToken??token());
  const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),15000),headers={};
  if(body!==undefined)headers['Content-Type']='application/json';if(admin)headers['X-Manor-Admin']='1';else if(requestToken)headers.Authorization='Bearer '+requestToken;
  try{const response=await fetch(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:admin?'same-origin':'omit',cache:'no-store',signal:controller.signal});let data;try{data=await response.json();}catch{throw Error('서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
   if(!response.ok){if(data.code==='visitor_invalid'){const removed=await participation.invalidate(requestToken);if(method==='GET'&&guest&&identityRetry)return api(path,{guest:!removed,identityRetry:false});}const error=Error(data.error||'요청을 처리하지 못했습니다.');error.status=response.status;throw error;}if(!admin&&guest&&method==='GET'&&identityRetry&&requestToken!==token())return api(path,{guest,identityRetry:false});return data;
  }catch(error){if(error.name==='AbortError')throw Error('연결이 지연되고 있습니다. 입력한 내용은 유지되니 다시 시도해 주세요.');if(error instanceof TypeError)throw Error('서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.');throw error;}finally{clearTimeout(timeout);controllers.delete(controller);}
 }
 async function ensureVisitor(){if(admin)return '';if(authorAtOpen&&authorAtOpen!==token())throw Error('다른 창에서 연결된 기록이 바뀌었습니다. 입력한 내용은 유지됩니다. 원래 기록으로 다시 연결하거나 내용을 보관한 뒤 새로고침해 주세요.');const identity=await participation.ensure(()=>api('/api/feedback/visitors',{method:'POST',body:{},guest:false}));authorAtOpen=identity;refreshParticipationBanners();return identity;}
 const prefix=admin?'/api/admin/creators':'/api/creators';
 function heading(){return `<header class="creator-heading"><div><h1>${admin?'유튜브 게시판 관리':'제5인격 유튜브'} ${betaBadge}</h1><p>${admin?'신고된 내용을 확인하고 공개 상태를 관리합니다.':'캐릭터·콘텐츠 태그로 제5인격 유튜브 채널을 찾거나 내 채널을 등록하세요.'}</p></div>${admin?'<button class="btn" data-cr="reload" type="button">새로고침</button>':`<button class="btn primary" data-cr="compose" type="button">${icon('plus')}채널 등록</button>`}</header>`;}
 function toolbar(){return `<div class="creator-toolbar"><div class="creator-tabs" role="group" aria-label="채널 목록 보기">${admin?`<button type="button" data-cr="reported" aria-pressed="${filters.reported==='1'}">신고 접수</button><button type="button" data-cr="all-admin" aria-pressed="${!filters.reported}">전체 채널</button>`:`<button type="button" data-cr="public" aria-pressed="${mode==='public'}">모든 채널</button><button type="button" data-cr="mine" aria-pressed="${mode==='mine'}">내 채널</button>`}</div><label class="creator-search">${icon('search')}<span class="visually-hidden">채널과 태그 검색</span><input type="search" name="creatorSearch" value="${e(filters.q)}" placeholder="채널·태그 검색" maxlength="100"></label><label class="creator-filter-label creator-country-filter"><span class="visually-hidden">국가·지역 필터</span><select data-cr-filter="country">${selectOptions(CREATOR_COUNTRIES,filters.country,'국가·지역')}</select></label><label class="creator-filter-label"><span class="visually-hidden">채널 서버 필터</span><select data-cr-filter="server">${selectOptions(CREATOR_SERVERS,filters.server,'서버')}</select></label><label class="creator-filter-label"><span class="visually-hidden">주력 캐릭터 필터</span><select data-cr-filter="character">${characterOptions(characters,filters.character).replace('캐릭터 선택','캐릭터')}</select></label></div><div class="creator-discovery-tags" role="group" aria-label="콘텐츠 태그">${['',...CREATOR_DISCOVERY_TAGS].map(tag=>`<button type="button" data-cr="tag" data-tag="${e(tag)}" aria-pressed="${filters.tag===tag}">${tag?'#'+e(tag):'전체 태그'}</button>`).join('')}${filters.tag&&!CREATOR_DISCOVERY_TAGS.includes(filters.tag)?`<button type="button" data-cr="tag" data-tag="${e(filters.tag)}" aria-pressed="true">#${e(filters.tag)}</button>`:''}</div>${mode==='mine'&&!admin?'<p class="creator-mine-note">이 브라우저에서 등록하거나 관리키를 연결한 채널입니다. <button type="button" class="creator-text-button" data-cr="recover">관리키로 연결</button></p>':''}`;}
 function listShell(){view='list';selected=null;frame(heading()+(admin?'':participationBar())+`<div data-cr-toolbar>${toolbar()}</div><div data-cr-results aria-live="polite"><div class="creator-empty"><span class="loading-orbit" aria-hidden="true"></span><p>채널을 불러오고 있습니다.</p></div></div>`);}
 function results(data,append){
  items=append?[...items,...data.creators.filter(c=>!items.some(x=>x.id===c.id))]:data.creators;nextPage=data.nextPage;
  const filtered=filters.q||filters.tag||filters.server||filters.character||filters.country;
  const empty=admin?'이 목록에 채널이 없습니다.':filtered?'조건에 맞는 채널이 없습니다.':mode==='mine'?'아직 등록한 채널이 없습니다.':'첫 번째 채널을 소개해 주세요.';
  root.querySelector('[data-cr-results]').innerHTML=`<div class="creator-results-heading"><p>${mode==='mine'?'내 채널':'등록된 채널'} <strong>${data.total}</strong></p><span>${filtered?'<button type="button" class="creator-text-button" data-cr="reset">필터 초기화</button>':'새로 등록한 순서'}</span></div>${items.length?`<div class="creator-grid">${items.map(c=>creatorCard(c,characters,{admin})).join('')}</div>`:`<div class="creator-empty">${icon('play')}<h2>${empty}</h2><p>${admin?'접수된 신고는 이곳에서 처리할 수 있습니다.':filtered?'다른 태그를 고르거나 검색어를 바꿔 보세요.':'공략도, 웃긴 순간도, 첫 랭크 영상도 좋아요.<br>나만의 플레이를 기다리는 시청자를 만나보세요.'}</p>${admin?'':`<button class="btn ${filtered?'':'primary'}" type="button" data-cr="${filtered?'reset':'compose'}">${filtered?'전체 채널 보기':'내 채널 등록하기'}</button>`}</div>`}${nextPage!==null?'<button type="button" class="btn creator-more" data-cr="more">채널 더 보기</button>':''}<p class="creator-board-note">${admin?'신고만으로 자동 숨김 처리하지 않습니다.':'함께 다듬어 가는 BETA 게시판입니다. 제5인격 채널이라면 규모나 티어에 관계없이 자유롭게 소개해 주세요.'}</p>`;
 }
 async function loadList(append=false){
  const current=++version;
  if(view!=='list'||!root.querySelector('[data-cr-results]'))listShell();
  if(mode==='mine'&&!token()&&!admin){results({creators:[],total:0,nextPage:null},false);return;}
  root.querySelector('[data-cr-results]').setAttribute('aria-busy','true');
  const query=new URLSearchParams({...filters,page:String(append?nextPage:0)});
  try{const data=await api(prefix+(mode==='mine'&&!admin?'/mine':'')+'?'+query);if(alive&&version===current&&view==='list')results(data,append);}
  catch(error){if(alive&&version===current&&view==='list'){root.querySelector('[data-cr-results]').innerHTML=`<div class="creator-empty"><h2>채널을 불러오지 못했습니다.</h2><p>${e(error.message)}</p><button type="button" class="btn" data-cr="reload">다시 시도</button></div>`;}}
  finally{if(alive&&version===current)root.querySelector('[data-cr-results]')?.removeAttribute('aria-busy');}
 }
 function move(id=''){closeDialog();if(navigate){navigate(id);return;}postId=id;return id?loadDetail(id):loadList();}
 function manageControls(c){return `<div class="creator-detail-tools"><button class="creator-text-button" type="button" data-cr="back">← 채널 목록</button><div>${admin?'<button type="button" class="creator-text-button" data-cr="delete">등록 삭제</button>':c.isMine?`<button type="button" class="btn small" data-cr="edit">소개 수정</button><button type="button" class="btn small" data-cr="key">${icon('key')}관리키</button><button type="button" class="creator-text-button" data-cr="delete">삭제</button>`:`${c.origin==='curated'?'':'<button type="button" class="creator-text-button" data-cr="recover">내 게시글 관리</button>'}<button type="button" class="creator-text-button" data-cr="report">${c.origin==='curated'?'정보 수정·삭제 요청':'신고'}</button>`}</div></div>`;}
 async function loadDetail(id){
  const current=++version;view='detail';frame('<div class="creator-empty" role="status"><span class="loading-orbit" aria-hidden="true"></span><p>채널 소개를 불러오고 있습니다.</p></div>');
  try{const data=await api(prefix+'/'+encodeURIComponent(id));if(!alive||version!==current)return;selected=data.creator;
   const reports=admin?await api(prefix+'/'+encodeURIComponent(id)+'/reports'):null;if(!alive||version!==current)return;
   frame(manageControls(selected)+`<div class="creator-detail-layout">${creatorCard(selected,characters,{detail:true,admin})}${admin?reviewForm(selected,reports.reports):selected.isMine?`<aside class="creator-owner-note"><h2>${selected.status==='hidden'?'현재 숨김 처리된 채널입니다.':'내 채널이 공개되어 있습니다.'}</h2><p>${selected.status==='hidden'?'내용을 수정해도 자동으로 다시 공개되지는 않습니다. 운영자에게 재검토를 요청해 주세요.':'소개와 기록은 언제든 수정할 수 있습니다. 관리키를 따로 보관하면 다른 기기에서도 게시글을 관리할 수 있어요.'}</p>${selected.moderationReason?`<h3>운영자 안내</h3><p>${e(selected.moderationReason)}</p>`:''}<p>등록 ${e(date(selected.createdAt))}<br>최근 수정 ${e(date(selected.updatedAt))}</p><button class="btn" data-cr="key" type="button">관리키 확인</button></aside>`:''}</div>`);
  }catch(error){if(alive&&version===current){frame('<div class="creator-empty"><h2>채널을 열 수 없습니다.</h2><button class="btn" data-cr="back" type="button">목록으로 돌아가기</button></div>');notice(error.message,true);}}
 }
 function reviewForm(c,reports){return `<aside><form class="creator-recommend-panel" data-cr-form="recommendation"><div class="creator-recommend-preview">${creatorRecommendationBadge({preview:true})}<div><h2>운영자 추천</h2><p>${c.recommended?'추천 배지가 적용되어 있어요.':'추천할 채널에 황금 고양이 배지를 달아 주세요.'}</p></div></div><button type="submit" class="btn ${c.recommended?'':'creator-gold-button'}" aria-pressed="${c.recommended===true}">${c.recommended?'추천 배지 해제':'추천 배지 달기'}</button><p class="creator-form-error" role="alert" hidden></p></form><section class="creator-owner-note"><h2>신고 내역</h2>${reports.length?reports.map(r=>`<div class="creator-report-row"><strong>${e(CREATOR_REPORTS[r.reason]||r.reason)} ${r.resolved?'· 처리됨':''}</strong><p>${e(r.detail||'추가 내용 없음')}</p><small>${e(date(r.createdAt))}</small></div>`).join(''):'<p>접수된 신고가 없습니다.</p>'}</section><form class="creator-form creator-review-form" data-cr-form="moderate"><label>공개 상태<select name="status"><option value="published" ${c.status==='published'?'selected':''}>공개</option><option value="hidden" ${c.status==='hidden'?'selected':''}>숨김</option></select></label><label>처리 사유<textarea name="reason" rows="4" maxlength="500" ${c.status==='hidden'?'required':''}>${e(c.moderationReason)}</textarea></label><label class="creator-checkbox"><input type="checkbox" name="resolveReports" checked>접수된 신고를 처리 완료로 표시</label><button class="btn primary" type="submit">처리 결과 저장</button><p class="creator-form-error" role="alert" hidden></p></form></aside>`;}
 function collect(){const form=root.querySelector('[data-cr-form="editor"]');if(form)draft=collectCreatorForm(new FormData(form),draft);return draft;}
 function preview(){collect();const node=root.querySelector('[data-cr-preview]');if(node)node.innerHTML=creatorCard(draft,characters,{preview:true});const count=root.querySelector('[data-cr-count]');if(count)count.textContent=String(draft.body.length);root.querySelectorAll('[data-cr-optional-state]').forEach(node=>{node.textContent=creatorOptionalState(draft,node.dataset.crOptionalState);});}
 function editLists(){
  const expanded=[...root.querySelectorAll('.creator-tag-group[open]')].map(d=>d.querySelector('summary').textContent);
  const set=(key,html)=>{const n=root.querySelector('[data-cr-list="'+key+'"]');if(n)n.innerHTML=html;};
  set('suggestions',Object.entries(CREATOR_TAG_GROUPS).map(([group,tags])=>`<details class="creator-tag-group" ${group==='플레이'?'open':''}><summary>${e(group)} <small>${tags.length}</small></summary><div>${tags.map(tag=>`<button type="button" data-cr="suggest-tag" data-tag="${e(tag)}" aria-pressed="${draft.tags.includes(tag)}">#${e(tag)}</button>`).join('')}</div></details>`).join(''));
  set('tags',draft.tags.map((tag,i)=>`<div class="creator-selected-tag"><span>#${e(tag)}</span><button type="button" data-cr="tag-earlier" data-index="${i}" aria-label="${e(tag)} 태그 앞으로" ${i===0?'disabled':''}>←</button><button type="button" data-cr="tag-later" data-index="${i}" aria-label="${e(tag)} 태그 뒤로" ${i===draft.tags.length-1?'disabled':''}>→</button><button type="button" data-cr="remove-tag" data-index="${i}" aria-label="${e(tag)} 태그 제거">${icon('close')}</button></div>`).join(''));
  const counter=root.querySelector('[data-cr-tag-count]');if(counter)counter.textContent=`${draft.tags.length} / ${CREATOR_TAG_LIMIT}개 선택`;

  set('characters',draft.characterIds.map((id,i)=>`<button type="button" data-cr="remove-character" data-index="${i}" aria-label="${e(characters[id].name)} 제거">${e(characters[id].name)} ${icon('close')}</button>`).join(''));
  set('badges',draft.badges.map((b,i)=>`<button type="button" data-cr="remove-badge" data-index="${i}" aria-label="${e(characters[b.characterId].name)} ${b.grade} 휘장 제거"><b class="creator-grade grade-${b.grade}">${b.grade}</b>${e(characters[b.characterId].name)}${b.season?' · '+e(b.season):''} ${icon('close')}</button>`).join(''));
  if(expanded.length)root.querySelectorAll('.creator-tag-group').forEach(d=>d.open=expanded.includes(d.querySelector('summary').textContent));
  preview();
 }
 function editor(c=null){++version;view='editor';selected=c;draft=c?clone(c):blank();requestId=uuid();manageSecret=secret();frame((admin?'':participationBar())+creatorEditor(draft,characters,{editing:!!c,mobile:root.ownerDocument.defaultView.matchMedia('(max-width:800px)').matches}));editLists();root.querySelector('[name="title"]')?.focus();}
 function showDialog(title,html){const dialog=root.querySelector('.creator-dialog');lastFocus=root.ownerDocument.activeElement;dialog.innerHTML=`<div class="creator-dialog-head"><h2>${e(title)}</h2><button type="button" class="icon-btn" data-cr="close" aria-label="닫기">${icon('close')}</button></div><div class="creator-dialog-body">${html}</div>`;dialog.showModal();}
 function closeDialog(){const dialog=root.querySelector('.creator-dialog');if(dialog?.open){dialog.close();lastFocus?.focus?.();}}
 function recoverDialog(){showDialog('내 채널 연결하기','<form class="creator-form" data-cr-form="recover"><p>등록할 때 받은 관리키로 이 브라우저에 수정 권한을 연결합니다.</p><label>관리키<input name="key" autocomplete="off" spellcheck="false" required placeholder="게시글 ID.관리키"></label><button class="btn primary" type="submit">내 채널 연결</button><p class="creator-form-error" role="alert" hidden></p></form>');}
 function keyDialog(){const key=savedKey(selected.id);showDialog('이 채널의 관리키',key?`<p>이 키로 다른 기기에서도 수정·삭제할 수 있습니다. 공개 소개에 적거나 다른 사람에게 공유하지 마세요.</p><label class="creator-key-label">관리키<input name="manageKey" value="${e(key)}" readonly autocomplete="off" spellcheck="false"></label><button class="btn primary" data-cr="copy-key" type="button">관리키 복사</button><p class="creator-copy-status" role="status"></p>`:'<p>이 브라우저에는 관리키가 저장되어 있지 않습니다. 현재 브라우저에서는 계속 수정할 수 있습니다. 처음 등록한 기기에 보관한 키를 확인해 주세요.</p>');}
 const formError=(form,message)=>{const n=form.querySelector('.creator-form-error');if(n){n.textContent=message;n.hidden=!message;}};
 function refreshToolbar(){
  const bar=root.querySelector('[data-cr-toolbar]'),oldRow=bar.querySelector('.creator-discovery-tags'),left=oldRow?.scrollLeft||0,active=root.ownerDocument.activeElement;
  const focus=bar.contains(active)&&active.dataset.cr?{action:active.dataset.cr,tag:active.dataset.tag}:null;
  bar.innerHTML=toolbar();
  const row=bar.querySelector('.creator-discovery-tags');row.scrollLeft=left;
  const selected=[...row.querySelectorAll('button')].find(b=>b.dataset.tag===filters.tag);
  if(selected){const item=selected.getBoundingClientRect(),bounds=row.getBoundingClientRect();if(item.left<bounds.left)row.scrollLeft-=bounds.left-item.left+3;else if(item.right>bounds.right)row.scrollLeft+=item.right-bounds.right+3;}
  if(focus)[...bar.querySelectorAll('[data-cr]')].find(b=>b.dataset.cr===focus.action&&b.dataset.tag===focus.tag)?.focus({preventScroll:true});
 }
 async function click(event){
  const recovery=event.target.closest('[data-participation]');
  if(!admin&&recovery?.dataset.participation==='open'){event.preventDefault();if(busy)return;openParticipation({origin,mode:recovery.dataset.participationView,beforeSwitch:()=>!root.querySelector('[data-cr-form="editor"]')||confirm('입력 중인 내용이 있습니다. 기록을 전환하고 목록을 다시 불러올까요?'),onConnected:()=>{authorAtOpen=token();controllers.forEach(c=>c.abort());mode='mine';loadList();}});return;}
  const button=event.target.closest('[data-cr]');if(!button||!root.contains(button))return;event.preventDefault();if(busy)return;
  const action=button.dataset.cr;
  try{
   if(action==='close')return closeDialog();
   if(action==='badge-info'){
    if(button.dataset.badge==='recommended')return showDialog('운영자 추천',`<div class="creator-badge-explanation">${creatorRecommendationBadge({preview:true})}<p>MANOR 운영자가 직접 추천한 채널이에요.</p></div>`);
    const badge=Object.values(CREATOR_TAG_BADGES).find(b=>b.id===button.dataset.badge);
    if(badge)return showDialog(badge.label+' 배지',`<div class="creator-badge-explanation"><span class="creator-tag-badge badge-${badge.id}">${icon(badge.icon)}${e(badge.label)}</span><p>${e(badge.description)}</p><p class="creator-field-help">작성자가 선택한 #${e(badge.label)} 태그에 따라 표시됩니다.</p></div>`);
    return;
   }

   if(action==='compose')return editor();if(action==='edit'&&selected?.isMine)return editor(selected);
   if(action==='back')return move();if(action==='open')return move(button.dataset.id);if(action==='reload')return view==='detail'?loadDetail(postId):loadList();if(action==='more')return loadList(true);
   if(['public','mine','reported','all-admin','tag','country','reset'].includes(action)){
    if(action==='public'||action==='mine')mode=action;
    if(action==='reported')filters.reported='1';if(action==='all-admin')filters.reported='';
    if(action==='country')filters.country=filters.country===button.dataset.country?'':button.dataset.country;
    if(action==='tag')filters.tag=filters.tag===button.dataset.tag?'':button.dataset.tag;
    if(action==='reset')Object.assign(filters,{q:'',tag:'',server:'',character:'',country:''});
    clearTimeout(searchTimer);refreshToolbar();return loadList();
   }
   if(action==='recover')return recoverDialog();if(action==='key')return keyDialog();
   if(action==='copy-key'){const input=root.querySelector('[name="manageKey"]'),status=root.querySelector('.creator-copy-status');try{await navigator.clipboard.writeText(input.value);status.textContent='복사했습니다.';}catch{input.focus();input.select();status.textContent='선택한 관리키를 직접 복사해 주세요.';}return;}
   if(action==='delete')return showDialog('채널 소개를 삭제할까요?','<form class="creator-form" data-cr-form="delete"><p>등록한 소개가 게시판에서 사라집니다. YouTube 채널과 영상은 삭제되지 않습니다.</p>'+(admin?'<label>삭제 사유<textarea name="reason" required maxlength="500" rows="3"></textarea></label>':'')+'<button class="btn primary" type="submit">게시글 삭제</button><button class="btn" data-cr="close" type="button">취소</button><p class="creator-form-error" role="alert" hidden></p></form>');
   if(action==='report')return showDialog(selected?.origin==='curated'?'채널 정보 수정·삭제 요청':'채널 신고','<form class="creator-form" data-cr-form="report"><label>신고 이유<select name="reason">'+selectOptions(CREATOR_REPORTS,selected?.origin==='curated'?'correction':'spam')+'</select></label><label>추가 설명 · 선택<textarea name="detail" rows="4" maxlength="500" placeholder="확인이 필요한 내용을 알려주세요."></textarea></label><p class="creator-field-help">신고 내용은 운영자만 확인합니다.</p><button class="btn primary" type="submit">신고 접수</button><p class="creator-form-error" role="alert" hidden></p></form>');
   if(action==='preview'){collect();return showDialog('내 카드 미리보기',creatorCard(draft,characters,{preview:true}));}
   if(view!=='editor')return;collect();const form=root.querySelector('[data-cr-form="editor"]');formError(form,'');
   if(action==='preset'||action==='reset-style'){
    const preset=action==='preset'?CREATOR_PRESETS[button.dataset.preset]:null;
    draft.color=preset?.color||'mint';draft.appearance={...CREATOR_APPEARANCE_DEFAULT,...draft.appearance,...(preset?.appearance||CREATOR_APPEARANCE_DEFAULT)};
    const colorInput=[...form.querySelectorAll('[name="color"]')].find(n=>n.value===draft.color);colorInput.checked=true;
    for(const [key,value] of Object.entries(draft.appearance)){for(const node of form.querySelectorAll('[name="appearance-'+key+'"]')){if(node.type==='radio')node.checked=node.value===value;else node.value=value;}}
    preview();return;
   }
   if(['tag-earlier','tag-later'].includes(action)){
    const i=Number(button.dataset.index),j=i+(action==='tag-earlier'?-1:1);if(j>=0&&j<draft.tags.length)[draft.tags[i],draft.tags[j]]=[draft.tags[j],draft.tags[i]];
   }
   if(['add-tag','suggest-tag'].includes(action)){
    const input=form.querySelector('[name="customTag"]');
    const added=(action==='suggest-tag'?[button.dataset.tag]:input.value.split(/[\s,，]+/u).filter(Boolean)).map(normalizeTag);
    if(!added.length)throw Error('추가할 태그를 입력해 주세요.');
    const next=[...draft.tags];
    for(const tag of added){const index=next.findIndex(t=>t.toLocaleLowerCase('en-US')===tag.toLocaleLowerCase('en-US'));if(index>=0){if(action==='suggest-tag')next.splice(index,1);}else next.push(tag);}
    if(next.length>CREATOR_TAG_LIMIT)throw Error(`태그는 최대 ${CREATOR_TAG_LIMIT}개까지 추가할 수 있습니다.`);
    draft.tags=next;if(action==='add-tag')input.value='';
   }
   if(action==='add-character'){const id=form.querySelector('[name="characterPick"]').value;if(!characters[id])throw Error('캐릭터를 선택해 주세요.');if(draft.characterIds.includes(id))throw Error('이미 선택한 캐릭터입니다.');if(draft.characterIds.length>=3)throw Error('캐릭터는 최대 3명까지 추가할 수 있습니다.');draft.characterIds.push(id);}
   if(action==='add-badge'){const id=form.querySelector('[name="badgeCharacter"]').value,grade=form.querySelector('[name="badgeGrade"]').value,season=form.querySelector('[name="badgeSeason"]').value.trim();if(!characters[id])throw Error('휘장의 캐릭터를 선택해 주세요.');if(draft.badges.length>=6)throw Error('휘장은 최대 6개까지 추가할 수 있습니다.');if(draft.badges.some(b=>b.characterId===id&&b.season===season))throw Error('같은 캐릭터·시즌의 휘장이 이미 있습니다.');draft.badges.push({characterId:id,grade,season});}
   const arrays={'remove-tag':'tags','remove-character':'characterIds','remove-badge':'badges'};if(arrays[action])draft[arrays[action]].splice(Number(button.dataset.index),1);editLists();
  }catch(error){const form=root.querySelector('[data-cr-form="editor"]');if(form)formError(form,error.message);else notice(error.message,true);}
 }
 function change(event){if(busy)return;if(event.target.matches('[data-cr-filter]')){filters[event.target.dataset.crFilter]=event.target.value;clearTimeout(searchTimer);loadList();}if(event.target.name==='appearance-characterId'&&event.target.value)root.querySelector('[name="appearance-portrait"]').value='character';if(event.target.closest('[data-cr-form="editor"]'))preview();if(event.target.name==='status'){const form=event.target.closest('[data-cr-form="moderate"]');if(form)form.querySelector('[name="reason"]').required=event.target.value==='hidden';}}
 function input(event){if(busy)return;if(event.target.name==='creatorSearch'){filters.q=event.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadList(),280);}if(event.target.closest('[data-cr-form="editor"]'))preview();}
 async function submit(event){
  const form=event.target.closest('[data-cr-form]');if(!form||!root.contains(form))return;event.preventDefault();if(busy)return;busy=true;formError(form,'');const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try{const kind=form.dataset.crForm,data=new FormData(form);
   if(kind==='editor'){
    const value=normalizeCreator(collect(),new Map(Object.entries(characters)));delete value.channelKey;
    const authorToken=await ensureVisitor(),editing=selected?.id;
    const result=await api(prefix+(editing?'/'+editing:''),{method:editing?'PATCH':'POST',authorToken,body:{...value,...(editing?{revision:selected.revision}:{requestId,manageSecret})}});if(!alive)return;
    if(!editing)saveKey(result.creator.id,result.creator.id+'.'+manageSecret);busy=false;return move(result.creator.id);
   }
   if(kind==='recover'){
    const key=String(data.get('key')||'').trim();if(!keyPattern.test(key))throw Error('관리키 전체를 입력해 주세요.');const authorToken=await ensureVisitor();const result=await api('/api/creators/access',{method:'POST',authorToken,body:{key}});if(!alive)return;saveKey(result.creator.id,key);busy=false;return move(result.creator.id);
   }
   if(kind==='delete'){await api(prefix+'/'+selected.id,{method:'DELETE',body:{revision:selected.revision,...(admin?{reason:String(data.get('reason')||'')}:{})}});if(!alive)return;busy=false;return move();}
   if(kind==='report'){const authorToken=await ensureVisitor();await api(prefix+'/'+selected.id+'/reports',{method:'POST',authorToken,body:{reason:data.get('reason'),detail:data.get('detail')}});if(!alive)return;busy=false;closeDialog();notice('신고를 접수했습니다. 운영자가 내용을 확인합니다.');return;}
   if(kind==='recommendation'){
    if(!admin||!selected)throw Error('운영자 화면에서 설정해 주세요.');
    const recommended=selected.recommended!==true;
    const result=await api(prefix+'/'+selected.id+'/recommendation',{method:'PATCH',body:{recommended,revision:selected.revision}});if(!alive)return;busy=false;await loadDetail(result.creator.id);notice(recommended?'추천 배지를 달았습니다.':'추천 배지를 해제했습니다.');return;
   }
   if(kind==='moderate'){const result=await api(prefix+'/'+selected.id,{method:'PATCH',body:{status:data.get('status'),reason:data.get('reason'),revision:selected.revision,resolveReports:data.get('resolveReports')==='on'}});if(!alive)return;busy=false;await loadDetail(result.creator.id);notice('처리 결과를 저장했습니다.');}
  }catch(error){if(alive){formError(form,error.message);if(error.status===409)notice('최신 상태를 확인한 뒤 다시 시도해 주세요. 입력한 내용은 유지됩니다.',true);}}
  finally{busy=false;if(alive)buttons.forEach(b=>b.disabled=false);}
 }
 function keydown(event){if(event.key==='Enter'&&event.target.name==='customTag'){event.preventDefault();root.querySelector('[data-cr="add-tag"]')?.click();}}
 function imageError(event){const img=event.target;if(img.tagName==='IMG'&&img.closest('.creator-cover')){img.hidden=true;img.closest('.creator-cover').classList.add('thumbnail-failed');}}
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);root.addEventListener('submit',submit);root.addEventListener('keydown',keydown);root.addEventListener('error',imageError,true);
 if(postId)loadDetail(postId);else{listShell();loadList();}
 return ()=>{alive=false;version++;clearTimeout(searchTimer);controllers.forEach(c=>c.abort());root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);root.removeEventListener('submit',submit);root.removeEventListener('keydown',keydown);root.removeEventListener('error',imageError,true);root.querySelector('.creator-dialog')?.close();};
}
