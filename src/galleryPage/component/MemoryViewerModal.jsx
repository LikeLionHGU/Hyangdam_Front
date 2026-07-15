import { useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

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

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일의 추억`;
}

// 갤러리 항목의 원본 / 컬러 / 동영상을 전환하며 보는 모달
export default function MemoryViewerModal({ item, onClose }) {
  const views = [];
  // 원본이 따로 보관되어 있고 대표 이미지와 다를 때만 원본 탭 표시
  if (item.original && item.original !== item.image) views.push({ key: 'original', label: '원본' });
  views.push({ key: 'image', label: item.colored ? '컬러' : '사진' });
  if (item.video) views.push({ key: 'video', label: '동영상' });

  const [view, setView] = useState(item.video ? 'video' : 'image');

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
      </Card>
    </Dim>
  );
}
