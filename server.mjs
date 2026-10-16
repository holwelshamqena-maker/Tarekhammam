import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// السماح للواجهة الأمامية بالاتصال بالخادم بدون مشاكل (CORS)
app.use(cors());

// السماح باستقبال بيانات بحجم كبير (مهم في حال إرسال صور مرجعية Base64)
app.use(express.json({ limit: '10mb' }));

// مسار فحص حالة الخادم
app.get('/', (req, res) => {
  res.send('Banrify API is running successfully!');
});

// المسار الرئيسي لتوليد التصميمات
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, size, style, reference, platform } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'يرجى كتابة وصف التصميم أولاً.' });
    }

    // تحديد الأبعاد بناءً على المقاس المختار من الواجهة
    let width = 1080;
    let height = 1080;
    if (size.includes('1080 × 1350')) height = 1350;
    else if (size.includes('1920 × 1080')) { width = 1920; height = 1080; }
    else if (size.includes('1080 × 1920')) { width = 1080; height = 1920; }

    // تجهيز الوصف للذكاء الاصطناعي وإضافة تفاصيل الأسلوب الفني
    const enhancedPrompt = `${prompt}, ${style}, professional banner design, clean typography, commercial style, high resolution`;
    const safePrompt = encodeURIComponent(enhancedPrompt);

    // استخدام خدمة Pollinations AI المجانية لتوليد الصور (تولد صور مباشرة برابط)
    // نستخدم أرقام عشوائية (seed) لضمان الحصول على 3 صور مختلفة
    const images = [
      `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 10000)}&nologo=true`,
      `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 10000)}&nologo=true`,
      `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&seed=${Math.floor(Math.random() * 10000)}&nologo=true`
    ];

    // إرسال الصور للواجهة الأمامية
    res.json({ images });

  } catch (error) {
    console.error('Error generating images:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء توليد الصور. يرجى المحاولة لاحقاً.' });
  }
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
