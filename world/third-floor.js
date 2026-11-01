import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { makeSeat } from './seats.js';

export function buildThirdFloor({ grid, layer }) {
  const B = new BoxBatch(layer), ceiling = new BoxBatch(layer), stairs = new BoxBatch(layer);
  const wood = { tex: 'wood_panel' }, floor = { tex: 'greige_floor' }, dark = { tex: 'black_metal' },
    glass = { tex: 'glass', glass: true }, cushion = { tex: 'paint', tint: 0x587565 }, china = { tex: 'paint', tint: 0xece1c6 };
  const barriers = [], slabs = [], stairPoints = [], hit = new THREE.Vector3();
  const foot = { x: -19.4, y: 4, z: -5.25 }, exit = { x: -19.4, y: 11, z: -5.25 };
  const room = { x0: -18, x1: -4, z0: -9, z1: 6 };
  const insideRoom = (x, z) => x > room.x0 && x < room.x1 && z > room.z0 && z < room.z1;
  const obstacle = (x, z, w, d) => barriers.push({ x0: x-w/2, x1: x+w/2, z0: z-d/2, z1: z+d/2 });
  // The new floor covers the old skylights; keep a solid ceiling underneath it.
  for(let x=-20;x<24;x++)for(let z=-12;z<16;z++)grid.set(x,10,z,'roof','roof');
  B.box(2, 10.98, 2, 44, .08, 28, floor);
  // Glazed tea pavilion: solid low panels, broad windows and a usable double doorway.
  function wall(x, z, w, d) {
    B.box(x, 11, z, w, .72, d, wood); B.box(x, 14.45, z, w, .25, d, dark);
    B.box(x, 11.72, z, w, 2.73, d * .8, glass); obstacle(x, z, w, d);
  }
  wall(-11, -9, 14, .18);
  for (const x of [-18, -4]) {
    B.box(x, 11, -1.5, .18, .72, 15, wood); B.box(x, 11.72, -1.5, .10, 2.73, 15, glass);
    B.box(x, 14.45, -1.5, .18, .25, 15, dark); obstacle(x, -1.5, .18, 15);
    for (const z of [-9, -5, -1, 3, 6]) B.box(x, 11, z, .2, 3.7, .12, dark);
  }
  wall(-15, 6, 6, .18); wall(-7, 6, 6, .18);
  for (const x of [-18, -14, -12, -10, -7, -4]) B.box(x, 11, 6, .12, 3.7, .22, dark);
  // Open wooden door leaves sit beside the two-metre opening.
  for (const x of [-12.55, -9.45]) {
    B.box(x, 11, 5.86, 1.02, 3.1, .13, wood);
    B.box(x, 11.45, 5.78, .78, 2.2, .04, glass);
    B.box(x + (x < -11 ? .35 : -.35), 12.2, 5.7, .06, .42, .06, china);
  }
  ceiling.box(-11, 14.7, -1.5, 14.6, .24, 15.6, dark);
  for (const x of [-16, -11, -6]) ceiling.box(x, 14.60, -1.5, .12, .1, 14.6, wood);
  // Tea table, tray, kettle, cups and four armchairs.
  B.box(-11, 11.77, -1.5, 3.5, .16, 1.7, wood); obstacle(-11, -1.5, 3.5, 1.7);
  for (const x of [-12.35, -9.65]) for (const z of [-2.05, -.95]) B.box(x, 11, z, .14, .77, .14, dark);
  B.box(-11, 11.93, -1.5, 1.5, .07, .85, dark);
  B.box(-11.3, 12, -1.5, .38, .3, .34, china); B.box(-11.3, 12.3, -1.5, .42, .05, .38, china);
  B.box(-11.3, 12.35, -1.5, .1, .06, .1, dark); B.box(-11.03, 12.12, -1.5, .26, .09, .1, china, { rz: -.3 });
  for (const x of [-10.65, -10.25]) B.box(x, 12, -1.5, .18, .16, .18, china);
  const seatData = [[-11,.45,Math.PI],[-11,-3.45,0],[-13.7,-1.5,Math.PI/2],[-8.3,-1.5,-Math.PI/2]];
  const seats = seatData.map(([x,z,yaw],i)=>{
    B.at(x,11,z,yaw,()=>{
      for(const dx of [-.36,.36])for(const dz of [-.34,.34])B.box(dx,0,dz,.09,.55,.09,wood);
      B.box(0,.5,0,.9,.13,.86,cushion); B.box(0,.63,-.38,.9,.77,.12,wood);
      for(const dx of [-.43,.43])B.box(dx,.75,0,.1,.12,.86,wood);
    });
    obstacle(x,z,.95,.95);
    return makeSeat(`tea-${i}`, '三楼茶室 · 茶椅', x,11,z,11.63,yaw,[x+Math.cos(yaw)*1.05,z-Math.sin(yaw)*1.05],1.2);
  });
  // Open-air parking apron and runway markings on the eastern half.
  obstacle(12,0,7.4,6.4);
  B.box(12,11.065,0,9,.015,19,{tex:'paint',tint:0x576267});
  for(const x of [7.6,16.4])B.box(x,11.085,0,.10,.01,19,china);
  for(let z=-8;z<=8;z+=2)B.box(12,11.09,z,.14,.01,.85,china);
  for(const z of [-8.3,8.3])for(const x of [9,10,11,13,14,15])B.box(x,11.09,z,.48,.01,.9,china);
  // A two-flight outside stair links the existing second-floor landing to level three.
  for(let y=4;y<7;y++)for(let z=-6;z<-4;z++)grid.set(-21,y,z,null,'wallW');
  for(let z=-6;z<-4;z++)grid.set(-21,11,z,null,'roof');
  function slab(x0,x1,z0,z1,y) {
    stairs.box((x0+x1)/2,y-.14,(z0+z1)/2,x1-x0,.14,z1-z0,floor);
    slabs.push({x0,x1,z0,z1,y,box:new THREE.Box3(new THREE.Vector3(x0,y-.14,z0),new THREE.Vector3(x1,y,z1))});
  }
  slab(-28,-19.2,-6,-4,4); slab(-28,-22.5,-14,-12,7.5); slab(-24.5,-19.2,-6,-4,11);
  stairPoints.push(foot,{x:-27,y:4,z:-5.25});
  for(let i=0;i<14;i++){
    const z=-6-(i+.5)*6/14,y=4+(i+1)*.25;
    slab(-28,-26,z-3/14,z+3/14,y);stairPoints.push({x:-27,y,z});
  }
  stairPoints.push({x:-27,y:7.5,z:-13},{x:-23.5,y:7.5,z:-13});
  for(let i=0;i<14;i++){
    const z=-12+(i+.5)*6/14,y=7.5+(i+1)*.25;
    slab(-24.5,-22.5,z-3/14,z+3/14,y);stairPoints.push({x:-23.5,y,z});
  }
  stairPoints.push({x:-23.5,y:11,z:-5.25},exit);
  for(const {x,y,z} of stairPoints)for(const dx of [-.9,.9]){
    if(x===foot.x||x===exit.x)continue;
    stairs.box(x+dx,y,z,.05,.95,.05,dark);
  }
  for(const x of [-27.95,-26.05,-24.45,-22.55]){
    const first=x<-25;
    stairs.box(x,first?6.55:10.05,-9,.06,.06,Math.hypot(6,3.5),dark,{rx:first?Math.atan2(3.5,6):-Math.atan2(3.5,6)});
  }
  const pointAt=(x,y,z)=>({x,y,z,route:'third-stair',index:nearestIndex(x,y,z)});
  function nearestIndex(x,y,z){let best=0,d=Infinity;stairPoints.forEach((p,i)=>{const q=(p.x-x)**2+(p.z-z)**2+4*(p.y-y)**2;if(q<d){best=i;d=q;}});return best;}
  function obstructed(x,z,y){
    return y>=10.75&&y<14.7&&barriers.some(o=>x>o.x0-.04&&x<o.x1+.04&&z>o.z0-.04&&z<o.z1+.04);
  }
  const valid=(x,z)=>x>=-19.5&&x<=23.5&&z>=-11.5&&z<=15.5&&[-.35,0,.35].every(dx=>[-.35,0,.35].every(dz=>!obstructed(x+dx,z+dz,11)));
  function roofRoute(ax,az,bx,bz){
    const nx=87,nz=55;
    const pos=k=>({x:-19.5+(k%nx)/2,y:11,z:-11.5+Math.floor(k/nx)/2});
    function nearest(x,z){let best=-1,d=Infinity;for(let k=0;k<nx*nz;k++){const p=pos(k),q=(p.x-x)**2+(p.z-z)**2;if(q<d&&valid(p.x,p.z)){best=k;d=q;}}return best;}
    const start=nearest(ax,az),end=nearest(bx,bz),parents=new Int32Array(nx*nz).fill(-2),queue=[start];parents[start]=-1;
    for(let i=0;i<queue.length&&parents[end]===-2;i++){
      const k=queue[i];for(const n of [k-1,k+1,k-nx,k+nx]){
        if(n<0||n>=nx*nz||Math.abs(n%nx-k%nx)>1||parents[n]!==-2)continue;
        const p=pos(n);if(valid(p.x,p.z)){parents[n]=k;queue.push(n);}
      }
    }
    if(parents[end]===-2)return [];
    const path=[];for(let k=end;k!==-1;k=parents[k])path.unshift(pos(k));
    // Keep corners; remove only redundant collinear waypoints.
    const out=path.filter((p,i)=>!i||i===path.length-1||((p.x-path[i-1].x)!==(path[i+1].x-p.x))||((p.z-path[i-1].z)!==(path[i+1].z-p.z)));
    if(valid(bx,bz))out.push({x:bx,y:11,z:bz});return out;
  }
  function route(ax,ay,az,bx,by,bz){
    const onRoof=(x,y,z)=>y>=10.8&&x>=-20&&x<=24&&z>=-12&&z<=16;
    const onStair=(x,y,z)=>slabs.some(s=>Math.abs(y-s.y)<.35&&x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1);
    const fromRoof=onRoof(ax,ay,az),toRoof=onRoof(bx,by,bz),toStair=onStair(bx,by,bz);
    if(fromRoof&&toRoof)return roofRoute(ax,az,bx,bz);
    const a=fromRoof?stairPoints.length-1:onStair(ax,ay,az)?nearestIndex(ax,ay,az):0;
    const b=toRoof?stairPoints.length-1:toStair?nearestIndex(bx,by,bz):0;
    const path=stairPoints.slice(Math.min(a,b),Math.max(a,b)+1);if(a>b)path.reverse();
    const tagged=path.map(p=>pointAt(p.x,p.y,p.z));
    if(fromRoof)tagged.unshift(...roofRoute(ax,az,exit.x,exit.z));
    if(toRoof)tagged.push(...roofRoute(exit.x,exit.z,bx,bz));
    else if(toStair)tagged.push(pointAt(bx,by,bz));
    return tagged;
  }
  const source={
    foot,exit,room,seats,route,roofRoute,insideRoom,
    flightHeight(x,z){return insideRoom(x,z)?14.94:x>=-21&&x<=25&&z>=-13&&z<=17?12:0;},
    levels(x,z,out){
      if(x>=-20&&x<=24&&z>=-12&&z<=16)out.push({y:11,site:'roof'});
      for(const s of slabs)if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)out.push({y:s.y,site:'third-stairs',tread:true,route:'third-stair',index:nearestIndex(x,s.y,z)});
    },
    obstructed,collides:(x,y,z)=>obstructed(x,z,y),
    pick(ray){
      let best=null;for(const s of slabs){if(ray.intersectBox(s.box,hit)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:new THREE.Vector3(hit.x,s.y,hit.z),site:'third-stairs'};}}
      return best;
    },
  };
  return {source,batches:{thirdFloor:B,thirdRoomRoof:ceiling,thirdStairs:stairs}};
}
