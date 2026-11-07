import { ISLAND, SEA_BRIDGE, SUBMARINE_HOME, SUBMARINE_SCALE, MOUNTAIN_SITE } from './layout.js';
import { TUNNEL_POINTS, METRO_POINTS } from './transit-layout.js';

// A full circuit outside the house, transport arcs, mountain and offshore tower.
export const CARRIER_PATROL = Object.freeze({ x:12, z:110, rx:220, rz:280 });
export const SAIL_BOUNDS = Object.freeze({ x0:-260, x1:284, z0:-210, z1:438 });
export function sampleCarrierPatrol(angle,out){
  const p=CARRIER_PATROL;
  out.x=p.x+p.rx*Math.cos(angle);out.z=p.z+p.rz*Math.sin(angle);
  out.yaw=Math.atan2(-p.rx*Math.sin(angle),p.rz*Math.cos(angle));
  return out;
}

export function createSailingArea(world,gangway){
  const rectangles=[];
  const rect=(x0,x1,z0,z1)=>rectangles.push({x0,x1,z0,z1});
  rect(ISLAND.x0-2,ISLAND.x1+2,ISLAND.z0-2,ISLAND.z1+2);
  rect(SEA_BRIDGE.x-6,SEA_BRIDGE.x+6,SEA_BRIDGE.z0,150);
  rect(SEA_BRIDGE.x-10,SEA_BRIDGE.x+10,150,SEA_BRIDGE.z1+1);
  rect(gangway.x0,gangway.fixedEnd,gangway.z-gangway.width/2-.3,gangway.z+gangway.width/2+.3);
  rect(SUBMARINE_HOME.x+5*SUBMARINE_SCALE,SEA_BRIDGE.x-4,gangway.z-4.5,gangway.z+4.5);
  // Reserve the submarine berth even while it is away.
  rect(SUBMARINE_HOME.x-5,SUBMARINE_HOME.x+5,SUBMARINE_HOME.z-35,SUBMARINE_HOME.z+35);
  rect(-45,21,151,174);rect(30,73,150,166);
  rect(-45,-13,26,37);
  function corridor(points,radius,submerged=false){
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      // The hull draws 2.8 m: keep a metre below the keel at deep crossings.
      if(submerged&&Math.max(a[1],b[1])+6.3 < -3.8)continue;
      rect(Math.min(a[0],b[0])-radius,Math.max(a[0],b[0])+radius,Math.min(a[2],b[2])-radius,Math.max(a[2],b[2])+radius);
    }
  }
  // Use the actual interpolated tracks, including the tunnel's underwater arc.
  const tunnel=world.transit?.tunnel?.path,metro=world.transit?.services?.metro?.path;
  corridor(tunnel?tunnel.samples.map(p=>[p.x,p.y,p.z]):TUNNEL_POINTS,6.5,true);
  corridor(metro?metro.samples.map(p=>[p.x,p.y,p.z]):METRO_POINTS,4.5);
  const mountain=world.mountain.mapShape;
  const circles=[{x:mountain.x,z:mountain.z,r:mountain.r+6},{x:MOUNTAIN_SITE.x-12,z:MOUNTAIN_SITE.z+MOUNTAIN_SITE.r+18,r:12}];
  const bounds=(x,z)=>x>=SAIL_BOUNDS.x0&&x<=SAIL_BOUNDS.x1&&z>=SAIL_BOUNDS.z0&&z<=SAIL_BOUNDS.z1;
  function turnSafe(x,z){
    if(!bounds(x,z))return false;
    for(const r of rectangles)if(Math.hypot(Math.max(r.x0-x,0,x-r.x1),Math.max(r.z0-z,0,z-r.z1))<36)return false;
    return circles.every(p=>Math.hypot(x-p.x,z-p.z)>p.r+36);
  }
  // Convex envelope of the stepped flight deck, expanded by 0.6 m.
  // Its tapered bow fits the berth without discarding stern overhangs.
  const hull=[[-6.5,-32.6],[6.5,-32.6],[10.1,-29],[10.1,-21],[8.2,22],[8.6,29],[7.4,33.6],[-7.4,33.6],[-8.6,29],[-8.2,22],[-10.1,-21],[-10.1,-29]];
  const axes=hull.map((a,i)=>{
    const b=hull[(i+1)%hull.length],x=-(b[1]-a[1]),z=b[0]-a[0];let min=Infinity,max=-Infinity;
    for(const p of hull){const v=p[0]*x+p[1]*z;min=Math.min(min,v);max=Math.max(max,v);}
    return {x,z,min,max};
  });
  function canSail(x,z,yaw){
    if(!bounds(x,z))return false;
    // Conservative full-deck OBB, including overhangs, with a water gap.
    const s=Math.sin(yaw),c=Math.cos(yaw),as=Math.abs(s),ac=Math.abs(c),w=10.1,d=33.6;
    for(const r of rectangles){
      const dx=(r.x0+r.x1)/2-x,dz=(r.z0+r.z1)/2-z,rw=(r.x1-r.x0)/2,rd=(r.z1-r.z0)/2;
      if(Math.abs(dx)>w*ac+d*as+rw||Math.abs(dz)>w*as+d*ac+rd)continue;
      if(Math.abs(dx*c-dz*s)>w+rw*ac+rd*as||Math.abs(dx*s+dz*c)>d+rw*as+rd*ac)continue;
      let separated=false;
      const lx=dx*c-dz*s,lz=dx*s+dz*c;
      for(const axis of axes){
        const centre=lx*axis.x+lz*axis.z,radius=rw*Math.abs(axis.x*c+axis.z*s)+rd*Math.abs(-axis.x*s+axis.z*c);
        if(centre+radius<axis.min||centre-radius>axis.max){separated=true;break;}
      }
      if(!separated)return false;
    }
    for(const p of circles){
      const dx=p.x-x,dz=p.z-z;
      if(Math.hypot(Math.max(Math.abs(dx*c-dz*s)-w,0),Math.max(Math.abs(dx*s+dz*c)-d,0))<=p.r)return false;
    }
    return true;
  }
  return {canSail,turnSafe};
}
