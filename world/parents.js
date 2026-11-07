import * as THREE from 'three';
import { createPlayer } from '@engine/world/player.js';
import { RIM } from './layout.js';

const IDLE = { x: 0, z: 0, run: false };
const GYM_BACKUPS = ['gym-bike', 'gym-pullup', 'gym-bench', 'gym-dumbbells', 'gym-cable', 'gym-vertec'];
const ACTIVITIES = ['reading', 'treadmill', 'basketball', 'cooking', 'tv', 'gaming', ...GYM_BACKUPS];
const ACTIVITY_DURATION = 60;

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
  part(0, 1.347, .18, .22, .12, .055, colors.inner);
  for (const side of [-1, 1]) part(side * .052, 1.31, .212, .07, .08, .025, colors.shirt);
  for (const y of [.99, .85, .71]) part(0, y, .179, .025, .025, .018, colors.buttons);
  part(.105, 1.13, .177, .095, .12, .025, colors.shirtLight);
  part(.105, 1.13, .193, .075, .085, .012, colors.shirt);
  part(.105, 1.19, .204, .105, .018, .014, colors.buttons);
  part(-.1, 1.22, .178, .1, .025, .025, colors.stitch);
  part(0, .685, 0, .41, .1, .28, colors.pantsDark);
  for (const side of [-1, 1]) {
    part(side * .105, .34, 0, .19, .65, .22, colors.pants, side);
    part(side * .105, .34, .116, .025, .48, .018, colors.pantsLight, side);
    part(side * .105, .075, .035, .21, .045, .31, colors.sole, side);
    part(side * .105, .12, .04, .205, .09, .3, colors.shoes, side);
    part(side * .105, .155, .19, .12, .025, .035, colors.shoesLight, side);
    for (const y of [.125, .16]) part(side * .105, y, .213, .07, .012, .015, colors.laces, side);
    part(side * .3, 1.03, 0, .19, .4, .23, colors.shirt, side * 2);
    part(side * .3, .77, 0, .17, .2, .21, skin, side * 2);
    part(side * .3, .85, .11, .18, .055, .23, skin, side * 2);
    part(side * .3, .69, .11, .18, .04, .22, skin, side * 2);
    part(side * .3, 1.16, .01, .2, .06, .24, colors.shirtLight, side * 2);
    part(side * .3, .9, .01, .2, .05, .24, colors.shirtDark, side * 2);
  }
  for (const x of [-.13, .13]) part(x, .66, .03, .035, .035, .035, colors.buttons);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), parts.length + 8);
  // These small articulated boxes overlap heavily; receiving the static sun
  // shadow map makes their surfaces shimmer as the instances move.
  mesh.receiveShadow = false;
  body.add(mesh);
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), rotate = new THREE.Matrix4(), inverse = new THREE.Matrix4();
  const color = new THREE.Color();
  parts.forEach((p, i) => mesh.setColorAt(i, color.setHex(p.color)));
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 10);
  let phase = Math.random() * Math.PI * 2;

  function update(dt, pose = {}) {
    phase += dt * 9;
    const active = pose.activity && pose.id;
    body.position.y = active ? Math.sin(phase * .5) * (pose.seated ? .008 : .018) : Math.sin(phase * .5) * .006;
    body.rotation.z = active ? Math.sin(phase * .38) * (pose.seated ? .012 : .022) : Math.sin(phase * .32) * .004;
    mesh.count = parts.length;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.w, p.h, p.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      const m = matrix.copy(dummy.matrix);
      if (p.limb) {
        const leg = Math.abs(p.limb) === 1, pivot = leg ? .67 : 1.32;
        let angle = Math.sin(phase + (p.limb > 0 ? 0 : Math.PI)) * Math.min(1, pose.speed || 0) * .6 * (leg ? 1 : -1);
        if (pose.activity) angle = leg ? (pose.seated ? -Math.PI / 2 : 0) : (p.limb > 0 ? pose.right : pose.left);
        if (pose.id === 'treadmill') angle = Math.sin(phase + (p.limb > 0 ? 0 : Math.PI)) * (leg ? .55 : -.4);
        if (pose.id === 'basketball' && !leg) {
          const dribble = (1 - Math.cos(pose.elapsed * Math.PI * 2 / 1.05)) / 2;
          angle = p.limb > 0 ? -1.05 + dribble * .72 : -.58 + dribble * .12;
        }
        if (pose.id === 'cooking' && !leg) angle = p.limb > 0
          ? -.72 + Math.sin(phase * 2) * .22
          : -.52 + Math.sin(phase * 1.4 + .8) * .2;
        if (pose.id === 'gaming' && !leg) angle = -1.05 + Math.sin(phase * 3 + (p.limb > 0 ? 0 : Math.PI)) * .12;
        if (pose.id === 'reading' && !leg) angle = -.92 + Math.sin(phase * .7 + (p.limb > 0 ? 0 : Math.PI)) * .09;
        if (pose.id === 'tv' && !leg) angle = -.58 + Math.sin(phase * .45 + (p.limb > 0 ? 0 : Math.PI)) * .05;
        rotate.makeTranslation(0, -pivot, 0); m.premultiply(rotate);
        rotate.makeRotationX(angle); m.premultiply(rotate);
        rotate.makeTranslation(0, pivot, 0); m.premultiply(rotate);
      }
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  function beginProps() { root.updateMatrixWorld(true); inverse.copy(body.matrixWorld).invert(); }
  function prop(x, y, z, w, h, d, hex) {
    dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    matrix.copy(dummy.matrix).premultiply(inverse);
    mesh.setMatrixAt(mesh.count, matrix); mesh.setColorAt(mesh.count++, color.setHex(hex));
  }
  function endProps() { mesh.instanceMatrix.needsUpdate = mesh.instanceColor.needsUpdate = true; }
  update(0);
  return { root, body, blob, update, beginProps, prop, endProps };
}

