import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wand2, Download, Video, X, ImagePlus } from 'lucide-react';
import { colorizeImage, fileToDataUrl, compressDataUrl, frameForVideo, createAnimation, getAnimationStatus, isMonochromePhoto } from './colorize';
import { addPhotoToGallery, updateGalleryPhoto } from '../galleryPage/galleryStore';
import { addMemory } from '../mapPage/api';
import PlacePickerModal from './component/PlacePickerModal';

export const PHOTO_STORAGE_KEY = 'hyangdam_photo';
export const PHOTO_ID_KEY = 'hyangdam_photo_id';
// 뒤로가기로 돌아와도 변환 결과가 유지되도록 세션에 함께 저장
export const PHOTO_RESULT_KEY = 'hyangdam_photo_result';
export const PHOTO_VIDEO_KEY = 'hyangdam_photo_video';
export const PHOTO_ANIM_KEY = 'hyangdam_anim_id'; // 진행 중인 영상 생성 작업 (복귀 시 이어서 확인)

const Wrap = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #F3F7FF;
`;

const Bar = styled.div`
  flex-shrink: 0;
  height: 56px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const IconBtn = styled.button`
  position: absolute;
  left: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5C5C5C;
`;

const Title = styled.span`
  font-size: 15px;
  font-weight: 400;
  line-height: 16.65px;
  color: #5C5C5C;
`;

const PhotoArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  user-select: none;
  -webkit-user-select: none;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }
`;

// 사진을 꾹 누르면 원본이 보인다는 안내 칩
const CompareChip = styled.div`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 9px 18px;
  border-radius: 100px;
  background: rgba(20, 20, 35, 0.45);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.1px;
  pointer-events: none;
  white-space: nowrap;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// 변환·생성 중 사진 위에 덮는 진행 오버레이
const ProgressOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 35, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #fff;
  text-align: center;

  .spinner {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    animation: ${spin} 0.9s linear infinite;
  }

  .main { font-size: 21px; font-weight: 600; }
  .sub { font-size: 15px; opacity: 0.8; line-height: 1.6; white-space: pre-line; }
`;

const EmptyArea = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #909090;
  font-size: 17px;
  font-weight: 500;
  line-height: 1.6;
  white-space: pre-line;

  svg { color: #8EA5E8; }
`;

const Footer = styled.div`
  flex-shrink: 0;
  min-height: 104px;
  padding: 14px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const PillRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 12px;
`;

const Pill = styled.button`
  height: 56px;
  padding: 8px 20px;
  border-radius: 100px;
  background: ${({ $primary }) => ($primary ? '#8EA5E8' : 'rgba(255, 255, 255, 0.75)')};
  color: ${({ $primary }) => ($primary ? '#fff' : '#5C5C5C')};
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 10px rgba(34, 34, 59, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  transition: transform 0.15s ease;

  &.grow { flex: 1; max-width: 200px; }
  &:disabled { opacity: 0.6; }
  &:active:not(:disabled) { transform: scale(0.96); }
`;

