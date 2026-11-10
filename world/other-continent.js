// A second, stand-alone Minecraft-style landmass far out in the open sea.
// The terrain shares the home's voxel materials, while its portal returns the
// player to the first-floor entrance without changing the website directory.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { VoxelGrid } from '@engine/world/voxels.js';
import { buildIsland, buildTrees, defineBaseBlocks } from '@engine/world/terrain.js';
import { createGate } from '@engine/world/gate.js';

const LAND = { x0: -58, x1: 59, z0: 442, z1: 559 };
const HOME_PORTAL = { x: -1.35, z: 13.5, yaw: Math.PI / 2 };
const REMOTE_PORTAL = { x: 0, z: 500, yaw: 0 };
const REMOTE_ARRIVAL = { x: 0, z: 504.2, heading: Math.PI };
const HOME_ARRIVAL = { x: -4.3, z: 13.5, heading: Math.PI / 2 };

function createMysticGate(layer, materials) {
  const root = new THREE.Group();
  root.name = 'mystic-purple-gate';
  const blocks = new BoxBatch(layer);
  const dark = { tex: 'deepslate', tint: 0x252033 };
  const purple = { tex: 'deepslate', tint: 0x49365f };
  const rune = { tex: 'glow', tint: 0xba6cff, emissive: 0.85 };

  // A monumental, layered frame in deep-violet stone, with a glowing threshold.
  blocks.box(0, -0.16, 0, 5.65, 0.16, 4.2, { tex: 'stone', tint: 0x574866 });
  blocks.box(0, 0, 0, 4.9, 0.3, 3.5, { tex: 'deepslate', tint: 0x332b43 });
  for (const x of [-2.28, 2.28]) {
    blocks.box(x, 0.22, 0, 0.76, 6.15, 0.82, dark);
    blocks.box(x * 0.82, 0.3, 0, 0.24, 5.85, 0.58, purple);
    blocks.box(x * 0.82, 0.68, 0.44, 0.1, 5.0, 0.055, rune);
    for (let y = 0.65; y < 5.8; y += 0.78) {
      blocks.box(x, y, 0.47, 0.88, 0.12, 0.12, { tex: 'paint', tint: 0x66577e });
    }
    blocks.box(x, 6.02, 0, 1.02, 0.55, 1.08, purple);
  }
  blocks.box(0, 6.18, 0, 5.25, 0.72, 1.02, dark);
  blocks.box(0, 6.28, 0.54, 4.46, 0.12, 0.08, rune);
  blocks.box(0, 6.8, 0, 3.6, 0.28, 0.75, purple);
  for (const x of [-1.6, -0.8, 0, 0.8, 1.6]) blocks.box(x, 6.91, 0.42, 0.12, 0.12, 0.12, rune);
  for (const mesh of blocks.build(materials)) root.add(mesh);

  const energy = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNear: { value: 0 }, uCharge: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uNear;
      uniform float uCharge;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 uv = vUv;
        vec2 d = abs(uv - 0.5) - vec2(0.475, 0.485);
        float rounded = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.028;
        float mask = 1.0 - smoothstep(-0.005, 0.009, rounded);
        vec2 p = vec2((uv.x - 0.5) * 0.76, (uv.y - 0.5) * 0.56);
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float time = uTime * (0.72 + uCharge * 1.3);
        float field = noise(p * 12.0 + vec2(time * 0.22, -time * 0.35));
        float spiral = sin(angle * 5.0 - radius * 39.0 + time * 2.1 + field * 3.2);
        float arms = pow(0.5 + 0.5 * spiral, 5.0);
        float filaments = pow(0.5 + 0.5 * sin(angle * 11.0 + radius * 26.0 - time * 1.7), 12.0);
        float bands = 0.5 + 0.5 * sin(radius * 64.0 - time * 3.2 + field * 4.0);
        float core = exp(-radius * 8.0);
        float rim = 1.0 - smoothstep(0.006, 0.04, abs(rounded));
        vec3 deep = vec3(0.12, 0.035, 0.29);
        vec3 violet = vec3(0.43, 0.12, 0.92);
        vec3 lilac = vec3(0.82, 0.48, 1.0);
        vec3 color = mix(deep, violet, clamp(0.2 + arms * 0.72 + bands * 0.13, 0.0, 1.0));
        color = mix(color, lilac, clamp(filaments * 0.68 + core * 0.42 + rim * 0.5, 0.0, 1.0));
        float alpha = mask * (0.2 + arms * 0.42 + filaments * 0.42 + bands * 0.13 + core * 0.38 + uNear * 0.12 + uCharge * 0.3);
        gl_FragColor = vec4(color * alpha * 1.45, alpha);
      }
    `,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(3.78, 5.95), energy);
  surface.position.set(0, 3.2, 0.31);
  surface.renderOrder = 2;
  root.add(surface);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.055, 8, 72), new THREE.MeshBasicMaterial({ color: 0xb865ff, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false }));
  ringA.position.set(0, 3.2, 0.38); ringA.scale.y = 1.48; root.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.022, 6, 72), new THREE.MeshBasicMaterial({ color: 0x7250ff, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false }));
  ringB.position.set(0, 3.2, 0.34); ringB.scale.y = 1.34; root.add(ringB);

  const crystalGeometry = new THREE.OctahedronGeometry(0.36, 0);
  const crystalMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xd398ff }),
    new THREE.MeshBasicMaterial({ color: 0x8850e8 }),
  ];
  const crystals = [];
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, upper = i < 4;
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterials[i % 2]);
    const x = side * (upper ? 2.48 : 2.74), y = upper ? 5.9 - (i % 2) * 0.54 : 1.0 + (i % 2) * 0.68;
    crystal.position.set(x, y, 0.3 + (i % 3) * 0.06);
    crystal.rotation.z = side * (upper ? 0.28 : -0.35);
    root.add(crystal);
    crystals.push({ mesh: crystal, y, phase: i * 1.7, speed: 1.0 + i * 0.07 });
  }

  const count = 112;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count), sparks = new Float32Array(count);
  const angles = new Float32Array(count), radiusX = new Float32Array(count), radiusY = new Float32Array(count), speeds = new Float32Array(count), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = i * 3, spark = i % 9 === 0;
    angles[i] = i * 2.399963;
    radiusX[i] = 1.95 + ((i * 37) % 100) / 100 * 1.0;
    radiusY[i] = 2.6 + ((i * 53) % 100) / 100 * 0.88;
    speeds[i] = (spark ? 0.75 : 0.2) + ((i * 19) % 100) / 100 * (spark ? 1.1 : 0.55);
    phases[i] = i * 0.81;
    sizes[i] = spark ? 0.19 + (i % 4) * 0.035 : 0.085 + (i % 5) * 0.018;
    sparks[i] = spark ? 1 : 0;
    colors[p] = spark ? 0.9 : 0.58;
    colors[p + 1] = spark ? 0.76 : 0.27;
    colors[p + 2] = 1;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  particleGeometry.setAttribute('aSpark', new THREE.BufferAttribute(sparks, 1));
  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aSpark;
      varying vec3 vColor;
      varying float vSpark;
      void main() {
        vColor = aColor; vSpark = aSpark;
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = aSize * (300.0 / max(1.0, -view.z));
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vSpark;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float halo = exp(-d * d * 24.0) * 0.7;
        float core = exp(-d * d * 180.0);
        float crossRay = max(exp(-abs(p.x) * 80.0 - abs(p.y) * 8.0), exp(-abs(p.y) * 80.0 - abs(p.x) * 8.0));
        float glow = halo + mix(core, crossRay, vSpark) * (0.9 + vSpark * 1.8);
        gl_FragColor = vec4(vColor * glow, glow);
      }
    `,
  });
  const motes = new THREE.Points(particleGeometry, particleMaterial);
  motes.renderOrder = 3;
  motes.frustumCulled = false;
  root.add(motes);

  let time = 0;
  return {
    group: root,
    update(dt, near, charge) {
      time = (time + dt) % (Math.PI * 200);
      energy.uniforms.uTime.value = time;
      energy.uniforms.uNear.value = near;
      energy.uniforms.uCharge.value = charge;
      ringA.rotation.z = time * 0.14;
      ringB.rotation.z = -time * 0.2;
      for (let i = 0; i < crystals.length; i++) {
        const crystal = crystals[i];
        crystal.mesh.position.y = crystal.y + Math.sin(time * crystal.speed + crystal.phase) * 0.16;
        crystal.mesh.rotation.y = time * crystal.speed * 0.6 + crystal.phase;
      }
      for (let i = 0; i < count; i++) {
        const p = i * 3, angle = angles[i] + time * speeds[i];
        const pulse = Math.sin(time * 2.0 + phases[i]);
        positions[p] = Math.cos(angle) * (radiusX[i] + pulse * 0.1);
        positions[p + 1] = 3.2 + Math.sin(angle) * radiusY[i];
        positions[p + 2] = 0.5 + Math.sin(time * 2.7 + phases[i]) * 0.2;
      }
      particleGeometry.attributes.position.needsUpdate = true;
    },
  };
}

