// API URL 설정
// 프로덕션 환경에서는 환경 변수로 백엔드 URL을 설정
// 개발 환경에서는 Vite 프록시를 사용하므로 상대 경로 사용
export const API_URL = import.meta.env.VITE_API_URL || '';

// API 호출 헬퍼 함수
export const getApiUrl = (endpoint) => {
  // endpoint가 /로 시작하지 않으면 추가
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // API_URL이 설정되어 있으면 절대 URL 사용, 아니면 상대 경로 사용 (프록시)
  return API_URL ? `${API_URL}${path}` : path;
};

