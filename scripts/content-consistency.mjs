import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const reviewedFields=['specialties','specialtyReasons','introduction','strengths','use','hold','caution'];
export function contentBundles(data,roles,introductions){
 return new Map(data.characters.map(c=>[c.id,{
  specialties:roles.characters[c.id].specialties,
  specialtyReasons:roles.characters[c.id].specialtyReasons,
  introduction:introductions.characters[c.id],
  strengths:c.strengths,use:c.use,hold:c.hold,caution:c.caution,
 }]));
}
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const contentFingerprint=bundle=>createHash('sha256').update(JSON.stringify(stable(bundle))).digest('hex');
export function validateContentReviews(bundles,register,previous=null){
 assert.equal(register.gameBalanceRevalidated,false,'Editorial coverage must not claim full game verification.');
 assert.deepEqual(Object.keys(register.characters).sort(),[...bundles.keys()].sort(),'Every character needs an editorial review.');
 for(const [id,bundle] of bundles){
  const review=register.characters[id],current=contentFingerprint(bundle);
  assert.equal(review.fingerprint,current,`${id}: 역할·소개·운용 설명을 함께 검토하고 검토 기록을 갱신하세요.`);
  assert.ok(review.assessment?.trim().length>=15,`${id}: 검토 결론이 필요합니다.`);
  assert.deepEqual(review.reviewedFields,reviewedFields,`${id}: 관련 설명 전체를 검토하세요.`);
  assert.match(review.date,/^\d{4}-\d{2}-\d{2}$/);
  if(previous?.has(id)){
   const before=contentFingerprint(previous.get(id));
   if(before!==current)assert.equal(review.baselineFingerprint,before,`${id}: 변경 전 설명에 맞는 검토 기록이 필요합니다.`);
  }
 }
 return bundles.size;
}
