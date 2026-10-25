export const CREATOR_ORIGIN='https://manor-feedback.just-bean-5735.chatgpt.site';
export const CREATOR_TAGS=['캐릭터공략','입문가이드','랭크','하이라이트','예능','생방송','대회분석','생존자','감시자','새내기','편안한분위기','한국어'];
export const CREATOR_SERVERS={unspecified:'선택 안 함',asia:'글로벌 · 아시아',naeu:'글로벌 · NA/EU',cn:'중국'};
export const CREATOR_COLORS={mint:'민트',lilac:'라일락',sky:'스카이',rose:'로즈',gold:'샌드',ink:'잉크'};
export const CREATOR_TIERS={survivor:['일벌','사냥개','엘크','매머드','그리핀','유니콘','용사','헤라클레스'],hunter:['타란툴라','코브라','악어','스밀로돈','만티코어','키클롭스','이블 드래곤','히드라']};
export const CREATOR_SIDES={survivor:'생존자',hunter:'감시자'};
export const CREATOR_REPORTS={spam:'도배·광고',impersonation:'채널 사칭',unrelated:'제5인격과 무관한 내용',inappropriate:'부적절한 내용',other:'기타'};
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
export function normalizeCreator(input,characters){
 const channel=normalizeChannel(input.channelUrl);
 const v={channelUrl:channel.url,channelKey:channel.key,title:clean(input.title,1,50,'채널 이름'),tagline:clean(input.tagline,5,120,'한 줄 소개'),body:clean(input.body||'',0,1800,'자세한 소개'),videoUrl:normalizeVideo(input.videoUrl||''),server:input.server||'unspecified',color:input.color||'mint'};
 if(!Object.hasOwn(CREATOR_SERVERS,v.server)||!Object.hasOwn(CREATOR_COLORS,v.color))bad('서버와 카드 색상을 확인해 주세요.');
 if(!Array.isArray(input.tags)||input.tags.length>6)bad('태그는 최대 6개까지 선택해 주세요.');
 v.tags=input.tags.map(normalizeTag);if(new Set(v.tags.map(t=>t.toLocaleLowerCase('en-US'))).size!==v.tags.length)bad('같은 태그를 중복해서 넣을 수 없습니다.');
 if(!Array.isArray(input.characterIds)||input.characterIds.length>3||input.characterIds.some(id=>!characters.has(id))||new Set(input.characterIds).size!==input.characterIds.length)bad('주로 다루는 캐릭터는 최대 3명까지 선택해 주세요.');v.characterIds=[...input.characterIds];
 if(!Array.isArray(input.badges)||input.badges.length>6)bad('역대 휘장은 최대 6개까지 추가해 주세요.');
 v.badges=input.badges.map(b=>{if(!b||Object.keys(b).some(k=>!['characterId','grade','season'].includes(k))||!characters.has(b.characterId)||!['S','A','B','C'].includes(b.grade))bad('휘장의 캐릭터와 등급을 확인해 주세요.');return {characterId:b.characterId,grade:b.grade,season:clean(b.season||'',0,24,'휘장 시즌')};});
 if(new Set(v.badges.map(b=>b.characterId+'|'+b.season)).size!==v.badges.length)bad('같은 캐릭터·시즌의 휘장은 하나만 추가해 주세요.');
 if(!Array.isArray(input.tiers)||input.tiers.length>2)bad('최고 티어는 진영별 하나씩 선택해 주세요.');
 v.tiers=input.tiers.map(t=>{if(!t||Object.keys(t).some(k=>!['side','tier','season'].includes(k))||!Object.hasOwn(CREATOR_TIERS,t.side)||!CREATOR_TIERS[t.side].includes(t.tier))bad('최고 티어를 확인해 주세요.');return {side:t.side,tier:t.tier,season:clean(t.season||'',0,24,'티어 시즌')};});
 if(new Set(v.tiers.map(t=>t.side)).size!==v.tiers.length)bad('최고 티어는 진영별 하나씩 선택해 주세요.');
 return v;
}
