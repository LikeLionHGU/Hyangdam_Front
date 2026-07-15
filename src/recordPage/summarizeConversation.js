const SUMMARY_PROMPT = `너는 어르신의 구술 기억을 문학적이면서도 따뜻하게 정리하는 편집자야.
아래에 지금까지의 대화가 사용자 답변(user) / AI 후속질문(assistant)이 번갈아 담겨 있어.
사용자가 남긴 이야기를 3~4문장의 회고 카드 문구로 다듬어. 조건:
- 1인칭으로 (사용자 시점)
- 감각적 디테일(냄새, 소리, 계절, 사람)을 살리되 과장하지 말 것
- AI가 던진 질문은 절대 포함하지 마
- 반드시 JSON 하나만 출력: {"text": "회고 문구"}`;

function toOpenAIMessages(history) {
  const messages = [{ role: "system", content: SUMMARY_PROMPT }];
  for (const turn of history) {
    const text = turn.parts?.[0]?.text || "";
    if (!text) continue;
    messages.push({
      role: turn.role === "model" ? "assistant" : "user",
      content: text,
    });
  }
  return messages;
}

export async function summarizeConversation(history) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("VITE_OPENAI_API_KEY가 없어요");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: toOpenAIMessages(history),
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    throw new Error(`요약 API 오류 (${response.status})`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("요약 응답이 비어있어요");

  try {
    return JSON.parse(raw).text || "";
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(raw.slice(start, end + 1)).text || "";
      } catch {}
    }
    return raw.trim();
  }
}