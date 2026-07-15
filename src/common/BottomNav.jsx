import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { Home, Menu, MapPin } from 'lucide-react';

const Nav = styled.nav`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 700;
  height: 68px;
  padding: 0 53px;
  border-radius: 24px 24px 0 0;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 -4px 24px rgba(34, 34, 59, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Item = styled(NavLink)`
  color: #5C5C5C;
  display: flex;
  padding: 8px;
  transition: transform 0.15s ease;
  &.active { color: #8EA5E8; }
  &:active { transform: scale(0.88); }
`;

export default function BottomNav() {
  return (
    <Nav>
      <Item to="/" end><Home size={28} strokeWidth={2} /></Item>
      <Item to="/gallery"><Menu size={28} strokeWidth={2} /></Item>
      <Item to="/map"><MapPin size={28} strokeWidth={2} /></Item>
    </Nav>
  );
}