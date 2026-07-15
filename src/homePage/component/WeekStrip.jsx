import styled from 'styled-components';

const Strip = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 50px;
`;

const Day = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 4px 0;
  width: 44px;
`;
const Dow = styled.span`
  font-size: 12px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 0.24px;
  text-align: center;
  color: #5C5C5C;
`;

const Num = styled.span`
  width: 42px;
  height: 42px;
  border-radius: 29px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => ($active ? '#8EA5E8' : 'rgba(214, 223, 251, 0.7)')};

  font-size: 12px;
  font-weight: 400;
  line-height: normal;
  letter-spacing: 0.24px;
  text-align: center;
  color: ${({ $active }) => ($active ? '#FFF' : '#ADADAD')};
`;

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(centerDate) {
  const start = new Date(centerDate);
  start.setDate(start.getDate() - centerDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function WeekStrip({ selected, onSelect }) {
  const dates = getWeekDates(selected);

  return (
    <Strip>
      {dates.map((d) => {
        const active = d.toDateString() === selected.toDateString();
        return (
          <Day key={d.toISOString()} onClick={() => onSelect(d)}>
            <Dow>{DOW[d.getDay()]}</Dow>
            <Num $active={active}>{d.getDate()}</Num>
          </Day>
        );
      })}
    </Strip>
  );
}