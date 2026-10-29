import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const root='research/localization/2026-10-27/';
const db=read('dist/data.json'),roles=read('dist/specialties.json'),intros=read('dist/introductions.json');
const policy=read(root+'terminology.json'),edits=read(root+'edits.json');
const followRoot='research/localization/2026-10-27-followup/';
const followPolicy=read(followRoot+'terminology.json'),followEdits=read(followRoot+'edits.json');
const roleReviews=read('research/roles/reviews.json').reviews;
const characterFields=['difficultyReason','persona','alternative','personaReason','caution','skill','use','hold','response','adjustment','tips','strengths','weaknesses'];
const fields=(row,keys)=>keys.flatMap(k=>row[k]??[]);
const byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));
const managed=[...db.characters.flatMap(c=>fields(c,characterFields)),...db.matchups.flatMap(m=>fields(m,['summary','condition','situation','situationDetail'])),...db.links.flatMap(l=>fields(l,['reason','use','when','caution'])),...Object.values(roles.characters).flatMap(r=>[...r.specialties,...Object.values(r.specialtyReasons)]),...Object.values(intros.characters)];

test('authored guide, matchup, synergy and role copy share the Korean glossary',()=>{
 for(const value of managed)assert.doesNotMatch(value,/어그로|피리|평타|해독기|암호기|포탈|포털|쿨타임|아이템|백우산|흑우산|흰 우산|검은 우산|사진 세계|감정 전이|분발|향기 지팡이|은폐 진행도/);
 for(const side of ['생존자','감시자']){
  const members=db.characters.filter(c=>c.side===side);
  assert.ok(members.some(c=>roles.characters[c.id].specialties.includes('추격')));
  for(const c of members)assert.ok(!roles.characters[c.id].specialties.some(t=>['사냥','어그로'].includes(t)));
 }
});

test('item names are contextual and character names remain intact',()=>{
 const expected={c03:'모니터',c04:'바람 날개',c07:'바람의 힘',c11:'추적 표식',c12:'촛농',c13:'마력의 음색',c15:'산제비나비',c16:'물거울',c17:'갈퀴 사슬',c18:'마비 구역',c26:'사필안',c33:'광선 치료 구역',c39:'퉁소',c43:'기계 인형',c49:'마술봉',c52:'땅속 잠행',c54:'슬라이드 스텝',c55:'도블린 술',c57:'긴 통로',c61:'감정이입',c64:'강철 팔꿈치 보호대',c67:'약물 증강제',c68:'두려움 상실',c70:'목제 행글라이더',c72:'망각의 향',c75:'사기 진작',c76:'올가미',c77:'크리켓볼',c81:'아로마 스틱',c84:'해신의 회중시계',c85:'행운보따리'};
 for(const [id,term] of Object.entries(expected))assert.ok(byId[id].skill.includes(term),`${id}: ${term}`);
 for(const [id,name] of Object.entries({c12:'밀랍인형사',c15:'붉은 나비',c17:'사냥터지기',c26:'우산의 영혼',c40:'공군',c68:'인형사'}))assert.equal(byId[id].name,name);
 assert.match(byId.c37.skill,/폭탄/);
 assert.match(byId.c60.skill,/흙공/);
 assert.match(byId.c89.skill,/갈고리/);
 assert.doesNotMatch(byId.c89.skill,/갈퀴 사슬/);
 assert.match(byId.c39.skill,/퉁소를/);
 assert.match(byId.c15.skill,/산제비나비를/);
 assert.match(byId.c70.skill,/행글라이더로/);
 assert.doesNotMatch(managed.join('\n'),/이동한 이동해|일반적인 일반 공격|기계 기계 인형|바람 바람 날개|붉은 산제비나비|침식도도|강철 강철/);
});

test('source-conflicting usage conditions are corrected without discarding caveats',()=>{
 assert.match(byId.c01.tips[1],/구르는 중에도 동료가 구출을 시작/);
 assert.match(byId.c01.tips[1],/구출이 진행되는 동안에는 구를 수 없/);
 assert.match(byId.c75.caution,/이미 사용한 소지품에도 적용/);
 assert.doesNotMatch(byId.c75.caution,/소급해서 적용되지 않/);
 assert.match(byId.c55.skill,/두 차례/);
 const chase=db.matchups.find(m=>m.id==='M131'),rescue=db.matchups.find(m=>m.id==='M463');
 assert.equal(chase.advantage,'우산의 영혼');assert.equal(rescue.advantage,'묘지기');
 assert.equal(rescue.contextFor,chase.id);assert.match(chase.condition,/돌진/);
});

