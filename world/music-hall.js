// A detailed, walkable music stage beside the kitchen glazing.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export function buildMusicHall(B, foot, bake) {
  const paint = tint => ({ tex: 'paint', tint });
  const rugX = 24.85, rugZ = 10.3, rugW = 9.7, rugD = 10.6;
  B.box(rugX, 0.008, rugZ, rugW, 0.018, rugD, paint(0x5d2939));
  B.box(rugX, 0.027, rugZ, rugW - 0.3, 0.012, rugD - 0.3, paint(0x784153));
  for (const x of [rugX - rugW / 2 + 0.09, rugX + rugW / 2 - 0.09]) {
    B.box(x, 0.04, rugZ, 0.045, 0.012, rugD - 0.34, paint(0xc1a16b));
  }
  for (const z of [rugZ - rugD / 2 + 0.09, rugZ + rugD / 2 - 0.09]) {
    B.box(rugX, 0.04, z, rugW - 0.34, 0.012, 0.045, paint(0xc1a16b));
  }

  const grandPiano = createGrandPiano();
  const drumKit = createDrumKit();
  const hall = new THREE.Group();
  hall.name = 'music-hall-instruments';
  hall.add(grandPiano, drumKit);

  // Keep a real clearance around the cases and seats in the house navigation
  // grid. The performer uses a separate route that passes through the east aisle.
  foot(25.1, 7.0, 3.4, 2.55);
  foot(25.1, 5.38, 1.02, 0.82);
  foot(25.1, 10.55, 3.15, 1.15);
  foot(25.1, 11.45, 1.02, 0.92);

  // A slim lighting rail follows the north-south instrument arrangement.
  B.box(25.1, 8.8, 8.25, 0.075, 0.055, 5.65, paint(0x292d31), { shadow: false });
  for (const z of [6.05, 8.25, 10.45]) {
    B.box(25.1, 8.56, z, 0.12, 0.42, 0.12, paint(0x292d31), { shadow: false });
    B.box(25.1, 8.34, z, 0.2, 0.08, 0.2, paint(0xffd9a0), { shadow: false });
    bake('music-hall-stage', 25.1, 8.28, z, 1.15, 7.5, [0, -1, 0]);
  }
  return hall;
}

function mat(color, { shininess = 28, specular = 0x252525 } = {}) {
  return new THREE.MeshPhongMaterial({ color, shininess, specular });
}

function addMesh(group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addBox(group, material, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
  return addMesh(group, new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz);
}

function pianoOutline() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.98, 2.0);
  shape.lineTo(0.98, 2.0);
  shape.lineTo(1.04, 1.75);
  shape.bezierCurveTo(1.34, 1.47, 1.42, 0.92, 1.26, 0.42);
  shape.bezierCurveTo(1.12, 0.03, 0.55, -0.08, 0.02, -0.08);
  shape.bezierCurveTo(-0.62, -0.08, -1.2, 0.19, -1.38, 0.65);
  shape.bezierCurveTo(-1.56, 1.14, -1.31, 1.71, -0.98, 2.0);
  return shape;
}

