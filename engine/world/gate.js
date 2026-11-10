// The portal's look: a violet vortex drawn in block texels, two soft arms
// turning down a funnel behind its face, a flowing rim, a soft halo, animated
// floor rings and the light it casts on the grass. It livens up as you come
// close. A shallow lens of energy tapers into its edge; there is no straight
// side wall. It faces +z; portal.js places and drives it. Two draw calls: the
// vortex and its glow.
import * as THREE from 'three';

const CELL = 1 / 16; // one texel of a block
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// The oval: centre height and radii in metres. Its foot dips just below the
// ground, so it is wide enough to walk into. DEPTH is the maximum at the
// middle; the two curved faces meet at the perimeter.
const OY = 1.2, RX = 0.82, RY = 1.38, DEPTH = 0.28, HZ = DEPTH / 2;

const COLORS = { a: '#412080', b: '#8950e0', c: '#d5b8ff', white: '#fffcff', rim: '#e9d6ff', halo: '#a571ff', ground: '#a16bf0' };
const MOTION_SPEED = reduced ? 0.2 : 1.65;
// How fast the arms turn at rest (radians of the pattern a second) and how
// much faster right beside it; how deep the funnel sinks behind the face in
// metres, and the most its eye leans towards you, as a share of the radius;
// half the halo card's width and height in metres.
const SPIN = 0.9, SPIN_NEAR = 0.5, SINK = 0.6, LEAN = 0.55, HALO = [RX + 0.7, RY + 0.7];
const LOOK = `
  vec3 look(float r, float a) {
    float phase = a * 2.0 + log(max(r, 0.055)) * 5.4 + uSpin;
    float flow = 0.5 + 0.5 * sin(phase);
    float arms = smoothstep(0.62, 0.98, flow);
    vec3 col = mix(uA, uB, flow * 0.8);
    col = mix(col, uC, arms * (0.4 + 0.25 * (1.0 - r)));
    // Receding ripples and a dark vanishing point give the light somewhere
    // to lead, rather than a white spot painted on a solid object.
    float ripple = pow(0.5 + 0.5 * sin(r * 35.0 + log(max(r, 0.055)) * 3.0 + uTime * 1.9), 8.0);
    col += uB * ripple * 0.1 * (1.0 - smoothstep(0.25, 1.0, r));
    // Fast, narrow currents cut across the slower spiral. Their brightness
    // breathes, so the face reads as a live energy field instead of a texture
    // being spun in place.
    float bands = pow(0.5 + 0.5 * sin(r * 34.0 - uTime * 3.2 + sin(a * 3.0 - uSpin)), 11.0);
    float filaments = pow(max(0.0, sin(a * 7.0 - r * 25.0 + uTime * 2.7 + sin(a * 3.0 + uSpin))), 14.0);
    col += mix(uC, uArc, 0.7) * (bands * 0.2 + filaments * 0.3) * (0.55 + 0.35 * uNear + 0.8 * uCharge);
    float core = exp(-r * r * 42.0) * (0.5 + 0.5 * sin(uTime * 3.4 - uSpin * 1.7));
    col = mix(col, uWhite, core * (0.14 + 0.55 * uCharge));
    col = mix(uA * 0.45, col, smoothstep(0.04, 0.25, r));
    col = mix(col, uWhite, arms * (1.0 - smoothstep(0.1, 0.4, r)) * uCharge * 0.45);
    return col;
  }`;

