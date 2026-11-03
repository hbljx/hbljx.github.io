import * as THREE from 'three';
import { SEA_BRIDGE } from './layout.js';

export { SEA_BRIDGE };
const X=SEA_BRIDGE.x, END=SEA_BRIDGE.z1;
const SPANS=[[26,30,0,0],[30,62,0,6],[62,118,6,6],[118,150,6,0],[150,END,0,0]];
export function bridgeHeight(z){return Math.max(0,Math.min(6,(z-30)*6/32,(150-z)*6/32));}
export function onBridge(x,z,margin=0){return z>=SEA_BRIDGE.z0&&z<=END-margin&&Math.abs(x-X)<=(z>=150?9:5)-margin;}

export function buildSeaBridge(B,obstacles,bakes=[]){
  const road={tex:'paint',tint:0x3c4b58},stone={tex:'concrete',tint:0xaabbbd};
  const steel={tex:'paint',tint:0xe0e8e5},blue={tex:'paint',tint:0x365e70};
  const gold={tex:'paint',tint:0xe8c581},walk={tex:'pavers',tint:0xc6c8bc};
  const light={tex:'paint',tint:0xffe0a1,emissive:1};
  // The top face meets the analytic driving surface at every ramp joint.
  function slab(x,a,ya,b,yb,w,t,look){
    const angle=Math.atan2(yb-ya,b-a);
    B.box(x,(ya+yb)/2-t*Math.cos(angle)/2-t/2,(a+b)/2+t*Math.sin(angle)/2,w,t,Math.hypot(b-a,yb-ya),look,{rx:-angle});
  }
  function beam(x,a,ya,b,yb,w,t,look){
    B.box(x,(ya+yb)/2-t/2,(a+b)/2,w,t,Math.hypot(b-a,yb-ya),look,{rx:-Math.atan2(yb-ya,b-a)});
  }
  for(const [a,b,ya,yb] of SPANS){
    const width=a>=150?18:10;
    if(a!==26)slab(X,a,ya,b,yb,width,.44,road);
    for(const side of [-1,1]){
      const edge=X+side*(width/2-.14);
      slab(X+side*(width/2-.78),a,ya+.055,b,yb+.055,1.24,.1,walk);
      beam(edge,a,ya-.48,b,yb-.48,.28,.32,blue);
      for(const up of [.44,1.05])beam(edge,a,ya+up,b,yb+up,.1,.1,steel);
      beam(edge,a,ya+.91,b,yb+.91,.065,.04,light);
      if(a<150)beam(X+side*3.45,a,ya+.022,b,yb+.022,.1,.018,steel);
    }
  }
  B.box(34.5,-.32,6,7,.32,32,road);
  B.box(28.5,-.32,26,19,.32,8,road);
  for(let z=-6;z<27;z+=7)B.box(34,.018,z,.12,.012,2.6,gold);
  for(let z=32;z<148;z+=8)for(const side of [-1,1]){
    beam(X+side*.13,z,bridgeHeight(z)+.025,z+2.8,bridgeHeight(z+2.8)+.025,.08,.018,gold);
  }
  // Rail posts, crossheads and paired piers give the deck a readable structure.
  for(let z=30;z<=END;z+=5)for(const side of [-1,1]){
    B.box(X+side*((z>=150?9:5)-.14),bridgeHeight(z),z,.12,1.12,.12,steel);
  }
  for(const z of [42,60,82,104,126,144,160]){
    const y=bridgeHeight(z),width=z>=150?17:9.5;
    B.box(X,-3,z,width-1,.65,3,stone);
    for(const side of [-1,1])B.box(X+side*2.8,-2.35,z,1.1,y+1.65,1.5,stone);
    B.box(X,y-.9,z,width,.4,1.8,blue);
  }
  // Portal towers and fan stays sit outside the pedestrian lanes.
  for(const z of [72,108]){
    for(const side of [-1,1]){
      const x=X+side*5.65;
      B.box(x,-3,z,2.2,1.2,3.2,stone);
      B.box(x,-1.8,z,.95,29.8,1.25,blue);
      B.box(x,27.7,z,1.15,.5,1.5,gold);
      B.box(x-side*.49,7,z,.045,19,.36,steel);
      for(const d of [-26,-18,-10,10,18,26]){
        beam(x,z,26.8,z+d,bridgeHeight(z+d)+.4,.075,.075,steel);
        B.box(x-side*.45,bridgeHeight(z+d)-.42,z+d,1.25,.82,.38,blue);
      }
    }
    B.box(X,24.5,z,12.2,.95,1.25,steel);
    B.box(X,25.5,z,5.8,.18,1.3,gold);
  }
  for(const z of [46,78,110,142,160])for(const side of [-1,1]){
    const x=X+side*(z>=150?8.4:4.65),y=bridgeHeight(z);
    B.box(x,y,z,.13,3.5,.13,blue);
    B.box(x-side*.38,y+3.4,z,.9,.12,.35,blue);
    B.box(x-side*.38,y+3.38,z,.72,.035,.25,light);
    bakes.push({id:`bridge-${z}-${side}`,position:[x-side*.38,y+3.3,z],power:2,radius:5,direction:[0,-1,0]});
  }
  // Level arrival court with side parking bays and an open mountain entrance.
  for(const side of [-1,1]){
    for(const up of [.44,1.05]){
      B.box(X+side*6.9,up,150,4.2,.1,.1,steel);
      B.box(X+side*5.2,up,END,7.6,.1,.1,steel);
    }
    for(const z of [153,158,163])B.box(X+side*5.4,.025,z,3.8,.018,.1,steel);
    B.box(X+side*7.25,.025,158,.1,.018,10,steel);
    const x=X+side*8;
    B.box(x,0,164,.65,.42,3.6,blue);
    B.box(x,.42,164,.8,.08,3.8,{tex:'deck',tint:0xc49c70});
    obstacles.push({x0:x-.5,x1:x+.5,z0:162,z1:166,y:0,level:99,bridgeFixture:true});
    B.box(X+side*2.3,0,168,.35,.9,.35,stone);
    B.box(X+side*2.3,.9,168,.4,.07,.4,light);
  }
  B.box(X,.005,161,2.2,.018,18,walk);
  const hit=new THREE.Vector3();
  return {id:'sea-bridge',foot:{x:X,y:0,z:26},exit:{x:X,y:.02,z:END},height:bridgeHeight,contains:onBridge,
    slope(z){return z>30&&z<62?6/32:z>118&&z<150?-6/32:0;},
    collides(x,y,z){
      if(!onBridge(x,z))return false;
      const h=bridgeHeight(z),edge=Math.abs(x-X)>(z>=150?8.6:4.6)||(z>END-.4&&Math.abs(x-X)>1.3);
      return y<h-.02&&y+1.8>h-.45||edge&&y<h+1.1&&y+1.8>h;
    },
    levels(x,z,out){if(onBridge(x,z,.3)||Math.abs(x-X)<1.05&&z>=END-.5&&z<=END+.15)out.push({y:bridgeHeight(z),site:'sea-bridge'});},
    obstructed(x,z,y){return onBridge(x,z)&&obstacles.some(o=>(o.dynamic||o.bridgeFixture)&&Math.abs((o.y||0)-y)<1&&x>o.x0-.28&&x<o.x1+.28&&z>o.z0-.28&&z<o.z1+.28);},
    route(x,z,tx,tz){
      const lane=obstacles.some(o=>o.dynamic&&o.x0<X-3.4&&o.x1>X-4.6&&o.z1>=Math.min(z,tz)&&o.z0<=Math.max(z,tz))?X+4:X-4;
      const pts=[{x:lane,y:bridgeHeight(z),z}];
      const breaks=[30,62,118,150].filter(q=>q>Math.min(z,tz)&&q<Math.max(z,tz)).sort((a,b)=>tz>z?a-b:b-a);
      if(z>167)pts.splice(0,1,{x,y:bridgeHeight(z),z},{x,y:0,z:167},{x:lane,y:0,z:167});
      for(const q of breaks)pts.push({x:lane,y:bridgeHeight(q),z:q});
      if(tz>167)pts.push({x:lane,y:0,z:167},{x:tx,y:0,z:167});
      else pts.push({x:lane,y:bridgeHeight(tz),z:tz});
      pts.push({x:tx,y:bridgeHeight(tz),z:tz});
      return pts;
    },
    pick(ray){let best=null;for(const[a,b,ya,yb]of SPANS){const slope=(yb-ya)/(b-a),plane=new THREE.Plane(new THREE.Vector3(0,1,-slope),slope*a-ya);if(ray.intersectPlane(plane,hit)&&hit.z>=a&&hit.z<=b&&onBridge(hit.x,hit.z,.3)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:hit.clone(),site:'sea-bridge'};}}return best;}
  };
}

