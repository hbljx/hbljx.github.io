import * as THREE from 'three';

const SEA_Y = -1.08;

function foamRibbon(x, length, width, phase) {
  const positions = [], indices = [], steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, z = -32 - t * length;
    const center = x + Math.sin(t * 13 + phase) * width * .18;
    const half = width * (.08 + Math.sin(t * Math.PI) * .42) * (1 - t * .38);
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
  for (const [rx, rz, opacity] of [[9.1, 32.5, .22], [10.1, 34.2, .16], [11.2, 36, .11]]) {
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
  for (const [x, phase] of [[-2.4, 0], [-.8, 1.7], [.8, 3.1], [2.4, 4.4]]) {
    const ribbon = foamRibbon(x, 20 + Math.abs(x) * 1.4, .9, phase);
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
        ring.scale.set(9.1 + i * 1.05 * pulse, 32.5 + i * 1.75 * pulse, 1);
      }
      for (const ribbon of ribbons) ribbon.material.opacity = .24 * strength;
    },
  };
}
