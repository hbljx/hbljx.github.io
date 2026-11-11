// A voxel-style performer whose pose, garment colors and skirt shape animate
// through a piano-and-drums concert loop in one instanced draw.
import * as THREE from 'three';

const COLORS = {
  skin: 0xffd7bf, skinShade: 0xe7ad91, blush: 0xe88d91,
  hair: 0x52372f, hairShade: 0x70493c, hairLight: 0x9a674f, hairGlint: 0xc18b68,
  navy: 0x496383, navyLight: 0x7f95b1, navyDark: 0x303e55,
  white: 0xfff3e5, shirtShade: 0xe8dfd3, red: 0xb34d5b,
  skirt: 0x737b8d, skirtLight: 0xa4a8b2, plaid: 0xdfcfb9,
  tights: 0x292c35, tightsSheen: 0x50545e, shoe: 0x39373e, sole: 0x242329,
  gold: 0xe0bf83, eye: 0x392b2b, iris: 0x60443a, pupil: 0x17191e,
};

const PIANIST = { x: 25.1, z: 5.38, yaw: 0 };

export function createMusicPerformer() {
  const root = new THREE.Group();
  root.name = 'music-hall-pianist';
  root.position.set(PIANIST.x, 0, PIANIST.z);
  root.rotation.y = PIANIST.yaw;

  const parts = [];
  const part = (x, y, z, w, h, d, color, limb = 0, rx = 0, ry = 0, rz = 0) => {
    parts.push({ x, y, z, w, h, d, color, limb, rx, ry, rz });
    return parts.length - 1;
  };
  const segment = (a, b, width, thickness, color, limb = 0) => {
    const dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.hypot(dy, dz);
    return part((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
      width, thickness, length, color, limb, Math.atan2(-dy, dz));
  };

  // A neat, upright seated posture: a fitted navy blazer over a white blouse.
  const garmentStart = parts.length;
  part(0, 0.91, 0, 0.43, 0.52, 0.27, COLORS.navy, 1);
  part(0, 0.96, 0.143, 0.19, 0.38, 0.025, COLORS.white, 1);
  for (const side of [-1, 1]) {
    part(side * 0.12, 0.91, 0.145, 0.19, 0.47, 0.045, COLORS.navy, 1);
    part(side * 0.12, 0.91, 0.172, 0.035, 0.4, 0.012, COLORS.navyLight, 1, 0, 0, side * -0.08);
  }
  part(0, 1.16, 0.01, 0.16, 0.13, 0.17, COLORS.skinShade, 1);
  part(0, 1.16, 0.11, 0.12, 0.07, 0.035, COLORS.white, 1);
  // Folded collar and a small checked bow tie.
  part(-0.075, 1.13, 0.157, 0.105, 0.075, 0.04, COLORS.white, 1, 0, 0, -0.16);
  part(0.075, 1.13, 0.157, 0.105, 0.075, 0.04, COLORS.white, 1, 0, 0, 0.16);
  part(-0.055, 1.07, 0.183, 0.105, 0.075, 0.04, COLORS.red, 1, 0, 0, -0.3);
  part(0.055, 1.07, 0.183, 0.105, 0.075, 0.04, COLORS.red, 1, 0, 0, 0.3);
  part(0, 1.07, 0.209, 0.055, 0.055, 0.035, COLORS.gold, 1);
  for (const y of [0.98, 0.86, 0.74]) part(0.018, y, 0.174, 0.027, 0.027, 0.018, COLORS.gold, 1);
  // School crest, pocket piping and tiny stitched badge.
  part(-0.14, 1.045, 0.177, 0.1, 0.012, 0.018, COLORS.navyLight, 1);
  part(-0.14, 1.075, 0.184, 0.055, 0.055, 0.018, COLORS.gold, 1);
  part(-0.14, 1.075, 0.197, 0.025, 0.025, 0.012, COLORS.red, 1);
  part(0, 0.687, 0, 0.42, 0.11, 0.29, COLORS.navyDark, 1);

  // Pleated, knee-length plaid skirt with fine crossing lines and a belt.
  const skirtStart = parts.length;
  const skirtBody = part(0, 0.59, -0.015, 0.48, 0.22, 0.36, COLORS.skirt, 1);
  const skirtWaist = part(0, 0.704, -0.015, 0.43, 0.045, 0.32, COLORS.navyDark, 1);
  const beltLine = part(0, 0.704, 0.15, 0.44, 0.022, 0.025, COLORS.gold, 1);
  parts[skirtBody].dress = { y: 0.35, z: -0.02, w: 0.66, h: 0.68, d: 0.48, color: 0x24262e };
  parts[skirtWaist].dress = { y: 0.69, z: -0.015, w: 0.47, h: 0.055, d: 0.35, color: 0x30323a };
  parts[beltLine].dress = { y: 0.67, z: 0.22, w: 0.58, h: 0.018, d: 0.025, color: 0x777980 };
  for (let i = 0; i < 9; i++) {
    const x = -0.205 + i * 0.051;
    const pleat = part(x, 0.59, 0.174, 0.012, 0.17, 0.014, i % 2 ? COLORS.plaid : COLORS.skirtLight, 1);
    parts[pleat].dress = { y: 0.34, z: 0.218, h: 0.61, d: 0.018, color: i % 2 ? 0x44464f : 0x32343c };
  }
  for (let i = 0; i < 5; i++) {
    const y = 0.52 + i * 0.034;
    const check = part(0, y, 0.179, 0.42, 0.009, 0.012, i % 2 ? COLORS.red : COLORS.plaid, 1);
    parts[check].dress = { y: 0.09 + i * 0.105, z: 0.232, w: 0.62, h: 0.008, d: 0.012, color: i % 2 ? 0x30323a : 0x656873 };
  }
  for (const x of [-0.15, -0.05, 0.05, 0.15]) {
    const stripe = part(x, 0.59, 0.182, 0.009, 0.17, 0.01, COLORS.red, 1);
    parts[stripe].dress = { y: 0.34, z: 0.235, h: 0.6, d: 0.012, color: 0x4a4c55 };
  }
  // Small pleat shadows along the hem give the skirt its folded silhouette.
  for (let i = 0; i < 7; i++) {
    const x = -0.18 + i * 0.06;
    const hem = part(x, 0.49, 0.155, 0.025, 0.045, 0.035, COLORS.skirtLight, 1, 0.12, 0, 0);
    parts[hem].dress = { y: 0.025, z: 0.21, h: 0.035, d: 0.045, color: 0x777a84 };
  }
  const drapeLeft = part(-0.16, 0.52, -0.2, 0.12, 0.16, 0.04, COLORS.navyDark, 30);
  const drapeRight = part(0.16, 0.52, -0.2, 0.12, 0.16, 0.04, COLORS.navyDark, 31);
  parts[drapeLeft].costume = parts[drapeRight].costume = true;
  parts[drapeLeft].dress = { x: -0.19, y: 0.34, z: -0.23, w: 0.22, h: 0.66, d: 0.05, color: 0x292b33 };
  parts[drapeRight].dress = { x: 0.19, y: 0.34, z: -0.23, w: 0.22, h: 0.66, d: 0.05, color: 0x292b33 };
  const skirtEnd = parts.length;
  for (let i = skirtStart; i < skirtEnd; i++) parts[i].costume = true;

  // Opaque black tights and polished loafers. Knees bend naturally over the
  // seat; the toes reach forward toward the piano pedals.
  for (const side of [-1, 1]) {
    const x = side * 0.115;
    const hipTag = side < 0 ? 23 : 24, kneeTag = side < 0 ? 25 : 26, footTag = side < 0 ? 21 : 22;
    segment([x, 0.56, 0.005], [x, 0.41, 0.34], 0.17, 0.15, COLORS.tights, hipTag);
    segment([x, 0.41, 0.34], [x, 0.12, 0.52], 0.12, 0.13, COLORS.tights, kneeTag);
    part(x + side * 0.055, 0.48, 0.24, 0.014, 0.12, 0.018, COLORS.tightsSheen, hipTag, 0.42);
    part(x + side * 0.04, 0.25, 0.45, 0.012, 0.11, 0.016, COLORS.tightsSheen, kneeTag, 1.02);
    part(x, 0.045, 0.66, 0.15, 0.085, 0.28, COLORS.shoe, footTag);
    part(x, 0.014, 0.66, 0.155, 0.025, 0.285, COLORS.sole, footTag);
    part(x, 0.09, 0.70, 0.095, 0.025, 0.095, COLORS.gold, footTag);
    part(x, 0.104, 0.70, 0.045, 0.012, 0.055, COLORS.shoe, footTag);
  }
  const garmentEnd = parts.length;
  for (let i = garmentStart; i < garmentEnd; i++) parts[i].costume = true;

  // Head and face: warm skin, layered eyes, catchlights, lashes and a soft smile.
  part(0, 1.425, 0, 0.37, 0.4, 0.34, COLORS.skin, 2);
  part(0, 1.217, 0.025, 0.12, 0.09, 0.12, COLORS.skinShade, 2);
  for (const side of [-1, 1]) {
    part(side * 0.194, 1.425, 0.015, 0.055, 0.1, 0.11, COLORS.skinShade, 2);
    part(side * 0.095, 1.44, 0.176, 0.09, 0.105, 0.025, COLORS.white, 2);
    part(side * 0.095, 1.44, 0.193, 0.048, 0.074, 0.018, COLORS.iris, 2);
    part(side * 0.095, 1.44, 0.205, 0.026, 0.056, 0.014, COLORS.pupil, 2);
    part(side * 0.079, 1.46, 0.215, 0.014, 0.018, 0.01, COLORS.white, 2);
    part(side * 0.095, 1.504, 0.185, 0.105, 0.022, 0.03, COLORS.hair, 2, 0, 0, side * 0.06);
    part(side * 0.13, 1.38, 0.173, 0.055, 0.025, 0.016, COLORS.blush, 2);
  }
  part(0, 1.397, 0.183, 0.055, 0.045, 0.035, COLORS.skinShade, 2);
  part(0, 1.345, 0.181, 0.075, 0.016, 0.025, COLORS.red, 2);
  part(-0.12, 1.32, 0.04, 0.035, 0.035, 0.025, COLORS.skinShade, 2);
  part(0.12, 1.32, 0.04, 0.035, 0.035, 0.025, COLORS.skinShade, 2);

  // Long, glossy chestnut hair: a layered back fall, side locks, fringe and
  // fine warm highlights; the lower locks sway slightly as she performs.
  part(0, 1.63, -0.035, 0.4, 0.17, 0.37, COLORS.hair, 2);
  part(0, 1.31, -0.205, 0.43, 0.66, 0.16, COLORS.hair, 2);
  part(-0.11, 1.18, -0.235, 0.15, 0.64, 0.14, COLORS.hairShade, 9, 0.015);
  part(0.11, 1.18, -0.235, 0.15, 0.64, 0.14, COLORS.hairShade, 10, -0.015);
  for (const side of [-1, 1]) {
    part(side * 0.19, 1.395, 0.035, 0.09, 0.43, 0.14, COLORS.hair, 2, 0, 0, side * 0.07);
    part(side * 0.19, 1.16, 0.015, 0.075, 0.24, 0.12, COLORS.hairShade, side < 0 ? 9 : 10);
    part(side * 0.08, 1.63, 0.14, 0.2, 0.1, 0.14, COLORS.hairShade, 2, 0, 0, side * -0.08);
    part(side * 0.16, 1.59, 0.15, 0.12, 0.09, 0.12, COLORS.hairLight, 2, 0, 0, side * 0.18);
    part(side * 0.215, 1.39, 0.118, 0.018, 0.27, 0.025, COLORS.hairGlint, 2);
  }
  part(-0.015, 1.61, 0.171, 0.12, 0.095, 0.07, COLORS.hair, 2, 0, 0, -0.12);
  part(0.095, 1.595, 0.17, 0.12, 0.075, 0.07, COLORS.hairShade, 2, 0, 0, 0.22);
  part(-0.2, 1.56, 0.11, 0.06, 0.08, 0.07, COLORS.gold, 2, 0, 0, -0.35);
  part(-0.235, 1.56, 0.1, 0.095, 0.035, 0.035, COLORS.red, 2, 0, 0, 0.25);

  // Piano posture: shoulders relaxed, rounded elbows, low wrists and curved
  // fingers resting over the keys. Tags let each joint move independently.
  for (const side of [-1, 1]) {
    const upperTag = side < 0 ? 3 : 6, lowerTag = side < 0 ? 4 : 7, handTag = side < 0 ? 5 : 8;
    const shoulder = [side * 0.21, 0.96, 0.025];
    const elbow = [side * 0.28, 0.91, 0.22];
    const wrist = [side * 0.34, 0.835, 0.36];
    const upperEnd = elbow;
    parts[segment(shoulder, upperEnd, 0.155, 0.15, COLORS.navy, upperTag)].costume = true;
    parts[part(shoulder[0], shoulder[1] - 0.04, shoulder[2] + 0.065, 0.16, 0.025, 0.035, COLORS.navyLight, upperTag, 0.65)].costume = true;
    parts[segment(elbow, wrist, 0.12, 0.13, COLORS.navy, lowerTag)].costume = true;
    const cuff = [wrist[0], wrist[1] + 0.045, wrist[2] - 0.045];
    parts[part(cuff[0], cuff[1], cuff[2], 0.13, 0.055, 0.07, COLORS.white, lowerTag, 0.95)].costume = true;
    parts[part(cuff[0], cuff[1] - 0.025, cuff[2], 0.132, 0.016, 0.073, COLORS.gold, lowerTag, 0.95)].costume = true;
    const palm = part(wrist[0], wrist[1] - 0.02, wrist[2] + 0.035, 0.14, 0.065, 0.15, COLORS.skin, handTag, 0.12);
    parts[palm].palm = true;
    parts[palm].handSide = side < 0 ? 0 : 1;
    for (let f = 0; f < 5; f++) {
      const fingerX = wrist[0] + (f - 2) * 0.03;
      const start = [fingerX, wrist[1] - 0.025, wrist[2] + 0.06];
      const end = [fingerX, start[1] - 0.125, start[2] + 0.07];
      const tag = (side < 0 ? 11 : 16) + f;
      const finger = segment(start, end, 0.022, 0.023, COLORS.skin, tag);
      parts[finger].grip = true;
      parts[finger].finger = true;
      const nail = part(fingerX, end[1] - 0.006, end[2], 0.013, 0.012, 0.018, COLORS.white, tag, Math.atan2(start[1] - end[1], end[2] - start[2]));
      parts[nail].grip = true;
      parts[nail].finger = true;
    }
    // A thumb reaches in toward the inner keys; tiny cuff buttons finish the sleeve.
    const thumbX = wrist[0] + side * -0.07;
    const thumb = segment([thumbX, wrist[1] - 0.035, wrist[2] + 0.025],
      [thumbX, wrist[1] - 0.095, wrist[2] + 0.09], 0.026, 0.026, COLORS.skin, handTag);
    parts[thumb].grip = true;
    parts[thumb].finger = true;
    parts[part(side * 0.205, 0.76, 0.42, 0.025, 0.025, 0.025, COLORS.gold, lowerTag)].costume = true;
    const stick = part(wrist[0], wrist[1] - 0.04, wrist[2] + 0.22, 0.016, 0.016, 0.46, 0xb08b59, handTag, 0.32);
    parts[stick].drumstick = true;
    parts[stick].stickHand = side < 0 ? 0 : 1;
  }

  // In the drumming pose, replace the open piano fingers with small curled
  // finger pads that sit across each moving stick, plus a thumb over the grip.
  for (let hand = 0; hand < 2; hand++) {
    for (let finger = 0; finger < 4; finger++) {
      const detail = part(0, 0, 0, finger === 3 ? 0.066 : 0.09, 0.026, 0.044, COLORS.skin);
      parts[detail].dynamicGrip = true;
      parts[detail].gripHand = hand;
      parts[detail].gripFinger = finger;
    }
  }

  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    // Per-part colors come from InstancedMesh.instanceColor below. This box
    // geometry has no vertex color attribute, so vertexColors would multiply
    // those instance colors by an empty attribute and render the performer black.
    new THREE.MeshPhongMaterial({ shininess: 28, specular: 0x434651, emissive: 0x28262e, emissiveIntensity: 0.32 }),
    parts.length,
  );
  mesh.name = 'pianist-voxel-detail';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4();
  const joints = Array.from({ length: 32 }, () => new THREE.Matrix4());
  const pivots = Array.from({ length: 32 }, () => new THREE.Vector3());
  const euler = new THREE.Euler(), translate = new THREE.Matrix4(), rotation = new THREE.Matrix4(), inverse = new THREE.Matrix4();
  const setPivot = (index, x, y, z) => pivots[index].set(x, y, z);
  setPivot(1, 0, 0.68, 0); setPivot(2, 0, 1.21, 0);
  for (const side of [-1, 1]) {
    const upper = side < 0 ? 3 : 6, lower = side < 0 ? 4 : 7, wristTag = side < 0 ? 5 : 8;
    const shoulderX = side * 0.21, elbowX = side * 0.28, wristX = side * 0.34;
    const elbowY = 0.91, elbowZ = 0.22, wristY = 0.835, wristZ = 0.36;
    setPivot(upper, shoulderX, 0.96, 0.025); setPivot(lower, elbowX, elbowY, elbowZ); setPivot(wristTag, wristX, wristY, wristZ);
    setPivot(side < 0 ? 9 : 10, side * 0.11, 1.47, -0.2);
    setPivot(side < 0 ? 21 : 22, side * 0.115, 0.12, 0.52);
    setPivot(side < 0 ? 23 : 24, side * 0.115, 0.56, 0.005);
    setPivot(side < 0 ? 25 : 26, side * 0.115, 0.41, 0.34);
    for (let f = 0; f < 5; f++) {
      const x = wristX + (f - 2) * 0.03;
      const startY = wristY - 0.025, startZ = wristZ + 0.06;
      setPivot((side < 0 ? 11 : 16) + f, x, startY, startZ);
    }
  }
  setPivot(30, -0.16, 0.62, -0.2); setPivot(31, 0.16, 0.62, -0.2);

  const chains = Array.from({ length: 32 }, () => null);
  chains[1] = [1]; chains[2] = [2];
  chains[3] = [3]; chains[4] = [3, 4]; chains[5] = [3, 4, 5];
  chains[6] = [6]; chains[7] = [6, 7]; chains[8] = [6, 7, 8];
  chains[9] = [9]; chains[10] = [10];
  for (let tag = 11; tag <= 15; tag++) chains[tag] = [3, 4, 5, tag];
  for (let tag = 16; tag <= 20; tag++) chains[tag] = [6, 7, 8, tag];
  chains[21] = [23, 25, 21]; chains[22] = [24, 26, 22];
  chains[23] = [23]; chains[24] = [24]; chains[25] = [23, 25]; chains[26] = [24, 26];
  chains[30] = [30]; chains[31] = [31];
  const dressPalette = {
    [COLORS.navy]: 0x17181e, [COLORS.navyLight]: 0x23242a, [COLORS.navyDark]: 0x121319,
    [COLORS.white]: 0x2b2c32, [COLORS.shirtShade]: 0x24252b, [COLORS.red]: 0x1b1c22,
    [COLORS.gold]: 0x625d5d, [COLORS.skirt]: 0x17181e, [COLORS.skirtLight]: 0x292a31,
    [COLORS.plaid]: 0x34353c, [COLORS.tights]: 0x21232a, [COLORS.tightsSheen]: 0x4a4c55, [COLORS.shoe]: 0x2d2e35,
    [COLORS.sole]: 0x101115,
  };
  const color = new THREE.Color();
  parts.forEach((p, i) => {
    p.chain = chains[p.limb];
    p.uniformColor = new THREE.Color(p.color);
    p.dressColor = new THREE.Color(p.dress?.color ?? dressPalette[p.color] ?? p.color);
    mesh.setColorAt(i, p.uniformColor);
  });
  mesh.instanceColor.needsUpdate = true;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.05, 0), 2.2);
  root.add(mesh);

  let phase = 0, state = 'piano', stateTime = 0, outfit = 0, lastOutfit = -1;
  const pianoX = PIANIST.x, drumX = 25.1, homeZ = PIANIST.z, drumZ = 11.45, aisleX = 27.8;
  const drumTargets = [
    new THREE.Vector3(-0.7, 0.776, 0.8),
    new THREE.Vector3(0.48, 0.956, 0.95),
  ];
  const cymbalTargets = [
    new THREE.Vector3(-0.7, 1.34, 0.87),
    new THREE.Vector3(0.7, 1.28, 0.85),
  ];
  const handGrips = [new THREE.Vector3(), new THREE.Vector3()];
  const gripTargets = [new THREE.Vector3(), new THREE.Vector3()];
  const gripDirections = [new THREE.Vector3(), new THREE.Vector3()];
  const gripAcross = [new THREE.Vector3(), new THREE.Vector3()];
  const gripUps = [new THREE.Vector3(), new THREE.Vector3()];
  const gripBases = [new THREE.Matrix4(), new THREE.Matrix4()];
  const stickForward = new THREE.Vector3(0, 0, 1);
  const routeToDrums = [
    { x: aisleX, z: homeZ, yaw: Math.PI / 2 },
    { x: aisleX, z: drumZ, yaw: 0 },
    { x: drumX, z: drumZ, yaw: -Math.PI / 2 },
  ];
  const routeToPiano = [
    { x: aisleX, z: drumZ, yaw: Math.PI / 2 },
    { x: aisleX, z: homeZ, yaw: -Math.PI },
    { x: pianoX, z: homeZ, yaw: -Math.PI / 2 },
  ];
  const clamp01 = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const mixAngle = (a, b, t) => {
    const delta = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    return a + delta * t;
  };
  function routePose(start, startYaw, points, progress) {
    const segments = [];
    let total = 0, from = start;
    for (const point of points) {
      const length = Math.hypot(point.x - from.x, point.z - from.z);
      segments.push({ from, to: point, length }); total += length; from = point;
    }
    let distance = clamp01(progress) * total, previousYaw = startYaw;
    for (const segment of segments) {
      const u = segment.length ? Math.min(1, distance / segment.length) : 1;
      if (distance <= segment.length) {
        const turn = smooth(clamp01(u / 0.22));
        return {
          x: mix(segment.from.x, segment.to.x, smooth(u)),
          z: mix(segment.from.z, segment.to.z, smooth(u)),
          yaw: mixAngle(previousYaw, segment.to.yaw, turn),
        };
      }
      distance -= segment.length;
      previousYaw = segment.to.yaw;
    }
    const last = points[points.length - 1];
    return { x: last.x, z: last.z, yaw: last.yaw };
  }
  function duration(name) {
    switch (name) {
      case 'piano': case 'drums': return 60;
      case 'standPiano': case 'sitDrums': case 'standDrums': case 'sitPiano': return 0.65;
      case 'turnToDrums': case 'faceDrums': return 0.5;
      case 'walkToDrums': case 'walkToPiano': return 5.8;
      case 'changeToDress': case 'changeToUniform': return 2.4;
      default: return 60;
    }
  }
  function next(name) {
    switch (name) {
      case 'piano': return 'standPiano';
      case 'standPiano': return 'turnToDrums';
      case 'turnToDrums': return 'walkToDrums';
      case 'walkToDrums': return 'faceDrums';
      case 'faceDrums': return 'sitDrums';
      case 'sitDrums': return 'changeToDress';
      case 'changeToDress': return 'drums';
      case 'drums': return 'standDrums';
      case 'standDrums': return 'walkToPiano';
      case 'walkToPiano': return 'sitPiano';
      case 'sitPiano': return 'changeToUniform';
      case 'changeToUniform': return 'piano';
      default: return 'piano';
    }
  }
  function pivotMatrix(out, pivot, rx, ry = 0, rz = 0) {
    translate.makeTranslation(pivot.x, pivot.y, pivot.z);
    euler.set(rx, ry, rz);
    rotation.makeRotationFromEuler(euler);
    inverse.makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    out.copy(translate).multiply(rotation).multiply(inverse);
  }
  function update(dt) {
    phase += dt; stateTime += dt;
    let hops = 0;
    while (stateTime >= duration(state) && hops++ < 24) {
      stateTime -= duration(state); state = next(state);
    }
    const t = stateTime / duration(state);
    const walking = state === 'walkToDrums' || state === 'walkToPiano';
    const cymbalHits = [0, 0];
    let walkBlend = 0, restBlend = 0, drumMode = state === 'drums', yaw = PIANIST.yaw;
    root.position.z = homeZ; root.position.y = 0;
    switch (state) {
      case 'standPiano':
        walkBlend = smooth(t); restBlend = walkBlend; root.position.x = pianoX; break;
      case 'turnToDrums':
        walkBlend = restBlend = 1; yaw = mixAngle(PIANIST.yaw, Math.PI / 2, smooth(t)); root.position.x = pianoX; break;
      case 'walkToDrums':
        {
          walkBlend = restBlend = 1;
          const pose = routePose({ x: pianoX, z: homeZ }, Math.PI / 2, routeToDrums, t);
          root.position.x = pose.x; root.position.z = pose.z; yaw = pose.yaw;
        }
        break;
      case 'faceDrums':
        walkBlend = restBlend = 1; yaw = mixAngle(-Math.PI / 2, -Math.PI, smooth(t)); root.position.x = drumX; root.position.z = drumZ; break;
      case 'sitDrums':
        walkBlend = restBlend = 1 - smooth(t); yaw = -Math.PI; root.position.x = drumX; root.position.z = drumZ; break;
      case 'changeToDress':
        outfit = smooth(t); restBlend = 1; root.position.x = drumX; root.position.z = drumZ; yaw = -Math.PI; break;
      case 'drums':
        outfit = 1; root.position.x = drumX; root.position.z = drumZ; yaw = -Math.PI; break;
      case 'standDrums':
        outfit = 1; walkBlend = restBlend = smooth(t); root.position.x = drumX; root.position.z = drumZ; yaw = -Math.PI; break;
      case 'walkToPiano':
        {
          outfit = 1; walkBlend = restBlend = 1;
          const pose = routePose({ x: drumX, z: drumZ }, -Math.PI, routeToPiano, t);
          root.position.x = pose.x; root.position.z = pose.z; yaw = pose.yaw;
        }
        break;
      case 'sitPiano':
        outfit = 1; walkBlend = restBlend = 1 - smooth(t); root.position.x = pianoX; root.position.z = homeZ; yaw = mixAngle(-Math.PI / 2, PIANIST.yaw, smooth(t)); break;
      case 'changeToUniform':
        outfit = 1 - smooth(t); restBlend = 1; root.position.x = pianoX; root.position.z = homeZ; yaw = PIANIST.yaw; break;
      default:
        outfit = 0; root.position.x = pianoX; root.position.z = homeZ; yaw = PIANIST.yaw; break;
    }
    root.position.y = 0.16 * walkBlend + (walking ? 0.025 * (1 - Math.cos(phase * 14.6)) : 0);
    root.rotation.y = yaw;
    pivotMatrix(joints[1], pivots[1], (walking ? 0.045 : 0.018) * Math.sin(phase * 1.15));
    pivotMatrix(joints[2], pivots[2], 0.11 + 0.025 * Math.sin(phase * 1.7), 0.025 * Math.sin(phase * 0.8));
    for (let side = -1; side <= 1; side += 2) {
      const upper = side < 0 ? 3 : 6, lower = side < 0 ? 4 : 7, wristTag = side < 0 ? 5 : 8;
      const offset = side < 0 ? 0 : Math.PI;
      let upperAngle = 0.018 * Math.sin(phase * 2.2 + offset), elbowAngle = 0.055 * Math.sin(phase * 6.1 + offset);
      let wristAngle = 0.08 * Math.sin(phase * 8.2 + offset), upperYaw = 0;
      if (drumMode) {
        const strike = Math.max(0, Math.sin(phase * 5.2 + offset));
        const cymbalWave = Math.max(0, Math.sin(phase * 0.78 + (side < 0 ? 0 : Math.PI)));
        const cymbal = Math.pow(cymbalWave, 7);
        cymbalHits[side < 0 ? 0 : 1] = cymbal;
        upperAngle = mix(-0.78 + 0.3 * strike, -1.48 + 0.24 * strike, cymbal);
        elbowAngle = mix(-0.4 + 0.22 * strike, -0.62 + 0.18 * strike, cymbal);
        upperYaw = side * mix(0.05, 0.72, cymbal);
        wristAngle = 0.1 * Math.sin(phase * 8.4 + offset) + cymbal * (0.08 + 0.13 * strike);
      } else if (walking) {
        // Arms swing opposite the legs instead of staying held out in front.
        const gait = Math.sin(phase * 7.3 + (side < 0 ? Math.PI : 0));
        upperAngle = 0.48 + 0.34 * gait;
        elbowAngle = -0.12 + 0.2 * Math.max(0, -gait);
        wristAngle = 0.08 * Math.sin(phase * 7.3 + (side < 0 ? Math.PI : 0.7));
      } else if (restBlend > 0) {
        upperAngle += 0.76 * restBlend + 0.12 * restBlend * Math.sin(phase * 6 + offset);
        elbowAngle -= 0.25 * restBlend;
        wristAngle *= 1 - restBlend;
      }
      pivotMatrix(joints[upper], pivots[upper], upperAngle, upperYaw, side * 0.012 * Math.sin(phase * 1.4));
      pivotMatrix(joints[lower], pivots[lower], elbowAngle);
      pivotMatrix(joints[wristTag], pivots[wristTag], wristAngle);
      const hairTag = side < 0 ? 9 : 10;
      pivotMatrix(joints[hairTag], pivots[hairTag], 0.018 * Math.sin(phase * 1.3 + offset), 0.035 * Math.sin(phase * 0.9 + offset));
      for (let f = 0; f < 5; f++) {
        const tag = (side < 0 ? 11 : 16) + f;
        const fingerAngle = drumMode
          ? 0.38 + 0.1 * Math.sin(phase * 8 + f * 0.8 + offset)
          : walking ? 0.06 * Math.sin(phase * 7.3 + f * 0.4 + offset)
            : 0.13 * Math.sin(phase * 8.8 + f * 0.82 + offset);
        pivotMatrix(joints[tag], pivots[tag], fingerAngle);
      }
      const footTag = side < 0 ? 21 : 22;
      const hipTag = side < 0 ? 23 : 24, kneeTag = side < 0 ? 25 : 26;
      const step = Math.sin(phase * 7.3 + (side > 0 ? Math.PI : 0));
      const hipAngle = walkBlend * (1.15 + step * 0.43);
      const kneeAngle = walkBlend * (-0.61 + Math.max(0, step) * 0.82);
      const footAngle = walkBlend * (-0.54 - step * 0.31) + (drumMode ? (side < 0 ? 0.15 : 0.2) * Math.sin(phase * (side < 0 ? 5.9 : 7.4) + offset) : state === 'piano' && side > 0 ? 0.035 * Math.sin(phase * 2.1) : 0);
      pivotMatrix(joints[hipTag], pivots[hipTag], hipAngle);
      pivotMatrix(joints[kneeTag], pivots[kneeTag], kneeAngle);
      pivotMatrix(joints[footTag], pivots[footTag], footAngle);
    }
    for (let side = -1; side <= 1; side += 2) {
      const tag = side < 0 ? 30 : 31;
      pivotMatrix(joints[tag], pivots[tag], 0.055 * Math.sin(phase * 1.4 + side), 0.13 * Math.sin(phase * 1.1 + side));
    }
    if (Math.abs(outfit - lastOutfit) > 0.0005) {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!p.costume) continue;
        color.copy(p.uniformColor).lerp(p.dressColor, outfit);
        mesh.setColorAt(i, color);
      }
      mesh.instanceColor.needsUpdate = true;
      lastOutfit = outfit;
    }
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const dress = p.dress, blend = p.costume ? outfit : 0;
      dummy.position.set(mix(p.x, dress?.x ?? p.x, blend), mix(p.y, dress?.y ?? p.y, blend), mix(p.z, dress?.z ?? p.z, blend));
      if (walking && (p.limb === 21 || p.limb === 22)) {
        const footPhase = phase * 7.3 + (p.limb === 22 ? Math.PI : 0);
        dummy.position.y += Math.max(0, Math.sin(footPhase)) * 0.065;
      }
      if (drumMode && p.grip) dummy.position.y += 0.035;
      dummy.scale.set(mix(p.w, dress?.w ?? p.w, blend), mix(p.h, dress?.h ?? p.h, blend), mix(p.d, dress?.d ?? p.d, blend));
      if (p.drumstick && !drumMode) dummy.scale.set(0, 0, 0);
      if (drumMode && p.finger) dummy.scale.set(0, 0, 0);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      if (p.drumstick && drumMode) dummy.rotation.x = mix(0.32, 0.08, cymbalHits[p.stickHand] || 0);
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      if (p.chain) for (let j = p.chain.length - 1; j >= 0; j--) matrix.premultiply(joints[p.chain[j]]);
      if (p.palm) handGrips[p.handSide].setFromMatrixPosition(matrix);
      if (p.dynamicGrip) {
        if (!drumMode) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          continue;
        }
        const side = p.gripHand;
        const target = gripTargets[side].copy(drumTargets[side]).lerp(cymbalTargets[side], cymbalHits[side]);
        const grip = handGrips[side];
        const direction = gripDirections[side].copy(target).sub(grip).normalize();
        const across = gripAcross[side].set(direction.z, 0, -direction.x).normalize();
        const up = gripUps[side].crossVectors(direction, across).normalize();
        const along = [0.075, 0.14, 0.205, 0.105][p.gripFinger];
        const acrossOffset = p.gripFinger === 3 ? 0.035 : 0;
        const upOffset = p.gripFinger === 3 ? 0.03 : 0.014;
        dummy.position.copy(grip).addScaledVector(direction, along)
          .addScaledVector(across, acrossOffset).addScaledVector(up, upOffset);
        dummy.scale.set(p.gripFinger === 3 ? 0.066 : 0.09, 0.026, 0.044);
        dummy.quaternion.setFromRotationMatrix(gripBases[side].makeBasis(across, up, direction));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      if (p.drumstick && drumMode) {
        const side = p.stickHand;
        const target = gripTargets[side].copy(drumTargets[side]).lerp(cymbalTargets[side], cymbalHits[side]);
        const grip = handGrips[side];
        const direction = gripDirections[side].copy(target).sub(grip);
        const stickLength = direction.length();
        dummy.position.copy(grip).add(target).multiplyScalar(0.5);
        dummy.scale.set(0.016, 0.016, stickLength);
        dummy.rotation.set(0, 0, 0);
        dummy.quaternion.setFromUnitVectors(stickForward, direction.normalize());
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group: root, update };
}
