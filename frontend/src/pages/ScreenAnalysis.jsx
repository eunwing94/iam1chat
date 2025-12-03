import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScreenAnalysis.css';

function ScreenAnalysis() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);


  // 이미지 선택 핸들러
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 제거
  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // OCR 처리 함수
  const processImageOCR = async (imageFile, userText = '') => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('userText', userText);
      
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OCR 처리 실패:', error);
      return { success: false, error: 'OCR 처리 중 오류가 발생했습니다.' };
    }
  };

  // 텍스트 분석 함수
  const processTextAnalysis = async (text) => {
    try {
      const response = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('텍스트 분석 실패:', error);
      return { success: false, error: '텍스트 분석 중 오류가 발생했습니다.' };
    }
  };

  // 채팅 메시지 전송
  const handleSendMessage = async () => {
    // 로딩 중이거나 입력이 없으면 전송하지 않음
    if (isLoading || (!chatMessage.trim() && !selectedImage)) {
      return;
    }

    setIsLoading(true);
    
    try {
      const newMessage = {
        id: Date.now(),
        text: chatMessage,
        image: selectedImage,
        timestamp: new Date().toLocaleTimeString(),
        isUser: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // 분석 결과를 저장할 변수
      let analysisResult = null;
      
      // 분기처리: 이미지가 있으면 OCR, 텍스트만 있으면 텍스트 분석
      if (selectedImage && fileInputRef.current?.files?.[0]) {
        // 이미지가 있는 경우 OCR 처리 (사용자 입력 텍스트도 함께 전달)
        const imageFile = fileInputRef.current.files[0];
        analysisResult = await processImageOCR(imageFile, chatMessage.trim());
        
        if (analysisResult.success) {
          console.log('OCR 결과:', analysisResult.ocrText);
        }
      } else if (chatMessage.trim()) {
        // 텍스트만 입력된 경우 텍스트 분석
        analysisResult = await processTextAnalysis(chatMessage.trim());
        
        if (analysisResult.success) {
          console.log('텍스트 분석 결과:', analysisResult.text);
        }
      }
      
      // AI 응답 (분석 결과 기반)
      setTimeout(() => {
        let responseText = "자세한 해결 방법을 원하시면 추가 정보를 제공해주세요.";
        
        if (analysisResult && analysisResult.success && analysisResult.response) {
          responseText = analysisResult.response;
        }
        
        const aiResponse = {
          id: Date.now() + 1,
          text: responseText,
          timestamp: new Date().toLocaleTimeString(),
          isUser: false
        };
        
        // 실제 답변 추가
        setMessages(prev => [...prev, aiResponse]);
        setIsLoading(false); // 로딩 완료
      }, 1500);
      
      setChatMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      setIsLoading(false); // 에러 발생 시에도 로딩 해제
    }
  };

  // Enter 키로 메시지 전송
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 이미지 클릭 핸들러
  const handleImageClick = (imageSrc) => {
    setPreviewImage(imageSrc);
  };

  // 모달 닫기
  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className="screen-analysis-container">
      <header className="screen-analysis-header">
        <div className="header-content">
          <button 
            className="back-btn"
            onClick={() => navigate('/chat')}
          >
            ← 뒤로가기
          </button>
          <h1>🔍 AI 화면 분석</h1>
        </div>
      </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h3>🔍 AI 화면 분석</h3>
              <p>이미지를 첨부하거나 메뉴명과 에러 내용을 텍스트로 입력해주세요.</p>
              <p>AI가 예상 원인과 해결 방법을 제안해드립니다.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.isUser ? 'user' : 'assistant'}`}>
                {message.image && (
                  <div className="message-image">
                    <img 
                      src={message.image} 
                      alt="에러 이미지" 
                      onClick={() => handleImageClick(message.image)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                )}
                <div className="message-content">
                  {message.text.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
                <span className="message-time">{message.timestamp}</span>
              </div>
            ))
          )}
          {isLoading && <div className="chat-message assistant">답변을 생성 중입니다...</div>}
        </div>

        <div className="chat-input-area fila-input-area">
          {selectedImage && (
            <div className="image-preview-container">
              <div className="image-preview">
                <img src={selectedImage} alt="선택된 이미지" />
                <button 
                  className="remove-image-btn" 
                  onClick={removeImage}
                  disabled={isLoading}
                  style={{ 
                    opacity: isLoading ? 0.5 : 1, 
                    cursor: isLoading ? 'not-allowed' : 'pointer' 
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          <div className="input-wrapper">
            <div className="input-actions">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="file-input-hidden"
                id="image-upload"
                disabled={isLoading}
              />
              <label 
                htmlFor="image-upload" 
                className={`image-upload-btn ${isLoading ? 'disabled' : ''}`}
                style={{ opacity: isLoading ? 0.5 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                📷
              </label>
            </div>
            <textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="이미지 또는 메시지를 입력하세요..."
              className="message-textarea"
              rows="1"
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              className="fila-btn"
              disabled={isLoading || (!chatMessage.trim() && !selectedImage)}
            >
              {isLoading ? '처리중...' : '전송'}
            </button>
          </div>
        </div>

        {/* 이미지 미리보기 모달 */}
        {previewImage && (
          <div className="image-preview-modal" onClick={closePreview}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={closePreview}>✕</button>
              <img src={previewImage} alt="미리보기" />
            </div>
          </div>
        )}
    </div>
  );
}

export default ScreenAnalysis;
