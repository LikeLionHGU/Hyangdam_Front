import styled from 'styled-components';

const Wrap = styled.div`
  height: 100%; display: flex; align-items: center; justify-content: center; padding: 32px; text-align: center;
`;
const Text = styled.p` font-size: 13px; line-height: 1.7; color: ${({ theme }) => theme.colors.inkSoft}; `;

export default function RecordPage() {
  return (
    <Wrap>
      <Text>구술 채록 화면은 다음 단계에서 만들어요.<br />(음성 녹음 → STT → AI 후속 질문 생성)</Text>
    </Wrap>
  );
}