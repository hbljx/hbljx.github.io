import * as THREE from 'three';
import { SEA_BRIDGE, SUBMARINE_ACCESS, SUBMARINE_HOME } from './layout.js';
import { bridgeHeight } from './sea-bridge.js';
import { canvasTexture } from '@engine/world/textures.js';
import { DEEP_LANDMARKS, seabedAt, installDeepSeaView } from './deep-sea.js';

const HOME = { ...SUBMARINE_HOME, y: 0 }, DECK = 4.4, MAX_DEPTH = 320;
const PIER = { x0: HOME.x + 5, x1: SEA_BRIDGE.x - 4, z: HOME.z, width: SUBMARINE_ACCESS.width };
const pierHeight = x => DECK + (bridgeHeight(HOME.z) - DECK) * THREE.MathUtils.clamp((x - PIER.x0) / (PIER.x1 - PIER.x0), 0, 1);
const onPier = (x, z, margin = 0) => x >= PIER.x0 && x <= PIER.x1 && Math.abs(z - HOME.z) <= PIER.width / 2 - margin;
const angle = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = THREE.MathUtils.clamp;

// This 126 m pressure hull shares the existing fleet's vertex-colored draw.
function createSubmarineMesh() {
  const positions = [], colors = [], parts = [], pivots = [], tint = new THREE.Color();
  let propeller = 0;
  function append(g, color) {
    const flat = g.index ? g.toNonIndexed() : g; tint.setHex(color);
    for (let i = 0; i < flat.attributes.position.count; i++) {
      positions.push(flat.attributes.position.getX(i), flat.attributes.position.getY(i), flat.attributes.position.getZ(i));
      colors.push(tint.r, tint.g, tint.b); parts.push(propeller); pivots.push(0, -3.8, -66);
    }
    if (flat !== g) flat.dispose(); g.dispose();
  }
  function box(x, y, z, w, h, d, color, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d); g.rotateZ(rz); g.translate(x, y, z); append(g, color);
  }
  function quad(a, b, c, d, color) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3)); append(g, color);
  }
  const dark = 0x273941, steel = 0x526874, light = 0x91a8ac, gold = 0xd7b56b, glow = 0x8ae4dc;
  const profile = [[-65, .04], [-58, .55], [-48, 1], [30, 1], [47, .85], [56, .45], [61, .035]];
  const cross = [[-5, 8.2], [5, 8.2], [9, 4.8], [10, 0], [7.5, -6.3], [0, -8.2], [-7.5, -6.3], [-10, 0], [-9, 4.8]];
  const rings = profile.map(([z, s]) => cross.map(([x, y]) => [x * s, -3.8 + y * s, z]));
  for (let i = 1; i < rings.length; i++) for (let j = 0; j < cross.length; j++) {
    const k = (j + 1) % cross.length;
    quad(rings[i - 1][j], rings[i][j], rings[i][k], rings[i - 1][k], j >= 3 && j <= 5 ? 0x423b42 : j === 0 ? steel : dark);
  }
  for (const r of [rings[0], rings.at(-1)]) for (let j = 1; j < r.length - 1; j++) quad(r[0], r[j], r[j + 1], r[0], dark);
  // The hull's flat upper face is the deck; no coplanar overlay.
  for (let z = -44; z < 30; z += 3) {
    for (const x of [-4.6, 4.6]) box(x, DECK + .04, z, .13, .05, 1.6, gold);
    if (z < 5) box(0, DECK + .03, z, .15, .04, 1.1, light);
  }
  // Sail, diving planes, periscope and a conspicuous boarding hatch.
  box(0, 7.9, 16, 4.8, 7, 16, dark); box(0, 11.5, 16, 4.2, .3, 15, steel);
  box(0, 13.4, 16, .42, 3.6, .42, light); box(0, 15.1, 16.6, .5, .45, 1.5, dark);
  box(1.1, 13, 11.6, .16, 3, .16, light);
  for (const side of [-1, 1]) {
    box(side * 5.5, 7.5, 18, 7, .45, 3.4, steel);
    box(side * 6.5, -3.8, -55, 12, .6, 8, steel);
    for (let z = 12; z < 22; z += 2) box(side * 2.41, 10.6, z, .04, .4, 1.2, glow);
  }
  box(0, -.1, -55, .6, 12, 9, steel);
  box(0, DECK + .12, -10, 2.6, .24, 3, gold); box(0, DECK + .26, -10, 2, .08, 2.4, dark);
  box(0, DECK + .34, -10, 1.1, .1, .12, light); box(0, DECK + .34, -10, .12, .1, 1.1, light);
  for (const side of [-1, 1]) {
    box(side * 1.7, DECK + .5, -10, .12, 1, .12, glow);
    box(side * 4.6, DECK + .2, 29, .25, .3, .6, glow);
  }
  for (let z = -42; z < -15; z += 5) for (const side of [-1, 1]) {
    box(side * 2.7, DECK + .035, z, 2.5, .06, 3.4, dark);
    box(side * 2.7, DECK + .075, z + 1.4, 1.9, .02, .1, light);
  }
  const glyphs = ['11101', '10101', '10101', '10101', '11101'];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (glyphs[r][c] === '1')
    box(2.42, 9.8 - r * .35, 13 + c * .35, .04, .28, .28, light);
  box(0, -3.8, -65.8, 1.5, 1.5, 3, gold); propeller = 1;
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    box(Math.sin(a) * 2.3, -3.8 + Math.cos(a) * 2.3, -66, 1, 4, .35, gold, -a + .3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('propellerPart', new THREE.Float32BufferAttribute(parts, 1)); g.setAttribute('propellerPivot', new THREE.Float32BufferAttribute(pivots, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'territory-nuclear-submarine'; mesh.position.set(HOME.x, 0, HOME.z); mesh.updateMatrixWorld(true); return mesh;
}

export function buildSubmarine(B, planes) {
  const mesh = createSubmarineMesh(), spans = [[PIER.x0, PIER.x1]];
  const deck = { tex: 'deck', tint: 0x879c9a }, rail = { tex: 'paint', tint: 0xb4c9c6 }, cyan = { tex: 'paint', tint: 0x74e7d9, emissive: .8 };
  for (const [a, b] of spans) {
    const ya = pierHeight(a), yb = pierHeight(b), slope = Math.atan2(yb - ya, b - a), length = Math.hypot(b - a, yb - ya), t = .28;
    B.box((a + b) / 2 + t * Math.sin(slope) / 2, (ya + yb) / 2 - t * Math.cos(slope) / 2 - t / 2, HOME.z, length, t, PIER.width, deck, { rz: slope });
    for (const side of [-1, 1]) for (const h of [.5, 1.05]) B.box((a + b) / 2, (ya + yb) / 2 + h, HOME.z + side * (PIER.width / 2 - .1), length, .09, .09, rail, { rz: slope });
  }
  for (let x = PIER.x0 + 1; x < PIER.x1 - 1; x += 4) for (const side of [-1, 1]) {
    const y = pierHeight(x), z = HOME.z + side * (PIER.width / 2 - .1);
    B.box(x, y, z, .12, 1.1, .12, rail); B.box(x, y + 1.08, z, .23, .1, .23, cyan);
    if (x > HOME.x + 16) B.box(x, -3, z, .32, y + 3, .32, { tex: 'steel', tint: 0x516d76 });
  }
  for (const x of [PIER.x1 - 6, PIER.x0 + 6]) {
    B.box(x, pierHeight(x), HOME.z - 3.2, .2, 3.4, .2, rail);
    B.box(x, pierHeight(x) + 2.3, HOME.z - 3.2, 4.5, 1.1, .18, { tex: 'paint', tint: 0x173d49 });
    const texture = canvasTexture(256, 64, (c, w, h) => {
      c.fillStyle = '#173d49'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.fillStyle = '#adfff0'; c.font = 'bold 23px sans-serif';
      c.fillText('← 核潜艇 · 深海巡视', w / 2, 28); c.font = '14px sans-serif'; c.fillText('沿栈道登艇 · 舱盖旁按 E', w / 2, 51);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: texture }));
    sign.position.set(x, pierHeight(x) + 2.85, HOME.z - 3.1); planes.push(sign);
  }
  const foot = { x: PIER.x1, y: bridgeHeight(HOME.z), z: HOME.z };
  const path = [foot, { x: PIER.x1, y: pierHeight(PIER.x1), z: HOME.z }, { x: PIER.x0, y: DECK, z: HOME.z }, { x: HOME.x, y: DECK, z: HOME.z }];
  const hit = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DECK);
  const docked = () => Math.hypot(mesh.position.x - HOME.x, mesh.position.y, mesh.position.z - HOME.z) < .05 && Math.abs(angle(mesh.rotation.y)) < .005;
  const onDeck = (x, z) => docked() && Math.abs(x - HOME.x) <= 5 && z >= HOME.z - 48 && z <= HOME.z + 30;
  const board = { x: HOME.x, y: DECK, z: HOME.z - 10 };
  function route(ax, ay, az, bx, by, bz) {
    const from = onDeck(ax, az), to = onDeck(bx, bz);
    if ((from || to) && !docked()) return [];
    const points = [], start = from ? HOME.x : ax, end = to ? HOME.x : bx;
    if (from) points.push({ x: HOME.x + 3.6, y: DECK, z: az }, { x: HOME.x + 3.6, y: DECK, z: HOME.z });
    points.push({ x: start, y: pierHeight(start), z: HOME.z });
    const middle = path.filter(p => p.x > Math.min(start, end) && p.x < Math.max(start, end));
    if (start > end) middle.reverse(); points.push(...middle, { x: end, y: pierHeight(end), z: HOME.z });
    if (to) points.push({ x: HOME.x + 3.6, y: DECK, z: HOME.z }, { x: HOME.x + 3.6, y: DECK, z: bz });
    points.push({ x: bx, y: by, z: bz }); return points;
  }
  return { mesh, home: HOME, foot, board, pier: PIER, docked, route, maxDepth: MAX_DEPTH, landmarks: DEEP_LANDMARKS,
    canBoard: p => docked() && Math.abs(p.y - DECK) < .7 && Math.hypot(p.pos.x - board.x, p.pos.z - board.z) < 2.2,
    levels(x, z, out) { if (onPier(x, z)) out.push({ y: pierHeight(x), site: 'submarine' }); else if (onDeck(x, z)) out.push({ y: DECK, site: 'submarine' }); },
    obstructed(x, z, y) { return onDeck(x, z) && y < 11.7 && Math.abs(x - HOME.x) < 2.65 && z > HOME.z + 7.7 && z < HOME.z + 24.3; },
    collides(x, y, z) { return onPier(x, z) && y < pierHeight(x) - .02 && y + 1.8 > pierHeight(x) - .28 || this.obstructed(x, z, y); },
    pick(ray) {
      let best = null;
      for (const [a, b] of spans) {
        const slope = (pierHeight(b) - pierHeight(a)) / (b - a); plane.normal.set(-slope, 1, 0); plane.constant = slope * a - pierHeight(a);
        if (ray.intersectPlane(plane, hit) && hit.x >= a && hit.x <= b && onPier(hit.x, hit.z, .3)) {
          const t = hit.distanceTo(ray.origin); if (!best || t < best.t) best = { t, point: hit.clone(), site: 'submarine' };
        }
      }
      plane.normal.set(0, 1, 0); plane.constant = -DECK;
      if (docked() && ray.intersectPlane(plane, hit) && onDeck(hit.x, hit.z)) { const t = hit.distanceTo(ray.origin); if (!best || t < best.t) best = { t, point: hit.clone(), site: 'submarine' }; }
      return best;
    },
    spots: () => [board],
  };
}

