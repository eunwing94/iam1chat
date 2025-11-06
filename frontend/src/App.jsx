import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import filaLogo from './assets/fila-logo.png';
import ChatManagement from './pages/ChatManagement';
import ScreenAnalysis from './pages/ScreenAnalysis';

// 회사 및 문의 업무 선택 컴포넌트
function CompanySelection() {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState('');

  const companies = [
    { id: 'D001', name: 'Misto Holdings', description: 'Misto Holdings' },
    { id: 'D002', name: 'Misto Korea', description: 'Misto Korea' },
    { id: 'D007', name: 'Misto Footwear', description: 'Misto Footwear' },
    { id: 'D011', name: 'Misto Apparel', description: 'Misto Apparel' },
    { id: 'D025', name: 'Misto Malaysia', description: 'Misto Malaysia' },
    { id: 'other', name: '기타', description: '기타 시스템 문의' }
  ];

  // const inquiryTypes = [
  //   { id: 'technical', name: '기술 문의', description: '시스템 오류, 기능 문의' },
  //   { id: 'business', name: '업무 문의', description: '프로세스, 업무 관련 문의' },
  //   { id: 'training', name: '교육 문의', description: '시스템 사용법, 교육 관련' },
  //   { id: 'general', name: '일반 문의', description: '기타 일반적인 문의' }
  // ];

  const handleStartChat = () => {
    if (!selectedCompany) {
      alert('회사를 선택해주세요.');
      return;
    }
    
    // 선택한 정보를 세션 스토리지에 저장
    sessionStorage.setItem('selectedCompany', selectedCompany);
    
    // 채팅 화면으로 이동
    navigate('/chat');
  };

  return (
    <div className="chat-container fila-theme">
      <header className="chat-header fila-header">
      <div className="header-left">
          <img src={filaLogo} alt="FILA Logo" className="fila-logo" />
          <div className="header-info">
            <span className="fila-title">Mr.FILA</span>
          </div>
        </div>
      </header>



      <div className="chat-messages">
        {/* 회사 선택 */}
        <div className="selection-section">
          <h2 className="section-title">🏢 회사 선택</h2>
          <div className="option-grid">
            {companies.map((company) => (
              <div 
                key={company.id}
                className={`option-card ${selectedCompany === company.id ? 'selected' : ''}`}
                onClick={() => setSelectedCompany(company.id)}
              >
                <div className="option-name">{company.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 시작 버튼 */}
        <div className="selection-actions">
          <button 
            className="start-chat-btn fila-btn"
            onClick={handleStartChat}
            disabled={!selectedCompany}
          >
            채팅 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

// Chat 컴포넌트
function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 저는 Mr.FILA입니다. 무엇을 도와드릴까요?', confidence: null, sources: [] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // 선택한 회사 정보 가져오기
  const selectedCompany = sessionStorage.getItem('selectedCompany');
  
  const getCompanyName = (id) => {
    const companies = { 
      'D001': 'Misto Holdings', 
      'D002': 'Misto Korea', 
      'D007': 'Misto Footwear', 
      'D011': 'Misto Apparel', 
      'D025': 'Misto Malaysia', 
      'other': '기타' 
    };
    return companies[id] || '알 수 없음';
  };

  // 메인 화면으로 이동
  const goToMain = () => {
    navigate('/');
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { 
          role: 'assistant', 
          content: data.reply,
          confidence: data.confidence,
          confidenceLevel: data.confidenceLevel,
          sources: data.sources || []
        }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: '오류가 발생했습니다.', confidence: 0, sources: [] }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '서버와 통신 중 오류가 발생했습니다.', confidence: 0, sources: [] }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) sendMessage();
  };

  const getConfidenceClass = (confidence) => {
    if (confidence >= 80) return 'very-high';
    if (confidence >= 60) return 'high';
    if (confidence >= 40) return 'medium';
    if (confidence >= 20) return 'low';
    return 'very-low';
  };

  // AI 화면 분석 페이지로 이동
  const openScreenAnalysis = () => {
    setShowMenu(false);
    navigate('/screen-analysis');
  };

  // AI Chat 관리 페이지로 이동
  const openChatManagement = () => {
    setShowMenu(false);
    navigate('/chat-management');
  };

  return (
    <div className="chat-container fila-theme">
      <header className="chat-header fila-header">
        <div className="header-left">
          <img src={filaLogo} alt="FILA Logo" className="fila-logo" />
          <div className="header-info">
            <span className="fila-title">Mr.FILA</span>
          </div>
          {selectedCompany && (
              <div className="selection-info" onClick={goToMain} style={{ cursor: 'pointer' }}>
                <span className="company-info">🏢 {getCompanyName(selectedCompany)}</span>
              </div>
            )}
        </div>
        <div className="header-right">
          <button 
            className="hamburger-menu"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="메뉴"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <button 
                className="menu-item"
                onClick={openScreenAnalysis}
              >
                🔍 AI 화면 분석
              </button>
              <button 
                className="menu-item"
                onClick={openChatManagement}
              >
                📊 AI Chat 관리
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
            {msg.role === 'assistant' && msg.confidence !== null && (
              <div className="confidence-info">
                <div className={`confidence-badge confidence-${getConfidenceClass(msg.confidence)}`}>
                  신뢰도: {msg.confidence}% ({msg.confidenceLevel})
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources-info">
                    <small>참조 문서: {msg.sources.length}개</small>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="chat-message assistant">답변을 생성 중입니다...</div>}
      </div>
      <div className="chat-input-area fila-input-area">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
          className="chat-input fila-input"
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} className="send-btn fila-btn">전송</button>
      </div>
    </div>
  );
}

// 메인 App 컴포넌트
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CompanySelection />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/screen-analysis" element={<ScreenAnalysis />} />
        <Route path="/chat-management" element={<ChatManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
