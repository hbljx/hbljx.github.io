const palettes = {
  grass: ['#91bd4f', '#517833', '#648d39'],
  earth: ['#856346', '#453b2f', '#654d37'],
  rock: ['#788373', '#374a42', '#506259'],
  deep: ['#4a5e52', '#263a35', '#384e44'],
  path: ['#c4ba89', '#887853', '#a09166'],
  wood: ['#ae8654', '#624636', '#846044'],
  leaves: ['#a2cc56', '#47783d', '#69a74b'],
  light: ['#edffa8', '#89c65b', '#bce987'],
  glass: ['#aff9cc', '#408f72', '#72c59e'],
  gold: ['#ffdb77', '#a06a35', '#d79a47'],
  lilac: ['#c0a6f2', '#624689', '#9175bc'],
  blue: ['#a9e9f0', '#376c86', '#558ea6'],
};

function pixel(random) {
  const value = Math.sin(random * 13.173 + 78.37) * 43758.5453;
  return value - Math.floor(value);
}

function block(x, y, z, material, width = 1, height = 1, depth = 1) {
  return { x, y, z, material, width, height, depth };
}

function paintBlocks(ctx, blocks, originX, originY, unit, zoom = 1) {
  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(zoom, zoom);
  const project = (x, y, z) => [(x - z) * unit, ((x + z) * .46 - y * 1.05) * unit];
  const face = (color, points, texture) => {
    ctx.beginPath();
    points.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = .85;
    ctx.stroke();
    const [a, b, , d] = points;
    for (let i = 0; i < 5; i++) {
      const u = .12 + .72 * pixel(texture + 2 * i), v = .13 + .69 * pixel(texture + 2 * i + 1);
      ctx.fillStyle = i % 2 ? '#f6ffd925' : '#101b1b22';
      ctx.fillRect(Math.floor(a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v),
        Math.floor(a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v), Math.max(1, unit / 7), Math.max(1, unit / 9));
    }
  };
  for (const {x,y,z,material,width,height,depth} of blocks) {
    const a = project(x,y+height,z), b = project(x+width,y+height,z);
    const c = project(x+width,y+height,z+depth), d = project(x,y+height,z+depth);
    const [top, left, right] = palettes[material];
    const seed = 43*x + 297*y + 108*z;
    face(left, [d,c,project(x+width,y,z+depth),project(x,y,z+depth)], seed);
    face(right, [b,c,project(x+width,y,z+depth),project(x+width,y,z)], seed + 11);
    face(top, [a,b,c,d], seed + 17);
  }
  ctx.restore();
}

function sorted(blocks) {
  return blocks.sort((a,b) => (a.x+a.z) - (b.x+b.z) || a.y-b.y);
}

function makeIsland() {
  const blocks = [];
  for (let x=-6; x<=6; x++) for (let z=-6; z<=6; z++) {
    const edge = Math.abs(x) + Math.abs(z);
    if (edge > 9 || (edge === 9 && pixel(x*12+z) < .37)) continue;
    blocks.push(block(x,-1,z, Math.abs(x) < 2 && z >= -2 ? 'path' : 'grass'));
    const depth = Math.min(5, 1 + Math.floor((10-edge)*.47 + pixel(x*32+z)));
    for (let y=2; y<=depth; y++) blocks.push(block(x,-y,z,y===2?'earth':y===depth?'deep':'rock'));
  }
  const trees = [[-5,-2],[-4,2],[-3,4],[3,3],[4,1],[5,-2],[-3,-4],[3,-5]];
  for (const [x,z] of trees) {
    blocks.push(block(x+.32,0,z+.32,'wood',.35,2.05,.35));
    for (const dx of [-1,0,1]) for (const dz of [-1,0,1]) {
      if (Math.abs(dx)+Math.abs(dz) < 2) blocks.push(block(x+.6*dx,1.75,z+.6*dz,'leaves',.76,.65,.76));
    }
    blocks.push(block(x+.12,2.4,z+.12,'leaves',.75,.65,.75));
  }
  for (const x of [-2,1]) for (const z of [-2,1,4]) {
    blocks.push(block(x+.25,0,z+.25,'wood',.27,.56,.27), block(x+.15,.56,z+.15,'gold',.48,.38,.48));
  }
  for (let x=-2; x<=2; x++) for (let y=0; y<5; y++) {
    if (Math.abs(x)===2 || y===4) blocks.push(block(x-1,y,-3,y===4&&x===0?'light':'deep'));
  }
  for (const [x,z] of [[-3,1],[3,0],[-2,3],[5,0],[-4,-3],[2,5],[4,-3]]) {
    blocks.push(block(x+.38,0,z+.47,'leaves',.09,.27,.10),block(x+.29,.25,z+.38,'gold',.28,.16,.27));
  }
  return sorted(blocks);
}

export function createIslandScene(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  canvas.width = 580;
  canvas.height = 450;
  const terrain = makeIsland();
  const origin = [293,230], tile = 17;
  const foreground = terrain.filter(piece => piece.z > -3 && piece.y >= 0);
  const land = document.createElement('canvas');
  land.width = canvas.width;
  land.height = canvas.height;
  paintBlocks(land.getContext('2d'), terrain, ...origin, tile);
  const front = document.createElement('canvas');
  front.width = canvas.width;
  front.height = canvas.height;
  paintBlocks(front.getContext('2d'), foreground, ...origin, tile);
  return (progress, seconds, motion) => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const phase = motion ? seconds : 0;
    const bob = Math.round(Math.sin(phase * 1.3) * 4);
    const y = bob + Math.round(progress * 20);
    ctx.save();
    ctx.translate(0,y);
    // The island, portal and airborne pixels are flat composited layers.
    const halo = ctx.createRadialGradient(310,180,9,310,180,166);
    halo.addColorStop(0,'#9de38532');
    halo.addColorStop(1,'#9de38500');
    ctx.fillStyle = halo;
    ctx.fillRect(144,14,332,332);
    ctx.strokeStyle = '#bad98c38';
    ctx.setLineDash([2,7]);
    for (const radius of [208,245]) {
      ctx.beginPath();
      ctx.ellipse(291,285,radius,radius*.31,-.12,0,Math.PI*2);
      ctx.stroke();
    }
    ctx.drawImage(land,0,0);
    ctx.save();
    ctx.transform(tile,tile*.46,0,-tile*1.05,origin[0],origin[1]-4*tile*.46);
    const portal = ctx.createLinearGradient(0,0,3,4);
    portal.addColorStop(0,'#315a45');
    portal.addColorStop(.5,'#7ad99a');
    portal.addColorStop(1,'#ddff9d');
    ctx.fillStyle = portal;
    ctx.fillRect(0,0,3,4);
    for (let i=0;i<46;i++) {
      ctx.fillStyle = i % 4 ? '#e2ffad67' : '#183e3758';
      ctx.fillRect(pixel(i+93)*2.8,(pixel(i+14)*4 + phase*.52)%3.85,.13 + pixel(i)*.24,.09);
    }
    ctx.restore();
    ctx.drawImage(front,0,0);
    for (let i=0;i<39;i++) {
      const x = 52 + pixel(i+8)*475 + Math.sin(i+phase*.45)*7;
      const py = 47 + (pixel(i+78)*325 + 325 - phase*(4+i%4)%325)%325;
      ctx.fillStyle = i%4 ? '#d6fa8f' : '#e6b570';
      ctx.globalAlpha = .22 + .50 * pixel(i+127);
      ctx.fillRect(Math.round(x),Math.round(py),i%4 ? 2 : 4,i%4 ? 2 : 4);
    }
    ctx.restore();
  };
}
