// One quick look at the site in a headless browser, at computer and phone size:
// it starts, nothing throws, every page in the Dock opens, and what a first
// visit downloads and what a frame draws, against the budget in AGENTS.md.
// Screenshots go to tools/.check/. `npm run check` first runs
// tools/check-site.mjs (homecraft.json, the skin, engine/).
//
//   npm install            (once: installs Playwright)
//   npm run serve          (in another terminal; it prints the address and opens the browser)
//   npm run check [-- http://127.0.0.1:<port>/examples/terry-home/]
//
// Frame times here come from this computer's GPU, not a phone's: they show
// regressions, not real-phone smoothness. Try a real phone before you ship.
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.HOMECRAFT_PLAYWRIGHT || 'playwright').catch(() => {
  console.log('The browser check needs Playwright: run npm install once, then try again. (npm run check:site needs nothing installed.)');
  process.exit(1);
});
const remembered = () => { try { return readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim(); } catch { return ''; } };
const url = process.argv[2] || remembered();
if (!url) { console.log('Nothing is being served. Run python3 tools/serve.py first, or pass the address.'); process.exit(1); }
if (!(await fetch(url).catch(() => null))) { console.log(`Nothing answers at ${url}: start the site first (python3 tools/serve.py).`); process.exit(1); }
const out = fileURLToPath(new URL('./.check/', import.meta.url));
mkdirSync(out, { recursive: true });
const gpu = process.platform === 'darwin'
  ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
  : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const VIEWS = [
  { name: 'computer', viewport: { width: 1280, height: 800 } },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
];

let browser;
try { browser = await chromium.launch({ channel: 'chrome', args: gpu }); }
catch {
  try { browser = await chromium.launch({ channel: 'msedge', args: gpu }); }
  catch { browser = await chromium.launch({ args: gpu }); }
}

