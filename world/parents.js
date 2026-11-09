import * as THREE from 'three';
import { createPlayer } from '@engine/world/player.js';
import { RIM } from './layout.js';
import { createParentPerformance } from './parent-activities.js';
import { LIBRARY } from './shared-rooms.js';

const IDLE = { x: 0, z: 0, run: false };
const GYM_BACKUPS = ['gym-bike', 'gym-pullup', 'gym-bench', 'gym-dumbbells', 'gym-cable', 'gym-vertec'];
const ACTIVITIES = ['reading', 'treadmill', 'basketball', 'cooking', 'tv', 'gaming', ...GYM_BACKUPS];
const ACTIVITY_DURATION = 60;
const SIDE_STEPS = [[.8, 0], [-.8, 0], [0, .8], [0, -.8]];
const LIBRARY_SEATS = [
  { id: 'library', activityId: 'reading', at: LIBRARY.at, floor: 0, anchor: LIBRARY.male, yaw: Math.PI, seatHeight: .58 },
  { id: 'library-companion', activityId: 'reading', at: [LIBRARY.approach.x, LIBRARY.approach.z], floor: 0, anchor: LIBRARY.female, yaw: Math.PI, seatHeight: .58 },
];

function createParentAvatar(name, colors) {
  const root = new THREE.Group(), body = new THREE.Group(), blob = new THREE.Object3D();
  root.name = name;
  root.add(body);
  const parts = [];
  const part = (x, y, z, w, h, d, color, limb = 0) => parts.push({ x, y, z, w, h, d, color, limb });
  const skin = colors.skin;
  part(0, 1.02, 0, .42, .65, .27, colors.shirtDark);
  part(0, 1.04, .142, .15, .57, .025, colors.inner);
  for (const side of [-1, 1]) {
    part(side * .135, 1.035, .15, .135, .59, .035, colors.shirt);
    part(side * .135, .737, .15, .135, .055, .04, colors.shirtDark);
    part(side * .105, .73, .171, .19, .055, .025, colors.belt);
  }
  part(0, 1.385, 0, .16, .16, .18, skin);
  const headStart = parts.length;
  part(0, 1.57, 0, .44, .44, .43, skin);
  part(0, 1.815, -.035, .48, .13, .47, colors.hair);
  part(0, 1.76, -.16, .39, .11, .34, colors.hairLight);
  part(-.13, 1.78, .145, .15, .07, .08, colors.hairLight);
  if (name === '爸爸') {
    part(0, 1.46, -.222, .44, .2, .08, colors.hair);
    for (const side of [-1, 1]) {
      part(side * .205, 1.53, .015, .075, .31, .37, colors.hair);
      part(side * .205, 1.48, -.02, .075, .13, .18, colors.hairLight);
    }
    part(-.205, 1.59, .206, .018, .1, .018, colors.hairLight);
    part(.205, 1.59, .206, .018, .1, .018, colors.hairLight);
    part(-.095, 1.48, .22, .095, .045, .025, colors.hair);
    part(.095, 1.48, .22, .095, .045, .025, colors.hair);
  } else {
    part(0, 1.47, -.22, .5, .38, .12, colors.hair);
    for (const side of [-1, 1]) {
      part(side * .215, 1.48, -.035, .09, .47, .42, colors.hair);
      part(side * .215, 1.29, .02, .085, .13, .3, colors.hairLight);
    }
    part(-.15, 1.73, .17, .16, .12, .1, colors.hair);
    part(0, 1.76, .18, .16, .11, .1, colors.hairLight);
    part(.15, 1.73, .17, .16, .12, .1, colors.hair);
    part(.205, 1.68, .22, .065, .035, .025, colors.accessory);
    part(-.222, 1.53, .19, .025, .07, .025, colors.accessory);
    part(.222, 1.53, .19, .025, .07, .025, colors.accessory);
  }
  part(0, 1.365, .225, .12, .09, .04, colors.nose);
  for (const x of [-.105, .105]) {
    part(x, 1.61, .222, .12, .075, .035, 0xf3e8dc);
    part(x, 1.61, .245, .045, .052, .018, colors.eyes);
    part(x, 1.665, .225, .13, .025, .028, colors.hair);
  }
  part(0, 1.49, .229, .09, .022, .025, colors.mouth);
  if (name === '爸爸') part(0, 1.455, .25, .17, .045, .026, colors.hairLight);
  const headEnd = parts.length;
  part(0, 1.347, .18, .22, .12, .055, colors.inner);
  for (const side of [-1, 1]) part(side * .052, 1.31, .212, .07, .08, .025, colors.shirt);
  for (const y of [.99, .85, .71]) part(0, y, .179, .025, .025, .018, colors.buttons);
  part(.105, 1.13, .177, .095, .12, .025, colors.shirtLight);
  part(.105, 1.13, .193, .075, .085, .012, colors.shirt);
  part(.105, 1.19, .204, .105, .018, .014, colors.buttons);
  part(-.1, 1.22, .178, .1, .025, .025, colors.stitch);
  part(0, .685, 0, .41, .1, .28, colors.pantsDark);
  for (const side of [-1, 1]) {
    part(side * .105, .51, 0, .19, .33, .22, colors.pants, side);
    part(side * .105, .235, 0, .175, .29, .20, colors.pants, side * 3);
    part(side * .105, .24, .105, .025, .22, .018, colors.pantsLight, side * 3);
    part(side * .105, .0225, .035, .21, .045, .31, colors.sole, side * 5);
    part(side * .105, .0675, .04, .205, .09, .3, colors.shoes, side * 5);
    part(side * .105, .1025, .19, .12, .025, .035, colors.shoesLight, side * 5);
    for (const y of [.0725, .1075]) part(side * .105, y, .19, .07, .012, .015, colors.laces, side * 5);
    part(side * .3, 1.17, 0, .19, .32, .23, colors.shirt, side * 2);
    part(side * .3, 1.16, .01, .2, .06, .24, colors.shirtLight, side * 2);
    part(side * .3, 1.02, .01, .2, .055, .24, colors.shirtDark, side * 2);
    part(side * .3, .885, 0, .155, .26, .17, skin, side * 4);
    part(side * .3, .755, .015, .17, .14, .20, skin, side * 4);
  }
  for (const x of [-.13, .13]) part(x, .66, .03, .035, .035, .035, colors.buttons);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), parts.length + 24);
  // These small articulated boxes overlap heavily; receiving the static sun
  // shadow map makes their surfaces shimmer as the instances move.
  mesh.receiveShadow = false;
  body.add(mesh);
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), rotate = new THREE.Matrix4();
  const joint = new THREE.Vector3(), origin = new THREE.Vector3(), dir = new THREE.Vector3();
  const bend = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0), offset = new THREE.Vector3();
  const joints = Array.from({ length: 11 }, () => new THREE.Matrix4());
  const head = new THREE.Matrix4(), headAngles = new THREE.Euler(0, 0, 0, 'YXZ');
  const color = new THREE.Color();
  parts.forEach((p, i) => mesh.setColorAt(i, color.setHex(p.color)));
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 10);
  let phase = Math.random() * Math.PI * 2;

  function bone(transform, start, end, x, y, length) {
    dir.subVectors(end, start);
    const stretch = dir.length() / length;
    dummy.quaternion.setFromUnitVectors(down, dir.normalize());
    transform.compose(start, dummy.quaternion, offset.set(1, stretch, 1));
    transform.multiply(rotate.makeTranslation(-x, -y, 0));
  }

  // The end of each chain is set by a seat, handle, pedal or held prop.
  function reach(side, target, leg, shoePitch, knee = null) {
    const x = side * (leg ? .105 : .3), y = leg ? .67 : 1.32;
    const upper = leg ? .31 : .30, lower = leg ? .255 : .265;
    origin.set(x, y, 0);
    if (knee) joint.copy(knee);
    else {
      dir.subVectors(target, origin);
      const length = Math.max(.06, Math.min(dir.length(), upper + lower - .002));
      dir.normalize();
      const along = (length * length + upper * upper - lower * lower) / (2 * length);
      if (leg) bend.set(0, 0, 1);
      else bend.set(side * .4, -1, -.1);
      bend.addScaledVector(dir, -bend.dot(dir)).normalize();
      joint.copy(origin).addScaledVector(dir, along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
    }
    bone(joints[5 + side * (leg ? 1 : 2)], origin, joint, x, y, upper);
    bone(joints[5 + side * (leg ? 3 : 4)], joint, target, x, y - upper, lower);
    if (leg) {
      joints[5 + side * 5].makeRotationX(shoePitch).setPosition(
        target.x - x, target.y - .105 * Math.cos(shoePitch), target.z - .105 * Math.sin(shoePitch));
    }
  }

  function update(dt, pose = {}, keepProps = false) {
    phase += dt * 9;
    const active = !!pose.hands;
    if (active) {
      body.rotation.set(pose.pitch, 0, 0);
      body.position.set(0, .67 * (1 - Math.cos(pose.pitch)), -.67 * Math.sin(pose.pitch));
      for (let i = 0; i < 2; i++) {
        reach(i * 2 - 1, pose.hands[i], false, 0);
        reach(i * 2 - 1, pose.feet[i], true, -pose.pitch, pose.seated ? pose.knees[i] : null);
      }
      headAngles.set(pose.headPitch, pose.headYaw, 0);
      head.makeRotationFromEuler(headAngles).multiply(rotate.makeTranslation(0, -1.39, 0));
      head.elements[13] += 1.39;
    } else {
      body.position.set(0, Math.sin(phase * .5) * .006, 0);
      body.rotation.set(0, 0, Math.sin(phase * .32) * .004);
      const stride = Math.sin(phase) * Math.min(1, pose.speed || 0) * .6;
      for (let limb = -5; limb <= 5; limb++) {
        const arm = Math.abs(limb) % 2 === 0, pivot = arm ? 1.32 : .67;
        joints[5 + limb].makeTranslation(0, pivot, 0)
          .multiply(rotate.makeRotationX(Math.sign(limb) * stride * (arm ? -1 : 1)))
          .multiply(rotate.makeTranslation(0, -pivot, 0));
      }
    }
    if (!keepProps) mesh.count = parts.length;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.w, p.h, p.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      const m = matrix.copy(dummy.matrix);
      if (p.limb) m.premultiply(joints[5 + p.limb]);
      else if (active && i >= headStart && i < headEnd) m.premultiply(head);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  function addProp(hex) {
    dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count, dummy.matrix); mesh.setColorAt(mesh.count++, color.setHex(hex));
  }
  function prop(x, y, z, w, h, d, hex, rx = 0, ry = 0, rz = 0) {
    dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.rotation.set(rx, ry, rz);
    addProp(hex);
  }
  function rod(a, b, width, hex) {
    dummy.position.copy(a).lerp(b, .5);
    dir.subVectors(a, b); dummy.scale.set(width, dir.length(), width);
    dummy.quaternion.setFromUnitVectors(down, dir.normalize());
    addProp(hex);
  }
  function beginProps() { mesh.count = parts.length; }
  function endProps() { mesh.instanceMatrix.needsUpdate = mesh.instanceColor.needsUpdate = true; }
  update(0);
  return { root, body, blob, update, beginProps, prop, rod, endProps };
}

