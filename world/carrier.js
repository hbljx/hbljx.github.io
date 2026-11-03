import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';
import { ISLAND, SEA_BRIDGE } from './layout.js';

const DOCK_Z=(SEA_BRIDGE.z0+SEA_BRIDGE.z1)/2;
const HOME={x:64,z:DOCK_Z,heading:0},DECK=3.4;
const STERN=-32,BOW=33,TURN_RADIUS=36,PORT_CLEARANCE=40;
const sections=[[STERN,5.9],[-29,9.5],[-21,9.5],[-18,7.6],[22,7.6],[29,6.3],[BOW,4.8]];
const deckY=()=>DECK;
const RAMP={x0:-4.4,x1:1.9,z0:23,z1:33,height:2.3};
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
  let planeObstacle=()=>false;
  const slabs=[],path=[{x:29,y:0,z:DOCK_Z}],foot={x:29,y:0,z:DOCK_Z},local=new THREE.Vector3(),hit=new THREE.Vector3();
  function slab(x0,x1,y,drawEnd=x1){B.box((x0+drawEnd)/2,y-.18,DOCK_Z,drawEnd-x0,.18,2.8,floor);slabs.push({x0,x1,z0:DOCK_Z-1.4,z1:DOCK_Z+1.4,y,box:new THREE.Box3(new THREE.Vector3(x0,y-.18,DOCK_Z-1.4),new THREE.Vector3(x1,y,DOCK_Z+1.4))});}
  slab(29,35,.2);path.push({x:34.5,y:.2,z:DOCK_Z});
  for(let i=0;i<16;i++){const x=35+i*.9,y=.4+i*.2;slab(x,x+.9,y);B.box(x+.82,y+.012,DOCK_Z,.10,.025,2.65,{tex:'paint',tint:0xd9bc77});for(const dx of [.22,.42,.62])B.box(x+dx,y+.005,DOCK_Z,.025,.012,2.45,{tex:'black_metal'});path.push({x:x+.45,y,z:DOCK_Z});}
  slab(49.4,56.2,DECK,55.8);path.push({x:55.8,y:DECK,z:DOCK_Z});
  for(let x=30;x<=56;x+=2)for(const z of [DOCK_Z-1.35,DOCK_Z+1.35]){const y=x<35?.2:Math.min(DECK,.4+Math.floor((x-35)/.9)*.2);B.box(x,-2.3,z,.14,y+3.3,.14,steel);}
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y;for(const z of [DOCK_Z-1.35,DOCK_Z+1.35])B.box((a.x+b.x)/2,(a.y+b.y)/2+.94,z,Math.hypot(dx,dy),.075,.075,steel,{rz:Math.atan2(dy,dx)});}
  for(const z of [DOCK_Z-1.4,DOCK_Z+1.4]){B.box(29.5,.2,z,.12,2.6,.12,steel);B.box(29.5,2.8,z,.35,.25,.35,{tex:'paint',tint:0xe4cb86});}
  for(let x=32;x<56;x+=3){const y=x<35?.2:Math.min(DECK,.4+Math.floor((x-35)/.9)*.2);for(const z of [DOCK_Z-1.35,DOCK_Z+1.35])B.box(x,y+.95,z,.22,.12,.22,{tex:'paint',tint:0xffdf9b,emissive:.65});}
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];for(const z of [DOCK_Z-1.35,DOCK_Z+1.35])B.box((a.x+b.x)/2,(a.y+b.y)/2+.48,z,Math.hypot(b.x-a.x,b.y-a.y),.055,.055,steel,{rz:Math.atan2(b.y-a.y,b.x-a.x)});}
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
    const nearest=x=>path.reduce((best,p,i)=>Math.abs(p.x-x)<Math.abs(path[best].x-x)?i:best,0);
    const ai=fromDeck?path.length-1:nearest(ax),bi=toDeck?path.length-1:nearest(bx),points=path.slice(Math.min(ai,bi),Math.max(ai,bi)+1);if(ai>bi)points.reverse();
    if(fromDeck)points.unshift(...deckRoute(a.x,a.z,-7.1,0));
    if(toDeck)points.push(...deckRoute(-7.1,0,b.x,b.z));else points.push({x:bx,y:by,z:bz});return points;
  }
  return{
    mesh,foot,home:HOME,toLocal,toWorld,route,docked,helm,airfield,deckAircraft,ramp:RAMP,
    setPlaneObstacle(fn){planeObstacle=fn;},
    canBoard(player){const p=toLocal(player.pos.x,player.pos.z);return Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z)&&Math.hypot(p.x-4.65,p.z-5.1)<1.6;},
    insideCabin(player){const p=toLocal(player.pos.x,player.pos.z);return Math.abs(player.y-DECK)<.7&&inCabin(p.x,p.z);},
    // Preserve the roof, radar and flag when someone enters the glazed wheelhouse.
    updateCabin(){
      mesh.userData.cabinView.value=0;
    },
    levels(x,z,out){for(const s of slabs)if(x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1)out.push({y:s.y,site:'carrier',tread:true});const p=toLocal(x,z);if(onDeck(p.x,p.z))out.push({y:surfaceY(p.x,p.z),site:'carrier'});},
    obstructed(x,z,y){const p=toLocal(x,z);return planeObstacle(x,z,y)||y>=DECK-.1&&y<6.3&&obstacles.some(o=>p.x>o.x0-.05&&p.x<o.x1+.05&&p.z>o.z0-.05&&p.z<o.z1+.05)||y>=6.3&&y<8.4&&p.x>2.4&&p.x<6.9&&p.z>-3.4&&p.z<8.4;},
    collides(x,y,z){const p=toLocal(x,z);return onDeck(p.x,p.z)&&y<surfaceY(p.x,p.z)-.02&&y+1.8>-2.8||this.obstructed(x,z,y);},
    pick(ray){
      let best=null;for(const s of slabs)if(ray.intersectBox(s.box,hit)){const t=hit.distanceTo(ray.origin);if(!best||t<best.t)best={t,point:new THREE.Vector3(hit.x,s.y,hit.z),site:'carrier'};}
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
  let speed=0,distance=0,route=null,mode='manual',message='已靠港',active=false,lap=0,patrolIndex=0,patrolStart=0,patrolReady=false;
  const patrol=[[88,76],[-96,76],[-96,-128],[88,-128]];
  const samples=[];for(let z=STERN;z<=BOW;z++)for(const f of [-1,-.5,0,.5,1])samples.push([f*(widthAt(z)*.88+.25),z]);
  const bounds=(x,z)=>Math.abs(x)<=145&&z>=-145&&z<=125;
  function water(x,z){return !(x>ISLAND.x0-1&&x<ISLAND.x1+1&&z>ISLAND.z0-1&&z<ISLAND.z1+1)&&!(x>-48.5&&x<-31&&z>-.9&&z<7.1)&&!(x>35&&x<56.45&&z>6.4&&z<9.6)&&!(world.mountain.heightAt(x,z)>-1.6);}
  function canSail(x,z,yaw){
    if(!bounds(x,z))return false;const c=Math.cos(yaw),s=Math.sin(yaw);
    for(const [lx,lz]of samples)if(!water(x+lx*c+lz*s,z-lx*s+lz*c))return false;
    return true;
  }
  function turnSafe(x,z){
    if(!bounds(x,z))return false;
    for(const [x0,x1,z0,z1]of [[ISLAND.x0-1,ISLAND.x1+1,ISLAND.z0-1,ISLAND.z1+1],[-48.5,-31,-.9,7.1],[35,56.45,6.4,9.6]]){
      if(Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1))<TURN_RADIUS)return false;
    }
    // Enclose the peak and both shoulders, including their submerged skirts.
    const mountain=world.mountain.mapShape;
    return Math.hypot(x-mountain.x,z-mountain.z)>TURN_RADIUS+mountain.r;
  }
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
    const step=8,nx=37,nz=34,count=nx*nz,valid=new Int8Array(count);
    const pos=k=>({x:-144+(k%nx)*step,z:-144+Math.floor(k/nx)*step});
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
  function planTo(goals){
    let best=null,bestCost=Infinity;
    const options=escapeOptions();
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
    if(!route){message='航线受阻，请稍作挪船后重试';return false;}
    mode='return';message='自动返港中';return true;
  }
  function togglePatrol(){
    if(mode==='patrol'){route=null;mode='manual';speed=0;message='自动巡航已暂停';return false;}
    patrolIndex=patrol.reduce((best,p,i)=>Math.hypot(p[0]-mesh.position.x,p[1]-mesh.position.z)<Math.hypot(patrol[best][0]-mesh.position.x,patrol[best][1]-mesh.position.z)?i:best,0);
    route=planTo([{x:patrol[patrolIndex][0],z:patrol[patrolIndex][1]}]);speed=0;
    if(!route){mode='manual';message='航线受阻，请稍作挪船后重试';return false;}
    mode='patrol';lap=0;patrolStart=patrolIndex;patrolReady=false;message='自动巡航中';return true;
  }
  function autopilot(dt){
    const p=route[0],dx=p.x-mesh.position.x,dz=p.z-mesh.position.z,d=Math.hypot(dx,dz),angle=turnAngle(p.yaw-mesh.rotation.y);
    if(Math.abs(angle)>.0001){
      speed=0;const yaw=mesh.rotation.y+Math.max(-.32*dt,Math.min(.32*dt,angle));
      if(!canSail(mesh.position.x,mesh.position.z,yaw)){route=null;mode='manual';message='航线受阻，已停船';return;}
      mesh.rotation.y=yaw;
    }else if(d>.0001){
      const v=Math.min(7,Math.abs(speed)+2*dt),step=Math.min(d,v*dt),x=mesh.position.x+dx/d*step,z=mesh.position.z+dz/d*step;
      if(!canSail(x,z,p.yaw)){route=null;mode='manual';speed=0;message='航线受阻，已停船';return;}
      mesh.rotation.y=p.yaw;mesh.position.set(x,0,z);distance+=step;speed=v*(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw)>=0?1:-1);
    }else{
      mesh.position.set(p.x,0,p.z);mesh.rotation.y=p.yaw;route.shift();speed=0;
      if(!route.length){
        if(mode==='return'){mesh.position.set(HOME.x,0,HOME.z);mesh.rotation.y=0;route=null;mode='manual';message='已靠港';}
        else{if(patrolReady&&patrolIndex===patrolStart)lap++;patrolReady=true;patrolIndex=(patrolIndex+1)%patrol.length;const [x,z]=patrol[patrolIndex];route=[{x,z,yaw:Math.atan2(x-mesh.position.x,z-mesh.position.z)}];message='自动巡航中';}
      }
    }
  }
  function update(dt,keys){
    if(!active)return;dt=Math.min(dt,.05);
    const forward=keys.has('w')||keys.has('arrowup'),back=keys.has('s')||keys.has('arrowdown'),left=keys.has('a')||keys.has('arrowleft'),right=keys.has('d')||keys.has('arrowright'),brake=keys.has(' ');
    if(forward||back||left||right||brake){route=null;mode='manual';message='手动驾驶';}
    if(route){autopilot(dt);mesh.updateMatrixWorld(true);anchor();return;}
    let target=brake?0:forward?8:back?-3:0,turn=Number(left)-Number(right),yaw=mesh.rotation.y;
    if(Math.abs(mesh.position.x-HOME.x)<.5&&Math.abs(mesh.position.z-HOME.z)<PORT_CLEARANCE&&Math.abs(turnAngle(yaw))<.7){
      const angle=turnAngle(-yaw);turn=Math.max(-1,Math.min(1,angle*6));
      if(Math.abs(angle)>.005)target=0;else{yaw=0;turn=0;}
      if(left||right||Math.abs(angle)>.005)message=forward||back?'正在直线离港，驶离码头后可转向':'先按 W/S 驶离码头，再转向';
    }
    speed+=Math.max(-(brake?7:2)*dt,Math.min((brake?7:2)*dt,target-speed));
    const nextYaw=yaw+turn*.32*dt*(speed<-.1?-1:1);if(turn&&canSail(mesh.position.x,mesh.position.z,nextYaw))yaw=nextYaw;
    const travel=speed*dt,x=mesh.position.x+Math.sin(yaw)*travel,z=mesh.position.z+Math.cos(yaw)*travel;
    if(!travel||canSail(x,z,yaw)){mesh.rotation.y=yaw;mesh.position.set(x,0,z);distance+=Math.abs(travel);}
    else{speed=0;message='已减速停船，请避开岸线或码头';}
    mesh.updateMatrixWorld(true);anchor();
  }
  return{
    start(){active=true;speed=0;route=null;mode='manual';message=carrier.docked()?'已靠港，准备启航':'已接管航母';anchor();},
    stop(){active=false;route=null;mode='manual';speed=0;return{...carrier.helm(),heading:mesh.rotation.y};},
    pause(){speed=0;},returnHome:planReturn,togglePatrol,update,canSail,
    takeOver(){route=null;mode='manual';message='手动驾驶';},
    get automatic(){return mode!=='manual';},
    status:()=>({x:mesh.position.x,z:mesh.position.z,heading:mesh.rotation.y,speed,distance,returning:mode==='return',patrolling:mode==='patrol',lap,docked:carrier.docked(),message}),
  };
}
