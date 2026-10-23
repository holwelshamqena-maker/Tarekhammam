// Vercel Serverless Function — يولّد 3 تصاميم عبر Gemini
// المفتاح يُقرأ من متغير البيئة GEMINI_API_KEY ولا يظهر للمتصفح أبداً.

// يُجرَّب النموذج المحدد في GEMINI_MODEL أولاً، ثم البقية بالترتيب إذا لم يكن الاسم موجوداً
const MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.1-flash-image-preview',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
].filter(Boolean);

class ApiError extends Error {
  constructor(message, fatal) { super(message); this.fatal = fatal; }
}

function friendly(status, msg) {
  const m = String(msg || '');
  if (status === 429 || /quota|rate limit|RESOURCE_EXHAUSTED|limit: 0/i.test(m)) {
    return new ApiError('حساب Gemini المجاني لا يسمح بتوليد الصور أو استُنفد الحد. فعّل الفوترة (Set up billing) في Google AI Studio ثم أعد المحاولة.', true);
  }
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(m)) {
    return new ApiError('مفتاح Gemini غير صالح أو لا يملك صلاحية. أنشئ مفتاحاً جديداً وضعه في GEMINI_API_KEY ثم Redeploy.', true);
  }
  return null;
}

const RATIOS = {
  '1080 × 1080': '1:1',
  '1080 × 1350': '4:5',
  '1920 × 1080': '16:9',
  '1080 × 1920': '9:16',
};

const STYLES = {
  'احترافي ملوّن': 'professional commercial advertising design, rich vibrant color palette, clean balanced layout, crisp studio lighting',
  'فاخر وهادئ': 'premium luxury aesthetic, calm muted palette with elegant gold or deep navy accents, generous white space, soft cinematic lighting',
  'جريء وحيوي': 'bold energetic poster design, high-contrast saturated colors, dynamic diagonal composition, strong visual impact',
  'بسيط وحديث': 'minimal modern design, flat clean shapes, limited color palette, lots of breathing room, contemporary typography feel',
};

// ثلاثة اتجاهات مختلفة للتكوين
const DIRECTIONS = [
  'Direction A: product/service photography as the hero, centered, with a short headline above it.',
  'Direction B: split layout, large headline area on one side and a realistic scene of the service on the other.',
  'Direction C: lifestyle scene with real-looking workers/customers and the printed products, headline overlaid in a clear area.',
];

function buildPrompt({ prompt, style, platform, ratio }, direction) {
  return [
    'Design a professional marketing banner / advertisement image.',
    `Brief (Arabic): ${prompt}`,
    `Visual style: ${STYLES[style] || STYLES['احترافي ملوّن']}.`,
    platform ? `Intended platforms: ${platform}.` : '',
    `Aspect ratio ${ratio}.`,
    direction,
    'Text rules: any text in the image must be Arabic, spelled correctly, right-to-left, in a clean bold modern Arabic font, large and highly legible with strong contrast. Use very little text: one short headline and at most one short supporting line. Copy business names and phone numbers EXACTLY as they appear in the brief; do not invent phone numbers, addresses or logos.',
    'Quality: sharp, high-resolution, polished commercial design, balanced composition, no watermarks, no gibberish text, no distorted hands or faces.',
  ].filter(Boolean).join('\n');
}

function parseDataUrl(s) {
  const m = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(s || '');
  return m ? { mime: m[1], data: m[2] } : null;
}

async function generateOne(apiKey, text, ref, ratio) {
  const parts = [{ text }];
  if (ref) {
    parts.push({ inline_data: { mime_type: ref.mime, data: ref.data } });
    parts[0].text += '\nUse the attached reference image to match the product, colors and overall style.';
  }
  let lastErr = new Error('لم يتوفر أي نموذج صور.');
  for (const model of MODELS) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: ratio },
          },
        }),
      }
    );
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = json?.error?.message || `Gemini HTTP ${r.status}`;
      const f = friendly(r.status, msg);
      if (f) throw f;
      lastErr = new Error(`${model}: ${msg}`);
      continue; // غالباً اسم النموذج غير موجود، جرّب التالي
    }
    const out = (json.candidates?.[0]?.content?.parts || []).find(
      (p) => (p.inlineData || p.inline_data)?.data
    );
    const img = out && (out.inlineData || out.inline_data);
    if (!img) {
      const reason = json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason || 'no image';
      lastErr = new Error(`لم يُرجع النموذج صورة (${reason})`);
      continue;
    }
    return `data:${img.mimeType || img.mime_type || 'image/png'};base64,${img.data}`;
  }
  throw lastErr;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات Vercel.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const prompt = String(body.prompt || '').trim().slice(0, 1500);
  if (!prompt) return res.status(400).json({ error: 'اكتب وصف التصميم أولاً.' });

  const ratio = RATIOS[body.size] || '1:1';
  const ref = parseDataUrl(body.reference);
  const input = { prompt, style: body.style, platform: String(body.platform || '').slice(0, 100), ratio };

  const results = await Promise.allSettled(
    DIRECTIONS.map((d) => generateOne(apiKey, buildPrompt(input, d), ref, ratio))
  );

  const images = results.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  if (!images.length) {
    const msg = results.find((x) => x.status === 'rejected')?.reason?.message || 'تعذر توليد الصور';
    return res.status(502).json({ error: msg });
  }
  res.status(200).json({ images, ratio });
};
