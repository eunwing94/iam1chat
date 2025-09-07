const fs = require('fs');
const path = require('path');

// 신뢰도 계산 함수
function calculateConfidence(response, question) {
  let confidence = 0;
  
  // 1. 최우선: RAG에 학습된 데이터인지 확인 (핵심 로직)
  const isLearnedData = checkIfLearnedData(response, question);
  if (isLearnedData.isLearned) {
    // 학습된 데이터면 높은 신뢰도 보장
    if (isLearnedData.confidence >= 90) {
      return 95; // 매우 높은 신뢰도
    } else if (isLearnedData.confidence >= 80) {
      return 85; // 높은 신뢰도
    } else if (isLearnedData.confidence >= 70) {
      return 75; // 중간 높은 신뢰도
    } else if (isLearnedData.confidence >= 60) {
      return 70; // 기본 학습된 데이터 신뢰도
    } else {
      return 65; // 최소 학습된 데이터 신뢰도
    }
  }
  
  // 2. "모르겠다" 답변인지 확인 (핵심 로직)
  const uncertainPhrases = [
    "모르겠", "확실하지", "알 수 없", "정보가 없", "찾을 수 없", 
    "죄송하지만", "제공되지 않았습니다", "별도의 매뉴얼", "추가적인 도움이 필요",
    "구체적인 정보는", "참조하시기 바랍니다", "다른 질문을 해주세요"
  ];
  
  const hasUncertainty = uncertainPhrases.some(phrase => 
    response.answer.toLowerCase().includes(phrase.toLowerCase())
  );
  
  // 2.5. RAG context가 있고 정확한 답변이 나온 경우 높은 신뢰도 부여
  if (response.context && response.context.length > 0 && !hasUncertainty) {
    // context가 있고 불확실하지 않은 답변이면 최소 80% 신뢰도
    const contextMatchScore = calculateContextMatch(question, response);
    if (contextMatchScore >= 60) {
      return Math.max(80, contextMatchScore); // 최소 80% 보장
    }
  }
  
  // 3. 질문과 매뉴얼/QnA 맥락 일치도 평가
  const contextMatchScore = calculateContextMatch(question, response);
  if (contextMatchScore >= 80) {
    // 높은 맥락 일치도면 기본 70점 이상 보장
    confidence = Math.max(confidence, 70);
  } else if (contextMatchScore >= 60) {
    // 중간 맥락 일치도면 기본 50점 이상 보장
    confidence = Math.max(confidence, 50);
  } else if (contextMatchScore >= 40) {
    // 낮은 맥락 일치도면 기본 30점 이상 보장
    confidence = Math.max(confidence, 30);
  }
  
  // "모르겠다" 답변이면 낮은 신뢰도 반환 (맥락 일치도가 높아도 불확실하면 낮은 점수)
  if (hasUncertainty) {
    // 검색된 문서가 있지만 답변하지 못한 경우
    if (response.context && response.context.length > 0) {
      return Math.min(15, contextMatchScore * 0.2); // 맥락 일치도 고려하되 최대 15점
    }
    return Math.min(5, contextMatchScore * 0.1); // 맥락 일치도 고려하되 최대 5점
  }
  
  // 4. 맥락 일치도에 따른 추가 점수 (0-30점)
  if (contextMatchScore >= 80) {
    confidence += 30; // 높은 맥락 일치도
  } else if (contextMatchScore >= 60) {
    confidence += 20; // 중간 맥락 일치도
  } else if (contextMatchScore >= 40) {
    confidence += 10; // 낮은 맥락 일치도
  }
  
  // 5. 검색된 문서 수에 따른 보너스 점수 (0-20점)
  if (response.context && response.context.length > 0) {
    const docCount = response.context.length;
    confidence += Math.min(docCount * 5, 20); // 최대 20점
  } else {
    // 문서가 없으면 맥락 일치도가 높아도 최대 30점으로 제한
    confidence = Math.min(confidence, 30);
  }
  
  // 최대 100점으로 제한
  return Math.min(confidence, 100);
}

