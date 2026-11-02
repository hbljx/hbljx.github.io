import * as THREE from 'three';
import { createCanopy } from './aircraft.js';

export function createNavalAircraft(spec){
  const positions=[],normals=[],colors=[],parts=[],pivots=[],shade=new THREE.Color();
  const light=0xaebbc1,gray=0x798991,dark=0x29373f;
  function append(g,color,propeller=null){
    const geo=g.index?g.toNonIndexed():g;if(!geo.attributes.normal)geo.computeVertexNormals();
    positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);shade.setHex(color);
    for(let i=0;i<geo.attributes.position.count;i++){colors.push(shade.r,shade.g,shade.b);parts.push(propeller?1:0);pivots.push(...(propeller||[0,0,0]));}
    if(geo!==g)geo.dispose();g.dispose();
  }
  const box=(x,y,z,w,h,d,color,propeller)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);append(g,color,propeller);};
  function wing(a,b,c,d,color){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));append(g,color);}
  if(spec.kind==='fighter'){
    box(0,.75,0,.7,.62,4.5,light);box(0,.72,2.32,.45,.4,.65,light);box(0,.72,2.77,.2,.22,.35,dark);
    box(0,1.08,.75,.66,.08,.9,dark);
    for(const s of [-1,1]){
      wing([s*.3,.9,.75],[s*1.7,.9,-.4],[s*1.7,.9,-1.1],[s*.3,.9,-.75],gray);
      box(s*1.7,1.32,-.7,.11,.86,.74,light);box(s*.43,1.37,-1.9,.1,1.15,.75,gray);
      box(s*.35,.65,-2.25,.28,.3,.2,dark);box(s*.5,.35,-.45,.08,.55,.08,gray);box(s*.5,.15,-.45,.2,.3,.3,dark);
      box(s*1.7,1.5,-.68,.13,.12,.3,0xc94e4f);
    }
    box(0,.35,1.85,.08,.55,.08,gray);box(0,.15,1.85,.2,.3,.3,dark);box(0,.8,-1.85,2.4,.12,.65,light);
  }else{
    box(0,.82,0,.8,.72,5.2,light);box(0,.8,2.8,.56,.4,.65,light);box(0,1.24,1.5,.7,.10,.8,dark);
    box(0,1.02,-.25,4.6,.14,1.05,gray);box(0,1,-2.2,2.7,.1,.65,light);box(0,1.55,-2.3,.14,1.2,.85,gray);
    for(const s of [-1,1]){box(s*1.25,.76,.15,.48,.52,1.7,light);const pivot=[s*1.25,.76,1.06];box(...pivot,.08,1.35,.08,dark,pivot);box(pivot[0],pivot[1],pivot[2]+.085,.85,.08,.08,dark,pivot);box(s*.65,.34,-.8,.08,.6,.08,gray);box(s*.65,.15,-.8,.2,.3,.34,dark);}
    box(0,.34,2.05,.08,.6,.08,gray);box(0,.15,2.05,.2,.3,.34,dark);box(0,2,-1,.18,1.8,.35,dark);
    const radar=new THREE.CylinderGeometry(1.18,1.18,.24,16);radar.translate(0,3,-1);append(radar,light);box(0,3.135,-1,2.12,.025,.18,0x355e70);
  }
  const geometry=new THREE.BufferGeometry();
  for(const [name,data,size]of [['position',positions,3],['normal',normals,3],['color',colors,3],['propellerPart',parts,1],['propellerPivot',pivots,3]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,size));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));mesh.name=spec.id;
  const canopy=createCanopy();canopy.position.y=spec.kind==='awacs'?1.34:1.2;canopy.position.z+=spec.kind==='fighter'?.75:1.5;canopy.scale.x=.85;mesh.add(canopy);
  mesh.userData={...mesh.userData,kind:spec.kind,label:spec.kind==='fighter'?`战斗机 ${spec.id.split('-').at(-1)}`:'预警机',halfSpan:spec.w/2,halfLength:spec.d/2,parked:true,propeller:new THREE.Object3D(),canopy,seat:[0,.7,spec.kind==='fighter'?.75:1.5],canopyOpen:spec.kind==='awacs'?Math.PI/3:-Math.PI/3};
  canopy.rotation.x=mesh.userData.canopyOpen;return mesh;
}
