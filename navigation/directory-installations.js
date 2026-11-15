// Procedural, perspective-projected installations. One shared scheduler only runs
// while a canvas is on screen. Geometry and projection buffers are reused.
const TAU = Math.PI * 2;
const TYPES = new Set(['about', 'works', 'writing', 'coffee', 'lab', 'court', 'pool']);
const PALETTES = {
  about: ['255,206,133', '137,236,236'],
  works: ['117,255,216', '141,165,255'],
  writing: ['227,198,255', '255,223,168'],
  coffee: ['255,198,127', '255,136,175'],
  lab: ['126,222,255', '255,207,133'],
  court: ['113,216,255', '126,255,211'],
  pool: ['242,174,229', '133,246,202'],
};
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
    this.metal = c.createLinearGradient(170,110,380,285);
    this.metal.addColorStop(0,'#4d6875');
    this.metal.addColorStop(.25,'#152f3c');
    this.metal.addColorStop(.5,'#73929a');
    this.metal.addColorStop(.53,'#284350');
    this.metal.addColorStop(1,'#10242f');
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
    else if (this.type === 'coffee') this.resonance(t);
    else if (this.type === 'lab') this.forge(t);
    else if (this.type === 'pool') this.garden(t);
    else if (this.type === 'court') this.globe(t);
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

  disc(radius, y, fill, color, alpha = .6) {
    const c=this.ctx;
    c.beginPath();
    for(let i=0;i<=100;i++)this.vertex(Math.cos(i/100*TAU)*radius,y,Math.sin(i/100*TAU)*radius,i===0);
    c.closePath();c.fillStyle=fill;c.fill();this.stroke(color,alpha,.9);
  }

  resonance(t) {
    const c=this.ctx,a=this.colors[0],b=this.colors[1];
    this.yaw=-.3;this.pitch=.82;this.cy=Math.cos(this.yaw);this.sy=Math.sin(this.yaw);this.cp=Math.cos(this.pitch);this.sp=Math.sin(this.pitch);
    // A levitating machined platter, with a dark vinyl surface and etched grooves.
    this.disc(116,-25,this.metal,a,.4);
    this.disc(116,-18,'#111d24',a,.75);
    this.disc(109,-12,'#111b21',a,.5);
    for(let i=0;i<27;i++)this.ring(40+i*2.5,-11,0,TAU,i%4===0?b:a,i%4===0?.18:.09,.65);
    for(let i=0;i<4;i++) {
      this.ring(74+i*9,-10,t*.65+i*.12,.65,a,.25+i*.07,1.1);
      this.ring(77+i*9,-10,t*.65+Math.PI+i*.12,.35,b,.26,.8);
    }
    this.disc(34,-9,'#61422e',a,.8);
    this.ring(28,-8,0,TAU,a,.42);
    this.ring(14,-8,0,TAU,a,.5);
    const p=this.project(0,-3,0);this.dot(p[0],p[1],3.2,'255,244,218');
    // A three-dimensional spectrum crown breathes around the record's perimeter.
    c.globalCompositeOperation='lighter';
    for(let i=0;i<72;i++) {
      const angle=i/72*TAU,level=8+24*(.5+.5*Math.sin(i*.57+t*2.5))*(.65+.35*Math.sin(i*.23-t));
      const x=Math.cos(angle)*134,z=Math.sin(angle)*134;
      c.beginPath();this.vertex(x,-18,z,true);this.vertex(x,-18+level,z);
      this.stroke(i%5===0?b:a,.35+level/90,2);
      const tip=this.project(x,-18+level,z);this.dot(tip[0],tip[1],.9,'255,239,213',.8);
    }
    // Fine ribbon waveforms rise over the platter, phase shifted across layers.
    for(let ribbon=0;ribbon<4;ribbon++) {
      c.beginPath();
      for(let i=0;i<=130;i++) {
        const u=i/130,x=(u-.5)*275,envelope=Math.sin(u*Math.PI)**2;
        const y=56+Math.sin(u*TAU*2.5-t*1.8+ribbon*.22)*23*envelope;
        this.vertex(x,y,-44+ribbon*9,i===0);
      }
      this.stroke(ribbon%2?a:b,.2+ribbon*.08,.9);
    }
    c.globalCompositeOperation='source-over';
    // Articulated tonearm, pivot, cartridge, and needle are separate solid pieces.
    c.beginPath();this.vertex(111,17,-78,true);this.vertex(112,30,-73);this.vertex(87,30,32);this.vertex(71,24,49);
    this.stroke('16,28,34',1,8);this.stroke('198,208,195',.95,3.2);
    const pivot=this.project(111,18,-78);this.dot(pivot[0],pivot[1],6,a,.9);this.dot(pivot[0],pivot[1],2,'20,33,38');
    c.beginPath();this.vertex(71,24,49,true);this.vertex(63,15,58);this.stroke(b,.95,7);
    c.beginPath();this.vertex(63,15,58,true);this.vertex(63,-8,58);this.stroke(a,.8,.8);
    for(let i=0;i<3;i++)this.ring(146+i*7,-36-i*5,t*.16+i,1.9,a,.16+i*.05);
  }

  plate(radius, y, rotation, fill, color, alpha = .5) {
    const c=this.ctx;
    c.beginPath();
    for(let i=0;i<=6;i++) {
      const a=i/6*TAU+rotation;
      this.vertex(Math.cos(a)*radius,y,Math.sin(a)*radius,i===0);
    }
    c.closePath();c.fillStyle=fill;c.fill();this.stroke(color,alpha,1);
  }

  forge(t) {
    const c=this.ctx,a=this.colors[0],b=this.colors[1],lift=Math.sin(t*.7)*5;
    this.yaw=.45+Math.sin(t*.22)*.18;this.pitch=.54;this.cy=Math.cos(this.yaw);this.sy=Math.sin(this.yaw);this.cp=Math.cos(this.pitch);this.sp=Math.sin(this.pitch);
    // Floating exploded assembly: chassis, circuit wafer, core, and upper lens.
    this.plate(121,-94,Math.PI/6,this.metal,a,.7);
    this.plate(121,-86,Math.PI/6,'#132b38',a,.7);
    for(let j=0;j<6;j++) {
      const angle=j/6*TAU+Math.PI/6,x=Math.cos(angle)*102,z=Math.sin(angle)*102;
      c.beginPath();this.vertex(x,-85,z,true);this.vertex(x,58+lift,z);this.stroke(a,.16,.7);
      const p=this.project(x,-84,z);this.dot(p[0],p[1],3.3,a,.75);this.dot(p[0],p[1],1,'22,39,46');
      c.beginPath();this.vertex(x*.86,-84,z*.86,true);this.vertex(x*.65,-84,z*.65);this.vertex(x*.65,-39+lift,z*.65);
      this.stroke(b,.5,1);
    }
    this.plate(89,-43+lift,Math.PI/6,'rgba(19,49,59,.86)',a,.8);
    this.plate(85,-37+lift,Math.PI/6,'rgba(43,84,93,.3)',a,.55);
    // Copper traces and contact pins spread from the processor to the wafer edge.
    for(let side=0;side<4;side++)for(let i=0;i<9;i++) {
      const u=(i-4)*7.5,angle=side*Math.PI/2,cs=Math.cos(angle),sn=Math.sin(angle);
      c.beginPath();this.vertex(u*cs-36*sn,-26+lift,u*sn+36*cs,true);this.vertex(u*cs-54*sn,-26+lift,u*sn+54*cs);
      this.vertex(u*cs-64*sn,-37+lift,u*sn+64*cs);this.stroke(i%3?a:b,.6,1);
      const f=(t*.4+i*.08+side*.2)%1;
      const p=this.project(u*cs-(39+f*23)*sn,-27-f*10+lift,u*sn+(39+f*23)*cs);
      this.dot(p[0],p[1],1.2,a,.9);
    }
    // Beveled chip package.
    for(let layer=0;layer<3;layer++) {
      const r=38-layer*3,y=-27+lift+layer*6;
      c.beginPath();this.vertex(-r,y,-r,true);this.vertex(r,y,-r);this.vertex(r,y,r);this.vertex(-r,y,r);c.closePath();
      c.fillStyle=layer===2?this.metal:'#10232e';c.fill();this.stroke(a,.7,1);
    }
    c.globalCompositeOperation='lighter';
    for(let i=0;i<5;i++) {
      c.beginPath();this.vertex(-22+i*11,-14+lift,-24,true);this.vertex(-22+i*11,-14+lift,24);this.stroke(a,.5,.6);
      c.beginPath();this.vertex(-24,-14+lift,-22+i*11,true);this.vertex(24,-14+lift,-22+i*11);this.stroke(a,.4,.6);
    }
    // Three-dimensional gear rim, alternating tooth heights and counter rotation.
    for(let layer=0;layer<2;layer++) {
      const y=42+lift+layer*7;
      c.beginPath();
      for(let i=0;i<=144;i++) {
        const angle=i/144*TAU-t*.16,r=(i%6<3?91:84);
        this.vertex(Math.cos(angle)*r,y,Math.sin(angle)*r,i===0);
      }
      this.stroke(a,layer?.75:.24,layer?1.25:.8);
      this.ring(74,y,0,TAU,a,.3);
    }
    this.disc(62,46+lift,'rgba(76,171,199,.055)',a,.35);
    this.ring(62,47+lift,-t*.5,1.35,b,.95,2);
    for(let k=0;k<3;k++) {
      const y=-12+((t*19+k*26)%72)+lift;
      this.ring(25+y*.16,y,0,TAU,a,(1-(y+12-lift)/72)*.35,.8);
    }
    c.globalCompositeOperation='source-over';
  }

  petalVertex(u, v, angle, layer, bloom, first = false) {
    const radius=10+u*(layer?78:111),width=Math.sin(Math.PI*u)*(.32+layer*.08);
    const theta=angle+v*width;
    const y=18+u*(layer?80:38)*bloom-Math.sin(u*Math.PI)*24+(1-v*v)*Math.sin(u*Math.PI)*19;
    this.vertex(Math.cos(theta)*radius,y,Math.sin(theta)*radius,first);
  }

  garden(t) {
    const c=this.ctx,a=this.colors[0],b=this.colors[1],bloom=1+Math.sin(t*.6)*.14;
    this.yaw=t*.09;this.pitch=.35;this.cy=Math.cos(this.yaw);this.sy=Math.sin(this.yaw);this.cp=Math.cos(this.pitch);this.sp=Math.sin(this.pitch);
    // A braided luminous stem emerges from concentric hydroponic terraces.
    for(let k=0;k<3;k++)this.ring(66+k*22,-111-k*4,t*.12+k,TAU-.3,b,.25-k*.045,.9);
    for(let strand=0;strand<3;strand++) {
      c.beginPath();
      for(let i=0;i<=70;i++) {
        const u=i/70,angle=u*TAU*1.3+strand*TAU/3+t*.2,r=9*(1-u)+3;
        this.vertex(Math.cos(angle)*r,-110+u*133,Math.sin(angle)*r,i===0);
      }
      this.stroke(b,.6,1.2);
    }
    // Leaves with curved silhouettes and individually drawn secondary veins.
    for(let side=-1;side<=1;side+=2) {
      const y=side===1?-57:-76;
      c.beginPath();this.vertex(0,y,0,true);
      for(let i=1;i<=40;i++) {
        const u=i/40;
        this.vertex(side*u*65,y+u*37,Math.sin(u*Math.PI)*22);
      }
      for(let i=39;i>=0;i--){const u=i/40;this.vertex(side*u*65,y+u*37,-Math.sin(u*Math.PI)*17);}
      c.closePath();c.fillStyle=rgba(b,.12);c.fill();this.stroke(b,.6,.8);
      c.beginPath();this.vertex(0,y,0,true);this.vertex(side*65,y+37,0);this.stroke(b,.7,.9);
      for(let i=1;i<8;i++) {
        const u=i/9;
        for(let s=-1;s<=1;s+=2){c.beginPath();this.vertex(side*u*65,y+u*37,0,true);this.vertex(side*(u+.1)*65,y+(u+.1)*37,Math.sin(u*Math.PI)*17*s);this.stroke(b,.3,.6);}
      }
    }
    // Two translucent corollas. Back petals are painted before front petals.
    for(let pass=0;pass<2;pass++)for(let layer=0;layer<2;layer++)for(let petal=0;petal<7;petal++) {
      const angle=petal/7*TAU+layer*.43;
      if((Math.sin(angle-this.yaw)<0)!==Boolean(pass))continue;
      c.beginPath();this.petalVertex(0,-1,angle,layer,bloom,true);
      for(let i=1;i<=32;i++)this.petalVertex(i/32,-1,angle,layer,bloom);
      for(let i=32;i>=0;i--)this.petalVertex(i/32,1,angle,layer,bloom);
      c.closePath();c.fillStyle=rgba(layer?a:b,pass?.13:.055);c.fill();this.stroke(layer?a:b,pass?.65:.25,.85);
      for(let vein=-2;vein<=2;vein++) {
        c.beginPath();
        for(let i=0;i<=32;i++)this.petalVertex(i/32,vein*.3,angle,layer,bloom,i===0);
        this.stroke(vein? a:'255,226,245',vein?.14:.42,.65);
      }
    }
    c.globalCompositeOperation='lighter';
    for(let i=0;i<11;i++) {
      const angle=i/11*TAU+t*.12;
      c.beginPath();this.vertex(0,20,0,true);this.vertex(Math.cos(angle)*16,50+Math.sin(i)*8,Math.sin(angle)*16);this.stroke(a,.55,.9);
      const p=this.project(Math.cos(angle)*16,50+Math.sin(i)*8,Math.sin(angle)*16);this.dot(p[0],p[1],2.2,'255,231,193',.9);
    }
    // Firefly constellations connect briefly as they travel around the flower.
    for(let i=0;i<16;i++) {
      const angle=i*2.399+t*.14,y=-70+((i*19+t*13)%170),r=123+Math.sin(i+t*.4)*12;
      const p=this.project(Math.cos(angle)*r,y,Math.sin(angle)*r),x=p[0],py=p[1];
      const glow=.35+.55*(.5+.5*Math.sin(t*1.2+i));
      this.dot(x,py,5,i%3?a:b,glow*.09);this.dot(x,py,1.5,i%3?a:b,glow);
      if(i%4===0){c.beginPath();c.moveTo(x,py);this.vertex(Math.cos(angle+.3)*r,y+17,Math.sin(angle+.3)*r);this.stroke(a,.12,.6);}
    }
    c.globalCompositeOperation='source-over';
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
    canvas.setAttribute('aria-hidden','true');room.querySelector('.spectacle-stage').prepend(canvas);
    const item=new Installation(canvas,type);items.push(item);observer.observe(canvas);resize.observe(canvas);
  }
  reduced.addEventListener('change',()=>{for(const item of items){if(reduced.matches)item.time=0;item.draw();}sync();});
  document.addEventListener('visibilitychange',sync);
}
