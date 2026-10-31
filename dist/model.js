export {matchesCharacter,sortCharacters,characterSortOptions} from './character-search.js?v=bb16060d15ab';
export const REFERENCE_DATE = '2026-10-31';
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
// These are observed tournament records, never a prediction or a smoothed score.
export function queryBanRecords(rows, selections, filters = {}) {
  const selected = selections.filter(Boolean);
  const empty = {base:0,matched:0,groups:[],rows:[],firstDate:'',lastDate:''};
  if (!selected.length) return {...empty,error:'밴한 생존자를 1명 이상 선택하세요.'};
  if (new Set(selected).size !== selected.length) return {...empty,error:'동일한 생존자를 중복 선택할 수 없습니다.'};
  const excluded = new Set((filters.excluded || []).filter(Boolean));
  const base = filterRows(rows, filters).filter(r => !excluded.has(r[2]));
  // A subset match: a record may contain additional survivor bans.
  const matched = base.filter(r => selected.every(id => r[3].includes(id))).sort((a,b)=>b[0].localeCompare(a[0]));
  const counts = new Map();
  for (const row of matched) counts.set(row[2],(counts.get(row[2])||0)+1);
  const groups = [...counts].map(([id,count])=>({id,count,share:count/matched.length}))
    .sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
  return {base:base.length,matched:matched.length,groups,rows:matched,
    firstDate:matched.at(-1)?.[0]||'',lastDate:matched[0]?.[0]||'',error:null};
}
export function banRecordPage(rows, page=1, size=20) {
  const pages=Math.max(1,Math.ceil(rows.length/size));
  const current=Math.min(pages,Math.max(1,Math.trunc(Number(page))||1));
  return {page:current,pages,total:rows.length,rows:rows.slice((current-1)*size,current*size)};
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
