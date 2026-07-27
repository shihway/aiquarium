# 롯데 아쿠아리움 법정관리종 전문 상담 챗봇 (RAG) — MVP

## Context

범용 LLM(예: 무료 GPT 모델)은 CITES 부속서·국내 멸종위기종 등 법적 분류 여부를 물으면 종종 환각(hallucination)을 일으킨다. 실제 사례: 임금펭귄(Aptenodytes forsteri)에 대해 "CITES 대상"이라고 잘못 답변했으나, 실제로는 CITES에 해당하지 않는다.

이 서비스는 범용 챗봇이 아니라 **롯데 아쿠아리움 법정관리종 전문 상담 챗봇**이다. 핵심 가치는 두 가지:
1. **신선함(freshness)** — 가능한 카테고리는 매 질의마다 실시간/최신 상태로 조회하며, 학습 시점에 고정된 LLM의 파라메트릭 지식에 의존하지 않는다.
2. **출처 표기(citation)** — 챗봇이 어떤 사실(법적 분류, 필요 서류, 소관기관 등)을 말하면 반드시 그 정보의 출처(어떤 API/실시간 조회인지, 또는 어떤 정적 문서인지)를 답변에 함께 밝힌다. 사용자가 직접 원출처를 검증할 수 있게 하기 위함.

이 저장소에는 이미 관련 법적 카테고리 데이터가 존재한다:
- `구분별법적관리카테고리.txt` — 8개 법정 카테고리(CITES, 멸종위기야생동물, 국외반출승인대상, 생태계교란생물, 생태계위해우려생물, 해양보호생물, 회유성해양생물, 유해해양생물)별 필요 절차·소관기관 매핑. (참고: `카테고리별설명/` 폴더에는 이 8개 외에 유입주의생물 설명 파일도 별도로 존재하며, `original.html`은 유입주의생물까지 포함해 총 9개 카테고리를 체크함 — 아래 참고.)
- `카테고리별설명/*.txt` — 카테고리별 필요 서류/신고 절차 상세
- `original.html` — 학명을 입력하면 9개 카테고리(CITES, 국내 멸종위기종, 국외반출승인대상, 유입주의생물, 생태계교란생물, 생태계위해우려생물, 해양보호생물, 회유성해양생물, 유해해양생물) 해당 여부를 보여주는 기존 작동 중인 클라이언트 사이드 조회 도구. CITES는 Species+ API(`api.speciesplus.net`, 공식 CITES 사무국 데이터베이스)로 실시간 조회하고, 국내 멸종위기종은 환경부 공공데이터(`api.odcloud.kr`)를 페이지 로드시 캐싱, 나머지 7개 카테고리는 공개 API 없이 JS 배열로 하드코딩되어 있음. LLM은 전혀 관여하지 않는 순수 규칙 기반 도구.

**MVP 범위 결정**: 계획 수립 중 조사한 결과 나머지 7개 카테고리 중 상당수(WIMS 통합 API로 5개, MEIS 검색 페이지로 2개)에 대해 잠재적 실시간 소스를 찾았으나, MVP에서는 범위를 좁혀 **`original.html`에 이미 있는 정적 데이터를 그대로 사용**한다. CITES와 국내 멸종위기종 2개 카테고리의 기존 실시간 연동은 그대로 유지한다. WIMS/MEIS 등으로 나머지 7개 카테고리까지 실시간화하는 것은 MVP 이후 개선 과제로 남긴다(아래 "향후 개선" 절 참고).

목표: 이 기존 조회 로직을 "도구(tool/function calling)"로 활용하는 LLM 기반 대화형 에이전트를 추가해, 직원이 자연어(학명이든 국명이든)로 질문하면 데이터에 근거해 답변하고, 근거 없는 분류는 절대 단정하지 않으며, 모든 답변에 출처를 명시하도록 한다. 정적 텍스트를 RAG 지식으로만 박아넣는 방식(Custom GPT/Claude Project의 파일 기반 RAG)은 CITES/국내 멸종위기종처럼 자주 바뀌는 데이터의 실시간 조회를 지원하지 못하므로 채택하지 않는다 — 대신 기존 라이브 API 호출(CITES, 국내 멸종위기종)과 정적 데이터(나머지 7개)를 함께 "도구"로 노출하는 커스텀 웹앱 + 백엔드로 구현한다.

