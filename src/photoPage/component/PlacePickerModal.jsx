import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { MapPin, Search, X } from 'lucide-react';
import { useKakaoLoader } from '../../mapPage/component/useKakaoLoader';
import { searchPlaces } from '../../mapPage/api';
import { detectPlaceFromImage } from '../colorize';

const Dim = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 35, 0.45);
  z-index: 900;
  display: flex;
  align-items: flex-end;
`;

const Sheet = styled.div`
  width: 100%;
  max-height: 70%;
  background: #F3F7FF;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
`;

const SheetHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 600;
    line-height: 30px;
    color: #5C5C5C;
    white-space: pre-line;
  }

  button { color: #ADADAD; }
`;

const Hint = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #909090;
`;

const Candidate = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff;
  text-align: left;
  box-shadow: 0 2px 8px rgba(34, 34, 59, 0.05);
  color: #8EA5E8;
  transition: transform 0.15s ease;
  &:active { transform: scale(0.98); }

  .info { flex: 1; min-width: 0; }
  .name { font-size: 17px; font-weight: 600; color: #5C5C5C; }
  .addr {
    font-size: 14px;
    color: #909090;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const SearchRow = styled.form`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    height: 48px;
    padding: 0 16px;
    border: none;
    border-radius: 16px;
    background: #fff;
    font-size: 16px;
    color: #5C5C5C;
    box-shadow: 0 2px 8px rgba(34, 34, 59, 0.05);

    &::placeholder { color: #ADADAD; }
    &:focus { outline: 2px solid #8EA5E8; }
  }

  button {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: #8EA5E8;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const GhostBtn = styled.button`
  height: 48px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 500;
  color: #8EA5E8;
`;

const Status = styled.div`
  padding: 20px 0;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #909090;
  line-height: 1.7;
`;

// 사진에서 장소를 추정해 확인받고, 실패하면 직접 검색으로 넘어가는 바텀시트.
// onComplete(place | null) — place: { name, address, lat, lng }
export default function PlacePickerModal({ photo, onComplete }) {
  const { loaded } = useKakaoLoader();
  const [mode, setMode] = useState('detecting'); // detecting | suggest | manual
  const [candidates, setCandidates] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!loaded || detectedRef.current) return;
    detectedRef.current = true;
    (async () => {
      try {
        const { candidates: queries } = await detectPlaceFromImage(photo);
        // 추정 검색어들을 모두 검색해서 후보를 합친다 (좌표 기준 중복 제거, 최대 5개)
        const results = await Promise.all(queries.map((q) => searchPlaces(q)));
        const merged = [];
        const seen = new Set();
        for (const list of results) {
          for (const p of list) {
            const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(p);
            }
          }
        }
        const top = merged.slice(0, 5);
        if (top.length) {
          setCandidates(top);
          setQuery(queries[0] || '');
          setMode('suggest');
        } else {
          setMode('manual');
        }
      } catch (err) {
        console.error(err);
        setMode('manual');
      }
    })();
  }, [loaded, photo]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    const found = await searchPlaces(query);
    setCandidates(found);
    setSearched(true);
    setSearching(false);
  };

  return (
    <Dim onClick={() => onComplete(null)}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <SheetHead>
          <h2>
            {mode === 'suggest'
              ? '사진 속 장소를 찾았어요\n여기가 맞나요?'
              : '이 추억의 장소는\n어디인가요?'}
          </h2>
          <button onClick={() => onComplete(null)} aria-label="건너뛰기"><X size={22} /></button>
        </SheetHead>

        {mode === 'detecting' && (
          <Status>사진 속 간판과 표지판을<br />읽고 있어요...</Status>
        )}

        {mode === 'manual' && (
          <>
            <Hint>사진에서 장소를 찾지 못했어요. 장소 이름이나 주소를 검색해서 지도에 핀을 남겨보세요.</Hint>
            <SearchRow onSubmit={handleSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예) 한국안경, 경산시장"
              />
              <button type="submit" aria-label="검색" disabled={searching}>
                <Search size={20} />
              </button>
            </SearchRow>
            {searching && <Status>검색 중...</Status>}
            {!searching && searched && candidates.length === 0 && (
              <Status>검색 결과가 없어요.<br />다른 이름으로 검색해보세요.</Status>
            )}
          </>
        )}

        {(mode === 'suggest' || mode === 'manual') &&
          candidates.map((c) => (
            <Candidate key={`${c.lat}-${c.lng}`} onClick={() => onComplete(c)}>
              <MapPin size={20} />
              <div className="info">
                <div className="name">{c.name}</div>
                <div className="addr">{c.address}</div>
              </div>
            </Candidate>
          ))}

        {mode === 'suggest' && (
          <GhostBtn onClick={() => { setCandidates([]); setSearched(false); setMode('manual'); }}>
            아니에요, 직접 입력할게요
          </GhostBtn>
        )}
        {mode !== 'detecting' && (
          <GhostBtn onClick={() => onComplete(null)}>장소 없이 저장하기</GhostBtn>
        )}
      </Sheet>
    </Dim>
  );
}
