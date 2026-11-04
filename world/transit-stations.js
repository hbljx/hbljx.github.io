import * as THREE from 'three';
import { TRANSIT_STOPS } from './transit-layout.js';
import { transitSign } from './transit-models.js';

// Thin, two-sided panes share one draw. Frames use the existing furniture
// batch; glass never writes depth or covers the boarding side of a shelter.
export function buildTransitStations(B, planes, paint, glassMaterial) {
  const steel={tex:'paint',tint:0xdce7e3},teal={tex:'paint',tint:0x277b89};
  const wood={tex:'wood_panel',top:'oak',tint:0xc6a67c},gold={tex:'paint',tint:0xe6c671};
  const glow={tex:'paint',tint:0xd8f0e9,emissive:.65},seam={tex:'paint',tint:0x899e9e};
  const positions=[];
  function pane(x,y,z,w,h,ry=0,rx=0) {
    const g=new THREE.PlaneGeometry(w,h);g.rotateX(rx);g.rotateY(ry);g.translate(x,y,z);
    for(const i of g.index.array)positions.push(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));
    g.dispose();
  }
  for(const stop of TRANSIT_STOPS){
    const [x,z]=stop.at,y=stop.floor;
    if(stop.service==='metro'){
      const front=stop.end?-1:1,back=z-front*1.7,roofZ=z+front*.05;
      // A three-metre central entrance and the full track-facing edge stay
      // open. End screens stop behind the cross-platform walking corridor.
      for(const dx of [-12,-8,-4,4,8,12])B.box(x+dx,y+.04,back,.12,3.16,.12,steel);
      for(const dx of [-12,12])B.box(x+dx,y+.04,z+front*1.75,.12,3.16,.12,steel);
      for(const [a,b] of [[-11.94,-8.06],[-7.94,-4.06],[-3.94,-1.6],[1.6,3.94],[4.06,7.94],[8.06,11.94]]){
        pane(x+(a+b)/2,y+1.55,back,b-a,2.6);
        for(const h of [.19,2.88])B.box(x+(a+b)/2,y+h,back,b-a,.07,.085,steel);
        B.box(x+(a+b)/2,y+1.1,back+front*.025,b-a,.045,.025,teal);
      }
      for(const dx of [-12,12]){
        pane(x+dx,y+1.55,z-front*1.15,1.0,2.6,Math.PI/2);
        B.box(x+dx,y+.04,z-front*.6,.08,2.91,.08,steel);
      }
      for(const side of [-1,1]){
        B.box(x,y+3.2,roofZ+side*1.9,24.5,.16,.16,teal);
        B.box(x,y+3.14,roofZ+side*1.77,23.8,.035,.055,glow);
      }
      for(let dx=-12;dx<=12;dx+=4)B.box(x+dx,y+3.2,roofZ,.10,.14,3.64,steel);
      for(let dx=-10;dx<12;dx+=4)pane(x+dx,y+3.28,roofZ,3.88,3.64,0,-Math.PI/2);
      // Paving joints and a separate tactile strip sit above the platform,
      // never in the same plane as its concrete top.
      for(let dx=-12;dx<=12;dx+=2)paint(x+dx,y+.047,z,.035,4.1,seam);
      B.box(x,y+.055,z+front*1.95,25,.035,.26,gold);
      for(let dx=-12;dx<=12;dx+=.6)paint(x+dx,y+.103,z+front*1.95,.045,.17,steel);
      for(const dx of [-6.5,6.5]){
        const bz=z-front*1.02;
        for(const leg of [-1.05,1.05])B.box(x+dx+leg,y+.04,bz,.13,.4,.48,steel);
        B.box(x+dx,y+.44,bz,3,.12,.62,wood);
        B.box(x+dx,y+.63,bz-front*.28,3,.43,.09,wood);
      }
      for(const dx of [-13.2,13.2]){
        B.box(x+dx,y+.035,back+front*.4,.85,.48,1.1,teal);
        B.box(x+dx,y+.515,back+front*.4,.72,.4,.95,{tex:'leaves',tint:0x729c82});
      }
      // Hang the name board clear of the roof and glass, with real supports.
      for(const dx of [-3.2,3.2])B.box(x+dx,y+3.04,z+front*.7,.05,.16,.05,steel);
      transitSign(B,planes,x,y+2.515,z+front*.7,stop.name,0x267d83,0,8);
    }else{
      const side=stop.returning?-1:1,back=x+side*.64;
      for(const dz of [-2.3,-.7,.7,2.3])B.box(back,y+.06,z+dz,.09,2.8,.09,steel);
      for(const [a,b] of [[-2.25,-.75],[-.65,.65],[.75,2.25]]){
        pane(back,y+1.52,z+(a+b)/2,b-a,2.5,Math.PI/2);
        for(const h of [.22,2.79])B.box(back,y+h,z+(a+b)/2,.08,.06,b-a,steel);
      }
      for(const dz of [-2.3,2.3]){
        pane(x+side*.39,y+1.52,z+dz,.41,2.5);
        B.box(x+side*.15,y+.06,z+dz,.07,2.8,.07,steel);
        B.box(x,y+2.86,z+dz,1.48,.12,.10,teal);
      }
      for(const edge of [-1,1])B.box(x+edge*.74,y+2.86,z,.08,.12,4.7,teal);
      B.box(x,y+2.87,z,1.4,.09,.06,steel);
      for(const dz of [-1.15,1.15])pane(x,y+2.94,z+dz,1.38,2.20,0,-Math.PI/2);
      B.box(back-side*.06,y+2.72,z,.035,.055,4.3,glow);
      B.box(x-side*.58,y+.075,z,.13,.025,4.5,gold);
      for(const dz of [.65,1.55])B.box(x+side*.36,y+.06,z+dz,.26,.38,.09,steel);
      B.box(x+side*.36,y+.44,z+1.1,.46,.12,1.25,wood);
      B.box(back-side*.1,y+.63,z+1.1,.08,.38,1.25,wood);
      transitSign(B,planes,back-side*.12,y+2.07,z-1.45,'公交 · '+(stop.end==='mountain'||stop.end!=='home'&&stop.returning?'回家':'山脚'),0x397f68,-side*Math.PI/2,1.5);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
  const glass=new THREE.Mesh(geometry,glassMaterial);
  glass.name='transit-station-glass';glass.renderOrder=2;
  return glass;
}
