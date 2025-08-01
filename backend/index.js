require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeKnowledgeBase, getAnswer } = require('./knowledge.js');

const app = express();
app.use(cors());
app.use(express.json());

// 서버 시작 시 문서 학습 초기화
initializeKnowledgeBase();

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: '메시지를 입력해주세요.' });
  }
  try {
    const answer = await getAnswer(message);
    res.json({ reply: answer });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`silverchat 백엔드 서버가 ${PORT}번 포트에서 실행 중입니다.`);
}); 