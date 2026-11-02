import * as THREE from 'three';
import { createOceanModel } from './ocean-models.js';

// Models share the aircraft batch; reef and seabed share the existing static batch.
// No new draw calls, textures, shadow passes or frame-by-frame geometry uploads.
export function createOceanLife(B){
  const creatures=[],time={value:0};
  const sand={tex:'sand',tint:0xb1b99c},rock={tex:'stone',tint:0x6f9287};
  B.box(0,-10,0,360,.5,360,{tex:'paint',tint:0x327e94});
  const reefs=[[-49,16],[-49,-9],[-17,41],[17,42]];
  for(const [x,z] of reefs){
    B.box(x,-9.5,z,14,2.5,12,rock);B.box(x,-7,z,11,1.5,10,rock);B.box(x,-5.5,z,9,1,8,rock);B.box(x,-4.5,z,8.6,.2,7.6,sand);
  }
  const cache=new Map();
  function animal(kind,x,y,z,rx,rz,speed,phase=0){
    if(!cache.has(kind))cache.set(kind,createOceanModel(kind));
    const mesh=new THREE.Mesh(cache.get(kind));mesh.name=`ocean-${kind}-${creatures.length}`;
    mesh.userData={kind,x,y,z,rx,rz,speed,phase};mesh.position.set(x,y,z);mesh.updateMatrixWorld(true);creatures.push(mesh);
  }
  for(const [x,z] of reefs)animal('reef',x,-4.28,z,0,0,0);
  animal('whale',-24,-2.5,64,16,8,.055);animal('whale',-75,-3,12,8,18,.045,2);
  animal('shark',-65,-3.4,-5,9,15,.12);animal('shark',26,-3,61,11,8,.1,2);
  for(let i=0;i<3;i++)animal('dolphin',4,-1.8,48,12,5,.18,i*.7);
  for(const [i,x]of [-45,-12,23].entries())animal('fish-school',x,-2.6,i===0?17:39,3,2,.22,i);
  animal('crab',-51,-4.27,16,.45,.35,.12);animal('crab',19.3,-4.27,40.3,.4,.3,.08,1);
  animal('shrimp',-49,-3.9,-9,1,.7,.25);animal('shrimp',-17,-3.9,41,1,.8,.2,2);
  animal('octopus',-47.2,-4.25,17.6,.25,.3,.1);animal('octopus',14.8,-4.25,43.4,.3,.25,.08,2);
  animal('turtle',-40,-2.5,38,4,3,.08);
  function update(dt,carrier){
    time.value+=Math.min(dt,.1);
    for(const mesh of creatures){const a=mesh.userData;if(a.kind==='reef')continue;const t=time.value*a.speed+a.phase;
      let x=a.x+Math.cos(t)*a.rx,z=a.z+Math.sin(t)*a.rz,y=a.y;
      if(a.kind==='dolphin')y+=Math.pow(Math.max(0,Math.sin(time.value*.65+a.phase)),8)*2.3;
      else if(a.kind==='whale')y+=Math.sin(time.value*.22+a.phase)*.55;
      // Dive below the hull if the visitor sails over a swimming animal.
      if(carrier){const p=carrier.toLocal(x,z);if(Math.abs(p.x)<12&&Math.abs(p.z)<39)y=Math.min(y,-6);}
      mesh.position.set(x,y,z);mesh.rotation.y=Math.atan2(-Math.sin(t)*a.rx,Math.cos(t)*a.rz);mesh.updateMatrixWorld(true);
    }
  }
  function configureSea(coast){
    const material=coast.sea.material;material.transparent=true;material.depthWrite=false;
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vOceanXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOceanXZ=(modelMatrix*vec4(position,1.)).xz;');
      shader.fragmentShader='varying vec2 vOceanXZ;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a=mix(.54,1.,smoothstep(95.,155.,length(vOceanXZ)));\n#include <opaque_fragment>');
    };
    material.needsUpdate=true;
  }
  update(0);return{creatures,time,update,configureSea,species:[...cache.keys()].filter(kind=>kind!=='reef')};
}
