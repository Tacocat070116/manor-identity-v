"""Normalize public MatchLog/BWIKI snapshots and reconcile against a deployed base.

Run after collection with --date, --base and --raw-dir. Existing observations,
reviewed date fixes and unknown results are preserved. Matching is a multiset,
not a set: identical rosters in distinct half-games remain distinct records.
"""
import argparse
from collections import Counter, defaultdict
from datetime import date
import gzip
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)


def write(path, obj):
    data = (json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    path.write_bytes(gzip.compress(data, mtime=0) if path.suffix == '.gz' else data)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clean(value):
    return re.sub(r'[「」『』“”"\s]', '', str(value or ''))


def number(value):
    if value is None or str(value).strip() in ['', '-', '-999']:
        return None
    try:
        n = float(str(value).removesuffix('%'))
        return n if 0 <= n < 100000 else None
    except ValueError:
        return None


def core_key(row):
    return (row[0], row[1], row[2], tuple(sorted(row[3])), row[4])


def ban_key(row):
    return (row[0], row[1], row[2], row[4])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', required=True)
    parser.add_argument('--base', required=True)
    parser.add_argument('--raw-dir', required=True, type=Path)
    args = parser.parse_args()
    date.fromisoformat(args.date)
    out = ROOT / 'research/refresh' / args.date / 'tournament'
    out.mkdir(parents=True, exist_ok=True)
    baseline = lambda name: json.loads(subprocess.check_output(['git', 'show', f'{args.base}:dist/{name}'], cwd=ROOT))
    db = baseline('data.json')
    roster = {c['id']: c for c in db['characters']}
    aliases = read(ROOT / 'research/search/characters.json')['characters']
    names = {clean(n): cid for cid, c in aliases.items() for n in [c['name']] + c['aliases']}
    for item in read(ROOT / 'research/ranked/character-map-cn.json'):
        names[clean(item['originalName'])] = item['characterId']
    names.update({'心兽': 'c11', '神童': 'c60'})
    for alias, canonical in [('守墓人·','守墓人'),('邦邦','26号守卫'),('啦啦队员','拉拉队员')]:
        names[alias] = names[canonical]
    empty = ['', '-', '空', '0']
    maps = {}
    for labels in [
        ['軍需工場','月の河公園','罪の森','レオの思い出','赤の教会','聖心病院','永眠町','中華街','湖景村'],
        ['军工厂','月亮河公园','不归林','里奥的回忆','红教堂','圣心医院','永眠镇','唐人街','湖景村']]:
        maps.update(zip(labels, db['maps']))
    hunter_talents = {'裏向きカード':'히든카드','引き留める':'만류','傲慢':'요란법석','閉鎖空間':'밀폐 공간'}
    survivor_talents = {'中治り':'마지막 희망','危機一髪':'위기 모면','膝蓋腱反射':'무릎 반사','フライホイール効果':'플라이휠 효과'}
    fixes = read(ROOT / 'research/refresh/2026-10-29/tournament/update-delta.json.gz')['dateCorrections']
    corrected_dates = {x['detailId']: x['verifiedMatchDate'] for x in fixes}
    report = dict(checkedAt=args.date, baseline=args.base, sources=[], excluded=[], conflicts=[],
                  preservedDateCorrections=[], personalDisagreements=0, duplicates={}, stages={})
    groups = {'match-log': [], 'bwiki': []}

    def observation(identity, when, map_name, hunter, survivors, tournament, escaped, source, stage, players, talents=None):
        assert when <= args.date and date.fromisoformat(when)
        assert map_name in db['maps'] and roster[hunter]['side'] == '감시자'
        assert len(survivors) == len(set(survivors)) == 4
        assert all(roster[c]['side'] == '생존자' for c in survivors)
        assert escaped in range(5)
        result = '승' if escaped < 2 else '무' if escaped == 2 else '패'
        row = [when, map_name, hunter, survivors, tournament, result, escaped]
        detail = dict(id=identity, date=when, map=map_name, tournament=tournament, hunter=hunter,
                      survivors=survivors, hunterTalents=talents or [], players=players, source=source, result=result)
        return dict(id=identity, row=row, source=source, stage=stage, detail=detail)

    def attach_ban(item, label, ids):
        if ids and len(ids) == len(set(ids)) and not set(ids).intersection(item['row'][3]) and all(roster[x]['side'] == '생존자' for x in ids):
            item[label] = item['row'][:3] + [ids, item['row'][4]]
        elif ids:
            report['excluded'].append(dict(id=item['id'], field=label, reason='Invalid/overlapping ban characters'))

    match_path = out.parent / 'match-log.json'
    if not match_path.exists():
        match_path = match_path.with_suffix('.json.gz')
    raw = read(match_path)
    assert not raw['errors'], raw['errors']
    report['sources'].append(dict(id='match-log', url=raw['source'], sha256=sha(match_path), snapshotPath=str(match_path.relative_to(ROOT)),
                                  matches=len(raw['matches']), records=sum(len(m['rounds']) for m in raw['matches'])))
    for match in raw['matches']:
        tournament = 'IVL' if match['league'] in ['4','7','11','12'] else 'IJL'
        for r in match['rounds']:
            try:
                hunter, survivors = names[clean(r['hunter'])], [names[clean(p['name'])] for p in r['survivors']]
                escaped = r['escaped']
                assert (r['hunterScore'], r['survivorScore']) == [(5,0),(3,1),(2,2),(1,3),(0,5)][escaped]
                when = corrected_dates.get(r['id'], r['date'])
                if when != r['date']:
                    report['preservedDateCorrections'].append(r['id'])
                consistent = sum(p['escaped'] for p in r['survivors']) == escaped
                people = []
                for cid, p in zip(survivors, r['survivors']):
                    kite = re.fullmatch(r'(\d+):(\d{2})', p['kite'])
                    people.append(dict(id=cid, talents=sorted({survivor_talents[t] for t in p['personas'] if t in survivor_talents}),
                                       decode=number(p['decode']), rescues=number(p['rescues']),
                                       kite=int(kite[1])*60+int(kite[2]) if kite else None,
                                       escaped=p['escaped'] if consistent else None))
                item = observation(r['id'], when, maps[r['map']], hunter, survivors, tournament, escaped,
                                   r['source'], 'MatchLog league ' + match['league'], people,
                                   sorted({hunter_talents[t] for t in r['hunterPersonas'] if t in hunter_talents}))
                attach_ban(item, 'observed', [names[clean(n)] for b in r['bans'] if b['label']=='SURVIVOR BAN' for n in b['characters']])
                groups['match-log'].append(item)
            except (AssertionError, KeyError, ValueError, IndexError) as error:
                report['excluded'].append(dict(id=r['id'], source=r['source'], reason=str(error) or 'Invalid composition/result'))

    downloads = read(args.raw_dir / 'bwiki-overlay-downloads.json')
    assert all('error' not in d for d in downloads)
    databases = [dict(localFile=str(args.raw_dir/'bwiki-all.db'), url='https://website.homeworkkun.top/赛事数据展示/data/sqlite/all.db')]+downloads
    overlay_slugs = {d['slug'] for d in downloads}
    for download in databases:
        path = Path(download['localFile'])
        if 'sha256' in download:
            assert sha(path) == download['sha256']
        conn = sqlite3.connect('file:'+str(path)+'?mode=ro', uri=True)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA trusted_schema=OFF')
        assert conn.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
        metas = {(m['tournament'],m['match_id']):dict(m) for m in conn.execute('SELECT * FROM matches_meta')}
        phases = {r['slug']:r['phase'] for r in conn.execute('SELECT * FROM tournament')}
        count = conn.execute('SELECT count(*) FROM records').fetchone()[0]
        report['sources'].append(dict(id=path.stem, url=download['url'], sha256=sha(path), records=count,
                                      publishedAt=download.get('published_at'), withheldByPublisher={k:v for k,v in download.items() if k.startswith('dropped_')}))
        for rec in conn.execute('SELECT * FROM records ORDER BY tournament,match_id,match_num,half'):
            r = dict(rec)
            if path.name == 'bwiki-all.db' and r['tournament'] in overlay_slugs:
                continue
            identity = [r[k] for k in ['tournament','match_id','match_num','half']]
            rid = 'bwiki-' + hashlib.sha256(json.dumps(identity,ensure_ascii=False).encode()).hexdigest()[:20]
            try:
                m = metas[(r['tournament'],r['match_id'])]
                phase = phases[r['tournament']]
                assert r['match_num'] not in m['disabled_rounds'].split(',')
                assert r['match_num']+'_'+r['half'] not in m['disabled_halves'].split(',')
                year, month, day = int(r['season']), int(m['month']), int(m['day'])
                if phase == 'IVL秋季赛季后赛' and month <= 2:
                    year += 1
                when = date(year, month, day).isoformat()
                tournament = next(t for t in ['COA','IVL','IJL','IVC','IVS','IVT'] if t in phase)
                hunter = names[clean(r['h_pick'])]
                picked = [r[k] for k in ['p_pick1_1','p_pick1_2','p_pick1_3','p_pick1_4','p_pick2','p_pick2_2','p_pick3'] if clean(r[k]) not in empty]
                survivors = [names[clean(n)] for n in picked]
                outcomes = [r['p'+str(i)+'_res'] for i in range(1,5)]
                personal_complete = all(v in ['逃脱','淘汰'] for v in outcomes)
                escaped = sum(v=='逃脱' for v in outcomes) if personal_complete else None
                if str(r['display_ok']) == '1':
                    h_home = clean(r['hunter_team']).lower() == clean(m['home_team']).lower()
                    hs, ss = (number(r['score_home']),number(r['score_away'])) if h_home else (number(r['score_away']),number(r['score_home']))
                    pairs = [(5,0),(3,1),(2,2),(1,3),(0,5)]
                    assert (hs,ss) in pairs
                    observed_escapes = pairs.index((hs,ss))
                    personal_complete = personal_complete and escaped == observed_escapes
                    escaped = observed_escapes
                assert escaped is not None
                player_ids = [names.get(clean(r['p'+str(i)+'_role'])) for i in range(1,5)]
                aligned = len(set(player_ids))==4 and set(player_ids)==set(survivors)
                people = []
                for cid in survivors:
                    i = player_ids.index(cid)+1 if aligned else None
                    people.append(dict(id=cid, talents=[], decode=number(r[f'p{i}_dec']) if i else None,
                                       rescues=number(r[f'p{i}_save']) if i else None,
                                       kite=number(r[f'p{i}_kite']) if i else None,
                                       escaped=(r[f'p{i}_res']=='逃脱') if i and personal_complete else None))
                item = observation(rid, when, maps[r['map']], hunter, survivors, tournament, escaped,
                                   download['url'], r['tournament'], people)
                item['identity'] = identity
                opening = [names[clean(r[k])] for k in ['p_ban1_1','p_ban1_2','p_ban1_3','p_ban1_4'] if clean(r[k]) not in empty]
                later = [names[clean(r[k])] for k in ['p_ban2','p_ban2_2','p_ban3'] if clean(r[k]) not in empty]
                attach_ban(item, 'opening', opening)
                attach_ban(item, 'observed', opening+later)
                groups['bwiki'].append(item)
            except (AssertionError, KeyError, ValueError, StopIteration) as error:
                report['excluded'].append(dict(id=rid, identity=identity, source=download['url'], reason=str(error) or 'Invalid/incomplete composition/result'))
        conn.close()

    matches = baseline('matches.json')
    payload = baseline('tournament-details.json')
    details = []
    for row in payload['rows']:
        d = dict(zip(payload['columns'],row))
        d['source'] = payload['meta']['sources'][d.pop('sourceIndex')]
        d['players'] = [dict(zip(payload['playerColumns'],p)) for p in d['players']]
        details.append(d)
    banks = dict(opening=baseline('bans.json'), observed=baseline('bans-observed.json'))
    before = dict(matches=len(matches),details=len(details),openingBans=len(banks['opening']),observedBans=len(banks['observed']))
    additions = dict(addedMatches=[], addedDetails=[], addedObservedBans=[], addedOpeningBans=[])
    slots = defaultdict(list)
    for i,r in enumerate(matches): slots[core_key(r)].append(i)
    detail_at = {}
    for d in details:
        k = core_key([d['date'],d['map'],d['hunter'],d['survivors'],d['tournament']])
        candidates = [i for i in slots[k] if i not in detail_at]
        candidates.sort(key=lambda i:matches[i][5]!=d['result'])
        assert candidates, d['id']
        detail_at[candidates[0]] = d
    known_ids = {d['id'] for d in details}
    review_path = out/'source-disagreements.json'
    held = {r['id']:r for r in read(review_path)['records']} if review_path.exists() else {}
    for source_group, observations in groups.items():
        available = defaultdict(list)
        for i,r in enumerate(matches): available[core_key(r)].append(i)
        duplicates = 0
        accepted = []
        for item in observations:
            row, detail = item['row'], item['detail']
            if item['id'] in held:
                review = held[item['id']]
                assert row == review['row'] and item.get('identity') == review.get('identity')
                report['conflicts'].append(dict(id=item['id'],field='compositionOrMap',reason=review['reason']))
                continue
            bucket = available[core_key(row)]
            if bucket:
                i = next((j for j in bucket if matches[j][5:]==row[5:]),bucket[0])
                bucket.remove(i); duplicates += 1
                if matches[i][5:] != row[5:]:
                    report['conflicts'].append(dict(id=item['id'], field='outcome', coreIndex=i, before=matches[i], observed=row))
                    continue
            else:
                i = len(matches); matches.append(row)
                additions['addedMatches'].append({k:v for k,v in item.items() if k not in ['detail','opening','observed']})
                report['stages'][item['stage']] = report['stages'].get(item['stage'],0)+1
            item['coreIndex'] = i
            accepted.append(item)
            if i not in detail_at:
                assert detail['id'] not in known_ids, detail['id']
                additions['addedDetails'].append(detail);details.append(detail);detail_at[i]=detail;known_ids.add(detail['id'])
            else:
                old = {p['id']:p for p in detail_at[i]['players']}
                report['personalDisagreements'] += sum(old[p['id']][k] is not None and p[k] is not None and old[p['id']][k]!=p[k] for p in detail['players'] for k in ['decode','rescues','kite','escaped'])
        report['duplicates'][source_group] = duplicates
        # Match exact ban observations first, then preserve unresolved same-key
        # discrepancies. Only excess half-game observations are added.
        for kind, bank in banks.items():
            candidates = defaultdict(list)
            existing = defaultdict(list)
            for item in accepted:
                if kind in item: candidates[ban_key(item[kind])].append(item)
            for i,row in enumerate(bank): existing[ban_key(row)].append(i)
            for key, items in candidates.items():
                remaining = existing[key].copy()
                unmatched = []
                for item in items:
                    found = next((i for i in remaining if sorted(bank[i][3])==sorted(item[kind][3])),None)
                    if found is None: unmatched.append(item)
                    else: remaining.remove(found)
                for item in unmatched:
                    if remaining:
                        i = remaining.pop(0)
                        report['conflicts'].append(dict(id=item['id'], field=kind+'Bans', index=i, before=bank[i], observed=item[kind]))
                    else:
                        bank.append(item[kind])
                        additions['addedOpeningBans' if kind=='opening' else 'addedObservedBans'].append(dict(id=item['id'],coreIndex=item['coreIndex'],row=item[kind],source=item['source']))
    after = dict(matches=len(matches),details=len(details),openingBans=len(banks['opening']),observedBans=len(banks['observed']),
                 latestMatch=max(r[0] for r in matches),unknownResults=sum(r[5] is None for r in matches))
    report.update(before=before,after=after,validObservations={k:len(v) for k,v in groups.items()},
                  personalObservations={k:sum(p[k] is not None for d in details for p in d['players']) for k in ['decode','rescues','kite','escaped']})
    facts = out/'normalized-observations.json.gz'
    write(facts,dict(checkedAt=args.date,sources=report['sources'],observations=groups))
    coverage = '공개 전사본에서 확인된 IVL·IJL·IVC 기록을 수록했습니다. 원문에 누락되거나 미완성인 경기는 제외했으며 대회 전체를 완전 수록한 자료는 아닙니다.'
    write(out/'verified-additions.json',dict(checkedAt=args.date, baseline=args.base, before=before,after=after,
          sourceFacts=dict(path=str(facts.relative_to(ROOT)),sha256=sha(facts)),stage='2026-11-12 public-source refresh',
          coverage=coverage,personalObservations=report['personalObservations'],**additions))
    write(out/'reconciliation.json',report)
    print(json.dumps(dict(before=before,after=after,additions={k:len(v) for k,v in additions.items()},
                         excluded=len(report['excluded']),conflicts=len(report['conflicts']),stages=report['stages']),ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
