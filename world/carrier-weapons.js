import * as THREE from 'three';

const COLORS = { hull: 0x66757a, trim: 0xb7c4c5, dark: 0x27343a, barrel: 0x46545a, yellow: 0xd8b15c, radome: 0xd5d5c8 };

function builder() {
  const positions = [], colors = [], tint = new THREE.Color();
  return {
    add(geometry, color, position = [0, 0, 0], rotation = [0, 0, 0]) {
      geometry.rotateX(rotation[0]); geometry.rotateY(rotation[1]); geometry.rotateZ(rotation[2]); geometry.translate(...position); tint.setHex(COLORS[color]);
      for (let i = 0; i < geometry.attributes.position.count; i++) { positions.push(geometry.attributes.position.getX(i), geometry.attributes.position.getY(i), geometry.attributes.position.getZ(i)); colors.push(tint.r, tint.g, tint.b); }
      geometry.dispose();
    },
    mesh() { const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .42, metalness: .62 })); },
  };
}
const box = (b, x, y, z, w, h, d, color, rotation) => b.add(new THREE.BoxGeometry(w, h, d), color, [x, y, z], rotation);
const cylinder = (b, x, y, z, rt, rb, h, color, rotation = [0, 0, 0], sides = 12) => b.add(new THREE.CylinderGeometry(rt, rb, h, sides), color, [x, y, z], rotation);

function gun() {
  const root = new THREE.Group(), base = builder(), turret = builder();
  cylinder(base, 0, .12, 0, .58, .72, .24, 'dark', [0, 0, 0], 16); cylinder(base, 0, .28, 0, .51, .58, .12, 'trim', [0, 0, 0], 16); cylinder(base, 0, .4, 0, .42, .48, .18, 'hull', [0, 0, 0], 12);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; box(base, Math.cos(a) * .54, .1, Math.sin(a) * .54, .12, .12, .2, 'yellow', [0, a, 0]); }
  box(turret, 0, .58, 0, .78, .36, .86, 'hull'); box(turret, 0, .8, -.08, .62, .12, .56, 'trim');
  cylinder(turret, 0, .61, .48, .13, .18, .38, 'dark', [Math.PI / 2, 0, 0]); cylinder(turret, 0, .63, .85, .095, .12, .58, 'barrel', [Math.PI / 2, 0, 0]); cylinder(turret, 0, .63, 1.13, .12, .12, .12, 'trim', [Math.PI / 2, 0, 0]);
  for (const x of [-.18, -.06, .06, .18]) cylinder(turret, x, .76, .22, .035, .035, .44, 'dark', [Math.PI / 2, 0, 0], 8);
  root.add(base.mesh(), turret.mesh()); root.userData.pivot = root.children[1]; root.scale.setScalar(1.7); return root;
}

function missile() {
  const root = new THREE.Group(), base = builder(), pod = builder();
  cylinder(base, 0, .12, 0, .56, .68, .24, 'dark', [0, 0, 0], 16); cylinder(base, 0, .29, 0, .46, .55, .12, 'trim', [0, 0, 0], 16); cylinder(base, 0, .4, 0, .38, .44, .14, 'hull', [0, 0, 0], 12);
  for (const x of [-.23, .23]) { box(pod, x, .72, 0, .27, .22, .74, 'hull', [-.36, 0, 0]); cylinder(pod, x, .84, .11, .105, .105, .82, 'dark', [-.36, 0, 0], 10); cylinder(pod, x, .84, .35, .075, .075, .1, 'trim', [-.36, 0, 0], 10); cylinder(pod, x, .84, -.3, .09, .09, .08, 'yellow', [-.36, 0, 0], 10); }
  box(pod, 0, .57, -.08, .66, .16, .56, 'dark'); root.add(base.mesh(), pod.mesh()); root.userData.pivot = root.children[1]; root.scale.setScalar(1.7); return root;
}

function radar() {
  const root = new THREE.Group(), mast = builder(), dish = builder();
  cylinder(mast, 0, .48, 0, .12, .19, .96, 'dark'); cylinder(mast, 0, .94, 0, .25, .25, .12, 'trim', [0, 0, 0], 12);
  for (const x of [-.26, .26]) box(mast, x, .98, 0, .12, .08, .16, 'yellow');
  box(dish, 0, 0, 0, 1.32, .08, .18, 'radome'); box(dish, 0, 0, .12, .96, .045, .08, 'trim'); cylinder(dish, 0, 0, 0, .1, .1, .32, 'dark', [Math.PI / 2, 0, 0]);
  const rotor = new THREE.Group(); rotor.add(dish.mesh()); rotor.position.y = 1.05; root.add(mast.mesh(), rotor); root.userData.rotor = rotor; root.scale.setScalar(1.5); return root;
}

export function createCarrierWeapons(carrier) {
  const group = new THREE.Group(); group.name = 'carrier-weapons';
  const mounts = [{ object: gun(), x: -5.25, z: -30.1, rate: .34, phase: 0 }, { object: missile(), x: -4.65, z: 30.2, rate: .19, phase: 1.7 }];
  for (const mount of mounts) { mount.object.position.set(mount.x, 3.4, mount.z); group.add(mount.object); }
  const radarUnit = radar(); radarUnit.position.set(6.4, 11.12, 4.63); group.add(radarUnit); carrier.add(group);
  let time = 0;
  return { group, update(dt) { time += Math.min(dt, .05); for (const mount of mounts) { const pivot = mount.object.userData.pivot; pivot.rotation.y = Math.sin(time * mount.rate + mount.phase) * 1.05; pivot.rotation.x = mount.rate > .3 ? Math.sin(time * .7) * .035 : .16 + Math.sin(time * .45 + 1) * .05; } radarUnit.userData.rotor.rotation.y = time * 2.7; } };
}
