# 향담 (Hyangdam)

잊지 않고 싶은 추억을 기록하는 앱입니다. 흑백 사진을 AI로 컬러 복원하고, 짧은 영상으로 만들고, 사진 속 장소를 인식해 지도에 추억 핀을 남길 수 있습니다.

## 주요 기능

- **흑백사진 컬러 복원** — 사진을 올리면 OpenAI `gpt-image-1`이 인물·구도를 유지한 채 자연스러운 색을 입힙니다.
- **사진 → 영상 변환** — 컬러 복원된 사진을 Sora(`sora-2`)로 3~5초 영상으로 만듭니다. 사람이 움직이고 물이 흐르는 생동감 있는 연출.
- **AI 장소 인식 → 지도 핀** — 사진 속 간판·표지판 텍스트를 AI가 읽어 장소를 추정하고, 카카오맵 검색으로 좌표를 찾아 지도에 핀을 찍습니다. 인식 실패 시 직접 검색해서 등록할 수 있습니다.
- **추억 갤러리** — 저장한 사진·영상을 모아보고 최신순/오래된순으로 정렬합니다.
- **추억 지도** — 등록된 추억들을 카카오맵 위 핀으로 봅니다.

## 실행 방법

### 1. 설치

```bash
npm install
```

### 2. 환경 변수

프로젝트 루트에 `.env` 파일을 만들고 아래 두 키를 넣습니다. (`.env`는 gitignore 되어 있으니 각자 만들어야 합니다)

```
VITE_KAKAO_MAP_KEY=카카오맵_JavaScript_키
OPENAI_API_KEY=OpenAI_API_키
```

- 카카오맵 키: [Kakao Developers](https://developers.kakao.com)에서 앱 생성 후 JavaScript 키 발급, 플랫폼 도메인에 `http://localhost:5173` 등록
- OpenAI 키: [OpenAI Platform](https://platform.openai.com)에서 발급 (컬러 복원·장소 인식·영상 생성에 사용, 크레딧 필요)

### 3. 실행 (터미널 2개)

```bash
npm run server   # AI 변환 백엔드 (포트 3000)
npm run dev      # 프론트엔드 (포트 5173)
```

브라우저에서 http://localhost:5173 접속.

## 프로젝트 구조

```
server/            AI 변환 백엔드 (Express)
  index.js         컬러 복원 / 장소 인식 / 영상 생성 API
  outputs/         생성된 영상 저장 (gitignore)
src/
  common/          앱 프레임, 하단 네비, 테마
  homePage/        홈 (주간 달력, 지도 미리보기, 액션 카드)
  photoPage/       추억 사진 (컬러 변환, 영상 변환, 장소 확인)
  galleryPage/     추억 갤러리 (사진·영상 모아보기)
  mapPage/         추억 지도 (카카오맵, 핀)
  recordPage/      구술 기록 (예정)
```

## 백엔드 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/colorize` | 흑백사진 컬러 복원 (base64 이미지 → base64 이미지) |
| POST | `/api/detect-place` | 사진 속 텍스트로 장소 추정 (→ 카카오맵 검색어) |
| POST | `/api/animate` | 사진 → 영상 생성 시작 (작업 id 반환) |
| GET | `/api/animate/:id` | 영상 생성 상태 조회 / 완료 시 영상 URL |

프론트의 `/api` 요청은 Vite 프록시를 통해 백엔드(3000)로 전달됩니다.

## 참고 사항

- 생성된 영상은 `server/outputs`에 저장되며, 갤러리에서 영상을 재생하려면 백엔드 서버가 켜져 있어야 합니다.
- API 비용(대략): 컬러 복원 1장당 수십 원, 장소 인식 1원 미만, 영상 1건당 500~600원 수준.
- 사진·갤러리 데이터는 브라우저 localStorage에 저장됩니다.
