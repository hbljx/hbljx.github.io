import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const out='C:/Users/Love/Documents/Codex/2026-11-15/logo-li/outputs';
try {
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5585/');
  await page.waitForSelector('.craft-brand[data-craft-mounted]');
  await page.waitForSelector('.room-card');
  assert.equal((await page.locator('.world-link').innerText()).replace(/\s|↗/g,''),'进入3D世界');
  assert.equal(await page.locator('.world-link').getAttribute('href'),'?view=3d');
  assert.equal(await page.locator('.craft-tooltip,.countdown-live,.about-countdown-note,.shock-front,.search-beam,.energy-wires').count(),0);
  assert.equal(await page.getByText('实时更新',{exact:true}).count(),0);
  const initial=await page.locator('#zone-scenes .room-card').count();
  await page.locator('#scene-about-links').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));
  await page.waitForTimeout(1200);
  const card=page.locator('#scene-about-links .room-card').first();
  const style=await card.evaluate(e=>({color:getComputedStyle(e).backgroundColor,opacity:getComputedStyle(e).opacity}));
  assert.equal(style.color,'rgba(14, 27, 21, 0.42)');assert.equal(style.opacity,'1');
  for(const selector of ['.room-heading','.room-card-grid'])assert.equal(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).borderBottomWidth),'0px');
  if(width===1440){
   await card.hover();await page.waitForTimeout(350);
   assert.equal(await card.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(22, 40, 29, 0.52)');
   await card.locator('a').focus();
   assert.equal(await page.locator('[role="tooltip"]').count(),0);
   await page.mouse.move(0,80);
   await card.locator('a').evaluate(e=>e.blur());
  }
  await page.waitForTimeout(300);
  await page.screenshot({path:`${out}/transparent-directory-${width}.png`});
  await page.evaluate(()=>scrollBy({top:350,behavior:'instant'}));
  await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/transparent-background-${width}.png`});
  await page.locator('#room-query').evaluate(e=>{e.value='xyz-nothing-here';e.dispatchEvent(new Event('input'));});
  await page.waitForTimeout(200);
  assert.equal(await page.locator('#zone-scenes .room-card').count(),0);
  await page.locator('#room-query').evaluate(e=>{e.value='';e.dispatchEvent(new Event('input'));});
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#zone-scenes .room-card').count(),initial);
  await page.locator('.about-countdown').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));
  await page.waitForTimeout(1100);
  await page.screenshot({path:`${out}/countdown-clean-${width}.png`});
  assert.ok(await page.locator('.countdown-track').first().getAttribute('aria-valuenow'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log('PASS',width,initial,'links; labels, transparency, removed tooltip/lines, filtering, countdown, no overflow/errors');
  await page.close();
 }
} finally {await browser.close();}
