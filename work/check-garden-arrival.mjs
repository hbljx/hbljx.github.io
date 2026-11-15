import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const errors=[];
try {
for(const [width,height,motion] of [[1440,960,'no-preference'],[390,844,'no-preference'],[320,568,'no-preference'],[844,390,'no-preference'],[390,844,'reduce']]) {
 const page=await browser.newPage({viewport:{width,height},reducedMotion:motion});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5585/');
 await page.waitForSelector('.footer-world');
 await page.waitForSelector('.room-card');
 assert.equal(await page.locator('.scene-counter').count(),0);
 assert.equal(await page.locator('#scene-writing .chapter-strip').innerText(),'');
 assert.equal(await page.locator('#scene-pool .scene-next').getAttribute('href'),'#about-us');
 for(const phase of [.1,.5,1]) {
  await page.evaluate(phase=>{const j=document.querySelector('.garden-arrival'),s=document.querySelector('#about-us');scrollTo({top:scrollY+j.getBoundingClientRect().top+s.offsetTop-innerHeight*(.96-.76*phase),behavior:'instant'});},phase);
  await page.waitForTimeout(300);
  const p=await page.locator('.garden-arrival').evaluate(el=>Number(el.style.getPropertyValue('--arrival')));
  if(motion==='reduce')assert.equal(p,1);else assert.ok(Math.abs(p-(phase*phase*(3-2*phase)))<.015,`progress ${p} at ${phase}`);
  if(width===1440&&phase===.5)await page.screenshot({path:'work/garden-transition-mid.png'});
 }
 assert.equal(await page.locator('.arrival-veil').evaluate(el=>el.hidden),true);
 if(width===1440||width===390)await page.screenshot({path:`work/garden-about-${width}-${motion}.png`});
 await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
 await page.waitForTimeout(400);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
 const image1=await page.locator('.footer-world').evaluate(el=>el.toDataURL());
 await page.waitForTimeout(250);
 const image2=await page.locator('.footer-world').evaluate(el=>el.toDataURL());
 assert.equal(image1===image2,motion==='reduce',`footer animation ${width} ${motion}`);
 await page.screenshot({path:`work/garden-footer-${width}-${motion}.png`});
 await page.locator('#manage-links').click();
 assert.equal(await page.locator('#room-manage').evaluate(el=>el.open),true);
 await page.keyboard.press('Escape');
 await page.locator('.home-footer a[href="#home"]').click();
 await page.waitForFunction(()=>scrollY<100,null,{timeout:10000});
 assert.ok(await page.evaluate(()=>scrollY<100),'back to top');
 await page.locator('.about-nav').click();
 await page.waitForFunction(()=>document.querySelector('.arrival-veil').hidden,null,{timeout:10000});
 assert.equal(new URL(page.url()).hash,'#about-us');
 assert.equal(await page.locator('.arrival-veil').evaluate(el=>el.hidden),true);
 console.log(`${width}x${height} ${motion}: transition, text removals, footer animation, controls and anchors passed`);
 await page.close();
}
assert.deepEqual(errors,[]);
} finally {await browser.close();}
