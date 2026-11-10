import * as THREE from 'three';

export const DEEP_LANDMARKS = [
  { name: '荧光珊瑚林', x: -350, z: 285, depth: 260, color: '#67edce' },
  { name: '深海热泉', x: -610, z: 435, depth: 300, color: '#ffbd73' },
  { name: '领地界碑', x: -430, z: 570, depth: 300, color: '#9fcaff' },
];

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const mound = (x, z, cx, cz, rx, rz) => Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));

// One continuous surface for the coastal shelf, tunnel basin and abyss.
// The submarine uses the same height field for hull clearance.
export function seabedAt(x, z) {
  const shelf = -10 + 1.2 * Math.sin(x * .065 + z * .03) * Math.cos(z * .071);
  const basin = smoothstep(x, 49, 115) * smoothstep(z, -16, 45) * (1 - smoothstep(z, 112, 181));
  const hills = 9 * mound(x, z, 80, 74, 20, 31) + 7 * mound(x, z, 103, 115, 17, 21)
    + 11 * mound(x, z, 156, 45, 18, 25) + 10 * mound(x, z, 159, 125, 23, 24)
    + 16 * mound(x, z, 216, 85, 23, 35) + 8 * mound(x, z, 230, 124, 19, 28);
  const channel = (x - 181 - 14 * Math.sin((z - 35) * .032)) / 19;
  const trench = 23 * Math.exp(-(channel ** 2)) * smoothstep(z, -5, 51) * (1 - smoothstep(z, 126, 189));
  const coast = shelf - 18 * basin + hills - trench;

  const depth = clamp((-x - 140) / 160, 0, 1);
  const broadRelief = Math.sin(x * .018 + z * .006) * 17 + Math.cos(z * .014 - x * .009) * 12;
  const ridges = Math.sin(x * .035 + Math.sin(z * .012) * 2) * Math.cos(z * .021) * 20;
  const roughness = Math.sin(x * .061 - z * .028) * Math.cos(z * .047) * 7;
  const abyss = -34 - depth * 386 + (broadRelief + ridges + roughness) * (.3 + depth * .7);
  return lerp(coast, abyss, (1 - smoothstep(x, -20, 48)) * smoothstep(z, 10, 32));
}

// Denser samples near the tunnel keep its slopes smooth. The coarser grid
// farther away joins the same indexed mesh without seams.
function terrainAxis(start, sections) {
  const points = [start];
  for (const [end, step] of sections) {
    const count = Math.ceil((end - start) / step);
    for (let i = 1; i <= count; i++) points.push(lerp(start, end, i / count));
    start = end;
  }
  return points;
}

