import * as THREE from 'three';

// A white, open-top Rolls-Royce with a long bonnet, upright chrome grille,
// coach doors and a warm leather/wood cabin. Geometry joins the fleet batch.
export function createRoadster(x=22,z=-17){
  const positions=[],normals=[],colors=[],wheelParts=[],wheelPivots=[],matrix=new THREE.Matrix4(),rotation=new THREE.Euler(),q=new THREE.Quaternion();
  let wheelPivot=null;
  const white=0xf0eee8,chrome=0xb7c4ca,leather=0x9c623f,black=0x202a30,wood=0x704931;
  function part(source,color,x,y,z,rx=0,ry=0,rz=0){
    const g=source.index?source.toNonIndexed():source;
    rotation.set(rx,ry,rz);q.setFromEuler(rotation);matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);
    positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);
    const c=new THREE.Color(color);for(let i=0;i<g.attributes.position.count;i++)colors.push(c.r,c.g,c.b);
    for(let i=0;i<g.attributes.position.count;i++){wheelParts.push(wheelPivot?1:0);wheelPivots.push(...(wheelPivot||[0,0,0]));}
    if(g!==source)g.dispose();source.dispose();
  }
  const box=(x,y,z,w,h,d,color,rx=0,ry=0,rz=0)=>part(new THREE.BoxGeometry(w,h,d),color,x,y,z,rx,ry,rz);
  box(0,.58,0,5.35,.46,1.93,white);box(0,.34,0,5.12,.14,1.78,black);
  box(1.38,.94,0,2.35,.27,1.91,white);box(1.4,1.09,0,2.32,.035,.055,chrome);
  box(-2.18,.98,0,.95,.31,1.92,white);box(-2.18,1.15,0,.87,.025,1.68,wood);
  for(const s of [-1,1]){
    box(-.53,.96,s*.98,3.26,.35,.14,white);
    box(-.57,1.145,s*.99,3.35,.035,.055,chrome);
    box(-.47,.53,s*1.015,3.2,.035,.025,chrome);
    box(-1.22,.98,s*1.063,.34,.045,.035,chrome);
    box(-1.65,.87,s*1.055,.018,.45,.014,0x777b7c);
    box(.38,1.25,s*1.14,.25,.13,.19,white);
    box(.33,1.25,s*1.245,.18,.08,.012,chrome);
    for(const ax of [-1.72,1.63]){
      wheelPivot=[ax,.45,s*1.005];
      part(new THREE.CylinderGeometry(.43,.43,.23,20),black,ax,.45,s*1.005,Math.PI/2);
      part(new THREE.CylinderGeometry(.32,.32,.245,20),chrome,ax,.45,s*1.02,Math.PI/2);
      part(new THREE.CylinderGeometry(.25,.25,.25,16),0x414c54,ax,.45,s*1.03,Math.PI/2);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;box(ax+Math.sin(a)*.15,.45+Math.cos(a)*.15,s*1.16,.045,.26,.024,chrome,0,0,-a);
      }
      part(new THREE.CylinderGeometry(.105,.105,.255,12),chrome,ax,.45,s*1.04,Math.PI/2);
    }
    wheelPivot=null;
    for(const ax of [-.66,-1.65]){
      box(ax,.75,s*.48,.7,.14,.7,leather);
      box(ax-.34,1.08,s*.48,.14,.62,.69,leather,0,0,-.12);
      box(ax-.36,1.44,s*.48,.16,.18,.34,leather);
      for(let line=-1;line<=1;line++)box(ax-.255,1.08,s*.48+line*.14,.018,.43,.012,0xd3ad7b);
    }
  }
  box(-.82,.86,0,1.55,.25,.19,wood);box(-.45,1.005,0,.42,.025,.16,chrome);
  box(.16,1.13,0,.26,.21,1.7,wood);box(.02,1.16,-.46,.022,.14,.35,black);
  for(const zz of [-.56,-.37])part(new THREE.CylinderGeometry(.065,.065,.025,12),ivory(),.002,1.17,zz,0,0,Math.PI/2);
  part(new THREE.TorusGeometry(.21,.022,6,20),black,-.12,1.2,-.48,0,Math.PI/2);
  box(-.12,1.2,-.48,.04,.035,.37,chrome);box(-.12,1.11,-.48,.04,.18,.035,chrome);
  // Blue-grey glazing only in the windshield; the roof and side windows stay open.
  box(.24,1.46,0,.035,.62,1.86,0x91adb5,0,0,-.26);
  for(const zz of [-.95,.95])box(.24,1.46,zz,.05,.68,.04,chrome,0,0,-.26);
  box(.15,1.78,0,.055,.045,1.96,chrome);
  box(2.7,.87,0,.11,.67,1.06,chrome);box(2.76,.87,0,.025,.57,.9,black);
  for(let i=-6;i<=6;i++)box(2.78,.87,i*.065,.022,.55,.022,chrome);
  box(2.76,1.22,0,.04,.075,1.15,chrome);
  for(const s of [-1,1]){
    box(2.66,1.0,s*.76,.08,.22,.4,chrome);box(2.71,1.01,s*.76,.018,.13,.29,0xd7f5ff);
    box(-2.7,.97,s*.76,.06,.25,.24,0xb62935);
  }
  box(2.73,.5,0,.08,.09,1.9,chrome);box(-2.71,.47,0,.07,.08,1.86,chrome);
  box(2.801,1.22,0,.02,.21,.2,black);
  for(const zz of [-.048,.048]){
    box(2.815,1.22,zz-.025,.012,.15,.012,chrome);
    box(2.815,1.285,zz,.012,.014,.06,chrome);box(2.815,1.25,zz+.026,.012,.07,.012,chrome);
    box(2.815,1.215,zz,.012,.014,.06,chrome);box(2.815,1.18,zz+.02,.012,.07,.012,chrome,.5);
  }
  box(2.43,1.23,0,.06,.21,.055,chrome);
  for(const s of [-1,1])box(2.4,1.32,s*.065,.16,.025,.12,chrome,s*.65,0,.3);
  const geometry=new THREE.BufferGeometry();
  for(const [key,values]of Object.entries({position:positions,normal:normals,color:colors}))geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,3));
  geometry.setAttribute('propellerPart',new THREE.Float32BufferAttribute(wheelParts,1));geometry.setAttribute('propellerPivot',new THREE.Float32BufferAttribute(wheelPivots,3));
  geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true}));mesh.name='white-rolls-royce';mesh.position.set(x,0,z);mesh.rotation.y=-Math.PI/2;mesh.castShadow=true;mesh.updateMatrixWorld(true);
  return mesh;
}
function ivory(){return 0xece9dc;}

