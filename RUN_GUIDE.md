# SilverChat 실행 가이드

이 문서는 SilverChat 프로젝트의 백엔드와 프론트엔드를 실행하는 방법을 안내합니다.

## 📋 사전 요구사항

- Node.js (v16 이상 권장)
- npm 또는 yarn
- OpenAI API 키

---

## 🔧 백엔드 실행 방법

### 1단계: 백엔드 폴더로 이동

```bash
cd backend
```

### 2단계: 의존성 설치

```bash
npm install
```

### 3단계: 환경 변수 설정

`backend` 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
PORT=3001
```

**주의:**
- `OPENAI_API_KEY`는 필수입니다. OpenAI API 키를 발급받아 입력하세요.
- `PORT`는 선택사항입니다. 기본값은 3001입니다.

### 4단계: 백엔드 서버 실행

```bash
npm start
```

또는

```bash
node index.js
```

### 실행 확인

서버가 정상적으로 실행되면 다음과 같은 메시지가 표시됩니다:

```
🚀 서버 초기화 완료
silverchat 백엔드 서버가 3001번 포트에서 실행 중입니다.
```

### 백엔드 API 엔드포인트

- `POST /api/chat` - 채팅 메시지 전송
- `GET /api/chat/history` - 채팅 기록 조회
- `GET /api/stats/low-confidence` - 낮은 신뢰도 통계
- `POST /api/chat/learn-answer` - 답변 학습
- `GET /api/screen-analysis` - 화면 분석 데이터 조회

---

## 🎨 프론트엔드 실행 방법

### 1단계: 프론트엔드 폴더로 이동

```bash
cd frontend
```

### 2단계: 의존성 설치

```bash
npm install
```

### 3단계: 프론트엔드 개발 서버 실행

```bash
npm run dev
```

### 실행 확인

개발 서버가 정상적으로 실행되면 다음과 같은 메시지가 표시됩니다:

```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 접속

브라우저에서 **http://localhost:5173** 에 접속하면 SilverChat 챗봇을 사용할 수 있습니다.

---

## 🚀 전체 프로젝트 실행 (백엔드 + 프론트엔드)

두 터미널을 열어서 각각 백엔드와 프론트엔드를 실행하세요:

### 터미널 1 - 백엔드

```bash
cd backend
npm install  # 최초 1회만
npm start
```

### 터미널 2 - 프론트엔드

```bash
cd frontend
npm install  # 최초 1회만
npm run dev
```

---

## 📝 주요 설정 정보

### 백엔드
- **포트**: 3001 (기본값, `.env` 파일에서 변경 가능)
- **데이터베이스**: SQLite (`chat_history.db`)
- **메인 파일**: `index.js`

### 프론트엔드
- **포트**: 5173 (Vite 기본값)
- **프록시**: `/api` 요청은 자동으로 `http://localhost:3001`로 프록시됩니다.
- **빌드 명령어**: `npm run build`

---

## ⚠️ 주의사항

1. **백엔드를 먼저 실행**: 프론트엔드는 백엔드 API를 사용하므로, 백엔드를 먼저 실행해야 합니다.

2. **환경 변수**: `.env` 파일은 `.gitignore`에 추가되어 있어야 합니다. 절대 Git에 커밋하지 마세요.

3. **포트 충돌**: 다른 서비스가 3001 또는 5173 포트를 사용 중이면 포트 충돌이 발생할 수 있습니다.

---

## 🐛 문제 해결

### 백엔드 실행 오류

- **의존성 오류**: `npm install`을 다시 실행하세요.
- **환경 변수 오류**: `.env` 파일이 올바른 위치에 있고 올바른 형식인지 확인하세요.
- **포트 충돌**: 다른 포트를 사용하거나 기존 프로세스를 종료하세요.

### 프론트엔드 실행 오류

- **의존성 오류**: `npm install`을 다시 실행하세요.
- **API 연결 오류**: 백엔드가 실행 중인지 확인하세요 (http://localhost:3001).

---

## 📚 추가 정보

프로젝트의 상세한 개발 내역은 `README.md` 파일을 참고하세요.

