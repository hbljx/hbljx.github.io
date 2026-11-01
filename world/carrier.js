import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { ISLAND } from './layout.js';

const HOME={x:64,z:8,heading:0},DECK=3.4;
const STERN=-32,BOW=33,TURN_RADIUS=36,PORT_CLEARANCE=40;
const sections=[[STERN,5.9],[-27,7.6],[22,7.6],[29,6.3],[BOW,4.8]];
const deckY=()=>DECK;
function widthAt(z){
  if(z<sections[0][0]||z>sections.at(-1)[0])return 0;
  for(let i=1;i<sections.length;i++){const a=sections[i-1],b=sections[i];if(z<=b[0])return a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0]);}
  return 0;
}
const cabinWalls=[
  {x0:2.4,x1:2.62,z0:-3.5,z1:-2.4},{x0:2.4,x1:2.62,z0:.4,z1:8.4},
  {x0:6.68,x1:6.9,z0:-3.5,z1:8.4},{x0:2.4,x1:6.9,z0:-3.5,z1:-3.28},{x0:2.4,x1:6.9,z0:8.18,z1:8.4},
];
const obstacles=[...cabinWalls,{x0:3.05,x1:6.25,z0:6.3,z1:7.1},...[-12,-6].map(z=>({x0:-6.5,x1:-3.3,z0:z-2,z1:z+2})),...[7,12,16].map(z=>({x0:-6.1,x1:-4.3,z0:z-1.3,z1:z+1.3}))];
const onDeck=(x,z,pad=0)=>z>=STERN+pad&&z<=BOW-pad&&Math.abs(x)<=widthAt(z)-pad;
const inCabin=(x,z)=>x>2.62&&x<6.68&&z>-3.28&&z<8.18;
const turnAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

