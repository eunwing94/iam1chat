import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatManagement.css';

function ChatManagement() {
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stats, setStats] = useState(null);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showLearnPopup, setShowLearnPopup] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [learnAnswer, setLearnAnswer] = useState('');
  const [isLearning, setIsLearning] = useState(false);
  const [showLearnedAnswersPopup, setShowLearnedAnswersPopup] = useState(false);
  const [learnedAnswers, setLearnedAnswers] = useState([]);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // 채팅 기록 조회
  const fetchChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/chat/history?limit=50');
      const data = await response.json();
      if (data.success) {
        setChatHistory(data.data);
      } else {
        console.error('채팅 기록 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('채팅 기록 조회 중 오류:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 낮은 신뢰도 통계 조회
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats/low-confidence');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('통계 조회 중 오류:', error);
    }
  };

  // 신뢰도 클래스 반환
  const getConfidenceClass = (confidence) => {
    if (confidence >= 80) return 'very-high';
    if (confidence >= 60) return 'high';
    if (confidence >= 40) return 'medium';
    if (confidence >= 20) return 'low';
    return 'very-low';
  };

  // 신뢰도 필터링 함수
  const applyFilter = useCallback((filter, history = chatHistory) => {
    let filtered = history;
    
    switch (filter) {
      case '20':
        filtered = history.filter(chat => chat.confidence <= 20);
        break;
      case '40':
        filtered = history.filter(chat => chat.confidence <= 40);
        break;
      case '60':
        filtered = history.filter(chat => chat.confidence <= 60);
        break;
      case '80':
        filtered = history.filter(chat => chat.confidence <= 80);
        break;
      case 'all':
      default:
        filtered = history;
        break;
    }
    
    setFilteredHistory(filtered);
    setSelectedFilter(filter);
  }, [chatHistory]);

  // 필터 선택 핸들러
  const handleFilterSelect = (filter) => {
    applyFilter(filter);
    setShowFilterPopup(false);
  };

  // 답변 학습 핸들러
  const handleLearnAnswer = (chat) => {
    if (chat.learnedStatus === 'learned') {
      // 학습완료 상태인 경우 학습된 답변 조회
      handleViewLearnedAnswers(chat);
    } else {
      // 미학습 상태인 경우 새 답변 학습
      setSelectedChat(chat);
      setLearnAnswer('');
      setShowLearnPopup(true);
    }
  };

  // 학습된 답변 조회
  const handleViewLearnedAnswers = async (chat) => {
    try {
      const response = await fetch(`/api/chat/learned-answers/${chat.id}`);
      if (response.ok) {
        const result = await response.json();
        setLearnedAnswers(result.data);
        setSelectedChat(chat);
        setShowLearnedAnswersPopup(true);
      } else {
        alert('학습된 답변을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('학습된 답변 조회 실패:', error);
      alert('학습된 답변을 불러오는데 실패했습니다.');
    }
  };

  // 답변 학습 저장
  const handleSaveLearnAnswer = async () => {
    if (!learnAnswer.trim()) {
      alert('정확한 답변을 입력해주세요.');
      return;
    }

    setIsLearning(true);
    try {
      const response = await fetch('/api/chat/learn-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedChat.id,
          correctAnswer: learnAnswer.trim()
        }),
      });

      if (response.ok) {
        alert('답변이 학습 데이터로 저장되었습니다.');
        setShowLearnPopup(false);
        setSelectedChat(null);
        setLearnAnswer('');
        // 채팅 기록 새로고침
        fetchChatHistory();
      } else {
        const error = await response.json();
        alert(`저장 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('답변 학습 저장 실패:', error);
      alert('답변 학습 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLearning(false);
    }
  };

  // 답변 학습 취소
  const handleCancelLearn = () => {
    setShowLearnPopup(false);
    setSelectedChat(null);
    setLearnAnswer('');
  };

  // 답변 수정 시작
  const handleStartEdit = (answer) => {
    setEditingAnswer(answer);
    setEditingText(answer.answer);
  };

  // 답변 수정 취소
  const handleCancelEdit = () => {
    setEditingAnswer(null);
    setEditingText('');
  };

  // 답변 수정 저장
  const handleSaveEdit = async () => {
    if (!editingText.trim()) {
      alert('답변을 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/chat/learned-answers/${editingAnswer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newAnswer: editingText.trim()
        }),
      });

      if (response.ok) {
        alert('답변이 수정되었습니다.');
        // 학습된 답변 목록 새로고침
        await handleViewLearnedAnswers(selectedChat);
        setEditingAnswer(null);
        setEditingText('');
      } else {
        const error = await response.json();
        alert(`수정 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('답변 수정 실패:', error);
      alert('답변 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 학습된 답변 팝업 닫기
  const handleCloseLearnedAnswers = () => {
    setShowLearnedAnswersPopup(false);
    setSelectedChat(null);
    setLearnedAnswers([]);
    setEditingAnswer(null);
    setEditingText('');
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchChatHistory();
    fetchStats();
  }, []);

  // 채팅 기록이 변경될 때 필터 적용
  useEffect(() => {
    applyFilter(selectedFilter, chatHistory);
  }, [chatHistory, selectedFilter, applyFilter]);

  return (
    <div className="chat-management-container">
      <header className="management-header">
        <div className="header-content">
          <button 
            className="back-btn"
            onClick={() => navigate('/')}
          >
            ← 뒤로가기
          </button>
          <h1>📊 AI Chat 관리</h1>
        </div>
      </header>

      <div className="management-content">
        {/* 통계 카드 */}
        {stats && (
          <div className="stats-section">
            <h2>📈 신뢰도 통계</h2>
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-number">{stats.totalLowConfidence}</div>
                <div className="stat-label">낮은 신뢰도 답변</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.averageConfidence}%</div>
                <div className="stat-label">평균 신뢰도</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.notificationsSent}</div>
                <div className="stat-label">Teams 알림 발송</div>
              </div>
            </div>
          </div>
        )}

        {/* 채팅 기록 섹션 */}
        <div className="chat-history-section">
        <div className="section-header">
          <h2>💬 채팅 기록</h2>
          <div className="header-actions">
            <button 
              className="filter-btn"
              onClick={() => setShowFilterPopup(!showFilterPopup)}
            >
              🔍 필터 ({selectedFilter === 'all' ? '전체' : `${selectedFilter}% 이하`})
            </button>
            <button 
              className="refresh-btn"
              onClick={fetchChatHistory}
              disabled={loadingHistory}
            >
              {loadingHistory ? '🔄 로딩 중...' : '🔄 새로고침'}
            </button>
          </div>
        </div>

          {loadingHistory ? (
            <div className="loading">채팅 기록을 불러오는 중...</div>
          ) : (
            <div className="chat-history-list">
              {filteredHistory.length === 0 ? (
                <div className="no-data">
                  {chatHistory.length === 0 ? '채팅 기록이 없습니다.' : '선택한 필터 조건에 맞는 기록이 없습니다.'}
                </div>
              ) : (
                filteredHistory.map((chat) => (
                  <div key={chat.id} className="history-item">
                    <div className="history-header">
                      <div className="history-header-left">
                        <span className="chat-id">#{chat.id}</span>
                        <span className="chat-time">
                          {new Date(chat.createdAt).toLocaleString('ko-KR')}
                        </span>
                        <span className={`confidence-badge confidence-${getConfidenceClass(chat.confidence)}`}>
                          {chat.confidence}% ({chat.confidenceLevel})
                        </span>
                      </div>
                      <button 
                        className={`learn-answer-btn ${chat.learnedStatus === 'learned' ? 'learned' : ''}`}
                        onClick={() => handleLearnAnswer(chat)}
                        title={chat.learnedStatus === 'learned' ? '학습된 답변 보기' : '답변 학습'}
                      >
                        {chat.learnedStatus === 'learned' ? '✅ 학습완료' : '📚 답변 학습'}
                      </button>
                    </div>
                    <div className="history-question">
                      <strong>질문:</strong> {chat.userQuestion}
                    </div>
                    <div className="history-answer">
                      <strong>답변:</strong> {chat.aiAnswer.length > 150 ? 
                        `${chat.aiAnswer.substring(0, 150)}...` : chat.aiAnswer}
                    </div>
                    {chat.sourcesCount > 0 && (
                      <div className="history-sources">
                        <strong>참조 문서:</strong> {chat.sourcesCount}개
                      </div>
                    )}
                    <div className="history-session">
                      <strong>세션:</strong> {chat.sessionId}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 필터 팝업 */}
        {showFilterPopup && (
          <div className="filter-popup-overlay" onClick={() => setShowFilterPopup(false)}>
            <div className="filter-popup" onClick={(e) => e.stopPropagation()}>
              <div className="filter-popup-header">
                <h3>🔍 신뢰도 필터</h3>
                <button 
                  className="close-filter-btn"
                  onClick={() => setShowFilterPopup(false)}
                >
                  ×
                </button>
              </div>
              <div className="filter-options">
                <button 
                  className={`filter-option ${selectedFilter === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('all')}
                >
                  📊 전체 ({chatHistory.length}개)
                </button>
                <button 
                  className={`filter-option ${selectedFilter === '80' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('80')}
                >
                  🟡 80% 이하 ({chatHistory.filter(chat => chat.confidence <= 80).length}개)
                </button>
                <button 
                  className={`filter-option ${selectedFilter === '60' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('60')}
                >
                  🟠 60% 이하 ({chatHistory.filter(chat => chat.confidence <= 60).length}개)
                </button>
                <button 
                  className={`filter-option ${selectedFilter === '40' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('40')}
                >
                  🔴 40% 이하 ({chatHistory.filter(chat => chat.confidence <= 40).length}개)
                </button>
                <button 
                  className={`filter-option ${selectedFilter === '20' ? 'active' : ''}`}
                  onClick={() => handleFilterSelect('20')}
                >
                  ⚫ 20% 이하 ({chatHistory.filter(chat => chat.confidence <= 20).length}개)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 답변 학습 팝업 */}
        {showLearnPopup && selectedChat && (
          <div className="learn-popup-overlay" onClick={handleCancelLearn}>
            <div className="learn-popup" onClick={(e) => e.stopPropagation()}>
              <div className="learn-popup-header">
                <h3>📚 답변 학습</h3>
                <button className="close-learn-btn" onClick={handleCancelLearn}>×</button>
              </div>
              <div className="learn-popup-content">
                <div className="learn-question-section">
                  <h4>원본 질문:</h4>
                  <div className="learn-question-text">{selectedChat.userQuestion}</div>
                </div>
                <div className="learn-answer-section">
                  <h4>정확한 답변을 입력해주세요:</h4>
                  <textarea
                    className="learn-answer-input"
                    value={learnAnswer}
                    onChange={(e) => setLearnAnswer(e.target.value)}
                    placeholder="AI가 제공한 답변보다 정확하고 상세한 답변을 입력해주세요..."
                    rows={6}
                    disabled={isLearning}
                  />
                </div>
                <div className="learn-popup-actions">
                  <button 
                    className="cancel-learn-btn" 
                    onClick={handleCancelLearn}
                    disabled={isLearning}
                  >
                    취소
                  </button>
                  <button 
                    className="save-learn-btn" 
                    onClick={handleSaveLearnAnswer}
                    disabled={isLearning || !learnAnswer.trim()}
                  >
                    {isLearning ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 학습된 답변 조회/수정 팝업 */}
        {showLearnedAnswersPopup && selectedChat && (
          <div className="learned-answers-popup-overlay" onClick={handleCloseLearnedAnswers}>
            <div className="learned-answers-popup" onClick={(e) => e.stopPropagation()}>
              <div className="learned-answers-popup-header">
                <h3>📚 학습된 답변 관리</h3>
                <button className="close-learned-answers-btn" onClick={handleCloseLearnedAnswers}>×</button>
              </div>
              <div className="learned-answers-popup-content">
                <div className="learned-question-section">
                  <h4>질문:</h4>
                  <div className="learned-question-text">{selectedChat.userQuestion}</div>
                </div>
                <div className="learned-answers-list">
                  <h4>학습된 답변들:</h4>
                  {learnedAnswers.length === 0 ? (
                    <div className="no-learned-answers">학습된 답변이 없습니다.</div>
                  ) : (
                    learnedAnswers.map((answer, index) => (
                      <div key={answer.id} className="learned-answer-item">
                        <div className="answer-header">
                          <span className="answer-number">답변 {index + 1}</span>
                          <span className="answer-date">
                            {new Date(answer.createdAt).toLocaleString('ko-KR')}
                          </span>
                          {editingAnswer?.id === answer.id ? (
                            <div className="edit-actions">
                              <button 
                                className="save-edit-btn" 
                                onClick={handleSaveEdit}
                                disabled={isUpdating}
                              >
                                {isUpdating ? '저장 중...' : '저장'}
                              </button>
                              <button 
                                className="cancel-edit-btn" 
                                onClick={handleCancelEdit}
                                disabled={isUpdating}
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="edit-answer-btn" 
                              onClick={() => handleStartEdit(answer)}
                            >
                              ✏️ 수정
                            </button>
                          )}
                        </div>
                        {editingAnswer?.id === answer.id ? (
                          <textarea
                            className="edit-answer-input"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={4}
                            disabled={isUpdating}
                          />
                        ) : (
                          <div className="answer-content">{answer.answer}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatManagement;
