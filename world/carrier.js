import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { SEA_BRIDGE, CARRIER_ACCESS, CARRIER_HOME } from './layout.js';
import { bridgeHeight } from './sea-bridge.js';
import { createDeckCrew } from './carrier-crew.js';
import { createCarrierWeapons } from './carrier-weapons.js';
import { createCarrierWake } from './carrier-wake.js';
import { createSailingArea, SAIL_BOUNDS, CARRIER_PATROL, sampleCarrierPatrol } from './carrier-navigation.js';

const DOCK_Z=CARRIER_ACCESS.z;
const HOME={...CARRIER_HOME,heading:0},DECK=3.4;
const GANGWAY={x0:SEA_BRIDGE.x+SEA_BRIDGE.width/2,x1:HOME.x-7.6,fixedEnd:HOME.x-40,flat:33,rampEnd:52,z:DOCK_Z,width:CARRIER_ACCESS.width};
const gangwayHeight=x=>bridgeHeight(DOCK_Z)+(DECK-bridgeHeight(DOCK_Z))*THREE.MathUtils.clamp((x-GANGWAY.flat)/(GANGWAY.rampEnd-GANGWAY.flat),0,1);
const withinGangway=(x,z,margin=0)=>x>=GANGWAY.x0&&x<=GANGWAY.x1&&Math.abs(z-DOCK_Z)<=GANGWAY.width/2-margin;
const STERN=-32,BOW=33;
// Broaden the forward deck to leave a flat weapon platform beside the ski jump.
const sections=[[STERN,5.9],[-29,9.5],[-21,9.5],[-18,7.6],[22,7.6],[29,8],[BOW,6.8]];
const deckY=()=>DECK;
const RAMP={x0:-4.4,x1:1.9,z0:23,z1:33,height:2.3};
const JET_PAD={x:-2,y:DECK,z:-25.5,heading:0};
const onRamp=(x,z)=>x>=RAMP.x0&&x<=RAMP.x1&&z>=RAMP.z0&&z<=RAMP.z1;
const surfaceY=(x,z)=>DECK+(onRamp(x,z)?(z-RAMP.z0)/(RAMP.z1-RAMP.z0)*RAMP.height:0);
const deckAircraft=[
  {id:'fighter-1',kind:'fighter',x:5.2,z:-15,w:3.7,d:5.8},
  {id:'fighter-2',kind:'fighter',x:5.2,z:-7.5,w:3.7,d:5.8},
  {id:'early-warning',kind:'awacs',x:5.1,z:15,w:4.6,d:6.4},
  {id:'fighter-3',kind:'fighter',x:5.2,z:24,w:3.7,d:5.8},
];
function widthAt(z){
  if(z<sections[0][0]||z>sections.at(-1)[0])return 0;
  for(let i=1;i<sections.length;i++){const a=sections[i-1],b=sections[i];if(z<=b[0])return a[1]+(b[1]-a[1])*(z-a[0])/(b[0]-a[0]);}
  return 0;
}
const cabinWalls=[
  {x0:2.4,x1:2.62,z0:-3.5,z1:-2.4},{x0:2.4,x1:2.62,z0:.4,z1:8.4},
  {x0:6.68,x1:6.9,z0:-3.5,z1:8.4},{x0:2.4,x1:6.9,z0:-3.5,z1:-3.28},{x0:2.4,x1:6.9,z0:8.18,z1:8.4},
];
const obstacles=[...cabinWalls,{x0:3.05,x1:6.25,z0:6.3,z1:7.1}];
const onDeck=(x,z,pad=0)=>z>=STERN+pad&&z<=BOW-pad&&Math.abs(x)<=widthAt(z)-pad;
const inCabin=(x,z)=>x>2.62&&x<6.68&&z>-3.28&&z<8.18;
const turnAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));

