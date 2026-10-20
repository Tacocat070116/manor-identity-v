import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const review=read('research/patches/character-history-review.json');
const roster=read('dist/data.json').characters;
const patches=read('dist/patches/characters.json');
const archive=read('dist/patches/archive.json');
const official=new Map(archive.entries.flatMap(entry=>entry.sources.map(source=>[source.url,entry])));
const ids=new Set(roster.map(c=>c.id));
const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
assert.equal(review.audit.length,ids.size);
assert.equal(new Set(review.audit.map(a=>a.characterId)).size,ids.size);
assert.ok(validDay(review.meta.checkedAt));
const characters={},entryIds=new Set();let entryCount=0,changeCount=0;
for(const audit of review.audit){
 const id=audit.characterId;
 assert.ok(ids.has(id));
 assert.ok(['available','section-absent'].includes(audit.status));
 assert.equal(new URL(audit.sourceUrl).hostname,'namu.wiki');
 assert.ok(['www.namu.moe','m.namu.moe'].includes(new URL(audit.mirrorUrl).hostname));
 const entries=(review.characters[id]||[]).map(group=>{
  assert.ok(!entryIds.has(group.id));entryIds.add(group.id);
  assert.match(group.id,/^wiki-c\d{2}-\d{2}$/);
  if(group.precision==='day')assert.ok(validDay(group.date)&&group.date<=review.meta.checkedAt);
  else if(group.precision==='month')assert.match(group.date,/^20\d{2}-(0[1-9]|1[0-2])$/);
  else{assert.equal(group.date,null);assert.ok(['unknown','season'].includes(group.precision));if(group.precision==='season')assert.match(group.period,/^시즌 \d+$/);}
  assert.ok(group.changes.length);
  const changes=group.changes.map(change=>{
   assert.ok(['buff','nerf','adjustment'].includes(change.impact));
   assert.ok(change.text.trim());assert.match(change.sourceLines,/^[\d,\-]+$/);
   return {impact:change.impact,text:change.text};
  });
  const result={id:group.id,date:group.date,precision:group.precision,changes};
  if(group.period)result.period=group.period;
  if(group.note)result.note=group.note;
  if(group.officialUrl){
   const source=official.get(group.officialUrl);
   assert.ok(source,'공식 출처가 기존 공지 목록에 없습니다: '+group.officialUrl);
   assert.equal(source.scope,'live');assert.equal(source.dateStatus,'confirmed');assert.equal(source.date,group.date);
   result.officialUrl=group.officialUrl;result.patchId=source.id;
  }
  entryCount++;changeCount+=changes.length;return result;
 });
 assert.equal(entries.length>0,audit.status==='available');
 characters[id]={status:audit.status,sourceUrl:audit.sourceUrl,mirrorUrl:audit.mirrorUrl,entries};
}
assert.deepEqual(Object.keys(review.characters).sort(),review.audit.filter(a=>a.status==='available').map(a=>a.characterId).sort());
patches.history={meta:{...review.meta,auditedCharacters:ids.size,withWikiHistory:Object.keys(review.characters).length,entryCount,changeCount},characters};
fs.writeFileSync('dist/patches/characters.json',JSON.stringify(patches)+'\n');
console.log(`PASS: ${ids.size}개 문서 확인, ${Object.keys(review.characters).length}명 · ${entryCount}개 이력 · ${changeCount}개 변경 반영.`);
