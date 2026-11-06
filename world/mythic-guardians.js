import * as THREE from 'three';

const palettes = {
  gold: new THREE.MeshStandardMaterial({ color: 0xd8a72e, metalness: .82, roughness: .24, emissive: 0x5b3005, emissiveIntensity: .24, side: THREE.DoubleSide }),
  goldLight: new THREE.MeshStandardMaterial({ color: 0xffdf78, metalness: .72, roughness: .2, emissive: 0x9b4d08, emissiveIntensity: .45, side: THREE.DoubleSide }),
  goldDark: new THREE.MeshStandardMaterial({ color: 0x70400e, metalness: .8, roughness: .32, side: THREE.DoubleSide }),
  ember: new THREE.MeshStandardMaterial({ color: 0xea4a1c, metalness: .53, roughness: .27, emissive: 0xa51d08, emissiveIntensity: .55, side: THREE.DoubleSide }),
  flame: new THREE.MeshStandardMaterial({ color: 0xffa12a, metalness: .45, roughness: .23, emissive: 0xff5109, emissiveIntensity: .75, side: THREE.DoubleSide }),
  firelight: new THREE.MeshStandardMaterial({ color: 0xffe58a, metalness: .32, roughness: .2, emissive: 0xffa51c, emissiveIntensity: .9, side: THREE.DoubleSide }),
};
const sculptMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: .68, roughness: .27, emissive: 0x241006, emissiveIntensity: .3, side: THREE.DoubleSide });

