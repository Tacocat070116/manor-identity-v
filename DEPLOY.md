# 본인 계정에서 무료 배포하기

문서 확인일: 2026-10-16. GitHub Pages 첫 배포가 성공했고 실제 사이트 접속과 주요 기능을 확인했습니다.

운영 주소: https://tacocat070116.github.io/manor-identity-v/

## 사용할 구성

| 관리 대상 | 구성 |
| --- | --- |
| 전체 소스와 이력 | `Tacocat070116/manor-identity-v` |
| 실제 사이트 | GitHub Pages |
| 사이트 주소 | GitHub Pages가 제공하는 무료 기본 주소 |
| 배포 대상 | `main` 브랜치의 `dist/` 내용 |
| 배포 전 검사 | Node.js 22에서 `npm test`와 파일 해시 검증 |

GitHub Free에서는 공개 저장소로 Pages를 사용할 수 있습니다. 별도 서버·데이터베이스·도메인 구매가 필요하지 않습니다. 저장소는 소유자 승인 후 공개로 전환했으며 소스 코드·JSON 자료·이미지·변경 이력도 공개됩니다. 이 사이트는 비상업적 게임 가이드입니다.

## 1. 준비된 변경 확인

저장소: https://github.com/Tacocat070116/manor-identity-v

`deploy/github-pages`에서 준비한 워크플로를 `main`에 반영해 배포했습니다. 운영 변경은 현재 `main`을 기준으로 작성합니다. 워크플로는 공개 저장소의 `main`만 배포하도록 제한되어 있습니다. 아래 활성화 순서는 새 저장소로 이전하거나 Pages를 다시 설정할 때 사용합니다.

## 2. 공개 범위 확인 후 Pages 활성화

1. 소유자 승인 후 저장소 **Settings → General → Change visibility**에서 공개로 전환합니다.
2. **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
3. 준비 브랜치의 변경을 `main`에 반영합니다. 원래 `main`에 다른 변경이 생겼다면 먼저 확인하고 통합합니다.
4. **Actions → Deploy MANOR to GitHub Pages**의 실행 결과를 확인합니다. 필요하면 `main`에서 **Run workflow**를 사용합니다.

`.github/workflows/pages.yml`은 검증 성공 후 `dist`만 업로드합니다. 외부 패키지 설치나 개인 액세스 토큰은 필요하지 않습니다. 배포용 권한은 해당 실행의 GitHub 토큰과 Pages용 OIDC를 사용합니다. 검증이 실패하면 배포하지 않으며, 문제를 수정한 다음 다시 실행합니다.

## 3. 실제 주소 검증

첫 배포가 성공하면 **Settings → Pages** 또는 배포 결과에 표시된 실제 HTTPS 주소를 확인합니다. 그 주소로 아래 항목을 검사한 뒤 README에 운영 주소를 기록하고 `dist/index.html`에 같은 주소의 `og:url`과 `canonical`을 추가합니다. 예상 주소를 실제 운영 주소로 기록하지 않습니다.

- 첫 화면, 검색, 캐릭터 상세, 비교, 밴 분석이 열리는지 확인합니다.
- 캐릭터 링크를 복사해 새 탭에서 열었을 때 같은 화면이 열리는지 확인합니다.
- 정사각형 프로필 89장과 JSON 자료가 프로젝트 하위 경로에서도 정상 로드되는지 확인합니다.
- 테마 전환과 즐겨찾기, 모바일 화면을 확인합니다.
- 로그인하지 않은 방문자도 사이트에 접근할 수 있는지 확인합니다.

리소스 경로는 상대 경로, 화면 이동은 URL 해시를 사용합니다. GitHub 프로젝트 사이트의 하위 경로에 배포할 수 있도록 구성돼 있습니다. `dist/_headers`는 Cloudflare용 설정이며 GitHub Pages에는 적용되지 않습니다.

사이트 주소 확인을 마친 뒤 기존 안내 링크를 갱신합니다. Google Sheets 주소 자체가 일반 웹사이트 주소로 바뀌거나 자동 이동되는 것은 아닙니다. 시트에는 새 사이트 안내 링크를 둘 수 있습니다.

## 다른 호스팅으로 옮기기

`dist` 내용을 웹 루트로 배포하면 됩니다. ES module과 JSON을 HTTP(S)로 제공해야 하며 파일을 더블클릭해 여는 `file://` 방식은 지원하지 않습니다.

Cloudflare Pages도 대안입니다. 계정 연결이 정상적으로 완료된 뒤 저장소를 연결하고 Framework preset `None`, Production branch `main`, Build command `npm test`, Build output directory `dist`, Node.js `.node-version`의 `22`를 사용합니다. Git 연동 대신 Direct Upload를 선택하면 압축을 푼 `dist` 폴더만 올립니다. 현재 Cloudflare 프로젝트나 운영 주소는 생성되지 않았습니다.

## 공식 문서

- GitHub Pages 만들기: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- 배포 소스 설정: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- 공식 정적 사이트 워크플로: https://github.com/actions/starter-workflows/blob/main/pages/static.yml
- Cloudflare 정적 HTML 배포: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
- Cloudflare 직접 업로드: https://developers.cloudflare.com/pages/get-started/direct-upload/
