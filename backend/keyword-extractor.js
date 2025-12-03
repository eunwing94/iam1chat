/**
 * 질문과 답변에서 키워드를 추출하는 함수
 * #000 형식의 키워드 ID를 생성
 */

// keyword-extractor-korean 패키지 사용
const keywordExtractor = require('keyword-extractor-korean');
const extractor = keywordExtractor();

// ERP 관련 주요 키워드 사전
const ERP_KEYWORDS = [
  // Invoice 관련
  'invoice', '송장', 'invoice number', 'invoice reg', 'commercial invoice', 'payment invoice',
  // Journal 관련
  'journal', '분개', 'settlement', '정산', 'journal entry',
  // PO 관련
  'po', 'purchase order', '발주', 'fpo', 'spo', 'running po',
  // Shipment 관련
  'shipment', '출하', 'shipping', 'bl', 'b/l', 'export shipping', 'import shipping',
  // DN 관련
  'dn', 'debit note', '차변', 'debit',
  // Export/Import 관련
  'export', '수출', 'import', '수입', 'export sales', 'export purchase',
  // Settlement 관련
  'settlement', '정산', 'export sales settlement', 'export purchase settlement',
  // 기타
  'approval', '승인', 'req approval', 'cancel approval', 'factory', '공장', 'vendor', 'customer',
  'business partner', '거래처', 'style code', 'style no', 'main code', 'dev code', 'st code',
  'licensee', 'sourcing', '소싱', 'plm', 'gerp', 'erp', 'ddp', 'ci', 'pi'
];

// 불용어 목록 (영어)
const STOP_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'please', 'kindly', 'thank', 'thanks', 'sorry', 'hi', 'hello', 'good', 'morning', 'afternoon',
  'tell', 'show', 'explain', 'help', 'need', 'want', 'know', 'see', 'get', 'make', 'give'
];

// 한글 불용어 목록
const KOREAN_STOP_WORDS = [
  '알려줘', '알려주세요', '알려주', '알려', '알려드리', '알려주시', '알려주면',
  '에', '의', '을', '를', '이', '가', '은', '는', '와', '과', '도', '만', '부터', '까지',
  '에서', '에게', '한테', '께', '로', '으로', '처럼', '같이', '만큼', '보다',
  '대해', '대한', '대해서', '대하여', '대해선',
  '상품의', '가격을', '가격이', '가격에', '가격으로', '가격으로는',
  '프로세스에', '프로세스를', '프로세스가', '프로세스는', '프로세스의',
  '단가관리는', '단가관리를', '단가관리가', '단가관리는', '단가관리의',
  '이것', '그것', '저것', '이런', '그런', '저런', '이렇게', '그렇게', '저렇게',
  '있어', '있습니다', '있어요', '있나', '있어서', '있으면', '있는데',
  '없어', '없습니다', '없어요', '없나', '없어서', '없으면', '없는데',
  '해줘', '해주세요', '해주', '해', '하세요', '하시', '하면', '하는', '한', '할',
  '해요', '했어', '했습니다', '했어요', '하나', '하니', '하니까',
  '보여줘', '보여주세요', '보여주', '보여', '보이', '보면', '보니', '보니까',
  '말해줘', '말해주세요', '말해주', '말해', '말하', '말하면', '말하는',
  '설명해줘', '설명해주세요', '설명해주', '설명해', '설명하', '설명하면',
  '가', '이', '을', '를', '에', '의', '와', '과', '도', '만', '부터', '까지',
  '에서', '에게', '한테', '께', '로', '으로', '처럼', '같이', '만큼', '보다',
  '그리고', '또한', '또', '그래서', '그러면', '그런데', '하지만', '그런',
  '이것', '그것', '저것', '이런', '그런', '저런', '이렇게', '그렇게', '저렇게'
];

