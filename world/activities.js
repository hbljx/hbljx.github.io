import { COURT, RIM, ISLAND, POOL, BED, floorAt } from './layout.js';
import { createActivityVisuals, paintTV, paintCinema } from './activity-visuals.js';
import { getSeats } from './seats.js';
import { LIFE_SPOTS, createLifeVisuals } from './life-visuals.js';
import { createLifeActions } from './life-actions.js';
import { setActivityControl } from '../navigation/activity-icons.js';
import { icon } from '@engine/ui/icons.js';
import { distanceToAirplane, createFlight } from './aircraft.js';
import { createCruise } from './carrier.js';
import { createDive } from './submarine.js';
import { PATROL_LENGTH, samplePatrol } from './submarine-path.js';
import { LIBRARY, CINEMA } from './shared-rooms.js';
import { createRoadsterLights } from './roadster.js';
import { createJetCar } from './jet-car.js';
import { CARRIER_HOME, SUBMARINE_HOME, SUBMARINE_SCALE } from './layout.js';
import { TRANSIT_STOPS } from './transit-layout.js';
import { tunnelCeiling } from './tunnel-glazing.js';
import { createTransitRides } from './transit-rides.js';

export const ACTIVITY_SPOTS = [
  ...TRANSIT_STOPS.map(s=>({...s,title:s.name+' · 双人候车',radius:1.8})),
  ...LIFE_SPOTS,
  {id:'library',title:'双人图书馆 · 一起看书',at:LIBRARY.at,floor:0,radius:1.8,anchor:LIBRARY.male,yaw:Math.PI,view:[-16,4.6,-17.8],look:[-20,1.1,-21.5]},
  {id:'cinema',title:'家庭影院 · 一起看电影',at:CINEMA.at,floor:0,radius:2,anchor:CINEMA.male,yaw:Math.PI,view:[7.4,4.4,-18.65],look:[5,1.7,-24.4]},
  {id:'bath',title:'浴室 · 睡前一起沐浴',at:[-8,-17.4],floor:0,radius:1.8},
  {id:'roadster',title:'劳斯莱斯 · 白色敞篷跑车',at:[24.2,-17],floor:0,radius:1.2},
  { id: 'carrier', title: '航母驾驶舱 · 海上巡航', at: [CARRIER_HOME.x + 4.65, CARRIER_HOME.z + 5.1], floor: 3.4, radius: 1.6 },
  { id: 'submarine', title: '领海一号 · 核潜艇', at: [SUBMARINE_HOME.x, SUBMARINE_HOME.z - 10 * SUBMARINE_SCALE], floor: 4.4 * SUBMARINE_SCALE, radius: 2.2 * SUBMARINE_SCALE },
  { id: 'tea', title: '三楼茶室 · 泡茶', at: [-11, 2], floor: 11, radius: 1.5, anchor: [-11, 11, .45], yaw: Math.PI, view: [-6.3, 13.8, 3.8], look: [-11, 12, -1.5] },
  { id: 'airplane', title: '领地飞机 · 驾驶飞机', at: [12, 4.2], floor: 11, radius: 1.6 },
  { id: 'basketball', title: '篮球场 · 投篮', at: [-12, 4], floor: 0, radius: 3, view: [-8, 6, 14], look: [-13.5, 1.5, 4] },
  { id: 'sleep', title: '卧室 · 睡觉', at: [BED.x + 2.2, BED.z + .35], floor: BED.y, radius: 2, anchor: [BED.x, BED.y, BED.z + .35], yaw: 0, view: [BED.x + 4, BED.y + 4, BED.z + 3.65], look: [BED.x, BED.y + .8, BED.z + .15] },
  { id: 'reading', title: '灵感书房 · 看书', at: [-7.3, -6.7], floor: 4, radius: 2, anchor: [-8.8, 4, -6.85], yaw: 0, view: [-6.1, 7, -5], look: [-8.8, 5, -6.6] },
  { id: 'tv', title: '日常客厅 · 看电视', at: [1, -.3], floor: 0, radius: 3, anchor: [2.95, 0, -3.1], yaw: -Math.PI / 2, view: [9, 5, 2], look: [1.4, 1.1, -3.2] },
  { id: 'driving', title: '特斯拉 Model Y · 喷气汽车', at: [15.5, -4.5], floor: 0, radius: 1.1 },
  { id: 'motorcycle', title: '工具车库 · 骑摩托车', at: [14.5, -.15], floor: 0, radius: 1.25 },
  { id: 'coffee', title: '音乐咖啡吧 · 喝咖啡', at: [8, 13.3], floor: 0, radius: 2.1, anchor: [8.7, 0, 13.65], yaw: 0, view: [11.5, 3.6, 15.5], look: [8.5, 1.1, 13.65] },
  { id: 'gaming', title: 'AI 工作台 · 打游戏', at: [1.2, -8.3], floor: 0, radius: 2.1, anchor: [2.1, 0, -9.55], yaw: Math.PI, view: [-1, 3.2, -6.7], look: [2.1, 1.1, -10.35] },
];
const BOOK = [
  ['第一章 · 海边的小屋', '清晨，阳光落在木地板上。推开窗，海风带来新的一天。今天不必赶路，先把想做的事情，一件一件放进自己的小世界。'],
  ['第二章 · 留一点空白', '书架上不必摆满每一本书，日程里也可以留下一点空白。读到喜欢的一页，就停下来；遇到新的想法，就把它写下来。'],
  ['第三章 · 回到这里', '傍晚，屋里的灯亮了。篮球回到场边，咖啡杯放回桌上。明天还有许多地方可以探索，而这个小屋，总会留着一个位置。'],
];
const isReading = id => id === 'reading' || id === 'library';
const IDLE = { speed: 0, fly: -1 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createActivities({ stage, world, player, avatar, nav, rig, sound }) {
  const transit=createTransitRides({world,player,avatar,rig,sound});
  const ui = document.createElement('aside'); ui.id = 'activity-ui'; ui.hidden = true;
  ui.setAttribute('aria-label', '场景互动');
  ui.innerHTML = `<div class="activity-heading"><strong></strong><button type="button" data-action="collapse" aria-label="收起操作面板">收起</button></div>
    <p class="activity-hint"></p><p class="activity-status" role="status"></p>
    <div class="activity-meter" hidden aria-label="投篮力度，绿色区域命中"><i></i><b></b></div>
    <section class="activity-book" hidden><h3></h3><p></p><small></small></section>
    <canvas class="activity-game" width="320" height="180" hidden aria-label="接住金块，避开红块"></canvas>
    <div class="activity-buttons"><button type="button" data-action="toggle"></button><button type="button" data-action="primary" hidden></button><button type="button" data-action="catapult" hidden>弹射起飞</button><button type="button" data-action="ski-jump" hidden>滑跃起飞</button><button type="button" data-action="secondary" hidden></button><button type="button" data-action="tunnel" hidden>隧道领航 T</button><button type="button" data-action="summit" hidden>山顶降落 L</button><button type="button" data-action="hover" hidden>悬停 V</button><button type="button" data-action="carrier-land" hidden>降落航母 H</button></div>
    <div class="activity-pad" hidden><button type="button" data-key="a" aria-label="向左">←</button><button type="button" data-key="w" aria-label="前进">↑</button><button type="button" data-key="s" aria-label="倒车">↓</button><button type="button" data-key="d" aria-label="向右">→</button><button type="button" data-key=" " aria-label="刹车">刹车</button><button type="button" data-key="c" aria-label="降低高度" hidden>降低</button></div>`;
  document.body.append(ui);
  const jetButtons = document.createElement('div'); jetButtons.className = 'activity-jet'; jetButtons.hidden = true;
  for (const [key, label] of [['v','悬停 V'],['q','翻滚 Q'],['b','前空翻 B'],['x','掉头 X']]) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.jet = key; button.textContent = label;
    button.addEventListener('click', () => { jetAction(key); button.blur(); }); jetButtons.append(button);
  }
  ui.querySelector('.activity-buttons').after(jetButtons);
  const boostButton = document.createElement('button'); boostButton.type = 'button'; boostButton.dataset.key = 'shift';
  boostButton.textContent = '加速'; boostButton.setAttribute('aria-label', '按住加速'); boostButton.hidden = true;
  ui.querySelector('.activity-pad').append(boostButton);
  const controls = document.createElement('div'); controls.id = 'activity-controls'; controls.hidden = true;
  controls.setAttribute('aria-label', '人物操作'); controls.setAttribute('role', 'group');
  controls.innerHTML = '<button type="button" data-control="interact" hidden><span aria-hidden="true"></span></button><button type="button" data-control="sit" hidden><span aria-hidden="true"></span></button><button type="button" data-control="detail" aria-controls="activity-ui" hidden><span aria-hidden="true"></span></button>';
  document.querySelector('#corner').append(controls);
  const movementButton = document.querySelector('#flyButton'), interactButton = controls.querySelector('[data-control="interact"]'), sitButton = controls.querySelector('[data-control="sit"]'), detailButton = controls.querySelector('[data-control="detail"]');
  movementButton.dataset.control = 'movement'; movementButton.setAttribute('aria-keyshortcuts', 'R');
  setActivityControl(sitButton, 'sit', '坐下 · Q');
  setActivityControl(detailButton, 'detail', '展开操作面板');
  const $ = s => ui.querySelector(s), title = $('strong'), hint = $('.activity-hint'), status = $('.activity-status');
  const toggle = $('[data-action="toggle"]'), primary = $('[data-action="primary"]'), secondary = $('[data-action="secondary"]'), tunnelButton = $('[data-action="tunnel"]');
  const summit = $('[data-action="summit"]');
  const carrierLand = $('[data-action="carrier-land"]');
  const catapult=$('[data-action="catapult"]'),skiJump=$('[data-action="ski-jump"]');
  const meter = $('.activity-meter'), fill = meter.querySelector('i'), book = $('.activity-book'), canvas = $('.activity-game'), pad = $('.activity-pad');
  const visuals = createActivityVisuals(stage.scene, avatar, canvas);
  const lifeVisuals = createLifeVisuals(stage.scene, avatar), seats = getSeats(world);
  const flights = world.aircraftFleet.planes.map(mesh=>createFlight({mesh,world,player,stage,sound}));
  let flight=flights[0];
  const cruise = createCruise({ world, player });
  const dive = createDive({ world, player, stage });
  world.transit.installView(stage,player);
  const sonar = document.createElement('canvas'); sonar.className = 'activity-sonar'; sonar.width = 320; sonar.height = 126; sonar.hidden = true;
  sonar.setAttribute('role','img'); sonar.setAttribute('aria-label','深海领地航图'); ui.insertBefore(sonar, $('.activity-buttons'));
  const sonarContext = sonar.getContext('2d'), sonarPoint = {};
  let planeExitPending = false, teaCups = 0;
  const allSpots = [...ACTIVITY_SPOTS, ...seats], life = createLifeActions(sound, () => refreshUI());
  const limbs = [avatar.armL, avatar.armR, avatar.legL, avatar.legR];
  const roadsterLights=createRoadsterLights(stage.scene,world.animated.roadster);
  let bedtimeHandler=null,sharedStatus='';
  const vehicles = {
    roadster:{mesh:world.animated.roadster,obstacle:world.animated.roadsterObstacle,halfLength:2.82,halfWidth:1.27,home:[22,-17],homeHeading:0,distance:0},
    driving: { mesh: world.animated.car, obstacle: world.animated.carObstacle, halfLength: 2.85, halfWidth: 1.12, home: [15.5, -6.5], distance: 0 },
    motorcycle: { mesh: world.animated.motorcycle, obstacle: world.animated.motorcycleObstacle, halfLength: 1.25, halfWidth: .52, home: [14.5, 1], distance: 0 },
  };
  const tunnelProjection = {};
  for (const [id,vehicle] of Object.entries(vehicles)) {
    vehicle.id=id;vehicle.passengerReady=false;
    vehicle.samples = [];
    for (let i = 0; i <= 10; i++) for (let j = 0; j <= 4; j++) vehicle.samples.push([vehicle.halfLength * (i / 5 - 1), vehicle.halfWidth * (j / 2 - 1)]);
  }
  let vehicle = vehicles.driving, car = vehicle.mesh, carObstacle = vehicle.obstacle;
  const isDriving = () => !!vehicles[active?.id];
  const keys = new Set();
  let active = null, near = null, nearSeat = null, nearTitle = '', time = 0, uiClock = 0, screenClock = 0, entered = 0;
  let runMode = false, collapsed = false, controlsReady = false, stepDistance = 0, lastX = player.pos.x, lastZ = player.pos.z, lastMode = player.mode, breathClock = 0;
  let firstPerson = false, saved = null, pageIndex = 0, flip = 0, sip = 0, sips = 0;
  let tvChannel = 0, tvTime = 0, tvPaused = false, cinemaTime = 0, carSpeed = 0, carHeading = Math.PI / 2, driveDistance = 0, notice = '';
  let tunnelGuide=0,tunnelArrived=false;
  let jetExitPending = false;
  const jet = createJetCar({ mesh: vehicles.driving.mesh, world, player, sound, canDrive, driveHeight, vehicle: vehicles.driving });
  vehicles.driving.placeOccupant = jet.placeOccupant;
  vehicles.driving.getHeading = () => jet.airborne ? jet.heading : vehicles.driving.mesh.rotation.y + Math.PI / 2;
  const guidePoint={},guideProjection={};
  let ambient=null,ambientTime=0,ambientClock=0;
  function setAmbientActivity(id){
    ambient=id;
    // These screens are under the solid roof; skip their hidden outside view.
    const visible=world.hidden.has('roof')||stage.camera.position.y<10.9;
    visuals.tv.mesh.visible=active?.id==='tv'||visible&&id==='tv';
    visuals.cinema.mesh.visible=active?.id==='cinema'||visible&&id==='cinema';
    visuals.monitor.mesh.visible=active?.id==='gaming'||visible&&id==='gaming';
  }
  function ambientScreens(dt){
    ambientTime+=dt;ambientClock+=dt;
    if(!ambient||ambientClock<=.1||active?.id===ambient)return;
    ambientClock=0;
    if(ambient==='tv')paintTV(visuals.tv,ambientTime,0,false);
    else if(ambient==='cinema')paintCinema(visuals.cinema,ambientTime);
    else{
      const c=canvas.getContext('2d');c.fillStyle='#152d43';c.fillRect(0,0,320,180);
      c.fillStyle='#e8c777';for(let i=0;i<5;i++)c.fillRect(30+i*60,(ambientTime*28+i*39)%160,12,12);
      c.fillStyle='#76ae9b';c.fillRect(140+Math.sin(ambientTime)*100,157,35,10);
      visuals.monitor.texture.needsUpdate=true;
    }
  }
  const shot = { charging: false, power: 0, flight: false, t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, scored: false, willScore: false, attempts: 0, points: 0 };
  const game = { x: 160, time: 30, score: 0, lives: 3, over: false, objects: Array.from({ length: 4 }, (_, i) => ({ x: 30 + i * 75, y: -40 - i * 45, speed: 40 + i * 6, bad: i === 2 })) };
  function fitActivityPanel() {
    // Leave the lower part of a portrait phone for the character or aircraft.
    const portraitPanel = !ui.hidden && innerWidth < 720 && innerHeight > innerWidth;
    const offset = active?.id==='library' ? .13 : isReading(active?.id) ? .24 : ['airplane','driving','tea','carrier','submarine'].includes(active?.id) ? .12 : 0;
    if (portraitPanel && offset) stage.camera.setViewOffset(innerWidth, innerHeight, 0, -innerHeight * offset, innerWidth, innerHeight);
    else if (!ui.hidden && active?.id === 'submarine') stage.camera.setViewOffset(innerWidth, innerHeight, innerWidth * .12, -innerHeight * .06, innerWidth, innerHeight);
    else stage.camera.clearViewOffset();
  }
  function frameActivity() {
    const portrait = innerWidth < 720 && innerHeight > innerWidth;
    fitActivityPanel();
    if (active?.view) {
      if (portrait && active.id === 'basketball') rig.showcase([-6, 7, 18], [-15.2, 1.5, 4], { interactive: true });
      else if (portrait && active.id === 'library') rig.showcase([-20,7.8,-27.4],[-20,1.1,-20.7],{interactive:true});
      else if (portrait && active.id === 'tv') rig.showcase([11, 6, 3], [0, 1.3, -3.2], { interactive: true });
      else rig.showcase(active.view, active.look, { interactive: true });
    }
  }
  addEventListener('resize', () => {
    if (active?.id === 'driving' && jet.airborne) rig.set(rig.yaw, .3, innerWidth < 720 && innerHeight > innerWidth ? 14.5 : 9.5);
    if (active?.id === 'submarine') rig.set(rig.yaw, .42, innerWidth < 720 && innerHeight > innerWidth ? 300 : 175);
    frameActivity();
  });
  function nearest(list = ACTIVITY_SPOTS) {
    if (player.mode !== 'ground' || document.querySelector('dialog[open]') || document.body.classList.contains('phone-on')) return null;
    let best = null, distance = Infinity;
    for (const spot of list) {
      if (spot.id === 'carrier') { if (world.carrier.canBoard(player)) { best = spot; distance = 0; } continue; }
      if (spot.id === 'submarine') { if (world.submarine.canBoard(player)) { best = spot; distance = 0; } continue; }
      let plane=null;
      if(spot.id==='airplane'){
        let closest=Infinity;
        for(let i=0;i<flights.length;i++){const p=world.aircraftFleet.planes[i];if(!flights[i].parked||Math.abs(player.floorY-p.position.y)>.7)continue;const d=distanceToAirplane(p,player.pos.x,player.pos.z);if(d<closest){closest=d;plane=p;spot.flightIndex=i;}}
        if(!plane)continue;spot.title=`${plane.userData.label} · 驾驶飞机`;
      }
      if (Math.abs(player.floorY - (plane?plane.position.y:vehicles[spot.id]?.mesh.position.y??spot.floor)) > .7) continue;
      let d = Math.hypot(player.pos.x - spot.at[0], player.pos.z - spot.at[1]);
      if(plane)d=distanceToAirplane(plane,player.pos.x,player.pos.z);
      if (spot.id === 'basketball' && player.pos.x >= COURT.x0 && player.pos.x <= COURT.x1 && player.pos.z >= COURT.z0 && player.pos.z <= COURT.z1) d = .5;
      const v = vehicles[spot.id];
      if(v?.mesh.userData.rider)continue;
      if (v) {
        // Measure from the vehicle body so both parked vehicles remain selectable.
        const dx = player.pos.x - v.mesh.position.x, dz = player.pos.z - v.mesh.position.z;
        const c = Math.cos(v.mesh.rotation.y), s = Math.sin(v.mesh.rotation.y);
        d = Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - v.halfLength), Math.max(0, Math.abs(dx * s + dz * c) - v.halfWidth));
      }
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
    const w = c * vehicle.halfLength + s * vehicle.halfWidth, d = s * vehicle.halfLength + c * vehicle.halfWidth;
    Object.assign(carObstacle, { x0: car.position.x - w, x1: car.position.x + w, z0: car.position.z - d, z1: car.position.z + d, y:car.position.y });
  }
  function hideCarObstacle() {
    Object.assign(carObstacle, { x0: 1e6, x1: 1e6 + 1, z0: 1e6, z1: 1e6 + 1 }); nav.rebuild();
  }
  function exitCar() {
    parkBounds(); nav.rebuild();
    for (const side of [-1, 1]) for (const along of [0, -vehicle.halfLength - .6, vehicle.halfLength + .6]) {
      const x = car.position.x + Math.cos(carHeading) * side * (vehicle.halfWidth + .65) + Math.sin(carHeading) * along;
      const z = car.position.z - Math.sin(carHeading) * side * (vehicle.halfWidth + .65) + Math.cos(carHeading) * along;
      const surface=world.ground.canStand(x,z,car.position.y);
      if(['sea-bridge','carrier','sea-tunnel','transit-concourse'].includes(surface?.site))return{x,y:surface.y,z};
      if (nav.canStand(x, z) && floorAt(x, z) === 0) return { x, y:0,z };
    }
    return null;
  }
  function start(id) {
    const requested = id && allSpots.find(s => s.id === id);
    const spot = requested ? nearest([requested]) : nearest() || nearest(seats); if (active || !spot || (id && spot.id !== id)) return false;
    if ((spot.id==='sleep'||spot.id==='bath')&&bedtimeHandler) return bedtimeHandler('manual');
    saved = { x: player.pos.x, y: player.y, z: player.pos.z, heading: player.heading }; firstPerson = rig.firstPerson;
    rig.setFirstPerson(false); player.cancel(); keys.clear(); active = spot; entered = time; notice = '';
    collapsed = false; breathClock = 0; rig.skipIntro();
    if(spot.service){transit.start(spot);}
    else if (spot.id === 'basketball') {
      player.anchor(saved.x, 0, saved.z, Math.atan2(RIM.x - saved.x, RIM.z - saved.z)); visuals.ball.visible = true;
    } else if (spot.id === 'airplane') {
      flight=flights[spot.flightIndex||0];planeExitPending = false; flight.start();
    } else if (spot.id === 'carrier') {
      cruise.start();
    } else if (spot.id === 'submarine') {
      dive.start();
    } else if (vehicles[spot.id]) {
      vehicle = vehicles[spot.id]; vehicle.passengerReady=false; car = vehicle.mesh; carObstacle = vehicle.obstacle;
      tunnelGuide=0;tunnelArrived=false;
      hideCarObstacle(); carSpeed = 0; carHeading = car.rotation.y + Math.PI / 2; driveDistance = vehicle.distance;
      car.castShadow = false; stage.renderer.shadowMap.needsUpdate = true;
      player.anchor(car.position.x, car.position.y, car.position.z, carHeading);
    } else player.anchor(...spot.anchor, spot.yaw);
    rig.recenter(player, true);
    if (isDriving()) rig.set(carHeading + Math.PI, .3, spot.id === 'motorcycle' ? 5 : 6.8);
    if(spot.service)rig.set(spot.service==='metro'?.7:2.3,.48,spot.service==='metro'?15:11);
    if (spot.id === 'airplane') rig.set(flight.heading + Math.PI, .34, innerWidth < 720 && innerHeight > innerWidth ? 18 : 12);
    if (spot.id === 'carrier') rig.set(world.carrier.mesh.rotation.y + .65, .62, innerWidth < 720 && innerHeight > innerWidth ? 86 : 72);
    if (spot.id === 'submarine') rig.set(-2.4, .42, innerWidth < 720 && innerHeight > innerWidth ? 300 : 175);
    frameActivity();
    visuals.book.visible = visuals.page.visible = isReading(spot.id);
    visuals.mug.visible = spot.id === 'coffee' || spot.id === 'tea'; visuals.tv.mesh.visible = spot.id === 'tv'; visuals.monitor.mesh.visible = spot.id === 'gaming';
    visuals.cinema.mesh.visible = spot.id === 'cinema';
    if (spot.id === 'cinema') paintCinema(visuals.cinema,cinemaTime);
    if (spot.id === 'gaming') resetGame();
    if (spot.id === 'coffee') { sip = 1.8; sips++; sound.effect('coffee'); }
    if (spot.id === 'tea') sip = 0;
    if (spot.id === 'tv') sound.effect('tv');
    if (isReading(spot.id)) sound.effect('page');
    life.start(spot.id);
    document.body.classList.add('activity-active'); document.body.classList.toggle('activity-sleep', spot.id === 'sleep');
    refreshUI(); pose(0); sound.effect(spot.kind === 'seat' ? 'sit' : 'start'); return true;
  }
  function stop(force = false) {
    if (!active) return true;
    if (active.id === 'driving' && jet.airborne) {
      keys.clear();
      if (force) { secondaryAction(); if (jet.airborne) { jet.releaseControls(); return false; } }
      else { jetExitPending = jet.land(); refreshUI(); return false; }
    }
    let exit = saved;
    if(active.service){exit=transit.stop();if(!exit){keys.clear();updateStatus();return false;}}
    if (active.id === 'carrier') exit = cruise.stop();
    if (active.id === 'submarine') { exit = dive.stop(); if (!exit) { keys.clear(); updateStatus(); return false; } }
    if (active.id === 'airplane') {
      if (!flight.parked && !force) { flight.landNearest(); planeExitPending = true; updateStatus(); return false; }
      flight.park(); flight.leave(); exit = flight.exitPosition(); planeExitPending = false;
    }
    if (isDriving()) {
      exit = exitCar();
      if (!exit && !force) { hideCarObstacle(); notice = '旁边空间不足，请挪车后再下车'; updateStatus(); return false; }
      exit ||= saved; car.castShadow = true; stage.renderer.shadowMap.needsUpdate = true;
    }
    const wasSeat = active.kind === 'seat';
    if (active.id === 'driving') { jet.reset(); jetExitPending = false; }
    active = null; roadsterLights.update(0,false,0); keys.clear(); carSpeed = 0; shot.charging = shot.flight = false;
    life.stop(); lifeVisuals.hide(); sound.effect(wasSeat ? 'stand' : 'stop');
    for (const p of [visuals.ball, visuals.book, visuals.page, visuals.mug, visuals.tv.mesh, visuals.cinema.mesh, visuals.monitor.mesh]) p.visible = false;
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
  function jetAction(key) {
    if (active?.id !== 'driving') return;
    notice = '';
    if (key === 't') { toggleTunnelGuide(); return; }
    if (key === 'j' || key === 'l') {
      keys.clear(); tunnelGuide = 0; jetExitPending = false;
      if (jet.airborne) jet.land();
      else if (key === 'j' && jet.takeoff()) { carSpeed = 0; rig.set(carHeading + Math.PI, .3, innerWidth < 720 && innerHeight > innerWidth ? 14.5 : 9.5); }
    } else if (key === 'v') { keys.clear(); jet.hover(); }
    else jet.maneuver({ q: 'roll', b: 'flip', x: 'uturn' }[key]);
    refreshUI();
  }
  function updateJetStatus() {
    const f = jet.status(), flying = jet.airborne;
    ui.dataset.jet = f.phase;
    const label = { ground: '地面驾驶', takeoff: '喷气起飞中', flying: f.hovering ? '空中悬停' : '喷气飞行', landing: '正在降落' }[f.phase];
    const maneuver = { roll: '360° 翻滚', flip: '前空翻', uturn: '180° 掉头' }[f.maneuver];
    primary.textContent = flying ? '降落 J / L' : '启动喷气 J';
    tunnelButton.textContent = tunnelGuide ? '停止领航 T' : '隧道领航 T';
    toggle.textContent = flying ? jetExitPending ? '降落后下车…' : '降落后下车 E' : '下车 E';
    hint.textContent = flying
      ? 'W/S 调速 · A/D 转向 · 空格/C 升降 · Shift 加速 · Q 翻滚 / B 前空翻 · X 掉头 · V 悬停 · R 回车库'
      : 'W/S 前进倒车 · A/D 转向 · 空格刹车 · 驶出车库到露天空地后按 J 起飞 · T 隧道领航';
    status.textContent = label + ' · ' + Math.round(Math.abs(carSpeed) * 3.6) + ' km/h'
      + (flying ? ' · 高度 ' + f.altitude.toFixed(1) + ' 米' : ' · 双人出游')
      + (!flying && world.seaTunnel.contains(car.position.x, car.position.z) ? ' · 海底隧道 ' + Math.max(0, Math.round(-car.position.y)) + ' 米' : '')
      + ' · 航程 ' + Math.round(driveDistance) + ' 米'
      + (maneuver ? ' · ' + maneuver : '') + (f.boosting ? ' · 加力喷射' : '')
      + (f.notice || notice ? ' · ' + (f.notice || notice) : '');
    for (const b of jetButtons.children) {
      b.hidden = b.dataset.jet === 't' ? flying : !flying;
      b.disabled = b.dataset.jet !== 't' && (f.phase !== 'flying' || !!f.maneuver);
      if (b.dataset.jet === 't') b.textContent = tunnelGuide ? '停止领航 T' : '隧道领航 T';
    }
    for (const b of pad.children) {
      if (b.dataset.key === 'c' || b.dataset.key === 'shift') b.hidden = !flying;
      if (b.dataset.key === ' ') { b.textContent = flying ? '升高' : '刹车'; b.setAttribute('aria-label', b.textContent); }
      if (b.dataset.key === 'w') b.setAttribute('aria-label', flying ? '加速' : '前进');
      if (b.dataset.key === 's') b.setAttribute('aria-label', flying ? '减速' : '倒车');
    }
  }
  function primaryAction() {
    if (active?.id === 'driving') { jetAction('j'); return; }
    if(isDriving()){toggleTunnelGuide();return;}
    if (life.primary()) return;
    if (active?.id === 'airplane') { flight.takeoff(); refreshUI(); }
    else if (active?.id === 'carrier') { keys.clear(); cruise.togglePatrol(); refreshUI(); }
    else if (active?.id === 'submarine') { keys.clear(); dive.togglePatrol(); refreshUI(); }
    else if (active?.id === 'tea' && sip <= 0) { sip = 2.2; teaCups++; sound.effect('coffee'); updateStatus(); }
    else if (isReading(active?.id)) readingPage(1);
    else if (active?.id === 'coffee' && sip <= 0) { sip = 1.8; sips++; sound.effect('coffee'); updateStatus(); }
    else if (active?.id === 'tv') { tvChannel = 1 - tvChannel; sound.effect('tv'); paintTV(visuals.tv, tvTime, tvChannel, tvPaused); refreshUI(); }
    else if (active?.id === 'gaming') { sound.effect('start'); resetGame(); }
  }
  function secondaryAction() {
    if (life.secondary()) return;
    if (active?.id === 'airplane') { flight.returnHome(); refreshUI(); }
    else if (active?.id === 'carrier') { keys.clear(); cruise.returnHome(); refreshUI(); }
    else if (active?.id === 'submarine') { keys.clear(); dive.returnHome(); refreshUI(); }
    else if (isReading(active?.id)) readingPage(-1);
    else if (active?.id === 'tv') { tvPaused = !tvPaused; sound.effect('click'); sound.loop(null); paintTV(visuals.tv, tvTime, tvChannel, tvPaused); refreshUI(); }
    else if (isDriving()) {
      const [x, z] = vehicle.home, heading=vehicle.homeHeading??Math.PI/2;
      if (!canDrive(x, z, heading)) { notice = '车库停车位被占用，请先移开车辆'; updateStatus(); return; }
      if (active.id === 'driving') { jet.reset(); jetExitPending = false; }
      keys.clear(); tunnelGuide = 0; tunnelArrived = false;
      car.position.set(x, 0, z); car.rotation.set(0,heading-Math.PI/2,0); car.updateMatrix(); carHeading = heading; carSpeed = 0;
      player.anchor(x, 0, z, carHeading); rig.recenter(player, true); notice = '已返回车库'; refreshUI();
    }
  }
  function keyDown(e) {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.target?.isContentEditable || e.target?.closest?.('input,textarea,select') || document.querySelector('dialog[open]')) return false;
    const k = e.key.toLowerCase();
    if (!active && k === 'r') { if (!e.repeat) cycleMovement(); return true; }
    if (active?.id === 'driving' && ['j','l','q','b','x','v'].includes(k)) { if (!e.repeat) jetAction(k); return true; }
    if (k === 'q') { if (!e.repeat) { if (active?.kind === 'seat') stop(); else if (!active) { const seat = nearest(seats); if (seat) start(seat.id); } } return true; }
    if (k === 'e') { if (!e.repeat) { if (active) stop(); else start(); } return true; }
    if (!active) return false;
    if(isDriving()&&k==='t'){if(!e.repeat)toggleTunnelGuide();return true;}
    if(active.id==='airplane'&&k==='v'){if(!e.repeat){flight.toggleHover();refreshUI();}return true;}
    if (active.id==='airplane' && k==='l') { if(!e.repeat){flight.landAt('summit');refreshUI();} return true; }
    if (active.id==='airplane' && k==='h') { if(!e.repeat){flight.landAt('carrier');refreshUI();} return true; }
    if (active.id==='airplane' && ['1','2','3'].includes(k)) { if(!e.repeat){keys.clear();flight.takeoff({'1':'vertical','2':'catapult','3':'ski-jump'}[k]);refreshUI();} return true; }
    if (['carrier','submarine'].includes(active.id) && k==='p') { if(!e.repeat)primaryAction(); return true; }
    if (k === 'escape') { stop(); return true; }
    if (k === 'f') { return stop(true) === false; }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) || (active.id === 'carrier' && k === 'shift') || (['airplane','submarine'].includes(active.id) && k === 'c') || (active.id === 'driving' && jet.airborne && ['c','shift'].includes(k))) {
      if(isDriving()){tunnelGuide=0;tunnelArrived=false;}
      if(active.id==='submarine'){if(dive.automatic && e.repeat)return true;dive.takeOver();}
      if(active.id==='carrier' && cruise.automatic && e.repeat)return true;
      if(active.id==='carrier')cruise.takeOver();
      keys.add(k);
      if (!e.repeat && isReading(active.id) && (k === 'arrowleft' || k === 'arrowright')) readingPage(k === 'arrowleft' ? -1 : 1);
      return true;
    }
    if (k === ' ') {
      if(isDriving()){tunnelGuide=0;tunnelArrived=false;keys.add(k);return true;}
      if(active.id==='submarine'){if(dive.automatic&&e.repeat)return true;dive.takeOver();}
      if(active.id==='carrier'){if(cruise.automatic&&e.repeat)return true;cruise.takeOver();}
      keys.add(k);
      if (!e.repeat) {
        if (active.id === 'basketball' && !shot.flight) { shot.charging = true; shot.power = 0; }
        else if(!['carrier','submarine'].includes(active.id))primaryAction();
      }
      return true;
    }
    if (!e.repeat && (k === 'r' || k === 'p')) secondaryAction();
    return true;
  }
  function keyUp(e) { keys.delete(e.key.toLowerCase()); if (e.key === ' ') releaseShot(); }
  function syncMovement() {
    const mode = player.swimming ? 'dive' : player.flying ? 'fly' : runMode ? 'run' : 'walk';
    const label = mode === 'fly' ? '飞行' : mode === 'run' ? '跑步' : mode === 'dive' ? '游泳' : '走路';
    if (mode === 'walk' || mode === 'run') setActivityControl(movementButton, mode, label);
    else if (movementButton.dataset.icon !== mode) {
      movementButton.dataset.icon = mode;
      movementButton.querySelector('span').style.backgroundImage = `url(${icon(mode).url})`;
    }
    movementButton.setAttribute('aria-label', label);
    movementButton.setAttribute('aria-pressed', String(mode === 'fly' || mode === 'run' || player.diving));
  }
  function cycleMovement() {
    if (active && !stop()) return;
    rig.skipIntro();
    if (player.flying) { runMode = false; player.stopFlying(); }
    else if (runMode || player.swimming) { runMode = false; player.startFlying(); }
    else runMode = true;
    sound.effect('click'); syncMovement(); movementButton.blur();
  }
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
  tunnelButton.addEventListener('click', () => { toggleTunnelGuide(); tunnelButton.blur(); });
  const hover=ui.querySelector('[data-action=hover]');hover.addEventListener('click',()=>{flight.toggleHover();refreshUI();});
  summit.addEventListener('click',()=>{flight.landAt('summit');refreshUI();summit.blur();});
  carrierLand.addEventListener('click',()=>{flight.landAt('carrier');refreshUI();carrierLand.blur();});
  for(const [button,mode]of [[catapult,'catapult'],[skiJump,'ski-jump']])button.addEventListener('click',()=>{keys.clear();flight.takeoff(mode);refreshUI();button.blur();});
  for (const b of pad.children) {
    b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); if(isDriving()){tunnelGuide=0;tunnelArrived=false;}if(active?.id==='carrier')cruise.takeOver(); if(active?.id==='submarine')dive.takeOver(); keys.add(b.dataset.key); e.preventDefault(); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(name, () => keys.delete(b.dataset.key));
  }
  const clearKeys = () => { keys.clear(); shot.charging = false; carSpeed = 0;tunnelGuide=0; jet.releaseControls(); cruise.pause(); if(active?.id==='submarine')dive.releaseControls(); };
  addEventListener('blur', clearKeys); document.addEventListener('visibilitychange', () => { if (document.hidden) clearKeys(); });

  // UI and animation helpers below run only while an interaction is visible.
  function refreshUI() {
    const s = active || near;
    // Proximity only exposes compact buttons. The large panel belongs to an
    // activity the visitor explicitly starts, never a repeated pop-up hint.
    ui.hidden = !active || collapsed || active.kind === 'seat';
    fitActivityPanel();
    syncMovement();
    // The open activity panel owns the only visible exit control.
    interactButton.hidden = !!active || !s;
    setActivityControl(interactButton, 'interact', s ? `${s.title.split(' · ').at(-1)} · E` : '互动 · E');
    sitButton.hidden = !!active || !nearSeat || near?.kind === 'seat';
    detailButton.hidden = !active || !collapsed || active.kind === 'seat';
    document.body.classList.toggle('activity-near', !!s);
    if (!s) return;
    ui.dataset.activity = active?.id || '';
    sonar.hidden = active?.id !== 'submarine';
    jetButtons.hidden = active?.id !== 'driving';
    hover.hidden=active?.id!=='airplane';
    title.textContent = s.title; toggle.textContent = active ? '结束互动 E' : '开始互动 E';
    toggle.hidden=false;
    primary.hidden = catapult.hidden = skiJump.hidden = secondary.hidden = tunnelButton.hidden = summit.hidden = carrierLand.hidden = meter.hidden = book.hidden = canvas.hidden = pad.hidden = true;
    hint.textContent = '走近后按 E 体验 · F 打开网址目录'; status.textContent = '';
    if (!active) return;
    hint.textContent = 'E / Esc 或点击地面结束 · 拖拽转动视角';
    switch (s.id) {
      case 'tea': primary.hidden = false; primary.textContent = '泡茶品茗 空格'; hint.textContent = '坐在茶桌旁，按空格泡一杯茶 · 拖拽欣赏三楼景色'; break;
      case 'cinema': hint.textContent = '两人已在沙发上 · 一起观看动画电影'; toggle.textContent = '结束观影 E'; break;
      case 'airplane': pad.hidden = primary.hidden = secondary.hidden = summit.hidden = carrierLand.hidden = false; primary.textContent = '起飞'; secondary.textContent = '回三楼 R'; toggle.textContent = '下机 E'; hint.textContent = 'V 悬停/继续 · W/S 调速 · A/D 转向 · 空格/C 升降 · R 回三楼 · L 山顶 · H 降落航母'; break;
      case 'carrier': pad.hidden = primary.hidden = secondary.hidden = false; secondary.textContent = '自动返港 R'; toggle.textContent = '停船离舵 E'; hint.textContent = 'P 自动巡航 · R 返港 · W/S 前进倒航 · Shift / 按住加速键加速 · A/D 转向 · 空格刹车'; break;
      case 'submarine': pad.hidden = primary.hidden = secondary.hidden = false; secondary.textContent = '上浮返港 R'; hint.textContent = 'P 下潜巡视 · W/S 前后航行 · A/D 转向 · C 下潜 / 空格上浮 · E 返港下艇'; break;
      case 'basketball': primary.hidden = meter.hidden = false; primary.textContent = '按住蓄力 / 松手投篮'; hint.textContent = '按住空格蓄力，绿色区松手投篮 · E 退出'; break;
      case 'sleep': toggle.textContent = '起床 E'; break;
      case 'library':
      case 'reading': book.hidden = primary.hidden = secondary.hidden = false; primary.textContent = '下一页 →'; secondary.textContent = '上一页 ←'; book.querySelector('h3').textContent = BOOK[pageIndex][0]; book.querySelector('p').textContent = BOOK[pageIndex][1]; book.querySelector('small').textContent = `${pageIndex + 1} / ${BOOK.length} 页 · ← → 或空格翻页`; break;
      case 'tv': primary.hidden = secondary.hidden = false; primary.textContent = '换台 空格'; secondary.textContent = tvPaused ? '播放 P' : '暂停 P'; break;
      case 'coffee': primary.hidden = false; primary.textContent = '再喝一口 空格'; break;
      case 'gaming': canvas.hidden = primary.hidden = pad.hidden = false; primary.textContent = '重新开始 空格'; hint.textContent = 'A / D 或 ← → 移动 · 接金块，避红块'; break;
      case 'motorcycle':
      case 'roadster': pad.hidden = primary.hidden = secondary.hidden = false; primary.textContent='隧道领航 T';secondary.textContent = '回车库 R'; toggle.textContent = s.id === 'motorcycle' ? '下摩托车 E' : '下车 E'; hint.textContent = 'W / S 前进倒车 · A / D 转向 · 空格刹车 · 驶进入口后按 T 沿隧道行驶'; break;
      case 'driving': pad.hidden = primary.hidden = secondary.hidden = tunnelButton.hidden = false; primary.textContent='启动喷气 J'; secondary.textContent = '回车库 R'; tunnelButton.textContent = '隧道领航 T'; toggle.textContent = '下车 E'; hint.textContent = 'W / S 前进倒车 · A / D 转向 · 空格刹车 · 驶进入口后按 T 沿隧道行驶'; break;
      case 'fishing': primary.hidden = false; primary.textContent = life.fishing.phase === 'bite' ? '立即收线！空格' : life.fishing.phase === 'waiting' ? '提竿 空格' : '抛竿 空格'; hint.textContent = '空格抛竿 · 浮漂下沉后 2.5 秒内按空格收线'; break;
      case 'cooking': primary.hidden = false; primary.textContent = life.cooking.phase === 'prep' ? '切菜 空格' : life.cooking.phase === 'cooking' ? '翻炒 空格' : '再做一份 空格'; hint.textContent = '切菜 3 次 → 翻炒 3 次 → 等待出锅 · E 结束'; break;
      case 'treadmill': primary.hidden = secondary.hidden = false; primary.textContent = life.treadmill.paused ? '继续跑 空格' : '暂停 空格'; secondary.textContent = '调速度 R'; hint.textContent = '空格暂停 / 继续 · R 调速 · E 下跑步机'; break;
    }
    if(s.service){toggle.textContent='取消候车 E';hint.textContent='进站开门后一起上车 · 停稳后按 E 下车 · 行驶中按 E 预约下一站下车';}
    if (!hint.textContent.includes('点击地面') && !['airplane','submarine'].includes(s.id)&&!s.service) hint.textContent += ' · 点击地面结束';
    for (const b of pad.children) b.hidden = (b.dataset.key === 'shift' && !['airplane','carrier'].includes(s.id)) || (b.dataset.key === 'c' && !['airplane','submarine'].includes(s.id)) || (s.id === 'gaming' && b.dataset.key !== 'a' && b.dataset.key !== 'd');
    boostButton.setAttribute('aria-label', s.id === 'airplane' ? '按住喷气加速' : '按住加速');
    pad.querySelector('[data-key=" "]').textContent = s.id === 'airplane' ? '升高' : '刹车';
    pad.querySelector('[data-key=" "]').setAttribute('aria-label', s.id === 'airplane' ? '升高' : '刹车');
    pad.querySelector('[data-key="w"]').setAttribute('aria-label', s.id === 'airplane' ? '加速' : '前进');
    pad.querySelector('[data-key="s"]').setAttribute('aria-label', s.id === 'airplane' ? '减速' : '倒车');
    if (s.id === 'submarine') {
      const up = pad.querySelector('[data-key=" "]'), down = pad.querySelector('[data-key=c]');
      up.textContent = '上浮'; up.setAttribute('aria-label','上浮'); down.textContent = '下潜'; down.setAttribute('aria-label','下潜');
    } else { const down = pad.querySelector('[data-key=c]'); down.textContent = '降低'; down.setAttribute('aria-label','降低高度'); }
    updateStatus();
  }
  function updateStatus() {
    if (!active) return;
    const id = active.id;
    if (id === 'driving') { updateJetStatus(); return; }
    if(active.service){const t=transit.status();title.textContent=active.name+' · '+(t.phase==='waiting'?'双人候车':t.phase==='boarding'?'正在上车':'双人乘车');status.textContent=t.message;toggle.textContent=t.phase==='waiting'?'取消候车 E':t.phase==='boarding'?'取消上车 E':t.atStop?'下车 E':t.exitPending?'已预约下一站下车':'下一站下车 E';return;}
    if (id === 'submarine') {
      const d = dive.status();
      primary.textContent = d.mode === 'patrol' ? '暂停巡视 P' : '下潜巡视 P';
      toggle.textContent = d.docked ? '下艇 E' : d.exitPending ? '返港后下艇…' : '返港下艇 E';
      status.textContent = d.message + ' · 深度 ' + Math.round(d.depth) + ' / ' + d.maxDepth + ' 米 · ' + Math.round(Math.abs(d.speed) * 3.6) + ' km/h · 巡视 ' + d.visited.length + '/3';
      drawSonar(d); return;
    }
    if (id === 'airplane') {
      const f = flight.status(), label = {parked:`${f.airportName} · 已停稳`,takeoff:'垂直起飞中',taxi:'前往起飞位','deck-roll':f.launchMode==='catapult'?'弹射加速中':'滑跑上坡中','launch-climb':'离舰爬升中',flying:f.hovering?'空中悬停':'巡视领地',returning:`飞往${f.destinationName}`,landing:`降落${f.destinationName}`}[f.phase];
      status.textContent = `${label} · ${Math.round(f.y)} 米${planeExitPending?' · 停稳后下机':''}${f.notice?' · '+f.notice:''}`;
      hover.hidden=f.phase!=='flying';hover.textContent=f.hovering?'继续飞行 V':'悬停 V';hover.setAttribute('aria-pressed',String(f.hovering));
      primary.hidden = !flight.parked; secondary.hidden = summit.hidden = carrierLand.hidden = flight.parked;
      toggle.hidden=!flight.parked;toggle.textContent='下机 E';
      catapult.hidden=skiJump.hidden=!flight.parked||f.airport!=='carrier';primary.textContent=f.airport==='carrier'?'垂直起飞':'起飞';
      hint.textContent=flight.parked?(f.airport==='carrier'?'1 垂直 · 2 弹射 · 3 滑跃 · E 下机 · 拖拽转动视角':'点击起飞 · E 下机 · 拖拽转动视角'):'V 悬停/继续 · W/S 调速 · A/D 转向 · 空格/C 升降 · R 回三楼 · L 山顶 · H 降落航母';
    } else if (id === 'carrier') { const c=cruise.status();primary.textContent=c.patrolling?'暂停巡航 P':'自动巡航 P';status.textContent=`${c.message} · ${Math.round(Math.abs(c.speed)*3.6)} km/h · 航程 ${Math.round(c.distance)} 米`; }
    else if (id === 'tea') status.textContent = `${sip>0?'沏茶品茗中':'茶香正好'} · 已泡 ${teaCups} 杯`;
    else if (id === 'basketball') status.textContent = `${shot.points} 分 / ${shot.attempts} 次投篮${notice ? ' · ' + notice : ''}`;
    else if (id === 'sleep') status.textContent = `正在休息 · ${Math.floor(time - entered)} 秒 · 按 E 起床`;
    else if (id === 'library' || id === 'cinema') status.textContent=sharedStatus;
    else if (id === 'coffee') status.textContent = `已喝 ${sips} 口 · ${sip > 0 ? '慢慢品尝中' : '稍作休息，再喝一口'}`;
    else if (id === 'tv') status.textContent = `${tvChannel ? '像素体育台' : '海岸旅行台'}${tvPaused ? ' · 已暂停' : ' · 正在播放'}`;
    else if (isDriving()){primary.textContent=tunnelGuide?'停止领航 T':'隧道领航 T';status.textContent = `${Math.round(Math.abs(carSpeed) * 3.6)} km/h · ${Math.round(driveDistance)} 米 · 双人出游${world.seaTunnel.contains(car.position.x,car.position.z)?' · 海底隧道 '+Math.max(0,Math.round(-car.position.y))+' 米':''}${notice ? ' · ' + notice : ''}`;}
    else if (id === 'gaming') status.textContent = `${game.score} 分 · ${game.lives} 颗心 · ${Math.ceil(game.time)} 秒${game.over ? ' · 本局结束' : ''}`;
    else if (id === 'fishing') status.textContent = `${life.fishing.catches} 条鱼 · ${life.fishing.message}`;
    else if (id === 'cooking') status.textContent = life.cooking.phase === 'prep' ? `备菜 ${life.cooking.chops} / 3` : life.cooking.phase === 'cooking' ? `翻炒 ${Math.min(3, life.cooking.stirs)} / 3 · ${life.cooking.elapsed < 6 ? `还需 ${Math.ceil(6 - life.cooking.elapsed)} 秒` : '食材已熟，完成翻炒即可出锅'}` : `做好了！已完成 ${life.cooking.dishes} 份料理`;
    else if (id === 'treadmill') status.textContent = `${life.treadmill.paused ? '已暂停' : `${(life.treadmill.speed * 6).toFixed(1)} km/h`} · ${Math.round(life.treadmill.distance)} 米 · ${Math.floor(life.treadmill.elapsed)} 秒`;
  }
  function drawSonar(d) {
    const home = world.submarine.home;
    const c = sonarContext, X = x => 18 + (x + 750) / (home.x + 750) * 282, Z = z => 21 + (z - home.z) / 502 * 85;
    c.fillStyle = '#0a2b36'; c.fillRect(0, 0, 320, 126); c.strokeStyle = '#244a53'; c.lineWidth = 1;
    for (let x = 20; x < 320; x += 28) { c.beginPath(); c.moveTo(x, 17); c.lineTo(x, 112); c.stroke(); }
    for (let y = 21; y < 115; y += 17) { c.beginPath(); c.moveTo(18, y); c.lineTo(302, y); c.stroke(); }
    c.font = '11px sans-serif'; c.fillStyle = '#a3d6d7'; c.fillText('领地声呐 · 西侧深海', 9, 13); c.fillText('母港', 277, 13);
    c.fillStyle = '#edd391'; c.fillRect(X(home.x) - 3, Z(home.z) - 3, 6, 6);
    c.strokeStyle = '#64dfc2'; c.lineWidth = 1.5; c.beginPath();
    for (let i = 0; i <= 64; i++) {
      samplePatrol(i / 64 * PATROL_LENGTH, sonarPoint);
      if (i) c.lineTo(X(sonarPoint.x), Z(sonarPoint.z)); else c.moveTo(X(sonarPoint.x), Z(sonarPoint.z));
    }
    c.stroke();
    world.submarine.landmarks.forEach((site, i) => {
      const x = X(site.x), y = Z(site.z); c.strokeStyle = site.color; c.fillStyle = site.color;
      c.beginPath(); c.arc(x, y, d.visited.includes(i) ? 4 : 2.5, 0, Math.PI * 2); c.fill();
      c.fillText((d.visited.includes(i) ? '✓ ' : '') + site.name, x - 24, y - 8);
    });
    c.save(); c.translate(X(d.x), Z(d.z)); c.rotate(-d.heading); c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(0, 6); c.lineTo(-4, -4); c.lineTo(0, -2); c.lineTo(4, -4); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#a3d6d7'; c.fillText('航程 ' + Math.round(d.distance) + ' m', 9, 121); c.fillText('完成 ' + d.lap + ' 圈', 251, 121);
    sonar.setAttribute('aria-label', '深海领地航图，已巡视 ' + d.visited.length + ' 个地标，共 3 个');
  }
  function driveHeight(x,z){
    const tunnel=world.seaTunnel.driveHeight(x,z);
    if(tunnel!==null)return tunnel;
    const ship=world.carrier.driveHeight(x,z);
    return ship??(world.seaBridge.contains(x,z)?world.seaBridge.height(z):0);
  }
  function canDrive(x, z, heading) {
    const c = Math.sin(heading), s = Math.cos(heading);
    const { halfLength: length, halfWidth: width } = vehicle;
    const y=driveHeight(x,z);
    if(world.carrier.blocksVehicle(x,z,heading,length,width))return false;
    // Separating-axis checks also catch thin furniture between grid samples.
    for (const o of world.obstacles) {
      if (o === carObstacle || o.level === 1) continue;
      if(Math.abs((o.y||0)-y)>1.5)continue;
      const dx = (o.x0 + o.x1) / 2 - x, dz = (o.z0 + o.z1) / 2 - z;
      const w = (o.x1 - o.x0) / 2, d = (o.z1 - o.z0) / 2, ac = Math.abs(c), as = Math.abs(s);
      if (Math.abs(dx) > length * ac + width * as + w || Math.abs(dz) > length * as + width * ac + d) continue;
      if (Math.abs(dx * c + dz * s) > length + w * ac + d * as || Math.abs(-dx * s + dz * c) > width + w * as + d * ac) continue;
      return false;
    }
    for (const p of vehicle.samples) {
      const px = x + c * p[0] - s * p[1], pz = z + s * p[0] + c * p[1];
      const tunnel=world.seaTunnel.driveHeight(px,pz,.35);
      if(tunnel!==null){
        if(Math.abs(tunnel-y)>1.8)return false;
        const section=world.seaTunnel.path.near(px,pz,tunnelProjection);
        if(y+2.05>section.y+tunnelCeiling(section.side)-.08)return false;
        continue;
      }
      if(world.transit.approach.driveHeight(px,pz,.35)!==null&&Math.abs(y)<.5)continue;
      const ship=world.carrier.driveHeight(px,pz,.35);
      if(ship!==null){if(Math.abs(ship-y)>1.1)return false;continue;}
      if(world.seaBridge.contains(px,pz,.5)||world.seaBridge.junction(px,pz,.35))continue;
      if (px < ISLAND.x0 + 1 || px > ISLAND.x1 - 1 || pz < ISLAND.z0 + 1 || pz > ISLAND.z1 - 1 || floorAt(px, pz) !== 0) return false;
      if (px > POOL.x0 - .4 && px < POOL.x1 + .4 && pz > POOL.z0 - .4 && pz < POOL.z1 + .4) return false;
      const bx = Math.floor(px), bz = Math.floor(pz);
      if (!world.grid.type(bx, -1, bz) || world.grid.type(bx, 0, bz) || world.grid.type(bx, 1, bz)) return false;
    }
    return true;
  }
  function toggleTunnelGuide(){
    if (active?.id === 'driving' && jet.airborne) { notice = '请降落后再使用隧道领航'; updateStatus(); return; }
    if(tunnelGuide){tunnelGuide=0;carSpeed=0;return;}
    if(!world.seaTunnel.contains(car.position.x,car.position.z,1)){notice='请从车库出口向前直行，驶入正对面的海底隧道';updateStatus();return;}
    const path=world.seaTunnel.path,p=path.project(car.position.x,car.position.z,guideProjection);
    tunnelGuide=p.s<20?1:p.s>path.length-20?-1:Math.cos(carHeading-p.heading)>=0?1:-1;
    tunnelArrived=false;keys.clear();updateStatus();
  }
  function drive(dt) {
    if (active.id === 'driving' && jet.airborne) {
      const before = jet.phase; jet.update(dt, keys); carSpeed = jet.speed; carHeading = jet.heading;
      driveDistance += jet.stepDistance; vehicle.distance = driveDistance;
      if (jet.phase !== before) refreshUI();
      return;
    }
    if(!vehicle.passengerReady){carSpeed=0;notice='等女主上车，一起出游';return;}
    let guideRemaining=Infinity,guideHeading=carHeading;
    if(tunnelGuide){
      const path=world.seaTunnel.path,p=path.project(car.position.x,car.position.z,guideProjection);
      guideRemaining=tunnelGuide>0?path.length-p.s:p.s;
      path.sample(p.s+tunnelGuide*4,guidePoint);guideHeading=Math.atan2(guidePoint.x-car.position.x,guidePoint.z-car.position.z);
      if(guideRemaining<.35){tunnelGuide=0;tunnelArrived=true;carSpeed=0;}
    }
    const forward = !!tunnelGuide||keys.has('w') || keys.has('arrowup'), reverse = keys.has('s') || keys.has('arrowdown');
    const braking = keys.has(' '), throttle = Number(forward) - Number(reverse);
    const topSpeed = active.id === 'motorcycle' ? 7 : active.id === 'roadster' ? 8 : 5.5;
    const guideAngle=Math.atan2(Math.sin(guideHeading-carHeading),Math.cos(guideHeading-carHeading));
    const target = braking ? 0 : tunnelGuide?(Math.abs(guideAngle)>.4?0:Math.min(4.5,Math.sqrt(3*guideRemaining))):throttle > 0 ? topSpeed : throttle < 0 ? -2.5 : 0;
    const acceleration = braking ? 14 : 4;
    carSpeed += clamp(target - carSpeed, -acceleration * dt, acceleration * dt);
    if (active.id === 'driving' && Math.abs(carSpeed) > .01) jet.clearNotice();
    const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
    const direction = carSpeed < -.08 ? -1 : 1;
    const angle=Math.atan2(Math.sin(guideHeading-carHeading),Math.cos(guideHeading-carHeading));
    const heading = carHeading + (tunnelGuide?clamp(angle,-1.3*dt,1.3*dt):turn * direction * (.9 + Math.min(Math.abs(carSpeed), 5.5) * .08) * dt);
    // Allow steering while stopped; a blocked translation must not discard a safe turn.
    notice = tunnelGuide?'沿隧道行驶中 · 操作方向键可接管':tunnelArrived?'已到隧道出口，可停车下车或继续驾驶':'';
    if (turn||tunnelGuide) {
      if (canDrive(car.position.x, car.position.z, heading)) carHeading = heading;
      else notice = '转弯空间不足，请先向空处挪车';
    }
    const x = car.position.x + Math.sin(carHeading) * carSpeed * dt, z = car.position.z + Math.cos(carHeading) * carSpeed * dt;
    if (Math.abs(carSpeed) > .001) {
      if (canDrive(x, z, carHeading)) { driveDistance += Math.abs(carSpeed) * dt; vehicle.distance = driveDistance; car.position.set(x, driveHeight(x,z), z); if(active.id==='roadster')car.userData.wheelAngle=(car.userData.wheelAngle||0)-carSpeed*dt/.43; }
      else { carSpeed = 0;tunnelGuide=0; notice = '遇到障碍，请反向挪车后转向'; }
    }
    // The mesh faces local +X; Three.js rotates +X toward -Z for positive yaw.
    const ship=world.carrier.driveHeight(car.position.x,car.position.z);
    const slope=world.seaTunnel.contains(car.position.x,car.position.z)?world.seaTunnel.slope(car.position.x,car.position.z,carHeading):ship!==null?world.carrier.driveSlope(car.position.x,car.position.z,carHeading):world.seaBridge.contains(car.position.x,car.position.z)?world.seaBridge.slope(car.position.z)*Math.cos(carHeading):0;
    car.rotation.set(0,carHeading-Math.PI/2,Math.atan(slope)); car.updateMatrix();
    player.anchor(car.position.x, car.position.y, car.position.z, carHeading);
    sound.loop(active.id==='roadster'?'luxury-engine':'engine', Math.abs(carSpeed) / topSpeed);
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
    if (id === 'carrier') { const helm=world.carrier.helm();avatar.root.position.set(helm.x,helm.y,helm.z);avatar.armL.rotation.x = avatar.armR.rotation.x = -.65; return; }
    if (id === 'submarine') { avatar.legL.rotation.x = avatar.legR.rotation.x = -Math.PI / 2; avatar.armL.rotation.x = avatar.armR.rotation.x = -.65; return; }
    if (active.kind === 'seat' || id === 'tea' || id === 'airplane' || isReading(id) || id === 'tv' || id === 'cinema' || id === 'gaming' || id === 'driving' || id === 'roadster') {
      avatar.root.position.y = active.kind === 'seat' ? active.seatHeight - .5625 : player.y + (id === 'airplane' ? .92 : id === 'tea' ? .0675 : id === 'driving' ? -.12 : id === 'tv' ? -.0025 : .0075);
      avatar.legL.rotation.x = avatar.legR.rotation.x = -Math.PI / 2;
      avatar.armL.rotation.x = avatar.armR.rotation.x = -.7;
    }
    if (id === 'sleep') {
      avatar.root.position.set(BED.x + .76, BED.y + .78, BED.z + .75); avatar.body.rotation.x = -Math.PI / 2; avatar.body.position.y = Math.sin(time * 1.3) * .012;
      avatar.armL.rotation.z = -.15; avatar.armR.rotation.z = .15;
    } else if (isReading(id)) {
      avatar.armL.rotation.x = avatar.armR.rotation.x = -1.15; avatar.armL.rotation.z = -.2; avatar.armR.rotation.z = .2; avatar.head.rotation.x = .35;
      flip = Math.max(0, flip - dt); visuals.page.rotation.z = -Math.sin(flip / .6 * Math.PI) * 2.5;
    } else if (id === 'tv') avatar.head.rotation.y = Math.sin(time * .8) * .04;
    else if (id === 'cinema') avatar.head.rotation.y = Math.sin(time * .5) * .025;
    else if (id === 'coffee' || id === 'tea') {
      sip = Math.max(0, sip - dt); const lift = Math.sin(sip / 1.8 * Math.PI);
      avatar.armR.rotation.x = -.9 - lift * 1.3; avatar.armR.rotation.z = .3; avatar.head.rotation.x = -.1 * lift;
    } else if (id === 'gaming') {
      avatar.armL.rotation.x = -1.3 + Math.sin(time * 13) * .08; avatar.armR.rotation.x = -1.3 - Math.sin(time * 13) * .08; avatar.head.rotation.x = .1;
    } else if (id === 'roadster') {
      avatar.root.position.y=player.y+.08;avatar.root.position.x+=-Math.sin(player.heading)*.66+Math.cos(player.heading)*.48;avatar.root.position.z+=-Math.cos(player.heading)*.66-Math.sin(player.heading)*.48;
      avatar.armL.rotation.x=avatar.armR.rotation.x=-1.2;
    } else if (id === 'driving') {
      jet.placeOccupant(avatar.root); avatar.armL.rotation.x = avatar.armR.rotation.x = -1.2;
    } else if (id === 'airplane') {
      avatar.armL.rotation.x = avatar.armR.rotation.x = -1.2;
      flight.placePilot(avatar.root);
      avatar.root.position.x -= Math.sin(player.heading) * .35; avatar.root.position.z -= Math.cos(player.heading) * .35;
    } else if (id === 'motorcycle') {
      avatar.root.position.y = player.y+.35;
      avatar.root.position.x -= Math.sin(player.heading) * .38;
      avatar.root.position.z -= Math.cos(player.heading) * .38;
      avatar.body.rotation.x = .12;
      avatar.armL.rotation.x = avatar.armR.rotation.x = -1.1;
      avatar.legL.rotation.x = avatar.legR.rotation.x = -.8;
      avatar.legL.rotation.z = -.25; avatar.legR.rotation.z = .25;
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
    transit.update(dt);
    if(active?.service&&transit.readyToExit){stop();return;}
    for(const f of flights)f.syncParked();
    ambientScreens(dt);
    if (!active) { walkingSounds(); if (uiClock > .15) { uiClock = 0; const seat = nearest(seats), next = nearest() || seat; if (near !== next || nearSeat !== seat || nearTitle !== next?.title) { near = next; nearSeat = seat; nearTitle = next?.title; refreshUI(); } } return; }
    if (document.querySelector('dialog[open]')) { stop(true); return; }
    if (isDriving()) drive(dt);
    if (active.id === 'driving' && jetExitPending && !jet.airborne) { stop(); return; }
    roadsterLights.update(dt,active?.id==='roadster',Math.abs(carSpeed));
    if (active.id === 'carrier') {cruise.update(dt, keys);for(const f of flights)f.syncParked();}
    if (active.id === 'submarine') { dive.update(dt, keys); if (dive.readyToExit) { stop(); return; } }
    if (active.id === 'airplane') {
      flight.update(dt, keys);
      if (planeExitPending && flight.parked) { stop(); return; }
    }
    if (active.id === 'basketball') basketball(dt);
    if (active.id === 'gaming') gaming(dt);
    life.update(dt);
    if (active.id === 'tv') { if (!tvPaused) tvTime += dt; sound.loop(tvPaused ? null : 'tv', .5); }
    if (active.id === 'cinema') cinemaTime += dt;
    if (active.id === 'sleep') { breathClock += dt; if (breathClock > 3) { breathClock = 0; sound.effect('sleep'); } }
    pose(dt);
    if(active.service)transit.pose();
    if (screenClock > .1) { screenClock = 0; if (active.id === 'tv') paintTV(visuals.tv, tvTime, tvChannel, tvPaused); if (active.id === 'cinema') paintCinema(visuals.cinema,cinemaTime); if (active.id === 'gaming') drawGame(); }
    if (uiClock > .25) { uiClock = 0; updateStatus(); }
  }
  function vehicleStatus(id) {
    const v = vehicles[id], selected = active?.id === id;
    return { x: v.mesh.position.x, y: v.mesh.position.y, z: v.mesh.position.z, speed: selected ? carSpeed : 0, heading: v.getHeading?.() ?? v.mesh.rotation.y + Math.PI / 2, distance: v.distance, ...(id === 'driving' ? { jet: jet.status() } : {}) };
  }
  return {
    setResidentBall(x,y,z){if(active?.id==='basketball')return;visuals.ball.visible=x!==null;if(x!==null)visuals.ball.position.set(x,y,z);},
    setBedtimeHandler(fn){bedtimeHandler=fn;},setSharedStatus(text){sharedStatus=text;},
    start, stop, keyDown, keyUp, update, cycleMovement, syncMovement, setAmbientActivity, spots: allSpots, seats, get flight(){return flight;}, flights, cruise, dive, transit,
    canDrive, jet,
    pause() { clearKeys(); sound.loop(null); },
    get ride(){return isDriving()?vehicle:null;},
    get running() { return runMode; },
    get active() { return !!active; }, get current() { return active?.id || null; },
    status: () => ({ active: active?.id || null, transit:transit.status(),nearby: near?.id || null, seat: nearSeat?.id || null, running: runMode, fishing: { ...life.fishing }, cooking: { ...life.cooking }, treadmill: { ...life.treadmill }, page: pageIndex, sips, tvChannel, tvPaused, tvTime, roadster: vehicleStatus('roadster'), car: vehicleStatus('driving'), motorcycle: vehicleStatus('motorcycle'), shot: { ...shot }, game: { ...game, objects: game.objects.map(o => ({ ...o })) } }),
  };
}
