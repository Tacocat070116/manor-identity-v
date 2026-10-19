import {characterSearchData} from './character-search-data.js?v=9ee9452bd59e';

const initial='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const initialKeys=['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g'];
const vowelKeys=['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l'];
const finalKeys=['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'];
const jamoKeys=Object.fromEntries([...initial].map((c,i)=>[c,initialKeys[i]]));
for(const [i,c] of [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'].entries())jamoKeys[c]=vowelKeys[i];
for(const [i,c] of [...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'].entries())jamoKeys[c]=finalKeys[i+1];
const compact=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s\p{P}\p{S}]/gu,'');

// Compare keystrokes instead of guessing how an unfinished Korean syllable composes.
// Both the name and query use this path, so mixed Korean/Latin input also works.
export function keyboardSearchKey(value){
 let result='';
 for(const ch of String(value??'').normalize('NFC')){
  const code=ch.codePointAt(0),syllable=code-0xac00;
  if(syllable>=0&&syllable<11172){result+=initialKeys[Math.floor(syllable/588)]+vowelKeys[Math.floor(syllable%588/28)]+finalKeys[syllable%28];}
  else if(code>=0x1100&&code<=0x1112)result+=initialKeys[code-0x1100];
  else if(code>=0x1161&&code<=0x1175)result+=vowelKeys[code-0x1161];
  else if(code>=0x11a8&&code<=0x11c2)result+=finalKeys[code-0x11a7];
  else result+=jamoKeys[ch]||ch;
 }
 return compact(result);
}
function initials(value){return [...String(value).normalize('NFC')].map(c=>{const n=c.charCodeAt(0)-0xac00;return n>=0&&n<11172?initial[Math.floor(n/588)]:c;}).join('').replace(/\s/g,'');}
function initialQuery(value){return [...String(value).normalize('NFKC')].map(c=>{const n=c.charCodeAt(0)-0x1100;return n>=0&&n<19?initial[n]:c;}).join('').replace(/\s/g,'');}
const indexes=new Map();
function searchIndex(character){
 const meta=Object.hasOwn(characterSearchData,character.id)?characterSearchData[character.id]:null;
 const names=[character.name,character.originalName,...(meta?.aliases||[])].filter(Boolean);
 const cacheKey=JSON.stringify([character.id,names]);
 if(!indexes.has(cacheKey))indexes.set(cacheKey,names.map(name=>({text:compact(name),keys:keyboardSearchKey(name),initials:initials(name)})));
 return indexes.get(cacheKey);
}
export function matchesCharacter(character,query=''){
 const text=compact(query);
 if(!text)return !String(query).trim();
 const key=keyboardSearchKey(query),cho=initialQuery(query),isInitials=/^[ㄱ-ㅎ]{2,}$/.test(cho);
 return searchIndex(character).some(item=>item.text.includes(text)||item.keys.includes(key)||(isInitials&&item.initials.includes(cho)));
}
export const characterSortOptions=[['release','최근 출시순'],['release-asc','오래된 출시순'],['name','가나다순'],['easy','난이도 낮은순'],['hard','난이도 높은순']];
export function sortCharacters(characters,sort='release'){
 const byName=(a,b)=>a.name.localeCompare(b.name,'ko')||a.id.localeCompare(b.id);
 return [...characters].sort((a,b)=>{
  if(sort==='name')return byName(a,b);
  if(sort==='easy'||sort==='hard')return (sort==='easy'?a.difficulty-b.difficulty:b.difficulty-a.difficulty)||byName(a,b);
  const am=characterSearchData[a.id],bm=characterSearchData[b.id];
  const x=am?.releaseDate||am?.releaseWindow?.[0],y=bm?.releaseDate||bm?.releaseWindow?.[0];
  if(!x||!y)return x?-1:y?1:byName(a,b);
  return (sort==='release-asc'?x.localeCompare(y):y.localeCompare(x))||byName(a,b);
 });
}
