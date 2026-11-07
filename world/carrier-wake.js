import * as THREE from 'three';

const SEA_Y = -1.08;

function foamRibbon(x, length, width, phase) {
  const positions = [], indices = [], steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, z = -32 - t * length;
    const center = x + Math.sin(t * 13 + phase) * width * .2;
    const half = width * (.12 + Math.sin(t * Math.PI) * .5) * (1 - t * .34);
    positions.push(center - half, 0, z, center + half, 0, z);
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: 0xe8f6f2, transparent: true, opacity: 0,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = SEA_Y + .025;
  return mesh;
}

export function createCarrierWake(carrier) {
  const group = new THREE.Group();
  group.name = 'carrier-wake';
  const rings = [];
  // The wake should read clearly around the full hull, not as a thin line
  // directly behind the stern. The outer rings provide the broad water push.
  for (const [rx, rz, opacity] of [[12.4, 42, .34], [14.6, 47, .25], [16.8, 52, .18]]) {
    const geometry = new THREE.RingGeometry(.97, 1, 96);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xd8f3ef, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.scale.set(rx, rz, 1);
    ring.position.y = SEA_Y + .015;
    ring.userData.baseOpacity = opacity;
    rings.push(ring);
    group.add(ring);
  }
  const ribbons = [];
  for (const [x, phase] of [[-4.2, 0], [-2.6, 1.2], [-1, 2.4], [.8, 3.1], [2.6, 4.1], [4.2, 5.2]]) {
    const ribbon = foamRibbon(x, 30 + Math.abs(x) * 2.2, 1.55, phase);
    ribbons.push(ribbon);
    group.add(ribbon);
  }
  carrier.add(group);

  const previous = carrier.position.clone();
  let strength = 0, time = 0;
  return {
    update(dt) {
      const step = Math.max(dt, 1e-3);
      const speed = carrier.position.distanceTo(previous) / step;
      previous.copy(carrier.position);
      const target = THREE.MathUtils.smoothstep(speed, .5, 5.5);
      strength += (target - strength) * Math.min(1, dt * 2.5);
      time += dt;
      group.visible = strength > .01;
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ring.material.opacity = ring.userData.baseOpacity * strength;
        const pulse = 1 + Math.sin(time * 2.1 - i * .8) * .012 * strength;
        ring.scale.set(12.4 + i * 2.2 * pulse, 42 + i * 5 * pulse, 1);
      }
      for (const ribbon of ribbons) ribbon.material.opacity = .34 * strength;
    },
  };
}
