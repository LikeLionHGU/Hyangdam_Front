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

// 사진 속 간판·표지판 텍스트로 장소 추정 → { texts, placeQuery }
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
  return { texts: data.texts || [], placeQuery: data.placeQuery || null };
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