**LLM 백엔드는 Google Gemini API를 사용한다** (사용자 지정).

## 아키텍처

```
직원 브라우저 (agent.html)
   │  POST /api/chat  { messages: [...] }
   ▼
server.js (Node/Express)
   │  시작 시 구분별법적관리카테고리.txt + 카테고리별설명/*.txt 를 읽어 system instruction에 포함
   │  Gemini API(@google/genai)와 function calling 루프 수행 (서버 측 GEMINI_API_KEY, 클라이언트에 노출 안 됨)
   │  functionCall 발생 시 → species-lookup.js의 lookupAllCategories()를 직접 호출
   │      → CITES: api.speciesplus.net 실시간 조회 (서버 측 CITES 토큰)
   │      → 국내 멸종위기종: api.odcloud.kr 실시간 조회/캐싱 (기존 original.html 방식 유지)
   │      → 나머지 7개 카테고리: original.html에서 추출한 정적 배열 그대로 사용
   │  각 카테고리 결과에는 source 필드(실시간 API 조회 vs 내부 정적 데이터)를 포함
   ▼
합성된 자연어 답변(+ 출처 표기)을 브라우저에 반환
```

- `original.html`은 그대로 유지(동작 동일) — 빠른 폼 기반 조회가 필요한 직원용으로 남겨둠.
- `agent.html`은 새로 추가하는 대화형 채팅 UI.
- 두 파일이 `species-lookup.js`라는 공통 모듈을 공유 — 나중에 정적 데이터를 갱신하거나 실시간 소스로 바꿀 때 한 곳만 고치면 됨(사용자 확인: 분리 방식 채택).
- 모델은 기본 `gemini-2.5-flash`(질의 파싱 → 종명 해석 → 함수 호출 1회 → 답변 합성 수준의 작업에 충분하고 빠르고 저렴). 답변 품질이 부족하면 `gemini-2.5-pro`로 교체 가능하도록 환경변수로 모델명을 뺀다.
- API 키(`GEMINI_API_KEY`, `CITES_API_TOKEN`, `KR_ENDANGERED_API_URL`)는 전부 `.env`에서 로드, 서버에만 존재. 사용자가 아직 Gemini API 키를 발급받지 않았다면 `.env.example`만 커밋하고 실제 키는 나중에 채워 넣는다(https://aistudio.google.com/apikey 에서 발급).

## 출처 표기(citation) 설계 원칙

- `species-lookup.js`의 각 체크 함수는 결과에 `source` 필드를 추가로 반환한다. 예:
  - CITES → `"source": "CITES Species+ API (실시간, api.speciesplus.net)"`
  - 국내 멸종위기종 → `"source": "환경부 공공데이터포털 API (api.odcloud.kr)"`
  - 나머지 7개 정적 카테고리 → `"source": "내부 정적 데이터(original.html 기준), 최신 고시와 다를 수 있음"`
  - 절차/서류 안내 → `"source": "카테고리별설명/CITES 부속서 해당.txt"` 등 실제 파일명
- system instruction에 다음을 명시: **"모든 사실 진술(법적 분류, 필요 서류, 소관기관 등) 뒤에는 반드시 출처를 괄호나 각주 형태로 표기할 것. 정적 데이터 기반 답변에는 반드시 '최신 고시와 다를 수 있음' 안내를 함께 붙일 것. 출처가 불분명하거나 도구 호출 없이 답할 수 없는 내용은 절대 단정하지 말 것."**

## 파일 변경 계획

| 파일 | 작업 | 내용 |
|---|---|---|
| `species-lookup.js` | 신규 | `original.html`에서 `normalizeScientificName`, 8개 `checkXStatus` 함수, 정적 데이터 배열(marineProtectedData, exportApprovalData, invasiveAlienSpeciesData, ecologicalDisturbanceData, ecologicalRiskData, migratoryMarineData, harmfulMarineData) 을 그대로 추출(로직 변경 없음, 위치만 이동). 인라인 CITES fetch 로직(현재 `checkXStatus`처럼 별도 함수가 아니라 submit 핸들러에 직접 들어있음)은 새 `checkCitesStatus(query, apiToken)` 함수로 분리하되, 응답 형태를 다른 8개 함수와 동일한 `{status: 'found'\|'not_found'\|'error', ...}` 셰이프로 정규화한다 — 특히 Species+ API가 `taxon_concepts`를 아예 안 주거나(진짜 미등재) 빈 리스트/리스팅 없이 주는 경우(예: 임금펭귄처럼 종은 DB에 있지만 CITES 리스팅이 없는 경우) 둘 다 동일하게 `status: 'not_found'`로 매핑해야 함 — 이 정규화가 없으면 LLM이 두 경우를 다르게(하나는 "정보 없음", 하나는 "해당 없음") 해석해 임금펭귄 케이스에서 다시 얼버무릴 위험이 있음. UMD 형태(Node `module.exports` / 브라우저 `window.SpeciesLookup`)로 작성, 비밀값(API 키)은 인자로 전달(하드코딩 금지) — `original.html`에 이미 있는 CITES 토큰과 `KR_ENDANGERED_API_URL`(serviceKey 포함)은 새로 발급받지 말고 그대로 `.env`로 옮겨 재사용. 각 함수 반환값에 `source` 필드만 추가. `lookupAllCategories(query, {krEndangeredData, citesApiToken}) → 통합 JSON(카테고리별 source 포함)` 애그리게이터 추가 — 서버 tool handler가 직접 호출. |
| `original.html` | 수정(최소) | 인라인 데이터/함수를 제거하고 `<script src="species-lookup.js">` + 얇은 DOM 연동 스크립트로 교체. `renderResults`(UI 전용)는 그대로 유지. 동작은 리팩터 전후 완전히 동일해야 함(수정 전/후 동일 시나리오로 수동 스모크 테스트). `agent.html`로 가는 네비게이션 링크 추가. |
| `구분별법적관리카테고리.txt`, `카테고리별설명/*.txt` | 변경 없음 | 서버 시작 시 1회만 읽어(`fs.readFileSync`) system instruction에 결합, 각 절/문단이 어느 파일에서 왔는지 알 수 있도록 파일명 헤더를 붙여 결합(출처 표기를 위해 필요). |
| `server.js` | 신규 | Express 서버. `.env`에서 키 로드(`GEMINI_API_KEY`, `CITES_API_TOKEN`, `KR_ENDANGERED_API_URL`, `MODEL`). 시작 시 국내 멸종위기종 데이터 캐싱(기존 `fetchInitialKrData` 로직 이식). `POST /api/chat`: 커스텀 function(`lookup_species_legal_status`) 1개로 Gemini API(`@google/genai`)와 function-calling 루프 수행. `agent.html`/`original.html`/`species-lookup.js`를 동일 origin에서 정적 서빙(브라우저가 다른 호스트와 통신하지 않도록). |
| `agent.html` | 신규 | `original.html`과 동일한 Tailwind CDN/비주얼 언어(rounded-2xl 카드, gray-50/blue-600 팔레트, 기존 스피너 SVG) 재사용한 채팅 UI. 답변 말풍선 안에 출처 배지/각주가 보이도록 렌더링. `/api/chat`에만 통신, 클라이언트에 어떤 API 키도 없음. |
| `package.json` | 신규 | `express`, `@google/genai`, `dotenv`. `"start": "node server.js"`. |
| `.env.example` | 신규 | 필요한 환경변수 문서화(`GEMINI_API_KEY`, `CITES_API_TOKEN`, `KR_ENDANGERED_API_URL`, `MODEL`), 실제 값은 비워둠. |
| `.gitignore` | 신규 | `.env`, `node_modules/` (git 저장소를 초기화할 경우). |

## 도구(function) 설계

카테고리별로 9개 함수를 만들지 않고, **하나의 통합 함수**로 설계 (Gemini function calling — `functionDeclarations`):

```json
{
  "name": "lookup_species_legal_status",
  "description": "CITES, 국내 멸종위기 야생생물, 국외반출승인대상생물자원, 유입주의생물, 생태계교란생물, 생태계위해우려생물, 해양보호생물, 회유성해양생물, 유해해양생물 등 모든 법정 카테고리를 조회하고 각 결과의 출처(source, 실시간 API인지 내부 정적 데이터인지)를 함께 반환한다. 법적 분류를 언급하기 전 반드시 이 함수를 호출할 것 — 학습 데이터만으로 답변 금지.",
  "parameters": {
    "type": "object",
    "properties": {
      "scientific_name": { "type": "string", "description": "라틴 학명(예: 'Panthera tigris'). 사용자가 국명을 줬다면 먼저 학명으로 직접 변환할 것." }
    },
    "required": ["scientific_name"]
  }
}
```

이유: 사용자의 실제 질문("이 종이 규제 대상인지, 어떻게")은 애초에 9개 중 어느 카테고리가 해당할지 모르는 상태에서 나옴. 개별 함수 9개는 모델이 어떤 걸 호출할지 추측하게 만들고 스키마 오버헤드만 9배로 늘리며, 기존 `checkXStatus` 함수들은 이미 저렴한 메모리 조회/단일 fetch라 분리해도 지연시간 이점이 없음.

**답변 확신도 규칙**(system instruction에 명시):
- `status: "found"` → 자신 있게 분류를 명시하고, 로드된 카테고리별설명 텍스트에서 필요 서류/소관기관을 인용하며 출처(파일명)를 표기.
- `status: "not_found"` → 해당 카테고리가 아니라고 자신 있게 답변(출처 표기). 이것이 임금펭귄 버그를 고치는 핵심 — "확인 필요"로 얼버무리지 않음. 단, 정적 데이터 기반 카테고리는 "현재 보유한 정적 목록 기준 해당 없음(최신 고시와 다를 수 있음)"처럼 데이터의 한계를 함께 밝힌다.
- `status: "error"`(예: CITES/멸종위기종 API 요청 실패) → 그 카테고리에 한해서만 "확인 필요"라고 답하고 이유를 밝힘. 한 카테고리의 오류가 나머지 카테고리의 확정 답변까지 흐리게 하지 않음.

## 종명 해석 (국명 → 학명)

별도 함수 없이 Gemini 자신의 지식으로 국명→학명 변환을 수행(분류학적 국명 매핑은 법정 지정 목록과 달리 거의 바뀌지 않아 환각 위험이 낮음). System instruction 지시:
> 사용자가 국명(한글/영문)을 주면 먼저 정확한 학명으로 변환하고, 변환한 학명을 사용자에게 명시적으로 보여준 뒤("'임금펭귄'은 Aptenodytes forsteri(황제펭귄)로 확인됩니다") 함수를 호출할 것. 확신이 없으면(모호한 국명, 여러 후보 존재 등) 추측하지 말고 사용자에게 학명을 확인해 달라고 요청할 것 — 잘못된 학명은 실제로는 규제 대상인 종을 "해당 없음"으로 조용히 반환시켜, 차라리 되묻는 것보다 위험함.

## 검증 계획

1. **회귀 수정 확인(핵심 사례)**: "임금펭귄은 CITES 대상이야?" / "Aptenodytes forsteri CITES 해당돼?" — 학명 변환이 노출되는지, `lookup_species_legal_status`가 올바른 학명으로 호출되는지, CITES가 `not_found`를 반환하는지, 답변이 얼버무림 없이 "CITES 대상 아님"으로 확정 답변하면서 출처(CITES Species+ API 실시간 조회)를 표기하는지 확인.
2. **CITES 해당 종(양성 케이스)**: "Panthera tigris"(호랑이, 부속서 I) — `found` 확인 + 카테고리별설명에서 양도양수/인공증식허가/사육시설등록 서류 목록과 기후에너지환경부(한강유역청)가 답변에 반영되고, 각 항목 출처(파일명)가 표기되는지 확인.
3. **해양보호생물 정적 목록 케이스**: `marineProtectedData`에 있는 종(예: `Callorhinus ursinus`) — 정적 목록 매칭 경로 확인, "정적 데이터·최신 고시와 다를 수 있음" 출처 안내가 나오는지, 롯데월드 아쿠아리움 해양동물 구조기관 지정 안내(`해양보호생물.txt`)가 반영되는지 확인.
4. **법정 분류 전혀 없는 종**: `Felis catus` 등 — 9개 체크 모두 `not_found`, "확인 필요"로 도망가지 않고 규제 대상 아님을 출처와 함께 확정 답변하는지 확인.
5. **오류 경로 격리**: CITES 토큰/네트워크를 일시적으로 끊어 CITES 카테고리만 "확인 필요"가 뜨고 나머지 카테고리의 확정 답변은 영향받지 않는지 확인.
6. **출처 표기 누락 검사**: 위 1~4 답변에서 법적 분류/서류/기관 관련 모든 문장에 출처가 붙어 있는지 육안 검토(누락 시 system instruction 보강).
7. **original.html 회귀 테스트**: `species-lookup.js` 추출 후 케이스 1~4를 (LLM 없이) 기존 폼 도구로 재실행해 리팩터 전과 완전히 동일한 렌더링 결과가 나오는지 확인(로직을 그대로 옮긴 것이므로 값이 달라지면 추출 과정에서 실수가 있었다는 뜻).
8. **실행**: `GEMINI_API_KEY` 등 `.env` 값 채운 뒤 `npm install && npm start`로 로컬 구동, 브라우저에서 `agent.html` 접속해 위 시나리오 수동 테스트.

## 향후 개선 (MVP 이후, 이번 계획 수립 중 조사한 내용)

MVP에서는 다루지 않지만 기록해 둠 — 나머지 7개 정적 카테고리 중 상당수를 실시간화할 수 있는 잠재적 소스를 발견했다:
- **WIMS(야생생물관리시스템, 기후에너지환경부 국립생물자원관)**: 멸종위기야생생물·생태계위해우려생물·유입주의생물·생태계교란생물·국외반출승인대상생물자원 5개 카테고리를 통합 제공. 접근 경로 (a) data.go.kr 데이터셋 `15151585` Open API(활용신청 필요) 또는 (b) `wims.mcee.go.kr/wims/minwon/info/info01001l.do` 민원 검색 페이지(통합분류군+법정지정분류 필터, 사용자 확인).
- **MEIS(해양환경정보포털, 해양수산부)**: 해양보호생물·유해해양생물 종 검색 페이지 제공(`meis.go.kr/mes/marineLife/protection/species.do` 등, 사용자 확인).
- **회유성해양생물**: 조사 범위 내 확정 라이브 소스를 찾지 못함.

MVP 이후 이 소스들을 `species-lookup.js`에 단계적으로 통합해 정적 카테고리를 실시간으로 전환하는 것을 다음 단계로 제안한다.

## 보류 사항 / 사용자 확인 필요

- Gemini API 키(https://aistudio.google.com/apikey 발급)를 아직 보유하지 않았다면, 코드는 `.env`로 키를 받도록 구현해 두고 키 발급/입력은 사용자가 추후 직접 진행. 키가 없어도 코드 작성과 `original.html` 리팩터/`species-lookup.js` 분리까지는 진행 가능하며, 실제 `npm start` 구동 및 엔드투엔드 테스트만 키 발급 후 가능.
