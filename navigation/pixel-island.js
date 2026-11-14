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

const objects = {
  about: [block(-1,0,-1,'wood',2,1.7,2), block(-1.25,1.7,-1.25,'grass',2.5,.46,2.5), block(.19,0,.98,'path',.5,1.10,.12), block(-.71,.74,.99,'glass',.50,.56,.13)],
  works: [block(-1.17,0,-.87,'rock',2,.37,1.45), block(-1.03,.52,-.93,'deep',1.95,1.45,.6), block(-.84,.72,-.31,'glass',1.54,.98,.12)],
  writing: [block(-1,0,-1,'wood',2,.48,2), block(-.9,.48,-.85,'lilac',1.82,.37,1.7), block(-1,.85,-.9,'path',1.87,.27,1.7), block(-1.04,1.12,-.93,'wood',1.98,.30,1.74)],
  coffee: [block(-.9,0,-.9,'rock',1.85,.35,1.8), block(-.77,.35,-.68,'path',1.47,1.2,1.40), block(-.52,1.5,-.44,'wood',.96,.1,.97), block(.7,.55,-.2,'path',.61,.5,.52)],
  lab: [block(-1.35,0,-.78,'deep',2.65,.41,1.5), block(-.99,.41,-.7,'gold',1.94,1.17,1.38), block(-.30,1.52,-.54,'rock',.55,.42,1.1)],
  court: [block(-1.1,0,-.6,'glass',.55,1.05,.55), block(-.28,0,-.6,'leaves',.55,1.72,.55), block(.55,0,-.6,'light',.55,2.4,.55)],
  pool: [block(-.75,0,-.75,'earth',1.46,.54,1.45), block(-.63,.54,-.62,'wood',1.22,.31,1.23), block(-.15,.85,-.13,'leaves',.25,1.05,.27), block(-.53,1.44,-.47,'leaves',1,.71,1), block(-.18,2.15,-.14,'gold',.44,.3,.45)],
};

export function drawZoneScene(canvas, id, accent) {
  canvas.width = 420;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const origin = [210,179], tile = 18;
  const floors = {about:'wood', works:'deep', writing:'wood', coffee:'path', lab:'rock', court:'deep', pool:'grass'};
  const floor = [], decor = [];
  for(let x=-4;x<=4;x++) for(let z=-4;z<=4;z++){
    const edge = Math.abs(x)+Math.abs(z);
    if(edge>7)continue;
    const material = edge===7 ? 'rock' : floors[id];
    floor.push(block(x,-1,z,material));
    if (edge<7) floor.push(block(x,-2,z,'deep'));
    if (edge<4) floor.push(block(x,-3,z,'rock'));
  }
  for(let x=-4;x<=4;x++){
    if (id==='pool'){
      decor.push(block(x,0,-3,'earth',.85,.47,.85),block(x,1,-3,'leaves',.9,.65,.9));
    } else {
      decor.push(block(x,0,-4,'deep',1,.34,1));
      if (x<=3) decor.push(block(x,.34,-4,x%2?'rock':'deep',1,1.9,.35));
      if (x%2===0) decor.push(block(x,.73,-3.65,id==='writing'?'gold':'glass',.72,.95,.1));
    }
  }
  for (const [x,z] of [[-3,2],[2,2],[-2,-2],[2,-2]]) {
    const festive = id==='pool'||id==='about'||id==='coffee';
    decor.push(block(x,0,z,festive?'earth':'rock',.73,.55,.73));
    decor.push(block(x+.14,.53,z+.13,festive?'leaves':'gold',.46,festive?.92:.28,.46));
  }
  const foreground = {
    about:[block(-2,0,0,'lilac',1.65,.48,2),block(-2,.45,0,'lilac',.48,.58,2),block(.35,0,1.7,'wood',1.53,.48,1.13)],
    works:[block(-2.8,0,.15,'deep',1.44,.64,.84),block(-2.5,.62,.17,'glass',.9,.49,.3),block(1.25,0,.3,'rock',1.45,.69,1.3)],
    writing:[block(-2.9,0,-.9,'wood',.95,2.13,2),block(-2.7,.52,1,'gold',.56,.33,.1),block(1.5,0,1.58,'lilac',1.45,.62,1.05)],
    coffee:[block(-3,0,-.9,'wood',1,1.04,3),block(-2.85,1.02,.6,'deep',.7,.48,.6),block(1.35,0,1.7,'wood',1.22,.7,1.22),block(1.7,.69,2,'gold',.31,.32,.31)],
    lab:[block(-2.8,0,-1,'wood',.95,.98,2.5),block(-2.7,.99,.17,'gold',.55,.37,.65),block(1.45,0,1.15,'deep',1.35,.82,1.34)],
    court:[block(-2.7,0,0,'rock',.55,.8,.55),block(-2,0,0,'lilac',.55,1.31,.55),block(1.6,0,-1,'blue',.65,2,.65),block(2.55,0,-1,'light',.65,2.75,.65)],
    pool:[block(-3,0,-1,'leaves',1.65,.55,1.92),block(-2.7,.55,-.7,'lilac',.55,.45,.5),block(-2,.52,.1,'gold',.43,.44,.4),block(.62,.01,1.35,'blue',2.15,.28,1.62)],
  };
  ctx.fillStyle = accent;
  for (let i=0;i<55;i++){
    ctx.globalAlpha = .09+pixel(i+2)*.51;
    ctx.fillRect(24+pixel(i+100)*366,30+pixel(i+81)*280,i%5===0?3:1,i%5===0?3:1);
  }
  ctx.globalAlpha = .45;
  ctx.strokeStyle = accent;
  ctx.setLineDash([1,8]);
  for (const radius of [149,185]) {
    ctx.beginPath();
    ctx.ellipse(210,231,radius,radius*.34,0,0,Math.PI*2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  paintBlocks(ctx,sorted(floor),...origin,tile);
  const props = objects[id].map(piece=>({...piece,y:piece.y+.1}));
  paintBlocks(ctx,sorted([...decor,...props,...foreground[id]]),...origin,tile);
}
