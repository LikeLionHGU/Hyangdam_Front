import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { Home, Menu, CircleUser } from 'lucide-react';

const Nav = styled.nav`
  flex-shrink: 0;
  width: 100%;
  height: 68px;
  padding: 0 53px;
  border-radius: 24px 24px 0 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Item = styled(NavLink)`
  color: #5C5C5C;
  display: flex;
  &.active { color: ${({ theme }) => theme.colors.primary}; }
`;

export default function BottomNav() {
  return (
    <Nav>
      <Item to="/" end><Home size={28} strokeWidth={2} /></Item>
      <Item to="/gallery"><Menu size={28} strokeWidth={2} /></Item>
      <Item to="/map"><CircleUser size={28} strokeWidth={2} /></Item>
    </Nav>
  );
}