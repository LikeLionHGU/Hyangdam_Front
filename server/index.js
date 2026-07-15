// 흑백 사진 컬러 복원 백엔드
// 프론트에서 받은 이미지를 OpenAI gpt-image-1 이미지 편집 API로 보내
// 구도·인물·사물을 유지한 채 자연스러운 색을 입혀 돌려준다.
// 실행: npm run server  (프로젝트 루트 .env에 OPENAI_API_KEY 필요)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

// 공유된 추억 저장 폴더
const sharesDirectory = path.join(process.cwd(), 'server', 'shares');
fs.mkdirSync(sharesDirectory, { recursive: true });
app.use('/shares', express.static(sharesDirectory));

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

// 추억 공유 링크 생성: 사진(원본·컬러)과 영상을 코드로 저장하고 공유 페이지 주소를 만든다.
// body: { title, items: [{ label, image?(dataURL), video?(경로) }] }
app.post('/api/share', async (req, res) => {
  try {
    const { title, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '공유할 항목이 없습니다.' });
    }

    const code = crypto.randomBytes(4).toString('hex');
    const manifest = { title: title || '소중한 추억', createdAt: Date.now(), files: [] };

    items.forEach((item, i) => {
      if (item.image) {
        const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(item.image);
        if (!match) return;
        const fileName = `${code}-${i}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
        fs.writeFileSync(path.join(sharesDirectory, fileName), Buffer.from(match[2], 'base64'));
        manifest.files.push({ type: 'photo', label: item.label || '', src: `/shares/${fileName}` });
      }
      if (item.video) {
        // 영상은 이미 /outputs 에 있으므로 경로만 참조
        const videoPath = item.video.startsWith('http') ? new URL(item.video).pathname : item.video;
        manifest.files.push({ type: 'video', label: item.label || '', src: videoPath });
      }
    });

    fs.writeFileSync(path.join(sharesDirectory, `${code}.json`), JSON.stringify(manifest));
    console.log('공유 링크 생성:', code, `(${manifest.files.length}개 항목)`);
    return res.json({ success: true, code });
  } catch (error) {
    console.error('공유 링크 생성 오류:', error);
    return res.status(500).json({ success: false, message: '공유 링크 생성에 실패했습니다.' });
  }
});

// 공유 페이지: 친구가 앱 없이 브라우저로 추억을 볼 수 있는 화면
app.get('/share/:code', (req, res) => {
  const code = req.params.code.replace(/[^a-z0-9]/gi, '');
  const manifestPath = path.join(sharesDirectory, `${code}.json`);

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).send(`<!doctype html><html lang="ko"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <body style="font-family:sans-serif;background:#F3F7FF;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
      <p style="color:#909090;font-size:17px;">존재하지 않거나 만료된 공유 링크예요.</p></body></html>`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const media = manifest.files
    .map((f) =>
      f.type === 'video'
        ? `<figure><video src="${f.src}" autoplay loop muted playsinline controls></video><figcaption>${f.label}</figcaption></figure>`
        : `<figure><img src="${f.src}" alt="추억 사진"><figcaption>${f.label}</figcaption></figure>`
    )
    .join('\n');

  res.send(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>향담 — 추억 공유</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Pretendard', -apple-system, sans-serif; background: #F3F7FF; color: #5C5C5C; }
      .wrap { max-width: 480px; margin: 0 auto; padding: 28px 20px 40px; }
      h1 { font-size: 22px; font-weight: 600; line-height: 1.4; margin-bottom: 4px; }
      .sub { font-size: 14px; color: #909090; margin-bottom: 24px; }
      figure { margin-bottom: 20px; }
      img, video { width: 100%; border-radius: 20px; display: block; box-shadow: 0 4px 16px rgba(34,34,59,0.1); }
      figcaption { font-size: 13px; color: #909090; margin-top: 8px; text-align: center; }
      footer { text-align: center; font-size: 13px; color: #ADADAD; margin-top: 32px; }
    </style></head><body>
    <div class="wrap">
      <h1>${manifest.title}</h1>
      <p class="sub">소중한 추억을 함께 봐요</p>
      ${media}
      <footer>향담(Hyangdam)에서 만든 추억이에요</footer>
    </div></body></html>`);
});

app.listen(PORT, () => {
  console.log(`백엔드 서버 실행: http://localhost:${PORT}`);
});
