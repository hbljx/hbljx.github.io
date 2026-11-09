import * as THREE from 'three';
import { registerLocalActor } from '@engine/world/actor-collision.js';

// All duties remain in these side lanes and gaps between parked aircraft.
export const CREW_ROUTES = [
  [-6.5,-20,-6.5,-12],[-6.5,-10,-6.5,-2],[-6.5,2,-6.5,10],[-6.5,12,-6.5,20],
  [2.8,-20,6.4,-20],[3,-11.25,6.5,-11.25],[3,11,6.1,11],[3,19.6,6.1,19.6],
  [-6.5,-28,-6.5,-23],
];
const COLORS=[0xf3c842,0x4d91e5,0xe95450,0x58ac70,0xa67bd5,0xf0eee4,0xa9754d];
const DUTIES=[['signal','scan','radio'],['carry','inspect','radio'],['crouch','inspect','signal'],
  ['tool','crouch','inspect'],['inspect','radio','crouch'],['clipboard','radio','scan'],
  ['tool','crouch','clipboard'],['signal','scan','clipboard'],['carry','tool','scan']];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// A chamfered cube has only 44 triangles: softer silhouettes without a
// high-poly sphere for every joint, or extra material/draw calls.
function beveledBox(){
  const positions=[],a=.5,b=.405;
  function face(points){
    const u=new THREE.Vector3().subVectors(points[1],points[0]),v=new THREE.Vector3().subVectors(points[2],points[0]);
    if(u.cross(v).dot(points[0])<0)points.reverse();
    for(let i=1;i<points.length-1;i++)for(const p of [points[0],points[i],points[i+1]])positions.push(p.x,p.y,p.z);
  }
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3;
    face([[-b,-b],[b,-b],[b,b],[-b,b]].map(([x,y])=>{const p=new THREE.Vector3();p.setComponent(axis,sign*a);p.setComponent(u,x);p.setComponent(v,y);return p;}));
  }
  for(let axis=0;axis<3;axis++)for(const su of [-1,1])for(const sv of [-1,1]){
    const u=(axis+1)%3,v=(axis+2)%3;
    face([[-b,a,b],[b,a,b],[b,b,a],[-b,b,a]].map(([x,y,z])=>{const p=new THREE.Vector3();p.setComponent(axis,x);p.setComponent(u,su*y);p.setComponent(v,sv*z);return p;}));
  }
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])face([
    new THREE.Vector3(x*a,y*b,z*b),new THREE.Vector3(x*b,y*a,z*b),new THREE.Vector3(x*b,y*b,z*a)]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}

