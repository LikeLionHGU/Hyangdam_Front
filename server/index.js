// 흑백 사진 컬러 복원 백엔드
// 프론트에서 받은 이미지를 OpenAI gpt-image-1 이미지 편집 API로 보내
// 구도·인물·사물을 유지한 채 자연스러운 색을 입혀 돌려준다.
// 실행: npm run server  (프로젝트 루트 .env에 OPENAI_API_KEY 필요)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import OpenAI, { toFile } from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY를 불러오지 못했습니다. .env 파일을 확인해주세요.');
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// OpenAI 오류를 사용자가 이해할 수 있는 한국어 안내로 변환
function friendlyError(error, fallback) {
  const code = error?.code || error?.error?.code;
  if (code === 'billing_hard_limit_reached' || code === 'insufficient_quota') {
    return 'OpenAI 크레딧이 부족해요. 크레딧을 충전한 뒤 다시 시도해주세요.';
  }
  if (code === 'rate_limit_exceeded') {
    return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.';
  }
  return error instanceof Error ? error.message : fallback;
}

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '25mb' }));

// 생성된 영상 저장 폴더
const outputDirectory = path.join(process.cwd(), 'server', 'outputs');
fs.mkdirSync(outputDirectory, { recursive: true });
app.use('/outputs', express.static(outputDirectory));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: '향담 백엔드 서버가 정상적으로 실행 중입니다.' });
});

app.post('/api/colorize', async (req, res) => {
  try {
    const dataUrl = req.body?.image;
    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl || '');
    if (!match) {
      return res.status(400).json({ success: false, message: '이미지 데이터가 올바르지 않습니다.' });
    }

    const [, mimeType, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    const ext = mimeType.split('/')[1];
    const imageFile = await toFile(buffer, `photo.${ext}`, { type: mimeType });

    console.log(`컬러 변환 요청 (${mimeType}, ${(buffer.length / 1024).toFixed(0)}KB)`);

    const result = await client.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt:
        'Restore and realistically colorize this black-and-white photograph. Preserve the original faces, clothing, composition, objects, background, lighting, and details. Use natural and historically plausible colors. Do not add or remove people or objects.',
    });

    const imageBase64 = result.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error('OpenAI에서 생성된 이미지 데이터를 받지 못했습니다.');
    }

    return res.json({ success: true, image: `data:image/png;base64,${imageBase64}` });
  } catch (error) {
    console.error('이미지 컬러화 오류:', error);
    return res.status(500).json({ success: false, message: friendlyError(error, '이미지 컬러화 중 오류가 발생했습니다.') });
  }
});

// 사진 속 간판·표지판 텍스트를 읽어 장소를 추정한다.
// 반환: { texts: 사진에서 읽은 텍스트들, placeQuery: 카카오맵 검색어(특정 불가 시 null) }
app.post('/api/detect-place', async (req, res) => {
  try {
    const dataUrl = req.body?.image;
    if (!/^data:image\/(?:png|jpeg|webp);base64,/.test(dataUrl || '')) {
      return res.status(400).json({ success: false, message: '이미지 데이터가 올바르지 않습니다.' });
    }

    console.log('장소 인식 요청');

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                '이 사진이 찍힌 장소(대한민국 기준)를 최대한 추정해주세요. 다음 단서를 모두 활용하세요:',
                '1) 텍스트: 간판, 표지판, 현수막, 버스정류장, 지하철역 출구, 전화번호의 지역번호 등',
                '2) 랜드마크: 유명 건물, 궁궐, 사찰, 탑, 다리, 역사(驛舍), 대학 건물 등 알아볼 수 있는 곳',
                '3) 풍경·지형: 특징적인 산, 해변, 강, 호수, 시장 구조, 마을 형태 등',
                '',
                '추정한 장소를 카카오맵에서 검색 가능한 검색어로 만들어, 확신이 높은 순서로 최대 3개까지 candidates에 담아주세요.',
                '예: "한국안경 경산", "경복궁", "해운대해수욕장", "전주 한옥마을".',
                '상호명이 전국 체인이면 다른 단서로 지역을 좁혀보세요.',
                '오래된 흑백사진일 수 있으니 시대가 달라도 현재의 지명·명소 이름으로 검색어를 만드세요.',
                '전혀 특정할 수 없으면 candidates는 빈 배열로 하세요.',
                '반드시 JSON으로만 답하세요:',
                '{"texts": ["사진에서 읽은 텍스트", ...], "candidates": [{"query": "검색어", "confidence": "high|medium|low"}, ...]}',
              ].join('\n'),
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const parsed = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    const candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : [])
      .map((c) => (typeof c === 'string' ? c : c?.query))
      .filter((q) => typeof q === 'string' && q.trim() && q !== 'null')
      .map((q) => q.trim())
      .slice(0, 3);

    console.log('장소 인식 결과:', candidates, parsed.texts);
    return res.json({
      success: true,
      texts: parsed.texts || [],
      candidates,
      placeQuery: candidates[0] || null, // 하위 호환
    });
  } catch (error) {
    console.error('장소 인식 오류:', error);
    return res.status(500).json({ success: false, message: friendlyError(error, '장소 인식 중 오류가 발생했습니다.') });
  }
});

