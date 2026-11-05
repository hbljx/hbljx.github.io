import * as THREE from 'three';
export { createTransitVehicle } from './transit-vehicle.js';
import { canvasTexture } from '@engine/world/textures.js';

export function transitSign(B,planes,x,y,z,text,color=0x267d83,yaw=0,width=5){
  const height=1.05,textureHeight=256;
  // Match the physical panel's aspect ratio so Chinese glyphs are not stretched
  // on metro boards or squeezed into the narrow bus boards.
  const texture=canvasTexture(Math.ceil(textureHeight*width/height),textureHeight,(c,w,h)=>{
    c.fillStyle='#'+color.toString(16).padStart(6,'0');c.fillRect(0,0,w,h);
    c.strokeStyle='#e8e5ce';c.lineWidth=4;c.strokeRect(8,8,w-16,h-16);
    c.fillStyle='#ffffff';c.textAlign='center';c.textBaseline='middle';
    const lines=width<3?text.split(' · '):[text],lineHeight=h*.76/lines.length;
    let fontSize=Math.floor(lines.length>1?h*.32:h*.62);
    const font=()=>{c.font=`700 ${fontSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`;};
    font();
    const widest=Math.max(...lines.map(line=>c.measureText(line).width));
    if(widest>w-40){fontSize=Math.floor(fontSize*(w-40)/widest);font();}
    lines.forEach((line,i)=>c.fillText(line,w/2,h/2+(i-(lines.length-1)/2)*lineHeight));
  },{pixelated:false});
  // The panel atlas must retain these pixels instead of shrinking every sign
  // to its generic 252px tile. Front and back share the same atlas rectangle.
  texture.userData.preserveAtlasResolution=true;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));
  sign.position.set(x,y,z);sign.rotation.y=yaw;planes.push(sign);
  // The world's panel atlas uses front faces; include a back face explicitly
  // so a station name stays readable when approached from either direction.
  const back=new THREE.Mesh(sign.geometry.clone(),sign.material.clone());back.position.copy(sign.position);back.rotation.y=yaw+Math.PI;planes.push(back);
}

