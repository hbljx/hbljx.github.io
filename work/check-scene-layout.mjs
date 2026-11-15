import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
const views = [
  [1440, 960, 'no-preference'], [1024, 768, 'no-preference'],
  [768, 1024, 'no-preference'], [390, 844, 'no-preference'],
  [320, 568, 'no-preference'], [844, 390, 'no-preference'],
  [1440, 960, 'reduce'], [390, 844, 'reduce'],
];
try {
  for (const [width, height, reducedMotion] of views.slice(process.argv.includes('--remaining') ? 5 : 0)) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5585/');
    await page.waitForSelector('.room-card');
    const ids = await page.locator('.scene').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(ids.length, 7);
    for (const id of ids) {
      await page.locator('#' + id).evaluate(scene => {
        const cinema = scene.querySelector('.scene-cinema');
        const screen = scene.querySelector('.scene-screen');
        window.scrollTo({ top: scrollY + cinema.getBoundingClientRect().top + Math.max(0, cinema.offsetHeight - screen.offsetHeight) * .68, behavior: 'instant' });
      });
      await page.waitForTimeout(180);
      const layout = await page.locator('#' + id).evaluate(scene => {
        const box = selector => scene.querySelector(selector).getBoundingClientRect();
        const title = box('h2'), description = box('.scene-description'), actions = box('.scene-actions');
        const buttons = [...scene.querySelectorAll('.scene-actions a')];
        const [primary, secondary] = buttons.map(button => button.getBoundingClientRect());
        return {
          spaced: description.top - title.bottom >= 15 && actions.top - description.bottom >= 23,
          aligned: Math.abs(title.left - description.left) < 1 && Math.abs(title.left - actions.left) < 1,
          equalButtons: Math.abs(primary.width - secondary.width) < 1 && Math.abs(primary.height - secondary.height) < 1,
          noOverflow: buttons.every(button => button.scrollWidth <= button.clientWidth + 1) && document.documentElement.scrollWidth <= innerWidth,
          visible: buttons.every(button => getComputedStyle(button.parentElement).opacity === '1'),
          validTargets: buttons.every(button => !!document.querySelector(button.getAttribute('href'))),
          withinScreen: primary.left >= 0 && secondary.right <= innerWidth && actions.bottom <= innerHeight + 1,
        };
      });
      for (const [check, passed] of Object.entries(layout)) assert.ok(passed, `${width}x${height} ${reducedMotion} ${id}: ${check}`);
      if ((width === 1440 || width === 390 || width === 844) && reducedMotion === 'no-preference') {
        await page.screenshot({ path: `work/scene-layout-${width}-${id}.png` });
      }
    }
    // Exercise the actual anchors, including the final return to the scene index.
    for (const selector of ['#scene-about .scene-enter', '#scene-about .scene-next', '#scene-pool .scene-next']) {
      await page.locator(selector).focus();
      const target = await page.locator(selector).getAttribute('href');
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, target);
    }
    console.log(`${width}x${height} ${reducedMotion}: all seven scenes and navigation passed`);
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
