import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');

  * { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  body {
    font-family: ${({ theme }) => theme.font.body};
    color: ${({ theme }) => theme.colors.ink};
    background: ${({ theme }) => theme.colors.bg};
    -webkit-font-smoothing: antialiased;
  }
  button { font-family: inherit; border: none; background: none; cursor: pointer; }
  input, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  :focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary}; outline-offset: 2px; }
`;