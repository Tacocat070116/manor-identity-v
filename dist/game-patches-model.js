export const patchTypes={balance:'전투·밸런스 조정',fix:'오류 수정',new:'캐릭터·콘텐츠 추가',system:'시스템',event:'이벤트',cosmetic:'스킨·상점',other:'기타'};
export const patchScopes={live:'글로벌 정식 서버',test:'테스트 서버'};
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();
export function validPatchDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function patchRoute(params={}){
 const p={v:'gamepatches'};
 for(const key of ['c','year','type','scope','since','q','page','note'])if(params[key]&&String(params[key])!=='all'&&!(key==='page'&&Number(params[key])===1)&&!(key==='scope'&&params[key]==='live'))p[key]=String(params[key]);
 return '#'+new URLSearchParams(p).toString();
}
export function selectGamePatches(catalog,characters,params={}){
 const years=[...new Set(catalog.entries.map(entry=>entry.date.slice(0,4)))].sort().reverse();
 const filters={c:Object.hasOwn(characters,params.c)?params.c:'',year:years.includes(params.year)?params.year:'',type:Object.hasOwn(patchTypes,params.type)?params.type:params.type==='gameplay'?'gameplay':'',scope:params.scope==='test'?'test':'live',since:validPatchDate(params.since)?params.since:'',q:String(params.q||'').slice(0,120).trim()};
 const invalid=Boolean(params.c&&!Object.hasOwn(characters,params.c)||params.since&&!validPatchDate(params.since));
 const terms=normalize(filters.q).split(' ').filter(Boolean);
 const matches=invalid?[]:catalog.entries.filter(entry=>{
  if(entry.scope!==filters.scope||filters.year&&entry.date.slice(0,4)!==filters.year||filters.c&&!entry.characterIds.includes(filters.c))return false;
  const relevantTypes=filters.c?(entry.characterChanges[filters.c]||[]):entry.types;
  if(filters.type==='gameplay'&&!relevantTypes.some(type=>['balance','fix'].includes(type)))return false;
  if(filters.type&&filters.type!=='gameplay'&&!relevantTypes.includes(filters.type))return false;
  // An unknown effective date cannot be represented as a confirmed post-return change.
  if(filters.since&&(!entry.effectiveDate||entry.dateStatus!=='confirmed'||entry.effectiveDate<=filters.since))return false;
  const text=normalize([entry.date,entry.title,...entry.summary,...(entry.highlights||[]).map(change=>change.text),...(entry.sources||[]).map(source=>source.title),...entry.characterIds.map(id=>characters[id]?.name||''),...entry.types.map(type=>patchTypes[type]),entry.searchText||''].join(' '));
  return terms.every(term=>text.includes(term));
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const size=16,pages=Math.max(1,Math.ceil(matches.length/size));
 const requested=/^[1-9]\d{0,4}$/.test(String(params.page||''))?Number(params.page):1;
 const page=Math.min(requested,pages);
 const note=params.note?catalog.entries.find(entry=>entry.id===params.note)||null:null;
 return {filters,years,matches,page,pages,size,entries:matches.slice((page-1)*size,page*size),invalid,note,missingNote:Boolean(params.note&&!note)};
}
