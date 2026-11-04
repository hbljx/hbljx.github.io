import * as THREE from 'three';

// Distance-based samples keep carriages coupled through curves and make speed
// independent of control-point spacing. Projection is shared by road collision.
export function createTransitPath(points,{closed=false,spacing=1}={}){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');
  const count=Math.ceil(curve.getLength()/spacing),samples=curve.getSpacedPoints(count);
  const distances=[0];
  for(let i=1;i<samples.length;i++)distances.push(distances[i-1]+samples[i].distanceTo(samples[i-1]));
  const length=distances.at(-1),projection={x:0,y:0,z:0,s:0,distance:Infinity,side:0,heading:0,slope:0};
  const cells=new Map(),all=[];
  const key=(x,z)=>(x+512)*2048+z+512;
  for(let i=1;i<samples.length;i++){
    all.push(i);const a=samples[i-1],b=samples[i];
    for(let x=Math.floor((Math.min(a.x,b.x)-6)/12);x<=Math.floor((Math.max(a.x,b.x)+6)/12);x++)for(let z=Math.floor((Math.min(a.z,b.z)-6)/12);z<=Math.floor((Math.max(a.z,b.z)+6)/12);z++){
      const k=key(x,z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i);
    }
  }
  function sample(s,out){
    s=closed?(s%length+length)%length:Math.max(0,Math.min(length,s));
    let lo=0,hi=distances.length-1;
    while(lo+1<hi){const m=(lo+hi)>>1;if(distances[m]<=s)lo=m;else hi=m;}
    const a=samples[lo],b=samples[lo+1],u=(s-distances[lo])/(distances[lo+1]-distances[lo]);
    out.x=a.x+(b.x-a.x)*u;out.y=a.y+(b.y-a.y)*u;out.z=a.z+(b.z-a.z)*u;
    out.heading=Math.atan2(b.x-a.x,b.z-a.z);out.slope=(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z);out.s=s;return out;
  }
  function project(x,z,out=projection,near=false){
    out.distance=Infinity;
    const candidates=near?cells.get(key(Math.floor(x/12),Math.floor(z/12))):all;
    if(!candidates)return out;
    for(const i of candidates){
      const a=samples[i-1],b=samples[i],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
      const raw=((x-a.x)*dx+(z-a.z)*dz)/den;
      const t=Math.max(0,Math.min(1,raw)),px=a.x+t*dx,pz=a.z+t*dz,d=Math.hypot(x-px,z-pz);
      if(d>=out.distance)continue;
      out.x=px;out.z=pz;out.y=a.y+(b.y-a.y)*t;out.distance=d;out.s=distances[i-1]+(distances[i]-distances[i-1])*t;
      out.outside=!closed&&(i===1&&raw<-.02||i===samples.length-1&&raw>1.02);
      out.heading=Math.atan2(dx,dz);out.slope=(b.y-a.y)/Math.sqrt(den);out.side=((x-px)*dz-(z-pz)*dx)/Math.sqrt(den);
    }if(out.outside)out.distance=Infinity;return out;
  }
  function route(ax,az,bx,bz){
    const start={...project(ax,az)},end={...project(bx,bz)},direction=end.s>=start.s?1:-1,result=[];
    for(let s=start.s;direction*(end.s-s)>2;s+=direction*2){const p=sample(s,{});result.push({x:p.x,y:p.y,z:p.z});}
    result.push({x:bx,y:end.y,z:bz});return result;
  }
  return {samples,distances,length,closed,sample,project,near:(x,z,out)=>project(x,z,out,true),route};
}