// Flat flight deck and starboard island follow the supplied three-view silhouette.
function carrierMesh(){
  const positions=[],colors=[],masks=[],shade=new THREE.Color();let cabinMask=0;
  function append(g,hex){const src=g.index?g.toNonIndexed():g;positions.push(...src.attributes.position.array);shade.setHex(hex);for(let i=0;i<src.attributes.position.count;i++){colors.push(shade.r,shade.g,shade.b);masks.push(cabinMask);}if(src!==g)src.dispose();g.dispose();}
  function box(x,y,z,w,h,d,color,rx=0,ry=0){const g=new THREE.BoxGeometry(w,h,d);g.rotateX(rx);g.rotateY(ry);g.translate(x,y,z);append(g,color);}
  function quad(a,b,c,d,color){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));append(g,color);}
  const gray=0x798991,light=0xaebbc1,dark=0x29373f,deck=0x424f55,white=0xe8e9d9,yellow=0xe5bc62;
  const rings=sections.map(([z,w])=>[[-w*.57,-2.8,z],[w*.57,-2.8,z],[w*.82,-1.4,z],[w*.96,deckY(z)-.24,z],[-w*.96,deckY(z)-.24,z],[-w*.82,-1.4,z]]);
  // The bow narrows below the overhanging flight deck, as in the front view.
  for(const i of [0,1,2,5]){rings.at(-1)[i][0]*=.25;rings.at(-1)[i][2]+=.65;}
  for(let i=1;i<rings.length;i++)for(let j=0;j<6;j++){const k=(j+1)%6;quad(rings[i-1][j],rings[i][j],rings[i][k],rings[i-1][k],j===0||j===1||j===5?0x763d3b:gray);}
  // Box-like stern and tapered bow close the stepped hull.
  for(const ring of [rings[0],rings.at(-1)]){const centre=ring.reduce((p,q)=>p.map((v,i)=>v+q[i]/ring.length),[0,0,0]);for(let i=0;i<ring.length;i++)quad(centre,ring[i],ring[(i+1)%ring.length],centre,gray);}
  const deckSections=sections;
  for(let i=1;i<deckSections.length;i++){
    const [za,wa]=deckSections[i-1],[zb,wb]=deckSections[i],ya=deckY(za),yb=deckY(zb);
    quad([-wa,ya,za],[-wb,yb,zb],[wb,yb,zb],[wa,ya,za],deck);
    for(const s of [-1,1])quad([s*wa,ya-.24,za],[s*wa,ya,za],[s*wb,yb,zb],[s*wb,yb-.24,zb],light);
  }
  box(0,DECK-.12,STERN,11.8,.24,.15,light);
  // Runway centre, angled landing lane and edge stripes sit clear of the deck.
  for(let z=STERN+2;z<BOW-2;z+=2.5)box(-1.8,DECK+.022,z,.15,.025,1.25,white);
  for(const x of [-3.8,.2])for(let z=STERN+2;z<BOW-2;z+=1)box(x,DECK+.018,z,.09,.025,1.01,yellow);
  for(const side of [-1,1])for(let z=-18;z<11;z+=.9){const x=-1+(z+18)*.105+side*2.15;if(x>2.3&&x<7&&z>-4&&z<9)continue;box(x,DECK+.027,z,.12,.025,.92,white,0,-.105);}
  for(const z of [-16,14,24]){box(5.8,DECK+.018,z,2.3,.02,3.7,0x606d72);for(const x of [4.65,6.95])box(x,DECK+.035,z,.06,.02,3.7,yellow);}
  for(const side of [-1,1])for(let z=STERN+3;z<BOW-3;z+=2.8){box(side*(widthAt(z)*.9),1.45,z,.04,.8,1.6,0x36464e);box(side*(widthAt(z)*.91),1.96,z,.18,.12,2,light);}
  for(let z=-18;z<7;z+=1.1)box(-1.5+(z+18)*.13,DECK+.021,z,.1,.025,1.13,white,0,-.13);
  for(const z of [-28.5,-27.5,-26.5])box(-1.8,DECK+.025,z,6.5,.025,.09,light);
  for(const z of [-19,-15,-11,10])for(const s of [-1,1])box(s*(widthAt(z)-.2),deckY(z)+.08,z,.17,.16,.45,yellow);
  // An open port-side doorway leads into the island's actual wheelhouse.
  // Low panels and furniture stay visible when the outer shell cuts away.
  for(const wall of cabinWalls){const x=(wall.x0+wall.x1)/2,z=(wall.z0+wall.z1)/2,w=wall.x1-wall.x0,d=wall.z1-wall.z0;
    box(x,DECK+.38,z,w,.76,d,gray);cabinMask=1;
    box(x,6.16,z,w,.18,d,light);cabinMask=2;box(x,5.1,z,w*.8,1.6,d*.8,0x416678);cabinMask=0;
  }
  for(const z of [-2.4,.4])box(2.51,4.8,z,.26,2.8,.15,light);
  box(2.51,6.16,-1,.26,.18,2.8,light);
  // Door frame, handrail and floor arrow make the entrance readable from deck.
  box(1.55,DECK+.027,-1,1.1,.025,.13,yellow);box(2,DECK+.027,-1,.18,.025,.55,yellow);
  box(4.65,DECK+.015,2.45,3.95,.025,11.3,0x677d83);
  box(4.65,3.95,6.7,3.2,1.1,.8,dark);box(4.65,4.53,6.7,3.3,.1,.9,gray);
  for(const x of [3.65,4.65,5.65]){box(x,4.91,6.92,.78,.52,.12,dark);box(x,4.91,6.845,.65,.4,.025,0x76b7a3);}
  box(4.65,4.65,6.08,.68,.08,.08,light);box(4.65,4.65,6.08,.08,.6,.08,light);
  for(const x of [3.4,5.9])box(x,4.61,6.35,.16,.12,.16,0xe2b863);
  cabinMask=1;
  box(4.65,6.34,2.45,4.5,.2,12,light);box(4.65,6.95,1.9,3.8,1.1,8.6,light);
  box(4.65,7.7,1.3,3.1,1,5.4,gray);box(4.65,8.27,1.3,3.5,.14,5.8,light);
  for(const x of [2.72,6.58])for(let z=-1.6;z<5.7;z+=1.25)box(x,6.7,z,.045,.55,.95,0x254b60);
  for(const x of [3.35,4.65,5.95])box(x,6.7,6.22,.95,.55,.045,0x254b60);
  box(4.6,6.3,7.2,4.2,.2,2.2,gray);
  for(const x of [2.55,6.65])box(x,6.85,7.3,.08,1.1,2.15,light);
  box(4.6,6.85,8.22,4.2,.08,.08,light);box(4.6,6.75,7.95,.7,.45,.4,dark);box(4.6,7.02,7.94,.55,.04,.28,0x548e83);
  box(4.7,9.35,.2,.22,2.3,.22,light);box(4.7,10.4,.2,2.8,.8,.16,dark);
  box(4.7,11.25,.2,.12,1.4,.12,light);box(4.7,11.1,.2,2.3,.08,.16,light);box(4.7,11.86,.2,.8,.35,.7,light);
  for(const x of [3.5,4.7,5.9])box(x,10.4,.1,.07,.8,.07,light);
  box(5.1,8.9,-1.5,1.3,1.2,1.5,dark);box(5.1,9.55,-1.5,1.6,.15,1.8,gray);
  box(6.15,9.7,4.6,.08,3,.08,light);box(6.95,10.7,4.6,1.55,1.02,.045,0xc92f35);
  const star=['00100','11111','01110','11011','10001'];
  for(let r=0;r<5;r++)for(let c=0;c<5;c++)if(star[r][c]==='1')box(6.4+c*.07,10.98-r*.07,4.63,.073,.073,.025,0xffdd62);
  for(const [x,y]of [[6.92,11.07],[7.08,10.91],[7.08,10.7],[6.92,10.56]])box(x,y,4.63,.07,.07,.025,0xffdd62,0,Math.PI/4);
  cabinMask=0;
  const glyphs={'0':['111','101','101','101','111'],'1':['010','110','010','010','111']};
  [...'001'].forEach((n,k)=>glyphs[n].forEach((row,r)=>[...row].forEach((v,c)=>{if(v==='1'){
    const z=29.8-r*.34;box(.7+(k*4+c)*.34,DECK+.033,z,.29,.035,.29,white);
    cabinMask=2;box(6.915,5.45-r*.17,-1.5+(k*4+c)*.17,.035,.145,.145,white);cabinMask=0;
  }})));
  // Two folded-wing deck aircraft, built into the same draw call.
  for(const z of [-12,-6]){
    box(-4.9,3.9,z,.55,.65,3.5,light);box(-4.9,3.88,z+1.95,.3,.35,.5,light);
    box(-4.9,3.94,z-.15,2.9,.12,.9,gray);box(-4.9,4.3,z+.65,.38,.3,.75,0x294a5b);
    for(const x of [-6.15,-3.65])box(x,4.5,z-.4,.12,1.15,.8,gray);
    box(-4.9,4.5,z-1.4,.12,1.1,.7,gray);box(-4.9,3.87,z-1.3,1.6,.12,.5,light);
    for(const x of [-5.2,-4.6])box(x,3.52,z-.6,.16,.24,.25,dark);
  }
  // Additional parked aircraft give the long deck the reference's populated edge.
  for(const z of [7,12,16]){box(-5.2,3.72,z,.4,.3,2.4,light);box(-5.2,3.78,z-.2,1.7,.08,.65,gray);box(-5.2,4.04,z+.4,.25,.22,.48,0x294a5b);box(-5.2,4.1,z-.9,.08,.65,.4,light);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('cabinMask',new THREE.Float32BufferAttribute(masks,1));geo.computeVertexNormals();geo.computeBoundingSphere();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const cabinView={value:0},insideView={value:0};
  material.onBeforeCompile=shader=>{shader.uniforms.uCabinView=cabinView;shader.uniforms.uInsideView=insideView;
    shader.vertexShader='attribute float cabinMask; varying float vCabinMask;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCabinMask = cabinMask;');
    shader.fragmentShader='uniform float uCabinView; uniform float uInsideView; varying float vCabinMask;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','if ((vCabinMask > 0.5 && vCabinMask < 1.5 && uCabinView > 0.5) || (vCabinMask > 1.5 && uInsideView > 0.5)) discard;\n#include <opaque_fragment>');
  };
  const mesh=new THREE.Mesh(geo,material);mesh.userData.cabinView=cabinView;mesh.userData.insideView=insideView;mesh.name='carrier-001';mesh.position.set(HOME.x,0,HOME.z);mesh.receiveShadow=true;return mesh;
}

