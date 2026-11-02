import * as THREE from 'three';

// Models share the aircraft batch; reef and seabed share the existing static batch.
// No new draw calls, textures, shadow passes or frame-by-frame geometry uploads.
export function createOceanLife(B){
  const creatures=[],time={value:0};
  const sand={tex:'sand',tint:0xb1b99c},rock={tex:'stone',tint:0x6f9287};
  B.box(0,-10,0,360,.5,360,{tex:'paint',tint:0x327e94});
  const reefs=[[-49,16],[-49,-9],[-17,41],[17,42]];
  for(const [x,z] of reefs){
    B.box(x,-9.5,z,14,2.5,12,rock);B.box(x,-7,z,11,1.5,10,rock);B.box(x,-5.5,z,9,1,8,rock);B.box(x,-4.5,z,8.6,.2,7.6,sand);
    for(let i=0;i<16;i++){
      const dx=Math.sin(i*2.4)*3.4,dz=Math.cos(i*1.7)*2.8,h=.6+(i%4)*.35;
      const tint=[0x3e9278,0x65a378,0xb16a85,0xe4a37b][i%4];
      B.box(x+dx,-4.3,z+dz,.14,h,.14,{tex:'paint',tint});
      for(const side of [-1,1])B.box(x+dx+side*.2,-4+h*.45,z+dz,.38,.12,.16,{tex:'paint',tint},{rz:side*.6});
    }
    for(let i=0;i<5;i++)B.box(x-3+i*1.3,-4.3,z-2,.45,.12,.6,{tex:'paint',tint:0xdebda4});
  }
  function model(kind){
    const pos=[],norm=[],colors=[],weights=[],axes=[],color=new THREE.Color();
    let offset=[0,0,0];
    function append(g,tint,weight=0,axis=[.18,0,0]){
      const src=g.index?g.toNonIndexed():g;if(!src.attributes.normal)src.computeVertexNormals();
      color.setHex(tint);
      for(let i=0;i<src.attributes.position.count;i++){
        for(let k=0;k<3;k++){pos.push(src.attributes.position.array[i*3+k]+offset[k]);norm.push(src.attributes.normal.array[i*3+k]);axes.push(axis[k]);}
        colors.push(color.r,color.g,color.b);weights.push(weight);
      }
      if(src!==g)src.dispose();g.dispose();
    }
    const ell=(x,y,z,w,h,d,tint,weight=0,axis)=>{const g=new THREE.SphereGeometry(1,8,5);g.scale(w/2,h/2,d/2);g.translate(x,y,z);append(g,tint,weight,axis);};
    const box=(x,y,z,w,h,d,tint,weight=0)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);append(g,tint,weight);};
    const fin=(points,tint,weight=0,axis)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();append(g,tint,weight,axis);};
    function fish(size,tint,mammal=false,shark=false){
      const s=size;
      ell(0,0,0,.65*s,.7*s,2.4*s,tint);ell(0,-.17*s,.25*s,.5*s,.31*s,1.8*s,0xc7d7cb);
      ell(0,-.03*s,1.17*s,.35*s,.24*s,.5*s,tint);
      for(const side of [-1,1]){
        ell(side*.25*s,.15*s,.75*s,.09*s,.09*s,.09*s,0x142b38);
        fin([[side*.2*s,0,.55*s],[side*.85*s,-.15*s,-.2*s],[side*.2*s,-.15*s,-.45*s]],tint);
      }
      fin([[0,.2*s,.35*s],[0,(shark?.95:.65)*s,-.3*s],[0,.2*s,-.65*s]],tint);
      ell(0,0,-1.2*s,.25*s,.3*s,.8*s,tint,1,mammal?[0,.12*s,0]:[.12*s,0,0]);
      if(mammal)fin([[-.65*s,0,-1.8*s],[0,0,-1.3*s],[.65*s,0,-1.8*s]],tint,1,[0,.17*s,0]);
      else fin([[0,-.6*s,-1.85*s],[0,0,-1.25*s],[0,.75*s,-1.9*s]],tint,1,[.17*s,0,0]);
    }
    if(kind==='whale')fish(3.4,0x416b81,true);
    if(kind==='shark')fish(1.65,0x6b8894,false,true);
    if(kind==='dolphin')fish(1.1,0x75b3bf,true);
    if(kind==='fish-school')for(let i=0;i<18;i++){offset=[Math.sin(i*2.2)*2.1,Math.cos(i*1.7)*.45,(i%6)*.8-2];fish(.23,[0xf1bb56,0x65c7ce,0xda897c][i%3]);}
    if(kind==='crab'){
      ell(0,.14,0,1.1,.45,.7,0xd47c50);
      for(const side of [-1,1]){
        for(let i=0;i<4;i++)box(side*(.55+i*.035),.05,-.3+i*.2,.55,.08,.07,0xc86b47,1);
        ell(side*.7,.28,.55,.4,.22,.5,0xe58d58,1);ell(side*.22,.42,.28,.08,.13,.08,0x182e36);
      }
    }
    if(kind==='shrimp'){
      for(let i=0;i<6;i++)ell(0,.18+Math.sin(i*.5)*.12,.45-i*.17,.35-i*.025,.32-i*.02,.24,0xeca89d,i>2?1:0);
      for(const side of [-1,1]){
        for(let i=0;i<5;i++)box(side*.2,.06,.3-i*.13,.28,.035,.035,0xf4c2ab,1);
        box(side*.18,.38,.9,.025,.025,.8,0xe9c7a2,1);
        ell(side*.12,.4,.48,.07,.07,.07,0x213c43);
      }
    }
    if(kind==='octopus'){
      ell(0,.6,0,.9,1.15,.8,0xb784b5);
      for(const side of [-1,1])ell(side*.25,.6,.35,.12,.13,.1,0x213e4e);
      for(let arm=0;arm<8;arm++)for(let k=0;k<5;k++){
        const a=arm*Math.PI/4,d=.25+k*.2;
        ell(Math.sin(a)*d,.16-k*.02,Math.cos(a)*d,.26-k*.035,.2,.28,0xc58baf,k/4,[.08,.08,0]);
      }
    }
    if(kind==='turtle'){
      ell(0,.15,0,1.1,.6,1.5,0x557f59);ell(0,.15,.88,.34,.3,.48,0x9bb376);
      for(const side of [-1,1])for(const z of [-.45,.45])ell(side*.65,.08,z,.6,.12,.3,0x8daa74,1);
    }
    const g=new THREE.BufferGeometry();
    for(const [name,data,size] of [['position',pos,3],['normal',norm,3],['color',colors,3],['swimWeight',weights,1],['swimAxis',axes,3]])g.setAttribute(name,new THREE.Float32BufferAttribute(data,size));
    return g;
  }
  const cache=new Map();
  function animal(kind,x,y,z,rx,rz,speed,phase=0){
    if(!cache.has(kind))cache.set(kind,model(kind));
    const mesh=new THREE.Mesh(cache.get(kind));mesh.name=`ocean-${kind}-${creatures.length}`;
    mesh.userData={kind,x,y,z,rx,rz,speed,phase};creatures.push(mesh);
  }
  animal('whale',-24,-2.5,64,16,8,.055);animal('whale',-75,-3,12,8,18,.045,2);
  animal('shark',-65,-3.4,-5,9,15,.12);animal('shark',26,-3,61,11,8,.1,2);
  for(let i=0;i<3;i++)animal('dolphin',4,-1.8,48,12,5,.18,i*.7);
  for(const [i,x]of [-45,-12,23].entries())animal('fish-school',x,-2.6,i===0?17:39,3,2,.22,i);
  animal('crab',-49,-4.05,16,1.2,.7,.12);animal('crab',17,-4.05,42,1.5,.6,.08,1);
  animal('shrimp',-49,-3.9,-9,1,.7,.25);animal('shrimp',-17,-3.9,41,1,.8,.2,2);
  animal('octopus',-49,-4.05,17,.8,.7,.1);animal('octopus',16,-4.05,41,1,.6,.08,2);
  animal('turtle',-40,-2.5,38,4,3,.08);
  function update(dt,carrier){
    time.value+=Math.min(dt,.1);
    for(const mesh of creatures){const a=mesh.userData,t=time.value*a.speed+a.phase;
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
  update(0);return{creatures,time,update,configureSea,species:[...cache.keys()]};
}
