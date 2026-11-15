import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'msedge'});
const errors=[];
for(const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:960},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5585/');
 await page.waitForSelector('.directory-installation');
 assert.equal(await page.locator('.directory-installation').count(),7);
 for(const id of ['about','works','writing','coffee','lab','court','pool']) {
  const room=page.locator(`#scene-${id}-links`);
  await room.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForTimeout(2200);
  const art=room.locator('canvas');
  assert.equal(await art.evaluate(c=>c.parentElement.className),'spectacle-stage','art belongs to background layer');
  assert.ok(await room.locator('.room-heading').evaluate(e=>e.getBoundingClientRect().height)<130,'no exhibition spacer');
  assert.equal(await room.locator('.room-heading canvas').count(),0,'heading stays compact');
  const positions=await room.evaluate(e=>{const r=e.getBoundingClientRect(),c=e.querySelector('canvas').getBoundingClientRect();return {top:c.top-r.top,right:r.right-c.right};});
  assert.ok(positions.top<10 && positions.right<=0,'art anchored at top right');
  const before=await art.evaluate(c=>c.toDataURL());
  await page.waitForTimeout(450);
  assert.notEqual(await art.evaluate(c=>c.toDataURL()),before,`${id} animates`);
  await page.screenshot({path:`work/background-${id}-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  const card=room.locator('.room-card a').first();
  if(await card.count()){
   assert.ok(await card.getAttribute('href'),'links preserved');
   await card.click({trial:true});
   assert.equal(await art.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(250);
 const art=page.locator('.installation-pool');
 const still=await art.evaluate(c=>c.toDataURL());
 await page.waitForTimeout(400);
 assert.equal(await art.evaluate(c=>c.toDataURL()),still,'reduced motion stays still');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.waitForTimeout(350);
 const hidden=await art.evaluate(c=>c.toDataURL());
 await page.waitForTimeout(400);
 assert.equal(await art.evaluate(c=>c.toDataURL()),hidden,'offscreen canvas pauses');
 await page.close();
}
await browser.close();
assert.deepEqual(errors,[]);
console.log('PASS: seven background canvases; compact headings; top-right anchoring; desktop/mobile layouts; clickable links; reduced motion; offscreen pause; no runtime errors.');
