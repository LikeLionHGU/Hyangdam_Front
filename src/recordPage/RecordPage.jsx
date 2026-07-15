import { useState } from "react";
import RecordScreen from "./RecordScreen.jsx";

function RecordPage() {
  const [step, setStep] = useState("RECORDING"); // RECORDING | LOCATION_SEARCH | SAVED

  const handleLocationConfirmed = (location) => {
    console.log("저장할 위치:", location);
    setStep("SAVED");
  };

  const handleLocationRejected = () => {
    setStep("LOCATION_SEARCH");
  };

  const handleBack = () => console.log("뒤로가기");
  const handleClose = () => console.log("닫기");

  return (
    <div className="record-page">
      {step === "RECORDING" && (
        <RecordScreen
          onLocationConfirmed={handleLocationConfirmed}
          onLocationRejected={handleLocationRejected}
          onBack={handleBack}
          onClose={handleClose}
        />
      )}
      {step === "LOCATION_SEARCH" && (
        <div style={{ padding: 24 }}>
          직접 검색 화면 (LocationSearchScreen) — 다음 단계에서 구현
        </div>
      )}
      {step === "SAVED" && <div style={{ padding: 24 }}>기록이 저장됐어요 ✅</div>}
    </div>
  );
}

export default RecordPage;