const BASE_SYSTEM_PROMPT = `너는 경상북도 수몰/개발로 사라진 마을에 대한 어르신의 구술 기억을 채록하는 AI 인터뷰어야.
지금까지의 대화 맥락을 참고해서, 사용자의 가장 최근 답변을 분석해 아래 JSON 형식으로만 답해.
반드시 유효한 단일 JSON 객체 하나만 출력하고, 앞뒤에 어떤 텍스트나 코드블록(\`\`\`) 표기도 붙이지 마.

{
  "keywords": ["문자열", "문자열", "문자열"],
  "followUpQuestion": "직전 답변 내용을 바탕으로 이어지는 구체적인 후속 질문 (이전 질문과 겹치지 않게)",
  "addressGuess": "지금까지의 대화 전체에서 추정되는 행정구역/지명. 단서가 부족하면 빈 문자열",
  "confidence": 0.0에서 1.0 사이 숫자
}

keywords는 이번 답변에서 3~4개, 명사 위주. followUpQuestion은 반드시 직전 답변 내용과 직접 연결. addressGuess는 실제 행정구역명이 대화에 없으면 지어내지 말고 빈 문자열.`;

function extractJsonLoose(raw) {
  if (!raw) return null;
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

  const start = text.indexOf("{");
  if (start === -1) return null;

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
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  // 닫는 } 없이 잘린 응답 → 지금까지 열린 만큼 닫아서 시도
  return text.slice(start) + "}".repeat(Math.max(depth, 0));
}

export async function analyzeWithGPT(history, options = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았어요 (.env 확인 후 dev 서버 재시작 필요)");
  }

  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (options.rejectedAddresses?.length) {
    systemPrompt +=
      `\n\n[중요 지시] 이전에 사용자가 "${options.rejectedAddresses.join(", ")}" 이(가) 아니라고 명시했어. ` +
      `이번 followUpQuestion은 반드시 위치를 좁힐 수 있는 구체적 단서(근처 랜드마크, 지명, 방향, 하천/산 이름, 학교/시장 이름 등)를 하나만 콕 집어서 물어봐. ` +
      `그리고 addressGuess는 이전 후보와 반드시 달라야 하며, 확실치 않으면 빈 문자열로 둬.`;
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
      systemInstruction: { parts: [{ text: systemPrompt }] },
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
    const cleaned = extractJsonLoose(raw);
    if (cleaned) {
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = null;
      }
    }
  }

  // 완전히 파싱 실패 → 응답 텍스트를 followUpQuestion으로 재조립 (완전 실패 방지)
  if (!parsed) {
    console.warn("Gemini JSON 파싱 실패, 원문을 후속질문으로 사용:", raw);
    parsed = {
      keywords: [],
      followUpQuestion: raw.trim().slice(0, 200),
      addressGuess: "",
      confidence: 0,
    };
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