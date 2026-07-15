const SUMMARY_PROMPT = `너는 어르신의 구술 기억을 문학적이면서도 따뜻하게 정리하는 편집자야.
아래에 지금까지의 대화가 사용자 답변(user) / AI 후속질문(model)이 번갈아 담겨 있어.
사용자가 남긴 이야기를 3~4문장의 회고 카드 문구로 다듬어. 조건:
- 1인칭으로 (사용자 시점)
- 감각적 디테일(냄새, 소리, 계절, 사람)을 살리되 과장하지 말 것
- AI가 던진 질문은 절대 포함하지 마
- 반드시 JSON 하나만 출력: {"text": "회고 문구"}
`;

export async function summarizeConversation(history) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY가 없어요");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SUMMARY_PROMPT }] },
      contents: history,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.6,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`요약 API 오류 (${response.status})`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("요약 응답이 비어있어요");

  try {
    return JSON.parse(raw).text || "";
  } catch {
    // 파싱 실패 시 원문에서 첫 { ~ } 블록 추출 재시도
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(raw.slice(start, end + 1)).text || "";
      } catch {}
    }
    return raw.trim(); // 완전히 실패하면 원문 그대로
  }
}