import * as THREE from 'three';
import { chooseVehicleColor } from './vehicle-colors.js';

// A small voxel road bike, facing local +X. All parts share one draw call.
export function createMotorcycle(x, z) {
  const positions = [], normals = [], colors = [];
  const color = new THREE.Color();
  function part(geometry, hex, px, py, pz, rx = 0, ry = 0, rz = 0) {
    const g = geometry.toNonIndexed(); geometry.dispose();
    g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(px, py, pz);
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
    color.setHex(hex);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.dispose();
  }
  const box = (x, y, z, w, h, d, c, rz = 0) => part(new THREE.BoxGeometry(w, h, d), c, x, y, z, 0, 0, rz);
  const tire = 0x20252a, steel = 0x9da5aa, dark = 0x343c40, orange = chooseVehicleColor('motorcycle');
  for (const axle of [-.84, .84]) {
    part(new THREE.CylinderGeometry(.37, .37, .23, 12), tire, axle, .37, 0, Math.PI / 2);
    for (const side of [-1, 1]) {
      part(new THREE.CylinderGeometry(.23, .23, .025, 10), steel, axle, .37, side * .122, Math.PI / 2);
      part(new THREE.CylinderGeometry(.10, .10, .03, 8), dark, axle, .37, side * .14, Math.PI / 2);
    }
  }
  box(-.16, .51, 0, 1.28, .12, .27, dark);
  box(-.12, .66, 0, .52, .38, .36, dark);
  for (let y = .54; y <= .79; y += .07) box(-.04, y, 0, .46, .025, .4, steel);
  box(.24, .99, 0, .67, .39, .43, orange, -.12);
  box(-.49, .96, 0, .75, .14, .42, tire);
  box(-.88, .84, 0, .52, .1, .36, orange);
  box(.86, .79, 0, .52, .08, .32, orange, .08);
  for (const side of [-1, 1]) {
    box(.69, .75, side * .17, .075, .83, .075, steel, .23);
    box(-.60, .64, side * .19, .07, .49, .07, steel, -.48);
    box(-.3, .43, side * .32, .24, .07, .17, dark);
    box(.53, 1.24, side * .32, .20, .075, .21, tire);
    box(.49, 1.45, side * .40, .04, .36, .04, steel, .15);
    box(.47, 1.63, side * .40, .16, .12, .06, dark);
    box(.49, 1.63, side * .40, .02, .08, .05, 0xb6d3da);
  }
  box(.53, 1.24, 0, .07, .07, .72, steel);
  box(.78, 1.12, 0, .18, .24, .28, dark);
  box(.88, 1.12, 0, .025, .17, .20, 0xffecc1);
  box(-1.15, .88, 0, .06, .09, .22, 0xe64232);
  box(-.56, .48, .29, .92, .14, .14, steel);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'motorcycle'; mesh.position.set(x, 0, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
