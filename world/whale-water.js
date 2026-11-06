import * as THREE from 'three';

const CYCLE = 9, SPOUT_DURATION = 2.4, SPLASH_DURATION = 2.05;
// Top of the blowhole ellipsoid in ocean-models.js (the whale is size 3).
const NOZZLE = new THREE.Vector3(0, 1.02, 3.9);
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const fragmentEnd = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
`;
const noise = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1.,0.)), f.x),
             mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
}
`;

function material(uniforms, vertexShader, fragmentShader) {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true, fog: true,
  });
}

// A parameter grid: all flow and deformation happen on the GPU, not via uploads.
function sheetGeometry(layers, rows, columns) {
  const positions = [], indices = [];
  for (const layer of layers) {
    const start = positions.length / 3;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
      positions.push(col / columns, row / rows, layer);
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = start + row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 22);
  return geometry;
}

function particleGeometry(count) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seeds = new Float32Array(count * 4);
  let seed = 613;
  for (let i = 0; i < seeds.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    seeds[i] = seed / 4294967296;
  }
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 3, 0), 22);
  return geometry;
}

const streamVertex = `
  uniform float uTime, uStrength;
  varying vec2 vFlow;
  #include <fog_pars_vertex>
  void main() {
    float t = position.y, around = position.x * 6.2831853;
    float branch = position.z * 2.0943951;
    float spread = 1.7 * pow(t, 3.);
    float radius = (.065 + .15 * sin(t * 3.14159)) * (1. - .65 * t);
    radius *= 1. + .12 * sin(t * 48. - uTime * 19. + branch);
    vec3 p = vec3(cos(branch) * spread, 14. * t - 8. * t * t, sin(branch) * spread);
    p.xz += vec2(cos(around), sin(around)) * radius;
    p.xz += sin(vec2(17., 23.) * t - uTime * 7. + branch) * .035 * t;
    p *= vec3(.15 + .85 * uStrength, .12 + .88 * uStrength, .15 + .85 * uStrength);
    vFlow = vec2(position.x, t);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const streamFragment = `
  uniform float uTime, uStrength;
  varying vec2 vFlow;
  #include <fog_pars_fragment>
  ${noise}
  void main() {
    float flow = noise(vec2(vFlow.x * 11., vFlow.y * 28. - uTime * 12.));
    float glint = pow(.5 + .5 * sin(vFlow.x * 25. + vFlow.y * 9. - uTime * 4.), 8.);
    float alpha = (.42 + .35 * flow) * uStrength * (1. - smoothstep(.7, 1., vFlow.y));
    vec3 tint = mix(vec3(.29,.71,.82), vec3(.89,.99,1.), .4 + .45 * flow + .15 * glint);
    gl_FragColor = vec4(tint, alpha);
    ${fragmentEnd}
  }
