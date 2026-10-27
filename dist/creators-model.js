export const CREATOR_ORIGIN='https://manor-feedback.just-bean-5735.chatgpt.site';
export const CREATOR_TAG_LIMIT=12;
export const CREATOR_TAG_GROUPS={
 '플레이':['생존자','감시자','랭크','일반대전','연합사냥','블랙잭','타로','듀오','4인팟','솔로랭크'],
 '콘텐츠':['캐릭터공략','입문가이드','인격추천','맵공략','동선분석','구출강의','심리전','대회분석','리플레이해설','하이라이트','쇼츠','생방송','풀영상','편집영상','예능','챌린지'],
 '분위기':['차분한해설','편안한분위기','텐션높음','소통방송','시청자참여','같이성장','새내기','꾸준한연습','노마이크','자막해설','친구와함께','캐릭터장인'],
 '활동·언어':['프로','프로코치','전프로','한국어','일본어','중국어','영어','다국어자막'],
};
export const CREATOR_TAGS=Object.values(CREATOR_TAG_GROUPS).flat();
export const CREATOR_DISCOVERY_TAGS=['캐릭터공략','입문가이드','랭크','생존자','감시자','생방송','쇼츠','예능','시청자참여','새내기','프로','프로코치'];
export const CREATOR_SERVERS={unspecified:'선택 안 함',asia:'글로벌 · 아시아',cn:'중국'};
const legacyCountryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
// Keep the picker focused; old saved country codes normalize to no selection.
export const CREATOR_COUNTRIES={unspecified:'선택 안 함',KR:'한국',JP:'일본',CN:'중국',TW:'대만',HK:'홍콩',TH:'태국',VN:'베트남',ID:'인도네시아',MY:'말레이시아',SG:'싱가포르',PH:'필리핀'};
export const CREATOR_COLORS={mint:'민트',lilac:'라일락',sky:'스카이',rose:'로즈',gold:'샌드',ink:'잉크',peach:'피치',lemon:'레몬',teal:'틸',violet:'바이올렛',coral:'코랄',slate:'슬레이트'};
export const CREATOR_PATTERNS={glass:'글라스',aurora:'오로라',dots:'도트',grid:'모눈',stripes:'사선',halo:'빛무리'};
export const CREATOR_FRAMES={soft:'부드럽게',line:'컬러 라인',double:'이중선',dashed:'점선'};
export const CREATOR_LAYOUTS={left:'이미지 왼쪽',right:'이미지 오른쪽',center:'가운데 정렬'};
export const CREATOR_CORNERS={round:'둥글게',soft:'기본 곡선',square:'각지게'};
export const CREATOR_FONTS={clean:'깔끔하게',serif:'클래식하게',rounded:'둥글게'};
export const CREATOR_MARKS={none:'없음',spark:'반짝임',star:'별',moon:'달',heart:'하트',music:'음표',game:'게임패드'};
export const CREATOR_PORTRAITS={video:'대표 영상',initials:'채널 이니셜',character:'캐릭터 초상'};
export const CREATOR_APPEARANCE_DEFAULT={pattern:'glass',frame:'soft',layout:'left',corners:'soft',font:'clean',mark:'none',portrait:'video',characterId:'',label:''};
export const CREATOR_PRESETS={
 glass:{label:'민트 글라스',color:'mint',appearance:{pattern:'glass',frame:'soft',layout:'left',corners:'round',font:'clean',mark:'none'}},
 starlight:{label:'별빛 라일락',color:'lilac',appearance:{pattern:'halo',frame:'double',layout:'right',corners:'round',font:'rounded',mark:'star'}},
 notebook:{label:'스카이 노트',color:'sky',appearance:{pattern:'grid',frame:'dashed',layout:'left',corners:'square',font:'clean',mark:'game'}},
 letter:{label:'로즈 레터',color:'rose',appearance:{pattern:'dots',frame:'line',layout:'center',corners:'soft',font:'serif',mark:'heart'}},
 midnight:{label:'잉크 오로라',color:'ink',appearance:{pattern:'aurora',frame:'line',layout:'right',corners:'soft',font:'clean',mark:'moon'}},
};
const legacyTiers={survivor:['일벌','사냥개','엘크','매머드','그리핀','유니콘','용사','헤라클레스'],hunter:['타란툴라','코브라','악어','스밀로돈','만티코어','키클롭스','이블 드래곤','히드라']};
const tierLabels=['1티어','2티어','3티어','4티어','5티어','6티어','7티어','최고 7티어'];
export const CREATOR_TIERS={survivor:[...tierLabels],hunter:[...tierLabels]};
export function normalizeCreatorTier(side,tier){
 if(!Object.hasOwn(CREATOR_TIERS,side))return '';
 if(CREATOR_TIERS[side].includes(tier))return tier;
 return tierLabels[legacyTiers[side].indexOf(tier)]||'';
}
export const CREATOR_SIDES={survivor:'생존자',hunter:'감시자'};
export const CREATOR_REPORTS={spam:'도배·광고',impersonation:'채널 사칭',unrelated:'제5인격과 무관한 내용',inappropriate:'부적절한 내용',correction:'채널 정보 수정·삭제 요청',other:'기타'};
export const creatorEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bad=message=>{throw new Error(message);};
function clean(value,min,max,label){
 if(typeof value!=='string')bad(`${label}을 확인해 주세요.`);
 const v=value.normalize('NFC').trim();
 if(v.length<min||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(v))bad(`${label}은 ${min}~${max}자로 입력해 주세요.`);
 return v;
}
function youtubeURL(value){
 const raw=clean(value,1,300,'YouTube 주소');let u;
 try{u=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);}catch{bad('YouTube 주소를 확인해 주세요.');}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be'].includes(u.hostname.toLowerCase()))bad('youtube.com 또는 youtu.be 주소만 사용할 수 있습니다.');
 return u;
}
export function normalizeChannel(value){
 const u=youtubeURL(value);if(u.hostname.endsWith('youtu.be'))bad('영상 대신 YouTube 채널 주소를 입력해 주세요.');
 let path;try{path=decodeURIComponent(u.pathname).replace(/\/$/,'');}catch{bad('채널 주소를 확인해 주세요.');}
 const match=path.match(/^\/(?:@([^/]+)|(channel)\/(UC[A-Za-z0-9_-]{22})|(c|user)\/([^/]+))(?:\/(?:featured|videos|shorts|streams|playlists|community|about))?$/u);
 if(!match)bad('채널의 @핸들 또는 /channel/ 주소를 입력해 주세요.');
 const kind=match[1]?'handle':match[2]||match[4],name=match[1]||match[3]||match[5];
 if(!name||name.length>100||/[\s\\?#<>"'\u0000-\u001f\u202a-\u202e\u2066-\u2069]/u.test(name))bad('채널 주소의 핸들을 확인해 주세요.');
 return {url:'https://www.youtube.com/'+(kind==='handle'?'@'+encodeURIComponent(name):kind+'/'+encodeURIComponent(name)),key:kind+':'+(kind==='channel'?name:name.toLocaleLowerCase('en-US'))};
}
export function normalizeVideo(value){
 if(value==null||value==='')return '';
 if(typeof value!=='string')bad('대표 영상의 YouTube 주소를 확인해 주세요.');
 if(!value.trim())return '';
 const u=youtubeURL(value);let id='';
 if(u.hostname.endsWith('youtu.be'))id=u.pathname.slice(1).replace(/\/$/,'');
 else if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
 else id=u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1]||'';
 if(!/^[A-Za-z0-9_-]{11}$/.test(id))bad('대표 영상의 YouTube 주소를 확인해 주세요.');
 return 'https://www.youtube.com/watch?v='+id;
}
export function videoThumbnail(url){try{const video=normalizeVideo(url);return video?'https://i.ytimg.com/vi/'+new URL(video).searchParams.get('v')+'/hqdefault.jpg':'';}catch{return '';}}
export function normalizeTag(value){const tag=clean(value,1,20,'태그').replace(/^#/,'');if(!/^[\p{L}\p{N}][\p{L}\p{N}_-]{0,17}$/u.test(tag))bad('태그는 공백 없이 글자·숫자·_·-로 18자까지 입력해 주세요.');return tag;}
export function normalizeAppearance(input,characters){
 if(input===undefined)input={};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(CREATOR_APPEARANCE_DEFAULT,k)))bad('카드 꾸미기 설정을 확인해 주세요.');
 const value={...CREATOR_APPEARANCE_DEFAULT,...input};
 for(const [key,options] of Object.entries({pattern:CREATOR_PATTERNS,frame:CREATOR_FRAMES,layout:CREATOR_LAYOUTS,corners:CREATOR_CORNERS,font:CREATOR_FONTS,mark:CREATOR_MARKS,portrait:CREATOR_PORTRAITS}))if(typeof value[key]!=='string'||!Object.hasOwn(options,value[key]))bad('카드 꾸미기 설정을 확인해 주세요.');
 if(typeof value.characterId!=='string'||value.characterId&&!characters.has(value.characterId))bad('카드에 표시할 캐릭터를 확인해 주세요.');
 if(value.portrait==='character'&&!value.characterId)bad('카드에 표시할 캐릭터를 선택해 주세요.');
 value.label=clean(value.label,0,24,'카드 한마디');return value;
}
export function normalizeCreator(input,characters){
 const channel=normalizeChannel(input.channelUrl);
 const v={channelUrl:channel.url,channelKey:channel.key,title:clean(input.title,1,50,'채널 이름'),tagline:clean(input.tagline,5,120,'한 줄 소개'),body:clean(input.body||'',0,1800,'자세한 소개'),videoUrl:normalizeVideo(input.videoUrl||''),server:input.server==='naeu'?'unspecified':input.server||'unspecified',color:input.color||'mint',country:input.country||'unspecified'};
 if(!Object.hasOwn(CREATOR_COUNTRIES,v.country)){if(legacyCountryCodes.includes(v.country))v.country='unspecified';else bad('국가·지역을 확인해 주세요.');}
 if(!Object.hasOwn(CREATOR_SERVERS,v.server)||!Object.hasOwn(CREATOR_COLORS,v.color))bad('서버와 카드 색상을 확인해 주세요.');
 v.appearance=normalizeAppearance(input.appearance,characters);
 if(!Array.isArray(input.tags)||input.tags.length>CREATOR_TAG_LIMIT)bad(`태그는 최대 ${CREATOR_TAG_LIMIT}개까지 선택해 주세요.`);
 v.tags=input.tags.map(normalizeTag);if(new Set(v.tags.map(t=>t.toLocaleLowerCase('en-US'))).size!==v.tags.length)bad('같은 태그를 중복해서 넣을 수 없습니다.');
 if(!Array.isArray(input.characterIds)||input.characterIds.length>3||input.characterIds.some(id=>!characters.has(id))||new Set(input.characterIds).size!==input.characterIds.length)bad('주로 다루는 캐릭터는 최대 3명까지 선택해 주세요.');v.characterIds=[...input.characterIds];
 if(!Array.isArray(input.badges)||input.badges.length>6)bad('역대 휘장은 최대 6개까지 추가해 주세요.');
 v.badges=input.badges.map(b=>{if(!b||Object.keys(b).some(k=>!['characterId','grade','season'].includes(k))||!characters.has(b.characterId)||!['S','A','B','C'].includes(b.grade))bad('휘장의 캐릭터와 등급을 확인해 주세요.');return {characterId:b.characterId,grade:b.grade,season:clean(b.season||'',0,24,'휘장 시즌')};});
 if(new Set(v.badges.map(b=>b.characterId+'|'+b.season)).size!==v.badges.length)bad('같은 캐릭터·시즌의 휘장은 하나만 추가해 주세요.');
 if(!Array.isArray(input.tiers)||input.tiers.length>2)bad('최고 티어는 진영별 하나씩 선택해 주세요.');
 v.tiers=input.tiers.map(t=>{if(!t||Object.keys(t).some(k=>!['side','tier','season'].includes(k))||!normalizeCreatorTier(t.side,t.tier))bad('최고 티어를 확인해 주세요.');return {side:t.side,tier:normalizeCreatorTier(t.side,t.tier),season:clean(t.season||'',0,24,'티어 시즌')};});
 if(new Set(v.tiers.map(t=>t.side)).size!==v.tiers.length)bad('최고 티어는 진영별 하나씩 선택해 주세요.');
 return v;
}
