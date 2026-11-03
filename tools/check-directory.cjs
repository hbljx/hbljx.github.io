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
      await page.locator('[data-edit]').first().click();
      await page.locator('#delete-site').click();
      await page.locator('#confirm button[value="delete"]').click();
      await page.waitForFunction(n => document.querySelectorAll('.site-card').length === n, count - 1);
      await page.locator('[data-edit]').first().click();
      await page.locator('#delete-site').click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.site-card').count(), count - 1, 'Escape must not repeat the previous deletion');
      await page.locator('#editor [data-close]').first().click();
      await page.locator('#undo').click();
      assert.equal(await page.locator('.site-card').count(), count);
      await page.locator('[data-star]').first().click();
      const other = await page.context().newPage();
      await other.goto(`${base.replace(/\/$/, '')}/directory.html`);
      await other.evaluate(() => localStorage.clear());
      await page.waitForFunction(() => document.querySelector('[data-star]').getAttribute('aria-pressed') === 'false');
      await other.close();
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
      await page.locator('[data-star]').first().click();
      assert.equal(await page.locator('[data-star]').first().getAttribute('aria-pressed'), 'false', 'failed persistence must not change the star');
      assert.match(await page.locator('#toast').innerText(), /无法保存/);
      const backup = await page.evaluate(async () => {
        const data = await (await fetch('navigation/data.json')).json();
        return { ...data, liPlusFavorites: [document.querySelector('[data-star]').dataset.star] };
      });
      await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
      await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('原有星标已保留'));
      assert.equal(await page.locator('[data-star]').first().getAttribute('aria-pressed'), 'false');
      await context.close();
    }
    console.log('PASS directory: delete, Escape cancellation, undo, cross-tab clear, failed star persistence and backup import at desktop/mobile sizes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
