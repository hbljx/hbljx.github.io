import * as THREE from 'three';

export { SEA_BRIDGE } from './layout.js';
export function bridgeHeight(z){return Math.max(0,Math.min(6,(z-30)*.15));}
export function onBridge(x,z,margin=0){return z>=26&&z<=170-margin&&Math.abs(x-24)<=(z>=150?9:5)-margin;}
export function buildSeaBridge(B,obstacles){
  const road={tex:'paint',tint:0x45535f},steel={tex:'paint',tint:0xcbd5d4},blue={tex:'paint',tint:0x577d91},gold={tex:'paint',tint:0xf4dd8d};
  const spans=[[26,30,0,0],[30,70,0,6],[70,150,6,6],[150,170,6,6]];
  function beam(x,z0,y0,z1,y1,w,h,look){const d=Math.hypot(z1-z0,y1-y0);B.box(x,(y0+y1)/2-h/2,(z0+z1)/2,w,h,d,look,{rx:-Math.atan2(y1-y0,z1-z0)});}
  for(const [a,b,ya,yb]of spans){
    const width=a===150?18:10;beam(24,a,ya-.16,b,yb-.16,width,.32,road);
    for(const side of [-1,1])for(const up of [.25,.95])beam(24+side*(width/2-.12),a,ya+up,b,yb+up,.12,.12,steel);
  }
  // A marked coastal road connects the garage exit to the bridge's approach.
  B.box(34,-.01,10,7.8,.025,39,road);B.box(28.5,-.01,26,11,.025,8,road);
  for(let z=-6;z<27;z+=7)B.box(34,.018,z,.12,.012,2.6,gold);
  for(let z=32;z<148;z+=10){const y=bridgeHeight(z);beam(24,z,y+.025,z+3,bridgeHeight(z+3)+.025,.12,.018,gold);}
  for(let z=34;z<=150;z+=12){const y=bridgeHeight(z);
    for(const x of [19.12,28.88])B.box(x,y,z,.16,1.1,.16,steel);
    if(z%24===10){B.box(24,-3,z,2.1,y+2.7,2.1,blue);B.box(24,y-.65,z,9,.45,1.2,steel);}
  }
  for(const z of [90,130]){
    for(const x of [18.6,29.4]){
      B.box(x,-3,z,.75,26,.9,blue);
      for(const d of [-28,-18,-8,8,18,28]){
        const end=z+d,dy=bridgeHeight(end)+1-22,dz=d,len=Math.hypot(dy,dz);
        B.box(x,22+dy/2-len/2,z+dz/2,.065,len,.065,steel,{rx:Math.atan2(dz,dy)});
      }
    }
    B.box(24,21.8,z,11.6,.7,.9,blue);
  }
  for(const z of [48,80,112,144,164])for(const x of [19.2,28.8]){
    const y=bridgeHeight(z);B.box(x,y,z,.12,3.5,.12,blue);B.box(x, y+3.4,z,.55,.09,.65,{tex:'paint',tint:0xffe5af,emissive:1});
  }
  for(const x of [17,31])for(const y of [6.25,6.95])B.box(x,y,150,4,.12,.12,steel);
  B.box(24,6.9,169.8,18,.12,.14,steel);B.box(24,6.25,169.8,18,.12,.14,steel);
  // The widened terminal is a turn-around and seaside lookout, not a dead end.
  for(const x of [16,32]){B.box(x,6,160,.6,.5,3.8,blue);B.box(x,6.5,160,.7,.08,3.8,steel);obstacles.push({x0:x-.45,x1:x+.45,z0:158,z1:162,y:6,level:99,bridgeFixture:true});}
  const hit=new THREE.Vector3();
  const site={id:'sea-bridge',foot:{x:24,y:0,z:26},height:bridgeHeight,contains:onBridge,
    collides(x,y,z){if(!onBridge(x,z))return false;const h=bridgeHeight(z),edge=Math.abs(x-24)>(z>=150?8.6:4.6)||z>169.5;return y<h-.02&&y+1.8>h-.35||edge&&y<h+1.1&&y+1.8>h;},
    levels(x,z,out){if(onBridge(x,z,.3))out.push({y:bridgeHeight(z),site:'sea-bridge'});},
    obstructed(x,z,y){return onBridge(x,z)&&obstacles.some(o=>(o.dynamic||o.bridgeFixture)&&Math.abs((o.y||0)-y)<1&&x>o.x0-.28&&x<o.x1+.28&&z>o.z0-.28&&z<o.z1+.28);},
    route(x,z,tx,tz){const lane=obstacles.some(o=>o.dynamic&&(o.y||0)>0&&o.x0<20.6&&o.x1>19.4)?28:20,pts=[{x:lane,y:bridgeHeight(z),z}];const breaks=[30,70,150].filter(q=>q>Math.min(z,tz)&&q<Math.max(z,tz)).sort((a,b)=>tz>z?a-b:b-a);for(const q of breaks)pts.push({x:lane,y:bridgeHeight(q),z:q});pts.push({x:lane,y:bridgeHeight(tz),z:tz},{x:tx,y:bridgeHeight(tz),z:tz});return pts;},
    pick(ray){let best=null;for(const[a,b,ya,yb]of spans){const slope=(yb-ya)/(b-a),plane=new THREE.Plane(new THREE.Vector3(0,1,-slope),slope*a-ya);if(ray.intersectPlane(plane,hit)&&hit.z>=a&&hit.z<=b&&onBridge(hit.x,hit.z,.35)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:hit.clone(),site:'sea-bridge'};}}return best;}
  };return site;
}

