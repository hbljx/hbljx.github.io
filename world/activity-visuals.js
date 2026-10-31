import * as THREE from 'three';

// Tiny merged props use the existing block style and add no lights.
function boxes(parts) {
  const positions = [], normals = [], colors = [];
  for (const [x, y, z, w, h, d, hex] of parts) {
    const source = new THREE.BoxGeometry(w, h, d), g = source.toNonIndexed();
    source.dispose(); g.translate(x, y, z);
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
    const c = new THREE.Color(hex);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
}
function screen(scene, canvas, w, h, x, y, z, yaw = 0) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(x, y, z); mesh.rotation.y = yaw; mesh.visible = false; scene.add(mesh);
  return { mesh, canvas, ctx: canvas.getContext('2d'), texture };
}
export function createActivityVisuals(scene, avatar, gameCanvas) {
  const ballCanvas = Object.assign(document.createElement('canvas'), { width: 64, height: 32 });
  const c = ballCanvas.getContext('2d'); c.fillStyle = '#d97822'; c.fillRect(0, 0, 64, 32);
  c.strokeStyle = '#4e2e1b'; c.lineWidth = 1.5;
  for (const x of [0, 16, 32, 48, 64]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 32); c.stroke(); }
  c.beginPath(); c.moveTo(0, 16); c.lineTo(64, 16); c.stroke();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(ballCanvas) }));
  ball.visible = false; scene.add(ball);
  const book = boxes([[0, 0, 0, .58, .035, .37, 0x416754], [0, .03, 0, .54, .04, .34, 0xf4e8ca], [0, .055, 0, .025, .015, .34, 0xc3aa76]]);
  book.position.set(0, 1.02, .43); book.rotation.x = .2; book.visible = false; avatar.body.add(book);
  const page = boxes([[.13, 0, 0, .26, .012, .33, 0xfff4d8]]);
  page.position.set(0, 1.085, .43); page.rotation.x = .2; page.visible = false; avatar.body.add(page);
  const mug = boxes([[0, 0, 0, .17, .21, .17, 0xe9d9ad], [0, .108, 0, .13, .01, .13, 0x51301d], [.12, .015, 0, .07, .035, .06, 0xe9d9ad], [.15, -.04, 0, .025, .11, .06, 0xe9d9ad], [.12, -.09, 0, .07, .03, .06, 0xe9d9ad]]);
  mug.position.set(0, .2, .055); mug.visible = false; avatar.hand.add(mug);
  const tvCanvas = Object.assign(document.createElement('canvas'), { width: 320, height: 180 });
  const tv = screen(scene, tvCanvas, 3.6, 2, -2.864, 2.05, -3.2, Math.PI / 2);
  const monitor = screen(scene, gameCanvas, 1.47, .55, 2.13, 1.65, -11.128);
  return { ball, book, page, mug, tv, monitor };
}
export function paintTV(tv, time, channel, paused) {
  const c = tv.ctx; c.fillStyle = channel ? '#acd2de' : '#152d43'; c.fillRect(0, 0, 320, 180);
  if (!channel) {
    c.fillStyle = '#e5c69c'; c.fillRect(0, 109, 320, 71);
    c.fillStyle = '#435252'; c.fillRect(0, 125, 320, 40);
    c.fillStyle = '#e9ddb7'; for (let i = 0; i < 7; i++) c.fillRect((i * 60 - time * 40) % 380, 143, 28, 3);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#436b73' : '#31505e'; c.fillRect(i * 44, 55 + i % 3 * 12, 37, 60); }
    c.fillStyle = '#f3b66b'; c.fillRect(130, 122, 56, 22); c.fillRect(140, 112, 30, 15);
    c.fillStyle = '#132331'; c.fillRect(138, 140, 10, 10); c.fillRect(171, 140, 10, 10);
  } else {
    c.fillStyle = '#be8053'; c.fillRect(0, 125, 320, 55);
    c.fillStyle = '#f3e9d1'; c.fillRect(245, 45, 6, 95); c.fillRect(225, 45, 30, 4);
    c.fillStyle = '#c75136'; c.fillRect(217, 70, 28, 4);
    const t = (time * .45) % 1;
    c.fillStyle = '#ed982f'; c.fillRect(65 + t * 165, 115 - Math.sin(t * Math.PI) * 86, 13, 13);
  }
  c.fillStyle = '#f5eedb'; c.font = 'bold 14px monospace'; c.fillText(channel ? 'PIXEL SPORTS' : 'COAST DRIVE', 12, 23);
  if (paused) { c.fillStyle = '#14222dcc'; c.fillRect(105, 74, 110, 30); c.fillStyle = '#fff'; c.fillText('PAUSED', 133, 95); }
  tv.texture.needsUpdate = true;
}
