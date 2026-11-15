import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const out='C:/Users/Love/Documents/Codex/2026-11-15/logo-li/outputs';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
try {
  for(const width of [1440,768,390,320]) {
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5585/');
    await page.waitForSelector('.home-footer[data-effects-mounted]');
    await page.locator('#about-us').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));
    await page.waitForTimeout(2200);
    const spacing=await page.evaluate(()=>{
      const section=document.querySelector('#about-us').getBoundingClientRect();
      const text=document.querySelector('#about-us>.kicker').getBoundingClientRect();
      const art=document.querySelector('.about-world').getBoundingClientRect();
      return {textTop:text.top-section.top,artTop:art.top-section.top,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(spacing.textTop>=70);assert.ok(spacing.artTop>=55);assert.equal(spacing.overflow,false);
    await page.screenshot({path:`${out}/about-spacing-${width}.png`});
    await page.locator('.home-footer').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'end'}));
    await page.waitForTimeout(500);
    await page.screenshot({path:`${out}/footer-craft-${width}.png`});
    for(const selector of ['.footer-brand-plaque','.footer-icp','#manage-links','.home-footer a']) {
      const bounds=await page.locator(selector).boundingBox();
      assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width,selector+' overflows');
    }
    assert.equal((await page.locator('.footer-record-text').textContent()).trim(),'鲁ICP备18009664号');
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.footer-awake').count(),0,'finite effects finish');
    if(width===1440){await page.locator('.footer-brand-plaque').hover();assert.equal(await page.locator('.footer-brand-plaque.footer-awake').count(),1);}
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.footer-awake').count(),0);
    assert.equal(await page.locator('.footer-gem').evaluate(e=>getComputedStyle(e).animationName),'none');
    await page.locator('#manage-links').click();
    assert.ok(await page.locator('#room-manage').evaluate(e=>e.open));
    await page.keyboard.press('Escape');
    await page.locator('.home-footer a[href="#home"]').click();
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>scrollY<5));
    assert.deepEqual(errors,[]);
    console.log('PASS',width,JSON.stringify(spacing),'footer bounds, finite/reduced motion, management and back-to-top');
    await context.close();
  }
} finally {await browser.close();}
