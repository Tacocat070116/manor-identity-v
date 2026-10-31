"""Apply the reviewed Korean terminology register to the shipped content.

The fixed baseline and per-field audit preserve editorial history. Source quotes,
URLs, player submissions, historical releases and game balance dates are untouched.
The default is the latest reviewed register. Future releases add a register with
their own baseline and audit; do not regenerate old releases over newer content.
Later role reviews are replayed after the terminology audit so regeneration keeps
approved role changes without rewriting the historical terminology edits.
"""
import collections
import argparse
import copy
import json
import re
import subprocess
import sys
from pathlib import Path
from public_payload import compact_payload

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--register', default='research/localization/2026-10-27-followup/terminology.json')
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
register = ROOT / args.register
OUT = register.parent
RULES = json.loads(register.read_text())
ROLE_REVIEWS = json.loads((ROOT / 'research/roles/reviews.json').read_text())['reviews']
EDITORIAL_EDITS = json.loads((ROOT / 'research/editorial/2026-10-29/consistency-edits.json').read_text())['edits']
EDITORIAL_EDITS += json.loads((ROOT / 'research/editorial/2026-10-30/consistency-edits.json').read_text())['edits']
EDITORIAL_EDITS += json.loads((ROOT / 'research/editorial/2026-10-31/consistency-edits.json').read_text())['edits']
BASE = RULES['baseline']
DATE = RULES['reviewedAt']


def read_baseline(name):
    return json.loads(subprocess.check_output(['git', 'show', f'{BASE}:dist/{name}.json'], cwd=ROOT))


def replace_term(text, before, after, rule):
    """Replace an exact reviewed noun, adjusting the following Korean particle."""
    if not before or before not in text:
        return text
    old_final = (ord(before[-1]) - 0xAC00) % 28 if '\uac00' <= before[-1] <= '\ud7a3' else 0
    new_final = (ord(after[-1]) - 0xAC00) % 28 if '\uac00' <= after[-1] <= '\ud7a3' else 0
    forms = {}
    if bool(old_final) != bool(new_final):
        for left, right in [('은', '는'), ('이', '가'), ('을', '를'), ('과', '와'), ('이나', '나'), ('이라', '라')]:
            forms[left if old_final else right] = right if old_final else left
    if (old_final not in (0, 8)) != (new_final not in (0, 8)):
        forms['으로' if old_final not in (0, 8) else '로'] = '으로' if new_final not in (0, 8) else '로'
    # A name must not be a suffix of another name (e.g. 붉은 나비 / 산제비나비).
    exclusions = ''.join('(?<!' + re.escape(s) + ')' for s in rule.get('excludePrefixes', []))
    pattern = exclusions + r'(?<![가-힣])' + re.escape(before)
    pattern += ''.join('(?!' + re.escape(s) + ')' for s in rule.get('excludeSuffixes', []))
    if rule.get('token'):
        pattern += r'(?=$|[^가-힣]|은|는|이|가|을|를|과|와|의|도|만|으로|로|에|부터|까지|보다|처럼|마저|조차|이나|나|이라|라)'
    if forms:
        particles = '|'.join(re.escape(p) for p in sorted(forms, key=len, reverse=True))
        return re.sub(pattern + '(' + particles + ')?', lambda m: after + forms.get(m[1], ''), text)
    return re.sub(pattern, after, text)


def normalize(text, scopes):
    for rule in RULES['rules']:
        if rule.get('scopes') and not set(rule['scopes']).intersection(scopes):
            continue
        if set(rule.get('excludeScopes', [])).intersection(scopes):
            continue
        if rule.get('mode') == 'phrase':
            text = text.replace(rule['before'], rule['after'])
        else:
            text = replace_term(text, rule['before'], rule['after'], rule)
    return text


db, specialties, introductions = [read_baseline(n) for n in ('data', 'specialties', 'introductions')]
original = copy.deepcopy({'data': db, 'specialties': specialties, 'introductions': introductions})
characters = {c['id']: c for c in db['characters']}
names = {c['name']: c['id'] for c in db['characters']}
character_fields = ['difficultyReason', 'persona', 'alternative', 'personaReason', 'caution', 'skill', 'use', 'hold', 'response', 'adjustment', 'tips', 'strengths', 'weaknesses']
matchup_fields = ['summary', 'condition', 'situation', 'situationDetail']
link_fields = ['reason', 'use', 'when', 'caution']


def normalize_fields(record, fields, scopes):
    for field in fields:
        if isinstance(record.get(field), str):
            record[field] = normalize(record[field], scopes)
        elif isinstance(record.get(field), list):
            record[field] = [normalize(text, scopes) for text in record[field]]


