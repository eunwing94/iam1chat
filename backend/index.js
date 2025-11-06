require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeKnowledgeBase, getAnswer } = require('./knowledge.js');
const { sendLowConfidenceNotification, isLowConfidence } = require('./teams-notification.js');
const { setupOCRRoutes } = require('./screen_analysis.js');
const database = require('./database.js');

const app = express();

// CORS 설정 - 프로덕션 환경에서 프론트엔드 URL 허용
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// 서버 시작 시 초기화
async function initializeServer() {
  try {
    // 데이터베이스 초기화
    await database.initialize();
    
    // 문서 학습 초기화
    initializeKnowledgeBase();
    
    // OCR 라우트 설정
    setupOCRRoutes(app);
    
    console.log('🚀 서버 초기화 완료');
  } catch (error) {
    console.error('❌ 서버 초기화 실패:', error);
    process.exit(1);
  }
}

// 서버 초기화 실행
initializeServer();

app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;
  if (!message) {
    return res.status(400).json({ error: '메시지를 입력해주세요.' });
  }
  try {
    const result = await getAnswer(message);
    const confidenceLevel = getConfidenceLevel(result.confidence);
    
    // 데이터베이스에 채팅 기록 저장
    let chatId = null;
    try {
      chatId = await database.saveChatHistory(
        sessionId,
        message,
        result.answer,
        result.confidence,
        confidenceLevel,
        result.sources
      );
    } catch (dbError) {
      console.error('❌ 채팅 기록 저장 실패:', dbError);
      // 데이터베이스 오류가 있어도 응답은 계속 진행
    }
    
    // 신뢰도가 60% 이하인 경우 Teams 알림 전송
    if (isLowConfidence(result.confidence)) {
      console.log(`🚨 낮은 신뢰도 감지: ${result.confidence}% - Teams 알림 전송 중...`);
      
      // 비동기로 Teams 알림 전송 (응답 지연 방지)
      sendLowConfidenceNotification(
        message,
        result.answer,
        result.confidence,
        confidenceLevel,
        result.sources
      ).then(async (success) => {
        // Teams 알림 전송 결과를 데이터베이스에 기록
        if (chatId) {
          try {
            await database.saveLowConfidenceAlert(chatId, success);
          } catch (dbError) {
            console.error('❌ 낮은 신뢰도 알림 기록 저장 실패:', dbError);
          }
        }
      }).catch(error => {
        console.error('Teams 알림 전송 실패:', error);
        // 알림 전송 실패도 데이터베이스에 기록
        if (chatId) {
          database.saveLowConfidenceAlert(chatId, false).catch(dbError => {
            console.error('❌ 낮은 신뢰도 알림 기록 저장 실패:', dbError);
          });
        }
      });
    }
    
    res.json({ 
      reply: result.answer,
      confidence: result.confidence,
      sources: result.sources,
      confidenceLevel: confidenceLevel,
      chatId: chatId
    });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
  }
});

// 채팅 기록 조회 API
app.get('/api/chat/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const chatHistory = await database.getRecentChatHistory(limit);
    
    res.json({
      success: true,
      data: chatHistory,
      count: chatHistory.length
    });
  } catch (error) {
    console.error('❌ 채팅 기록 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '채팅 기록 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 낮은 신뢰도 통계 API
app.get('/api/stats/low-confidence', async (req, res) => {
  try {
    const stats = await database.getLowConfidenceStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ 낮은 신뢰도 통계 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '통계 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 답변 학습 API
app.post('/api/chat/learn-answer', async (req, res) => {
  const { chatId, correctAnswer } = req.body;
  
  if (!chatId || !correctAnswer) {
    return res.status(400).json({ 
      success: false,
      error: 'Chat ID와 정확한 답변이 필요합니다.' 
    });
  }

  try {
    await database.saveLearnedAnswer(chatId, correctAnswer);
    
    res.json({
      success: true,
      message: '답변이 학습 데이터로 저장되었습니다.',
      chatId: chatId
    });
  } catch (error) {
    console.error('❌ 답변 학습 저장 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '답변 학습 저장 중 오류가 발생했습니다.' 
    });
  }
});

// 학습된 답변 조회 API
app.get('/api/chat/learned-answers/:chatId', async (req, res) => {
  const { chatId } = req.params;
  
  if (!chatId) {
    return res.status(400).json({ 
      success: false,
      error: 'Chat ID가 필요합니다.' 
    });
  }

  try {
    const learnedAnswers = await database.getLearnedAnswers(chatId);
    
    res.json({
      success: true,
      data: learnedAnswers
    });
  } catch (error) {
    console.error('❌ 학습된 답변 조회 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '학습된 답변 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 학습된 답변 수정 API
app.put('/api/chat/learned-answers/:learnedAnswerId', async (req, res) => {
  const { learnedAnswerId } = req.params;
  const { newAnswer } = req.body;
  
  if (!learnedAnswerId || !newAnswer) {
    return res.status(400).json({ 
      success: false,
      error: '학습된 답변 ID와 새로운 답변이 필요합니다.' 
    });
  }

  try {
    await database.updateLearnedAnswer(learnedAnswerId, newAnswer);
    
    res.json({
      success: true,
      message: '학습된 답변이 수정되었습니다.'
    });
  } catch (error) {
    console.error('❌ 학습된 답변 수정 실패:', error);
    res.status(500).json({ 
      success: false,
      error: '학습된 답변 수정 중 오류가 발생했습니다.' 
    });
  }
});

// AI 화면 분석 API
app.get('/api/screen-analysis', async (req, res) => {
  try {
    // 임시 더미 데이터 (실제로는 화면 분석 결과를 반환)
    const analysisData = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        screenType: 'ERP 메인 화면',
        result: '정상 로그인 상태',
        confidence: 95,
        details: '사용자가 ERP 시스템에 정상적으로 로그인되어 있으며, 메인 대시보드가 표시되고 있습니다.',
        screenshot: {
          url: '/api/placeholder/screenshot1',
          description: 'ERP 메인 화면 스크린샷'
        }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        screenType: '재고 관리 화면',
        result: '재고 부족 경고',
        confidence: 88,
        details: '일부 상품의 재고가 안전 재고 수준 이하로 떨어져 경고 표시가 나타나고 있습니다.',
        screenshot: {
          url: '/api/placeholder/screenshot2',
          description: '재고 관리 화면 스크린샷'
        }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        screenType: '회계 화면',
        result: '월말 마감 진행 중',
        confidence: 92,
        details: '월말 회계 마감 작업이 진행 중이며, 모든 거래가 정상적으로 처리되고 있습니다.',
        screenshot: {
          url: '/api/placeholder/screenshot3',
          description: '회계 화면 스크린샷'
        }
      }
    ];

    res.json({
      success: true,
      analysis: analysisData,
      totalCount: analysisData.length
    });
  } catch (error) {
    console.error('화면 분석 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '화면 분석 데이터를 불러오는데 실패했습니다.'
    });
  }
});

// 신뢰도 레벨 분류 함수
function getConfidenceLevel(confidence) {
  if (confidence >= 80) return '매우 높음';
  if (confidence >= 60) return '높음';
  if (confidence >= 40) return '보통';
  if (confidence >= 20) return '낮음';
  return '매우 낮음';
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`silverchat 백엔드 서버가 ${PORT}번 포트에서 실행 중입니다.`);
}); 