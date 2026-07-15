import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RecordScreen from "./RecordScreen.jsx";
import LocationSearchScreen from "./LocationSearchScreen.jsx";
import LocationConfirmModal from "./LocationConfirmModal.jsx";
import { addTextToGallery } from "../galleryPage/galleryStore";
import { summarizeConversation } from "./summarizeConversation";

function RecordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("RECORDING"); // RECORDING | LOCATION_SEARCH | CONFIRM_SEARCH_RESULT | SAVING
  const [conversation, setConversation] = useState({ turns: [], geminiHistory: [] });
  const [searchSelected, setSearchSelected] = useState(null); // { name, address, lat, lng }

  const finalizeSave = async (location, convo) => {
    setStep("SAVING");
    let text = "";
    try {
      text = await summarizeConversation(convo.geminiHistory);
    } catch (err) {
      console.error("요약 실패, 사용자 첫 발화로 폴백:", err);
      text = convo.turns[0]?.transcript || "";
    }
    addTextToGallery({
      text,
      place: location.address || location.name || "",
      lat: location.lat,
      lng: location.lng,
    });
    navigate("/gallery");
  };

  const handleLocationConfirmed = (location, convo) => {
    setConversation(convo);
    finalizeSave(location, convo);
  };

  const handleGiveUpLocation = (convo) => {
    setConversation(convo);
    setStep("LOCATION_SEARCH");
  };

  const handleSearchSelect = (place) => {
    setSearchSelected(place);
    setStep("CONFIRM_SEARCH_RESULT");
  };

  const handleSearchConfirmed = (locationWithCoords) => {
    finalizeSave(locationWithCoords, conversation);
  };

  const handleSearchRejected = () => {
    // 지도에서 다시 확인 취소 → 검색 화면으로 복귀
    setSearchSelected(null);
    setStep("LOCATION_SEARCH");
  };

  const handleBack = () => {
    if (step === "LOCATION_SEARCH" || step === "CONFIRM_SEARCH_RESULT") {
      setStep("RECORDING");
      return;
    }
    navigate(-1);
  };

  const handleClose = () => navigate("/");

  return (
    <>
      {step === "RECORDING" && (
        <RecordScreen
          onLocationConfirmed={handleLocationConfirmed}
          onGiveUpLocation={handleGiveUpLocation}
          onBack={handleBack}
          onClose={handleClose}
        />
      )}
      {step === "LOCATION_SEARCH" && (
        <LocationSearchScreen
          onSelect={handleSearchSelect}
          onBack={handleBack}
          onClose={handleClose}
        />
      )}
      {step === "CONFIRM_SEARCH_RESULT" && searchSelected && (
        <>
          <LocationSearchScreen
            onSelect={handleSearchSelect}
            onBack={handleBack}
            onClose={handleClose}
          />
          <LocationConfirmModal
            address={searchSelected.address || searchSelected.name}
            onConfirm={handleSearchConfirmed}
            onReject={handleSearchRejected}
            onClose={handleSearchRejected}
          />
        </>
      )}
      {step === "SAVING" && (
        <div style={{ padding: 24, textAlign: "center" }}>
          기억을 정리하고 있어요...
        </div>
      )}
    </>
  );
}

export default RecordPage;