for c in db['characters']:
    normalize_fields(c, character_fields, [c['id']])
for m in db['matchups']:
    normalize_fields(m, matchup_fields, [names[m['hunter']], names[m['survivor']]])
for link in db['links']:
    normalize_fields(link, link_fields, [names[link['character']], names.get(link['target'], '')])
for cid, role in specialties['characters'].items():
    role['specialties'] = [RULES['roleAliases'].get(t, t) for t in role['specialties']]
    role['specialtyReasons'] = {RULES['roleAliases'].get(t, t): normalize(reason, [cid]) for t, reason in role['specialtyReasons'].items()}
for cid, intro in introductions['characters'].items():
    introductions['characters'][cid] = normalize(intro, [cid])

all_files = {'data': db, 'specialties': specialties, 'introductions': introductions}
for edit in RULES['fieldEdits']:
    parts = edit['path'].split('/')
    current = all_files[parts[0]]
    for part in parts[1:-1]:
        current = current[int(part)] if isinstance(current, list) else current[part]
    key = int(parts[-1]) if isinstance(current, list) else parts[-1]
    current[key] = edit['after']

# Cards are projections of the canonical matchup record, never a separate copy edit.
by_evidence = {m['id']: m for m in db['matchups']}
for c in db['characters']:
    for kind in ('hard', 'easy'):
        for item in c[kind]:
            m = by_evidence[item['evidence']]
            item['reason'] = f"[{m['situation']}] {m['summary']}\n조건: {m['condition']}"

for data in all_files.values():
    data['meta']['languageReviewedAt'] = DATE

edits = []
def diff(before, after, path):
    if isinstance(before, dict) and isinstance(after, dict) and before.keys() == after.keys():
        for key in before:
            diff(before[key], after[key], path + '/' + key)
    elif isinstance(before, list) and isinstance(after, list) and len(before) == len(after):
        for i, (left, right) in enumerate(zip(before, after)):
            diff(left, right, path + '/' + str(i))
    elif before != after:
        edits.append({'path': path, 'before': before, 'after': after})

for name, data in all_files.items():
    diff(original[name], data, 'dist/' + name + '.json')
    if name == 'specialties':
        for review in ROLE_REVIEWS:
            cid = review['characterId']
            assert data['characters'][cid] == review['before'], f'{cid}: role review baseline differs'
            data['characters'][cid] = copy.deepcopy(review['after'])
    for edit in EDITORIAL_EDITS:
        _, filename, *parts = edit['path'].split('/')
        if filename != name + '.json':
            continue
        parent = data
        for part in parts[:-1]:
            parent = parent[int(part)] if isinstance(parent, list) else parent[part]
        key = int(parts[-1]) if isinstance(parent, list) else parts[-1]
        if edit.get('beforeMissing'):
            assert key not in parent, f"{edit['path']}: editorial addition already exists"
        else:
            assert parent[key] == edit['before'], f"{edit['path']}: editorial baseline differs"
        parent[key] = copy.deepcopy(edit['after'])
    # Statistics refreshes have their own before/after audit; they are not language edits.
    if name == 'data':
        for metadata_path in sorted((ROOT / 'research/refresh').glob('????-??-??/metadata-edits.json')):
            for edit in json.loads(metadata_path.read_text()):
                key = edit['path'].removeprefix('dist/data.json/meta/')
                assert (key in data['meta']) == edit['beforeExists']
                assert data['meta'].get(key) == edit['before'], f'{key}: statistics metadata baseline differs'
                data['meta'][key] = copy.deepcopy(edit['after'])
    # Preserve the original editorial audit while omitting retired browser fields.
    compact_payload(name + '.json', data)
    if args.check:
        assert data == json.loads((ROOT / 'dist' / (name + '.json')).read_text()), f'{name}: generated terminology differs'
    else:
        formatting = {'separators': (',', ':')} if name == 'data' else {'indent': 2}
        (ROOT / 'dist' / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False, **formatting) + '\n')
if args.check:
    assert edits == json.loads((OUT / 'edits.json').read_text()), 'audit differs'
    print('Terminology generation and per-field audit match.')
    sys.exit(0)
(OUT / 'edits.json').write_text(json.dumps(edits, ensure_ascii=False, indent=2) + '\n')
summary = {'date': DATE, 'baseline': BASE, 'charactersReviewed': len(db['characters']), 'matchupsReviewed': len(db['matchups']), 'linksReviewed': len(db['links']), 'changedFields': len(edits), 'byFile': dict(collections.Counter(e['path'].split('/')[1] for e in edits)), 'gameBalanceRevalidated': False}
(OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
