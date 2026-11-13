"""Normalize a reviewed dated Homeworkkun download manifest, without network access.

Raw inputs are kept locally. Only character aggregates and their provenance are
published; overlapping cumulative/weekly observations remain separate cohorts.
"""
import argparse
from collections import defaultdict
from decimal import Decimal
import gzip
import hashlib
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    blob = path.read_bytes()
    return json.loads(gzip.decompress(blob) if path.suffix == '.gz' else blob)


def date(value):
    value = str(value).replace('-', '')
    assert re.fullmatch(r'\d{8}', value), value
    return f'{value[:4]}-{value[4:6]}-{value[6:]}'


def percentage(value):
    if value is None:
        return None
    number = Decimal(str(value))
    assert number.is_finite() and 0 <= number <= 1, value
    return float(number * 100)


def write(path, value):
    blob = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    path.write_bytes(gzip.compress(blob, mtime=0) if path.suffix == '.gz' else blob)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', required=True)
    parser.add_argument('--raw-dir', required=True, type=Path)
    args = parser.parse_args()
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.date)
    output = ROOT / 'research/refresh' / args.date / 'china'
    (output / 'raw').mkdir(parents=True, exist_ok=True)
    config = read(ROOT / 'research/ranked/refreshes.json')
    roster = {c['id']: c for c in read(ROOT / 'dist/data.json')['characters']}
    names = {r['originalName']: r['characterId'] for r in read(ROOT / 'research/ranked/character-map-cn.json')}
    known_ids = set()
    for spec in config['ranked']:
        if (ROOT / spec['path']).parent == output:
            continue
        group = read(ROOT / spec['path'])
        for dataset in group['datasets']:
            known_ids.add(dataset['id'])
            for row in dataset['rows']:
                if dataset['server'] == 'cn' and row.get('nameOriginal'):
                    names[row['nameOriginal']] = row['characterId']
    manifest = read(args.raw_dir / 'ranked-download-manifest.json')
    assert all('error' not in item for item in manifest), 'Resolve failed downloads first'
    source_id = 'cn-homework-public-' + args.date.replace('-', '')
    source = dict(id=source_id, name=f'作业君 · 중국 랭킹전 공개 원자료 {args.date} 확인',
                  url='https://website.homeworkkun.top/胜率数据/form',
                  origin='NetEase 공식 WeChat 미니프로그램 통계의 BWIKI 편집자 공개 전사본',
                  lineageId='netease-cn-ranked-wechat',
                  notes=['게시된 원자료의 캐릭터별 비율을 수록했습니다.',
                         '공식 미니프로그램 직접 응답이 아닌 공개 전사본입니다.',
                         '기간이 겹치는 누적·주간 자료를 합산하거나 평균하지 않습니다.',
                         '비율 행은 실제 경기 수가 아닙니다.'])
    group = dict(schemaVersion=1, collectedAt=args.date, sources=[source],
                 datasets=[], rawSources=[], conflicts=[])
    for item in manifest:
        name = item['name']
        if not re.fullmatch(r'(?:Week_)?S\d+-\d{6}\.json', name):
            continue  # Separately compare the existing Asia archives; no new season.
        raw_path = args.raw_dir / 'ranked' / (name + '.gz')
        raw_bytes = gzip.decompress(raw_path.read_bytes())
        assert hashlib.sha256(raw_bytes).hexdigest() == item['sha256']
        raw = json.loads(raw_bytes)
        assert raw['success'] is True and raw['code'] == 200 and raw['data']
        family = 'weekly' if name.startswith('Week_') else 'season'
        group['rawSources'].append(dict(
            url=item['url'], path=str((output / 'raw' / (name + '.gz')).relative_to(ROOT)),
            family=family, checkedAt=args.date, collectedAt=args.date,
            sourceId=source_id, lineageId='netease-cn-ranked-wechat',
            sha256=item['sha256'], bytes=item['bytes'], rowCount=len(raw['data']),
            gzipSha256=item['gzipSha256'], compression='gzip', rawPublication='local-only'))
        shutil.copyfile(raw_path, output / 'raw' / (name + '.gz'))
        buckets = defaultdict(list)
        for row in raw['data']:
            original = row['name']
            cid = names[original]
            character = roster[cid]
            assert character['side'] == ('감시자' if int(row['camp_id']) == 1 else '생존자')
            common = dict(characterId=cid, name=character['name'], nameOriginal=original,
                          side=character['side'])
            start, end, season = date(row['start_time']), date(row['end_time']), int(row['season'])
            assert start <= end <= args.date
            part = int(row['part'])
            assert part in [-127, 1, 2, 3, 4, 5, 6, 7, 8]
            tier = 'all' if part == -127 else 'peak7' if part == 8 else str(part)
            win, draw = percentage(row['win_rate']), percentage(row['ping_rate'])
            loss = None if win is None or draw is None else float(Decimal(100)-Decimal(str(win))-Decimal(str(draw)))
            assert loss is None or 0 <= loss <= 100
            week = int(row['week_num'])
            assert (week == -127) == (family == 'season'), (name, week)
            buckets[(start, end, season, tier)].append(dict(
                common, heroId=int(row['hero_id']), pick=percentage(row['use_rate']),
                win=win, draw=draw, loss=loss, ban=percentage(row['ban_rate'])))
        for key, rows in sorted(buckets.items()):
            start, end, season, tier = key
            assert len({r['characterId'] for r in rows}) == len(rows)
            period = 'weekly' if family == 'weekly' else 'season-cumulative'
            label = '주간' if family == 'weekly' else '시즌 누적'
            dataset = dict(id=f'cn-s{season}-{start.replace("-", "")}-{end.replace("-", "")}-{tier}',
                           sourceId=source_id, sourceIds=[source_id], server='cn', season=season,
                           tier=tier, asOf=end, periodStart=start, periodEnd=end, periodKind=period,
                           timeLabel=f'S{season} · {label} · {start}~{end}', sourceUrl=item['url'],
                           originalUrls=[item['url']], sourceCollectedAt=args.date,
                           sampleSize=None, pickBasis='selection-share', banBasis='ban-selection-share',
                           status='archive', excludeFromDefault=False, priority=20 if family == 'weekly' else 30,
                           availableSides=sorted({r['side'] for r in rows}),
                           missingSourceCharacters=sorted(set(roster) - {r['characterId'] for r in rows}),
                           derivedMetrics=['loss'], notes=['원본 비율을 백분율로 변환하고 패배율만 100−승률−무승부율로 계산했습니다.'])
            assert dataset['id'] not in known_ids, ('Already imported cohort', dataset['id'])
            dataset['rows'] = sorted(rows, key=lambda r: r['characterId'])
            group['datasets'].append(dataset)
    group['meta'] = dict(collectedAt=args.date, rowCount=sum(len(d['rows']) for d in group['datasets']),
                         datasetCount=len(group['datasets']), complete=True,
                         scope='Reviewed published files; not a count of all games')
    write(output / 'ranked-additions.json.gz', group)
    print(group['meta'])


if __name__ == '__main__':
    main()
