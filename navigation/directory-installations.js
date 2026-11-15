// Procedural, perspective-projected installations. One shared scheduler only runs
// while a canvas is on screen. Geometry and projection buffers are reused.
const TAU = Math.PI * 2;
const TYPES = new Set(['about', 'works', 'writing', 'court']);
const PALETTES = {
  about: ['255,206,133', '137,236,236'],
  works: ['117,255,216', '141,165,255'],
  writing: ['227,198,255', '255,223,168'],
  court: ['113,216,255', '126,255,211'],
};
const LABELS = {about:'PERSONAL / NEXUS',works:'NEURAL / ENGINE',writing:'THE / LIVING ARCHIVE',court:'GLOBAL / OBSERVATORY'};
const rgba = (color, alpha) => `rgba(${color},${alpha})`;

class Installation {
  constructor(canvas, type) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type;
    this.colors = PALETTES[type];
    this.active = false;
    this.time = 0;
    this.yaw = 0;
    this.pitch = .3;
    this.zoom = 1;
    this.point = new Float32Array(3);
    this.nodes = new Float32Array(180 * 3);
    this.projected = new Float32Array(180 * 3);
    this.edges = [];
    for (let i = 0; i < 180; i++) {
      const y = 1 - 2 * (i + .5) / 180, r = Math.sqrt(1 - y * y), a = i * 2.399963;
      this.nodes.set([Math.cos(a) * r * 101, y * 101, Math.sin(a) * r * 101], i * 3);
    }
    for (let i = 0; i < 180; i++) for (let j = i + 1; j < 180; j++) {
      if (Math.hypot(this.nodes[i*3]-this.nodes[j*3], this.nodes[i*3+1]-this.nodes[j*3+1], this.nodes[i*3+2]-this.nodes[j*3+2]) < 29) this.edges.push(i, j);
    }
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.scale = this.canvas.width / 560;
    const c = this.ctx;
    this.aura = c.createRadialGradient(280, 195, 4, 280, 195, 195);
    this.aura.addColorStop(0, rgba(this.colors[0], .13));
    this.aura.addColorStop(.45, rgba(this.colors[0], .055));
    this.aura.addColorStop(1, rgba(this.colors[0], 0));
    this.core = c.createRadialGradient(280, 190, 0, 280, 190, 65);
    this.core.addColorStop(0, '#f3fff8');
    this.core.addColorStop(.07, rgba(this.colors[0], .95));
    this.core.addColorStop(.24, rgba(this.colors[0], .28));
    this.core.addColorStop(1, rgba(this.colors[0], 0));
    this.shell = c.createRadialGradient(280,190,55,280,190,110);
    this.shell.addColorStop(0,rgba(this.colors[0],.015));
    this.shell.addColorStop(.75,rgba(this.colors[0],.035));
    this.shell.addColorStop(.94,rgba(this.colors[0],.16));
    this.shell.addColorStop(1,rgba(this.colors[0],0));
    this.paper = c.createLinearGradient(145, 140, 410, 290);
    this.paper.addColorStop(0, '#fff6e5');
    this.paper.addColorStop(.45, '#d9d4ec');
    this.paper.addColorStop(.52, '#aa9abf');
    this.paper.addColorStop(.62, '#f5eaf6');
    this.paper.addColorStop(1, '#b6a3c6');
    this.draw();
  }

  project(x, y, z, out = this.point, offset = 0) {
    const xx = x * this.cy + z * this.sy;
    const zz = -x * this.sy + z * this.cy;
    const yy = y * this.cp - zz * this.sp;
    const depth = y * this.sp + zz * this.cp;
    const f = 620 / (620 + depth) * this.zoom;
    out[offset] = 280 + xx * f;
    out[offset+1] = 190 - yy * f;
    out[offset+2] = depth;
    return out;
  }

  vertex(x, y, z, first = false) {
    const p = this.project(x, y, z);
    if (first) this.ctx.moveTo(p[0], p[1]);
    else this.ctx.lineTo(p[0], p[1]);
  }

  stroke(color, alpha = 1, width = 1) {
    this.ctx.strokeStyle = rgba(color, alpha);
    this.ctx.lineWidth = width;
    this.ctx.stroke();
  }

  dot(x, y, radius, color, alpha = 1) {
    const c = this.ctx;
    c.fillStyle = rgba(color, alpha);
    c.beginPath(); c.arc(x, y, radius, 0, TAU); c.fill();
  }

  ring(radius, y, start, length, color, alpha, width = 1) {
    this.ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const a = start + length * i / 100;
      this.vertex(Math.cos(a) * radius, y, Math.sin(a) * radius, i === 0);
    }
    this.stroke(color, alpha, width);
  }

  draw() {
    if (!this.ctx || !this.canvas.width) return;
    const c = this.ctx, t = this.time, primary = this.colors[0], secondary = this.colors[1];
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.clearRect(0, 0, 560, 400);
    c.fillStyle = this.aura; c.fillRect(0, 0, 560, 400);
    this.yaw = this.type === 'writing' ? -.18 + Math.sin(t*.3)*.035 : t * .13;
    this.pitch = this.type === 'writing' ? .7 : .28;
    this.cy = Math.cos(this.yaw); this.sy = Math.sin(this.yaw);
    this.cp = Math.cos(this.pitch); this.sp = Math.sin(this.pitch);
    // Subtle star field with deterministic positions; no random work per frame.
    for (let i = 0; i < 42; i++) {
      const x = 65 + (i * 79.73) % 430, y = 42 + (i * 43.77) % 280;
      this.dot(x, y + Math.sin(t*.3+i)*5, i%7 === 0 ? 1.4 : .65, primary, .16 + .14*Math.sin(t+i));
    }
    // Etched instrument bezel, separated arcs and fine measurement ticks.
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * TAU, r = i%5 === 0 ? 170 : 174;
      c.beginPath(); c.moveTo(280+Math.cos(a)*r,190+Math.sin(a)*r*.86);
      c.lineTo(280+Math.cos(a)*178,190+Math.sin(a)*178*.86);
      this.stroke(primary, i%5 === 0 ? .32 : .12, .7);
    }
    c.beginPath(); c.ellipse(280,190,186,160,0,-.4,.7); this.stroke(primary,.5);
    c.beginPath(); c.ellipse(280,190,186,160,0,2.7,3.9); this.stroke(secondary,.4);
    if (this.type === 'about') this.crystal(t);
    else if (this.type === 'works') this.neural(t);
    else if (this.type === 'writing') this.book(t);
    else this.globe(t);
    c.font = '9px ui-monospace, Consolas, monospace';
    c.letterSpacing = '2px'; c.textAlign = 'center';
    c.fillStyle = rgba(primary,.65);
    c.fillText(LABELS[this.type],280,376);
    c.letterSpacing = '0px';
    c.beginPath(); c.moveTo(232,356); c.lineTo(328,356); this.stroke(primary,.25);
    this.dot(280,356,2,secondary,.8);
  }

  crystal(t) {
    const c = this.ctx, a = this.colors[0], b = this.colors[1];
    this.pitch = .4; this.cp = Math.cos(this.pitch); this.sp = Math.sin(this.pitch);
    for (let k = 0; k < 4; k++) {
      this.ring(105+k*14,-105-k*3,0,TAU,a,.12 + (k === 0 ? .22 : 0));
      this.ring(105+k*14,-105-k*3,t*(k%2 ? -.3 : .3)+k, .7,a,.7,1.6);
    }
    const hover = Math.sin(t*.8)*7;
    // Back faces precede front faces so the translucent crystal retains volume.
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 6; i++) {
      const angle = i*TAU/6, next = (i+1)*TAU/6;
      const front = Math.sin(angle+TAU/12+this.yaw) < 0;
      if (front !== Boolean(pass)) continue;
      for (let half = 0; half < 2; half++) {
        c.beginPath(); this.vertex(0,(half ? -77 : 100)+hover,0,true);
        this.vertex(Math.cos(angle)*62,hover,Math.sin(angle)*62);
        this.vertex(Math.cos(next)*62,hover,Math.sin(next)*62); c.closePath();
        c.fillStyle = rgba(i%2 ? b : a, front ? .13 + (i%3)*.045 : .035); c.fill();
        this.stroke(front ? a : b,front ? .7 : .2,.9);
      }
    }
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = this.core; c.fillRect(210,120,140,140);
    c.beginPath(); this.vertex(0,-76+hover,0,true); this.vertex(0,100+hover,0); this.stroke(a,.8,1.5);
    for (let j = 0; j < 6; j++) {
      const angle = j*TAU/6 - t*.1, x = Math.cos(angle)*143,z = Math.sin(angle)*143,y = 12+Math.sin(t+j)*12;
      c.beginPath(); this.vertex(Math.cos(angle)*70,0,Math.sin(angle)*70,true);
      this.vertex(x,y,z); this.stroke(b,.22);
      const p = this.project(x,y,z), px = p[0], py = p[1];
      c.strokeStyle = rgba(b,.7); c.lineWidth=.8; c.strokeRect(px-8,py-8,16,16);
      this.dot(px,py,2,b,.95);
      const f = (t*.25+j*.16)%1;
      const q = this.project(x*f,y*f,z*f); this.dot(q[0],q[1],1.8,a,.9);
    }
    c.globalCompositeOperation = 'source-over';
  }

  neural(t) {
    const c = this.ctx, a = this.colors[0], b = this.colors[1], points = this.projected;
    c.fillStyle=this.shell;c.fillRect(170,80,220,220);
    for (let i = 0; i < 180; i++) this.project(this.nodes[i*3],this.nodes[i*3+1],this.nodes[i*3+2],points,i*3);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.edges.length; i+=2) {
      const u = this.edges[i]*3,v=this.edges[i+1]*3, depth = (points[u+2]+points[v+2])*.5;
      c.beginPath(); c.moveTo(points[u],points[u+1]); c.lineTo(points[v],points[v+1]);
      this.stroke(depth < 0 ? a : b,depth < 0 ? .27 : .075,.65);
      if (i%14 === 0) {
        const f = (t*.45+i*.071)%1;
        this.dot(points[u]+(points[v]-points[u])*f,points[u+1]+(points[v+1]-points[u+1])*f,1.5,a,.85);
      }
    }
    for (let i=0;i<180;i++) this.dot(points[i*3],points[i*3+1],points[i*3+2]<0?1.5:.8,i%9? a:b,points[i*3+2]<0?.75:.2);
    c.fillStyle = this.core; c.fillRect(210,120,140,140);
    for(let j=0;j<3;j++) {
      c.beginPath();
      for(let i=0;i<=150;i++) {
        const angle = i/150*TAU, x=Math.cos(angle)*139, z=Math.sin(angle)*139;
        this.vertex(x,Math.sin(angle+j*1.9)*64,z*Math.cos(j*1.1),i===0);
      }
      this.stroke(j===1?b:a,.25,.8);
      const angle=t*(.45+j*.12)+j*2;
      const p=this.project(Math.cos(angle)*139,Math.sin(angle+j*1.9)*64,Math.sin(angle)*139*Math.cos(j*1.1));
      this.dot(p[0],p[1],3,j===1?b:a,1);
    }
    c.globalCompositeOperation='source-over';
    this.ring(125,-124,0,TAU,a,.17);
  }

  pageVertex(u, v, side, angle, lift, first = false) {
    const bend = Math.sin(u*Math.PI)* (angle ? 23 : 12);
    const x = side * Math.cos(angle) * u * 144;
    const y = 8 + lift + Math.sin(angle)*u*129 + bend;
    this.vertex(x,y,(v-.5)*184 + Math.sin(angle)*Math.sin(u*Math.PI)*18,first);
  }

  leaf(side, angle, lift, cover = false) {
    const c=this.ctx;
    c.beginPath();
    this.pageVertex(0,0,side,angle,lift,true);
    for(let i=1;i<=24;i++)this.pageVertex(i/24,0,side,angle,lift);
    this.pageVertex(1,1,side,angle,lift);
    for(let i=23;i>=0;i--)this.pageVertex(i/24,1,side,angle,lift);
    c.closePath();c.fillStyle=cover?'#423052':this.paper;c.fill();
    this.stroke(cover ? this.colors[1]: '247,231,255',cover?.65:.5,cover?1.5:.6);
    if(cover)return;
    // Text follows the curved surface of each leaf, including the turning leaf.
    for(let row=0;row<13;row++) {
      const v=.18+row*.049, end=row%4===0?.7:.88;
      c.beginPath();
      for(let i=0;i<=22;i++)this.pageVertex(.14+(end-.14)*i/22,v,side,angle,lift+.2,i===0);
      this.stroke('91,70,113',row<2?.55:.29,row<2?1.8:.75);
    }
    c.beginPath();
    for(let i=0;i<=24;i++)this.pageVertex(.13+.76*i/24,.9,side,angle,lift+.3,i===0);
    this.stroke('169,119,75',.5,.9);
  }

  book(t) {
    const c=this.ctx, a=this.colors[0], b=this.colors[1];
    const hover=Math.sin(t*.55)*4-25;
    this.ring(155,-62,0,TAU,a,.13);
    this.ring(164,-64,t*.15,1.4,b,.5);
    this.leaf(-1,0,hover-7,true);this.leaf(1,0,hover-7,true);
    for(let i=0;i<5;i++) {this.leaf(-1,0,hover-5+i);this.leaf(1,0,hover-5+i);}
    c.beginPath(); this.vertex(0,hover+9,-94,true);this.vertex(0,hover+9,94); this.stroke('255,233,190',.9,2);
    // Hold the spread open, then turn a flexible page right-to-left with easing.
    const cycle=t%7.8, phase=Math.min(1,Math.max(0,(cycle-1.5)/4.6));
    const angle=(phase*phase*(3-2*phase))*Math.PI;
    if(phase>0&&phase<1) {
      this.leaf(1,Math.max(0,angle-.12),hover+1);
      this.leaf(1,angle,hover+2);
    }
    for(let i=0;i<18;i++) {
      const life=(t*.15+i/18)%1,x=280+Math.sin(i*7.9)*95*life,y=220-life*155;
      this.dot(x,y,i%3===0?1.7:.8,i%2?a:b,Math.sin(life*Math.PI)*.65);
    }
    // Bookmark ribbon drapes from the gutter below the near edge.
    c.beginPath();this.vertex(10,hover+9,60,true);this.vertex(10,hover+9,117);
    this.vertex(18,hover+7,111);this.vertex(25,hover+7,118);this.vertex(25,hover+9,60);
    c.closePath();c.fillStyle='#aa6b8c';c.fill();this.stroke(b,.45,.6);
  }

  globe(t) {
    const c=this.ctx,a=this.colors[0],b=this.colors[1];
    c.fillStyle=this.shell;c.fillRect(170,80,220,220);
    this.yaw=t*.12-.4;this.cy=Math.cos(this.yaw);this.sy=Math.sin(this.yaw);
    for(let lat=-60;lat<=60;lat+=20) {
      const phi=lat*Math.PI/180;
      this.ring(Math.cos(phi)*106,Math.sin(phi)*106,0,TAU,a,.21,.65);
    }
    for(let lon=0;lon<12;lon++) {
      c.beginPath();
      for(let i=0;i<=90;i++) {
        const p=i/90*TAU,l=lon/12*Math.PI;
        this.vertex(Math.cos(p)*Math.cos(l)*106,Math.sin(p)*106,Math.cos(p)*Math.sin(l)*106,i===0);
      }
      this.stroke(a,.17,.65);
    }
    // Stylized land contours in longitude/latitude, sampled once below.
    for(let i=0;i<LAND.length;i++) {
      const p=this.project(LAND[i][0],LAND[i][1],LAND[i][2]);
      if(p[2]<15)this.dot(p[0],p[1],1.35,b,.62);
    }
    this.ring(140,-106,0,TAU,a,.22);
    this.ring(144,-106,-t*.4,1.5,b,.9,1.6);
    // Sweeping meridian and orbiting transmission points.
    c.beginPath();
    for(let i=0;i<=70;i++) {
      const p=-Math.PI/2+i/70*Math.PI,l=t*.6;
      this.vertex(Math.cos(p)*Math.cos(l)*109,Math.sin(p)*109,Math.cos(p)*Math.sin(l)*109,i===0);
    }
    this.stroke(b,.8,1.5);
    for(let j=0;j<3;j++) {
      c.beginPath();
      for(let i=0;i<=70;i++) {
        const q=i/70,angle=q*2+j*2,r=108+Math.sin(q*Math.PI)*44;
        this.vertex(Math.cos(angle)*r,Math.sin(q*Math.PI)*62-25,Math.sin(angle)*r,i===0);
      }
      this.stroke(j===1?b:a,.45,1);
      const q=(t*.19+j*.3)%1,angle=q*2+j*2,r=108+Math.sin(q*Math.PI)*44;
      const p=this.project(Math.cos(angle)*r,Math.sin(q*Math.PI)*62-25,Math.sin(angle)*r);
      this.dot(p[0],p[1],2.4,b,.9);
    }
    // Abstract signal chart, deliberately without fabricated quotes or prices.
    c.fillStyle='rgba(8,26,32,.8)';c.fillRect(332,231,119,71);
    c.strokeStyle=rgba(a,.3);c.lineWidth=.7;c.strokeRect(332,231,119,71);
    for(let i=0;i<13;i++) {
      const x=343+i*8, y=280-i*2.2-Math.sin(i*1.8+t*.5)*7;
      c.beginPath();c.moveTo(x,y-8);c.lineTo(x,y+8);this.stroke(i%4?b:a,.8,.7);
      c.fillStyle=rgba(i%4?b:a,.65);c.fillRect(x-2,y-3,4,7);
    }
    c.font='8px ui-monospace, Consolas, monospace';c.textAlign='left';c.fillStyle=rgba(a,.65);c.fillText('SIGNAL STUDY',340,243);
  }
}

