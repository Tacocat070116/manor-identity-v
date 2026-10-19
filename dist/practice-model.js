import {practiceData} from './practice-data.js?v=ca93eba3395a';

export {practiceData};
export const practiceKinds = {
  supported: '조건에 맞는 선택',
  conditional: '조건부 선택',
  caution: '기전 확인 필요',
  unknown: '추가 확인 필요'
};
export const activePracticeScenes = data => data.scenarios.filter(scene => scene.status === 'beta');
export function practiceEntryFor(own, opponent, data = practiceData) {
  return activePracticeScenes(data).find(scene => scene.own === own && (!opponent || scene.opponent === opponent));
}
export function selectPractice(data, params = {}) {
  const active = activePracticeScenes(data);
  const supported = [...new Set(active.map(scene => scene.own))];
  const unsupported = Boolean(params.character && !supported.includes(params.character));
  const character = supported.includes(params.character) ? params.character : '';
  const scenes = active.filter(scene => !character || scene.own === character);
  let scene = unsupported ? null : scenes.find(item => item.id === params.scene) || null;
  const invalidVariant = Boolean(scene && params.variant && !scene.variants.some(item => item.id === params.variant));
  if (invalidVariant) scene = null;
  const variant = scene?.variants.find(item => item.id === params.variant) || scene?.variants[0] || null;
  return {supported, character, scenes, scene, variant,
    unsupported,
    unavailable: Boolean(params.scene && !scene) || invalidVariant};
}
export function practiceFeedback(scene, variant, actionId, reasonId) {
  const action = scene.actions.find(item => item.id === actionId);
  const reason = scene.reasons.find(item => item.id === reasonId);
  const feedback = variant?.feedback[action?.id];
  if (!action || !reason || !feedback) return null;
  return {...feedback, action, reason, reasonAligned: reason.id === variant.reasonId,
    reasonExplanation: variant.reasonExplanation};
}
export function practiceKey(data, scene, variant) {
  return [data.version, scene.id, variant.id].join(':');
}
export function readPracticeProgress(storage, data = practiceData) {
  try {
    const parsed = JSON.parse(storage?.getItem('manor-practice-progress') || '[]');
    if (!Array.isArray(parsed)) return new Set();
    const allowed = new Set(activePracticeScenes(data).flatMap(scene => scene.variants.map(variant => practiceKey(data, scene, variant))));
    return new Set(parsed.filter(value => typeof value === 'string' && allowed.has(value)));
  } catch { return new Set(); }
}
export function markPracticeViewed(storage, progress, key) {
  progress.add(key);
  try { storage.setItem('manor-practice-progress', JSON.stringify([...progress])); return true; }
  catch { return false; }
}
