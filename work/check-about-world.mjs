import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const snapshot=async canvas=>createHash('sha256').update(await canvas.evaluate(c=>c.toDataURL())).digest('hex');
const browser=await chromium.launch({channel:'msedge'}),errors=[];
try {
for(const width of [1440,768,390]) {
 const page=await browser.newPage({viewport:{width,height:960}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5585/');
 const section=page.locator('#about-us'),canvas=page.locator('.about-world');
 await canvas.waitFor();await section.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(3400);
 assert.equal(await canvas.count(),1);assert.equal(await page.locator('.about-portal').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await canvas.evaluate(c=>getComputedStyle(c).pointerEvents),'none');
 assert.ok(await section.locator('h2').getAttribute('aria-label'));
 assert.equal(await section.locator('.countdown-card').count(),3);
 assert.ok(await section.locator('[data-days]').evaluateAll(es=>es.every(e=>/^\d+$/.test(e.textContent))));
 const first=await snapshot(canvas);await page.waitForTimeout(180);assert.notEqual(await snapshot(canvas),first);
 await page.screenshot({path:`work/about-world-final-${width}.png`});
 await section.locator('.solid-link').click({trial:true});
 const action=page.locator('.about-replay');await action.click();await page.waitForTimeout(100);
 assert.equal(await section.locator('.about-typed>span').last().evaluate(e=>getComputedStyle(e).opacity),'0');
 await page.waitForTimeout(2600);assert.equal(await section.locator('.about-typed>span').last().evaluate(e=>getComputedStyle(e).opacity),'1');
 await page.emulateMedia({reducedMotion:'reduce'});
 await section.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(250);
 const still=await snapshot(canvas);await page.waitForTimeout(250);assert.equal(await snapshot(canvas),still,`reduced ${width}`);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await section.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(350);
 const resumed=await snapshot(canvas);await page.waitForTimeout(200);assert.notEqual(await snapshot(canvas),resumed,`resume reduced ${width}`);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await snapshot(canvas);await page.waitForTimeout(180);assert.equal(await snapshot(canvas),hidden,`hidden ${width}`);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(180);assert.notEqual(await snapshot(canvas),hidden,`resume hidden ${width}`);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(300);
 const offscreen=await snapshot(canvas);await page.waitForTimeout(200);assert.equal(await snapshot(canvas),offscreen,`offscreen ${width}`);
 await page.close();
}
assert.deepEqual(errors,[]);console.log('PASS: desktop/tablet/mobile; animated island; replay; accessible title; countdown values; clickable CTA; reduced motion; background and offscreen pause; no overflow or runtime errors.');
} finally {await browser.close();}
