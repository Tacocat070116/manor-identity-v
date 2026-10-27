# MANOR site updates

- The public site is https://tacocat070116.github.io/manor-identity-v/ and is deployed from `main` via GitHub Pages.
- The owner requires a new site version and a public patch note for every shipped change to `dist/`. Keep the visible version prefixed with `BETA` until the owner explicitly ends beta.
- `dist/releases.json` is the authority for the site version, opening date and complete update history. Do not invent retroactive version numbers or remove historical entries. Use Korean dates in Asia/Seoul and describe changes in clear Korean.
- Use `npm run release -- patch "제목" "수정: 내용"` for fixes/design/data updates, or `minor` for a new feature. It increments the version, appends the newest note, synchronizes `package.json`, and refreshes asset cache keys and checksums. One completed user task is one release; finish its changes before running it.
- After further edits within the same unreleased task, use `npm run release -- --refresh` without another version bump. Review the latest note so it describes the final result.
- Run `npm test`, `node scripts/check-release.mjs --base <previous deployed commit>`, and `sha256sum --check --status SHA256SUMS.txt` before publishing. The deployment workflow rejects public-file changes without a newer BETA version and a new history entry.
- The confirmed opening date is 2026-10-16. Guide review dates and game patch dates are separate from website releases. `dist/data.json`'s legacy version describes its imported data baseline; never use it as the visible site version.

## MANOR 업데이트 문체

- 사용자는 업데이트 내용을 읽는 재미를 원합니다. 변경 사실을 먼저 명확하게 설명하고, 가끔 이스터에그처럼 가벼운 드립이나 제5인격에 어울리는 농담을 한 줄 자연스럽게 넣으세요. 이번 요청 이후에도 계속 적용합니다.
- 모든 항목을 개그로 만들거나 기능·제약을 모호하게 표현하지 마세요. 사용자를 놀리는 말, 특정 국가·티어·유저를 깎아내리는 농담은 피합니다. 실제로 하지 않은 변경을 농담 때문에 만들어 쓰지 않습니다.
- 예: 국가 목록을 줄인 항목 끝에 “국가 선택창의 세계 일주 코스를 단축했습니다.” 정도로 짧게 덧붙입니다. 같은 문구를 다음 업데이트마다 반복하지 않습니다.
