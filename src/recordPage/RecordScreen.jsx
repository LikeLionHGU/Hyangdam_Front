import { useState, useRef, useEffect, useCallback } from "react";
import RecordHeader from "./RecordHeader.jsx";
import KeywordCarousel from "./KeywordCarousel.jsx";
import LocationInlineConfirm from "./LocationInlineConfirm.jsx";
import MicIcon from "./MicIcon.jsx";
import { mockAnalyze } from "./dummyRecordData";
import { analyzeWithGPT } from "./analyzeWithGPT";
import "./RecordPage.css";

const LOCATION_CONFIDENCE_THRESHOLD = 0.75;
const FORCE_LOCATION_AFTER_TURNS = 3; // 이 턴수까지도 못 찾으면 마지막 단서로 강제 확인 유도

function RecordScreen({ onLocationConfirmed, onLocationRejected, onBack, onClose }) {
  const [turns, setTurns] = useState([]);
  const [phase, setPhase] = useState("IDLE");
  const [liveText, setLiveText] = useState("");
  const [pendingLocation, setPendingLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const inputModeRef = useRef("text");
  const recognitionRef = useRef(null);
  const geminiHistoryRef = useRef([]); // Gemini에 매번 같이 보낼 대화 히스토리
  const lastAddressGuessRef = useRef("");

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        setLiveText((prev) => (prev ? prev + " " + finalText : finalText));
      }
    };

    recognition.onend = () => {
      setPhase((prev) => (prev === "RECORDING" ? "ANALYZING" : prev));
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) {
      alert("이 브라우저에서는 음성 입력을 지원하지 않아요.");
      return;
    }
    inputModeRef.current = "voice";
    setLiveText("");
    setPhase("RECORDING");
    recognitionRef.current.start();
  }, []);

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setPhase("ANALYZING");
  };

  const submitTypedText = () => {
    if (!liveText.trim()) return;
    inputModeRef.current = "text";
    setPhase("ANALYZING");
  };

  useEffect(() => {
    if (phase !== "ANALYZING") return;
    if (!liveText.trim()) {
      setPhase("IDLE");
      return;
    }

    let cancelled = false;
    async function analyze() {
      setErrorMessage(null);
      const userText = liveText.trim();

      // 이번 사용자 답변을 히스토리에 먼저 추가
      const historyWithUserTurn = [
        ...geminiHistoryRef.current,
        { role: "user", parts: [{ text: userText }] },
      ];

      let result;
      let usedFallback = false;
      try {
        result = await analyzeWithGPT(historyWithUserTurn);
      } catch (err) {
        console.error("Gemini 호출 실패, mock으로 폴백:", err);
        setErrorMessage(`AI 호출 실패 (mock 데이터 사용중): ${err.message}`);
        result = mockAnalyze(userText);
        usedFallback = true;
      }
      if (cancelled) return;

      // 히스토리에 이번 턴(사용자+AI 후속질문) 반영, 다음 호출부터 맥락 유지
      geminiHistoryRef.current = [
        ...historyWithUserTurn,
        { role: "model", parts: [{ text: result.followUpQuestion || "" }] },
      ];

      if (result.address) {
        lastAddressGuessRef.current = result.address;
      }

      const nextTurns = [
        ...turns,
        {
          transcript: userText,
          keywords: result.keywords,
          followUpQuestion: result.followUpQuestion,
        },
      ];
      setTurns(nextTurns);

      const shouldConfirmLocation =
        !pendingLocation &&
        (result.confidence >= LOCATION_CONFIDENCE_THRESHOLD ||
          (nextTurns.length >= FORCE_LOCATION_AFTER_TURNS && lastAddressGuessRef.current));

      if (shouldConfirmLocation) {
        setPendingLocation({
          address: result.address || lastAddressGuessRef.current,
          lat: result.lat,
          lng: result.lng,
        });
        setPhase("AWAITING_LOCATION_CONFIRM");
        return;
      }

      setLiveText("");

      if (!usedFallback && inputModeRef.current === "voice" && recognitionRef.current) {
        setPhase("RECORDING");
        recognitionRef.current.start();
      } else {
        setPhase("IDLE");
      }
    }
    analyze();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleConfirmLocation = () => {
    onLocationConfirmed(pendingLocation);
  };

  const handleRejectLocation = () => {
    onLocationRejected();
  };

  const latestTurn = turns[turns.length - 1];
  const showBottomInput = phase === "IDLE" || phase === "AWAITING_LOCATION_CONFIRM";

  return (
    <div className="record-screen">
      <RecordHeader onBack={onBack} onClose={onClose} />

      <div className="record-screen__scroll">
        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        {phase === "RECORDING" && liveText && (
          <p className="record-screen__transcript">{liveText}</p>
        )}
        {phase !== "RECORDING" && latestTurn && (
          <p className="record-screen__transcript">{latestTurn.transcript}</p>
        )}

        {phase === "ANALYZING" && (
          <div className="thinking-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
      </div>

      <div className="record-fixed-panel">
        {latestTurn && phase !== "ANALYZING" && (
          <div className="followup-bubble">ex) {latestTurn.followUpQuestion}</div>
        )}

        {turns.length > 0 ? (
          <div className="keyword-panel">
            <KeywordCarousel turns={turns} />
            {phase === "AWAITING_LOCATION_CONFIRM" && pendingLocation && (
              <LocationInlineConfirm
                address={pendingLocation.address}
                onConfirm={handleConfirmLocation}
                onReject={handleRejectLocation}
              />
            )}
          </div>
        ) : (
          phase === "IDLE" && <div className="keyword-panel keyword-panel--empty" />
        )}
      </div>

      <div className="record-bottom-bar">
        {phase === "RECORDING" ? (
          <>
            <div className="voice-wave">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="voice-wave__bar" />
              ))}
            </div>
            <button
              type="button"
              className="mic-btn mic-btn--active"
              onClick={stopRecording}
              aria-label="녹음 종료"
            >
              ■
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              className="record-bottom-bar__input"
              value={liveText}
              onChange={(e) => setLiveText(e.target.value)}
              placeholder="어떤 추억이 떠오르나요"
              onKeyDown={(e) => e.key === "Enter" && submitTypedText()}
            />
            <button
              type="button"
              className="mic-btn"
              onClick={startRecording}
              aria-label="음성 녹음"
            >
              <MicIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default RecordScreen;