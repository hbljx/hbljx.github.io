import * as THREE from 'three';
import { ROOF_PARKING, MOUNTAIN_SITE } from './layout.js';
import { chooseVehicleColor } from './vehicle-colors.js';

const FLIGHT_SOUTH = MOUNTAIN_SITE.z + MOUNTAIN_SITE.r + 40;

export const AIRFIELD = { id: 'home', name: '三楼停机区', x: ROOF_PARKING.x, y: 11, z: ROOF_PARKING.zs[2], heading: Math.PI, exit: { x: ROOF_PARKING.x-4.5, y: 11, z: ROOF_PARKING.zs[2]+2 } };

// Both boarding and collision follow the plane, including when parked on the mountain.
export function distanceToAirplane(mesh, x, z) {
  const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);
  return Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-(mesh.userData.halfSpan||3.7)),Math.max(0,Math.abs(dx*s+dz*c)-(mesh.userData.halfLength||3.2)));
}
export function aircraftObstacle(mesh) {
  return (x,z,feet)=>{
    if(!mesh.userData.parked || Math.abs(feet-mesh.position.y)>=1.8)return false;
    const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);
    const side=Math.abs(dx*c-dz*s),along=dx*s+dz*c;
    return side<.75&&along>-(mesh.userData.halfLength||3.2)&&along<(mesh.userData.halfLength||2.85) || side<(mesh.userData.halfSpan||3.7)&&Math.abs(along+.35)<.85 || side<1.3&&Math.abs(along+2.65)<.45;
  };
}

export function createCanopy() {
  const positions=[],normals=[],colors=[],pivot=new THREE.Vector3(0,1.55,-1.2),tint=new THREE.Color();
  function append(g,hex,alpha){
    tint.setHex(hex);g.translate(-pivot.x,-pivot.y,-pivot.z);
    positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);
    for(let i=0;i<g.attributes.position.count;i++)colors.push(tint.r,tint.g,tint.b,alpha);g.dispose();
  }
  const bottom=[[-.76,1.55,-1.2],[.76,1.55,-1.2],[.76,1.55,.85],[-.76,1.55,.85]];
  const top=[[-.62,2.98,-.95],[.62,2.98,-.95],[.62,2.98,.55],[-.62,2.98,.55]];
  function pane(a,b,c,d){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));g.computeVertexNormals();append(g,0xa5dfe5,.2);
  }
  function frame(a,b){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),dir=to.clone().sub(from);
    const indexed=new THREE.BoxGeometry(.045,.045,dir.length()),g=indexed.toNonIndexed();indexed.dispose();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),dir.normalize()));
    from.add(to).multiplyScalar(.5);g.translate(from.x,from.y,from.z);append(g,0x294b59,1);
  }
  pane(...top);
  for(let i=0;i<4;i++){
    const j=(i+1)%4;pane(bottom[i],bottom[j],top[j],top[i]);
    frame(bottom[i],bottom[j]);frame(top[i],top[j]);frame(bottom[i],top[i]);
  }
  // Glass and its frame share one vertex-alpha mesh to stay within the draw budget.
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));g.computeBoundingSphere();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
  const mesh=new THREE.Mesh(g,material);mesh.name='airplane-canopy';mesh.position.copy(pivot);mesh.rotation.x=-Math.PI/3;mesh.renderOrder=3;
  return mesh;
}

