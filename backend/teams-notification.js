const axios = require('axios');
const { analyzeQuestionAndGetAssignee } = require('./category-analyzer.js');

// Teams 웹훅 URL
const TEAMS_WEBHOOK_URL = 'https://cjworld.webhook.office.com/webhookb2/c72d7f0c-1ac2-4357-b895-1c43ab980d11@ee6af5c5-684f-4539-9eb6-64793af08027/IncomingWebhook/d176c2c4b8f742df86154a2cea0a06fc/5288bc35-2d21-4ca3-8965-fdf835a35efd/V248ms2JrtHdItpZIi2KmwZ0qqrxt0Qf6RAZz7-XXt9H01';

/**
 * 신뢰도가 낮은 답변에 대해 Teams로 알림을 보냅니다
 * @param {string} question - 사용자 질문
 * @param {string} answer - AI 답변
 * @param {number} confidence - 신뢰도 점수
 * @param {string} confidenceLevel - 신뢰도 레벨
 * @param {Array} sources - 참조 문서 목록
 */
async function sendLowConfidenceNotification(question, answer, confidence, confidenceLevel, sources) {
  try {
    const currentTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 질문 카테고리 분석 및 담당자 정보 조회
    const analysis = analyzeQuestionAndGetAssignee(question);
    console.log(`📊 카테고리 분석 결과: ${analysis.category} (신뢰도: ${analysis.confidence}%)`);
    console.log(`👤 담당자: ${analysis.assignee.displayName}`);

    // 신뢰도에 따른 색상 설정
    const getColor = (confidence) => {
      if (confidence >= 40) return 'FFA500'; // 주황색
      if (confidence >= 20) return 'FF6B6B'; // 빨간색
      return 'DC143C'; // 진한 빨간색
    };

    // Teams 메시지 페이로드
    const payload = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      "themeColor": getColor(confidence),
      "summary": `Mr.FILA 신뢰도 알림 - ${confidenceLevel}`,
      "sections": [
        {
          "activityTitle": "🚨 낮은 신뢰도 답변 감지",
          "activitySubtitle": `신뢰도: ${confidence}% (${confidenceLevel})`,
          "activityImage": "https://img.icons8.com/color/48/000000/warning-shield.png",
          "facts": [
            {
              "name": "질문 시간",
              "value": currentTime
            },
            {
              "name": "신뢰도 점수",
              "value": `${confidence}%`
            },
            {
              "name": "신뢰도 레벨",
              "value": confidenceLevel
            },
            {
              "name": "분석된 카테고리",
              "value": `${analysis.category} (${analysis.confidence}%)`
            },
            {
              "name": "담당자",
              "value": analysis.assignee.displayName
            },
            {
              "name": "참조 문서 수",
              "value": sources.length > 0 ? `${sources.length}개` : "없음"
            }
          ],
          "markdown": true
        },
        {
          "title": "👤 담당자 멘션",
          "text": `**${analysis.assignee.displayName}** 님, ${analysis.category} 관련 문의입니다.`
        },
        {
          "title": "📊 카테고리 분석",
          "text": `**카테고리**: ${analysis.category}\n**분석 신뢰도**: ${analysis.confidence}%\n**매칭 키워드**: ${analysis.keywords.join(', ')}`
        },
        {
          "title": "📝 사용자 질문",
          "text": `**${question}**`
        },
        {
          "title": "🤖 AI 답변",
          "text": answer.length > 500 ? `${answer.substring(0, 500)}...` : answer
        }
      ]
    };

    // 참조 문서가 있는 경우 추가 섹션
    if (sources.length > 0) {
      payload.sections.push({
        "title": "📚 참조 문서",
        "text": sources.map((source, index) => 
          `${index + 1}. ${source.source}`
        ).join('\n')
      });
    }

    // Teams 웹훅으로 메시지 전송
    const response = await axios.post(TEAMS_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10초 타임아웃
    });

    if (response.status === 200) {
      console.log(`✅ Teams 알림 전송 성공 - 신뢰도: ${confidence}%`);
      return true;
    } else {
      console.error(`❌ Teams 알림 전송 실패 - 상태코드: ${response.status}`);
      return false;
    }

  } catch (error) {
    console.error('🚨 Teams 알림 전송 중 오류 발생:', error.message);
    return false;
  }
}

/**
 * 신뢰도가 60% 이하인지 확인
 * @param {number} confidence - 신뢰도 점수
 * @returns {boolean} - 60% 이하이면 true
 */
function isLowConfidence(confidence) {
  return confidence <= 60;
}

module.exports = {
  sendLowConfidenceNotification,
  isLowConfidence
};
