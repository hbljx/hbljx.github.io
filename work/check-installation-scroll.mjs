import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
let samples = 0;
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5585/');
    await page.waitForSelector('.room-card');
    assert.equal(await page.locator('.directory-installation').count(), 7);
    for (const id of ['about', 'works', 'writing', 'court', 'coffee', 'lab', 'pool']) {
      const room = page.locator(`#scene-${id}-links`);
      const art = room.locator('.directory-installation');
      const targets = await room.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const start = scrollY + rect.top;
        const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'));
        const positions = [start - header, start + rect.height - innerHeight];
        for (let offset = innerHeight * .8; offset < rect.height - innerHeight; offset += innerHeight * .8) positions.push(start + offset);
        for (const category of el.querySelectorAll('.room-category')) positions.push(scrollY + category.getBoundingClientRect().top - header - 20);
        return [...new Set(positions)].sort((a, b) => a - b);
      });
      for (const top of targets) {
        await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top);
        await page.waitForTimeout(90);
        const result = await art.evaluate(canvas => {
          const r = canvas.getBoundingClientRect();
          const stage = canvas.parentElement.getBoundingClientRect();
          const style = getComputedStyle(canvas);
          const stickyTop = parseFloat(style.top);
          return {
            top: r.top, right: r.right, bottom: r.bottom,
            expectedTop: Math.min(Math.max(stage.top + parseFloat(style.marginTop), stickyTop), stage.bottom - r.height),
            stageBottom: stage.bottom, pointerEvents: style.pointerEvents,
            overflow: document.documentElement.scrollWidth > innerWidth,
            parent: canvas.parentElement.className,
          };
        });
        assert.ok(Math.abs(result.top - result.expectedTop) < 2, `${id}/${width} scroll ${top}: ${JSON.stringify(result)}`);
        assert.ok(result.bottom > 74 && result.top < 844, `${id}/${width}: artwork stays visible`);
        assert.ok(result.bottom <= result.stageBottom + 1, `${id}/${width}: artwork bounded by directory`);
        assert.ok(result.right >= width, `${id}/${width}: artwork stays on right`);
        assert.equal(result.pointerEvents, 'none');
        assert.equal(result.overflow, false);
        assert.equal(result.parent, 'spectacle-stage');
        samples++;
      }
      // Check an interior screen after scrolling, including animation and links
      // whose foreground overlaps the installation's background region.
      await room.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top + Math.max(0, (el.clientHeight - innerHeight) / 2), behavior: 'instant' }));
      await page.waitForTimeout(400);
      const before = await art.evaluate(c => c.toDataURL());
      await page.waitForTimeout(200);
      assert.notEqual(await art.evaluate(c => c.toDataURL()), before, `${id}/${width}: continues animating on later screen`);
      const hits = await room.evaluate(el => {
        let count = 0;
        for (const link of el.querySelectorAll('.room-card > a')) {
          const r = link.getBoundingClientRect();
          const x = r.left + r.width / 2, y = r.top + r.height / 2;
          if (y < 100 || y > innerHeight - 20) continue;
          if (!link.contains(document.elementFromPoint(x, y))) return -1;
          count++;
        }
        return count;
      });
      assert.ok(hits > 0, `${id}/${width}: foreground links receive pointer hits`);
      if (id === 'works' || id === 'lab') await page.screenshot({ path: `work/sticky-${id}-${width}.png` });
      // Once the directory leaves the viewport its artwork must leave too.
      await room.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().bottom + 10, behavior: 'instant' }));
      await page.waitForTimeout(250);
      assert.ok(await art.evaluate(c => c.getBoundingClientRect().bottom) <= 0, `${id}/${width}: does not leak into next scene`);
      const hidden = await art.evaluate(c => c.toDataURL());
      await page.waitForTimeout(160);
      assert.equal(await art.evaluate(c => c.toDataURL()), hidden, `${id}/${width}: offscreen animation pauses`);
      console.log(`PASS ${id} at ${width}px: ${targets.length} scroll positions, animation, links, scene boundary`);
    }
    // Resize while already deep inside a directory, then scroll back upward.
    await page.locator('#scene-works-links .room-category').last().evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 844 });
    await page.locator('#scene-works-links .room-category').nth(1).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(300);
    assert.ok(await page.locator('.installation-works').evaluate(c => c.getBoundingClientRect().bottom > 74));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    const still = await page.locator('.installation-works').evaluate(c => c.toDataURL());
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.installation-works').evaluate(c => c.toDataURL()), still);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${samples} scrolling samples, desktop/mobile, resize, reduced motion, no runtime errors.`);
} finally {
  await browser.close();
}
