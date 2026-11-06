import {chromium} from 'playwright';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const url=process.argv[2]||readFileSync(new URL('./.serve-url',import.meta.url),'utf8').trim();
const out=fileURLToPath(new URL('./.check/',import.meta.url));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
let failed=false;
try{
 for(const mobile of [false,true]){
  const name=mobile?'phone':'computer',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:960},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>window.__home||window.__homeStartupError,null,{timeout:60000});
  const result=await page.evaluate(async()=>{
   if(window.__homeStartupError)return{startup:window.__homeStartupError};
   const h=__home,a=h.extras.activities,house=h.extras.household,p=h.player,w=house.woman,t=h.world.transit,empty={x:0,z:0,run:false};
   const THREE=await import('three');
   const {CARRIER_HOME,GARAGE,STATIONS}=await import('@world/layout.js');
   const {TUNNEL_RADIUS}=await import('@world/tunnel-glazing.js');
   const checks={},details={},check=(name,ok)=>checks[name]=!!ok,key=k=>({key:k,repeat:false});
   h.rig.skipIntro();h.setTimeMode('day');h.setWeatherMode('clear');house.routine.pause();
   const vehicleColors=[0xf0eee8,0x252a30,0x8b969c,0xb82f36,0x285a91,0x176b59,0xd5ad3f,0xc86b32,0x694b82,0x52615e];
   const metroColors=t.services.metro.cars.map(car=>car.paintColor),busColor=t.services.bus.cars[0].paintColor;
   details.transitColors={metro:metroColors,bus:busColor};
   check('metroUsesOneOfTenColors',metroColors.every(color=>vehicleColors.includes(color)));
   check('metroCarsShareColor',metroColors.every(color=>color===metroColors[0]));
   check('busUsesOneOfTenColors',vehicleColors.includes(busColor));
   // Snow exposes coplanar approach/bridge faces as flashing dark stripes.
   // Each sampled road point needs exactly one y=0 face, including both
   // sides of the seams, so removing the overlap cannot leave a hole.
   const pavementRay=new THREE.Raycaster(),pavementSamples=[];
   h.stage.scene.updateMatrixWorld(true);
   for(const [x,z]of [[16,151],[32,151],[16,156],[32,156],[35,156],[12,151],[36,151],[14.95,153.3],[15.05,153.3],[32.95,153.3],[33.05,153.3],[35,154.95],[35,155.05],[53.95,157.3],[54.05,157.3]]){
    pavementRay.set(new THREE.Vector3(x,.2,z),new THREE.Vector3(0,-1,0));
    const faces=pavementRay.intersectObjects(h.stage.scene.children,true).filter(hit=>Math.abs(hit.point.y)<.001);
    const floor=h.world.ground.surfaceAt(x,z,0);
    pavementSamples.push({x,z,faces:faces.length,walkable:!!floor&&Math.abs(floor.y)<.001});
   }
   details.mountainPavement=pavementSamples;
   check('mountainPavementSingleSurface',pavementSamples.every(s=>s.faces===1));
   check('mountainPavementWalkable',pavementSamples.every(s=>s.walkable));
   const tick=()=>{a.update(.05);house.update(.05);};
   const walk=(x,y,z)=>{const ok=h.navigate(x,z,y);let flew=false;for(let i=0;i<5000&&p.travelling;i++){p.update(.05,empty,0);flew ||=p.flying;}return ok&&!flew&&!p.travelling&&Math.hypot(p.pos.x-x,p.pos.z-z)<.3&&Math.abs(p.y-y)<.2;};
   const ride=(id,abort=false)=>{
    const label=id+(abort?'-early':'');a.keyDown(key('e'));check(label+'-start',a.current===id);if(!a.active)return;
    const phases=new Set();let requested=false,requests=0;
    for(let i=0;i<6500&&a.active;i++){
     tick();const s=a.transit.session;if(!s)break;phases.add(s.phase);
     if(!abort&&s.phase==='arrived'){const before={x:p.pos.x,z:p.pos.z};for(let j=0;j<200;j++)tick();check(id+'-waitsForE',!!a.active&&s.service.speed===0&&Math.hypot(p.pos.x-before.x,p.pos.z-before.z)<.01);a.keyDown(key('e'));house.update(.05);break;}
     if(abort&&!requested&&s.phase==='riding'&&s.service.speed>2){requested=true;requests++;check(id+'-safeExitRequest',a.stop()===false&&a.active&&s.exitPending);}
    }
    details[label]={phases:[...phases],state:a.transit.status(),x:p.pos.x,y:p.y,z:p.pos.z,femaleX:w.pos.x,femaleY:w.y,femaleZ:w.pos.z,requests};
    check(label+'-completed',!a.active&&phases.has('waiting')&&phases.has('boarding')&&phases.has('riding'));
    check(label+'-together',Math.hypot(p.pos.x-w.pos.x,p.pos.z-w.pos.z)<1.5&&Math.abs(p.y-w.y)<.3);house.routine.pause();
   };
   check('referenceSides',t.tunnel.path.samples.every(v=>v.x>24)&&t.services.metro.path.samples.every(v=>v.x<24));
   check('metroRailAboveSubmarinePatrol',Math.max(...t.services.metro.path.samples.map(v=>v.y))>17.5);
   const garageCenter=(GARAGE.door.z0+GARAGE.door.z1)/2,entry=t.tunnel.path.sample(0,{}),entryAhead=t.tunnel.path.sample(8,{});
   check('garageFacesTunnel',Math.abs(entry.z-garageCenter)<.01&&Math.abs(entry.heading-Math.PI/2)<.01&&entry.x-GARAGE.x1<=6);
   check('straightLevelTunnelEntry',Math.abs(entryAhead.z-garageCenter)<.01&&entryAhead.y===0);
   const tunnelStation=STATIONS.find(s=>s.id==='sea-tunnel');
   check('tunnelMarkerAtGarage',Math.abs(tunnelStation.at[1]-garageCenter)<.01&&tunnelStation.look[0]>entry.x);
   // Check the full tunnel, including both approaches: fixed endpoints and
   // one convex half-turn, without the old S-bend before the main sea arc.
   const tunnelSamples=t.tunnel.path.samples,exit=tunnelSamples.at(-1);
   check('tunnelEndpointsUnchanged',Math.hypot(entry.x-36,entry.y,entry.z+6.5)<1e-8&&Math.hypot(exit.x-60,exit.y,exit.z-158)<1e-8);
   let reverseTurn=0,totalTurn=0,maxTurn=0;
   for(let i=1;i<tunnelSamples.length-1;i++){
    const a=tunnelSamples[i-1],b=tunnelSamples[i],c=tunnelSamples[i+1];
    const ax=b.x-a.x,az=b.z-a.z,bx=c.x-b.x,bz=c.z-b.z;
    const turn=Math.atan2(ax*bz-az*bx,ax*bx+az*bz);
    totalTurn+=turn;reverseTurn+=Math.max(0,-turn);maxTurn=Math.max(maxTurn,Math.abs(turn));
   }
   details.tunnelBend={reverseTurn,totalTurn,maxTurn};
   // Allow tiny spline interpolation drift where the arc meets a straight.
   check('tunnelSingleCShape',reverseTurn<.02&&Math.abs(totalTurn-Math.PI)<.02&&maxTurn<.04&&tunnelSamples.every((p,i)=>!i||p.z>=tunnelSamples[i-1].z-.01));
   const metroArc=t.services.metro.path.samples.filter(p=>p.x<=-45);
   const metroError=Math.max(...metroArc.map(p=>Math.abs(Math.hypot(p.x+45,p.z-99.5)-66.5)));
   details['metro-arcRadiusError']=metroError;
   check('metro-semicircle',metroArc.length>150&&metroError<.08);
   // Test the whole map berth, including its corners, against the tunnel's
   // outer wall rather than just checking whether the centreline crosses it.
   let harborGap=Infinity;
   for(let s=0;s<=t.tunnel.path.length;s+=.25){
    const p=t.tunnel.path.sample(s,{});
    const dx=Math.max(0,Math.abs(p.x-CARRIER_HOME.x)-7.6),dz=Math.max(0,Math.abs(p.z-CARRIER_HOME.z)-32.5);
    harborGap=Math.min(harborGap,Math.hypot(dx,dz)-TUNNEL_RADIUS);
   }
   details.tunnelHarborClearance=harborGap;
   check('tunnelClearsCarrierHarbor',harborGap>=12);
   check('threeCarriages',t.services.metro.cars.length===3);
   let busHits=0;const fixtures=h.world.obstacles.filter(o=>o.bridgeFixture),bp=t.services.bus.path;
   for(let d=0;d<bp.length;d+=.2){const p=bp.sample(d,{}),si=Math.sin(p.heading),co=Math.cos(p.heading);for(const o of fixtures){const x=(o.x0+o.x1)/2-p.x,z=(o.z0+o.z1)/2-p.z,w=(o.x1-o.x0)/2,l=(o.z1-o.z0)/2;if(Math.abs(x)>3.1*Math.abs(si)+1.25*Math.abs(co)+w||Math.abs(z)>3.1*Math.abs(co)+1.25*Math.abs(si)+l||Math.abs(x*si+z*co)>3.1+w*Math.abs(si)+l*Math.abs(co)||Math.abs(x*co-z*si)>1.25+w*Math.abs(co)+l*Math.abs(si))continue;busHits++;}}
   check('busClearsPlatformBenches',busHits===0);
   check('vehicleGlass',[...t.services.metro.cars,...t.services.bus.cars].every(c=>c.glazing&&c.glazing.material.transparent&&c.glazing.geometry.attributes.position.count>60));
   const bm=t.stops.find(s=>s.id==='bus-mountain'),br=t.stops.find(s=>s.id==='bus-mountain-return'),mm=t.stops.find(s=>s.id==='metro-mountain');
   check('spacedMountainStations',Math.hypot(bm.at[0]-t.tunnel.exit.x,bm.at[1]-t.tunnel.exit.z)>23&&Math.hypot(...mm.at.map((v,i)=>v-br.at[i]))>40&&Math.abs(bm.at[0]-br.at[0])>=25);
   const mask=t.tunnel.waterMask,texture=mask.mask.image;let wet=0;
   for(let d=5;d<t.tunnel.path.length-5;d+=.5){const q=t.tunnel.path.sample(d,{}),height=mask.waterY-q.y;if(height<.12||height>5.6)continue;const i=Math.floor((q.x-mask.bounds.x0)/(mask.bounds.x1-mask.bounds.x0)*texture.width),j=Math.floor((q.z-mask.bounds.z0)/(mask.bounds.z1-mask.bounds.z0)*texture.height);if(texture.data[j*texture.width+i]<128)wet++;}
   check('dryRamps',wet===0);
   const roofMisses=[],roofBlockers=[],ray=new THREE.Raycaster(),m=new THREE.Matrix4(),size=new THREE.Vector3(),position=new THREE.Vector3(),rotation=new THREE.Quaternion();h.stage.scene.updateMatrixWorld(true);
   for(let d=5.5;d<t.tunnel.path.length-5;d+=5){const q=t.tunnel.path.sample(d,{});for(const side of [-3,0,3]){ray.set(new THREE.Vector3(q.x+Math.cos(q.heading)*side,q.y+1.8,q.z-Math.sin(q.heading)*side),new THREE.Vector3(0,1,0));const roof=ray.intersectObject(t.tunnel.shell)[0];if(!roof){roofMisses.push(d);continue;}for(const hit of ray.intersectObjects(h.stage.scene.children,true)){if(hit.distance>=roof.distance)break;if(hit.object.isInstancedMesh){hit.object.getMatrixAt(hit.instanceId,m);m.decompose(position,rotation,size);if(size.x>20&&size.z>20)roofBlockers.push(d);}}}}
   check('continuousGlassRoof',roofMisses.length===0);check('noSeabedThroughGlass',roofBlockers.length===0);
   p.teleport(.5,5.8);check('walkToHomeMetro',walk(-28,0,28.5));ride('metro-home');check('metroArrivesAtMountain',Math.hypot(p.pos.x+30,p.pos.z-170)<.3);
   check('mountainMetroToBus',walk(br.at[0],br.floor,br.at[1]));check('mountainBusToMetro',walk(mm.at[0],mm.floor,mm.at[1]));ride('metro-mountain');check('metroReturnsHome',Math.hypot(p.pos.x+28,p.pos.z-28.5)<.3);
   check('walkToHomeBus',walk(28.05,0,29));ride('bus-home');check('busArrivesAtMountain',Math.hypot(p.pos.x-36.5,p.pos.z-154)<.3);
   check('crossMountainBusStop',walk(11.5,0,154));ride('bus-mountain-return');check('busReturnsHome',Math.hypot(p.pos.x-19.95,p.pos.z-29)<.3);
   check('walkToBridgeBus',walk(28.05,6,86));ride('bus-bridge');check('bridgeBusReachesMountain',Math.hypot(p.pos.x-36.5,p.pos.z-154)<.3);
   check('walkToHomeForEarlyExit',walk(28.05,0,29));ride('bus-home',true);check('exitAtBridgeStop',Math.hypot(p.pos.x-28.05,p.pos.z-86)<.3);
   check('cancelWaitStart',a.start('bus-bridge'));check('cancelWait',a.stop()&&!a.active);house.update(.05);house.routine.pause();
   for(const id of ['bus-mountain','bus-home-return']){const s=t.stops.find(v=>v.id===id);p.restore(s.at[0],s.floor,s.at[1],0);check(id+'-terminalDestination',a.start(id)&&a.transit.status().destination===(id==='bus-mountain'?'bus-home-return':'bus-mountain'));a.stop();house.update(.05);house.routine.pause();}
   const inside=t.tunnel.path.sample(55,{});
   p.restore(26,0,158,0);check('mountainToTunnelOnFoot',walk(inside.x,inside.y,inside.z));
   check('tunnelExitToHomeOnFoot',walk(t.tunnel.homeRelease.x,0,t.tunnel.homeRelease.z));
   check('homeToTunnelOnFoot',walk(inside.x,inside.y,inside.z));
   check('tunnelToGarageOnFoot',walk(26,0,garageCenter));
   // Exercise the actual driving controller and its guide in BOTH directions.
   const path=t.tunnel.path,car=h.world.animated.car,origin=path.sample(3,{});
   p.restore(car.position.x,0,car.position.z+2,Math.PI/2);
   w.restore(car.position.x,0,car.position.z-2,Math.PI/2);
   check('tunnelEnterCar',a.start('driving'));
   if(a.current==='driving'){
    for(let i=0;i<1500&&!a.ride.passengerReady;i++)tick();check('tunnelCompanionBoards',a.ride.passengerReady);
    const garageBlocked=[];for(let x=car.position.x;x<=origin.x;x+=.25)if(!a.canDrive(x,garageCenter,Math.PI/2))garageBlocked.push(x);
    details.garageBlocked=garageBlocked;check('continuousGarageApproach',!garageBlocked.length);
    a.keyDown(key('w'));for(let i=0;i<300&&car.position.x<origin.x;i++)tick();a.keyUp(key('w'));
    a.keyDown(key(' '));for(let i=0;i<12;i++)tick();a.keyUp(key(' '));
    check('driveStraightFromGarageToTunnel',car.position.x>=origin.x&&Math.abs(car.position.z-garageCenter)<.01&&t.tunnel.contains(car.position.x,car.position.z,1));
    const invalid=[];for(let s=4;s<path.length-3;s+=1){const q=path.sample(s,{});if(!a.canDrive(q.x,q.z,q.heading))invalid.push({s,x:q.x,y:q.y,z:q.z});}
    details.invalidTunnelSamples=invalid;check('continuousDrivableTunnel',!invalid.length);
    const mid=path.sample(path.length/2,{});check('tunnelBelowSea',mid.y<-10);
    check('tunnelGuardrail',!a.canDrive(mid.x+Math.cos(mid.heading)*5,mid.z-Math.sin(mid.heading)*5,mid.heading));
    for(const direction of ['outbound','return']){
     a.keyDown(key('t'));let deepest=0;
     for(let i=0;i<4500;i++){tick();deepest=Math.min(deepest,car.position.y);const loc=path.project(car.position.x,car.position.z,{});if(direction==='outbound'?loc.s>path.length-.5:loc.s<.5)break;}
     const loc=path.project(car.position.x,car.position.z,{});details['tunnel-'+direction]={s:loc.s,length:path.length,y:car.position.y,deepest,status:document.querySelector('.activity-status').textContent};
     check('tunnel-'+direction,(direction==='outbound'?loc.s>path.length-.6:loc.s<.6)&&deepest<-10);
     for(let i=0;i<30;i++)tick();
    }
    a.keyDown(key('w'));for(let i=0;i<150&&car.position.x>GARAGE.x1-4;i++)tick();a.keyUp(key('w'));
    a.keyDown(key(' '));for(let i=0;i<12;i++)tick();a.keyUp(key(' '));
    check('driveStraightBackIntoGarage',car.position.x<GARAGE.x1-3&&Math.abs(car.position.z-garageCenter)<.2);
    check('safeTunnelCarExit',a.stop()&&!a.active);house.update(.05);
   }
   return{checks,details,failures:Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name)};
  });
  failed ||=!!result.startup||!!result.failures?.length;
  // Check the garage-to-tunnel alignment at both desktop and phone sizes.
  await page.evaluate(()=>{const h=__home;h.rig.showcase([68,30,-36],[38,0,-6.5]);for(let i=0;i<80;i++)h.rig.update(.05,h.player);});
  await page.screenshot({path:out+'transit-'+name+'-garage.png'});
  // A readable station view, followed by the complete schematic map.
  await page.evaluate(()=>{const h=__home;h.rig.showcase([-45,12,12],[-28,1,32]);for(let i=0;i<80;i++)h.rig.update(.05,h.player);});
  await page.screenshot({path:out+'transit-'+name+'-station.png'});
  await page.locator('#minimap .expand').click();await page.waitForTimeout(200);await page.screenshot({path:out+'transit-'+name+'-map.png'});
  await page.reload();await page.waitForFunction(()=>window.__home||window.__homeStartupError,null,{timeout:60000});
  const reloadedColors=await page.evaluate(()=>({metro:__home.world.transit.services.metro.cars.map(car=>car.paintColor),bus:__home.world.transit.services.bus.cars[0].paintColor}));
  result.details.transitColorsAfterReload=reloadedColors;
  result.checks.metroChangesOnReload=reloadedColors.metro[0]!==result.details.transitColors.metro[0];
  result.checks.busChangesOnReload=reloadedColors.bus!==result.details.transitColors.bus;
  result.failures=Object.entries(result.checks).filter(([,ok])=>!ok).map(([check])=>check);
  console.log(name+': '+JSON.stringify(result));failed ||=!!result.failures.length;
  const stats=await page.evaluate(()=>__home.stats());console.log(name+' stats: '+JSON.stringify(stats));console.log(name+' errors: '+JSON.stringify(errors));
  writeFileSync(out+'transit-'+name+'.json',JSON.stringify({result,stats,errors},null,2));failed ||=!!errors.length;
  await context.close();
 }
}finally{await browser.close();}
process.exitCode=failed?1:0;
