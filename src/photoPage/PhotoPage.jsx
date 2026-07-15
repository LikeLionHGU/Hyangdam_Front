import { useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Wand2, Download, Video, Minus } from 'lucide-react';
import { colorizeImage, fileToDataUrl, frameForVideo, createAnimation, getAnimationStatus } from './colorize';
import { addPhotoToGallery, updateGalleryPhoto } from '../galleryPage/galleryStore';
import { addMemory } from '../mapPage/api';
import PlacePickerModal from './component/PlacePickerModal';

export const PHOTO_STORAGE_KEY = 'hyangdam_photo';
export const PHOTO_ID_KEY = 'hyangdam_photo_id';

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
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5C5C5C;
  &.left { left: 12px; }
  &.right { right: 12px; }
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

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const EmptyArea = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ADADAD;
  font-size: 14px;
  font-weight: 500;
`;

const Footer = styled.div`
  flex-shrink: 0;
  height: 104px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Pill = styled.button`
  height: 56px;
  padding: 8px 20px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 10px rgba(34, 34, 59, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: #5C5C5C;
  font-size: 16px;
  font-weight: 500;
  &:disabled { opacity: 0.6; }
`;

const Circle = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 56px;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 10px rgba(34, 34, 59, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444444;
  &.left { left: 26px; }
  &.right { right: 26px; color: #5C5C5C; }
  &:disabled { opacity: 0.5; }
`;

export default function PhotoPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(() => sessionStorage.getItem(PHOTO_STORAGE_KEY));
  const [result, setResult] = useState(null);
  const [video, setVideo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(false);

  const shown = result && !showOriginal ? result : photo;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      sessionStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
      const item = await addPhotoToGallery(dataUrl);
      sessionStorage.setItem(PHOTO_ID_KEY, item.id);
      setPhoto(dataUrl);
      setResult(null);
      setVideo(null);
      setShowOriginal(false);
    } catch {
      alert('사진을 불러오지 못했어요. 다른 사진으로 시도해주세요.');
    }
  };

  const handleConvert = async () => {
    if (!photo || processing) return;
    setProcessing(true);
    try {
      setResult(await colorizeImage(photo));
      setShowOriginal(false);
    } catch (err) {
      console.error(err);
      alert(err.message || '사진 변환에 실패했어요. 다른 사진으로 시도해주세요.');
    } finally {
      setProcessing(false);
    }
  };

  // 컬러 사진 → 3~5초 영상 생성 (수 분 소요, 완료까지 폴링)
  const handleAnimate = async () => {
    if (!result || animating) return;
    setAnimating(true);
    setAnimProgress(0);
    try {
      const framed = await frameForVideo(result);
      const { id } = await createAnimation(framed.dataUrl, framed.orientation);
      for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await getAnimationStatus(id);
        if (s.status === 'completed') {
          setVideo(s.url);
          break;
        }
        if (s.status === 'failed') {
          throw new Error(s.message || '영상 생성에 실패했어요.');
        }
        setAnimProgress(Math.round(s.progress || 0));
      }
    } catch (err) {
      console.error(err);
      alert(err.message || '영상 변환에 실패했어요.');
    } finally {
      setAnimating(false);
    }
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await updateGalleryPhoto(sessionStorage.getItem(PHOTO_ID_KEY), result, video);
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
        <IconBtn className="left" onClick={() => navigate(-1)} aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </IconBtn>
        <Title>추억 사진</Title>
        {result && (
          <IconBtn
            className="right"
            onClick={() => setShowOriginal((v) => !v)}
            aria-label="원본 보기"
          >
            <ImageIcon size={24} />
          </IconBtn>
        )}
      </Bar>

      {photo ? (
        <PhotoArea>
          {video && !showOriginal ? (
            <video src={video} autoPlay loop muted playsInline />
          ) : (
            <img src={shown} alt="추억 사진" />
          )}
        </PhotoArea>
      ) : (
        <EmptyArea onClick={() => fileRef.current?.click()}>
          사진을 선택해주세요
        </EmptyArea>
      )}

      <Footer>
        {!result ? (
          <Pill onClick={handleConvert} disabled={!photo || processing}>
            <Wand2 size={24} strokeWidth={2} />
            {processing ? '변환 중...' : '컬러로 변환'}
          </Pill>
        ) : (
          <>
            {!video && (
              <Circle
                className="left"
                onClick={handleAnimate}
                disabled={animating}
                aria-label="영상으로 변환"
              >
                <Video size={24} strokeWidth={2} />
              </Circle>
            )}
            <Pill onClick={handleSave} disabled={saving || animating}>
              <Download size={24} strokeWidth={2} />
              {animating
                ? `영상 생성 중... ${animProgress}%`
                : saving
                  ? '저장 중...'
                  : '저장하기'}
            </Pill>
            <Circle
              className="right"
              onClick={() => (video ? setVideo(null) : setResult(null))}
              disabled={animating}
              aria-label={video ? '영상 취소' : '변환 취소'}
            >
              <Minus size={24} strokeWidth={2} />
            </Circle>
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