function batch() { return new Map(); }
function join(into, from) {
  for(const [color,geometries] of from) {
    if(!into.has(color)) into.set(color,[]);
    into.get(color).push(...geometries);
  }
}
function add(target, color, geometry, x = 0, y = 0, z = 0, rz = 0) {
  geometry.rotateZ(rz);
  geometry.translate(x, y, z);
  if (!target.has(color)) target.set(color, []);
  target.get(color).push(geometry);
}
function shape(points, depth = .42) {
  const path = new THREE.Shape();
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
  path.closePath();
  return new THREE.ExtrudeGeometry(path, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .08, bevelThickness: .06 });
}
function ellipse(rx, ry, rz = .4) {
  const geometry = new THREE.SphereGeometry(1, 12, 8);
  geometry.scale(rx, ry, rz);
  return geometry;
}
function spline(points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.TubeGeometry(curve, 28, radius, 7, false);
}
function flush(parent, pieces) {
  const merged = new THREE.BufferGeometry(), vertices = [], colors = [];
  for (const [color, geometries] of pieces) {
    const tint = palettes[color].color;
    for (const geometry of geometries) {
      const flat = geometry.toNonIndexed();
      vertices.push(...flat.attributes.position.array);
      for(let i=0;i<flat.attributes.position.count;i++) colors.push(tint.r,tint.g,tint.b);
      flat.dispose(); geometry.dispose();
    }
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  merged.computeVertexNormals();
  parent.add(new THREE.Mesh(merged, sculptMaterial));
}

function dragon() {
  const root = new THREE.Group(), body = batch();
  add(body, 'gold', spline([[-7,-1,0],[-5,-2.2,0],[-3.6,-1.7,0],[-2.2,.1,0],[-.6,1.5,0],[1.2,1.9,0],[2.1,2.5,0]], .72));
  add(body, 'goldLight', ellipse(1.55,.87,.68), -.2, 1.55, .04, -.28);
  add(body, 'gold', shape([[1.1,1.8],[1.45,2.7],[2.15,3.15],[2.9,2.93],[3.25,2.6],[2.56,2.39],[1.96,1.95]], .5), 0,0,.1);
  add(body, 'goldLight', shape([[2.42,2.92],[2.34,3.78],[2.81,3.26],[3.12,3.07]], .24), 0,0,.42);
  add(body, 'goldLight', shape([[1.98,3.05],[1.52,3.67],[2.28,3.34]], .24), 0,0,.43);
  add(body, 'goldDark', shape([[2.78,2.67],[3.4,2.46],[3.02,2.27]], .24), 0,0,.48);
  add(body, 'firelight', ellipse(.13,.13,.12), 2.78,2.73,.79);
  const wings = [];
  for (const side of [-1,1]) {
    const pivot = new THREE.Group(); pivot.position.set(-1.2,1.75,side*.15); root.add(pivot); wings.push([pivot,side]);
    const wing = batch(), feathers = batch();
    add(wing,'gold',shape([[0,0],[-.3,1.8],[-1.7,4.2],[-1.42,2.45],[-3.3,3.65],[-2.55,1.82],[-4.05,2.4],[-3.05,.6],[-2.8,-.15]],.32));
    for (let i=0;i<5;i++) {
      const x=-.45-i*.55;
      add(feathers,'goldLight',shape([[x,-.12],[x-.95,1.05+i*.08],[x-.22,.5+i*.05],[x+.12,.18]],.2),0,0,.4+i*.015);
    }
    join(wing,feathers); flush(pivot,wing);
  }
  for(let i=0;i<13;i++) {
    const t=i/12, x=-6.6+t*7.7, y=-1.25+Math.sin(t*Math.PI*1.65)*1.7;
    add(body,i%3?'goldLight':'goldDark',shape([[x-.32,y+.25],[x,y+.52],[x+.34,y+.2],[x,y-.12]],.12),0,0,.61);
    add(body,'goldLight',ellipse(.58,.43,.29),x,y,.48);
  }
  add(body,'goldLight',spline([[2.55,2.35,.3],[3.1,1.8,.3],[3.7,1.95,.3],[4.05,2.32,.3]],.055));
  add(body,'goldDark',shape([[-3.3,-1.65],[-3.65,-2.4],[-3.08,-2.02],[-2.8,-1.8]],.2),0,0,.15);
  add(body,'goldDark',shape([[-1.2,-.65],[-1.5,-1.48],[-.98,-1.1],[-.72,-.5]],.2),0,0,.15);
  for(const [x,y,spread] of [[-3.2,-1.95,-1],[-1.05,-1.05,1]]) {
    add(body,'goldLight',shape([[x-.16,y+.3],[x+.14,y+.36],[x+.28,y-.14],[x+.08,y-.3]],.24),0,0,.45);
    for(let claw=0;claw<5;claw++) {
      const dx=(claw-2)*.15*spread;
      add(body,claw%2?'goldLight':'goldDark',shape([[x+.08+dx,y-.12],[x+.18+dx,y-.38],[x+.34+dx,y-.64],[x+.23+dx,y-.43]],.14),0,0,.58+claw*.012);
    }
  }
  for(let i=0;i<7;i++) {
    const x=1.55-i*.38, y=2.56-i*.18;
    add(body,i%2?'goldLight':'goldDark',shape([[x,y],[x-.13,y+.74],[x+.34,y+.37]],.16),0,0,.66);
  }
  add(body,'goldLight',shape([[-7.15,-.8],[-8.25,.25],[-7.55,-.1],[-8.05,-.65],[-7.35,-.42]],.3),0,0,.1);
  flush(root,body);
  return { root, wings, phase: 0 };
}

function phoenix() {
  const root = new THREE.Group(), body = batch(), wings=[];
  add(body,'ember',ellipse(1.05,1.35,.64),0,0,0,-.12);
  add(body,'flame',shape([[.2,.55],[.8,1.62],[.65,2.55],[1.2,1.85],[1.05,3.18],[1.65,2.22],[1.75,1.55],[1.1,.42]],.38),0,0,.12);
  add(body,'firelight',shape([[.3,.25],[.65,1.02],[.52,1.72],[1.05,.88],[.88,.22]],.24),0,0,.55);
  add(body,'flame',shape([[.42,1.32],[.58,2.05],[.98,2.66],[1.05,1.85]],.22),0,0,.42);
  add(body,'firelight',shape([[.92,1.83],[1.1,2.5],[1.46,2.93],[1.38,2.1]],.2),0,0,.44);
  add(body,'flame',shape([[-.1,1.55],[-.48,2.15],[-.38,2.86],[.12,2.25]],.23),0,0,.35);
  add(body,'firelight',shape([[.5,2.14],[.6,3.13],[.92,2.5]],.2),0,0,.58);
  add(body,'ember',shape([[.72,1.45],[1.68,1.3],[1.08,1.05]],.3),0,0,.62);
  add(body,'flame',ellipse(.42,.38,.3),.86,1.72,.62);
  add(body,'firelight',shape([[1.05,1.83],[1.76,1.64],[1.2,1.45]],.24),0,0,.74);
  add(body,'firelight',shape([[.76,1.97],[.91,2.46],[1.02,2.02]],.2),0,0,.76);
  add(body,'firelight',ellipse(.095,.095,.09),.86,1.58,.83);
  for(const side of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.set(side*.42,.75,side*.1);root.add(pivot);wings.push([pivot,side]);
    const silhouette=batch(), plumes=batch();
    add(silhouette,'ember',shape([[0,0],[side*1.15,.72],[side*2.35,1.05],[side*3.65,1.65],[side*5.25,2.45],[side*4.22,1.28],[side*5.15,1.02],[side*3.8,.48],[side*4.55,.02],[side*2.75,-.22],[side*1.55,-.16]],.32));
    for(let i=0;i<6;i++) {
      const x=side*(1.05+i*.61), y=.08+i*.3;
      add(plumes,i%2?'flame':'firelight',shape([[x,y],[x+side*.92,y+.82],[x+side*.5,y+.15],[x-side*.18,y-.26]],.2),0,0,.4+i*.02);
    }
    join(silhouette,plumes);flush(pivot,silhouette);
  }
  for(let i=0;i<7;i++) {
    const x=-.42+i*.15, end=-4.9+i*.28, y=-1.15-i*.7;
    const color=i%3===0?'firelight':i%2?'flame':'ember';
    add(body,color,shape([[x,-.68],[x-.24,-1.24],[end,y-2.35],[end+.2,y-1.5],[x+.2,-.82]],.18),0,0,.24+i*.025);
  }
  for(const x of [-.45,.28]) {
    add(body,'ember',shape([[x-.12,-.5],[x-.23,-1.28],[x+.03,-1.06],[x+.16,-.55]],.2),0,0,.3);
    for(let toe=0;toe<3;toe++) {
      const dx=(toe-1)*.22;
      add(body,toe===1?'firelight':'flame',shape([[x+dx,-1.02],[x+dx+.13,-1.3],[x+dx+.29,-1.58],[x+dx+.16,-1.38]],.15),0,0,.43+toe*.012);
    }
  }
  flush(root,body);
  return { root, wings, phase: 1.7 };
}

export function createMythicGuardians(scene) {
  const gold = dragon(), fire = phoenix();
  gold.root.position.set(-25,29,-7); gold.root.scale.setScalar(1.9);
  fire.root.position.set(25,30,-7); fire.root.scale.set(-1.9,1.9,1.9);
  scene.add(gold.root,fire.root);
  const sparks=[];
  for(let i=0;i<64;i++) sparks.push((i*37%97)/97*54-27,25+(i*19%43)/43*19,-5+(i*13%11)*.18);
  const points=new THREE.BufferGeometry();points.setAttribute('position',new THREE.Float32BufferAttribute(sparks,3));
  const embers=new THREE.Points(points,new THREE.PointsMaterial({color:0xffa336,size:.42,transparent:true,opacity:.82,depthWrite:false}));
  scene.add(embers);
  const flight=[[gold,1.35],[fire,1.55]];
  let time=0;
  return { update(dt) {
    time+=Math.min(dt,.08);
    for(const [guardian,rate] of flight) {
      const direction=guardian===gold?1:-1, phase=time*.34+guardian.phase;
      guardian.root.position.x=(guardian===gold?-25:25)+direction*Math.sin(phase)*4.2;
      guardian.root.position.y=(guardian===gold?29:30)+Math.sin(phase*1.7)*1.15;
      guardian.root.position.z=-7+Math.cos(phase)*5.5;
      guardian.root.rotation.y=Math.sin(phase)*.12;
      guardian.root.rotation.z=Math.sin(phase*1.4)*.065;
      for(const [wing,side] of guardian.wings) wing.rotation.z=side*(.11+Math.sin(time*rate+guardian.phase)*.19);
    }
    embers.rotation.y=time*.025;
  }};
}