export function createDive({ world, player, stage }) {
  const sub = world.submarine, mesh = sub.mesh, visited = new Set();
  let active = false, mode = 'manual', route = [], speed = 0, distance = 0, exitPending = false, message = '已靠港 · 舱门开启', lap = 0, patrolIndex = 0;
  const patrol = [
    { x: -340, y: -260, z: 230 }, { x: -555, y: -300, z: 395 },
    { x: -430, y: -300, z: 515 }, { x: -330, y: -260, z: 410 },
  ];
  const samples = [];
  for (let z = -65; z <= 61; z += 6) for (const x of [-13, 0, 13]) samples.push([x, z]);
  installDeepSeaView(stage, () => active, world.oceanLife.deepGroup);
  function canSail(x, y, z, yaw) {
    if (x < -750 || x > HOME.x + .01 || z < HOME.z - .01 || z > 600 || y > .001 || y < -MAX_DEPTH) return false;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const [lx, lz] of samples) {
      const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
      if (y - 13 < seabedAt(px, pz) + 2) return false;
      if (px > HOME.x + 16 && px < PIER.x1 && Math.abs(pz - HOME.z) < PIER.width / 2 + .5 && y > -18) return false;
    }
    return true;
  }
  const anchor = () => player.anchor(mesh.position.x, mesh.position.y + 1, mesh.position.z, mesh.rotation.y);
  function takeOver() { route = []; mode = 'manual'; exitPending = false; message = '手动航行'; }
  function leaveBasin() {
    const p = mesh.position, y = p.x > -180 && p.z < 220 && p.y <= -18 ? -18.5 : 0;
    return [{ x: p.x, y, z: p.z, yaw: mesh.rotation.y },
      { x: p.x, y, z: 260, yaw: mesh.rotation.y }, { x: p.x, y: 0, z: 260, yaw: 0 }];
  }
  function returnHome(leaving = false) {
    exitPending ||= leaving;
    if (mode === 'return') return;
    if (sub.docked()) { message = '已靠港 · 可以下艇'; return; }
    speed = 0; mode = 'return'; message = '自动上浮返港';
    route = [...leaveBasin(), { x: HOME.x, y: 0, z: 260 },
      { ...HOME, yaw: 0 }];
  }
  function togglePatrol() {
    if (mode === 'patrol') { takeOver(); speed = 0; message = '巡视已暂停 · 保持当前深度'; return; }
    exitPending = false; mode = 'patrol'; speed = 0; patrolIndex = 0; message = '离港前往深海巡视';
    const p = mesh.position;
    route = p.x > -300 ? [...leaveBasin(),
      { x: -330, y: 0, z: 260 }, { ...patrol[0] },
    ] : [{ ...patrol[0] }];
  }
  function update(dt, keys) {
    if (!active) return; dt = Math.min(dt, .05);
    const p = mesh.position;
    if (route.length) {
      const target = route[0], dx = target.x - p.x, dz = target.z - p.z, horizontal = Math.hypot(dx, dz), dy = target.y - p.y;
      const yaw = target.yaw ?? (horizontal > .001 ? Math.atan2(dx, dz) : mesh.rotation.y);
      const delta = angle(yaw - mesh.rotation.y), nextYaw = mesh.rotation.y + clamp(delta, -.42 * dt, .42 * dt);
      if (Math.abs(delta) > .002) {
        speed = 0;
        if (canSail(p.x, p.y, p.z, nextYaw)) mesh.rotation.y = nextYaw;
        else { takeOver(); message = '前方浅滩 · 已停艇，请后退避让'; }
      } else if (horizontal > .001 || Math.abs(dy) > .001) {
        speed = Math.min(18, speed + 5 * dt); const step = Math.min(horizontal, speed * dt);
        const x = p.x + (horizontal ? dx / horizontal * step : 0), z = p.z + (horizontal ? dz / horizontal * step : 0);
        const y = p.y + clamp(dy, -9 * dt, 9 * dt);
        if (canSail(x, y, z, yaw)) { p.set(x, y, z); distance += step; mesh.rotation.y = yaw; }
        else { takeOver(); speed = 0; message = '距海床过近 · 已停艇，请先上浮'; }
      } else {
        p.set(target.x, target.y, target.z); mesh.rotation.y = yaw; route.shift(); speed = 0;
        if (!route.length && mode === 'return') { p.set(HOME.x, 0, HOME.z); mesh.rotation.y = 0; mode = 'manual'; message = '已靠港 · 舱门开启'; }
        else if (!route.length && mode === 'patrol') {
          patrolIndex = (patrolIndex + 1) % patrol.length; if (!patrolIndex) lap++;
          route.push(patrol[patrolIndex]); message = '正在巡视深海领地';
        }
      }
    } else {
      const throttle = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
      const vertical = Number(keys.has(' ')) - Number(keys.has('c'));
      const target = throttle > 0 ? 18 : throttle < 0 ? -7 : 0; speed += clamp(target - speed, -5 * dt, 5 * dt);
      let yaw = mesh.rotation.y + turn * .38 * dt * (speed < -.1 ? -1 : 1);
      if (p.x > -180 && p.z < 220 && p.y > -18 && turn) { yaw = mesh.rotation.y; message = '先按 W 直线离港，驶离栈道后转向'; }
      if (!canSail(p.x, p.y, p.z, yaw)) yaw = mesh.rotation.y;
      const x = p.x + Math.sin(yaw) * speed * dt, z = p.z + Math.cos(yaw) * speed * dt;
      const y = clamp(p.y + vertical * 9 * dt, -MAX_DEPTH, 0);
      if (canSail(x, p.y, z, yaw)) { p.set(x, p.y, z); distance += Math.abs(speed * dt); mesh.rotation.y = yaw; }
      else if (speed) { speed = 0; message = '接近领地边界或浅滩 · 请转向'; }
      if (canSail(p.x, y, p.z, mesh.rotation.y)) p.y = y;
      else if (vertical < 0) message = '距海床过近 · 请向西驶入深水区';
    }
    for (let i = 0; i < DEEP_LANDMARKS.length; i++) {
      const site = DEEP_LANDMARKS[i];
      if (p.y < -180 && Math.hypot(p.x - site.x, p.z - site.z) < 85) visited.add(i);
    }
    mesh.userData.wheelAngle = (mesh.userData.wheelAngle || 0) + speed * dt * .8; mesh.updateMatrixWorld(true); anchor();
  }
  return {
    start() { active = true; takeOver(); speed = 0; message = '核动力在线 · 按 P 自动下潜巡视'; anchor(); },
    stop() { if (!sub.docked()) { returnHome(true); return null; } active = false; route = []; speed = 0; mode = 'manual'; message = '已靠港 · 舱门开启'; exitPending = false; return { ...sub.board, heading: Math.PI / 2 }; },
    update, togglePatrol, returnHome, takeOver, canSail,
    pause() { speed = 0; route = []; mode = 'manual'; message = '航行暂停 · 保持深度'; },
    get automatic() { return mode !== 'manual'; }, get readyToExit() { return exitPending && sub.docked(); },
    status: () => ({ x: mesh.position.x, z: mesh.position.z, depth: -mesh.position.y, heading: mesh.rotation.y, speed, distance, maxDepth: MAX_DEPTH,
      mode, message, docked: sub.docked(), exitPending, visited: [...visited], lap }),
  };
}
