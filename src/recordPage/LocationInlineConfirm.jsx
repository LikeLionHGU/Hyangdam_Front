function LocationInlineConfirm({ address, onConfirm, onReject }) {
    return (
      <div className="location-inline-confirm">
        <p className="location-inline-confirm__label">이 장소가 맞나요?</p>
        <div className="location-inline-confirm__row">
          <span className="location-inline-confirm__address">{address}</span>
          <div className="location-inline-confirm__actions">
            <button type="button" className="link-btn link-btn--primary" onClick={onConfirm}>
              네
            </button>
            <button type="button" className="link-btn" onClick={onReject}>
              아니오
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  export default LocationInlineConfirm;