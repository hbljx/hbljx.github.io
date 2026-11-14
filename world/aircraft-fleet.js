import * as THREE from 'three';
import { HOUSE, ROOF_PARKING } from './layout.js';
import { AIRFIELD,createAirplane,aircraftObstacle } from './aircraft.js';
import { createNavalAircraft } from './naval-aircraft.js';

export function createAircraftFleet(carrier,vehicles=[],stage=null){
  const first=createAirplane();Object.assign(first.userData,{label:'领地飞机',halfSpan:3.7,halfLength:3.2,seat:[0,.92,0]});
  const planes=[first,...carrier.deckAircraft.map(createNavalAircraft)],fields=new Map();
  fields.set(first,carrier.airfield);
  for(let i=1;i<planes.length;i++){
    const plane=planes[i],spec=carrier.deckAircraft[i-1];
    const field={id:'carrier',name:`航母 · ${plane.userData.label}机位`,get x(){return carrier.toWorld(spec.x,spec.z).x;},get z(){return carrier.toWorld(spec.x,spec.z).z;},y:3.4,get heading(){return carrier.mesh.rotation.y;},get exit(){return carrier.toWorld(spec.x-spec.w/2-.7,spec.z);}};
    fields.set(plane,field);plane.position.set(field.x,field.y,field.z);plane.rotation.y=field.heading;
  }
  // The wheelhouse glass shares the canopy pass, keeping the populated deck
  // within the same draw budget. Its hidden source still tracks the ship.
  const cabinGlass=carrier.mesh.getObjectByName('carrier-cabin-glass');cabinGlass.visible=false;
  const count=planes.length+1+vehicles.length,bodyMatrices=[...planes.map(p=>p.matrixWorld),carrier.mesh.matrixWorld,...vehicles.map(p=>p.matrixWorld)],canopyMatrices=[...planes.map(p=>p.userData.canopy.matrixWorld),cabinGlass.matrixWorld,...vehicles.map(p=>p.matrixWorld)],visible=new Float32Array(count).fill(1),shadow=new Float32Array(count),angles=new Float32Array(count);
  function combined(canopies=false){
    const data={position:[],normal:[],color:[],aircraftIndex:[],propellerPart:[],propellerPivot:[]};
    const sources=planes.map((plane,i)=>[canopies?plane.userData.canopy:plane,i]);
    if(!canopies)sources.push(...vehicles.map((p,i)=>[p,planes.length+1+i]));
    if(canopies)sources.unshift([cabinGlass,planes.length]);
    sources.forEach(([mesh,i])=>{
      const attrs=mesh.geometry.attributes;
      for(let v=0;v<attrs.position.count;v++){
        for(const key of ['position','normal'])for(let k=0;k<3;k++)data[key].push(attrs[key].array[v*3+k]);
        if(attrs.color)for(let k=0;k<attrs.color.itemSize;k++)data.color.push(attrs.color.array[v*attrs.color.itemSize+k]);
        else data.color.push(mesh.material.color.r,mesh.material.color.g,mesh.material.color.b,mesh.material.opacity);
        data.aircraftIndex.push(i);data.propellerPart.push(canopies?0:attrs.propellerPart?.getX(v)||0);
        for(let k=0;k<3;k++)data.propellerPivot.push(attrs.propellerPivot?attrs.propellerPivot.array[v*3+k]:[0,1.25,2.7][k]);
      }
    });
    const geometry=new THREE.BufferGeometry();
    for(const [key,values]of Object.entries(data))geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,key==='aircraftIndex'||key==='propellerPart'?1:key==='color'&&canopies?4:3));
    return geometry;
  }
  function poseShader(material,matrices,flags){
    material.onBeforeCompile=shader=>{
      shader.uniforms.uAircraftMatrices={value:matrices};shader.uniforms.uAircraftVisibility={value:flags};shader.uniforms.uPropellerAngles={value:angles};
      shader.vertexShader=`attribute float aircraftIndex; attribute float propellerPart; attribute vec3 propellerPivot; uniform mat4 uAircraftMatrices[${count}]; uniform float uAircraftVisibility[${count}]; uniform float uPropellerAngles[${count}];\n`+shader.vertexShader
        .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nfloat normalAngle=uPropellerAngles[int(aircraftIndex)]; if(propellerPart>.5)objectNormal.xy=mat2(cos(normalAngle),sin(normalAngle),-sin(normalAngle),cos(normalAngle))*objectNormal.xy; objectNormal=mat3(uAircraftMatrices[int(aircraftIndex)])*objectNormal;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat propAngle=uPropellerAngles[int(aircraftIndex)]; if(propellerPart>.5)transformed.xy=mat2(cos(propAngle),sin(propAngle),-sin(propAngle),cos(propAngle))*(transformed.xy-propellerPivot.xy)+propellerPivot.xy; transformed=(uAircraftMatrices[int(aircraftIndex)]*vec4(transformed,1.)).xyz; if(uAircraftVisibility[int(aircraftIndex)]<.5)transformed=vec3(0.);');
    };
  }
  const bodyMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});poseShader(bodyMaterial,bodyMatrices,visible);
  const body=new THREE.Mesh(combined(),bodyMaterial);body.name='aircraft-fleet';body.frustumCulled=false;body.castShadow=true;body.receiveShadow=false;
  body.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});poseShader(body.customDepthMaterial,bodyMatrices,shadow);
  const canopyMaterial=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});poseShader(canopyMaterial,canopyMatrices,visible);
  const canopies=new THREE.Mesh(combined(true),canopyMaterial);canopies.name='fleet-canopies';canopies.frustumCulled=false;canopies.renderOrder=3;
  const lightSpecs=planes.map(p=>p.userData.kind==='fighter'
    ? [[-p.userData.halfSpan,1.25,-.7,0xff3f48,.48,0],[p.userData.halfSpan,1.25,-.7,0x42ffb7,.48,0],[0,1.15,2.9,0xfff2c4,.58,0],[0,1.85,-1.5,0xff3544,.72,1]]
    : p.userData.kind==='awacs'
      ? [[-p.userData.halfSpan,1.25,-.2,0xff3f48,.5,0],[p.userData.halfSpan,1.25,-.2,0x42ffb7,.5,0],[0,1.1,3.35,0xfff2c4,.62,0],[0,3.3,-1,0xff3544,.85,1]]
      : [[-3.5,1.25,-.35,0xff3f48,.5,0],[3.5,1.25,-.35,0x42ffb7,.5,0],[0,1.35,3.15,0xfff2c4,.62,0],[0,2.5,-2.6,0xff3544,.85,1]]);
  // Share one glow pass between aircraft and other moving vehicles.
  const lamps = [];
  function addLamps(mesh, specs, daylight) {
    for (const [x,y,z,color,size,pulse] of specs) lamps.push({mesh,x,y,z,color,size,pulse,daylight});
  }
  planes.forEach((plane,i)=>addLamps(plane,lightSpecs[i],0));
  for (const vehicle of vehicles) {
    if (vehicle.userData.navigationLights) addLamps(vehicle,vehicle.userData.navigationLights,.65);
  }
  const glowPositions=new Float32Array(lamps.length*3),glowColors=new Float32Array(lamps.length*3);
  const glowSizes=new Float32Array(lamps.length),glowPulse=new Float32Array(lamps.length),glowDaylight=new Float32Array(lamps.length);
  lamps.forEach(({color,size,pulse,daylight},i)=>{
    new THREE.Color(color).toArray(glowColors,i*3);
    glowSizes[i]=size;glowPulse[i]=pulse;glowDaylight[i]=daylight;
  });
  const glowGeometry=new THREE.BufferGeometry();
  glowGeometry.setAttribute('position',new THREE.BufferAttribute(glowPositions,3).setUsage(THREE.DynamicDrawUsage));
  glowGeometry.setAttribute('aColor',new THREE.BufferAttribute(glowColors,3));
  glowGeometry.setAttribute('aSize',new THREE.BufferAttribute(glowSizes,1));
  glowGeometry.setAttribute('aPulse',new THREE.BufferAttribute(glowPulse,1));
  glowGeometry.setAttribute('aDaylight',new THREE.BufferAttribute(glowDaylight,1));
  const glowShader=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uNight:{value:0},uTime:{value:0}},
    vertexShader:`
      attribute vec3 aColor;
      attribute float aSize, aPulse, aDaylight;
      uniform float uNight, uTime;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=aSize*(260.0/max(1.0,-mv.z));
        vColor=aColor;
        float blink=aPulse>0.0?step(.28,fract(uTime*1.25*aPulse)):1.0;
        vAlpha=mix(aDaylight,1.0,uNight)*blink;
      }`,
    fragmentShader:`
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        float r=length(gl_PointCoord-.5)*2.0;
        float glow=exp(-r*r*12.0)*(1.0-smoothstep(.82,1.0,r));
        if(glow<.015)discard;
        gl_FragColor=vec4(vColor*1.8,glow*vAlpha);
      }`,
  });
  const glow=new THREE.Points(glowGeometry,glowShader);glow.name='aircraft-navigation-lights';glow.frustumCulled=false;glow.renderOrder=4;
  const lampPosition=new THREE.Vector3();
  const collisions=planes.map(aircraftObstacle);
  function update(cutaway=false){
    carrier.mesh.updateMatrixWorld(true);
    vehicles.forEach((v,i)=>{v.updateMatrixWorld(true);const index=planes.length+1+i;shadow[index]=v.castShadow?1:0;angles[index]=v.userData.wheelAngle||0;});
    for(let i=0;i<planes.length;i++){
      const p=planes[i],v=p.position;p.updateMatrixWorld(true);angles[i]=p.userData.propeller.rotation.z;
      visible[i]=cutaway&&v.y<14&&v.x>HOUSE.x0-1&&v.x<HOUSE.x1+1&&v.z>HOUSE.z0-1&&v.z<HOUSE.z1+1?0:1;
      shadow[i]=visible[i]&&p.castShadow?1:0;
    }
    for(let i=0;i<lamps.length;i++){
      const {mesh,x,y,z}=lamps[i];
      lampPosition.set(x,y,z).applyMatrix4(mesh.matrixWorld).toArray(glowPositions,i*3);
    }
    glowGeometry.attributes.position.needsUpdate=true;
    glowShader.uniforms.uNight.value=stage?.night??1;
    glowShader.uniforms.uTime.value=performance.now()*.001;
  }
  function fits(plane,x,y,z,yaw){
    const w=plane.userData.halfSpan,d=plane.userData.halfLength,c=Math.cos(yaw),s=Math.sin(yaw);
    return planes.every(other=>{
      if(other===plane||!other.userData.parked||Math.abs(other.position.y-y)>2)return true;
      const ow=other.userData.halfSpan,od=other.userData.halfLength,dx=x-other.position.x,dz=z-other.position.z,oc=Math.cos(other.rotation.y),os=Math.sin(other.rotation.y),rc=Math.abs(Math.cos(other.rotation.y-yaw)),rs=Math.abs(Math.sin(other.rotation.y-yaw));
      return Math.abs(dx*c-dz*s)>w+ow*rc+od*rs+.45||Math.abs(dx*s+dz*c)>d+ow*rs+od*rc+.45||Math.abs(dx*oc-dz*os)>ow+w*rc+d*rs+.45||Math.abs(dx*os+dz*oc)>od+w*rs+d*rc+.45;
    });
  }
  function resolveField(plane,id,field){
    if(id==='carrier'){const berth=fields.get(plane);return fits(plane,berth.x,berth.y,berth.z,berth.heading)?berth:null;}
    if(id==='home'){
      for(const [x,z]of ROOF_PARKING.zs.map(z=>[ROOF_PARKING.x,z]))if(fits(plane,x,11,z,Math.PI))return{...AIRFIELD,x,z,exit:{x:x+(x>16?-1:1)*(plane.userData.halfSpan+.8),y:11,z:z+1}};
      return null;
    }
    if(id==='summit'){
      for(const [dx,dz] of [[-5,-4],[5,-4],[-5,4],[5,4]]){
        const x=field.x+dx,z=field.z+dz;
        if(fits(plane,x,field.y,z,field.heading))return {...field,x,z,exit:{x:x+(dx<0?1:-1)*(plane.userData.halfSpan+.8),y:field.y,z:z+1}};
      }
      return null;
    }
    return fits(plane,field.x,field.y,field.z,field.heading)?field:null;
  }
  function taxiRoute(plane){
    const p=carrier.toLocal(plane.position.x,plane.position.z),points=[];
    if(Math.abs(p.x+1.8)>.01)points.push(carrier.toWorld(-1.8,p.z));
    if(Math.abs(p.z+22)>.01)points.push(carrier.toWorld(-1.8,-22));
    let x=plane.position.x,z=plane.position.z;
    for(const point of points){const steps=Math.max(1,Math.ceil(Math.hypot(point.x-x,point.z-z)/.5));
      for(let i=1;i<=steps;i++)if(!fits(plane,x+(point.x-x)*i/steps,3.4,z+(point.z-z)*i/steps,carrier.mesh.rotation.y))return null;
      x=point.x;z=point.z;
    }
    return points;
  }
  update();
  return{planes,draws:[body,canopies,glow],update,fieldFor:plane=>fields.get(plane),resolveField,taxiRoute,obstructed:(x,z,y)=>collisions.some(hit=>hit(x,z,y))};
}
