import styled from 'styled-components';
import { Camera } from 'lucide-react';
import fieldImg from '../../asset/img/field.png';
import penImg from '../../asset/img/pen.png';

const Card = styled.button`
  position: relative;
  width: 175px;
  height: 227px;
  border-radius: 24px;
  overflow: hidden;
  transition: transform 0.15s ease;
  &:active { transform: scale(0.97); }
  background-image: url(${({ $img }) => $img});
  background-size: cover;
  background-position: center;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $glass }) =>
      $glass
        ? 'rgba(217, 217, 217, 0.47)'
        : 'linear-gradient(180deg, rgba(154, 149, 147, 0.24) 0%, rgba(220, 224, 189, 0.24) 100%)'};
    backdrop-filter: blur(0);
    transition: backdrop-filter 0.25s ease;
  }

  &:hover::after {
    backdrop-filter: blur(${({ $glass }) => ($glass ? '8px' : '2.35px')});
  }

  .section {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: #fff;
    z-index: 1;
    padding: 0 12px;
    text-align: center;
  }
  .section.bottom { bottom: 20px; }

  .title {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.12px;
  }
  .hint {
    font-size: 9.71px;
    font-weight: 400;
    letter-spacing: 0.1px;
    opacity: 0.56;
  }
`;

// 음성 파형 (기록 카드용) — 중앙 대칭의 가는 흰색 라인
function Waveform() {
  const bars = [9.7, 9.7, 9.7, 14.6, 9.7, 9.7, 9, 14.6, 9, 9.7, 9.7, 14.6, 9.7, 9.7, 9.7];
  return (
    <svg width="150" height="16" viewBox="0 0 150 16" fill="none">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 10.24 + 3}
          y={(16 - h) / 2}
          width="1"
          height={h}
          rx="0.5"
          fill="rgba(255,255,255,0.9)"
        />
      ))}
    </svg>
  );
}

export default function MemoryActionCard({ variant, onClick }) {
  const isPhoto = variant === 'photo';
  return (
    <Card $img={isPhoto ? fieldImg : penImg} $glass={isPhoto} onClick={onClick}>
      {isPhoto ? (
        <div className="section bottom">
          <Camera size={20} strokeWidth={1.2} color="rgba(255,255,255,0.7)" />
          <span className="title">추억의 사진이 있나요?</span>
          <span className="hint">Tap to upload</span>
        </div>
      ) : (
        <div className="section bottom">
          <Waveform />
          <span className="title">추억을 기록해요</span>
          <span className="hint">Tap to write</span>
        </div>
      )}
    </Card>
  );
}
