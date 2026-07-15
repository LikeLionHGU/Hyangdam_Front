import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Copy } from 'lucide-react';
import { loadGallery, removeGalleryItem } from './galleryStore';
import { loadMemories, removeMemoryByPhotoId } from '../mapPage/api';
import MemoryViewerModal from './component/MemoryViewerModal';
import TextDetailModal from './TextDetailModal';

const Wrap = styled.div`
  padding: 0 16px 24px;
`;

const Bar = styled.div`
  height: 56px;
  margin: 0 -16px;
  padding: 0 12px;
  display: flex;
  align-items: center;
`;

const IconBtn = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5C5C5C;
`;

const Head = styled.h1`
  margin: 8px 0 0;
  font-size: 26px;
  font-weight: 600;
  line-height: 34px;
  letter-spacing: -0.52px;
  color: #5C5C5C;
  white-space: pre-line;
`;

const SortRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: 24px 0 10px;

  button {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #5C5C5C;
    font-size: 14px;
    font-weight: 500;
    line-height: 22px;

    svg { color: #909090; }
  }
`;

const Grid = styled.div`
  columns: 2;
  column-gap: 12px;
`;

const Tile = styled.div`
  width: 100%;
  border-radius: 24px;
  overflow: hidden;
  break-inside: avoid;
  margin-bottom: 12px;
`;

const PhotoTile = styled(Tile)`
  position: relative;
  aspect-ratio: ${({ $tall }) => ($tall ? '175 / 222' : '1')};
  background: #8EA5E8;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  transition: transform 0.15s ease;
  &:active { transform: scale(0.98); }

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    -webkit-user-drag: none;
  }

  .badge {
    position: absolute;
    top: 12px;
    right: 12px;
    color: #F3F7FF;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.45));
    pointer-events: none;
  }
`;

const InfoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 44px 16px 18px;
  background: linear-gradient(180deg, rgba(34, 42, 74, 0) 0%, rgba(34, 42, 74, 0.78) 55%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: #fff;
  text-align: right;
  pointer-events: none;
  transform: translateY(${({ $show }) => ($show ? '0' : '100%')});
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: transform 0.3s ease, opacity 0.3s ease;

  .date { font-size: 19px; font-weight: 600; letter-spacing: 0.5px; }
  .place { font-size: 17px; font-weight: 500; }
`;

const TextTile = styled(Tile)`
  height: 222px;
  background: #8EA5E8;
  padding: 16px 15px;
  color: #F3F7FF;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  cursor: pointer;
  transition: transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    transform: scale(0.98);
  }

  & > span {
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-align: center;
  }
`;

const PlaceholderTile = styled(Tile)`
  height: ${({ $tall }) => ($tall ? 222 : 174)}px;
  background: rgba(142, 165, 232, ${({ $opacity }) => $opacity});
`;

const EmptyHint = styled.p`
  margin: 4px 0 14px;
  text-align: center;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.7;
  color: #909090;
  white-space: pre-line;
`;

const PLACEHOLDERS = [
  { tall: true, opacity: 0.8 },
  { tall: true, opacity: 0.4 },
  { tall: false, opacity: 0.2 },
  { tall: true, opacity: 0.6 },
  { tall: false, opacity: 0.3 },
  { tall: true, opacity: 0.2 },
];

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const [order, setOrder] = useState('desc');
  const [viewer, setViewer] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [heldId, setHeldId] = useState(null);
  const holdTimer = useRef(null);
  const didHold = useRef(false);

  const placeById = useMemo(() => {
    const map = {};
    (loadMemories() || []).forEach((m) => {
      if (m.photoId) map[m.photoId] = m.title || m.place;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const startHold = (id) => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      setHeldId(id);
    }, 300);
  };

  const endHold = () => {
    clearTimeout(holdTimer.current);
    setHeldId(null);
  };

  const items = useMemo(() => {
    const list = loadGallery();
    list.sort((a, b) => (order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    return list;
  }, [order, refresh]);

  const handleDelete = (item) => {
    removeGalleryItem(item.id);
    removeMemoryByPhotoId(item.id);
    setViewer(null);
    setSelectedText(null);
    setRefresh((n) => n + 1);
  };

  const handleShareText = () => {
    if (!selectedText) return;
    const shareText = `${selectedText.text}\n\n— ${selectedText.place || ''}`;
    if (navigator.share) {
      navigator.share({ title: '향담 - 추억', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('클립보드에 복사됐어요');
    }
    setSelectedText(null);
  };

  const placeholders = PLACEHOLDERS.slice(0, Math.max(0, 6 - items.length));

  return (
    <Wrap>
      <Bar>
        <IconBtn onClick={() => navigate(-1)} aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </IconBtn>
      </Bar>

      <Head>{'지금까지의\n기억을 둘러봐요'}</Head>

      <SortRow>
        <button onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}>
          {order === 'desc' ? '최신순' : '오래된순'}
          <ChevronDown
            size={16}
            strokeWidth={2}
            style={{ transform: order === 'asc' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>
      </SortRow>

      {items.length === 0 && (
        <EmptyHint>{'아직 저장된 추억이 없어요.\n홈에서 흑백사진을 올려 첫 추억을 만들어보세요.'}</EmptyHint>
      )}

      <Grid>
        {items.map((item, i) => {
          if (item.type === 'text') {
            return (
              <TextTile key={item.id} onClick={() => setSelectedText(item)}>
                <span>{item.text}</span>
              </TextTile>
            );
          }
          const hasVersions = item.colored || item.video;
          return (
            <PhotoTile
              key={item.id}
              $tall={i % 3 !== 0}
              onClick={() => {
                if (didHold.current) {
                  didHold.current = false;
                  return;
                }
                setViewer(item);
              }}
              onPointerDown={() => startHold(item.id)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onContextMenu={(e) => e.preventDefault()}
            >
              {item.type === 'video' ? (
                <video src={item.video} poster={item.image} muted loop autoPlay playsInline />
              ) : (
                <img src={item.image} alt="추억 사진" />
              )}
              {hasVersions && <Copy className="badge" size={20} strokeWidth={2.2} />}
              <InfoOverlay $show={heldId === item.id}>
                <div className="date">{formatDate(item.createdAt)}</div>
                {placeById[item.id] && <div className="place">{placeById[item.id]}</div>}
              </InfoOverlay>
            </PhotoTile>
          );
        })}
        {placeholders.map((p, i) => (
          <PlaceholderTile key={`ph-${i}`} $tall={p.tall} $opacity={p.opacity} />
        ))}
      </Grid>

      {viewer && (
        <MemoryViewerModal item={viewer} onClose={() => setViewer(null)} onDelete={handleDelete} />
      )}

      {selectedText && (
        <TextDetailModal
          item={selectedText}
          onClose={() => setSelectedText(null)}
          onDelete={() => handleDelete(selectedText)}
          onShare={handleShareText}
        />
      )}
    </Wrap>
  );
}