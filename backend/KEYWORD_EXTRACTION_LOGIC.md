# 키워드 추출 로직 설명

## 개요

`backend/keyword-extractor.js` 파일에서 구현된 키워드 추출 로직은 질문과 답변 텍스트에서 ERP 관련 핵심 키워드를 추출하여 최대 3개만 반환합니다.

## 사용 패키지

- **keyword-extractor-korean**: 한글 텍스트에서 키워드를 추출하는 전용 패키지
  - GitHub: https://github.com/vanylahouse/keyword-extractor-korean
  - 한글 텍스트에서 키워드와 빈도수를 추출

## 키워드 추출 프로세스

### 1단계: ERP 주요 키워드 매칭 (최우선)

**점수: 매칭 횟수 × 10점**

```javascript
ERP_KEYWORDS = [
  'invoice', '송장', 'journal', '분개', 'settlement', '정산',
  'po', 'purchase order', '발주', 'shipment', '출하',
  'dn', 'debit note', '차변', 'export', '수출', 'import', '수입',
  'approval', '승인', 'factory', '공장', 'vendor', 'customer',
  'business partner', '거래처', 'style code', 'sourcing', '소싱',
  'plm', 'gerp', 'erp', 'ddp', 'ci', 'pi', ...
]
```

- 텍스트에서 ERP 주요 키워드 사전에 있는 단어를 찾습니다
- 정규표현식으로 단어 경계(`\b`)를 기준으로 정확히 매칭합니다
- 매칭된 횟수만큼 점수를 부여합니다 (예: 2번 나오면 20점)

**예시:**
- "인보이스 등록 후에는 수출 판매 정산을 진행해야 합니다"
- 매칭: `invoice` (없음), `정산` (1회) → 10점
- 매칭: `수출` (1회) → 10점

### 2단계: 한글 키워드 추출

**점수: 빈도수 × 5점**

#### 2-1. keyword-extractor-korean 패키지 사용

```javascript
const koreanKeywords = extractor(text);
// 결과: { '단가관리': 2, '프로세스': 1, '송장': 1, ... }
```

- 한글 텍스트에서 키워드와 빈도수를 추출합니다
- 패키지가 조사, 불용어를 자동으로 처리합니다

#### 2-2. 필터링

1. **숫자 제외**: 숫자가 포함된 단어는 제외
2. **불용어 제외**: `KOREAN_STOP_WORDS` 목록에 있는 단어 제외
   - 예: "알려줘", "프로세스에", "가격을" 등
3. **길이 제한**: 2글자 이상인 키워드만 처리
4. **ERP 관련 키워드만**: ERP 사전에 있거나 ERP 관련 패턴과 일치하는 키워드만 선택

#### 2-3. 점수 계산

- 빈도수가 높을수록 높은 점수
- 예: "단가관리"가 2번 나오면 → 10점 (2 × 5)

#### 2-4. 폴백 로직

패키지 추출이 실패하면 기존 정규표현식 방식으로 폴백:
- 한글 단어 추출: `/[가-힣]{2,}/g`
- 조사 제거: "단가관리는" → "단가관리"
- ERP 관련 키워드만 선택

**예시:**
- "단가관리 프로세스에 대해 알려줘"
- 추출: `{ '단가관리': 1, '프로세스': 1 }`
- 필터링: "알려줘" 제외, "프로세스에" → "프로세스"
- 점수: "단가관리" 5점, "프로세스" 5점

### 3단계: 영어 키워드 추출

**점수: 3점**

#### 3-1. 영어 단어 추출

```javascript
const englishWords = lowerText.match(/\b[a-z]{3,}\b/g);
```

- 3글자 이상인 영어 단어만 추출
- 단어 경계(`\b`)를 기준으로 정확히 매칭

#### 3-2. 필터링

1. **숫자 제외**: 숫자가 포함된 단어는 제외
2. **불용어 제외**: `STOP_WORDS` 목록에 있는 단어 제외
   - 예: "the", "a", "and", "please", "thank" 등
3. **ERP 키워드 제외**: 이미 ERP 사전에 있는 키워드는 제외 (1단계에서 처리)
4. **ERP 관련 패턴만**: 특정 패턴으로 끝나는 단어만 선택
   - 예: `invoice`, `journal`, `order`, `shipment`, `settlement`, `approval`, `code`, `number`, `price`, `amount`, `quantity`, `date`, `status`, `create`, `delete`, `update`, `modify`, `change`, `cancel`, `request`, `send`, `receive`, `check`, `verify`, `confirm`, `register`, `load`, `save`, `print`, `export`, `import`, `purchase`, `sales`, `factory`, `vendor`, `customer`, `partner`, `style`, `licensee`, `sourcing`, `payment`, `debit`, `credit`, `account`, `template`, `document`, `file`, `email`, `portal`, `system`, `platform`, `screen`, `button`, `field`, `column`, `row`, `list`, `table`, `data`, `information`, `error`, `issue`, `problem`, `fix`, `resolve`, `deploy`, `test`, `qa`, `production`, `stg`, `dev`, `server`, `database`, `db`, `itsm`, `request`, `ticket`, `sr`, `dn`, `ci`, `pi`, `bl`, `b/l`, `eta`, `etd`, `atd`, `ata`, `fob`, `cif`, `ddp`, `po`, `fpo`, `spo`, `gr`, `plm`, `gerp`, `erp`, `misto`, `fila`, `korea`, `malaysia`, `mapp`, `mfw`, `mmal`, `trading`, `apparel`, `footwear`, `holdings`, `interco`, `intercompany`

