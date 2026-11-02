import * as THREE from 'three';
import { outfits } from './wardrobe.js';
import { createPlayer } from '@engine/world/player.js';
import { createFemaleRoutine } from './female-routine.js';
import { createSharedQuilt } from './quilt.js';
import { createNpcNavigator } from './npc-navigation.js';

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
  const dummy=new THREE.Object3D(),m=new THREE.Matrix4(),rot=new THREE.Matrix4(),inverse=new THREE.Matrix4(),color=new THREE.Color();let phase=0,swimsuit=false;
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
    for(let i=0;i<parts.length;i++){const p=parts[i];dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);if(swimsuit&&p.color===0xe2d7c5)dummy.scale.set(0,0,0);dummy.rotation.set(0,0,0);dummy.updateMatrix();m.copy(dummy.matrix);
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
  update(0);return{root,body,hand,blob,update,beginProps,prop,endProps,setSwimsuit,get outfit(){return swimsuit?'swimsuit':'casual';}};
}

export function createHousehold({stage,world,player,avatar,nav,rig},activities){
  const femaleAvatar=createWoman(),woman=createPlayer({avatar:femaleAvatar,nav,grid:world.grid,ground:world.ground});
  stage.scene.add(femaleAvatar.root);woman.restore(-1.5,0,5.8,Math.PI);
  const navigateWoman=createNpcNavigator(woman,world,nav);
  const routine=createFemaleRoutine({woman,avatar:femaleAvatar,activities,world,navigate:navigateWoman});
  const quilts=createSharedQuilt();stage.scene.add(quilts);
  let maleSleep=false,femaleSleep=false,going=false,femaleGoing=false,reason=null,sleepControl=false,femaleWakeAt=0,wasManualSleep=false;
  const wakeButton=document.querySelector('[data-control="interact"]');
  wakeButton.addEventListener('click',e=>{if(maleSleep){e.stopImmediatePropagation();wakeMale();}},{capture:true});
  let lastMove=Date.now(),lastNight=false,nightDismissed=false,clock=0,last={x:player.pos.x,y:player.y,z:player.pos.z},routeClock=0;
  const clockDate=new Date(),maleLimbs=[avatar.legL,avatar.legR,avatar.armL,avatar.armR,avatar.head];let clockAt=0,night=false;
  const atBed=p=>Math.abs(p.y-4)<.25&&Math.hypot(p.pos.x-BED.x,p.pos.z-BED.z)<.5;
  function covers(){
    const male=maleSleep||activities.current==='sleep';world.preserveRoof=male||femaleSleep;const state=(male?1:0)+(femaleSleep?2:0);quilts.visible=state!==0;
    if(maleSleep){wakeButton.hidden=false;if(wakeButton.getAttribute('aria-label')!=='起床 · E')wakeButton.setAttribute('aria-label','起床 · E');}
    else if(sleepControl){const nearby=activities.spots.find(s=>s.id===activities.status().nearby);wakeButton.hidden=!nearby;wakeButton.setAttribute('aria-label',`${nearby?.title.split(' · ').at(-1)||'互动'} · E`);}
    sleepControl=maleSleep;
  }
  function sleepingPose(a,x){a.root.position.set(x,4.78,-8.55);a.root.rotation.set(0,0,0);if(a===avatar)for(const limb of maleLimbs)limb?.rotation.set(0,0,0);a.body.rotation.set(-Math.PI/2,0,0);a.body.position.set(0,Math.sin(clock*1.3)*.008,0);}
  function wakeMale(){
    lastMove=Date.now();nightDismissed=true;
    if(maleSleep||going||activities.current==='sleep')scheduleWomanWake();
    if(!maleSleep&&!going)return false;
    going=false;player.cancel();
    if(maleSleep){maleSleep=false;avatar.body.rotation.set(0,0,0);avatar.body.position.set(0,0,0);avatar.update(0,{speed:0,fly:-1});player.restore(BED.x,4,BED.z,0);rig.recenter(player,true);}
    covers();return true;
  }
  function scheduleWomanWake(){if((femaleSleep||femaleGoing)&&!femaleWakeAt)femaleWakeAt=Date.now()+5000;nightDismissed=true;}
  function wakeWoman(){const inBed=femaleSleep;femaleWakeAt=0;femaleSleep=femaleGoing=false;woman.cancel();femaleAvatar.body.rotation.set(0,0,0);femaleAvatar.body.position.set(0,0,0);if(inBed)woman.restore(BED.x,4,BED.z,0);routine.resume();}
  function begin(cause){
    if(going||maleSleep)return false;
    if(activities.active&&!activities.stop(false))return false;
    reason=cause;femaleWakeAt=0;going=true;femaleGoing=!femaleSleep;routine.pause();routeClock=1;
    const h=window.__home;const ok=h?.navigate(BED.x,BED.z,4);
    if(!ok){going=false;return false;}return true;
  }
  function guideWoman(){
    if(femaleSleep||!femaleGoing)return;
    const target=BED;
    if(Math.hypot(woman.pos.x-target.x,woman.pos.z-target.z)<.3)return;
    if(!woman.travelling)navigateWoman(target.x,target.y,target.z);
  }
  const recordInput=e=>{if(e.isTrusted&&going)wakeMale();};
  addEventListener('keydown',recordInput);addEventListener('pointerdown',recordInput);
  function update(dt){
    clock+=dt;routeClock+=dt;const now=Date.now();
    const manualSleep=activities.current==='sleep';
    if(wasManualSleep&&!manualSleep)scheduleWomanWake();
    if(manualSleep&&!wasManualSleep)femaleWakeAt=0;
    wasManualSleep=manualSleep;
    if(femaleWakeAt&&now>=femaleWakeAt&&!maleSleep&&!manualSleep)wakeWoman();
    if(Math.abs(now-clockAt)>=1000){clockAt=now;clockDate.setTime(now);const hour=Number(hours.format(clockDate));night=hour>=22||hour<7;}
    if(!night&&lastNight){wakeMale();nightDismissed=false;if(femaleSleep||femaleGoing)wakeWoman();}
    if(night&&!lastNight)nightDismissed=false;lastNight=night;
    const moved=Math.hypot(player.pos.x-last.x,player.pos.z-last.z,player.y-last.y)>.025;
    if(moved||player.moving||activities.active)lastMove=now;
    last.x=player.pos.x;last.y=player.y;last.z=player.pos.z;
    // Bedtime waits for the visitor to finish driving or another interaction.
    if(!maleSleep&&(night&&!nightDismissed||now-lastMove>=FIVE_MINUTES)&&!going&&!activities.active&&!rig.introActive){begin(night?'night':'idle');}
    if((night&&!nightDismissed||manualSleep)&&!femaleSleep&&!femaleGoing&&!femaleWakeAt){routine.pause();femaleGoing=true;routeClock=1;}
    if(going&&atBed(player)){player.cancel();maleSleep=true;going=false;player.anchor(-11.24,4,-9.3,0);avatar.update(0,{speed:0,fly:-1});rig.recenter(player,true);rig.showcase(innerWidth<720&&innerHeight>innerWidth?[-3,11,3]:[-6.5,8.7,-4.9],[-12,4.9,-9.3],{interactive:true});}
    if(routeClock>.6){routeClock=0;guideWoman();}
    if(!femaleSleep){
      if(femaleGoing){woman.update(dt,IDLE,0);if(atBed(woman)){woman.cancel();femaleSleep=true;femaleGoing=false;femaleAvatar.update(0,{speed:0});}}
      else routine.update(dt);
    }
    if(maleSleep)sleepingPose(avatar,-11.24);
    if(femaleSleep)sleepingPose(femaleAvatar,-12.76);
    covers();
  }
  return{update,wakeMale,begin,woman,femaleAvatar,quilts,routine,get sleeping(){return maleSleep;},get walking(){return going;},status:()=>({male:maleSleep?'sleeping':going?'going-to-bed':'awake',female:femaleSleep?'sleeping':femaleGoing?'going-to-bed':'awake',femaleWakeIn:femaleWakeAt?Math.max(0,(femaleWakeAt-Date.now())/1000):null,femaleActivity:routine.status(),reason,idleMs:Date.now()-lastMove,night:lastNight})};
}
