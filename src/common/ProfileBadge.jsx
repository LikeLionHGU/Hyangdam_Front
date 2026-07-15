import styled from 'styled-components';
import { User } from 'lucide-react';

const Badge = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadow.card};
`;

export default function ProfileBadge({ onClick, style }) {
  return (
    <Badge onClick={onClick} style={style} aria-label="프로필">
      <User size={20} strokeWidth={2} />
    </Badge>
  );
}