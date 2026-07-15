import { useEffect, useState } from 'react';

const SCRIPT_ID = 'kakao-map-sdk';

export function useKakaoLoader() {
  const [state, setState] = useState({ loaded: false, error: null });
  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!appKey) {
      setState({ loaded: false, error: 'NO_KEY' });
      return;
    }
    if (window.kakao?.maps) {
      setState({ loaded: true, error: null });
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => {
        window.kakao.maps.load(() => setState({ loaded: true, error: null }));
      });
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.onload = () => {
      window.kakao.maps.load(() => setState({ loaded: true, error: null }));
    };
    script.onerror = () => setState({ loaded: false, error: 'LOAD_FAILED' });
    document.head.appendChild(script);
  }, [appKey]);

  return state;
}