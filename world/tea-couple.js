import * as THREE from 'three';
import { registerActor } from '@engine/world/actor-collision.js';

const FLOOR = 11;
const TABLE = { x: -11, z: -1.5 };
const MALE_SEAT = { x: -11, z: .45 };
const FEMALE_SEAT = { x: -11, z: -3.45 };
const KETTLE_SPOT = { x: -11.3, z: -.4 };
const MALE_TO_KETTLE = { points: [MALE_SEAT, { x: -11, z: -.32 }, { x: -11.3, z: -.32 }, KETTLE_SPOT], length: 0 };
const MALE_FROM_KETTLE = { points: [...MALE_TO_KETTLE.points].reverse(), length: 0 };
const MALE_TO_MEET = { points: [MALE_SEAT, { x: -11, z: -.35 }, { x: -13.1, z: -.35 }, { x: -14.65, z: -.35 }, { x: -14.65, z: -1.5 }, { x: -15.25, z: -1.5 }], length: 0 };
const FEMALE_TO_MEET = { points: [FEMALE_SEAT, { x: -11, z: -2.65 }, { x: -13.1, z: -2.65 }, { x: -14.65, z: -2.65 }, { x: -14.65, z: -1.5 }, { x: -14.55, z: -1.5 }], length: 0 };
const MALE_FROM_MEET = { points: [...MALE_TO_MEET.points].reverse(), length: 0 };
const FEMALE_FROM_MEET = { points: [...FEMALE_TO_MEET.points].reverse(), length: 0 };
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const actionBlend = (time, start, end, fade = .5) => smooth((time - start) / fade) * (1 - smooth((time - (end - fade)) / fade));

function routeLength(route) {
  for (let i = 1; i < route.points.length; i++) route.length += Math.hypot(route.points[i].x - route.points[i - 1].x, route.points[i].z - route.points[i - 1].z);
  return route;
}

