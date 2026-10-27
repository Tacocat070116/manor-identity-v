"""Apply the owner's October 27 matchup feedback to the deployed baseline.

Situation labels are a wording audit, not a new combat review of every pair.
The existing rescue evidence becomes a conditional note beside the chase entry.
"""
import collections
import copy
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'dab28e6eca03a20511c0b1c8deac4c068cf4d1a0'
DATE = '2026-10-27'
OUT = ROOT / 'research/matchups' / DATE
db = json.loads(subprocess.check_output(['git', 'show', f'{BASE}:dist/data.json'], cwd=ROOT))
before = copy.deepcopy(db)
by_id = {m['id']: m for m in db['matchups']}

# Read each summary and its condition. Mechanic names remain in situationDetail;
# the first bracket identifies the activity the finding actually describes.
operating = {'콘솔 견제', '장기 운영', '치료 부담', '회복 지원', '팀 재정비',
             '다운 후 회복 운영', '해독 운영', '사진 세계', '회복 운영', '피해 운영',
             '안전한 위치의 회복 지원', '노출된 인형 견제', '이동 회복', '후반 해독',
             '원격 회복 지원', '다운 후 원격 부활'}
covering = {'추격 지원', '견제', '풍선 견제', '풍선 구출', '구출 역할 제한',
            '돌진 차단·지원', '설치 벌레로 추격 지원', '누적 피해 후 커버'}
overrides = {}
def assign(phase, ids):
    for mid in ids.split():
        overrides[mid] = phase

assign('구출', 'M003 M247 M248 M321 M377')
assign('추격', 'M106 M157 M177 M183 M184 M249 M336 M337 M375')
assign('커버', 'M051 M067 M435')
assign('운영', 'M103 M134 M203 M301')
assign('추격·운영', 'M097 M457 M462')
assign('추격·구출', 'M312')
assign('추격·커버', 'M050 M053 M162 M163 M172 M222 M223 M307 M308 M333 M334 M362 M381 M387 M404 M405 M458')
assign('추격·구출·커버', 'M379')

label_edits = []
for m in db['matchups']:
    if m['status'] != '반영':
        continue
    old = m['situation']
    if old in operating:
        phase = '운영'
    elif '커버' in old or '풍선' in old or old in covering:
        phase = '커버'
    elif '구출' in old:
        phase = '추격·구출' if '추격' in old else '구출'
    else:
        phase = '추격'
    phase = overrides.get(m['id'], phase)
    m['situationDetail'] = old
    m['situation'] = phase
    label_edits.append({'id': m['id'], 'before': old, 'after': phase})

feedback = 'https://tacocat070116.github.io/manor-identity-v/#v=feedback&post=93646651-f8c8-4520-9088-a1e540e5712a'
wu = 'https://wikiwiki.jp/identity5ch/白黒無常'
grave = 'https://wikiwiki.jp/identity5ch/墓守'
official = 'https://www.identityvgame.com/en/news/announcement/20260910/35288_1313606.html'
chase = by_id['M131']
rescue = copy.deepcopy(chase)
chase.update({
    'advantage': '우산의 영혼', 'situation': '추격', 'situationDetail': '첫 추격·삽 소모',
    'summary': '사필안의 긴 공격 사거리는 잠복한 묘지기의 삽을 소모시키기 쉽고, 범무구의 빠른 판자 파괴는 다음 구역으로 이동할 여유를 줄입니다. 첫 추격에서 묘지기가 상대하기 까다로운 감시자입니다.',
    'condition': '묘지기는 돌진을 동반한 잠복 해제로 거리를 벌릴 수 있으므로 일방적인 하드 카운터로 단정하지 않습니다. 남은 삽, 판자·창틀 배치와 우산의 형태에 따라 달라집니다.',
    'urls': [wu, grave, feedback, official],
    'type': '이용자 피드백 반영 · 추격과 구출 분리',
    'reviewedAt': DATE, 'selectionReviewedAt': DATE, 'documents': 4,
    'basis': '공개 기전 설명과 이용자 추격 경험을 대조한 편집 판단',
    'reviewNote': '구출 시 잠복의 이점을 추격 우위로 일반화하지 않도록 방향을 변경했습니다. 추격 우위는 통계적 검증 결과나 공식 판정이 아닙니다.',
    'sourceSupport': [
        {'url': wu, 'support': 'mechanism', 'note': '사필안의 긴 사거리, 범무구의 빠른 판자 파괴와 잠복 시작 동작 압박. 문서의 포괄적 상성 평가는 추격 우위의 직접 근거로 사용하지 않음.', 'sourceFamily': 'identity5ch'},
        {'url': grave, 'support': 'mechanism', 'note': '잠복 피해 방어와 이동 후 지상으로 나오는 기술. 돌진이 있으므로 일방적인 카운터로 서술하지 않음.', 'sourceFamily': 'identity5ch'},
        {'url': feedback, 'support': 'community', 'note': '추격에서는 우산이 까다롭고 구출에서는 묘지기의 이점이 남는다는 이용자 제안. 추격 빈도나 특정 선수의 선택을 통계로 일반화하지 않음.', 'sourceFamily': 'manor-feedback'},
        {'url': official, 'support': 'mechanism', 'note': '공식 공지의 낙서 모드 잠복 돌진 오류 수정은 돌진 기술의 존재만 확인하며 상성 방향을 입증하지 않음.', 'sourceFamily': 'identityv-official'}
    ],
    'sourceFamilies': ['identity5ch', 'manor-feedback', 'identityv-official'],
    'evidenceLevel': '기전·이용자 의견 기반 편집 판단',
    'language': '일본어 · 한국어 · 영어'
})
rescue.update({
    'id': 'M463', 'situation': '구출', 'situationDetail': '미리 잠복한 구출 접근',
    'summary': '미리 잠복한 채 의자에 접근하면 섭혼·탕백의 행동 방해를 피하며 구출을 시도할 수 있어, 이 상황에서는 묘지기가 유리할 수 있습니다.',
    'condition': '의자에 접근하기 전에 잠복을 마치고 삽이 남아 있어야 합니다. 잠복 시작 동작은 탕백이나 공격에 끊길 수 있고, 먼저 추격받아 삽을 소모했다면 이 구출 이점을 활용하기 어렵습니다.',
    'urls': [wu, grave], 'reviewedAt': DATE, 'selectionReviewedAt': DATE,
    'listEligible': False, 'contextFor': 'M131',
    'type': '구출 조건 보충', 'documents': 2, 'language': '일본어',
    'basis': '미리 잠복한 구출 접근과 잠복 시작 동작의 구분',
    'reviewNote': '추격의 어려운 상대 카드에 함께 표시하는 구출 예외입니다. 묘지기의 쉬운 상대 목록에는 우산을 중복 등록하지 않습니다.',
    'sourceSupport': [
        {'url': wu, 'support': 'direct', 'note': '미리 잠복한 경우 섭혼·탕백을 피하며 특히 구출 저지에 대응한다는 설명과 잠복 시작 동작의 예외.', 'sourceFamily': 'identity5ch'},
        {'url': grave, 'support': 'mechanism', 'note': '잠복 중 일부 제어 효과 방어와 피해 없이 직접 잠복을 해제한 뒤의 구출 이점.', 'sourceFamily': 'identity5ch'}
    ],
    'sourceFamilies': ['identity5ch'], 'evidenceLevel': '동일 출처군의 기전·구출 분석'
})
db['matchups'].append(rescue)
by_id[rescue['id']] = rescue

