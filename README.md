# silverchat

silverchat은 AI 챗봇 웹사이트입니다. 프론트엔드는 React, 백엔드는 Express와 OpenAI API를 사용합니다.

##### 1차 개발내역 #######
개발내역과 관련 파일 참고
1. 문의내역 히스토리 관리 [ChatManagement.jsx]
2. 질문에 대한 신뢰도 계산 [confidence.js] =>>>> 신뢰도 계산로직 보완필요합니다 ㅠㅠ
4. 신뢰도 60% 이하인 답변들에 대해서 Teams 채널 알림 [teams-notification.js]
5. 신뢰도 낮은 답변들에 대해서 재학습 할 수 있는 기능 [database.js]
6. 카테고리 분석 및 Teams 멘션 기능 추가 [category-analyzer.js]
  ; 질문에 대한 카테고리를 분석하고, 담당자를 분류해주는 기능을 추가했습니다.


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



