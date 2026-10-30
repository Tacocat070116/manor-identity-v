export const SYNERGY_SITUATIONS=['추격','구출','커버','해독','회복','이동','운영'];
export const SYNERGY_REPORTS={spam:'도배·광고',abuse:'욕설·비방',misinformation:'잘못된 정보',privacy:'개인정보 노출',other:'기타'};
export const synergyEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const synergyRoute=(character,partner='',post='')=>'#'+new URLSearchParams({v:'character',c:character,tab:'synergy',...(partner?{partner}:{}),...(post?{post}:{})}).toString();

export function synergyGroups(links,character,characters,situation=''){
 const byName=Object.fromEntries(Object.values(characters).map(c=>[c.name,c]));
 const groups=new Map();
 for(const link of links){
  if(link.character!==character&&link.target!==character)continue;
  if(byName[link.character]?.side!=='생존자'||byName[link.target]?.side!=='생존자')continue;
  if(situation&&!link.situations?.includes(situation))continue;
  const partner=byName[link.character===character?link.target:link.character];
  if(!groups.has(partner.id))groups.set(partner.id,{partner,entries:[],order:1000+(link.order||0)});
  const group=groups.get(partner.id);group.entries.push(link);
  if(link.character===character)group.order=Math.min(group.order,link.order||0);
 }
 return [...groups.values()].map(group=>({...group,entries:group.entries.sort((a,b)=>Number(b.character===character)-Number(a.character===character)),situations:SYNERGY_SITUATIONS.filter(s=>group.entries.some(e=>e.situations?.includes(s)))})).sort((a,b)=>a.order-b.order||a.partner.name.localeCompare(b.partner.name,'ko'));
}

export function validateSynergyDraft(draft,characters,{editing=false}={}){
 const ids=draft.characterIds;
 if(!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1]||!ids.every(id=>characters[id]?.side==='생존자'))return '서로 다른 생존자 2명을 선택해 주세요.';
 if(!Array.isArray(draft.situations)||draft.situations.length<1||draft.situations.length>3||new Set(draft.situations).size!==draft.situations.length||!draft.situations.every(s=>SYNERGY_SITUATIONS.includes(s)))return '활용 상황을 1~3개 선택해 주세요.';
 for(const [key,min,max,label] of [['title',3,80,'제목'],['body',20,3000,'활용법'],['caution',5,1000,'조건·주의점']]){
  if(typeof draft[key]!=='string'||draft[key].trim().length<min||draft[key].trim().length>max)return `${label}은 ${min}~${max}자로 입력해 주세요.`;
 }
 if(editing&&!Number.isInteger(draft.revision))return '글의 수정 정보를 확인하지 못했습니다.';
 return '';
}
