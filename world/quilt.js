import * as THREE from 'three';
import { BED } from './layout.js';

// A continuous double quilt: one cloth surface and one small pixel print.
export function createSharedQuilt(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  rect(0,0,128,64,'#8fcdf2');rect(3,3,122,58,'#cceeff');rect(5,5,118,54,'#96d5f6');
  for(let x=8;x<122;x+=6){rect(x,3,3,1,'#fff8e9');rect(x,60,3,1,'#fff8e9');}
  const cloud=(x,y)=>{rect(x,y+3,14,5,'#edf9ff');rect(x+3,y,8,9,'#edf9ff');};
  for(const [x,y]of [[14,14],[95,13],[17,43],[98,45]])cloud(x,y);
  for(const [x,y]of [[39,13],[89,34],[37,49],[106,30]]){rect(x+2,y,2,8,'#fff0a4');rect(x,y+3,6,2,'#fff0a4');}
  // A sleepy bunny with pink ears and rosy cheeks.
  rect(49,12,8,21,'#fff8e9');rect(71,12,8,21,'#fff8e9');
  rect(51,15,4,14,'#f5b3ca');rect(73,15,4,14,'#f5b3ca');
  rect(45,29,38,17,'#fff8e9');rect(49,25,30,25,'#fff8e9');
  for(const x of [52,70]){rect(x,35,6,2,'#617f97');rect(x+1,34,4,1,'#617f97');}
  rect(48,40,6,3,'#f7b4cb');rect(74,40,6,3,'#f7b4cb');
  rect(62,39,4,2,'#d989a6');rect(63,41,2,3,'#617f97');rect(59,44,4,1,'#617f97');rect(65,44,4,1,'#617f97');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapLinearFilter;
  const points=[[-1.6,-.31],[-1.45,.07],[-.76,.12],[0,.08],[.76,.12],[1.45,.07],[1.6,-.31]],positions=[],uv=[];
  const vertex=(x,y,z)=>{positions.push(x,y,z);uv.push((x+1.6)/3.2,(.8-z)/1.6);};
  for(let i=1;i<points.length;i++){
    const [a,ay]=points[i-1],[b,by]=points[i];
    vertex(a,ay,-.8);vertex(a,ay,.8);vertex(b,by,.8);vertex(a,ay,-.8);vertex(b,by,.8);vertex(b,by,-.8);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide}));
  mesh.name='shared-sky-quilt';mesh.position.set(BED.x,BED.y+.9,BED.z+.32);mesh.receiveShadow=true;mesh.visible=false;
  return mesh;
}
