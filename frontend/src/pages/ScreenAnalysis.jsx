import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ScreenAnalysis.css';

function ScreenAnalysis() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);


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
  const processImageOCR = async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
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

  // 채팅 메시지 전송
  const handleSendMessage = async () => {
    if (chatMessage.trim() || selectedImage) {
      const newMessage = {
        id: Date.now(),
        text: chatMessage,
        image: selectedImage,
        timestamp: new Date().toLocaleTimeString(),
        isUser: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // 이미지가 있으면 OCR 처리
      let ocrResult = null;
      if (selectedImage && fileInputRef.current?.files?.[0]) {
        const imageFile = fileInputRef.current.files[0];
        ocrResult = await processImageOCR(imageFile);
        
        if (ocrResult.success) {
          console.log('OCR 결과:', ocrResult.ocrText);
        }
      }
      
      // AI 응답 (OCR 결과 기반)
      setTimeout(() => {
        let responseText = "에러 이미지를 분석한 결과, 다음과 같은 원인을 예상할 수 있습니다:\n\n1. 네트워크 연결 문제\n2. 서버 응답 지연\n3. 인증 토큰 만료\n\n자세한 해결 방법을 원하시면 추가 정보를 제공해주세요.";
        
        if (ocrResult && ocrResult.success && ocrResult.response) {
          responseText = ocrResult.response;
        }
        
        const aiResponse = {
          id: Date.now() + 1,
          text: responseText,
          timestamp: new Date().toLocaleTimeString(),
          isUser: false
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1500);
      
      setChatMessage('');
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Enter 키로 메시지 전송
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="screen-analysis-container">
      <header className="screen-analysis-header">
        <div className="header-content">
          <button 
            className="back-btn"
            onClick={() => navigate('/')}
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
                    <img src={message.image} alt="에러 이미지" />
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
        </div>

        <div className="chat-input-area fila-input-area">
          {selectedImage && (
            <div className="image-preview-container">
              <div className="image-preview">
                <img src={selectedImage} alt="선택된 이미지" />
                <button className="remove-image-btn" onClick={removeImage}>
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
              />
              <label htmlFor="image-upload" className="image-upload-btn">
                📷
              </label>
            </div>
            <textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="이미지 첨부 또는 메시지를 입력하세요..."
              className="message-textarea"
              rows="1"
            />
            <button 
              onClick={handleSendMessage}
              className="fila-btn"
              disabled={!chatMessage.trim() && !selectedImage}
            >
              전송
            </button>
          </div>
        </div>
    </div>
  );
}

export default ScreenAnalysis;
