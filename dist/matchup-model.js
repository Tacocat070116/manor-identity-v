// Presentation only: never change the reviewed records or infer an overall winner.
export function matchupBrief(records, own, opponent, situation = '') {
  const empty = {groups: [], opportunities: [], threats: [], held: [], situations: [], total: 0};
  if (!own || !opponent || own.side === opponent.side || own.name === opponent.name) return empty;
  const hunter = own.side === '감시자' ? own : opponent;
  const survivor = own.side === '생존자' ? own : opponent;
  const pair = records.filter(row => row.hunter === hunter.name && row.survivor === survivor.name);
  const accepted = pair.filter(row => row.status === '반영' && [own.name, opponent.name].includes(row.advantage));
  const matches = row => !situation || String(row.situation || '').includes(situation);
  const groups = new Map();
  for (const row of accepted.filter(matches)) {
    // Identical conclusions/conditions can have different situation labels and sources.
    // Keep every underlying record so all of those sources remain inspectable.
    const key = JSON.stringify([row.advantage, row.summary, row.condition]);
    if (!groups.has(key)) groups.set(key, {
      id: row.id, summary: row.summary, condition: row.condition,
      advantage: row.advantage, perspective: row.advantage === own.name ? 'opportunity' : 'threat',
      situations: [], records: [], priority: 0
    });
    const group = groups.get(key);
    group.records.push(row);
    if (!group.situations.includes(row.situation)) group.situations.push(row.situation);
    group.priority = Math.max(group.priority, Number(row.listPriority || 0));
  }
  const ordered = [...groups.values()].sort((a,b) => b.priority-a.priority || a.id.localeCompare(b.id));
  return {
    groups: ordered,
    opportunities: ordered.filter(group => group.perspective === 'opportunity'),
    threats: ordered.filter(group => group.perspective === 'threat'),
    held: pair.filter(row => row.status === '보류' && matches(row)),
    situations: [...new Set(pair.filter(row => ['반영','보류'].includes(row.status)).map(row => row.situation))],
    total: accepted.length
  };
}
