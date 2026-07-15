import { useState } from 'react';
import styled from 'styled-components';
import { X, Share2 } from 'lucide-react';

const Dim = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 35, 0.55);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 361px;
  background: #F3F7FF;
  border-radius: 24px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;

  .title {
    font-size: 17px;
    font-weight: 600;
    color: #5C5C5C;
  }

  button { color: #909090; display: flex; }
`;

const Media = styled.div`
  border-radius: 16px;
  overflow: hidden;
  background: #E3E9F8;

  img, video {
    width: 100%;
    max-height: 55vh;
    object-fit: contain;
    display: block;
  }
`;

const Tabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;

  button {
    padding: 11px 20px;
    border-radius: 100px;
    font-size: 16px;
    font-weight: 600;
    background: #fff;
    color: #5C5C5C;
    box-shadow: 0 2px 8px rgba(34, 34, 59, 0.05);
  }

  button.active {
    background: #8EA5E8;
    color: #fff;
  }
`;

const ShareBtn = styled.button`
  height: 54px;
  border-radius: 100px;
  background: #8EA5E8;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 14px rgba(142, 165, 232, 0.45);
  transition: transform 0.15s ease;
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.7; }
`;

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일의 추억`;
}

// 공유 링크 생성 → 모바일은 공유 시트(카톡 등), PC는 클립보드 복사
async function shareMemory(item) {
  const items = [];
  if (item.original && item.original !== item.image) {
    items.push({ label: '원본 사진', image: item.original });
  }
  items.push({ label: item.colored ? '컬러로 복원한 사진' : '사진', image: item.image });
  if (item.video) items.push({ label: '살아 움직이는 추억 영상', video: item.video });

  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: formatDate(item.createdAt), items }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || '공유 링크를 만들지 못했어요.');
  }

  const url = `${window.location.protocol}//${window.location.hostname}:3000/share/${data.code}`;

  // 모바일에서만 공유 시트(카톡 등) 사용 — 데스크톱은 클립보드 복사가 확실하다
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile && navigator.share) {
    try {
      await navigator.share({ title: '향담 — 추억 공유', text: '소중한 추억을 함께 봐요', url });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // 공유 시트 실패 시 복사로 폴백
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt('아래 링크를 복사해서 친구에게 보내주세요', url);
    return 'shown';
  }
}

// 갤러리 항목의 원본 / 컬러 / 동영상을 전환하며 보는 모달
export default function MemoryViewerModal({ item, onClose }) {
  const views = [];
  // 원본이 따로 보관되어 있고 대표 이미지와 다를 때만 원본 탭 표시
  if (item.original && item.original !== item.image) views.push({ key: 'original', label: '원본' });
  views.push({ key: 'image', label: item.colored ? '컬러' : '사진' });
  if (item.video) views.push({ key: 'video', label: '동영상' });

  const [view, setView] = useState(item.video ? 'video' : 'image');
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const outcome = await shareMemory(item);
      if (outcome === 'copied') {
        alert('공유 링크가 복사되었어요.\n카카오톡 대화창에 붙여넣어 보내보세요!');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || '공유에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dim onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Head>
          <span className="title">{formatDate(item.createdAt)}</span>
          <button onClick={onClose} aria-label="닫기"><X size={24} /></button>
        </Head>

        <Media>
          {view === 'video' ? (
            <video src={item.video} autoPlay loop muted playsInline controls />
          ) : (
            <img
              src={view === 'original' ? item.original : item.image}
              alt={view === 'original' ? '원본 사진' : '추억 사진'}
            />
          )}
        </Media>

        {views.length > 1 && (
          <Tabs>
            {views.map((v) => (
              <button
                key={v.key}
                className={view === v.key ? 'active' : ''}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </Tabs>
        )}

        <ShareBtn onClick={handleShare} disabled={sharing}>
          <Share2 size={20} strokeWidth={2.2} />
          {sharing ? '공유 링크 만드는 중...' : '친구에게 공유하기'}
        </ShareBtn>
      </Card>
    </Dim>
  );
}
