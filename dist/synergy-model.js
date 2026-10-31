export const SYNERGY_SITUATIONS=['추격','구출','커버','해독','회복','이동','운영'];
export const RESEARCH_TOPICS={combination:'생존자 조합',survivor_persona:'생존자 인격',hunter_persona:'감시자 인격',strategy:'자유 전략'};
export const PROPOSAL_STATES={none:'토론 중',pending:'도감 검토 중',approved:'도감 반영',declined:'보완 필요'};
export const SYNERGY_REPORTS={spam:'도배·광고',abuse:'욕설·비방',misinformation:'잘못된 정보',privacy:'개인정보 노출',other:'기타'};
export const synergyEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const synergyRoute=(character='',partner='',post='',topic='')=>'#'+new URLSearchParams({v:'laboratory',...(character?{c:character}:{}),...(partner?{partner}:{}),...(post?{post}:{}),...(topic?{topic}:{})}).toString();

export function validateResearchCharacters(topic,ids,characters){
 if(typeof topic!=='string'||!Object.hasOwn(RESEARCH_TOPICS,topic))return '연구 주제를 선택해 주세요.';
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||!ids.every(id=>typeof id==='string'&&Object.hasOwn(characters,id)))return '서로 다른 캐릭터를 선택해 주세요.';
 if(topic==='combination'&&(ids.length<2||ids.length>4||ids.some(id=>characters[id].side!=='생존자')))return '서로 다른 생존자 2~4명을 선택해 주세요.';
 if(topic.endsWith('_persona')&&(ids.length!==1||characters[ids[0]]?.side!==(topic==='survivor_persona'?'생존자':'감시자')))return `${topic==='survivor_persona'?'생존자':'감시자'} 1명을 선택해 주세요.`;
 if(topic==='strategy'&&ids.length>4)return '관련 캐릭터는 최대 4명까지 선택할 수 있습니다.';
 return '';
}

export function synergyGroups(links,character,characters){
 const byName=Object.fromEntries(Object.values(characters).map(c=>[c.name,c]));
 const groups=new Map();
 for(const link of links){
  if(link.character!==character&&link.target!==character)continue;
  if(byName[link.character]?.side!=='생존자'||byName[link.target]?.side!=='생존자')continue;
  const partner=byName[link.character===character?link.target:link.character];
  if(!groups.has(partner.id))groups.set(partner.id,{partner,entries:[],order:1000+(link.order||0)});
  const group=groups.get(partner.id);group.entries.push(link);
  if(link.character===character)group.order=Math.min(group.order,link.order||0);
 }
 return [...groups.values()].map(group=>({...group,entries:group.entries.sort((a,b)=>Number(b.character===character)-Number(a.character===character)),situations:SYNERGY_SITUATIONS.filter(s=>group.entries.some(e=>e.situations?.includes(s)))})).sort((a,b)=>a.order-b.order||a.partner.name.localeCompare(b.partner.name,'ko'));
}

export function validateSynergyDraft(draft,characters,{editing=false}={}){
 const characterError=validateResearchCharacters(draft.topic||'combination',draft.characterIds,characters);
 if(characterError)return characterError;
 if(!Array.isArray(draft.situations)||draft.situations.length<1||draft.situations.length>3||new Set(draft.situations).size!==draft.situations.length||!draft.situations.every(s=>SYNERGY_SITUATIONS.includes(s)))return '활용 상황을 1~3개 선택해 주세요.';
 for(const [key,min,max,label] of [['title',3,80,'제목'],['body',20,3000,'활용법'],['caution',5,1000,'조건·주의점']]){
  if(typeof draft[key]!=='string'||draft[key].trim().length<min||draft[key].trim().length>max)return `${label}은 ${min}~${max}자로 입력해 주세요.`;
 }
 if(editing&&!Number.isInteger(draft.revision))return '글의 수정 정보를 확인하지 못했습니다.';
 return '';
}
