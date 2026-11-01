import * as THREE from 'three';

export const AIRFIELD = { x: 12, y: 11, z: 0, heading: Math.PI, exit: { x: 16.5, y: 11, z: 2 } };

export function createAirplane() {
  const positions = [], normals = [], colors = [], color = new THREE.Color();
  function box(x, y, z, w, h, d, hex, rx = 0) {
    const indexed = new THREE.BoxGeometry(w, h, d), g = indexed.toNonIndexed(); indexed.dispose();
    g.rotateX(rx); g.translate(x, y, z);
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array); color.setHex(hex);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.dispose();
  }
  const white = 0xe8e5d9, navy = 0x294b59, gold = 0xe3ae4e, black = 0x252b30;
  box(0, 1, 0, 1.05, .55, 4.8, white);
  box(0, 1.23, 1.35, .94, .45, 1.55, navy);
  box(0, 1.25, 2.3, .62, .32, .65, gold);
  box(0, 1, -2.6, .55, .4, 1.2, navy);
  box(0, 1.1, -.35, 7.4, .14, 1.5, white);
  for (const s of [-1, 1]) {
    box(s * 3.35, 1.12, -.35, .58, .17, 1.52, gold);
    box(s * .62, 1.53, -.3, .15, .65, 1.45, navy);
    box(s * .52, 1.95, .5, .06, .55, .08, navy);
    box(s * .8, .49, .65, .08, .75, .09, navy);
    box(s * .8, .24, .65, .24, .48, .45, black);
    box(s * .1, .25, -2.65, .12, .35, .32, black);
  }
  box(0, 1.5, -.55, .75, .12, .68, black);
  box(0, 1.82, -.9, .78, .55, .12, navy);
  box(0, 1.9, .5, 1.08, .5, .055, 0x8cbcc6, -.18);
  box(0, 1.93, -2.6, .13, 1.6, .85, navy);
  box(0, 1.45, -2.65, 2.55, .11, .75, gold);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'airplane'; mesh.userData.group = 'thirdFloor'; mesh.castShadow = mesh.receiveShadow = true;
  const propeller = new THREE.Mesh(new THREE.BoxGeometry(.13, 2.05, .1), new THREE.MeshLambertMaterial({ color: black }));
  propeller.position.set(0, 1.25, 2.7); mesh.add(propeller);
  mesh.position.set(AIRFIELD.x, AIRFIELD.y, AIRFIELD.z); mesh.rotation.y = AIRFIELD.heading;
  mesh.userData.propeller = propeller;
  return mesh;
}

export function createFlight({ mesh, world, player, stage, sound }) {
  let phase = 'parked', heading = AIRFIELD.heading, speed = 0, distance = 0, bank = 0;
  const home = AIRFIELD;
  const footprint = [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function clearance(x, z) {
    let height = 0;
    for (const [dx, dz] of footprint) {
      const surface = world.ground.topAt(x + dx, z + dz);
      height = Math.max(height, surface?.y || 0, world.thirdFloor.flightHeight(x + dx, z + dz));
    }
    return Math.max(18, height + 4);
  }
  function anchor() { player.anchor(mesh.position.x, mesh.position.y, mesh.position.z, heading); }
  function park() {
    phase = 'parked'; speed = bank = 0; heading = home.heading;
    mesh.position.set(home.x, home.y, home.z); mesh.rotation.set(0, heading, 0);
    mesh.castShadow = true; stage.renderer.shadowMap.needsUpdate = true; sound.loop(null);
  }
  function start() { mesh.castShadow = false; stage.renderer.shadowMap.needsUpdate = true; anchor(); }
  function takeoff() { if (phase === 'parked') { phase = 'takeoff'; mesh.castShadow = false; stage.renderer.shadowMap.needsUpdate = true; } }
  function returnHome() { if (phase === 'flying' || phase === 'takeoff') phase = 'returning'; }
  function update(dt, keys) {
    const p = mesh.position;
    if (phase === 'takeoff') {
      p.y = Math.min(18, p.y + dt * 3); if (p.y >= 18) { phase = 'flying'; speed = 8; }
    } else if (phase === 'flying') {
      const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
      heading += turn * dt * .72; bank += (-turn * .22 - bank) * Math.min(1, dt * 4);
      const target = keys.has('w') || keys.has('arrowup') ? 16 : keys.has('s') || keys.has('arrowdown') ? 4 : 8;
      speed += clamp(target - speed, -dt * 5, dt * 5);
      const x = p.x + Math.sin(heading) * speed * dt, z = p.z + Math.cos(heading) * speed * dt;
      const floor = clearance(x, z);
      const lift = Number(keys.has(' ')) - Number(keys.has('control') || keys.has('c'));
      p.y = clamp(p.y + (p.y < floor ? 6 : lift * 5) * dt, Math.min(p.y, floor), 78);
      if (p.y >= floor - .05 && x > -48 && x < 50 && z > -84 && z < 44) { p.x = x; p.z = z; distance += speed * dt; }
      else if (p.y >= floor - .05) heading += dt;
    } else if (phase === 'returning') {
      // Cross the mountains above their summits, then descend over the parking pad.
      bank *= Math.exp(-dt * 4);
      if (p.y < 65) p.y = Math.min(65, p.y + dt * 8);
      else {
        const dx = home.x - p.x, dz = home.z - p.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 20);
        speed = 20;
        if (d > .05) { heading = Math.atan2(dx, dz); p.x += dx / d * step; p.z += dz / d * step; distance += step; }
        else { p.x = home.x; p.z = home.z; phase = 'landing'; speed = 0; }
      }
    } else if (phase === 'landing') {
      heading = home.heading; p.y = Math.max(home.y, p.y - dt * 8); if (p.y <= home.y) park();
    }
    mesh.rotation.set(0, heading, bank);
    if (phase !== 'parked') mesh.userData.propeller.rotation.z += dt * 38;
    anchor(); sound.loop(phase === 'parked' ? null : 'engine', speed / 16);
  }
  return { start, park, takeoff, returnHome, update, get parked() { return phase === 'parked'; }, get heading() { return heading; }, get bank() { return bank; }, status: () => ({ phase, speed, distance, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }) };
}
