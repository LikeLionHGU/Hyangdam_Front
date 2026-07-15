import { useRef, useState } from "react";

function KeywordCarousel({ turns }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth;
    const index = Math.round(el.scrollLeft / pageWidth);
    setActiveIndex(index);
  };

  return (
    <>
      <div
        className="keyword-panel__pages"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {turns.map((turn, i) => (
          <div className="keyword-panel__page" key={i}>
            <div className="keyword-panel__chips">
              {turn.keywords.length > 0 ? (
                turn.keywords.map((kw) => (
                  <span key={kw} className="keyword-chip">
                    {kw}
                  </span>
                ))
              ) : (
                <span className="keyword-chip keyword-chip--muted">
                  키워드 없음
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {turns.length > 1 && (
        <div className="keyword-panel__dots">
          {turns.map((_, i) => (
            <span
              key={i}
              className={
                i === activeIndex ? "page-dot page-dot--active" : "page-dot"
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

export default KeywordCarousel;