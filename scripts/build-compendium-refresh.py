"""Reproduce the 2026-10-21 refresh from the deployed baseline and collected facts.

No rating is inferred from tournament wins. Repeated rosters are matched as a
multiset; an unknown result is filled only when the roster/date/map agree.
"""
import collections
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'research/refresh/2026-10-21'
BASE = '6af35a7499eba82fd4daa4d1dc9a5cf187e32357'
DATE = '2026-10-21'

def baseline(name):
    return json.loads(subprocess.check_output(['git', 'show', f'{BASE}:dist/{name}'], cwd=ROOT))

def write(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n')

def clean(s):
    return re.sub(r'[「」『』\s]', '', s or '')

def key(row):
    return (row[0], row[1], row[2], tuple(sorted(row[3])), row[4])

db = baseline('data.json')
matches, bans = baseline('matches.json'), baseline('bans.json')
aliases = json.loads((ROOT / 'research/search/characters.json').read_text())['characters']
names = {clean(n): cid for cid, c in aliases.items() for n in [c['name']] + c['aliases']}
by_id = {c['id']: c for c in db['characters']}
map_names = dict(zip(['軍需工場', '月の河公園', '罪の森', 'レオの思い出', '赤の教会', '聖心病院', '永眠町', '中華街', '湖景村'], db['maps']))
raw = json.loads((OUT / 'match-log.json').read_text())
assert not raw['errors'], raw['errors']
available = collections.defaultdict(list)
for i, row in enumerate(matches):
    available[key(row)].append(i)
ban_available = collections.Counter(key(r) for r in bans)
report = dict(date=DATE, baseline=BASE, collectedMatches=len(raw['matches']), collectedRounds=sum(len(m['rounds']) for m in raw['matches']), added=[], filledResults=[], conflictingResults=[], excluded=[], duplicateRounds=0, addedBans=[], heldBans=[])
details, observed_bans = [], []
hunter_talents = {'裏向きカード': '히든카드', '引き留める': '만류', '傲慢': '요란법석', '閉鎖空間': '밀폐 공간'}
survivor_talents = {'中治り': '마지막 희망', '危機一髪': '위기 모면', '膝蓋腱反射': '무릎 반사', 'フライホイール効果': '플라이휠 효과'}

for match in raw['matches']:
    tournament = 'IVL' if match['league'] in ['4', '7', '11', '12'] else 'IJL'
    for r in match['rounds']:
        hunter = names[clean(r['hunter'])]
        survivors = [names[clean(s['name'])] for s in r['survivors']]
        if r['date'] > DATE or len(survivors) != 4 or len(set(survivors)) != 4 or by_id[hunter]['side'] != '감시자' or any(by_id[c]['side'] != '생존자' for c in survivors):
            report['excluded'].append({'id': r['id'], 'source': r['source'], 'reason': '미래 경기 또는 잘못된 진영·중복 캐릭터 구성'})
            continue
        escaped = r['escaped']
        assert escaped in range(5)
        assert (r['hunterScore'], r['survivorScore']) == [(5, 0), (3, 1), (2, 2), (1, 3), (0, 5)][escaped], r['id']
        result = '승' if escaped < 2 else '무' if escaped == 2 else '패'
        row = [r['date'], map_names[r['map']], hunter, survivors, tournament, result, escaped]
        bucket = available[key(row)]
        conflict = False
        if bucket:
            exact = next((i for i in bucket if matches[i][5:] == row[5:]), None)
            unknown = next((i for i in bucket if matches[i][5] is None), None)
            i = exact if exact is not None else unknown if unknown is not None else bucket[0]
            bucket.remove(i)
            report['duplicateRounds'] += 1
            if matches[i][5] is None:
                matches[i][5:] = row[5:]
                report['filledResults'].append({'id': r['id'], 'index': i, 'source': r['source'], 'result': row[5:]})
            elif matches[i][5:] != row[5:]:
                report['conflictingResults'].append({'id': r['id'], 'index': i, 'source': r['source'], 'baseline': matches[i][5:], 'collected': row[5:]})
                matches[i][5:] = [None, None]
                conflict = True
        else:
            matches.append(row)
            report['added'].append({'id': r['id'], 'source': r['source'], 'row': row})
        survivor_bans = next((b['characters'] for b in r['bans'] if b['label'] == 'SURVIVOR BAN'), [])
        ban_ids = [names[clean(n)] for n in survivor_bans]
        if ban_ids and len(set(ban_ids)) == len(ban_ids) and not set(ban_ids).intersection(survivors) and all(by_id[x]['side'] == '생존자' for x in ban_ids):
            br = row[:3] + [ban_ids, tournament]
            # The new source reports the full survivor-ban list; the legacy
            # import reports opening bans. Never merge those denominators.
            observed_bans.append(br)
        else:
            report['heldBans'].append({'id': r['id'], 'source': r['source'], 'reason': '중복·누락·잘못된 진영 또는 출전 선수와 겹치는 밴 목록'})
        consistent = not conflict and sum(s['escaped'] for s in r['survivors']) == escaped
        people = []
        for cid, s in zip(survivors, r['survivors']):
            kite = re.fullmatch(r'(\d+):(\d{2})', s['kite'])
            people.append({'id': cid, 'talents': sorted({survivor_talents[p] for p in s['personas'] if p in survivor_talents}), 'decode': s['decode'], 'rescues': s['rescues'], 'kite': int(kite[1]) * 60 + int(kite[2]) if kite else None, 'escaped': s['escaped'] if consistent else None})
        details.append({'id': r['id'], 'date': r['date'], 'map': row[1], 'tournament': tournament, 'hunter': hunter, 'survivors': survivors, 'hunterTalents': sorted({hunter_talents[p] for p in r['hunterPersonas'] if p in hunter_talents}), 'players': people, 'source': r['source'], 'result': None if conflict else result})

# All 89 source checks apply only to the explicitly reviewed core-skill scope.
edits = json.loads((OUT / 'guide-edits.json').read_text())['records']
assert len(edits) == len(by_id) == len({e['id'] for e in edits})
source_by_url = {unquote(s['url']): s for s in db['sources']}
for edit in edits:
    c = by_id[edit['id']]
    c.update(skill=edit['skill'], caution=edit['caution'], reviewedAt=DATE, guideReviewScope='핵심 스킬·자원 관리·주의점 보강; 난이도와 기본 인격의 실전 재검증일은 아님')
    url = unquote(edit['source'])
    if url not in [unquote(u) for u in c['sources']]:
        c['sources'].append(url)
    if url in source_by_url:
        source_by_url[url]['latestSkillCheck'] = DATE
        source_by_url[url]['note'] += ' 2026-10-21 외재 특성·핵심 스킬 설명 재확인.'
    else:
        item = dict(id=f"S{len(db['sources']) + 1:03d}", region='일본', site=c['name'] + ' 스킬·운용', type='유저 공동편집 공략', status='스킬 검토', scope=c['name'] + ' · 외재 특성·핵심 스킬·자원 관리', url=url, original=url, date=DATE, note=edit['scope'], sourceFamily='identity5ch', publishedAt=None)
        db['sources'].append(item)
        source_by_url[url] = item

synergy_edits = json.loads((OUT / 'synergy-edits.json').read_text())['records']
for edit in synergy_edits:
    existing = next((l for l in db['links'] if l['character'] == edit['character'] and l['target'] == edit['target'] and l['type'] == '시너지'), None)
    if existing:
        existing.update(edit)
        existing['order'] = 0
    else:
        db['links'].append(dict(edit, order=0))

# Keep the 49 unresolved records held. Concrete one-source mechanics remain
# useful when the source strength and the situational limits are visible.
for m in db['matchups']:
    supports = [s for s in m['sourceSupport'] if s['support'] in ['direct', 'mechanic', 'exception'] and s.get('note')]
    m['listEligible'] = m['status'] == '반영' and bool(supports) and bool(m.get('situation') and m.get('condition'))
    m['evidenceLevel'] = '복수 출처' if len(m['sourceFamilies']) >= 2 else '단일 출처'
    if m['listEligible']:
        m.pop('listExclusion', None)
    m['selectionReviewedAt'] = DATE

for c in db['characters']:
    for kind in ['hard', 'easy']:
        records = [m for m in db['matchups'] if m['listEligible'] and c['name'] in [m['hunter'], m['survivor']] and (m['advantage'] == c['name']) == (kind == 'easy')]
        records.sort(key=lambda m: (-((m.get('listPriority') or 3) * 100 + len(m['sourceFamilies']) * 5 + m.get('priority', 0) / 100), m['id']))
        items = []
        seen = set()
        for m in records:
            opponent = m['survivor'] if c['side'] == '감시자' else m['hunter']
            if opponent in seen:
                continue
            seen.add(opponent)
            items.append(dict(name=opponent, reason=f"[{m['situation']}] {m['summary']}\n조건: {m['condition']}", evidence=m['id']))
        c[kind] = items[:5]

db['sources'].append(dict(id=f"S{len(db['sources']) + 1:03d}", region='일본', site='第五人格 大会データベース', type='공개 대회 기록 · 팬 제작', status='대회 원자료 대조', scope='2025 가을·2026 여름 IJL / 2026 여름·가을 IVL · 출전·맵·결과·인격·개인 기록', url=raw['source'], original=raw['source'] + '/about', date=DATE, note='공식 중계 등을 정리한 팬 기록입니다. 알파 운영 중인 원자료의 오류 가능성을 보존하고 중복·구성·점수 일관성을 검사했습니다. 과거 통계와 겹치는 기록은 한 번만 계산합니다.', sourceFamily='identityv-match-log', publishedAt=None))
db['meta'].update(reviewedAt=DATE, recordLatest=max(r[0] for r in matches), banLatest=max(r[0] for r in bans), matches=len(matches), results=sum(r[5] in ['승', '무', '패'] for r in matches), bans=len(bans), sourceCount=len(db['sources']), matchupSelectionReviewedAt=DATE)
db['meta']['refresh'] = dict(date=DATE, newMatches=len(report['added']), latestRounds=sum(x['row'][0] > '2026-10-05' for x in report['added']), filledResults=len(report['filledResults']), conflictingResults=len(report['conflictingResults']), observedRounds=len(details), observedBans=len(observed_bans), observedBanLatest=max(r[0] for r in observed_bans), charactersReviewed=89, rankedCheckedAt=DATE, rankedNewRows=0, rankedNote='기존 중국 보관소·아시아 공개표를 재확인했으나 새로운 집계 원자료는 확보하지 못했습니다. 기존 수집일·집계 기간을 유지합니다.')
db['meta']['matchupReview']['method'] = '공식 패치 대조 · 상황·조건과 출처 강도 표시 · 단일 출처 기전 및 조건별 반대 방향도 공개'
db['meta']['matchupReview']['excludedMixedPairs'] = 0
report['accepted'] = sum(m['status'] == '반영' for m in db['matchups'])
report['held'] = sum(m['status'] == '보류' for m in db['matchups'])
report['displayedSlots'] = sum(len(c['hard']) + len(c['easy']) for c in db['characters'])
report['eligibleRecords'] = sum(m['listEligible'] for m in db['matchups'])
report['totals'] = {k: db['meta'][k] for k in ['matches', 'results', 'bans', 'sourceCount', 'recordLatest']}
report['individualResultOmissions'] = [r['id'] for r in details if any(p['escaped'] is None for p in r['players'])]
write(ROOT / 'dist/data.json', db)
write(ROOT / 'dist/matches.json', matches)
write(ROOT / 'dist/bans.json', bans)
write(ROOT / 'dist/bans-observed.json', observed_bans)
write(ROOT / 'dist/tournament-details.json', {'meta': {'collectedAt': DATE, 'source': raw['source'], 'rounds': len(details), 'note': '공개 대회 원문에 기재된 인격·개인 기록만 집계. 인격 미기재는 추천이나 미선택으로 추정하지 않음.'}, 'rows': details})
write(OUT / 'reconciliation.json', report)
print(json.dumps({k: len(v) if isinstance(v, list) else v for k, v in report.items()}, ensure_ascii=False, indent=2))
