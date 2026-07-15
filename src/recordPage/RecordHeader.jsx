function RecordHeader({ onBack, onClose }) {
    return (
      <header className="record-header">
        <button
          type="button"
          className="record-header__icon"
          onClick={onBack}
          aria-label="뒤로가기"
        >
          {/* 시안: 24x24 안에 약 10x18 비율의 슬림한 화살표 */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12.9 3L4.9 12L12.9 21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <p className="record-header__title">추억을 이야기해요</p>
        <button
          type="button"
          className="record-header__icon"
          onClick={onClose}
          aria-label="닫기"
        >
          {/* 시안: 24x24 안에 17x17 X */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3.5 3.5L20.5 20.5M20.5 3.5L3.5 20.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
    );
  }
  
  export default RecordHeader;