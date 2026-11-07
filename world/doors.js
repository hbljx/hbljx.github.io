import * as THREE from 'three';
import { HOUSE, LOFT, SECRET, GARAGE, ENTRANCE, BACKDOOR, ROOF_LADDER } from './layout.js';

const CLOSE_HOUR = 18, OPEN_HOUR = 7, TRANSITION_SECONDS = 0.48;
const solidDoor = new THREE.MeshLambertMaterial({ color: 0xffffff });
const glassDoor = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.38 });

function makeFrontDoorMaterial(style) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const black = style === 'blackwood';
  const colors = black
    ? { base: '#100f10', grain: '#211d1a', panel: '#171415', trim: '#b89a62', detail: '#e0c98d' }
    : { base: '#4a1719', grain: '#692326', panel: '#571b1e', trim: '#c99b58', detail: '#eed093' };
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, 128, 128);

  // Fine vertical grain keeps the lacquered timber visible beneath the carving.
  for (let x = 3; x < 128; x += 7) {
    ctx.fillStyle = x % 2 ? colors.grain : colors.base;
    ctx.fillRect(x, 0, 1, 128);
  }

  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 8, 108, 112);
  ctx.strokeStyle = colors.grain;
  ctx.lineWidth = 1;
  ctx.strokeRect(15, 13, 98, 102);
  ctx.fillStyle = colors.panel;
  ctx.fillRect(19, 17, 90, 94);
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(19, 17, 90, 94);

  // Mirrored botanical scrollwork gives the entrance a carved, formal center.
  ctx.save();
  ctx.translate(128, 0);
  ctx.scale(-1, 1);
  const drawScroll = () => {
    ctx.beginPath();
    ctx.moveTo(64, 27);
    ctx.bezierCurveTo(48, 35, 49, 48, 64, 54);
    ctx.bezierCurveTo(80, 60, 80, 72, 64, 81);
    ctx.bezierCurveTo(52, 88, 53, 98, 64, 103);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 39);
    ctx.bezierCurveTo(53, 33, 42, 35, 39, 43);
    ctx.bezierCurveTo(36, 50, 44, 54, 49, 49);
    ctx.moveTo(64, 66);
    ctx.bezierCurveTo(76, 58, 88, 61, 90, 69);
    ctx.bezierCurveTo(92, 77, 83, 80, 79, 74);
    ctx.moveTo(64, 91);
    ctx.bezierCurveTo(53, 84, 43, 87, 42, 94);
    ctx.bezierCurveTo(41, 101, 50, 103, 54, 98);
    ctx.stroke();
  };
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 2;
  drawScroll();
  ctx.restore();
  ctx.strokeStyle = colors.detail;
  ctx.lineWidth = 1;
  drawScroll();

  ctx.fillStyle = colors.detail;
  for (const y of [27, 54, 81, 103]) {
    ctx.beginPath();
    ctx.moveTo(64, y - 3);
    ctx.lineTo(67, y);
    ctx.lineTo(64, y + 3);
    ctx.lineTo(61, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = colors.trim;
  ctx.fillRect(100, 61, 4, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.anisotropy = 4;
  return new THREE.MeshLambertMaterial({ map: texture });
}

function makeShutterMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const slatHeight = 18;
  for (let y = 0; y < canvas.height; y += slatHeight) {
    ctx.fillStyle = '#b7c1c6';
    ctx.fillRect(0, y, canvas.width, slatHeight - 1);
    ctx.fillStyle = '#8e9ba2';
    ctx.fillRect(0, y + slatHeight - 2, canvas.width, 1);
    ctx.fillStyle = '#d5dde0';
    ctx.fillRect(0, y, canvas.width, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  return new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
}

function scheduledClosed(timestamp) {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23',
  }).format(timestamp));
  return hour >= CLOSE_HOUR || hour < OPEN_HOUR;
}

