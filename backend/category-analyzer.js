// 카테고리 분석 및 담당자 매핑 시스템

// 카테고리별 키워드 정의
const CATEGORY_KEYWORDS = {
  '재고관리': [
    '재고', '재고관리', '재고이동', '재고조회', '재고수량', '재고조정', 
    '입고', '출고', '재고실사', '재고조사', '재고현황', '재고보고서',
    '창고', '물류', '배송', '택배', '물류센터'
  ],
  '회계': [
    '회계', '회계단위', '회계처리', '회계보고', '회계장부', '회계시스템',
    '전표', '분개', '결산', '예산', '비용', '수익', '손익', '재무',
    '세금', '부가세', '소득세', '법인세', '회계감사'
  ],
  '영업': [
    '영업', '영업관리', '영업보고', '영업실적', '영업계획', '영업팀',
    '매출', '매출관리', '매출보고', '매출실적', '매출계획', '매출분석',
    '고객', '고객관리', '고객정보', '고객서비스', '고객만족', '고객분석'
  ],
  '인사': [
    '인사', '인사관리', '인사정보', '인사시스템', '인사보고', '인사실적',
    '직원', '직원관리', '직원정보', '직원등록', '직원조회', '직원현황',
    '급여', '급여관리', '급여계산', '급여지급', '급여조회', '급여보고',
    '근태', '근태관리', '출근', '퇴근', '휴가', '연차', '병가'
  ],
  '구매': [
    '구매', '구매관리', '구매요청', '구매승인', '구매처리', '구매보고',
    '발주', '발주관리', '발주처리', '발주승인', '발주조회', '발주현황',
    '공급업체', '업체관리', '업체정보', '업체등록', '업체조회', '업체현황',
    '계약', '계약관리', '계약처리', '계약승인', '계약조회', '계약현황'
  ],
  '시스템': [
    '시스템', '시스템관리', '시스템설정', '시스템오류', '시스템장애',
    '로그인', '로그아웃', '사용자', '사용자관리', '권한', '권한관리',
    '백업', '복원', '데이터', '데이터관리', '데이터베이스', 'DB'
  ]
};

// 카테고리별 담당자 매핑
const CATEGORY_ASSIGNEES = {
  '재고관리': '왕한별/whb0429@cj.net',
  '회계': '왕한별/whb0429@cj.net',
  '영업': '왕한별/whb0429@cj.net',
  '인사': '왕한별/whb0429@cj.net',
  '구매': '왕한별/whb0429@cj.net',
  '시스템': '왕한별/whb0429@cj.net',
  '기타': '왕한별/whb0429@cj.net'
};

/**
 * 질문에서 카테고리를 자동으로 분석
 * @param {string} question - 사용자 질문
 * @returns {Object} - { category: string, confidence: number, keywords: string[] }
 */
function analyzeCategory(question) {
  if (!question || typeof question !== 'string') {
    return { category: '기타', confidence: 0, keywords: [] };
  }

  const questionLower = question.toLowerCase();
  const categoryScores = {};
  const matchedKeywords = {};

  // 각 카테고리별로 키워드 매칭 점수 계산
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    const foundKeywords = [];

    for (const keyword of keywords) {
      if (questionLower.includes(keyword.toLowerCase())) {
        score += 1;
        foundKeywords.push(keyword);
      }
    }

    if (score > 0) {
      categoryScores[category] = score;
      matchedKeywords[category] = foundKeywords;
    }
  }

  // 가장 높은 점수의 카테고리 선택
  let bestCategory = '기타';
  let bestScore = 0;
  let bestKeywords = [];

  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
      bestKeywords = matchedKeywords[category] || [];
    }
  }

  // 신뢰도 계산 (매칭된 키워드 수 / 전체 키워드 수)
  const totalKeywords = CATEGORY_KEYWORDS[bestCategory]?.length || 1;
  const confidence = Math.min((bestScore / totalKeywords) * 100, 100);

  return {
    category: bestCategory,
    confidence: Math.round(confidence),
    keywords: bestKeywords
  };
}

/**
 * 카테고리에 해당하는 담당자 정보 조회
 * @param {string} category - 카테고리명
 * @returns {Object} - { name: string, email: string, displayName: string }
 */
function getAssigneeByCategory(category) {
  const assigneeInfo = CATEGORY_ASSIGNEES[category] || CATEGORY_ASSIGNEES['기타'];
  const [name, email] = assigneeInfo.split('/');
  
  return {
    name: name,
    email: email,
    displayName: assigneeInfo,
    category: category
  };
}

/**
 * 질문 분석 및 담당자 정보 반환
 * @param {string} question - 사용자 질문
 * @returns {Object} - { category, confidence, keywords, assignee }
 */
function analyzeQuestionAndGetAssignee(question) {
  const analysis = analyzeCategory(question);
  const assignee = getAssigneeByCategory(analysis.category);
  
  return {
    ...analysis,
    assignee: assignee
  };
}

module.exports = {
  analyzeCategory,
  getAssigneeByCategory,
  analyzeQuestionAndGetAssignee,
  CATEGORY_KEYWORDS,
  CATEGORY_ASSIGNEES
};
