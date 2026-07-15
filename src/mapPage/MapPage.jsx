import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, GalleryVerticalEnd } from 'lucide-react';
import { useKakaoLoader } from './component/useKakaoLoader';
import { loadMemories, addMemory } from './api';
import { loadGallery } from '../galleryPage/galleryStore';
import AddMemoryModal from './component/AddMemoryModal';
import MapHeader from './component/MapHeader';

const Wrap = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #F3F7FF;
`;
const MapEl = styled.div` width: 100%; flex: 1; `;
const StatusBanner = styled.div`
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: 32px; text-align: center; color: ${({ theme }) => theme.colors.inkSoft}; font-size: 13px; line-height: 1.6;
`;
// 저장 직후 갤러리로 자연스럽게 이어주는 확인 카드
const SavedBanner = styled.div`
  position: absolute; left: 20px; right: 20px; bottom: 24px; z-index: 500;
  background: #fff; border-radius: 20px; padding: 18px;
  box-shadow: 0 6px 24px rgba(34, 34, 59, 0.18);
  display: flex; flex-direction: column; gap: 12px;

  .title { font-size: 17px; font-weight: 600; color: #5C5C5C; text-align: center; }

  button.go {
    height: 52px; border-radius: 100px;
    background: #8EA5E8; color: #fff;
    font-size: 17px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 14px rgba(142, 165, 232, 0.45);
    transition: transform 0.15s ease;
    &:active { transform: scale(0.97); }
  }

  button.close {
    position: absolute; top: 8px; right: 8px;
    width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
    color: #ADADAD;
  }
`;

const EmptyBanner = styled.div`
  position: absolute; left: 20px; right: 20px; bottom: 24px; z-index: 400;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(8px);
  border-radius: 16px; padding: 16px 18px; text-align: center;
  color: #909090; font-size: 15px; font-weight: 500; line-height: 1.7;
  box-shadow: 0 4px 16px rgba(34, 34, 59, 0.1); white-space: pre-line;
  pointer-events: none;
`;
const DetailCard = styled.div`
  position: absolute; left: 12px; right: 12px; bottom: 18px;
  background: #fff; border-radius: 20px; padding: 18px;
  box-shadow: 0 6px 24px rgba(34, 34, 59, 0.18); z-index: 400;
  display: flex; align-items: center; gap: 14px;

  .thumb {
    flex-shrink: 0; width: 72px; height: 72px;
    border-radius: 14px; object-fit: cover; display: block;
  }
  .info { flex: 1; min-width: 0; padding-right: 24px; }
  h3 { font-size: 18px; font-weight: 700; margin: 0 0 3px; color: #5C5C5C; }
  .place { font-size: 14px; color: #909090; }
  p {
    font-size: 15px; line-height: 1.6; color: #909090; margin: 6px 0 0;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  button.close {
    position: absolute; top: 10px; right: 10px;
    width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
    color: #909090;
  }
`;

// 가운데 흰 점이 있는 물방울 모양 핀
function pinHtml() {
  return `
    <div style="
      position:relative;width:46px;height:46px;cursor:pointer;
      filter:drop-shadow(0 3px 6px rgba(34,34,59,0.35));
    ">
      <div style="
        width:46px;height:46px;border-radius:50% 50% 50% 0;
        background:#8EA5E8;transform:rotate(-45deg);
      "></div>
      <div style="
        position:absolute;top:15.3px;left:16.4px;
        width:13.1px;height:13.1px;border-radius:50%;background:#fff;
      "></div>
    </div>
  `;
}

export default function MapPage() {
  const { loaded, error } = useKakaoLoader();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSaved, setShowSaved] = useState(Boolean(location.state?.justSaved));
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const fittedRef = useRef(false);
  const [memories, setMemories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  // 선택한 추억에 연결된 갤러리 사진 (핀 등록 시 photoId로 연결됨)
  const selectedPhoto = selected?.photoId
    ? (loadGallery().find((g) => g.id === selected.photoId) || null)
    : null;

  useEffect(() => {
    setMemories(loadMemories() || []);
  }, []);

  useEffect(() => {
    if (!loaded || !mapContainerRef.current || mapRef.current) return;
    const { kakao } = window;
    mapRef.current = new kakao.maps.Map(mapContainerRef.current, {
      center: new kakao.maps.LatLng(36.15, 128.85),
      level: 10,
    });
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const { kakao } = window;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    memories.forEach((m) => {
      const el = document.createElement('div');
      el.innerHTML = pinHtml();
      el.addEventListener('click', () => setSelected(m));
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(m.lat, m.lng),
        content: el,
        yAnchor: 1, // 핀 꼬리 끝이 좌표에 오도록
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    });

    // 처음 열릴 때 등록된 핀이 모두 보이도록 지도 범위를 맞춘다
    if (memories.length && !fittedRef.current) {
      fittedRef.current = true;
      const bounds = new kakao.maps.LatLngBounds();
      memories.forEach((m) => bounds.extend(new kakao.maps.LatLng(m.lat, m.lng)));
      mapRef.current.setBounds(bounds, 80);
    }
  }, [loaded, memories]);

  const handleSave = (draft) => {
    const next = addMemory(draft);
    setMemories(next);
    setShowAdd(false);
    if (mapRef.current) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(draft.lat, draft.lng));
    }
  };

  return (
    <Wrap>
      <MapHeader />
      <MapEl ref={mapContainerRef} />
      {!loaded && !error && <StatusBanner>지도를 불러오는 중이에요...</StatusBanner>}
      {error === 'NO_KEY' && (
        <StatusBanner>
          카카오맵 JavaScript 키가 설정되지 않았어요.<br />
          .env 파일에 <code>VITE_KAKAO_MAP_KEY=발급받은키</code> 를 넣어주세요.
        </StatusBanner>
      )}
      {error === 'LOAD_FAILED' && (
        <StatusBanner>
          지도를 불러오지 못했어요.<br />카카오 디벨로퍼스에 등록한 도메인이 맞는지 확인해주세요.
        </StatusBanner>
      )}
      {loaded && memories.length === 0 && (
        <EmptyBanner>{'아직 지도에 남긴 추억이 없어요.\n사진을 저장할 때 장소를 등록해보세요.'}</EmptyBanner>
      )}
      {showSaved && (
        <SavedBanner>
          <button className="close" onClick={() => setShowSaved(false)} aria-label="닫기">
            <X size={20} />
          </button>
          <div className="title">추억이 지도에 저장됐어요!</div>
          <button className="go" onClick={() => navigate('/gallery')}>
            <GalleryVerticalEnd size={20} strokeWidth={2.2} />
            갤러리에서 모아보기
          </button>
        </SavedBanner>
      )}
      {selected && (
        <DetailCard>
          <button className="close" onClick={() => setSelected(null)} aria-label="닫기"><X size={20} /></button>
          {selectedPhoto && <img className="thumb" src={selectedPhoto.image} alt="추억 사진" />}
          <div className="info">
            <h3>{selected.title}</h3>
            <div className="place">{selected.place}</div>
            {selected.story && <p>{selected.story}</p>}
          </div>
        </DetailCard>
      )}
      {showAdd && <AddMemoryModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </Wrap>
  );
}