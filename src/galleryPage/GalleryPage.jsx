import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Search, Minus } from 'lucide-react';
import { loadGallery } from './galleryStore';

const Wrap = styled.div`
  padding: 0 16px 24px;
`;

const Bar = styled.div`
  height: 56px;
  margin: 0 -16px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const IconBtn = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5C5C5C;
`;

const BarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
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
  aspect-ratio: 1;
  background: #8EA5E8;

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const TextTile = styled(Tile)`
  height: 222px;
  background: #8EA5E8;
  padding: 16px 15px;
  color: #F3F7FF;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  display: -webkit-box;
  -webkit-line-clamp: 10;
  -webkit-box-orient: vertical;
`;

const PlaceholderTile = styled(Tile)`
  height: ${({ $tall }) => ($tall ? 222 : 174)}px;
  background: rgba(142, 165, 232, ${({ $opacity }) => $opacity});
`;

// 빈 자리를 채우는 연보라 타일 패턴 (디자인의 농도 배열)
const PLACEHOLDERS = [
  { tall: true, opacity: 0.8 },
  { tall: true, opacity: 0.4 },
  { tall: false, opacity: 0.2 },
  { tall: true, opacity: 0.6 },
  { tall: false, opacity: 0.3 },
  { tall: true, opacity: 0.2 },
];

export default function GalleryPage() {
  const navigate = useNavigate();
  const [order, setOrder] = useState('desc');

  const items = useMemo(() => {
    const list = loadGallery();
    list.sort((a, b) => (order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
    return list;
  }, [order]);

  const placeholders = PLACEHOLDERS.slice(0, Math.max(0, 6 - items.length));

  return (
    <Wrap>
      <Bar>
        <IconBtn onClick={() => navigate(-1)} aria-label="뒤로 가기">
          <ChevronLeft size={28} />
        </IconBtn>
        <BarRight>
          <IconBtn aria-label="검색"><Search size={20} /></IconBtn>
          <IconBtn aria-label="메뉴"><Minus size={20} /></IconBtn>
        </BarRight>
      </Bar>

      <Head>{'지금까지의\n기억을 둘러봐요'}</Head>

      <SortRow>
        <button onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}>
          {order === 'desc' ? '최신순' : '오래된순'}
          <ChevronDown size={16} strokeWidth={2} />
        </button>
      </SortRow>

      <Grid>
        {items.map((item) => {
          if (item.type === 'video') {
            return (
              <PhotoTile key={item.id}>
                <video src={item.video} poster={item.image} muted loop autoPlay playsInline />
              </PhotoTile>
            );
          }
          if (item.type === 'photo') {
            return (
              <PhotoTile key={item.id}>
                <img src={item.image} alt="추억 사진" />
              </PhotoTile>
            );
          }
          return <TextTile key={item.id}>{item.text}</TextTile>;
        })}
        {placeholders.map((p, i) => (
          <PlaceholderTile key={`ph-${i}`} $tall={p.tall} $opacity={p.opacity} />
        ))}
      </Grid>
    </Wrap>
  );
}