const HEAD = `
#define CELL ${CELL}
#define OY ${OY}
#define RX ${RX}
#define RY ${RY}
#define HZ ${HZ}
#define SINK ${SINK}
#define LEAN ${LEAN}
uniform float uTime, uSpin, uFlow, uNear, uCharge;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Distance to the oval's edge in metres, near enough (its value over its
// slope): positive inside.
float ovalEdge(vec2 p, vec2 radius) {
  vec2 q = (p - vec2(0.0, OY)) / radius;
  float r = max(length(q), 1e-4);
  return (1.0 - r) * r / max(length(q / radius), 1e-4);
}
float edgeDist(vec2 p) { return ovalEdge(p, vec2(RX, RY)); }`;
// The portal is only translated and rotated. Bring the camera into that same
// local space, where the halo keeps outside the lens and the funnel is traced.
const CAMERA = `
vec3 cameraLocal() {
  vec3 toCamera = cameraPosition - modelMatrix[3].xyz;
  return vec3(dot(toCamera, modelMatrix[0].xyz), dot(toCamera, modelMatrix[1].xyz), dot(toCamera, modelMatrix[2].xyz));
}`;
const GLOW_VERTEX = `
#define OY ${OY}
#define BACK 0.9
uniform float uTime, uCharge;
attribute float aKind;
varying float vKind;
varying vec3 vLocal, vCamera;
#include <fog_pars_vertex>
${CAMERA}
void main() {
  vCamera = cameraLocal();
  vec3 local = position;
  if (aKind < 0.5) {
    // The halo is one card turned to face the camera, so its light hugs the
    // oval's outline the same way from every side. It stands behind the
    // lens (BACK is more than the lens reaches towards any side), so the
    // lens hides whatever glow falls on its own pixels. It grows with how
    // much bigger the lens's near edge looks than the card.
    vec3 centre = vec3(0.0, OY, 0.0), toEye = vCamera - centre;
    float far = length(toEye);
    vec3 view = toEye / far, right = cross(vec3(0.0, 1.0, 0.0), view);
    right = dot(right, right) < 1e-6 ? vec3(1.0, 0.0, 0.0) : normalize(right);
    local = centre - view * BACK + (right * position.x + cross(view, right) * position.y) * (far + BACK) / max(far - BACK, 0.5);
  } else if (aKind > 1.5) {
    // Three floor rings orbit in alternating directions and expand in quick
    // pulses as the gate charges. They share the existing glow draw call.
    float ring = aKind - 2.0;
    float turn = uTime * (ring > 0.5 && ring < 1.5 ? -0.42 : 0.28);
    float expansion = 0.08 + 0.12 * (0.5 + 0.5 * sin(uTime * 9.0 + ring * 2.1));
    float pulse = 1.0 + 0.025 * sin(uTime * 2.4 + ring * 2.1) + uCharge * expansion;
    local.xz *= pulse;
    local.xz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * local.xz;
    local.y += 0.014 * sin(uTime * 2.0 + ring * 1.6);
  }
  vLocal = local;
  vKind = aKind;
  vec4 mvPosition = modelViewMatrix * vec4(local, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const VORTEX_VERTEX = `