let failed = false;
for (const view of VIEWS) {
  const context = await browser.newContext(view);
  const page = await context.newPage();
  const errors = [];
  let bytes = 0;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', async r => { try { bytes += (await r.body()).length; } catch {} });
  const start = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__home?.player || window.__homeStartupError, null, { timeout: 60000 });
  const bootMs = Date.now() - start;
  const startup = await page.evaluate(() => window.__homeStartupError || null);
  if (startup) { console.log(`${view.name}: 3D did not start (${startup.phase}: ${startup.message})`); failed = true; await context.close(); continue; }
  // Let the opening shot finish, then measure a few seconds of frames.
  await page.waitForTimeout(5000);
  const stats = await page.evaluate(() => __home.stats());
  await page.screenshot({ path: `${out}${view.name}.png` });
  // Every page in the Dock opens.
  const pages = await page.evaluate(() => [...document.querySelectorAll('#hotbar [data-station]')].map(b => b.dataset.station));
  for (const id of pages) {
    // As the Dock does: go to the page's place in the world (if it has one) and open it.
    await page.evaluate(id => __home.go(id), id);
    await page.waitForTimeout(400);
    const open = await page.evaluate(() => document.querySelector('#panel')?.open);
    if (!open) errors.push(`page "${id}" did not open`);
    await page.screenshot({ path: `${out}${view.name}-${id}.png` });
    await page.evaluate(() => document.querySelector('#panel .close')?.click());
  }
  // The showcase house must finish a roof-ladder round trip without flying.
  // The front door must be opened before the indoor route can reach the ladder.
  const traversal = await page.evaluate(async () => {
    const h = __home, access = h.world.roofAccess;
    if (!access) return null;
    const home = { x: .5, z: 5.8 }, empty = { x: 0, z: 0, run: false };
    const doors = h.world.animated.doors;
    const front = () => doors.states.filter(door => door.id.startsWith('front-'));
    const entranceInitiallyOpen = front().every(door => door.open);
    const doorCases = [
      ['garage', 30.2, -6.5, 0], ['garage-side', 10.98, -2, 0], ['back', 13, -28.5, 0],
      ['bedroom', -4.5, -3.88, 4], ['hidden', -17, -9.5, 4], ['roof-gate', 31.65, 14.5, 10],
      ['roof-room-left', -11, 5.86, 11],
    ];
    let allDoorsToggle = true;
    for (const [id, x, z, y] of doorCases) {
      const player = { mode: 'ground', floorY: y, pos: { x, z } };
      const before = doors.states.find(door => door.id === id);
      if (!before || !doors.interact(player, h.nav)) { allDoorsToggle = false; break; }
      doors.update(.6, h.nav);
      const opened = doors.states.find(door => door.id === id);
      const firstToggle = opened.open !== before.open && opened.blocking === before.open;
      await new Promise(requestAnimationFrame);
      if (!doors.interact(player, h.nav)) { allDoorsToggle = false; break; }
      doors.update(.6, h.nav);
      const closed = doors.states.find(door => door.id === id);
      if (!firstToggle || closed.open !== before.open || closed.blocking !== !before.open) { allDoorsToggle = false; break; }
      await new Promise(requestAnimationFrame);
    }
    const roofRoomOpen = doors.states.find(door => door.id === 'roof-room-left')?.open;
    const roofRoomCollisionSynced = h.world.thirdFloor.obstructed(-11, 5.86, 11) === !roofRoomOpen;
    if (!h.player.teleport(.5, 15)) return { up: false, down: false, dogIndoors: false, reason: 'door approach' };
    if (front().some(door => door.open)) h.extras.keyDown({ key: 'e' });
    doors.update(.6, h.nav);
    const blockedClosed = !h.nav.canStand(.5, 16) && front().every(door => !door.open && door.blocking);
    const openedByE = h.extras.keyDown({ key: 'e' });
    doors.update(.6, h.nav);
    const passedOpen = h.nav.canStand(.5, 16) && front().every(door => door.open && !door.blocking);
    const closedByE = h.extras.keyDown({ key: 'e' });
    doors.update(.6, h.nav);
    const blockedAgain = !h.nav.canStand(.5, 16) && front().every(door => !door.open && door.blocking);
    h.extras.keyDown({ key: 'e' });
    doors.update(.6, h.nav);
    const passableOpen = h.nav.canStand(.5, 16) && front().every(door => door.open && !door.blocking);
    const finish = target => {
      let flew = false;
      for (let i = 0; i < 6000 && h.player.travelling; i++) {
        h.player.update(1 / 60, empty, 0);
        flew ||= ['air', 'fly', 'zip'].includes(h.player.mode);
      }
      return !h.player.travelling && !flew && Math.hypot(h.player.pos.x - target.x, h.player.pos.z - target.z) < .2;
    };
    h.player.teleport(home.x, home.z);
    h.player.follow(access.route(home.x, 0, home.z, access.exit.x, access.exit.y, access.exit.z), access.foot);
    const up = finish(access.exit) && Math.abs(h.player.y - access.exit.y) < .05;
    h.player.follow(access.route(h.player.pos.x, h.player.y, h.player.pos.z, home.x, 0, home.z), null, () => h.player.goTo(home.x, home.z));
    const down = finish(home) && Math.abs(h.player.y) < .05;
    const layout = await import('@world/layout.js');
    const dog = h.dog && h.pets[layout.PETS?.cat ? 1 : 0];
    const dogIndoors = !dog || dog.routes.some(route => layout.inHouse(route.at(-1).x, route.at(-1).z));
    return { up, down, dogIndoors, entranceInitiallyOpen, allDoorsToggle, roofRoomCollisionSynced, blockedClosed, openedByE, passedOpen, closedByE, blockedAgain, passableOpen };
  });
  if (traversal) {
    console.log(`${view.name}: roof round trip and indoor dog route: ${JSON.stringify(traversal)}`);
    if (!traversal.up || !traversal.down || traversal.entranceInitiallyOpen && !traversal.dogIndoors || !traversal.allDoorsToggle || !traversal.roofRoomCollisionSynced || !traversal.blockedClosed || !traversal.openedByE || !traversal.passedOpen || !traversal.closedByE || !traversal.blockedAgain || !traversal.passableOpen) errors.push('showcase traversal or door regression');
  }
  // Aircraft at cruising height must retain hazy ground detail in bad weather.
  // Exercise the real activity and render loop on both viewport sizes.
  const flightWeather = await page.evaluate(async () => {
    const h = __home, a = h.extras.activities, s = h.stage, p = h.player;
    if (!a?.flight) return null;
    const { AIRFIELD } = await import('@world/aircraft.js');
    const THREE = await import('three');
    const saved = { x: p.pos.x, y: p.y, z: p.pos.z, heading: p.heading, weather: h.getWeatherMode(), time: h.getTimeMode() };
    const failures = [], samples = [], empty = new Set();
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const check = (name, ok) => { if (!ok) failures.push(name); };
    try {
      h.extras.household?.routine.pause(); h.rig.skipIntro();
      p.anchor(AIRFIELD.x - 4.5, AIRFIELD.y, AIRFIELD.z, AIRFIELD.heading);
      if (!a.start('airplane')) throw new Error('Could not board aircraft');
      a.flight.takeoff();
      for (let i = 0; i < 1000 && a.flight.status().phase !== 'flying'; i++) a.flight.update(.05, empty);
      if (!a.flight.toggleHover()) throw new Error('Could not reach cruising flight');
      const plane = h.world.aircraftFleet.planes.find(mesh => mesh.name === a.flight.status().aircraftId);
      const place = async height => {
        plane.position.set(12, height, 100); a.flight.update(.016, empty);
        h.rig.recenter(p); h.rig.set(0, .34, innerWidth < 720 ? 18 : 12);
        await frame();
      };
      for (const time of ['day', 'night']) for (const weather of ['thunder', 'snow']) {
        h.setTimeMode(time); h.setWeatherMode(weather); s.settle();
        await place(78);
        const depth = -new THREE.Vector3(0, 6, 0).applyMatrix4(s.camera.matrixWorldInverse).z;
        const contrast = 1 - THREE.MathUtils.smoothstep(depth, s.scene.fog.near, s.scene.fog.far);
        const label = time + '-' + weather;
        check(label + '-ground-visible-through-haze', depth > 0 && depth < s.camera.far && contrast > .15 && contrast < .8);
        check(label + '-normal-fog-onset', s.scene.fog.near === s.airNear);
        samples.push({ time, weather, contrast: +contrast.toFixed(3), far: +s.scene.fog.far.toFixed(1) });
        await place(18);
        check(label + '-low-flight-restores-weather', s.scene.fog.far === s.airFar);
      }
      h.setTimeMode('day'); h.setWeatherMode('clear'); s.settle(); await place(78);
      check('clear-day-unchanged', s.scene.fog.far === s.airFar);
      h.setWeatherMode('thunder'); s.settle(); a.flight.park(); a.flight.update(.016, empty); await frame();
      check('landing-restores-weather', s.scene.fog.far === s.airFar);
    } catch (error) { failures.push(error.message); }
    finally {
      a.stop(true); p.restore(saved.x, saved.y, saved.z, saved.heading); h.rig.recenter(p);
      h.setTimeMode(saved.time); h.setWeatherMode(saved.weather); s.settle(); await frame();
    }
    return { samples, failures };
  });
  if (flightWeather) {
    console.log(view.name + ': aircraft weather visibility: ' + JSON.stringify(flightWeather));
    if (flightWeather.failures.length) errors.push('aircraft weather visibility regression');
  }
  // Switching to flight while climbing a ramp must clear the smoothed walking
  // height; otherwise the deck traps the player and rejects every movement.
  const bridgeFlight = await page.evaluate(() => {
    const h = __home, p = h.player, bridge = h.world.seaBridge;
    if (!bridge) return null;
    const saved = { x: p.pos.x, y: p.y, z: p.pos.z, heading: p.heading };
    const empty = { x: 0, z: 0, up: false, down: false, run: false };
    const failures = [];
    let cases = 0;
    try {
      for (const dt of [1 / 60, 1 / 30]) for (const run of [false, true]) {
        for (const [z, direction] of [[40, 1], [130, -1], [40, -1], [90, 1]]) {
          const label = JSON.stringify({ z, direction, run, dt });
          cases++;
          if (!p.restore(bridge.foot.x, bridge.height(z), z, 0)) { failures.push(label + ': restore'); continue; }
          for (let i = 0; i < 30; i++) p.update(dt, { ...empty, z: direction, run }, 0);
          const before = p.y, deck = bridge.height(p.pos.z);
          p.toggleFly();
          if (!p.flying || p.y < Math.max(before, deck) - .001 || h.world.ground.collides(p.pos.x, p.y, p.pos.z)) failures.push(label + ': takeoff');
          const takeoff = p.y;
          for (let i = 0; i < 60; i++) p.update(dt, { ...empty, up: true }, 0);
          if (p.y < takeoff + 1) failures.push(label + ': climb');
          const x = p.pos.x;
          for (let i = 0; i < 15; i++) p.update(dt, { ...empty, x: 1 }, 0);
          if (p.pos.x < x + .2) failures.push(label + ': steer');
          p.toggleFly();
          for (let i = 0; i < 180; i++) p.update(dt, empty, 0);
          if (p.mode !== 'ground' || p.island !== 'sea-bridge' || Math.abs(p.y - bridge.height(p.pos.z)) > .01) failures.push(label + ': land');
        }
      }
    } finally { p.restore(saved.x, saved.y, saved.z, saved.heading); }
    return { cases, failures };
  });
  if (bridgeFlight) {
    console.log(view.name + ': bridge flight: ' + JSON.stringify(bridgeFlight));
    if (bridgeFlight.failures.length) errors.push('bridge flight regression');
  }
  const over = [stats.calls > stats.budget.calls && 'draw calls', stats.triangles > stats.budget.triangles && 'triangles'].filter(Boolean);
  // Bytes as served; a server that compresses (tools/build.sh, deploy.md) sends far fewer.
  console.log(`${view.name}: started in ${(bootMs / 1000).toFixed(1)} s, loaded ${Math.round(bytes / 1024)} KB uncompressed, `
    + `${stats.calls} draw calls, ${Math.round(stats.triangles / 1000)}k triangles, ${stats.frameMs} ms a frame, ${stats.programs} shader programs`
    + (over.length ? `  ← over budget: ${over.join(', ')}` : ''));
  for (const e of errors) console.log(`  error: ${e}`);
  if (errors.length) failed = true;
  await context.close();
}
await browser.close();
console.log(`screenshots: ${out}`);
process.exit(failed ? 1 : 0);
