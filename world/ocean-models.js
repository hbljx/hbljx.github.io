import * as THREE from 'three';
import { appendCoral, SHALLOW_REEFS } from './coral-models.js';

// Sculpted, vertex-coloured geometry still joins the existing fleet draw.
// Tails and limbs taper their animation weights to zero at their attachment.
export function createOceanModel(kind,{fishCount=18,groundAt}={}){
  const data={position:[],normal:[],color:[],swimWeight:[],swimAxis:[]};
  const color=new THREE.Color(),shade=new THREE.Color();let offset=[0,0,0];
  function append(geometry,tint,weight=0,axis=[.08,0,0]){
    const g=geometry.index?geometry.toNonIndexed():geometry;
    if(!g.attributes.normal)g.computeVertexNormals();
    for(let i=0;i<g.attributes.position.count;i++){
      const x=g.attributes.position.getX(i),y=g.attributes.position.getY(i),z=g.attributes.position.getZ(i);
      data.position.push(x+offset[0],y+offset[1],z+offset[2]);
      data.normal.push(g.attributes.normal.getX(i),g.attributes.normal.getY(i),g.attributes.normal.getZ(i));
      if(tint===undefined&&g.attributes.color)color.fromBufferAttribute(g.attributes.color,i);
      else color.setHex(typeof tint==='function'?tint(x,y,z):tint);
      data.color.push(color.r,color.g,color.b);data.swimWeight.push(typeof weight==='function'?weight(x,y,z):weight);data.swimAxis.push(...axis);
    }
    if(g!==geometry)g.dispose();geometry.dispose();
  }
  function ell(x,y,z,w,h,d,tint,weight=0,axis,segments=12){
    const g=new THREE.SphereGeometry(1,segments,segments===8?5:8);g.scale(w/2,h/2,d/2);g.translate(x,y,z);append(g,tint,weight,axis);
  }
  function tube(points,radius,tint,weight=0,axis,segments=12,sides=5){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    append(new THREE.TubeGeometry(curve,segments,radius,sides,false),tint,weight,axis);
  }
  // A closed, gently convex fin; outline is [x,y,z], with a raised centre.
  function fin(outline,thickness,tint,weight=0,axis,normal=[0,1,0]){
    const center=[0,0,0];for(const p of outline)for(let k=0;k<3;k++)center[k]+=p[k]/outline.length;
    const verts=[],indices=[];
    for(const side of [-1,1]){
      const start=verts.length/3;verts.push(...center.map((v,k)=>v+normal[k]*thickness*side));
      for(const p of outline)verts.push(...p);
      for(let i=0;i<outline.length;i++){const a=start+1+i,b=start+1+(i+1)%outline.length;indices.push(...(side>0?[start,b,a]:[start,a,b]));}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();append(g,tint,weight,axis);
  }
  // Smooth elliptical cross sections give each species its own head/body/tail.
  function body(rings,tint,weight,axis,segments=16){
    const verts=[],indices=[];
    for(const [z,rx,ry,cy=0]of rings)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;verts.push(Math.cos(a)*rx,cy+Math.sin(a)*ry,z);}
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
    const n=g.attributes.normal;
    for(let i=0;i<rings.length;i++){const a=i*(segments+1),b=a+segments,v=new THREE.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
    append(g,tint,weight,axis);
  }
  const clamp=v=>Math.max(0,Math.min(1,v));
  const blend=(a,b,t)=>color.setHex(a).lerp(shade.setHex(b),clamp(t)).getHex();
  function eyes(x,y,z,r){
    for(const s of [-1,1]){
      ell(s*x,y,z,r*.65,r,r,0x0d2430,0,undefined,8);
      ell(s*(x+r*.22),y+r*.17,z+r*.17,r*.19,r*.24,r*.24,0xe4f7f1,0,undefined,8);
    }
  }
  function swimmer(spec){
    const {size:s,top,belly,mammal=false,whale=false,shark=false,small=false}=spec;
    const axis=mammal?[0,.17*s,0]:[.18*s,0,0];
    const sway=(x,y,z)=>Math.pow(clamp((-z/s-.15)/1.9),1.5);
    const profile=whale?
      [[-2.15,.02,.02],[-1.85,.12,.13],[-1.45,.18,.19],[-.9,.3,.32],[-.3,.45,.43],[.35,.52,.47],[.95,.51,.43],[1.35,.43,.34],[1.55,.26,.2],[1.61,.02,.02]]:
      [[-1.65,.01,.01],[-1.38,.08,.09],[-1.05,.14,.17],[-.65,.23,.29],[-.15,.34,.37],[.38,.36,.35],[.8,.27,.26],[1.03,.17,.16],[1.15,.025,.04]];
    const skin=(x,y,z)=>{
      const base=blend(top,belly,clamp(.55-y/(s*.43))*.95);
      if(!small)return base;
      // A soft pearl stripe follows the fish's flanks between the back and
      // belly; vertex colour keeps this detail inside the shared fleet draw.
      const flank=clamp((Math.abs(x)/s-.18)/.12);
      const band=flank*(1-clamp(Math.abs(y/s-.015)/.1));
      return color.setHex(base).lerp(shade.setHex(0xffe7b7),band*.48).getHex();
    };
    body(profile.map(([z,x,y])=>[z*s,x*s,y*s]),skin,sway,axis,small?10:20);
    // Pectoral flippers sweep back from the shoulder, with rounded tips.
    for(const side of [-1,1]){
      const pts=[[.24,-.08,.52],[.43,-.11,.45],[whale?1.08:.86,-.24,-.34],[whale?1.1:.91,-.25,-.52],[.72,-.18,-.43],[.3,-.1,-.15]];
      fin(pts.map(([x,y,z])=>[side*x*s,y*s,z*s]),.035*s,top,(x)=>clamp((Math.abs(x)/s-.3)*.35),[0,.07*s,0]);
    }
    const dorsal=whale?-.65:-.25,dh=shark?.88:whale?.56:.65;
    fin([[0,.25*s,(dorsal+.42)*s],[0,dh*s,(dorsal-.12)*s],[0,(dh-.06)*s,(dorsal-.21)*s],[0,.4*s,(dorsal-.21)*s],[0,.24*s,(dorsal-.48)*s]],.032*s,top,sway,axis,[1,0,0]);
    const root=whale?-1.92:-1.43,tip=whale?-2.45:-1.98;
    for(const side of [-1,1]){
      if(mammal)fin([[0,0,root*s],[side*.38*s,.025*s,(root-.14)*s],[side*.82*s,.015*s,tip*s],[side*.72*s,-.015*s,(tip-.11)*s],[side*.2*s,-.025*s,(tip+.14)*s],[0,0,(tip+.22)*s]],.035*s,top,sway,axis);
      else fin([[0,0,root*s],[0,side*(side>0&&shark?.91:.65)*s,(tip-.12)*s],[0,side*.51*s,(tip+.13)*s],[0,side*.12*s,(tip+.25)*s],[0,0,(tip+.31)*s]],.025*s,top,sway,axis,[1,0,0]);
    }
    if(!whale&&!shark&&!small){
      ell(0,-.055*s,1.24*s,.22*s,.16*s,.65*s,top);ell(0,-.1*s,1.26*s,.19*s,.06*s,.61*s,belly);
    }
    // School fish are only half a metre long: flat iris/glint discs retain
    // their eye detail without four miniature spheres per fish.
    if(small){
      for(const side of [-1,1]){
        const eye=new THREE.CircleGeometry(.05*s,8);eye.rotateY(side*Math.PI/2);eye.translate(side*.275*s,.1*s,.83*s);append(eye,0x0d2430);
        const glint=new THREE.CircleGeometry(.016*s,4);glint.rotateY(side*Math.PI/2);glint.translate(side*.277*s,.12*s,.845*s);append(glint,0xe4f7f1);
        tube([[side*.29*s,.12*s,.56*s],[side*.33*s,.015*s,.49*s],[side*.29*s,-.1*s,.43*s]],.012*s,0x45616a,0,undefined,5,4);
      }
    }else eyes((whale?.47:.245)*s,.1*s,(whale?1.03:.83)*s,.065*s);
    if(!small){
      for(const side of [-1,1]){
        const mouth=whale?[[.08,-.1,1.58],[.37,-.21,1.25],[.49,-.12,.84]]:shark?[[.06,-.09,1.07],[.24,-.2,.65],[.32,-.12,.42]]:[[.03,-.085,1.54],[.09,-.09,1.24],[.245,-.12,.84]];
        tube(mouth.map(([x,y,z])=>[side*x*s,y*s,z*s]),.012*s,0x304953,0,undefined,8,4);
        if(shark)for(let k=0;k<5;k++)tube([[side*(.34-k*.008)*s,.12*s,(.45-k*.09)*s],[side*(.36-k*.008)*s,-.04*s,(.4-k*.09)*s],[side*.29*s,-.23*s,(.36-k*.09)*s]],.012*s,0x425f6c,0,undefined,4,4);
      }
      if(whale){
        ell(0,.462*s,.42*s,.11*s,.035*s,.19*s,0x243f50,0,undefined,8);
        for(let k=-3;k<=3;k++){
          const pleat=[[1.3,.44,.35,.05],[.82,.51,.44,.075],[.05,.49,.45,.07]].map(([z,rx,ry,spacing])=>{const x=k*spacing;return[x*s,(-ry*Math.sqrt(1-(x/rx)**2)-.006)*s,z*s];});
          tube(pleat,.007*s,0x91aeb4,0,undefined,8,4);
        }
      }
    }
    if(small){
      fin([[0,.1*s,.7*s],[0,.52*s,.22*s],[0,.44*s,-.65*s],[0,.12*s,-.85*s]],.018*s,0xf4c96e,sway,axis,[1,0,0]);
      for(const side of [-1,1])fin([[side*.33*s,.11*s,.32*s],[side*.345*s,-.08*s,.3*s],[side*.23*s,-.19*s,-.65*s],[side*.25*s,.08*s,-.62*s]],.006*s,0xeaf1c7,sway,axis,[1,0,0]);
    }
  }
  if(kind==='whale')swimmer({size:3,top:0x345e76,belly:0xb2c7cc,mammal:true,whale:true});
  if(kind==='shark')swimmer({size:1.7,top:0x527485,belly:0xe0e4d5,shark:true});
  if(kind==='dolphin')swimmer({size:1.15,top:0x4e99ac,belly:0xd2ece4,mammal:true});
  if(kind==='fish-school')for(let i=0;i<fishCount;i++){
    offset=[Math.sin(i*2.2)*2.1,Math.cos(i*1.7)*.45,(i%6)*.8-2];
    swimmer({size:.24+(i%3)*.025,top:[0xe79939,0x359cab,0xd87763][i%3],belly:0xffe9ad,small:true});
  }
  if(kind==='crab'){
    ell(0,.23,0,1.08,.5,.79,(x,y)=>blend(0xaf4933,0xeb9e68,(y+.03)*1.5));
    ell(0,.05,0,.84,.16,.64,0xe7b78a);
    for(const side of [-1,1]){
      for(let i=0;i<4;i++){
        const z=.26-i*.19,knee=.56+Math.sin((i+1)*.65)*.26;
        tube([[side*.4,.18,z],[side*knee,.22,z-.12],[side*(knee+.29),-.02,z-.28]],.045-i*.004,0xcd6848,(x)=>clamp((Math.abs(x)-.4)*1.4),[0,.06,.045],6,5);
      }
      tube([[side*.33,.23,.3],[side*.64,.27,.58],[side*.72,.43,.86]],.075,0xce6949,0);
      ell(side*.71,.44,.91,.31,.3,.36,0xe88a56);
      for(const claw of [-1,1])tube([[side*.71+claw*.12,.45,.99],[side*.71+claw*.16,.46,1.16],[side*.71+claw*.06,.45,1.28]],.04,0xf0b67a,0,undefined,6,5);
      tube([[side*.21,.38,.22],[side*.24,.56,.35]],.027,0xce7856,0,undefined,3,5);
      ell(side*.24,.57,.36,.11,.11,.12,0x172c33,0,undefined,8);
      for(let i=0;i<4;i++){
        const x=side*(.27+i*.045),z=.1-i*.12,y=.23+.25*Math.sqrt(Math.max(0,1-(x/.54)**2-(z/.395)**2));
        ell(x,y+.004,z,.055,.018,.055,0xf2b67a,0,undefined,8);
      }
    }
  }
  if(kind==='shrimp'){
    ell(0,.3,.3,.39,.42,.61,0xe59679);
    for(let i=0;i<6;i++){
      const z=.08-i*.15,y=.24+Math.sin(i*.48)*.16,w=.35-i*.035;
      ell(0,y,z,w,.32-i*.025,.23,i%2?0xf2b49a:0xd9816f,(x,y,z)=>clamp(-z),[0,.055,0]);
    }
    for(const side of [-1,1]){
      for(let i=0;i<5;i++)tube([[side*.12,.2,.35-i*.13],[side*.26,.06,.28-i*.13],[side*.32,-.015,.43-i*.13]],.017,0xf5bca0,1,[.02,.025,0],4,4);
      tube([[side*.12,.41,.54],[side*.25,.48,.94],[side*.44,.39,1.34],[side*.6,.31,1.5]],.014,0xf4d6b0,(x,y,z)=>clamp(z-.55),[.04,.025,0],10,4);
      ell(side*.13,.45,.52,.085,.1,.1,0x223d40,0,undefined,8);
      fin([[0,.29,-.68],[side*.25,.3,-.94],[side*.22,.3,-1.07],[side*.08,.31,-1.03],[0,.29,-.78]],.015,0xedab8d,1,[0,.055,0]);
    }
    fin([[0,.39,.52],[0,.5,.86],[0,.38,.73]],.025,0xe9a086,0,undefined,[1,0,0]);
  }
  if(kind==='octopus'){
    ell(0,.69,-.05,.92,1.16,.83,(x,y)=>blend(0x9c5986,0xe2a19d,1-y*.8));
    ell(0,.35,.24,.7,.46,.64,0xc88098);
    for(const side of [-1,1]){
      ell(side*.29,.57,.36,.22,.23,.15,0xf4d9c5,0,undefined,8);
      ell(side*.3,.575,.425,.11,.055,.045,0x28323c,0,undefined,8);
    }
    for(let arm=0;arm<8;arm++){
      const a=arm*Math.PI/4,points=[];
      for(let j=0;j<=12;j++){
        const t=j/12,r=.24+1.15*t,theta=a+Math.pow(t,3)*1.25;
        points.push([Math.sin(theta)*r,.2-.15*Math.sin(t*Math.PI)+.13*t*t,Math.cos(theta)*r]);
      }
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
      const g=new THREE.TubeGeometry(curve,16,.14,7,false);
      // Taper the tube about its centreline, retaining smooth vertex normals.
      const p=g.attributes.position;
      for(let j=0;j<=16;j++){const c=curve.getPointAt(j/16),taper=1-.9*j/16;for(let k=0;k<=7;k++){const i=j*8+k;p.setXYZ(i,c.x+(p.getX(i)-c.x)*taper,c.y+(p.getY(i)-c.y)*taper,c.z+(p.getZ(i)-c.z)*taper);}}
      g.computeVertexNormals();const weight=(x,y,z)=>clamp((Math.hypot(x,z)-.27)/1.2);
      append(g,0xcc869e,weight,[.035,.06,.035]);
      for(let j=2;j<10;j++){
        const t=j/12,c=curve.getPointAt(t),r=.049*(1-t*.65);
        const cup=new THREE.TorusGeometry(r,r*.25,4,8);cup.rotateX(Math.PI/2);cup.translate(c.x,c.y+.14*(1-.9*t)+.005,c.z);
        append(cup,0xf3cab8,weight,[.035,.06,.035]);
      }
    }
  }
  if(kind==='turtle'){
    ell(0,.13,0,1.2,.68,1.55,0x557b53);ell(0,-.02,0,1.11,.18,1.45,0xd2bd7d);
    // Raised shell scutes follow the dome instead of a flat painted disc.
    const shellY=(x,z)=>.13+.34*Math.sqrt(Math.max(0,1-(x/.6)**2-(z/.775)**2))+.012;
    const scutes=[[0,0],[0,.46],[0,-.46],[-.32,.23],[-.32,-.23],[.32,.23],[.32,-.23]];
    for(let i=0;i<scutes.length;i++){
      const [x,z]=scutes[i],verts=[],normals=[];
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3,b=(j+1)*Math.PI/3;
        const point=(u,v)=>{const px=x+(Math.cos(a)*u+Math.cos(b)*v)*.2,pz=z+(Math.sin(a)*u+Math.sin(b)*v)*.25,py=shellY(px,pz);verts.push(px,py,pz);const n=new THREE.Vector3(px/.36,(py-.142)/(.34*.34),pz/(.775*.775)).normalize();normals.push(n.x,n.y,n.z);};
        for(let u=0;u<4;u++)for(let v=0;v<4-u;v++){
          point(u/4,v/4);point(u/4,(v+1)/4);point((u+1)/4,v/4);
          if(v<3-u){point((u+1)/4,v/4);point(u/4,(v+1)/4);point((u+1)/4,(v+1)/4);}
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));append(g,i%2?0x79965b:0x94a966);
    }
    ell(0,.1,.94,.36,.32,.54,0x9eae70);eyes(.145,.17,1.08,.07);
    for(const side of [-1,1])for(const front of [true,false]){
      const z=front?.46:-.48,w=front?1.02:.76;
      fin([[side*.4,.03,z],[side*w,-.04,z-.21],[side*(w+.05),-.06,z-.37],[side*.68,-.02,z-.38],[side*.42,0,z-.19]],.045,0x94a76b,(x)=>clamp((Math.abs(x)-.4)*1.4),[0,.1,0]);
    }
    fin([[-.08,0,-.63],[0,.02,-1.03],[.08,0,-.63]],.035,0x9cae74);
  }
  if(kind==='reef'){
    // Broad kelp ribbons, branching coral and fan-shaped clams replace blocks.
    const kelp=[[-3.4,-2.4],[-2.5,-2.9],[0,-3],[2.4,-2.8],[3.5,-1.7],[-3.5,2.8],[-1.9,3]];
    for(let i=0;i<kelp.length;i++){
      const [x,z]=kelp[i],h=.9+(i%3)*.5;
      tube([[x,0,z],[x+.08,h*.5,z],[x+.14,h,z+.1]],.025,0x407a59,0,undefined,8,4);
      for(const side of [-1,1]){
        const pts=[];for(let j=0;j<=8;j++){const t=j/8;pts.push([x+side*(Math.sin(t*Math.PI)*.23+.1*t),.12+t*h,z+Math.sin(t*5+i)*.13]);}
        fin(pts.concat(pts.slice().reverse().map(([a,b,c])=>[a+side*.14,b,c+.025])),.015,i%2?0x6b9d63:0x379076,(x,y)=>y/h,[.08,0,.04],[0,0,1]);
      }
    }
    for(let i=0;i<4;i++){
      appendCoral(append,{x:-2.7+i*1.8,z:-2.1-(i%2)*.3,height:1.1+(i%2)*.2,
        width:1.15,yaw:i*.8,kind:i%3,tint:[0xdf908b,0xb987bd,0xe6b879,0xde8da4][i]});
    }
    for(let i=0;i<3;i++){
      const x=-2+i*1.7,z=-2.6;
      ell(x,.07,z,.52,.15,.44,0xdfc4a0,0,undefined,8);
      for(let rib=-2;rib<=2;rib++)tube([[x,.11,z-.16],[x+rib*.075,.16,z],[x+rib*.09,.09,z+.16]],.012,0xf6dec3,0,undefined,4,4);
    }
  }
  if(kind==='shore-corals'){
    for(const [i,[x,z]] of SHALLOW_REEFS.entries())for(let j=0;j<5;j++){
      const a=i*.71+j*2.4;
      const px=x+Math.cos(a)*(2+j%2),pz=z+Math.sin(a)*(1.8+j%3);
      appendCoral(append,{x:px,y:groundAt(px,pz)-.35,z:pz,
        height:2.8+(i+j*2)%4*.65,width:2.3+(j%2)*.5,yaw:a,kind:(i+j)%3,
        tint:[0x63cdb4,0xe895a8,0x88b9df,0xe9bb79,0xb29bd8][(i+j)%5]});
    }
  }
  const result=new THREE.BufferGeometry();
  for(const [name,array]of Object.entries(data))result.setAttribute(name,new THREE.Float32BufferAttribute(array,name==='swimWeight'?1:3));
  return result;
}
