export {matchesCharacter,sortCharacters,characterSortOptions} from './character-search.js?v=bb16060d15ab';
export const REFERENCE_DATE = '2026-10-27';
export function cutoff(days, reference = REFERENCE_DATE) {
  if (!Number(days)) return '';
  const d = new Date(reference + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - Number(days));
  return d.toISOString().slice(0, 10);
}
export function filterRows(rows, filters = {}) {
  const start = cutoff(filters.days, filters.reference);
  return rows.filter(r => (!start || r[0] >= start) && (!filters.map || r[1] === filters.map) && (!filters.tournament || r[4] === filters.tournament));
}
export function statsFor(rows, character, filters = {}) {
  const base = filterRows(rows, filters);
  const present = base.filter(r => r[2] === character.id || r[3].includes(character.id));
  const filtered = filters.opponent ? present.filter(r => r[2] === filters.opponent || r[3].includes(filters.opponent)) : present;
  const totals = { appearances: filtered.length, results: 0, win: 0, draw: 0, loss: 0, unknown: 0, base: base.length };
  for (const r of filtered) {
    if (!['승','무','패'].includes(r[5])) { totals.unknown++; continue; }
    totals.results++;
    if (r[5] === '무') totals.draw++;
    else if ((r[5] === '승') === (character.side === '감시자')) totals.win++;
    else totals.loss++;
  }
  totals.winRate = totals.results > 0 ? totals.win / totals.results : null;
  totals.smallSample = totals.results > 0 && totals.results < 50;
  return totals;
}
export function rankBans(rows, selections, filters = {}) {
  const selected = selections.filter(Boolean);
  if (!selected.length) return { error:'밴한 생존자를 1명 이상 선택하세요.', base:0, matched:0, ranks:[] };
  if (new Set(selected).size !== selected.length) return { error:'동일한 생존자를 중복 선택할 수 없습니다.',base:0,matched:0,ranks:[] };
  const excluded = new Set((filters.excluded || []).filter(Boolean));
  const base = filterRows(rows, filters).filter(r => !excluded.has(r[2]));
  const matched = base.filter(r => selected.every(id => r[3].includes(id)));
  const all = {}, hits = {};
  base.forEach(r => all[r[2]] = (all[r[2]] || 0) + 1);
  matched.forEach(r => hits[r[2]] = (hits[r[2]] || 0) + 1);
  const ranks = matched.length ? Object.entries(all).map(([id,n]) => ({
    id, base:n, count:hits[id] || 0, share:(hits[id] || 0)/matched.length, baseline:n/base.length,
    score:((hits[id] || 0) + 20*n/base.length)/(matched.length+20)
  })).sort((a,b) => b.score-a.score || b.count-a.count || a.id.localeCompare(b.id)) : [];
  return { base:base.length,matched:matched.length,ranks:ranks.slice(0,5),error:null };
}
export function pairEvidence(data, own, opponent, situation = '') {
  const seen = new Set();
  return data.filter(x => {
    if (x.status !== '반영' || !((x.hunter === own.name && x.survivor === opponent.name) || (x.hunter === opponent.name && x.survivor === own.name)) || (situation && x.situation!==situation && !x.situation.split('·').includes(situation) && x.situationDetail !== situation)) return false;
    // Keep historical evidence IDs, but render identical reviewed text and
    // sources once. Different situations and opposing findings remain visible.
    const sources = (x.sourceSupport || []).map(s => s.url).sort();
    const key = JSON.stringify([x.hunter,x.survivor,x.advantage,x.situation,x.situationDetail,x.summary,x.condition,sources]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function safeUrl(value) {
  try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
}