// Coarse decorative continent silhouettes; densified into a stable point cloud.
const CONTOURS = [
  [[-165,65],[-130,72],[-105,55],[-60,50],[-80,25],[-102,17],[-120,35],[-150,55]],
  [[-80,10],[-55,7],[-35,-8],[-48,-30],[-70,-55],[-76,-15]],
  [[-15,35],[15,38],[42,12],[32,-31],[17,-35],[-5,5]],
  [[-10,38],[-8,60],[30,70],[72,55],[115,65],[165,55],[135,35],[105,5],[70,25],[40,40]],
  [[113,-12],[140,-11],[153,-27],[132,-39],[114,-28]],
];
const LAND=[];
for(const polygon of CONTOURS)for(let lat=-55;lat<=72;lat+=4)for(let lon=-170;lon<=170;lon+=4) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
    if((yi>lat)!==(yj>lat)&&lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)inside=!inside;
  }
  if(inside){const p=lat*Math.PI/180,l=lon*Math.PI/180;LAND.push([Math.cos(p)*Math.sin(l)*107,Math.sin(p)*107,-Math.cos(p)*Math.cos(l)*107]);}
}

export function mountInstallations(root) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const items=[];
  let raf=0,previous=0;
  const canRun=()=>!document.hidden&&!reduced.matches&&items.some(item=>item.active);
  function frame(now) {
    raf=0;
    if(!canRun()){previous=0;return;}
    const delta=previous?Math.min((now-previous)/1000,.05):0;previous=now;
    for(const item of items)if(item.active){item.time+=delta;item.draw();}
    raf=requestAnimationFrame(frame);
  }
  function sync() {
    if(canRun()){if(!raf)raf=requestAnimationFrame(frame);}
    else {cancelAnimationFrame(raf);raf=0;previous=0;}
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){const item=items.find(item=>item.canvas===entry.target);item.active=entry.isIntersecting;if(item.active)item.draw();}
    sync();
  });
  const resize=new ResizeObserver(entries=>{
    for(const entry of entries)items.find(item=>item.canvas===entry.target)?.resize();
  });
  for(const room of root.querySelectorAll('.room-directory')) {
    const type=room.closest('.scene').dataset.room;
    if(!TYPES.has(type))continue;
    room.classList.add('has-installation');
    const canvas=document.createElement('canvas');canvas.className=`directory-installation installation-${type}`;
    canvas.setAttribute('aria-hidden','true');room.querySelector('.room-heading').append(canvas);
    const item=new Installation(canvas,type);items.push(item);observer.observe(canvas);resize.observe(canvas);
  }
  reduced.addEventListener('change',()=>{for(const item of items){if(reduced.matches)item.time=0;item.draw();}sync();});
  document.addEventListener('visibilitychange',sync);
}
