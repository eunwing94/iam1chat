# GitHub Pages 배포 가이드

이 문서는 SilverChat 프로젝트를 GitHub Pages에 배포하는 방법을 안내합니다.

## 📋 사전 준비사항

1. **GitHub 저장소 준비**
   - 프로젝트가 GitHub에 푸시되어 있어야 합니다
   - 저장소 이름: `iam1chat` (현재 URL 기준)

2. **백엔드 URL 준비**
   - GitHub Pages는 정적 파일만 호스팅하므로 백엔드가 별도로 배포되어 있어야 합니다
   - Railway, Render 등에 백엔드를 먼저 배포하세요

---

## 🚀 자동 배포 설정 (GitHub Actions)

### 1단계: GitHub 저장소 설정

1. GitHub 저장소 페이지 접속
2. **Settings** → **Pages** 메뉴로 이동
3. **Source**를 **GitHub Actions**로 설정
4. 저장

### 2단계: 환경 변수 설정 (선택사항)

백엔드 URL이 필요한 경우:

1. GitHub 저장소 페이지 접속
2. **Settings** → **Secrets and variables** → **Actions** 메뉴로 이동
3. **New repository secret** 클릭
4. 다음 환경 변수 추가:
   - **Name**: `VITE_API_URL`
   - **Value**: 백엔드 URL (예: `https://silverchat-backend.railway.app`)

### 3단계: 코드 푸시

GitHub Actions 워크플로우가 이미 설정되어 있으므로, `main` 브랜치에 푸시하면 자동으로 빌드 및 배포됩니다:

```bash
git add .
git commit -m "GitHub Pages 배포 설정"
git push origin main
```

### 4단계: 배포 확인

1. GitHub 저장소 페이지에서 **Actions** 탭 확인
2. 워크플로우가 완료되면 **Settings** → **Pages**에서 배포된 URL 확인
3. `https://eunwing94.github.io/iam1chat/` 접속하여 확인

---

## 🔧 수동 배포 방법

GitHub Actions를 사용하지 않는 경우:

### 1단계: 빌드

```bash
cd frontend
npm install
npm run build
```

### 2단계: gh-pages 브랜치에 배포

#### 방법 A: gh-pages 패키지 사용 (권장)

```bash
# frontend 폴더에서
npm install --save-dev gh-pages

# package.json에 스크립트 추가
# "deploy": "npm run build && gh-pages -d dist"

npm run deploy
```

#### 방법 B: 수동으로 gh-pages 브랜치 생성

```bash
cd frontend
npm run build

# gh-pages 브랜치 생성 및 빌드 파일 푸시
git checkout --orphan gh-pages
git rm -rf .
cp -r dist/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

### 3단계: GitHub Pages 설정

1. GitHub 저장소 페이지 접속
2. **Settings** → **Pages** 메뉴로 이동
3. **Source**를 **Deploy from a branch**로 설정
4. **Branch**를 `gh-pages` 또는 `main` 선택
5. **Folder**를 `/` 또는 `/frontend/dist` 선택
6. 저장

---

## ⚙️ 설정 변경사항

### 1. Vite 설정

`frontend/vite.config.js`에 base path 추가:

```javascript
export default defineConfig({
  base: '/iam1chat/', // GitHub Pages base path
  // ...
})
```

### 2. React Router 설정

`frontend/src/App.jsx`에 basename 추가:

```javascript
<Router basename="/iam1chat">
  <Routes>
    {/* ... */}
  </Routes>
</Router>
```

---

## 🔍 문제 해결

### 1. 빈 페이지가 표시되는 경우

- **base path 확인**: `vite.config.js`의 `base` 설정이 올바른지 확인
- **빌드 확인**: `frontend/dist` 폴더에 파일이 생성되었는지 확인
- **브라우저 캐시**: 브라우저 캐시를 지우고 다시 시도

### 2. 404 에러가 발생하는 경우

- **React Router basename 확인**: `basename="/iam1chat"` 설정 확인
- **GitHub Pages 설정**: 올바른 브랜치와 폴더가 선택되었는지 확인

### 3. API 연결 오류

- **환경 변수 확인**: GitHub Actions secrets에 `VITE_API_URL`이 설정되었는지 확인
- **CORS 설정**: 백엔드의 CORS 설정이 GitHub Pages URL을 허용하는지 확인

### 4. 이미지나 리소스가 로드되지 않는 경우

- **상대 경로 사용**: 절대 경로 대신 상대 경로 사용
- **base path 확인**: 모든 리소스 경로가 base path를 포함하는지 확인

---

## 📝 참고사항

1. **리포지토리 이름 변경 시**
   - `vite.config.js`의 `base` 값 변경
   - `App.jsx`의 `basename` 값 변경
   - GitHub Pages URL도 변경됩니다

2. **백엔드 없이 테스트**
   - 로컬에서 `npm run build && npm run preview`로 빌드 확인
   - `vite preview`는 빌드된 파일을 미리 볼 수 있습니다

3. **자동 배포**
   - GitHub Actions를 사용하면 `main` 브랜치에 푸시할 때마다 자동으로 배포됩니다
   - 배포는 약 1-2분 정도 소요됩니다

---

## 🔗 관련 링크

- [GitHub Pages 공식 문서](https://docs.github.com/en/pages)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)
- [React Router basename](https://reactrouter.com/en/main/router-components/browser-router#basename)

---

문의: AM1팀 권은 (eun.kwon@cj.net)

