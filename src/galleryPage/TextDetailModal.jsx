import styled from "styled-components";
import { X, Share2, Trash2, MapPin } from "lucide-react";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 35, 0.45);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Sheet = styled.div`
  width: 100%;
  max-width: 360px;
  max-height: 85vh;
  background: #fff;
  border-radius: 20px;
  padding: 20px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: #5c5c5c;
  }

  button {
    background: none;
    border: none;
    color: #adadad;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
`;

const PlaceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #647abb;
`;

const Summary = styled.div`
  background: #eef1ff;
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #647abb;
  font-weight: 500;
`;

const OriginalLabel = styled.p`
  font-size: 12px;
  color: #909090;
  margin: 4px 0 0;
`;

const Original = styled.div`
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.75;
  color: #5c5c5c;
  white-space: pre-wrap;
  max-height: 40vh;
  padding-right: 4px;
`;

const ShareBtn = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: #ADC0F8;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: #909090;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-decoration: underline;
  align-self: center;
`;

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일의 추억`;
}

export default function TextDetailModal({ item, onClose, onDelete, onShare }) {
  return (
    <Overlay onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>
        <Head>
          <h3>{formatDate(item.createdAt)}</h3>
          <button onClick={onClose} aria-label="닫기">
            <X size={22} />
          </button>
        </Head>

        {item.place && (
          <PlaceRow>
            <MapPin size={14} />
            <span>{item.place}</span>
          </PlaceRow>
        )}

        {item.text && <Summary>{item.text}</Summary>}

        {item.fullTranscript && (
          <>
            <OriginalLabel>원본 이야기</OriginalLabel>
            <Original>{item.fullTranscript}</Original>
          </>
        )}

        <ShareBtn onClick={onShare}>
          <Share2 size={18} />
          친구에게 공유하기
        </ShareBtn>

        <DeleteBtn onClick={onDelete}>
          <Trash2 size={14} />
          이 추억 지우기
        </DeleteBtn>
      </Sheet>
    </Overlay>
  );
}