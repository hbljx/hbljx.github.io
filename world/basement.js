import * as THREE from 'three';
import { ISLAND } from './layout.js';

export const BASEMENT = { x0: -25, x1: 29, z0: -27, z1: 16, y: -8, ceiling: -2 };
const hole = { x0: -24, x1: -20, z0: 6, z1: 14 };
const inside = (r, x, z, pad = 0) => x > r.x0 + pad && x < r.x1 - pad && z > r.z0 + pad && z < r.z1 - pad;

// Retain the island's upper slab. The space beneath it is open ocean, so
// earth cannot obscure any of the four observation windows.
export function excavateBasement(grid) {
  grid.fill(ISLAND.x0, -20, ISLAND.z0, ISLAND.x1, -2, ISLAND.z1, null);
  grid.fill(hole.x0, -2, hole.z0, hole.x1, 0, hole.z1, null);
}

export function buildBasement({ grid, B, planes, obstacles, lighting }) {
  const r = BASEMENT, wood = { tex: 'maple' }, metal = { tex: 'black_metal', tint: 0x36545a },
    stone = { tex: 'travertine', tint: 0xd6ded8 }, glow = { tex: 'paint', tint: 0xbdebe1, emissive: .75 };
  const foot = { x: -23, y: 0, z: 15 }, exit = { x: -21, y: -8, z: 15 };
  const points = [foot], treads = [], barriers = [], hit = new THREE.Vector3();
  // Finish the exposed underside of the shore slab, following its actual
  // outline rather than leaving isolated dirt faces suspended above the sea.
  for(let z=ISLAND.z0;z<ISLAND.z1;z++) {
    let start=null;
    for(let x=ISLAND.x0;x<=ISLAND.x1;x++) {
      const solid=x<ISLAND.x1&&grid.type(x,-2,z)&&!inside(r,x+.5,z+.5);
      if(solid&&start===null)start=x;
      if(!solid&&start!==null){B.box((start+x)/2,-2.06,z+.5,x-start,.06,1,stone);start=null;}
    }
  }
  B.box(2, -8.3, -5.5, 54, .3, 43, stone);
  // Voxel terrain deliberately omits submerged bottom faces. Supply a real
  // ceiling here, with an opening matching the complete stairwell.
  for(const [x0,x1,z0,z1] of [[-25,-24,-27,16],[-24,-20,-27,6],[-24,-20,14,16],[-20,29,-27,16]])
    B.box((x0+x1)/2,-2.12,(z0+z1)/2,x1-x0,.12,z1-z0,{tex:'plaster',tint:0xc9d8d5});
  // Facing sits inside the opening, clear of the voxel wall plane.
  // The former outer faces were exactly coplanar with the soil/floor faces.
  for(const x of [-23.9775,-20.0225])B.box(x,-2.08,10,.04,2.08,7.94,stone);
  B.box(-22,-2.08,6.0225,3.92,2.08,.04,stone);
  for(const x of [-23.94,-20.06])B.box(x,-.10,10,.08,.075,7.94,wood);
  B.box(-22,-.10,6.06,3.80,.075,.08,wood);
  // Thin warm timber inlay and recessed perimeter lights frame the sea view.
  for (const x of [r.x0 + .45, r.x1 - .45]) {
    B.box(x, -7.994, -5.5, .18, .012, 42, wood);
    B.box(x, -2.13, -5.5, .08, .06, 42, glow);
  }
  for (const z of [r.z0 + .45, r.z1 - .45]) {
    B.box(2, -7.994, z, 53, .012, .18, wood);
    B.box(2, -2.13, z, 53, .06, .08, glow);
  }
  const vertices = [];
  function wall(ax, az, bx, bz) {
    vertices.push(ax,-7.85,az, bx,-7.85,bz, bx,-2.1,bz, ax,-7.85,az, bx,-2.1,bz, ax,-2.1,az);
    for (const y of [-8, -2.12]) B.box((ax+bx)/2,y,(az+bz)/2,Math.abs(bx-ax)+.14,.14,Math.abs(bz-az)+.14,metal);
    const n=Math.ceil(Math.hypot(bx-ax,bz-az)/6);
    for(let i=0;i<=n;i++) B.box(ax+(bx-ax)*i/n,-8,az+(bz-az)*i/n,.12,6,.12,metal);
  }
  wall(r.x0,r.z0,r.x1,r.z0); wall(r.x1,r.z0,r.x1,r.z1);
  wall(r.x1,r.z1,r.x0,r.z1); wall(r.x0,r.z1,r.x0,r.z0);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const material=new THREE.MeshPhongMaterial({color:0xb9e6e5,shininess:90,specular:0xbde8e4,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide});
  material.forceSinglePass=true;
  const glazing=new THREE.Mesh(geometry,material);glazing.name='basement-four-glass-walls';glazing.renderOrder=3;planes.push(glazing);
  const stairStone=new THREE.MeshPhongMaterial({color:0x839b99,shininess:12,specular:0x283b3b});
  // Each flight is a closed, stepped prism with one continuous sloping soffit.
  // Timber caps stop short of the stone cheeks; no face is layered on a wall.
  function flight(x0,x1,startZ,endZ,startY) {
    const shape=new THREE.Shape(),direction=Math.sign(endZ-startZ);
    shape.moveTo(-startZ,startY-.045);
    for(let i=0;i<24;i++) {
      const za=startZ+direction*i*.25,zb=za+direction*.25,y=startY-(i+1)/6;
      shape.lineTo(-za,y-.045);shape.lineTo(-zb,y-.045);
    }
    shape.lineTo(-endZ,startY-4.32);shape.lineTo(-startZ,startY-.32);shape.closePath();
    const solid=new THREE.ExtrudeGeometry(shape,{depth:x1-x0-.04,steps:1,bevelEnabled:false});
    // End caps also need clearance from the original floor's vertical edge.
    const positions=solid.attributes.position;
    for(let i=0;i<positions.count;i++)positions.setX(i,THREE.MathUtils.clamp(positions.getX(i),-Math.max(startZ,endZ)+.008,-Math.min(startZ,endZ)-.008));
    solid.computeVertexNormals();
    const body=new THREE.Mesh(solid,stairStone);
    body.rotation.y=Math.PI/2;body.position.x=x0+.02;
    body.name='basement-solid-stair-flight';body.castShadow=true;body.receiveShadow=true;planes.push(body);
  }
  function tread(x0,x1,z0,z1,y,landing=false) {
    // The last step joins the basement floor at -8: the floor owns that face.
    if(y>-8+.001)B.box((x0+x1)/2,y-.045,(z0+z1)/2,x1-x0-.12,.045,z1-z0-.006,wood);
    if(landing)B.box((x0+x1)/2,y-.30,(z0+z1)/2,x1-x0-.04,.255,z1-z0-.008,stone);
    treads.push({x0,x1,z0,z1,y,box:new THREE.Box3(new THREE.Vector3(x0,y-.12,z0),new THREE.Vector3(x1,y,z1))});
  }
  flight(-24,-22,14,8,0);flight(-22,-20,8,14,-4);
  for(let i=0;i<24;i++) {
    const z=14-(i+.5)*.25,y=-(i+1)/6;tread(-24,-22,z-.125,z+.125,y);points.push({x:-23,y,z});
    if(i%3===0)B.box(-23,y+.035,z+.129,1.38,.025,.012,glow);
  }
  tread(-24,-20,6,8,-4,true);points.push({x:-23,y:-4,z:7},{x:-21,y:-4,z:7});
  for(let i=0;i<24;i++) {
    const z=8+(i+.5)*.25,y=-4-(i+1)/6;tread(-22,-20,z-.125,z+.125,y);points.push({x:-21,y,z});
    if(i%3===0)B.box(-21,y+.035,z-.129,1.38,.025,.012,glow);
  }
  points.push(exit);
  // Proper newel feet, slender balusters and warm timber handrails.
  const postKeys=new Set();
  function post(x,y,z) {
    const key=[x,y,z].map(n=>n.toFixed(3)).join(',');if(postKeys.has(key))return;postKeys.add(key);
    B.box(x,y,z,.11,.055,.11,metal);
    B.box(x,y+.055,z,.045,.94,.045,metal);
    B.box(x,y+.93,z,.085,.08,.085,wood);
  }
  function rail(x0,y0,z0,x1,y1,z1) {
    const dx=x1-x0,dz=z1-z0,dy=y1-y0,length=Math.hypot(dx,dy,dz),run=Math.hypot(dx,dz);
    const rotation={rx:-Math.atan2(dy,run),ry:Math.atan2(dx,dz),order:'YXZ'};
    B.box((x0+x1)/2,(y0+y1)/2+.985,(z0+z1)/2,.09,.065,length,wood,rotation);
    B.box((x0+x1)/2,(y0+y1)/2+.45,(z0+z1)/2,.035,.035,length,metal,rotation);
    const n=Math.ceil(run/.75);for(let i=0;i<=n;i++)post(x0+dx*i/n,y0+dy*i/n,z0+dz*i/n);
  }
  for(const x of [-24,-20]) {
    rail(x,0,6,x,0,14);
    obstacles.push({x0:x-.12,x1:x+.12,z0:6,z1:14,level:0});
  }
  rail(-24,0,6,-20,0,6);
  obstacles.push({x0:-24,x1:-20,z0:5.9,z1:6.1,level:0});
  // Offset the two central rails: the old flights duplicated the turn's posts.
  for(const x of [-23.90,-22.10])rail(x,-4,8,x,0,14);
  for(const x of [-21.90,-20.10])rail(x,-4,8,x,-8,14);
  rail(-23.90,-4,8,-23.90,-4,6.12);
  rail(-23.90,-4,6.12,-20.10,-4,6.12);
  rail(-20.10,-4,6.12,-20.10,-4,8);
  // Two slim piers visibly support the turn without narrowing its clear route.
  for(const x of [-23.78,-20.22]) {
    B.box(x,-8,6.24,.18,3.7,.18,metal);
    barriers.push({x0:x-.09,x1:x+.09,z0:6.15,z1:6.33,y0:-8,y1:-4.3});
  }
  // Keep people inside the stairwell while it is above the basement ceiling.
  barriers.push({x0:-24.1,x1:-23.94,z0:6,z1:14,y0:-6,y1:1.05},
    {x0:-20.06,x1:-19.9,z0:6,z1:14,y0:-6,y1:1.05},
    {x0:-24,x1:-20,z0:5.9,z1:6.08,y0:-4,y1:1.05},
    {x0:-22.08,x1:-21.92,z0:8,z1:14,y0:-8,y1:1});
  // Long, low benches leave all window sightlines and the central floor open.
  for(const [x,z,w,d] of [[-18,-23,9,.7],[20,-23,9,.7],[25,7,.7,8],[-12,12,8,.7]]) {
    B.box(x,-7.65,z,w,.12,d,wood);
    for(const side of [-1,1])B.box(x+(w>d?side*(w/2-.5):0),-8,z+(d>w?side*(d/2-.5):0),.22,.35,.22,metal);
    barriers.push({x0:x-w/2-.1,x1:x+w/2+.1,z0:z-d/2-.1,z1:z+d/2+.1,y0:-8,y1:-7.45});
  }
  for(const [x,z] of [[-20,-20],[23,-20],[-20,10],[23,10],[2,-6]])
    lighting.push({id:'basement-lamp',position:[x,-2.3,z],power:1.2,radius:12,direction:[0,-1,0]});
  function levels(x,z,out) {
    if(inside(r,x,z))out.push({y:r.y,site:'basement'});
    for(const s of treads)if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)out.push({y:s.y,site:'basement-stairs',tread:true,route:'basement-stair'});
  }
  function obstructed(x,z,y) {
    if(inside(r,x,z)&&!inside(hole,x,z)&&y<-2&&y+1.8>-2.12)return true;
    if(y<-1.9&&y>-8.4&&inside(r,x,z,-.3)&&!inside(r,x,z,.13))return true;
    return barriers.some(b=>x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&y<b.y1&&y+1.8>b.y0);
  }
  const onStairs=(x,z,y)=>inside(hole,x,z,-.05)&&y>-7.8;
  function floorRoute(ax,az,bx,bz) {
    const valid=(x,z)=>inside(r,x,z,.4)&&!inside(hole,x,z,-.35)&&
      [[0,0],[.32,0],[-.32,0],[0,.32],[0,-.32]].every(([dx,dz])=>!obstructed(x+dx,z+dz,-8));
    const clear=(x,z,tx,tz)=>{const n=Math.ceil(Math.hypot(tx-x,tz-z)*4);for(let i=0;i<=n;i++)if(!valid(x+(tx-x)*i/(n||1),z+(tz-z)*i/(n||1)))return false;return true;};
    if(clear(ax,az,bx,bz))return [{x:bx,y:-8,z:bz}];
    const nx=54,nz=43,pos=k=>({x:-24.5+k%nx,y:-8,z:-26.5+Math.floor(k/nx)});
    const nearest=(x,z)=>{let best=-1,d=Infinity;for(let k=0;k<nx*nz;k++){const p=pos(k),q=(p.x-x)**2+(p.z-z)**2;if(q<d&&valid(p.x,p.z)&&clear(x,z,p.x,p.z)){best=k;d=q;}}return best;};
    const start=nearest(ax,az),end=nearest(bx,bz);if(start<0||end<0)return [];
    const parents=new Int32Array(nx*nz).fill(-2),queue=[start];parents[start]=-1;
    for(let i=0;i<queue.length&&parents[end]===-2;i++)for(const n of [queue[i]-1,queue[i]+1,queue[i]-nx,queue[i]+nx]) {
      const k=queue[i];if(n<0||n>=nx*nz||Math.abs(n%nx-k%nx)>1||parents[n]!==-2)continue;
      const p=pos(n),a=pos(k);if(valid(p.x,p.z)&&clear(a.x,a.z,p.x,p.z)){parents[n]=k;queue.push(n);}
    }
    if(parents[end]===-2)return [];
    const path=[];for(let k=end;k!==-1;k=parents[k])path.unshift(pos(k));
    path.push({x:bx,y:-8,z:bz});
    const out=[];let x=ax,z=az,index=0;
    while(index<path.length){let j=path.length-1;while(j>index&&!clear(x,z,path[j].x,path[j].z))j--;out.push(path[j]);x=path[j].x;z=path[j].z;index=j+1;}
    return out;
  }
  function route(ax,ay,az,bx,by,bz) {
    const nearest=(x,y,z)=>{let best=0,d=Infinity;points.forEach((p,i)=>{const q=(p.x-x)**2+(p.z-z)**2+4*(p.y-y)**2;if(q<d){best=i;d=q;}});return best;};
    const from=ay>-.05?0:onStairs(ax,az,ay)?nearest(ax,ay,az):points.length-1;
    const to=by>-.05?0:onStairs(bx,bz,by)?nearest(bx,by,bz):points.length-1;
    if(from===points.length-1&&to===from)return floorRoute(ax,az,bx,bz);
    const path=from===to?[]:points.slice(Math.min(from,to),Math.max(from,to)+1);
    if(from>to)path.reverse();
    const result=path.map(p=>({...p,route:'basement-stair'}));
    // Clear the lower stair mouth before crossing the room. A diagonal from
    // the landing would otherwise step back onto the neighbouring flight.
    const approach={x:-18.8,y:-8,z:15};
    if(from===points.length-1&&to!==from)result.unshift(...floorRoute(ax,az,approach.x,approach.z));
    if(to===points.length-1&&from!==to)result.push(approach);
    if(to===points.length-1)result.push(...floorRoute(approach.x,approach.z,bx,bz));
    else if(by<-.05)result.push({x:bx,y:by,z:bz});
    return result;
  }
  return {foot,exit,glazing,points,room:r,route,levels,obstructed,
    dryContains(x,y,z){return inside(r,x,z)&&y>=-8.4&&y<2;},
    collides(x,y,z){return obstructed(x,z,y)||inside(r,x,z)&&y<-8&&y+1.8>-8.3;},
    pick(ray){
      if(ray.direction.y>=0)return null;
      let best=null;
      const t=(-8-ray.origin.y)/ray.direction.y;
      if(t>=0){ray.at(t,hit);if(inside(r,hit.x,hit.z))best={t,point:hit.clone(),site:'basement'};}
      for(const s of treads)if(ray.intersectBox(s.box,hit)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:new THREE.Vector3(hit.x,s.y,hit.z),site:'basement-stairs'};}
      return best;
    },
    installView(stage,player,coast){
      // Reuse the sea shader's world coordinates and preserve the tunnel mask.
      const m=coast.sea.material,compile=m.onBeforeCompile,key=m.customProgramCacheKey();
      m.onBeforeCompile=function(shader,renderer){compile.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vOceanXZ.x>-24.&&vOceanXZ.x<-20.&&vOceanXZ.y>6.&&vOceanXZ.y<14.)discard;');};
      m.customProgramCacheKey=()=>key+'-basement';m.needsUpdate=true;
      const scene=stage.scene,before=scene.onBeforeRender,after=scene.onAfterRender,water=new THREE.Color(0x285d6a),fog=new THREE.Color();
      const state={};let saved=null;
      scene.onBeforeRender=function(renderer,current,camera){before?.call(this,renderer,current,camera);
        if(camera!==stage.camera||!inside(r,player.pos.x,player.pos.z)||player.y> -2||camera.position.y> -1)return;
        saved=state;saved.background=scene.background;saved.near=scene.fog.near;saved.far=scene.fog.far;saved.sky=stage.sky.visible;saved.hemi=stage.hemi.intensity;fog.copy(scene.fog.color);
        scene.background=water;scene.fog.color.copy(water);scene.fog.near=22;scene.fog.far=100;stage.sky.visible=false;stage.hemi.intensity=Math.max(stage.hemi.intensity,1.1);
      };
      scene.onAfterRender=function(renderer,current,camera){if(saved&&camera===stage.camera){scene.background=saved.background;scene.fog.color.copy(fog);scene.fog.near=saved.near;scene.fog.far=saved.far;stage.sky.visible=saved.sky;stage.hemi.intensity=saved.hemi;saved=null;}after?.call(this,renderer,current,camera);};
    },
  };
}