// 사진 → 짧은 영상 생성 시작 (Sora). 생성은 수 분 걸리므로 작업 id를 돌려주고,
// 프론트가 GET /api/animate/:id 로 완료될 때까지 폴링한다.
app.post('/api/animate', async (req, res) => {
  try {
    const dataUrl = req.body?.image;
    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl || '');
    if (!match) {
      return res.status(400).json({ success: false, message: '이미지 데이터가 올바르지 않습니다.' });
    }

    const [, mimeType, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    const size = req.body?.orientation === 'landscape' ? '1280x720' : '720x1280';
    const imageFile = await toFile(buffer, `photo.${mimeType.split('/')[1]}`, { type: mimeType });

    console.log(`영상 변환 요청 (${size}, ${(buffer.length / 1024).toFixed(0)}KB)`);

    const video = await client.videos.create({
      model: 'sora-2',
      prompt:
        'Bring this old photograph to life as a short, vivid cinematic clip. Make the scene feel truly alive and in motion: people in the photo naturally move — walking, turning their heads, smiling, gesturing, clothes and hair swaying in the breeze. If there is water such as a sea, river, or stream, it visibly flows with rippling waves and reflections. Trees and grass sway, clouds drift, vehicles move. Add a gentle camera movement. Keep every person, object, and the overall composition faithful to the original photograph — do not add new people or objects, and do not change the location or era.',
      input_reference: imageFile,
      seconds: '4',
      size,
    });

    console.log('영상 생성 시작:', video.id);
    return res.json({ success: true, id: video.id });
  } catch (error) {
    console.error('영상 변환 오류:', error);
    return res.status(500).json({ success: false, message: friendlyError(error, '영상 변환 중 오류가 발생했습니다.') });
  }
});

app.get('/api/animate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fileName = `${id}.mp4`;
    const outPath = path.join(outputDirectory, fileName);
    const url = `http://localhost:${PORT}/outputs/${fileName}`;

    if (fs.existsSync(outPath)) {
      return res.json({ success: true, status: 'completed', url });
    }

    const video = await client.videos.retrieve(id);

    if (video.status === 'completed') {
      const content = await client.videos.downloadContent(id);
      fs.writeFileSync(outPath, Buffer.from(await content.arrayBuffer()));
      console.log('영상 생성 완료:', fileName);
      return res.json({ success: true, status: 'completed', url });
    }
    if (video.status === 'failed') {
      return res.json({
        success: true,
        status: 'failed',
        message: video.error?.message || '영상 생성에 실패했습니다.',
      });
    }
    return res.json({ success: true, status: video.status, progress: video.progress ?? 0 });
  } catch (error) {
    console.error('영상 상태 조회 오류:', error);
    return res.status(500).json({ success: false, message: friendlyError(error, '영상 상태 조회 중 오류가 발생했습니다.') });
  }
});

app.listen(PORT, () => {
  console.log(`백엔드 서버 실행: http://localhost:${PORT}`);
});
