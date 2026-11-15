import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const [name,viewport,reducedMotion] of [['desktop',{width:1440,height:960},'no-preference'],['mobile',{width:390,height:844},'no-preference'],['reduced',{width:1280,height:800},'reduce']]) {
  const page=await browser.newPage({viewport,reducedMotion});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/#scene-about-us');
  await page.waitForSelector('.about-image-ready');
  await page.waitForFunction(()=>document.querySelectorAll('.room-card').length>0);
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#zone-scenes>.scene').count(),8);
  assert.equal(await page.locator('[data-room=pool] .scene-next').getAttribute('href'),'#scene-about-us');
  assert.equal(await page.locator('.about-nav').getAttribute('href'),'#scene-about-us');
  assert.ok(await page.locator('#scene-about-us img').evaluate(e=>e.naturalWidth>0));
  await page.screenshot({path:`work/about-${name}-opening.png`});
  await page.locator('#scene-about-us').evaluate(e=>{
   const cinema=e.firstElementChild;scrollTo({top:cinema.getBoundingClientRect().top+scrollY+(cinema.offsetHeight-cinema.firstElementChild.offsetHeight)*.64,behavior:'instant'});
  });
  await page.waitForTimeout(400);
  assert.ok(await page.locator('#about-scene-title').evaluate(e=>Number(getComputedStyle(e).opacity)>.95));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(name==='desktop'){
   await page.mouse.move(730,400);await page.mouse.move(920,500,{steps:12});
   assert.equal(await page.locator('.scene-pointer-canvas').getAttribute('data-mode'),'builder');
  }
  await page.screenshot({path:`work/about-${name}-copy.png`});
  await page.locator('#scene-about-us .scene-enter').click();
  await page.waitForTimeout(1800);
  assert.equal(new URL(page.url()).hash,'#about-us');
  await page.screenshot({path:`work/about-${name}-story.png`});
  assert.deepEqual(errors,[]);
  console.log(name+': 8 chapters, decoded image, readable copy, no horizontal overflow, story link, no JS errors passed');
  await page.close();
 }
}finally{await browser.close();}
