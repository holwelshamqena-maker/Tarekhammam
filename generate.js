const MODEL = 'gemini-2.5-flash-image-preview';
const ORIGIN = 'https://holwelshamqena-maker.github.io';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function promptFor(body, variant) {
  const styles = [
    'premium commercial photography with bold colorful lighting',
    'clean modern advertising composition with elegant contrast',
    'high-energy social media campaign with polished studio quality'
  ];
  return `Create one professional Arabic marketing banner for a real business. ${styles[variant]}. Use the reference image as visual inspiration for the products, context, colors and business type, but create a new original composition. The exact Arabic business description to communicate is: "${body.prompt}". Target platform: ${body.platform || 'social media'}. Requested size/aspect ratio: ${body.size || '1080 × 1080'}. Style: ${body.style || 'professional colorful'}. Add only a short, readable Arabic call to action: "اطلب عرضك الآن". Keep the layout premium, realistic, high resolution, with one clear focal point, strong hierarchy and safe margins. Avoid fake phone numbers, unrelated logos, watermarks, gibberish, excessive text and crowded layouts.`;
}

async function generateOne(body, variant) {
  const parts = [{ text: promptFor(body, variant) }];
  if (body.reference && body.reference.startsWith('data:')) {
    const match = body.reference.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Gemini error ${response.status}`);
  const out = data?.candidates?.flatMap(c => c.content?.parts || []).find(p => p.inlineData?.data);
  if (!out) throw new Error('لم تُرجع Gemini صورة. تأكد من تفعيل نموذج الصور في حسابك.');
  return `data:${out.inlineData.mimeType || 'image/png'};base64,${out.inlineData.data}`;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'استخدم POST فقط' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'لم تتم إضافة GEMINI_API_KEY في Vercel Environment Variables' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!body.prompt?.trim()) return res.status(400).json({ error: 'اكتب وصف التصميم أولًا' });
    const images = await Promise.all([0, 1, 2].map(i => generateOne(body, i)));
    return res.status(200).json({ images });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'تعذر توليد الصور' });
  }
}
