import { useState, useRef, useEffect, useCallback } from "react";
import RecordHeader from "./RecordHeader.jsx";
import KeywordCarousel from "./KeywordCarousel.jsx";
import LocationConfirmModal from "./LocationConfirmModal.jsx";
import MicIcon from "./MicIcon.jsx";
import { mockAnalyze } from "./dummyRecordData";
import { analyzeWithGPT } from "./analyzeWithGPT";
import "./RecordPage.css";

const LOCATION_CONFIDENCE_THRESHOLD = 0.75;
const FORCE_LOCATION_AFTER_TURNS = 3;
const MAX_LOCATION_RETRIES = 3;

function RecordScreen({ onLocationConfirmed, onGiveUpLocation, onBack, onClose }) {
  const [turns, setTurns] = useState([]);
  const [phase, setPhase] = useState("IDLE");
  const [liveText, setLiveText] = useState("");
  const [analyzingText, setAnalyzingText] = useState("");
  const [pendingLocation, setPendingLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const inputModeRef = useRef("text");
  const recognitionRef = useRef(null);
  const geminiHistoryRef = useRef([]);
  const lastAddressGuessRef = useRef("");
  const rejectCountRef = useRef(0);
  const rejectedAddressesRef = useRef([]);

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
      setPhase((prev) => {
        if (prev !== "RECORDING") return prev;
        setLiveText((currentLive) => {
          setAnalyzingText(currentLive.trim());
          return "";
        });
        return "ANALYZING";
      });
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
    setAnalyzingText(liveText.trim());
    setLiveText("");
    setPhase("ANALYZING");
  };

  const submitTypedText = () => {
    if (!liveText.trim()) return;
    inputModeRef.current = "text";
    setAnalyzingText(liveText.trim());
    setLiveText("");
    setPhase("ANALYZING");
  };

  useEffect(() => {
    if (phase !== "ANALYZING") return;
    if (!analyzingText.trim()) {
      setPhase("IDLE");
      return;
    }

    let cancelled = false;
    async function analyze() {
      setErrorMessage(null);
      const userText = analyzingText.trim();

      const historyWithUserTurn = [
        ...geminiHistoryRef.current,
        { role: "user", parts: [{ text: userText }] },
      ];

      let result;
      let usedFallback = false;
      try {
        result = await analyzeWithGPT(historyWithUserTurn, {
          rejectedAddresses: rejectedAddressesRef.current,
        });
      } catch (err) {
        console.error("Gemini 호출 실패, mock으로 폴백:", err);
        setErrorMessage(`AI 호출 실패 (mock 데이터 사용중): ${err.message}`);
        result = mockAnalyze(userText);
        usedFallback = true;
      }
      if (cancelled) return;

      geminiHistoryRef.current = [
        ...historyWithUserTurn,
        { role: "model", parts: [{ text: result.followUpQuestion || "" }] },
      ];

      const isRejectedAgain =
        result.address &&
        rejectedAddressesRef.current.includes(result.address);

      if (result.address && !isRejectedAgain) {
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
        !isRejectedAgain &&
        (result.confidence >= LOCATION_CONFIDENCE_THRESHOLD ||
          (nextTurns.length >= FORCE_LOCATION_AFTER_TURNS && lastAddressGuessRef.current));

      if (shouldConfirmLocation) {
        setPendingLocation({
          address: result.address || lastAddressGuessRef.current,
        });
        setPhase("AWAITING_LOCATION_CONFIRM");
        return;
      }

      setAnalyzingText("");

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

  const handleConfirmLocation = (locationWithCoords) => {
    onLocationConfirmed(locationWithCoords, {
      turns,
      geminiHistory: geminiHistoryRef.current,
    });
  };

  const handleRejectLocation = () => {
    if (pendingLocation?.address) {
      rejectedAddressesRef.current.push(pendingLocation.address);
    }
    rejectCountRef.current += 1;
    setPendingLocation(null);

    if (rejectCountRef.current >= MAX_LOCATION_RETRIES) {
      onGiveUpLocation({
        turns,
        geminiHistory: geminiHistoryRef.current,
      });
      return;
    }

    setAnalyzingText("");
    setPhase("IDLE");
  };

  const latestTurn = turns[turns.length - 1];

  return (
    <div className="record-screen">
      <RecordHeader onBack={onBack} onClose={onClose} />

      <div className="record-screen__scroll">
        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        {phase === "RECORDING" && liveText && (
          <p className="record-screen__transcript">{liveText}</p>
        )}
        {phase === "ANALYZING" && analyzingText && (
          <p className="record-screen__transcript">{analyzingText}</p>
        )}
        {phase !== "RECORDING" && phase !== "ANALYZING" && latestTurn && (
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

      {phase === "AWAITING_LOCATION_CONFIRM" && pendingLocation && (
        <LocationConfirmModal
          address={pendingLocation.address}
          onConfirm={handleConfirmLocation}
          onReject={handleRejectLocation}
          onClose={handleRejectLocation}
        />
      )}
    </div>
  );
}

export default RecordScreen;