export function createParents({ stage, world, nav, player, woman }, activities, femaleRoutine) {
  const specs = [
    { name: '爸爸', colors: { skin: 0xd9aa86, nose: 0xc98f72, mouth: 0x9e5c56, eyes: 0x394552, hair: 0x40352d, hairLight: 0x877764, shirt: 0x587d78, shirtDark: 0x365953, shirtLight: 0x86a59a, inner: 0xe3dfd1, buttons: 0xd5bc83, stitch: 0xadc0a7, belt: 0x302f32, pants: 0x39475a, pantsDark: 0x303a4a, pantsLight: 0x627186, shoes: 0x473b33, shoesLight: 0x726052, sole: 0x24282c, laces: 0xd6c6a4, accessory: 0xd5bc83 }, start: [-2.2, 0, 5.5] },
    { name: '妈妈', colors: { skin: 0xf0c6aa, nose: 0xdca88d, mouth: 0xa94f62, eyes: 0x42515c, hair: 0x49352e, hairLight: 0x795446, shirt: 0x9a6470, shirtDark: 0x754957, shirtLight: 0xc18a92, inner: 0xf0e3d7, buttons: 0xe4c68e, stitch: 0xe1b5ad, belt: 0x6d5551, pants: 0x4e5260, pantsDark: 0x424552, pantsLight: 0x777988, shoes: 0x563e43, shoesLight: 0x80616a, sole: 0x29282d, laces: 0xe5d7c5, accessory: 0xd8b36d }, start: [.5, 0, 5.8] },
  ];
  const residents = specs.map(spec => {
    const avatar = createParentAvatar(spec.name, spec.colors);
    const actor = createPlayer({ avatar, nav, grid: world.grid, ground: world.ground });
    stage.scene.add(avatar.root);
    actor.restore(...spec.start, Math.PI);
    return { avatar, actor, perform: createParentPerformance(avatar, activities),
      target: null, approach: null, phase: 'waiting', elapsed: 0, stalled: 0, wait: Math.random() * 5, lastActivity: null, bag: [] };
  });

  function activityId(spot) { return spot.activityId || spot.id; }
  function occupied(spot, self) {
    if (activities.isUsingSpot(spot.id) || femaleRoutine.reservation === spot.id) return true;
    for (const other of residents) if (other !== self && other.target?.id === spot.id) return true;
    return false;
  }
  function blocksApproach(actor, at, floor) {
    return Math.abs(actor.y - floor) < 1.7 && Math.hypot(actor.pos.x - at.x, actor.pos.z - at.z) < .65;
  }
  function freeApproaches(x, z, floor, resident) {
    const origin = resident.actor.pos;
    const distance = at => Math.hypot(at.x - origin.x, at.z - origin.z);
    const center = nav.nearestStand(x, z);
    const alternatives = SIDE_STEPS.map(([dx, dz]) => nav.nearestStand(x + dx, z + dz)).sort((a, b) => distance(a) - distance(b));
    return [center, ...alternatives].filter(at => nav.canStand(at.x, at.z, floor)
      && !blocksApproach(player, at, floor) && !blocksApproach(woman, at, floor)
      && !residents.some(other => other !== resident && blocksApproach(other.actor, at, floor)));
  }
  function approach(id, resident) {
    const ids = id === 'treadmill' ? [id, ...GYM_BACKUPS] : [id];
    for (const candidateId of ids) {
      const spots = activities.spots.filter(candidate => activityId(candidate) === candidateId);
      if (candidateId === 'reading') spots.push(...LIBRARY_SEATS);
      for (const spot of spots) {
        if (occupied(spot, resident)) continue;
        const [x, z] = spot.residentAt || spot.at;
        for (const at of freeApproaches(x, z, spot.floor, resident)) {
          if (!resident.actor.goTo(at.x, at.z)) continue;
          resident.target = spot; resident.approach = at; resident.phase = 'walking';
          resident.elapsed = resident.stalled = 0;
          return true;
        }
      }
    }
    return false;
  }
  function choose(resident) {
    if (!resident.bag.length) {
      resident.bag.push(...ACTIVITIES);
      for (let i = resident.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resident.bag[i], resident.bag[j]] = [resident.bag[j], resident.bag[i]];
      }
      if (resident.bag.at(-1) === resident.lastActivity) [resident.bag[0], resident.bag[resident.bag.length - 1]] = [resident.bag.at(-1), resident.bag[0]];
    }
    while (resident.bag.length) if (approach(resident.bag.pop(), resident)) return;
    resident.wait = 2;
  }
  function leave(resident) {
    const { actor, target, approach, perform } = resident;
    if (resident.phase === 'active') {
      perform.stop(activityId(target));
      // Return to the aisle before the walking controller handles collisions again.
      const exit = freeApproaches(approach.x, approach.z, target.floor, resident)[0] || nav.nearestStand(approach.x, approach.z);
      actor.restore(exit.x, target.floor, exit.z, actor.heading);
    }
    actor.cancel();
    resident.target = resident.approach = null;
    resident.phase = 'waiting'; resident.wait = .3;
  }
  function update(dt) {
    for (const resident of residents) {
      if (resident.target && occupied(resident.target, resident)) leave(resident);
      if (resident.phase === 'waiting') {
        resident.actor.update(dt, IDLE, 0);
        resident.wait -= dt;
        if (resident.wait <= 0) choose(resident);
        continue;
      }
      resident.elapsed += dt;
      if (resident.phase === 'walking') {
        const { actor, target: spot, approach } = resident;
        const { x, z } = actor.pos;
        actor.update(dt, IDLE, 0);
        resident.stalled = Math.hypot(actor.pos.x - x, actor.pos.z - z) > .002 ? 0 : resident.stalled + dt;
        if (Math.abs(actor.y - spot.floor) < .25 && Math.hypot(actor.pos.x - approach.x, actor.pos.z - approach.z) < .2) {
          resident.actor.cancel();
          const anchor = spot.residentAnchor || spot.anchor || [spot.at[0], spot.floor, spot.at[1]];
          const yaw = activityId(spot) === 'basketball'
            ? Math.atan2(RIM.x - anchor[0], RIM.z - anchor[2])
            : spot.residentYaw ?? spot.yaw ?? 0;
          resident.actor.anchor(anchor[0], anchor[1], anchor[2], yaw);
          resident.phase = 'active'; resident.elapsed = 0;
          resident.lastActivity = activityId(spot);
        } else if (!actor.travelling || resident.stalled > 4 || resident.elapsed > 60) leave(resident);
      } else {
        resident.perform.update(resident.target, resident.actor, resident.elapsed, dt);
        if (resident.elapsed >= ACTIVITY_DURATION) leave(resident);
      }
    }
  }
  return {
    update,
    actors: residents.map(resident => resident.actor),
    isReserved(id) { return residents.some(resident => resident.target?.id === id); },
    status: () => residents.map(({ avatar, phase, target }) => ({ name: avatar.root.name, phase, activity: target ? activityId(target) : null })),
  };
}
