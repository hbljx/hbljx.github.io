import * as THREE from 'three';
import { createPlayer } from '@engine/world/player.js';

const IDLE = { x: 0, z: 0, run: false };
const ACTIVITIES = ['reading', 'treadmill', 'basketball', 'cooking', 'tv', 'gaming'];

function createParentAvatar(name, colors) {
  const root = new THREE.Group(), body = new THREE.Group(), blob = new THREE.Object3D();
  root.name = name;
  root.add(body);
  const parts = [];
  const part = (x, y, z, w, h, d, color, limb = 0) => parts.push({ x, y, z, w, h, d, color, limb });
  part(0, 1.02, 0, .42, .65, .27, colors.shirt);
  part(0, 1.57, 0, .44, .44, .43, 0xd9aa86);
  part(0, 1.82, -.03, .49, .12, .48, colors.hair);
  part(0, 1.46, -.23, .48, .28, .1, colors.hair);
  for (const x of [-.1, .1]) part(x, 1.6, .224, .07, .045, .025, 0x28232a);
  for (const side of [-1, 1]) {
    part(side * .105, .34, 0, .19, .65, .22, colors.pants, side);
    part(side * .105, .06, .035, .2, .12, .3, colors.shoes, side);
    part(side * .3, 1.03, 0, .18, .4, .22, colors.shirt, side * 2);
    part(side * .3, .74, 0, .17, .2, .21, 0xd9aa86, side * 2);
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), parts.length + 8);
  mesh.receiveShadow = true;
  body.add(mesh);
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), rotate = new THREE.Matrix4(), inverse = new THREE.Matrix4();
  const color = new THREE.Color();
  parts.forEach((p, i) => mesh.setColorAt(i, color.setHex(p.color)));
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 10);
  let phase = Math.random() * Math.PI * 2;

  function update(dt, pose = {}) {
    phase += dt * 9;
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
        if (pose.id === 'basketball' && !leg) angle = -.65 + Math.max(0, Math.sin(phase * 1.8)) * .5;
        if (pose.id === 'cooking' && !leg) angle = p.limb > 0 ? -.85 + Math.sin(phase * 2) * .18 : -.65;
        if (pose.id === 'gaming' && !leg) angle = -1.1 + Math.sin(phase * 3) * .08;
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
    { name: '爸爸', colors: { shirt: 0x587d78, pants: 0x39475a, shoes: 0x302d2b, hair: 0x40352d }, start: [-2.2, 0, 5.5] },
    { name: '妈妈', colors: { shirt: 0x9a6470, pants: 0x4e5260, shoes: 0x302d2b, hair: 0x49352e }, start: [.5, 0, 5.8] },
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

  function occupied(id, self) {
    if (activities.current === id || femaleRoutine.activity === id) return true;
    for (const other of residents) if (other !== self && other.target?.id === id) return true;
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
    while (resident.bag.length) {
      const id = resident.bag.pop();
      if (occupied(id, resident)) continue;
      const spot = activities.spots.find(candidate => candidate.id === id);
      if (!spot || !resident.actor.goTo(spot.at[0], spot.at[1])) continue;
      resident.target = spot; resident.phase = 'walking'; resident.elapsed = 0;
      return;
    }
    resident.wait = 2;
  }
  function animate(resident, dt) {
    const { actor, avatar, target } = resident;
    const id = target.id, seated = id === 'reading' || id === 'tv' || id === 'gaming';
    const pose = resident.pose;
    pose.id = id; pose.seated = seated; pose.speed = id === 'treadmill' ? 1.35 : 0;
    pose.left = pose.right = id === 'reading' ? -1.05 : id === 'gaming' ? -1.1 : -.65;
    avatar.root.position.set(actor.pos.x, actor.y + (seated ? -.1 : 0), actor.pos.z);
    avatar.root.rotation.set(0, actor.heading, 0);
    avatar.update(dt, pose);
    avatar.beginProps();
    if (id === 'reading') {
      avatar.prop(0, 1.03, .43, .57, .055, .36, 0x416754);
      avatar.prop(0, 1.066, .43, .52, .02, .32, 0xf4e8ca);
      avatar.prop(0, 1.082, .43, .025, .012, .32, 0xb89d75);
    } else if (id === 'basketball') {
      const bounce = Math.abs(Math.sin(resident.elapsed * 4));
      avatar.prop(.32, .3 + bounce * .72, .42, .28, .28, .28, 0xe27c35);
    }
    avatar.endProps();
  }
  function update(dt) {
    for (const resident of residents) {
      if (resident.target && occupied(resident.target.id, resident)) {
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
          resident.actor.anchor(anchor[0], anchor[1], anchor[2], spot.yaw ?? 0);
          resident.phase = 'active'; resident.elapsed = 0; resident.duration = 25 + Math.random() * 35;
          resident.lastActivity = spot.id;
        } else if (resident.elapsed > 60) {
          resident.actor.cancel(); resident.target = null; resident.phase = 'waiting'; resident.wait = 2;
        }
      } else {
        animate(resident, dt);
        if (resident.elapsed >= resident.duration) {
          resident.target = null; resident.phase = 'waiting'; resident.wait = 1 + Math.random() * 4;
        }
      }
    }
  }
  return { update, status: () => residents.map(({ avatar, phase, target }) => ({ name: avatar.root.name, phase, activity: target?.id || null })) };
}
