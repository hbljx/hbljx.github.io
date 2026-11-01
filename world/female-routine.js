import { RIM } from './layout.js';

const IDLE={x:0,z:0,run:false};
const ROUTINE=['cooking','tv','gaming','basketball','coffee','reading'];
const DURATION={cooking:28,tv:32,gaming:26,basketball:24,coffee:22,reading:30};

// Independent destinations use the same walkable routes as the player. The
// visitor always has priority over a chair, screen, kitchen or basketball court.
export function createFemaleRoutine({woman,avatar,activities}){
  const spots=ROUTINE.map(id=>activities.spots.find(s=>s.id===id));
  const pose={activity:true,seated:false,left:0,right:0,speed:0};
  let next=0,target=null,phase='waiting',elapsed=0,waiting=1,paused=false,completed=0;
  let progress=0,lastX=woman.pos.x,lastZ=woman.pos.z;

  function leave(){
    if(phase==='interacting'&&target)woman.restore(target.at[0],target.floor,target.at[1],target.yaw||0);
    woman.cancel();avatar.body.rotation.set(0,0,0);avatar.body.position.set(0,0,0);avatar.update(0,IDLE);
    activities.setAmbientActivity(null);target=null;phase='waiting';elapsed=0;waiting=1.2;
  }
  function choose(){
    for(let attempt=0;attempt<spots.length;attempt++){
      const spot=spots[next++%spots.length];
      if(activities.current===spot.id)continue;
      if(woman.goTo(spot.at[0],spot.at[1])){target=spot;phase='walking';elapsed=progress=0;lastX=woman.pos.x;lastZ=woman.pos.z;return;}
    }
    waiting=3;
  }
  function begin(){
    woman.cancel();phase='interacting';elapsed=0;
    const a=target.anchor||[-12.5,0,4],yaw=target.yaw??Math.atan2(RIM.x-a[0],RIM.z-a[2]);
    woman.anchor(a[0],a[1],a[2],yaw);
  }
  function animate(dt){
    const id=target.id,t=elapsed,cycle=t%6;
    pose.seated=id==='tv'||id==='gaming'||id==='reading';pose.left=pose.right=-.65;
    if(id==='gaming'){pose.left=-1.2+Math.sin(t*13)*.12;pose.right=-1.2-Math.sin(t*13)*.12;}
    if(id==='reading')pose.left=pose.right=-1.05;
    if(id==='coffee'){pose.left=-.25;pose.right=-.9-Math.max(0,Math.sin(t*1.1))*1.4;}
    if(id==='cooking'){pose.left=-1.1+Math.sin(t*(t<8?10:5))*.22;pose.right=-.75;}
    if(id==='basketball')pose.left=pose.right=cycle>1.2&&cycle<2.2?-2.3:-.65;
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
    }
    avatar.endProps();activities.setAmbientActivity(id==='tv'||id==='gaming'?id:null);
  }
  function update(dt){
    if(paused)return;
    if(target&&activities.current===target.id){leave();waiting=.1;}
    if(phase==='waiting'){woman.update(dt,IDLE,0);waiting-=dt;if(waiting<=0)choose();return;}
    elapsed+=dt;
    if(phase==='walking'){
      woman.update(dt,IDLE,0);
      const moved=Math.hypot(woman.pos.x-lastX,woman.pos.z-lastZ);progress=moved>.002?0:progress+dt;lastX=woman.pos.x;lastZ=woman.pos.z;
      if(Math.abs(woman.y-target.floor)<.25&&Math.hypot(woman.pos.x-target.at[0],woman.pos.z-target.at[1])<.4)begin();
      else if(progress>4||elapsed>60)leave();
      return;
    }
    animate(dt);
    if(elapsed>=DURATION[target.id]){completed++;leave();}
  }
  return{update,pause(){if(!paused){leave();paused=true;}},resume(){paused=false;waiting=1;},status:()=>({phase:paused?'paused':phase,activity:target?.id||null,elapsed,completed})};
}
