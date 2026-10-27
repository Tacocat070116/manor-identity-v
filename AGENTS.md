# MANOR site updates

- The public site is https://tacocat070116.github.io/manor-identity-v/ and is deployed from `main` via GitHub Pages.
- The owner requires a new site version and a public patch note for every shipped change to `dist/`. Keep the visible version prefixed with `BETA` until the owner explicitly ends beta.
- Owner instruction on 2026-10-27: operator-system changes must not appear in MANOR patch notes. For a scoped feedback moderation update, preserve the public version and release history, record its base commit and edited feedback assets in `operations/operator-maintenance.json`, and use `npm run release -- --refresh`. The release validator permits only those feedback assets and cache-key-only changes to their loaders; unrelated public changes still require a normal release.
- `dist/releases.json` is the authority for the site version, opening date and complete update history. Do not invent retroactive version numbers or remove historical entries. Use Korean dates in Asia/Seoul and describe changes in clear Korean.
- Use `npm run release -- patch "제목" "수정: 내용"` for fixes/design/data updates, or `minor` for a new feature. It increments the version, appends the newest note, synchronizes `package.json`, and refreshes asset cache keys and checksums. One completed user task is one release; finish its changes before running it.
- After further edits within the same unreleased task, use `npm run release -- --refresh` without another version bump. Review the latest note so it describes the final result.
- Run `npm test`, `node scripts/check-release.mjs --base <previous deployed commit>`, and `sha256sum --check --status SHA256SUMS.txt` before publishing. The deployment workflow rejects public-file changes without a newer BETA version and a new history entry.
- The confirmed opening date is 2026-10-16. Guide review dates and game patch dates are separate from website releases. `dist/data.json`'s legacy version describes its imported data baseline; never use it as the visible site version.

## MANOR 업데이트 문체

- 2026-10-27 용어 기준: 사이트 작성 설명과 역할 태그의 추격 상황은 `추격`으로 통일한다. `어그로`와 역할명 `사냥`을 혼용하지 않는다. `평타` 대신 `일반 공격`, `해독기` 대신 `암호 장치`, 골동품 상인의 `피리` 대신 `퉁소`를 쓴다. 아이템·스킬 명칭은 공식 한국어 자료를 우선하고 근거는 `research/localization/2026-10-27/terminology.json`에 기록한다. 기존 2026-10-22 약칭 유지 지침은 더 이상 적용하지 않는다.
- 명칭을 바꿀 때 조사를 함께 고치고 도감·상성·궁합·역할 설명에 동일하게 적용한다. 공식 명칭 확인을 최신 수치나 상성의 재검증으로 취급하지 않는다. 한국어 게임 설명 전재본과 공식 1차 자료의 확인 수준을 구분한다. 확인하지 못한 번역을 공식 명칭이라고 단정하지 않는다. 검색용 별칭, 출처 인용, 이용자 원문과 과거 변경 이력은 일괄 치환하지 않는다.
- 공개 데이터 갱신 뒤 `node --test terminology.test.mjs`를 포함한 필수 검사를 실행한다. 기존 용어가 되살아나면 데이터 생성 단계부터 수정한다.

- 사용자는 업데이트 내용을 읽는 재미를 원합니다. 변경 사실을 먼저 명확하게 설명하고, 가끔 이스터에그처럼 가벼운 드립이나 제5인격에 어울리는 농담을 한 줄 자연스럽게 넣으세요. 이번 요청 이후에도 계속 적용합니다.
- 모든 항목을 개그로 만들거나 기능·제약을 모호하게 표현하지 마세요. 사용자를 놀리는 말, 특정 국가·티어·유저를 깎아내리는 농담은 피합니다. 실제로 하지 않은 변경을 농담 때문에 만들어 쓰지 않습니다.
- 예: 국가 목록을 줄인 항목 끝에 “국가 선택창의 세계 일주 코스를 단축했습니다.” 정도로 짧게 덧붙입니다. 같은 문구를 다음 업데이트마다 반복하지 않습니다.