test('every replacement has provenance and the audit only touches editorial fields',()=>{
 for(const register of [policy,followPolicy]){
  const sources=new Map(register.sources.map(s=>[s.id,s]));
  for(const rule of [...register.rules,...register.fieldEdits]){
   assert.ok(rule.sources.length);
   for(const id of rule.sources)assert.ok(id==='editorial'||sources.has(id),id);
  }
  assert.ok([...sources.values()].some(s=>s.kind==='official-ko'));
  assert.ok([...sources.values()].some(s=>s.kind==='indirect-transcription'));
 }
 // Reverse newer edits first, including descendants of older object-level edits.
 const files=structuredClone({'data.json':db,'specialties.json':roles,'introductions.json':intros});
 for(const review of [...roleReviews].reverse()){
  assert.deepEqual(files['specialties.json'].characters[review.characterId],review.after,review.characterId+' reviewed roles');
  files['specialties.json'].characters[review.characterId]=structuredClone(review.before);
 }
 for(const edit of [...followEdits,...edits]){
  const [dist,file,...parts]=edit.path.split('/');assert.equal(dist,'dist');
  let parent=files[file];for(const part of parts.slice(0,-1))parent=parent[part];
  assert.deepEqual(parent[parts.at(-1)],edit.after,edit.path);
  parent[parts.at(-1)]=structuredClone(edit.before);
  if(file!=='data.json')continue;
  const [group,index,field,...rest]=parts;
  if(group==='meta'){assert.equal(index,'languageReviewedAt');continue;}
  if(group==='characters')assert.ok(characterFields.includes(field)||(['hard','easy'].includes(field)&&rest[1]==='reason'),edit.path);
  else if(group==='matchups')assert.ok(['summary','condition','situation','situationDetail'].includes(field),edit.path);
  else if(group==='links')assert.ok(['reason','use','when','caution'].includes(field),edit.path);
  else assert.fail(edit.path);
 }
 assert.equal(db.characters.length,89);assert.equal(db.matchups.length,463);assert.equal(db.links.length,275);
 assert.equal(db.meta.recordLatest,'2026-10-26');
});

test('official item introductions and contextual weather terms stay distinct',()=>{
 assert.match(byId.c50.skill,/맹인용 지팡이/);
 assert.match(byId.c51.skill,/걸리버 여행기/);
 assert.match(byId.c63.skill,/기억 동기화/);
 assert.match(byId.c67.skill,/진정제/);
 assert.match(byId.c74.skill,/원숭이 조각상/);
 assert.match(byId.c77.tips[0],/크리켓 배트/);
 assert.match(byId.c45.skill,/층운/);
 assert.match(byId.c45.tips[1],/따뜻한 비가 만드는 구름/);
 assert.doesNotMatch(byId.c45.tips[1],/층운/);
 assert.match(byId.c54.tips[0],/느린 리듬 오르골/);
 assert.match(byId.c54.tips[1],/빠른 리듬 오르골/);
 assert.match(db.matchups.find(m=>m.id==='M314').condition,/비늘 표피/);
 assert.match(db.matchups.find(m=>m.id==='M314').summary,/비늘 경화/);
 assert.match(db.matchups.find(m=>m.id==='M319').condition,/추억 조각/);
});

test('follow-up evidence distinguishes direct observation from indexed posts and indirect text',()=>{
 const sourceById=new Map(policy.sources.map(s=>[s.id,s]));
 const puppeteer=policy.rules.find(r=>r.before==='무감각');
 for(const id of puppeteer.sources){
  const name=decodeURIComponent(sourceById.get(id).url);
  assert.ok(name.includes('/인형사('));assert.ok(!name.includes('밀랍인형사'));
 }
 const followSources=new Map(followPolicy.sources.map(s=>[s.id,s]));
 const amendments=read(followRoot+'source-amendments.json');
 assert.ok(amendments.confirmedTerms.some(t=>t.verification==='search-index'));
 assert.ok(amendments.confirmedTerms.some(t=>t.verification==='video-frame'));
 for(const term of amendments.confirmedTerms){
  const source=followSources.get(term.source);assert.equal(source.kind,'official-ko');
  assert.ok(source.supports.includes(term.term),term.term);
  assert.equal(source.verification,term.verification);
 }
 for(const term of ['약물 증강제','두려움 상실','사기 진작','아로마 스틱','폭로 진행도'])assert.ok(!amendments.confirmedTerms.some(t=>t.term===term),term+' remains unverified from primary Korean text');
});
