// Browser regression for the two about chapters and their shared pointer canvas.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] || readFileSync(new URL('.serve-url', import.meta.url), 'utf8').trim();
const out = new URL('.check/about-pointers/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];
const capture = (page, name) => page.screenshot({ path: fileURLToPath(new URL(name + '.png', out)) });
const mode = page => page.locator('.scene-pointer-canvas').getAttribute('data-mode');
const pixels = page => page.locator('.scene-pointer-canvas').evaluate(canvas => {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
  return count;
});
async function ready(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('.scene-pointer-canvas', { state: 'attached' });
  await page.waitForSelector('.room-card', { state: 'attached' });
}
async function place(page, selector, top = 150) {
  await page.locator(selector).evaluate((el, y) => {
    scrollTo({ top: scrollY + el.getBoundingClientRect().top - y, behavior: 'instant' });
  }, top);
  await page.waitForTimeout(200);
}
async function sweep(page, x, y) {
  await page.mouse.move(x, y);
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(x + i * 19, y + Math.sin(i * .36) * 22);
    await page.waitForTimeout(42);
  }
  await page.waitForTimeout(80);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await ready(page);
  assert.equal(await page.locator('.scene-pointer-canvas').count(), 1);

  for (const [selector, expected, cursor, image] of [
    ['.about-profile', 'journal', 'quill.svg', 'journal'],
    ['.about-projects', 'clockwork', 'hourglass.svg', 'projects'],
    ['.about-countdown', 'clockwork', 'hourglass.svg', 'time'],
  ]) {
    await place(page, selector);
    await sweep(page, 470, 235);
    assert.equal(await mode(page), expected);
    assert.match(await page.evaluate(() => getComputedStyle(document.elementFromPoint(755, 215)).cursor), new RegExp(cursor));
    assert(await pixels(page) > 100, expected + ' must paint a visible trail');
    await capture(page, image);
    await page.waitForTimeout(1250);
    assert.equal(await pixels(page), 0, 'Trail clears when the mouse stops');
  }

  await place(page, '.about-profile .solid-link', 300);
  await page.locator('.about-profile .solid-link').hover();
  assert.equal(await mode(page), 'journal');
  assert.match(await page.locator('.about-profile .solid-link').evaluate(el => getComputedStyle(el).cursor), /quill-link.svg/);
  await place(page, '.about-projects', 150);
  await page.locator('.craft-inventory summary').first().hover();
  assert.match(await page.locator('.craft-inventory summary').first().evaluate(el => getComputedStyle(el).cursor), /hourglass-link.svg/);
  await page.locator('.craft-inventory summary').first().click();
  assert.equal(await page.locator('.craft-inventory').first().getAttribute('open'), '');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.craft-inventory').first().getAttribute('open'), null);
  await place(page, '.about-countdown', 150);
  await page.locator('.countdown-activate').first().click();
  assert.equal(await mode(page), 'clockwork');

  // Scrolling under a stationary pointer changes chapters without another move.
  await place(page, '.about-profile', 150);
  await page.mouse.move(620, 320);
  assert.equal(await mode(page), 'journal');
  await place(page, '.about-projects', 150);
  assert.equal(await mode(page), 'clockwork');
  await place(page, '.about-profile', 150);
  assert.equal(await mode(page), 'journal');
  await page.locator('.site-header a').first().hover();
  assert.equal(await mode(page), '');
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-about-pointer')), false);
  assert.equal(await pixels(page), 0);

  for (const [id, expected] of Object.entries({
    about: 'comet', works: 'lightning', writing: 'ribbon', coffee: 'stardust',
    lab: 'scanner', court: 'water', pool: 'fairy', team: 'builder',
  })) {
    await place(page, '.scene[data-room="' + id + '"]', 0);
    await page.mouse.move(620, 330);
    await page.mouse.move(628, 336);
    assert.equal(await mode(page), expected, 'Earlier scene ' + id);
  }

  await place(page, '.about-profile', 150);
  await page.mouse.move(620, 320);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(640, 330);
  assert.equal(await mode(page), '');
  assert.equal(await pixels(page), 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await place(page, '.about-profile', 150);
  await sweep(page, 470, 235);
  assert.equal(await mode(page), 'journal');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await mode(page), '');
  assert.equal(await pixels(page), 0);
  await page.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ready(phone);
  for (const selector of ['.about-profile', '.about-projects', '.about-countdown']) {
    await place(phone, selector, 150);
    await phone.touchscreen.tap(200, 260);
    assert.equal((await mode(phone)) || '', '');
    assert.equal(await pixels(phone), 0);
  }
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.equal(await phone.locator('.scene-pointer-canvas').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await phone.locator('.about-projects').evaluate(el => getComputedStyle(el).borderTopWidth), '0px');
  await capture(phone, 'phone');
  await phone.close();

  // Browser screenshots omit the OS cursor, so inspect the four actual SVGs too.
  const icons = await browser.newPage({ viewport: { width: 760, height: 260 } });
  await icons.goto(base);
  await icons.setContent('<body style="margin:0;display:flex;gap:28px;padding:28px;background:#13271f;color:#ead7ac;font:14px system-ui">' +
    ['quill', 'quill-link', 'hourglass', 'hourglass-link'].map(name =>
      '<figure style="margin:0"><img style="width:144px;height:144px;image-rendering:pixelated" src="' +
      new URL('navigation/cursors/' + name + '.svg', base).href + '"><figcaption>' + name + '</figcaption></figure>').join('') + '</body>');
  await icons.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  await capture(icons, 'cursor-assets');
  await icons.close();
  assert.deepEqual(errors, []);
  console.log('PASS: both pointer designs, visible trails, idle cleanup, hover/click, scroll switching, original scenes, reduced motion, blur and touch.');
} finally {
  await browser.close();
}