function frame(batch, at) {
  batch.at(at.x, 0, at.z, at.yaw, () => {
    const obsidian = { tex: 'deepslate', tint: 0x303341 };
    const edge = { tex: 'paint', tint: 0x596b83 };
    const glow = { tex: 'glow', tint: 0x62d7e8, emissive: 0.55 };
    batch.box(0, -0.16, 0, 3.25, 0.16, 3.05, { tex: 'stone', tint: 0x7d8585 });
    for (const x of [-1.28, 1.28]) {
      batch.box(x, 0, 0, 0.34, 3.05, 0.38, obsidian);
      batch.box(x, 0.2, 0.205, 0.08, 2.45, 0.035, glow);
      batch.box(x, 2.95, 0, 0.48, 0.32, 0.48, edge);
    }
    batch.box(0, 3.02, 0, 2.82, 0.34, 0.42, obsidian);
    batch.box(0, 3.04, 0.23, 2.25, 0.08, 0.04, glow);
  });
}

export function buildOtherContinent({ layer, materials, stage }) {
  const land = new VoxelGrid({ min: [LAND.x0, -27, LAND.z0], size: [LAND.x1 - LAND.x0, 38, LAND.z1 - LAND.z0] });
  defineBaseBlocks(land);
  buildIsland(land, LAND, {
    round: true, bays: 5, wobble: 0.8, depth: 20, seed: 47,
    surfaceAt: (_x, _z, edge) => edge < 2.5 ? 'sand' : 'grass',
  });
  buildTrees(land, [
    [-18, 483, 5, 2], [-10, 492, 6, 2], [13, 487, 5, 2], [23, 496, 6, 2],
    [-24, 508, 5, 2], [20, 515, 5, 2], [-12, 524, 6, 2], [7, 530, 5, 2],
    [31, 505, 5, 2], [-33, 490, 5, 2],
  ]);

  const scenery = new THREE.Group();
  scenery.name = 'far-ocean-continent';
  for (const meshes of Object.values(land.build(materials, layer))) for (const mesh of meshes) scenery.add(mesh);

  const fittings = new BoxBatch(layer);
  frame(fittings, HOME_PORTAL);
  for (const mesh of fittings.build(materials)) scenery.add(mesh);
  stage.scene.add(scenery);

  const homeGate = createGate(), remoteGate = createMysticGate(layer, materials);
  homeGate.group.position.set(HOME_PORTAL.x, 0, HOME_PORTAL.z);
  homeGate.group.rotation.y = HOME_PORTAL.yaw;
  remoteGate.group.position.set(REMOTE_PORTAL.x, 0, REMOTE_PORTAL.z);
  remoteGate.group.rotation.y = REMOTE_PORTAL.yaw;
  stage.scene.add(homeGate.group, remoteGate.group);

  const site = {
    levels(x, z, out) {
      if (land.type(Math.floor(x), -1, Math.floor(z))) out.push({ y: 0, site: 'far-ocean-continent' });
    },
    obstructed(x, z, feet) {
      const bx = Math.floor(x), bz = Math.floor(z);
      return land.type(bx, Math.floor(feet + 0.15), bz) || land.type(bx, Math.floor(feet + 0.95), bz) || land.type(bx, Math.floor(feet + 1.7), bz);
    },
  };

  let pending = -1, transferIn = 0, cooldown = 0;
  return {
    site,
    update(dt, player, rig) {
      const homeDx = player.pos.x - HOME_PORTAL.x, homeDz = player.pos.z - HOME_PORTAL.z;
      const remoteDx = player.pos.x - REMOTE_PORTAL.x, remoteDz = player.pos.z - REMOTE_PORTAL.z;
      const homeDistance = Math.hypot(homeDx, homeDz), remoteDistance = Math.hypot(remoteDx, remoteDz);
      const chargingHome = pending === 0 ? 1 : 0, chargingRemote = pending === 1 ? 1 : 0;
      homeGate.update(dt, 1 - THREE.MathUtils.smoothstep(homeDistance, 2, 9), chargingHome, 0);
      remoteGate.update(dt, 1 - THREE.MathUtils.smoothstep(remoteDistance, 2, 9), chargingRemote);
      if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);

      if (pending >= 0) {
        transferIn -= dt;
        if (transferIn <= 0) {
          const destination = pending === 0 ? REMOTE_ARRIVAL : HOME_ARRIVAL;
          if (player.restore(destination.x, 0, destination.z, destination.heading)) rig.recenter(player, true);
          pending = -1;
          cooldown = 1.2;
        }
        return;
      }
      if (cooldown > 0 || player.mode !== 'ground') return;
      if (homeDistance < 1.45) { pending = 0; transferIn = 0.48; }
      else if (remoteDistance < 1.45) { pending = 1; transferIn = 0.48; }
    },
  };
}
