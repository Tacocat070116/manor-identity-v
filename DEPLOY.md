# 본인 계정에서 배포하기

문서 확인일: 2026-10-16. 이 문서는 배포 준비 안내이며, 현재 외부 계정에 배포되었음을 뜻하지 않습니다.

## 권장 구성

| 관리 대상 | 본인 소유 계정 | 목적 |
| --- | --- | --- |
| 전체 소스 | GitHub 개인 비공개 저장소 | 수정 이력·백업·호스팅 이전 |
| 실제 사이트 | Cloudflare Pages | 파일 배포·HTTPS·변경 자동 배포 |
| 사이트 주소 | Cloudflare가 프로젝트에 발급하는 `pages.dev` 주소 | 별도 도메인 구매 없이 접속 |

현재 사이트는 정적 파일만 사용하므로 별도 서버와 데이터베이스를 계약할 필요가 없습니다. Cloudflare Pages 무료 플랜은 현재 월 500회 빌드, 사이트 20,000개 파일, 개별 파일 25 MiB를 지원합니다. 이 배포본은 해당 파일 한도 안에 있습니다. 이 프로젝트는 별도 도메인을 구매하지 않고 무료 `pages.dev` 기본 주소를 사용합니다.

## 1. 사용할 저장소

저장소: https://github.com/Tacocat070116/manor-identity-v

소유자는 `Tacocat070116`, 공개 범위는 비공개, 배포 브랜치는 `main`입니다. 저장소 루트의 `dist`, `package.json`, `validate.mjs`를 사용합니다. Cloudflare에 GitHub 접근을 허용할 때 이 저장소를 선택합니다.

## 2. Cloudflare Pages에 저장소 연결

본인 Cloudflare 계정에서 **Workers & Pages → Create application → Pages → Import an existing Git repository**를 선택합니다. GitHub 연결을 요청하면 이 사이트 저장소를 지정합니다. 저장소를 선택한 다음 아래 값을 사용합니다.

| 항목 | 값 |
| --- | --- |
| Framework preset | None |
| Production branch | main |
| Root directory | 저장소 루트 |
| Build command | `npm test` |
| Build output directory | `dist` |
| Node.js | `.node-version`의 `22` 사용 |
| API 키·데이터베이스 | 사용하지 않음 |

배포를 시작하면 구문 및 자료 검증이 먼저 실행됩니다. 검증이 실패하면 해당 변경을 수정한 다음 다시 배포합니다. 자동 배포가 켜진 상태에서 `main` 변경을 올리면 새 버전이 배포됩니다. 실제 발급되는 `pages.dev` 주소는 Cloudflare 결과를 사용하세요.

이 프로젝트는 빌드할 코드가 없으므로 Cloudflare 공식 정적 HTML 안내의 일반적인 `exit 0` 대신 기존 검증 명령인 `npm test`를 배포 전 검사로 사용합니다.

## 3. 무료 사이트 주소 사용

첫 배포가 성공하면 Cloudflare 화면에 표시되는 실제 `https://…pages.dev` 주소를 사용합니다. 프로젝트 이름은 `manor-identity-v`를 우선 사용하되, 사용 가능 여부와 최종 주소는 Cloudflare 결과로 확인합니다. 별도 도메인 등록이나 구매는 필요하지 않습니다.

주소가 확정되면 README에 실제 운영 주소를 기록하고 `dist/index.html`에 같은 HTTPS 주소의 `og:url`과 `canonical`을 추가합니다. 아직 발급되지 않은 예시 주소를 실제 운영 주소로 적지 않습니다.

## 4. 외부 주소 확인

- 휴대폰과 PC에서 첫 화면, 검색, 캐릭터 상세, 비교, 밴 분석을 확인합니다.
- 캐릭터 링크를 복사해 새 탭에서 열었을 때 같은 화면이 열리는지 확인합니다.
- 프로필 89장과 출처 링크, 테마 전환, 즐겨찾기를 확인합니다.
- 공개 운영이면 로그인하지 않은 창에서도 접근 가능한지 확인합니다. 비공개 운영이면 외부 접근 제어가 실제 적용되었는지 확인합니다.

새 주소 확인을 마친 뒤 기존 안내 링크를 갱신합니다. Google Sheets 주소 자체를 일반 웹사이트 주소로 바꾸거나 자동 이동 주소로 만들 수는 없습니다. 시트에 새 사이트의 안내 링크를 둘 수 있습니다.

## GitHub 없이 직접 올리려면

Cloudflare Pages의 Direct Upload에서 **압축을 푼 `dist` 폴더만** 업로드할 수도 있습니다. 전체 소스 폴더를 업로드하지 마세요. 직접 업로드 프로젝트는 나중에 같은 프로젝트를 Git 연동 방식으로 바꿀 수 없으므로, 계속 관리할 계획이라면 처음부터 위의 Git 연동 방식을 권합니다.

다른 호스팅을 쓰는 경우에도 웹 루트에 `dist` 내용이 오도록 배포하면 됩니다. ES module과 JSON 파일을 HTTP(S)로 제공할 수 있어야 합니다. 파일을 더블클릭해서 `file://`로 여는 방식은 지원하지 않습니다.

## 공식 문서

- 정적 HTML 배포: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Git 연동: https://developers.cloudflare.com/pages/configuration/git-integration/
- 개인 도메인 연결: https://developers.cloudflare.com/pages/configuration/custom-domains/
- 무료 플랜 한도: https://developers.cloudflare.com/pages/platform/limits/
- 직접 업로드: https://developers.cloudflare.com/pages/get-started/direct-upload/
- 파일 응답 헤더: https://developers.cloudflare.com/pages/configuration/headers/
