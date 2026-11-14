import { worldPage } from './world-page.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const {chromium}=await import(process.env.HOMECRAFT_PLAYWRIGHT||'playwright');
const url=process.argv[2]||readFileSync(new URL('./.serve-url',import.meta.url),'utf8').trim();
mkdirSync(new URL('./.check/',import.meta.url),{recursive:true});
const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(worldPage(url));await page.waitForFunction(()=>window.__home||window.__homeStartupError,null,{timeout:60000});
 const results=await page.evaluate(async()=>{
  if(window.__homeStartupError)throw new Error(window.__homeStartupError);
  const h=__home,w=h.world,c=w.carrier,f=w.aircraftFleet;
  h.rig.skipIntro();h.setTimeMode('day');h.setWeatherMode('clear');h.extras.household.routine.pause();
  const {createCruise}=await import('@world/carrier.js');
  const {createSailingArea,sampleCarrierPatrol,CARRIER_PATROL}=await import('@world/carrier-navigation.js');
  const {CREW_ROUTES}=await import('@world/carrier-crew.js');
  const checks={},details={},check=(name,ok)=>checks[name]=!!ok;
  const cruise=createCruise({world:w,player:{anchor(){}}}),area=createSailingArea(w,c.gangway),empty=new Set();
  check('berthIsClear',cruise.canSail(c.home.x,c.home.z,0));
  check('fixedPierShortened',c.gangway.x1-c.gangway.fixedEnd>30);
  c.update(0);check('boardingLinkDeployedAtBerth',c.boardingLink.visible&&c.driveHeight(80,c.home.z)===3.4);
  const point={};let clear=true,turns=true;
  for(let i=0;i<2048;i++){sampleCarrierPatrol(i/2048*Math.PI*2,point);clear&&=area.canSail(point.x,point.z,point.yaw);turns&&=area.turnSafe(point.x,point.z);}
  check('entireEllipseClearsScenery',clear);check('ellipseAllowsFullHullTurns',turns);
  check('sceneInsideEllipse',[[38,-42],[-36,31],[140,98],[-118,98],[24,268],[12,292]].every(([x,z])=>((x-CARRIER_PATROL.x)/CARRIER_PATROL.rx)**2+((z-CARRIER_PATROL.z)/CARRIER_PATROL.rz)**2<1));
  cruise.start();for(let i=0;i<30;i++)cruise.update(.05,new Set(['a']));
  details.manualTurn=cruise.status();
  check('manualTurningRespectsBerthClearance',c.mesh.rotation.y>.005&&cruise.canSail(c.mesh.position.x,c.mesh.position.z,c.mesh.rotation.y));
  cruise.stop();c.mesh.position.set(c.home.x,0,c.home.z);c.mesh.rotation.y=0;
  cruise.start();check('patrolStartsAtBerth',cruise.togglePatrol());
  let ticks=0,unsafe=0,orbitSamples=0,minSpeed=Infinity;
  while(cruise.status().patrolling&&cruise.status().lap<2&&ticks++<26000){
   cruise.update(.05,empty);const s=cruise.status();if(!cruise.canSail(s.x,s.z,s.heading))unsafe++;
   if(s.message==='外围椭圆巡航中'&&s.lap>=1){orbitSamples++;minSpeed=Math.min(minSpeed,s.speed);}
  }
  details.patrol={...cruise.status(),ticks,unsafe,minSpeed};
  check('twoLapsComplete',cruise.status().lap===2);check('noCollisionDuringPatrol',unsafe===0);check('continuousEllipseCruise',orbitSamples>100&&minSpeed>6.9);
  c.update(0);check('boardingLinkRetractedAtSea',!c.boardingLink.visible&&c.driveHeight(80,c.home.z)===null);
  check('returnStarts',cruise.returnHome());ticks=0;
  while(cruise.status().returning&&ticks++<16000)cruise.update(.05,empty);
  details.return={...cruise.status(),ticks};check('returnsToBerth',c.docked());cruise.stop();c.update(0);
  check('boardingLinkRestored',c.boardingLink.visible);
  const returns=[];
  for(const angle of [Math.PI/2,Math.PI,Math.PI*1.5]){
    sampleCarrierPatrol(angle,point);c.mesh.position.set(point.x,0,point.z);c.mesh.rotation.y=point.yaw;cruise.start();
    const started=cruise.returnHome();let frames=0;
    while(cruise.status().returning&&frames++<16000)cruise.update(.05,empty);
    returns.push({angle,started,docked:c.docked(),frames});cruise.stop();
  }
  details.returns=returns;check('returnFromEveryQuadrant',returns.every(r=>r.started&&r.docked));
  sampleCarrierPatrol(0,point);c.mesh.position.set(point.x,0,point.z);c.mesh.rotation.y=point.yaw;cruise.start();
  const resumed=cruise.togglePatrol();cruise.update(.05,empty);check('resumeAtExactOrbitPoint',resumed&&cruise.status().patrolling);
  cruise.stop();c.mesh.position.set(c.home.x,0,c.home.z);c.mesh.rotation.y=0;c.update(0);

  // Exercise the same taxi planner as both runway launch modes.
  check('allAircraftTaxiRoutesAvailable',f.planes.slice(1).every(p=>f.taxiRoute(p)!==null));
  let crewSafe=true,moved=false,worked=false;const crewActions=new Set(),crewProps=new Set(),first=c.crew.crew[0].z;
  for(let t=0;t<900;t++){
   c.crew.update(.1);
   for(const person of c.crew.crew){
    worked||=person.working;crewActions.add(person.action);if(person.gear)crewProps.add(person.gear);
    crewSafe&&=person.x< -6||person.x>2.3;
    for(const plane of f.planes.slice(1)){
     const p=c.toLocal(plane.position.x,plane.position.z);
     crewSafe&&=Math.abs(person.x-p.x)>plane.userData.halfSpan+.45||Math.abs(person.z-p.z)>plane.userData.halfLength+.45;
    }
   }
   moved||=Math.abs(c.crew.crew[0].z-first)>.5;
  }
  details.crew={actions:[...crewActions],props:[...crewProps],parts:c.crew.mesh.count};
  check('crewWalkAndInspect',moved&&worked);check('crewUsesVariedDuties',crewActions.size>=8&&crewProps.size>=3);check('crewHasDetailedParts',c.crew.mesh.count>600);check('crewClearOfAircraftAndRunway',crewSafe);
  check('crewHasSevenColors',new Set(c.crew.crew.map(p=>p.color)).size===7);
  check('crewAttachedToShip',c.crew.mesh.parent===c.mesh&&CREW_ROUTES.length===9);
  const {createFlight}=await import('@world/aircraft.js');
  const launches=[];
  for(const plane of f.planes.slice(1))for(const mode of ['vertical','catapult','ski-jump']){
    const flight=createFlight({mesh:plane,world:w,player:{anchor(){}},stage:h.stage,sound:{loop(){}}});
    flight.start();const started=flight.takeoff(mode);let frames=0,safe=true;
    while(started&&flight.status().phase!=='flying'&&frames++<2000){
      flight.update(.05,empty);c.crew.update(.05);
      if(plane.position.y<5.3){const local=c.toLocal(plane.position.x,plane.position.z);
        for(const person of c.crew.crew)safe&&=Math.abs(person.x-local.x)>plane.userData.halfSpan+.45||Math.abs(person.z-local.z)>plane.userData.halfLength+.45;
      }
    }
    if(started&&flight.status().phase==='flying'&&mode==='vertical'&&plane===f.planes[1]){
      const climb=new Set([' ']);for(let i=0;i<500;i++)flight.update(.05,climb);
      launches.push({plane:plane.name,mode,started,flying:true,crewClear:safe,altitude:plane.position.y});
      check('aircraft-altitude-has-no-ceiling',plane.position.y>78);
      flight.park();flight.leave();continue;
    }
    launches.push({plane:plane.name,mode,started,flying:flight.status().phase==='flying',crewClear:safe});flight.park();flight.leave();
  }
  details.launches=launches;check('allTwelveLaunchesComplete',launches.every(l=>l.started&&l.flying));check('crewClearDuringTaxiAndLaunch',launches.every(l=>l.crewClear));
  h.rig.showcase([135,63,145],[103,3.4,98]);for(let i=0;i<100;i++)h.rig.update(.05,h.player);
  return {checks,details};
 });
 await page.waitForTimeout(600);await page.screenshot({path:new URL('./.check/carrier-deck.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 results.errors=errors;console.log(JSON.stringify(results,null,2));
 writeFileSync(new URL('./.check/carrier.json',import.meta.url),JSON.stringify(results,null,2));
 if(errors.length||Object.values(results.checks).some(v=>!v))process.exitCode=1;
}finally{await browser.close();}


