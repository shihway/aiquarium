require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const speciesLookup = require('./species-lookup.js');

const MODEL = process.env.MODEL || 'gemini-flash-latest';
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
if (!process.env.GEMINI_API_KEY) {
    console.warn('[server] 경고: GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요. /api/chat 호출은 실패합니다.');
}

// --------------------------------------------------------------------
// 국내 멸종위기종 데이터: 서버 시작 시 1회 로드해 메모리에 캐싱
// (original.html의 fetchInitialKrData 로직을 서버 측으로 이식)
// --------------------------------------------------------------------
let krEndangeredData = [];

async function loadKrEndangeredData() {
    try {
        const url = process.env.KR_ENDANGERED_API_URL;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`환경부 API 호출 실패 (상태 코드: ${response.status})`);
        }
        const data = await response.json();
        if (data && data.data) {
            krEndangeredData = data.data;
        }
        console.log(`[server] 국내 멸종위기종 데이터 로드 완료 (${krEndangeredData.length}종)`);
    } catch (error) {
        console.error('[server] 국내 멸종위기종 데이터 로드 실패:', error.message);
        console.error('[server] 국내 멸종위기종 카테고리는 이번 실행 동안 오류로 응답합니다.');
    }
}

// --------------------------------------------------------------------
// 지식베이스 로드: 구분별법적관리카테고리.txt + 카테고리별설명/*.txt를
// 1회만 읽어 system instruction에 포함 (파일명 대신 안정적인 출처 ID 헤더 부착)
// --------------------------------------------------------------------
function loadKnowledgeBase() {
    const categoryDir = path.join(__dirname, '카테고리별설명');
    const entries = [
        { relPath: '구분별법적관리카테고리.txt', id: 'kb_overview' },
        ...fs.readdirSync(categoryDir).map((f, i) => ({
            relPath: path.join('카테고리별설명', f),
            id: `kb_category_${i}`
        }))
    ];

    const labels = {};
    const text = entries
        .map(({ relPath, id }) => {
            const content = fs.readFileSync(path.join(__dirname, relPath), 'utf8').trim();
            labels[id] = `${path.basename(relPath, '.txt')} 관리 절차 안내`;
            return `### [출처 ID: ${id}]\n${content}`;
        })
        .join('\n\n---\n\n');

    return { text, labels };
}

const { text: KNOWLEDGE_BASE, labels: KB_LABELS } = loadKnowledgeBase();

// --------------------------------------------------------------------
// 함수 호출(실시간/내부 조회) 결과 카테고리 → 사용자에게 보여줄 전문적 라벨 매핑
// (species-lookup.js의 lookupAllCategories()가 반환하는 키와 동일)
// --------------------------------------------------------------------
const CATEGORY_LABELS = {
    cites: { label: 'CITES 국제거래협약 관리종 지정 현황', type: 'realtime' },
    kr_endangered: { label: '국내 멸종위기 야생생물 지정 현황', type: 'realtime' },
    export_approval: { label: '국외반출승인대상 생물자원 지정 현황', type: 'internal' },
    invasive_alien: { label: '유입주의생물 지정 현황', type: 'internal' },
    ecological_disturbance: { label: '생태계교란생물 지정 현황', type: 'internal' },
    ecological_risk: { label: '생태계위해우려생물 지정 현황', type: 'internal' },
    marine_protected: { label: '해양보호생물 지정 현황', type: 'internal' },
    migratory_marine: { label: '회유성해양생물 지정 현황', type: 'internal' },
    harmful_marine: { label: '유해해양생물 지정 현황', type: 'internal' },
    designated_management: { label: '지정 관리 생물 지정 현황', type: 'internal' },
    export_import_permission: { label: '수출ㆍ수입 등의 허가대상 야생생물 지정 현황', type: 'internal' },
    natural_monument: { label: '천연기념물 지정 현황', type: 'internal' }
};