// RAG에 학습된 데이터인지 확인하는 함수
function checkIfLearnedData(response, question) {
  try {
    const manualsPath = path.join(__dirname, 'manuals');
    if (!fs.existsSync(manualsPath)) {
      return { isLearned: false, confidence: 0 };
    }
    
    let bestMatch = { isLearned: false, confidence: 0 };
    
    // 1. qna.txt 파일에서 학습된 Q&A 확인
    const qnaMatch = checkQnaFile(question, response);
    if (qnaMatch.confidence > bestMatch.confidence) {
      bestMatch = qnaMatch;
    }
    
    // 2. manuals 폴더의 모든 파일에서 매뉴얼 내용 확인
    const manualMatch = checkManualFiles(question, response, manualsPath);
    if (manualMatch.confidence > bestMatch.confidence) {
      bestMatch = manualMatch;
    }
    
    // 3. response.context에서 직접 매뉴얼 내용 확인 (PDF 등)
    const contextMatch = checkResponseContext(question, response);
    if (contextMatch.confidence > bestMatch.confidence) {
      bestMatch = contextMatch;
    }
    
    return bestMatch;
  } catch (error) {
    console.error('학습된 데이터 확인 중 오류:', error);
    return { isLearned: false, confidence: 0 };
  }
}

// qna.txt 파일에서 학습된 Q&A 확인
function checkQnaFile(question, response) {
  try {
    const qnaPath = path.join(__dirname, 'manuals', 'qna.txt');
    if (!fs.existsSync(qnaPath)) {
      return { isLearned: false, confidence: 0 };
    }
    
    const qnaContent = fs.readFileSync(qnaPath, 'utf8');
    const qnaEntries = qnaContent.split('## Q').filter(entry => entry.trim().length > 0);
    
    let bestMatch = { isLearned: false, confidence: 0 };
    
    qnaEntries.forEach(entry => {
      if (entry.trim().length === 0) return;
      
      const lines = entry.split('\n').filter(line => line.trim().length > 0);
      if (lines.length < 2) return;
      
      // Q: 질문 추출
      const questionLine = lines[0].trim();
      const learnedQuestion = questionLine.replace(/^Q\d*:\s*/, '').trim();
      
      // A: 답변 추출
      const answerLine = lines.find(line => line.trim().startsWith('A:'));
      if (!answerLine) return;
      const learnedAnswer = answerLine.replace(/^A:\s*/, '').trim();
      
      // 질문 유사도 계산
      const questionSimilarity = calculateTextSimilarity(question, learnedQuestion);
      
      // 답변 유사도 계산
      const answerSimilarity = calculateTextSimilarity(response.answer, learnedAnswer);
      
      // 종합 점수 계산 (질문 유사도 70%, 답변 유사도 30%)
      const totalScore = (questionSimilarity * 0.7) + (answerSimilarity * 0.3);
      
      if (totalScore > bestMatch.confidence) {
        bestMatch = {
          isLearned: totalScore >= 60, // 60% 이상이면 학습된 데이터로 판단
          confidence: totalScore,
          learnedQuestion: learnedQuestion,
          learnedAnswer: learnedAnswer,
          source: 'qna.txt'
        };
      }
    });
    
    return bestMatch;
  } catch (error) {
    console.error('QnA 파일 확인 중 오류:', error);
    return { isLearned: false, confidence: 0 };
  }
}

