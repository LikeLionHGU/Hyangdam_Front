import { useEffect, useState } from "react";
import { searchPlaces } from "../mapPage/api";
import "./RecordPage.css";

const RECENT_KEY = "hyangdam_recent_places";

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecent(place) {
  const list = loadRecent();
  const filtered = list.filter(
    (r) => !(r.lat === place.lat && r.lng === place.lng)
  );
  const next = [place, ...filtered].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function LocationSearchScreen({ onSelect, onBack, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // 입력이 바뀌면 300ms 디바운스 후 자동 검색
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const found = await searchPlaces(query.trim());
      setResults(found);
      setSearched(true);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (place) => {
    saveRecent(place);
    onSelect(place);
  };

  const listToShow = query.trim() ? results : recent;
  const showRecentLabel = !query.trim() && recent.length > 0;
  const showEmptyRecent = !query.trim() && recent.length === 0;

  return (
    <div className="location-search-page">
      <header className="location-search__header">
        <button
          type="button"
          className="location-search__icon-btn"
          onClick={onBack}
          aria-label="뒤로가기"
        >
          &#8249;
        </button>
        <button
          type="button"
          className="location-search__icon-btn"
          onClick={onClose}
          aria-label="닫기"
        >
          &#10005;
        </button>
      </header>

      <div className="location-search__search-bar">
        <input
          type="text"
          className="location-search__input"
          placeholder="장소, 건물명 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <svg
          className="location-search__icon-search"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="11" cy="11" r="7" stroke="#1E2331" strokeWidth="1.5" />
          <path d="M20 20L17 17" stroke="#1E2331" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {showRecentLabel && (
        <p className="location-search__section-label">최근 내역</p>
      )}

      {showEmptyRecent && (
        <p className="location-search__section-label">장소를 검색해보세요</p>
      )}

      <ul className="location-search__list">
        {listToShow.map((r) => (
          <li key={`${r.lat}-${r.lng}`} className="location-search__row">
            <button
              type="button"
              className="location-search__item"
              onClick={() => handleSelect(r)}
            >
              <div className="location-search__name">{r.name}</div>
              <div className="location-search__addr">{r.address}</div>
            </button>
          </li>
        ))}
      </ul>

      {searching && (
        <div className="location-search__status">검색 중...</div>
      )}
      {!searching && searched && results.length === 0 && (
        <div className="location-search__status">
          검색 결과가 없어요.<br />다른 이름으로 다시 시도해보세요.
        </div>
      )}
    </div>
  );
}

export default LocationSearchScreen;