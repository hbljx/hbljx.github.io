import * as THREE from 'three';
import { METRO_POINTS,TUNNEL_POINTS,TRANSIT_STOPS } from './transit-layout.js';
import { createTransitPath } from './transit-path.js';
import { createTransitVehicle,transitSign } from './transit-models.js';
import { createTunnelGlazing,maskTunnelWater,tunnelCeiling } from './tunnel-glazing.js';
import { bridgeHeight,onBridge } from './sea-bridge.js';

export function buildSeaTransit({B,planes,layer,materials,scene}){
  const metroPath=createTransitPath(METRO_POINTS),tunnelPath=createTransitPath(TUNNEL_POINTS);
  // Keep level portals flush with the existing shore/court, without the
  // Catmull-Rom height overshoot that would claim the adjoining bridge floor.
  for(const p of tunnelPath.samples)p.y=Math.min(0,p.y);
  const concrete={tex:'concrete',tint:0xa2b2b5},dark={tex:'paint',tint:0x384b59},rail={tex:'steel',tint:0xb9cdd2};
  const teal={tex:'paint',tint:0x277b89},gold={tex:'paint',tint:0xe6c671},lamp={tex:'paint',tint:0xc1eeed,emissive:.7};
  const p={},q={};
  const metroStopDistances=TRANSIT_STOPS.filter(s=>s.service==='metro').map(s=>metroPath.project(...s.track,{}).s);
  const ribbonPositions=[],ribbonColors=[],ribbonColor=new THREE.Color();
  function face(a,b,c,d,look){
    ribbonColor.setHex(look.tint??0xffffff);
    for(const v of [a,b,c,a,c,d]){ribbonPositions.push(...v);ribbonColors.push(ribbonColor.r,ribbonColor.g,ribbonColor.b);}
  }
  function segment(a,b,offset,width,height,lift,look){
    const point=(p,side,up)=>[p.x+Math.cos(p.heading)*(offset+side*width/2),p.y+lift+up,p.z-Math.sin(p.heading)*(offset+side*width/2)];
    const al=point(a,-1,height/2),ar=point(a,1,height/2),bl=point(b,-1,height/2),br=point(b,1,height/2);
    face(al,bl,br,ar,look);
    // Continuous ribbons share boundaries; no hidden end caps or underside
    // faces. Thin lane/rail markings only need their visible upper surface.
    if(height>.2){face(point(a,-1,-height/2),point(b,-1,-height/2),bl,al,look);face(ar,br,point(b,1,-height/2),point(a,1,-height/2),look);}
  }
  for(let s=0;s<metroPath.length;s+=6){
    metroPath.sample(s,p);metroPath.sample(Math.min(s+6,metroPath.length),q);
    segment(p,q,0,4.2,.36,-.22,concrete);
    for(const side of [-1,1]){segment(p,q,side*.75,.13,.15,.08,rail);if(metroStopDistances.every(stop=>Math.abs(s-stop)>13))segment(p,q,side*1.98,.11,.12,.74,teal);}
    B.at(p.x,p.y,p.z,p.heading,()=>B.box(0,-.1,0,2.5,.08,.26,dark));
    if(s%24<6&&s>28&&s<metroPath.length-35){
      B.box(p.x,-4,p.z,1.1,p.y+3.65,1.1,concrete);B.at(p.x,p.y-.6,p.z,p.heading,()=>B.box(0,0,0,4.3,.3,.8,teal));
    }
  }
  // A single continuous tube mesh encloses the roadway, with transparent
  // ocean-facing roof panels and regular steel ribs. The road stays dry.
  const {shell,cross}=createTunnelGlazing(tunnelPath);scene.add(shell);
  for(let s=0;s<tunnelPath.length;s+=6){
    tunnelPath.sample(s,p);tunnelPath.sample(Math.min(s+6,tunnelPath.length),q);
    segment(p,q,0,11.4,.45,-.25,dark);
    for(const side of [-1,1]){segment(p,q,side*5.45,.28,.7,.3,concrete);segment(p,q,side*4.3,.12,.04,.025,lamp);}
    if(s%12<6)segment(p,q,0,.14,.025,.025,gold);
    if(s%18<6){
      B.at(p.x,p.y,p.z,p.heading,()=>{
        for(let j=1;j<cross.length;j++){
          const [ax,ay]=cross[j-1],[bx,by]=cross[j],angle=Math.atan2(by-ay,bx-ax);
          B.box((ax+bx)/2,(ay+by)/2-.055,0,Math.hypot(bx-ax,by-ay)+.035,.11,.16,teal,{rz:angle});
        }
        B.box(0,5.65,0,2,.05,.35,lamp);
      });
    }
  }
  const platformRects=[{x0:-42,x1:-13,z0:26,z1:31},{x0:-44,x1:-15,z0:168,z1:173},{x0:-16,x1:10,z0:168,z1:172},{x0:6,x1:10,z0:155,z1:170},{x0:8,x1:20,z0:155,z1:159}];
  const approachRects=[{x0:30,x1:54,z0:155,z1:161},{x0:54,x1:66,z0:151,z1:165},{x0:31,x1:40,z0:150,z1:161},{x0:8,x1:17,z0:150,z1:160}];
  for(const r of approachRects)segment({x:(r.x0+r.x1)/2,y:0,z:r.z0,heading:0},{x:(r.x0+r.x1)/2,y:0,z:r.z1,heading:0},0,r.x1-r.x0,.3,-.15,dark);
  const ribbonGeometry=new THREE.BufferGeometry();ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ribbonPositions,3));ribbonGeometry.setAttribute('color',new THREE.Float32BufferAttribute(ribbonColors,3));ribbonGeometry.computeVertexNormals();
  const ribbons=new THREE.Mesh(ribbonGeometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));ribbons.name='sea-transit-road-and-rail';ribbons.receiveShadow=true;scene.add(ribbons);
  for(const [s,text]of [[11,'海底隧道 · 通往山脚'],[tunnelPath.length-17,'海底隧道 · 通往家园']]){
    tunnelPath.sample(s,p);B.at(p.x,p.y,p.z,p.heading,()=>{
      for(const x of [-5.8,5.8])B.box(x,0,0,.65,6.5,.8,concrete);
      B.box(0,6.1,0,12.2,.65,.8,teal);
    });transitSign(B,planes,p.x,p.y+6.4,p.z-.42,text,0x246577,p.heading,8);
  }
  for(const r of platformRects)B.box((r.x0+r.x1)/2,-.25,(r.z0+r.z1)/2,r.x1-r.x0,.28,r.z1-r.z0,concrete);
  for(const stop of TRANSIT_STOPS){
    const [x,z]=stop.at,y=stop.floor,isMetro=stop.service==='metro';
    if(isMetro){
      for(const dx of [-10,10]){B.box(x+dx,y,z,.18,3.5,.18,teal);B.box(x+dx,y,z+1.9,.18,3.5,.18,teal);}
      B.box(x,y+3.5,z+.8,24,.18,3.5,teal);B.box(x,y+.02,z+(stop.end? -1.7:2),24,.035,.18,gold);
      B.box(x+5,y+.42,z+.8,3,.15,.65,{tex:'deck',tint:0xc6a67c});
      transitSign(B,planes,x,y+2.7,z+1,stop.name,0x267d83,0,8);
    }else{
      const side=stop.returning?-1:1;
      B.box(x+side*.55,y,z-2.2,.1,3,.1,teal);B.box(x+side*.55,y,z+2.2,.1,3,.1,teal);
      B.box(x,y+3,z,1.5,.13,5,teal);B.box(x+side*.4,y+.45,z+1.1,.45,.12,1.2,{tex:'deck',tint:0xc6a67c});
      B.box(x,y+.06,z,1.2,.025,.12,gold);
      transitSign(B,planes,x,y+2.3,z-2.2,'公交 · '+(stop.end==='mountain'||stop.end!=='home'&&stop.returning?'回家':'山脚'),0x397f68,Math.PI/2,3);
    }
  }
  const inRect=(r,x,z,margin=0)=>x>=r.x0+margin&&x<=r.x1-margin&&z>=r.z0+margin&&z<=r.z1-margin;
  const platform={id:'metro-platform',foot:{x:20,y:0,z:157},docked:()=>true,
    contains:(x,z)=>platformRects.some((r,i)=>i>0&&inRect(r,x,z)),
    levels(x,z,out){if(this.contains(x,z))out.push({y:0,site:'metro-platform'});},
    route(x,y,z,tx,ty,tz){const nodes=[{x:20,y:0,z:157},{x:8,y:0,z:157},{x:8,y:0,z:170},{x:-30,y:0,z:170}];const points=[],from=z>163?3:x<10?1:0,to=tz>163?3:tx<10?1:0;for(let i=from;i!==to;i+=Math.sign(to-from))points.push(nodes[i]);points.push(nodes[to],{x:tx,y:0,z:tz});return points;},
    pick(ray){const hit=new THREE.Vector3();if(!ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit)||!this.contains(hit.x,hit.z))return null;return{t:hit.distanceTo(ray.origin),point:hit,site:'metro-platform'};},
  };
  const inApproach=(x,z,margin=0)=>approachRects.some(r=>inRect(r,x,z,margin));
  const approach={id:'transit-concourse',foot:{x:24,y:0,z:158},docked:()=>true,contains:inApproach,
    levels(x,z,out){if(inApproach(x,z))out.push({y:0,site:'transit-concourse'});},
    driveHeight:(x,z,margin=0)=>inApproach(x,z,margin)?0:null,
    route(x,y,z,tx,ty,tz){return [{x,y:0,z:158},{x:tx,y:0,z:158},{x:tx,y:0,z:tz}];},
    pick(ray){const hit=new THREE.Vector3();if(!ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit)||!inApproach(hit.x,hit.z))return null;return {t:hit.distanceTo(ray.origin),point:hit,site:'transit-concourse'};},
  };
  const tunnel={id:'sea-tunnel',path:tunnelPath,shell,foot:{x:34,y:0,z:19},exit:{x:60,y:0,z:158},release:{x:31,y:0,z:158},
    contains(x,z,margin=0){return tunnelPath.near(x,z).distance<=5.25-margin;},
    driveHeight(x,z,margin=0){if(onBridge(x,z))return null;const p=tunnelPath.near(x,z);return p.distance<=5.25-margin?p.y:null;},
    slope(x,z,heading){const p=tunnelPath.project(x,z);return p.slope*Math.cos(heading-p.heading);},
    levels(x,z,out){if(onBridge(x,z))return;const p=tunnelPath.near(x,z);if(p.distance<=5.25)out.push({y:p.y,site:'sea-tunnel'});},
    obstructed(x,z,y){if(onBridge(x,z))return false;const p=tunnelPath.near(x,z);return p.distance>5.1&&p.distance<5.8&&Math.abs(y-p.y)<5.7;},
    collides(x,y,z){if(onBridge(x,z))return false;const p=tunnelPath.near(x,z);const ceiling=p.y+tunnelCeiling(p.side);return p.distance<5.8&&(p.distance>5.25&&y<ceiling&&y+1.8>p.y||y<p.y&&y+1.8>p.y-.5||y+1.8>ceiling-.1&&y<ceiling+.15);},
    route:(x,z,tx,tz)=>tunnelPath.route(x,z,tx,tz),
  };
  const busPoints=[];
  for(const z of [29,30,62,86,118,145,150])busPoints.push([26,bridgeHeight(z),z]);
  busPoints.push([31,0,151],[34,0,154],[32,0,157],[29,0,159],[24,0,160],[19,0,159],[16,0,157],[14,0,154],[17,0,151],[22,0,150]);
  for(const z of [145,118,86,62,30,29])busPoints.push([22,bridgeHeight(z),z]);
  busPoints.push([22,0,24],[25,0,22],[28,0,24]);
  const busPath=createTransitPath(busPoints,{closed:true});
  // The bridge has piecewise-linear ramps; curved horizontal interpolation
  // must not lift the bus above or push it below that exact driving surface.
  for(const p of busPath.samples)p.y=bridgeHeight(p.z);
  const metroCars=Array.from({length:3},(_,index)=>createTransitVehicle(layer,materials,{index}));
  const bus=createTransitVehicle(layer,materials,{bus:true});
  for(const car of [...metroCars,bus])scene.add(car.root);
  const services={metro:{id:'metro',path:metroPath,cars:metroCars,speed:0,maxSpeed:13,accel:2.5,direction:1,dwell:8,stops:[],s:0,index:0,next:1},
    bus:{id:'bus',path:busPath,cars:[bus],speed:0,maxSpeed:6,accel:1.8,direction:1,dwell:7,stops:[],s:0,index:0,next:1}};
  for(const service of Object.values(services)){
    service.stops=TRANSIT_STOPS.filter(s=>s.service===service.id).map(stop=>({...stop,s:service.path.project(...stop.track,{}).s})).sort((a,b)=>a.s-b.s);
    service.s=service.stops[0].s;
  }
  function place(service){
    for(let i=0;i<service.cars.length;i++){
      const car=service.cars[i];service.path.sample(service.s+(i-1)*8.15*(service.id==='metro'?1:0),p);
      car.root.position.set(p.x,p.y,p.z);car.root.rotation.set(-Math.atan(p.slope),p.heading,0,'YXZ');car.root.updateMatrixWorld(true);
    }
  }
  Object.values(services).forEach(place);
  return {services,tunnel,platform,approach,place,stops:TRANSIT_STOPS,
    maskWater(coast){tunnel.waterMask=maskTunnelWater(coast,tunnelPath);},
    installView(stage,player){
      const scene=stage.scene,before=scene.onBeforeRender,after=scene.onAfterRender,water=new THREE.Color(0x235467),fogColor=new THREE.Color();
      let changed=false,background,sky,near,far,hemi;
      scene.onBeforeRender=function(renderer,current,camera){
        before?.call(this,renderer,current,camera);
        if(camera!==stage.camera||player.y>=-2||camera.position.y>=-1||!tunnel.contains(player.pos.x,player.pos.z))return;
        changed=true;background=scene.background;sky=stage.sky.visible;near=scene.fog.near;far=scene.fog.far;hemi=stage.hemi.intensity;fogColor.copy(scene.fog.color);
        scene.background=water;stage.sky.visible=false;scene.fog.color.copy(water);scene.fog.near=30;scene.fog.far=140;stage.hemi.intensity=Math.max(2.2,hemi);
      };
      scene.onAfterRender=function(renderer,current,camera){
        if(changed&&camera===stage.camera){scene.background=background;stage.sky.visible=sky;scene.fog.near=near;scene.fog.far=far;scene.fog.color.copy(fogColor);stage.hemi.intensity=hemi;changed=false;}
        after?.call(this,renderer,current,camera);
      };
    },
    drawMap(context,P,scale,dpr=1,labels=false){
      context.save();context.lineJoin=context.lineCap='round';
      for(const [path,color,dashed]of [[tunnelPath,'#f2bd72',true],[metroPath,'#147b8b',false]]){
        context.beginPath();path.samples.forEach((p,i)=>{const xy=P(p.x,p.z);if(i)context.lineTo(...xy);else context.moveTo(...xy);});
        context.strokeStyle='#244b60';context.lineWidth=Math.max(4*dpr,7*scale);context.stroke();
        context.strokeStyle=color;context.lineWidth=Math.max(2*dpr,3.4*scale);context.setLineDash(dashed?[5*dpr,4*dpr]:[]);context.stroke();context.setLineDash([]);
      }
      for(const stop of TRANSIT_STOPS){
        const [x,y]=P(...stop.at);context.fillStyle=stop.service==='metro'?'#168e9d':'#f3dc89';context.strokeStyle='#193c4e';context.lineWidth=1.5*dpr;context.beginPath();context.arc(x,y,3.4*dpr,0,Math.PI*2);context.fill();context.stroke();
      }
      for(const service of Object.values(services))for(const car of service.cars){const [x,y]=P(car.root.position.x,car.root.position.z);context.fillStyle=service.id==='metro'?'#f8faf1':'#e4ae52';context.fillRect(x-3*dpr,y-2*dpr,6*dpr,4*dpr);}
      if(labels){
        context.font=`600 ${11*dpr}px system-ui`;context.textAlign='center';context.textBaseline='middle';
        for(const [x,z,text]of [[137,111,'海底隧道'],[-104,103,'海上地铁'],[-28,23,'家园地铁站'],[-30,181,'山脚地铁站'],[24,82,'海桥公交站']]){
          const [px,py]=P(x,z),width=context.measureText(text).width+10*dpr;context.fillStyle='#173849e8';context.fillRect(px-width/2,py-9*dpr,width,18*dpr);context.fillStyle='#fff';context.fillText(text,px,py);
        }
      }context.restore();
    },
  };
}
