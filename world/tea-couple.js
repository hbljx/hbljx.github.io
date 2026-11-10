import * as THREE from 'three';
import { registerActor } from '@engine/world/actor-collision.js';

const FLOOR = 11;
const TABLE = { x: -11, z: -1.5 };
const MALE_SEAT = { x: -11, z: .45 };
const FEMALE_SEAT = { x: -11, z: -3.45 };
const KETTLE_SPOT = { x: -11.3, z: -.42 };
const MALE_TO_KETTLE = { points: [MALE_SEAT, KETTLE_SPOT], length: 0 };
const MALE_FROM_KETTLE = { points: [KETTLE_SPOT, MALE_SEAT], length: 0 };
const MALE_TO_MEET = { points: [MALE_SEAT, { x: -13.3, z: .45 }, { x: -14, z: -1.5 }], length: 0 };
const FEMALE_TO_MEET = { points: [FEMALE_SEAT, { x: -13.3, z: -3.45 }, { x: -13.25, z: -1.5 }], length: 0 };
const MALE_FROM_MEET = { points: [...MALE_TO_MEET.points].reverse(), length: 0 };
const FEMALE_FROM_MEET = { points: [...FEMALE_TO_MEET.points].reverse(), length: 0 };
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

function routeLength(route) {
  for (let i = 1; i < route.points.length; i++) route.length += Math.hypot(route.points[i].x - route.points[i - 1].x, route.points[i].z - route.points[i - 1].z);
  return route;
}