// Flat flight deck and starboard island follow the supplied three-view silhouette.
function carrierMesh(){
  const positions=[],colors=[],masks=[],glassVertices=[],shade=new THREE.Color();let cabinMask=0;
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
  box(0,DECK-.12,STERN-.075,11.8,.24,.15,light);
  // A separate bow ramp leaves the aft landing pad and catapult lane flat.
  quad([RAMP.x0,DECK,RAMP.z0],[RAMP.x0,DECK+RAMP.height,RAMP.z1],[RAMP.x1,DECK+RAMP.height,RAMP.z1],[RAMP.x1,DECK,RAMP.z0],deck);
  for(const x of [RAMP.x0,RAMP.x1])quad([x,DECK,RAMP.z0],[x,DECK,RAMP.z1],[x,DECK+RAMP.height,RAMP.z1],[x,DECK,RAMP.z0],gray);
  quad([RAMP.x0,DECK,RAMP.z1],[RAMP.x1,DECK,RAMP.z1],[RAMP.x1,DECK+RAMP.height,RAMP.z1],[RAMP.x0,DECK+RAMP.height,RAMP.z1],gray);
  // Runway centre, angled landing lane and edge stripes sit clear of the deck.
  for(let z=STERN+2;z<RAMP.z0-.7;z+=2.5)box(-1.8,DECK+.022,z,.15,.025,1.25,white);
  for(const x of [-3.8,.2])for(let z=STERN+2;z<RAMP.z0-.6;z+=1)box(x,DECK+.018,z,.09,.025,1.01,yellow);
  const slope=Math.atan2(RAMP.height,RAMP.z1-RAMP.z0);
  for(const x of [-3.8,.2])box(x,DECK+RAMP.height/2+.035,28,.09,.025,Math.hypot(10,RAMP.height),yellow,-slope);
  for(let z=24;z<33;z+=2)box(-1.8,surfaceY(-1.8,z)+.035,z,.15,.025,1.1,white,-slope);
  for(const x of [-2.1,-1.5])box(x,DECK+.055,-5,.08,.05,34,light);
  box(-1.8,DECK+.10,-22,.7,.12,.45,yellow);
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
    box(x,6.16,z,w,.18,d,light);cabinMask=0;
    // One two-sided face per window avoids doubled transparent box surfaces.
    const a=w>d?[wall.x0,4.16,z]:[x,4.16,wall.z0],b=w>d?[wall.x1,4.16,z]:[x,4.16,wall.z1];
    const c=[b[0],6.07,b[2]],e=[a[0],6.07,a[2]];glassVertices.push(...a,...b,...c,...a,...c,...e);
    const count=Math.max(1,Math.ceil(Math.max(w,d)/2.2));
    for(let i=0;i<=count;i++)box(w>d?wall.x0+w*i/count:x,5.12,w>d?z:wall.z0+d*i/count,.07,1.92,.07,light);
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
    const z=-25-r*.28;box(3.2+(k*4+c)*.28,DECK+.033,z,.23,.035,.23,white);
    box(6.915,4.03-r*.12,-1.5+(k*4+c)*.12,.035,.10,.10,white);
  }})));
  box(5.2,DECK+.018,-25.5,8.1,.02,7.3,0x606d72);
  for(const x of [1.15,9.25])box(x,DECK+.045,-25.5,.08,.025,7.3,yellow);
  for(const z of [-29.15,-21.85])box(5.2,DECK+.045,z,8.1,.025,.08,yellow);
  // Flyable deck aircraft share the fleet renderer.
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('cabinMask',new THREE.Float32BufferAttribute(masks,1));geo.computeVertexNormals();geo.computeBoundingSphere();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const cabinView={value:0};
  material.onBeforeCompile=shader=>{shader.uniforms.uCabinView=cabinView;
    shader.vertexShader='attribute float cabinMask; varying float vCabinMask;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCabinMask = cabinMask;');
    shader.fragmentShader='uniform float uCabinView; varying float vCabinMask;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','if (vCabinMask > 0.5 && uCabinView > 0.5) discard;\n#include <opaque_fragment>');
  };
  const mesh=new THREE.Mesh(geo,material);mesh.userData.cabinView=cabinView;mesh.name='carrier-001';mesh.position.set(HOME.x,0,HOME.z);mesh.receiveShadow=true;
  const glassGeometry=new THREE.BufferGeometry();glassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(glassVertices,3));glassGeometry.computeVertexNormals();
  const glassMaterial=new THREE.MeshLambertMaterial({color:0xa8d2df,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
  const glazing=new THREE.Mesh(glassGeometry,glassMaterial);glazing.name='carrier-cabin-glass';glazing.renderOrder=2;mesh.add(glazing);return mesh;
}

export function buildCarrier(layer,staticBatch){
  const mesh=carrierMesh(),B=new BoxBatch(layer),steel={tex:'steel',tint:0x89989c},floor={tex:'travertine',tint:0xc5c3b5};
  const weapons=createCarrierWeapons(mesh);
  const wake=createCarrierWake(mesh);
  let planeObstacle=()=>false;
  const crew=createDeckCrew(mesh,GANGWAY);
  let boardingProgress=1;
  const onGangway=(x,z,margin=0)=>withinGangway(x,z,margin)&&(docked()||x<=GANGWAY.fixedEnd);
  const boardingLink=crew.boardingLink;
  const foot={x:GANGWAY.x0-1,y:bridgeHeight(DOCK_Z),z:DOCK_Z},local=new THREE.Vector3(),hit=new THREE.Vector3();
  const path=[foot,{x:GANGWAY.flat,y:foot.y,z:DOCK_Z},{x:GANGWAY.rampEnd,y:DECK,z:DOCK_Z},{x:HOME.x-7.1,y:DECK,z:DOCK_Z}];
  const spans=[[GANGWAY.x0,GANGWAY.flat],[GANGWAY.flat,GANGWAY.rampEnd],[GANGWAY.rampEnd,GANGWAY.fixedEnd]];
  // A wide, continuous road descends from the bridge to the flight deck.
  // The analytic surface below is also used for walking, driving and picking.
  for(const [a,b] of spans){
    const ya=gangwayHeight(a),yb=gangwayHeight(b),angle=Math.atan2(yb-ya,b-a),t=.24;
    B.box((a+b)/2+t*Math.sin(angle)/2,(ya+yb)/2-t*Math.cos(angle)/2-t/2,DOCK_Z,Math.hypot(b-a,yb-ya),t,GANGWAY.width,floor,{rz:angle});
    const stripeTint={tex:'paint',tint:0xd2b26c};
    for(const side of [-1,1]) B.box((a+b)/2+t*Math.sin(angle)/2,(ya+yb)/2-t*Math.cos(angle)/2+.012,DOCK_Z+side*(GANGWAY.width/2-.34),Math.hypot(b-a,yb-ya),.018,.08,stripeTint,{rz:angle});
    for(const side of [-1,1])for(const up of [.48,1])B.box((a+b)/2,(ya+yb)/2+up-.04,DOCK_Z+side*(GANGWAY.width/2-.08),Math.hypot(b-a,yb-ya),.08,.08,steel,{rz:angle});
  }
  for(let x=GANGWAY.x0+1;x<GANGWAY.fixedEnd-1;x+=2)for(const side of [-1,1]){
    const y=gangwayHeight(x),z=DOCK_Z+side*(GANGWAY.width/2-.08);
    B.box(x,-2.3,z,.14,y+3.38,.14,steel);
    if(x%4===0)B.box(x,y+1.04,z,.22,.12,.22,{tex:'paint',tint:0xffdf9b,emissive:.65});
  }
  // Static pier pieces share the furniture batch; the entire moving ship is one draw.
  for(const kind of Object.keys(B.items))staticBatch.items[kind].push(...B.items[kind]);
  function toLocal(x,z){const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);return{x:dx*c-dz*s,z:dx*s+dz*c};}
  function toWorld(x,z,y=surfaceY(x,z)){const c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);return{x:mesh.position.x+x*c+z*s,y,z:mesh.position.z-x*s+z*c};}
  const helm=()=>toWorld(4.65,5.1);
  const airfield={id:'carrier',name:'航母 · 舰尾侧方机位',get x(){return toWorld(5.2,-25.5).x;},get z(){return toWorld(5.2,-25.5).z;},y:DECK,get heading(){return mesh.rotation.y;},get exit(){return toWorld(1,-25.5);}};
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
    for(let i=0;i<queue.length&&parents[end]===-2;i++){const k=queue[i],a=pos(k);for(const n of [k-1,k+1,k-nx,k+nx]){if(n<0||n>=nx*nz||Math.abs(n%nx-k%nx)>1||parents[n]!==-2)continue;const p=pos(n);if(clearDeck(p.x,p.z)&&Math.abs(surfaceY(a.x,a.z)-surfaceY(p.x,p.z))<.5){parents[n]=k;queue.push(n);}}}
    if(parents[end]===-2)return[];const points=[];for(let k=end;k!==-1;k=parents[k])points.unshift(pos(k));if(clearDeck(bx,bz))points.push({x:bx,z:bz});return points.map(p=>toWorld(p.x,p.z));
  }
  function route(ax,ay,az,bx,by,bz){
    const a=toLocal(ax,az),b=toLocal(bx,bz),fromDeck=ay>=DECK-.1&&onDeck(a.x,a.z),toDeck=by>=DECK-.1&&onDeck(b.x,b.z);
    if(fromDeck&&toDeck)return deckRoute(a.x,a.z,b.x,b.z);
    if(!docked())return[];
    const start=fromDeck?path.at(-1).x:THREE.MathUtils.clamp(ax,foot.x,path.at(-1).x),end=toDeck?path.at(-1).x:THREE.MathUtils.clamp(bx,foot.x,path.at(-1).x);
    const points=path.filter(p=>p.x>Math.min(start,end)&&p.x<Math.max(start,end));if(start>end)points.reverse();
    points.unshift({x:start,y:gangwayHeight(start),z:DOCK_Z});points.push({x:end,y:gangwayHeight(end),z:DOCK_Z});
    if(fromDeck)points.unshift(...deckRoute(a.x,a.z,-7.1,0));
    if(toDeck)points.push(...deckRoute(-7.1,0,b.x,b.z));else points.push({x:bx,y:by,z:bz});return points;
  }
  return{
    mesh,boardingLink,crew,jetPad:JET_PAD,
    update(dt,camera){
      const target=docked()?1:0;
      boardingProgress=dt<=0?target:boardingProgress+Math.sign(target-boardingProgress)*Math.min(Math.abs(target-boardingProgress),dt*1.5);
      crew.setBoardingProgress(boardingProgress);
      weapons.update(dt);wake.update(dt);
      if(!camera||camera.position.distanceToSquared(mesh.position)<240*240)crew.update(dt);
      else crew.syncColliders();
    },
    foot,home:HOME,toLocal,toWorld,route,docked,helm,airfield,deckAircraft,ramp:RAMP,gangway:GANGWAY,
    isDeck(x,z){const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);return onDeck(dx*c-dz*s,dx*s+dz*c);},
    driveHeight(x,z,margin=0){
      if(onGangway(x,z,margin)&& (docked()||x<GANGWAY.x1-margin))return gangwayHeight(x);
      const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y),lx=dx*c-dz*s,lz=dx*s+dz*c;
      // At the berth the ramp replaces the deck-edge safety margin, so a
      // vehicle's front wheels can cross the shared seam before its centre.
      const joining=docked()&&x>=GANGWAY.x1&&x<=GANGWAY.x1+margin&&Math.abs(z-DOCK_Z)<=GANGWAY.width/2-margin;
      if(!(onDeck(lx,lz,margin)||joining&&onDeck(lx,lz))||planeObstacle(x,z,surfaceY(lx,lz)))return null;
      return surfaceY(lx,lz);
    },
    driveSlope(x,z,heading){
      if(onGangway(x,z))return x>GANGWAY.flat&&x<GANGWAY.rampEnd?(DECK-bridgeHeight(DOCK_Z))/(GANGWAY.rampEnd-GANGWAY.flat)*Math.sin(heading):0;
      const p=toLocal(x,z);return onRamp(p.x,p.z)?RAMP.height/(RAMP.z1-RAMP.z0)*Math.cos(heading-mesh.rotation.y):0;
    },
    blocksVehicle(x,z,heading,length,width){
      const p=toLocal(x,z),angle=heading-mesh.rotation.y,c=Math.sin(angle),s=Math.cos(angle),ac=Math.abs(c),as=Math.abs(s);
      for(const o of obstacles){
        const dx=(o.x0+o.x1)/2-p.x,dz=(o.z0+o.z1)/2-p.z,w=(o.x1-o.x0)/2+.05,d=(o.z1-o.z0)/2+.05;
        if(Math.abs(dx)>length*ac+width*as+w||Math.abs(dz)>length*as+width*ac+d)continue;
        if(Math.abs(dx*c+dz*s)>length+w*ac+d*as||Math.abs(-dx*s+dz*c)>width+w*as+d*ac)continue;
        return true;
      }
      return onDeck(p.x,p.z)&&crew.blocksVehicle(p.x,p.z,angle,length,width);
    },
    setPlaneObstacle(fn){planeObstacle=fn;},
    canBoard(player){const p=toLocal(player.pos.x,player.pos.z);return Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z)&&Math.hypot(p.x-4.65,p.z-5.1)<1.6;},
    insideCabin(player){const p=toLocal(player.pos.x,player.pos.z);return Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z);},
    // Preserve the roof, radar and flag when someone enters the glazed wheelhouse.
    updateCabin(){
      mesh.userData.cabinView.value=0;
    },
    levels(x,z,out){if(onGangway(x,z))out.push({y:gangwayHeight(x),site:'carrier'});const p=toLocal(x,z);if(onDeck(p.x,p.z))out.push({y:surfaceY(p.x,p.z),site:'carrier'});},
    obstructed(x,z,y){const p=toLocal(x,z);return planeObstacle(x,z,y)||y>=DECK-.1&&y<6.3&&obstacles.some(o=>p.x>o.x0-.05&&p.x<o.x1+.05&&p.z>o.z0-.05&&p.z<o.z1+.05)||y>=6.3&&y<8.4&&p.x>2.4&&p.x<6.9&&p.z>-3.4&&p.z<8.4;},
    collides(x,y,z){const p=toLocal(x,z);return onGangway(x,z)&&y<gangwayHeight(x)-.02&&y+1.8>gangwayHeight(x)-.24||onDeck(p.x,p.z)&&y<surfaceY(p.x,p.z)-.02&&y+1.8>-2.8||this.obstructed(x,z,y);},
    pick(ray){
      let best=null;const pickSpans=docked()?[...spans,[GANGWAY.fixedEnd,GANGWAY.x1]]:spans;for(const [a,b] of pickSpans){const slope=(gangwayHeight(b)-gangwayHeight(a))/(b-a),plane=new THREE.Plane(new THREE.Vector3(-slope,1,0),slope*a-gangwayHeight(a));if(ray.intersectPlane(plane,hit)&&hit.x>=a&&hit.x<=b&&onGangway(hit.x,hit.z)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:hit.clone(),site:'carrier'};}}
      const o=toLocal(ray.origin.x,ray.origin.z),c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y),dz=ray.direction.x*s+ray.direction.z*c,dx=ray.direction.x*c-ray.direction.z*s;
      if(ray.direction.y<0){const t=(DECK-ray.origin.y)/ray.direction.y,z=o.z+dz*t,x=o.x+dx*t;if(t>=0&&onDeck(x,z)&&(!best||t<best.t))best={t,point:ray.at(t,local).clone(),site:'carrier'};}
      const slope=RAMP.height/(RAMP.z1-RAMP.z0),denominator=ray.direction.y-slope*dz;
      if(denominator<0){const t=(DECK+slope*(o.z-RAMP.z0)-ray.origin.y)/denominator,z=o.z+dz*t,x=o.x+dx*t;if(t>=0&&onRamp(x,z)&&onDeck(x,z)&&(!best||t<best.t))best={t,point:ray.at(t,local).clone(),site:'carrier'};}
      return best;
    },
    spots:()=>[helm(),toWorld(0,-22)],
  };
}