export function buildCarrier(layer,staticBatch){
  const mesh=carrierMesh(),B=new BoxBatch(layer),steel={tex:'steel',tint:0x89989c},floor={tex:'wood_floor'};
  let planeObstacle=()=>false;
  const slabs=[],path=[{x:35,y:0,z:8}],foot={x:35,y:0,z:8},local=new THREE.Vector3(),hit=new THREE.Vector3();
  function slab(x0,x1,y,drawEnd=x1){B.box((x0+drawEnd)/2,y-.18,8,drawEnd-x0,.18,2.8,floor);slabs.push({x0,x1,z0:6.6,z1:9.4,y,box:new THREE.Box3(new THREE.Vector3(x0,y-.18,6.6),new THREE.Vector3(x1,y,9.4))});}
  slab(35,41,.2);path.push({x:40.5,y:.2,z:8});
  for(let i=0;i<16;i++){const x=41+i*.9,y=.4+i*.2;slab(x,x+.9,y);path.push({x:x+.45,y,z:8});}
  slab(55.4,57.2,DECK,56.4);path.push({x:56.8,y:DECK,z:8});
  for(let x=36;x<=56;x+=2)for(const z of [6.65,9.35]){const y=x<41?.2:Math.min(DECK,.4+Math.floor((x-41)/.9)*.2);B.box(x,-2.3,z,.14,y+3.3,.14,steel);}
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y;for(const z of [6.65,9.35])B.box((a.x+b.x)/2,(a.y+b.y)/2+.94,z,Math.hypot(dx,dy),.075,.075,steel,{rz:Math.atan2(dy,dx)});}
  for(const z of [6.6,9.4]){B.box(35.5,.2,z,.12,2.6,.12,steel);B.box(35.5,2.8,z,.35,.25,.35,{tex:'paint',tint:0xe4cb86});}
  // Static pier pieces share the furniture batch; the entire moving ship is one draw.
  for(const kind of Object.keys(B.items))staticBatch.items[kind].push(...B.items[kind]);
  function toLocal(x,z){const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);return{x:dx*c-dz*s,z:dx*s+dz*c};}
  function toWorld(x,z,y=deckY(z)){const c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);return{x:mesh.position.x+x*c+z*s,y,z:mesh.position.z-x*s+z*c};}
  const helm=()=>toWorld(4.65,5.1);
  const airfield={id:'carrier',name:'航母停机区',get x(){return toWorld(-1.8,-22).x;},get z(){return toWorld(-1.8,-22).z;},y:DECK,get heading(){return mesh.rotation.y;},get exit(){return toWorld(2.6,-22);}};
  function clearDeck(x,z){
    if(!onDeck(x,z,.4)||obstacles.some(o=>x>o.x0-.4&&x<o.x1+.4&&z>o.z0-.4&&z<o.z1+.4))return false;
    const p=toWorld(x,z);if(planeObstacle(p.x,p.z,DECK))return false;
    for(let a=0;a<8;a++)if(planeObstacle(p.x+Math.cos(a*Math.PI/4)*.4,p.z+Math.sin(a*Math.PI/4)*.4,DECK))return false;
    return true;
  }
  const docked=()=>Math.hypot(mesh.position.x-HOME.x,mesh.position.z-HOME.z)<.05&&Math.abs(turnAngle(mesh.rotation.y))<.005;
  function deckRoute(ax,az,bx,bz){
    const nx=31,nz=(BOW-STERN)*2-1,pos=k=>({x:-7.5+(k%nx)*.5,z:STERN+.5+Math.floor(k/nx)*.5});
    function nearest(x,z){let best=-1,d=Infinity;for(let k=0;k<nx*nz;k++){const p=pos(k),q=(p.x-x)**2+(p.z-z)**2;if(q<d&&clearDeck(p.x,p.z)){d=q;best=k;}}return best;}
    const start=nearest(ax,az),end=nearest(bx,bz),parents=new Int32Array(nx*nz).fill(-2),queue=[start];parents[start]=-1;
    for(let i=0;i<queue.length&&parents[end]===-2;i++){const k=queue[i];for(const n of [k-1,k+1,k-nx,k+nx]){if(n<0||n>=nx*nz||Math.abs(n%nx-k%nx)>1||parents[n]!==-2)continue;const p=pos(n);if(clearDeck(p.x,p.z)){parents[n]=k;queue.push(n);}}}
    if(parents[end]===-2)return[];const points=[];for(let k=end;k!==-1;k=parents[k])points.unshift(pos(k));if(clearDeck(bx,bz))points.push({x:bx,z:bz});return points.map(p=>toWorld(p.x,p.z));
  }
  function route(ax,ay,az,bx,by,bz){
    const a=toLocal(ax,az),b=toLocal(bx,bz),fromDeck=ay>=DECK-.1&&onDeck(a.x,a.z),toDeck=by>=DECK-.1&&onDeck(b.x,b.z);
    if(fromDeck&&toDeck)return deckRoute(a.x,a.z,b.x,b.z);
    if(!docked())return[];
    const nearest=x=>path.reduce((best,p,i)=>Math.abs(p.x-x)<Math.abs(path[best].x-x)?i:best,0);
    const ai=fromDeck?path.length-1:nearest(ax),bi=toDeck?path.length-1:nearest(bx),points=path.slice(Math.min(ai,bi),Math.max(ai,bi)+1);if(ai>bi)points.reverse();
    if(fromDeck)points.unshift(...deckRoute(a.x,a.z,-7.1,0));
    if(toDeck)points.push(...deckRoute(-7.1,0,b.x,b.z));else points.push({x:bx,y:by,z:bz});return points;
  }
  return{
    mesh,foot,home:HOME,toLocal,toWorld,route,docked,helm,airfield,
    setPlaneObstacle(fn){planeObstacle=fn;},
    canBoard(player){const p=toLocal(player.pos.x,player.pos.z);return Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z)&&Math.hypot(p.x-4.65,p.z-5.1)<1.6;},
    insideCabin(player){const p=toLocal(player.pos.x,player.pos.z);return Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z);},
    updateCabin(player,camera){const p=toLocal(player.pos.x,player.pos.z),c=toLocal(camera.position.x,camera.position.z),inside=Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z);
      mesh.userData.insideView.value=inside?1:0;mesh.userData.cabinView.value=inside&&(!inCabin(c.x,c.z)||camera.position.y>6.25)?1:0;
    },
    levels(x,z,out){for(const s of slabs)if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)out.push({y:s.y,site:'carrier',tread:true});const p=toLocal(x,z);if(onDeck(p.x,p.z))out.push({y:deckY(p.z),site:'carrier'});},
    obstructed(x,z,y){const p=toLocal(x,z);return planeObstacle(x,z,y)||y>=DECK-.1&&y<6.3&&obstacles.some(o=>p.x>o.x0-.05&&p.x<o.x1+.05&&p.z>o.z0-.05&&p.z<o.z1+.05)||y>=6.3&&y<8.4&&p.x>2.4&&p.x<6.9&&p.z>-3.4&&p.z<8.4;},
    collides(x,y,z){const p=toLocal(x,z);return onDeck(p.x,p.z)&&y<deckY(p.z)-.02&&y+1.8>-2.8||this.obstructed(x,z,y);},
    pick(ray){
      let best=null;for(const s of slabs)if(ray.intersectBox(s.box,hit)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:new THREE.Vector3(hit.x,s.y,hit.z),site:'carrier'};}
      const o=toLocal(ray.origin.x,ray.origin.z),c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y),dz=ray.direction.x*s+ray.direction.z*c,dx=ray.direction.x*c-ray.direction.z*s;
      if(ray.direction.y<0){const t=(DECK-ray.origin.y)/ray.direction.y,z=o.z+dz*t,x=o.x+dx*t;if(t>=0&&onDeck(x,z)&&(!best||t<best.t))best={t,point:ray.at(t,local).clone(),site:'carrier'};}
      return best;
    },
    spots:()=>[helm(),toWorld(0,-22)],
  };
}

