import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge'});
const providers=[['baidu','www.baidu.com','wd'],['bing','www.bing.com','q'],['google','www.google.com','q'],['yuanbao','so.qq.com','query']];
const errors=[];
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
  for(const [,host] of providers)await context.route(`https://${host}/**`,route=>route.fulfill({body:'Local search submission test'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5585/');
  const art=page.locator('.search-observatory'),query=page.locator('#home-query');
  await art.waitFor();
  assert.equal(await art.count(),1);
  assert.equal(await page.locator('.search-orbits,.search-crystal').count(),0);
  await query.focus();await page.waitForTimeout(700);
  const frame=await art.evaluate(c=>c.toDataURL());await page.waitForTimeout(150);
  assert.notEqual(await art.evaluate(c=>c.toDataURL()),frame,'focused instrument animates');
  await query.fill('中文输入 C++ & 🔍');
  await query.dispatchEvent('compositionstart');
  const prevented=await page.locator('.site-search').evaluate(form=>{const e=new Event('submit',{bubbles:true,cancelable:true});form.dispatchEvent(e);return e.defaultPrevented;});
  assert.ok(prevented,'IME composition blocks accidental Enter submission');
  await query.dispatchEvent('compositionend');
  for(const [id,host,param] of providers) {
   await page.locator(`label:has(input[value="${id}"])`).click();
   assert.equal(await art.getAttribute('data-engine'),id);
   await query.fill('  中文输入 C++ & 🔍  ');
   const popupPromise=context.waitForEvent('page');
   await query.press('Enter');const popup=await popupPromise;await popup.waitForLoadState();
   const url=new URL(popup.url());assert.equal(url.hostname,host);assert.equal(url.searchParams.get(param),'中文输入 C++ & 🔍');
   assert.equal(url.searchParams.has('engine'),false);
   assert.equal(await popup.evaluate(()=>window.opener),null);
   assert.equal(await query.inputValue(),'');await popup.close();
  }
  await page.reload();await art.waitFor();
  assert.equal(await art.getAttribute('data-engine'),'yuanbao');
  await page.locator('input[value="baidu"]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await art.getAttribute('data-engine'),'bing','keyboard engine switching updates instrument');
  await query.fill('检索光路');await page.waitForTimeout(500);
  await page.screenshot({path:`work/search-final-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await art.evaluate(c=>getComputedStyle(c).pointerEvents),'none');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  const reduced=await art.evaluate(c=>c.toDataURL());await page.waitForTimeout(200);
  assert.equal(await art.evaluate(c=>c.toDataURL()),reduced,'reduced motion stays static');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await query.focus();await page.waitForTimeout(250);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await art.evaluate(c=>c.toDataURL());await page.waitForTimeout(200);
  assert.equal(await art.evaluate(c=>c.toDataURL()),hidden,'background tab pauses');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(200);assert.notEqual(await art.evaluate(c=>c.toDataURL()),hidden,'tab resumes');
  await page.evaluate(()=>scrollTo({top:innerHeight*.6,behavior:'instant'}));await page.waitForTimeout(500);
  assert.equal(await page.locator('.hero-copy').getAttribute('aria-hidden'),'true');
  const faded=await art.evaluate(c=>c.toDataURL());await page.waitForTimeout(250);
  assert.equal(await art.evaluate(c=>c.toDataURL()),faded,'scroll-faded hero pauses even while sticky');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(300);
  await query.focus();await page.waitForTimeout(200);
  assert.notEqual(await art.evaluate(c=>c.toDataURL()),faded);
  await query.blur();await page.waitForTimeout(3000);
  const idle=await art.evaluate(c=>c.toDataURL());await page.waitForTimeout(250);
  assert.equal(await art.evaluate(c=>c.toDataURL()),idle,'idle instrument stops drawing');
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS search optics: desktop/mobile; focus/input animation; all four native GET destinations; IME; keyboard switching; saved engine; input clearing; reduced motion; background/scroll/idle pause; no page errors.');
} finally {await browser.close();}
