// 흑백 사진 컬러 복원 — 로컬 백엔드(server/index.js)를 통해
// OpenAI gpt-image-1 이미지 편집 API로 자연스러운 색을 입힌다.
// 백엔드 실행: npm run server

const MAX_SIZE = 1600; // 업로드 전 긴 변 기준 축소 (전송량·sessionStorage 용량 대비)

// 파일을 dataURL로 읽되, 너무 크면 축소해서 JPEG로 변환
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러오지 못했습니다'));
    };
    img.src = url;
  });
}

// 사진이 흑백(세피아 같은 단색조 포함)인지 판별한다. API 호출 없이 픽셀 분석만 사용.
// 애매하면 true(흑백 취급)를 돌려 기존 '컬러로 변환' 흐름을 유지한다.
export function isMonochromePhoto(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const N = 64; // 판별용 저해상도 샘플
      const scale = N / Math.max(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let chromaSum = 0;
      let n = 0;
      const hues = [];
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const c = max - min; // 채도(chroma)
        chromaSum += c;
        n += 1;
        if (c > 12) {
          let h;
          if (max === r) h = ((g - b) / c + 6) % 6;
          else if (max === g) h = (b - r) / c + 2;
          else h = (r - g) / c + 4;
          hues.push(h * 60);
        }
      }

      // 실측 기준: 흑백 인화 사진(색 바램 포함)은 채도 10~19, 컬러 사진은 46 이상
      const meanChroma = chromaSum / n;
      if (meanChroma < 25) return resolve(true); // 흑백·빛바랜 단색조
      if (hues.length / n < 0.05) return resolve(true); // 유채색 픽셀이 거의 없음

      // 색조(hue)가 한 방향에 몰려 있으면 세피아 같은 단색조로 판정
      // (흑백 인화 촬영본 0.92+, 실제 컬러 사진 0.5~0.6대)
      let sx = 0, sy = 0;
      hues.forEach((h) => {
        sx += Math.cos((h * Math.PI) / 180);
        sy += Math.sin((h * Math.PI) / 180);
      });
      const concentration = Math.sqrt(sx * sx + sy * sy) / hues.length; // 1에 가까울수록 단색조
      resolve(concentration > 0.85);
    };
    img.onerror = () => resolve(true); // 판별 실패 시 기존 흐름 유지
    img.src = dataUrl;
  });
}

// dataURL을 축소·압축 (sessionStorage 저장용 — 원본 PNG는 용량 초과 위험)
export function compressDataUrl(dataUrl, maxSize = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
    img.src = dataUrl;
  });
}

// 영상 생성 입력 규격(720x1280 세로 / 1280x720 가로)에 맞춰 사진을 크롭
export function frameForVideo(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const portrait = img.naturalHeight >= img.naturalWidth;
      const W = portrait ? 720 : 1280;
      const H = portrait ? 1280 : 720;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        orientation: portrait ? 'portrait' : 'landscape',
      });
    };
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
    img.src = dataUrl;
  });
}

// 사진 → 짧은 영상 생성 시작. 작업 id를 돌려준다.
export async function createAnimation(dataUrl, orientation) {
  let res;
  try {
    res = await fetch('/api/animate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, orientation }),
    });
  } catch {
    throw new Error('변환 서버에 연결할 수 없어요. 터미널에서 npm run server 를 실행해주세요.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.id) {
    throw new Error(data?.message || '영상 변환 중 오류가 발생했습니다.');
  }
  return { id: data.id };
}

// 영상 생성 상태 조회 → { status, progress?, url?, message? }
export async function getAnimationStatus(id) {
  const res = await fetch(`/api/animate/${id}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || '영상 상태 조회 중 오류가 발생했습니다.');
  }
  return data;
}

// 사진 속 텍스트·랜드마크·풍경으로 장소 추정 → { texts, candidates: [검색어...] }
export async function detectPlaceFromImage(dataUrl) {
  let res;
  try {
    res = await fetch('/api/detect-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
  } catch {
    throw new Error('변환 서버에 연결할 수 없어요. 터미널에서 npm run server 를 실행해주세요.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || '장소 인식 중 오류가 발생했습니다.');
  }
  const candidates = data.candidates || (data.placeQuery ? [data.placeQuery] : []);
  return { texts: data.texts || [], candidates };
}

export async function colorizeImage(dataUrl) {
  let res;
  try {
    res = await fetch('/api/colorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl }),
    });
  } catch {
    throw new Error('변환 서버에 연결할 수 없어요. 터미널에서 npm run server 를 실행해주세요.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.image) {
    throw new Error(data?.message || '이미지 컬러화 중 오류가 발생했습니다.');
  }
  return data.image;
}
