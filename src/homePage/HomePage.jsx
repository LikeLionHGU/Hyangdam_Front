import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import WeekStrip from './component/WeekStrip';
import MapPreview from './component/MapPreview';
import MemoryActionCard from './component/MemoryActionCard';
import { PHOTO_STORAGE_KEY, PHOTO_ID_KEY, PHOTO_RESULT_KEY, PHOTO_VIDEO_KEY, PHOTO_ANIM_KEY } from '../photoPage/PhotoPage';
import { fileToDataUrl } from '../photoPage/colorize';
import { addPhotoToGallery } from '../galleryPage/galleryStore';

const Wrap = styled.div`
  padding: 0 16px 24px;
  position: relative;
  height: 100%;
`;
const Head = styled.div`
  padding-top: 64px;
  margin-bottom: 38px;

  h1 {
    font-size: 26px;
    font-weight: 600;
    line-height: 34px;
    letter-spacing: -0.52px;
    color: #5C5C5C;
    margin: 0;
    white-space: pre-line;
  }
`;

const CardRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 13px;
`;

export default function HomePage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [selected, setSelected] = useState(new Date());

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      sessionStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
      // 이전 사진의 변환 결과·영상 기록 초기화
      sessionStorage.removeItem(PHOTO_RESULT_KEY);
      sessionStorage.removeItem(PHOTO_VIDEO_KEY);
      sessionStorage.removeItem(PHOTO_ANIM_KEY);
      const item = await addPhotoToGallery(dataUrl);
      sessionStorage.setItem(PHOTO_ID_KEY, item.id);
      navigate('/photo');
    } catch {
      alert('사진을 불러오지 못했어요. 다른 사진으로 시도해주세요.');
    }
  };

  return (
    <Wrap>
      <Head>
        <h1>{'잊지 않고 싶은\n추억은 무엇인가요?'}</h1>
      </Head>

      <WeekStrip selected={selected} onSelect={setSelected} />

      <MapPreview />

      <CardRow>
        <MemoryActionCard variant="photo" onClick={() => fileRef.current?.click()} />
        <MemoryActionCard variant="write" onClick={() => navigate('/record')} />
      </CardRow>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoFile} />
    </Wrap>
  );
}