export function createRoadsterLights(scene,car){
  const positions=[],uvs=[],kinds=[];
  function patch(x0,x1,z0,z1,kind){
    for(const [x,z,u,v] of [[x0,z0,0,0],[x1,z0,1,0],[x1,z1,1,1],[x0,z0,0,0],[x1,z1,1,1],[x0,z1,0,1]]){positions.push(x,.045,z);uvs.push(u,v);kinds.push(kind);}
  }
  patch(-2.65,2.65,-1.35,1.35,0);patch(2.75,7.5,-1.45,-.15,1);patch(2.75,7.5,.15,1.45,1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('kind',new THREE.Float32BufferAttribute(kinds,1));
  const uniforms={time:{value:0},speed:{value:0}};
  const m=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,
    vertexShader:'attribute float kind;varying vec2 vUv;varying float vKind;void main(){vUv=uv;vKind=kind;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float time;uniform float speed;varying vec2 vUv;varying float vKind;void main(){float edge=sin(vUv.y*3.14159);float a=edge*(.28+speed*.42);if(vKind>.5)a*=pow(1.-vUv.x,1.5);else a*=sin(vUv.x*3.14159)*(.8+.2*sin(time*5.));gl_FragColor=vec4(mix(vec3(.12,.55,1.),vec3(.7,.85,1.),vKind),a);}' });
  const mesh=new THREE.Mesh(g,m);mesh.name='roadster-driving-lights';mesh.visible=false;scene.add(mesh);
  return{mesh,update(dt,on,speed){mesh.visible=on;if(!on)return;uniforms.time.value+=dt;uniforms.speed.value=Math.min(1,speed/8);mesh.position.copy(car.position);mesh.rotation.copy(car.rotation);}};
}