function createGrandPiano() {
  const root = new THREE.Group();
  root.name = 'concert-grand-piano';
  root.position.set(25.1, 0, 6.05);
  const lacquer = mat(0x15181d, { shininess: 96, specular: 0xd9d1ca });
  const edgeLacquer = mat(0x303139, { shininess: 84, specular: 0xb0a8a1 });
  const soundboard = mat(0x59343a, { shininess: 54, specular: 0x8b6d58 });
  const ivory = mat(0xf1eadb, { shininess: 50, specular: 0x857e72 });
  const ebony = mat(0x111419, { shininess: 88, specular: 0x8e9298 });
  const brass = mat(0xc4a568, { shininess: 92, specular: 0xffe6a8 });
  const felt = mat(0x813c46, { shininess: 22, specular: 0x302023 });
  const goldLine = new THREE.LineBasicMaterial({ color: 0xd4b57d });

  // This local plane maps piano depth to the room's north-south axis. The keys
  // face the performer on the south side; the rounded tail sits behind them.
  const plan = new THREE.Group();
  plan.rotation.x = -Math.PI / 2;
  plan.position.set(0, 0.12, 2.05);
  root.add(plan);
  const outline = pianoOutline();
  const bodyGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.48, bevelEnabled: true, bevelSegments: 3,
    steps: 1, bevelThickness: 0.045, bevelSize: 0.05, curveSegments: 18,
  });
  addMesh(plan, bodyGeometry, lacquer, 0, 0, 0);
  addMesh(plan, new THREE.ShapeGeometry(outline), soundboard, 0, 0, 0.482);

  // Gold perimeter wire and a visible harp/string field make the open top read
  // as a piano soundboard rather than a plain black block.
  const perimeter = outline.getPoints(64).map(p => new THREE.Vector3(p.x, p.y, 0.489));
  const perimeterGeometry = new THREE.BufferGeometry().setFromPoints(perimeter);
  const perimeterLine = new THREE.LineLoop(perimeterGeometry, goldLine);
  plan.add(perimeterLine);
  const strings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), brass, 18);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i++) {
    const x = -0.68 + i * 0.08;
    dummy.position.set(x, 0.98 + (i % 3) * 0.035, 0.49);
    dummy.scale.set(0.009, 1.22 - (i % 4) * 0.08, 0.006);
    dummy.rotation.z = (i % 2 ? -1 : 1) * 0.035;
    dummy.updateMatrix(); strings.setMatrixAt(i, dummy.matrix);
  }
  plan.add(strings);
  strings.instanceMatrix.needsUpdate = true;
  addBox(plan, brass, 0, 1.04, 0.49, 1.35, 0.035, 0.012, 0, 0, 0.035);
  const soundRibs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), felt, 5);
  for (let i = 0; i < 5; i++) {
    dummy.position.set(-0.58 + i * 0.29, 0.74, 0.49);
    dummy.scale.set(0.025, 1.25, 0.012);
    dummy.rotation.z = 0.09;
    dummy.updateMatrix(); soundRibs.setMatrixAt(i, dummy.matrix);
  }
  plan.add(soundRibs);
  soundRibs.instanceMatrix.needsUpdate = true;

  // Three tapered legs, brass collars and caster wheels.
  for (const [x, z] of [[-0.98, 0.48], [0.98, 0.48], [0.72, 1.66]]) {
    addMesh(root, new THREE.CylinderGeometry(0.075, 0.13, 0.57, 12), lacquer, x, 0.285, z);
    addMesh(root, new THREE.CylinderGeometry(0.105, 0.105, 0.045, 16), brass, x, 0.055, z);
    addMesh(root, new THREE.CylinderGeometry(0.047, 0.047, 0.055, 12), ebony, x, 0.025, z);
  }
  // Curved music desk, page clips and printed staff marks.
  addBox(root, lacquer, 0, 0.87, 0.62, 1.13, 0.035, 0.46, -0.18);
  addBox(root, soundboard, 0, 1.08, 0.64, 0.94, 0.52, 0.035, -0.18);
  for (let i = 0; i < 5; i++) addBox(root, edgeLacquer, 0, 0.94 + i * 0.055, 0.614, 0.76, 0.007, 0.008, -0.18);
  for (const x of [-0.39, 0.39]) addMesh(root, new THREE.SphereGeometry(0.025, 8, 6), brass, x, 1.28, 0.59);
  addBox(root, brass, 0, 0.64, 0.04, 2.0, 0.035, 0.06);
  addBox(root, felt, 0, 0.625, -0.015, 1.86, 0.018, 0.018);

  // Full-width ivory keyboard with a repeating, correctly grouped black-key pattern.
  const whiteCount = 26, whiteWidth = 1.9 / whiteCount;
  const whites = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ivory, whiteCount);
  let whiteIndex = 0;
  for (let i = 0; i < whiteCount; i++) {
    const x = -0.95 + (i + 0.5) * whiteWidth;
    dummy.position.set(x, 0.655, -0.13);
    dummy.scale.set(whiteWidth * 0.94, 0.065, 0.37);
    dummy.updateMatrix(); whites.setMatrixAt(whiteIndex++, dummy.matrix);
  }
  root.add(whites);
  whites.instanceMatrix.needsUpdate = true;
  const blackOffsets = [0, 1, 3, 4, 5];
  const blackCount = 4 * blackOffsets.length;
  const blacks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ebony, blackCount);
  let blackIndex = 0;
  for (let i = 0; i < whiteCount - 1; i++) {
    if (!blackOffsets.includes(i % 7)) continue;
    const x = -0.95 + (i + 1) * whiteWidth;
    dummy.position.set(x, 0.696, -0.015);
    dummy.scale.set(whiteWidth * 0.56, 0.075, 0.22);
    dummy.updateMatrix(); blacks.setMatrixAt(blackIndex++, dummy.matrix);
  }
  blacks.count = blackIndex;
  root.add(blacks);
  blacks.instanceMatrix.needsUpdate = true;
  // Three brass sustain pedals hang below the keybed.
  for (let i = -1; i <= 1; i++) {
    addMesh(root, new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), brass, i * 0.13, 0.17, 0.27, 0.17);
    addBox(root, brass, i * 0.13, 0.08, 0.33, 0.07, 0.025, 0.16, -0.1);
  }

  // Adjustable, stitched velvet bench with four metal-tipped legs.
  const bench = new THREE.Group(); bench.position.set(0, 0, -0.67); root.add(bench);
  addBox(bench, lacquer, 0, 0.4, 0, 0.94, 0.13, 0.62);
  addBox(bench, felt, 0, 0.48, 0, 0.88, 0.07, 0.56);
  for (const x of [-0.34, 0.34]) for (const z of [-0.22, 0.22]) {
    addMesh(bench, new THREE.CylinderGeometry(0.025, 0.035, 0.39, 8), brass, x, 0.2, z);
    addMesh(bench, new THREE.CylinderGeometry(0.04, 0.04, 0.035, 10), lacquer, x, 0.025, z);
  }
  for (let i = 0; i < 7; i++) addMesh(bench, new THREE.SphereGeometry(0.012, 6, 5), brass,
    -0.34 + i * 0.113, 0.521, -0.19);
  return root;
}