export function createDeckCrew(parent,gangway){
  const parts=[],crew=[],pose=new THREE.Object3D(),matrix=new THREE.Matrix4(),color=new THREE.Color();
  function joint(parent,x,y,z){const bone=new THREE.Object3D();bone.position.set(x,y,z);parent.add(bone);return bone;}
  function part(person,bone,x,y,z,w,h,d,tint,gear=''){
    pose.position.set(x,y,z);pose.rotation.set(0,0,0);pose.scale.set(w,h,d);pose.updateMatrix();
    parts.push({bone,local:pose.matrix.clone(),color:tint,gear,person});
  }
  for(let i=0;i<CREW_ROUTES.length;i++){
    const root=new THREE.Object3D(),pelvis=joint(root,0,.82,0),torso=joint(pelvis,0,.12,0),head=joint(torso,0,.52,0);
    const left=joint(torso,-.275,.4,0),right=joint(torso,.275,.4,0);
    const elbowL=joint(left,0,-.25,0),elbowR=joint(right,0,-.25,0);
    const hipL=joint(pelvis,-.115,0,0),hipR=joint(pelvis,.115,0,0);
    const kneeL=joint(hipL,0,-.36,0),kneeR=joint(hipR,0,-.36,0);
    const ankleL=joint(kneeL,0,-.35,0),ankleR=joint(kneeR,0,-.35,0);
    const route=CREW_ROUTES[i],heading=Math.atan2(route[2]-route[0],route[3]-route[1]);
    const person={root,pelvis,torso,head,left,right,elbowL,elbowR,hipL,hipR,kneeL,kneeR,ankleL,ankleR,
      route,color:COLORS[i%COLORS.length],x:route[0],z:route[1],working:false,action:'walk',yaw:heading,
      speed:.57+(i%4)*.065,rest:5.6+(i%3)*1.1,clock:i*4.7,gear:'',first:parts.length,count:0};
    crew.push(person);
    const shirt=person.color,vest=color.setHex(shirt).multiplyScalar(.72).getHex();
    const skin=[0xd8a17e,0xb67f5b,0xe3b693,0x986b51][i%4],pants=0x34495c,dark=0x24303b,reflect=0xece8c8;
    const add=(bone,x,y,z,w,h,d,tint,gear='')=>part(person,bone,x,y,z,w,h,d,tint,gear);
    // Tailored vest, shoulder straps, reflective tape, pockets and belt kit.
    add(torso,0,.23,0,.43,.48,.27,shirt);
    add(torso,0,.22,.151,.38,.4,.075,vest);
    add(torso,0,.22,-.15,.37,.4,.05,vest);
    for(const side of [-1,1]){
      add(torso,side*.135,.27,.199,.035,.31,.014,reflect);
      add(torso,side*.135,.27,-.184,.035,.31,.014,reflect);
      add(torso,side*.1,.12,.207,.12,.105,.045,vest);
      add(torso,side*.1,.162,.23,.12,.018,.016,shirt);
    }
    add(torso,0,.02,.19,.38,.026,.018,reflect);
    add(torso,0,.23,.2,.018,.38,.016,dark);
    add(torso,.09,.365,.2,.105,.035,.02,0xf2eee1);
    add(torso,-.105,.37,.22,.075,.1,.045,dark);
    add(torso,-.12,.455,.21,.015,.1,.015,dark);
    add(pelvis,0,.015,0,.37,.16,.265,pants);
    add(pelvis,0,.07,0,.39,.045,.28,dark);
    add(pelvis,0,.07,.15,.065,.045,.025,0xc1c5c3);
    add(pelvis,.22,.01,-.01,.075,.16,.11,0x5d655d);
    // Layered cranial helmet, ear protection, goggles and boom microphone.
    add(head,0,.015,0,.12,.12,.13,skin);
    add(head,0,.135,.005,.27,.27,.25,skin);
    add(head,0,.285,0,.34,.15,.32,shirt);
    add(head,0,.369,-.015,.27,.045,.255,shirt);
    add(head,0,.31,.18,.35,.035,.09,vest);
    add(head,0,.362,0,.035,.055,.31,reflect);
    add(head,0,.175,.141,.26,.085,.025,dark);
    for(const side of [-1,1]){
      add(head,side*.067,.181,.16,.108,.048,.016,0x77b0ba);
      add(head,side*.185,.168,-.005,.09,.17,.13,dark);
      add(head,side*.209,.175,-.005,.035,.105,.085,shirt);
    }
    add(head,0,.106,.145,.055,.045,.035,skin);
    add(head,0,.055,.137,.075,.014,.012,0x855a4b);
    add(head,.16,.09,.105,.025,.022,.18,dark);
    add(head,.105,.09,.19,.11,.025,.025,dark);
    // Actual shoulder, elbow, hip, knee and ankle pivots keep limbs attached.
    for(const [arm,elbow,hip,knee,ankle] of [[left,elbowL,hipL,kneeL,ankleL],[right,elbowR,hipR,kneeR,ankleR]]){
      add(arm,0,-.11,0,.155,.245,.18,shirt);
      add(arm,0,-.055,.095,.08,.035,.012,reflect);
      add(elbow,0,-.105,0,.135,.21,.16,shirt);
      add(elbow,0,-.21,0,.145,.04,.17,vest);
      add(elbow,0,-.275,.012,.135,.115,.145,0xd8d4bc);
      add(hip,0,-.16,0,.17,.35,.21,pants);
      add(hip,0,-.12,-.119,.13,.13,.03,0x43596b);
      add(knee,0,-.03,.11,.14,.15,.05,dark);
      add(knee,0,-.18,0,.15,.33,.18,pants);
      add(ankle,0,.015,.055,.19,.145,.3,dark);
      add(ankle,0,-.055,.055,.195,.035,.31,0x161f28);
      add(ankle,0,.065,.015,.13,.018,.13,0x79837e);
    }
    // Props follow the hands; only the current duty's equipment is shown.
    add(elbowR,0,-.37,.025,.045,.24,.045,0xc2cbd0,'tool');
    add(elbowR,0,-.49,.025,.12,.07,.05,0xc2cbd0,'tool');
    add(elbowL,0,-.31,.065,.26,.34,.045,0x465b67,'clipboard');
    add(elbowL,0,-.31,.092,.215,.285,.013,0xe1dfcc,'clipboard');
    for(let line=0;line<3;line++)add(elbowL,0,-.24-line*.06,.102,.14,.015,.008,0x718e93,'clipboard');
    add(elbowL,0,-.39,0,.29,.2,.18,0x466777,'carry');
    add(elbowL,0,-.27,0,.14,.045,.045,0xc3c9c6,'carry');
    person.count=parts.length-person.first;
  }
  const mesh=new THREE.InstancedMesh(beveledBox(),new THREE.MeshLambertMaterial(),parts.length+5);
  mesh.name='carrier-deck-crew';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(-16,4,-4),39);mesh.receiveShadow=true;parent.add(mesh);
  for(let i=0;i<parts.length;i++)mesh.setColorAt(i,color.setHex(parts[i].color));
  // The deployed bridge keeps sharing this one draw with all nine people.
  const boardingLink=new THREE.Object3D();boardingLink.name='carrier-retractable-gangway';
  const linkLength=gangway.x1-gangway.fixedEnd,linkEdge=gangway.x1-parent.position.x;
  const linkParts=[[3.28,0,.24,gangway.width]];
  for(const side of [-1,1])for(const y of [.48,1])linkParts.push([3.4+y,side*(gangway.width/2-.08),.08,.08]);
  for(let i=0;i<5;i++)mesh.setColorAt(parts.length+i,color.setHex(0xb6c0bc));
  let boardingProgress=-1;
  function setBoardingProgress(value){
    const progress=Math.max(0,Math.min(1,value));
    if(Math.abs(progress-boardingProgress)<.002)return;
    boardingProgress=progress;boardingLink.visible=progress>.001;
    const length=linkLength*progress,x=linkEdge-length/2;
    for(let i=0;i<linkParts.length;i++){
      const [y,z,h,d]=linkParts[i];pose.position.set(x,y,z);pose.rotation.set(0,0,0);
      pose.scale.set(length,h,d);
      pose.updateMatrix();mesh.setMatrixAt(parts.length+i,pose.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  function blend(bone,x,y,z,w){bone.rotation.x+=(x-bone.rotation.x)*w;bone.rotation.y+=(y-bone.rotation.y)*w;bone.rotation.z+=(z-bone.rotation.z)*w;}
  function syncColliders(){
    if(!crew[0].collider)return;
    parent.updateWorldMatrix(true,false);
    for(const p of crew)p.collider.sync(p.x,3.4,p.z);
  }
  function connectActors(nav){
    for(const p of crew)p.collider=registerLocalActor(nav,parent,p.root.position,.43,1.88);
    syncColliders();
  }
  let time=0;
  function update(dt){
    dt=Math.max(0,Math.min(dt,.1));time+=dt;
    syncColliders();
    for(let i=0;i<crew.length;i++){
      const p=crew[i],r=p.route,length=Math.hypot(r[2]-r[0],r[3]-r[1]),walk=length/p.speed,cycle=walk+p.rest;
      const clock=p.clock+dt,leg=Math.floor(clock/cycle),back=leg%2===1,u=clock%cycle;
      const f=smooth(Math.min(u/walk,1)),distance=(back?1-f:f)*length;
      const x=r[0]+(r[2]-r[0])*distance/length,z=r[1]+(r[3]-r[1])*distance/length;
      const blocked=p.collider?.blocked(x,3.4,z),moving=u<walk&&!blocked;
      if(!blocked){p.clock=clock;p.x=x;p.z=z;p.collider?.sync(x,3.4,z);}
      p.working=u>=walk;p.action=p.working?DUTIES[i][leg%DUTIES[i].length]:'walk';
      const work=smooth((u-walk)/.8)*smooth((cycle-u)/.9);
      // Decelerate at each stop, turn through the shoulders, then walk back.
      let heading=Math.atan2(back?r[0]-r[2]:r[2]-r[0],back?r[1]-r[3]:r[3]-r[1]);
      if(!moving)heading+=.35*Math.sin((u-walk)*.65+i)*work;
      p.yaw+=Math.atan2(Math.sin(heading-p.yaw),Math.cos(heading-p.yaw))*Math.min(1,dt*4);
      const gait=distance*9.5+i,walkWeight=moving?Math.sin(Math.PI*Math.min(u/walk,1))**.5:0,swing=Math.sin(gait)*.44*walkWeight;
      p.root.position.set(p.x,3.4,p.z);p.root.rotation.set(0,p.yaw,0);
      p.pelvis.position.set(0,.82+Math.abs(Math.sin(gait))*.025*walkWeight,0);
      p.pelvis.rotation.set(0,Math.sin(gait)*.035*walkWeight,0);
      p.torso.rotation.set(.035*walkWeight,Math.sin(gait)*.045*walkWeight,Math.sin(time*1.5+i)*.012);
      p.head.rotation.set(Math.sin(time*1.2+i)*.025,Math.sin(time*.7+i)*.14,0);
      p.left.rotation.set(-swing,0,-.07);p.right.rotation.set(swing,0,.07);
      p.elbowL.rotation.set(-.18,0,0);p.elbowR.rotation.set(-.18,0,0);
      p.hipL.rotation.set(swing,0,0);p.hipR.rotation.set(-swing,0,0);
      p.kneeL.rotation.set(Math.max(0,-Math.sin(gait))*.5*walkWeight,0,0);
      p.kneeR.rotation.set(Math.max(0,Math.sin(gait))*.5*walkWeight,0,0);
      p.ankleL.rotation.set(-swing*.25,0,0);p.ankleR.rotation.set(swing*.25,0,0);
      p.gear='';
      const beat=Math.sin((u-walk)*3+i);
      switch(p.action){
        case 'signal':
          blend(p.left,-2.45+beat*.22,0,-.3,work);blend(p.right,-2.45-beat*.22,0,.3,work);
          blend(p.elbowL,-.55,0,0,work);blend(p.elbowR,-.55,0,0,work);break;
        case 'radio':
          blend(p.right,-1.1,0,.28,work);blend(p.elbowR,-1.65,0,0,work);
          blend(p.head,.04,-.22,-.08,work);break;
        case 'crouch':
          p.pelvis.position.y-=.3*work;p.pelvis.position.z=-.08*work;
          blend(p.hipL,-.95,0,-.05,work);blend(p.hipR,-.95,0,.05,work);
          blend(p.kneeL,1.9,0,0,work);blend(p.kneeR,1.9,0,0,work);
          blend(p.ankleL,-.95,0,0,work);blend(p.ankleR,-.95,0,0,work);
          blend(p.torso,.24,0,0,work);blend(p.head,.4,beat*.06,0,work);
          blend(p.left,-.6,0,-.15,work);blend(p.right,-.7+beat*.12,0,.15,work);
          blend(p.elbowL,-.65,0,0,work);blend(p.elbowR,-.65,0,0,work);p.gear='tool';break;
        case 'tool':
          blend(p.torso,.18,-.12,0,work);blend(p.head,.36,0,0,work);
          blend(p.right,-.85+beat*.13,0,.08,work);blend(p.elbowR,-.5+beat*.12,0,0,work);
          blend(p.left,-.5,0,-.12,work);blend(p.elbowL,-.7,0,0,work);p.gear='tool';break;
        case 'inspect':
          blend(p.torso,.37,.1*Math.sin(time),0,work);blend(p.head,.35,-.15,0,work);
          blend(p.left,-.45,0,-.12,work);blend(p.right,-.55,0,.12,work);break;
        case 'clipboard':
          blend(p.left,-.45,0,-.08,work);blend(p.elbowL,-1.1,0,0,work);
          blend(p.right,-.55,0,-.18,work);blend(p.elbowR,-1.05+beat*.07,0,0,work);
          blend(p.head,.3,0,0,work);p.gear='clipboard';break;
        case 'scan':blend(p.head,-.12,Math.sin(time*.7+i)*.65,0,work);blend(p.torso,0,Math.sin(time*.7+i)*.12,0,work);break;
        case 'carry':p.gear='carry';blend(p.elbowL,-.15,0,0,work);break;
      }
      if(moving&&(i===1||i===8)){p.gear='carry';p.left.rotation.x=-swing*.25;}
      p.root.updateMatrixWorld(true);
      for(let j=p.first;j<p.first+p.count;j++){
        const item=parts[j];
        if(item.gear&&item.gear!==p.gear)matrix.makeScale(0,0,0);
        else matrix.multiplyMatrices(item.bone.matrixWorld,item.local);
        mesh.setMatrixAt(j,matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate=true;
  }
  setBoardingProgress(1);update(0);return {mesh,crew,boardingLink,setBoardingProgress,connectActors,syncColliders,update};
}