function makePerson(scene, nav, woman) {
  const colors = woman ? {
    skin: 0xf0c4a2, skinShade: 0xd59475, hair: 0x352722, hairHi: 0x765443,
    top: 0xf0e4d5, topShade: 0xc8ad96, topLight: 0xfaf4ea, accent: 0xb66f72,
    skirt: 0x526d62, skirtShade: 0x344b44, skirtLight: 0x92aa91,
    shoes: 0x57413b, sole: 0x29282a, eyes: 0x283744, brow: 0x49332d,
    lip: 0xb76869, metal: 0xc9a45d,
  } : {
    skin: 0xd8a883, skinShade: 0xb97d61, hair: 0x292725, hairHi: 0x63574b,
    top: 0x477071, topShade: 0x2f5052, topLight: 0x91aaa0, accent: 0xe1c99f,
    skirt: 0x3d4856, skirtShade: 0x29333f, skirtLight: 0x7e8995,
    shoes: 0x493b35, sole: 0x25272a, eyes: 0x293640, brow: 0x39312c,
    lip: 0x9c5d57, metal: 0xc4a05f,
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
    hand: moving(colors.skin, .105, .09), thumb: moving(colors.skinShade, .07, .07),
    fingers: Array.from({ length: 3 }, () => moving(colors.skin, .04, .045)), side,
  });
  const addLeg = side => ({
    upper: moving(woman ? colors.skirt : colors.skirt, .16, .18),
    lower: moving(colors.skirt, .13, .145), shoe: moving(colors.shoes, .14, .27),
    sole: moving(colors.sole, .15, .285), toe: moving(colors.shoes, .105, .075),
    lace: moving(colors.topLight, .07, .018), side,
  });

  // Layered tea-house outfits, with each trim piece slightly proud of the cloth
  // so the stacked cube surfaces cannot sit in the same depth plane.
  add(0, 1.105, 0, .45, .57, .29, colors.top);
  add(0, 1.105, .17, .105, .48, .035, woman ? colors.topLight : colors.accent);
  add(-.09, 1.375, .13, .16, .095, .05, colors.topLight, 'body', [0, 0, -.28]);
  add(.09, 1.375, .13, .16, .095, .05, colors.topLight, 'body', [0, 0, .28]);
  add(0, 1.412, 0, .13, .13, .14, colors.skinShade);
  add(-.214, 1.115, .153, .022, .43, .02, colors.topShade);
  add(.214, 1.115, .153, .022, .43, .02, colors.topShade);
  // The belt is a raised front panel instead of a box flush with the torso.
  add(0, .82, .17, .39, .085, .035, woman ? colors.accent : 0x4a3931);
  add(0, .82, .194, .075, .055, .012, colors.metal);
  if (woman) {
    add(0, .48, -.008, .51, .62, .36, colors.skirt);
    add(0, .205, -.008, .52, .045, .37, colors.skirtLight);
    add(-.17, .47, .187, .025, .54, .022, colors.skirtLight);
    add(.17, .47, .187, .025, .54, .022, colors.skirtLight);
    add(.13, 1.18, .169, .095, .12, .025, colors.accent);
    add(.148, 1.17, .19, .045, .055, .014, colors.metal);
  } else {
    add(0, .72, 0, .4, .12, .28, colors.skirtShade);
    add(-.105, .43, 0, .19, .48, .23, colors.skirt);
    add(.105, .43, 0, .19, .48, .23, colors.skirt);
    add(-.105, .45, .132, .023, .43, .018, colors.skirtLight);
    add(.105, .45, .132, .023, .43, .018, colors.skirtLight);
    add(.13, 1.18, .17, .105, .12, .025, colors.topLight);
    add(.13, 1.18, .19, .072, .065, .014, colors.top);
    add(.16, 1.195, .208, .022, .022, .012, colors.metal);
    add(-.14, 1.21, .168, .09, .02, .02, colors.accent);
  }
  for (const y of [.91, 1.045, 1.18, 1.31]) add(0, y, .194, .028, .028, .016, colors.metal);
  add(-.31, 1.04, .157, .095, .025, .018, colors.topLight);
  add(-.31, 1.055, .176, .026, .055, .014, colors.accent);
  add(-.325, 1.12, .16, .018, .19, .014, colors.topShade);
  add(0, 1.57, 0, .42, .43, .37, colors.skin, 'head');
  add(0, 1.792, 0, .46, .12, .42, colors.hair, 'head');
  add(0, 1.72, .13, .38, .105, .12, colors.hairHi, 'head');
  add(0, 1.51, -.205, .43, .31, .10, colors.hair, 'head');
  for (const side of [-1, 1]) {
    add(side * .205, 1.54, .005, .075, woman ? .39 : .27, .32, colors.hair, 'head');
    add(side * .105, 1.625, .209, .105, .05, .025, 0xf3e8dc, 'head');
    add(side * .105, 1.625, .233, .045, .042, .016, colors.eyes, 'head');
    add(side * .105, 1.688, .208, .12, .022, .024, colors.brow, 'head');
    add(side * .22, 1.55, .207, .065, .095, .035, colors.skinShade, 'head');
  }
  add(0, 1.56, .224, .055, .07, .045, colors.skinShade, 'head');
  add(0, 1.475, .22, .10, .022, .02, colors.lip, 'mouth');
  if (woman) {
    add(0, 1.405, -.215, .42, .49, .095, colors.hair, 'head');
    add(-.20, 1.405, -.005, .075, .37, .23, colors.hair, 'head');
    add(.20, 1.405, -.005, .075, .37, .23, colors.hair, 'head');
    add(.17, 1.74, .204, .045, .11, .025, colors.metal, 'head', [0, 0, -.16]);
    add(.205, 1.54, .206, .026, .075, .025, colors.metal, 'head');
    add(-.205, 1.54, .206, .026, .075, .025, colors.metal, 'head');
    add(0, 1.835, -.01, .19, .12, .18, colors.hair, 'head');
    add(.035, 1.85, .085, .09, .045, .025, colors.hairHi, 'head');
  } else {
    add(-.11, 1.735, .17, .17, .12, .075, colors.hairHi, 'head', [0, 0, -.12]);
    add(.13, 1.75, .165, .17, .10, .08, colors.hair, 'head', [0, 0, .13]);
    add(0, 1.445, .222, .16, .055, .025, colors.hair, 'head');
  }

  const arms = [addArm(-1), addArm(1)], legs = [addLeg(-1), addLeg(1)];
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), parts.length);
  mesh.name = woman ? 'tea-couple-woman' : 'tea-couple-man';
  mesh.castShadow = false; mesh.receiveShadow = false;
  // Articulated instances move after construction; keep their whole pose inside
  // a stable bound so frustum culling never clips limbs or hair between frames.
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2.2);
  for (let i = 0; i < parts.length; i++) mesh.setColorAt(i, new THREE.Color(parts[i].color));
  mesh.instanceColor.needsUpdate = true;
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

