import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';

// One offshore turbine, with its rotor kept separate so it can turn in place.
export function buildOffshore(B, layer, materials) {
  const steel = { tex: 'paint', tint: 0xd8e2dc };
  const darkSteel = { tex: 'paint', tint: 0x52636a };
  const x = 67, z = 54, height = 24;
  B.box(x, -8, z, 1.4, 3, 1.4, darkSteel);
  B.box(x, -5, z, .9, height + 5, .9, steel);
  B.box(x, height, z, 2.2, 1.5, 2, steel);
  B.box(x, height, z + .98, .72, .52, .08, { tex: 'glass', glass: true });
  B.box(x, -5.7, z, 3.5, .3, 3.5, darkSteel);

  const hubY = height + .08, rotor = new THREE.Group();
  rotor.name = 'offshore-turbine-rotor';
  rotor.position.set(x, hubY, z - 1.9);
  const blades = new BoxBatch(layer);
  blades.box(0, -.24, .7, .48, .48, 1.15, darkSteel);
  for (const angle of [0, 2 * Math.PI / 3, 4 * Math.PI / 3]) {
    const length = 10.5;
    blades.box(Math.sin(angle) * length / 2, Math.cos(angle) * length / 2 - length / 2,
      0, .62, length, .34, steel, { rz: -angle });
    blades.box(Math.sin(angle) * 9.7, Math.cos(angle) * 9.7 - .45,
      0, .82, .9, .4, { tex: 'paint', tint: 0xf3f4e9 }, { rz: -angle });
  }
  for (const mesh of blades.build(materials)) { mesh.castShadow = false; rotor.add(mesh); }
  return { rotor, x, z };
}
