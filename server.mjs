import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const API_URL = process.env.MANUS_API_URL;
const API_KEY = process.env.MANUS_API_KEY;
const HTML = path.join(process.cwd(), 'index.html');

function json(res, status, data) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve,reject)=>{let chunks=[];let size=0;req.on('data',c=>{size+=c.length;if(size>15*1024*1024){reject(new Error('الطلب كبير جدًا'));req.destroy();}else chunks.push(c)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch(e){reject(new Error('بيانات الطلب غير صالحة'))}});req.on('error',reject)});
}
const ratios={'1080 × 1080':'1:1','1080 × 1350':'4:5','1920 × 1080':'16:9','1080 × 1920':'9:16'};
function promptFor(input, variant){
  const exact = input.prompt || 'إعلان احترافي لخدمة تجارية';
  const styles=['premium commercial photography, bold colorful lighting','clean modern advertising, strong focal point and elegant composition','high-energy social media campaign, polished studio photography'][variant];
  return `Create a professional marketing banner image for a real business. ${styles}. Use the attached reference image as visual inspiration for the business context, products and color energy, but create a new polished composition. The design must have a clear focal subject, realistic materials, commercial studio lighting, crisp details, intentional whitespace, and a premium agency-quality finish. Target platform: ${input.platform || 'social media'}. Aspect ratio: ${ratios[input.size] || '1:1'}. Exact Arabic copy that must appear in the design: "${exact}". Add a short Arabic call to action: "اطلب عرضك الآن". Keep text large, minimal, readable, and centered in safe areas. Do not add unrelated logos, fake phone numbers, watermarks, gibberish, or extra paragraphs.`;
}
async function generateOne(input, variant){
  const body={model:'MODEL_GPT_IMAGE_2',prompt:promptFor(input,variant)};
  if(input.reference?.startsWith('data:')){const m=input.reference.match(/^data:([^;]+);base64,(.*)$/s);if(m)body.originalImages=[{mimeType:m[1],b64Json:m[2]}]}
  const r=await fetch(`${API_URL}/images.v1.ImageService/GenerateImage`,{method:'POST',headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json','connect-protocol-version':'1'},body:JSON.stringify(body)});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw new Error(`خدمة الصور أعادت استجابة غير مفهومة (${r.status})`)}
  if(!r.ok || data.error) throw new Error(data.error?.message || `فشل التوليد (${r.status})`);
  const image=data.image||data.images?.[0];
  if(!image) throw new Error('لم تُرجع الخدمة صورة');
  if(image.b64Json)return `data:${image.mimeType||'image/png'};base64,${image.b64Json}`;
  if(image.url)return image.url;
  throw new Error('صيغة الصورة غير مدعومة');
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'});return res.end()}
    if(req.method==='GET' && req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(await fs.readFile(HTML))}
    if(req.method==='GET' && req.url==='/health'){return json(res,200,{ok:true,ai:Boolean(API_URL&&API_KEY)})}
    if(req.method==='POST' && req.url==='/api/generate'){
      if(!API_URL||!API_KEY)return json(res,503,{error:'خدمة الذكاء الاصطناعي غير مفعّلة على الخادم'});
      const input=await readBody(req);
      if(!input.prompt?.trim())return json(res,400,{error:'اكتب وصف التصميم أولًا'});
      const images=await Promise.all([0,1,2].map(i=>generateOne(input,i)));
      return json(res,200,{images,format:'jpg-ready'});
    }
    res.writeHead(404);res.end('Not found');
  }catch(e){console.error(e);json(res,500,{error:e.message||'حدث خطأ غير متوقع'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Banrify AI server listening on http://0.0.0.0:${PORT}`));
