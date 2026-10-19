# MANOR site updates

- The public site is https://tacocat070116.github.io/manor-identity-v/ and is deployed from `main` via GitHub Pages.
- The owner requires a new site version and a public patch note for every shipped change to `dist/`. Keep the visible version prefixed with `BETA` until the owner explicitly ends beta.
- `dist/releases.json` is the authority for the site version, opening date and complete update history. Do not invent retroactive version numbers or remove historical entries. Use Korean dates in Asia/Seoul and describe changes in clear Korean.
- Use `npm run release -- patch "제목" "수정: 내용"` for fixes/design/data updates, or `minor` for a new feature. It increments the version, appends the newest note, synchronizes `package.json`, and refreshes asset cache keys and checksums. One completed user task is one release; finish its changes before running it.
- After further edits within the same unreleased task, use `npm run release -- --refresh` without another version bump. Review the latest note so it describes the final result.
- Run `npm test`, `node scripts/check-release.mjs --base <previous deployed commit>`, and `sha256sum --check --status SHA256SUMS.txt` before publishing. The deployment workflow rejects public-file changes without a newer BETA version and a new history entry.
- The confirmed opening date is 2026-10-16. Guide review dates and game patch dates are separate from website releases. `dist/data.json`'s legacy version describes its imported data baseline; never use it as the visible site version.
