import * as THREE from 'three';

export const AIRFIELD = { id: 'home', name: '三楼停机区', x: 12, y: 11, z: 0, heading: Math.PI, exit: { x: 16.5, y: 11, z: 2 } };

// Both boarding and collision follow the plane, including when parked on the mountain.
export function distanceToAirplane(mesh, x, z) {
  const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);
  return Math.hypot(Math.max(0,Math.abs(dx*c-dz*s)-3.7),Math.max(0,Math.abs(dx*s+dz*c)-3.2));
}
export function aircraftObstacle(mesh) {
  return (x,z,feet)=>{
    if(!mesh.userData.parked || Math.abs(feet-mesh.position.y)>=1.8)return false;
    const dx=x-mesh.position.x,dz=z-mesh.position.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);
    const side=Math.abs(dx*c-dz*s),along=dx*s+dz*c;
    return side<.75&&along>-3.2&&along<2.85 || side<3.7&&Math.abs(along+.35)<.85 || side<1.3&&Math.abs(along+2.65)<.45;
  };
}

function createCanopy() {
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
  const white = 0xe8e5d9, navy = 0x294b59, gold = 0xe3ae4e, black = 0x252b30;
  box(0, 1, 0, 1.05, .55, 4.8, white);
  box(0, 1.23, 1.35, .94, .45, 1.55, navy);
  box(0, 1.25, 2.3, .62, .32, .65, gold);
  box(0, 1, -2.6, .55, .4, 1.2, navy);
  box(0, 1.1, -.35, 7.4, .14, 1.5, white);
  for (const s of [-1, 1]) {
    box(s * 3.35, 1.12, -.35, .58, .17, 1.52, gold);
    box(s * .62, 1.53, -.3, .15, .65, 1.45, navy);
    box(s * .8, .49, .65, .08, .75, .09, navy);
    box(s * .8, .24, .65, .24, .48, .45, black);
    box(s * .1, .175, -2.65, .12, .35, .32, black);
  }
  // Rear gear reaches from the fuselage down to the axle between the two wheels.
  box(0,.56,-2.65,.10,.77,.12,navy);box(0,.175,-2.65,.38,.08,.10,navy);
  box(0, 1.5, -.55, .75, .12, .68, black);
  box(0, 1.82, -.9, .78, .55, .12, navy);
  box(0, 1.93, -2.6, .13, 1.6, .85, navy);
  box(0, 1.45, -2.65, 2.55, .11, .75, gold);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'airplane'; mesh.userData.group = 'aircraft'; mesh.userData.parked = true; mesh.castShadow = mesh.receiveShadow = true;
  const propeller = new THREE.Mesh(new THREE.BoxGeometry(.13, 2.05, .1), new THREE.MeshLambertMaterial({ color: black }));
  propeller.position.set(0, 1.25, 2.7); mesh.add(propeller);
  const canopy=createCanopy();mesh.add(canopy);mesh.userData.canopy=canopy;
  mesh.position.set(AIRFIELD.x, AIRFIELD.y, AIRFIELD.z); mesh.rotation.y = AIRFIELD.heading;
  mesh.userData.propeller = propeller;
  return mesh;
}

