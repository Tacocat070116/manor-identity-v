"""Apply the reviewed 2026-10-29 tournament delta to its immutable deployed base."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'research/refresh/2026-10-29'
path = RESEARCH / 'tournament/update-delta.json.gz'
delta = json.loads(gzip.decompress(path.read_bytes()))
# Use the publicly deployed tree, which has byte-identical baseline data.
# The recovered worktree's local commit ID is not part of GitHub history.
BASE = 'a1a49bda82880585a095e8e5982ff402d0a26fba'
BASE_TREE = 'af2641f071a71b62b446a080aca90fcc12639dfe'
def baseline(name):
    return json.loads(subprocess.check_output(['git', 'show', f'{BASE_TREE}:dist/{name}'], cwd=ROOT))
def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')

matches = baseline('matches.json')
legacy = baseline('bans.json')
observed = baseline('bans-observed.json')
details = baseline('tournament-details.json')
index = {r['id']: i for i,r in enumerate(details['rows'])}
unknown = {i: r.copy() for i,r in enumerate(matches) if r[5] is None}
for change in delta['detailCorrections']:
    i = index[change['id']]
    assert details['rows'][i] == change['before']
    details['rows'][i] = change['after']
for change in delta['dateCorrections']:
    i = change['coreIndex']
    assert matches[i] == change['beforeRow']
    assert change['beforeRow'][1:] == change['afterRow'][1:]
    matches[i] = change['afterRow']
    r = details['rows'][index[change['detailId']]]
    assert r['date'] == change['reportedSourceDate']
    r['date'] = change['verifiedMatchDate']
    for key, rows in [('observedBans',observed),('openingBans',legacy)]:
        for fix in change[key]:
            assert rows[fix['index']] == fix['before']
            rows[fix['index']] = fix['after']
matches.extend(e['row'] for e in delta['addedMatches'])
details['rows'].extend(delta['addedDetails'])
observed.extend(e['row'] for e in delta['addedObservedBans'])
for i,row in unknown.items(): assert matches[i] == row, ('Protected outcome', i)
summary = json.loads(json.dumps(delta['summary']))
summary['baseline'] = BASE
assert len(matches) == summary['after']['matches']
assert len(details['rows']) == len({r['id'] for r in details['rows']}) == summary['after']['details']
assert len(observed) == summary['after']['observedBans']
assert sum(r[5] is None for r in matches) == summary['after']['unknownResults']
assert max(r[0] for r in matches) == summary['after']['latestMatch']
assert all(r[0] <= summary['date'] and len(set(r[3])) == 4 for r in matches)

# Later official set-result observations stay separate from the historical
# import, with explicit partial coverage and unknown personal metrics.
increments = []
for addition_path in sorted((ROOT / 'research/refresh').glob('????-??-??/tournament/verified-additions.json')):
    addition = json.loads(addition_path.read_text())
    facts = ROOT / addition['sourceFacts']['path']
    assert hashlib.sha256(facts.read_bytes()).hexdigest() == addition['sourceFacts']['sha256']
    known_ids = {r['id'] for r in details['rows']}
    add_details = {r['id']: r for r in addition['addedDetails']}
    add_bans = {r['id']: r for r in addition['addedObservedBans']}
    assert len(add_details) == len(add_bans) == len(addition['addedMatches'])
    for item in addition['addedMatches']:
        row, identity = item['row'], item['id']
        assert identity not in known_ids and row not in matches, ('Duplicate observation needs review', identity)
        assert row[0] <= addition['checkedAt'] and len(set(row[3])) == 4
        detail, ban = add_details[identity], add_bans[identity]['row']
        assert [detail[k] for k in ['date', 'map', 'hunter', 'survivors', 'tournament', 'result']] == row[:6]
        assert ban[:3] == row[:3] and ban[4] == row[4] and not set(ban[3]).intersection(row[3])
        assert item['source'] == detail['source'] == add_bans[identity]['source']
        matches.append(row); details['rows'].append(detail); observed.append(ban)
        known_ids.add(identity)
    increments.append({'path':str(addition_path.relative_to(ROOT)), 'sha256':hashlib.sha256(addition_path.read_bytes()).hexdigest(),
                       'checkedAt':addition['checkedAt'], 'matches':len(addition['addedMatches']),
                       'details':len(add_details), 'observedBans':len(add_bans), 'stage':addition['stage'], 'coverage':addition['coverage']})
if increments:
    summary['historicalImportDate'] = delta['summary']['date']
    summary['date'] = max(summary['date'], *(a['checkedAt'] for a in increments))
    summary['after'].update(matches=len(matches), details=len(details['rows']), observedBans=len(observed), latestMatch=max(r[0] for r in matches))
    summary['addedMatches'] = len(matches) - summary['before']['matches']
    summary['addedDetails'] = len(details['rows']) - summary['before']['details']
    summary['addedObservedBans'] = len(observed) - summary['before']['observedBans']
    summary['increments'] = increments
    summary['latestCoverage'] = increments[-1]['coverage']
    for increment in increments:
        stage = increment['stage']
        summary['newCoreStages'][stage] = summary['newCoreStages'].get(stage, 0) + increment['matches']
assert len({r['id'] for r in details['rows']}) == len(details['rows'])
assert sum(r[5] is None for r in matches) == summary['after']['unknownResults']

# Keep the public details small without dropping zero, null, result or source semantics.
sources = sorted({r['source'] for r in details['rows']})
source_index = {url:i for i,url in enumerate(sources)}
compact = []
for r in details['rows']:
    assert len(r['players']) == 4 and {p['id'] for p in r['players']} == set(r['survivors'])
    compact.append([r['id'],r['date'],r['map'],r['tournament'],r['hunter'],r['survivors'],r['hunterTalents'],[[p[k] for k in ['id','talents','decode','rescues','kite','escaped']] for p in r['players']],source_index[r['source']],r['result']])
details['meta'].update(collectedAt=summary['date'], rounds=len(compact), sources=sources, note='공개 대회 기록의 기재값만 집계합니다. 미기재는 0이나 미선택으로 처리하지 않으며 서로 충돌하는 개인 지표는 기존 값을 유지합니다.')
if increments:
    details['meta']['latestCoverage'] = summary['latestCoverage']
details['meta'].pop('source', None)
output = {'schemaVersion':2,'meta':details['meta'],'columns':['id','date','map','tournament','hunter','survivors','hunterTalents','players','sourceIndex','result'],'playerColumns':['id','talents','decode','rescues','kite','escaped'],'rows':compact}
db = json.loads((ROOT/'dist/data.json').read_text())
statistics_keys = ['recordLatest','recordEarliest','matches','results','statisticsRefresh']
preserved = json.dumps({**db, 'meta':{k:v for k,v in db['meta'].items() if k not in statistics_keys}}, ensure_ascii=False, sort_keys=True)
ranked = json.loads((ROOT/'dist/ranked/index.json').read_text())['meta']
db['meta'].update(recordLatest=max(r[0] for r in matches), recordEarliest=min(r[0] for r in matches), matches=len(matches), results=sum(r[5] in ['승','무','패'] for r in matches))
db['meta']['statisticsRefresh'] = dict(summary, rankedRows=ranked['recordCount'], rankedNewRows=ranked['recordCount']-32667, rankedDatasets=ranked['datasetCount'], badgeRows=ranked['badgeRecordCount'])
# Keep the tournament's observed date separate from later ranked refreshes.
if ranked['collectedAt'] != summary['date']:
    db['meta']['statisticsRefresh']['rankedCollectedAt'] = ranked['collectedAt']
audit_dir = ROOT / 'research/refresh' / max(summary['date'], ranked['collectedAt'])
audit_dir.mkdir(parents=True, exist_ok=True)
old_meta = baseline('data.json')['meta']
for previous in sorted((ROOT / 'research/refresh').glob('????-??-??/metadata-edits.json')):
    if previous.parent.name >= audit_dir.name:
        continue
    for edit in json.loads(previous.read_text()):
        key = edit['path'].removeprefix('dist/data.json/meta/')
        assert (key in old_meta) == edit['beforeExists'] and old_meta.get(key) == edit['before']
        old_meta[key] = edit['after']
# Later editorial reviews have their own audit. Compare only statistics metadata
# against this import's baseline, preserving the current guide and review dates.
meta_edits = [{'path':'dist/data.json/meta/'+key,'beforeExists':key in old_meta,'before':old_meta.get(key),'after':db['meta'][key]} for key in statistics_keys if old_meta.get(key) != db['meta'].get(key)]
assert preserved == json.dumps({**db, 'meta':{k:v for k,v in db['meta'].items() if k not in statistics_keys}}, ensure_ascii=False, sort_keys=True)
dump(audit_dir/'metadata-edits.json',meta_edits)
for name,value in [('data.json',db),('matches.json',matches),('bans.json',legacy),('bans-observed.json',observed),('tournament-details.json',output)]: dump(ROOT/'dist'/name,value)
audit = {'date':audit_dir.name,'baseline':BASE,'delta':{'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()},'tournament':summary,'ranked':ranked,'publicFiles':[]}
for name in ['data.json','matches.json','bans.json','bans-observed.json','tournament-details.json']:
    p=ROOT/'dist'/name
    audit['publicFiles'].append({'path':'dist/'+name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
dump(audit_dir/'integration.json',audit)
print(json.dumps({'tournament':summary['after'],'detailBytes':(ROOT/'dist/tournament-details.json').stat().st_size,'ranked':ranked['recordCount']},ensure_ascii=False,indent=2))
