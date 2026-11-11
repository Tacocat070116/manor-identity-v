const SITE='https://tacocat070116.github.io/manor-identity-v/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const KEY='manor-map-research-draft';
export const mapShareURL=id=>{if(!UUID.test(id))throw Error('공유 ID를 확인해 주세요.');return SITE+'#v=maps&share='+id;};
export function mapAttachment(body){
 for(const token of String(body).match(/https:\/\/[^\s<>"']+/g)||[]){try{const url=new URL(token);if(url.origin!==new URL(SITE).origin||url.pathname!==new URL(SITE).pathname||url.search)continue;const p=new URLSearchParams(url.hash.slice(1));if(p.get('v')==='maps'&&UUID.test(p.get('share')||''))return mapShareURL(p.get('share'));}catch{}}
 return '';
}
export function researchDraft(map,plan,shareId){return {topic:'strategy',characterIds:plan.conditions.characterId?[plan.conditions.characterId]:[],title:('맵 전술 · '+plan.title).slice(0,80),situations:['운영'],body:[mapShareURL(shareId),'지도: '+map.name+' / '+map.revision,'적용 조건: '+(plan.conditions.server==='global'?'글로벌':'중국')+' · '+(plan.conditions.mode==='practice'?'연습':'일반 1 대 4')+' · '+(plan.conditions.faction==='survivor'?'생존자':'감시자'),plan.conditions.note,...plan.steps.map((s,i)=>`${i+1}. ${s.title}\n${s.note}`),'자료 출처: '+map.source.url,'검토 상태: 사용자 전술 · 실전 검증 전'].join('\n\n').slice(0,3000),caution:'베타 지도입니다. 현재 게임 버전과 배치를 대조하지 않았습니다. 표식·경로는 사용자 가정이며, 실제 확인한 조건과 근거를 보완해 주세요.'};}
export function stageResearchDraft(draft,storage){try{(storage||sessionStorage).setItem(KEY,JSON.stringify({at:Date.now(),draft}));}catch{throw Error('연구실 초안을 옮기지 못했습니다. 공유 주소를 직접 첨부해 주세요.');}}
export function takeResearchDraft(storage){try{const s=storage||sessionStorage,record=JSON.parse(s.getItem(KEY)||'null');s.removeItem(KEY);if(!record||Date.now()-record.at>3600000||record.draft?.topic!=='strategy'||!mapAttachment(record.draft.body))return null;return record.draft;}catch{return null;}}
