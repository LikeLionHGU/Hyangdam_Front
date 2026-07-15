const SYSTEM_PROMPT = `너는 경상북도 수몰/개발로 사라진 마을에 대한 어르신의 구술 기억을 채록하는 AI 인터뷰어야.
지금까지의 대화 맥락을 참고해서, 사용자의 가장 최근 답변을 분석해 아래 JSON 형식으로만 답해. 반드시 유효한 단일 JSON 객체 하나만 출력하고, 앞뒤에 어떤 텍스트나 코드블록(\`\`\`) 표기도 붙이지 마.

{
  "keywords": ["문자열", "문자열", "문자열"],
  "followUpQuestion": "직전 답변 내용을 바탕으로 이어지는 구체적인 후속 질문 (이전 질문과 겹치지 않게)",
  "addressGuess": "지금까지의 대화 전체에서 추정되는 행정구역/지명. 단서가 부족하면 빈 문자열",
  "confidence": 0.0에서 1.0 사이 숫자
}

keywords는 이번 답변에서 3~4개, 명사 위주. followUpQuestion은 반드시 직전 답변 내용과 직접 연결. addressGuess는 실제 행정구역명이 대화에 없으면 지어내지 말고 빈 문자열.`;

function extractJson(raw) {
  // 코드블록 표기 제거
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  // 첫 { 부터 짝이 맞는 } 까지만 잘라내기 (문자열 안의 중괄호 무시)
  const start = text.indexOf("{");
  if (start === -1) throw new Error("JSON 시작 지점을 찾을 수 없어요");

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  throw new Error("완결된 JSON 객체를 찾을 수 없어요");
}

export async function analyzeWithGPT(history) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았어요 (.env 확인 후 dev 서버 재시작 필요)");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: history,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API 오류 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Gemini 응답에서 텍스트를 찾을 수 없어요");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const cleaned = extractJson(raw);
    parsed = JSON.parse(cleaned);
  }

  return {
    keywords: parsed.keywords || [],
    followUpQuestion: parsed.followUpQuestion || "",
    address: parsed.addressGuess || "",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    lat: 36.079,
    lng: 129.271,
  };
}