attribute float aSide;
varying vec3 vLocal, vCamera;
varying float vSide;
#include <fog_pars_vertex>
${CAMERA}
void main() {
  vLocal = position;
  vCamera = cameraLocal();
  vSide = aSide;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

// Keep the block-texel silhouette, but curve the faces into one another.
// Adjacent cells share the same depth at each corner, with no gaps.
function ovalLens() {
  const position = [], side = [];
  const quad = (corners, s) => {
    const [a, b, c, d] = corners;
    for (const p of [a, b, c, a, c, d]) { position.push(...p); side.push(s); }
  };
  const dist = (x, y) => {
    const qx = x / RX, qy = (y - OY) / RY, r = Math.max(Math.hypot(qx, qy), 1e-4);
    return (1 - r) * r / Math.max(Math.hypot(qx / RX, qy / RY), 1e-4);
  };
  const on = (ix, iy) => {
    if (iy < 0) return false;
    const y = (iy + 0.5) * CELL;
    return y >= 0 && dist((ix + 0.5) * CELL, y) > 0;
  };
  const point = (x, y, face) => {
    const qx = x / RX, qy = (y - OY) / RY;
    return [x, y, face * HZ * Math.sqrt(Math.max(0, 1 - qx * qx - qy * qy))];
  };
  const x0 = Math.floor(-RX / CELL) - 1, x1 = Math.ceil(RX / CELL) + 1, y1 = Math.ceil((OY + RY) / CELL) + 1;
  for (let iy = 0; iy < y1; iy++) for (let ix = x0; ix < x1; ix++) {
    if (!on(ix, iy)) continue;
    const x = ix * CELL, y = iy * CELL, x2 = x + CELL, y2 = y + CELL;
    quad([point(x, y, 1), point(x2, y, 1), point(x2, y2, 1), point(x, y2, 1)], 0);
    quad([point(x2, y, -1), point(x, y, -1), point(x, y2, -1), point(x2, y2, -1)], 0);
    if (!on(ix - 1, iy)) quad([point(x, y, -1), point(x, y, 1), point(x, y2, 1), point(x, y2, -1)], 1);
    if (!on(ix + 1, iy)) quad([point(x2, y, 1), point(x2, y, -1), point(x2, y2, -1), point(x2, y2, 1)], 1);
    if (!on(ix, iy - 1) && y > 0) quad([point(x, y, 1), point(x2, y, 1), point(x2, y, -1), point(x, y, -1)], 1);
    if (!on(ix, iy + 1)) quad([point(x, y2, -1), point(x2, y2, -1), point(x2, y2, 1), point(x, y2, 1)], 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  return geometry;
}

export function createGate() {
  const color = hex => new THREE.Color(hex);
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: { value: 0 }, uSpin: { value: 0 }, uFlow: { value: 0 }, uNear: { value: 0 }, uCharge: { value: 0 }, uShow: { value: 0 },
    uPreview: { value: null }, uFit: { value: new THREE.Vector4(1, 1, 0, 0) },
    uA: { value: color(COLORS.a) }, uB: { value: color(COLORS.b) }, uC: { value: color(COLORS.c) },
    uWhite: { value: color(COLORS.white) }, uRim: { value: color(COLORS.rim) },
    uHalo: { value: color(COLORS.halo) }, uGround: { value: color(COLORS.ground) }, uArc: { value: color('#68edff') },
  };
  const group = new THREE.Group();
  const top = OY + RY;

  // The vortex, one texel per 1/16 m, with a clean light rim; where it leads
  // shows through the middle in the same pixels. The curved surface carries
  // the same flowing energy all the way around, without a separate side material.
  const vortex = new THREE.Mesh(ovalLens(), new THREE.ShaderMaterial({
    uniforms, fog: true, side: THREE.DoubleSide, vertexShader: VORTEX_VERTEX,
    fragmentShader: `${HEAD}
      uniform vec3 uA, uB, uC, uWhite, uRim, uArc;
      uniform float uShow;
      uniform sampler2D uPreview;
      uniform vec4 uFit;
      varying vec3 vLocal, vCamera;
      varying float vSide;
      #include <fog_pars_fragment>
      ${LOOK}
      void main() {
        vec3 col;
        if (vSide > 0.5) {
          float flow = 0.5 + 0.5 * sin(vLocal.y * 7.0 + vLocal.z * 12.0 - uFlow);
          col = mix(uB, uRim, 0.35 + 0.45 * flow);
        } else {
          vec2 p = (floor(vLocal.xy / CELL) + 0.5) * CELL;
          float inside = edgeDist(p) / CELL;
          if (inside < 0.0 || p.y < 0.0) discard;
          vec2 q = (p - vec2(0.0, OY)) / vec2(RX, RY);
          // The swirl lines a cone sunk behind the face. Follow the view ray
          // from this texel down to it: as you walk round, the eye leans
          // towards you and the far wall opens up, like looking into a hole.
          // One ray per texel keeps the pixels whole; below LEAN = 1 the
          // pattern never folds over itself.
          float face = vCamera.z < 0.0 ? -1.0 : 1.0;
          vec3 ray = vec3(p, face * HZ * sqrt(max(0.0, 1.0 - dot(q, q)))) - vCamera;
          vec2 lean = ray.xy / max(-face * ray.z, 1e-3) * SINK / vec2(RX, RY);
          lean *= LEAN / sqrt(LEAN * LEAN + dot(lean, lean));
          vec2 sunk = q + lean * (1.0 - min(length(q), 1.0));
          col = look(length(sunk), atan(sunk.y, sunk.x));
          if (uShow > 0.001) {
            vec2 uv = vec2(p.x / (2.0 * RX) + 0.5, (p.y - OY + RY) / (2.0 * RY));
            col = mix(col, texture2D(uPreview, uv * uFit.xy + uFit.zw).rgb, uShow * smoothstep(2.0, 6.0, inside));
          }
          float angle = atan(q.y, q.x);
          float rim = 1.0 - smoothstep(0.0, 1.6, inside);
          float current = 0.55 + 0.2 * sin(angle * 5.0 - uFlow);
          float streak = smoothstep(0.65, 0.98, sin(angle * 9.0 + uFlow * 2.0))
            * (0.55 + 0.45 * sin(angle * 3.0 - uFlow));
          float arc = smoothstep(0.78, 0.99, sin(angle * 17.0 - uFlow * 2.8 + sin(angle * 4.0 + uTime) * 1.4));
          arc *= 0.5 + 0.5 * sin(angle * 5.0 - uTime * 2.0);
          col = mix(col, uRim, rim * current);
          col = mix(col, uWhite, rim * streak * 0.8);
          col = mix(col, uArc, rim * arc * (0.55 + 0.35 * uNear + 0.7 * uCharge));
        }
        col *= 1.0 + 0.1 * uNear + 0.25 * uCharge;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  }));
  vortex.name = 'portal-vortex';
  group.add(vortex);

  // One halo card, turned to the camera by its shader so the energy shows
  // even from directly beside it. It shares a mesh with the light cast on
  // the grass.
  const position = [], kind = [];
  const quad = (corners, k) => {
    const [a, b, c, d] = corners;
    for (const p of [a, b, c, a, c, d]) { position.push(...p); kind.push(k); }
  };
  const [hx, hy] = HALO;
  quad([[-hx, -hy, 0], [hx, -hy, 0], [hx, hy, 0], [-hx, hy, 0]], 0);
  quad([[-1.6, 0.03, 2], [1.6, 0.03, 2], [1.6, 0.03, -1.2], [-1.6, 0.03, -1.2]], 1);
  const ring = (radius, width, k) => {
    const segments = 128;
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
      const point = (r, angle) => [Math.cos(angle) * r, 0.025, Math.sin(angle) * r];
      quad([point(radius - width, a), point(radius + width, a), point(radius + width, b), point(radius - width, b)], k);
    }
  };
  ring(1.12, 0.035, 2);
  ring(1.62, 0.04, 3);
  ring(2.08, 0.045, 4);
  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  glowGeometry.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  // The card is placed in the shader, so cull by where it can reach instead.
  glowGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, OY, 0), 5);
  const glow = new THREE.Mesh(glowGeometry, new THREE.ShaderMaterial({
    uniforms, fog: true, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: GLOW_VERTEX,
    fragmentShader: `${HEAD}
      uniform vec3 uHalo, uGround, uWhite, uArc;
      varying vec3 vLocal, vCamera; varying float vKind;
      #include <fog_pars_fragment>
      void main() {
        vec3 col;
        if (vKind < 0.5) {
          // Follow each camera ray to where it passes closest to the lens.
          // Rays that meet it leave the lens's own pixels alone; the mask
          // sits just under its stepped edge, so no gap shows between them.
          // The rest glow by how far they miss, in metres, which keeps one
          // soft outline from any side.
          vec3 radius3 = vec3(RX - 0.7 * CELL, RY - 0.7 * CELL, HZ);
          vec3 origin = (vCamera - vec3(0.0, OY, 0.0)) / radius3;
          vec3 ray = (vLocal - vCamera) / radius3;
          vec3 c = origin - ray * dot(origin, ray) / dot(ray, ray);
          float r = length(c);
          if (r < 1.0) discard;
          // The value over its slope is only reliable near the lens; its
          // bounding box also limits the glow, especially at a narrow tip.
          float d = (r - 1.0) * r / max(length(c / radius3), 1e-4);
          d = max(d, length(max(abs(c * radius3) - radius3, 0.0)));
          // A bright skin over a wide, faint aura, fading out with no edge,
          // and out towards the ground, where the card would cut it straight.
          // The aura swells a little as you come close.
          float angle = atan(c.y, c.x + 1e-5);
          float glow = 0.6 * exp(-d * 12.0) + 0.4 * exp(-d * (5.0 - uNear));
          float wave = smoothstep(0.72, 0.99, sin(d * 48.0 - uTime * 4.8 + sin(angle * 5.0 + uFlow)));
          glow *= 0.85 + 0.15 * sin(angle * 4.0 - uFlow);
          glow += wave * exp(-d * 7.0) * 0.35;
          col = uHalo * glow * (1.0 - smoothstep(0.2, 0.5 + 0.1 * uNear, d)) * smoothstep(0.0, 0.4, vLocal.y)
            * (0.15 * (1.0 + 0.6 * uNear) + 0.5 * uCharge);
          // Seed one drifting spark per angular sector and fade it at both ends of its path.
          float sector = fract(angle / 6.2831853 + 0.5) * 36.0;
          float seed = hash(vec2(floor(sector), 17.0));
          float life = fract(uTime * (0.6 / 6.2831853) + seed);
          float drift = 0.35 + 0.30 * life;
          float spark = (1.0 - smoothstep(0.025, 0.12, abs(fract(sector) - drift)))
            * (1.0 - smoothstep(0.007, 0.024, abs(d - (0.045 + life * 0.31))));
          spark *= smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.45, 1.0, life));
          col += mix(uHalo, uWhite, seed) * spark * smoothstep(0.05, 0.4, vLocal.y) * (0.45 + 0.25 * uNear);
          col += uArc * spark * smoothstep(0.15, 0.5, vLocal.y) * (0.22 + 0.35 * uCharge);
        } else if (vKind < 1.5) {
          // Light spilling onto the grass from the foot of the oval: brightest
          // where it meets the ground, fading unevenly texel by texel, no edge.
          vec2 cell = floor(vLocal.xz / CELL), g = (cell + 0.5) * CELL;
          float across = max(abs(g.x) - RX * 0.35, 0.0) / 0.5;
          float out_ = g.y / (g.y > 0.0 ? 0.85 : 0.55);
          float spill = exp(-across * across - out_ * out_);
          float shimmer = 0.9 + 0.1 * sin(abs(g.y) * 9.0 - uFlow * 2.0 + abs(g.x) * 3.0);
          col = uGround * spill * shimmer * mix(0.7, 1.15, hash(cell)) * (0.42 * (1.0 + 0.4 * uNear) + 0.6 * uCharge);
        } else {
          float ring = vKind - 2.0;
          float radius = length(vLocal.xz);
          float angle = atan(vLocal.z, vLocal.x);
          float radius0 = ring < 0.5 ? 1.12 : ring < 1.5 ? 1.62 : 2.08;
          float width = ring < 0.5 ? 0.035 : ring < 1.5 ? 0.04 : 0.045;
          float expansion = 0.08 + 0.12 * (0.5 + 0.5 * sin(uTime * 9.0 + ring * 2.1));
          float pulse = 1.0 + 0.025 * sin(uTime * 2.4 + ring * 2.1) + uCharge * expansion;
          float edge = 1.0 - smoothstep(width * pulse * 0.2, width * pulse, abs(radius - radius0 * pulse));
          float dash = sin(angle * (18.0 + ring * 5.0) + uTime * (ring > 0.5 && ring < 1.5 ? -3.0 : 2.4));
          float traveling = 0.55 + 0.45 * sin(angle * 3.0 - uTime * 2.2 + ring * 1.8);
          float boltWave = sin(angle * (24.0 + ring * 8.0) - uTime * (5.0 + ring * 2.0)
            + sin(angle * 7.0 + uTime * 3.0) * 0.75);
          float lightning = pow(max(0.0, boltWave), 18.0) * edge;
          float sparks = pow(max(0.0, sin(angle * (11.0 + ring * 4.0) - uTime * (4.0 + ring * 1.2))), 32.0) * edge;
          float fade = 1.0 - smoothstep(2.5, 3.05, radius);
          float energy = 0.3 + 0.2 * smoothstep(0.72, 0.98, dash) * traveling;
          col = mix(uHalo, uArc, 0.68) * (energy + lightning * 1.2 + sparks * 0.55) * fade * (0.55 + 0.65 * uNear + uCharge);
          col += uWhite * edge * (lightning * 1.15 + sparks * 0.9) * (0.35 + 0.5 * uNear + uCharge);
        }
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            col *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            col *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          #endif
        #endif
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  glow.name = 'portal-glow'; glow.renderOrder = 2;
  group.add(glow);

  let time = 0, spin = 0, flow = 0;
  return {
    group,
    // How wide a walk into it counts, half the width and the depth nobody
    // walks through, and the oval's shape for fitting a picture.
    width: 1.1, solid: RX + 0.05, depth: HZ, aspect: RX / RY,
    // What a click on the portal hits, in its own space.
    box: new THREE.Box3(new THREE.Vector3(-RX, 0, -HZ), new THREE.Vector3(RX, top, HZ)),
    // The destination's picture, fitted as [repeat x, y, offset x, y]; null clears it.
    setPreview(texture, fit = [1, 1, 0, 0]) {
      uniforms.uPreview.value = texture; uniforms.uFit.value.set(...fit);
      if (!texture) uniforms.uShow.value = 0;
    },
    // near: how close the player is (0–1); charge: opening for a journey (0–1);
    // show: how far the destination's picture has faded in (0–1).
    update(dt, near, charge, show) {
      const step = dt * MOTION_SPEED;
      // Time-driven shader phases use multiples of 0.1 rad/s, so they wrap together.
      time = (time + step) % (20 * Math.PI);
      // The swirl speeds up as you come close and more with the charge, so
      // its phase adds up here: a clock multiplied by the speed in the
      // shader would jump with it.
      const lively = 1 + SPIN_NEAR * near;
      spin = (spin + step * (SPIN * lively + 3.5 * charge)) % (Math.PI * 2);
      flow = (flow + step * (1.6 * lively + 2.6 * charge)) % (Math.PI * 2);
      uniforms.uTime.value = time;
      uniforms.uSpin.value = spin; uniforms.uFlow.value = flow;
      uniforms.uNear.value = near; uniforms.uCharge.value = charge;
      uniforms.uShow.value = uniforms.uPreview.value ? show : 0;
    },
  };
}
