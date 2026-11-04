import * as THREE from 'three';
import { createOceanModel } from './ocean-models.js';
import { buildDeepSea } from './deep-sea.js';

// Shallow life shares the fleet batch. Abyss scenery draws only underwater,
// without extra lights, shadow passes or frame-by-frame geometry uploads.
export function createOceanLife(B,deepBatch,tunnelPath=null){
  const creatures=[],tunnelCreatures=[],time={value:0};
  const tunnelGroup=new THREE.Group();tunnelGroup.name='tunnel-ocean-gardens';tunnelGroup.visible=false;let inTunnelGarden=false;
  const sand={tex:'sand',tint:0xb1b99c},rock={tex:'stone',tint:0x6f9287};
  buildDeepSea(B,deepBatch);
  const deepGroup=new THREE.Group(),deepCreatures=[];deepGroup.name='deep-sea-scenery';deepGroup.visible=false;
  const deepMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  deepMaterial.onBeforeCompile=shader=>{shader.uniforms.uOceanTime=time;
    shader.vertexShader='attribute float swimWeight; attribute vec3 swimAxis; uniform float uOceanTime;'+String.fromCharCode(10)+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>'+String.fromCharCode(10)+'transformed+=swimAxis*swimWeight*sin(uOceanTime*3.+position.z*2.);');
  };
  const reefs=[[-49,16],[-49,-9],[-17,41],[17,42]];
  for(const [x,z] of reefs){
    B.box(x,-9.5,z,14,2.5,12,rock);B.box(x,-7,z,11,1.5,10,rock);B.box(x,-5.5,z,9,1,8,rock);B.box(x,-4.5,z,8.6,.2,7.6,sand);
  }
  const cache=new Map();let tunnelSchool;
  function animal(kind,x,y,z,rx,rz,speed,phase=0){
    if(!cache.has(kind))cache.set(kind,createOceanModel(kind));
    const geometry=inTunnelGarden&&kind==='fish-school'?(tunnelSchool ||=createOceanModel(kind,{fishCount:8})):cache.get(kind);
    const mesh=new THREE.Mesh(geometry);mesh.name=`ocean-${kind}-${creatures.length}`;
    mesh.userData={kind,x,y,z,rx,rz,speed,phase};mesh.position.set(x,y,z);mesh.updateMatrixWorld(true);
    if(y<-30){mesh.material=deepMaterial;deepCreatures.push(mesh);deepGroup.add(mesh);}else if(inTunnelGarden){mesh.material=deepMaterial;tunnelCreatures.push(mesh);tunnelGroup.add(mesh);}else creatures.push(mesh);
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
  // Gardens stay outside the glazed tube and draw only near the underwater camera.
  if(tunnelPath){
    inTunnelGarden=true;
    for(const [i,s]of [65,110,155,200,235].entries()){
      const p=tunnelPath.sample(s,{}),side=i%2?-1:1,offset=side*12;
      const x=p.x+Math.cos(p.heading)*offset,z=p.z-Math.sin(p.heading)*offset;
      B.box(x,-23,z,8,Math.max(1,p.y+20.9),7,rock);B.box(x,p.y-2.1,z,7.2,1.1,6.2,rock);B.box(x,p.y-1,z,7.1,.18,6.1,sand);
      animal('reef',x,p.y-.82,z,0,0,0);
      if(i%2===0)animal('fish-school',x,p.y+2.4,z,2,1.5,.16,i);
      if(i===1)animal('turtle',x,p.y+3.4,z,2,2,.08);
    }
    const p=tunnelPath.sample(150,{});animal('dolphin',p.x+15,p.y+4,p.z+4,3,4,.13,1);
  }
  inTunnelGarden=false;
  animal('whale',-390,-285,320,26,18,.045);
  animal('shark',-445,-305,545,20,16,.07,1);
  for(const [i,x] of [-370,-540,-595].entries()){
    animal('fish-school',x,-345+i%2*12,290+i*100,18,12,.1,i);
    deepCreatures.at(-1).scale.setScalar(3);
  }
  // One GPU-animated draw for drifting plankton, with static buffers.
  const motes=[],moteColors=[],moteTint=new THREE.Color();
  for(let i=0;i<240;i++){
    motes.push(-320-(i*97%370),-412+(i*31%120),210+(i*137%365));
    moteTint.setHex(i%3?0x83eddd:0x9cbcff);moteColors.push(moteTint.r,moteTint.g,moteTint.b);
  }
  const moteGeometry=new THREE.BufferGeometry();
  moteGeometry.setAttribute('position',new THREE.Float32BufferAttribute(motes,3));
  moteGeometry.setAttribute('color',new THREE.Float32BufferAttribute(moteColors,3));
  const moteMaterial=new THREE.PointsMaterial({size:1.4,vertexColors:true,transparent:true,opacity:.6,depthWrite:false});
  moteMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uOceanTime=time;
    shader.vertexShader='uniform float uOceanTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y=-412.+mod(position.y+412.+uOceanTime*1.4,120.); transformed.x+=sin(uOceanTime*.3+position.z)*2.;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=1.-smoothstep(.15,.5,length(gl_PointCoord-vec2(.5)));\n#include <opaque_fragment>');
  };
  deepGroup.add(new THREE.Points(moteGeometry,moteMaterial));
  const allCreatures=[...creatures,...deepCreatures,...tunnelCreatures];
  function update(dt,carrier,camera){
    if(camera)tunnelGroup.visible=camera.position.y<-.5&&camera.position.x>40&&camera.position.x<190&&camera.position.z>25&&camera.position.z<190;
    time.value+=Math.min(dt,.1);
    for(const mesh of allCreatures){const a=mesh.userData;if(a.kind==='reef')continue;const t=time.value*a.speed+a.phase;
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
  update(0);return{creatures,deepGroup,tunnelGroup,time,update,configureSea,species:[...cache.keys()].filter(kind=>kind!=='reef')};
}
