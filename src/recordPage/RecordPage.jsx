import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RecordScreen from "./RecordScreen.jsx";
import LocationSearchScreen from "./LocationSearchScreen.jsx";
import LocationConfirmModal from "./LocationConfirmModal.jsx";
import { addTextToGallery } from "../galleryPage/galleryStore";
import { addMemory } from "../mapPage/api";
import { summarizeConversation } from "./summarizeConversation";

function RecordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("RECORDING"); // RECORDING | LOCATION_SEARCH | CONFIRM_SEARCH_RESULT | SAVING
  const [conversation, setConversation] = useState({ turns: [], geminiHistory: [] });
  const [searchSelected, setSearchSelected] = useState(null);

  const finalizeSave = async (location, convo) => {
    setStep("SAVING");
    let text = "";
    try {
      text = await summarizeConversation(convo.geminiHistory);
    } catch (err) {
      console.error("요약 실패, 사용자 첫 발화로 폴백:", err);
      text = convo.turns[0]?.transcript || "";
    }

    const fullTranscript = convo.turns
      .map((t) => t.transcript)
      .filter(Boolean)
      .join("\n\n");

    const place = location.address || location.name || "";

    // 1) 갤러리 아이템 저장 (텍스트 타일용)
    // 대화에서 뽑힌 키워드들을 함께 저장 (갤러리 카드·상세에서 표시)
    const keywords = [...new Set(convo.turns.flatMap((t) => t.keywords || []))].slice(0, 6);

    const galleryItem = addTextToGallery({
      text,
      fullTranscript,
      place,
      lat: location.lat,
      lng: location.lng,
      keywords,
    });

    // 2) 지도 핀 저장 (좌표가 있을 때만)
    //    - title(볼드 자리)에는 장소를, story(사연 자리)에는 짧은 요약을 넣어
    //      팀원의 MapPage 렌더 로직을 손대지 않고도 자연스럽게 표시되게 함
    if (location.lat != null && location.lng != null) {
      addMemory({
        photoId: galleryItem.id,
        title: place,
        place: "",
        lat: location.lat,
        lng: location.lng,
        story: text,
      });
    }

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
        <div className="record-saving">
          <div className="thinking-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <p className="record-saving__title">기억을 정리하고 있어요</p>
          <p className="record-saving__sub">잠시만 기다려 주세요</p>
        </div>
      )}
    </>
  );
}

export default RecordPage;