export function createSeabed() {
  const xs = terrainAxis(-950, [[-160, 18], [48, 8], [240, 5], [400, 18]]);
  const zs = terrainAxis(-220, [[-32, 18], [192, 5], [244, 10], [900, 18]]);
  const nx = xs.length - 1, nz = zs.length - 1;
  const positions = [], colors = [], indices = [];
  const low = new THREE.Color(0x183f52), shelf = new THREE.Color(0x719d94);
  const sand = new THREE.Color(0xb4b494), rock = new THREE.Color(0x466c72), color = new THREE.Color();
  for (let iz = 0; iz <= nz; iz++) {
    const z = zs[iz];
    for (let ix = 0; ix <= nx; ix++) {
      const x = xs[ix], y = seabedAt(x, z);
      positions.push(x, y, z);
      if (ix < nx && iz < nz) {
        const a = iz * (nx + 1) + ix, b = a + 1, c = a + nx + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  for (let i = 0; i < normals.count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const sediment = .45 + .29 * Math.sin(x * .11 + z * .1 + 1.4 * Math.sin(z * .15))
      + .12 * Math.sin(x * .27 - z * .23);
    color.copy(shelf).lerp(sand, sediment).lerp(rock, smoothstep(1 - normals.getY(i), .018, .27));
    const basinShade = .42 * (1 - smoothstep(y, -55, -19));
    color.lerp(low, lerp(basinShade, 1, 1 - smoothstep(y, -420, -55)));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.name = 'continuous-underwater-terrain';
  terrain.visible = false;
  return terrain;
}

export function buildDeepSea(B) {
  const rock = { tex: 'stone', tint: 0x417d8b, emissive: .12 };
  const seabed = { tex: 'paint', tint: 0x83b3ac, emissive: .22 };
  // Terraced gardens frame the circuit with a sandy channel between them.
  // Even the highest branches remain below the full-depth hull envelope.
  const gardens = [[-360,290],[-495,245],[-605,330],[-625,470],[-520,555],[-370,515],[-350,405],[-485,405]];
  const palette = [0x67e4cc,0xb29be8,0xf29b9b,0xf0c17b,0x72cbea];
  for (const [n, garden] of gardens.entries()) {
    const [gx,gz] = garden, base = seabedAt(gx,gz);
    for(let i=0;i<11;i++) {
      const a=i*2.4, x=gx+Math.cos(a)*(8+i*1.4), z=gz+Math.sin(a)*(7+i), y=base+2;
      const coral={tex:'paint',tint:palette[(n+i)%palette.length],emissive:.55};
      const h=11+i%4*5;
      if(i%3===0) {
        B.box(x,y,z,2,h,2,rock);
        for(let j=0;j<3;j++){
          B.box(x,y+h-j*4,z,15-j*3,1.6,11-j*2,coral,{ry:a});
          B.box(x,y+h-j*4+1.6,z,13-j*3,.3,9-j*2,{tex:'paint',tint:0xc1f4dc,emissive:.65},{ry:a});
        }
      } else {
        B.at(x,y,z,a,()=>{
          B.box(0,0,0,1.5,h,1.5,coral);
          for(const side of [-1,1]) {
            B.box(side*3,h*.45,0,7,1.4,1.4,coral,{rz:side*.55});
            B.box(side*5,h*.58,0,1.2,h*.45,1.2,coral);
            B.box(side*5,h*.95,0,3.5,1.2,3.5,{tex:'paint',tint:0xc6ffeb,emissive:.8});
          }
        });
      }
    }
    for(let i=0;i<14;i++){
      const a=i*2.3,x=gx+Math.cos(a)*(32+i*.5),z=gz+Math.sin(a)*(27+i*.4),ground=seabedAt(x,z);
      const kelp={tex:'paint',tint:i%2?0x319f96:0x5fc7ac,emissive:.25};
      B.box(x,ground,z,.8,15+i%5*3,2.3,kelp,{rz:Math.sin(a)*.18});
      B.box(x+1,ground+12+i%5*2,z,5,.7,2.2,kelp,{rz:.35});
    }
  }
  for(let i=0;i<90;i++){
    const x=-345-(i*79%365),z=190+(i*131%415),ground=seabedAt(x,z);
    B.box(x,ground+.1,z,9+i%4*3,.16,1.2,seabed,{ry:.3});
    if(i%3===0){
      B.box(x,ground,z+5,3,2,3,{tex:'paint',tint:palette[i%5],emissive:.7});
      B.box(x,ground+2,z+5,1,2.8,1,{tex:'paint',tint:0xd0fff3,emissive:.9});
    }
  }
  // All scenery stays below the submarine's 320 m navigation envelope.
  for (let i = 0; i < 19; i++) {
    const x = -350 + Math.cos(i * 2.4) * (10 + i * 1.5);
    const z = 285 + Math.sin(i * 2.4) * (10 + i * 1.5), h = 22 + i % 5 * 7;
    const coral = { tex: 'paint', tint: i % 2 ? 0x56d6ba : 0x918bd8, emissive: .6 };
    const ground=seabedAt(x,z);
    B.box(x, ground, z, 2.4, h, 2.4, coral);
    B.box(x, ground + h * .62, z, 12, 2, 3, coral);
    for (const side of [-1, 1]) B.box(x + side * 5, ground + h * .62, z, 2, 10, 2, coral);
    B.box(x, ground + h, z, 5, 2, 5, coral);
  }
  for (let i = 0; i < 7; i++) {
    const x = -610 + Math.cos(i * 2.3) * 22, z = 435 + Math.sin(i * 2.3) * 22, h = 20 + i * 4;
    const ground=seabedAt(x,z);
    B.box(x, ground, z, 10, h, 10, rock);
    B.box(x, ground + h, z, 6, 2, 6, { tex: 'paint', tint: 0xe5a25f, emissive: .8 });
    for (let j = 0; j < 5; j++) B.box(x + Math.sin(j) * 2, ground + h + 4 + j * 4, z, 1.5 + j * .6, 1, 1.5 + j * .6, { tex: 'paint', tint: 0x6c9398, emissive: .2 });
  }
  const markerGround=seabedAt(-430,570);
  B.box(-430, markerGround, 570, 40, 5, 30, rock);
  B.box(-430, markerGround+5, 570, 28, 4, 20, seabed);
  for (const x of [-441, -419]) B.box(x, markerGround+9, 570, 4, 45, 4, rock);
  B.box(-430, markerGround+54, 570, 28, 4, 6, rock);
  B.box(-430, markerGround+14, 570, 6, 28, 5, { tex: 'paint', tint: 0x9ac9f4, emissive: .75 });
  for (const site of DEEP_LANDMARKS) {
    const y=seabedAt(site.x,site.z);
    B.box(site.x, y, site.z, 1.2, 16, 1.2, { tex: 'paint', tint: 0x749faf });
    B.box(site.x, y+16, site.z, 4, 2, 4, { tex: 'paint', tint: Number.parseInt(site.color.slice(1), 16), emissive: 1 });
  }
}

// Render callbacks avoid modifying the engine's shared weather/pool systems.
// Every overridden value is restored immediately after the submarine frame.
export function installDeepSeaView(stage, isActive, scenery) {
  const scene = stage.scene, before = scene.onBeforeRender, after = scene.onAfterRender;
  const water = new THREE.Color(0x10475b), savedColor = new THREE.Color();
  const state = { background: null, near: 0, far: 0, cameraFar: 0, sky: true, hemi: 0 };
  let saved = null;
  scene.onBeforeRender = function(renderer, current, camera) {
    before?.call(this, renderer, current, camera);
    scenery.visible = isActive() && camera === stage.camera && camera.position.y < -1.2;
    if (!isActive() || camera !== stage.camera || camera.position.y >= -1.2) return;
    saved = state; saved.background = scene.background; saved.near = scene.fog.near; saved.far = scene.fog.far;
    saved.cameraFar = camera.far; saved.sky = stage.sky.visible; saved.hemi = stage.hemi.intensity; savedColor.copy(scene.fog.color);
    scene.background = water; scene.fog.color.copy(water); scene.fog.near = 220; scene.fog.far = 1200;
    stage.sky.visible = false; stage.hemi.intensity = Math.max(1.8, saved.hemi);
    camera.far = 1350; camera.updateProjectionMatrix();
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
