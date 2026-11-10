import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { makeSeat } from './seats.js';
import { HOUSE, LOFT_STAIR_DOOR, ROOF_ROOM, ROOF_GLASS, ROOF_PARKING } from './layout.js';
import { HOUSE_COLORS as colors } from './house-palette.js';

export function buildThirdFloor({ grid, layer }) {
  const B = new BoxBatch(layer), ceiling = new BoxBatch(layer), stairs = new BoxBatch(layer);
  const wood = { tex: 'maple' }, floor = { tex: 'greige_floor' }, dark = { tex: 'black_metal' },
    trim = { tex: 'paint', tint: colors.trim }, sill = { tex: 'paint', tint: colors.facade },
    glass = { tex: 'glass', glass: true }, cushion = { tex: 'paint', tint: colors.heather }, china = { tex: 'paint', tint: colors.ivory };
  const barriers = [], slabs = [], stairPoints = [], hit = new THREE.Vector3();
  const glassVertices=[];
  let planeObstacle=()=>false;
  const foot = { x: -19.4, y: 4, z: -5.25 }, exit = { x: -19.4, y: 11, z: -5.25 };
  const room = ROOF_ROOM;
  const onDeck=(x,z,pad=0)=>x>=HOUSE.x0-pad&&x<=HOUSE.x1+pad&&z>=HOUSE.z0-pad&&z<=HOUSE.z1+pad;
  const inGlass=(x,z,pad=0)=>ROOF_GLASS.some(r=>x>=r.x0-pad&&x<=r.x1+pad&&z>=r.z0-pad&&z<=r.z1+pad);
  const insideRoom = (x, z) => x > room.x0 && x < room.x1 && z > room.z0 && z < room.z1;
  // One set of bounds for the visible roof, its walking surface and collision.
  const roomRoof = new THREE.Box3(new THREE.Vector3(room.x0-.3,14.7,room.z0-.3),new THREE.Vector3(room.x1+.3,14.94,room.z1+.3));
  const overRoomRoof = (x,z,pad=0) => x>=roomRoof.min.x-pad&&x<=roomRoof.max.x+pad&&z>=roomRoof.min.z-pad&&z<=roomRoof.max.z+pad;
  const obstacle = (x, z, w, d) => barriers.push({ x0: x-w/2, x1: x+w/2, z0: z-d/2, z1: z+d/2 });
  // The floor grid, visible glazing and walking surface share the same bounds.
  for(let x=HOUSE.x0;x<HOUSE.x1;x++)for(let z=HOUSE.z0;z<HOUSE.z1;z++)grid.set(x,10,z,inGlass(x+.5,z+.5)?null:'roof','roof');
  function pane(batch,hole,top){
    const [a,b,c,d]=hole,inset=.045,paneY=top-.008;
    glassVertices.push(a+inset,paneY,c+inset,a+inset,paneY,d-inset,b-inset,paneY,d-inset,a+inset,paneY,c+inset,b-inset,paneY,d-inset,b-inset,paneY,c+inset);
    for(const x of [a,b])batch.box(x,top-.043,(c+d)/2,.085,.055,d-c,dark);
    for(const z of [c,d])batch.box((a+b)/2,top-.043,z,b-a-.085,.055,.085,dark);
  }
  function skylight(batch,x0,x1,z0,z1,y,h,look,hole){
    const [a,b,c,d]=hole;
    for(const [l,r,n,s]of [[x0,a,z0,z1],[b,x1,z0,z1],[a,b,z0,c],[a,b,d,z1]])batch.box((l+r)/2,y,(n+s)/2,r-l,h,s-n,look);
    pane(batch,hole,y+h);
  }
  const xs=[...new Set([HOUSE.x0,HOUSE.x1,...ROOF_GLASS.flatMap(r=>[r.x0,r.x1])])].sort((a,b)=>a-b);
  const zs=[...new Set([HOUSE.z0,HOUSE.z1,...ROOF_GLASS.flatMap(r=>[r.z0,r.z1])])].sort((a,b)=>a-b);
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
    const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
    if(!inGlass(x,z))B.box(x,10.98,z,xs[i+1]-xs[i],.08,zs[j+1]-zs[j],floor);
  }
  for(const r of ROOF_GLASS)pane(B,[r.x0,r.x1,r.z0,r.z1],11.06);
  // A 20 x 21 m tea pavilion doubles its former 14 x 15 m footprint.
  function wall(x,z,w,d){
    B.box(x,11,z,w,.18,d,sill);B.box(x,14.45,z,w,.25,d,trim);
    B.box(x,11.18,z,w,3.27,d*.8,glass);obstacle(x,z,w,d);
  }
  wall((room.x0+room.x1)/2,room.z0,room.x1-room.x0,.18);
  for(const x of [room.x0,room.x1]){
    B.box(x,11,(room.z0+room.z1)/2,.18,.18,room.z1-room.z0,sill);
    B.box(x,11.18,(room.z0+room.z1)/2,.10,3.27,room.z1-room.z0,glass);
    B.box(x,14.45,(room.z0+room.z1)/2,.18,.25,room.z1-room.z0,trim);
    obstacle(x,(room.z0+room.z1)/2,.18,room.z1-room.z0);
    for(let z=room.z0;z<=room.z1;z+=3.5)B.box(x,11,z,.16,3.7,.10,dark);
  }
  wall((room.x0-12)/2,6,-12-room.x0,.18);wall((-10+room.x1)/2,6,room.x1+10,.18);
  for(const x of [room.x0,-20,-16,-12,-10,-7,room.x1])B.box(x,11,6,.10,3.7,.18,dark);
  const roomDoorBarrier = { x0: -12, x1: -10, z0: 5.78, z1: 5.94 };
  function setRoomDoorBarrier(blocked) {
    const index = barriers.indexOf(roomDoorBarrier);
    if (blocked && index < 0) barriers.push(roomDoorBarrier);
    else if (!blocked && index >= 0) barriers.splice(index, 1);
  }
  const stairDoor = LOFT_STAIR_DOOR;
  const stairDoorBounds = { x0: stairDoor.x - .06, x1: stairDoor.x + .06, z0: stairDoor.z0, z1: stairDoor.z1 };
  let stairDoorBlocked = false;
  const doors = [
    { id: 'loft-stair', automatic: true, x: stairDoor.x, z: stairDoor.z0, y: stairDoor.y + .02, interactY: stairDoor.y,
      width: stairDoor.z1 - stairDoor.z0, height: 2.88, closedYaw: -Math.PI / 2, openYaw: 0,
      surface: 'glass', color: 0x83aeb4, level: 1, bounds: stairDoorBounds,
      onBlockingChange: blocked => { stairDoorBlocked = blocked; } },
    { id: 'roof-room-left', controlGroup: 'roof-room', x: -12, z: 5.86, y: 9.45, interactY: 11, width: 1, height: 3.1,
      closedYaw: 0, openYaw: Math.PI / 2, color: 0x76583f, level: 1, bounds: { x0: -12, x1: -11, z0: 5.74, z1: 5.98 },
      onBlockingChange: blocked => setRoomDoorBarrier(blocked) },
    { id: 'roof-room-right', controlGroup: 'roof-room', x: -10, z: 5.86, y: 9.45, interactY: 11, width: 1, height: 3.1,
      closedYaw: Math.PI, openYaw: Math.PI / 2, color: 0x76583f, level: 1, bounds: { x0: -11, x1: -10, z0: 5.74, z1: 5.98 },
      onBlockingChange: blocked => setRoomDoorBarrier(blocked) },
  ];
  skylight(ceiling,roomRoof.min.x,roomRoof.max.x,roomRoof.min.z,roomRoof.max.z,14.7,.24,trim,[room.x0+1,room.x1-1,room.z0+1,room.z1-1]);
  for (const x of [room.x0+.4,room.x1-.4]) ceiling.box(x,14.60,(room.z0+room.z1)/2,.12,.1,room.z1-room.z0-.4,wood);
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
  // Four separate berths stay at the eastern edge, clear of the skylights.
  const apronX=ROOF_PARKING.x,apronZ=(HOUSE.z0+HOUSE.z1)/2,apronDepth=HOUSE.z1-HOUSE.z0-2;
  B.box(apronX,11.065,apronZ,9,.015,apronDepth,{tex:'paint',tint:0x576267});
  for(const x of [apronX-4.4,apronX+4.4])B.box(x,11.085,apronZ,.10,.01,apronDepth,china);
  for(const z of ROOF_PARKING.zs){
    for(const x of [apronX-4,apronX+4])B.box(x,11.09,z,.10,.01,8.8,china);
    for(const dz of [-4.4,4.4])B.box(apronX,11.09,z+dz,8,.01,.10,china);
    B.box(apronX,11.09,z,.12,.01,1.5,china);
  }
  // A two-flight outside stair links the existing second-floor landing to level three.
  for(let y=stairDoor.y;y<stairDoor.y+3;y++)for(let z=stairDoor.z0;z<stairDoor.z1;z++)grid.set(HOUSE.x0-1,y,z,null,'wallW');
  // Keep the exposed sill as permanent floor, including when the west wall is
  // cut away. The landing must stop at its outer edge, not overlap its top.
  for(let z=stairDoor.z0;z<stairDoor.z1;z++)grid.set(HOUSE.x0-1,stairDoor.y-1,z,'loft');
  for(let z=-6;z<-4;z++)grid.set(HOUSE.x0-1,11,z,null,'roof');
  const stairShift=HOUSE.x0+20;
  function slab(x0,x1,z0,z1,y,drawEnd=x1) {
    x0+=stairShift;x1+=stairShift;drawEnd+=stairShift;
    stairs.box((x0+drawEnd)/2,y-.14,(z0+z1)/2,drawEnd-x0,.14,z1-z0,floor);
    slabs.push({x0,x1,z0,z1,y,box:new THREE.Box3(new THREE.Vector3(x0,y-.14,z0),new THREE.Vector3(x1,y,z1))});
  }
  // Draw edge to edge with the sill/roof; collision support still extends into
  // the building so crossing the doorway remains continuous.
  slab(-28,-19.2,-6,-4,4,-21); slab(-28,-22.5,-14,-12,7.5); slab(-24.5,-19.2,-6,-4,11,-21);
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
  const posts=new Set();
  function guard(x0,y0,z0,x1,y1,z1,steps=Math.ceil(Math.hypot(x1-x0,z1-z0)/1.1)){
    x0+=stairShift;x1+=stairShift;
    const dx=x1-x0,dy=y1-y0,dz=z1-z0,horizontal=Math.hypot(dx,dz);
    for(const lift of [.5,1])stairs.box((x0+x1)/2,(y0+y1)/2+lift-.0375,(z0+z1)/2,.075,.075,Math.hypot(horizontal,dy),dark,{rx:-Math.atan2(dy,horizontal),ry:Math.atan2(dx,dz),order:'YXZ'});
    for(let i=0;i<=steps;i++){
      const t=i/steps,x=x0+dx*t,y=y0+dy*t,z=z0+dz*t,key=[x,y,z].map(n=>n.toFixed(3)).join(',');
      if(posts.has(key))continue;posts.add(key);stairs.box(x,y,z,.075,1.04,.075,dark);
    }
  }
  // Continuous rails around all exposed landing edges; only the doorways and
  // the two stair mouths stay open. Sloped rails join the same corner posts.
  guard(-27.96,4,-4.04,-20.04,4,-4.04);guard(-27.96,4,-4.04,-27.96,4,-6);
  guard(-26.04,4,-6,-20.04,4,-6);
  for(const x of [-27.96,-26.04])guard(x,4,-6,x,7.5,-12,14);
  guard(-27.96,7.5,-12,-27.96,7.5,-13.96);guard(-27.96,7.5,-13.96,-22.54,7.5,-13.96);
  guard(-22.54,7.5,-13.96,-22.54,7.5,-12);guard(-26.04,7.5,-12,-24.46,7.5,-12);
  for(const x of [-24.46,-22.54])guard(x,7.5,-12,x,11,-6,14);
  guard(-24.46,11,-6,-24.46,11,-4.04);guard(-24.46,11,-4.04,-20.96,11,-4.04);
  guard(-22.54,11,-6,-20.96,11,-6);
  for(const p of stairPoints)p.x+=stairShift;
  const pointAt=(x,y,z)=>({x,y,z,route:'third-stair',index:nearestIndex(x,y,z)});
  function nearestIndex(x,y,z){let best=0,d=Infinity;stairPoints.forEach((p,i)=>{const q=(p.x-x)**2+(p.z-z)**2+4*(p.y-y)**2;if(q<d){best=i;d=q;}});return best;}
  function obstructed(x,z,y){
    if (stairDoorBlocked && Math.abs(y - stairDoor.y) < .85 &&
        x >= stairDoorBounds.x0 && x <= stairDoorBounds.x1 && z >= stairDoorBounds.z0 && z <= stairDoorBounds.z1) return true;
    return planeObstacle(x,z,y) || y>=10.75&&y<14.7&&barriers.some(o=>x>o.x0-.04&&x<o.x1+.04&&z>o.z0-.04&&z<o.z1+.04);
  }
  const valid=(x,z)=>x>=HOUSE.x0+.5&&x<=HOUSE.x1-.5&&z>=HOUSE.z0+.5&&z<=HOUSE.z1-.5&&[-.35,0,.35].every(dx=>[-.35,0,.35].every(dz=>!obstructed(x+dx,z+dz,11)));
  function roofRoute(ax,az,bx,bz){
    const nx=(HOUSE.x1-HOUSE.x0-1)*2+1,nz=(HOUSE.z1-HOUSE.z0-1)*2+1;
    const pos=k=>({x:HOUSE.x0+.5+(k%nx)/2,y:11,z:HOUSE.z0+.5+Math.floor(k/nx)/2});
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
    const onRoof=(x,y,z)=>y>=10.8&&onDeck(x,z);
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
    foot,exit,room,seats,route,roofRoute,insideRoom,doors,setPlaneObstacle(fn){planeObstacle=fn;},
    flightHeight(x,z){return overRoomRoof(x,z)?roomRoof.max.y:onDeck(x,z,1)?12:0;},
    levels(x,z,out){
      // A separate site keeps rooftop clicks from routing through the tea room.
      if(overRoomRoof(x,z))out.push({y:roomRoof.max.y,site:'tea-roof'});
      if(onDeck(x,z))out.push({y:11,site:'roof'});
      for(const s of slabs)if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)out.push({y:s.y,site:'third-stairs',tread:true,route:'third-stair',index:nearestIndex(x,s.y,z)});
    },
    obstructed,
    collides(x,y,z){return obstructed(x,z,y)||overRoomRoof(x,z,.3)&&y<roomRoof.max.y-.02&&y+1.8>roomRoof.min.y||inGlass(x,z,.3)&&y<10.98&&y+1.8>10.98;},
    pick(ray){
      let best=null;
      // Only the upper face is a destination; looking up inside the room must
      // not turn a ceiling click into a flight onto the roof.
      if(ray.direction.y<0){
        const t=(roomRoof.max.y-ray.origin.y)/ray.direction.y;
        if(t>=0){ray.at(t,hit);if(overRoomRoof(hit.x,hit.z))best={t,point:hit.clone(),site:'tea-roof'};}
        const lower=(11-ray.origin.y)/ray.direction.y;
        if(lower>=0&&(!best||lower<best.t)){ray.at(lower,hit);if(inGlass(hit.x,hit.z))best={t:lower,point:hit.clone(),site:'roof'};}
      }
      for(const s of slabs){if(ray.intersectBox(s.box,hit)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:new THREE.Vector3(hit.x,s.y,hit.z),site:'third-stairs'};}}
      return best;
    },
  };
  const paneGeometry=new THREE.BufferGeometry();
  paneGeometry.setAttribute('position',new THREE.Float32BufferAttribute(glassVertices,3));paneGeometry.computeVertexNormals();
  const paneMaterial=new THREE.MeshLambertMaterial({color:0xa8d2df,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  paneMaterial.forceSinglePass=true;
  const skylights=new THREE.Mesh(paneGeometry,paneMaterial);skylights.name='roof-skylights';skylights.userData.group='roof';skylights.renderOrder=4;
  return {source,skylights,batches:{thirdFloor:B,thirdRoomRoof:ceiling,thirdStairs:stairs}};
}
