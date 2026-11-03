import * as THREE from 'three';
import { outfits } from './wardrobe.js';
import { createPlayer } from '@engine/world/player.js';
import { createFemaleRoutine } from './female-routine.js';
import { createSharedQuilt } from './quilt.js';
import { createNpcNavigator } from './npc-navigation.js';
import { LIBRARY, BATH, createShower } from './shared-rooms.js';

const BED={x:-9.8,y:4,z:-9.3},IDLE={x:0,z:0,run:false},FIVE_MINUTES=300000;
const hours=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'});

// Articulated blocks share one instanced draw, including the face and long hair.
function createWoman(){
  const root=new THREE.Group(),body=new THREE.Group(),hand=new THREE.Object3D(),blob=new THREE.Object3D();root.name='female-companion';root.add(body);body.add(hand);
  const parts=[],skin=0xd9aa86,hair=0x3d2925,shirt=outfits.female.shirt,pants=outfits.female.pants;
  const part=(x,y,z,w,h,d,color,limb=0)=>parts.push({x,y,z,w,h,d,color,limb});
  part(0,1.02,0,.4,.65,.25,shirt);part(0,1.57,0,.44,.44,.43,skin);
  part(0,1.82,-.03,.49,.12,.48,hair);part(0,1.45,-.23,.48,.58,.1,hair);
  for(const x of [-.22,.22])part(x,1.51,0,.075,.49,.45,hair);
  part(-.11,1.73,.225,.24,.12,.04,hair);part(.16,1.72,.25,.08,.055,.035,outfits.female.accent);
  for(const x of [-.1,.1]){part(x,1.6,.224,.07,.045,.025,0x28232a);part(x,1.63,.226,.09,.022,.027,hair);}
  part(0,1.47,.225,.09,.025,.025,0xa96364);
  for(const s of [-1,1]){
    part(s*.105,.34,0,.19,.65,.22,pants,s);part(s*.105,.06,.035,.2,.12,.3,outfits.female.shoe,s);
    part(s*.3,1.03,0,.18,.4,.22,shirt,s*2);part(s*.3,.74,0,.17,.2,.21,skin,s*2);
  }
  part(0,.9,.13,.40,.06,.025,outfits.female.accent);
  part(.12,1.18,.135,.1,.13,.025,outfits.female.accent);
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial(),parts.length+64);mesh.receiveShadow=true;body.add(mesh);
  parts.forEach((p,i)=>mesh.setColorAt(i,new THREE.Color(p.color)));
  const dummy=new THREE.Object3D(),m=new THREE.Matrix4(),rot=new THREE.Matrix4(),inverse=new THREE.Matrix4(),color=new THREE.Color();let phase=0,swimsuit=false,eyesClosed=false;
  function setSwimsuit(on){
    if(swimsuit===on)return;swimsuit=on;
    for(let i=0;i<parts.length;i++){const p=parts[i],hex=on?(p.color===pants||p.color===shirt&&p.limb?skin:p.color===shirt?0x49a9d1:p.color):p.color;mesh.setColorAt(i,color.setHex(hex));}
    mesh.instanceColor.needsUpdate=true;
  }
  function update(dt,pose={}){
    phase+=dt*9;const stride=Math.min(1,pose.speed||0)*.6;mesh.count=parts.length;
    const swim=pose.swim;
    if(swim){body.rotation.set(swim.pitch,swim.roll,0);body.position.set(0,1-Math.cos(swim.pitch),-Math.sin(swim.pitch));}
    else {body.rotation.set(0,0,0);body.position.set(0,0,0);}
    for(let i=0;i<parts.length;i++){const p=parts[i];dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,(eyesClosed&&p.color===0x28232a) ? .012 : p.h,p.d);if(swimsuit&&p.color===0xe2d7c5)dummy.scale.set(0,0,0);dummy.rotation.set(0,0,0);dummy.updateMatrix();m.copy(dummy.matrix);
      if(p.limb){const leg=Math.abs(p.limb)===1,pivot=leg?.67:1.32;let angle=Math.sin(phase+(p.limb>0?0:Math.PI))*stride*(leg?1:-1);
        if(pose.activity)angle=leg?(pose.seated?-Math.PI/2:0):(p.limb>0?pose.right:pose.left);
        if(swim)angle=leg?Math.sin(phase*1.5+(p.limb>0?0:Math.PI))*.3:-1.5+Math.sin(phase*.65+(p.limb>0?0:Math.PI))*1.3;
        rot.makeTranslation(0,-pivot,0);m.premultiply(rot);rot.makeRotationX(angle);m.premultiply(rot);rot.makeTranslation(0,pivot,0);m.premultiply(rot);}
      mesh.setMatrixAt(i,m);
    }mesh.instanceMatrix.needsUpdate=true;
  }
  // Props share the character's instanced draw, including the ball in flight.
  mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),10);
  function beginProps(){root.updateMatrixWorld(true);inverse.copy(body.matrixWorld).invert();}
  function prop(x,y,z,w,h,d,hex,world=false,rx=0,ry=0){dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,0);dummy.updateMatrix();m.copy(dummy.matrix);if(world)m.premultiply(inverse);mesh.setMatrixAt(mesh.count,m);mesh.setColorAt(mesh.count++,color.setHex(hex));}
  function endProps(){mesh.instanceMatrix.needsUpdate=mesh.instanceColor.needsUpdate=true;}
  update(0);return{root,body,hand,blob,update,beginProps,prop,endProps,setSwimsuit,setEyesClosed(on){if(eyesClosed===on)return;eyesClosed=on;for(let i=0;i<parts.length;i++)if(parts[i].color===0x28232a){mesh.getMatrixAt(i,m);const k=on ? .012/.045 : .045/.012;for(let j=4;j<7;j++)m.elements[j]*=k;mesh.setMatrixAt(i,m);}mesh.instanceMatrix.needsUpdate=true;},get eyesClosed(){return eyesClosed;},get outfit(){return swimsuit?'swimsuit':'casual';}};
}

