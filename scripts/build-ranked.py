"""Build the static ranked archive from the preserved, normalized source snapshot.

Run: python scripts/build-ranked.py
Raw-source URLs and hashes are retained in research/ranked/source-manifest.json.
No rates are averaged across ranks, sources, servers, periods or tournaments.
"""
import gzip
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'ranked'
INPUT = ROOT / 'research' / 'ranked' / 'normalized-inputs.json.gz'
SERVERS = {'asia', 'cn'}
OUT.mkdir(parents=True, exist_ok=True)
inputs = json.loads(gzip.decompress(INPUT.read_bytes()))
roster = json.loads((ROOT / 'dist/data.json').read_text())['characters']
by_name = {c['name']: c for c in roster}
by_id = {c['id']: c for c in roster}
japanese = dict(zip(
    ['復讐者','道化師','断罪狩人','リッパー','結魂者','芸者','白黒無常','写真家','狂眼','黄衣の王','夢の魔女','泣き虫','魔トカゲ','血の女王','ガードNo.26','使徒','ヴァイオリニスト','彫刻師','アンデッド','破輪','漁師','蝋人形師','悪夢','書記官','隠者','夜の番人','オペラ歌手','フールズ・ゴールド','時空の影','足萎えの羊','フラバルー','雑貨商','ビリヤードプレイヤー','女王蜂','歯医者','心の獣'],
    ['공장장','광대','사냥터지기','리퍼','거미','붉은 나비','우산의 영혼','사진사','광기의 눈','노란 옷의 왕','꿈의 마녀','울보','재앙의 도마뱀','블러디 퀸','수위 26호','사도','바이올리니스트','조각가','박사','파멸의 바퀴','나이아스','밀랍인형사','악몽','서기관','은둔자','나이트 워치','오페라 가수','파이라이트','시공의 그림자','절름발이 판','훌라발루','잡화상','당구 선수','여왕벌','치과의사','마음의 짐승']))

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')

def identify(row):
    cid = row.get('characterId') or row.get('id')
    if cid in by_id:
        c = by_id[cid]
    else:
        name = re.sub('[「」『』]', '', row['name'])
        name = japanese.get(name, name)
        c = by_name[name]
    assert c['side'] == row['side'], row
    return c

sources = []
datasets = []
parts = defaultdict(list)
total = 0
seen = set()
for group in [inputs['cn'], inputs['global']]:
    for s in group['sources']:
        s = dict(s)
        if isinstance(s.get('notes'), list): s['notes'] = ' '.join(s['notes'])
        if not any(x['id'] == s['id'] for x in sources): sources.append(s)
    for d in group['datasets']:
        if d['server'] not in SERVERS:
            continue
        assert d['id'] not in seen
        seen.add(d['id'])
        meta = {k: v for k, v in d.items() if k != 'rows'}
        meta['season'] = 'S' + str(d['season']).removeprefix('S')
        meta['tier'] = str(d['tier'])
        meta.setdefault('periodKind', 'season-cumulative')
        meta.setdefault('status', 'archive')
        meta.setdefault('excludeFromDefault', False)
        meta['path'] = 'ranked/' + d['server'] + '-' + meta['season'].lower() + '.json'
        meta['rowCount'] = len(d['rows'])
        meta['availableSides'] = sorted({r['side'] for r in d['rows']})
        # The collector date is not the end of the actual competition period.
        if meta['id'].startswith('idv-index-'):
            meta['sourceCollectedAt'] = meta.pop('asOf', None)
        rows = []
        ids = set()
        for r in d['rows']:
            c = identify(r)
            assert c['id'] not in ids, (d['id'], c['id'])
            ids.add(c['id'])
            metrics = [r.get(k) for k in ['pick','win','draw','loss','ban']]
            assert all(x is None or (isinstance(x, (int, float)) and 0 <= x <= 100) for x in metrics)
            if all(r.get(k) is not None for k in ['win','draw','loss']):
                assert abs(r['win'] + r['draw'] + r['loss'] - 100) <= .21
            rows.append([c['id'], *metrics])
            total += 1
        parts[meta['path']].append({'id': d['id'], 'rows': sorted(rows)})
        datasets.append(meta)

