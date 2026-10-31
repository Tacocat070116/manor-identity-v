# MANOR site updates

- The public site is https://tacocat070116.github.io/manor-identity-v/ and is deployed from `main` via GitHub Pages.
- Owner instruction on 2026-10-31 supersedes the private-source migration: keep this GitHub repository public and restore the existing GitHub Pages URL. Preserve the English title accents, reduced public payloads, participation records and paused statistics work. Do not move the public site to another host or change its address without a new explicit request.
- **Latest owner instruction, 2026-10-31: publish MANOR patch/version announcements only when the owner explicitly says to announce them. Batch all completed changes at that time. This supersedes every older per-deployment version/patch-note rule.** A request to fix, clean up, update or deploy the site is not a request to announce a version.
- Ordinary changes ship with the existing `BETA` version and unchanged `dist/releases.json` / `package.json` version. Use `npm run release -- --refresh` (or `npm run release`) to refresh cache keys and checksums only. Record unannounced work in `operations/pending-changes.json`, outside `dist/`. An explicit request to edit existing announcement wording permits text-only corrections without a version bump or a new announcement. Record the exact before/after log hashes and owner request in `operations/release-copy-edits.json`; do not add these corrections to pending announcements.
- Only after an explicit announcement request, consolidate completed work and use `npm run release -- --announce patch "제목" "수정: 내용"` (or `minor` for a new feature). Do not announce staged or incomplete work. Operator-system changes remain excluded from public patch notes.
- `dist/releases.json` is the authority for the announced version, opening date and complete update history. Keep the visible version prefixed with `BETA` until the owner ends beta. Preserve historical entries and use Asia/Seoul dates and clear Korean descriptions.
- Run `npm test`, `node scripts/check-release.mjs --base <previous deployed commit>`, and `sha256sum --check --status SHA256SUMS.txt` before publishing. The validator accepts unchanged announcements and exact owner-requested copy edits recorded above. Copy edits must preserve release count, order, versions, dates, types, commits and opening metadata; unrecorded edits still fail.
- The confirmed opening date is 2026-10-16. Guide review dates and game patch dates are separate from website releases. `dist/data.json`'s legacy version describes its imported data baseline; never use it as the visible site version.

## 공개 화면과 데이터 용량

- 큰 제목 위의 작은 영어 포인트 문구를 유지합니다. MANOR 업데이트의 개별 패치 항목 소제목을 다시 표시하라는 뜻은 아닙니다.
- 사이트에서 사용하지 않는 필드는 `scripts/public_payload.py`로 공개 JSON에서 제외하고 `research/payload/retired-fields.json`에 로컬로 보관합니다. 이 보관 파일은 Git 추적과 외부 업로드에서 제외합니다. `npm run release`가 이를 적용하며 `npm test`는 기존 공개 Git 이력으로 표시 내용 유지와 재유입을 검사합니다.
- 실제 공략·경기·랭킹전 기록, 검토 보류 자료, 진행을 잠시 중단한 통계 확장 작업본은 미사용 더미 자료로 간주하지 않습니다. 화면·계산에 쓰이는지 확인하지 않은 자료는 용량 정리 목적으로 삭제하지 않습니다.

## MANOR 업데이트 문체

- 2026-10-27 용어 기준: 사이트 작성 설명과 역할 태그의 추격 상황은 `추격`으로 통일한다. `어그로`와 역할명 `사냥`을 혼용하지 않는다. `평타` 대신 `일반 공격`, `해독기` 대신 `암호 장치`, 골동품 상인의 `피리` 대신 `퉁소`를 쓴다. 아이템·스킬 명칭은 공식 한국어 자료를 우선하고 근거는 `research/localization/2026-10-27/terminology.json`에 기록한다. 기존 2026-10-22 약칭 유지 지침은 더 이상 적용하지 않는다.
- 명칭을 바꿀 때 조사를 함께 고치고 도감·상성·궁합·역할 설명에 동일하게 적용한다. 공식 명칭 확인을 최신 수치나 상성의 재검증으로 취급하지 않는다. 한국어 게임 설명 전재본과 공식 1차 자료의 확인 수준을 구분한다. 확인하지 못한 번역을 공식 명칭이라고 단정하지 않는다. 검색용 별칭, 출처 인용, 이용자 원문과 과거 변경 이력은 일괄 치환하지 않는다.
- 공개 데이터 갱신 뒤 `node --test terminology.test.mjs`를 포함한 필수 검사를 실행한다. 기존 용어가 되살아나면 데이터 생성 단계부터 수정한다.
- 후속 용어 기준과 출처 확인 수준은 `research/localization/2026-10-27-followup/terminology.json`에 기록한다. `python scripts/build-korean-terminology.py --check`는 이 최신 기준을 기본값으로 사용한다. 과거 기준을 현재 데이터에 재적용하지 않는다. 기상학자의 이동 기술 `층운`과 `따뜻한 비`가 만드는 구름, 교수의 `비늘 표피`와 `비늘 경화`는 문맥별로 구분한다.

