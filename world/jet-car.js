import * as THREE from 'three';
import { MOUNTAIN_SITE } from './layout.js';
import { CAR_SEAT } from './car-cabin.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TAU = Math.PI * 2;
const SOUTH = MOUNTAIN_SITE.z + MOUNTAIN_SITE.r + 60;

// Six plumes share one draw call, without lights or per-frame geometry.
export function createJetExhaust(car) {
  const positions = [], colors = [], origins = [], axes = [], types = [];
  function plume(x, y, z, rear) {
    const source = new THREE.ConeGeometry(rear ? .19 : .16, 1, 10, 1, true);
    const g = source.toNonIndexed(); source.dispose();
    g.translate(0, .5, 0); g.rotateZ(rear ? Math.PI / 2 : Math.PI);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const along = rear ? -p.getX(i) : -p.getY(i);
      positions.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z);
      origins.push(x, y, z); axes.push(rear ? -1 : 0, rear ? 0 : -1, 0); types.push(rear ? 1 : 0);
      colors.push(.28 + .62 * (1 - along), .62 + .38 * (1 - along), 1, .9 * (1 - along));
    }
    g.dispose();
  }
  for (const s of [-1, 1]) {
    plume(-2.76, .57, s * .59, true);
    for (const x of [-1.05, 1.05]) plume(x, .12, s * .63, false);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  g.setAttribute('jetOrigin', new THREE.Float32BufferAttribute(origins, 3));
  g.setAttribute('jetAxis', new THREE.Float32BufferAttribute(axes, 3));
  g.setAttribute('jetRear', new THREE.Float32BufferAttribute(types, 1));
  const power = { value: 0 }, boost = { value: 0 }, clock = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { jetPower: power, jetBoost: boost, jetTime: clock });
    shader.vertexShader = 'attribute vec3 jetOrigin; attribute vec3 jetAxis; attribute float jetRear; uniform float jetPower; uniform float jetBoost; uniform float jetTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', [
      'vec3 delta = position - jetOrigin;',
      'float along = dot(delta, jetAxis);',
      'float pulse = 1.0 + .09 * sin(jetTime * 47.0 + jetOrigin.x * 8.0 + jetOrigin.z * 11.0);',
      'float plumeLength = mix(.65 + jetPower * .55, .65 + jetPower * 1.7 + jetBoost * 1.3, jetRear);',
      'vec3 transformed = jetOrigin + (delta - jetAxis * along) * pulse + jetAxis * along * plumeLength * pulse;',
    ].join('\n'));
  };
  material.customProgramCacheKey = () => 'tesla-jet-exhaust-v1';
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'tesla-jet-exhaust'; mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 2; car.add(mesh);
  return {
    mesh,
    update(dt, throttle, boosting = false) { clock.value += dt; power.value = throttle; boost.value = boosting ? 1 : 0; mesh.visible = true; },
    stop() { mesh.visible = false; power.value = boost.value = 0; },
  };
}

