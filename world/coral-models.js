import * as THREE from 'three';

export const SHALLOW_REEFS = [[-54,48],[-24,76],[10,52],[45,86],[66,48]];

// Small meshes join the existing ocean batch. Detail comes from the
// silhouette and vertex colour, without textures, lights or animation work.
export function appendCoral(append, { x=0, y=0, z=0, height=1, width=1, yaw=0, kind=0, tint=0xdf8f9c }={}) {
  const base=new THREE.Color(tint), dark=base.clone().multiplyScalar(.64);
  const tip=base.clone().lerp(new THREE.Color(0xffedcf),.68), shade=new THREE.Color();
  const pose=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(width,height,width));
  function emit(positions,indices,colours){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
    g.setIndex(indices);g.computeVertexNormals();g.applyMatrix4(pose);append(g);
  }
  function colour(t,light=0){
    shade.copy(dark).lerp(base,Math.min(1,t*1.8)).lerp(tip,Math.max(light,(t-.7)/.3));
    return [shade.r,shade.g,shade.b];
  }
  // Frenet frames keep curved branches round; their final rings close to a
  // rounded cap, with pale growth tips and a darker root embedded in the colony.
  function branch(points,radius,end=.008,steps=4,sides=5){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const frames=curve.computeFrenetFrames(steps,false),positions=[],indices=[],colours=[];
    for(let i=0;i<=steps+1;i++){
      const t=Math.min(1,i/steps),p=curve.getPointAt(t),cap=i===steps+1;
      const r=cap?0:end+(radius-end)*Math.pow(1-t,.7);
      if(cap)p.addScaledVector(frames.tangents[steps],end*.7);
      for(let j=0;j<sides;j++){
        const a=j/sides*Math.PI*2,n=frames.normals[Math.min(i,steps)],b=frames.binormals[Math.min(i,steps)];
        positions.push(p.x+r*(Math.cos(a)*n.x+Math.sin(a)*b.x),p.y+r*(Math.cos(a)*n.y+Math.sin(a)*b.y),p.z+r*(Math.cos(a)*n.z+Math.sin(a)*b.z));
        colours.push(...colour(p.y,t>.74?(t-.74)*2.5:0));
      }
    }
    for(let i=0;i<=steps;i++)for(let j=0;j<sides;j++){
      const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;
      indices.push(a,b,c);
      if(i<steps)indices.push(b,d,c);
    }
    // Raised polyp cups sit on the branch surface; roots stay embedded.
    if(radius>=.025){
      const p=curve.getPointAt(.56),frame=Math.round(steps*.56),n=frames.normals[frame],b=frames.binormals[frame],tangent=frames.tangents[frame];
      const r=end+(radius-end)*Math.pow(.44,.7),size=radius*.32;
      for(const sign of [-1,1]){
        const center=p.clone().addScaledVector(n,sign*(r+size*.3)),start=positions.length/3;
        positions.push(center.x,center.y,center.z);colours.push(...colour(p.y,.25));
        for(let j=0;j<5;j++){
          const a=j/5*Math.PI*2,q=center.clone().addScaledVector(b,Math.cos(a)*size).addScaledVector(tangent,Math.sin(a)*size).addScaledVector(n,sign*size*.35);
          positions.push(q.x,q.y,q.z);colours.push(...colour(p.y,.52));
        }
        for(let j=0;j<5;j++)indices.push(start,start+1+j,start+1+(j+1)%5);
      }
    }
    emit(positions,indices,colours);
  }
  if(kind===0){
    branch([[0,-.04,0],[.025,.35,.015],[-.03,.72,.04],[.02,1,.05]],.095,.018,6,6);
    for(let i=0;i<7;i++){
      const a=i*2.4,root=.16+(i%3)*.16,reach=.28+(i%2)*.14,top=.66+(i%3)*.12;
      const p=[Math.cos(a)*reach*.65,root+.2,Math.sin(a)*reach*.65];
      const q=[Math.cos(a)*reach,top,Math.sin(a)*reach];
      branch([[0,root,0],p,q],.045,.009,5);
      const b=a+.55;
      branch([p,[p[0]+Math.cos(b)*.13,top-.08,p[2]+Math.sin(b)*.13],[p[0]+Math.cos(b)*.22,top+.12,p[2]+Math.sin(b)*.22]],.025,.005,3,4);
    }
  }else if(kind===1){
    branch([[0,-.04,0],[0,.26,0],[.025,.8,0]],.065,.012,5);
    // Open ribs and staggered cross-links read as a delicate sea fan.
    const ribs=[];
    for(let i=0;i<9;i++){
      const a=-1.2+i*.3,reach=.72+.05*Math.cos(i*2),p=[];
      for(let k=0;k<4;k++){const t=k/3;p.push([Math.sin(a)*reach*t,.16+Math.cos(a)*reach*t,.045*Math.sin(i+t*3)*t]);}
      ribs.push(p);branch(p,.027,.006,4,4);
      if(i%2===0){const q=p[2];branch([q,[q[0]+.07,.1+q[1],q[2]],[p[3][0]+.09,p[3][1]+.05,p[3][2]]],.015,.004,3,4);}
    }
    for(let i=0;i<8;i++)for(const k of [1,2]){
      const a=ribs[i][k],b=ribs[i+1][k];
      branch([a,[(a[0]+b[0])/2,(a[1]+b[1])/2+.025,(a[2]+b[2])/2],b],.009,.009,2,4);
    }
  }else{
    branch([[0,-.04,0],[.035,.35,0],[0,.76,0]],.09,.03,4,6);
    // Scalloped dishes have a coloured underside, raised rims and radial ribs.
    for(let layer=0;layer<3;layer++){
      const radius=.57-layer*.12,cy=.24+layer*.24,cx=Math.sin(layer*2)*.11;
      const positions=[],indices=[],colours=[],segments=24;
      for(let ring=0;ring<4;ring++)for(let j=0;j<segments;j++){
        const a=j/segments*Math.PI*2,r=radius*[.04,.55,1,.94][ring]*(1+.07*Math.sin(a*5+layer));
        const yy=cy+[0,.015,.12,.078][ring]+Math.sin(a*3+layer)*.022*(ring?1:0);
        positions.push(cx+Math.cos(a)*r,yy,Math.sin(a)*r);
        colours.push(...colour(cy,ring===2?.7:ring===3?.18:.12+(j%2)*.09));
      }
      for(let ring=0;ring<3;ring++)for(let j=0;j<segments;j++){
        const a=ring*segments+j,b=ring*segments+(j+1)%segments,c=a+segments,d=b+segments;
        indices.push(a,c,b,b,c,d);
      }
      const top=positions.length/3;positions.push(cx,cy,0);colours.push(...colour(cy));
      for(let j=0;j<segments;j++)indices.push(top,(j+1)%segments,j);
      // Close each dish underneath instead of relying on a paper-thin plane.
      const center=positions.length/3;positions.push(cx,cy-.025,0);colours.push(...colour(.05));
      for(let j=0;j<segments;j++)indices.push(center,3*segments+j,3*segments+(j+1)%segments);
      emit(positions,indices,colours);
      for(let j=0;j<5;j++){
        const a=j/5*Math.PI*2;
        branch([[cx,cy+.01,0],[cx+Math.cos(a)*radius*.55,cy+.035,Math.sin(a)*radius*.55],[cx+Math.cos(a)*radius*.95,cy+.12,Math.sin(a)*radius*.95]],.009,.003,2,4);
      }
    }
  }
}