// Automatic routes reserve enough room for the whole hull to turn. Near shore
// the first leg keeps its heading and can back out before making a turn.
export function createCruise({world,player}){
  const carrier=world.carrier,mesh=carrier.mesh;
  let speed=0,distance=0,route=null,mode='manual',message='已靠港',active=false,lap=0,patrolIndex=0,patrolReady=false;
  const patrol=Array.from({length:128},(_,i)=>{const p=sampleCarrierPatrol(i*Math.PI*2/128,{});return[p.x,p.z];});
  let patrolAngle=0,patrolProgress=0;
  const patrolPoint={};
  const {canSail,turnSafe}=createSailingArea(world,GANGWAY);
  function canTurn(x,z,from,to){
    const angle=turnAngle(to-from),n=Math.max(1,Math.ceil(Math.abs(angle)/.02));
    for(let i=1;i<=n;i++)if(!canSail(x,z,from+angle*i/n))return false;
    return true;
  }
  function canTravel(ax,az,bx,bz,yaw){
    const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)));
    for(let i=0;i<=n;i++)if(!canSail(ax+(bx-ax)*i/n,az+(bz-az)*i/n,yaw))return false;
    return true;
  }
  const anchor=()=>{const p=carrier.helm();player.anchor(p.x,p.y,p.z,mesh.rotation.y);};
  function escapeOptions(){
    const x=mesh.position.x,z=mesh.position.z,yaw=mesh.rotation.y;
    if(turnSafe(x,z))return[{x,z,yaw,legs:[],cost:0}];
    for(const offset of [0,.15,-.15,.3,-.3,.6,-.6,1,-1,Math.PI/2,-Math.PI/2]){
      const heading=yaw+offset;if(!canTurn(x,z,yaw,heading))continue;
      const options=[];
      for(const sign of [1,-1])for(let d=2;d<=220;d+=2){
        const px=x+Math.sin(heading)*d*sign,pz=z+Math.cos(heading)*d*sign;
        if(!canTravel(x+Math.sin(heading)*(d-2)*sign,z+Math.cos(heading)*(d-2)*sign,px,pz,heading))break;
        if(turnSafe(px,pz)){options.push({x:px,z:pz,yaw:heading,legs:[{x:px,z:pz,yaw:heading}],cost:d+Math.abs(offset)*12});break;}
      }
      if(options.length)return options;
    }
    return [];
  }
  function openRoute(start,goal){
    const heading=Math.atan2(goal.x-start.x,goal.z-start.z);
    if(canTravel(start.x,start.z,goal.x,goal.z,heading))return[{x:goal.x,z:goal.z}];
    const step=12,nx=Math.floor((SAIL_BOUNDS.x1-SAIL_BOUNDS.x0)/step)+1,nz=Math.floor((SAIL_BOUNDS.z1-SAIL_BOUNDS.z0)/step)+1,count=nx*nz,valid=new Int8Array(count);
    const pos=k=>({x:SAIL_BOUNDS.x0+(k%nx)*step,z:SAIL_BOUNDS.z0+Math.floor(k/nx)*step});
    const open=k=>{if(!valid[k]){const p=pos(k);valid[k]=turnSafe(p.x,p.z)?1:-1;}return valid[k]===1;};
    function nearest(p){
      let best=-1,d=Infinity;
      for(let k=0;k<count;k++){const q=pos(k),s=(q.x-p.x)**2+(q.z-p.z)**2;if(s<d&&open(k)&&canTravel(p.x,p.z,q.x,q.z,Math.atan2(q.x-p.x,q.z-p.z))){best=k;d=s;}}
      return best;
    }
    const first=nearest(start),last=nearest(goal);if(first<0||last<0)return null;
    const parents=new Int32Array(count).fill(-2),queue=[first];parents[first]=-1;
    for(let i=0;i<queue.length&&parents[last]===-2;i++){
      const k=queue[i],a=pos(k);
      for(const n of [k-1,k+1,k-nx,k+nx]){
        if(n<0||n>=count||Math.abs(n%nx-k%nx)>1||parents[n]!==-2||!open(n))continue;
        const b=pos(n);if(!turnSafe((a.x+b.x)/2,(a.z+b.z)/2))continue;
        parents[n]=k;queue.push(n);
      }
    }
    if(parents[last]===-2)return null;
    const points=[];for(let k=last;k!==-1;k=parents[k])points.unshift(pos(k));
    return points.filter((p,i)=>!i||i===points.length-1||p.x-points[i-1].x!==points[i+1].x-p.x||p.z-points[i-1].z!==points[i+1].z-p.z).concat({x:goal.x,z:goal.z});
  }
  function planTo(goals,options=escapeOptions()){
    let best=null,bestCost=Infinity;
    for(const start of options)for(const goal of goals){
      const path=openRoute(start,goal);if(!path)continue;
      const legs=start.legs.slice();let x=start.x,z=start.z,yaw=start.yaw,cost=start.cost,valid=true;
      for(const p of path){
        const d=Math.hypot(p.x-x,p.z-z);if(d<.001)continue;
        const heading=Math.atan2(p.x-x,p.z-z);
        if(!canTurn(x,z,yaw,heading)||!canTravel(x,z,p.x,p.z,heading)){valid=false;break;}
        legs.push({x:p.x,z:p.z,yaw:heading});cost+=d+Math.abs(turnAngle(heading-yaw))*8;x=p.x;z=p.z;yaw=heading;
      }
      if(!valid)continue;
      if(goal.dock){
        if(!canTurn(x,z,yaw,0)||!canTravel(x,z,HOME.x,HOME.z,0))continue;
        legs.push({x:HOME.x,z:HOME.z,yaw:0});cost+=Math.hypot(x-HOME.x,z-HOME.z);
      }
      if(cost<bestCost){best=legs;bestCost=cost;}
    }
    return best;
  }
  function planReturn(){
    speed=0;mode='manual';route=null;
    if(carrier.docked()){message='已靠港';return true;}
    // A straight approach can reverse toward the berth without attempting a
    // dangerous U-turn beside the pier or the mountain.
    if(Math.abs(mesh.position.x-HOME.x)<.001&&canTurn(mesh.position.x,mesh.position.z,mesh.rotation.y,0)&&canTravel(mesh.position.x,mesh.position.z,HOME.x,HOME.z,0))route=[{...HOME,yaw:0}];
    else route=planTo([{x:HOME.x,z:HOME.z-22,dock:true},{x:HOME.x,z:HOME.z+22,dock:true}]);
    if(!route){
      // Approach from the open eastern water before aligning with the berth.
      // A grid shortcut from the other quadrants can reach a shallow tunnel
      // mouth with no room left for the final docking turn.
      const staging=planTo([{x:HOME.x+128,z:HOME.z}]);
      if(staging?.length){
        const end=staging.at(-1),approach=planTo([{x:HOME.x,z:HOME.z-22,dock:true},{x:HOME.x,z:HOME.z+22,dock:true}],[{...end,legs:[],cost:0}]);
        if(approach)route=staging.concat(approach);
      }
    }
    if(!route){message='航线受阻，请稍作挪船后重试';return false;}
    mode='return';message='自动返港中';return true;
  }
  function togglePatrol(){
    if(mode==='patrol'){route=null;mode='manual';speed=0;message='自动巡航已暂停';return false;}
    patrolIndex=patrol.reduce((best,p,i)=>Math.hypot(p[0]-mesh.position.x,p[1]-mesh.position.z)<Math.hypot(patrol[best][0]-mesh.position.x,patrol[best][1]-mesh.position.z)?i:best,0);
    route=planTo([{x:patrol[patrolIndex][0],z:patrol[patrolIndex][1]}]);speed=0;
    if(!route){mode='manual';message='航线受阻，请稍作挪船后重试';return false;}
    mode='patrol';lap=0;patrolAngle=patrolIndex*Math.PI*2/patrol.length;patrolProgress=0;patrolReady=route.length===0;if(patrolReady)route=null;message='自动巡航中';return true;
  }
  function autopilot(dt){
    const p=route[0],dx=p.x-mesh.position.x,dz=p.z-mesh.position.z,d=Math.hypot(dx,dz),angle=turnAngle(p.yaw-mesh.rotation.y);
    if(Math.abs(angle)>.0001){
      speed=0;const yaw=mesh.rotation.y+Math.max(-.32*dt,Math.min(.32*dt,angle));
      if(!canSail(mesh.position.x,mesh.position.z,yaw)){route=null;mode='manual';message='航线受阻，已停船';return;}
      mesh.rotation.y=yaw;
    }else if(d>.0001){
      const v=Math.min(10,Math.abs(speed)+3.5*dt),step=Math.min(d,v*dt),x=mesh.position.x+dx/d*step,z=mesh.position.z+dz/d*step;
      if(!canSail(x,z,p.yaw)){route=null;mode='manual';speed=0;message='航线受阻，已停船';return;}
      mesh.rotation.y=p.yaw;mesh.position.set(x,0,z);distance+=step;speed=v*(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw)>=0?1:-1);
    }else{
      mesh.position.set(p.x,0,p.z);mesh.rotation.y=p.yaw;route.shift();speed=0;
      if(!route.length){
        if(mode==='return'){mesh.position.set(HOME.x,0,HOME.z);mesh.rotation.y=0;route=null;mode='manual';message='已靠港';}
        else{patrolReady=true;route=null;message='外围椭圆巡航中';}
      }
    }
  }
  function orbit(dt){
    sampleCarrierPatrol(patrolAngle,patrolPoint);
    const angle=turnAngle(patrolPoint.yaw-mesh.rotation.y);
    if(Math.abs(angle)>.02){
      const yaw=mesh.rotation.y+Math.max(-.32*dt,Math.min(.32*dt,angle));
      if(!canSail(mesh.position.x,mesh.position.z,yaw)){mode='manual';speed=0;message='航线受阻，已停船';return;}
      mesh.rotation.y=yaw;speed=0;return;
    }
    speed=Math.min(10,speed+3.5*dt);
    const derivative=Math.hypot(CARRIER_PATROL.rx*Math.sin(patrolAngle),CARRIER_PATROL.rz*Math.cos(patrolAngle));
    const da=speed*dt/derivative;
    sampleCarrierPatrol(patrolAngle+da,patrolPoint);
    if(!canSail(patrolPoint.x,patrolPoint.z,patrolPoint.yaw)){mode='manual';speed=0;message='航线受阻，已停船';return;}
    distance+=Math.hypot(patrolPoint.x-mesh.position.x,patrolPoint.z-mesh.position.z);
    patrolAngle=(patrolAngle+da)%(Math.PI*2);patrolProgress+=da;lap=Math.floor(patrolProgress/(Math.PI*2));
    mesh.position.set(patrolPoint.x,0,patrolPoint.z);mesh.rotation.y=patrolPoint.yaw;
  }
  function update(dt,keys){
    if(!active)return;dt=Math.min(dt,.05);
    const forward=keys.has('w')||keys.has('arrowup'),back=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),brake=keys.has(' ');
    if(forward||back||left||right||brake){route=null;mode='manual';message='手动驾驶';}
    if(mode==='patrol'&&patrolReady){orbit(dt);mesh.updateMatrixWorld(true);anchor();return;}
    if(route){autopilot(dt);mesh.updateMatrixWorld(true);anchor();return;}
    const boost=keys.has('shift');
    let target=brake?0:forward?(boost?18:12):back?-4:speed,turn=Number(left)-Number(right),yaw=mesh.rotation.y;
    const acceleration=brake?8:boost&&forward?6:3.5;
    speed+=Math.max(-acceleration*dt,Math.min(acceleration*dt,target-speed));
    const nextYaw=yaw+turn*.32*dt*(speed<-.1?-1:1);if(turn&&canSail(mesh.position.x,mesh.position.z,nextYaw))yaw=nextYaw;
    const travel=speed*dt,x=mesh.position.x+Math.sin(yaw)*travel,z=mesh.position.z+Math.cos(yaw)*travel;
    if(!travel||canSail(x,z,yaw)){mesh.rotation.y=yaw;mesh.position.set(x,0,z);distance+=Math.abs(travel);}
    else{speed=0;message='已减速停船，请避开岸线或码头';}
    mesh.updateMatrixWorld(true);anchor();
  }
  return{
    start(){active=true;speed=carrier.docked()?0:4;route=null;mode='manual';message=carrier.docked()?'已靠港，准备启航':'已接管航母';anchor();},
    stop(){active=false;route=null;mode='manual';speed=0;return{...carrier.helm(),heading:mesh.rotation.y};},
    pause(){speed=0;},returnHome:planReturn,togglePatrol,update,canSail,
    takeOver(){route=null;mode='manual';message='手动驾驶';},
    get automatic(){return mode!=='manual';},
    status:()=>({x:mesh.position.x,z:mesh.position.z,heading:mesh.rotation.y,speed,distance,returning:mode==='return',patrolling:mode==='patrol',lap,docked:carrier.docked(),message}),
  };
}
