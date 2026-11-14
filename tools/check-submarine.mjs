import { worldPage } from './world-page.mjs';
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
    await page.goto(worldPage(url)); await page.waitForFunction(() => window.__home || window.__homeStartupError, null, { timeout: 60000 });
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
      check('crewPatrolsBeforeStart', sub.crew.status().patrolCount === 5 && sub.crew.status().seatedCount === 0);
      p.teleport(.5, 5.8);
      check('homeToHatch', h.navigate(sub.board.x, sub.board.z, sub.board.y) && finishWalk(sub.board));
      p.restore(sub.foot.x + 2, sub.foot.y, sub.foot.z, -Math.PI / 2);
      const walkWest = { x: -1, z: 0, run: true };
      for (let i = 0; i < 1800 && p.pos.x > sub.pier.x0 - .5; i++) p.update(1 / 60, walkWest, 0);
      check('walkAcrossGangway', p.island === 'submarine' && !p.flying && p.pos.x < sub.pier.x0 - .4 && Math.abs(p.y - sub.board.y) < .05);
      check('walkToHatch', h.navigate(sub.board.x, sub.board.z, sub.board.y) && finishWalk(sub.board));
      check('canBoard', sub.canBoard(p));
      check('board', a.start('submarine'));
      if (!a.active) return { checks, failures, player: { x:p.pos.x,y:p.y,z:p.pos.z,mode:p.mode,island:p.island } };
      check('crewSeatsAfterStart', sub.crew.status().patrolCount === 0 && sub.crew.status().seatedCount === 5);
      const berth = sub.mesh.position.clone(), rampX = (sub.pier.x0 + sub.pier.x1) / 2;
      const atBerth = () => sub.mesh.position.equals(berth) && sub.mesh.rotation.y === 0 && a.dive.status().speed === 0;
      const rampWalkable = () => h.world.ground.topAt(rampX, sub.pier.z)?.site === 'submarine';
      a.keyDown(key('w'));
      for (let i = 0; i < 25; i++) a.update(.05);
      check('manualDepartureWaitsForGangway', atBerth() && sub.gangway.visible && sub.gangwayProgress > 0 && sub.gangwayProgress < .5);
      check('movingGangwayIsClosedToWalkers', !rampWalkable());
      a.keyUp(key('w'));
      check('exitWaitsForGangwayToReopen', a.stop() === false && a.active);
      for (let i = 0; i < 60 && a.active; i++) a.update(.05);
      check('cancelledDepartureRestoresGangway', !a.active && sub.gangwayReady() && rampWalkable() && sub.canBoard(p));
      a.start('submarine');
      a.dive.togglePatrol(); a.dive.returnHome();
      for(let i=0;i<60;i++)a.update(.05);
      check('returnCancelsQueuedDeparture', sub.docked() && !a.dive.automatic);
      a.dive.togglePatrol(); for(let i=0;i<35;i++)a.update(.05);
      check('automaticDepartureWaitsForGangway', atBerth() && sub.gangwayProgress > 0 && sub.gangwayProgress < .25);
      for(let i=0;i<55;i++)a.update(.05);
      check('departureLeavesNoGangway', !sub.docked() && sub.gangwayProgress === 0 && !sub.gangway.visible && !rampWalkable());
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
      check('ellipticalCircuit', minX > -696 && maxX < -274 && minZ > 234 && maxZ < 596);
      check('landmarksInsideCircuit', h.world.submarine.landmarks.every(site => ((site.x + 485) / 210) ** 2 + ((site.z - 415) / 180) ** 2 < 1));
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
      const returnPhases = [], metro = h.world.transit.services.metro.path, piers = [];
      for (let s = 48; s < metro.length - 35; s += 24) piers.push(metro.sample(s, {}));
      let prior = a.dive.status(), movingTurn = false, steadyCrossing = true, slowTurn = true, alignedDocking = true;
      let pierClearance = Infinity, deckClearance = Infinity, deployingBeforeExit = false;
      for (let i = 0; i < 18000 && a.active; i++) {
        a.update(.05);
        const state = a.dive.status(), phase = state.returnStage;
        deployingBeforeExit ||= state.docked && state.exitPending && a.active && sub.gangwayProgress > 0 && !sub.gangwayReady() && !rampWalkable();
        if (returnPhases.at(-1) !== phase) returnPhases.push(phase);
        const step = Math.hypot(state.x - prior.x, state.z - prior.z);
        const turn = Math.abs(Math.atan2(Math.sin(state.heading - prior.heading), Math.cos(state.heading - prior.heading)));
        if (phase === 'bridge-crossing' && prior.returnStage === phase) steadyCrossing &&= turn < .0001 && step > 0;
        if (phase === 'harbor-align' && prior.returnStage === phase) {
          movingTurn ||= turn > .001 && step > .01;
          slowTurn &&= turn < .01 && step > 0;
        }
        if (phase === 'docking' && prior.returnStage === phase && step > 0) alignedDocking &&= Math.abs(state.x - sub.home.x) < .001 && Math.abs(state.heading) < .001 && state.z < prior.z && state.speed >= -3.001;
        if ((phase === 'bridge-crossing' || phase === 'harbor-align') && i % 4 === 0) {
          const c = Math.cos(state.heading), s = Math.sin(state.heading);
          // Conservative full-length rectangle also covers fins and propeller.
          for (const pier of piers) {
            const dx = pier.x - state.x, dz = pier.z - state.z;
            const side = Math.max(0, Math.abs(dx * c - dz * s) - 6.5);
            const along = Math.max(0, Math.abs(dx * s + dz * c) - 34);
            pierClearance = Math.min(pierClearance, Math.hypot(side, along));
          }
          for (let z = -34; z <= 31; z += 2) for (const x of [-6.5, 0, 6.5]) {
            const near = metro.project(state.x + x * c + z * s, state.z - x * s + z * c, {});
            if (near.distance < 2.2) deckClearance = Math.min(deckClearance, near.y + state.depth);
          }
        }
        prior = state;
      }
      check('diagonalThenTurnThenDock', returnPhases.filter(p => ['bridge-crossing', 'harbor-align', 'docking'].includes(p)).join(',') === 'bridge-crossing,harbor-align,docking');
      check('holdsDiagonalThroughBridge', steadyCrossing);
      check('turnsSlowlyWhileMoving', movingTurn && slowTurn);
      check('alignedLowSpeedDocking', alignedDocking);
      check('fullHullClearsBridgePiers', pierClearance > 1.1);
      check('fullHullClearsBridgeDeck', deckClearance >= 12);
      check('dockingDeploysGangwayBeforeExit', deployingBeforeExit);
      check('returnAndDisembark', !a.active && sub.gangwayReady() && rampWalkable() && sub.canBoard(p));
      const home = { x: .5, y: 0, z: 5.8 };
      // Return from different headings, depths, boundaries and below the pier.
      const returnCases = [[sub.home.x - 28,-18.5,sub.home.z,Math.PI/2],[-650,-320,520,2.5],[sub.home.x,0,590,Math.PI],[-300,-160,330,-1.2],[-130,-19,98,Math.PI/2],[-750,-320,600,-2],[-360,-300,110,0]];
      const metroPath=h.world.transit.services.metro.path;
      const metroCrossing=metroPath.project(sub.home.x-56.5,sub.home.z,{});
      check('returnCorridorUnderHighMetro',metroCrossing.distance<2&&metroCrossing.y>=17.5);
      for (let n=0;n<returnCases.length;n++) {
        a.start('submarine'); const [x,y,z,yaw]=returnCases[n]; sub.mesh.position.set(x,y,z); sub.mesh.rotation.y=yaw;
        check('returnStart'+n,a.dive.canSail(x,y,z,yaw)); a.dive.update(.01,new Set()); a.stop();
        let returnMetroClearance=Infinity;
        for(let i=0;i<16000 && a.active;i++){
          a.update(.05);
          const position=sub.mesh.position,nearest=metroPath.project(position.x,position.z,{});
          if(nearest.distance<3)returnMetroClearance=Math.min(returnMetroClearance,nearest.y-position.y);
        }
        check('returnCase'+n,!a.active && sub.docked() && sub.canBoard(p));
        check('returnMetroClearance'+n,returnMetroClearance>=12);
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
