# 게임 패치 캐릭터 별칭 대조

- 확인일: 2026-10-19 (Asia/Seoul)
- 기준: 현재 `dist/data.json`의 캐릭터 89명과 기존 ID·한국어 이름. ID·한국어 이름을 새로 만들거나 변경하지 않았다.
- 결과: `character-aliases.json`에 89명 전원, EN 별칭 96개, JA 별칭 89개를 수록했다. 별칭 배열의 첫 값은 대표 표기다. EN 따옴표와 소유격은 이름 자체에 포함하지 않았다.
- 용도: 공지의 캐릭터 연결 **후보**를 찾는 사전. 이름이 나온다는 이유만으로 성능 변경이라고 판정하는 자료가 아니다.

## 출처

일본어 이름은 기존 캐릭터의 `tipUrl` 페이지명과 `portraitOriginal` 파일명을 대조했다. 대부분 두 필드가 일치한다. 마음의 짐승·신동처럼 이미지명이 없는 항목은 `tipUrl`과 아래 공식 공지를 대조했다. 기존 일본어 명칭 89개 각각에 대해 새로운 공식 출시 공지를 모두 찾아본 것은 아니다.

영어 대표 표기와 과거 표기는 다음 공식 자료의 캐릭터 목록·조정 항목·출시 항목을 대조했다. 의상 목록은 이름 확인에만 사용하며, 성능 패치 증거로 사용하지 않는다.

