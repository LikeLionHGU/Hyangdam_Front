import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useKakaoLoader } from '../../mapPage/component/useKakaoLoader';
import { loadMemories } from '../../mapPage/api';

const Frame = styled.button`
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(173, 192, 248, 0.12);
`;

const MapEl = styled.div`
  width: 100%;
  height: 100%;
  pointer-events: none; /* 미리보기는 조작 불가, 탭만 감지 */
`;

const Empty = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ADADAD;
  font-size: 14px;
  font-weight: 500;
`;

export default function MapPreview() {
  const navigate = useNavigate();
  const { loaded } = useKakaoLoader();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const memories = loadMemories() || [];
  const isEmpty = memories.length === 0;

  useEffect(() => {
    if (isEmpty || !loaded || !containerRef.current || mapRef.current) return;
    const { kakao } = window;
    const memories = loadMemories() || [];

    const center = memories.length
      ? new kakao.maps.LatLng(memories[0].lat, memories[0].lng)
      : new kakao.maps.LatLng(36.15, 128.85);

    const map = new kakao.maps.Map(containerRef.current, {
      center,
      level: 5,          // 동네 수준으로 확대 (숫자 작을수록 확대)
      draggable: false,
      zoomable: false,
    });
    mapRef.current = map;

    memories.forEach((m) => {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width:14px;height:14px;border-radius:50%;
        background:#6C6FE0;border:2px solid #fff;
        box-shadow:0 2px 4px rgba(0,0,0,0.25);
      `;
      new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(m.lat, m.lng),
        content: dot,
        map,
      });
    });
  }, [loaded, isEmpty]);

  return (
    <Frame onClick={() => navigate('/map')} aria-label="추억 지도 전체 보기">
      {isEmpty ? <Empty>등록된 추억이 아직 없습니다</Empty> : <MapEl ref={containerRef} />}
    </Frame>
  );
}