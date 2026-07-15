import styled from 'styled-components';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

const Stage = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: ${({ theme }) => theme.colors.ink};
  @media (min-width: 520px) { align-items: center; padding: 32px 0; }
`;

const Frame = styled.div`
  position: relative;
  width: 100%;
  max-width: ${({ theme }) => theme.layout.frameWidth};
  height: 100vh;
  height: 100dvh;
  background: ${({ theme }) => theme.colors.bg};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  @media (min-width: 520px) {
    height: 852px;
    max-height: 92vh;
    border-radius: 32px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
  }
`;
const Content = styled.main`
  flex: 1;
  overflow-y: auto;
  position: relative;
  background: ${({ theme }) => theme.colors.bg};
  /* 유리 네비 바가 콘텐츠 위에 뜨므로, 스크롤 끝이 바에 가리지 않도록 여백 확보 */
  padding-bottom: ${({ $nav }) => ($nav ? '68px' : '0')};
`;

export default function AppFrame() {
  const { pathname } = useLocation();
  const hideNav = pathname === '/map' || pathname === '/photo';
  return (
    <Stage>
      <Frame>
        <Content $nav={!hideNav}><Outlet /></Content>
        {!hideNav && <BottomNav />}
      </Frame>
    </Stage>
  );
}