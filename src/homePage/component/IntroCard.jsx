import styled from 'styled-components';

const Card = styled.button`
  text-align: left;
  background: ${({ theme }) => theme.colors.parchmentSoft};
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: 14px;
  padding: 16px 18px;
  .tag { font-family: ${({ theme }) => theme.font.mono}; font-size: 10px; color: ${({ theme }) => theme.colors.rust}; letter-spacing: 0.05em; }
  h3 { font-family: ${({ theme }) => theme.font.display}; font-size: 15px; margin: 4px 0 4px; color: ${({ theme }) => theme.colors.ink}; }
  p { font-size: 12px; color: ${({ theme }) => theme.colors.inkSoft}; margin: 0; }
`;

export default function IntroCard({ tag, title, description, onClick }) {
  return (
    <Card onClick={onClick}>
      <span className="tag">{tag}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </Card>
  );
}