# Banrify AI + Gemini على Vercel

## 1) نشر هذا المجلد على Vercel

ارفع محتويات هذا المجلد إلى مستودع GitHub جديد، ثم في Vercel اختر:

`Add New → Project → Import` ثم اختر المستودع واضغط `Deploy`.

## 2) إضافة مفتاح Gemini

في Vercel افتح:

`Project → Settings → Environment Variables`

أضف:

```text
Key: GEMINI_API_KEY
Value: مفتاح Gemini الجديد
```

ثم اذهب إلى `Deployments` واضغط `Redeploy`.

## 3) اختبار الخدمة

افتح:

```text
https://اسم-مشروعك.vercel.app/api/health
```

ويجب أن تظهر:

```json
{"ok":true,"gemini":true}
```

## 4) تعديل موقع GitHub Pages

في ملف `index.html` الخاص بموقع GitHub Pages، ابحث عن:

```js
const API_BASE=window.BANRIFY_API_URL||'https://ضع-رابط-vercel-هنا.vercel.app';
```

واستبدل الرابط برابط مشروع Vercel الحقيقي، مثل:

```js
const API_BASE=window.BANRIFY_API_URL||'https://banrify-vercel.vercel.app';
```

ثم اضغط `Commit changes`.

لا تضع مفتاح Gemini في GitHub أو داخل `index.html`.
