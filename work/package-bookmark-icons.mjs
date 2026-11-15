import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const manifest = JSON.parse(await fs.readFile(new URL('./bookmark-generation.json', import.meta.url), 'utf8'));
const out = new URL('../assets/bookmark-icons/', import.meta.url);
await fs.mkdir(out, { recursive: true });
let browser;
try { browser = await chromium.launch({channel:'chrome'}); }
catch { browser = await chromium.launch(); }
const page = await browser.newPage();
const report = [];
for (const item of manifest.icons) {
  const source = await fs.readFile(item.source);
  const result = await page.evaluate(async data => {
    const image = new Image(); image.src = data; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const scale = Math.min(128 / image.width, 128 / image.height);
    ctx.drawImage(image, (128-image.width*scale)/2, (128-image.height*scale)/2, image.width*scale, image.height*scale);
    const pixels = ctx.getImageData(0,0,128,128).data;
    return { url:canvas.toDataURL('image/webp',0.9), transparent:pixels.some((v,i)=>i%4===3&&v===0) };
  }, 'data:image/png;base64,'+source.toString('base64'));
  if (!result.transparent) throw new Error(item.name+' has no transparency');
  const bytes = Buffer.from(result.url.split(',')[1], 'base64');
  await fs.writeFile(new URL(item.name+'.webp',out),bytes);
  report.push({name:item.name,bytes:bytes.length,transparent:result.transparent});
}
await browser.close();
console.log(JSON.stringify(report,null,2));
