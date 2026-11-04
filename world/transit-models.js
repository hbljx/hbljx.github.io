import * as THREE from 'three';
export { createTransitVehicle } from './transit-vehicle.js';
import { canvasTexture } from '@engine/world/textures.js';

export function transitSign(B,planes,x,y,z,text,color=0x267d83,yaw=0,width=5){
  const texture=canvasTexture(512,128,(c,w,h)=>{c.fillStyle='#'+color.toString(16).padStart(6,'0');c.fillRect(0,0,w,h);c.strokeStyle='#e8e5ce';c.lineWidth=5;c.strokeRect(5,5,w-10,h-10);c.fillStyle='#ffffff';c.font='bold 36px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2,w-30);});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,1.05),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  sign.position.set(x,y,z);sign.rotation.y=yaw;planes.push(sign);
  // The world's panel atlas uses front faces; include a back face explicitly
  // so a station name stays readable when approached from either direction.
  const back=new THREE.Mesh(sign.geometry.clone(),sign.material.clone());back.position.copy(sign.position);back.rotation.y=yaw+Math.PI;planes.push(back);
}

