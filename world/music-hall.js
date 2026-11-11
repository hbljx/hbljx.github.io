// A compact open music stage beside the kitchen glazing. Large furniture stays
// in the shared box batch; the drum kit uses a few instanced meshes.
import * as THREE from 'three';

const up = new THREE.Vector3(0, 1, 0);

export function buildMusicHall(B, foot, bake) {
  const paint = tint => ({ tex: 'paint', tint });
  const piano = paint(0x292c33), pianoTop = paint(0x41404a), brass = paint(0xb59a68);
  const wine = paint(0x613241), rug = paint(0x582b38), rugEdge = paint(0xb39467), innerRug = paint(0x743f4e);
  const pianoScale = 1.22, pianoAnchorX = 22, pianoAnchorZ = 7.5;
  // Keep the pianist on the open east side so the performance reads clearly
  // from the kitchen approach; the grand piano body sits to her west.
  const pianoX = x => pianoAnchorX + (45.5 - x - pianoAnchorX) * pianoScale;
  const pianoZ = z => pianoAnchorZ + (z - pianoAnchorZ) * pianoScale;
  const pianoBox = (x, y, z, w, h, d, look, options) =>
    B.box(pianoX(x), y, pianoZ(z), w * pianoScale, h * 1.08, d * pianoScale, look, options);
  const pianoFoot = (x, z, w, d) => foot(pianoX(x), pianoZ(z), w * pianoScale, d * pianoScale);
  const rugX = 24.72, rugZ = 8.05, rugW = 9.1, rugD = 6.05;

  // A flat, woven stage rug separates the music corner from the kitchen while
  // keeping the route along the east glass clear.
  B.box(rugX, 0.008, rugZ, rugW, 0.018, rugD, rug);
  B.box(rugX, 0.027, rugZ, rugW - 0.3, 0.012, rugD - 0.3, innerRug);
  for (const x of [rugX - rugW / 2 + 0.08, rugX + rugW / 2 - 0.08]) B.box(x, 0.04, rugZ, 0.04, 0.012, rugD - 0.28, rugEdge);
  for (const z of [rugZ - rugD / 2 + 0.08, rugZ + rugD / 2 - 0.08]) B.box(rugX, 0.04, z, rugW - 0.28, 0.012, 0.04, rugEdge);

  // Grand piano: tapered-looking tail, raised lid, three legs and a full
  // keyboard facing east toward the performer.
  pianoBox(23.55, 0.08, 7.5, 1.12, 0.48, 1.65, piano);
  pianoBox(24.08, 0.08, 7.5, 0.9, 0.38, 1.42, piano);
  pianoBox(23.63, 0.57, 7.48, 1.72, 0.07, 1.72, pianoTop, { ry: 0.12 });
  pianoBox(23.48, 0.64, 7.5, 1.35, 0.018, 1.35, paint(0x6c2029));
  for (const [x, z] of [[22.98, 6.82], [22.98, 8.18], [24.18, 7.5]]) {
    pianoBox(x, 0, z, 0.1, 0.55, 0.1, piano);
    pianoBox(x, 0, z, 0.16, 0.055, 0.16, brass);
  }
  pianoBox(22.86, 0.43, 7.5, 0.19, 0.23, 1.48, piano);
  pianoBox(22.74, 0.44, 7.5, 0.06, 0.14, 1.38, paint(0xf0e6d4));
  pianoBox(23.04, 0.78, 7.5, 0.045, 0.44, 0.84, piano);
  pianoBox(23.005, 0.8, 7.5, 0.018, 0.32, 0.68, paint(0xf1e8d8));
  for (let i = 0; i < 5; i++) pianoBox(22.992, 0.71 + i * 0.045, 7.5, 0.012, 0.006, 0.56, paint(0x544d4b));
  for (const [y, z] of [[0.738, 7.34], [0.828, 7.48], [0.783, 7.62], [0.873, 7.72]]) {
    pianoBox(22.985, y, z, 0.018, 0.025, 0.025, paint(0x544d4b));
    pianoBox(22.982, y + 0.018, z + 0.008, 0.012, 0.035, 0.008, paint(0x544d4b));
  }
  for (const z of [7.39, 7.5, 7.61]) pianoBox(22.97, 0.055, z, 0.23, 0.035, 0.035, paint(0xc6a36d));
  const whiteKeys = 20, keyStart = 6.82, keyWidth = 1.36 / whiteKeys;
  for (let i = 0; i < whiteKeys; i++) {
    const z = keyStart + (i + 0.5) * keyWidth;
    pianoBox(22.695, 0.45, z, 0.13, 0.055, keyWidth - 0.008, paint(0xf1eadc));
    if (![2, 6, 9, 13, 16].includes(i)) pianoBox(22.625, 0.48, z + keyWidth * 0.48, 0.1, 0.07, keyWidth * 0.48, piano);
  }
  // A black, brass-detailed adjustable piano bench.
  pianoBox(22.12, 0, 7.5, 0.07, 0.42, 0.07, brass);
  pianoBox(22.6, 0, 7.5, 0.07, 0.42, 0.07, brass);
  pianoBox(22.36, 0.42, 7.5, 0.62, 0.1, 0.55, wine);
  pianoFoot(22.36, 7.5, 0.72, 0.65);
  pianoFoot(23.55, 7.5, 1.95, 1.95);

  // A short ceiling track and three warm stage washes.
  B.box(24.65, 8.8, 5.45, 5.3, 0.055, 0.07, paint(0x292d31), { shadow: false });
  for (const x of [22.25, 24.65, 27.05]) {
    B.box(x, 8.56, 5.45, 0.12, 0.42, 0.12, paint(0x292d31), { shadow: false });
    B.box(x, 8.34, 5.45, 0.2, 0.08, 0.2, paint(0xffd9a0), { shadow: false });
    bake('music-hall-stage', x, 8.28, 5.7, 1.05, 7.5, [0, -1, 0]);
  }

  return createDrumKit(B, foot);
}