// Slow, inertial steering checks the whole hull against land, piers and the map edge.
export function createCruise({world,player}){
  const carrier=world.carrier,mesh=carrier.mesh;let speed=0,distance=0,route=null,message='已靠港',active=false,stalled=0;
  const samples=[];for(let z=STERN;z<=BOW;z+=1)for(const f of [-1,-.5,0,.5,1])samples.push([f*(widthAt(z)*.88+.25),z]);
  function water(x,z){return !(x>ISLAND.x0-1&&x<ISLAND.x1+1&&z>ISLAND.z0-1&&z<ISLAND.z1+1)&&!(x>-48.5&&x<-31&&z>-.9&&z<7.1)&&!(world.mountain.heightAt(x,z)>-1.6);}
  function canSail(x,z,yaw){
    if(Math.abs(x)>145||z< -145||z>125)return false;const c=Math.cos(yaw),s=Math.sin(yaw);
    for(const [lx,lz]of samples){const px=x+lx*c+lz*s,pz=z-lx*s+lz*c;
      if(!water(px,pz)||px>35&&px<56.45&&pz>6.4&&pz<9.6)return false;
    }return true;
  }
  const anchor=()=>{const p=carrier.helm();player.anchor(p.x,p.y,p.z,mesh.rotation.y);};
  function planReturn(){
    if(carrier.docked()){route=null;speed=0;message='已靠港';return true;}
    const step=8,nx=37,nz=34,pos=k=>({x:-144+(k%nx)*step,z:-144+Math.floor(k/nx)*step});
    const valid=new Int8Array(nx*nz);
    const open=k=>{if(valid[k])return valid[k]===1;const p=pos(k);let ok=water(p.x,p.z);for(let a=0;a<24&&ok;a++)ok=water(p.x+Math.cos(a*Math.PI/12)*TURN_RADIUS,p.z+Math.sin(a*Math.PI/12)*TURN_RADIUS);valid[k]=ok?1:-1;return ok;};
    function nearest(x,z){let best=-1,d=Infinity;for(let k=0;k<nx*nz;k++){const p=pos(k),q=(p.x-x)**2+(p.z-z)**2;if(q<d&&open(k)){d=q;best=k;}}return best;}
    // Leave the boarding pier parallel to shore before turning a long hull.
    const departure=Math.abs(mesh.position.x-HOME.x)<20&&Math.abs(mesh.position.z-HOME.z)<PORT_CLEARANCE
      ? {x:mesh.position.x,z:Math.cos(mesh.rotation.y)>=0?68:-120} : null;
    const start=nearest(departure?.x??mesh.position.x,departure?.z??mesh.position.z),end=nearest(HOME.x,-120),parents=new Int32Array(nx*nz).fill(-2),queue=[start];parents[start]=-1;
    for(let i=0;i<queue.length&&parents[end]===-2;i++){const k=queue[i];for(const n of [k-1,k+1,k-nx,k+nx]){if(n<0||n>=nx*nz||Math.abs(n%nx-k%nx)>1||parents[n]!==-2||!open(n))continue;parents[n]=k;queue.push(n);}}
    if(parents[end]===-2){message='暂时无法规划返港航线，请驶向开阔海面';return false;}
    const points=[];for(let k=end;k!==-1;k=parents[k])points.unshift(pos(k));
    route=points.filter((p,i)=>!i||i===points.length-1||(p.x-points[i-1].x)!==(points[i+1].x-p.x)||(p.z-points[i-1].z)!==(points[i+1].z-p.z));if(departure)route.unshift(departure);route.push({x:64,z:-120},{...HOME});message='自动返港中';speed=0;stalled=0;return true;
  }
  function update(dt,keys){
    if(!active)return;dt=Math.min(dt,.05);
    const forward=keys.has('w')||keys.has('arrowup'),back=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),brake=keys.has(' ');
    if(forward||back||left||right||brake){route=null;message='海上巡航';}
    let target=brake?0:forward?8:back?-3:0,turn=Number(left)-Number(right),yaw=mesh.rotation.y;
    if(route){
      while(route.length&&Math.hypot(route[0].x-mesh.position.x,route[0].z-mesh.position.z)<.18)route.shift();
      if(!route.length){mesh.position.set(HOME.x,0,HOME.z);mesh.rotation.y=0;route=null;speed=0;message='已靠港';anchor();return;}
      const p=route[0],dx=p.x-mesh.position.x,dz=p.z-mesh.position.z,d=Math.hypot(dx,dz),angle=turnAngle(Math.atan2(dx,dz)-yaw);turn=Math.max(-1,Math.min(1,angle*3));target=Math.abs(angle)>.04?0:Math.min(7,d*1.2);if(Math.abs(angle)>.04)speed=0;
    }
    // The long hull cannot turn alongside the boarding pier. Keep a straight
    // departure channel, also recovering ships already wedged by a small turn.
    if(!route&&Math.abs(mesh.position.x-HOME.x)<.5&&Math.abs(mesh.position.z-HOME.z)<PORT_CLEARANCE&&Math.abs(turnAngle(yaw))<.7){
      const angle=turnAngle(-yaw);turn=Math.max(-1,Math.min(1,angle*6));
      if(Math.abs(angle)>.005)target=0;else{yaw=0;turn=0;}
      if(left||right||Math.abs(angle)>.005)message=forward||back?'正在直线离港，驶离码头后可转向':'先按 W/S 驶离码头，再转向';
    }
    speed+=Math.max(-(brake?7:2)*dt,Math.min((brake?7:2)*dt,target-speed));
    const nextYaw=yaw+turn*.32*dt*(speed<-.1?-1:1);if(turn&&canSail(mesh.position.x,mesh.position.z,nextYaw))yaw=nextYaw;
    const travel=speed*dt,x=mesh.position.x+Math.sin(yaw)*travel,z=mesh.position.z+Math.cos(yaw)*travel;
    if(!travel||canSail(x,z,yaw)){
      stalled=route&&Math.abs(travel)+Math.abs(yaw-mesh.rotation.y)<1e-7?stalled+dt:0;
      mesh.rotation.y=yaw;mesh.position.set(x,0,z);distance+=Math.abs(travel);
      if(stalled>4){route=null;message='转向空间不足，请先驶向开阔海面再返港';}
    }
    else{speed=0;route=null;message='已减速停船，请避开岸线或码头';}
    mesh.updateMatrixWorld(true);anchor();
  }
  return{
    start(){active=true;speed=0;route=null;message=carrier.docked()?'已靠港，准备启航':'已接管航母';anchor();},
    stop(){active=false;route=null;speed=0;return{...carrier.helm(),heading:mesh.rotation.y};},
    pause(){speed=0;},returnHome:planReturn,update,canSail,
    status:()=>({x:mesh.position.x,z:mesh.position.z,heading:mesh.rotation.y,speed,distance,returning:!!route,docked:carrier.docked(),message}),
  };
}
