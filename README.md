# Banrify AI

واجهة عربية بسيطة لإنشاء بنرات حقيقية بالذكاء الاصطناعي.

## الملفات

- `index.html`: الواجهة الأمامية.
- `server.mjs`: خادم Node.js يحمي مفتاح الخدمة ويستدعي مولّد الصور.
- `package.json`: أمر التشغيل.
- `render.yaml`: إعداد نشر جاهز على Render.

## التشغيل محليًا

يتطلب Node.js 18 أو أحدث.

```bash
npm install
export MANUS_API_URL="ضع_رابط_خدمة_Manus_هنا"
export MANUS_API_KEY="ضع_المفتاح_هنا"
npm start
```

افتح: `http://localhost:8787`

في Windows PowerShell:

```powershell
$env:MANUS_API_URL="ضع_رابط_خدمة_Manus_هنا"
$env:MANUS_API_KEY="ضع_المفتاح_هنا"
npm start
```

## رفع الكود إلى GitHub

```bash
git init
git add .
git commit -m "Initial Banrify AI app"
git branch -M main
git remote add origin https://github.com/USERNAME/banrify-ai.git
git push -u origin main
```

استبدل `USERNAME` باسم حسابك واسم المستودع.

## النشر الصحيح

GitHub Pages يشغّل HTML فقط، لذلك لا يكفي لتوليد الصور الحقيقي. انشر مجلد المشروع كاملًا على Render أو Railway أو Vercel Functions.

### Render

1. أنشئ Web Service جديدًا من مستودع GitHub.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. أضف Environment Variables:
   - `MANUS_API_URL`
   - `MANUS_API_KEY`
5. لا تضع قيمة المفتاح داخل `index.html` أو GitHub.

### إذا استضفت الواجهة على GitHub Pages منفصلة

عدّل في `index.html` قيمة `API_BASE` لتكون رابط خادم Render، ثم ارفع الملف مجددًا. الأفضل نشر الواجهة والخادم معًا لأن الخادم يخدم `index.html` ويعالج `/api/generate`.

## الأمان

لا ترفع `MANUS_API_KEY` إلى GitHub. استخدم Environment Variables في خدمة الاستضافة. إذا ظهر المفتاح في مستودع عام، قم بإلغائه وإنشاء مفتاح جديد فورًا.
