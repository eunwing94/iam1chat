// 화면 분석 및 OCR 처리 모듈
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const stringSimilarity = require('string-similarity');
const OpenAI = require('openai');
const database = require('./database.js');

// multer 설정 (메모리 저장)
const upload = multer({ storage: multer.memoryStorage() });

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// OCR 결과를 파일에 저장하는 함수
function saveOCRResult(ocrText, userText = '') {
  const ocrFilePath = path.join(__dirname, 'files', 'ocr_list.txt');
  const separator = '-----------------------------------------';
  const timestamp = new Date().toISOString();
  
  // OCR 텍스트에서 Time: 타임스탬프 부분을 찾아서 분리
  const timeMatch = ocrText.match(/Time:\s*([^\n\r]+)/i);
  let errorTime = '';
  let content = ocrText;
  
  if (timeMatch) {
    errorTime = timeMatch[1].trim();
    // Time: 타임스탬프 부분을 제거한 내용
    content = ocrText.replace(/Time:\s*[^\n\r]+/i, '').trim();
  }
  
  // 사용자 입력 텍스트가 있으면 추가
  let userInputText = '';
  if (userText && userText.trim()) {
    userInputText = `사용자입력 : ${userText.trim()}\n`;
  }
  
  const formattedContent = `\n${separator}\n문의일시 : ${timestamp}\n내용 : ${content}\n${userInputText}에러일시 : ${errorTime}\n`;
  
  try {
    // 파일이 없으면 생성, 있으면 추가
    fs.appendFileSync(ocrFilePath, formattedContent, 'utf8');
    console.log('OCR 결과가 ocr_list.txt에 저장되었습니다.');
  } catch (error) {
    console.error('OCR 결과 저장 실패:', error);
  }
}

// 텍스트 입력 결과를 ocr_list.txt에 저장하는 함수
function saveTextResult(userText) {
  const ocrFilePath = path.join(__dirname, 'files', 'ocr_list.txt');
  const separator = '-----------------------------------------';
  const timestamp = new Date().toISOString();
  
  const formattedContent = `\n${separator}\n문의일시 : ${timestamp}\n내용 : \n사용자입력 : ${userText.trim()}\n에러일시 : \n`;
  
  try {
    // 파일이 없으면 생성, 있으면 추가
    fs.appendFileSync(ocrFilePath, formattedContent, 'utf8');
    console.log('텍스트 입력 결과가 ocr_list.txt에 저장되었습니다.');
  } catch (error) {
    console.error('텍스트 결과 저장 실패:', error);
  }
}

// ChatGPT 답변을 confirm_list.txt에 저장하는 함수
function saveConfirmResult(errorContent, chatGPTResponse) {
  const confirmFilePath = path.join(__dirname, 'files', 'confirm_list.txt');
  const separator = '-----------------------------------------';
  const timestamp = new Date().toISOString();
  
  const formattedContent = `\n${separator}\n문의일시 : ${timestamp}\n에러내용 : ${errorContent}\nChatGPT 답변 : ${chatGPTResponse}\n`;
  
  try {
    // 파일이 없으면 생성, 있으면 추가
    fs.appendFileSync(confirmFilePath, formattedContent, 'utf8');
    console.log('ChatGPT 답변이 confirm_list.txt에 저장되었습니다.');
  } catch (error) {
    console.error('confirm_list.txt 저장 실패:', error);
  }
}