def item(m, c):
    return {'name': m['survivor'] if c['side'] == '감시자' else m['hunter'],
            'reason': f"[{m['situation']}] {m['summary']}\n조건: {m['condition']}", 'evidence': m['id']}

for c in db['characters']:
    for kind in ('hard', 'easy'):
        c[kind] = [item(by_id[i['evidence']], c) for i in c[kind] if i['evidence'] != 'M131']
    if c['name'] in ('우산의 영혼', '묘지기'):
        kind = 'easy' if c['name'] == chase['advantage'] else 'hard'
        c[kind] = [item(chase, c)] + c[kind][:4]
        c['matchupReviewedAt'] = DATE

db['meta']['matchupCount'] = sum(m['status'] == '반영' for m in db['matchups'])
db['meta']['matchupSituationReviewedAt'] = DATE
db['meta']['matchupSelectionReviewedAt'] = DATE
db['meta']['matchupReview']['limitations'].append('2026-10-27 상황 표기는 문장 범위 정리입니다. 우산의 영혼·묘지기 외의 대진을 새로 실전 검증했다는 의미는 아닙니다.')
report = {
    'date': DATE, 'baseline': BASE, 'feedback': feedback,
    'scope': '공개 상성 문장의 상황 분류 및 우산의 영혼·묘지기 대진 수정',
    'reviewedPair': ['우산의 영혼', '묘지기'],
    'labelEdits': label_edits,
    'matchupEdits': [{'id': 'M131', 'before': next(m for m in before['matchups'] if m['id'] == 'M131'), 'after': chase}],
    'added': [rescue],
    'beforeCounts': {'accepted': 413, 'held': 49, 'displayedSlots': sum(len(c['hard']) + len(c['easy']) for c in before['characters'])},
    'afterCounts': {'accepted': db['meta']['matchupCount'], 'held': 49, 'displayedSlots': sum(len(c['hard']) + len(c['easy']) for c in db['characters'])},
    'limitations': [
        '상황 분류는 기존 요약·조건 문장을 검토한 것으로 모든 대진의 최신 실전 성능을 다시 검증한 작업이 아닙니다.',
        '우산·묘지기의 추격 판단은 이용자 피드백과 기전 설명을 바탕으로 한 편집 판단이며 공식 승률 또는 하드 카운터 판정이 아닙니다.',
        '기존 상성 자료의 방향이 다른 이유를 구출과 추격의 차이로 남깁니다. 동일 위키의 두 문서는 독립 출처로 세지 않습니다.'
    ]
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'situation-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'dist/data.json').write_text(json.dumps(db, ensure_ascii=False, separators=(',', ':')) + '\n')
print(json.dumps({'labelsReviewed': len(label_edits), **report['afterCounts']}, ensure_ascii=False))