function makePerson(scene, nav, woman) {
  const colors = woman ? {
    skin: 0xf0c7aa, skinShade: 0xd99c80, hair: 0x382820, hairHi: 0x604331,
    top: 0xe9ddc8, topShade: 0xc4b39e, topLight: 0xf5ede0, accent: 0x73917f,
    skirt: 0x536e64, skirtShade: 0x344c45, skirtLight: 0x91aa94,
    shoes: 0x523c3a, sole: 0x27272c, eyes: 0x292b31, brow: 0x514039,
    lip: 0x9e5e60, metal: 0xd7b96f,
  } : {
    skin: 0xd8aa89, skinShade: 0xc28d70, hair: 0x292724, hairHi: 0x514a40,
    top: 0x416b6a, topShade: 0x294d50, topLight: 0x7c9d91, accent: 0xe4d6bd,
    skirt: 0x3e4651, skirtShade: 0x2a3039, skirtLight: 0x76808a,
    shoes: 0x473d35, sole: 0x26282a, eyes: 0x26323a, brow: 0x352f2b,
    lip: 0x965b54, metal: 0xc7a66a,
  };
  const parts = [];
  const add = (x, y, z, w, h, d, color, group = 'body', rotation = [0, 0, 0]) => {
    const index = parts.length;
    parts.push({ x, y, z, w, h, d, color, group, rotation });
    return index;
  };
  const moving = (color, w, d) => add(0, 0, 0, w, .2, d, color, 'moving');
  const addArm = side => ({
    upper: moving(colors.topShade, .145, .15), lower: moving(colors.skin, .095, .10),
    cuff: moving(woman ? colors.accent : colors.topLight, .125, .12),
    hand: moving(colors.skin, .105, .09), thumb: moving(colors.skinShade, .07, .07), side,
  });
  const addLeg = side => ({
    upper: moving(woman ? colors.skirt : colors.skirt, .16, .18),
    lower: moving(colors.skirt, .13, .145), shoe: moving(colors.shoes, .13, .27), side,
  });

  // A tailored jacket and a high-waisted skirt / pressed trousers, with visible
  // collar, piping, buttons, pockets, seams, cuffs and shoes.
  add(0, 1.105, 0, .43, .57, .27, colors.top);
  add(0, 1.105, .144, .125, .48, .025, woman ? colors.topLight : colors.accent);
  add(-.09, 1.375, .12, .16, .095, .05, colors.topLight, 'body', [0, 0, -.28]);
  add(.09, 1.375, .12, .16, .095, .05, colors.topLight, 'body', [0, 0, .28]);
  add(0, 1.412, 0, .13, .13, .14, colors.skinShade);
  add(-.228, 1.115, 0, .035, .45, .28, colors.topShade);
  add(.228, 1.115, 0, .035, .45, .28, colors.topShade);
  add(0, .82, 0, .39, .095, .27, woman ? colors.accent : 0x4a3931);
  if (woman) {
    add(0, .48, -.008, .51, .62, .36, colors.skirt);
    add(0, .205, 0, .52, .045, .37, colors.skirtLight);
    add(-.17, .47, .18, .025, .54, .018, colors.skirtLight);
    add(.17, .47, .18, .025, .54, .018, colors.skirtLight);
    add(.13, 1.18, .15, .095, .12, .022, colors.accent);
    add(.148, 1.17, .165, .045, .055, .012, colors.metal);
  } else {
    add(0, .72, 0, .4, .12, .28, colors.skirtShade);
    add(-.105, .43, 0, .19, .48, .23, colors.skirt);
    add(.105, .43, 0, .19, .48, .23, colors.skirt);
    add(-.105, .45, .12, .023, .43, .015, colors.skirtLight);
    add(.105, .45, .12, .023, .43, .015, colors.skirtLight);
    add(.13, 1.18, .15, .105, .12, .022, colors.topLight);
    add(.13, 1.18, .166, .072, .065, .012, colors.top);
    add(.16, 1.195, .176, .022, .022, .012, colors.metal);
    add(-.14, 1.21, .15, .09, .02, .016, colors.accent);
  }
  for (const y of [.91, 1.045, 1.18, 1.31]) add(0, y, .164, .028, .028, .015, colors.metal);
  add(-.31, 1.04, .105, .095, .025, .018, colors.topLight);
  add(-.31, 1.055, .119, .026, .055, .014, colors.accent);
  add(0, 1.57, 0, .42, .43, .37, colors.skin, 'head');
  add(0, 1.792, -.025, .46, .12, .42, colors.hair, 'head');
  add(0, 1.72, .142, .4, .13, .18, colors.hairHi, 'head');
  add(0, 1.51, -.19, .43, .31, .12, colors.hair, 'head');
  for (const side of [-1, 1]) {
    add(side * .205, 1.54, .01, .075, woman ? .39 : .27, .34, colors.hair, 'head');
    add(side * .105, 1.625, .171, .12, .055, .025, 0xf1e3d7, 'head');
    add(side * .105, 1.628, .19, .045, .044, .016, colors.eyes, 'head');
    add(side * .105, 1.687, .169, .13, .022, .025, colors.brow, 'head');
    add(side * .22, 1.55, .12, .065, .095, .035, colors.skinShade, 'head');
  }
  add(0, 1.56, .205, .055, .07, .055, colors.skinShade, 'head');
  add(0, 1.475, .198, .10, .022, .02, colors.lip, 'mouth');
  if (woman) {
    add(0, 1.405, -.205, .42, .49, .105, colors.hair, 'head');
    add(-.20, 1.405, .015, .075, .37, .27, colors.hair, 'head');
    add(.20, 1.405, .015, .075, .37, .27, colors.hair, 'head');
    add(.17, 1.74, .17, .045, .11, .025, colors.metal, 'head', [0, 0, -.16]);
    add(.205, 1.54, .18, .026, .075, .025, colors.metal, 'head');
    add(-.205, 1.54, .18, .026, .075, .025, colors.metal, 'head');
  } else {
    add(-.11, 1.735, .168, .17, .12, .075, colors.hairHi, 'head', [0, 0, -.12]);
    add(.13, 1.75, .164, .17, .10, .08, colors.hair, 'head', [0, 0, .13]);
    add(0, 1.445, .205, .16, .055, .025, colors.hair, 'head');
  }

  const arms = [addArm(-1), addArm(1)], legs = [addLeg(-1), addLeg(1)];
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ vertexColors: true }), parts.length);
  mesh.name = woman ? 'tea-couple-woman' : 'tea-couple-man';
  mesh.castShadow = false; mesh.receiveShadow = false;
  for (let i = 0; i < parts.length; i++) mesh.setColorAt(i, new THREE.Color(parts[i].color));
  const root = new THREE.Group(); root.name = woman ? 'tea-room-woman' : 'tea-room-man';
  root.scale.set(1, woman ? .96 : 1, 1); root.add(mesh); scene.add(root);
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), bodyMatrix = new THREE.Matrix4(), headMatrix = new THREE.Matrix4();
  const bodyOffset = new THREE.Matrix4(), bodyRotationMatrix = new THREE.Matrix4(), bodyUndo = new THREE.Matrix4();
  const headOffset = new THREE.Matrix4(), headRotationMatrix = new THREE.Matrix4(), headUndo = new THREE.Matrix4();
  const bodyRotation = new THREE.Euler(), headRotation = new THREE.Euler(), bodyQuat = new THREE.Quaternion(), headQuat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  const start = new THREE.Vector3(), end = new THREE.Vector3();
  const person = {
    woman, colors, parts, arms, legs, root, mesh, dummy, matrix, bodyMatrix, headMatrix,
    bodyRotation, headRotation, bodyQuat, headQuat, bodyOffset, bodyRotationMatrix, bodyUndo,
    headOffset, headRotationMatrix, headUndo, up, direction, start, end,
    x: woman ? FEMALE_SEAT.x : MALE_SEAT.x, z: woman ? FEMALE_SEAT.z : MALE_SEAT.z,
    yaw: woman ? 0 : Math.PI, seatBlend: 1, mode: 'chat', wristL: { x: -.34, y: 1.08, z: .78 },
    wristR: { x: .34, y: 1.08, z: .78 }, headYaw: 0, headPitch: 0, lean: 0, gait: 0,
  };
  person.collider = { x: person.x, y: FLOOR, z: person.z };
  registerActor(nav, person.collider, .25, 1.88);
  return person;
}