export function createFlight({ mesh, world, player, stage, sound }) {
  let phase = 'parked', heading = AIRFIELD.heading, speed = 0, distance = 0, bank = 0;
  const home = AIRFIELD;
  const fields = [home, world.mountain.airfield];
  let parkedAt=home,destination=null,launchHeight=18,approachHeight=65;
  const footprint = [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function clearance(x, z) {
    let height = 0;
    for (const [dx, dz] of footprint) {
      const surface = world.ground.topAt(x + dx, z + dz);
      height = Math.max(height, surface?.y || 0, world.thirdFloor.flightHeight(x + dx, z + dz));
    }
    return Math.max(18, height + 4);
  }
  function anchor() { player.anchor(mesh.position.x, mesh.position.y, mesh.position.z, heading); }
  function park(at = destination || parkedAt) {
    parkedAt=at; destination=null;
    phase = 'parked'; speed = bank = 0; heading = at.heading;
    mesh.position.set(at.x, at.y, at.z); mesh.rotation.set(0, heading, 0); mesh.userData.parked=true;
    mesh.castShadow = true; stage.renderer.shadowMap.needsUpdate = true; sound.loop(null);
  }
  function start() { mesh.userData.canopy.rotation.x=0;mesh.castShadow = false; stage.renderer.shadowMap.needsUpdate = true; anchor(); }
  function leave(){mesh.userData.canopy.rotation.x=-Math.PI/3;}
  function takeoff() { if (phase === 'parked') { launchHeight=Math.max(parkedAt.y+7,clearance(parkedAt.x,parkedAt.z)); phase = 'takeoff'; mesh.userData.parked=false; mesh.castShadow = false; stage.renderer.shadowMap.needsUpdate = true; } }
  function landAt(id) {
    const field=fields.find(f=>f.id===id);
    if(!field || phase==='parked' || destination===field)return;
    destination=field;phase='returning';
    approachHeight=Math.hypot(mesh.position.x-field.x,mesh.position.z-field.z)<5?Math.max(mesh.position.y,field.y+8):65;
  }
  function returnHome() { landAt('home'); }
  function landNearest() {
    if(destination || phase==='parked')return;
    const p=mesh.position;
    landAt(fields.reduce((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)<Math.hypot(p.x-b.x,p.z-b.z)?a:b).id);
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
    } else if (phase === 'flying') {
      const turn = Number(keys.has('a') || keys.has('arrowleft')) - Number(keys.has('d') || keys.has('arrowright'));
      heading += turn * dt * .72; bank += (-turn * .22 - bank) * Math.min(1, dt * 4);
      const target = keys.has('w') || keys.has('arrowup') ? 16 : keys.has('s') || keys.has('arrowdown') ? 4 : 8;
      speed += clamp(target - speed, -dt * 5, dt * 5);
      const x = p.x + Math.sin(heading) * speed * dt, z = p.z + Math.cos(heading) * speed * dt;
      const floor = clearance(x, z);
      const lift = Number(keys.has(' ')) - Number(keys.has('control') || keys.has('c'));
      p.y = clamp(p.y + (p.y < floor ? 6 : lift * 5) * dt, Math.min(p.y, floor), 78);
      if (p.y >= floor - .05 && x > -48 && x < 50 && z > -84 && z < 44) { p.x = x; p.z = z; distance += speed * dt; }
      else if (p.y >= floor - .05) heading += dt;
      // Descending over either marked pad also engages the landing approach.
      if(keys.has('c'))for(const field of fields)if(Math.hypot(p.x-field.x,p.z-field.z)<3 && p.y<=field.y+10){landAt(field.id);break;}
    } else if (phase === 'returning') {
      // Distant approaches clear the mountains; nearby pads need only a short alignment.
      bank *= Math.exp(-dt * 4);
      if (p.y < approachHeight) p.y = Math.min(approachHeight, p.y + dt * 8);
      else {
        const dx = destination.x - p.x, dz = destination.z - p.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 20);
        speed = 20;
        if (d > .05) { heading = Math.atan2(dx, dz); p.x += dx / d * step; p.z += dz / d * step; distance += step; }
        else { p.x = destination.x; p.z = destination.z; phase = 'landing'; speed = 0; }
      }
    } else if (phase === 'landing') {
      heading = destination.heading; p.y = Math.max(destination.y, p.y - dt * 8); if (p.y <= destination.y) park();
    }
    mesh.rotation.set(0, heading, bank);
    if (phase !== 'parked') mesh.userData.propeller.rotation.z += dt * 38;
    anchor(); sound.loop(phase === 'parked' ? null : 'engine', speed / 16);
  }
  return { start, leave, park, takeoff, returnHome, landAt, landNearest, exitPosition, update, get parked() { return phase === 'parked'; }, get heading() { return heading; }, get bank() { return bank; }, status: () => ({ phase, speed, distance, airport:parkedAt.id, airportName:parkedAt.name, destination:destination?.id || null, destinationName:destination?.name || null, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }) };
}
