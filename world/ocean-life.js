import * as THREE from 'three';
import { createOceanModel } from './ocean-models.js';
import { buildDeepSea, createSeabed, seabedAt } from './deep-sea.js';
import { createWhaleWaterEffects } from './whale-water.js';

// Shallow life shares the fleet batch. Abyss scenery draws only underwater,
// without extra lights, shadow passes or frame-by-frame geometry uploads.
export function createOceanLife(deepBatch,tunnelPath=null){
  const creatures=[],tunnelCreatures=[],time={value:0};
  const whaleWater=createWhaleWaterEffects(time),effectsGroup=whaleWater.group;
  const tunnelGroup=new THREE.Group();tunnelGroup.name='tunnel-ocean-gardens';tunnelGroup.visible=false;let inTunnelGarden=false;
  const deepGroup=new THREE.Group(),deepCreatures=[];deepGroup.name='deep-sea-scenery';deepGroup.visible=false;
  const terrain=createSeabed();
  buildDeepSea(deepBatch);
  const deepMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  deepMaterial.onBeforeCompile=shader=>{shader.uniforms.uOceanTime=time;
    shader.vertexShader='attribute float swimWeight; attribute vec3 swimAxis; uniform float uOceanTime;'+String.fromCharCode(10)+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>'+String.fromCharCode(10)+'transformed+=swimAxis*swimWeight*sin(uOceanTime*3.+position.z*2.);');
  };
  const reefs=[[-49,16],[-49,-9],[-17,41],[17,42]];
  const cache=new Map();let tunnelSchool;
  let whaleCount=0;
  function animal(kind,x,y,z,rx,rz,speed,phase=0){
    if(!cache.has(kind))cache.set(kind,createOceanModel(kind));
    const geometry=inTunnelGarden&&kind==='fish-school'?(tunnelSchool ||=createOceanModel(kind,{fishCount:8})):cache.get(kind);
    const mesh=new THREE.Mesh(geometry);mesh.name=`ocean-${kind}-${creatures.length}`;
    mesh.userData={kind,x,y,z,rx,rz,speed,phase};mesh.position.set(x,y,z);mesh.updateMatrixWorld(true);
    if(kind==='whale'){
      const phase=(whaleCount++%4)*2.25;mesh.userData.whalePhase=phase;
      whaleWater.attach(mesh,phase);
    }
    if(inTunnelGarden){mesh.material=deepMaterial;tunnelCreatures.push(mesh);tunnelGroup.add(mesh);}else if(y<-30){mesh.material=deepMaterial;deepCreatures.push(mesh);deepGroup.add(mesh);}else creatures.push(mesh);
    return mesh;
  }
  for(const [x,z] of reefs)animal('reef',x,seabedAt(x,z)-.45,z,0,0,0);
  const shoreCorals=new THREE.Mesh(createOceanModel('shore-corals',{groundAt:seabedAt}));
  shoreCorals.name='ocean-shore-corals';shoreCorals.userData={kind:'reef'};
  shoreCorals.updateMatrixWorld(true);creatures.push(shoreCorals);
  // Keep nearshore whales close to the waterline so their backs and breaches
  // read clearly from the house and beach.
  animal('whale',-24,-1.8,64,16,8,.055);animal('whale',-75,-2,12,8,18,.045,2);
  animal('shark',-65,-3.4,-5,9,15,.12);animal('shark',26,-3,61,11,8,.1,2);
  for(let i=0;i<3;i++)animal('dolphin',4,-1.8,48,12,5,.18,i*.7);
  for(const [i,x]of [-45,-12,23].entries())animal('fish-school',x,-2.6,i===0?17:39,3,2,.22,i);
  animal('crab',-51,seabedAt(-51,16)+.2,16,.45,.35,.12);animal('crab',19.3,seabedAt(19.3,40.3)+.2,40.3,.4,.3,.08,1);
  animal('shrimp',-49,seabedAt(-49,-9)+.5,-9,1,.7,.25);animal('shrimp',-17,seabedAt(-17,41)+.5,41,1,.8,.2,2);
  animal('octopus',-47.2,seabedAt(-47.2,17.6)+.25,17.6,.25,.3,.1);animal('octopus',14.8,seabedAt(14.8,43.4)+.25,43.4,.3,.25,.08,2);
  animal('turtle',-40,-2.5,38,4,3,.08);
  // Gardens stay outside the glazed tube and draw only near the underwater camera.
  if(tunnelPath){
    inTunnelGarden=true;
    for(const [i,s]of [65,110,155,200,235].entries()){
      const p=tunnelPath.sample(s,{}),side=i%2?-1:1,offset=side*12;
      const x=p.x+Math.cos(p.heading)*offset,z=p.z-Math.sin(p.heading)*offset;
      const reef=animal('reef',x,seabedAt(x,z)-.65,z,0,0,0);
      reef.scale.set(1,2.2,1);
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
  const tunnelView={};
  function update(dt,carrier,camera){
    if(camera)terrain.visible=camera.position.y<-1.08;
    // Follow the actual tunnel path so the glass scenery is also visible near
    // both portals, instead of relying on a rectangular world-space cutoff.
    if(camera&&tunnelPath){
      tunnelPath.near(camera.position.x,camera.position.z,tunnelView);
      tunnelGroup.visible=camera.position.y<-.5&&tunnelView.distance<6;
    }
    time.value+=Math.min(dt,.1);
    for(const mesh of allCreatures){const a=mesh.userData;if(a.kind==='reef')continue;const t=time.value*a.speed+a.phase;
      let x=a.x+Math.cos(t)*a.rx,z=a.z+Math.sin(t)*a.rz,y=a.y;
      if(a.kind==='dolphin')y+=Math.pow(Math.max(0,Math.sin(time.value*.65+a.phase)),8)*2.3;
      else if(a.kind==='whale')y+=Math.sin(time.value*.22+a.phase)*.55;
      // Dive below the hull if the visitor sails over a swimming animal.
      let blocked=false;
      if(carrier){const p=carrier.toLocal(x,z);if(Math.abs(p.x)<12&&Math.abs(p.z)<39){y=Math.min(y,-6);blocked=true;}}
      if(a.kind==='whale'){
        a.whaleBlocked=blocked;
        const action=(time.value+a.whalePhase)%9;
        const jumping=!blocked&&action>=4.5&&action<7.05,progress=(action-4.5)/2.55;
        if(jumping){y+=Math.sin(progress*Math.PI)*5.2;mesh.rotation.x=-Math.sin(progress*Math.PI)*.48;}
        else mesh.rotation.x=0;
      }
      mesh.position.set(x,y,z);mesh.rotation.y=Math.atan2(-Math.sin(t)*a.rx,Math.cos(t)*a.rz);mesh.updateMatrixWorld(true);
    }
    whaleWater.update(camera);
  }
  function configureSea(coast){
    whaleWater.setWaterHeight(coast.sea.position.y);
    // Use one opaque surface so seabed colors and distance cannot split the ocean into bands.
    const material=coast.sea.material;material.transparent=false;material.opacity=1;material.depthWrite=true;
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec2 vOceanXZ;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOceanXZ=(modelMatrix*vec4(position,1.)).xz;');
      // Keep world coordinates for the tunnel entrance water mask.
      shader.fragmentShader='varying vec2 vOceanXZ;\n'+shader.fragmentShader;
    };
    material.needsUpdate=true;
  }
  update(0);return{creatures,deepGroup,tunnelGroup,effectsGroup,terrain,time,update,configureSea,species:[...cache.keys()].filter(kind=>kind!=='reef')};
}