`;

// Camera-facing quads give round, soft droplets on both phones and desktops.
const particleVertex = `
  attribute vec4 aSeed;
  uniform float uAge, uStrength, uSplash;
  varying vec2 vUv;
  varying float vAlpha, vMist, vSeed;
  #include <fog_pars_vertex>
  void main() {
    float angle = aSeed.x * 6.2831853, mist = step(.78, aSeed.w);
    vec2 direction = vec2(cos(angle), sin(angle));
    vec3 p; float radius, stretch, alpha;
    if (uSplash < .5) {
      float life = 1.35 + .6 * aSeed.z;
      float age = mod(uAge + aSeed.y * life, life);
      float t = age / life;
      float travel = (.45 + aSeed.z * 1.1) * age * age;
      p = vec3(direction.x * travel, 10.5 * age - 4.8 * age * age, direction.y * travel);
      p += vec3(.25 * sin(angle + age * 3.), .15 * sin(angle * 3. + age * 4.), 0.) * age;
      if (mist > .5) {
        p.xz *= 1.2;
        p.y = 4.6 + t * 1.8;
      }
      p *= .12 + .88 * uStrength;
      radius = mix(.035 + aSeed.z * .07, .24 + .38 * t, mist) * (.25 + .75 * uStrength);
      stretch = mix(1.5 + abs(10.5 - 9.6 * age) * .12, 1., mist);
      alpha = sin(t * 3.14159) * uStrength * mix(.85, .21, mist);
      alpha *= smoothstep(0., .22, uAge - aSeed.y * .5);
    } else {
      float age = max(0., uAge - aSeed.y * .12);
      float launch = 4.2 + aSeed.z * 5.2;
      float travel = 1.25 + age * (2.2 + aSeed.y * 3.6);
      p = vec3(direction.x * travel, launch * age - 4.9 * age * age, direction.y * travel * 1.55);
      radius = mix(.045 + aSeed.y * .11, .25 + age * .36, mist);
      stretch = mix(1.3 + abs(launch - 9.8 * age) * .16, 1., mist);
      alpha = (1. - smoothstep(.65, 2.05, age)) * mix(.9, .25, mist);
      alpha *= smoothstep(0., .07, p.y) * smoothstep(0., .06, age);
    }
    vUv = position.xy; vAlpha = alpha; vMist = mist; vSeed = aSeed.z;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
    mvPosition.xy += position.xy * vec2(radius, radius * stretch);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const particleFragment = `
  varying vec2 vUv;
  varying float vAlpha, vMist, vSeed;
  #include <fog_pars_fragment>
  void main() {
    float d = length(vUv);
    float soft = 1. - smoothstep(mix(.48, .05, vMist), 1., d);
    float glint = exp(-18. * dot(vUv - vec2(-.22,.28), vUv - vec2(-.22,.28)));
    float alpha = vAlpha * soft;
    if (alpha < .004) discard;
    vec3 tint = mix(vec3(.47,.82,.9), vec3(.94,1.,1.), .45 + .25 * vSeed + .3 * glint);
    gl_FragColor = vec4(tint, alpha);
    ${fragmentEnd}
  }
`;

const splashVertex = `
  uniform float uAge;
  varying vec3 vWater;
  varying float vAlpha;
  #include <fog_pars_vertex>
  void main() {
    float a = position.x * 6.2831853, v = position.y, layer = position.z;
    vec3 p;
    if (layer < 0.) {
      float crest = .7 + .16 * sin(a * 11. + .5) + .14 * sin(a * 17.);
      float height = max(0., 9. * uAge - 6.4 * uAge * uAge) * crest;
      float r = 1.5 + uAge * 3.8 + v * (.2 + uAge * .9);
      p = vec3(cos(a) * r, .04 + pow(v, .8) * height, sin(a) * r * 1.5);
      vAlpha = smoothstep(0., .07, uAge) * (1. - smoothstep(.55, 1.4, uAge));
    } else {
      float age = max(0., uAge - layer * .16);
      float r = 1.7 + age * (4.2 - layer * .4) + (v - .5) * (.65 + age * .22);
      r += .12 * sin(a * 9. + layer) + .08 * sin(a * 19.);
      p = vec3(cos(a) * r, .05 + .12 * sin(v * 3.14159) * exp(-age), sin(a) * r * 1.5);
      vAlpha = smoothstep(0., .12, uAge - layer * .16) * (1. - smoothstep(.3, 2.05, uAge));
    }
    vWater = vec3(a, v, layer);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const splashFragment = `
  uniform float uAge;
  varying vec3 vWater;
  varying float vAlpha;
  #include <fog_pars_fragment>
  ${noise}
  void main() {
    float n = noise(vec2(cos(vWater.x), sin(vWater.x)) * 15. + vec2(vWater.y * 6., -uAge * 2.));
    float foam, alpha;
    if (vWater.z < 0.) {
      foam = smoothstep(.58, .93, vWater.y) * (.55 + .45 * n);
      float edge = 1. - smoothstep(.88, 1., vWater.y);
      float lace = smoothstep(.18, .62, n + (1. - vWater.y) * .35);
      alpha = vAlpha * edge * lace * (.26 + .5 * foam);
    } else {
      foam = pow(sin(vWater.y * 3.14159), 1.2);
      alpha = vAlpha * foam * smoothstep(.22, .7, n) * .82;
    }
    if (alpha < .004) discard;
    gl_FragColor = vec4(mix(vec3(.3,.72,.81), vec3(.91,.99,1.), .25 + .75 * foam), alpha);
    ${fragmentEnd}
  }
`;

export function createWhaleWaterEffects(time) {
  const group = new THREE.Group(); group.name = 'whale-effects';
  const whales = [];
  const streamGeometry = sheetGeometry([0, 1, 2], 40, 8);
  const splashGeometry = sheetGeometry([-1, 0, 1, 2], 8, 96);
  const sprayGeometry = particleGeometry(240);
  const frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4();
  const bounds = new THREE.Sphere(new THREE.Vector3(), 23);
  let seaY = -1.08;

  function mesh(geometry, mat, name, parent) {
    const result = new THREE.Mesh(geometry, mat);
    result.name = name; result.renderOrder = 4; parent.add(result);
    return result;
  }
  function attach(source, phase) {
    const spout = new THREE.Group(), splash = new THREE.Group();
    spout.name = 'whale-spout'; splash.name = 'whale-splash';
    spout.visible = false; splash.visible = false; group.add(spout, splash);
    const spray = { uTime: time, uAge: { value: 0 }, uStrength: { value: 0 }, uSplash: { value: 0 } };
    const impact = { uAge: { value: 0 }, uStrength: { value: 1 }, uSplash: { value: 1 } };
    mesh(streamGeometry, material(spray, streamVertex, streamFragment), 'whale-spout-streams', spout);
    mesh(sprayGeometry, material(spray, particleVertex, particleFragment), 'whale-spout-mist', spout);
    mesh(splashGeometry, material(impact, splashVertex, splashFragment), 'whale-splash-water-and-foam', splash);
    mesh(sprayGeometry, material(impact, particleVertex, particleFragment), 'whale-splash-droplets', splash);
    whales.push({ source, phase, spout, splash, spray, impact, previousY: source.position.y, armed: false, started: -Infinity });
  }
  function visible(position, camera) {
    if (!camera) return true;
    if (camera.position.distanceToSquared(position) > 52 * 52) return false;
    bounds.center.copy(position); bounds.center.y += 3;
    return frustum.intersectsSphere(bounds);
  }
  function update(camera) {
    if (camera) {
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
    }
    for (const whale of whales) {
      const { source, phase, spout, splash, spray, impact } = whale;
      const action = (time.value + phase) % CYCLE;
      const jumping = action >= 4.5 && action < 7.05;
      const blocked = source.userData.whaleBlocked;
      const strength = smooth(action / .65) * (1 - smooth((action - 1.4) / 1.));
      spout.position.copy(NOZZLE).applyMatrix4(source.matrixWorld);
      spout.quaternion.copy(source.quaternion);
      spout.visible = action < SPOUT_DURATION && !blocked && strength > .001 && visible(spout.position, camera);
      if (spout.visible) { spray.uAge.value = action; spray.uStrength.value = strength; }

      // The body, not a timer, must hit the actual sea surface on its descent.
      const contactY = seaY + 1.1;
      if (blocked || !jumping) whale.armed = false;
      else if (source.position.y > contactY + .1) whale.armed = true;
      if (whale.armed && whale.previousY > contactY && source.position.y <= contactY) {
        whale.armed = false; whale.started = time.value;
        splash.position.set(source.position.x, seaY, source.position.z);
        splash.rotation.y = source.rotation.y;
      }
      whale.previousY = source.position.y;
      const age = time.value - whale.started;
      splash.visible = age >= 0 && age < SPLASH_DURATION && visible(splash.position, camera);
      if (splash.visible) impact.uAge.value = age;
    }
  }
  return { group, attach, update, setWaterHeight(y) { seaY = y; } };
}
