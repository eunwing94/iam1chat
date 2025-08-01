import { useState } from 'react';
import './App.css';
import filaLogo from './assets/fila-logo.png'; // FILA 로고 이미지 추가 필요

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 저는 Mr.FILA입니다. 무엇을 도와드릴까요?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: '오류가 발생했습니다.' }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '서버와 통신 중 오류가 발생했습니다.' }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) sendMessage();
  };

  return (
    <div className="chat-container fila-theme">
      <header className="chat-header fila-header">
        <img src={filaLogo} alt="FILA Logo" className="fila-logo" />
        <span className="fila-title">Mr.FILA</span>
      </header>
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>{msg.content}</div>
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

export default App;