function rod(group, start, end, radius, material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a), length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  return mesh;
}

function createDrumKit() {
  const root = new THREE.Group();
  root.name = 'detailed-drum-kit';
  root.position.set(25.1, 0, 10.3);
  const shell = mat(0x552a38, { shininess: 78, specular: 0xb58d85 });
  const shellHighlight = mat(0x8c5362, { shininess: 78, specular: 0xd4b9a0 });
  const head = mat(0xf0eadc, { shininess: 42, specular: 0x827b70 });
  const metal = mat(0xaeb8ba, { shininess: 110, specular: 0xffffff });
  const brass = mat(0xc5a35c, { shininess: 105, specular: 0xffe4a1 });
  const black = mat(0x191c20, { shininess: 62, specular: 0x7b8085 });
  const felt = mat(0x4b303b, { shininess: 30, specular: 0x644d53 });

  function addVerticalDrum(x, y, z, radius, height, lugCount = 8) {
    addMesh(root, new THREE.CylinderGeometry(radius * 0.94, radius, height, 28), shell, x, y, z);
    for (const bandY of [y - height * 0.22, y + height * 0.22]) {
      addMesh(root, new THREE.TorusGeometry(radius * 0.95, 0.012, 6, 28), shellHighlight, x, bandY, z, Math.PI / 2);
    }
    addMesh(root, new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.025, 28), head, x, y + height / 2 + 0.014, z);
    addMesh(root, new THREE.TorusGeometry(radius * 0.93, 0.024, 8, 32), brass, x, y + height / 2 + 0.026, z, Math.PI / 2);
    addMesh(root, new THREE.TorusGeometry(radius * 0.93, 0.02, 8, 32), metal, x, y - height / 2, z, Math.PI / 2);
    for (let i = 0; i < lugCount; i++) {
      const angle = i / lugCount * Math.PI * 2;
      const lx = x + Math.cos(angle) * radius * 0.99, lz = z + Math.sin(angle) * radius * 0.99;
      rod(root, [lx, y - height * 0.32, lz], [lx, y + height * 0.32, lz], 0.012, metal);
      addMesh(root, new THREE.SphereGeometry(0.022, 8, 6), brass, lx, y + height * 0.34, lz);
    }
  }

  // Bass drum shell, two heads, hoops, tension bolts and a brass monogram badge.
  const bassShell = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.62, 36), shell);
  bassShell.rotation.x = Math.PI / 2; bassShell.position.set(0, 0.55, 0.1); bassShell.castShadow = true; root.add(bassShell);
  addMesh(root, new THREE.CylinderGeometry(0.578, 0.578, 0.085, 36), shellHighlight, 0, 0.55, 0.1, Math.PI / 2);
  for (const side of [-1, 1]) {
    const z = 0.1 + side * 0.315;
    const skin = addMesh(root, new THREE.CylinderGeometry(0.55, 0.55, 0.025, 36), head, 0, 0.55, z, Math.PI / 2);
    skin.rotation.z = 0.01;
    addMesh(root, new THREE.TorusGeometry(0.555, 0.028, 8, 36), brass, 0, 0.55, z + side * 0.018);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = Math.cos(a) * 0.58, y = 0.55 + Math.sin(a) * 0.58;
      addMesh(root, new THREE.CylinderGeometry(0.018, 0.018, 0.08, 8), metal, x, y, z - side * 0.025, Math.PI / 2);
    }
  }
  addMesh(root, new THREE.TorusGeometry(0.1, 0.012, 6, 20), brass, 0, 0.55, 0.438);
  addMesh(root, new THREE.CircleGeometry(0.072, 20), black, 0, 0.55, 0.441);
  for (const x of [-0.36, 0.36]) {
    rod(root, [x, 0.14, 0.22], [x * 0.86, 0.52, 0.22], 0.024, metal);
    addMesh(root, new THREE.CylinderGeometry(0.045, 0.055, 0.055, 10), brass, x, 0.025, 0.2);
  }

  addVerticalDrum(-0.48, 0.83, 0.2, 0.25, 0.2); // snare
  addVerticalDrum(-0.27, 1.12, -0.26, 0.22, 0.22); // high tom
  addVerticalDrum(0.24, 1.12, -0.26, 0.24, 0.23); // mid tom
  addVerticalDrum(0.7, 0.48, 0.35, 0.31, 0.54, 10); // floor tom
  // Chrome rack arms suspend the mounted toms above the bass drum.
  for (const x of [-0.27, 0.24]) {
    rod(root, [x, 0.78, -0.1], [x, 1.04, -0.26], 0.023, metal);
    addMesh(root, new THREE.SphereGeometry(0.04, 8, 6), brass, x, 0.9, -0.18);
  }

  const cymbalProfile = [
    new THREE.Vector2(0, 0.015), new THREE.Vector2(0.09, 0.09),
    new THREE.Vector2(0.18, 0.055), new THREE.Vector2(0.38, 0.018),
    new THREE.Vector2(0.48, 0), new THREE.Vector2(0.5, -0.018),
  ];
  const cymbalGeometry = new THREE.LatheGeometry(cymbalProfile, 32);
  function cymbalStand(x, z, height, radius, double = false) {
    const footY = 0.045;
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.25;
      rod(root, [x, footY + 0.08, z], [x + Math.cos(a) * 0.34, 0.025, z + Math.sin(a) * 0.34], 0.023, metal);
      addMesh(root, new THREE.SphereGeometry(0.035, 8, 6), black, x + Math.cos(a) * 0.34, 0.025, z + Math.sin(a) * 0.34);
    }
    rod(root, [x, footY, z], [x, height + 0.08, z], 0.026, metal);
    addMesh(root, new THREE.CylinderGeometry(0.047, 0.047, 0.12, 10), black, x, height * 0.58, z);
    addMesh(root, new THREE.CylinderGeometry(0.045, 0.045, 0.055, 10), brass, x, height + 0.05, z);
    if (double) {
      const upper = addMesh(root, cymbalGeometry, brass, x, height, z);
      const lower = addMesh(root, cymbalGeometry, brass, x, height - 0.1, z);
      upper.scale.set(radius / 0.5, 1, radius / 0.5);
      lower.scale.set(radius / 0.5, 1, radius / 0.5);
    } else {
      const cymbal = addMesh(root, cymbalGeometry, brass, x, height, z);
      cymbal.scale.set(radius / 0.5, 1, radius / 0.5);
      cymbal.rotation.z = (x < 0 ? -1 : 1) * 0.035;
    }
    addMesh(root, new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), metal, x, height + 0.085, z);
    addMesh(root, new THREE.SphereGeometry(0.04, 8, 6), brass, x, height + 0.14, z);
  }
  cymbalStand(-0.5, 0.32, 1.18, 0.33, true); // hi-hat
  cymbalStand(-0.7, 0.3, 1.28, 0.45);
  cymbalStand(0.7, 0.28, 1.34, 0.47);
  cymbalStand(0.8, 0.4, 1.22, 0.34);
  // Hi-hat clutch, bass pedal and felt beater complete the lower hardware.
  rod(root, [-0.5, 0.02, -0.05], [-0.5, 0.42, -0.05], 0.03, black);
  addBox(root, black, -0.5, 0.035, 0.17, 0.34, 0.045, 0.3);
  addBox(root, metal, -0.5, 0.065, 0.04, 0.045, 0.055, 0.1);
  addBox(root, black, 0, 0.035, 0.64, 0.34, 0.045, 0.42);
  rod(root, [0, 0.08, 0.49], [0, 0.5, 0.3], 0.022, metal);
  rod(root, [0, 0.49, 0.3], [0, 0.49, 0.38], 0.028, black);
  addMesh(root, new THREE.SphereGeometry(0.065, 8, 6), felt, 0, 0.49, 0.4);

  // Round upholstered drum throne, chromed height post and tripod base.
  addMesh(root, new THREE.CylinderGeometry(0.37, 0.39, 0.13, 28), black, 0, 0.49, 1.15);
  addMesh(root, new THREE.CylinderGeometry(0.32, 0.32, 0.045, 24), felt, 0, 0.575, 1.15);
  rod(root, [0, 0.08, 1.15], [0, 0.45, 1.15], 0.043, metal);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2;
    rod(root, [0, 0.11, 1.15], [Math.cos(a) * 0.4, 0.025, 1.15 + Math.sin(a) * 0.4], 0.027, metal);
  }
  return root;
}
