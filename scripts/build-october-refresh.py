"""Reproduce the October 22 patch / October 27 data refresh.

Only new source rounds are reconciled. Previously held conflicts and the
original opening-ban population must not be silently rewritten.
"""
import collections
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'bc3011122fac5c9fd798fbe97f57dbbdd5c7c594'
DATE = '2026-10-27'
OUT = ROOT / 'research/refresh' / DATE

def baseline(name):
    return json.loads(subprocess.check_output(['git', 'show', f'{BASE}:dist/{name}'], cwd=ROOT))

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')

def clean(value):
    return re.sub(r'[「」『』\s]', '', value or '')

def key(row):
    return (row[0], row[1], row[2], tuple(sorted(row[3])), row[4])

db = baseline('data.json')
matches, bans = baseline('matches.json'), baseline('bans.json')
detail_data = baseline('tournament-details.json')
details, observed_bans = detail_data['rows'], baseline('bans-observed.json')
known_ids = {r['id'] for r in details}
raw = json.loads((OUT / 'match-log.json').read_text())
assert not raw['errors'], raw['errors']
aliases = json.loads((ROOT / 'research/search/characters.json').read_text())['characters']
names = {clean(n): cid for cid, c in aliases.items() for n in [c['name']] + c['aliases']}
by_id = {c['id']: c for c in db['characters']}
maps = dict(zip(['軍需工場', '月の河公園', '罪の森', 'レオの思い出', '赤の教会', '聖心病院', '永眠町', '中華街', '湖景村'], db['maps']))
available = collections.defaultdict(list)
for index, row in enumerate(matches):
    available[key(row)].append(index)
protected = {r['index'] for r in json.loads((ROOT / 'research/refresh/2026-10-21/reconciliation.json').read_text())['conflictingResults']}
report = dict(date=DATE, baseline=BASE, added=[], filledResults=[], conflictingResults=[], excluded=[], heldBans=[], duplicateRounds=0, previousMatches=len(matches), previousDetails=len(details), previousObservedBans=len(observed_bans))
hunter_talents = {'裏向きカード':'히든카드', '引き留める':'만류', '傲慢':'요란법석', '閉鎖空間':'밀폐 공간'}
survivor_talents = {'中治り':'마지막 희망', '危機一髪':'위기 모면', '膝蓋腱反射':'무릎 반사', 'フライホイール効果':'플라이휠 효과'}

for match in raw['matches']:
    assert match['league'] in ['1', '2', '3', '4', '5', '7', '11', '12', '13']
    tournament = 'IVL' if match['league'] in ['4', '7', '11', '12'] else 'IJL'
    for r in match['rounds']:
        if r['id'] in known_ids:
            continue
        hunter = names[clean(r['hunter'])]
        survivors = [names[clean(s['name'])] for s in r['survivors']]
        if r['date'] > DATE or len(survivors) != 4 or len(set(survivors)) != 4 or by_id[hunter]['side'] != '감시자' or any(by_id[c]['side'] != '생존자' for c in survivors):
            report['excluded'].append(dict(id=r['id'], source=r['source'], reason='미래 경기 또는 잘못된 진영·중복 구성'))
            continue
        escaped = r['escaped']
        assert escaped in range(5)
        assert (r['hunterScore'], r['survivorScore']) == [(5,0),(3,1),(2,2),(1,3),(0,5)][escaped], r['id']
        result = '승' if escaped < 2 else '무' if escaped == 2 else '패'
        row = [r['date'], maps[r['map']], hunter, survivors, tournament, result, escaped]
        bucket = available[key(row)]
        conflict = False
        if bucket:
            exact = next((i for i in bucket if matches[i][5:] == row[5:]), None)
            unknown = next((i for i in bucket if matches[i][5] is None and i not in protected), None)
            i = exact if exact is not None else unknown if unknown is not None else bucket[0]
            bucket.remove(i)
            report['duplicateRounds'] += 1
            if i in protected:
                conflict = True
            elif matches[i][5] is None:
                matches[i][5:] = row[5:]
                report['filledResults'].append(dict(id=r['id'], index=i, source=r['source'], result=row[5:]))
            elif matches[i][5:] != row[5:]:
                report['conflictingResults'].append(dict(id=r['id'], index=i, source=r['source'], baseline=matches[i][5:], collected=row[5:]))
                matches[i][5:] = [None, None]
                conflict = True
        else:
            matches.append(row)
            report['added'].append(dict(id=r['id'], source=r['source'], row=row))
        ban_ids = [names[clean(n)] for b in r['bans'] if b['label']=='SURVIVOR BAN' for n in b['characters']]
        if ban_ids and len(set(ban_ids))==len(ban_ids) and not set(ban_ids).intersection(survivors) and all(by_id[c]['side']=='생존자' for c in ban_ids):
            observed_bans.append(row[:3] + [ban_ids, tournament])
        else:
            report['heldBans'].append(dict(id=r['id'], source=r['source'], reason='중복·누락·잘못된 진영 또는 출전 구성과 겹치는 밴'))
        consistent = not conflict and sum(s['escaped'] for s in r['survivors'])==escaped
        players = []
        for cid, s in zip(survivors, r['survivors']):
            kite = re.fullmatch(r'(\d+):(\d{2})', s['kite'])
            players.append(dict(id=cid, talents=sorted({survivor_talents[p] for p in s['personas'] if p in survivor_talents}), decode=s['decode'], rescues=s['rescues'], kite=int(kite[1])*60+int(kite[2]) if kite else None, escaped=s['escaped'] if consistent else None))
        details.append(dict(id=r['id'], date=r['date'], map=row[1], tournament=tournament, hunter=hunter, survivors=survivors, hunterTalents=sorted({hunter_talents[p] for p in r['hunterPersonas'] if p in hunter_talents}), players=players, source=r['source'], result=None if conflict else result))
        known_ids.add(r['id'])

