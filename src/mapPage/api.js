// 지명을 위경도로 변환. AI 연동 시 LLM이 추출한 지명 텍스트를 그대로 넘기면 됩니다.
// AI가 추정한 주소는 실제 행정구역명과 다를 수 있어(예: '북구' 누락, 수몰로 사라진 리),
// 못 찾으면 주소를 뒤에서부터 한 단계씩 줄여가며(리→면→시) 재시도한다.
export async function geocodePlace(placeText) {
  if (!window.kakao?.maps?.services) {
    throw new Error('카카오맵이 아직 로드되지 않았습니다.');
  }
  const { services } = window.kakao.maps;

  const byAddress = (query) =>
    new Promise((resolve) => {
      new services.Geocoder().addressSearch(query, (data, status) => {
        resolve(
          status === services.Status.OK && data.length
            ? { lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) }
            : null
        );
      });
    });

  const byKeyword = (query) =>
    new Promise((resolve) => {
      new services.Places().keywordSearch(query, (data, status) => {
        resolve(
          status === services.Status.OK && data.length
            ? { lat: parseFloat(data[0].y), lng: parseFloat(data[0].x) }
            : null
        );
      });
    });

  const tokens = placeText.trim().split(/\s+/);
  const queries = [];
  // 전체 → 마지막 단어를 하나씩 제거 (단, 지역 오인 방지를 위해 최소 2단어까지만)
  for (let n = tokens.length; n >= Math.min(2, tokens.length); n--) {
    queries.push(tokens.slice(0, n).join(' '));
  }

  for (const query of queries) {
    const hit = (await byAddress(query)) || (await byKeyword(query));
    if (hit) return hit;
  }
  return null;
}

// 키워드로 장소 후보 여러 건 검색 (이름·주소·좌표)
export function searchPlaces(keyword) {
  return new Promise((resolve) => {
    if (!window.kakao?.maps?.services || !keyword?.trim()) {
      resolve([]);
      return;
    }
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(keyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK && data.length) {
        resolve(
          data.slice(0, 5).map((d) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat: parseFloat(d.y),
            lng: parseFloat(d.x),
          }))
        );
      } else {
        resolve([]);
      }
    });
  });
}

const STORAGE_KEY = 'shine_memories_v1';

export function loadMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMemories(memories) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('로컬스토리지 저장 실패', e);
  }
}

// 사진 삭제 시 연결된 지도 핀도 함께 정리
export function removeMemoryByPhotoId(photoId) {
  const current = loadMemories() || [];
  saveMemories(current.filter((m) => m.photoId !== photoId));
}

export function addMemory(memory) {
  const current = loadMemories() || [];
  const next = [...current, { ...memory, id: crypto.randomUUID(), createdAt: Date.now() }];
  saveMemories(next);
  return next;
}

export const seedMemories = [
  {
    id: 'seed-1',
    title: '자양면 옛 마을터',
    place: '경북 영천 자양면 (영천댐 수몰지)',
    lat: 35.9803,
    lng: 128.9944,
    story: '수몰되기 전 자양초등학교가 있던 자리. 명절이면 그 시절 친구들이 떠오른다.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'seed-2',
    title: '안동댐 수몰마을',
    place: '경북 안동시 (안동댐 수몰지)',
    lat: 36.6098,
    lng: 128.7286,
    story: '집 앞 개울에서 멱을 감던 여름. 지금은 그 자리가 온통 물 아래에 있다.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    id: 'seed-3',
    title: '운문댐 망향정 인근',
    place: '경북 청도 운문면 (운문댐 수몰지)',
    lat: 35.6710,
    lng: 128.9738,
    story: '이주하기 전 마지막으로 걷던 마을 길, 지금도 눈을 감으면 그 흙길이 선명하다.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
  },
];