export function createAirplane() {
  const positions = [], normals = [], colors = [], color = new THREE.Color();
  function box(x, y, z, w, h, d, hex, rx = 0) {
    const indexed = new THREE.BoxGeometry(w, h, d), g = indexed.toNonIndexed(); indexed.dispose();
    g.rotateX(rx); g.translate(x, y, z);
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array); color.setHex(hex);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.dispose();
  }
  const white = chooseVehicleColor('aircraft'), navy = 0x294b59, gold = 0xe3ae4e, black = 0x252b30;
  const blue = 0x527985, glass = 0x8bb9c0, red = 0xb64c43;
  // Layered blocks give the small rooftop aircraft a clearer silhouette.
  box(0, 1, 0, 1.05, .55, 4.8, white);
  box(0, 1.08, -.08, 1.075, .2, 3.55, blue);
  box(0, 1.13, 1.65, 1.08, .15, .48, gold);
  box(0, .9, 2.18, .82, .14, .58, white);
  box(0, 1.23, 1.35, .94, .45, 1.55, navy);
  box(0, 1.25, 2.3, .62, .32, .65, gold);
  box(0, 1.46, 2.55, .48, .1, .18, glass);
  box(0, .9, 2.63, .72, .12, .22, navy);
  box(0, 1, -2.6, .55, .4, 1.2, navy);
  box(0, 1.1, -.35, 7.4, .14, 1.5, white);
  box(0, 1.18, -.35, 6.75, .045, .34, navy);
  box(0, 1.205, -.35, 5.8, .025, .1, gold);
  box(0, 1.18, -1.04, 1.05, .04, .12, blue);
  box(0, 1.18, .34, 1.05, .04, .12, blue);
  for (const s of [-1, 1]) {
    box(s * 3.35, 1.12, -.35, .58, .17, 1.52, gold);
    box(s * 2.4, 1.19, -.35, .52, .025, .22, navy);
    box(s * 3.35, 1.205, -.35, .16, .02, .78, white);
    box(s * 3.49, 1.22, -.35, .07, .035, .26, red);
    box(s * .62, 1.53, -.3, .15, .65, 1.45, navy);
    box(s * .62, 1.87, -.3, .17, .06, .72, gold);
    box(s * .8, .49, .65, .08, .75, .09, navy);
    box(s * .8, .24, .65, .24, .48, .45, black);
    box(s * .8, .24, .65, .26, .16, .47, navy);
    box(s * .1, .175, -2.65, .12, .35, .32, black);
    box(s * .1, .175, -2.65, .15, .12, .34, navy);
    for (const z of [-1.62, -1.08, -.54, 0, .54, 1.08]) {
      box(s * .535, 1.12, z, .035, .16, .25, glass);
      box(s * .558, 1.12, z, .018, .19, .03, navy);
    }
  }
  // Rear gear reaches from the fuselage down to the axle between the two wheels.
  box(0,.56,-2.65,.10,.77,.12,navy);box(0,.175,-2.65,.38,.08,.10,navy);
  box(0, 1.5, -.55, .75, .12, .68, black);
  box(0, 1.82, -.9, .78, .55, .12, navy);
  box(0, 1.93, -2.6, .13, 1.6, .85, navy);
  box(0, 1.96, -2.6, .16, 1.25, .12, red);
  box(0, 1.45, -2.65, 2.55, .11, .75, gold);
  box(0, 1.52, -2.65, 1.18, .035, .48, white);
  const propellerStart=positions.length/3;
  box(0,1.25,2.7,.13,2.05,.1,black);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeBoundingSphere();
  const propellerParts=new Float32Array(positions.length/3);propellerParts.fill(1,propellerStart);
  g.setAttribute('propellerPart',new THREE.BufferAttribute(propellerParts,1));
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'airplane'; mesh.userData.group = 'aircraft'; mesh.userData.parked = true; mesh.castShadow = mesh.receiveShadow = true;
  // The propeller rotates in the body's shader, saving one draw call for the
  // new transparent wheelhouse without changing flight controls or animation.
  const propeller = new THREE.Object3D(),propellerAngle={value:0};
  mesh.material.onBeforeCompile=shader=>{
    shader.uniforms.uPropellerAngle=propellerAngle;
    shader.vertexShader='attribute float propellerPart; uniform float uPropellerAngle;\n'+shader.vertexShader
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nmat2 propTurn=mat2(cos(uPropellerAngle),sin(uPropellerAngle),-sin(uPropellerAngle),cos(uPropellerAngle));\nif(propellerPart>.5)objectNormal.xy=propTurn*objectNormal.xy;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nif(propellerPart>.5)transformed.xy=propTurn*(transformed.xy-vec2(0.,1.25))+vec2(0.,1.25);');
  };
  mesh.onBeforeRender=()=>{propellerAngle.value=propeller.rotation.z;};
  propeller.position.set(0, 1.25, 2.7); mesh.add(propeller);
  const canopy=createCanopy();mesh.add(canopy);mesh.userData.canopy=canopy;
  mesh.position.set(AIRFIELD.x, AIRFIELD.y, AIRFIELD.z); mesh.rotation.y = AIRFIELD.heading;
  mesh.userData.propeller = propeller;
  return mesh;
}