function createDrumKit(B, foot) {
  const group = new THREE.Group();
  group.name = 'music-hall-drum-kit';
  const kitScale = 1.28, kitCenterX = 26.05, kitCenterZ = 7.55;
  const kitX = x => kitCenterX + (x - kitCenterX) * kitScale;
  const kitZ = z => kitCenterZ + (z - kitCenterZ) * kitScale;
  const shellMaterial = new THREE.MeshPhongMaterial({ color: 0x633c4b, shininess: 48, specular: 0x8e6b69 });
  const headMaterial = new THREE.MeshPhongMaterial({ color: 0xe4ded2, shininess: 34 });
  const metalMaterial = new THREE.MeshPhongMaterial({ color: 0xaeb4b3, shininess: 90, specular: 0xffffff });
  const cymbalMaterial = new THREE.MeshPhongMaterial({ color: 0xc6a35d, shininess: 90, specular: 0xffe3a1, side: THREE.DoubleSide });
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const cymbal = new THREE.CylinderGeometry(0.72, 1, 0.045, 16);
  const shells = [], heads = [], rods = [], cymbals = [];
  const dummy = new THREE.Object3D();
  const add = (list, position, scale, quaternion = null) => {
    dummy.position.set(...position);
    dummy.scale.set(...scale);
    dummy.quaternion.copy(quaternion || new THREE.Quaternion());
    dummy.updateMatrix();
    list.push(dummy.matrix.clone());
  };
  const addDrum = (x, z, radius, height, bottom) => {
    x = kitX(x); z = kitZ(z); radius *= kitScale; height *= 1.15;
    const y = bottom + height / 2;
    add(shells, [x, y, z], [radius, height, radius]);
    add(heads, [x, bottom + height + 0.012, z], [radius * 0.94, 0.025, radius * 0.94]);
  };
  const addRod = (x, z, height, radius = 0.018) => add(rods, [kitX(x), height / 2, kitZ(z)], [radius * 1.15, height, radius * 1.15]);
  const addCymbal = (x, z, height, radius) => {
    height *= 1.08; radius *= kitScale;
    addRod(x, z, height, 0.018);
    add(cymbals, [kitX(x), height, kitZ(z)], [radius, 0.055, radius]);
    add(rods, [kitX(x), height + 0.05, kitZ(z)], [0.032, 0.11, 0.032]);
  };
  const alongX = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(1, 0, 0));

  // Bass drum with its head aimed toward the room, plus snare and toms.
  add(shells, [kitX(25.33), 0.48, kitZ(7.55)], [0.55, 0.55, 0.55], alongX);
  for (const x of [24.91, 25.75]) add(heads, [kitX(x), 0.48, kitZ(7.55)], [0.032, 0.5, 0.5], alongX);
  addDrum(25.95, 7.08, 0.27, 0.27, 0.83);
  addDrum(26.35, 7.55, 0.29, 0.28, 0.86);
  addDrum(26.62, 8.06, 0.32, 0.34, 0.08);
  addDrum(25.9, 8.15, 0.24, 0.2, 0.77);
  addCymbal(26.02, 7.05, 1.72, 0.39);
  addCymbal(26.32, 7.95, 1.86, 0.36);
  addCymbal(25.82, 8.12, 1.58, 0.29);

  const put = (geometry, material, matrices, name) => {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = name;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  put(cylinder, shellMaterial, shells, 'drum-shells');
  put(cylinder, headMaterial, heads, 'drum-heads');
  put(cylinder, metalMaterial, rods, 'drum-hardware');
  put(cymbal, cymbalMaterial, cymbals, 'drum-cymbals');

  // A compact drummer's stool and bass pedal, also batched with the piano.
  B.box(kitX(26.75), 0, kitZ(7.55), 0.055, 0.44, 0.055, { tex: 'steel' });
  B.box(kitX(26.75), 0.44, kitZ(7.55), 0.56, 0.09, 0.56, { tex: 'velvet' });
  B.box(kitX(25.98), 0, kitZ(7.55), 0.46, 0.045, 0.15, { tex: 'steel' });
  B.box(kitX(26.02), 0, kitZ(7.05), 0.38, 0.04, 0.18, { tex: 'steel' });
  foot(kitX(25.98), kitZ(7.55), 2.35 * kitScale, 2.75 * kitScale);
  return group;
}