function buildSystemInstruction() {
    return `당신은 AIquarium 직원을 위한 **법정관리종 전문 상담 챗봇**입니다.
범용 챗봇이 아니라, 아래 원칙들을 절대적으로 지키는 전문 도구입니다.

## 원칙 1: 신선함 (Freshness)
- CITES 국제 규제 여부, 국내 멸종위기종 여부는 학습된 지식이 아니라 반드시 \`lookup_species_legal_status\` 함수를 호출해 실시간으로 확인한 결과만 사용합니다.
- 학명이든 국명이든, 종의 법적 분류를 언급하기 전에는 예외 없이 이 함수를 먼저 호출하세요. 당신의 사전 지식(학습 데이터)으로 CITES/멸종위기종 여부를 추측하거나 답하지 마세요 — 학습 데이터는 낡았을 수 있고, 실제로 이 문제(예: 임금펭귄을 CITES 대상으로 잘못 답하는 환각) 때문에 이 챗봇이 만들어졌습니다.

## 원칙 2: 간결함 (Concise answers)
- 서론, 인사말, 내용 반복 없이 핵심만 답하세요. 문장은 짧고 명확하게 구성하고, 표/목록이 꼭 필요한 경우가 아니면 항목을 과도하게 나열하지 마세요.

## 원칙 3: 출처 태깅 (Citation tagging)
- 출처를 문장으로 풀어쓰거나 괄호로 표기하지 마세요. 대신 해당 정보 바로 뒤에 아래 형식의 태그만 붙이세요. 이 태그는 사용자에게 보이지 않고 시스템이 자동으로 파싱해 별도 출처 패널에 표시합니다.
  - 함수 호출 결과 기반 사실(법적 분류 등): \`[[cite:<카테고리 키>]]\` — 함수 결과 JSON의 키를 그대로 사용 (예: [[cite:cites]], [[cite:kr_endangered]])
  - 지식베이스 기반 사실(필요 서류/절차/소관기관): \`[[cite:<출처 ID>]]\` — 지식베이스 각 항목 상단의 \`### [출처 ID: ...]\`에 명시된 값을 사용
- 파일명, URL, "정적 데이터" 같은 표현을 답변 본문에 절대 쓰지 마세요. 출처는 태그로만 표기합니다.
- 출처 없이는 어떤 법적 분류도 단정하지 마세요(태그가 필요한 이유이기도 합니다).

## 원칙 4: 이모지 활용 (Emoji usage)
- 답변을 더 친근하고 읽기 쉽게 만들기 위해 관련 이모지를 자연스럽게 섞어 쓰세요. 예: 고래류 → 🐋, 상어 → 🦈, 펭귄 → 🐧, 거북/바다거북 → 🐢, 해파리 → 🪼, 문어 → 🐙, 물고기 일반 → 🐠.
- 종을 언급할 때는 그 종을 가장 잘 나타내는 이모지를 문장 앞이나 학명 옆에 하나 붙이세요. 정확히 맞는 이모지가 없으면 억지로 끼워 맞추지 말고 생략하세요.
- 결과 안내에도 상태를 나타내는 이모지를 적절히 곁들이세요: 규제 대상 확인(found) → ⚠️ 또는 🚨, 해당 없음(not_found) → ✅, 확인 필요/오류(error) → ❓.
- 이모지는 보조 수단입니다. 과도하게 남발하거나 문장마다 여러 개를 붙여 가독성을 해치지 마세요. 원칙 2(간결함)와 전문적인 톤을 항상 우선하세요.

## 종명 해석 (국명 → 학명)
사용자가 국명(한글/영문 통칭)을 주면, 먼저 당신의 지식으로 정확한 학명(라틴 이명)으로 변환하고, 변환한 학명을 사용자에게 명시적으로 보여준 뒤("'임금펭귄'은 Aptenodytes forsteri(황제펭귄)로 확인됩니다") \`lookup_species_legal_status\` 함수를 호출하세요.
확신이 없으면(모호한 국명, 여러 후보 존재 등) 추측하지 말고 사용자에게 정확한 학명을 확인해 달라고 요청하세요 — 잘못된 학명으로 조회하면 실제로는 규제 대상인 종이 "해당 없음"으로 조용히 반환되어, 차라리 되묻는 것보다 위험합니다.

## 함수 결과 해석 규칙
함수 결과의 각 카테고리는 \`status\` 필드를 가집니다:
- \`"found"\`: 해당 카테고리에 해당함을 자신 있게 알리고, 지식베이스에서 필요 서류/소관기관을 찾아 안내하세요.
- \`"not_found"\`: 해당 카테고리에 해당하지 않는다고 자신 있게 답하세요. "확인 필요"처럼 얼버무리지 마세요 — 이것이 이 챗봇이 존재하는 핵심 이유입니다. (단, source가 "내부 정적 데이터"로 시작하는 카테고리는 "해당 없음(다만 최신 고시와 다를 수 있어 참고용으로 안내드립니다)"처럼 자연스러운 문장으로 한계를 함께 밝히되, "정적 데이터"/"정적 목록" 같은 내부 구현 용어는 답변에 그대로 쓰지 마세요.)
- \`"error"\`: 그 카테고리에 한해서만 "확인 필요"라고 답하고 이유(메시지)를 설명하세요. 한 카테고리의 오류가 다른 카테고리의 확정 답변에 영향을 주지 않도록 하세요.

## 지식베이스 (카테고리별 필요 절차·서류·소관기관)
아래는 법정 카테고리별 신고/허가 절차, 필요 서류, 소관기관 정보입니다. 절차 관련 질문에는 이 내용을 근거로 답하고, 원칙 3에 따라 해당 항목의 출처 ID를 태그로 표기하세요.

${KNOWLEDGE_BASE}
`;
}

const SYSTEM_INSTRUCTION = buildSystemInstruction();