// OCR 처리 함수
async function processOCR(imageBuffer) {
  const worker = await createWorker('kor+eng'); // 한국어 + 영어
  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

// 가이드 파일에서 에러 정보를 파싱하는 함수
function parseGuideFile() {
  const guideFilePath = path.join(__dirname, 'files', 'guide.txt');
  try {
    const content = fs.readFileSync(guideFilePath, 'utf8');
    const entries = [];
    
    // ----------------------------------------- 구분자로 섹션들을 파싱
    const sections = content.split('-----------------------------------------').filter(section => section.trim());
    
    sections.forEach(section => {
      const lines = section.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      if (lines.length >= 3) {
        const contentLine = lines[0].trim();
        const causeLine = lines[1].replace('예상 에러 원인:', '').replace('예상 원인:', '').trim();
        const solutionLine = lines[2].replace('해결방법:', '').trim();
        
        entries.push({
          title: contentLine.substring(0, 50) + '...', // 제목은 내용의 일부로 생성
          content: contentLine,
          cause: causeLine,
          solution: solutionLine
        });
      }
    });
    
    return entries;
  } catch (error) {
    console.error('가이드 파일 읽기 실패:', error);
    return [];
  }
}

// QNA 파일에서 질문-답변 정보를 파싱하는 함수
function parseQNAFile() {
  const qnaFilePath = path.join(__dirname, 'manuals', 'qna.txt');
  try {
    const content = fs.readFileSync(qnaFilePath, 'utf8');
    const entries = [];
    
    // ## Q: 로 시작하는 질문 블록들을 찾아서 파싱
    const qnaBlocks = content.split(/##\s*Q:/).filter(block => block.trim() && !block.startsWith('#'));
    
    qnaBlocks.forEach(block => {
      // A: 이전까지가 질문, A: 이후가 답변
      const answerMatch = block.match(/A:\s*(.+?)(?=\n##\s*Q:|$)/s);
      const questionMatch = block.match(/^(.+?)(?=\nA:)/s);
      
      if (questionMatch && answerMatch) {
        const question = questionMatch[1].trim();
        const answer = answerMatch[1].trim();
        
        if (question && answer) {
          entries.push({
            title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
            content: question,
            answer: answer,
            type: 'qna' // guide와 구분하기 위한 타입
          });
        }
      }
    });
    
    return entries;
  } catch (error) {
    console.error('QNA 파일 읽기 실패:', error);
    return [];
  }
}

// 유사도 기반 에러 분석 함수
function analyzeErrorWithGuide(ocrContent) {
  // 1. 먼저 guide.txt에서 찾기
  const guideEntries = parseGuideFile();
  let bestMatch = null;
  let bestSimilarity = 0;
  
  guideEntries.forEach(entry => {
    const similarity = stringSimilarity.compareTwoStrings(ocrContent, entry.content);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = entry;
    }
  });
  
  // 2. guide.txt에서 70% 이상 매칭이 없으면 qna.txt에서도 찾기
  if (bestSimilarity < 0.7) {
    const qnaEntries = parseQNAFile();
    let qnaBestMatch = null;
    let qnaBestSimilarity = 0;
    
    qnaEntries.forEach(entry => {
      const similarity = stringSimilarity.compareTwoStrings(ocrContent, entry.content);
      if (similarity > qnaBestSimilarity) {
        qnaBestSimilarity = similarity;
        qnaBestMatch = entry;
      }
    });
    
    // qna.txt에서 더 높은 유사도를 찾았으면 그것을 사용
    if (qnaBestSimilarity > bestSimilarity) {
      bestSimilarity = qnaBestSimilarity;
      bestMatch = qnaBestMatch;
      console.log(`QNA에서 더 높은 유사도 발견: ${(qnaBestSimilarity * 100).toFixed(2)}%`);
    }
  }
  
  return {
    match: bestMatch,
    similarity: bestSimilarity
  };
}

// 신뢰도 레벨 분류 함수
function getConfidenceLevel(confidence) {
  if (confidence >= 80) return '매우 높음';
  if (confidence >= 60) return '높음';
  if (confidence >= 40) return '보통';
  if (confidence >= 20) return '낮음';
  return '매우 낮음';
}

// 화면 분석 결과를 chat_history에 저장하는 함수
async function saveScreenAnalysisToHistory(userQuestion, aiAnswer, similarity) {
  try {
    // 유사도를 신뢰도 점수로 변환 (0-100)
    const confidence = Math.round(similarity * 100);
    const confidenceLevel = getConfidenceLevel(confidence);
    const sessionId = 'screen-analysis';
    
    await database.saveChatHistory(
      sessionId,
      userQuestion,
      aiAnswer,
      confidence,
      confidenceLevel,
      [] // sources는 없음
    );
    
    console.log('화면 분석 결과가 chat_history에 저장되었습니다.');
  } catch (error) {
    console.error('chat_history 저장 실패:', error);
  }
}

// ChatGPT API 호출 함수
async function getChatGPTResponse(content) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY가 설정되지 않았습니다. 기본 응답을 반환합니다.');
      return `"${content}"에 대한 상세한 분석이 필요합니다. 추가 정보를 제공해주시면 더 정확한 해결방법을 제안할 수 있습니다.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 시스템 에러 분석 전문가입니다. 주어진 에러 메시지를 분석하여 간결하고 명확한 답변을 제공해주세요.\n\n답변 형식:\n• 예상 원인: [간단한 원인 설명]\n• 해결방법: [구체적인 해결 단계]\n\n답변은 3-4줄 이내로 간결하게 작성하고, 불필요한 설명은 생략해주세요."
        },
        {
          role: "user",
          content: `다음 에러 메시지를 분석해주세요: "${content}"`
        }
      ],
      max_tokens: 300,
      temperature: 0.5
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('ChatGPT API 호출 실패:', error);
    return `"${content}"에 대한 분석 중 오류가 발생했습니다. 시스템 관리자에게 문의해주세요.`;
  }
}

// 화면 분석 OCR 처리 API 엔드포인트 등록 함수
function setupOCRRoutes(app) {
  // OCR 처리 엔드포인트
  app.post('/api/ocr', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: '이미지 파일이 필요합니다.' 
        });
      }

      // 사용자 입력 텍스트 받기
      const userText = req.body.userText || '';

      console.log('OCR 처리 시작...');
      const ocrText = await processOCR(req.file.buffer);
      
      if (ocrText && ocrText.trim().length > 0) {
        // OCR 결과를 파일에 저장 (사용자 입력 텍스트 포함)
        saveOCRResult(ocrText, userText);
        
        // OCR 텍스트에서 Time: 부분을 제거한 내용 추출
        const timeMatch = ocrText.match(/Time:\s*([^\n\r]+)/i);
        let content = ocrText;
        if (timeMatch) {
          content = ocrText.replace(/Time:\s*[^\n\r]+/i, '').trim();
        }
        
        // 가이드와 유사도 분석
        const analysis = analyzeErrorWithGuide(content);
        console.log(`유사도 분석 결과: ${(analysis.similarity * 100).toFixed(2)}%`);
        if (analysis.match) {
          console.log(`매칭된 가이드: ${analysis.match.title}`);
        }
        
        let responseText = '';
        
        if (analysis.similarity >= 0.7 && analysis.match) {
          // 70% 이상 유사한 경우 가이드 또는 QNA에서 답변
          if (analysis.match.type === 'qna') {
            // QNA에서 찾은 경우
            responseText = analysis.match.answer;
          } else {
            // guide.txt에서 찾은 경우
            let causeText = '';
            let solutionText = '';
            
            if (analysis.match.cause && analysis.match.cause.trim()) {
              causeText = `예상 원인 : ${analysis.match.cause}`;
            }
            
            if (analysis.match.solution && analysis.match.solution.trim()) {
              solutionText = `해결방법: ${analysis.match.solution}`;
            }
            
            responseText = `에러 이미지를 분석한 결과, 다음과 같은 원인을 예상할 수 있습니다:

${causeText}${causeText && solutionText ? '\n' : ''}${solutionText}`;
          }
        } else {
          // 70% 미만인 경우 ChatGPT 답변
          console.log('유사도가 70% 미만이므로 ChatGPT 분석을 진행합니다.');
          const chatGPTResponse = await getChatGPTResponse(content);
          
          // ChatGPT 답변을 confirm_list.txt에 저장
          saveConfirmResult(content, chatGPTResponse);
          
          responseText = chatGPTResponse;
        }
        
        // chat_history에 저장
        const userQuestion = userText.trim() || content || '이미지 분석 요청';
        await saveScreenAnalysisToHistory(userQuestion, responseText, analysis.similarity);
        
        res.json({
          success: true,
          ocrText: ocrText,
          content: content,
          similarity: analysis.similarity,
          response: responseText,
          message: 'OCR 처리 및 분석이 완료되었습니다.'
        });
      } else {
        // OCR로 텍스트를 추출할 수 없는 경우
        const noTextResponse = '이미지를 인식할 수 없습니다. 이미지를 확인 후 첨부해주세요.';
        
        // chat_history에 저장 (유사도 0)
        const userQuestion = userText.trim() || '이미지 분석 요청 (텍스트 추출 실패)';
        await saveScreenAnalysisToHistory(userQuestion, noTextResponse, 0);
        
        res.json({
          success: true,
          ocrText: '',
          content: '',
          similarity: 0,
          response: noTextResponse,
          message: 'OCR 처리 완료 (텍스트 추출 불가)'
        });
      }
    } catch (error) {
      console.error('OCR 처리 실패:', error);
      res.status(500).json({
        success: false,
        error: 'OCR 처리 중 오류가 발생했습니다.'
      });
    }
  });

  // 텍스트 분석 엔드포인트
  app.post('/api/analyze-text', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: '분석할 텍스트가 필요합니다.' 
        });
      }

      console.log('텍스트 분석 시작...');
      
      // 텍스트 입력 결과를 ocr_list.txt에 저장
      saveTextResult(text);
      
      // 가이드와 유사도 분석
      const analysis = analyzeErrorWithGuide(text);
      console.log(`유사도 분석 결과: ${(analysis.similarity * 100).toFixed(2)}%`);
      if (analysis.match) {
        console.log(`매칭된 가이드: ${analysis.match.title}`);
      }
      
      let responseText = '';
      
      if (analysis.similarity >= 0.7 && analysis.match) {
        // 70% 이상 유사한 경우 가이드 또는 QNA에서 답변
        if (analysis.match.type === 'qna') {
          // QNA에서 찾은 경우
          responseText = analysis.match.answer;
        } else {
          // guide.txt에서 찾은 경우
          let causeText = '';
          let solutionText = '';
          
          if (analysis.match.cause && analysis.match.cause.trim()) {
            causeText = `예상 원인 : ${analysis.match.cause}`;
          }
          
          if (analysis.match.solution && analysis.match.solution.trim()) {
            solutionText = `해결방법: ${analysis.match.solution}`;
          }
          
          responseText = `에러 내용을 분석한 결과, 다음과 같은 원인을 예상할 수 있습니다:

${causeText}${causeText && solutionText ? '\n' : ''}${solutionText}

자세한 해결 방법을 원하시면 추가 정보를 제공해주세요.`;
        }
      } else {
        // 70% 미만인 경우 ChatGPT 답변
        console.log('유사도가 70% 미만이므로 ChatGPT 분석을 진행합니다.');
        const chatGPTResponse = await getChatGPTResponse(text);
        
        // ChatGPT 답변을 confirm_list.txt에 저장
        saveConfirmResult(text, chatGPTResponse);
        
        responseText = chatGPTResponse;
      }
      
      // chat_history에 저장
      await saveScreenAnalysisToHistory(text, responseText, analysis.similarity);
      
      res.json({
        success: true,
        text: text,
        similarity: analysis.similarity,
        response: responseText,
        message: '텍스트 분석이 완료되었습니다.'
      });
    } catch (error) {
      console.error('텍스트 분석 실패:', error);
      res.status(500).json({
        success: false,
        error: '텍스트 분석 중 오류가 발생했습니다.'
      });
    }
  });
}

module.exports = {
  setupOCRRoutes,
  processOCR,
  saveOCRResult
};
