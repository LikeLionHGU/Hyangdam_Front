// 추억 갤러리 저장소 (localStorage)
// item: { id, type: 'photo' | 'video' | 'text', image?, video?, text?, createdAt }

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

export async function addPhotoToGallery(dataUrl) {
  const image = await compressImage(dataUrl);
  const item = { id: `${Date.now()}`, type: 'photo', image, createdAt: Date.now() };
  saveGallery([item, ...loadGallery()]);
  return item;
}

// 컬러 변환/영상 변환 후 저장 시, 업로드 때 등록된 항목을 갱신
// videoUrl이 있으면 영상 항목이 되고 image는 포스터로 쓰인다.
export async function updateGalleryPhoto(id, dataUrl, videoUrl = null) {
  const image = await compressImage(dataUrl);
  const patch = videoUrl ? { image, type: 'video', video: videoUrl } : { image };
  const list = loadGallery();
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) {
    const item = { id: `${Date.now()}`, type: 'photo', ...patch, createdAt: Date.now() };
    saveGallery([item, ...list]);
    return item;
  }
  list[idx] = { ...list[idx], ...patch };
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