function hinged({ id, controlGroup = id, x, z, y = 0, width, height, closedYaw = 0, openYaw,
  kind = 'hinged', slideDirection = 1, surface = 'solid', color = 0x343b40, level = 0, bounds, interactY = y, onBlockingChange }) {
  const root = new THREE.Object3D();
  root.position.set(x, y, z);
  if (kind === 'hinged') root.rotation.y = closedYaw;
  return { id, controlGroup, root, kind, width, height, surface, color, closedPose: kind === 'sliding' ? 0 : closedYaw,
    openPose: kind === 'sliding' ? width * slideDirection : openYaw, originX: x, level, interactY, bounds, onBlockingChange, angle: closedYaw };
}

export function createIslandDoors(obstacles, additionalDoors = []) {
  const doors = [];
  const add = door => doors.push(door);

  // The two front leaves close the full entrance together.
  const entranceMid = (ENTRANCE.x0 + ENTRANCE.x1) / 2;
  add(hinged({ id: 'front-left', controlGroup: 'front', x: ENTRANCE.x0, z: HOUSE.z1 + 0.3, width: entranceMid - ENTRANCE.x0,
    height: 2.8, surface: 'wood', color: 0xffffff, openYaw: -Math.PI / 2, bounds: { x0: ENTRANCE.x0, x1: entranceMid, z0: HOUSE.z1 - 0.12, z1: HOUSE.z1 + 0.12 } }));
  const right = hinged({ id: 'front-right', controlGroup: 'front', x: ENTRANCE.x1, z: HOUSE.z1 + 0.3, width: ENTRANCE.x1 - entranceMid,
    height: 2.8, closedYaw: Math.PI, openYaw: 3 * Math.PI / 2,
    surface: 'wood', color: 0xffffff, bounds: { x0: entranceMid, x1: ENTRANCE.x1, z0: HOUSE.z1 - 0.12, z1: HOUSE.z1 + 0.12 } });
  add(right);

  const garageDoorCenter = (GARAGE.door.z0 + GARAGE.door.z1) / 2;
  const garageDoorWidth = GARAGE.door.z1 - GARAGE.door.z0;
  const shutter = new THREE.Object3D();
  shutter.position.set(HOUSE.x1 + 0.2, 0, garageDoorCenter);
  add({ id: 'garage', root: shutter, kind: 'shutter', width: garageDoorWidth - 0.1, height: 4, surface: 'solid', color: 0xb4bec4,
    closedPose: 0, openPose: 4.15, angle: 0, level: 0, interactY: 0,
    bounds: { x0: HOUSE.x1 - 0.16, x1: HOUSE.x1 + 0.16, z0: GARAGE.door.z0, z1: GARAGE.door.z1 } });

  add(hinged({ id: 'garage-side', x: GARAGE.x0 - 0.02, z: GARAGE.glassDoor.z0, y: 0, width: GARAGE.glassDoor.z1 - GARAGE.glassDoor.z0,
    height: 2.8, closedYaw: -Math.PI / 2, openYaw: 0, surface: 'glass', color: 0x83aeb4,
    bounds: { x0: GARAGE.x0 - 0.14, x1: GARAGE.x0 + 0.14, z0: GARAGE.glassDoor.z0, z1: GARAGE.glassDoor.z1 } }));

  add(hinged({ id: 'back', x: BACKDOOR.x0, z: HOUSE.z0 - 0.5, width: BACKDOOR.x1 - BACKDOOR.x0, height: 2.8,
    openYaw: -Math.PI / 2, color: 0x76583f,
    bounds: { x0: BACKDOOR.x0, x1: BACKDOOR.x1, z0: HOUSE.z0 - 1.12, z1: HOUSE.z0 - 0.88 } }));

  add(hinged({ id: 'bedroom', x: -6, z: -3.88, y: LOFT.y, width: 2.9, height: 2.88, kind: 'sliding', slideDirection: -1, surface: 'glass', color: 0x83aeb4, level: 1,
    bounds: { x0: -6, x1: -3.1, z0: -4.12, z1: -3.84 } }));

  // The hidden bookshelf door is part of the same timed and interactive set.
  add(hinged({ id: 'hidden', x: SECRET.x1, z: SECRET.door, y: LOFT.y, width: 1, height: 2,
    closedYaw: -Math.PI / 2, openYaw: Math.PI, color: 0x76583f, level: 1,
    bounds: { x0: SECRET.x1 - 0.14, x1: SECRET.x1 + 0.14, z0: SECRET.door, z1: SECRET.door + 1 } }));

  // A small safety gate closes the roof ladder opening.
  add(hinged({ id: 'roof-gate', x: HOUSE.x1 + 1.65, z: ROOF_LADDER.gate0, y: HOUSE.height,
    width: ROOF_LADDER.gate1 - ROOF_LADDER.gate0, height: 1.05, closedYaw: -Math.PI / 2, openYaw: 0,
    bounds: { x0: HOUSE.x1 + 1.5, x1: HOUSE.x1 + 1.8, z0: ROOF_LADDER.gate0, z1: ROOF_LADDER.gate1 }, level: 1 }));

  for (const door of additionalDoors) add(hinged(door));

  const now = Date.now();
  let closedBySchedule = scheduledClosed(now);
  let checkedMinute = Math.floor(now / 60000);
  const bySurface = new Map([['solid', []], ['glass', []], ['wood', []]]);
  for (const door of doors) {
    door.targetOpen = !closedBySchedule;
    door.pose = door.targetOpen ? door.openPose : door.closedPose;
    if (door.kind === 'shutter') door.root.position.y = door.pose;
    else if (door.kind === 'sliding') door.root.position.x = door.originX + door.pose;
    else door.root.rotation.y = door.pose;
    door.elapsed = TRANSITION_SECONDS;
    door.renderVisible = !door.targetOpen;
    door.obstacle = { ...door.bounds, level: door.level };
    door.blocking = closedBySchedule;
    if (door.blocking) obstacles.push(door.obstacle);
    door.onBlockingChange?.(door.blocking, door.obstacle);
    if (door.kind !== 'shutter') bySurface.get(door.surface).push(door);
  }

  const garage = doors.find(door => door.kind === 'shutter');
  const shutterFace = new THREE.Mesh(new THREE.PlaneGeometry(garage.width, garage.height), makeShutterMaterial());
  shutterFace.rotation.y = Math.PI / 2;
  shutterFace.position.set(0.052, garage.height / 2, 0);
  shutterFace.castShadow = false;
  shutterFace.receiveShadow = false;
  shutterFace.visible = garage.renderVisible;
  garage.root.add(shutterFace);

  const unitBox = new THREE.BoxGeometry(1, 1, 1), instanceMeshes = [];
  const frontDoorStyle = Math.random() < 0.5 ? 'blackwood' : 'rosewood';
  const woodDoor = makeFrontDoorMaterial(frontDoorStyle);
  const matrix = new THREE.Matrix4(), center = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const [surface, members] of bySurface) {
    if (!members.length) continue;
    const material = surface === 'glass' ? glassDoor : surface === 'wood' ? woodDoor : solidDoor;
    const mesh = new THREE.InstancedMesh(unitBox, material, members.length);
    mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    instanceMeshes.push(mesh);
    members.forEach((door, index) => {
      door.instanceMesh = mesh; door.instanceIndex = index;
      mesh.setColorAt(index, new THREE.Color(door.color));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function syncMesh(door) {
    if (!door.instanceMesh) return;
    if (door.kind === 'shutter') {
      center.set(0, door.renderVisible ? door.height / 2 : door.height / 2 + 12, 0).add(door.root.position);
      rotation.setFromAxisAngle(up, Math.PI / 2);
      scale.set(door.width, door.height, 0.1);
    } else if (door.kind === 'sliding') {
      center.set(door.width / 2, door.height / 2, 0).add(door.root.position);
      rotation.identity();
      scale.set(door.width, door.height, 0.1);
    } else {
      center.set(door.width / 2, door.height / 2, 0).applyQuaternion(door.root.quaternion).add(door.root.position);
      rotation.copy(door.root.quaternion);
      scale.set(door.width, door.height, 0.1);
    }
    matrix.compose(center, rotation, scale);
    door.instanceMesh.setMatrixAt(door.instanceIndex, matrix);
  }
  for (const door of doors) if (door.instanceMesh) syncMesh(door);
  for (const mesh of instanceMeshes) mesh.instanceMatrix.needsUpdate = true;
  instanceMeshes.push(garage.root);

  function setBlocking(door, blocked) {
    if (door.blocking === blocked) return false;
    door.blocking = blocked;
    const index = obstacles.indexOf(door.obstacle);
    if (blocked && index < 0) obstacles.push(door.obstacle);
    else if (!blocked && index >= 0) obstacles.splice(index, 1);
    door.onBlockingChange?.(blocked, door.obstacle);
    return true;
  }

  function setOpen(door, open) {
    if (door.targetOpen === open && door.elapsed < TRANSITION_SECONDS) return false;
    door.targetOpen = open;
    door.from = door.pose;
    door.to = open ? door.openPose : door.closedPose;
    door.elapsed = 0;
    if (door.kind === 'shutter' && !open) {
      door.renderVisible = true;
      door.root.children[0].visible = true;
    }
    return setBlocking(door, !open);
  }

  return {
    roots: instanceMeshes,
    interact(player, nav) {
      if (player.mode !== 'ground') return false;
      const y = player.floorY;
      let nearest = null, distance = 3.1;
      for (const door of doors) {
        if (Math.abs(y - door.interactY) > 1.3) continue;
        const d = Math.hypot(player.pos.x - door.root.position.x, player.pos.z - door.root.position.z);
        if (d < distance) { distance = d; nearest = door; }
      }
      if (!nearest) return false;
      const open = !nearest.targetOpen;
      let navChanged = false;
      for (const door of doors) if (door.controlGroup === nearest.controlGroup) navChanged = setOpen(door, open) || navChanged;
      if (navChanged) nav?.rebuild();
      return true;
    },
    update(dt, nav) {
      const minute = Math.floor(Date.now() / 60000);
      if (minute !== checkedMinute) {
        checkedMinute = minute;
        const scheduled = scheduledClosed(minute * 60000);
        if (scheduled !== closedBySchedule) {
          closedBySchedule = scheduled;
          let navChanged = false;
          for (const door of doors) navChanged = setOpen(door, !scheduled) || navChanged;
          if (navChanged) nav?.rebuild();
        }
      }
      let navChanged = false;
      for (const door of doors) {
        if (door.elapsed >= TRANSITION_SECONDS) continue;
        door.elapsed = Math.min(TRANSITION_SECONDS, door.elapsed + dt);
        const t = door.elapsed / TRANSITION_SECONDS, eased = t * t * (3 - 2 * t);
        door.pose = door.from + (door.to - door.from) * eased;
        if (door.kind === 'shutter') door.root.position.y = door.pose;
        else if (door.kind === 'sliding') door.root.position.x = door.originX + door.pose;
        else door.root.rotation.y = door.pose;
        if (door.elapsed === TRANSITION_SECONDS) {
          if (door.kind === 'shutter' && door.targetOpen) {
            door.renderVisible = false;
            door.root.children[0].visible = false;
          }
          navChanged = setBlocking(door, !door.targetOpen) || navChanged;
        }
        syncMesh(door);
        if (door.instanceMesh) door.instanceMesh.instanceMatrix.needsUpdate = true;
      }
      if (navChanged) nav?.rebuild();
    },
    get states() { return doors.map(({ id, targetOpen, blocking }) => ({ id, open: targetOpen, blocking })); },
  };
}
