import { COURT, RIM, ISLAND, POOL, floorAt } from './layout.js';
import { createActivityVisuals, paintTV } from './activity-visuals.js';
import { getSeats } from './seats.js';
import { LIFE_SPOTS, createLifeVisuals } from './life-visuals.js';
import { createLifeActions } from './life-actions.js';
import { setActivityControl } from '../navigation/activity-icons.js';

export const ACTIVITY_SPOTS = [
  ...LIFE_SPOTS,
  { id: 'basketball', title: '篮球场 · 投篮', at: [-12, 4], floor: 0, radius: 3, view: [-8, 6, 14], look: [-13.5, 1.5, 4] },
  { id: 'sleep', title: '卧室 · 睡觉', at: [-9.8, -9.3], floor: 4, radius: 2, anchor: [-12, 4, -9.3], yaw: 0, view: [-8, 8, -6], look: [-12, 4.8, -9.5] },
  { id: 'reading', title: '灵感书房 · 看书', at: [-7.3, -6.7], floor: 4, radius: 2, anchor: [-8.8, 4, -6.85], yaw: 0, view: [-6.1, 7, -5], look: [-8.8, 5, -6.6] },
  { id: 'tv', title: '日常客厅 · 看电视', at: [1, -.3], floor: 0, radius: 3, anchor: [2.95, 0, -3.1], yaw: -Math.PI / 2, view: [9, 5, 2], look: [1.4, 1.1, -3.2] },
  { id: 'driving', title: '工具车库 · 开车', at: [15.5, -4.5], floor: 0, radius: 1.1 },
  { id: 'coffee', title: '音乐咖啡吧 · 喝咖啡', at: [8, 13.3], floor: 0, radius: 2.1, anchor: [8.7, 0, 13.65], yaw: 0, view: [11.5, 3.6, 15.5], look: [8.5, 1.1, 13.65] },
  { id: 'gaming', title: 'AI 工作台 · 打游戏', at: [1.2, -8.3], floor: 0, radius: 2.1, anchor: [2.1, 0, -9.55], yaw: Math.PI, view: [-1, 3.2, -6.7], look: [2.1, 1.1, -10.35] },
];
const BOOK = [
  ['第一章 · 海边的小屋', '清晨，阳光落在木地板上。推开窗，海风带来新的一天。今天不必赶路，先把想做的事情，一件一件放进自己的小世界。'],
  ['第二章 · 留一点空白', '书架上不必摆满每一本书，日程里也可以留下一点空白。读到喜欢的一页，就停下来；遇到新的想法，就把它写下来。'],
  ['第三章 · 回到这里', '傍晚，屋里的灯亮了。篮球回到场边，咖啡杯放回桌上。明天还有许多地方可以探索，而这个小屋，总会留着一个位置。'],
];
const IDLE = { speed: 0, fly: -1 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createActivities({ stage, world, player, avatar, nav, rig, sound }) {
  const ui = document.createElement('aside'); ui.id = 'activity-ui'; ui.hidden = true;
  ui.setAttribute('aria-label', '场景互动');
  ui.innerHTML = `<div class="activity-heading"><strong></strong><button type="button" data-action="collapse" aria-label="收起操作面板">收起</button></div>
    <p class="activity-hint"></p><p class="activity-status" role="status"></p>
    <div class="activity-meter" hidden aria-label="投篮力度，绿色区域命中"><i></i><b></b></div>
    <section class="activity-book" hidden><h3></h3><p></p><small></small></section>
    <canvas class="activity-game" width="320" height="180" hidden aria-label="接住金块，避开红块"></canvas>
    <div class="activity-buttons"><button type="button" data-action="toggle"></button><button type="button" data-action="primary" hidden></button><button type="button" data-action="secondary" hidden></button></div>
    <div class="activity-pad" hidden><button type="button" data-key="a" aria-label="向左">←</button><button type="button" data-key="w" aria-label="前进">↑</button><button type="button" data-key="s" aria-label="倒车">↓</button><button type="button" data-key="d" aria-label="向右">→</button><button type="button" data-key=" " aria-label="刹车">刹车</button></div>`;
  document.body.append(ui);
  const controls = document.createElement('div'); controls.id = 'activity-controls'; controls.hidden = true;
  controls.setAttribute('aria-label', '人物操作'); controls.setAttribute('role', 'group');
  controls.innerHTML = '<button type="button" data-control="run" aria-pressed="false"><span aria-hidden="true"></span></button><button type="button" data-control="interact" hidden><span aria-hidden="true"></span></button><button type="button" data-control="sit" hidden><span aria-hidden="true"></span></button><button type="button" data-control="detail" aria-controls="activity-ui" hidden><span aria-hidden="true"></span></button>';
  document.querySelector('#corner').append(controls);
  const runButton = controls.querySelector('[data-control="run"]'), interactButton = controls.querySelector('[data-control="interact"]'), sitButton = controls.querySelector('[data-control="sit"]'), detailButton = controls.querySelector('[data-control="detail"]');
  setActivityControl(runButton, 'walk', '走路 · R 切换跑步');
  setActivityControl(sitButton, 'sit', '坐下 · Q');
  setActivityControl(detailButton, 'detail', '展开操作面板');
  const $ = s => ui.querySelector(s), title = $('strong'), hint = $('.activity-hint'), status = $('.activity-status');
  const toggle = $('[data-action="toggle"]'), primary = $('[data-action="primary"]'), secondary = $('[data-action="secondary"]');
  const meter = $('.activity-meter'), fill = meter.querySelector('i'), book = $('.activity-book'), canvas = $('.activity-game'), pad = $('.activity-pad');
  const visuals = createActivityVisuals(stage.scene, avatar, canvas);
  const lifeVisuals = createLifeVisuals(stage.scene, avatar), seats = getSeats(world);
  const allSpots = [...ACTIVITY_SPOTS, ...seats], life = createLifeActions(sound, () => refreshUI());
  const limbs = [avatar.armL, avatar.armR, avatar.legL, avatar.legR];
  const car = world.animated.car, carObstacle = world.animated.carObstacle;
  const carSamples = [];
  for (let x = -2.45; x <= 2.451; x += .49) for (let z = -1.12; z <= 1.121; z += .56) carSamples.push([x, z]);
  const keys = new Set();
  let active = null, near = null, nearSeat = null, time = 0, uiClock = 0, screenClock = 0, entered = 0;
  let runMode = false, collapsed = false, controlsReady = false, stepDistance = 0, lastX = player.pos.x, lastZ = player.pos.z, lastMode = player.mode, breathClock = 0;
  let firstPerson = false, saved = null, pageIndex = 0, flip = 0, sip = 0, sips = 0;
  let tvChannel = 0, tvTime = 0, tvPaused = false, carSpeed = 0, carHeading = Math.PI / 2, driveDistance = 0, notice = '';
  const shot = { charging: false, power: 0, flight: false, t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, scored: false, willScore: false, attempts: 0, points: 0 };
  const game = { x: 160, time: 30, score: 0, lives: 3, over: false, objects: Array.from({ length: 4 }, (_, i) => ({ x: 30 + i * 75, y: -40 - i * 45, speed: 40 + i * 6, bad: i === 2 })) };
  function fitActivityPanel() {
    // A tall reading panel leaves the lower part of a phone for the character.
    const readingPanel = active?.id === 'reading' && !ui.hidden && innerWidth < 720 && innerHeight > innerWidth;
    if (readingPanel) stage.camera.setViewOffset(innerWidth, innerHeight, 0, -innerHeight * .24, innerWidth, innerHeight);
    else stage.camera.clearViewOffset();
  }
  function frameActivity() {
    const portrait = innerWidth < 720 && innerHeight > innerWidth;
    fitActivityPanel();
    if (active?.view) {
      if (portrait && active.id === 'basketball') rig.showcase([-6, 7, 18], [-15.2, 1.5, 4], { interactive: true });
      else if (portrait && active.id === 'tv') rig.showcase([11, 6, 3], [0, 1.3, -3.2], { interactive: true });
      else rig.showcase(active.view, active.look, { interactive: true });
    }
  }
  addEventListener('resize', frameActivity);
  function nearest(list = ACTIVITY_SPOTS) {
    if (player.mode !== 'ground' || document.querySelector('dialog[open]') || document.body.classList.contains('phone-on')) return null;
    let best = null, distance = Infinity;
    for (const spot of list) {
      if (Math.abs(player.floorY - spot.floor) > .7) continue;
      let d = Math.hypot(player.pos.x - spot.at[0], player.pos.z - spot.at[1]);
      if (spot.id === 'basketball' && player.pos.x >= COURT.x0 && player.pos.x <= COURT.x1 && player.pos.z >= COURT.z0 && player.pos.z <= COURT.z1) d = .5;
      if (spot.id === 'driving') d = Math.max(0, Math.hypot(player.pos.x - car.position.x, player.pos.z - car.position.z) - 2.8);
      if (d <= spot.radius && d < distance) { best = spot; distance = d; }
    }
    return best;
  }
  function resetGame() {
    game.x = 160; game.time = 30; game.score = 0; game.lives = 3; game.over = false;
    game.objects.forEach((o, i) => { o.x = 30 + i * 75; o.y = -40 - i * 45; o.speed = 40 + i * 6; o.bad = i === 2; });
    drawGame();
  }
  function parkBounds() {
    const c = Math.abs(Math.cos(car.rotation.y)), s = Math.abs(Math.sin(car.rotation.y));
    const w = c * 2.45 + s * 1.12, d = s * 2.45 + c * 1.12;
    Object.assign(carObstacle, { x0: car.position.x - w, x1: car.position.x + w, z0: car.position.z - d, z1: car.position.z + d });
  }
  function hideCarObstacle() {
    Object.assign(carObstacle, { x0: 1e6, x1: 1e6 + 1, z0: 1e6, z1: 1e6 + 1 }); nav.rebuild();
  }
  function exitCar() {
    parkBounds(); nav.rebuild();
    for (const side of [-1, 1]) for (const along of [0, -3, 3]) {
      const x = car.position.x + Math.cos(carHeading) * side * 2 + Math.sin(carHeading) * along;
      const z = car.position.z - Math.sin(carHeading) * side * 2 + Math.cos(carHeading) * along;
      if (nav.canStand(x, z) && floorAt(x, z) === 0) return { x, z };
    }
    return null;
  }
  function start(id) {
    const requested = id && allSpots.find(s => s.id === id);
    const spot = requested ? nearest([requested]) : nearest() || nearest(seats); if (active || !spot || (id && spot.id !== id)) return false;
    saved = { x: player.pos.x, y: player.y, z: player.pos.z, heading: player.heading }; firstPerson = rig.firstPerson;
    rig.setFirstPerson(false); player.cancel(); keys.clear(); active = spot; entered = time; notice = '';
    collapsed = false; breathClock = 0; rig.skipIntro();
    if (spot.id === 'basketball') {
      player.anchor(saved.x, 0, saved.z, Math.atan2(RIM.x - saved.x, RIM.z - saved.z)); visuals.ball.visible = true;
    } else if (spot.id === 'driving') {
      hideCarObstacle(); carSpeed = 0; carHeading = car.rotation.y + Math.PI / 2;
      car.castShadow = false; stage.renderer.shadowMap.needsUpdate = true;
      player.anchor(car.position.x, 0, car.position.z, carHeading);
    } else player.anchor(...spot.anchor, spot.yaw);
    rig.recenter(player, true);
    if (spot.id === 'driving') rig.set(carHeading + Math.PI, .22, 6.8);
    frameActivity();
    visuals.book.visible = visuals.page.visible = spot.id === 'reading';
    visuals.mug.visible = spot.id === 'coffee'; visuals.tv.mesh.visible = spot.id === 'tv'; visuals.monitor.mesh.visible = spot.id === 'gaming';
    if (spot.id === 'gaming') resetGame();
    if (spot.id === 'coffee') { sip = 1.8; sips++; sound.effect('coffee'); }
    if (spot.id === 'tv') sound.effect('tv');
    if (spot.id === 'reading') sound.effect('page');
    life.start(spot.id);
    document.body.classList.add('activity-active'); document.body.classList.toggle('activity-sleep', spot.id === 'sleep');
    refreshUI(); pose(0); sound.effect(spot.kind === 'seat' ? 'sit' : 'start'); return true;
  }
  function stop(force = false) {
    if (!active) return true;
    let exit = saved;
    if (active.id === 'driving') {
      exit = exitCar();
      if (!exit && !force) { hideCarObstacle(); notice = '旁边空间不足，请挪车后再下车'; updateStatus(); return false; }
      exit ||= saved; car.castShadow = true; stage.renderer.shadowMap.needsUpdate = true;
    }
    const wasSeat = active.kind === 'seat';
    active = null; keys.clear(); carSpeed = 0; shot.charging = shot.flight = false;
    life.stop(); lifeVisuals.hide(); sound.effect(wasSeat ? 'stand' : 'stop');
    for (const p of [visuals.ball, visuals.book, visuals.page, visuals.mug, visuals.tv.mesh, visuals.monitor.mesh]) p.visible = false;
    document.body.classList.remove('activity-active', 'activity-sleep');
    stage.camera.clearViewOffset();
    avatar.body.rotation.set(0, 0, 0); avatar.body.position.set(0, 0, 0); avatar.update(.5, IDLE);
    player.restore(exit.x, exit.y ?? 0, exit.z, exit.heading ?? player.heading); rig.skipIntro(); rig.reset(); rig.recenter(player, true); rig.setFirstPerson(firstPerson, player.heading);
    lastX = player.pos.x; lastZ = player.pos.z; lastMode = player.mode;
    near = nearest() || nearest(seats); nearSeat = nearest(seats); refreshUI(); return true;
  }
  function readingPage(delta) { pageIndex = (pageIndex + delta + BOOK.length) % BOOK.length; flip = .6; refreshUI(); sound.effect('page'); }
  function releaseShot() {
    if (active?.id !== 'basketball' || !shot.charging || shot.flight) return;
    shot.charging = false; shot.flight = true; shot.t = 0; shot.scored = false; shot.attempts++;
    sound.effect('shot');
    shot.willScore = Math.abs(shot.power - .62) <= .09;
    shot.x = player.pos.x + Math.sin(player.heading) * .45; shot.y = 1.9; shot.z = player.pos.z + Math.cos(player.heading) * .45;
    const miss = shot.willScore ? 0 : Math.sign(shot.power - .62) * (.6 + Math.abs(shot.power - .62));
    shot.vx = (RIM.x - shot.x) / 1.1; shot.vz = (RIM.z + miss - shot.z) / 1.1;
    shot.vy = (RIM.y - shot.y + 4.9 * 1.1 * 1.1) / 1.1;
    notice = '篮球飞向篮筐……'; updateStatus();
  }
  function primaryAction() {
    if (life.primary()) return;
    if (active?.id === 'reading') readingPage(1);
    else if (active?.id === 'coffee' && sip <= 0) { sip = 1.8; sips++; sound.effect('coffee'); updateStatus(); }
    else if (active?.id === 'tv') { tvChannel = 1 - tvChannel; sound.effect('tv'); paintTV(visuals.tv, tvTime, tvChannel, tvPaused); refreshUI(); }
    else if (active?.id === 'gaming') { sound.effect('start'); resetGame(); }
  }
  function secondaryAction() {
    if (life.secondary()) return;
    if (active?.id === 'reading') readingPage(-1);
    else if (active?.id === 'tv') { tvPaused = !tvPaused; sound.effect('click'); sound.loop(null); paintTV(visuals.tv, tvTime, tvChannel, tvPaused); refreshUI(); }
    else if (active?.id === 'driving') {
      car.position.set(15.5, 0, -6.5); car.rotation.y = 0; car.updateMatrix(); carHeading = Math.PI / 2; carSpeed = 0;
      player.anchor(15.5, 0, -6.5, carHeading); rig.recenter(player, true); notice = '已返回车库'; updateStatus();
    }
  }
  function keyDown(e) {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.target?.isContentEditable || e.target?.closest?.('input,textarea,select') || document.querySelector('dialog[open]')) return false;
    const k = e.key.toLowerCase();
    if (!active && k === 'r') { if (!e.repeat) toggleRun(); return true; }
    if (k === 'q') { if (!e.repeat) { if (active?.kind === 'seat') stop(); else if (!active) { const seat = nearest(seats); if (seat) start(seat.id); } } return true; }
    if (k === 'e') { if (!e.repeat) { if (active) stop(); else start(); } return true; }
    if (!active) return false;
    if (k === 'escape') { stop(); return true; }
    if (k === 'f') { stop(true); return false; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      keys.add(k);
      if (!e.repeat && active.id === 'reading' && (k === 'arrowleft' || k === 'arrowright')) readingPage(k === 'arrowleft' ? -1 : 1);
      return true;
    }
    if (k === ' ') {
      keys.add(k);
      if (!e.repeat) {
        if (active.id === 'basketball' && !shot.flight) { shot.charging = true; shot.power = 0; }
        else primaryAction();
      }
      return true;
    }
    if (!e.repeat && (k === 'r' || k === 'p')) secondaryAction();
    return true;
  }
  function keyUp(e) { keys.delete(e.key.toLowerCase()); if (e.key === ' ') releaseShot(); }
  function toggleRun() { runMode = !runMode; sound.effect('click'); refreshUI(); }
  runButton.addEventListener('click', () => { toggleRun(); runButton.blur(); });
  interactButton.addEventListener('click', () => { active ? stop() : start(); interactButton.blur(); });
  sitButton.addEventListener('click', () => { const seat = nearest(seats); if (seat) start(seat.id); sitButton.blur(); });
  detailButton.addEventListener('click', () => { collapsed = false; refreshUI(); detailButton.blur(); });
  $('[data-action="collapse"]').addEventListener('click', () => { collapsed = true; refreshUI(); });
  toggle.addEventListener('click', () => { active ? stop() : start(); toggle.blur(); });
  primary.addEventListener('click', e => {
    if (active?.id !== 'basketball') primaryAction();
    else if (e.detail === 0 && !shot.flight) { shot.charging = true; shot.power = .62; releaseShot(); }
    primary.blur();
  });
  primary.addEventListener('pointerdown', e => {
    if (active?.id !== 'basketball' || shot.flight) return;
    primary.setPointerCapture(e.pointerId); shot.charging = true; shot.power = 0;
  });
  primary.addEventListener('pointerup', releaseShot);
  primary.addEventListener('pointercancel', () => { shot.charging = false; });
  secondary.addEventListener('click', () => { secondaryAction(); secondary.blur(); });
  for (const b of pad.children) {
    b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); keys.add(b.dataset.key); e.preventDefault(); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(name, () => keys.delete(b.dataset.key));
  }
  const clearKeys = () => { keys.clear(); shot.charging = false; carSpeed = 0; };
  addEventListener('blur', clearKeys); document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });

  // UI and animation helpers below run only while an interaction is visible.
  function refreshUI() {
    const s = active || near;
    // Proximity only exposes compact buttons. The large panel belongs to an
    // activity the visitor explicitly starts, never a repeated pop-up hint.
    ui.hidden = !active || collapsed || active.kind === 'seat';
    fitActivityPanel();
    runButton.hidden = !!active;
    setActivityControl(runButton, runMode ? 'run' : 'walk', runMode ? '跑步中 · R 切换走路' : '走路 · R 切换跑步');
    runButton.setAttribute('aria-pressed', String(runMode));
    // The open activity panel owns the only visible exit control.
    interactButton.hidden = !!active || !s;
    setActivityControl(interactButton, 'interact', s ? `${s.title.split(' · ').at(-1)} · E` : '互动 · E');
    sitButton.hidden = !!active || !nearSeat || near?.kind === 'seat';
    detailButton.hidden = !active || !collapsed || active.kind === 'seat';
    document.body.classList.toggle('activity-near', !!s);
    if (!s) return;
    ui.dataset.activity = active?.id || '';
    title.textContent = s.title; toggle.textContent = active ? '结束互动 E' : '开始互动 E';
    primary.hidden = secondary.hidden = meter.hidden = book.hidden = canvas.hidden = pad.hidden = true;
    hint.textContent = '走近后按 E 体验 · F 打开网址目录'; status.textContent = '';
    if (!active) return;
    hint.textContent = 'E / Esc 或点击地面结束 · 拖拽转动视角';
    switch (s.id) {
      case 'basketball': primary.hidden = meter.hidden = false; primary.textContent = '按住蓄力 / 松手投篮'; hint.textContent = '按住空格蓄力，绿色区松手投篮 · E 退出'; break;
      case 'sleep': toggle.textContent = '起床 E'; break;
      case 'reading': book.hidden = primary.hidden = secondary.hidden = false; primary.textContent = '下一页 →'; secondary.textContent = '上一页 ←'; book.querySelector('h3').textContent = BOOK[pageIndex][0]; book.querySelector('p').textContent = BOOK[pageIndex][1]; book.querySelector('small').textContent = `${pageIndex + 1} / ${BOOK.length} 页 · ← → 或空格翻页`; break;
      case 'tv': primary.hidden = secondary.hidden = false; primary.textContent = '换台 空格'; secondary.textContent = tvPaused ? '播放 P' : '暂停 P'; break;
      case 'coffee': primary.hidden = false; primary.textContent = '再喝一口 空格'; break;
      case 'gaming': canvas.hidden = primary.hidden = pad.hidden = false; primary.textContent = '重新开始 空格'; hint.textContent = 'A / D 或 ← → 移动 · 接金块，避红块'; break;
      case 'driving': pad.hidden = secondary.hidden = false; secondary.textContent = '回车库 R'; toggle.textContent = '下车 E'; hint.textContent = 'W / S 前进倒车 · A / D 转向 · 空格刹车'; break;
      case 'fishing': primary.hidden = false; primary.textContent = life.fishing.phase === 'bite' ? '立即收线！空格' : life.fishing.phase === 'waiting' ? '提竿 空格' : '抛竿 空格'; hint.textContent = '空格抛竿 · 浮漂下沉后 2.5 秒内按空格收线'; break;
      case 'cooking': primary.hidden = false; primary.textContent = life.cooking.phase === 'prep' ? '切菜 空格' : life.cooking.phase === 'cooking' ? '翻炒 空格' : '再做一份 空格'; hint.textContent = '切菜 3 次 → 翻炒 3 次 → 等待出锅 · E 结束'; break;
      case 'treadmill': primary.hidden = secondary.hidden = false; primary.textContent = life.treadmill.paused ? '继续跑 空格' : '暂停 空格'; secondary.textContent = '调速度 R'; hint.textContent = '空格暂停 / 继续 · R 调速 · E 下跑步机'; break;
    }
    if (!hint.textContent.includes('点击地面')) hint.textContent += ' · 点击地面结束';
    for (const b of pad.children) b.hidden = s.id === 'gaming' && b.dataset.key !== 'a' && b.dataset.key !== 'd';
    updateStatus();
  }
  function updateStatus() {
    if (!active) return;
    const id = active.id;
    if (id === 'basketball') status.textContent = `${shot.points} 分 / ${shot.attempts} 次投篮${notice ? ' · ' + notice : ''}`;
    else if (id === 'sleep') status.textContent = `正在休息 · ${Math.floor(time - entered)} 秒 · 按 E 起床`;
    else if (id === 'coffee') status.textContent = `已喝 ${sips} 口 · ${sip > 0 ? '慢慢品尝中' : '稍作休息，再喝一口'}`;
    else if (id === 'tv') status.textContent = `${tvChannel ? '像素体育台' : '海岸旅行台'}${tvPaused ? ' · 已暂停' : ' · 正在播放'}`;
    else if (id === 'driving') status.textContent = `${Math.round(Math.abs(carSpeed) * 3.6)} km/h · ${Math.round(driveDistance)} 米${notice ? ' · ' + notice : ''}`;
    else if (id === 'gaming') status.textContent = `${game.score} 分 · ${game.lives} 颗心 · ${Math.ceil(game.time)} 秒${game.over ? ' · 本局结束' : ''}`;
    else if (id === 'fishing') status.textContent = `${life.fishing.catches} 条鱼 · ${life.fishing.message}`;
    else if (id === 'cooking') status.textContent = life.cooking.phase === 'prep' ? `备菜 ${life.cooking.chops} / 3` : life.cooking.phase === 'cooking' ? `翻炒 ${Math.min(3, life.cooking.stirs)} / 3 · ${life.cooking.elapsed < 6 ? `还需 ${Math.ceil(6 - life.cooking.elapsed)} 秒` : '食材已熟，完成翻炒即可出锅'}` : `做好了！已完成 ${life.cooking.dishes} 份料理`;
    else if (id === 'treadmill') status.textContent = `${life.treadmill.paused ? '已暂停' : `${(life.treadmill.speed * 6).toFixed(1)} km/h`} · ${Math.round(life.treadmill.distance)} 米 · ${Math.floor(life.treadmill.elapsed)} 秒`;
  }
  function canDrive(x, z, heading) {
    const c = Math.sin(heading), s = Math.cos(heading);
    // Separating-axis checks also catch thin furniture between grid samples.
    for (const o of world.obstacles) {
      if (o === carObstacle || o.level === 1) continue;
      const dx = (o.x0 + o.x1) / 2 - x, dz = (o.z0 + o.z1) / 2 - z;
      const w = (o.x1 - o.x0) / 2, d = (o.z1 - o.z0) / 2, ac = Math.abs(c), as = Math.abs(s);
      if (Math.abs(dx) > 2.45 * ac + 1.12 * as + w || Math.abs(dz) > 2.45 * as + 1.12 * ac + d) continue;
      if (Math.abs(dx * c + dz * s) > 2.45 + w * ac + d * as || Math.abs(-dx * s + dz * c) > 1.12 + w * as + d * ac) continue;
      return false;
    }
    for (const p of carSamples) {
      const px = x + c * p[0] - s * p[1], pz = z + s * p[0] + c * p[1];
      if (px < ISLAND.x0 + 1 || px > ISLAND.x1 - 1 || pz < ISLAND.z0 + 1 || pz > ISLAND.z1 - 1 || floorAt(px, pz) !== 0) return false;
      if (px > POOL.x0 - .4 && px < POOL.x1 + .4 && pz > POOL.z0 - .4 && pz < POOL.z1 + .4) return false;
      const bx = Math.floor(px), bz = Math.floor(pz);
      if (!world.grid.type(bx, -1, bz) || world.grid.type(bx, 0, bz) || world.grid.type(bx, 1, bz)) return false;
    }
    return true;
  }
  function drive(dt) {
    const forward = keys.has('w') || keys.has('arrowup'), reverse = keys.has('s') || keys.has('arrowdown');
    const braking = keys.has(' '), throttle = Number(forward) - Number(reverse);
    const target = braking ? 0 : throttle > 0 ? 5.5 : throttle < 0 ? -2.5 : 0;
    const acceleration = braking ? 14 : 4;
    carSpeed += clamp(target - carSpeed, -acceleration * dt, acceleration * dt);
    const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
    const direction = carSpeed < -.08 ? -1 : 1;
    const heading = carHeading + turn * direction * (.9 + Math.min(Math.abs(carSpeed), 5.5) * .08) * dt;
    // Allow steering while stopped; a blocked translation must not discard a safe turn.
    notice = '';
    if (turn) {
      if (canDrive(car.position.x, car.position.z, heading)) carHeading = heading;
      else notice = '转弯空间不足，请先向空处挪车';
    }
    const x = car.position.x + Math.sin(carHeading) * carSpeed * dt, z = car.position.z + Math.cos(carHeading) * carSpeed * dt;
    if (Math.abs(carSpeed) > .001) {
      if (canDrive(x, z, carHeading)) { driveDistance += Math.abs(carSpeed) * dt; car.position.set(x, 0, z); }
      else { carSpeed = 0; notice = '遇到障碍，请反向挪车后转向'; }
    }
    // The mesh faces local +X; Three.js rotates +X toward -Z for positive yaw.
    car.rotation.y = carHeading - Math.PI / 2; car.updateMatrix();
    player.anchor(car.position.x, 0, car.position.z, carHeading);
    sound.loop('engine', Math.abs(carSpeed) / 5.5);
  }
  function basketball(dt) {
    if (shot.charging) shot.power = Math.min(1, shot.power + dt / .95);
    fill.style.width = `${shot.power * 100}%`;
    if (shot.flight) {
      const next = shot.t + dt;
      // Split at the rim time so scoring and the drop through the net align.
      const step = shot.t < 1.1 ? Math.min(dt, 1.1 - shot.t) : dt;
      shot.x += shot.vx * step; shot.z += shot.vz * step; shot.y += shot.vy * step - 4.9 * step * step; shot.vy -= 9.8 * step;
      if (next >= 1.1 && !shot.scored) {
        shot.scored = true;
        if (shot.willScore) { shot.points += 2; shot.vx = shot.vz = 0; notice = '命中！+2 分'; sound.effect('score'); }
        else { shot.vx *= -.35; shot.vz *= .5; notice = '差一点！试试在绿色区松手'; }
        updateStatus();
      }
      shot.t = next;
      if (shot.y < .18) { if (Math.abs(shot.vy) > .7) sound.effect('bounce', Math.min(1, Math.abs(shot.vy) / 5)); shot.y = .18; shot.vy = Math.abs(shot.vy) * .45; shot.vx *= .6; shot.vz *= .6; }
      if (shot.t > 2.8) { shot.flight = false; shot.power = 0; }
      visuals.ball.position.set(shot.x, shot.y, shot.z); visuals.ball.rotation.x += dt * 5;
    } else visuals.ball.position.set(player.pos.x + Math.sin(player.heading) * .45, 1.05 + shot.power * .8, player.pos.z + Math.cos(player.heading) * .45);
  }
  function drawGame() {
    const c = visuals.monitor.ctx; c.fillStyle = '#142c38'; c.fillRect(0, 0, 320, 180);
    c.fillStyle = '#20404a'; for (let x = 0; x < 320; x += 20) c.fillRect(x, 0, 1, 180);
    c.fillStyle = '#eee1bb'; c.font = 'bold 13px monospace'; c.fillText(`SCORE ${game.score}    ${Math.ceil(game.time)}s    HP ${game.lives}`, 10, 19);
    for (const o of game.objects) { c.fillStyle = o.bad ? '#e97c6c' : '#ebc267'; c.fillRect(o.x - 7, o.y - 7, 14, 14); }
    c.fillStyle = '#9acfaf'; c.fillRect(game.x - 22, 153, 44, 10);
    if (game.over) { c.fillStyle = '#14212ee8'; c.fillRect(50, 59, 220, 65); c.fillStyle = '#fff0ce'; c.font = 'bold 19px monospace'; c.fillText(`SCORE ${game.score}`, 108, 87); c.font = '12px monospace'; c.fillText('SPACE TO PLAY AGAIN', 93, 110); }
    visuals.monitor.texture.needsUpdate = true;
  }
  function gaming(dt) {
    if (game.over) return;
    game.x = clamp(game.x + (Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))) * 170 * dt, 24, 296);
    game.time = Math.max(0, game.time - dt);
    for (const o of game.objects) {
      o.y += o.speed * dt;
      if (o.y >= 145 && o.y <= 169 && Math.abs(o.x - game.x) < 29) { if (o.bad) game.lives--; else game.score += 10; sound.effect(o.bad ? 'game-hit' : 'game-point'); o.y = 200; }
      if (o.y > 190) { o.y = -20; o.x = 18 + Math.random() * 284; o.speed = 40 + Math.random() * 24; o.bad = Math.random() < .24; }
    }
    game.lives = Math.max(0, game.lives); game.over = game.time <= 0 || game.lives === 0;
    if (game.over) sound.effect('stop');
  }
  function pose(dt) {
    avatar.root.position.set(player.pos.x, player.y, player.pos.z); avatar.root.rotation.set(0, player.heading, 0);
    avatar.body.position.set(0, 0, 0); avatar.body.rotation.set(0, 0, 0); avatar.head.rotation.set(0, 0, 0);
    for (const limb of limbs) limb.rotation.set(0, 0, 0);
    const id = active.id;
    if (active.kind === 'seat' || id === 'reading' || id === 'tv' || id === 'gaming' || id === 'driving') {
      avatar.root.position.y = active.kind === 'seat' ? active.seatHeight - .5625 : player.y + (id === 'driving' ? -.12 : id === 'tv' ? -.0025 : .0075);
      avatar.legL.rotation.x = avatar.legR.rotation.x = -Math.PI / 2;
      avatar.armL.rotation.x = avatar.armR.rotation.x = -.7;
    }
    if (id === 'sleep') {
      avatar.root.position.set(-12, 4.78, -8.55); avatar.body.rotation.x = -Math.PI / 2; avatar.body.position.y = Math.sin(time * 1.3) * .012;
      avatar.armL.rotation.z = -.15; avatar.armR.rotation.z = .15;
    } else if (id === 'reading') {
      avatar.armL.rotation.x = avatar.armR.rotation.x = -1.15; avatar.armL.rotation.z = -.2; avatar.armR.rotation.z = .2; avatar.head.rotation.x = .35;
      flip = Math.max(0, flip - dt); visuals.page.rotation.z = -Math.sin(flip / .6 * Math.PI) * 2.5;
    } else if (id === 'tv') avatar.head.rotation.y = Math.sin(time * .8) * .04;
    else if (id === 'coffee') {
      sip = Math.max(0, sip - dt); const lift = Math.sin(sip / 1.8 * Math.PI);
      avatar.armR.rotation.x = -.9 - lift * 1.3; avatar.armR.rotation.z = .3; avatar.head.rotation.x = -.1 * lift;
    } else if (id === 'gaming') {
      avatar.armL.rotation.x = -1.3 + Math.sin(time * 13) * .08; avatar.armR.rotation.x = -1.3 - Math.sin(time * 13) * .08; avatar.head.rotation.x = .1;
    } else if (id === 'driving') {
      avatar.root.position.y -= .18; avatar.armL.rotation.x = avatar.armR.rotation.x = -1.2;
    } else if (id === 'basketball') avatar.armL.rotation.x = avatar.armR.rotation.x = shot.flight && shot.t < .35 ? -2.5 : -.8 - shot.power * 1.5;
    else if (id === 'fishing') {
      const phase = life.fishing.phase;
      avatar.armR.rotation.x = phase === 'casting' ? -1.2 - Math.sin(life.fishing.elapsed / .8 * Math.PI) : -.9;
      avatar.armL.rotation.x = phase === 'reeling' ? -1.1 + Math.sin(time * 20) * .18 : -.5;
      avatar.head.rotation.x = .15;
      lifeVisuals.fishing(time, phase, phase === 'casting' ? life.fishing.elapsed / .8 : phase === 'reeling' ? life.fishing.elapsed / 1.2 : 0);
    } else if (id === 'cooking') {
      const c = life.cooking, motion = c.phase === 'ready' ? 0 : c.cooldown / .35;
      avatar.armR.rotation.x = -.7;
      avatar.armL.rotation.x = c.phase === 'prep' ? -1.3 + Math.sin(motion * Math.PI) * .12 : c.phase === 'cooking' ? -1.62 + Math.sin(motion * Math.PI) * .12 : -.7;
      avatar.armL.rotation.z = c.phase === 'prep' ? .4 : c.phase === 'cooking' ? -.2 : 0; avatar.head.rotation.x = .25;
      lifeVisuals.cooking(time, c.phase, Math.min(1, c.elapsed / 6));
    } else if (id === 'treadmill') {
      const t = life.treadmill, stride = t.paused ? 0 : Math.sin(t.elapsed * t.speed * 12);
      avatar.legL.rotation.x = stride * .85; avatar.legR.rotation.x = -stride * .85;
      avatar.armL.rotation.x = -.25 - stride * .8; avatar.armR.rotation.x = -.25 + stride * .8;
      avatar.body.rotation.x = t.paused ? 0 : .12;
      avatar.root.position.y += .025 + (t.paused ? 0 : Math.abs(stride) * .07);
      lifeVisuals.treadmill(t.elapsed, t.paused ? 0 : t.speed);
    }
  }
  function walkingSounds() {
    const distance = Math.hypot(player.pos.x - lastX, player.pos.z - lastZ);
    if (player.mode === 'ground' && distance > .001 && distance < 1) {
      stepDistance += distance;
      const stride = player.running ? 1.5 : 1.65;
      if (stepDistance >= stride) { stepDistance %= stride; sound.effect(player.running ? 'run' : 'step'); }
    } else if (!player.moving) stepDistance = 0;
    if (player.mode !== lastMode) {
      if (player.mode === 'air' && lastMode === 'ground') sound.effect('jump');
      else if (player.mode === 'ground' && lastMode === 'air') sound.effect('land');
    }
    lastX = player.pos.x; lastZ = player.pos.z; lastMode = player.mode;
  }
  function update(dt) {
    if (document.hidden) return;
    if (!controlsReady && window.__home) {
      controlsReady = true; controls.hidden = false;
    }
    time += dt; uiClock += dt; screenClock += dt;
    if (!active) { walkingSounds(); if (uiClock > .15) { uiClock = 0; const seat = nearest(seats), next = nearest() || seat; if (near !== next || nearSeat !== seat) { near = next; nearSeat = seat; refreshUI(); } } return; }
    if (document.querySelector('dialog[open]')) { stop(true); return; }
    if (active.id === 'driving') drive(dt);
    if (active.id === 'basketball') basketball(dt);
    if (active.id === 'gaming') gaming(dt);
    life.update(dt);
    if (active.id === 'tv') { if (!tvPaused) tvTime += dt; sound.loop(tvPaused ? null : 'tv', .5); }
    if (active.id === 'sleep') { breathClock += dt; if (breathClock > 3) { breathClock = 0; sound.effect('sleep'); } }
    pose(dt);
    if (screenClock > .1) { screenClock = 0; if (active.id === 'tv') paintTV(visuals.tv, tvTime, tvChannel, tvPaused); if (active.id === 'gaming') drawGame(); }
    if (uiClock > .25) { uiClock = 0; updateStatus(); }
  }
  return {
    start, stop, keyDown, keyUp, update, spots: allSpots, seats,
    pause() { clearKeys(); sound.loop(null); },
    get running() { return runMode; },
    get active() { return !!active; }, get current() { return active?.id || null; },
    status: () => ({ active: active?.id || null, nearby: near?.id || null, seat: nearSeat?.id || null, running: runMode, fishing: { ...life.fishing }, cooking: { ...life.cooking }, treadmill: { ...life.treadmill }, page: pageIndex, sips, tvChannel, tvPaused, tvTime, car: { x: car.position.x, z: car.position.z, speed: carSpeed, heading: carHeading, distance: driveDistance }, shot: { ...shot }, game: { ...game, objects: game.objects.map(o => ({ ...o })) } }),
  };
}