- **최신 사용자 지시(2026-10-31): 공지에 유머·개그·농담·드립·이스터에그를 절대 넣지 않습니다. 이전의 유머 요청은 폐기합니다.**
- 변경 대상과 결과를 먼저 적고, 불필요한 수식·비유·인사·감상·반복 설명을 제거합니다. 짧고 구체적인 문장으로 사용자가 무엇이 달라졌는지 바로 알 수 있게 씁니다.
- 수치·조건·제약처럼 변경을 이해하는 데 필요한 정보는 유지합니다. 과거 기록은 당시 변경 사실을 보존하고, 현재 기능으로 오해하게 바꾸지 않습니다. 변경 유형 배지와 날짜·버전도 유지합니다.
- 사용자가 공지 문구만 정리하도록 요청한 경우 그 교정 작업을 새 패치 항목으로 알리거나 다음 공지에 다시 포함하지 않습니다.

## 캐릭터 설명을 함께 검토하기

- 역할 태그·역할 이유·소개·장점·사용·보존·주의 문구는 캐릭터 단위로 함께 읽습니다. 태그만 바꾸고 사용 설명을 놓치거나, 구출 한정 상성을 추격에도 적용하지 않도록 확인합니다.
- 해당 묶음을 변경하면 `research/editorial/content-review.json`에 변경 전후 지문과 검토 결론을 기록하고, 날짜별 편집 기록에 각 필드의 이전·이후 문장과 필요한 근거를 남깁니다. 관련 문장을 모두 바꿀 필요는 없지만 함께 검토해야 합니다.
- `node scripts/check-content-consistency.mjs --base <previous deployed commit>`를 실행합니다. CI에서도 배포 기준 커밋과 비교합니다. 지문 검사는 검토 누락을 잡는 장치이며 게임 사실·수치·상성의 정확성을 자동으로 보증하지 않습니다. 문구 일관성 검토일을 게임 밸런스 검토일로 쓰지 않습니다.
- 후속 편집은 용어 생성기의 과거 감사 기록 뒤에 재생하고 `python scripts/build-korean-terminology.py --check`를 확인합니다. 과거 이력을 덮어쓰지 않습니다.

## 연구실과 공지 동선

- 연구실은 `#v=laboratory`에서 생존자 조합, 생존자 인격, 감시자 인격, 자유 전략을 다룹니다. 이전 `character&tab=synergy` 링크는 연구실로 연결하고 글·댓글·작성 권한을 유지합니다.
- 도감의 조합 작성 탭을 되살리지 않습니다. 연구 작성자가 근거를 첨부해 도감 반영을 제안하고, 운영자가 승인한 공개 글만 해당 캐릭터 도감에 원문 링크와 함께 표시합니다. 수정·숨김·삭제 시 검토되지 않은 내용이 도감에 남지 않게 합니다.
- MANOR 업데이트는 카테고리에서 제외하고 상단 확성기를 눌렀을 때 최신 공지 한 건을 보여줍니다. ‘이전 내역 살펴보기’로 전체 이력을 연결합니다. 자동 팝업이나 미확인 배지는 추가하지 않습니다.
- 복구 안내는 현재 브라우저의 연결, 외부 보관 확인, 저장 가능 여부를 함께 판단합니다. 완료 상태는 작은 안내로 접고 코드 관리 접근은 유지합니다. 단순 조회나 복사만으로 외부 보관을 확인한 것으로 처리하지 않습니다.
