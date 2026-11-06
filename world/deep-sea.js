import * as THREE from 'three';
import { SHALLOW_REEFS } from './coral-models.js';

export const DEEP_LANDMARKS = [
  { name: '荧光珊瑚林', x: -350, z: 285, depth: 260, color: '#67edce' },
  { name: '深海热泉', x: -610, z: 435, depth: 300, color: '#ffbd73' },
  { name: '领地界碑', x: -430, z: 570, depth: 300, color: '#9fcaff' },
];

// One continuous slope, shared by visual geometry and hull clearance checks.
export function seabedAt(x, z) {
  // The eastern observation basin lies below the complete tunnel floor.
  if (x > 50 && x <= 180 && z >= 32 && z <= 180) return -23;
  if (z < 32 || x > 50) return -9.5;
  return -34 - THREE.MathUtils.clamp((-x - 140) / 160, 0, 1) * 386;
}

export function buildDeepSea(shallow, B) {
  const rock = { tex: 'stone', tint: 0x417d8b, emissive: .12 };
  const seabed = { tex: 'paint', tint: 0x83b3ac, emissive: .22 };
  // Retain the shallow reefs, opening only the western harbor and trench.
  shallow.box(115, -10, -74, 130, .5, 212, { tex: 'paint', tint: 0x327e94 });
  shallow.box(115, -23.5, 106, 130, .5, 148, seabed);
  shallow.box(4, -10, -74, 92, .5, 212, { tex: 'paint', tint: 0x327e94 });
  shallow.box(-111, -10, -74, 138, .5, 212, { tex: 'paint', tint: 0x327e94 });
  // A visible shelf immediately offshore gives swimmers a recognizable
  // seabed before the western trench begins.
  shallow.box(-8, -10, 73, 150, .5, 86, seabed);
  for (const [i, reef] of SHALLOW_REEFS.entries()) {
    const [x,z] = reef, turn = i * .71;
    shallow.box(x, -9.35, z, 10 + i % 3 * 2, .8, 8 + i % 2 * 2, rock, { ry: turn });
    shallow.box(x - 1, -8.85, z + 1, 7, .22, 6, seabed, { ry: turn });
    // Sculpted coral colonies join the ocean geometry batch.
    for (let j = 0; j < 3; j++) {
      const a = turn + j * 2.1, px = x + Math.cos(a) * 5.4, pz = z + Math.sin(a) * 4.4;
      shallow.box(px, -6.3 + j % 2 * .5, pz, .45, 5.8 + j % 2, .45,
        { tex: 'paint', tint: j % 2 ? 0x43a99b : 0x7ac9a8, emissive: .2 }, { rz: Math.sin(a) * .08 });
    }
  }
  shallow.box(-45, -35, 366, 190, 1, 668, seabed);
  B.box(-600, -421, 366, 600, 1, 668, seabed);
  const slope = Math.atan2(386, 160), length = Math.hypot(386, 160);
  shallow.box(-220 + Math.sin(slope) / 2, -227 - Math.cos(slope) / 2 - .5, 366, length, 1, 668, rock, { rz: slope });
  for (let i = 0; i < 34; i++) {
    const x = -330 - (i * 83 % 490), z = 90 + (i * 137 % 560), h = 6 + i % 6 * 3;
    B.box(x, -420, z, 15 + i % 4 * 5, h, 14 + i % 3 * 6, rock);
    B.box(x + 2, -420 + h, z - 1, 9, 4, 9, seabed);
  }
  // Terraced gardens frame the circuit with a sandy channel between them.
  // Even the highest branches remain below the full-depth hull envelope.
  const gardens = [[-360,290],[-495,245],[-605,330],[-625,470],[-520,555],[-370,515],[-350,405],[-485,405]];
  const palette = [0x67e4cc,0xb29be8,0xf29b9b,0xf0c17b,0x72cbea];
  for (const [n, garden] of gardens.entries()) {
    const [gx,gz] = garden, base = -390 + n % 3 * 6;
    B.box(gx,-420,gz,68,base+420,53,rock,{ry:n*.31});
    B.box(gx,base,gz,56,2,43,seabed,{ry:n*.31});
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
      const a=i*2.3,x=gx+Math.cos(a)*(32+i*.5),z=gz+Math.sin(a)*(27+i*.4);
      const kelp={tex:'paint',tint:i%2?0x319f96:0x5fc7ac,emissive:.25};
      B.box(x,-420,z,.8,15+i%5*3,2.3,kelp,{rz:Math.sin(a)*.18});
      B.box(x+1,-408+i%5*2,z,5,.7,2.2,kelp,{rz:.35});
    }
  }
  for(let i=0;i<90;i++){
    const x=-345-(i*79%365),z=190+(i*131%415);
    B.box(x,-419.9,z,9+i%4*3,.16,1.2,seabed,{ry:.3});
    if(i%3===0){
      B.box(x,-420,z+5,3,2,3,{tex:'paint',tint:palette[i%5],emissive:.7});
      B.box(x,-418,z+5,1,2.8,1,{tex:'paint',tint:0xd0fff3,emissive:.9});
    }
  }
  // All scenery stays below the submarine's 320 m navigation envelope.
  for (let i = 0; i < 19; i++) {
    const x = -350 + Math.cos(i * 2.4) * (10 + i * 1.5);
    const z = 285 + Math.sin(i * 2.4) * (10 + i * 1.5), h = 22 + i % 5 * 7;
    const coral = { tex: 'paint', tint: i % 2 ? 0x56d6ba : 0x918bd8, emissive: .6 };
    B.box(x, -420, z, 2.4, h, 2.4, coral);
    B.box(x, -420 + h * .62, z, 12, 2, 3, coral);
    for (const side of [-1, 1]) B.box(x + side * 5, -420 + h * .62, z, 2, 10, 2, coral);
    B.box(x, -420 + h, z, 5, 2, 5, coral);
  }
  for (let i = 0; i < 7; i++) {
    const x = -610 + Math.cos(i * 2.3) * 22, z = 435 + Math.sin(i * 2.3) * 22, h = 20 + i * 4;
    B.box(x, -420, z, 10, h, 10, rock);
    B.box(x, -420 + h, z, 6, 2, 6, { tex: 'paint', tint: 0xe5a25f, emissive: .8 });
    for (let j = 0; j < 5; j++) B.box(x + Math.sin(j) * 2, -416 + h + j * 4, z, 1.5 + j * .6, 1, 1.5 + j * .6, { tex: 'paint', tint: 0x6c9398, emissive: .2 });
  }
  B.box(-430, -420, 570, 40, 5, 30, rock);
  B.box(-430, -415, 570, 28, 4, 20, seabed);
  for (const x of [-441, -419]) B.box(x, -411, 570, 4, 45, 4, rock);
  B.box(-430, -368, 570, 28, 4, 6, rock);
  B.box(-430, -405, 570, 6, 28, 5, { tex: 'paint', tint: 0x9ac9f4, emissive: .75 });
  for (const site of DEEP_LANDMARKS) {
    B.box(site.x, -366, site.z, 1.2, 16, 1.2, { tex: 'paint', tint: 0x749faf });
    B.box(site.x, -350, site.z, 4, 2, 4, { tex: 'paint', tint: Number.parseInt(site.color.slice(1), 16), emissive: 1 });
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
    scene.background = water; scene.fog.color.copy(water); scene.fog.near = 160; scene.fog.far = 720;
    stage.sky.visible = false; stage.hemi.intensity = Math.max(1.8, saved.hemi);
    camera.far = 800; camera.updateProjectionMatrix();
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