// response.context에서 직접 매뉴얼 내용 확인 (PDF 등)
function checkResponseContext(question, response) {
  try {
    if (!response.context || response.context.length === 0) {
      return { isLearned: false, confidence: 0 };
    }
    
    let bestMatch = { isLearned: false, confidence: 0 };
    
    response.context.forEach(doc => {
      if (doc.pageContent && doc.pageContent.trim().length > 0) {
        // PDF/문서 내용과 질문/답변의 유사도 계산
        const questionSimilarity = calculateTextSimilarity(question, doc.pageContent);
        const answerSimilarity = calculateTextSimilarity(response.answer, doc.pageContent);
        
        // 종합 점수 계산 (질문 유사도 50%, 답변 유사도 50%)
        const totalScore = (questionSimilarity * 0.5) + (answerSimilarity * 0.5);
        
        // PDF 내용이 있고 답변이 정확하면 높은 점수 부여
        if (totalScore > bestMatch.confidence) {
          bestMatch = {
            isLearned: totalScore >= 40, // 40% 이상이면 학습된 데이터로 판단 (PDF는 더 관대하게)
            confidence: totalScore,
            source: doc.metadata?.source || 'unknown',
            content: doc.pageContent.substring(0, 200) + '...'
          };
        }
      }
    });
    
    return bestMatch;
  } catch (error) {
    console.error('Response context 확인 중 오류:', error);
    return { isLearned: false, confidence: 0 };
  }
}

// manuals 폴더의 모든 파일에서 매뉴얼 내용 확인
function checkManualFiles(question, response, manualsPath) {
  try {
    const files = fs.readdirSync(manualsPath);
    let bestMatch = { isLearned: false, confidence: 0 };
    
    // 1. 텍스트 파일들 처리
    files.forEach(file => {
      // qna.txt는 이미 별도로 처리했으므로 제외
      if (file === 'qna.txt') return;
      
      const filePath = path.join(manualsPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        let content = '';
        
        try {
          // 텍스트 파일 읽기
          if (file.endsWith('.txt')) {
            content = fs.readFileSync(filePath, 'utf8');
          }
        } catch (fileError) {
          console.error(`파일 읽기 오류 (${file}):`, fileError);
          return;
        }
        
        if (content.trim().length > 0) {
          // 매뉴얼 내용과 질문/답변의 유사도 계산
          const questionSimilarity = calculateTextSimilarity(question, content);
          const answerSimilarity = calculateTextSimilarity(response.answer, content);
          
          // 종합 점수 계산 (질문 유사도 60%, 답변 유사도 40%)
          const totalScore = (questionSimilarity * 0.6) + (answerSimilarity * 0.4);
          
          if (totalScore > bestMatch.confidence) {
            bestMatch = {
              isLearned: totalScore >= 50, // 50% 이상이면 매뉴얼 기반 데이터로 판단
              confidence: totalScore,
              source: file,
              content: content.substring(0, 200) + '...' // 내용 미리보기
            };
          }
        }
      }
    });
    
    // 2. PDF 파일들 처리 (response.context에서)
    if (response.context && response.context.length > 0) {
      response.context.forEach(doc => {
        if (doc.metadata && doc.metadata.source) {
          const sourceFile = path.basename(doc.metadata.source);
          
          // PDF 파일인지 확인
          if (sourceFile.endsWith('.pdf')) {
            const docContent = doc.pageContent || '';
            
            if (docContent.trim().length > 0) {
              // PDF 내용과 질문/답변의 유사도 계산
              const questionSimilarity = calculateTextSimilarity(question, docContent);
              const answerSimilarity = calculateTextSimilarity(response.answer, docContent);
              
              // 종합 점수 계산 (질문 유사도 60%, 답변 유사도 40%)
              const totalScore = (questionSimilarity * 0.6) + (answerSimilarity * 0.4);
              
              if (totalScore > bestMatch.confidence) {
                bestMatch = {
                  isLearned: totalScore >= 50, // 50% 이상이면 매뉴얼 기반 데이터로 판단
                  confidence: totalScore,
                  source: sourceFile,
                  content: docContent.substring(0, 200) + '...' // 내용 미리보기
                };
              }
            }
          }
        }
      });
    }
    
    return bestMatch;
  } catch (error) {
    console.error('매뉴얼 파일 확인 중 오류:', error);
    return { isLearned: false, confidence: 0 };
  }
}