export function createJetCar({ mesh, world, player, sound, canDrive, driveHeight, vehicle }) {
  const fx = mesh.userData.jetExhaust;
  const seatFacing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const footprint = [];
  for (const x of [-2.85, 0, 2.85]) for (const z of [-1.15, 0, 1.15]) footprint.push([x, z]);
  let phase = 'ground', heading = Math.PI / 2, speed = 0, throttle = 0, vertical = 0;
  let bank = 0, pitch = 0, stunt = null, progress = 0, startHeading = 0, takeoffY = 0;
  let notice = '', boosting = false, stepDistance = 0;

  function terrainHeight(x, z, h = heading) {
    let top = 0;
    const c = Math.sin(h), s = Math.cos(h);
    for (const [along, side] of footprint) {
      const px = x + c * along - s * side, pz = z + s * along + c * side;
      top = Math.max(top, world.ground.topAt(px, pz)?.y || 0, world.thirdFloor.flightHeight(px, pz));
    }
    for (const o of world.obstacles) {
      if (o === vehicle.obstacle) continue;
      if (x + 3 < o.x0 || x - 3 > o.x1 || z + 3 < o.z0 || z - 3 > o.z1) continue;
      top = Math.max(top, (o.y ?? (o.level === 1 ? 4 : 0)) + 2.2);
    }
    return top;
  }
  const clearance = (x, z, h = heading) => Math.max(1.5, terrainHeight(x, z, h) + .65);
  function openColumn(x, z, h) { return terrainHeight(x, z, h) <= driveHeight(x, z) + .7; }
  function takeoff() {
    if (phase !== 'ground') return false;
    if (!vehicle.passengerReady) { notice = '等女主上车后再启动喷气'; return false; }
    heading = mesh.rotation.y + Math.PI / 2;
    if (!openColumn(mesh.position.x, mesh.position.z, heading)) { notice = '上方有顶棚或障碍，请先驶出车库到露天空地'; return false; }
    phase = 'takeoff'; takeoffY = Math.max(mesh.position.y + 6, clearance(mesh.position.x, mesh.position.z) + 3);
    speed = throttle = vertical = bank = pitch = 0; notice = ''; stunt = null;
    return true;
  }
  function land() {
    if (phase === 'ground' || phase === 'landing') return phase === 'landing';
    if (stunt) { notice = '请等翻转或掉头完成后再降落'; return false; }
    if (!canDrive(mesh.position.x, mesh.position.z, heading) || !openColumn(mesh.position.x, mesh.position.z, heading)) {
      notice = '下方无法停车，请飞到露天空地降落，或按 R 回车库'; return false;
    }
    phase = 'landing'; speed = throttle = vertical = 0; notice = ''; return true;
  }
  function maneuver(kind) {
    if (phase !== 'flying' || stunt || !['roll', 'flip', 'uturn'].includes(kind)) return false;
    if (mesh.position.y < clearance(mesh.position.x, mesh.position.z) + 3.5) { notice = '离地太近，请先升高再翻转或掉头'; return false; }
    stunt = kind; progress = 0; startHeading = heading; notice = ''; return true;
  }
  function hover() {
    if (phase !== 'flying') return false;
    speed = throttle = vertical = 0; notice = '已悬停，可转向或升降'; return true;
  }
  function reset() {
    phase = 'ground'; speed = throttle = vertical = bank = pitch = stepDistance = 0;
    stunt = null; boosting = false; notice = ''; fx.stop();
  }
  function step(dt, keys) {
    const p = mesh.position;
    if (phase === 'takeoff') {
      p.y = Math.min(takeoffY, p.y + dt * 4);
      if (p.y >= takeoffY) phase = 'flying';
    } else if (phase === 'landing') {
      if (!canDrive(p.x, p.z, heading) || !openColumn(p.x, p.z, heading)) { phase = 'flying'; notice = '降落点被占用，已悬停'; }
      else {
        const floor = driveHeight(p.x, p.z);
        p.y = Math.max(floor, p.y - dt * Math.min(4, Math.max(.6, (p.y - floor) * 2)));
        bank *= Math.exp(-dt * 6); pitch *= Math.exp(-dt * 6);
        if (p.y <= floor + .001) { p.y = floor; reset(); }
      }
    } else if (phase === 'flying') {
      const previousHeading = heading;
      const forward = keys.has('w') || keys.has('arrowup'), brake = keys.has('s') || keys.has('arrowdown');
      const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
      const lift = Number(keys.has(' ')) - Number(keys.has('c'));
      boosting = keys.has('shift') && !brake;
      throttle = clamp(throttle + (Number(forward) * 12 - Number(brake) * 22) * dt, 0, 42);
      const target = boosting ? 65 : throttle;
      speed += clamp(target - speed, -dt * 26, dt * 15);
      vertical += (lift * (boosting ? 13 : 8) - vertical) * Math.min(1, dt * 8);
      if (forward || brake || turn || lift || boosting) notice = '';
      if (!stunt) heading += turn * dt * 1.25;
      bank += (-turn * .28 - bank) * Math.min(1, dt * 5);
      pitch += ((lift * .13 + (target - speed) * .007) - pitch) * Math.min(1, dt * 5);
      if (stunt) {
        progress = Math.min(1, progress + dt / (stunt === 'uturn' ? 1.3 : 1.45));
        if (stunt === 'uturn') heading = startHeading + Math.PI * (progress * progress * (3 - 2 * progress));
      }
      const reserve = stunt ? 3.5 : 0;
      if (clearance(p.x, p.z) + reserve > p.y + .01) {
        heading = previousHeading; stunt = null; progress = 0; speed = throttle = 0;
        notice = '转向空间不足，请先升高';
      }
      p.y = Math.max(clearance(p.x, p.z) + reserve, p.y + vertical * dt);
      const x = p.x + Math.sin(heading) * speed * dt, z = p.z + Math.cos(heading) * speed * dt;
      if (x < -170 || x > 170 || z < -185 || z > SOUTH) { speed = throttle = 0; notice = '已到飞行边界，请转向或掉头'; }
      else if (p.y < clearance(x, z) + reserve) { speed = throttle = 0; notice = '前方有障碍，请升高后继续飞行'; }
      else { stepDistance += Math.hypot(x - p.x, z - p.z); p.x = x; p.z = z; }
    }
    const eased = progress * progress * (3 - 2 * progress);
    const roll = bank + (stunt === 'roll' ? TAU * eased : stunt === 'uturn' ? -.5 * Math.sin(progress * Math.PI) : 0);
    mesh.rotation.set(roll, heading - Math.PI / 2, pitch + (stunt === 'flip' ? -TAU * eased : 0), 'YZX');
    mesh.updateMatrix();
    if (stunt && progress >= 1) { stunt = null; progress = 0; }
    player.anchor(p.x, p.y, p.z, heading);
  }
  function update(dt, keys) {
    stepDistance = 0;
    if (phase === 'ground') return;
    const elapsed = Math.min(dt, .1), steps = Math.max(1, Math.ceil(elapsed / (1 / 60)));
    for (let i = 0; i < steps && phase !== 'ground'; i++) step(elapsed / steps, keys);
    if (phase !== 'ground') { fx.update(dt, .35 + speed / 100, boosting); sound.loop('engine', .35 + speed / 90); }
    else sound.loop(null);
  }
  return {
    takeoff, land, maneuver, hover, reset, update,
    clearNotice() { notice = ''; },
    releaseControls() { speed = throttle = vertical = 0; boosting = false; },
    placeOccupant(root, passenger = false) {
      root.position.set(CAR_SEAT.x, CAR_SEAT.y, passenger ? CAR_SEAT.side : -CAR_SEAT.side).applyQuaternion(mesh.quaternion).add(mesh.position);
      root.quaternion.copy(mesh.quaternion).multiply(seatFacing);
    },
    get airborne() { return phase !== 'ground'; }, get phase() { return phase; },
    get heading() { return heading; }, get speed() { return speed; }, get stepDistance() { return stepDistance; },
    status: () => ({ phase, speed, altitude: mesh.position.y, heading, hovering: phase === 'flying' && speed < .1, boosting, maneuver: stunt, notice }),
  };
}