source_ids = {sid for d in datasets for sid in [d['sourceId'], *d.get('sourceIds', [])]}
sources = [s for s in sources if s['id'] in source_ids]
# Retired downloads are no longer part of the public application.
for retired in ['global-unknown-s42.json', 'records.csv', 'badges.csv', 'statistics.zip', 'manifest.json']:
    (OUT / retired).unlink(missing_ok=True)
for path, values in parts.items():
    dump(ROOT / 'dist' / path, {'columns':['id','pick','win','draw','loss','ban'],'datasets':values})

badges = inputs['badges']
badge_count = 0
for d in badges['datasets']:
    for row in d['rows']:
        c = identify(row)
        row['id'] = c['id']
        assert isinstance(row['score'], (int,float)) and row['score'] >= 0
        badge_count += 1
dump(OUT / 'badges.json', badges)

meta = {
    'collectedAt':'2026-10-17', 'recordCount':total, 'datasetCount':len(datasets),
    'badgeRecordCount':badge_count, 'badgeDatasetCount':len(badges['datasets']),
    'rawRankedRows':inputs['cn']['meta']['rawRowCount'] + sum(len(d['rows']) for d in inputs['global']['datasets'] if d['server'] in SERVERS),
    'duplicateRowsRemoved':inputs['cn']['meta']['duplicateRowCount'],
    'reviewNeededDatasets':sum(d['status']=='needs-review' for d in datasets),
    'notes':[
        '공식 통계의 공개 전사·보관본을 수집했습니다. 공식 서버의 현재 응답 또는 모든 원본 이미지를 전수 대조한 자료는 아닙니다.',
        '중국의 일별·주별·시즌 누적 통계는 자료 시점 선택에서 각각 구분합니다. 같은 경기의 중복 집계가 가능하므로 합산하지 않습니다.',
        '패배율이 원문에 없는 중국 자료는 100−승률−무승부율로 계산했습니다. 원본 비율의 반올림 오차가 포함됩니다.',
        '중국 S44 보관본은 정정 확인이 필요해 기본 선택에서 제외했습니다. 직접 선택하면 검토 필요 상태로 표시합니다.',
        '아시아 S43은 감시자 9개 랭크 구간을 수록했습니다. 서버가 확인된 아시아·중국 통계만 제공합니다.'
    ],
    'unavailable':['아시아 S43 생존자 원자료','한국 유저만의 통계','미공개 시즌·날짜·맵·인격별 통계','개별 랭킹전 전적과 실제 경기 수']
}
catalog = {'schemaVersion':1, 'meta':meta, 'sources':sources, 'datasets':datasets, 'badgesPath':'ranked/badges.json'}
dump(OUT / 'index.json', catalog)
source_ids.update(d['sourceId'] for d in badges['datasets'])
legacy_source_ids = {'global/wiki-asia-s43-hunters.raw.txt':'wiki-discord-asia-s43', 'global/idv-index-s42-default.raw.txt':'idv-index-s42'}
raw_sources = [{**s, 'sourceId':s.get('sourceId', legacy_source_ids.get(s['path']))} for s in inputs['manifest']]
manifest = {'meta':meta,'sources':sources,'datasets':datasets,'rawSources':[s for s in raw_sources if s['sourceId'] in source_ids], 'files':[]}
for p in sorted(OUT.glob('*')):
    if p.name == 'manifest.json': continue
    b = p.read_bytes()
    manifest['files'].append({'path':'ranked/'+p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
dump(ROOT / 'research/ranked/build-manifest.json', manifest)
print(json.dumps(meta,ensure_ascii=False,indent=2))
