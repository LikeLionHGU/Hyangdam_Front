import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import RecordHeader from "./RecordHeader.jsx";
import KeywordCarousel from "./KeywordCarousel.jsx";
import LocationConfirmModal from "./LocationConfirmModal.jsx";
import LocationInlineConfirm from "./LocationInlineConfirm.jsx";
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
  const [showMapModal, setShowMapModal] = useState(false); // '네' 누르면 지도 확인 모달
  const [errorMessage, setErrorMessage] = useState(null);
  const inputModeRef = useRef("text");
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const finalTextRef = useRef(""); // 확정된 음성 텍스트 (중간 결과와 분리 관리)
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
      // 확정된 문장은 누적하고, 말하는 중인 중간 결과는 뒤에 붙여 실시간 표시
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTextRef.current = finalTextRef.current
            ? finalTextRef.current + " " + transcript
            : transcript;
        } else {
          interimText += transcript;
        }
      }
      setLiveText((finalTextRef.current + " " + interimText).trim());
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
    finalTextRef.current = "";
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
        setAnalyzingText("");
        setLiveText(""); // 입력창에 글씨가 남지 않도록 정리
        setPhase("AWAITING_LOCATION_CONFIRM");
        return;
      }

      setAnalyzingText("");

      if (!usedFallback && inputModeRef.current === "voice" && recognitionRef.current) {
        finalTextRef.current = ""; // 다음 턴 녹음 전에 이전 확정 텍스트 초기화
        setLiveText("");
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

  // 인라인 '아니오' → 직접 검색 화면으로 이동
  const handleRejectLocation = () => {
    if (pendingLocation?.address) {
      rejectedAddressesRef.current.push(pendingLocation.address);
    }
    setShowMapModal(false);
    onGiveUpLocation({
      turns,
      geminiHistory: geminiHistoryRef.current,
    });
  };

  const latestTurn = turns[turns.length - 1];

  // 대화가 쌓이면 항상 최신 내용이 보이도록 아래로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, liveText, analyzingText, phase]);

  return (
    <div className="record-screen">
      <RecordHeader onBack={onBack} onClose={onClose} />

      <div className="record-screen__scroll" ref={scrollRef}>
        {errorMessage && <div className="error-banner">{errorMessage}</div>}
        {turns.length === 0 && phase === "IDLE" && !liveText && (
          <div className="record-empty">
            <p className="record-empty__title">추억을 들려주세요</p>
            <p className="record-empty__sub">
              아래 마이크를 눌러 이야기를 시작하거나<br />
              떠오르는 기억을 자유롭게 적어보세요
            </p>
          </div>
        )}

        {/* 지금까지의 대화가 채팅처럼 쌓인다 */}
        <div className="chat-log">
          {turns.map((turn, i) => (
            <Fragment key={i}>
              <p className="chat-msg chat-msg--user">{turn.transcript}</p>
              {turn.followUpQuestion && (
                <p className="chat-msg chat-msg--ai">{turn.followUpQuestion}</p>
              )}
            </Fragment>
          ))}
          {phase === "RECORDING" && liveText && (
            <p className="chat-msg chat-msg--user chat-msg--live">{liveText}</p>
          )}
          {phase === "ANALYZING" && analyzingText && (
            <p className="chat-msg chat-msg--user">{analyzingText}</p>
          )}
        </div>

        {phase === "ANALYZING" && (
          <div className="record-analyzing">
            <div className="thinking-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <p className="record-analyzing__label">기억을 정리하고 있어요</p>
          </div>
        )}
      </div>

      <div className="record-fixed-panel">
        {turns.length > 0 && (
          <div className="keyword-panel">
            <KeywordCarousel turns={turns} />
            {phase === "AWAITING_LOCATION_CONFIRM" && pendingLocation && (
              <LocationInlineConfirm
                address={pendingLocation.address}
                onConfirm={() => setShowMapModal(true)}
                onReject={handleRejectLocation}
              />
            )}
          </div>
        )}
      </div>

      <div className="record-bottom-area">
        <div className="record-bottom-bar">
          {/* 항상 파형 아이콘 표시 — 녹음 중에만 움직인다 */}
          <div className={phase === "RECORDING" ? "voice-wave" : "voice-wave voice-wave--idle"}>
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="voice-wave__bar" />
            ))}
          </div>
        </div>

        {phase === "RECORDING" ? (
          <button
            type="button"
            className="mic-btn mic-btn--active"
            onClick={stopRecording}
            aria-label="녹음 종료"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                fill="rgba(173, 173, 173, 0.2)"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className="mic-btn"
            onClick={startRecording}
            aria-label="음성 녹음"
          >
            <MicIcon />
          </button>
        )}
      </div>

      {showMapModal && pendingLocation && (
        <LocationConfirmModal
          address={pendingLocation.address}
          onConfirm={handleConfirmLocation}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}

export default RecordScreen;