| 공식 자료 | 확인 범위 |
| --- | --- |
| [공식 캐릭터 페이지](https://www.identityvgame.com/character/) | 36명 감시자의 영어 대표 표기. 동적 페이지라 검색 색인의 명단과 개별 공지도 함께 확인 |
| [2026-09-03 EN](https://www.identityvgame.com/en/news/announcement/20260903/35288_1313030.html) | 다수 기존 생존자 명칭: Doctor, Coordinator, Batter, Seer, Lucky Guy 등 |
| [2025-09-04 EN](https://www.identityvgame.com/en/news/announcement/20250904/35288_1257699.html) | Meteorologist, Fire Investigator, First Officer, Journalist, Archer, Puppeteer, Aeroplanist 등 |
| [2026-06-11 EN](https://www.identityvgame.com/en/news/announcement/20260611/35288_1303855.html) | Mime Artist, Lanternist, Matador, Cueist, Queen Bee, Dentist, Faro Lady |
| [2025-11-13 EN](https://www.identityvgame.com/en/news/announcement/20251113/35288_1270807.html) | Escapologist, Peddler |
| [2026-08-13 EN](https://www.identityvgame.com/en/news/announcement/20260813/35288_1310931.html) | 마음의 짐승의 공식 영어명 Herztier |
| [2026-09-29 EN](https://www.identityvgame.com/en/news/announcement/20260929/35288_1315507.html) · [동일 JP 공지](https://www.identityvgame.com/jp/news/update/20260929/35356_1315506.html) | 신동 = Prodigy = 「神童」, 마음의 짐승 = 「心の獣」 |
| [2026-06-18 JP](https://www.identityvgame.com/jp/news/update/20260618/35356_1304826.html) | 「ビリヤードプレイヤー」, 「女王蜂」, 「歯医者」 등 최근 감시자 일본어명 |
| [2026-06-11 JP](https://www.identityvgame.com/jp/news/update/20260611/35356_1303851.html) | 幻灯師, マイムアーティスト |
| [2023-04-20 EN](https://www.identityvgame.com/en/news/announcement/20230420/35288_1084054.html) | 기자의 출시 당시 표기 Reporter. 현재 Journalist와 함께 c46으로 연결 |
| [2025-08-18 EN](https://www.identityvgame.com/en/news/announcement/20250818/35288_1254440.html) | 사도의 Herald → Disciple 명칭 변경을 명시. 둘 다 c18이지만 아래 문맥 제한 필요 |
| [2026-01-08 EN](https://www.identityvgame.com/en/news/announcement/20260108/35288_1280791.html) | 당구 선수의 Billiard Player 표기를 확인하여 c09의 과거 별칭으로 추가 |
| [2024-01-04 EN](https://www.identityvgame.com/en/news/announcement/20240104/35288_1129849.html) | Gamekeeper, Guard 26, Axe Boy 및 Herald의 고양이/Guide 스킬 문맥 |
| [2023-06-29 EN](https://www.identityvgame.com/en/news/announcement/20230629/35288_1095795.html) | The Mind's Eye / Mind's Eye, Dancer, Explorer, Magician, Wildling 등 |

## 연결 규칙과 보류 항목

1. HTML 엔티티, NFKC, 연속 공백, 곡선 아포스트로피 `’`를 정규화한다. EN 이름의 알파벳 단어 경계를 지킨다. `Herztier's` 같은 소유격은 허용하되 단어 내부의 부분 문자열 일치는 금지한다.
2. 캐릭터 이름은 **변경 항목의 제목 또는 명확한 주어**로 연결한다. 패치 전체에 등장한 모든 이름을 최근 성능 변경으로 연결하면 의상 판매, 생일, 이야기, 대회 할인까지 잘못 포함된다. 전투 항목도 타로·블랙잭 등 모드 범위를 그대로 보존한다.
3. **Herald(c18)**: 과거 사도의 공식 이름이다. 그러나 [2026-06-18 공지](https://www.identityvgame.com/en/news/announcement/20260618/35288_1304787.html)의 A Bringer of Doom에는 다른 직업 Herald가 있다. 최신 공지에서 Herald 단독 일치는 자동 연결에서 제외하고 고양이 스킬/Ann/대응 JP 공지 등으로 확인한다. 날짜만으로 판정하지 않는다. 이름 변경 이후 공지의 의상 목록에도 구표기가 남아 있다.
4. **Nightmare(c23)**: 난이도명과 구분한다. 따옴표, 캐릭터 조정 제목, 까마귀 등 캐릭터 문맥이 없는 단독 일치는 제외한다. **Knight(c44)**도 의상명·역할명과 구분한다. **Forward(c82), Patient(c89), Reporter(c46)**는 일반 문장 속 방향·환자·직업명과 구분한다.
5. JA의 짧고 흔한 이름은 `「使徒」`, `「悪夢」`, `「騎士」`, `「神童」`, `「少女」`, `「囚人」`처럼 괄호를 포함했다. 전처리에서 이를 무조건 제거하면 오탐 보호가 사라진다. 따옴표 없는 공식 예외를 발견하면 해당 항목만 수동으로 연결한다. `女王`, `少女` 단독, EN `Queen`, `Girl`, `Shadow`, `Eye`는 별칭으로 추가하지 않는다.
6. 실명은 넣지 않았다. Emil은 환자/마음의 짐승, Norton은 탐사원/파이라이트, Mike는 곡예사/훌라발루 등 같은 인물의 다른 역할과 충돌한다. Wu Chang의 White Guard/Black Guard 세부 형태명만 있는 항목도 수동 확인한다.
7. **보류**: `Philanthropist`는 [2026-02-05 EN](https://www.identityvgame.com/en/news/announcement/20260205/35288_1285646.html)에 등장하지만 이번 조사에서 도둑과의 직접 교차 확인을 완료하지 않아 c48 별칭에 넣지 않았다. `Female Dancer`, `Guard No.26`, `Heart Beast` 같은 커뮤니티/번역 변형도 확인한 공식 원문에 근거하지 않아 제외했다. 누락 후보로 기록하되 임의로 확장하지 않는다.

## 확인한 범위와 남은 한계

89명 모두 EN/JA 대표 표기를 채웠고, 기존 ID·한국어명과의 일대일 대응 및 별칭 중복을 검증했다. **전체 2018–2026 공지에 등장한 모든 오역·철자 오류·실명 표기를 완전 수집한 사전은 아니다.** 별칭에 없는 문구는 미분류 상태로 남기며, 사전을 추가할 때 공식 공지의 URL과 확인 근거를 함께 기록한다.
