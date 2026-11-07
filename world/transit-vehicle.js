import * as THREE from 'three';

// Two draws per vehicle: a merged body and real two-sided glazing. Door
// frames and their panes share the same sliding transform on the GPU.
export function createTransitVehicle(layer,materials,{bus=false,index=0,color}={}){
  const root=new THREE.Group();root.name=bus?'sea-bridge-bus':'metro-carriage-'+(index+1);
  const length=bus?6.2:7.6,width=bus?2.5:2.8,end=length/2;
  const paint=color??(bus?0x327b6c:0xe3e9e6),accent=bus?0xe8c77f:0x248b9d,dark=0x203741,trim=0xc6d9d9;
  const solid={position:[],normal:[],color:[],doorSlide:[]},glass={position:[],normal:[],color:[],doorSlide:[]};
  const tint=new THREE.Color(),doors={value:0};
  function append(source,color,data=solid,slide=0){
    const g=source.index?source.toNonIndexed():source;tint.setHex(color);
    for(let i=0;i<g.attributes.position.count;i++){
      for(const key of ['position','normal'])for(let k=0;k<3;k++)data[key].push(g.attributes[key].array[i*3+k]);
      data.color.push(tint.r,tint.g,tint.b);data.doorSlide.push(slide);
    }if(g!==source)g.dispose();source.dispose();
  }
  function box(x,y,z,w,h,d,color=paint,slide=0){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);append(g,color,solid,slide);}
  function pane(x,y,z,w,h,ry=0,rx=0,slide=0){const g=new THREE.PlaneGeometry(w,h);g.rotateX(rx);g.rotateY(ry);g.translate(x,y,z);append(g,0xffffff,glass,slide);}
  function wheel(x,y,z,r,depth,color){const g=new THREE.CylinderGeometry(r,r,depth,16);g.rotateZ(Math.PI/2);g.translate(x,y,z);append(g,color);}
  box(0,.25,0,width-.15,.2,length-.3,dark);box(0,.49,0,width,.15,length,paint);
  box(0,.64,0,width-.2,.06,length-.15,0xb7c2bd);
  for(const side of [-1,1]){
    const x=side*(width/2-.06),paneX=side*(width/2-.035);
    // Solid lower panels are split at the double sliding door.
    for(const [a,b]of [[-end,-1.48],[-.22,end]]){
      box(x,.7,(a+b)/2,.12,.6,b-a,paint);
      box(x+side*.065,.91,(a+b)/2,.026,.19,b-a-.04,accent);
      box(x+side*.068,1.22,(a+b)/2,.03,.055,b-a-.02,trim);
    }
    const sections=[[-end+.14,-1.51],[-.18,1.35],[1.48,end-.25]];
    for(const [a,b]of sections){
      pane(paneX,1.87,(a+b)/2,b-a,1.08,side*Math.PI/2);
      for(const z of [a-.035,b+.035])box(x,1.29,z,.14,1.16,.07,dark);
      box(x,2.4,(a+b)/2,.14,.08,b-a,trim);
    }
    // Offset the whole sliding leaf from the fixed window frames so their
    // outer faces never share a depth when the doors overlap while opening.
    const doorX=paneX+side*.02;
    // Lower door kick plates, slim frames and transparent upper leaves.
    for(const direction of [-1,1]){
      const z=-.85+direction*.3,slide=direction*.65;
      box(doorX,.7,z,.08,.42,.58,accent,slide);
      for(const edge of [-1,1])box(doorX,1.12,z+edge*.275,.09,1.3,.035,dark,slide);
      box(doorX,2.38,z,.09,.06,.58,dark,slide);
      pane(doorX+side*.015,1.75,z,.51,1.24,side*Math.PI/2,0,slide);
      box(doorX+side*.035,1.28,z-direction*.18,.06,.28,.035,trim,slide);
    }
    for(const z of [-2,.75]){
      box(side*.81,.78,z,.62,.14,.95,accent);box(side*1.08,.92,z,.12,.62,.95,accent);
      box(side*.8,.65,z,.12,.14,.55,dark);
    }
    // Round tyres, recessed silver hubs and visible bogies.
    for(const z of [-length*.32,length*.32]){
      wheel(side*(width/2-.06),.39,z,bus?.39:.31,.24,0x18262e);
      wheel(side*(width/2+.072),.39,z,bus?.23:.19,.028,0x9cb3ba);
      wheel(side*(width/2+.092),.39,z,.1,.035,dark);
    }
    box(side*(width/2-.18),2.48,0,.36,.18,length,paint);
    box(side*(width/2+.005),2.49,0,.045,.09,length-.15,accent);
  }
  for(const direction of [-1,1]){
    const z=direction*(end-.06),front=bus?direction===1:index===0?direction===-1:index===2&&direction===1;
    box(0,.68,z,width-.14,.58,.12,paint);
    box(0,.65,z+direction*.07,width-.32,.14,.16,dark);
    // The narrow cab surround lets the full windscreen read as glass.
    pane(0,1.83,z,width-.34,1.12,direction>0?0:Math.PI);
    for(const side of [-1,1]){
      box(side*(width/2-.09),1.24,z,.16,1.2,.16,dark);
      box(side*.8,1.01,z+direction*.09,.34,.13,.05,front?0xffecc5:0xd9665d);
      box(side*.8,.96,z+direction*.12,.4,.035,.05,trim);
    }
    box(0,2.4,z,width-.1,.24,.15,paint);
    box(0,2.46,z+direction*.085,1.65,.13,.025,dark);
    // Small amber route display, integrated into the body draw.
    for(let i=0;i<9;i++)box(-.64+i*.16,2.49,z+direction*.102,.09,.065,.012,0xeed393);
    box(0,.82,z+direction*.075,.6,.17,.02,0xf1eee2);
    if(!bus&&!front)box(0,.36,z+direction*.22,.38,.16,.4,dark);
  }
  if(bus)for(const side of [-1,1]){box(side*(width/2+.17),1.72,end-.2,.35,.06,.06,dark);box(side*(width/2+.32),1.65,end-.2,.08,.28,.2,dark);}
  // Coloured seated passengers share the body draw, keeping the interior
  // visible through the side glazing without adding per-passenger draw calls.
  const passengerColors=[0xe35f55,0x54a9d1,0xe6b84e,0x7bb36b,0xb17ac4,0xe58d50];
  const hairColors=[0x382820,0x171b22,0x67452e,0x9b6334,0x302d45,0x533a35];
  const trimColors=[0xf1d88b,0xf4eee2,0x324653,0xdcebd5,0xffd2a2,0x293b4a];
  const skinColors=[0xf0c4a1,0xd99b78,0xf2d1b0,0xb97858,0xe5b18a,0xc88766];
  const passengerCount=bus?4:3;
  for(let i=0;i<passengerCount;i++){
    const side=i%2?1:-1,z=-2.15+i*(bus?1.35:1.05),x=side*.67,c=passengerColors[(i+index*2+(bus?3:0))%passengerColors.length];
    const style=(i+index*2+(bus?3:0))%passengerColors.length,hair=hairColors[style],detail=trimColors[style],skin=skinColors[style];
    box(x,1.24,z,.31,.48,.27,c);
    box(x,1.66,z,.14,.13,.14,skin);
    box(x,1.72,z,.26,.29,.25,skin);
    box(x,1.97,z,.29,.08,.28,hair);
    box(x+side*.075,1.91,z,.16,.075,.255,hair);
    box(x+side*.151,1.85,z-.045,.018,.027,.018,0x292827);
    box(x+side*.151,1.85,z+.045,.018,.027,.018,0x292827);
    box(x+side*.155,1.82,z,.025,.035,.035,skin);
    if(style%2===0)box(x+side*.13,1.79,z+.095,.055,.16,.09,hair);
    box(x,1.58,z,.33,.085,.285,detail);
    for(const armSide of [-1,1]){
      box(x+armSide*.205,1.31,z,.105,.31,.15,c);
      box(x+armSide*.205,1.24,z,.09,.11,.12,skin);
    }
    box(x,.69,z+side*.12,.22,.34,.15,0x314957);
    box(x,.65,z+side*.2,.23,.09,.2,0x293238);
  }
  // Panoramic skylight: the roof remains present while passengers ride.
  for(const z of [-end+.17,end-.17])box(0,2.48,z,width-.3,.2,.34,paint);
  // Keep the transparent skylight clear of the opaque roof's top face.
  pane(0,2.67,0,width-.65,length-.72,0,-Math.PI/2);
  for(const z of [-1.55,1.55])box(0,2.63,z,width-.4,.06,.08,trim);
  box(0,2.69,-end+.56,width-.7,.16,.48,paint);
  for(const x of [-.45,0,.45])box(x,2.85,-end+.56,.2,.02,.3,dark);
  function mesh(data,material,name){
    const g=new THREE.BufferGeometry();for(const [key,values]of Object.entries(data))g.setAttribute(key,new THREE.Float32BufferAttribute(values,key==='doorSlide'?1:3));
    material.onBeforeCompile=shader=>{
      shader.uniforms.uDoorOpen=doors;shader.vertexShader='attribute float doorSlide; uniform float uDoorOpen;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=doorSlide*uDoorOpen;');
      if(material.transparent)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.); outgoingLight+=vec3(.14,.2,.22)*rim; diffuseColor.a=min(.62,diffuseColor.a+rim*.2);\n#include <opaque_fragment>');
    };
    const object=new THREE.Mesh(g,material);object.name=name;object.castShadow=false;root.add(object);return object;
  }
  const body=mesh(solid,new THREE.MeshPhongMaterial({vertexColors:true,shininess:40,specular:0x354c52}),'transit-body');
  const glazing=mesh(glass,new THREE.MeshPhongMaterial({color:0x9ed5df,shininess:100,specular:0xaad5db,transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true}),'transit-window-glass');glazing.renderOrder=3;
  function setDoors(amount){doors.value=Math.max(0,Math.min(1,amount));}
  return {root,roof:body,glazing,length,width,paintColor:paint,setDoors,get doorOpen(){return doors.value;}};
}