/**
 * 텍스트에서 키워드를 추출 (핵심 키워드만)
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const keywordScores = new Map(); // 키워드와 점수를 저장
  const lowerText = text.toLowerCase();

  // 1. ERP 주요 키워드 매칭 (높은 우선순위)
  ERP_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      const score = matches.length * 10; // ERP 키워드는 높은 점수
      keywordScores.set(keyword.toLowerCase(), score);
    }
  });

  // 2. 한글 핵심 키워드 추출 (keyword-extractor-korean 패키지 사용)
  try {
    const koreanKeywords = extractor(text);
    if (koreanKeywords && typeof koreanKeywords === 'object') {
      Object.keys(koreanKeywords).forEach(word => {
        // 숫자가 포함된 단어는 제외
        if (/\d/.test(word)) {
          return;
        }
        
        // 불용어 제외
        if (KOREAN_STOP_WORDS.includes(word)) {
          return;
        }
        
        // 2글자 이상인 키워드만 처리
        if (word.length >= 2) {
          // ERP 관련 키워드인지 확인
          const isERPKeyword = ERP_KEYWORDS.some(kw => 
            kw.includes(word) || word.includes(kw)
          );
          
          if (isERPKeyword || word.match(/(단가|관리|프로세스|송장|분개|정산|발주|출하|수출|수입|승인|공장|거래처|소싱|가격|금액|수량|일자|상태|생성|삭제|수정|변경|취소|요청|전송|수신|확인|등록|저장|출력|결제|차변|대변|계정|템플릿|문서|파일|이메일|포털|시스템|플랫폼|화면|버튼|필드|컬럼|행|목록|테이블|데이터|정보|오류|문제|해결|배포|테스트|서버|데이터베이스|요청서|티켓|거래|의류|신발|홀딩스|인터코|인터컴퍼니)$/)) {
            const frequency = koreanKeywords[word] || 1;
            const currentScore = keywordScores.get(word) || 0;
            // 빈도수에 따라 점수 부여 (빈도수가 높을수록 높은 점수)
            keywordScores.set(word, currentScore + (frequency * 5));
          }
        }
      });
    }
  } catch (error) {
    console.warn('한글 키워드 추출 실패:', error);
    // 패키지 추출 실패 시 기존 로직으로 폴백
    const koreanWords = text.match(/[가-힣]{2,}/g) || [];
    koreanWords.forEach(word => {
      if (/\d/.test(word) || KOREAN_STOP_WORDS.includes(word)) {
        return;
      }
      
      const cleanWord = word.replace(/(은|는|이|가|을|를|의|에|에서|에게|한테|께|로|으로|와|과|도|만|부터|까지|처럼|같이|만큼|보다|대해|대한|대해서|대하여|대해선)$/, '');
      
      if (cleanWord.length >= 2 && !KOREAN_STOP_WORDS.includes(cleanWord)) {
        const isERPKeyword = ERP_KEYWORDS.some(kw => 
          kw.includes(cleanWord) || cleanWord.includes(kw)
        );
        
        if (isERPKeyword || cleanWord.match(/(단가|관리|프로세스|송장|분개|정산|발주|출하|수출|수입|승인|공장|거래처|소싱|가격|금액|수량|일자|상태|생성|삭제|수정|변경|취소|요청|전송|수신|확인|등록|저장|출력|결제|차변|대변|계정|템플릿|문서|파일|이메일|포털|시스템|플랫폼|화면|버튼|필드|컬럼|행|목록|테이블|데이터|정보|오류|문제|해결|배포|테스트|서버|데이터베이스|요청서|티켓|거래|의류|신발|홀딩스|인터코|인터컴퍼니)$/)) {
          const currentScore = keywordScores.get(cleanWord) || 0;
          keywordScores.set(cleanWord, currentScore + 5);
        }
      }
    });
  }

  // 3. 영어 핵심 키워드 추출 (3글자 이상, 불용어 제외, 숫자 제외)
  const englishWords = lowerText.match(/\b[a-z]{3,}\b/g) || [];
  englishWords.forEach(word => {
    // 숫자가 포함된 단어는 제외
    if (/\d/.test(word)) {
      return;
    }
    
    // 불용어 제외
    if (STOP_WORDS.includes(word)) {
      return;
    }
    
    // ERP 키워드가 아니고, ERP 관련 의미있는 단어만 추가
    if (!ERP_KEYWORDS.some(kw => kw.toLowerCase().includes(word) || word.includes(kw.toLowerCase()))) {
      const erpRelatedPatterns = [
        /(invoice|journal|order|shipment|settlement|approval|code|number|price|amount|quantity|date|status|create|delete|update|modify|change|cancel|request|send|receive|check|verify|confirm|register|load|save|print|export|import|purchase|sales|factory|vendor|customer|partner|style|licensee|sourcing|payment|debit|credit|account|template|document|file|email|portal|system|platform|screen|button|field|column|row|list|table|data|information|error|issue|problem|fix|resolve|deploy|test|qa|production|stg|dev|server|database|db|itsm|request|ticket|sr|dn|ci|pi|bl|b\/l|eta|etd|atd|ata|fob|cif|ddp|po|fpo|spo|gr|plm|gerp|erp|misto|fila|korea|malaysia|mapp|mfw|mmal|trading|apparel|footwear|holdings|interco|intercompany)$/i
      ];
      
      if (erpRelatedPatterns.some(pattern => pattern.test(word))) {
        const currentScore = keywordScores.get(word) || 0;
        keywordScores.set(word, currentScore + 3);
      }
    }
  });

  // 점수 순으로 정렬하고 상위 3개만 반환
  const sortedKeywords = Array.from(keywordScores.entries())
    .sort((a, b) => b[1] - a[1]) // 점수 내림차순 정렬
    .slice(0, 3) // 상위 3개만
    .map(([keyword]) => keyword); // 키워드만 추출

  return sortedKeywords;
}

/**
 * 키워드를 #키워드 형식으로 변환
 */
function getKeywordTag(keyword) {
  // 키워드를 소문자로 변환하고 공백을 언더스코어로 변경
  const tag = keyword.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_가-힣]/g, '');
  return `#${tag}`;
}

/**
 * 질문과 답변에서 키워드를 추출하고 포맷팅
 */
function extractAndFormatKeywords(question, answer) {
  const questionKeywords = extractKeywords(question);
  const answerKeywords = extractKeywords(answer);
  
  // 중복 제거
  const allKeywords = [...new Set([...questionKeywords, ...answerKeywords])];
  
  // 키워드를 태그와 함께 매핑
  const keywordMap = {};
  allKeywords.forEach(keyword => {
    keywordMap[keyword] = getKeywordTag(keyword);
  });
  
  return {
    keywords: allKeywords.slice(0, 3), // 핵심 키워드 3개만
    keywordMap: keywordMap
  };
}

/**
 * 키워드를 #키워드 형식의 태그로 변환
 */
function formatKeywordsAsTags(keywords, keywordMap) {
  return keywords.map(keyword => ({
    keyword: keyword,
    tag: keywordMap[keyword] || getKeywordTag(keyword)
  }));
}

module.exports = {
  extractKeywords,
  getKeywordTag,
  extractAndFormatKeywords,
  formatKeywordsAsTags
};

