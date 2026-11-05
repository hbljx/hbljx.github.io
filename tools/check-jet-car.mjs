import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = process.argv[2] || readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim();
const out = fileURLToPath(new URL('./.check/', import.meta.url)); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = false;
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'phone' : 'computer';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.stack));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.__home || window.__homeStartupError, null, { timeout: 60000 });
    const result = await page.evaluate(async () => {
      if (window.__homeStartupError) return { startup: window.__homeStartupError };
      const h = __home, a = h.extras.activities, house = h.extras.household, car = h.world.animated.car;
      const THREE = await import('three'), checks = {}, details = {};
      const check = (name, ok) => { checks[name] = !!ok; };
      const down = key => a.keyDown({ key, repeat: false }), up = key => a.keyUp({ key });
      const tick = (seconds, dt = 1 / 60) => { for (let i = 0; i < Math.ceil(seconds / dt); i++) { a.update(dt); house.update(dt); } };
      const hold = (key, seconds) => { down(key); tick(seconds); up(key); };
      h.rig.skipIntro(); h.setTimeMode('day'); h.setWeatherMode('clear'); house.routine.pause();
      h.player.anchor(15.5, 0, -4.5, Math.PI / 2);
      check('board-original-garage-car', a.start('driving'));
      if (!a.ride) return { checks, details };
      down('j'); check('wait-for-passenger', a.jet.phase === 'ground');
      house.woman.restore(15.5, 0, -4.58, Math.PI / 2); tick(.3);
      check('companion-boarded', a.ride.passengerReady);
      down('j'); check('garage-roof-blocks-takeoff', a.jet.phase === 'ground' && a.jet.status().notice.includes('顶棚'));
      // Drive the real garage exit before trying the vertical launch.
      down('w');
      for (let i = 0; i < 350 && car.position.x < 34.2; i++) tick(1 / 30, 1 / 30);
      up('w'); hold(' ', .5);
      details.exit = car.position.toArray(); check('drive-out-of-garage', car.position.x > 33);
      down('j'); tick(2); details.launch = a.jet.status();
      check('jet-takeoff', a.jet.phase === 'flying' && car.position.y >= 5.9);
      if (!a.jet.airborne) {
        details.columns = [];
        for (const x of [33, 34, 35]) for (const z of [-6.5, 0, 6, 12]) details.columns.push({ x, z, drive: a.canDrive(x, z, Math.PI / 2), top: h.world.ground.topAt(x, z), roof: h.world.thirdFloor.flightHeight(x, z) });
        return { checks, details };
      }
      check('six-plumes-visible', car.userData.jetExhaust.mesh.visible && car.userData.jetExhaust.mesh.geometry.attributes.jetRear.count === 180);
      hold(' ', 2); const high = car.position.y; hold('c', .6); check('altitude-up-and-down', high > 15 && car.position.y < high - 1);
      hold('w', 1); const normalSpeed = a.jet.speed; hold('Shift', .5); check('jet-boost', a.jet.speed > normalSpeed + 3);
      up('Shift'); down('v'); tick(.2); check('hover-stops-translation', a.jet.speed < .01);
      const h0 = a.jet.heading; hold('a', .5); check('air-steering', a.jet.heading > h0 + .5);
      const h1 = a.jet.heading; hold('d', .3); check('opposite-air-steering', a.jet.heading < h1 - .3);
      down('q'); tick(.72);
      check('roll-inverts-car', new THREE.Vector3(0, 1, 0).applyQuaternion(car.quaternion).y < -.8);
      const expectedSeat = new THREE.Vector3(-.4, -.3, -.48).applyQuaternion(car.quaternion).add(car.position);
      check('pilot-follows-roll', h.avatar.root.position.distanceTo(expectedSeat) < .001);
      const companion = h.stage.scene.getObjectByName('female-companion');
      expectedSeat.set(-.4, -.3, .48).applyQuaternion(car.quaternion).add(car.position);
      check('companion-follows-roll', companion.position.distanceTo(expectedSeat) < .001 && new THREE.Vector3(0, 1, 0).applyQuaternion(companion.quaternion).y < -.8);
      tick(.9); check('roll-recovers-upright', a.jet.status().maneuver === null && new THREE.Vector3(0, 1, 0).applyQuaternion(car.quaternion).y > .9);
      down('b'); tick(.72); check('flip-inverts-car', new THREE.Vector3(0, 1, 0).applyQuaternion(car.quaternion).y < -.8);
      tick(.9); check('flip-recovers-upright', a.jet.status().maneuver === null && new THREE.Vector3(0, 1, 0).applyQuaternion(car.quaternion).y > .9);
      const beforeTurn = a.jet.heading; down('x'); tick(1.5);
      check('uturn-180-degrees', Math.abs(a.jet.heading - beforeTurn - Math.PI) < .01);
      hold(' ', 20); check('altitude-ceiling', Math.abs(car.position.y - 120) < .01);
      down('Shift'); tick(.3); dispatchEvent(new Event('blur')); tick(.1);
      check('blur-releases-boost', a.jet.speed === 0 && !a.jet.status().boosting);
      // Ocean landing must keep the occupants safely aboard.
      car.position.set(125, 20, -90); car.updateMatrix(); a.update(.01); down('l');
      check('reject-ocean-landing', a.jet.phase === 'flying' && a.jet.status().notice.includes('无法停车'));
      check('reject-airborne-exit', a.stop() === false && a.current === 'driving');
      // R is an explicit recovery, restoring ground handling and shutting off jets.
      down('r'); check('return-resets-flight', !a.jet.airborne && !car.userData.jetExhaust.mesh.visible && car.position.y === 0);
      check('garage-ground-handling-restored', a.canDrive(15.5, -6.5, Math.PI / 2));
      // Launch and land at the same open site to exercise a complete round trip.
      car.position.set(...details.exit); car.rotation.set(0, 0, 0); car.updateMatrix();
      down('j'); tick(2); down('x'); tick(1.5);
      const approachHeight = car.position.y;
      hold('w', 2);
      check('house-blocks-low-flight-without-height-jump', car.position.x > 33 && car.position.y <= approachHeight + .01 && a.jet.speed === 0);
      // Return to a proven landing footprint, facing east again.
      car.position.set(...details.exit); car.position.y = approachHeight; down('x'); tick(1.5);
      hold('c', 2); down('q');
      check('reject-low-altitude-roll', a.jet.status().maneuver === null && a.jet.status().notice.includes('离地太近'));
      down('l'); tick(7); check('safe-landing', !a.jet.airborne && Math.abs(car.position.y) < .01 && !car.userData.jetExhaust.mesh.visible);
      check('exit-after-landing', a.stop() && !a.active);
      tick(.1); house.routine.pause();
      h.player.anchor(car.position.x, car.position.y, car.position.z + 2, Math.PI / 2);
      check('reboard-landed-car', a.start('driving'));
      house.woman.restore(car.position.x, car.position.y, car.position.z + 1.92, Math.PI / 2); tick(.3);
      down('j'); tick(2); hold(' ', 1.6); down('v'); tick(.2);
      check('second-takeoff-after-reboarding', a.jet.phase === 'flying');
      car.position.set(168, 20, -90); car.updateMatrix(); hold('Shift', 1);
      check('flight-boundary-stops-car', car.position.x <= 170 && a.jet.speed === 0);
      car.position.set(details.exit[0], 18, details.exit[2]); car.updateMatrix(); down('v'); tick(.1);
      // Leave a live airborne car for real DOM controls and screenshots.
      h.rig.recenter(h.player, true); h.rig.set(a.jet.heading + Math.PI + .65, .3, innerWidth < 720 ? 14.5 : 9.5);
      details.final = a.status().car;
      return { checks, details };
    });
    await page.waitForTimeout(400);
    if (result.details?.final?.jet?.phase === 'flying') {
      await page.keyboard.press('x');
      result.checks['keyboard-event-starts-uturn'] = await page.evaluate(() => __home.extras.activities.jet.status().maneuver === 'uturn');
      await page.evaluate(() => { for (let i = 0; i < 100; i++) __home.extras.activities.update(.02); });
      // Restore the camera-facing heading before the visual check.
      await page.keyboard.press('x');
      await page.evaluate(() => { for (let i = 0; i < 100; i++) __home.extras.activities.update(.02); });
      await page.locator('[data-jet=q]').click();
      await page.evaluate(() => __home.extras.activities.update(.1));
      result.checks['touch-roll-button'] = await page.evaluate(() => __home.extras.activities.jet.status().maneuver === 'roll');
      await page.evaluate(() => { for (let i = 0; i < 100; i++) __home.extras.activities.update(.02); });
      const lift = page.locator('#activity-ui .activity-pad button').filter({ hasText: /^升高$/ });
      const previous = await page.evaluate(() => __home.world.animated.car.position.y);
      const box = await lift.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
      await page.evaluate(() => { for (let i = 0; i < 20; i++) __home.extras.activities.update(.02); });
      await page.mouse.up();
      result.checks['touch-lift-button'] = await page.evaluate(y => __home.world.animated.car.position.y > y + .2, previous);
      await page.locator('[data-jet=v]').click();
      await page.screenshot({ path: out + 'jet-car-' + name + '.png' });
      result.layout = await page.evaluate(() => {
        const panel = document.querySelector('#activity-ui'), r = panel.getBoundingClientRect();
        return { left: r.left, right: r.right, bottom: r.bottom, height: r.height, scroll: panel.scrollHeight, client: panel.clientHeight, viewport: [innerWidth, innerHeight] };
      });
      result.checks['controls-fit-viewport'] = result.layout.left >= 0 && result.layout.right <= result.layout.viewport[0] && result.layout.bottom <= result.layout.viewport[1] && result.layout.scroll <= result.layout.client + 1;
      await page.keyboard.press('e');
      result.checks['keyboard-exit-lands-first'] = await page.evaluate(() => {
        const h = __home, a = h.extras.activities;
        const landing = a.jet.phase === 'landing' && a.current === 'driving';
        for (let i = 0; i < 1000 && a.active; i++) { a.update(.02); h.extras.household.update(.02); }
        h.extras.household.update(.02);
        return landing && !a.active && !a.jet.airborne && !h.world.animated.car.userData.jetExhaust.mesh.visible;
      });
    }
    result.errors = errors;
    result.stats = await page.evaluate(() => window.__home?.stats());
    console.log(name + ': ' + JSON.stringify(result));
    writeFileSync(out + 'jet-car-' + name + '.json', JSON.stringify(result, null, 2));
    if (result.startup || errors.length || Object.values(result.checks || {}).some(ok => !ok)) failed = true;
    await context.close();
  }
} finally { await browser.close(); }
process.exitCode = failed ? 1 : 0;