export function createHousehold({stage,world,player,avatar,nav,rig,sound},activities){
  const femaleAvatar=createWoman(),woman=createPlayer({avatar:femaleAvatar,nav,grid:world.grid,ground:world.ground});
  stage.scene.add(femaleAvatar.root);woman.restore(-1.5,0,5.8,Math.PI);
  const navigateWoman=createNpcNavigator(woman,world,nav);
  const routine=createFemaleRoutine({woman,avatar:femaleAvatar,activities,world,nav,stage,navigate:navigateWoman});
  const quilts=createSharedQuilt(),shower=createShower(stage.scene);stage.scene.add(quilts);
  const panel=document.createElement('aside');panel.id='shared-routine';panel.hidden=true;
  panel.innerHTML='<strong>睡前时光</strong><p role="status"></p><button type="button">取消 · E</button>';document.body.append(panel);
  const message=panel.querySelector('p'),cancel=panel.querySelector('button');cancel.addEventListener('click',wakeMale);
  let phase='idle',maleSleep=false,femaleSleep=false,reason=null,bathStarted=0,femaleWakeAt=0,bedtimeFirstPerson=false;
  let reading=false,readArrived=false,routeClock=0,clock=0,lastMove=Date.now(),lastNight=false,nightDismissed=false,sleepControl=false;
  const wakeButton=document.querySelector('[data-control="interact"]');
  wakeButton.addEventListener('click',e=>{if(phase!=='idle'||maleSleep){e.stopImmediatePropagation();wakeMale();}},{capture:true});
  const last={x:player.pos.x,y:player.y,z:player.pos.z},clockDate=new Date();let clockAt=0,night=false;
  const limbs=[avatar.legL,avatar.legR,avatar.armL,avatar.armR,avatar.head];
  const still={speed:0,fly:-1},pose={activity:true,seated:false,speed:0,left:0,right:0};
  const reached=(p,t)=>Math.abs(p.y-t.y)<.25&&Math.hypot(p.pos.x-t.x,p.pos.z-t.z)<.38;
  function covers(){
    world.preserveRoof=maleSleep||femaleSleep;avatar.setEyesClosed(maleSleep);femaleAvatar.setEyesClosed(femaleSleep);quilts.visible=maleSleep||femaleSleep;
    const controlled=phase!=='idle'||maleSleep;
    if(controlled){wakeButton.hidden=false;wakeButton.setAttribute('aria-label',maleSleep?'起床 · E':'取消睡前流程 · E');}
    else if(sleepControl){const nearby=activities.spots.find(s=>s.id===activities.status().nearby);wakeButton.hidden=!nearby;wakeButton.setAttribute('aria-label',`${nearby?.title.split(' · ').at(-1)||'互动'} · E`);}
    sleepControl=controlled;panel.hidden=!controlled;
    if(!controlled)return;
    let text=phase==='to-bath'?'一起前往浴室，到齐后开始沐浴':phase==='to-bed'?'沐浴结束，一起上楼睡觉':'两个人正在休息';
    if(phase==='bathing'){const left=Math.ceil(Math.max(0,BATH.duration-(Date.now()-bathStarted))/1000);text=`一起沐浴 · ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')} · 结束后上楼睡觉`;}
    if(message.textContent!==text)message.textContent=text;
    const cancelText=maleSleep?'起床 · E':'取消 · E';if(cancel.textContent!==cancelText)cancel.textContent=cancelText;
  }
  function sleepingPose(a,x){a.root.position.set(x,4.78,-8.55);a.root.rotation.set(0,0,0);if(a===avatar)for(const limb of limbs)limb.rotation.set(0,0,0);a.body.rotation.set(-Math.PI/2,0,0);a.body.position.set(0,Math.sin(clock*1.3)*.008,0);}
  function resetBath(){shower.update(0,false);avatar.setBathing(false);femaleAvatar.setSwimsuit(false);sound.loop(null);}
  function leaveReading(){
    if(!reading)return;const wasSeated=readArrived;reading=readArrived=false;woman.cancel();if(wasSeated)woman.restore(LIBRARY.approach.x,0,LIBRARY.approach.z,0);femaleAvatar.update(0,still);routine.resume();
  }
  function wakeWoman(){
    const inBed=femaleSleep;femaleSleep=false;femaleWakeAt=0;woman.cancel();femaleAvatar.setEyesClosed(false);femaleAvatar.body.rotation.set(0,0,0);femaleAvatar.body.position.set(0,0,0);
    if(inBed)woman.restore(BED.x,4,BED.z,0);routine.resume();
  }
  function wakeMale(){
    lastMove=Date.now();nightDismissed=true;
    if(phase==='idle'&&!maleSleep)return false;
    phase='idle';player.cancel();resetBath();
    if(maleSleep){maleSleep=false;avatar.body.rotation.set(0,0,0);avatar.body.position.set(0,0,0);avatar.update(0,still);player.restore(BED.x,4,BED.z,0);rig.recenter(player,true);}
    else avatar.update(0,still);
    if(femaleSleep)femaleWakeAt=Date.now()+5000;else wakeWoman();
    rig.setFirstPerson(bedtimeFirstPerson,player.heading);covers();return true;
  }
  function begin(cause='manual'){
    if(phase!=='idle'||maleSleep)return false;
    if(activities.active&&!activities.stop(false))return false;
    leaveReading();if(femaleSleep)wakeWoman();routine.pause();femaleWakeAt=0;reason=cause;phase='to-bath';bathStarted=0;routeClock=1;
    if(!window.__home?.navigate(BATH.male.x,BATH.male.z,0)){phase='idle';routine.resume();return false;}
    bedtimeFirstPerson=rig.firstPerson;rig.setFirstPerson(false);
    return true;
  }
  activities.setBedtimeHandler(begin);
  function frameBath(){
    if(phase!=='bathing')return;
    const portrait=innerWidth<720&&innerHeight>innerWidth;
    rig.showcase(portrait?[-8.95,9,-19.4]:[-5,4.8,-17.1],portrait?[-8.95,1.3,-25.5]:[-9,1.3,-24.6],{interactive:true});
  }
  addEventListener('resize',frameBath);
  function guide(){
    if(phase!=='to-bath'&&phase!=='to-bed')return;
    const male=phase==='to-bath'?BATH.male:BED,female=phase==='to-bath'?BATH.female:BED;
    if(!maleSleep&&!player.travelling&&!reached(player,male))window.__home?.navigate(male.x,male.z,male.y);
    if(!femaleSleep&&!woman.travelling&&!reached(woman,female))navigateWoman(female.x,female.y,female.z);
  }
  function bathingPose(dt){
    avatar.root.position.set(BATH.male.x,0,BATH.male.z);avatar.root.rotation.set(0,Math.PI,0);avatar.body.position.set(0,0,0);avatar.body.rotation.set(0,0,0);
    for(const limb of limbs)limb.rotation.set(0,0,0);
    avatar.armL.rotation.x=-.7+Math.sin(clock*2)*.25;avatar.armR.rotation.x=-1.1-Math.sin(clock*2)*.25;avatar.head.rotation.x=.1;
    femaleAvatar.root.position.set(BATH.female.x,0,BATH.female.z);femaleAvatar.root.rotation.set(0,Math.PI,0);
    pose.seated=false;pose.left=-1.1+Math.sin(clock*2)*.25;pose.right=-.7-Math.sin(clock*2)*.25;femaleAvatar.update(dt,pose);
    sound.loop('shower',.35);shower.update(dt,true);
  }
  function library(dt){
    if(!reading){routine.pause();reading=true;readArrived=false;routeClock=1;}
    if(!readArrived){
      if(!woman.travelling)navigateWoman(LIBRARY.approach.x,0,LIBRARY.approach.z);
      woman.update(dt,IDLE,0);
      if(reached(woman,LIBRARY.approach)){woman.cancel();woman.anchor(...LIBRARY.female,Math.PI);readArrived=true;}
    }
    activities.setSharedStatus(readArrived?'两个人正在一起看书':'女主正在前来，一起看书');
    if(!readArrived)return;
    femaleAvatar.root.position.set(...LIBRARY.female);femaleAvatar.root.rotation.set(0,Math.PI,0);
    pose.seated=true;pose.left=pose.right=-1.15;femaleAvatar.update(dt,pose);femaleAvatar.beginProps();
    femaleAvatar.prop(0,1.02,.43,.58,.035,.37,0x416754,false,.2);
    femaleAvatar.prop(0,1.05,.43,.54,.04,.34,0xf4e8ca,false,.2);
    femaleAvatar.prop(0,1.08,.43,.025,.015,.34,0xc3aa76,false,.2);femaleAvatar.endProps();
  }
  let riding=null,boarding=null;
  function sharedRide(dt){
    const v=activities.ride;
    if(!v){
      if(riding){if(riding.passengerReady){const g=world.ground.nearestStand(player.pos.x,player.pos.z+.8,player.y);woman.restore(g?.x??player.pos.x,g?.y??player.y,g?.z??player.pos.z,player.heading);}else woman.cancel();femaleAvatar.update(0,still);riding=null;routine.resume();}
      return false;
    }
    const car=v.mesh,h=car.rotation.y+Math.PI/2;
    if(riding!==v){leaveReading();if(femaleSleep)wakeWoman();routine.pause();riding=v;boarding={x:car.position.x-Math.cos(h)*(v.halfWidth+.8),y:car.position.y,z:car.position.z+Math.sin(h)*(v.halfWidth+.8)};}
    if(!v.passengerReady){
      if(!woman.travelling)navigateWoman(boarding.x,boarding.y,boarding.z);
      woman.update(dt,IDLE,0);
      if(reached(woman,boarding)){woman.cancel();v.passengerReady=true;}
      return true;
    }
    const bike=v.id==='motorcycle',forward=bike?-.98:v.id==='roadster'?-.66:-.4,side=bike?0:.48;
    const x=car.position.x+Math.sin(h)*forward-Math.cos(h)*side,z=car.position.z+Math.cos(h)*forward+Math.sin(h)*side;
    woman.anchor(x,car.position.y,z,h);femaleAvatar.root.position.set(x,car.position.y+(bike?.38:v.id==='roadster'?.08:-.3),z);femaleAvatar.root.rotation.set(0,h,0);
    pose.seated=true;pose.left=pose.right=bike?-.8:-.4;femaleAvatar.update(dt,pose);return true;
  }
  function update(dt){
    clock+=dt;
    if(sharedRide(dt)){lastMove=Date.now();covers();return;}
routeClock+=dt;const now=Date.now();
    if(femaleWakeAt&&now>=femaleWakeAt)wakeWoman();
    if(Math.abs(now-clockAt)>=1000){clockAt=now;clockDate.setTime(now);const hour=Number(hours.format(clockDate));night=hour>=22||hour<7;}
    if(!night&&lastNight){if(reason==='night')wakeMale();nightDismissed=false;}
    if(night&&!lastNight)nightDismissed=false;lastNight=night;
    if(Math.hypot(player.pos.x-last.x,player.pos.z-last.z,player.y-last.y)>.025||player.moving||activities.active)lastMove=now;
    last.x=player.pos.x;last.y=player.y;last.z=player.pos.z;
    if(phase==='idle'&&!maleSleep&&!activities.active&&!rig.introActive&&(night&&!nightDismissed||now-lastMove>=FIVE_MINUTES))begin(night?'night':'idle');
    if(activities.current==='library'&&phase==='idle')library(dt);
    else{
      leaveReading();
      if(phase==='to-bath'||phase==='to-bed'){
        if(routeClock>.75){routeClock=0;guide();}
        if(!femaleSleep)woman.update(dt,IDLE,0);
        if(phase==='to-bath'&&reached(player,BATH.male)&&reached(woman,BATH.female)){
          player.cancel();woman.cancel();player.anchor(BATH.male.x,0,BATH.male.z,Math.PI);woman.anchor(BATH.female.x,0,BATH.female.z,Math.PI);
          phase='bathing';bathStarted=now;avatar.setBathing(true);femaleAvatar.setSwimsuit(true);frameBath();
        }
        if(phase==='to-bed'){
          if(!maleSleep&&reached(player,BED)){player.cancel();maleSleep=true;player.anchor(-11.24,4,-9.3,0);rig.recenter(player,true);rig.showcase(innerWidth<720&&innerHeight>innerWidth?[-3,11,3]:[-6.5,8.7,-4.9],[-12,4.9,-9.3],{interactive:true});}
          if(!femaleSleep&&reached(woman,BED)){woman.cancel();femaleSleep=true;woman.anchor(-12.76,4,-9.3,0);femaleAvatar.update(0,still);}
          if(maleSleep&&femaleSleep)phase='sleeping';
        }
      }else if(phase==='idle'&&!femaleSleep&&!femaleWakeAt)routine.update(dt);
    }
    if(phase==='bathing'){
      bathingPose(dt);
      if(now-bathStarted>=BATH.duration){resetBath();phase='to-bed';routeClock=1;avatar.update(0,still);guide();}
    }
    if(maleSleep)sleepingPose(avatar,-11.24);if(femaleSleep)sleepingPose(femaleAvatar,-12.76);covers();
  }
  return{update,wakeMale,begin,woman,femaleAvatar,quilts,routine,shower,
    get sleeping(){return maleSleep;},get bathing(){return phase==='bathing';},get walking(){return phase!=='idle'&&phase!=='sleeping';},
    status:()=>({phase,male:maleSleep?'sleeping':phase==='idle'?'awake':phase==='to-bath'?'going-to-bath':phase==='to-bed'?'going-to-bed':phase,
      female:riding?(riding.passengerReady?'riding':'boarding'):femaleSleep?'sleeping':reading?(readArrived?'reading':'going-to-library'):phase==='idle'?'awake':phase,
      bathRemaining:phase==='bathing'?Math.max(0,(BATH.duration-(Date.now()-bathStarted))/1000):null,bathDuration:BATH.duration/1000,
      femaleWakeIn:femaleWakeAt?Math.max(0,(femaleWakeAt-Date.now())/1000):null,femaleActivity:routine.status(),reason,idleMs:Date.now()-lastMove,night:lastNight})};
}
