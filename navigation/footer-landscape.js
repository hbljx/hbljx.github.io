// A small, cached pixel world. Only particles, water and portal light redraw at 30 fps.
export function mountFooterLandscape() {
  const footer = document.querySelector('.home-footer');
  if (!footer) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'footer-world';
  canvas.setAttribute('aria-hidden', 'true');
  footer.prepend(canvas);
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) {canvas.remove();return;}
  footer.classList.add('footer-landscape');
  const terrain = document.createElement('canvas');
  const g = terrain.getContext('2d');
  if (!g) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 640, height = 144, portalX = 0, visible = false, raf = 0, last = 0, time = 0;
  const stars = Array.from({length:38}, (_,i) => ({x:(i*73+19)%997/997,y:8+(i*23)%62,phase:i*1.7}));
  const motes = Array.from({length:24}, (_,i) => ({x:(i*47+11)%101/101,y:(i*29)%71,phase:i*.73}));
  function rect(c,color,x,y,w,h) {c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
  function tree(x,y,size) {
    rect(g,'#594737',x-2,y-22*size,5,25*size);
    rect(g,'#2c533e',x-15*size,y-38*size,30*size,20*size);
    rect(g,'#3e6b47',x-11*size,y-47*size,23*size,14*size);
    rect(g,'#537b4d',x-7*size,y-51*size,16*size,8*size);
    rect(g,'#456d46',x-15*size,y-38*size,7*size,15*size);
    rect(g,'#739153',x-10*size,y-47*size,7*size,3*size);
  }
  function build() {
    width = Math.min(960,Math.max(320,Math.round(footer.clientWidth/2)));
    canvas.width=terrain.width=width;canvas.height=terrain.height=height;
    portalX=Math.round(width*.66/4)*4;
    const sky=g.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,'#0c181b');sky.addColorStop(.65,'#172c36');sky.addColorStop(1,'#263b37');
    g.fillStyle=sky;g.fillRect(0,0,width,height);
    rect(g,'#a9c2ac',width*.83,19,13,13);rect(g,'#d1dfb4',width*.83,19,10,10);
    rect(g,'#94b4a0',width*.83+3,26,4,3);
    // Distant stepped hills, followed by a calm river.
    for(let x=0;x<width;x+=16) {
      const y=67+Math.round((Math.sin(x*.023)+Math.sin(x*.043))*7/4)*4;
      rect(g,'#203f42',x,y,16,height-y);
      const near=86+Math.round(Math.sin(x*.032+2)*9/4)*4;
      rect(g,'#294c44',x,near,16,height-near);
    }
    rect(g,'#213f4c',0,108,width,36);
    // Exposed grass / dirt blocks on the two river banks.
    for(let x=0;x<width;x+=8) {
      if(x>width*.34&&x<width*.55)continue;
      const y=115+((Math.floor(x/24)%3)-1)*4;
      rect(g,'#3c4035',x,y,8,height-y);
      rect(g,'#587849',x,y,8,4);rect(g,'#7c9653',x,y,8,1);
      rect(g,'#4d4938',x+1,y+6,3,3);rect(g,'#292f2c',x+4,y+13,3,3);
    }
    tree(width*.12,115,1);tree(width*.23,119,.72);tree(width*.91,115,1.05);
    // Obsidian portal, with individually shaded block joints.
    rect(g,'#111b27',portalX-16,67,32,52);
    for(let y=67;y<119;y+=8)for(const x of [portalX-16,portalX+8]) {
      rect(g,'#363149',x,y,8,8);rect(g,'#53445d',x,y,8,2);rect(g,'#242439',x+5,y+2,3,6);
    }
    for(let x=portalX-16;x<portalX+16;x+=8) {
      rect(g,'#49405a',x,67,8,7);rect(g,'#756080',x,67,8,2);
      rect(g,'#373647',x,114,8,6);
    }
    for(const x of [portalX-27,portalX+27]) {
      rect(g,'#67503a',x,105,3,14);rect(g,'#b08a50',x,105,1,14);
    }
    // Small flowers and tufts keep the banks from feeling like a flat border.
    for(let i=0;i<12;i++) {
      const x=Math.round((i*61+21)%width);
      if(x>width*.30&&x<width*.75)continue;
      rect(g,'#65874c',x,109,1,7);rect(g,i%2?'#dfb67c':'#c491b1',x-1,107,3,3);
    }
    paint();
  }
  function paint() {
    ctx.drawImage(terrain,0,0);
    for(const star of stars) {
      ctx.globalAlpha=.28+.45*(.5+.5*Math.sin(time*.7+star.phase));
      rect(ctx,'#d8e5be',star.x*width,star.y,1,1);
    }
    ctx.globalAlpha=1;
    // Portal light is a pixel texture, never a full-screen filter.
    rect(ctx,'#734f9b',portalX-8,74,16,40);
    for(let y=0;y<10;y++)for(let x=0;x<4;x++) {
      ctx.globalAlpha=.18+.42*(.5+.5*Math.sin(y*.8+x*1.6-time*1.8));
      rect(ctx,'#e0abff',portalX-8+x*4,74+y*4,4,4);
    }
    ctx.globalAlpha=.35;
    rect(ctx,'#b383d0',portalX-5,122,10,2);rect(ctx,'#9c78b6',portalX-8,128,16,1);
    for(let i=0;i<15;i++) {
      const x=width*.35+((i*29+time*(i%2?2:-2))%(width*.19)+width*.19)%(width*.19);
      rect(ctx,i%3?'#659295':'#a0b7a1',x,111+(i*7)%30,3+i%5,1);
    }
    ctx.globalAlpha=1;
    for(let side=-1;side<=1;side+=2) {
      const x=portalX+side*27, flicker=Math.sin(time*7+x)>0?1:0;
      rect(ctx,'#ad723d',x-3,99,9,9);
      rect(ctx,'#efb35e',x-1,99-flicker,5,7+flicker);
      rect(ctx,'#ffeb9a',x,100-flicker,2,4);
    }
    for(const mote of motes) {
      const life=(time*.13+mote.phase)%1;
      const near=mote.phase%2<1;
      const x=near?portalX+(mote.x-.5)*62:width*mote.x;
      ctx.globalAlpha=Math.sin(life*Math.PI)*.7;
      rect(ctx,near?'#d5a1ef':'#d3e796',x+Math.sin(time+mote.phase)*4,112-life*(near?58:28),near?2:1,near?2:1);
    }
    ctx.globalAlpha=1;
  }
  function tick(now) {
    raf=0;
    if(!visible||document.hidden||reduced.matches)return;
    if(now-last>=33) {time+=Math.min((now-last)/1000,.05);last=now;paint();}
    raf=requestAnimationFrame(tick);
  }
  function sync() {
    if(raf)cancelAnimationFrame(raf);
    raf=0;last=performance.now();
    if(reduced.matches) {time=0;paint();}
    else if(visible&&!document.hidden)raf=requestAnimationFrame(tick);
  }
  new ResizeObserver(build).observe(footer);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(footer);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  build();
}
