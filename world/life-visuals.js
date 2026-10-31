import * as THREE from 'three';

export const LIFE_SPOTS = [
  { id: 'fishing', title: '海边钓鱼台 · 垂钓', at: [-45.6, 2], floor: .2, radius: 2, anchor: [-46.7, .2, 2], yaw: -Math.PI / 2, view: [-42, 5, 9], look: [-47, 1, 2] },
  { id: 'cooking', title: '厨房 · 做饭', at: [17.6, 6.2], floor: 0, radius: 1.7, anchor: [17.6, 0, 5.45], yaw: Math.PI, view: [13.8, 4.2, 8.5], look: [17.6, 1.25, 4.6] },
  { id: 'treadmill', title: '健身区 · 跑步机', at: [-8.3, 11.8], floor: 0, radius: 1.65, anchor: [-8.3, .265, 13.85], yaw: Math.PI, view: [-5, 3.8, 10.2], look: [-8.3, 1.2, 13.6] },
];

// Each multi-colour prop is a single mesh. Everything is hidden outside its
// activity, with no lights, downloads or allocations in the animation methods.
function boxes(parts) {
  const positions = [], normals = [], colors = [];
  for (const [x, y, z, w, h, d, hex] of parts) {
    const source = new THREE.BoxGeometry(w, h, d), g = source.toNonIndexed();
    source.dispose(); g.translate(x, y, z);
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
    const color = new THREE.Color(hex);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

export function createLifeVisuals(scene, avatar) {
  const all = [];
  const add = (mesh, parent = scene) => { mesh.visible = false; parent.add(mesh); all.push(mesh); return mesh; };
  const rod = add(boxes([
    [0, 0, .15, .065, .065, .42, 0x785538],
    [0, 0, .5, .045, .045, .4, 0x263c39],
    [0, 0, .88, .035, .035, .4, 0x385a4b],
    [0, 0, 1.26, .028, .028, .4, 0x385a4b],
    [0, 0, 1.64, .022, .022, .4, 0x385a4b],
    [.06, -.06, .27, .13, .13, .12, 0xb8b7a3],
  ]), avatar.body);
  rod.position.set(-.25, .97, .37);
  const tip = new THREE.Object3D(); tip.position.set(0, 0, 1.84); rod.add(tip);
  const float = add(boxes([[0, 0, 0, .13, .14, .13, 0xeccfa0], [0, .11, 0, .1, .12, .1, 0xcb533d], [0, .23, 0, .025, .13, .025, 0xefe9d5]]));
  const fish = add(boxes([[0, 0, 0, .4, .16, .17, 0x83aeb3], [-.24, 0, 0, .12, .27, .055, 0x4d8b92], [.17, .04, .089, .035, .035, .015, 0x233d42], [0, .11, 0, .15, .09, .035, 0xc5d3be]]));
  const lineData = new Float32Array(9), lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineData, 3));
  const line = add(new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xf4ead2, transparent: true, opacity: .9 })));
  line.frustumCulled = false;
  const tipPos = new THREE.Vector3(), gripPos = new THREE.Vector3();
  const splash = add(boxes([[0, 0, 0, .5, .025, .04, 0xa6d3db], [0, 0, 0, .04, .025, .5, 0xa6d3db]]));

  const pot = add(boxes([
    [0, .1, 0, .56, .2, .5, 0x506b70], [0, .22, 0, .61, .045, .55, 0x98aaaa],
    [0, .245, 0, .5, .015, .44, 0x9e613c], [-.39, .13, 0, .24, .055, .11, 0x263337], [.39, .13, 0, .24, .055, .11, 0x263337],
    [-.12, .26, -.08, .12, .025, .1, 0x83a95b], [.13, .26, .1, .13, .025, .12, 0xd7ac59], [.13, .26, -.12, .08, .025, .11, 0xc95838],
  ])); pot.position.set(17.6, 1.015, 4.57);
  const board = add(boxes([
    [0, 0, 0, .7, .045, .45, 0xba8e53], [-.18, .045, .03, .11, .06, .17, 0x72a14e], [0, .045, .03, .12, .06, .17, 0x72a14e], [.18, .045, .03, .12, .06, .17, 0xd4914b],
  ])); board.position.set(16.82, .985, 4.6);
  const utensil = add(boxes([[0, 0, .15, .035, .035, .33, 0xa77d4d], [0, 0, .36, .13, .025, .12, 0xabb6ae]]), avatar.body);
  utensil.position.set(-.3, 1.08, .48);
  const steam = add(boxes([[-.14, .1, -.08, .09, .17, .09, 0xe2e7dc], [.12, .28, .07, .11, .2, .11, 0xe2e7dc], [-.03, .47, -.04, .12, .17, .12, 0xe2e7dc]]));
  steam.position.set(17.6, 1.28, 4.57);
  const food = add(boxes([[0, 0, 0, .6, .025, .5, 0xeee5cf], [-.12, .05, 0, .2, .075, .28, 0x82a451], [.13, .07, 0, .23, .12, .27, 0xce9355]]));
  food.position.set(16.82, 1.02, 4.6);

  const beltCanvas = Object.assign(document.createElement('canvas'), { width: 32, height: 64 });
  const beltContext = beltCanvas.getContext('2d'); beltContext.fillStyle = '#26302f'; beltContext.fillRect(0, 0, 32, 64);
  beltContext.fillStyle = '#53645e'; for (let y = 0; y < 64; y += 16) beltContext.fillRect(1, y, 30, 2);
  const beltTexture = new THREE.CanvasTexture(beltCanvas); beltTexture.colorSpace = THREE.SRGBColorSpace;
  beltTexture.wrapT = THREE.RepeatWrapping; beltTexture.magFilter = THREE.NearestFilter; beltTexture.generateMipmaps = false; beltTexture.minFilter = THREE.LinearFilter;
  const belt = add(new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.64), new THREE.MeshLambertMaterial({ map: beltTexture })));
  belt.rotation.x = -Math.PI / 2; belt.position.set(-8.3, .27, 13.85);

  function hide() { for (const mesh of all) mesh.visible = false; }
  function fishing(time, phase = 'waiting', progress = 0) {
    rod.visible = true; line.visible = phase !== 'idle';
    rod.rotation.x = -.55 + (phase === 'casting' ? -.8 * Math.sin(Math.min(1, progress) * Math.PI) : phase === 'reeling' ? -.2 - .08 * Math.sin(time * 12) : -.04);
    avatar.root.updateMatrixWorld(true);
    avatar.hand.getWorldPosition(gripPos); avatar.body.worldToLocal(gripPos); rod.position.copy(gripPos);
    rod.updateMatrixWorld(true); tip.getWorldPosition(tipPos);
    const casting = phase === 'casting', reeling = phase === 'reeling', caught = phase === 'caught';
    const p = Math.max(0, Math.min(1, progress));
    let x = -50.6, y = -1.01 + Math.sin(time * 2.5) * .035, z = 2;
    if (casting) { x = tipPos.x + (x - tipPos.x) * p; z = tipPos.z + (z - tipPos.z) * p; y = tipPos.y + (y - tipPos.y) * p + Math.sin(p * Math.PI) * 1.5; }
    if (reeling) { x += (tipPos.x - x) * p; y += (tipPos.y - .65 - y) * p; z += (tipPos.z - z) * p; }
    if (caught) { x = tipPos.x; y = tipPos.y - .65; z = tipPos.z; }
    if (phase === 'bite') y -= .08 + Math.sin(time * 24) * .08;
    float.visible = !caught && phase !== 'idle'; float.position.set(x, y, z);
    fish.visible = caught || (reeling && p > .55); fish.position.set(x, y - .12, z); fish.rotation.z = Math.sin(time * 15) * .18;
    lineData[0] = tipPos.x; lineData[1] = tipPos.y; lineData[2] = tipPos.z;
    lineData[3] = (tipPos.x + x) / 2; lineData[4] = (tipPos.y + y) / 2 - (reeling || caught ? .02 : .17); lineData[5] = (tipPos.z + z) / 2;
    lineData[6] = x; lineData[7] = y + .2; lineData[8] = z; lineGeometry.attributes.position.needsUpdate = true;
    splash.visible = phase === 'bite'; splash.position.set(x, -1.005, z); splash.scale.setScalar(1 + Math.sin(time * 15) * .25);
  }
  function cooking(time, phase = 'prep', progress = 0) {
    pot.visible = true; board.visible = phase === 'prep'; food.visible = phase === 'ready'; utensil.visible = phase !== 'ready'; steam.visible = phase !== 'prep';
    avatar.root.updateMatrixWorld(true);
    gripPos.set(0, -11.5 * 1.8 / 32, 0); avatar.armL.localToWorld(gripPos);
    avatar.body.worldToLocal(gripPos); utensil.position.copy(gripPos);
    utensil.rotation.y = phase === 'prep' ? .55 : -.6 + Math.sin(time * 5) * .2;
    utensil.rotation.x = phase === 'prep' ? 0 : .08;
    steam.position.y = 1.3 + (time * .18 % .22); steam.scale.setScalar(.8 + Math.sin(time * 2) * .1);
    pot.rotation.z = phase === 'cooking' ? Math.sin(time * 12) * .007 * Math.min(1, progress + .2) : 0;
  }
  function treadmill(time, speed = 1) { belt.visible = true; beltTexture.offset.y = -(time * speed * .9 % 1); }
  return { hide, fishing, cooking, treadmill, rod, float, fish, pot, belt };
}