function turnToward(person, yaw, amount) {
  const difference = Math.atan2(Math.sin(yaw - person.yaw), Math.cos(yaw - person.yaw));
  person.yaw += difference * smooth(amount);
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
    const footZ = ankleZ + .05;
    setBox(person, leg.shoe, side * .105, ankleY + .035, footZ, .14, .09, .27, swing * .12, 0, 0, false);
    setBox(person, leg.sole, side * .105, ankleY + .006, footZ + .012, .15, .035, .285, swing * .12, 0, 0, false);
    setBox(person, leg.toe, side * .105, ankleY + .044, footZ + .105, .105, .052, .075, swing * .12, 0, 0, false);
    setBox(person, leg.lace, side * .105, ankleY + .09, footZ + .04, .07, .012, .018, 0, 0, swing * .12, false);
  }
  for (const arm of arms) {
    const wrist = arm.side < 0 ? person.wristL : person.wristR;
    const gestureLift = gesture && arm.side > 0 ? .16 + .06 * Math.sin(clock * 4) : 0;
    const armSwing = Math.sin(phase + (arm.side < 0 ? Math.PI : 0)) * walk * .14;
    const wristX = wrist.x, wristY = wrist.y + gestureLift + Math.abs(armSwing) * .08, wristZ = wrist.z + armSwing;
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
    for (let i = 0; i < arm.fingers.length; i++) {
      const fingerX = wristX + (i - 1) * .034;
      setBox(person, arm.fingers[i], fingerX, wristY - .048, wristZ + .105, .027, .065, .035, armSwing * .18, 0, 0, true);
    }
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
    person.gait = 1; person.lean = .025 + Math.sin(clock * 4.25) * .012;
    person.headYaw = Math.sin(clock * 2 + (person.woman ? 1 : 0)) * .06;
    person.headPitch = Math.sin(clock * 4.25 + (person.woman ? 0 : Math.PI)) * .025;
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
    const sip = actionBlend(phase, person.woman ? 43 : 38, person.woman ? 46 : 41);
    person.headPitch = -.15 * sip + Math.sin(phase * 2) * .012 * sip;
    setWrist(person, -1, -.34, 1.08, .76);
    setWrist(person, 1, .31, 1.08 + .44 * sip + Math.sin(phase * 2) * .02 * sip, .76 - .54 * sip);
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
  const teaMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), teaParts.length);
  teaMesh.name = 'tea-room-kettle-and-cups'; teaMesh.castShadow = false; teaMesh.receiveShadow = false;
  teaMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .8, 0), 2.4);
  for (let i = 0; i < teaParts.length; i++) teaMesh.setColorAt(i, new THREE.Color(teaColors[i]));
  teaMesh.instanceColor.needsUpdate = true;
  const teaRoot = new THREE.Group(); teaRoot.name = 'tea-room-teaware'; teaRoot.position.set(TABLE.x, FLOOR, TABLE.z); teaRoot.add(teaMesh); scene.add(teaRoot);
  const steamMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xf1eee2, transparent: true, opacity: .28, depthWrite: false }), 4);
  steamMesh.name = 'tea-kettle-steam'; steamMesh.castShadow = false; steamMesh.receiveShadow = false; teaRoot.add(steamMesh);
  steamMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.8, 0), 1);
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
    const maleSip = actionBlend(time, 38, 41);
    const femaleSip = actionBlend(time, 43, 46);
    cupCenter(maleSip, male, teaPosition, -.45, .68);
    cupCenter(femaleSip, female, teaPosition2, .48, -.66);
    const brewed = time >= 29 || time < 16 || time >= 35;
    cupTranslate.makeTranslation(teaPosition.x, teaPosition.y, teaPosition.z);
    cupRotate.makeRotationX(-.12 * maleSip);
    maleCupTransform.copy(cupTranslate).multiply(cupRotate);
    cupTranslate.makeTranslation(teaPosition2.x, teaPosition2.y, teaPosition2.z);
    cupRotate.makeRotationX(-.12 * femaleSip);
    femaleCupTransform.copy(cupTranslate).multiply(cupRotate);
    const pourBlend = actionBlend(time, 22.5, 32, .45);
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
        teaDummy.scale.set(.001 + .026 * flow * pourBlend, .001 + streamLength * pourBlend, .001 + .026 * flow * pourBlend);
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
    if (t >= 16 && t < 17) {
      // Stand clear of the cushion before walking out through the chair's open front.
      male.seatBlend = 1 - smooth(t - 16); maleMode = 'chat';
    } else if (t >= 17 && t < 19) {
      male.seatBlend = 0; maleMode = 'walk'; positionPath(male, MALE_TO_KETTLE, (t - 17) / 2);
    } else if (t >= 19 && t < 21) { male.seatBlend = 0; male.x = KETTLE_SPOT.x; male.z = KETTLE_SPOT.z; male.yaw = Math.PI; maleMode = 'pour'; femaleMode = 'watch'; }
    else if (t >= 21 && t < 33) { male.seatBlend = 0; male.x = KETTLE_SPOT.x; male.z = KETTLE_SPOT.z; male.yaw = Math.PI; maleMode = 'pour'; femaleMode = 'watch'; }
    else if (t >= 33 && t < 35) {
      const progress = (t - 33) / 2;
      male.seatBlend = 0; maleMode = 'walk'; positionPath(male, MALE_FROM_KETTLE, progress);
      if (progress > .82) turnToward(male, Math.PI, (progress - .82) / .18);
    } else if (t >= 35 && t < 37) {
      male.seatBlend = smooth((t - 35) / 2); maleMode = 'chat';
    } else if (t >= 38 && t < 41) maleMode = 'sip';
    else if (t >= 43 && t < 46) femaleMode = 'sip';
    else if (t >= 51 && t < 52) {
      male.seatBlend = female.seatBlend = 1 - smooth(t - 51);
      maleMode = femaleMode = 'chat';
    } else if (t >= 52 && t < 57) {
      male.seatBlend = female.seatBlend = 0;
      maleMode = femaleMode = 'walk';
      positionPath(male, MALE_TO_MEET, (t - 52) / 5); positionPath(female, FEMALE_TO_MEET, (t - 52) / 5);
      if (t >= 56.8) { male.yaw = Math.PI / 2; female.yaw = -Math.PI / 2; }
    } else if (t >= 57 && t < 65) {
      male.seatBlend = female.seatBlend = 0;
      male.x = MALE_TO_MEET.points.at(-1).x; male.z = MALE_TO_MEET.points.at(-1).z; male.yaw = Math.PI / 2;
      female.x = FEMALE_TO_MEET.points.at(-1).x; female.z = FEMALE_TO_MEET.points.at(-1).z; female.yaw = -Math.PI / 2;
      maleMode = femaleMode = t < 60 ? 'kiss' : 'hug';
    } else if (t >= 65 && t < 70) {
      const progress = (t - 65) / 5;
      male.seatBlend = female.seatBlend = 0;
      maleMode = femaleMode = 'walk'; positionPath(male, MALE_FROM_MEET, progress); positionPath(female, FEMALE_FROM_MEET, progress);
      if (progress > .85) { turnToward(male, Math.PI, (progress - .85) / .15); turnToward(female, 0, (progress - .85) / .15); }
    } else if (t >= 70 && t < 72) {
      male.seatBlend = female.seatBlend = smooth((t - 70) / 2); maleMode = femaleMode = 'chat';
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
  function cupCenter(sip, person, out, restX, restZ) {
    const wrist = person.wristR, yaw = person.yaw, x = wrist.x + .02;
    const y = wrist.y - .145 * person.seatBlend, z = wrist.z + .08;
    const handX = person.x + x * Math.cos(yaw) + z * Math.sin(yaw) - TABLE.x;
    const handZ = person.z - x * Math.sin(yaw) + z * Math.cos(yaw) - TABLE.z;
    out.x = restX + (handX - restX) * sip;
    out.y = 1.075 + (y - .02 - 1.075) * sip;
    out.z = restZ + (handZ - restZ) * sip;
  }
  // Write a complete, correctly bounded pose before the first render.
  update(0);
  return { update };
}

