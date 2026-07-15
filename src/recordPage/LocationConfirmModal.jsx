import { useEffect, useRef, useState } from "react";
import { geocodePlace } from "../mapPage/api";
import "./RecordPage.css";

function ensureKakaoLoaded() {
  return new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_KAKAO_MAP_KEY;
    if (!key) return reject(new Error("VITE_KAKAO_MAP_KEY가 없어요"));

    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      // 이미 완전히 로드된 상태
      if (window.kakao.maps.Map) return resolve(window.kakao);
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }

    const existing = document.getElementById("kakao-map-sdk");
    if (existing) {
      // 다른 페이지가 스크립트를 이미 넣어둔 경우: load 이벤트 대기
      const onReady = () => window.kakao.maps.load(() => resolve(window.kakao));
      if (window.kakao) {
        onReady();
      } else {
        existing.addEventListener("load", onReady);
        existing.addEventListener("error", () => reject(new Error("SDK 로드 실패")));
      }
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => reject(new Error("SDK 로드 실패"));
    document.head.appendChild(script);
  });
}

function LocationConfirmModal({ address, onConfirm, onClose }) {
  const mapContainerRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | ready | error

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    (async () => {
      try {
        const kakao = await ensureKakaoLoaded();
        if (cancelled) return;

        const geo = await geocodePlace(address);
        if (cancelled) return;
        if (!geo) {
          setError("해당 주소를 지도에서 찾지 못했어요");
          setPhase("error");
          return;
        }
        setCoords(geo);

        // 상태 업데이트 후 다음 프레임에 컨테이너가 실제 크기를 가지므로 그때 지도 생성
        requestAnimationFrame(() => {
          const container = mapContainerRef.current;
          if (!container || cancelled) return;
          const center = new kakao.maps.LatLng(geo.lat, geo.lng);
          const map = new kakao.maps.Map(container, { center, level: 4 });
          // 지도 페이지와 동일한 물방울 핀 (가운데 흰 점)
          const pin = document.createElement("div");
          pin.innerHTML = `
            <div style="
              position:relative;width:46px;height:46px;
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
          new kakao.maps.CustomOverlay({
            position: center,
            content: pin,
            yAnchor: 1,
            map,
          });
          // 컨테이너 크기가 뒤늦게 잡혀 지도가 회색으로 나오는 경우 대비
          setTimeout(() => map.relayout(), 100);
          setPhase("ready");
        });
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message);
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const handleConfirm = () => {
    if (!coords) return;
    onConfirm({ address, ...coords });
  };

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal__header">
          <p className="location-modal__title">위치 확인</p>
          <button
            type="button"
            className="location-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="location-modal__map-wrap">
          <div className="location-modal__map" ref={mapContainerRef} />
          {phase === "loading" && (
            <div className="location-modal__overlay-text">지도를 불러오는 중...</div>
          )}
          {phase === "error" && (
            <div className="location-modal__overlay-text location-modal__overlay-text--error">
              {error || "지도 로드 실패"}
            </div>
          )}
        </div>

        <p className="location-modal__question">
          추억이 깃든 공간이<br />이 위치가 맞나요?
        </p>

        <div className="location-modal__actions">
          <button
            type="button"
            className="location-modal__btn location-modal__btn--confirm"
            onClick={handleConfirm}
            disabled={!coords}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationConfirmModal;