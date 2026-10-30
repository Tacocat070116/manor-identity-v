"""Keep unused editorial metadata out of browser payloads, without deleting records.

The retired fields remain in an ignored local research/payload/retired-fields.json.
Only the two named, shipped files are processed. Pending imports and raw research
archives are never scanned, rewritten or deleted.
"""
import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'research/payload/retired-fields.json'
FIELDS = {
    'data.json': {
        'characters': ('portraitSource', 'guideReviewScope', 'tipUrl', 'tipScope',
                       'tipType', 'tipDate', 'officialDifficulty', 'confidence'),
        'matchups': ('urls', 'type', 'patch', 'reviewNote', 'basis', 'language',
                     'confidence', 'documents', 'selectionReviewedAt'),
    },
    'ranked/index.json': {
        'datasets': ('notes', 'originalUrls', 'sourceUrl', 'patch'),
    },
}


def compact_payload(filename, data):
    """Remove only reviewed unused fields; preserve every row and its identity."""
    retired = {}
    for group, fields in FIELDS.get(filename, {}).items():
        records = {}
        for row in data[group]:
            values = {key: row.pop(key) for key in fields if key in row}
            if values:
                records[row['id']] = values
        if records:
            retired[group] = records
    return retired


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.write == args.check:
        parser.error('choose --write or --check')
    archive = json.loads(ARCHIVE.read_text()) if ARCHIVE.exists() else {
        'schemaVersion': 1,
        'description': '공개 화면에서 사용하지 않는 이전 보조 필드와 내부 조사 메모. 공략·통계 기록은 삭제하지 않습니다.',
        'files': {},
    }
    changes = []
    for filename in FIELDS:
        path = ROOT / 'dist' / filename
        before = path.read_bytes()
        data = json.loads(before)
        retired = compact_payload(filename, data)
        if not retired:
            continue
        changes.append(filename)
        if args.check:
            continue
        target = archive['files'].setdefault(filename, {})
        for group, records in retired.items():
            target_group = target.setdefault(group, {})
            for identity, fields in records.items():
                target_group.setdefault(identity, {}).update(copy.deepcopy(fields))
        after = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        path.write_bytes(after)
        print(f'{filename}: {len(before):,} → {len(after):,} bytes')
    if args.check:
        if changes:
            raise SystemExit('Unused public metadata reappeared: ' + ', '.join(changes))
        print('PASS: unused metadata stays outside the browser payloads.')
    elif changes:
        ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
        ARCHIVE.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