**예시:**
- "invoice registration process"
- 추출: `['invoice', 'registration', 'process']`
- 필터링: "invoice"는 ERP 키워드이므로 제외, "registration"은 패턴 불일치 제외, "process"는 패턴 불일치 제외
- 결과: 없음 (이미 1단계에서 처리됨)

### 4단계: 점수 계산 및 정렬

```javascript
const sortedKeywords = Array.from(keywordScores.entries())
  .sort((a, b) => b[1] - a[1]) // 점수 내림차순 정렬
  .slice(0, 3) // 상위 3개만
  .map(([keyword]) => keyword); // 키워드만 추출
```

1. **점수 합산**: 같은 키워드가 여러 단계에서 추출되면 점수를 합산
2. **정렬**: 점수 내림차순으로 정렬
3. **상위 3개 선택**: 가장 높은 점수를 받은 3개 키워드만 반환

### 5단계: 키워드 태그 생성

```javascript
function getKeywordTag(keyword) {
  const tag = keyword.toLowerCase()
    .replace(/\s+/g, '_')  // 공백을 언더스코어로
    .replace(/[^a-z0-9_가-힣]/g, '');  // 특수문자 제거
  return `#${tag}`;
}
```

- 키워드를 소문자로 변환
- 공백을 언더스코어(`_`)로 변경
- 특수문자 제거
- `#` 접두사 추가

**예시:**
- "단가관리" → `#단가관리`
- "invoice number" → `#invoice_number`
- "Export Sales" → `#export_sales`

## 점수 체계

| 단계 | 점수 | 설명 |
|------|------|------|
| ERP 주요 키워드 매칭 | 매칭 횟수 × 10 | ERP 사전에 있는 키워드 |
| 한글 키워드 추출 | 빈도수 × 5 | keyword-extractor-korean 패키지 결과 |
| 영어 키워드 추출 | 3 | ERP 관련 패턴과 일치하는 단어 |

## 최종 결과

### extractAndFormatKeywords() 함수

```javascript
extractAndFormatKeywords(question, answer)
```

1. 질문과 답변에서 각각 키워드 추출
2. 중복 제거
3. 상위 3개만 선택
4. 키워드 태그 맵 생성

**반환값:**
```javascript
{
  keywords: ['단가관리', '프로세스', '송장'],  // 최대 3개
  keywordMap: {
    '단가관리': '#단가관리',
    '프로세스': '#프로세스',
    '송장': '#송장'
  }
}
```

## 예시

### 입력 텍스트
```
"단가관리 프로세스에 대해 알려줘. 단가관리는 상품의 가격을 조정하는 기능입니다."
```

### 처리 과정

1. **ERP 키워드 매칭**: 없음
2. **한글 키워드 추출**:
   - `{ '단가관리': 2, '프로세스': 1, '상품': 1, '가격': 1, '조정': 1, '기능': 1 }`
   - 필터링: "알려줘", "프로세스에", "가격을" 제외
   - 점수: "단가관리" 10점 (2 × 5), "프로세스" 5점 (1 × 5)
3. **영어 키워드 추출**: 없음
4. **정렬 및 선택**: 
   - "단가관리" (10점)
   - "프로세스" (5점)
   - 상위 3개 선택 → ["단가관리", "프로세스"]

### 최종 결과
```javascript
{
  keywords: ['단가관리', '프로세스'],
  keywordMap: {
    '단가관리': '#단가관리',
    '프로세스': '#프로세스'
  }
}
```

## 특징

1. **다단계 점수 시스템**: ERP 키워드 > 한글 키워드 > 영어 키워드 순으로 우선순위
2. **빈도수 기반 점수**: 자주 나오는 키워드일수록 높은 점수
3. **불용어 필터링**: 의미 없는 단어 자동 제거
4. **조사 제거**: 한글 조사 자동 제거
5. **ERP 도메인 특화**: ERP 관련 키워드만 추출
6. **최대 3개 제한**: 핵심 키워드만 추출하여 과도한 키워드 방지
7. **폴백 메커니즘**: 패키지 실패 시 기존 로직으로 자동 전환

