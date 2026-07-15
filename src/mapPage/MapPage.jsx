import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useKakaoLoader } from './component/useKakaoLoader';
import { loadMemories, addMemory, seedMemories } from './api';
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
const DetailCard = styled.div`
  position: absolute; left: 12px; right: 12px; bottom: 18px;
  background: #fff; border-radius: 16px; padding: 16px 18px;
  box-shadow: ${({ theme }) => theme.shadow.card}; z-index: 400;
  h3 { font-size: 16px; font-weight: 700; margin: 0 0 2px; color: ${({ theme }) => theme.colors.ink}; }
  .place { font-size: 11px; color: ${({ theme }) => theme.colors.inkSoft}; margin-bottom: 8px; }
  p { font-size: 13px; line-height: 1.6; color: ${({ theme }) => theme.colors.inkSoft}; margin: 0; }
  button.close { position: absolute; top: 12px; right: 12px; color: ${({ theme }) => theme.colors.inkSoft}; }
`;

function pinHtml(index) {
  return `
    <div style="
      display:flex;flex-direction:column;align-items:center;gap:4px;
      cursor:pointer;
    ">
      <div style="
        width:12px;height:12px;border-radius:50%;background:#fff;
        box-shadow:0 1px 4px rgba(0,0,0,0.35);
      "></div>
      <div style="
        color:#fff;font-weight:500;font-size:14px;line-height:1;
        text-shadow:0 1px 3px rgba(0,0,0,0.45);
      ">${index}</div>
    </div>
  `;
}

export default function MapPage() {
  const { loaded, error } = useKakaoLoader();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [memories, setMemories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const stored = loadMemories();
    setMemories(stored && stored.length ? stored : seedMemories);
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

    memories.forEach((m, i) => {
      const el = document.createElement('div');
      el.innerHTML = pinHtml(i + 1);
      el.addEventListener('click', () => setSelected(m));
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(m.lat, m.lng),
        content: el,
        yAnchor: 0.2,
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    });
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
      {selected && (
        <DetailCard>
          <button className="close" onClick={() => setSelected(null)}><X size={16} /></button>
          <h3>{selected.title}</h3>
          <div className="place">{selected.place}</div>
          <p>{selected.story}</p>
        </DetailCard>
      )}
      {showAdd && <AddMemoryModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
    </Wrap>
  );
}