// 2025 Model Y (Juniper), facing +X. Metres, with a 2.89 m wheelbase.
// One opaque body with a transparent glass canopy, movable as a unit.
// Neutral paint/glass sheen uses no environment map, reflection pass or light.
import * as THREE from 'three';
import { createJetExhaust } from './jet-car.js';
import { buildCarCabin } from './car-cabin.js';
import { chooseVehicleColor } from './vehicle-colors.js';

export function createCar(B, x, z) {
  const position = [], normals = [], colors = [], finishes = [], emissions = [];
  const paint = chooseVehicleColor('tesla'), glass = 0xc9d6dc, rubber = 0x101010;
  const dark = 0x080808, alloy = 0x595959;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  function vertex(p, normal, color, finish, emission = 0) {
    position.push(...p); normals.push(...normal); colors.push(color.r, color.g, color.b); finishes.push(finish); emissions.push(emission);
  }
  function face(points, hex, finish = 0, outward, emission = 0) {
    a.fromArray(points[1]).sub(b.fromArray(points[0]));
    b.fromArray(points[2]).sub(n.fromArray(points[0]));
    n.crossVectors(a, b).normalize();
    if (outward && n.dot(b.fromArray(outward)) < 0) { points = [...points].reverse(); n.negate(); }
    const color = new THREE.Color(hex), normal = n.toArray();
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) vertex(p, normal, color, finish, emission);
    }
  }
  function geometry(g, hex, finish, matrix) {
    const source = g.index ? g.toNonIndexed() : g;
    source.applyMatrix4(matrix);
    const color = new THREE.Color(hex), p = source.attributes.position, normal = source.attributes.normal;
    for (let i = 0; i < p.count; i++) vertex([p.getX(i), p.getY(i), p.getZ(i)], [normal.getX(i), normal.getY(i), normal.getZ(i)], color, finish);
    if (source !== g) source.dispose();
    g.dispose();
  }
  function smooth(start, end = finishes.length) {
    const shared = new Map();
    const keyAt = i => position.slice(i * 3, i * 3 + 3).map(v => Math.round(v * 1e6)).join(',');
    for (let i = start; i < end; i++) {
      const key = keyAt(i), normal = shared.get(key) || new THREE.Vector3();
      normal.add(a.fromArray(normals, i * 3)); shared.set(key, normal);
    }
    for (const normal of shared.values()) normal.normalize();
    for (let i = start; i < end; i++) shared.get(keyAt(i)).toArray(normals, i * 3);
  }
  const transform = (cx, cy, cz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(
    new THREE.Vector3(cx, cy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  const box = (cx, cy, cz, w, h, d, hex, finish = 0, rx = 0, ry = 0, rz = 0) => geometry(new THREE.BoxGeometry(w, h, d), hex, finish, transform(cx, cy, cz, rx, ry, rz));
  const cylinder = (cx, cy, cz, r, depth, hex, finish = 0) => geometry(new THREE.CylinderGeometry(r, r, depth, 48, 1), hex, finish, transform(cx, cy, cz, Math.PI / 2));
  function rail(from, to, width, hex = paint, finish = 1) {
    a.fromArray(to).sub(b.fromArray(from));
    const length = a.length(), centre = b.fromArray(from).add(n.fromArray(to)).multiplyScalar(.5);
    const matrix = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.normalize()), new THREE.Vector3(1, 1, 1));
    geometry(new THREE.BoxGeometry(width, length, width), hex, finish, matrix);
  }
  const profile = [
    [-2.395, .78, 1.02], [-2.24, .89, 1.055], [-1.85, .951, 1.045],
    [-1.1, .948, 1.025], [.4, .938, 1.025], [1.15, .948, 1.01],
    [1.75, .927, .975], [2.22, .863, .91], [2.395, .765, .875],
  ];
  function section(cx) {
    let i = 1; while (i < profile.length - 1 && profile[i][0] < cx) i++;
    const p = profile[i - 1], q = profile[i], t = (cx - p[0]) / (q[0] - p[0]);
    const before = profile[Math.max(0, i - 2)], after = profile[Math.min(profile.length - 1, i + 1)];
    const cubic = k => {
      const span = q[0] - p[0];
      const m0 = (q[k] - before[k]) / (q[0] - before[0]) * span;
      const m1 = (after[k] - p[k]) / (after[0] - p[0]) * span;
      return (2*t*t*t - 3*t*t + 1)*p[k] + (t*t*t - 2*t*t + t)*m0 + (-2*t*t*t + 3*t*t)*q[k] + (t*t*t - t*t)*m1;
    };
    return [cubic(1), cubic(2)];
  }
  // Cut the lower silhouette around the tyres instead of burying square wheels
  // inside a rectangular slab. Close rings taper both bumpers and the shoulders.
  const cabinRear = -1.76, cabinFront = .98;
  const xs = new Set([...profile.map(p => p[0]), cabinRear, cabinFront]);
  for (let i = 0; i <= 80; i++) xs.add(-2.395 + 4.79 * i / 80);
  const rings = [...xs].sort((a, b) => a - b).map(cx => {
    const [w, top] = section(cx);
    let sill = .29;
    for (const axle of [-1.445, 1.445]) {
      const dx = Math.abs(cx - axle);
      if (dx < .465) sill = Math.max(sill, .405 + Math.sqrt(.465 ** 2 - dx ** 2));
    }
    const shoulder = Math.max(sill + .025, top - .10);
    return [
      [cx, .25, -w * .72], [cx, sill, -w * .975], [cx, shoulder - .025, -w],
      [cx, top - .065, -w * .983], [cx, top - .025, -w * .91],
      [cx, top - .012, -w * .83], [cx, top, 0], [cx, top - .012, w * .83],
      [cx, top - .025, w * .91], [cx, top - .065, w * .983],
      [cx, shoulder - .025, w], [cx, sill, w * .975], [cx, .25, w * .72],
    ];
  });
  for (let i = 1; i < rings.length; i++) for (let j = 0; j < rings[i].length; j++) {
    // The cabin is a hollow shell: retain the hood and boot, never span
    // the passenger space with the old solid body-top triangles.
    if ((j === 5 || j === 6) && rings[i - 1][0][0] >= cabinRear && rings[i][0][0] <= cabinFront) continue;
    const k = (j + 1) % rings[i].length;
    face([rings[i - 1][j], rings[i - 1][k], rings[i][k], rings[i][j]], paint, 1);
  }
  smooth(0);
  face(rings[0], paint, 1, [-1, 0, 0]);
  face(rings.at(-1), paint, 1, [1, 0, 0]);
  const bodyEnd = position.length;
  box(0, .255, 0, 3.9, .07, 1.36, dark);
  buildCarCabin({ box, geometry, transform, rail });

  // A continuous arched glass canopy: low windscreen, high middle and the
  // long hatchback slope are the recognisable Model Y silhouette.
  const roofCurve = new THREE.CatmullRomCurve3([
    [-2.12, 1.055, .76], [-1.72, 1.38, .75], [-1.12, 1.69, .71],
    [-.55, 1.80, .70], [.05, 1.77, .71], [.43, 1.60, .745], [1.12, 1.025, .805],
  ].map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const roof = roofCurve.getPoints(48).map(p => p.toArray());
  const roofAt = x => {
    const i = Math.max(1, roof.findIndex(p => p[0] >= x));
    const p = roof[i - 1], q = roof[i], t = (x - p[0]) / (q[0] - p[0]);
    return [x, THREE.MathUtils.lerp(p[1], q[1], t), THREE.MathUtils.lerp(p[2], q[2], t)];
  };
  const canopy = roof.map(([cx, cy, w]) => [[cx, 1.015, -.855], [cx, cy - .035, -w], [cx, cy, 0], [cx, cy - .035, w], [cx, 1.015, .855]]);
  const canopyStart = finishes.length;
  for (let i = 1; i < canopy.length; i++) for (let j = 0; j < 4; j++) {
    face([canopy[i - 1][j], canopy[i - 1][j + 1], canopy[i][j + 1], canopy[i][j]], glass, 2);
  }
  smooth(canopyStart);
  // Glazing must leave the opaque batch so occupants and the far windows
  // remain visible. Reuse the canopy shape and its smoothed normals.
  const glassGeometry = new THREE.BufferGeometry();
  glassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position.splice(canopyStart * 3), 3));
  glassGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals.splice(canopyStart * 3), 3));
  colors.splice(canopyStart * 3); finishes.splice(canopyStart); emissions.splice(canopyStart);
  glassGeometry.computeBoundingSphere();
  for (const s of [-1, 1]) {
    for (let i = 1; i < roof.length; i++) {
      const p = roof[i - 1], q = roof[i];
      rail([p[0], p[1] - .025, s * (p[2] + .014)], [q[0], q[1] - .025, s * (q[2] + .014)], .036);
    }
    // The rear quarter follows the same roof curve, with no detached tip.
    const quarter = [...roof.filter(p => p[0] < -1.52), roofAt(-1.52)];
    face([...quarter.map(p => [p[0], p[1] - .025, s * (p[2] + .022)]), [-1.67, 1.025, s * .864], [-2.13, 1.025, s * .864]], paint, 1, [0, 0, s]);
    const pillar = roofAt(-.78);
    rail([-.78, 1.025, s * .868], [-.78, pillar[1] - .025, s * (pillar[2] + .014)], .052, dark, 0);
    rail([-1.83, 1.024, s * .864], [1.1, 1.024, s * .864], .024, dark, 0);
    for (const cx of [-1.28, .42]) box(cx, .94, s * .948, .20, .025, .018, dark);
    // Subtle door cuts stop above the sill; no exaggerated panel outlines.
    for (const cx of [-.78, .97]) rail([cx, .39, s * .937], [cx, .99, s * .94], .009, dark, 0);
    box(0, .30, s * .927, 1.86, .09, .05, dark);
    rail([.85, 1.045, s * .86], [.84, 1.07, s * 1.025], .035, dark, 0);
    box(.85, 1.105, s * 1.035, .23, .10, .135, paint, 1, 0, s * -.18);
    box(.80, 1.11, s * 1.04, .012, .06, .105, alloy, 2);
    for (const axle of [-1.445, 1.445]) {
      const tyreProfile = [[.28,-.1225],[.365,-.1225],[.393,-.10],[.405,-.065],[.405,.065],[.393,.10],[.365,.1225],[.28,.1225],[.28,-.1225]];
      geometry(new THREE.LatheGeometry(tyreProfile.map(p => new THREE.Vector2(...p)), 48), rubber, 0, transform(axle, .405, s * .872, Math.PI / 2));
      cylinder(axle, .405, s * 1.001, .292, .018, 0x2b3035, 3);
      cylinder(axle, .405, s * 1.014, .105, .022, 0x42494e, 3);
      geometry(new THREE.TorusGeometry(.282, .008, 6, 48), 0x788087, 3, transform(axle, .405, s * 1.025));
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7;
        box(axle + Math.cos(angle) * .177, .405 + Math.sin(angle) * .177, s * 1.018, .205, .064, .015, alloy, 3, 0, 0, angle + .23);
      }
      // Fine wheel-arch lip follows the actual cutout, independent of the tyre.
      for (let i = 0; i < 16; i++) {
        const p = i * Math.PI / 16, q = (i + 1) * Math.PI / 16;
        const at = (angle, r) => [axle + Math.cos(angle) * r, .405 + Math.sin(angle) * r, s * .956];
        face([at(p, .464), at(q, .464), at(q, .485), at(p, .485)], 0x222629, 0, [0, 0, s]);
      }
    }
  }
  // Fit each edge to the actual tapered body, including the front corners.
  // A fixed-width box protrudes above the hood where its shoulders narrow.
  // Sampling the body triangles keeps housings and lenses within 3 mm of it.
  const frontRay = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(-1, 0, 0));
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), hit = new THREE.Vector3();
  function frontSurface(cy, cz) {
    frontRay.origin.set(3, cy, cz);
    let front = -Infinity;
    for (let i = 0; i < bodyEnd; i += 9) {
      if (Math.max(position[i], position[i + 3], position[i + 6]) < 1.9) continue;
      va.fromArray(position, i); vb.fromArray(position, i + 3); vc.fromArray(position, i + 6);
      if (frontRay.intersectTriangle(va, vb, vc, false, hit)) front = Math.max(front, hit.x);
    }
    if (!Number.isFinite(front)) throw new Error('Car lamp edge misses the body');
    return front;
  }
  function frontStrip(z0, z1, centreY, height, hex, emission = 0, offset = .003) {
    const steps = Math.ceil((z1 - z0) / .035), edges = [];
    for (let i = 0; i <= steps; i++) {
      const cz = THREE.MathUtils.lerp(z0, z1, i / steps);
      const cy = typeof centreY === 'function' ? centreY(cz) : centreY;
      edges.push([cy - height / 2, cy + height / 2].map(y => [frontSurface(y, cz) + offset, y, cz]));
    }
    for (let i = 1; i < edges.length; i++) face([edges[i - 1][0], edges[i][0], edges[i][1], edges[i - 1][1]], hex, emission ? -1 : 0, [1, 0, 0], emission);
  }
  const lightLine = cz => .826 - .032 * (Math.abs(cz) / .82) ** 4;
  frontStrip(-.82, .82, lightLine, .047, dark, 0, .001);
  frontStrip(-.80, .80, lightLine, .024, 0xf5f5f5, 1.25);
  for (const s of [-1, 1]) {
    frontStrip(s * .65 - .15, s * .65 + .15, .575, .105, dark, 0, .001);
    frontStrip(s * .65 - .122, s * .65 + .122, .58, .032, 0xf5f5f5, 1.4);
  }
  frontStrip(-.61, .61, .375, .07, dark, 0, .001);
  // Fit the sculpted T and separate arched crown to the actual hood.
  // Fixed badge heights used to bury the mark beneath the curved body.
  const hoodRay = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  function hoodBadge(contour) {
    const points = contour.map(([u, v]) => {
      const cx = 1.86 - v * .40, cz = u * .48;
      hoodRay.origin.set(cx, 3, cz);
      let top = -Infinity;
      for (let i = 0; i < bodyEnd; i += 9) {
        va.fromArray(position, i); vb.fromArray(position, i + 3); vc.fromArray(position, i + 6);
        if (hoodRay.intersectTriangle(va, vb, vc, false, hit)) top = Math.max(top, hit.y);
      }
      if (!Number.isFinite(top)) throw new Error('Car badge misses the hood');
      return [cx, top + .008, cz];
    });
    for (const triangle of THREE.ShapeUtils.triangulateShape(contour.map(p => new THREE.Vector2(...p)), []))
      face(triangle.map(i => points[i]), 0xe1e5e8, -1, [0, 1, 0], .12);
  }
  hoodBadge([[-.50,.85],[-.30,.95],[0,1],[.30,.95],[.50,.85],[.46,.76],[.28,.85],[0,.90],[-.28,.85],[-.46,.76]]);
  hoodBadge([[-.43,.68],[-.25,.77],[0,.81],[.25,.77],[.43,.68],[.24,.59],[.10,.65],[.065,.12],[0,0],[-.065,.12],[-.10,.65],[-.24,.59]]);
  // Rear diffuser and hatch lip.
  box(-2.365, .32, 0, .08, .14, 1.48, dark);
  box(-2.14, 1.075, 0, .20, .035, 1.57, paint, 1, 0, 0, -.05);
  box(-2.411, .965, 0, .035, .19, 1.66, dark);
  box(-2.42, .64, 0, .025, .19, .53, dark);
  // TESLA lettering sits inside the indirect rear light recess.
  const letters = {
    T: [[0,1,1,1],[.5,1,.5,0]], E: [[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]],
    S: [[1,1,0,1],[0,1,0,.5],[0,.5,1,.5],[1,.5,1,0],[1,0,0,0]],
    L: [[0,1,0,0],[0,0,1,0]], A: [[0,0,.5,1],[.5,1,1,0],[.2,.4,.8,.4]],
  };
  [...'TESLA'].forEach((letter, i) => {
    const offset = .32 - i * .145;
    for (const [u, v, p, q] of letters[letter]) rail([-2.445, .946 + v * .037, offset - u * .07], [-2.445, .946 + q * .037, offset - p * .07], .005, 0x25262a, 0);
  });

  // Keep rear lamps in the movable car mesh too.
  for (const s of [-1, 1]) {
    box(-2.35, .95, s * .803, .08, .07, .035, 0xea0016, -1);
    box(-2.373, .358, s * .60, .018, .027, .22, 0x951420, -1);
  }
  box(-2.435, 1.008, 0, .018, .032, 1.52, 0xf60018, -1);
  box(-2.433, .97, 0, .014, .042, 1.49, 0xc40016, -1);
  // The twin rear jets and four VTOL nozzles join the original opaque mesh.
  for (const s of [-1, 1]) {
    geometry(new THREE.CylinderGeometry(.255, .22, .46, 16), alloy, 3, transform(-2.52, .57, s * .59, 0, 0, Math.PI / 2));
    geometry(new THREE.CylinderGeometry(.185, .185, .018, 16), dark, 0, transform(-2.76, .57, s * .59, 0, 0, Math.PI / 2));
    geometry(new THREE.TorusGeometry(.21, .025, 6, 16), 0x80d9ef, -1, transform(-2.77, .57, s * .59, 0, Math.PI / 2));
    for (const x of [-1.05, 1.05]) {
      geometry(new THREE.CylinderGeometry(.21, .18, .14, 12), alloy, 3, transform(x, .19, s * .63));
      geometry(new THREE.TorusGeometry(.17, .022, 6, 12), 0x80d9ef, -1, transform(x, .115, s * .63, Math.PI / 2));
    }
  }
  const meshGeometry = new THREE.BufferGeometry();
  meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  meshGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  meshGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  meshGeometry.setAttribute('carFinish', new THREE.Float32BufferAttribute(finishes, 1));
  meshGeometry.setAttribute('carEmission', new THREE.Float32BufferAttribute(emissions, 1));
  meshGeometry.computeBoundingSphere();
  const material = new THREE.MeshLambertMaterial({vertexColors: true});
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float carFinish; attribute float carEmission; varying float vCarFinish; varying float vCarEmission;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarFinish = carFinish; vCarEmission = carEmission;');
    shader.fragmentShader = 'varying float vCarFinish; varying float vCarEmission;\n' + shader.fragmentShader
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vCarEmission;')
      .replace('#include <opaque_fragment>', /* glsl */`
      // Keep the selected body paint vivid under the scene's coloured ambient light.
      // Lamp colours are separate, so the red rear bar retains its saturation.
      if (vCarFinish >= 0.0) {
        float paintFill = step(.5, vCarFinish) * (1.0 - step(1.5, vCarFinish));
        outgoingLight *= 1.0 + paintFill * .08;
      }
      if (vCarFinish > 0.5) {
        vec3 view = normalize(vViewPosition);
        vec3 reflected = inverseTransformDirection(reflect(-view, normal), viewMatrix);
        float rim = pow(1.0 - abs(dot(normal, view)), 3.0);
        float glazing = step(1.5, vCarFinish) * (1.0 - step(2.5, vCarFinish));
        float softbox = pow(max(0.0, reflected.y), mix(2.0, 5.0, glazing)) * exp(-pow(reflected.x * mix(1.8, 3.0, glazing), 2.0));
        outgoingLight += vec3(rim * mix(.018, .025, glazing) + softbox * mix(.04, .035, glazing));
      }
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'car-satin-cabin-v4';
  const mesh = new THREE.Mesh(meshGeometry, material);
  mesh.name = 'car'; mesh.position.set(x, 0, z);
  mesh.castShadow = mesh.receiveShadow = true; mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
  const glassMaterial = new THREE.MeshPhongMaterial({
    color: glass, specular: 0xffffff, shininess: 100,
    transparent: true, opacity: .18, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true,
  });
  const glazing = new THREE.Mesh(glassGeometry, glassMaterial);
  glazing.name = 'car-glass'; glazing.matrixAutoUpdate = false;
  // At overview distance omit the faint sheen to save a draw call; the
  // cabin remains see-through. Hysteresis avoids flicker at the boundary.
  const glazingLOD = new THREE.LOD();
  glazingLOD.name = 'car-glazing';
  glazingLOD.addLevel(glazing, 0);
  glazingLOD.addLevel(new THREE.Object3D(), 25, .1);
  mesh.add(glazingLOD);
  mesh.userData.jetExhaust = createJetExhaust(mesh);

  return mesh;
}