// 텍스트 유사도 계산 함수
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  // 공통 키워드 찾기
  const commonKeywords = keywords1.filter(keyword => 
    keywords2.some(k2 => k2.includes(keyword) || keyword.includes(k2))
  );
  
  // 유사도 계산 (공통 키워드 비율)
  const similarity = (commonKeywords.length / Math.max(keywords1.length, keywords2.length)) * 100;
  
  return Math.min(similarity, 100);
}

// 키워드 추출 함수
function extractKeywords(text) {
  // 한국어와 영어 키워드 추출
  const koreanKeywords = text.match(/[가-힣]{2,}/g) || [];
  const englishKeywords = text.match(/[a-zA-Z]{3,}/g) || [];
  
  // 불용어 제거
  const stopWords = ['그리고', '또한', '또는', '그런데', '하지만', '그러나', '따라서', '그래서', '그러면', '그리고', 'the', 'and', 'or', 'but', 'so', 'then', 'this', 'that', 'with', 'for', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should'];
  
  const allKeywords = [...koreanKeywords, ...englishKeywords]
    .map(keyword => keyword.toLowerCase())
    .filter(keyword => !stopWords.includes(keyword))
    .filter(keyword => keyword.length >= 2);
  
  // 중복 제거
  return [...new Set(allKeywords)];
}

// 질문과 매뉴얼/QnA 맥락 일치도 계산 함수
function calculateContextMatch(question, response) {
  let matchScore = 0;
  
  // 1. 질문 키워드와 검색된 문서 내용의 일치도 (0-40점)
  if (response.context && response.context.length > 0) {
    const questionKeywords = extractKeywords(question);
    let totalMatchScore = 0;
    
    response.context.forEach(doc => {
      const docContent = doc.pageContent.toLowerCase();
      const docKeywords = extractKeywords(docContent);
      
      // 키워드 일치도 계산
      const matchedKeywords = questionKeywords.filter(keyword => 
        docKeywords.includes(keyword) || docContent.includes(keyword)
      );
      
      const keywordMatchRatio = matchedKeywords.length / Math.max(questionKeywords.length, 1);
      totalMatchScore += keywordMatchRatio * 40;
    });
    
    matchScore += totalMatchScore / response.context.length; // 평균 점수
  }
  
  // 2. 답변에서 질문 키워드 언급 여부 (0-30점)
  const questionKeywords = extractKeywords(question);
  const answerContent = response.answer.toLowerCase();
  const mentionedKeywords = questionKeywords.filter(keyword => 
    answerContent.includes(keyword)
  );
  
  const mentionRatio = mentionedKeywords.length / Math.max(questionKeywords.length, 1);
  matchScore += mentionRatio * 30;
  
  // 3. 답변의 구체성과 관련성 (0-20점)
  const specificTerms = ["예:", "예를 들어", "구체적으로", "정확히", "명확히", "상세히", "다음과 같습니다", "방법은", "절차는", "과정은"];
  const hasSpecificTerms = specificTerms.some(term => answerContent.includes(term));
  
  if (hasSpecificTerms) {
    matchScore += 20;
  } else if (response.answer.length > 100) {
    matchScore += 15; // 상세한 답변
  } else if (response.answer.length > 50) {
    matchScore += 10; // 적당한 답변
  } else {
    matchScore += 5; // 짧은 답변
  }
  
  // 4. QnA 파일에서 학습된 답변인지 확인 (0-10점)
  const qnaIndicators = ["학습된", "이전에", "앞서", "위에서", "앞의"];
  const isFromQnA = qnaIndicators.some(indicator => answerContent.includes(indicator));
  
  if (isFromQnA) {
    matchScore += 10;
  }
  
  return Math.min(matchScore, 100);
}

module.exports = { 
  calculateConfidence,
  checkIfLearnedData,
  calculateTextSimilarity,
  extractKeywords,
  calculateContextMatch
};
