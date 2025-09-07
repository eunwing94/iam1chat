import { useNavigate } from 'react-router-dom';
import './ScreenAnalysis.css';

function ScreenAnalysis() {
  const navigate = useNavigate();

  // 메인 화면으로 돌아가기
  const goBack = () => {
    navigate('/');
  };

  return (
    <div className="screen-analysis-container">
      <header className="analysis-header">
        <div className="header-left">
          <button className="back-btn" onClick={goBack}>
            ← 뒤로가기
          </button>
          <h1>AI 화면 분석</h1>
        </div>
      </header>

      <div className="analysis-content">
        <div className="development-message">
          <h2>🚧 개발중</h2>
          <p>AI 화면 분석 기능을 개발하고 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

export default ScreenAnalysis;
