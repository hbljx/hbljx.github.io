const assert = require('node:assert/strict');
const { chromium } = require(process.env.HOMECRAFT_PLAYWRIGHT_CJS || 'playwright');
const { readFileSync } = require('node:fs');
const base = process.argv[2] || readFileSync(`${__dirname}/.serve-url`, 'utf8').trim();
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`${base.replace(/\/$/, '')}/directory.html?zone=blog`);
      await page.waitForSelector('body[data-ready="true"]');
      const count = await page.locator('.site-card').count();
      assert.ok(count > 0, 'directory must load its links');
      assert.equal(await page.locator('[data-edit], [data-star], #favorites-filter, #delete-site').count(), 0);
      await page.locator('#add-site').click();
      await page.locator('[name="name"]').fill('Navigation regression test');
      await page.locator('[name="url"]').fill('https://example.com/');
      await page.locator('#editor-form button[type="submit"]').click();
      await page.waitForFunction(n => document.querySelectorAll('.site-card').length === n, count + 1);
      await page.locator('#undo').click();
      await page.waitForFunction(n => document.querySelectorAll('.site-card').length === n, count);
      await page.reload();
      await page.waitForSelector('body[data-ready="true"]');
      assert.equal(await page.locator('.site-card').count(), count);
      assert.equal(await page.locator('[data-edit], [data-star]').count(), 0);
      await context.close();
    }
    console.log('PASS directory: removed star/edit controls, add, undo and reload at desktop/mobile sizes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