// Shared by click navigation and residents: connect the home's nav grid,
// the bridge, and the mountain's original stair route without a flight.
export function travelLandscape(actor,world,nav,x,z,y=null,continueTo=null){
  const bridge=world.seaBridge,mountain=world.mountain,on=actor.island;
  if(actor.flying||actor.swimming||on&&!['sea-bridge','mountain'].includes(on))return null;
  const surface=world.ground.topAt(x,z,y===null?Infinity:y+.7);
  const to=surface?.site==='mountain'?'mountain':bridge.contains(x,z)?'sea-bridge':null;
  if(!to&&!['sea-bridge','mountain'].includes(on))return null;
  if(!to&&!nav.canStand(x,z)&&!continueTo)return null;
  const entry=mountain.trailhead,end=bridge.foot,points=[];
  let startX=actor.pos.x,startZ=actor.pos.z;
  if(on==='mountain'){
    if(to==='mountain')return actor.follow(mountain.route(startX,actor.y,startZ,x,surface.y,z));
    points.push(...mountain.route(startX,actor.y,startZ,entry.x,.02,entry.z));
    startX=entry.x;startZ=entry.z;
  }else if(on!=='sea-bridge'){startX=end.x;startZ=end.z;}
  const target=to==='mountain'?entry:to==='sea-bridge'?{x,z}:end;
  points.push(...bridge.route(startX,startZ,target.x,target.z));
  if(to==='mountain')points.push(...mountain.route(entry.x,null,entry.z,x,surface.y,z));
  return actor.follow(points,on?null:end,to?null:()=>{actor.teleport(end.x,end.z);if(continueTo)continueTo();else actor.goTo(x,z);});
}
