function RecordHeader({ onBack, onClose }) {
    return (
      <header className="record-header">
        <button
          type="button"
          className="record-header__icon"
          onClick={onBack}
          aria-label="뒤로가기"
        >
          &#8249;
        </button>
        <p className="record-header__title">추억을 이야기해요</p>
        <button
          type="button"
          className="record-header__icon"
          onClick={onClose}
          aria-label="닫기"
        >
          &#10005;
        </button>
      </header>
    );
  }
  
  export default RecordHeader;