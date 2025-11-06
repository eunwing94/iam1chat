# SilverChat 배포 가이드

이 문서는 SilverChat 프로젝트를 GitHub를 통해 실제 웹 환경에 배포하는 방법을 안내합니다.

## 📋 배포 전 준비사항

1. **GitHub 저장소 준비**
   - 프로젝트가 GitHub에 푸시되어 있어야 합니다
   - 모든 변경사항이 커밋되어 있어야 합니다

2. **환경 변수 준비**
   - OpenAI API 키 필요

3. **배포 플랫폼 계정**
   - 백엔드: Railway, Render, Heroku 등
   - 프론트엔드: Vercel, Netlify 등

---

## 🚀 배포 방법 1: Railway (백엔드) + Vercel (프론트엔드) - 추천

### 백엔드 배포 (Railway)

Railway는 Node.js 애플리케이션 배포에 최적화되어 있으며, 무료 티어를 제공합니다.

#### 1단계: Railway 계정 생성 및 프로젝트 연결

1. [Railway](https://railway.app/) 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. "Deploy from GitHub repo" 선택
5. SilverChat 저장소 선택
6. **Root Directory를 `backend`로 설정** (중요!)

#### 2단계: 환경 변수 설정

Railway 대시보드에서:
1. 프로젝트 선택 → "Variables" 탭
2. 다음 환경 변수 추가:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   PORT=3001
   NODE_ENV=production
   ```

#### 3단계: 배포 설정

Railway는 자동으로 감지하지만, 필요시 `railway.json` 파일을 생성:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 4단계: 배포 확인

1. Railway 대시보드에서 "Deployments" 확인
2. 배포 완료 후 "Settings" → "Generate Domain" 클릭
3. 백엔드 URL 확인 (예: `https://silverchat-backend.railway.app`)

---

### 프론트엔드 배포 (Vercel)

Vercel은 React/Vite 애플리케이션 배포에 최적화되어 있습니다.

#### 1단계: Vercel 계정 생성 및 프로젝트 연결

1. [Vercel](https://vercel.com/) 접속
2. GitHub 계정으로 로그인
3. "Add New Project" 클릭
4. SilverChat 저장소 선택
5. **Root Directory를 `frontend`로 설정** (중요!)
6. Framework Preset: "Vite" 선택

#### 2단계: 환경 변수 설정

Vercel 대시보드에서:
1. 프로젝트 선택 → "Settings" → "Environment Variables"
2. 다음 환경 변수 추가:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```

#### 3단계: 빌드 설정 확인

Vercel은 자동으로 감지하지만, 필요시 `vercel.json` 파일을 `frontend` 폴더에 생성:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

#### 4단계: 프록시 설정 수정

프로덕션 환경에서 백엔드 API를 올바르게 호출하도록 `frontend/vite.config.js` 수정 필요:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
```

그리고 프론트엔드 코드에서 API 호출 시 환경 변수 사용:

프론트엔드의 API 호출 부분을 확인하고, 필요시 환경 변수를 사용하도록 수정합니다.

#### 5단계: 배포 확인

1. Vercel 대시보드에서 배포 상태 확인
2. 자동 생성된 URL로 접속 (예: `https://silverchat.vercel.app`)

---

## 🚀 배포 방법 2: Render (백엔드 + 프론트엔드)

### 백엔드 배포 (Render)

#### 1단계: Render 계정 생성

1. [Render](https://render.com/) 접속
2. GitHub 계정으로 로그인

#### 2단계: Web Service 생성

1. "New +" → "Web Service" 클릭
2. GitHub 저장소 선택
3. 설정:
   - **Name**: `silverchat-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

#### 3단계: 환경 변수 설정

Render 대시보드에서:
1. "Environment" 탭
2. 환경 변수 추가:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   PORT=3001
   NODE_ENV=production
   ```

#### 4단계: 배포 확인

배포 완료 후 URL 확인 (예: `https://silverchat-backend.onrender.com`)

---

### 프론트엔드 배포 (Render)

#### 1단계: Static Site 생성

1. "New +" → "Static Site" 클릭
2. GitHub 저장소 선택
3. 설정:
   - **Name**: `silverchat-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

#### 2단계: 환경 변수 설정

```
VITE_API_URL=https://silverchat-backend.onrender.com
```

#### 3단계: 배포 확인

배포 완료 후 URL 확인

---

## 🔧 배포 전 필수 수정사항

### ✅ 이미 완료된 수정사항

프로젝트가 배포 준비가 완료되었습니다. 다음 수정사항이 이미 적용되어 있습니다:

1. **프론트엔드 API URL 설정**
   - `frontend/src/config.js` 파일 생성
   - 모든 API 호출이 `getApiUrl()` 함수를 사용하도록 수정됨
   - 환경 변수 `VITE_API_URL`로 프로덕션 백엔드 URL 설정 가능

2. **백엔드 CORS 설정**
   - 환경 변수 `FRONTEND_URL`로 프로덕션 프론트엔드 URL 허용
   - 개발 환경에서는 `http://localhost:5173` 기본값 사용

### 📋 배포 시 환경 변수 설정

#### 백엔드 (Railway/Render)
```
OPENAI_API_KEY=sk-your-openai-api-key
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://silverchat.vercel.app
```

#### 프론트엔드 (Vercel/Render)
```
VITE_API_URL=https://your-backend-url.railway.app
```

**주의**: 
- `VITE_API_URL`은 백엔드 전체 URL을 포함해야 합니다 (예: `https://silverchat-backend.railway.app`)
- 슬래시(`/`)로 끝나지 않도록 주의하세요

---

## 📝 배포 체크리스트

### 배포 전

- [ ] 모든 변경사항이 GitHub에 푸시됨
- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 환경 변수 목록 문서화됨
- [ ] 프론트엔드 API URL 설정 확인
- [ ] CORS 설정 확인

### 백엔드 배포

- [ ] Railway/Render 계정 생성 및 연결
- [ ] Root Directory를 `backend`로 설정
- [ ] 환경 변수 설정 (OPENAI_API_KEY, PORT 등)
- [ ] 배포 성공 확인
- [ ] 백엔드 URL 확인 및 테스트

### 프론트엔드 배포

- [ ] Vercel/Render 계정 생성 및 연결
- [ ] Root Directory를 `frontend`로 설정
- [ ] 환경 변수 설정 (VITE_API_URL)
- [ ] 빌드 성공 확인
- [ ] 프론트엔드 URL 확인 및 테스트
- [ ] API 연결 테스트

---

## 🔍 문제 해결

### 백엔드 배포 오류

1. **빌드 실패**
   - Root Directory가 `backend`로 설정되어 있는지 확인
   - `package.json`의 `start` 스크립트 확인

2. **환경 변수 오류**
   - Railway/Render 대시보드에서 환경 변수 확인
   - 변수 이름과 값이 정확한지 확인

3. **포트 오류**
   - Railway/Render는 자동으로 PORT 환경 변수를 설정
   - 코드에서 `process.env.PORT` 사용 확인

### 프론트엔드 배포 오류

1. **빌드 실패**
   - Root Directory가 `frontend`로 설정되어 있는지 확인
   - `npm run build` 명령이 로컬에서 작동하는지 확인

2. **API 연결 실패**
   - 백엔드 URL이 올바른지 확인
   - CORS 설정 확인
   - 브라우저 콘솔에서 오류 메시지 확인

3. **환경 변수 미적용**
   - Vercel/Render에서 환경 변수 재설정
   - 재배포 실행

---

## 🌐 무료 배포 플랫폼 비교

| 플랫폼 | 백엔드 | 프론트엔드 | 무료 티어 | 추천도 |
|--------|--------|-----------|----------|--------|
| Railway | ✅ | ✅ | 제한적 | ⭐⭐⭐⭐⭐ |
| Render | ✅ | ✅ | 제한적 | ⭐⭐⭐⭐ |
| Vercel | ❌ | ✅ | 넉넉함 | ⭐⭐⭐⭐⭐ |
| Netlify | ❌ | ✅ | 넉넉함 | ⭐⭐⭐⭐ |
| Heroku | ✅ | ❌ | 없음 | ⭐⭐ |

**추천 조합**: Railway (백엔드) + Vercel (프론트엔드)

---

## 📚 추가 참고 자료

- [Railway 문서](https://docs.railway.app/)
- [Vercel 문서](https://vercel.com/docs)
- [Render 문서](https://render.com/docs)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)

---

## 💡 팁

1. **도메인 연결**: Railway와 Vercel 모두 커스텀 도메인 연결을 지원합니다
2. **자동 배포**: GitHub에 푸시하면 자동으로 재배포됩니다
3. **환경 변수 관리**: 각 환경(프로덕션, 스테이징)별로 환경 변수를 관리하세요
4. **모니터링**: 배포 플랫폼의 로그와 모니터링 기능을 활용하세요

---

문의: AM1팀 권은 (eun.kwon@cj.net)

