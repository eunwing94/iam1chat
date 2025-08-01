# silverchat

silverchat은 AI 챗봇 웹사이트입니다. 프론트엔드는 React, 백엔드는 Express와 OpenAI API를 사용합니다.

## 폴더 구조

- frontend: React 기반 챗봇 웹 UI
- backend: Express 기반 API 서버(OpenAI 연동)

## 실행 방법

### 1. 백엔드 실행

```bash
cd backend
# .env 파일에 본인의 OpenAI API 키를 입력하세요.
# 예시: OPENAI_API_KEY=sk-xxxxxxx
node index.js
```

### 2. 프론트엔드 실행

```bash
cd frontend
npm run dev
```

## 접속

브라우저에서 http://localhost:5173 에 접속하면 silverchat 챗봇을 사용할 수 있습니다.

---

문의: AM1팀 권은 (eun.kwon@cj.net)
