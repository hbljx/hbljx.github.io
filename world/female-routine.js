import { RIM } from './layout.js';
import { drawResidentBike } from './female-props.js';

const IDLE={x:0,z:0,run:false};
const ROUTINE=['cooking','tv','gaming','basketball','coffee','reading','fishing','treadmill'];

// Independent destinations use the same walkable routes as the player. The
// visitor always has priority over a chair, screen, kitchen or basketball court.
export function createFemaleRoutine({woman,avatar,activities,world,navigate}){
  const trail=world.mountain.trailhead;
  const spots=[...ROUTINE.map(id=>activities.spots.find(s=>s.id===id)),
    {id:'roof-view',at:[-16,13],floor:11,anchor:[-16,11,13],yaw:0},
    {id:'motorcycle-view',at:[trail.x,trail.z],floor:.02},
    {id:'swimming',at:[-6,23.2],floor:0}];
  const pose={activity:true,seated:false,left:0,right:0,speed:0};
  const bag=[];
  let target=null,phase='waiting',elapsed=0,waiting=1,paused=false,completed=0,duration=0,lastActivity=null;
  let progress=0,lastX=woman.pos.x,lastZ=woman.pos.z,swimLane=0,ride=null,startedAt=Date.now();
  function finishSwim(){avatar.setSwimsuit(false);target=null;phase='waiting';elapsed=0;waiting=.2;}

  function leave(){
    if(woman.swimming){
      phase='leaving';activities.setAmbientActivity(null);
      woman.leavePool(-6,23.2,finishSwim);return;
    }
    if(ride)woman.restore(woman.pos.x,woman.y,woman.pos.z,woman.heading);
    else if(phase==='interacting'&&target)woman.restore(target.at[0],target.floor,target.at[1],target.yaw||0);
    woman.cancel();avatar.body.rotation.set(0,0,0);avatar.body.position.set(0,0,0);avatar.update(0,IDLE);
    avatar.setSwimsuit(false);ride=null;activities.setAmbientActivity(null);target=null;phase='waiting';elapsed=0;waiting=.4;
  }
  const occupied=spot=>activities.current===spot.id||spot.id==='motorcycle-view'&&activities.current==='motorcycle';
  function start(id){
    const spot=spots.find(s=>s.id===id);if(!spot||occupied(spot)||paused||woman.swimming)return false;
    if(target)leave();
    if(!navigate(spot.at[0],spot.floor,spot.at[1]))return false;
    target=spot;phase='walking';elapsed=progress=0;startedAt=Date.now();lastX=woman.pos.x;lastZ=woman.pos.z;return true;
  }
  function choose(){
    if(!bag.length){
      bag.push(...spots.map(s=>s.id));
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
      if(bag.at(-1)===lastActivity)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];
    }
    while(bag.length)if(start(bag.pop()))return;
    waiting=3;
  }
  function begin(){
    woman.cancel();phase='interacting';elapsed=0;startedAt=Date.now();duration=25+Math.random()*25;lastActivity=target.id;
    if(target.id==='swimming'){avatar.setSwimsuit(true);swimLane=0;woman.enterPool(-10,27);return;}
    if(target.id==='motorcycle-view'){
      const end=world.mountain.airfield.exit,points=world.mountain.route(trail.x,null,trail.z,end.x,end.y,end.z);
      let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);
      if(!points.length){leave();return;}
      ride={points,index:1,back:false,speed:Math.max(7,length/20),viewTime:0,stage:'riding-up'};duration=55;
      woman.anchor(points[0].x,points[0].y,points[0].z,0);return;
    }
    const a=target.anchor||[-12.5,0,4],yaw=target.yaw??Math.atan2(RIM.x-a[0],RIM.z-a[2]);
    woman.anchor(a[0],a[1],a[2],yaw);
  }
  function animate(dt){
    const id=target.id,t=elapsed,cycle=t%6;
    pose.activity=id!=='treadmill';pose.speed=id==='treadmill'?1.4:0;
    pose.seated=id==='tv'||id==='gaming'||id==='reading';pose.left=pose.right=-.65;
    if(id==='gaming'){pose.left=-1.2+Math.sin(t*13)*.12;pose.right=-1.2-Math.sin(t*13)*.12;}
    if(id==='reading')pose.left=pose.right=-1.05;
    if(id==='coffee'){pose.left=-.25;pose.right=-.9-Math.max(0,Math.sin(t*1.1))*1.4;}
    if(id==='cooking'){pose.left=-1.1+Math.sin(t*(t<8?10:5))*.22;pose.right=-.75;}
    if(id==='basketball')pose.left=pose.right=cycle>1.2&&cycle<2.2?-2.3:-.65;
    if(id==='fishing'){pose.left=-.65;pose.right=-1.05-Math.max(0,Math.sin(cycle))* .3;}
    if(id==='roof-view')pose.left=pose.right=-.15;
    avatar.root.position.set(woman.pos.x,woman.y+(pose.seated?-.1:0),woman.pos.z);avatar.root.rotation.set(0,woman.heading,0);
    avatar.update(dt,pose);avatar.beginProps();
    const box=avatar.prop;
    if(id==='coffee'){
      const y=1.32-.58*Math.cos(pose.right)+.04,z=-.58*Math.sin(pose.right)-.03;
      box(.3,y,z,.18,.2,.18,0xe9d9ad);box(.3,y+.105,z,.14,.012,.14,0x51301d);box(.42,y,z,.06,.12,.055,0xe9d9ad);
    }else if(id==='reading'){
      box(0,1.03,.43,.57,.055,.36,0x416754);box(0,1.066,.43,.52,.02,.32,0xf4e8ca);box(0,1.082,.43,.025,.012,.32,0xb89d75);
    }else if(id==='cooking'){
      box(17.6,1.14,4.57,.56,.2,.5,0x506b70,true);box(17.6,1.255,4.57,.6,.045,.55,0x98aaaa,true);box(17.6,1.285,4.57,.5,.02,.44,0x9e613c,true);
      box(17.23,1.16,4.57,.22,.05,.1,0x263337,true);box(17.97,1.16,4.57,.22,.05,.1,0x263337,true);
      box(16.82,1.01,4.6,.7,.045,.45,0xba8e53,true);
      for(let i=0;i<3;i++)box(16.64+i*.18,1.06,4.6,.11,.06,.17,i===2?0xd4914b:0x72a14e,true);
      if(t>8&&t<22)for(let i=0;i<3;i++)box(17.6+Math.sin(t*2+i)*.13,1.4+i*.17+(t*.18% .3),4.57,.07,.13,.07,0xe2e7dc,true);
      if(t>22){box(16.82,1.1,4.6,.6,.025,.5,0xeee5cf,true);box(16.7,1.15,4.6,.2,.075,.28,0x82a451,true);box(16.95,1.17,4.6,.23,.12,.27,0xce9355,true);}
      box(-.3,1.1+Math.sin(t*7)*.04,.48,.035,.035,.35,0xa77d4d);box(-.3,1.1+Math.sin(t*7)*.04,.68,.14,.025,.13,0xabb6ae);
    }else if(id==='basketball'){
      let x,y,z;
      if(cycle>=1.7&&cycle<2.8){const u=(cycle-1.7)/1.1;x=woman.pos.x+(RIM.x-woman.pos.x)*u;z=woman.pos.z+(RIM.z-woman.pos.z)*u;y=1.9+(RIM.y-1.9)*u+Math.sin(u*Math.PI)*1.7;}
      else if(cycle>=2.8&&cycle<4){const u=(cycle-2.8)/1.2;x=RIM.x;z=RIM.z;y=.2+(RIM.y-.2)*(1-u*u);}
      else{x=woman.pos.x+Math.sin(woman.heading)*.5;z=woman.pos.z+Math.cos(woman.heading)*.5;y=cycle>1.2&&cycle<1.7?1.4+(cycle-1.2):.25+Math.abs(Math.sin(t*5))*.85;}
      box(x,y,z,.33,.33,.33,0xd97822,true);box(x,y,z,.335,.025,.335,0x4e2e1b,true);box(x,y,z,.025,.335,.335,0x4e2e1b,true);
    }else if(id==='fishing'){
      box(.28,1.6,1.12,.035,.035,2,0x9b774d,false,-.6);
      const top=2.16,bottom=cycle>4?-.6+Math.sin((cycle-4)/2*Math.PI)*1.6:-1.2;
      box(.28,(top+bottom)/2,2,.012,top-bottom,.012,0xe2dfb9);box(.28,bottom,2,.13,.14,.13,0xd95952);
      if(cycle>4){box(.28,bottom-.2,2,.12,.12,.34,0x77b8be);box(.28,bottom-.2,1.79,.18,.13,.09,0x77b8be);}
    }else if(id==='treadmill'){
      for(let i=0;i<5;i++)box(-8.3,.28,13.2+((i*.3+t*1.8)%1.5),.8,.014,.045,0x6d7778,true);
    }
    avatar.endProps();activities.setAmbientActivity(id==='tv'||id==='gaming'?id:null);
  }
  function rideBike(dt){
    const r=ride;
    if(r.stage==='viewing'){
      r.viewTime+=dt;avatar.root.position.set(woman.pos.x,woman.y,woman.pos.z);avatar.root.rotation.set(0,woman.heading,0);avatar.update(dt,IDLE);avatar.beginProps();drawResidentBike(avatar,1,0,-.2);avatar.endProps();
      if(r.viewTime>=10){r.back=true;r.index=r.points.length-2;r.stage='riding-down';}return;
    }
    let remaining=r.speed*dt;
    while(remaining>0&&r.index>=0&&r.index<r.points.length){
      const p=r.points[r.index],dx=p.x-woman.pos.x,dz=p.z-woman.pos.z,d=Math.hypot(dx,dz),step=Math.min(d,remaining),u=d<.001?1:step/d;
      woman.anchor(woman.pos.x+dx*u,woman.y+(p.y-woman.y)*u,woman.pos.z+dz*u,d>.001?Math.atan2(dx,dz):woman.heading);remaining-=step;
      if(d<=step+.001)r.index+=r.back?-1:1;else break;
    }
    if(r.index>=r.points.length){r.stage='viewing';r.viewTime=0;}
    if(r.index<0){completed++;leave();return;}
    pose.activity=pose.seated=true;pose.speed=0;pose.left=pose.right=-1.1;
    avatar.root.position.set(woman.pos.x,woman.y+.38,woman.pos.z);avatar.root.rotation.set(0,woman.heading,0);avatar.update(dt,pose);avatar.beginProps();drawResidentBike(avatar);avatar.endProps();
  }
  function update(dt){
    if(paused)return;
    if(phase==='leaving'){
      if(!woman.swimming)finishSwim();
      else if(!woman.travelling)woman.leavePool(-6,23.2,finishSwim);
      woman.update(dt,IDLE,0);return;
    }
    if(target&&occupied(target)){leave();waiting=.1;}
    if(phase==='waiting'){woman.update(dt,IDLE,0);waiting-=dt;if(waiting<=0)choose();return;}
    const previous=elapsed;elapsed=Math.max(elapsed+dt,(Date.now()-startedAt)/1000);
    if(phase==='walking'){
      woman.update(dt,IDLE,0);
      const moved=Math.hypot(woman.pos.x-lastX,woman.pos.z-lastZ);progress=moved>.002?0:progress+dt;lastX=woman.pos.x;lastZ=woman.pos.z;
      if(Math.abs(woman.y-target.floor)<.25&&Math.hypot(woman.pos.x-target.at[0],woman.pos.z-target.at[1])<.4)begin();
      else if(progress>4||elapsed>60)leave();
      return;
    }
    if(target.id==='motorcycle-view')rideBike(elapsed-previous);
    else if(target.id==='swimming'){
      woman.update(dt,IDLE,0);
      if(woman.swimming&&!woman.travelling&&woman.swimTo(swimLane%2?-10:0,swimLane%2?26:28))swimLane++;
    }else animate(dt);
    if(target&&elapsed>=duration){completed++;leave();}
  }
  return{update,start,pause(){if(!paused){leave();paused=true;}},resume(){paused=false;waiting=.1;},status:()=>({phase:paused?'paused':phase,activity:target?.id||null,elapsed,duration,completed,ride:ride?.stage||null,outfit:avatar.outfit})};
}
