import { useState } from 'react';
import styled from 'styled-components';
import { X, Loader2 } from 'lucide-react';
import { geocodePlace } from '../api';

const Backdrop = styled.div`
  position: absolute; inset: 0; background: rgba(12,33,41,0.55);
  display: flex; align-items: flex-end; z-index: 1000;
`;
const Sheet = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.parchmentSoft};
  border-radius: 24px 24px 0 0;
  padding: 20px 20px 28px;
  max-height: 82%;
  overflow-y: auto;
`;
const Head = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
  h2 { font-family: ${({ theme }) => theme.font.display}; font-size: 17px; margin: 0; color: ${({ theme }) => theme.colors.ink}; }
  button { color: ${({ theme }) => theme.colors.inkSoft}; }
`;
const Field = styled.div`
  margin-bottom: 14px;
  label { display: block; font-size: 12px; color: ${({ theme }) => theme.colors.inkSoft}; margin-bottom: 6px; }
  input, textarea {
    width: 100%; padding: 10px 12px;
    border: 1px solid ${({ theme }) => theme.colors.line};
    border-radius: 10px; font-size: 14px; background: #fff;
    color: ${({ theme }) => theme.colors.ink};
  }
  textarea { min-height: 80px; resize: vertical; }
`;
const Hint = styled.p`
  font-size: 11px; color: ${({ theme }) => theme.colors.sage}; margin: -8px 0 14px;
`;
const GeoRow = styled.div`
  display: flex; gap: 8px; align-items: center; font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
  span.coord { font-family: ${({ theme }) => theme.font.mono}; color: ${({ theme }) => theme.colors.rust}; }
`;
const SubmitBtn = styled.button`
  width: 100%; margin-top: 6px; padding: 13px; border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary}; color: #fff;
  font-weight: 600; font-size: 14px;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

export default function AddMemoryModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [story, setStory] = useState('');
  const [coords, setCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const handleFindLocation = async () => {
    if (!place.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    try {
      const result = await geocodePlace(place);
      if (!result) setGeoError('위치를 찾지 못했습니다. 조금 더 구체적으로 적어주세요.');
      else setCoords(result);
    } catch {
      setGeoError('위치 조회 중 문제가 발생했습니다.');
    } finally {
      setGeoLoading(false);
    }
  };

  const canSave = title.trim() && story.trim() && coords;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ title, place, story, lat: coords.lat, lng: coords.lng });
  };

  return (
    <Backdrop onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <Head>
          <h2>기억 남기기</h2>
          <button onClick={onClose}><X size={20} /></button>
        </Head>
        <Field>
          <label>제목</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 자양면 옛 마을터" />
        </Field>
        <Field>
          <label>고향 지명</label>
          <input
            value={place}
            onChange={(e) => { setPlace(e.target.value); setCoords(null); }}
            placeholder="예: 경북 영천 자양면"
          />
        </Field>
        <Hint>지명을 입력하면 지도 위 정확한 위치로 자동 변환됩니다.</Hint>
        <GeoRow style={{ marginBottom: 14 }}>
          <SubmitBtn
            type="button"
            style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }}
            onClick={handleFindLocation}
            disabled={!place.trim() || geoLoading}
          >
            {geoLoading ? <Loader2 size={14} /> : '위치 찾기'}
          </SubmitBtn>
          {coords && <span className="coord">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>}
          {geoError && <span style={{ color: '#A63D2F' }}>{geoError}</span>}
        </GeoRow>
        <Field>
          <label>이야기</label>
          <textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="이곳에 얽힌 추억을 자유롭게 적어주세요" />
        </Field>
        <SubmitBtn disabled={!canSave} onClick={handleSave}>지도에 기록하기</SubmitBtn>
      </Sheet>
    </Backdrop>
  );
}