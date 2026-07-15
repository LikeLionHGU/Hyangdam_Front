export const DUMMY_CASES = [
    {
      id: "case-imgok",
      match: ["임곡리", "댐", "수몰"],
      response: {
        locationHint: "경북 포항시 기계면 임곡리 인근으로 추정돼요",
        keywords: ["고향집", "저수지", "느티나무"],
        followUpQuestion: "그 느티나무는 마을 어디쯤에 있었어요?",
        lat: 36.079,
        lng: 129.271,
        address: "경상북도 포항시 기계면 임곡리",
        confidence: 0.86,
      },
    },
    {
      id: "case-school",
      match: ["학교", "운동장", "친구"],
      response: {
        locationHint: "포항시 북구 흥해읍의 옛 초등학교 인근으로 추정돼요",
        keywords: ["운동장", "친구", "등굣길"],
        followUpQuestion: "그 친구 집은 학교에서 어느 쪽으로 가야 했어요?",
        lat: 36.101,
        lng: 129.349,
        address: "경상북도 포항시 북구 흥해읍",
        confidence: 0.79,
      },
    },
    {
      id: "case-market",
      match: ["장터", "시장", "장날"],
      response: {
        locationHint: "안동 지역 옛 장터 인근으로 추정돼요",
        keywords: ["장날", "국밥", "이웃"],
        followUpQuestion: "장날에는 주로 몇 시쯤 장에 나가셨어요?",
        lat: 36.568,
        lng: 128.729,
        address: "경상북도 안동시",
        confidence: 0.74,
      },
    },
  ];
  
  const DEFAULT_CASE = {
    locationHint: "말씀 속에서 정확한 장소를 특정하기 어려워요",
    keywords: [],
    followUpQuestion: "그때 계절은 언제쯤이었어요?",
    lat: null,
    lng: null,
    address: "",
    confidence: 0.2,
  };
  
  export function mockAnalyze(text) {
    const hit = DUMMY_CASES.find((c) =>
      c.match.some((keyword) => text.includes(keyword))
    );
    return hit ? hit.response : DEFAULT_CASE;
  }
  