patch = json.loads((OUT / 'patch-review.json').read_text())
for edit in patch['characters']:
    c = by_id[edit['id']]
    for field, value in edit['after'].items():
        assert c[field] == edit['before'][field], (c['name'], field)
        c[field] = value
    c['patchCheckedAt'] = DATE
    c['gamePatchDate'] = patch['patchDate']
    if patch['source'] not in c['sources']:
        c['sources'].append(patch['source'])
for edit in patch['matchups']:
    m = next(m for m in db['matchups'] if m['id']==edit['id'])
    for field, value in edit['after'].items():
        assert m[field] == edit['before'][field], (m['id'], field)
        m[field] = value
    m['patchCheckedAt'] = DATE
    m['urls'].append(patch['source'])
    m['sourceSupport'].append(dict(url=patch['source'], support='exception', note='10/22 지상 방사 구역이 공연 중 신동과 흙공을 동시에 타격하던 오류 수정', sourceFamily='netease-official'))
    m['documents'] = len(m['urls'])
for c in db['characters']:
    for kind in ['hard', 'easy']:
        for item in c[kind]:
            m = next(m for m in db['matchups'] if m['id']==item['evidence'])
            item['reason'] = f"[{m['situation']}] {m['summary']}\n조건: {m['condition']}"

# Retired source-browser payload is preserved in research, outside public boot data.
archive = dict(archivedAt=DATE, baseline=BASE, sources=db.pop('sources'), community=db.pop('community'))
write(OUT / 'retired-public-data.json', archive)
db['meta'].update(recordLatest=max(r[0] for r in matches), matches=len(matches), results=sum(r[5] in ['승','무','패'] for r in matches), gamePatchDate=patch['patchDate'], gamePatchCheckedAt=DATE, matchupPatchDate=patch['patchDate'])
db['meta']['refresh'] = dict(date=DATE, newMatches=len(report['added']), filledResults=len(report['filledResults']), conflictingResults=len(report['conflictingResults']), observedRounds=len(details), observedBans=len(observed_bans), observedBanLatest=max(r[0] for r in observed_bans), charactersPatchChecked=len(patch['characters']), rankedCheckedAt=DATE, rankedNewRows=0, rankedNote='신규 집계 원자료를 검증하지 못해 기존 수집일·집계 기간을 유지합니다.')
report['totals'] = {k:db['meta'][k] for k in ['matches','results','bans','recordLatest']}
report['observedRounds'], report['observedBans'] = len(details), len(observed_bans)
report['addedRoundIds'] = [r['id'] for r in details[report['previousDetails']:]]
report['individualResultOmissions'] = [r['id'] for r in details[report['previousDetails']:] if any(p['escaped'] is None for p in r['players'])]
detail_data['meta'].update(collectedAt=DATE, rounds=len(details))
write(ROOT / 'dist/data.json', db)
write(ROOT / 'dist/matches.json', matches)
write(ROOT / 'dist/tournament-details.json', detail_data)
write(ROOT / 'dist/bans-observed.json', observed_bans)
write(OUT / 'reconciliation.json', report)
print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in report.items()},ensure_ascii=False,indent=2))