function positionPath(person, route, progress) {
  const distance = Math.max(0, Math.min(1, progress)) * route.length;
  let travelled = 0;
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (distance <= travelled + length || i === route.points.length - 1) {
      const t = smooth(length ? (distance - travelled) / length : 1);
      person.x = a.x + (b.x - a.x) * t; person.z = a.z + (b.z - a.z) * t;
      person.yaw = Math.atan2(b.x - a.x, b.z - a.z);
      return;
    }
    travelled += length;
  }
}

function applyPerson(person, clock, gesture) {
  const { parts, arms, legs, dummy, matrix, bodyMatrix, headMatrix, bodyRotation, headRotation, bodyQuat, headQuat, up, root, mesh } = person;
  const seated = person.seatBlend;
  const breath = Math.sin(clock * 1.45 + (person.woman ? 1.3 : 0)) * .007;
  bodyRotation.set(person.lean, 0, Math.sin(clock * .7 + (person.woman ? .8 : 0)) * .012);
  bodyQuat.setFromEuler(bodyRotation);
  person.bodyOffset.makeTranslation(0, -.145 * seated + breath, 0);
  person.bodyRotationMatrix.makeRotationFromQuaternion(bodyQuat);
  person.bodyUndo.makeTranslation(0, 1.08, 0);
  bodyMatrix.copy(person.bodyOffset).multiply(person.bodyUndo).multiply(person.bodyRotationMatrix);
  person.bodyUndo.makeTranslation(0, -1.08, 0); bodyMatrix.multiply(person.bodyUndo);
  headRotation.set(person.headPitch, person.headYaw, Math.sin(clock * 1.1 + (person.woman ? .5 : 0)) * .012);
  headQuat.setFromEuler(headRotation);
  person.headOffset.makeTranslation(0, 1.57, 0);
  person.headRotationMatrix.makeRotationFromQuaternion(headQuat);
  person.headUndo.makeTranslation(0, -1.57, 0);
  headMatrix.copy(bodyMatrix).multiply(person.headOffset).multiply(person.headRotationMatrix).multiply(person.headUndo);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.group === 'moving') continue;
    if (p.group === 'mouth') {
      const talking = person.mode === 'chat' || person.mode === 'watch';
      const open = talking ? .018 + Math.max(0, Math.sin(clock * 5.4 + (person.woman ? 1.7 : 0))) * .035 : .018;
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(p.w, open, p.d);
    } else {
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]); dummy.scale.set(p.w, p.h, p.d);
    }
    dummy.updateMatrix(); matrix.copy(dummy.matrix).premultiply(p.group === 'head' || p.group === 'mouth' ? headMatrix : bodyMatrix);
    mesh.setMatrixAt(i, matrix);
  }
  const phase = clock * 8.5;
  const walk = person.gait;
  for (const leg of legs) {
    const side = leg.side, swing = Math.sin(phase + (side < 0 ? Math.PI : 0)) * walk * .22;
    const hipY = .82 - .075 * seated;
    const kneeY = .49 - .03 * seated;
    const kneeZ = .02 + .39 * seated + swing * .42;
    const ankleY = .045, ankleZ = .02 + .52 * seated + swing;
    setSegment(person, leg.upper, side * .105, hipY, 0, side * .105, kneeY, kneeZ, .16, .18, false);
    setSegment(person, leg.lower, side * .105, kneeY, kneeZ, side * .105, ankleY + .045, ankleZ, .13, .14, false);
    setBox(person, leg.shoe, side * .105, ankleY, ankleZ + .045, .14, .09, .28, swing * .12, 0, 0, false);
  }
  for (const arm of arms) {
    const wrist = arm.side < 0 ? person.wristL : person.wristR;
    const gestureLift = gesture && arm.side > 0 ? .16 + .06 * Math.sin(clock * 4) : 0;
    const wristX = wrist.x, wristY = wrist.y + gestureLift, wristZ = wrist.z;
    const shoulderX = arm.side * .27, shoulderY = 1.34, shoulderZ = -.01;
    const bend = person.mode === 'hug' ? .13 : person.mode === 'kiss' ? .17 : .27;
    const elbowX = (shoulderX + wristX) * .5 + arm.side * bend;
    const elbowY = (shoulderY + wristY) * .5 + .07;
    const elbowZ = (shoulderZ + wristZ) * .5 - .07;
    setSegment(person, arm.upper, shoulderX, shoulderY, shoulderZ, elbowX, elbowY, elbowZ, .145, .15, true);
    setSegment(person, arm.lower, elbowX, elbowY, elbowZ, wristX, wristY, wristZ, .098, .10, true);
    const cuffT = .86;
    setBox(person, arm.cuff,
      elbowX + (wristX - elbowX) * cuffT, elbowY + (wristY - elbowY) * cuffT, elbowZ + (wristZ - elbowZ) * cuffT,
      .122, .043, .125, 0, 0, 0, true, elbowX, elbowY, elbowZ, wristX, wristY, wristZ);
    setBox(person, arm.hand, wristX, wristY, wristZ + .035, .11, .095, .13, 0, 0, 0, true);
    setBox(person, arm.thumb, wristX + arm.side * -.052, wristY - .012, wristZ + .045, .055, .075, .08, 0, 0, arm.side * -.35, true);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function setBox(person, slot, x, y, z, w, h, d, rx, ry, rz, applyBody, ax, ay, az, bx, by, bz) {
  const p = person.parts[slot], dummy = person.dummy;
  if (ax !== undefined) {
    person.start.set(ax, ay, az); person.end.set(bx, by, bz);
    person.direction.subVectors(person.end, person.start);
    dummy.position.set(x, y, z); dummy.quaternion.setFromUnitVectors(person.up, person.direction.normalize());
    dummy.scale.set(w, h, d);
  } else {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(w, h, d);
  }
  dummy.updateMatrix(); person.matrix.copy(dummy.matrix);
  if (applyBody) person.matrix.premultiply(person.bodyMatrix);
  person.mesh.setMatrixAt(slot, person.matrix);
  // Preserve color per dynamic slot even while its size and orientation change.
  if (p.group !== 'moving') p.group = 'moving';
}

function setSegment(person, slot, ax, ay, az, bx, by, bz, width, depth, applyBody) {
  const p = person.parts[slot], dummy = person.dummy;
  person.start.set(ax, ay, az); person.end.set(bx, by, bz);
  person.direction.subVectors(person.end, person.start);
  const length = person.direction.length(); person.direction.normalize();
  dummy.position.copy(person.start).add(person.end).multiplyScalar(.5);
  dummy.quaternion.setFromUnitVectors(person.up, person.direction);
  dummy.scale.set(width, length, depth); dummy.updateMatrix(); person.matrix.copy(dummy.matrix);
  if (applyBody) person.matrix.premultiply(person.bodyMatrix);
  person.mesh.setMatrixAt(slot, person.matrix);
  if (p.group !== 'moving') p.group = 'moving';
}

function setWrist(person, side, x, y, z) {
  const wrist = side < 0 ? person.wristL : person.wristR;
  wrist.x = x; wrist.y = y; wrist.z = z;
}

function configurePose(person, clock, mode, phase) {
  person.mode = mode; person.gait = 0; person.lean = 0; person.headPitch = 0;
  const chat = Math.sin(clock * .95 + (person.woman ? 1.2 : 0));
  person.headYaw = (person.woman ? -.13 : .13) + Math.sin(clock * .6 + (person.woman ? 0 : 1)) * .045;
  setWrist(person, -1, -.34, 1.08, .76);
  setWrist(person, 1, .34, 1.08, .76);
  let gesture = false;
  if (mode === 'walk') {
    person.gait = 1; person.headYaw = Math.sin(clock * 2 + (person.woman ? 1 : 0)) * .06;
    setWrist(person, -1, -.36, 1.12, .15); setWrist(person, 1, .36, 1.12, .15);
  } else if (mode === 'watch') {
    person.headYaw = person.woman ? -.20 : .16;
    setWrist(person, -1, -.34, 1.05, .76 + Math.sin(phase * 2) * .025);
    setWrist(person, 1, .34, 1.06, .74);
  } else if (mode === 'pour') {
    person.headYaw = -.23; person.headPitch = .1;
    setWrist(person, -1, -.36, 1.12, .55);
    setWrist(person, 1, .01, 1.2 + Math.sin(phase * 1.4) * .025, .91);
  } else if (mode === 'sip') {
    person.headYaw = person.woman ? -.11 : .11;
    person.headPitch = -.15 + Math.sin(phase * 2) * .025;
    setWrist(person, -1, -.34, 1.08, .76);
    setWrist(person, 1, .31, 1.52 + Math.sin(phase * 2) * .025, .22);
  } else if (mode === 'kiss') {
    person.headYaw = person.woman ? -.22 : .22; person.headPitch = .18; person.lean = .12;
    setWrist(person, -1, -.26, 1.36, .45); setWrist(person, 1, .27, 1.31, .48);
  } else if (mode === 'hug') {
    person.headYaw = person.woman ? -.2 : .2; person.headPitch = .06; person.lean = .06;
    setWrist(person, -1, -.24, 1.29, .53); setWrist(person, 1, .24, 1.30, .54);
  } else {
    gesture = Math.sin(clock * .73 + (person.woman ? .8 : 0)) > .72;
    setWrist(person, -1, -.35, 1.08 + chat * .025, .77);
    setWrist(person, 1, .34, 1.08 + chat * .04, .76);
    person.headPitch = Math.sin(clock * 1.1 + (person.woman ? 1.2 : 0)) * .035;
  }
  return gesture;
}

export function createTeaCouple(scene, nav) {
  const male = makePerson(scene, nav, false), female = makePerson(scene, nav, true);
  routeLength(MALE_TO_KETTLE); routeLength(MALE_FROM_KETTLE);
  routeLength(MALE_TO_MEET); routeLength(FEMALE_TO_MEET);
  routeLength(MALE_FROM_MEET); routeLength(FEMALE_FROM_MEET);
  const teaParts = [], teaColors = [];
  const addTeaBox = (kind, x, y, z, w, h, d, color) => { teaParts.push({ kind, x, y, z, w, h, d, color }); teaColors.push(color); return teaParts.length - 1; };
  // A ceramic kettle, warming stand, two hand-painted cups and tea leaves are
  // built from the same crisp voxel forms used by the tea pavilion furniture.
  addTeaBox('static', -.30, 1.035, 0, .42, .075, .39, 0x384746);
  addTeaBox('static', -.30, 1.08, 0, .29, .04, .28, 0xd18c51);
  addTeaBox('kettle', -.30, 1.20, 0, .34, .245, .32, 0x668c86);
  addTeaBox('kettle', -.30, 1.335, 0, .22, .035, .23, 0x9fb1a1);
  addTeaBox('kettle', -.30, 1.366, 0, .075, .035, .08, 0xdbc794);
  addTeaBox('kettle', -.30, 1.195, -.247, .11, .09, .20, 0x668c86);
  addTeaBox('kettle', -.30, 1.195, -.34, .065, .065, .08, 0xc7d0bd);
  addTeaBox('kettle', -.50, 1.20, .025, .055, .22, .07, 0x9fb1a1);
  addTeaBox('kettle', -.45, 1.20, .04, .08, .055, .07, 0x9fb1a1);
  const cup = (which, liquid, handleX) => {
    addTeaBox(which, 0, 0, 0, .16, .13, .15, 0xf0e8d7);
    addTeaBox(liquid, 0, .068, 0, .12, .012, .105, 0xb8814d);
    addTeaBox(which, handleX, .005, .015, .055, .075, .045, 0xe8deca);
  };
  cup('maleCup', 'maleLiquid', .103); cup('femaleCup', 'femaleLiquid', .103);
  addTeaBox('stream', -.30, 1.20, -.43, .035, .18, .035, 0xc58446);
  const teaMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ vertexColors: true }), teaParts.length);
  teaMesh.name = 'tea-room-kettle-and-cups'; teaMesh.castShadow = false; teaMesh.receiveShadow = false;
  for (let i = 0; i < teaParts.length; i++) teaMesh.setColorAt(i, new THREE.Color(teaColors[i]));
  const teaRoot = new THREE.Group(); teaRoot.name = 'tea-room-teaware'; teaRoot.position.set(TABLE.x, FLOOR, TABLE.z); teaRoot.add(teaMesh); scene.add(teaRoot);
  const steamMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xf1eee2, transparent: true, opacity: .28, depthWrite: false }), 4);
  steamMesh.name = 'tea-kettle-steam'; steamMesh.castShadow = false; steamMesh.receiveShadow = false; teaRoot.add(steamMesh);
  const teaDummy = new THREE.Object3D(), teaMatrix = new THREE.Matrix4(), kettleTurn = new THREE.Matrix4(), kettleRot = new THREE.Matrix4();
  const kettleToPivot = new THREE.Matrix4(), kettleFromPivot = new THREE.Matrix4();
  const cupRotate = new THREE.Matrix4(), cupTranslate = new THREE.Matrix4();
  const maleCupTransform = new THREE.Matrix4(), femaleCupTransform = new THREE.Matrix4();
  const streamDirection = new THREE.Vector3(0, 1, 0), streamUp = new THREE.Vector3(0, 1, 0);
  const streamStart = new THREE.Vector3(), streamEnd = new THREE.Vector3();
  const kettlePivot = new THREE.Vector3(-.30, 1.20, -.05);

  let elapsed = 0;
  const duration = 78;
  function moveProps(time) {
    const pouring = time >= 21 && time < 33;
    const tilt = pouring ? -.47 * smooth(Math.min(1, (time - 21) / 1.5)) * (1 - smooth(Math.max(0, (time - 31) / 1.5))) : 0;
    kettleRot.makeRotationX(tilt);
    kettleToPivot.makeTranslation(kettlePivot.x, kettlePivot.y, kettlePivot.z);
    kettleFromPivot.makeTranslation(-kettlePivot.x, -kettlePivot.y, -kettlePivot.z);
    kettleTurn.copy(kettleToPivot).multiply(kettleRot).multiply(kettleFromPivot);
    const maleSip = time >= 38 && time < 41;
    const femaleSip = time >= 43 && time < 46;
    cupCenter(maleSip, male, teaPosition, -.45, .68);
    cupCenter(femaleSip, female, teaPosition2, .48, -.66);
    const brewed = time >= 29 || time < 16 || time >= 35;
    cupTranslate.makeTranslation(teaPosition.x, teaPosition.y, teaPosition.z);
    cupRotate.makeRotationX(maleSip ? -.12 : 0);
    maleCupTransform.copy(cupTranslate).multiply(cupRotate);
    cupTranslate.makeTranslation(teaPosition2.x, teaPosition2.y, teaPosition2.z);
    cupRotate.makeRotationX(femaleSip ? -.12 : 0);
    femaleCupTransform.copy(cupTranslate).multiply(cupRotate);
    const pourVisible = pouring && time > 22.5 && time < 32;
    streamStart.set(-.30, 1.195, -.39).applyMatrix4(kettleTurn);
    streamEnd.set(-.45, 1.075, .68);
    streamDirection.subVectors(streamEnd, streamStart);
    const streamLength = streamDirection.length();
    streamDirection.normalize();
    for (let i = 0; i < teaParts.length; i++) {
      const p = teaParts[i];
      if (p.kind === 'stream') {
        teaDummy.position.copy(streamStart).add(streamEnd).multiplyScalar(.5);
        teaDummy.quaternion.setFromUnitVectors(streamUp, streamDirection);
        const flow = .7 + Math.sin(time * 9) * .15;
        teaDummy.scale.set(pourVisible ? .026 * flow : .001, pourVisible ? streamLength : .001, pourVisible ? .026 * flow : .001);
        teaDummy.updateMatrix(); teaMesh.setMatrixAt(i, teaDummy.matrix); continue;
      }
      if (p.kind === 'maleCup' || p.kind === 'maleLiquid') {
        teaDummy.position.set(p.x, p.kind === 'maleLiquid' && !brewed ? -2 : p.y, p.z);
        teaDummy.rotation.set(0, 0, 0); teaDummy.scale.set(p.w, p.h, p.d); teaDummy.updateMatrix();
        teaMatrix.copy(teaDummy.matrix).premultiply(maleCupTransform); teaMesh.setMatrixAt(i, teaMatrix); continue;
      }
      if (p.kind === 'femaleCup' || p.kind === 'femaleLiquid') {
        teaDummy.position.set(p.x, p.kind === 'femaleLiquid' && !brewed ? -2 : p.y, p.z);
        teaDummy.rotation.set(0, 0, 0); teaDummy.scale.set(p.w, p.h, p.d); teaDummy.updateMatrix();
        teaMatrix.copy(teaDummy.matrix).premultiply(femaleCupTransform); teaMesh.setMatrixAt(i, teaMatrix); continue;
      }
      teaDummy.position.set(p.x, p.y, p.z); teaDummy.rotation.set(0, 0, 0);
      teaDummy.scale.set(p.w, p.h, p.d); teaDummy.updateMatrix(); teaMatrix.copy(teaDummy.matrix);
      if (p.kind === 'kettle') teaMatrix.premultiply(kettleTurn);
      teaMesh.setMatrixAt(i, teaMatrix);
    }
    teaMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 4; i++) {
      const float = (time * .21 + i * .24) % .84;
      const drift = Math.sin(time * 1.7 + i * 1.6) * .035;
      teaDummy.position.set(-.30 + drift, 1.39 + float, -.02 + Math.cos(time * 1.3 + i) * .025);
      teaDummy.rotation.set(0, 0, Math.sin(time * 1.4 + i) * .12);
      teaDummy.scale.set(.035 - float * .014, .055 + float * .02, .035 - float * .014);
      teaDummy.updateMatrix(); steamMesh.setMatrixAt(i, teaDummy.matrix);
    }
    steamMesh.instanceMatrix.needsUpdate = true;
  }

  function update(dt) {
    elapsed += dt;
    const t = elapsed % duration;
    let maleMode = 'chat', femaleMode = 'chat';
    male.seatBlend = 1; female.seatBlend = 1;
    male.x = MALE_SEAT.x; male.z = MALE_SEAT.z; male.yaw = Math.PI;
    female.x = FEMALE_SEAT.x; female.z = FEMALE_SEAT.z; female.yaw = 0;
    if (t >= 16 && t < 18) {
      male.seatBlend = 1 - smooth((t - 16) / 2); maleMode = 'walk';
      positionPath(male, MALE_TO_KETTLE, (t - 16) / 2);
    } else if (t >= 18 && t < 21) { male.seatBlend = 0; male.x = KETTLE_SPOT.x; male.z = KETTLE_SPOT.z; male.yaw = Math.PI; maleMode = 'pour'; femaleMode = 'watch'; }
    else if (t >= 21 && t < 33) { male.seatBlend = 0; male.x = KETTLE_SPOT.x; male.z = KETTLE_SPOT.z; male.yaw = Math.PI; maleMode = 'pour'; femaleMode = 'watch'; }
    else if (t >= 33 && t < 35) {
      male.seatBlend = smooth((t - 33) / 2); maleMode = 'walk'; positionPath(male, MALE_FROM_KETTLE, (t - 33) / 2);
    } else if (t >= 38 && t < 41) maleMode = 'sip';
    else if (t >= 43 && t < 46) femaleMode = 'sip';
    else if (t >= 51 && t < 56) {
      male.seatBlend = 1 - smooth((t - 51) / 1); female.seatBlend = male.seatBlend;
      maleMode = femaleMode = 'walk';
      positionPath(male, MALE_TO_MEET, (t - 51) / 5); positionPath(female, FEMALE_TO_MEET, (t - 51) / 5);
      if (t >= 55.8) { male.yaw = Math.PI / 2; female.yaw = -Math.PI / 2; }
    } else if (t >= 56 && t < 60) {
      male.seatBlend = female.seatBlend = 0; male.x = -14; male.z = -1.5; male.yaw = Math.PI / 2;
      female.x = -13.25; female.z = -1.5; female.yaw = -Math.PI / 2; maleMode = femaleMode = 'kiss';
    } else if (t >= 60 && t < 66) {
      male.seatBlend = female.seatBlend = 0; male.x = -14; male.z = -1.5; male.yaw = Math.PI / 2;
      female.x = -13.25; female.z = -1.5; female.yaw = -Math.PI / 2; maleMode = femaleMode = 'hug';
    } else if (t >= 66 && t < 72) {
      male.seatBlend = smooth((t - 71) / 1); female.seatBlend = male.seatBlend;
      maleMode = femaleMode = 'walk'; positionPath(male, MALE_FROM_MEET, (t - 66) / 5); positionPath(female, FEMALE_FROM_MEET, (t - 66) / 5);
    }
    const maleGesture = configurePose(male, elapsed, maleMode, t);
    const femaleGesture = configurePose(female, elapsed, femaleMode, t);
    male.root.position.set(male.x, FLOOR + Math.sin(elapsed * 8.5) * male.gait * .025, male.z);
    female.root.position.set(female.x, FLOOR + Math.sin(elapsed * 8.5 + Math.PI) * female.gait * .025, female.z);
    male.collider.x = male.x; male.collider.y = FLOOR; male.collider.z = male.z;
    female.collider.x = female.x; female.collider.y = FLOOR; female.collider.z = female.z;
    male.root.rotation.set(0, male.yaw, 0); female.root.rotation.set(0, female.yaw, 0);
    applyPerson(male, elapsed, maleGesture); applyPerson(female, elapsed, femaleGesture);
    moveProps(t);
  }

  const teaPosition = { x: 0, y: 0, z: 0 }, teaPosition2 = { x: 0, y: 0, z: 0 };
  function cupCenter(sipping, person, out, restX, restZ) {
    if (sipping) {
      const wrist = person.wristR, yaw = person.yaw, x = wrist.x + .02, y = wrist.y - .145 * person.seatBlend, z = wrist.z + .08;
      out.x = person.x + x * Math.cos(yaw) + z * Math.sin(yaw) - TABLE.x;
      out.y = y - .02;
      out.z = person.z - x * Math.sin(yaw) + z * Math.cos(yaw) - TABLE.z;
      return;
    }
    out.x = restX; out.y = 1.075; out.z = restZ;
  }
  moveProps(0);
  return { update };
}

