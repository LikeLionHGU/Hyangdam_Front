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

// 항목이 좌→우 순서로 번갈아 배치되는 2열 (CSS columns는 세로로 먼저 채워짐)
const Grid = styled.div`
  display: flex;
  gap: 12px;

  .col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
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

// 꾹 눌렀을 때 아래에서 올라오는 날짜·장소 바 (시안: 어두운 하단 띠)
const InfoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 54px;
  background: rgba(30, 35, 49, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  gap: 3px;
  padding: 0 16px;
  color: #F3F7FF;
  font-size: 12px;
  line-height: 17.5px;
  text-align: right;
  pointer-events: none;
  transform: translateY(${({ $show }) => ($show ? '0' : '100%')});
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: transform 0.3s ease, opacity 0.3s ease;
`;

// 구술 기록 카드 — 따옴표 + 발췌문 + 장소·날짜로 정돈된 표시
const TextTile = styled(Tile)`
  height: 222px;
  background: linear-gradient(160deg, #94A9EB 0%, #7D95E0 100%);
  padding: 16px 16px 14px;
  color: #F8FAFF;
  cursor: pointer;
  transition: transform 0.15s ease;
  display: flex;
  flex-direction: column;

  &:active {
    transform: scale(0.98);
  }

  .quote {
    font-family: Georgia, serif;
    font-size: 34px;
    line-height: 0.9;
    font-weight: 700;
    opacity: 0.45;
  }

  .excerpt {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.65;
    word-break: keep-all;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta {
    margin-top: auto;
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 11.5px;
    opacity: 0.9;
  }

  .meta .place {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta .date {
    opacity: 0.75;
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
        {(() => {
          // 시안 패턴: 왼쪽 열은 정사각↔길쭉 번갈아, 오른쪽 열은 모두 길쭉
          const tallFor = (col, row) => (col === 1 ? true : row % 2 === 1);

          const renderItem = (item, tall) => {
            if (item.type === 'text') {
              return (
                <TextTile key={item.id} onClick={() => setSelectedText(item)}>
                  <div className="quote">&ldquo;</div>
                  <p className="excerpt">{item.text}</p>
                  <div className="meta">
                    {item.place && <span className="place">{item.place}</span>}
                    <span className="date">{formatDate(item.createdAt)}</span>
                  </div>
                </TextTile>
              );
            }
            const hasVersions = item.colored || item.video;
            return (
              <PhotoTile
                key={item.id}
                $tall={tall}
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
          };

          const cells = [
            ...items.map((item) => ({ kind: 'item', item })),
            ...placeholders.map((p, i) => ({ kind: 'ph', p, key: `ph-${i}` })),
          ];

          // 최신 항목부터 좌→우 순서로 번갈아 배치
          const columns = [cells.filter((_, i) => i % 2 === 0), cells.filter((_, i) => i % 2 === 1)];
          return columns.map((col, c) => (
            <div className="col" key={c}>
              {col.map((cell, r) =>
                cell.kind === 'item' ? (
                  renderItem(cell.item, tallFor(c, r))
                ) : (
                  <PlaceholderTile key={cell.key} $tall={tallFor(c, r)} $opacity={cell.p.opacity} />
                )
              )}
            </div>
          ));
        })()}
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