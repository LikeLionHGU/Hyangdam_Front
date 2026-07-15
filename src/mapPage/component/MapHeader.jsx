import styled from 'styled-components';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Bar = styled.div`
  flex-shrink: 0;
  height: 56px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F7FF;
  z-index: 600;
`;

const Back = styled.button`
  position: absolute;
  left: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5C5C5C;
`;

const Title = styled.span`
  font-size: 15px;
  font-weight: 400;
  line-height: 16.65px;
  color: #5C5C5C;
`;

export default function MapHeader() {
  const navigate = useNavigate();
  return (
    <Bar>
      <Back onClick={() => navigate(-1)} aria-label="뒤로 가기">
        <ChevronLeft size={28} />
      </Back>
      <Title>추억 지도</Title>
    </Bar>
  );
}
