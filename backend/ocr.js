const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

// multer 설정 (메모리 저장)
const upload = multer({ storage: multer.memoryStorage() });

// OCR 결과를 파일에 저장하는 함수
function saveOCRResult(ocrText) {
  const ocrFilePath = path.join(__dirname, 'manuals', 'ocr_list.txt');
  const separator = '-----------------------------------------';
  const timestamp = new Date().toISOString();
  
  const content = `\n${separator}\n[${timestamp}]\n${ocrText}\n`;
  
  try {
    // 파일이 없으면 생성, 있으면 추가
    fs.appendFileSync(ocrFilePath, content, 'utf8');
    console.log('OCR 결과가 ocr_list.txt에 저장되었습니다.');
  } catch (error) {
    console.error('OCR 결과 저장 실패:', error);
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

// OCR 처리 API 엔드포인트 등록 함수
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

      console.log('OCR 처리 시작...');
      const ocrText = await processOCR(req.file.buffer);
      
      if (ocrText) {
        // OCR 결과를 파일에 저장
        saveOCRResult(ocrText);
        
        res.json({
          success: true,
          ocrText: ocrText,
          message: 'OCR 처리가 완료되었습니다.'
        });
      } else {
        res.json({
          success: false,
          error: '이미지에서 텍스트를 추출할 수 없습니다.'
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
}

module.exports = {
  setupOCRRoutes,
  processOCR,
  saveOCRResult
};