export function createFlight({ mesh, world, player, stage, sound }) {
  let phase = 'parked', heading = AIRFIELD.heading, speed = 0, distance = 0, bank = 0,pitch=0,launchMode='vertical',launchRun=0,hovering=false;
  const home = AIRFIELD;
  const carrierField=world.aircraftFleet.fieldFor(mesh),fields = [home, world.mountain.airfield, carrierField];
  let parkedAt=mesh.name==='airplane'?home:carrierField,destination=null,launchHeight=18,approachHeight=65,taxi=null,notice='';
  const footprint = [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function terrainHeight(x, z,ignoreCarrier=false) {
    let height = 0;
    for (const [dx, dz] of footprint) {
      const surface = world.ground.topAt(x + dx, z + dz);
      height = Math.max(height, ignoreCarrier&&surface?.site==='carrier'?0:surface?.y||0, world.thirdFloor.flightHeight(x + dx, z + dz));
    }
    return height;
  }
  const clearance=(x,z)=>Math.max(18,terrainHeight(x,z)+4);
  function anchor() { player.anchor(mesh.position.x, mesh.position.y, mesh.position.z, heading); }
  function syncParked(){
    if(phase!=='parked'||parkedAt.id!=='carrier')return;
    heading=parkedAt.heading;mesh.position.set(parkedAt.x,parkedAt.y,parkedAt.z);mesh.rotation.set(0,heading,0);mesh.updateMatrixWorld(true);
  }
  function park(at = destination || parkedAt) {
    parkedAt=at; destination=null;
    phase = 'parked'; speed = bank = pitch = 0; heading = at.heading;
    notice='';taxi=null;
    mesh.userData.propeller.rotation.z=0;
    mesh.position.set(at.x, at.y, at.z); mesh.rotation.set(0, heading, 0); mesh.userData.parked=true;
    mesh.castShadow = at.id!=='carrier'; stage.renderer.shadowMap.needsUpdate = true; sound.loop(null);
  }
  function start() { syncParked();mesh.userData.canopy.rotation.x=0;mesh.castShadow = false; stage.renderer.shadowMap.needsUpdate = true; anchor(); }
  function leave(){mesh.userData.canopy.rotation.x=mesh.userData.canopyOpen??-Math.PI/3;}
  function takeoff(mode='vertical') {
    if(phase!=='parked'||!['vertical','catapult','ski-jump'].includes(mode)||mode!=='vertical'&&parkedAt.id!=='carrier')return false;
    syncParked();taxi=mode==='vertical'?null:world.aircraftFleet.taxiRoute(mesh);
    if(mode!=='vertical'&&!taxi){notice='起飞通道有飞机停放，请先移开，或选择垂直起飞';return false;}
    launchMode=mode;launchRun=0,hovering=false;pitch=bank=speed=0;notice='';
    launchHeight=Math.max(parkedAt.y+7,clearance(parkedAt.x,parkedAt.z));phase=mode==='vertical'?'takeoff':taxi.length?'taxi':'deck-roll';
    mesh.userData.parked=false;mesh.castShadow=false;stage.renderer.shadowMap.needsUpdate=true;return true;
  }
  function landAt(id) {
    const candidate=fields.find(f=>f.id===id),field=candidate&&world.aircraftFleet.resolveField(mesh,id,candidate);
    if(candidate&&!field){notice=`${candidate.name}已占用，请选择其他停机区`;return false;}
    if(!field || phase==='parked' || destination===field)return;
    hovering=false;notice='';destination=field;phase='returning';
    approachHeight=Math.hypot(mesh.position.x-field.x,mesh.position.z-field.z)<5?Math.max(mesh.position.y,field.y+8):65;
  }
  function returnHome() { landAt('home'); }
  function landNearest() {
    if(destination || phase==='parked')return;
    const p=mesh.position;
    const available=fields.filter(field=>world.aircraftFleet.resolveField(mesh,field.id,field));
    if(available.length)landAt(available.reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b).id);
  }
  function exitPosition() {
    const p=parkedAt.exit;
    const stand=world.ground.nearestStand(p.x,p.z,p.y);
    return {...(stand || p),heading:parkedAt.heading};
  }
  function update(dt, keys) {
    const p = mesh.position;
    if (phase === 'takeoff') {
      p.y = Math.min(launchHeight, p.y + dt * 3); if (p.y >= launchHeight) { phase = 'flying'; speed = 8; }
    } else if(phase==='taxi'){
      const point=taxi[0],dx=point.x-p.x,dz=point.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*4);
      if(d>.001){p.x+=dx/d*step;p.z+=dz/d*step;distance+=step;}
      const local=world.carrier.toLocal(p.x,p.z);p.y=world.carrier.toWorld(local.x,local.z).y;heading=world.carrier.mesh.rotation.y;
      if(d<=step+.001){taxi.shift();if(!taxi.length){taxi=null;phase='deck-roll';}}
    } else if(phase==='deck-roll'){
      const catapult=launchMode==='catapult',end=catapult?34:55;
      speed=Math.min(catapult?28:20,speed+dt*(catapult?24:5.5));
      const step=Math.min(end-launchRun,speed*dt);launchRun+=step;distance+=step;
      const localZ=-22+launchRun,point=world.carrier.toWorld(-1.8,localZ);
      p.set(point.x,point.y,point.z);heading=world.carrier.mesh.rotation.y;
      pitch=!catapult&&localZ>=world.carrier.ramp.z0?Math.atan2(world.carrier.ramp.height,10):0;
      if(launchRun>=end)phase='launch-climb';
    } else if(phase==='launch-climb'){
      const targetPitch=launchMode==='catapult'?.3:.36;pitch+=(targetPitch-pitch)*Math.min(1,dt*4);
      p.y+=dt*9;
      const x=p.x+Math.sin(heading)*speed*dt,z=p.z+Math.cos(heading)*speed*dt;
      // Clear nearby land before moving horizontally when the bow faces shore.
      if(p.y>=terrainHeight(x,z,true)+2.5&&x>-170&&x<170&&z>-185&&z<FLIGHT_SOUTH){p.x=x;p.z=z;distance+=speed*dt;}
      if(p.y>=clearance(p.x,p.z)){phase='flying';speed=Math.min(16,speed);}
    } else if (phase === 'flying') {
      if(hovering){speed=0;bank=pitch=0;mesh.rotation.set(0,heading,0);mesh.userData.propeller.rotation.z+=dt*18;anchor();sound.loop('engine',.2);return;}
      pitch*=Math.exp(-dt*3);
      const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
      heading += turn * dt * .72; bank += (-turn * .22 - bank) * Math.min(1, dt * 4);
      const target = hovering?0:keys.has('w') || keys.has('arrowup') ? 16 : keys.has('s') || keys.has('arrowdown') ? 4 : 8;
      speed += clamp(target - speed, -dt * 5, dt * 5);
      const x = p.x + Math.sin(heading) * speed * dt, z = p.z + Math.cos(heading) * speed * dt;
      const floor = clearance(x, z);
      const lift = hovering?0:Number(keys.has(' ')) - Number(keys.has('control') || keys.has('c'));
      p.y = Math.max(Math.min(p.y, floor), p.y + (p.y < floor ? 6 : lift * 5) * dt);
      if (p.y >= floor - .05 && x > -170 && x < 170 && z > -185 && z < FLIGHT_SOUTH) { p.x = x; p.z = z; distance += speed * dt; }
      else if (p.y >= floor - .05) heading += dt;
      // Sea-level decks are below the free-flight safety floor, so allow the
      // marked landing approach to take over from that safe height as well.
      if(keys.has('c'))for(const field of fields)if(Math.hypot(p.x-field.x,p.z-field.z)<3 && p.y<=Math.max(field.y+10,clearance(field.x,field.z)+2)){landAt(field.id);break;}
    } else if (phase === 'returning') {
      // Distant approaches clear the mountains; nearby pads need only a short alignment.
      bank *= Math.exp(-dt * 4);
      pitch *= Math.exp(-dt * 4);
      if (p.y < approachHeight) p.y = Math.min(approachHeight, p.y + dt * 8);
      else {
        const dx = destination.x - p.x, dz = destination.z - p.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 20);
        speed = 20;
        if (d > .05) { heading = Math.atan2(dx, dz); p.x += dx / d * step; p.z += dz / d * step; distance += step; }
        else { p.x = destination.x; p.z = destination.z; phase = 'landing'; speed = 0; }
      }
    } else if (phase === 'landing') {
      pitch=0;heading = destination.heading;p.x=destination.x;p.z=destination.z;p.y = Math.max(destination.y, p.y - dt * 8); if (p.y <= destination.y) park();
    }
    syncParked();
    mesh.rotation.set(-pitch, heading, bank,'YXZ');
    if (phase !== 'parked') mesh.userData.propeller.rotation.z += dt * 38;
    anchor(); sound.loop(phase === 'parked' ? null : 'engine', speed / 16);
  }
  function toggleHover(){if(phase!=='flying')return false;hovering=!hovering;if(hovering)speed=bank=pitch=0;return hovering;}
  return { start, leave, park, takeoff, toggleHover, returnHome, landAt, landNearest, exitPosition, update, syncParked,
    placePilot(root){root.position.fromArray(mesh.userData.seat||[0,.92,0]).applyEuler(mesh.rotation).add(mesh.position);root.rotation.copy(mesh.rotation);},
    get parked() { return phase === 'parked'; }, get heading() { return heading; }, get bank() { return bank; },
    status: () => ({ phase, hovering, speed, distance, launchMode,pitch,notice,aircraftId:mesh.name,aircraftName:mesh.userData.label,airport:parkedAt.id, airportName:parkedAt.name, destination:destination?.id || null, destinationName:destination?.name || null, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }) };
}