const GhostBtn = styled.button`
  font-size: 15px;
  font-weight: 500;
  color: #909090;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

// 변환 진행 중 표시용 알약 (비활성 버튼 대신 산뜻한 진행 표시)
const PillProgress = styled.div`
  height: 56px;
  padding: 8px 28px;
  border-radius: 100px;
  background: #8EA5E8;
  color: #fff;
  box-shadow: 0 4px 14px rgba(142, 165, 232, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;

  .spinner {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2.5px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    animation: ${spin} 0.9s linear infinite;
  }
`;

export default function PhotoPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(() => sessionStorage.getItem(PHOTO_STORAGE_KEY));
  const [result, setResult] = useState(() => sessionStorage.getItem(PHOTO_RESULT_KEY));
  const [video, setVideo] = useState(() => sessionStorage.getItem(PHOTO_VIDEO_KEY));
  const [processing, setProcessing] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [holdOriginal, setHoldOriginal] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [isColor, setIsColor] = useState(false); // 애초에 컬러 사진이면 변환 단계 생략
  const pollingRef = useRef(false); // 영상 상태 폴링 중복 방지

  useEffect(() => {
    let active = true;
    if (!photo) return undefined;
    isMonochromePhoto(photo).then((mono) => {
      if (active) setIsColor(!mono);
    });
    return () => { active = false; };
  }, [photo]);

  const busy = processing || animating;
  const ready = Boolean(result) || isColor; // 저장·영상 만들기가 가능한 상태
  const workingImage = result || photo; // 영상·저장의 기준 이미지
  const showVideo = video && !holdOriginal;
  const shownImage = result && !holdOriginal ? result : photo;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      sessionStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
      sessionStorage.removeItem(PHOTO_RESULT_KEY);
      sessionStorage.removeItem(PHOTO_VIDEO_KEY);
      sessionStorage.removeItem(PHOTO_ANIM_KEY);
      const item = await addPhotoToGallery(dataUrl);
      sessionStorage.setItem(PHOTO_ID_KEY, item.id);
      setPhoto(dataUrl);
      setResult(null);
      setVideo(null);
    } catch {
      alert('사진을 불러오지 못했어요. 다른 사진으로 시도해주세요.');
    }
  };

  const handleConvert = async () => {
    if (!photo || busy) return;
    setProcessing(true);
    try {
      const colored = await colorizeImage(photo);
      setResult(colored);
      try {
        sessionStorage.setItem(PHOTO_RESULT_KEY, await compressDataUrl(colored));
      } catch { /* 세션 저장 실패해도 변환 자체는 유지 */ }
    } catch (err) {
      console.error(err);
      alert(err.message || '사진 변환에 실패했어요. 다른 사진으로 시도해주세요.');
    } finally {
      setProcessing(false);
    }
  };

  // 영상 생성 완료까지 폴링. 작업 id를 세션에 저장해두므로
  // 다른 화면에 다녀와도 이 함수가 이어서 확인한다.
  const pollAnimation = async (id) => {
    if (pollingRef.current) {
      return;
    }
    pollingRef.current = true;
    setAnimating(true);
    setAnimProgress(0);
    try {
      for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await getAnimationStatus(id);
        if (s.status === 'completed') {
          setVideo(s.url);
          sessionStorage.setItem(PHOTO_VIDEO_KEY, s.url);
          sessionStorage.removeItem(PHOTO_ANIM_KEY);
          break;
        }
        if (s.status === 'failed') {
          sessionStorage.removeItem(PHOTO_ANIM_KEY);
          throw new Error(s.message || '영상 생성에 실패했어요.');
        }
        setAnimProgress(Math.round(s.progress || 0));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || '영상 변환에 실패했어요.');
    } finally {
      pollingRef.current = false;
      setAnimating(false);
    }
  };

  // 진행 중이던 영상 생성이 있으면 페이지에 돌아왔을 때 이어서 확인
  useEffect(() => {
    const pending = sessionStorage.getItem(PHOTO_ANIM_KEY);
    if (pending && !sessionStorage.getItem(PHOTO_VIDEO_KEY)) {
      setAnimProgress(0);
      pollAnimation(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 컬러 사진 → 3~5초 영상 생성 (수 분 소요)
  const handleAnimate = async () => {
    if (!ready || busy) return;
    setAnimating(true);
    setAnimProgress(0);
    try {
      const framed = await frameForVideo(workingImage);
      const { id } = await createAnimation(framed.dataUrl, framed.orientation);
      sessionStorage.setItem(PHOTO_ANIM_KEY, id);
      await pollAnimation(id);
    } catch (err) {
      console.error(err);
      setAnimating(false);
      alert(err.message || '영상 변환에 실패했어요.');
    }
  };

  const handleSave = async () => {
    if (!ready || saving || busy) return;
    setSaving(true);
    try {
      // 컬러 변환을 했거나 영상이 있을 때만 항목 갱신 (원래 컬러 사진 그대로면 이미 업로드 때 저장됨)
      if (result || video) {
        await updateGalleryPhoto(sessionStorage.getItem(PHOTO_ID_KEY), workingImage, video, {
          colored: Boolean(result),
        });
      }
      setShowPlacePicker(true); // 저장 후 장소 확인 → 지도 핀 등록
    } catch (err) {
      console.error(err);
      alert('저장에 실패했어요. 저장 공간이 부족할 수 있어요.');
    } finally {
      setSaving(false);
    }
  };

  const handlePlaceComplete = (place) => {
    setShowPlacePicker(false);
    if (place) {
      addMemory({
        title: place.name,
        place: place.address,
        lat: place.lat,
        lng: place.lng,
        photoId: sessionStorage.getItem(PHOTO_ID_KEY),
      });
      navigate('/map');
    } else {
      navigate('/gallery');
    }
  };

  return (
    <Wrap>
      <Bar>
        <IconBtn onClick={() => navigate(-1)} aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </IconBtn>
        <Title>추억 사진</Title>
      </Bar>

      {photo ? (
        <PhotoArea
          onPointerDown={() => result && !busy && setHoldOriginal(true)}
          onPointerUp={() => setHoldOriginal(false)}
          onPointerLeave={() => setHoldOriginal(false)}
        >
          {showVideo ? (
            <video src={video} autoPlay loop muted playsInline />
          ) : (
            <img src={shownImage} alt="추억 사진" />
          )}

          {result && !busy && (
            <CompareChip>
              {holdOriginal ? '원본 사진' : '사진을 꾹 누르면 원본이 보여요'}
            </CompareChip>
          )}
          {isColor && !result && !busy && (
            <CompareChip>이미 컬러 사진이라 바로 저장할 수 있어요</CompareChip>
          )}

          {busy && (
            <ProgressOverlay>
              <div className="spinner" />
              <div className="main">
                {processing ? '컬러로 복원하는 중...' : `영상을 만드는 중... ${animProgress}%`}
              </div>
              <div className="sub">
                {processing
                  ? '30초에서 1분 정도 걸려요'
                  : '2~3분 정도 걸려요\n다른 화면에 다녀와도 괜찮아요'}
              </div>
            </ProgressOverlay>
          )}
        </PhotoArea>
      ) : (
        <EmptyArea onClick={() => fileRef.current?.click()}>
          <ImagePlus size={44} strokeWidth={1.6} />
          {'여기를 눌러\n간직하고 싶은 사진을 올려주세요'}
        </EmptyArea>
      )}

      <Footer>
        {!ready ? (
          processing ? (
            <PillProgress>
              <div className="spinner" />
              복원하고 있어요
            </PillProgress>
          ) : (
            <Pill $primary className="grow" onClick={handleConvert} disabled={!photo}>
              <Wand2 size={22} strokeWidth={2} />
              컬러로 변환
            </Pill>
          )
        ) : animating ? (
          <PillProgress>
            <div className="spinner" />
            영상을 만들고 있어요 {animProgress}%
          </PillProgress>
        ) : (
          <>
            <PillRow>
              {!video && (
                <Pill className="grow" onClick={handleAnimate} disabled={saving}>
                  <Video size={22} strokeWidth={2} />
                  영상 만들기
                </Pill>
              )}
              <Pill $primary className="grow" onClick={handleSave} disabled={saving}>
                <Download size={22} strokeWidth={2} />
                {saving ? '저장 중...' : video ? '영상 저장하기' : '저장하기'}
              </Pill>
            </PillRow>
            {video && !busy && (
              <GhostBtn
                onClick={() => {
                  setVideo(null);
                  sessionStorage.removeItem(PHOTO_VIDEO_KEY);
                }}
              >
                <X size={11} style={{ verticalAlign: '-1px', marginRight: 2 }} />
                영상 지우고 사진으로 돌아가기
              </GhostBtn>
            )}
          </>
        )}
      </Footer>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />

      {showPlacePicker && (
        <PlacePickerModal photo={photo} onComplete={handlePlaceComplete} />
      )}
    </Wrap>
  );
}
