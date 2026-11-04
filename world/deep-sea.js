import * as THREE from 'three';

export const DEEP_LANDMARKS = [
  { name: '荧光珊瑚林', x: -350, z: 285, depth: 260, color: '#67edce' },
  { name: '深海热泉', x: -610, z: 435, depth: 300, color: '#ffbd73' },
  { name: '领地界碑', x: -430, z: 570, depth: 300, color: '#9fcaff' },
];

// One continuous slope, shared by visual geometry and hull clearance checks.
export function seabedAt(x, z) {
  if (z < 32 || x > 50) return -9.5;
  return -34 - THREE.MathUtils.clamp((-x - 140) / 160, 0, 1) * 386;
}

export function buildDeepSea(shallow, B) {
  const rock = { tex: 'stone', tint: 0x356675 };
  const sand = { tex: 'sand', tint: 0x416e78 };
  // Retain the shallow reefs, opening only the western harbor and trench.
  shallow.box(115, -10, 0, 130, .5, 360, { tex: 'paint', tint: 0x327e94 });
  shallow.box(4, -10, -74, 92, .5, 212, { tex: 'paint', tint: 0x327e94 });
  shallow.box(-111, -10, -74, 138, .5, 212, { tex: 'paint', tint: 0x327e94 });
  shallow.box(-45, -35, 366, 190, 1, 668, sand);
  B.box(-600, -421, 366, 600, 1, 668, sand);
  const slope = Math.atan2(386, 160), length = Math.hypot(386, 160);
  shallow.box(-220 + Math.sin(slope) / 2, -227 - Math.cos(slope) / 2 - .5, 366, length, 1, 668, rock, { rz: slope });
  for (let i = 0; i < 34; i++) {
    const x = -330 - (i * 83 % 490), z = 90 + (i * 137 % 560), h = 6 + i % 6 * 3;
    B.box(x, -420, z, 15 + i % 4 * 5, h, 14 + i % 3 * 6, rock);
    B.box(x + 2, -420 + h, z - 1, 9, 4, 9, sand);
  }
  // All scenery stays below the submarine's 320 m navigation envelope.
  for (let i = 0; i < 19; i++) {
    const x = -350 + Math.cos(i * 2.4) * (10 + i * 1.5);
    const z = 285 + Math.sin(i * 2.4) * (10 + i * 1.5), h = 22 + i % 5 * 7;
    const coral = { tex: 'paint', tint: i % 2 ? 0x56d6ba : 0x918bd8, emissive: .6 };
    B.box(x, -420, z, 2.4, h, 2.4, coral);
    B.box(x, -420 + h * .62, z, 12, 2, 3, coral);
    for (const side of [-1, 1]) B.box(x + side * 5, -420 + h * .62, z, 2, 10, 2, coral);
    B.box(x, -420 + h, z, 5, 2, 5, coral);
  }
  for (let i = 0; i < 7; i++) {
    const x = -610 + Math.cos(i * 2.3) * 22, z = 435 + Math.sin(i * 2.3) * 22, h = 20 + i * 4;
    B.box(x, -420, z, 10, h, 10, rock);
    B.box(x, -420 + h, z, 6, 2, 6, { tex: 'paint', tint: 0xe5a25f, emissive: .8 });
    for (let j = 0; j < 5; j++) B.box(x + Math.sin(j) * 2, -416 + h + j * 4, z, 1.5 + j * .6, 1, 1.5 + j * .6, { tex: 'paint', tint: 0x6c9398, emissive: .2 });
  }
  B.box(-430, -420, 570, 40, 5, 30, rock);
  B.box(-430, -415, 570, 28, 4, 20, sand);
  for (const x of [-441, -419]) B.box(x, -411, 570, 4, 45, 4, rock);
  B.box(-430, -368, 570, 28, 4, 6, rock);
  B.box(-430, -405, 570, 6, 28, 5, { tex: 'paint', tint: 0x9ac9f4, emissive: .75 });
  for (const site of DEEP_LANDMARKS) {
    B.box(site.x, -366, site.z, 1.2, 16, 1.2, { tex: 'paint', tint: 0x749faf });
    B.box(site.x, -350, site.z, 4, 2, 4, { tex: 'paint', tint: Number.parseInt(site.color.slice(1), 16), emissive: 1 });
  }
}

// Render callbacks avoid modifying the engine's shared weather/pool systems.
// Every overridden value is restored immediately after the submarine frame.
export function installDeepSeaView(stage, isActive, scenery) {
  const scene = stage.scene, before = scene.onBeforeRender, after = scene.onAfterRender;
  const water = new THREE.Color(0x073343), savedColor = new THREE.Color();
  const state = { background: null, near: 0, far: 0, cameraFar: 0, sky: true, hemi: 0 };
  let saved = null;
  scene.onBeforeRender = function(renderer, current, camera) {
    before?.call(this, renderer, current, camera);
    scenery.visible = isActive() && camera === stage.camera && camera.position.y < -1.2;
    if (!isActive() || camera !== stage.camera || camera.position.y >= -1.2) return;
    saved = state; saved.background = scene.background; saved.near = scene.fog.near; saved.far = scene.fog.far;
    saved.cameraFar = camera.far; saved.sky = stage.sky.visible; saved.hemi = stage.hemi.intensity; savedColor.copy(scene.fog.color);
    scene.background = water; scene.fog.color.copy(water); scene.fog.near = 120; scene.fog.far = 600;
    stage.sky.visible = false; stage.hemi.intensity = Math.max(1.4, saved.hemi);
    camera.far = 660; camera.updateProjectionMatrix();
  };
  scene.onAfterRender = function(renderer, current, camera) {
    if (saved && camera === stage.camera) {
      scene.background = saved.background; scene.fog.color.copy(savedColor); scene.fog.near = saved.near; scene.fog.far = saved.far;
      stage.sky.visible = saved.sky; stage.hemi.intensity = saved.hemi; camera.far = saved.cameraFar; camera.updateProjectionMatrix(); saved = null;
      scenery.visible = false;
    }
    after?.call(this, renderer, current, camera);
  };
}
