"""Rebuild ranked archives from immutable baseline + reviewed dated inputs.
No averaging across sources, tiers, servers or overlapping periods is performed.
"""
import gzip
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from public_payload import compact_payload

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/ranked'
INPUT = ROOT / 'research/ranked/normalized-inputs.json.gz'
CONFIG = ROOT / 'research/ranked/refreshes.json'
SERVERS = {'asia', 'cn'}
OUT.mkdir(parents=True, exist_ok=True)

def read(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

inputs = read(INPUT)
config = read(CONFIG)
DATE = config['collectedAt']
roster = read(ROOT / 'dist/data.json')['characters']
by_name = {c['name']: c for c in roster}
by_id = {c['id']: c for c in roster}
japanese = dict(zip(
    ['復讐者','道化師','断罪狩人','リッパー','結魂者','芸者','白黒無常','写真家','狂眼','黄衣の王','夢の魔女','泣き虫','魔トカゲ','血の女王','ガードNo.26','使徒','ヴァイオリニスト','彫刻師','アンデッド','破輪','漁師','蝋人形師','悪夢','書記官','隠者','夜の番人','オペラ歌手','フールズ・ゴールド','時空の影','足萎えの羊','フラバルー','雑貨商','ビリヤードプレイヤー','女王蜂','歯医者','心の獣'],
    ['공장장','광대','사냥터지기','리퍼','거미','붉은 나비','우산의 영혼','사진사','광기의 눈','노란 옷의 왕','꿈의 마녀','울보','재앙의 도마뱀','블러디 퀸','수위 26호','사도','바이올리니스트','조각가','박사','파멸의 바퀴','나이아스','밀랍인형사','악몽','서기관','은둔자','나이트 워치','오페라 가수','파이라이트','시공의 그림자','절름발이 판','훌라발루','잡화상','당구 선수','여왕벌','치과의사','마음의 짐승']))

def identify(row):
    cid = row.get('characterId') or row.get('id')
    if cid in by_id:
        c = by_id[cid]
    else:
        name = re.sub('[「」『』]', '', row['name'])
        c = by_name[japanese.get(name, name)]
    assert c['side'] == row['side'], row
    return c

sources = {s['id']: s for g in [inputs['cn'], inputs['global'], inputs['badges']] for s in g['sources']}
sets = {d['id']: d for g in [inputs['cn'], inputs['global']] for d in g['datasets'] if d['server'] in SERVERS}
badge_sets = {d['id']: d for d in inputs['badges']['datasets']}
input_files = [{'path': str(INPUT.relative_to(ROOT)), 'sha256': digest(INPUT)}]
replacements = []
raw_sources = list(inputs['manifest'])
for kind, target in [('ranked', sets), ('badges', badge_sets)]:
    for spec in config[kind]:
        path = ROOT / spec['path']
        group = read(path)
        assert group.get('meta', {}).get('complete', True), 'Incomplete collection: ' + str(path)
        assert not group.get('conflicts'), 'Resolve source conflicts before building'
        allowed = set(group.get('replaceDatasetIds', [])) | set(spec.get('replaceDatasetIds', []))
        for d in group['datasets']:
            assert d['server'] in SERVERS
            d.setdefault('sourceCollectedAt', group.get('collectedAt', DATE))
            if d['id'] in target:
                assert d['id'] in allowed, ('Unreviewed replacement', d['id'])
                before = target[d['id']]
                replacements.append({'kind': kind, 'id': d['id'], 'oldRows': len(before['rows']), 'newRows': len(d['rows']), 'input': spec['path']})
            target[d['id']] = d
        sources.update({s['id']: s for s in group.get('sources', [])})
        raw_sources.extend(group.get('rawSources', []))
        input_files.append({'path': spec['path'], 'sha256': digest(path)})

# Exclude source-error cohorts entirely, including explicitly requested old links.
# The source inputs remain provenance; excluded rows never reach a public partition.
excluded = []
for sid, d in list(sets.items()):
    if d.get('status') in config['excludedStatuses']:
        excluded.append({'id': sid, 'rows': len(d['rows']), 'reason': 'unconfirmed-source-correction', 'sourceWarnings': d.get('sourceWarnings', [])})
        del sets[sid]
assert not config.get('maps'), 'Map inputs are outside this statistics task'

# Some first-day weekly tables exactly repeat the daily table. Keep one observation.
equivalences = []
for sid, d in list(sets.items()):
    alias = d.get('sameObservationAs')
    if not alias: continue
    target = sets[alias]
    for key in ['server','season','tier','periodStart','periodEnd']:
        assert str(d.get(key)).removeprefix('S') == str(target.get(key)).removeprefix('S'), (sid,key)
    row_key = lambda r: (identify(r)['id'], *[r.get(k) for k in ['pick','win','draw','loss','ban']])
    assert sorted(map(row_key,d['rows'])) == sorted(map(row_key,target['rows'])), sid
    target.setdefault('alsoPublishedAs', []).append(d['periodKind'])
    equivalences.append({'id':sid,'canonicalId':alias,'rows':len(d['rows']),'sourceUrl':d.get('sourceUrl')})
    del sets[sid]
cohorts = set()
for d in sets.values():
    key = tuple(str(d.get(k)) for k in ['server','season','tier','periodStart','periodEnd','periodKind'])
    assert key not in cohorts, ('Duplicate cohort', d['id'])
    cohorts.add(key)

# The public catalog carries selection metadata only. Full provenance stays in research.
public_keys = {'id','sourceId','sourceIds','server','season','tier','asOf','periodStart','periodEnd','periodKind','timeLabel','status','excludeFromDefault','priority','sampleSize','pickBasis','banBasis','sourceCollectedAt','availableSides','missingSourceCharacters','sourceWarnings','officialCorrectionConfirmed','alsoPublishedAs'}
parts = defaultdict(list)
audit_datasets = []
datasets = []
badges = []

def metadata(d, path):
    meta = {k: v for k, v in d.items() if k != 'rows'}
    if 'season' in d: meta['season'] = 'S' + str(d['season']).removeprefix('S')
    if 'tier' in d: meta['tier'] = str(d['tier'])
    meta.setdefault('periodKind', 'season-cumulative')
    meta.setdefault('status', 'archive')
    meta.setdefault('excludeFromDefault', False)
    meta['path'] = path
    meta['rowCount'] = len(d['rows'])
    if d['rows'] and 'side' in d['rows'][0]: meta['availableSides'] = sorted({r['side'] for r in d['rows']})
    assert not meta.get('periodEnd') or meta['periodEnd'] <= DATE
    assert not meta.get('asOf') or meta['asOf'] <= DATE
    assert meta['sourceId'] in sources, meta['sourceId']
    audit_datasets.append(meta)
    return {k: v for k, v in meta.items() if k in public_keys | {'path','rowCount'}}

def rates(row, keys):
    values = [row.get(k) for k in keys]
    assert all(x is None or (isinstance(x, (int, float)) and 0 <= x <= 100) for x in values), row
    if all(row.get(k) is not None for k in ['win','draw','loss']):
        assert abs(row['win'] + row['draw'] + row['loss'] - 100) <= .21, row
    return values

for d in sets.values():
    path = 'ranked/' + d['server'] + '-s' + str(d['season']).removeprefix('S') + '.json'
    meta = metadata(d, path)
    if meta['id'].startswith('idv-index-'): meta['sourceCollectedAt'] = meta.pop('asOf', None)
    rows = [[identify(r)['id'], *rates(r, ['pick','win','draw','loss','ban'])] for r in d['rows']]
    assert len({r[0] for r in rows}) == len(rows), d['id']
    parts[path].append({'id': d['id'], 'rows': sorted(rows)})
    datasets.append(meta)

for d in sorted(badge_sets.values(), key=lambda d: d['asOf'], reverse=True):
    path = 'ranked/badges-' + d['asOf'][:7].replace('-', '') + '.json'
    rows = []
    for r in d['rows']:
        assert isinstance(r['score'], (int,float)) and r['score'] >= 0
        assert r['rankPosition'] in [1,10,11,100,101,300,301,500]
        rows.append([identify(r)['id'], r['rankPosition'], r['score']])
    assert len({tuple(r[:2]) for r in rows}) == len(rows), d['id']
    badges.append(metadata(d, path))
    parts[path].append({'id': d['id'], 'rows': sorted(rows)})

# Remove retired public exports and obsolete partitions deterministically.
expected = {Path(path).name for path in parts} | {'index.json','badges.json'}
for p in OUT.iterdir():
    if p.is_file() and p.name not in expected: p.unlink()
for path, values in parts.items():
    columns = ['id','position','score'] if '/badges-' in path else ['id','pick','win','draw','loss','ban']
    dump(ROOT / 'dist' / path, {'columns': columns, 'datasets': values})
dump(OUT / 'badges.json', {'datasets': badges})

meta = {
    'collectedAt': DATE, 'recordCount': sum(d['rowCount'] for d in datasets), 'datasetCount': len(datasets),
    'badgeRecordCount': sum(d['rowCount'] for d in badges), 'badgeDatasetCount': len(badges),
    'equivalentRowsRemoved': sum(d['rows'] for d in equivalences),
    'reviewNeededDatasets': sum(d['status']=='needs-review' for d in datasets),
    'excludedSourceErrorRows': sum(d['rows'] for d in excluded),
    'notes': [
        '공식 통계의 공개 전사·보관본입니다. 실제 경기 수는 공개되지 않았으며 원본 이미지를 모두 대조한 자료는 아닙니다.',
        '중국의 일별·주별·시즌 누적 자료는 기간이 겹칠 수 있으므로 합산하지 않습니다.',
        '정정이 확인되지 않은 중국 S44 누적 자료는 통계에서 제외했습니다.',
        '아시아 S43 양 진영과 S36~S38 보관본을 수록했습니다. 중국과 아시아의 시즌 번호는 서로 다릅니다.',
    ],
    'unavailable': ['아시아 S44 공개 통계', '아시아 S39~S42 완전한 보관본', '한국 유저만의 통계', '개별 랭킹전 전적과 실제 경기 수', '캐릭터별 맵·인격 통계']
}
source_ids = {sid for d in audit_datasets for sid in [d['sourceId'], *d.get('sourceIds', [])]}
public_sources = [dict(s, notes=' '.join(s['notes']) if isinstance(s.get('notes'), list) else s.get('notes', '')) for sid,s in sources.items() if sid in source_ids]
versions = {path: digest(ROOT / 'dist' / path)[:12] for path in [*parts, 'ranked/badges.json']}
catalog = {'schemaVersion': 2, 'meta': meta, 'sources': public_sources, 'datasets': datasets, 'badgesPath': 'ranked/badges.json', 'assetVersions': versions}
# Source metadata remains in the research manifest; keep the shipped index compact.
compact_payload('ranked/index.json', catalog)
dump(OUT / 'index.json', catalog)
manifest = {'meta': meta, 'inputs': input_files, 'sources': public_sources, 'datasets': audit_datasets, 'replacements': replacements, 'equivalentObservations': equivalences, 'excludedDatasets': excluded, 'rawSources': raw_sources, 'files': []}
for p in sorted(OUT.glob('*')):
    manifest['files'].append({'path': 'ranked/'+p.name, 'bytes': p.stat().st_size, 'sha256': digest(p)})
dump(ROOT / 'research/ranked/build-manifest.json', manifest)
print(json.dumps(meta, ensure_ascii=False, indent=2))
