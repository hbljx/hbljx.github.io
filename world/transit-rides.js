// Scheduled, distance-based services. Waiting, boarding, riding and arrival
// are separate phases: nobody is dropped on the water by E, Esc or a map tap.
export function createTransitRides({world,player,avatar,rig,sound}){
  const network=world.transit,services=network.services,position={},seat={};
  const serviceList=Object.values(services);
  let session=null,completed=null;
  const stopName=s=>s.name.replace(/（.*）/,'');
  function start(spot){
    if(session)return false;
    const service=services[spot.service],from=service.stops.findIndex(s=>s.id===spot.id);
    if(from<0)return false;
    const end=spot.end==='mountain'?'home':spot.end==='home'?'mountain':spot.returning?'home':'mountain';
    const destination=service.id==='metro'?1-from:service.stops.findIndex(s=>s.end===end&&!!s.returning===(end==='home'));
    session={service,from,destination,phase:'waiting',companionReady:false,boarding:0,exitPending:false,fromStop:service.stops[from]};
    completed=null;player.anchor(spot.at[0],spot.floor,spot.at[1],spot.service==='metro'?0:spot.returning?Math.PI/2:-Math.PI/2);return true;
  }
  function nextStop(service){
    if(service.id==='metro'){service.direction=service.index===0?1:-1;return 1-service.index;}
    return (service.index+1)%service.stops.length;
  }
  function remaining(service){
    const distance=(service.stops[service.next].s-service.s)*service.direction;
    return service.path.closed?(distance+service.path.length)%service.path.length:Math.max(0,distance);
  }
  function passenger(female=false,out=seat){
    const s=session,service=s.service,car=service.cars[service.id==='metro'?1:0].root;
    const h=car.rotation.y,along=service.id==='metro'?.8:.65,side=female?-.78:.78;
    out.x=car.position.x+Math.sin(h)*along+Math.cos(h)*side;
    out.z=car.position.z+Math.cos(h)*along-Math.sin(h)*side;out.y=car.position.y+(female?.25:.36);
    out.heading=h+(female?Math.PI/2:-Math.PI/2);return out;
  }
  function finish(stop,requested=false){
    session.phase='arrived';session.arrivalStop=stop;completed=requested?{x:stop.at[0],y:stop.floor,z:stop.at[1],heading:Math.PI}:null;
    for(const car of session.service.cars)car.roof.visible=true;
  }
  function update(dt){
    for(const service of serviceList){
      if(service.dwell>0){
        const boarding=session?.service===service&&session.from===service.index&&session.phase==='boarding';
        const readyWaiting=session?.service===service&&session.from===service.index&&session.phase==='waiting'&&session.companionReady;
        const awaitingExit=session?.service===service&&session.phase==='arrived';
        if(!boarding&&!readyWaiting&&!awaitingExit)service.dwell=Math.max(0,service.dwell-dt);
        service.speed=0;
        if(!service.dwell)service.next=nextStop(service);
      }else{
        const left=remaining(service),target=Math.min(service.maxSpeed,Math.sqrt(2*service.accel*left));
        service.speed+=Math.max(-service.accel*dt,Math.min(service.accel*dt,target-service.speed));
        const step=Math.min(left,service.speed*dt);
        service.s+=step*service.direction;if(service.path.closed)service.s=(service.s+service.path.length)%service.path.length;
        if(left-step<.025){
          service.s=service.stops[service.next].s;service.index=service.next;service.speed=0;service.dwell=7;
          if(session?.service===service&&session.phase==='riding'&&(session.exitPending||session.destination===service.index))finish(service.stops[service.index],session.exitPending);
        }
      }
      network.place(service);
      for(const car of service.cars)car.setDoors?.(service.dwell>0?1:0);
    }
    if(!session)return;
    const s=session,service=s.service;
    if(s.phase==='waiting'&&s.companionReady&&service.dwell>0&&service.index===s.from){s.phase='boarding';s.boarding=0;sound.effect('start');}
    if(s.phase==='boarding'){
      s.boarding=Math.min(1,s.boarding+dt/1.5);passenger(false,position);
      const t=s.boarding*s.boarding*(3-2*s.boarding),from=s.fromStop;
      player.anchor(from.at[0]+(position.x-from.at[0])*t,from.floor+(position.y-from.floor)*t,from.at[1]+(position.z-from.at[1])*t,position.heading);
      if(s.boarding===1){s.phase='riding';service.dwell=Math.max(service.dwell,1.2);rig.recenter(player,true);}
    }
    if(s.phase==='riding'||s.phase==='arrived'){passenger(false,position);player.anchor(position.x,position.y,position.z,position.heading);}

  }
  function stop(){
    if(!session)return completed;
    if(session.phase==='riding'){
      if(session.service.dwell>0&&session.service.speed===0)finish(session.service.stops[session.service.index],true);
      else {session.exitPending=true;return null;}
    }
    if(session.phase==='arrived')finish(session.arrivalStop,true);
    // Cancel boarding safely while the vehicle is still held at its platform.
    const from=session.fromStop,exit=completed||{x:from.at[0],y:from.floor,z:from.at[1],heading:player.heading};
    for(const car of session.service.cars)car.roof.visible=true;
    session=null;completed=null;return exit;
  }
  function pose(){
    if(!session)return;
    avatar.root.position.set(player.pos.x,player.y,player.pos.z);avatar.root.rotation.set(0,player.heading,0);
    if(session.phase==='riding'||session.phase==='arrived'){avatar.legL.rotation.x=avatar.legR.rotation.x=-Math.PI/2;avatar.armL.rotation.x=avatar.armR.rotation.x=-.4;}
  }
  function status(){
    if(!session)return null;
    const s=session,v=s.service,from=v.stops[s.from],to=v.stops[s.destination];
    const message=s.phase==='waiting'?(!s.companionReady?'在站台等女主，一起候车':`${stopName(from)} · 等待${v.id==='metro'?'地铁':'公交'}进站`):s.phase==='boarding'?'车门已打开 · 两人正在上车':s.phase==='arrived'?stopName(s.arrivalStop)+' · 已停稳，按 E 下车':`${stopName(to)}方向 · ${Math.round(v.speed*3.6)} km/h${s.exitPending?' · 下一站下车':''}`;
    return {service:v.id,phase:s.phase,atStop:v.dwell>0&&v.speed===0,from:from.id,destination:to.id,companionReady:s.companionReady,exitPending:s.exitPending,message,speed:v.speed,nextStop:v.stops[v.next].id,remaining:remaining(v)};
  }
  return {start,stop,update,pose,status,passenger,get session(){return session;},get readyToExit(){return !!completed;}};
}