export function createParents({ stage, world, nav }, activities, femaleRoutine) {
  const specs = [
    { name: '爸爸', colors: { skin: 0xd9aa86, nose: 0xc98f72, mouth: 0x9e5c56, eyes: 0x394552, hair: 0x40352d, hairLight: 0x877764, shirt: 0x587d78, shirtDark: 0x365953, shirtLight: 0x86a59a, inner: 0xe3dfd1, buttons: 0xd5bc83, stitch: 0xadc0a7, belt: 0x302f32, pants: 0x39475a, pantsDark: 0x303a4a, pantsLight: 0x627186, shoes: 0x473b33, shoesLight: 0x726052, sole: 0x24282c, laces: 0xd6c6a4, accessory: 0xd5bc83 }, start: [-2.2, 0, 5.5] },
    { name: '妈妈', colors: { skin: 0xf0c6aa, nose: 0xdca88d, mouth: 0xa94f62, eyes: 0x42515c, hair: 0x49352e, hairLight: 0x795446, shirt: 0x9a6470, shirtDark: 0x754957, shirtLight: 0xc18a92, inner: 0xf0e3d7, buttons: 0xe4c68e, stitch: 0xe1b5ad, belt: 0x6d5551, pants: 0x4e5260, pantsDark: 0x424552, pantsLight: 0x777988, shoes: 0x563e43, shoesLight: 0x80616a, sole: 0x29282d, laces: 0xe5d7c5, accessory: 0xd8b36d }, start: [.5, 0, 5.8] },
  ];
  const residents = specs.map(spec => {
    const avatar = createParentAvatar(spec.name, spec.colors);
    const actor = createPlayer({ avatar, nav, grid: world.grid, ground: world.ground });
    stage.scene.add(avatar.root);
    actor.restore(...spec.start, Math.PI);
    return { avatar, actor,
      target: null, phase: 'waiting', elapsed: 0, duration: 0, wait: Math.random() * 5, lastActivity: null, bag: [],
      pose: { activity: true, seated: false, speed: 0, left: -.65, right: -.65, id: null } };
  });

  function activityId(spot) { return spot.activityId || spot.id; }
  function occupied(spot, self) {
    const id = activityId(spot);
    if (activities.current === id && spot.id === id) return true;
    if (femaleRoutine.reservation === spot.id) return true;
    for (const other of residents) if (other !== self && other.target?.id === spot.id) return true;
    return false;
  }
  function findAvailable(id, resident) {
    const ids = id === 'treadmill' ? [id, ...GYM_BACKUPS] : [id];
    for (const candidateId of ids) {
      const spots = activities.spots.filter(candidate => activityId(candidate) === candidateId);
      const spot = spots.find(candidate => !occupied(candidate, resident));
      if (spot) return spot;
    }
    return null;
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
    while (resident.bag.length) {
      const id = resident.bag.pop();
      const spot = findAvailable(id, resident);
      if (!spot || !resident.actor.goTo(spot.at[0], spot.at[1])) continue;
      resident.target = spot; resident.phase = 'walking'; resident.elapsed = 0;
      return;
    }
    resident.wait = 2;
  }
  function animate(resident, dt) {
    const { actor, avatar, target } = resident;
    const id = activityId(target), seated = id === 'reading' || id === 'tv' || id === 'gaming' || id === 'gym-bike';
    const pose = resident.pose;
    pose.id = id; pose.seated = seated; pose.speed = id === 'treadmill' ? 1.35 : 0; pose.elapsed = resident.elapsed;
    pose.left = pose.right = id === 'reading' ? -.92 : id === 'gaming' ? -1.05 : -.62;
    avatar.root.position.set(actor.pos.x, actor.y + (seated && id !== 'tv' ? -.1 : 0), actor.pos.z);
    avatar.root.rotation.set(0, actor.heading, 0);
    avatar.update(dt, pose);
    avatar.beginProps();
    if (id === 'reading') {
      avatar.prop(0, 1.03, .43, .57, .055, .36, 0x416754);
      avatar.prop(0, 1.066, .43, .52, .02, .32, 0xf4e8ca);
      avatar.prop(0, 1.082, .43, .025, .012, .32, 0xb89d75);
    } else if (id === 'basketball') {
      const bounce = (1 - Math.cos(resident.elapsed * Math.PI * 2 / 1.05)) / 2;
      avatar.prop(.32, .14 + bounce * .82, .42, .28, .28, .28, 0xe27c35);
    }
    avatar.endProps();
  }
  function update(dt) {
    for (const resident of residents) {
      if (resident.target && occupied(resident.target, resident)) {
        resident.actor.cancel(); resident.target = null; resident.phase = 'waiting'; resident.wait = .3;
      }
      if (resident.phase === 'waiting') {
        resident.actor.update(dt, IDLE, 0);
        resident.wait -= dt;
        if (resident.wait <= 0) choose(resident);
        continue;
      }
      resident.elapsed += dt;
      resident.actor.update(dt, IDLE, 0);
      if (resident.phase === 'walking') {
        const spot = resident.target;
        if (Math.abs(resident.actor.y - spot.floor) < .25 && Math.hypot(resident.actor.pos.x - spot.at[0], resident.actor.pos.z - spot.at[1]) < .4) {
          resident.actor.cancel();
          const anchor = spot.anchor || [spot.at[0], spot.floor, spot.at[1]];
          const yaw = activityId(spot) === 'basketball'
            ? Math.atan2(RIM.x - anchor[0], RIM.z - anchor[2])
            : spot.yaw ?? 0;
          resident.actor.anchor(anchor[0], anchor[1], anchor[2], yaw);
          resident.phase = 'active'; resident.elapsed = 0; resident.duration = ACTIVITY_DURATION;
          resident.lastActivity = spot.id;
        } else if (resident.elapsed > 60) {
          resident.actor.cancel(); resident.target = null; resident.phase = 'waiting'; resident.wait = 2;
        }
      } else {
        animate(resident, dt);
        if (resident.elapsed >= resident.duration) {
          resident.target = null; resident.phase = 'waiting'; resident.wait = .05;
        }
      }
    }
  }
  return {
    update,
    isReserved(id) { return residents.some(resident => resident.target?.id === id); },
    status: () => residents.map(({ avatar, phase, target }) => ({ name: avatar.root.name, phase, activity: target ? activityId(target) : null })),
  };
}
