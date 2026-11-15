import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const out = 'C:/Users/Love/Documents/Codex/2026-11-15/logo-li/outputs';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
try {
  for (const width of (process.argv[2] ? [Number(process.argv[2])] : [1440, 390, 320])) {
    const context = await browser.newContext({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5585/');
    await page.waitForSelector('.craft-brand[data-craft-mounted]');
    await page.waitForSelector('.room-card');
    await page.waitForTimeout(900);
    const count = await page.locator('#zone-scenes .room-card').count();
    assert.ok(count > 100);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
    await page.screenshot({path:`${out}/craft-home-${width}.png`});
    if (width === 1440) {
      await page.locator('.craft-brand').hover();
      await page.waitForTimeout(350);
      assert.ok(await page.locator('.craft-brand').evaluate(el => el.classList.contains('brand-awake')));
      await page.locator('.site-header').screenshot({path:`${out}/craft-header.png`});
      await page.locator('.world-link').hover();
      assert.ok(await page.locator('.world-link').evaluate(el => el.classList.contains('portal-awake')));
      assert.equal(await page.locator('.world-link').getAttribute('href'), '?view=3d');
    }
    await page.locator('#scene-about-links').evaluate(el => el.scrollIntoView({behavior:'instant',block:'start'}));
    await page.waitForTimeout(1200);
    const card = page.locator('.room-card > a').first();
    if (width === 1440) {
      await card.hover();
      await page.waitForTimeout(400);
      await page.locator('#craft-item-tooltip').waitFor({state:'visible'});
      const box = await page.locator('#craft-item-tooltip').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= 900);
      await page.screenshot({path:`${out}/craft-inventory-${width}.png`});
      await page.locator('#craft-item-tooltip').hover();
      assert.ok(await page.locator('#craft-item-tooltip').isVisible(), 'tooltip remains hoverable');
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#craft-item-tooltip').isHidden());
      await page.mouse.move(0,0);
      await card.focus();
      await page.waitForTimeout(100);
      assert.ok(await page.locator('#craft-item-tooltip').isVisible(), 'keyboard tooltip');
      await page.keyboard.press('Escape');
      assert.equal(await card.getAttribute('aria-describedby'), null);
      await page.locator('.room-card > a').nth(1).focus();
      await page.locator('#craft-item-tooltip').waitFor({state:'visible'});
      await page.locator('#room-query').evaluate(el => { el.value = 'no-such-craft-link-xyz'; el.dispatchEvent(new Event('input')); });
      await page.locator('#craft-item-tooltip').waitFor({state:'hidden'});
      await page.locator('#room-query').evaluate(el => { el.value = ''; el.dispatchEvent(new Event('input')); });
      assert.equal(await page.locator('#zone-scenes .room-card').count(), count);
    } else {
      assert.ok(await page.locator('#craft-item-tooltip').isHidden());
      await page.screenshot({path:`${out}/craft-inventory-${width}.png`});
    }
    await page.locator('.about-countdown').evaluate(el => el.scrollIntoView({behavior:'instant',block:'center'}));
    await page.waitForTimeout(1300);
    for (const bar of await page.locator('.countdown-track').all()) {
      const value = Number(await bar.getAttribute('aria-valuenow'));
      assert.ok(value >= 0 && value <= 100);
    }
    await page.screenshot({path:`${out}/craft-countdown-${width}.png`});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
    await page.locator('.craft-brand').focus();
    assert.equal(await page.locator('.brand-plus').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.locator('.craft-brand').evaluate(el => el.classList.contains('brand-awake')), false);
    console.log(`PASS ${width}px: ${count} links, bounds, tooltip, countdown, reduced motion; page errors: ${errors.length}`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
