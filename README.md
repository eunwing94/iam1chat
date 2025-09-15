# silverchat

silverchat은 AI 챗봇 웹사이트입니다. 프론트엔드는 React, 백엔드는 Express와 OpenAI API를 사용합니다.

## 개발내역
### 1차 개발내역과 관련 파일 참고
1. 문의내역 히스토리 관리 [ChatManagement.jsx]
2. 질문에 대한 신뢰도 계산 [confidence.js] =>>>> 신뢰도 계산로직 보완필요합니다 ㅠㅠ
4. 신뢰도 60% 이하인 답변들에 대해서 Teams 채널 알림 [teams-notification.js]
5. 신뢰도 낮은 답변들에 대해서 재학습 할 수 있는 기능 [database.js]
6. 카테고리 분석 및 Teams 멘션 기능 추가 [category-analyzer.js]
  ; 질문에 대한 카테고리를 분석하고, 담당자를 분류해주는 기능을 추가했습니다.
7. 에러 이미지를 첨부하여 학습된 에러 원인/가이드를 주는 기능 추가했습니다.(screen_analysis.js)
  ; 기존 적재된 guide 와 질문 유사도를 분석하여 70% 이상의 유사도일 경우 guide 에서 답변 제공
  ; 70% 미만일 경우 chatGPT 로 답변 제공
   => 문의내역에 히스토리를 같이 적재할지,
   => chatGPT 로 답변한 내용을 검토하는 화면을 AI chat 관리로 합쳐야할지 의논해봐야될거같슴다

## 폴더 구조

- frontend: React 기반 챗봇 웹 UI
- backend: Express 기반 API 서버(OpenAI 연동)
  - files: screenAnalysis 에 사용하는 데이터
           (manuals 에 추가하니 학습 대상으로 포함되어 디렉토리 분리하였습니다.)

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



