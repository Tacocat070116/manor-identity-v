# MANOR 배포와 공개 범위

운영 주소: https://manor-identity-v.tacocat070116.chatgpt.site/

- 웹사이트: Sites 공개 운영 (`appgprj_6ad18630c40c8191949e1acbcf5f457d`).
- GitHub 소스·개발 이력: `Tacocat070116/manor-identity-v`, 비공개 유지.
- 게시판·작성자·채널·조합 기록: 기존 MANOR 피드백 서비스와 D1 저장소 유지. 데이터 초기화나 재생성을 하지 않습니다.
- GitHub Pages: 사용하지 않습니다. GitHub Free의 Pages를 유지하기 위해 저장소를 다시 공개하지 않습니다.

## 업데이트

1. 현재 배포 소스를 열고 변경합니다. `.openai/hosting.json`의 프로젝트 ID와 `dist` 설정을 유지합니다.
2. 공개 파일을 바꾸면 `npm run release -- patch "제목" "개선: 내용"`으로 BETA 버전과 공개 이력을 함께 갱신합니다. 같은 미배포 작업의 추가 수정은 `npm run release -- --refresh`를 사용합니다.
3. `npm test`, `node scripts/check-release.mjs --base <직전 배포 커밋>`, `node scripts/check-content-consistency.mjs --base <직전 배포 커밋>`, `sha256sum --check --status SHA256SUMS.txt`를 실행합니다.
4. Sites source helper로 검증한 소스를 비공개 원격에 반영하고 같은 커밋의 `dist` 묶음을 만듭니다. 접근 범위는 공개를 유지하며 저장한 버전을 배포합니다.
5. 배포 성공과 게시판·채널·조합 연결을 확인합니다. GitHub에도 같은 소스를 비공개로 보관합니다.

## 주소 이전과 기록

최초 공개일은 2026-10-16이며 2026-10-31에 GitHub Pages에서 Sites로 이전했습니다. 이전 주소의 브라우저 저장소는 새 주소로 자동 이동하지 않습니다. 작성자가 저장한 개인 복구 코드로 서버의 기존 작성 기록을 연결할 수 있습니다. 즐겨찾기와 테마는 브라우저별 설정입니다.

화면에 전송되는 HTML·CSS·JavaScript와 공개 JSON은 방문자의 브라우저에서 열람할 수 있습니다. 비공개 저장소는 개발 이력·도구·검토 자료를 공개하지 않기 위한 것이며, 브라우저에 제공한 파일을 숨기는 기능은 아닙니다.

`research/payload/retired-fields.json`은 로컬 보관 파일입니다. Git 추적과 외부 업로드에서 계속 제외하며, 중단된 통계 확장 작업본을 이 배포에 합치거나 삭제하지 않습니다.
