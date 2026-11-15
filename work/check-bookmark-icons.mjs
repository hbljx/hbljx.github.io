import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const output = 'C:/Users/Love/Documents/Codex/2026-11-15/xian/outputs';
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({channel:'chrome'});
try {
  for (const [name,width,height] of [['desktop',1280,900],['mobile',390,844]]) {
    const page = await browser.newPage({viewport:{width,height}, deviceScaleFactor:1});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.room-mark img',{state:'attached'});
    const result=await page.evaluate(async()=>{
      const icons=[...document.querySelectorAll('.room-mark img')];
      const urls=[...new Set(icons.map(i=>i.src))];
      for(const src of urls) {const img=new Image();img.src=src;await img.decode();if(img.naturalWidth!==128)throw Error(src);}
      const {categoryIcon}=await import('/navigation/category-icons.js');
      if(categoryIcon('unknown')!=='assets/bookmark-icons/chest.webp')throw Error('fallback');
      return {cards:icons.length,unique:urls.length,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(result.overflow,false);
    assert.deepEqual(errors,[]);
    await page.locator('#scene-about-links').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-90));
    await page.waitForTimeout(800);
    await page.screenshot({path:output+'/bookmarks-'+name+'.png'});
    console.log(name,JSON.stringify(result));
    await page.close();
  }
  const icons=JSON.parse(await fs.readFile(new URL('./bookmark-generation.json',import.meta.url),'utf8')).icons;
  const page=await browser.newPage({viewport:{width:1000,height:980},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:8765/');
  await page.setContent(`<html><head><style>body{margin:0;background:#14271e;color:#f5f0e7;font-family:Arial,sans-serif;padding:36px;box-sizing:border-box}h1{font-size:28px;margin:0 0 8px}p{color:#bed5c4;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.item{height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#20372b;border:1px solid #415547;border-radius:12px}.item img{width:112px;height:112px;object-fit:contain}.item span{color:#dce9df;font-size:13px}</style></head><body><h1>Pastel Minecraft · Bookmark Icons</h1><p>19 original AI-generated voxel collectibles</p><div class="grid">${icons.map(i=>`<div class="item"><img src="http://127.0.0.1:8765/assets/bookmark-icons/${i.name}.webp"><span>${i.name}</span></div>`).join('')}</div></body></html>`);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:output+'/bookmark-icons-preview.png'});
} finally {await browser.close();}
