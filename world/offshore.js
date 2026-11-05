import * as THREE from 'three';
import { MOUNTAIN_SITE } from './layout.js';

// Beyond the mountain's far (south) shore, as seen from the house and bridge.
// The low tower is screened by the ridge; the rotor clears the skyline.
export function buildOffshore() {
  const x = MOUNTAIN_SITE.x - 12, z = MOUNTAIN_SITE.z + MOUNTAIN_SITE.r + 18;
  const hubY = 44.8, hubZ = -2.65;
  const white = 0xe8eee9, edge = 0xb9c9cd, steel = 0x425c65;
  const teal = 0x43858b, amber = 0xd9a254;
  const positions = [], normals = [], colors = [], moving = [];
  const tint = new THREE.Color();
  function append(geometry, color, rotates = false) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    for (let i = 0; i < g.attributes.position.count; i++) {
      const px = g.attributes.position.getX(i), py = g.attributes.position.getY(i), pz = g.attributes.position.getZ(i);
      positions.push(px, py + (rotates ? hubY : 0), pz + (rotates ? hubZ : 0));
      normals.push(g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i));
      if (g.attributes.color) tint.fromBufferAttribute(g.attributes.color, i);
      else tint.setHex(color);
      colors.push(tint.r, tint.g, tint.b); moving.push(rotates ? 1 : 0);
    }
    if (g !== geometry) g.dispose();
    geometry.dispose();
  }
  function cylinder(cx, cy, cz, top, bottom, height, color, sides = 24) {
    const g = new THREE.CylinderGeometry(top, bottom, height, sides);
    g.translate(cx, cy, cz); append(g, color);
  }
  function box(cx, cy, cz, w, h, d, color) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, cy, cz); append(g, color);
  }
  function ring(radius, tube, cy, color) {
    const g = new THREE.TorusGeometry(radius, tube, 5, 32);
    g.rotateX(Math.PI / 2); g.translate(0, cy, 0); append(g, color);
  }
  function ellipsoid(cx, cy, cz, rx, ry, rz, color, rotates = false) {
    const g = new THREE.SphereGeometry(1, 20, 12);
    g.scale(rx, ry, rz); g.translate(cx, cy, cz); append(g, color, rotates);
  }

  // A marine monopile, service deck and slim safety rail, all in the same draw.
  cylinder(0, -4, 0, 1.5, 1.75, 12, steel);
  cylinder(0, 1.6, 0, 1.53, 1.53, 2.8, amber);
  cylinder(0, 3.05, 0, 3.05, 3.05, .3, steel, 32);
  ring(2.87, .055, 4.23, edge); ring(2.87, .04, 3.72, edge);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    cylinder(Math.cos(a) * 2.87, 3.7, Math.sin(a) * 2.87, .045, .045, 1.08, edge, 6);
  }
  cylinder(0, 23.6, 0, .63, 1.24, 40.8, white);
  for (const cy of [16.4, 29.6]) {
    const r = 1.24 - (cy - 3.2) / 40.8 * .61;
    cylinder(0, cy, 0, r + .018, r + .018, .065, edge);
  }
  cylinder(0, 4.8, 0, 1.22, 1.24, .48, teal);
  box(0, 4.38, -1.22, .62, 1.9, .08, steel);
  box(0, 4.38, -1.27, .5, 1.73, .04, edge);
  box(.15, 4.35, -1.31, .045, .23, .035, steel);
  for (const sx of [-.38, .38]) box(sx, .8, -1.64, .055, 4.5, .07, steel);
  for (let cy = -1.3; cy < 3; cy += .32) box(0, cy, -1.68, .8, .055, .065, edge);

  // Softly rounded nacelle, dark cooling slots, a roof hatch and wind sensor.
  cylinder(0, 43.85, 0, .85, .72, .55, steel);
  ellipsoid(0, hubY, .05, 1.15, 1.03, 2.5, white);
  ellipsoid(0, hubY - .45, .7, 1.02, .46, 1.65, edge);
  for (const sx of [-1, 1]) {
    box(sx * 1.105, hubY + .12, .42, .035, .16, 1.5, teal);
    for (let i = 0; i < 5; i++) box(sx * 1.025, hubY - .18, .65 + i * .19, .045, .23, .065, steel);
  }
  box(0, hubY + 1.01, .35, .68, .07, .95, edge);
  cylinder(0, hubY + 1.38, 1.15, .035, .035, .85, steel, 6);
  box(0, hubY + 1.8, 1.15, .65, .04, .04, steel);
  cylinder(0, hubY + 1.16, -.55, .12, .14, .22, amber, 10);

  // Each blade has a rounded airfoil section, gradual twist and swept tip.
  // All three share the same closed geometry, rotated exactly 120 degrees.
  const rings = [
    [.45, 0, .30, .26], [1.2, 0, .42, .24], [2.1, -.12, .68, .20],
    [3.4, -.27, .86, .16], [5.2, -.20, .78, .13], [7.2, -.03, .64, .10],
    [9.5, .20, .48, .075], [11.8, .46, .34, .055], [13.8, .72, .22, .04],
    [15.4, .94, .12, .025], [16.3, 1.08, .045, .014], [16.5, 1.11, 0, 0],
  ];
  const vertices = [], indices = [], bladeColors = [], sides = 12;
  rings.forEach(([r, sweep, chord, thickness]) => {
    const pitch = .28 * (1 - r / 16.5);
    tint.setHex(r >= 15.4 ? teal : white);
    for (let j = 0; j < sides; j++) {
      const a = j / sides * Math.PI * 2;
      const u = Math.cos(a) * chord, v = Math.sin(a) * thickness;
      vertices.push(sweep + u * Math.cos(pitch) - v * Math.sin(pitch), r,
        -.08 - r * r * .0013 + u * Math.sin(pitch) + v * Math.cos(pitch));
      bladeColors.push(tint.r, tint.g, tint.b);
    }
  });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    indices.push(a, a + sides, b, b, a + sides, b + sides);
  }
  for (let j = 1; j < sides - 1; j++) indices.push(0, j, j + 1);
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute(bladeColors, 3));
  blade.setIndex(indices); blade.computeVertexNormals();
  for (let i = 0; i < 3; i++) append(blade.clone().rotateZ(i * Math.PI * 2 / 3), white, true);
  blade.dispose();
  ellipsoid(0, 0, -.12, .79, .79, 1.05, white, true);
  ellipsoid(0, 0, -1.01, .26, .26, .18, edge, true);

  const geometry = new THREE.BufferGeometry();
  for (const [name, values, size] of [['position', positions, 3], ['normal', normals, 3], ['color', colors, 3], ['turbineRotor', moving, 1]]) {
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, size));
  }
  // Include the full swept disc: the vertex shader turns blades after culling.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 26, 0), 37);
  const rotor = new THREE.Object3D(), angle = { value: 0 };
  rotor.name = 'offshore-turbine-rotor'; rotor.position.set(0, hubY, hubZ);
  rotor.rotation.z = .25;
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = shader => {
    shader.uniforms.uTurbineAngle = angle;
    shader.vertexShader = 'attribute float turbineRotor; uniform float uTurbineAngle;\n' + shader.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nmat2 turbineTurn=mat2(cos(uTurbineAngle),sin(uTurbineAngle),-sin(uTurbineAngle),cos(uTurbineAngle));\nif(turbineRotor>.5)objectNormal.xy=turbineTurn*objectNormal.xy;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nif(turbineRotor>.5)transformed.xy=turbineTurn*(transformed.xy-vec2(0.,${hubY}))+vec2(0.,${hubY});`);
  };
  material.customProgramCacheKey = () => 'offshore-turbine';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'offshore-turbine'; mesh.onBeforeRender = () => { angle.value = rotor.rotation.z; };
  // Static shadow maps must not retain a frozen rotor silhouette.
  mesh.castShadow = false; mesh.receiveShadow = true;
  const group = new THREE.Group(); group.name = 'offshore-wind-turbine';
  group.position.set(x, 0, z); group.add(mesh, rotor);
  return { group, rotor, x, z };
}
