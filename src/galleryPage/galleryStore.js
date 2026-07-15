// 추억 갤러리 저장소 (localStorage)
// item: { id, type: 'photo' | 'video' | 'text',
//         image?(대표 이미지), original?(원본), colored?(컬러 변환 여부), video?, text?, createdAt }

const KEY = 'hyangdam_gallery';

export function loadGallery() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function saveGallery(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// localStorage 용량(약 5MB)을 아끼기 위해 저장 전 축소·압축
const MAX_SIZE = 900;

function compressImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
    img.src = dataUrl;
  });
}

export function removeGalleryItem(id) {
  saveGallery(loadGallery().filter((item) => item.id !== id));
}

export async function addPhotoToGallery(dataUrl) {
  const image = await compressImage(dataUrl);
  const item = {
    id: `${Date.now()}`,
    type: 'photo',
    image,
    original: image,
    colored: false,
    createdAt: Date.now(),
  };
  saveGallery([item, ...loadGallery()]);
  return item;
}

// 컬러 변환/영상 변환 후 저장 시, 업로드 때 등록된 항목을 갱신
// 원본(original)은 유지하고 대표 이미지를 교체한다.
// colored: 컬러 '변환'을 거친 경우에만 true (원래 컬러였던 사진은 false 유지)
export async function updateGalleryPhoto(id, dataUrl, videoUrl = null, { colored = true } = {}) {
  const image = await compressImage(dataUrl);
  const patch = {
    image,
    ...(colored ? { colored: true } : {}),
    ...(videoUrl ? { type: 'video', video: videoUrl } : {}),
  };
  const list = loadGallery();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) {
    const item = { id: `${Date.now()}`, type: 'photo', original: image, ...patch, createdAt: Date.now() };
    saveGallery([item, ...list]);
    return item;
  }
  // 예전 구조 항목(원본 미보관)은 덮어쓰기 전의 이미지를 원본으로 보존
  const original = list[idx].original || list[idx].image;
  list[idx] = { ...list[idx], original, ...patch };
  saveGallery(list);
  return list[idx];
}

// 갤러리에 텍스트 저장 함수 
export function addTextToGallery({ text, place, lat, lng }) {
  const item = {
    id: `${Date.now()}`,
    type: 'text',
    text,
    place,
    lat,
    lng,
    createdAt: Date.now(),
  };
  saveGallery([item, ...loadGallery()]);
  return item;
}