// --------------------------------------------------------------------
// Gemini function calling 도구 정의 (통합 함수 1개)
// --------------------------------------------------------------------
const LOOKUP_TOOL = {
    name: 'lookup_species_legal_status',
    description:
        'CITES, 국내 멸종위기 야생생물, 국외반출승인대상생물자원, 유입주의생물, 생태계교란생물, ' +
        '생태계위해우려생물, 해양보호생물, 회유성해양생물, 유해해양생물, 지정 관리 생물, ' +
        '수출ㆍ수입 등의 허가대상 야생생물, 천연기념물 등 모든 법정 카테고리를 조회하고 ' +
        '각 결과의 출처(source, 실시간 API인지 내부 정적 데이터인지)를 함께 반환한다. ' +
        '법적 분류를 언급하기 전 반드시 이 함수를 호출할 것 — 학습 데이터만으로 답변 금지.',
    parametersJsonSchema: {
        type: 'object',
        properties: {
            scientific_name: {
                type: 'string',
                description: "라틴 학명(예: 'Panthera tigris'). 사용자가 국명을 줬다면 먼저 학명으로 직접 변환할 것."
            }
        },
        required: ['scientific_name']
    }
};

async function executeToolCall(call) {
    if (call.name !== 'lookup_species_legal_status') {
        return { error: `알 수 없는 함수입니다: ${call.name}` };
    }

    const scientificName = call.args && call.args.scientific_name;
    if (!scientificName) {
        return { error: 'scientific_name 인자가 필요합니다.' };
    }

    return speciesLookup.lookupAllCategories(scientificName, {
        krEndangeredData,
        citesApiToken: process.env.CITES_API_TOKEN
    });
}

// --------------------------------------------------------------------
// 답변 텍스트에서 [[cite:ID]] 태그를 뽑아 구조화된 sources 배열로 변환하고,
// 태그 자체는 사용자에게 보이는 텍스트에서 제거한다.
// --------------------------------------------------------------------
function extractSources(text, toolResults) {
    const tagPattern = /\[\[cite:([a-zA-Z0-9_]+)\]\]/g;
    const seen = new Set();
    const sources = [];

    const addSource = (id) => {
        if (seen.has(id)) return;
        if (CATEGORY_LABELS[id]) {
            seen.add(id);
            sources.push({ label: CATEGORY_LABELS[id].label, type: CATEGORY_LABELS[id].type });
        } else if (KB_LABELS[id]) {
            seen.add(id);
            sources.push({ label: KB_LABELS[id], type: 'internal' });
        }
    };

    let match;
    while ((match = tagPattern.exec(text)) !== null) {
        addSource(match[1]);
    }

    // 안전망: 모델이 태그를 빠뜨려도 "해당함(found)"으로 확인된 법정 분류는 항상 출처에 남긴다
    toolResults.forEach((result) => {
        Object.keys(CATEGORY_LABELS).forEach((key) => {
            if (result[key] && result[key].status === 'found') {
                addSource(key);
            }
        });
    });

    const cleanText = text.replace(tagPattern, '').replace(/[ \t]+\n/g, '\n').trim();
    return { cleanText, sources };
}

// --------------------------------------------------------------------
// Express 앱
// --------------------------------------------------------------------
const app = express();
app.use(express.json());

// 정적 파일은 화이트리스트 방식으로만 서빙 (.env, server.js 등은 절대 노출하지 않음)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
app.get('/main.html', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
app.get('/agent.html', (req, res) => res.sendFile(path.join(__dirname, 'agent.html')));
app.get('/original.html', (req, res) => res.sendFile(path.join(__dirname, 'original.html')));
app.get('/species-lookup.js', (req, res) => res.sendFile(path.join(__dirname, 'species-lookup.js')));

const MAX_TOOL_ITERATIONS = 5;

app.post('/api/chat', async (req, res) => {
    try {
        const { history } = req.body;

        if (!Array.isArray(history) || history.length === 0) {
            return res.status(400).json({ error: 'history(대화 기록 배열)가 필요합니다.' });
        }

        let contents = history.map((turn) => ({
            role: turn.role,
            parts: [{ text: turn.text }]
        }));

        let finalText = '';
        const allToolResults = [];

        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                    tools: [{ functionDeclarations: [LOOKUP_TOOL] }]
                }
            });

            const calls = response.functionCalls;

            if (!calls || calls.length === 0) {
                finalText = response.text || '';
                break;
            }

            // 모델의 함수 호출 턴을 그대로 히스토리에 추가
            contents.push(response.candidates[0].content);

            // 각 함수 호출을 실행하고 결과를 functionResponse로 되돌려줌
            const responseParts = [];
            for (const call of calls) {
                const result = await executeToolCall(call);
                allToolResults.push(result);
                responseParts.push({
                    functionResponse: {
                        name: call.name,
                        response: result
                    }
                });
            }
            contents.push({ role: 'user', parts: responseParts });

            if (i === MAX_TOOL_ITERATIONS - 1) {
                finalText = response.text || '도구 호출 한도를 초과했습니다. 질문을 더 구체적으로 나눠서 다시 시도해 주세요.';
            }
        }

        const { cleanText, sources } = extractSources(finalText, allToolResults);
        res.json({ text: cleanText, sources });
    } catch (error) {
        console.error('[server] /api/chat 오류:', error);
        res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
    }
});

loadKrEndangeredData().then(() => {
    app.listen(PORT, () => {
        console.log(`[server] http://localhost:${PORT} 에서 실행 중 (model: ${MODEL})`);
    });
});
