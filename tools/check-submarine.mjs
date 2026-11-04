import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = process.argv[2] || readFileSync(new URL('./.serve-url', import.meta.url), 'utf8').trim();
const out = fileURLToPath(new URL('./.check/', import.meta.url)); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = false;
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'phone' : 'computer';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url); await page.waitForFunction(() => window.__home || window.__homeStartupError, null, { timeout: 60000 });
    const result = await page.evaluate(() => {
      if (window.__homeStartupError) return { startup: window.__homeStartupError };
      const h = __home, a = h.extras.activities, p = h.player, sub = h.world.submarine, empty = { x: 0, z: 0, run: false };
      const checks = {}, failures = [];
      const check = (name, ok) => { checks[name] = !!ok; if (!ok) failures.push(name); };
      const key = k => ({ key: k, repeat: false });
      const finishWalk = target => {
        let flew = false;
        for (let i = 0; i < 24000 && p.travelling; i++) { p.update(1 / 60, empty, 0); flew ||= p.flying; }
        return !p.travelling && !flew && Math.hypot(p.pos.x - target.x, p.pos.z - target.z) < .25 && Math.abs(p.y - target.y) < .1;
      };
      h.setTimeMode('day'); h.setWeatherMode('clear'); h.rig.skipIntro();
      check('oppositeHarbors', sub.home.x < h.world.seaBridge.foot.x && h.world.carrier.home.x > h.world.seaBridge.foot.x && sub.home.z === h.world.carrier.home.z && Math.abs((h.world.carrier.home.x-h.world.seaBridge.foot.x)-(h.world.seaBridge.foot.x-sub.home.x)) < .01);
      p.teleport(.5, 5.8);
      check('homeToHatch', h.navigate(sub.board.x, sub.board.z, sub.board.y) && finishWalk(sub.board));
      check('canBoard', sub.canBoard(p));
      check('board', a.start('submarine'));
      if (!a.active) return { checks, failures, player: { x:p.pos.x,y:p.y,z:p.pos.z,mode:p.mode,island:p.island } };
      a.dive.togglePatrol(); a.dive.returnHome();
      for(let i=0;i<60;i++)a.update(.05);
      check('returnCancelsQueuedDeparture', sub.docked() && !a.dive.automatic);
      a.dive.togglePatrol(); for(let i=0;i<90;i++)a.update(.05);
      a.dive.returnHome(); a.dive.returnHome();
      for(let i=0;i<8000 && !sub.docked();i++)a.update(.05);
      check('returnDuringDeparture', sub.docked() && a.current === 'submarine');
      a.keyDown(key('p'));
      for (let i = 0; i < 18000 && a.dive.status().lap < 1 && a.dive.automatic; i++) a.update(.05);
      const patrol = a.dive.status();
      check('patrolFullLap', patrol.lap >= 1); check('deepDive', patrol.depth >= 200); check('allLandmarks', patrol.visited.length === 3);
      let continuous = true, clearance = true, previous = patrol, minX = patrol.x, maxX = patrol.x, minZ = patrol.z, maxZ = patrol.z;
      window.dispatchEvent(new Event('blur')); a.pause();
      check('blurPreservesPatrol', a.dive.status().mode === 'patrol');
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange')); a.update(.05);
      check('hiddenPreservesPatrol', a.dive.status().mode === 'patrol' && a.dive.status().distance === previous.distance);
      delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
      for (let i = 0; i < 5000 && a.dive.status().lap < 3; i++) {
        a.update(.05); const s = a.dive.status(), step = Math.hypot(s.x - previous.x, s.z - previous.z);
        continuous &&= s.mode === 'patrol' && s.speed > 17.9 && step > .85 && step <= .901 && s.depth === 300;
        clearance &&= a.dive.canSail(s.x, -s.depth, s.z, s.heading);
        minX = Math.min(minX,s.x); maxX = Math.max(maxX,s.x); minZ = Math.min(minZ,s.z); maxZ = Math.max(maxZ,s.z); previous = s;
      }
      check('threeContinuousLaps', continuous && previous.lap >= 3);
      check('rectangularCircuit', Math.abs(minX + 610) < .01 && Math.abs(maxX + 360) < .01 && Math.abs(minZ - 260) < .01 && Math.abs(maxZ - 540) < .01);
      check('wholeHullClearance', clearance);
      a.keyDown(key('p')); const held = a.dive.status();
      for (let i = 0; i < 30; i++) a.update(.05);
      check('pauseHoldsPosition', Math.hypot(a.dive.status().x - held.x,a.dive.status().z - held.z) < .01);
      a.keyDown(key('c')); for (let i = 0; i < 1200; i++) a.update(.05); a.keyUp(key('c'));
      check('depthLimit', a.dive.status().depth === sub.maxDepth);
      a.keyDown(key(' ')); for (let i = 0; i < 40; i++) a.update(.05); a.keyUp(key(' '));
      check('manualAscent', a.dive.status().depth < sub.maxDepth - 10);
      const yaw = a.dive.status().heading; a.keyDown(key('a')); for (let i = 0; i < 20; i++) a.update(.05); a.keyUp(key('a'));
      check('manualSteering', Math.abs(a.dive.status().heading - yaw) > .2);
      check('shallowCollision', !a.dive.canSail(sub.home.x,-100,sub.home.z,0));
      check('boundaryCollision', !a.dive.canSail(24,-100,98,0));
      check('seaExitDefers', a.stop() === false && a.current === 'submarine' && a.dive.status().exitPending);
      window.dispatchEvent(new Event('blur')); a.pause();
      check('blurPreservesDeferredExit', a.dive.status().mode === 'return' && a.dive.status().exitPending);
      for (let i = 0; i < 18000 && a.active; i++) a.update(.05);
      check('returnAndDisembark', !a.active && sub.docked() && sub.canBoard(p));
      const home = { x: .5, y: 0, z: 5.8 };
      // Return from different headings, depths, boundaries and below the pier.
      const returnCases = [[sub.home.x - 28,-18.5,sub.home.z,Math.PI/2],[-650,-320,520,2.5],[sub.home.x,0,590,Math.PI],[-300,-160,330,-1.2],[-130,-19,98,Math.PI/2],[-750,-320,600,-2],[-360,-300,110,0]];
      for (let n=0;n<returnCases.length;n++) {
        a.start('submarine'); const [x,y,z,yaw]=returnCases[n]; sub.mesh.position.set(x,y,z); sub.mesh.rotation.y=yaw;
        check('returnStart'+n,a.dive.canSail(x,y,z,yaw)); a.dive.update(.01,new Set()); a.stop();
        for(let i=0;i<16000 && a.active;i++)a.update(.05);
        check('returnCase'+n,!a.active && sub.docked() && sub.canBoard(p));
        if(a.active)break;
      }
      check('walkHome', h.navigate(home.x,home.z,home.y) && finishWalk(home));
      // Preserve the existing carrier path in both directions across the junction.
      const helm=h.world.carrier.helm();
      check('carrierRoutePreserved', h.navigate(helm.x,helm.z,helm.y) && finishWalk(helm));
      check('carrierToSubmarine', h.navigate(sub.board.x,sub.board.z,sub.board.y) && finishWalk(sub.board));
      h.rig.showcase([-220,125,215],[-48,3,96]); for(let i=0;i<80;i++)h.rig.update(.05,p);
      return { checks, failures, patrol, final: a.dive.status() };
    });
    console.log(name + ': ' + JSON.stringify(result));
    failed ||= !!result.startup || !!result.failures?.length;
    await page.screenshot({ path: out + 'submarine-' + name + '-harbor.png' });
    const harborStats=await page.evaluate(()=>__home.stats()); console.log(name+' harbor stats: '+JSON.stringify(harborStats));
    failed ||= harborStats.calls>60 || harborStats.triangles>200000;
    const view = await page.evaluate(() => {
      const h=__home,a=h.extras.activities,s=h.world.submarine;
      if(a.active || !s.canBoard(h.player))return false;
      h.rig.skipIntro(); a.start('submarine'); a.dive.togglePatrol();
      for(let i=0;i<9000 && !a.dive.status().patrolling && a.dive.automatic;i++)a.update(.05);
      a.dive.pause(); for(let i=0;i<80;i++){a.update(.05);h.rig.update(.05,h.player);}h.world.aircraftFleet.update();
      return a.dive.status();
    });
    await page.screenshot({ path: out + 'submarine-' + name + '-deep.png' });
    const ui = await page.evaluate(() => {
      const panel=document.querySelector('#activity-ui'), rect=panel.getBoundingClientRect();
      const buttons=[...panel.querySelectorAll('button')].filter(b=>!b.hidden && b.getBoundingClientRect().width);
      return { activity:panel.dataset.activity, scroll:panel.scrollHeight>panel.clientHeight, inViewport:rect.left>=0 && rect.right<=innerWidth && rect.bottom<=innerHeight, buttons:buttons.map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})), stats:__home.stats() };
    });
    console.log(name + ' view: ' + JSON.stringify({ view, ui, errors }));
    const beforeTouch=await page.evaluate(()=>__home.extras.activities.dive.status());
    const up=page.locator('#activity-ui [data-key=" "]');
    const box=await up.boundingBox(); await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
    await page.evaluate(()=>{for(let i=0;i<30;i++)__home.extras.activities.update(.05);}); await page.mouse.up();
    const afterTouch=await page.evaluate(()=>__home.extras.activities.dive.status());
    await page.locator('#activity-ui [data-action=primary]').click();
    const started=await page.evaluate(()=>__home.extras.activities.dive.status().mode==='patrol');
    await page.locator('#activity-ui [data-action=primary]').click();
    const paused=await page.evaluate(()=>__home.extras.activities.dive.status().mode==='manual');
    const pointerChecks={ascend:afterTouch.depth<beforeTouch.depth-5,startPatrol:started,pausePatrol:paused};
    const press = async selector => { const button=page.locator(selector); if(mobile)await button.tap();else await button.click(); };
    await press('#activity-ui [data-action=primary]');
    pointerChecks.patrolCompletes=await page.evaluate(()=>{
      const a=__home.extras.activities, lap=a.dive.status().lap;
      for(let i=0;i<12000 && a.dive.status().lap===lap;i++)a.update(.05);
      return a.dive.status().lap>lap && a.dive.status().mode==='patrol';
    });
    await press('#activity-ui [data-action=secondary]');
    pointerChecks.returnCompletes=await page.evaluate(()=>{
      const a=__home.extras.activities; window.dispatchEvent(new Event('blur'));
      for(let i=0;i<12000 && !__home.world.submarine.docked();i++)a.update(.05);
      return __home.world.submarine.docked() && a.current==='submarine';
    });
    await press('#activity-ui [data-action=primary]');
    await page.evaluate(()=>{const a=__home.extras.activities; for(let i=0;i<9000 && !a.dive.status().patrolling;i++)a.update(.05);});
    await press('#activity-ui [data-action=toggle]');
    pointerChecks.disembarkCompletes=await page.evaluate(()=>{
      const h=__home,a=h.extras.activities;window.dispatchEvent(new Event('blur'));
      for(let i=0;i<12000 && a.active;i++)a.update(.05);
      return !a.active && h.world.submarine.docked() && h.world.submarine.canBoard(h.player);
    });
    console.log(name+' pointer: '+JSON.stringify(pointerChecks));
    failed ||= Object.values(pointerChecks).some(v=>!v);
    failed ||= errors.length > 0 || !ui.inViewport || ui.stats.calls>60 || ui.stats.triangles>200000;
    await context.close();
  }
} finally { await browser.close(); }
process.exitCode=failed?1:0;
