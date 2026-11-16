// Procedural search instrument. It depicts local interaction, never remote results.
// A single canvas, cached geometry/gradients, and an on-demand animation loop.
const TAU = Math.PI * 2;
const WHITE = [238,248,244];
const WARM = [234,181,138];
const ENGINES = [
  {id:'baidu', label:'百度', color:[141,215,193], x:138, y:104},
  {id:'bing', label:'必应', color:[147,203,225], x:506, y:122},
  {id:'google', label:'谷歌', color:[197,181,224], x:125, y:391},
  {id:'yuanbao', label:'元宝', color:WARM, x:514, y:392},
];
const TILES = [
  {x:116,y:222,angle:-.14,phase:.2}, {x:490,y:251,angle:.13,phase:1.4},
  {x:223,y:72,angle:-.06,phase:2.7}, {x:390,y:430,angle:.08,phase:4},
];
const color = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

export function mountSearchObservatory(environment) {
  const canvas=document.createElement('canvas');
  canvas.className='search-observatory';canvas.setAttribute('aria-hidden','true');
  environment.append(canvas);
  const c=canvas.getContext('2d');
  if(!c)return {focus(){},input(){},engine(){},launch(){},visibility(){},stop(){}};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const rgb=new Float32Array(ENGINES[0].color);
  const nodes=new Float32Array(126*3),screen=new Float32Array(126*3),edges=[];
  const packets=new Float32Array(40*4);
  // Stable seeds and bounded pools: typing never creates another animation loop.
  const motes=new Float32Array(84*4),fragments=new Float32Array(32*4);
  for(let i=0;i<84;i++) {
    const offset=i*4;
    motes[offset]=i*2.399963;
    motes[offset+1]=176+(i*29)%85;
    motes[offset+2]=.18+(i%7)*.035;
    motes[offset+3]=i%9===0?1.8:.65+(i%3)*.25;
  }
  for(let i=0;i<126;i++) {
    const y=1-2*(i+.5)/126,r=Math.sqrt(1-y*y),a=i*2.399963;
    nodes.set([Math.cos(a)*r*91,y*91,Math.sin(a)*r*91],i*3);
  }
  for(let i=0;i<126;i++)for(let j=i+1;j<126;j++) {
    if(Math.hypot(nodes[i*3]-nodes[j*3],nodes[i*3+1]-nodes[j*3+1],nodes[i*3+2]-nodes[j*3+2])<31)edges.push(i,j);
  }
  for(let i=0;i<40;i++)packets[i*4]=-1;
  for(let i=0;i<32;i++)fragments[i*4]=-1;
  let selected=0,count=0,focused=false,visible=true,raf=0,last=0,time=0;
  let wake=.18,impulse=0,switchPulse=0,launchPulse=0,packetCursor=0,scale=1,minStroke=1,compact=false;
  let palette=[];

  // Bold etched contours; even the fine network stays at least 1.5 CSS pixels.
  function line(alpha=1,width=1,tint=rgb) {c.strokeStyle=color(tint,alpha);c.lineWidth=Math.max(width*2.5,minStroke);c.stroke();}
  function dot(x,y,r,alpha=1,tint=rgb) {c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color(tint,alpha);c.fill();}
  function glint(x,y,size,alpha,tint=WHITE) {
    c.beginPath();c.moveTo(x-size,y);c.lineTo(x+size,y);c.moveTo(x,y-size);c.lineTo(x,y+size);
    line(alpha,.32,tint);dot(x,y,.85,alpha,tint);
  }
  function arc(r,start,end,alpha,width=1) {c.beginPath();c.arc(320,254,r,start,end);line(alpha,width);}
  function path(x,y,tx,ty,bend) {c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+tx)*.5+bend,(y+ty)*.5-bend,tx,ty);}
  function curvePoint(x,y,tx,ty,bend,u,offset) {
    const v=1-u;
    screen[offset]=v*v*x+2*v*u*((x+tx)*.5+bend)+u*u*tx;
    screen[offset+1]=v*v*y+2*v*u*((y+ty)*.5-bend)+u*u*ty;
  }
  function font(size=9) {c.font=`700 ${size}px ui-monospace, Consolas, "Microsoft YaHei", monospace`;}

  function gradients() {
    palette=ENGINES.map(engine=>{
      const aura=c.createRadialGradient(320,254,20,320,254,245);
      aura.addColorStop(0,color(engine.color,.15));aura.addColorStop(.55,color(engine.color,.055));aura.addColorStop(1,color(engine.color,0));
      const glass=c.createRadialGradient(290,222,5,320,254,102);
      glass.addColorStop(0,'rgba(38,68,77,.9)');glass.addColorStop(.8,'rgba(21,44,56,.94)');glass.addColorStop(.95,color(engine.color,.18));glass.addColorStop(1,'rgba(37,69,76,.95)');
      const glow=c.createRadialGradient(320,254,0,320,254,46);
      glow.addColorStop(0,'rgba(244,255,249,.9)');glow.addColorStop(.08,color(engine.color,.85));glow.addColorStop(.28,color(engine.color,.18));glow.addColorStop(1,color(engine.color,0));
      const metal=c.createLinearGradient(210,140,420,375);
      metal.addColorStop(0,'#77989a');metal.addColorStop(.2,'#284650');metal.addColorStop(.44,color(engine.color,.5));metal.addColorStop(.49,'#d8e9e3');metal.addColorStop(.52,'#294b57');metal.addColorStop(.8,'#496e74');metal.addColorStop(1,'#203b47');
      const reflection=c.createLinearGradient(248,169,391,340);
      reflection.addColorStop(0,'rgba(238,248,244,0)');reflection.addColorStop(.3,'rgba(238,248,244,.07)');reflection.addColorStop(.34,'rgba(238,248,244,.2)');reflection.addColorStop(.38,'rgba(238,248,244,0)');reflection.addColorStop(1,'rgba(238,248,244,0)');
      return {aura,glass,glow,metal,reflection};
    });
  }

  function orbitalDust(front) {
    c.save();c.globalCompositeOperation='lighter';
    const total=compact?48:84;
    for(let i=0;i<total;i++) {
      const offset=i*4,a=motes[offset]+time*motes[offset+2]*(.2+wake*.35);
      const depth=Math.sin(a),radius=motes[offset+1];
      if((depth>0)!==front)continue;
      const x=320+Math.cos(a)*radius,y=266+depth*radius*.39-Math.cos(a)*34;
      const shimmer=.66+Math.sin(time*1.3+i*2.1)*.22;
      const alpha=(front?.25:.12)*(.65+wake)*shimmer,tint=i%11===0?WARM:rgb;
      dot(x,y,motes[offset+3],alpha,tint);
      if(i%7===0) {
        const tail=.025+wake*.055;
        c.beginPath();c.moveTo(320+Math.cos(a-tail)*radius,266+Math.sin(a-tail)*radius*.39-Math.cos(a-tail)*34);c.lineTo(x,y);
        line(alpha*.65,.35,tint);dot(x,y,4.5,alpha*.1,tint);
      }
      if(i%21===0)glint(x,y,3+impulse*2,alpha*.7,tint);
    }
    c.restore();
  }

  function engineNodes() {
    for(let i=0;i<ENGINES.length;i++) {
      const e=ENGINES[i],active=i===selected,dx=e.x-320,dy=e.y-254,d=Math.hypot(dx,dy);
      const tx=320+dx/d*143,ty=254+dy/d*143,bend=i%2?26:-26;
      path(e.x,e.y,tx,ty,bend);line(active?.66:.2,active?1.15:.7);
      if(active&&focused)for(let j=0;j<3;j++) {
        curvePoint(e.x,e.y,tx,ty,bend,(time*.25+j/3)%1,0);
        dot(screen[0],screen[1],2.1,.8);dot(screen[0],screen[1],5,.1);
      }
      if(active&&switchPulse>.01) {
        curvePoint(tx,ty,e.x,e.y,-bend,1-switchPulse,0);
        dot(screen[0],screen[1],3,1);dot(screen[0],screen[1],12,.13);
      }
      c.save();c.translate(e.x,e.y);
      c.beginPath();c.moveTo(-39,-16);c.lineTo(24,-16);c.lineTo(39,-1);c.lineTo(39,16);c.lineTo(-39,16);c.closePath();
      c.fillStyle=active?'rgba(32,62,70,.94)':'rgba(27,48,61,.82)';c.fill();line(active?.8:.22,.8);
      c.fillStyle=color(active?rgb:e.color,active?.95:.5);font(11);c.textAlign='center';c.fillText(e.label,0,4);
      dot(-29,0,active?2.2:1.2,active?.95:.4);
      c.restore();
      if(active) {
        c.beginPath();c.moveTo(e.x-43,e.y-8);c.lineTo(e.x-43,e.y-21);c.lineTo(e.x-26,e.y-21);line(.7,.8);
        c.beginPath();c.moveTo(e.x+43,e.y+8);c.lineTo(e.x+43,e.y+21);c.lineTo(e.x+26,e.y+21);line(.7,.8);
      }
    }
  }

  function documents() {
    for(let index=0;index<TILES.length;index++) {
      const tile=TILES[index],dy=Math.sin(time*.7+tile.phase)*(focused?6:2);
      const active=count>0;
      c.save();c.translate(tile.x,tile.y+dy);c.rotate(tile.angle+Math.sin(time*.3+tile.phase)*.02);
      // Thin folded document leaves, cover edges, text rows, and scanning band.
      c.fillStyle='rgba(30,52,64,.86)';c.fillRect(-26,-32,53,65);
      c.beginPath();c.moveTo(-26,-32);c.lineTo(13,-32);c.lineTo(27,-18);c.lineTo(27,33);c.lineTo(-26,33);c.closePath();line(.46,.8);
      c.beginPath();c.moveTo(13,-32);c.lineTo(13,-18);c.lineTo(27,-18);line(.55,.8);
      c.beginPath();c.moveTo(-18,-18);c.lineTo(3,-18);line(.8,2);
      for(let row=0;row<5;row++) {
        const end=row%3===0?8:18;
        c.beginPath();c.moveTo(-18,-7+row*6);c.lineTo(end,-7+row*6);line(.32,.7);
      }
      c.beginPath();c.moveTo(-17,26);c.lineTo(-3,26);line(active?.75:.24,1.4);
      if(active) {
        const y=-28+(time*26+index*17)%57;
        c.fillStyle=color(rgb,.06);c.fillRect(-23,y-7,47,8);
        c.beginPath();c.moveTo(-23,y);c.lineTo(24,y);line(.65,.8);
      }
      c.restore();
      path(tile.x,tile.y+dy,320+(tile.x<320?-112:112),254,index%2?20:-20);line(.12,.65);
    }
  }

  function network() {
    const spin=time*(.045+wake*.07),cy=Math.cos(spin),sy=Math.sin(spin);
    for(let i=0;i<126;i++) {
      const x=nodes[i*3]*cy+nodes[i*3+2]*sy,z=-nodes[i*3]*sy+nodes[i*3+2]*cy;
      const y=nodes[i*3+1]*.96-z*.28,depth=nodes[i*3+1]*.28+z*.96,f=540/(540+depth);
      screen[i*3]=320+x*f;screen[i*3+1]=254-y*f;screen[i*3+2]=depth;
    }
    c.save();c.beginPath();c.arc(320,254,98,0,TAU);c.clip();
    for(let k=0;k<edges.length;k+=2) {
      const u=edges[k]*3,v=edges[k+1]*3,front=screen[u+2]+screen[v+2]<0;
      c.beginPath();c.moveTo(screen[u],screen[u+1]);c.lineTo(screen[v],screen[v+1]);line(front?.24+wake*.16:.105,.65);
    }
    const scanY=178+((time*(count?32:18))%152);
    for(let i=0;i<126;i++) {
      const x=screen[i*3],y=screen[i*3+1],front=screen[i*3+2]<0,scan=Math.max(0,1-Math.abs(y-scanY)/15)*wake;
      dot(x,y,front?1.2+scan*.8:.7,front?.45+scan*.5:.15);
    }
    if(focused) {
      c.fillStyle=color(rgb,.045);c.fillRect(218,scanY-15,204,15);
      c.beginPath();c.moveTo(218,scanY);c.lineTo(422,scanY);line(.48,.7);
      // Acquisition brackets at the moving focus point.
      const x=320+Math.sin(time*.5)*29,y=254+Math.cos(time*.7)*24,size=12+impulse*6;
      for(let side=0;side<4;side++) {
        const sx=side%2?1:-1,sy=side<2?-1:1;
        c.beginPath();c.moveTo(x+sx*size,y+sy*(size-6));c.lineTo(x+sx*size,y+sy*size);c.lineTo(x+sx*(size-6),y+sy*size);line(.65+impulse*.3,.9);
      }
    }
    c.globalCompositeOperation='lighter';c.globalAlpha=.4+wake*.6;
    c.fillStyle=palette[selected].glow;c.fillRect(272,206,96,96);
    c.restore();
  }

  function lens() {
    const p=palette[selected];
    // A solid, beveled magnifying-glass handle underneath the optical assembly.
    c.save();c.translate(320,254);c.rotate(-Math.PI/4);
    c.beginPath();c.roundRect(-13,88,26,101,8);c.fillStyle=p.metal;c.fill();line(.65,1);
    c.beginPath();c.moveTo(-6,122);c.lineTo(-6,171);line(.7,.8);
    for(let i=0;i<4;i++){c.beginPath();c.moveTo(-10,141+i*8);c.lineTo(10,141+i*8);line(.23,.8);}
    c.restore();
    c.beginPath();c.arc(320,254,114,0,TAU);c.fillStyle=p.metal;c.fill();line(.6,.8);
    c.beginPath();c.arc(320,254,105,0,TAU);c.fillStyle='#1c3a48';c.fill();line(.65,1);
    c.beginPath();c.arc(320,254,98,0,TAU);c.fillStyle=p.glass;c.fill();
    network();
    c.save();c.beginPath();c.arc(320,254,97,0,TAU);c.clip();
    c.fillStyle=p.reflection;c.fillRect(220,154,200,200);
    // Two etched facets give the glass depth without covering the network.
    c.beginPath();c.moveTo(247,216);c.lineTo(267,186);c.lineTo(327,167);line(.16,.35,WHITE);
    c.beginPath();c.moveTo(371,322);c.lineTo(390,294);c.lineTo(399,260);line(.11,.35,WARM);
    c.restore();
    arc(99,0,TAU,.65,.7);
    arc(110,-2.9,-1.5,.85,1.8);arc(110,.3,1.4,.35,1);
    // A narrow glass reflection follows the upper edge, without hiding the globe.
    arc(89,-2.5,-1.1,.24,2);
    for(let i=0;i<8;i++) {
      const angle=i/8*TAU+.15;
      const x=320+Math.cos(angle)*109,y=254+Math.sin(angle)*109;
      dot(x,y,1.7,.7);dot(x,y,.6,1,WHITE);
    }
    const glintAngle=-2.5+Math.sin(time*.3)*.25;
    glint(320+Math.cos(glintAngle)*109,254+Math.sin(glintAngle)*109,4.5+impulse*2,.45+wake*.2);
  }

  function instrument() {
    const turn=time*.065;
    // An oblique orbital grid anchors the lens in a larger spatial instrument.
    c.beginPath();c.ellipse(320,271,205,72,-.28,0,TAU);line(.15,.75);
    c.beginPath();c.ellipse(320,271,205,72,-.28,-time*.25,-time*.25+.8);line(.5,1.2);
    c.beginPath();c.ellipse(320,254,178,189,.48,0,TAU);line(.09,.4);
    for(let i=0;i<3;i++) {
      const a=turn*(i%2?-1.8:1.4)+i*TAU/3,r=169;
      const x=320+Math.cos(a)*r,y=254+Math.sin(a)*r;
      c.save();c.translate(x,y);c.rotate(a+Math.PI/4);
      c.fillStyle=color(i===1?WARM:rgb,.13+wake*.1);c.fillRect(-3,-3,6,6);
      c.strokeStyle=color(i===1?WARM:rgb,.5);c.lineWidth=Math.max(.8,minStroke*.6);c.strokeRect(-3,-3,6,6);
      c.restore();
    }
    for(let i=0;i<120;i++) {
      const a=i/120*TAU+turn,outer=157,inner=i%5===0?149:154;
      c.beginPath();c.moveTo(320+Math.cos(a)*inner,254+Math.sin(a)*inner);c.lineTo(320+Math.cos(a)*outer,254+Math.sin(a)*outer);line(i%5===0?.43:.17,.65);
    }
    for(let i=0;i<3;i++)arc(139+i*5,turn*(i%2?-1:1)+i*2.1,turn*(i%2?-1:1)+i*2.1+1.2,.35+i*.08,.8);
    // Twelve iris segments open on focus; each has an etched angular edge.
    for(let i=0;i<12;i++) {
      const a=i/12*TAU+turn*.6,r=119+(1-wake)*8;
      c.beginPath();
      c.moveTo(320+Math.cos(a)*r,254+Math.sin(a)*r);
      c.lineTo(320+Math.cos(a+.13)*(r+9),254+Math.sin(a+.13)*(r+9));
      c.lineTo(320+Math.cos(a+.38)*(r+9),254+Math.sin(a+.38)*(r+9));
      line(.25+wake*.4,.8);
    }
    if(impulse>.01)arc(119+(1-impulse)*42,0,TAU,impulse*.5,1);
    if(launchPulse>.01)for(let i=0;i<3;i++) {
      const r=106+(1-launchPulse)*(170+i*35);
      arc(r,0,TAU,launchPulse*(.35-i*.07),1.5-i*.3);
    }
  }

  function launchFragments() {
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<32;i++) {
      const offset=i*4,p=fragments[offset];if(p<0||p>1)continue;
      const angle=fragments[offset+1],distance=105+(1-Math.pow(1-p,2))*fragments[offset+2];
      const x=320+Math.cos(angle)*distance,y=254+Math.sin(angle)*distance*.8;
      const alpha=Math.sin(Math.min(1,p*3)*Math.PI*.5)*(1-p),tint=i%5===0?WARM:rgb;
      const tail=7+(1-p)*15;
      c.beginPath();c.moveTo(x-Math.cos(angle)*tail,y-Math.sin(angle)*tail*.8);c.lineTo(x,y);line(alpha*.45,.5,tint);
      dot(x,y,fragments[offset+3],alpha*.8,tint);
      if(i%4===0)glint(x,y,3,alpha*.7,tint);
    }
    c.restore();
  }

  function draw() {
    if(!canvas.width)return;
    c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,640,540);
    c.fillStyle=palette[selected].aura;c.fillRect(0,0,640,540);
    // Seeded dust and fine crosshairs, stable across input events.
    for(let i=0;i<56;i++) {
      const x=52+(i*83.71)%538,y=43+(i*57.29)%450;
      dot(x,y+Math.sin(time*.3+i)*3,i%7?.6:1,.1+wake*.12);
    }
    c.beginPath();c.moveTo(320,67);c.lineTo(320,87);c.moveTo(320,423);c.lineTo(320,442);c.moveTo(131,254);c.lineTo(144,254);c.moveTo(496,254);c.lineTo(510,254);line(.32,.7);
    orbitalDust(false);engineNodes();documents();instrument();lens();orbitalDust(true);
    // Input-triggered packets travel from the search field side into the lens.
    c.globalCompositeOperation='lighter';
    for(let i=0;i<40;i++) {
      const progress=packets[i*4];if(progress<0||progress>1)continue;
      const startY=packets[i*4+1],bend=packets[i*4+2],endY=254+packets[i*4+3];
      curvePoint(25,startY,320,endY,bend,progress,0);
      const x=screen[0],y=screen[1];
      // Several fading segments follow the curve, rather than a single straight dash.
      for(let trail=3;trail>0;trail--) {
        curvePoint(25,startY,320,endY,bend,Math.max(0,progress-trail*.028),3);
        curvePoint(25,startY,320,endY,bend,Math.max(0,progress-(trail-1)*.028),6);
        c.beginPath();c.moveTo(screen[3],screen[4]);c.lineTo(screen[6],screen[7]);line(Math.sin(progress*Math.PI)*(.38-trail*.08),.5);
      }
      dot(x,y,1.8,Math.sin(progress*Math.PI));dot(x,y,5,Math.sin(progress*Math.PI)*.1);
      if(i%5===0)glint(x,y,2.8,Math.sin(progress*Math.PI)*.55);
    }
    c.globalCompositeOperation='source-over';
    launchFragments();
    c.textAlign='center';font(9);c.letterSpacing='3px';c.fillStyle=color(rgb,.75);c.fillText('SEARCH / OBSERVATORY',320,479);c.letterSpacing='0px';
    font(11);c.fillStyle='rgba(221,240,232,.8)';
    c.fillText(launchPulse>.1?'搜索已提交':switchPulse>.15?`${ENGINES[selected].label} · 引擎已切换`:count?`输入联动 · ${count} 字符`:focused?'检索透镜已唤醒':'点击搜索框 · 唤醒检索透镜',320,502);
    c.beginPath();c.moveTo(238,457);c.lineTo(402,457);line(.2,.65);
    dot(320,457,2,.8);
  }

  function hasMotion() {return focused||impulse>.005||switchPulse>.005||launchPulse>.005||Math.abs(wake-.18)>.005;}
  function frame(now) {
    raf=0;
    if(!visible||document.hidden||reduced.matches){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;time+=dt;
    const ease=1-Math.exp(-dt*7),target=focused?1:.18;
    wake+=(target-wake)*ease;impulse=Math.max(0,impulse-dt*.85);switchPulse=Math.max(0,switchPulse-dt*.65);launchPulse=Math.max(0,launchPulse-dt*.7);
    for(let i=0;i<3;i++)rgb[i]+=(ENGINES[selected].color[i]-rgb[i])*ease;
    let flying=false;
    for(let i=0;i<40;i++)if(packets[i*4]>=0){packets[i*4]+=dt*.75;if(packets[i*4]>1)packets[i*4]=-1;else flying=true;}
    for(let i=0;i<32;i++)if(fragments[i*4]>=0){fragments[i*4]+=dt*.8;if(fragments[i*4]>1)fragments[i*4]=-1;else flying=true;}
    draw();
    if(hasMotion()||flying)raf=requestAnimationFrame(frame);
    else last=0;
  }
  function start() {
    if(reduced.matches){rgb.set(ENGINES[selected].color);wake=focused?1:.18;draw();return;}
    if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  function stop() {cancelAnimationFrame(raf);raf=0;last=0;}
  function emit(amount) {
    if(reduced.matches||!visible||document.hidden)return;
    for(let i=0;i<amount;i++) {
      const slot=packetCursor++%40,offset=slot*4;
      packets[offset]=0;packets[offset+1]=180+(slot*37)%190;
      packets[offset+2]=(slot%2?1:-1)*(18+slot%5*7);packets[offset+3]=Math.sin(slot*2.3)*24;
    }
  }
  function resize() {
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    compact=matchMedia('(max-width: 700px)').matches;
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);scale=canvas.width/640;
    minStroke=1.5*640/Math.max(rect.width,1);
    gradients();draw();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);resize();
  reduced.addEventListener('change',()=>{stop();impulse=switchPulse=launchPulse=0;packets.fill(-1);fragments.fill(-1);start();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(hasMotion())start();});
  // BFCache restores the same canvas and listeners; do not duplicate the instrument.
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',()=>{if(hasMotion())start();});
  return {
    focus(value){focused=value;start();},
    input(value,burst=true){count=Array.from(value.trim()).length;if(burst){impulse=1;emit(5);}start();},
    engine(id,animate=true){const index=ENGINES.findIndex(e=>e.id===id);if(index<0)return;selected=index;canvas.dataset.engine=id;if(animate){switchPulse=1;emit(9);start();}else{rgb.set(ENGINES[selected].color);draw();}},
    launch(){
      launchPulse=1;emit(compact?10:16);
      if(!reduced.matches&&visible&&!document.hidden)for(let i=0;i<(compact?18:32);i++) {
        const offset=i*4;
        fragments[offset]=0;fragments[offset+1]=i*2.399963;
        fragments[offset+2]=65+(i*19)%105;fragments[offset+3]=.8+(i%3)*.4;
      }
      start();
    },
    visibility(value){visible=value;if(!visible)stop();else if(hasMotion())start();},
    stop,
  };
}
