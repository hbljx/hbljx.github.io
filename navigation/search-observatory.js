// Procedural search instrument. It depicts local interaction, never remote results.
// A single canvas, cached geometry/gradients, and an on-demand animation loop.
const TAU = Math.PI * 2;
const WHITE = [241,255,253];
const WARM = [255,180,81];
const ENGINES = [
  {id:'baidu', label:'百度', color:[57,245,188], x:138, y:104},
  {id:'bing', label:'必应', color:[57,207,255], x:506, y:122},
  {id:'google', label:'谷歌', color:[210,138,255], x:125, y:391},
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
    motes[offset+3]=i%9===0?2.8:1.1+(i%3)*.4;
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
  let wake=.18,impulse=0,switchPulse=0,launchPulse=0,packetCursor=0,scale=1,cssUnit=1,minStroke=1,compact=false,miniature=false;
  let palette=[];

  // Separate the bold instrument from its fine internal network. Understrokes
  // isolate major contours; only those contours receive a bounded halo pass.
  function line(alpha=1,width=1,tint=rgb) {c.strokeStyle=color(tint,alpha);c.lineWidth=Math.max(width*3,minStroke);c.stroke();}
  function neonStroke(alpha=1,width=1,tint=rgb) {
    const core=Math.max(width*3,2.6*cssUnit);
    c.save();c.lineJoin='round';c.lineCap='round';
    c.strokeStyle='#05111de6';c.lineWidth=core+4*cssUnit;c.stroke();
    c.strokeStyle=color(tint,alpha*.16);c.lineWidth=core+9*cssUnit;c.stroke();
    c.strokeStyle=color(tint,alpha);c.lineWidth=core;c.stroke();
    c.restore();
  }
  function dot(x,y,r,alpha=1,tint=rgb) {c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color(tint,alpha);c.fill();}
  function glint(x,y,size,alpha,tint=WHITE) {
    c.beginPath();c.moveTo(x-size,y);c.lineTo(x+size,y);c.moveTo(x,y-size);c.lineTo(x,y+size);
    line(alpha,.55,tint);dot(x,y,1.2,alpha,tint);
  }
  function arc(r,start,end,alpha,width=1) {c.beginPath();c.arc(320,254,r,start,end);line(alpha,width);}
  function neonArc(r,start,end,alpha,width=1) {c.beginPath();c.arc(320,254,r,start,end);neonStroke(alpha,width);}
  function path(x,y,tx,ty,bend) {c.beginPath();c.moveTo(x,y);c.quadraticCurveTo((x+tx)*.5+bend,(y+ty)*.5-bend,tx,ty);}
  function curvePoint(x,y,tx,ty,bend,u,offset) {
    const v=1-u;
    screen[offset]=v*v*x+2*v*u*((x+tx)*.5+bend)+u*u*tx;
    screen[offset+1]=v*v*y+2*v*u*((y+ty)*.5-bend)+u*u*ty;
  }
  function font(size=16,minCss=14) {
    const pixels=Math.max(size,minCss*cssUnit);
    c.font=`800 ${pixels}px ui-monospace, Consolas, "Microsoft YaHei", monospace`;
    return pixels;
  }

  function gradients() {
    palette=ENGINES.map(engine=>{
      const aura=c.createRadialGradient(320,254,20,320,254,245);
      aura.addColorStop(0,color(engine.color,.2));aura.addColorStop(.55,color(engine.color,.1));aura.addColorStop(1,color(engine.color,0));
      const well=c.createRadialGradient(320,254,60,320,254,242);
      well.addColorStop(0,'#051523f5');well.addColorStop(.55,'#071725de');well.addColorStop(.82,'#07172566');well.addColorStop(1,'#07172500');
      const glass=c.createRadialGradient(290,222,5,320,254,102);
      glass.addColorStop(0,'#102f41');glass.addColorStop(.8,'#061925');glass.addColorStop(.95,color(engine.color,.25));glass.addColorStop(1,'#0d3440');
      const glow=c.createRadialGradient(320,254,0,320,254,46);
      glow.addColorStop(0,'rgba(244,255,249,1)');glow.addColorStop(.1,color(engine.color,1));glow.addColorStop(.3,color(engine.color,.3));glow.addColorStop(1,color(engine.color,0));
      const metal=c.createLinearGradient(210,140,420,375);
      metal.addColorStop(0,color(engine.color,.95));metal.addColorStop(.2,'#12394b');metal.addColorStop(.44,color(engine.color,.8));metal.addColorStop(.49,'#e0fff6');metal.addColorStop(.52,'#143a4a');metal.addColorStop(.8,color(engine.color,.65));metal.addColorStop(1,'#0b293b');
      const reflection=c.createLinearGradient(248,169,391,340);
      reflection.addColorStop(0,'rgba(238,248,244,0)');reflection.addColorStop(.3,color(engine.color,.08));reflection.addColorStop(.34,'rgba(238,248,244,.28)');reflection.addColorStop(.38,'rgba(238,248,244,0)');reflection.addColorStop(1,'rgba(238,248,244,0)');
      return {aura,well,glass,glow,metal,reflection};
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
      const alpha=(front?.56:.3)*(.75+wake*.65)*shimmer,tint=i%11===0?WARM:rgb;
      dot(x,y,Math.max(motes[offset+3],1.1*cssUnit),alpha,tint);
      if(i%7===0) {
        const tail=.045+wake*.08;
        c.beginPath();c.moveTo(320+Math.cos(a-tail)*radius,266+Math.sin(a-tail)*radius*.39-Math.cos(a-tail)*34);c.lineTo(x,y);
        line(alpha*.9,.65,tint);dot(x,y,6,alpha*.18,tint);
      }
      if(i%14===0)glint(x,y,4.5+impulse*3,alpha,tint);
    }
    c.restore();
  }

  function engineNodes() {
    for(let i=0;i<ENGINES.length;i++) {
      const e=ENGINES[i],active=i===selected,dx=e.x-320,dy=e.y-254,d=Math.hypot(dx,dy);
      const tx=320+dx/d*143,ty=254+dy/d*143,bend=i%2?26:-26;
      path(e.x,e.y,tx,ty,bend);
      if(active)neonStroke(.95,1.15);else line(.35,.7,e.color);
      if(active&&focused)for(let j=0;j<3;j++) {
        curvePoint(e.x,e.y,tx,ty,bend,(time*.25+j/3)%1,0);
        dot(screen[0],screen[1],3.2,1);dot(screen[0],screen[1],7,.25);
      }
      if(active&&switchPulse>.01) {
        curvePoint(tx,ty,e.x,e.y,-bend,1-switchPulse,0);
        dot(screen[0],screen[1],4,1);dot(screen[0],screen[1],13,.26);
      }
      c.save();c.translate(e.x,e.y);
      const labelSize=font(17),halfWidth=Math.max(48,labelSize+22),halfHeight=Math.max(21,labelSize*.75+4);
      c.beginPath();c.moveTo(-halfWidth,-halfHeight);c.lineTo(halfWidth-15,-halfHeight);c.lineTo(halfWidth,-halfHeight+15);c.lineTo(halfWidth,halfHeight);c.lineTo(-halfWidth,halfHeight);c.closePath();
      c.fillStyle='#081a2b';c.fill();
      if(active)neonStroke(1,1.1);else line(.65,.85,e.color);
      c.fillStyle=color(active?rgb:e.color,1);c.textAlign='center';c.textBaseline='middle';c.fillText(e.label,4,1);
      dot(-halfWidth+11,0,active?3:2,1,active?rgb:e.color);
      if(active) {
        c.beginPath();c.moveTo(-halfWidth-6,-halfHeight+10);c.lineTo(-halfWidth-6,-halfHeight-6);c.lineTo(-halfWidth+12,-halfHeight-6);line(1,1);
        c.beginPath();c.moveTo(halfWidth+6,halfHeight-10);c.lineTo(halfWidth+6,halfHeight+6);c.lineTo(halfWidth-12,halfHeight+6);line(1,1);
      }
      c.restore();
    }
  }

  function documents() {
    for(let index=0;index<TILES.length;index++) {
      const tile=TILES[index],dy=Math.sin(time*.7+tile.phase)*(focused?6:2);
      const active=count>0;
      c.save();c.translate(tile.x,tile.y+dy);c.rotate(tile.angle+Math.sin(time*.3+tile.phase)*.02);
      // Thin folded document leaves, cover edges, text rows, and scanning band.
      c.fillStyle='#091f30';c.fillRect(-26,-32,53,65);
      c.beginPath();c.moveTo(-26,-32);c.lineTo(13,-32);c.lineTo(27,-18);c.lineTo(27,33);c.lineTo(-26,33);c.closePath();line(.9,1.05);
      c.beginPath();c.moveTo(13,-32);c.lineTo(13,-18);c.lineTo(27,-18);line(.8,.9);
      c.beginPath();c.moveTo(-18,-18);c.lineTo(3,-18);line(1,2);
      for(let row=0;row<5;row++) {
        const end=row%3===0?8:18;
        c.beginPath();c.moveTo(-18,-7+row*6);c.lineTo(end,-7+row*6);line(.5,.65);
      }
      c.beginPath();c.moveTo(-17,26);c.lineTo(-3,26);line(active?1:.5,1.4);
      if(active) {
        const y=-28+(time*26+index*17)%57;
        c.fillStyle=color(rgb,.15);c.fillRect(-23,y-7,47,8);
        c.beginPath();c.moveTo(-23,y);c.lineTo(24,y);line(.95,.85);
      }
      c.restore();
      path(tile.x,tile.y+dy,320+(tile.x<320?-112:112),254,index%2?20:-20);line(.27,.65);
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
      c.beginPath();c.moveTo(screen[u],screen[u+1]);c.lineTo(screen[v],screen[v+1]);
      // A few lit routes stand out; rear mesh stays fine and quiet.
      const route=front&&k%16===0;
      c.strokeStyle=color(rgb,route?.7:front?.28+wake*.13:.105);
      c.lineWidth=(route?1.9:front?1.1:.75)*cssUnit;c.stroke();
    }
    const scanY=178+((time*(count?32:18))%152);
    for(let i=0;i<126;i++) {
      const x=screen[i*3],y=screen[i*3+1],front=screen[i*3+2]<0,scan=Math.max(0,1-Math.abs(y-scanY)/15)*wake;
      dot(x,y,front?1.6+scan: .8,front?.6+scan*.4:.2);
    }
    if(focused) {
      c.fillStyle=color(rgb,.09);c.fillRect(218,scanY-15,204,15);
      c.beginPath();c.moveTo(218,scanY);c.lineTo(422,scanY);line(.85,.9);
      // Acquisition brackets at the moving focus point.
      const x=320+Math.sin(time*.5)*29,y=254+Math.cos(time*.7)*24,size=12+impulse*6;
      for(let side=0;side<4;side++) {
        const sx=side%2?1:-1,sy=side<2?-1:1;
        c.beginPath();c.moveTo(x+sx*size,y+sy*(size-6));c.lineTo(x+sx*size,y+sy*size);c.lineTo(x+sx*(size-6),y+sy*size);line(.85+impulse*.15,1.3,WHITE);
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
    c.beginPath();c.roundRect(-13,88,26,101,8);c.fillStyle=p.metal;c.fill();neonStroke(.95,1.2);
    c.beginPath();c.moveTo(-6,122);c.lineTo(-6,171);line(.95,1,WHITE);
    for(let i=0;i<4;i++){c.beginPath();c.moveTo(-10,141+i*8);c.lineTo(10,141+i*8);line(.55,.8);}
    c.restore();
    c.beginPath();c.arc(320,254,114,0,TAU);c.fillStyle=p.metal;c.fill();neonStroke(1,1.6);
    c.beginPath();c.arc(320,254,105,0,TAU);c.fillStyle='#082234';c.fill();line(.9,1.3);
    c.beginPath();c.arc(320,254,98,0,TAU);c.fillStyle=p.glass;c.fill();
    network();
    c.save();c.beginPath();c.arc(320,254,97,0,TAU);c.clip();
    c.fillStyle=p.reflection;c.fillRect(220,154,200,200);
    // Two etched facets give the glass depth without covering the network.
    c.beginPath();c.moveTo(247,216);c.lineTo(267,186);c.lineTo(327,167);line(.35,.6,WHITE);
    c.beginPath();c.moveTo(371,322);c.lineTo(390,294);c.lineTo(399,260);line(.3,.6,WARM);
    c.restore();
    arc(99,0,TAU,1,1.05);
    neonArc(110,-2.9,-1.5,1,2);arc(110,.3,1.4,.8,1.4);
    // A narrow glass reflection follows the upper edge, without hiding the globe.
    arc(89,-2.5,-1.1,.5,1.5);
    for(let i=0;i<8;i++) {
      const angle=i/8*TAU+.15;
      const x=320+Math.cos(angle)*109,y=254+Math.sin(angle)*109;
      dot(x,y,2.6,1);dot(x,y,1,1,WHITE);
    }
    const glintAngle=-2.5+Math.sin(time*.3)*.25;
    glint(320+Math.cos(glintAngle)*109,254+Math.sin(glintAngle)*109,7+impulse*3,.85+wake*.15);
  }

  function instrument() {
    const turn=time*.065;
    // An oblique orbital grid anchors the lens in a larger spatial instrument.
    c.beginPath();c.ellipse(320,271,205,72,-.28,0,TAU);line(.42,1);
    c.beginPath();c.ellipse(320,271,205,72,-.28,-time*.25,-time*.25+1.05);neonStroke(1,1.45);
    if(!miniature){c.beginPath();c.ellipse(320,254,178,189,.48,0,TAU);line(.2,.65);}
    for(let i=0;i<3;i++) {
      const a=turn*(i%2?-1.8:1.4)+i*TAU/3,r=169;
      const x=320+Math.cos(a)*r,y=254+Math.sin(a)*r;
      c.save();c.translate(x,y);c.rotate(a+Math.PI/4);
      c.fillStyle=color(i===1?WARM:rgb,.45+wake*.3);c.fillRect(-4,-4,8,8);
      c.strokeStyle=color(i===1?WARM:rgb,1);c.lineWidth=Math.max(1.5,cssUnit*1.3);c.strokeRect(-4,-4,8,8);
      c.restore();
    }
    const ticks=miniature?48:120;
    for(let i=0;i<ticks;i++) {
      const a=i/ticks*TAU+turn,outer=158,inner=i%4===0?146:153;
      c.beginPath();c.moveTo(320+Math.cos(a)*inner,254+Math.sin(a)*inner);c.lineTo(320+Math.cos(a)*outer,254+Math.sin(a)*outer);line(i%4===0?.9:.38,i%4===0?.9:.6);
    }
    for(let i=0;i<3;i++)neonArc(139+i*5,turn*(i%2?-1:1)+i*2.1,turn*(i%2?-1:1)+i*2.1+1.2,.75+i*.1,1.1);
    // Twelve iris segments open on focus; each has an etched angular edge.
    for(let i=0;i<12;i++) {
      const a=i/12*TAU+turn*.6,r=119+(1-wake)*8;
      c.beginPath();
      c.moveTo(320+Math.cos(a)*r,254+Math.sin(a)*r);
      c.lineTo(320+Math.cos(a+.13)*(r+9),254+Math.sin(a+.13)*(r+9));
      c.lineTo(320+Math.cos(a+.38)*(r+9),254+Math.sin(a+.38)*(r+9));
      line(.55+wake*.35,1);
    }
    if(impulse>.01)neonArc(119+(1-impulse)*42,0,TAU,impulse*.8,1.4);
    if(launchPulse>.01)for(let i=0;i<3;i++) {
      const r=106+(1-launchPulse)*(170+i*35);
      neonArc(r,0,TAU,launchPulse*(.72-i*.13),2-i*.35);
    }
  }

  function launchFragments() {
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<32;i++) {
      const offset=i*4,p=fragments[offset];if(p<0||p>1)continue;
      const angle=fragments[offset+1],distance=105+(1-Math.pow(1-p,2))*fragments[offset+2];
      const x=320+Math.cos(angle)*distance,y=254+Math.sin(angle)*distance*.8;
      const alpha=Math.sin(Math.min(1,p*3)*Math.PI*.5)*(1-p),tint=i%5===0?WARM:rgb;
      const tail=12+(1-p)*24;
      c.beginPath();c.moveTo(x-Math.cos(angle)*tail,y-Math.sin(angle)*tail*.8);c.lineTo(x,y);line(alpha*.8,.95,tint);
      dot(x,y,fragments[offset+3]*1.5,alpha,tint);dot(x,y,6,alpha*.2,tint);
      if(i%4===0)glint(x,y,5,alpha,tint);
    }
    c.restore();
  }

  function draw() {
    if(!canvas.width)return;
    c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,640,540);
    c.fillStyle=palette[selected].well;c.fillRect(0,0,640,540);
    c.fillStyle=palette[selected].aura;c.fillRect(0,0,640,540);
    // Seeded dust and fine crosshairs, stable across input events.
    for(let i=0;i<56;i++) {
      const x=52+(i*83.71)%538,y=43+(i*57.29)%450;
      dot(x,y+Math.sin(time*.3+i)*3,i%7?.9:1.8,.22+wake*.2);
    }
    c.beginPath();c.moveTo(320,67);c.lineTo(320,87);c.moveTo(320,423);c.lineTo(320,442);c.moveTo(131,254);c.lineTo(144,254);c.moveTo(496,254);c.lineTo(510,254);line(.65,.85);
    orbitalDust(false);
    if(!miniature){engineNodes();documents();}
    c.save();
    // Short phone viewports keep a larger core and one legible label, instead
    // of shrinking four peripheral labels below readable CSS pixel sizes.
    if(miniature){c.translate(320,254);c.scale(1.32,1.32);c.translate(-320,-254);}
    instrument();lens();c.restore();orbitalDust(true);
    // Input-triggered packets travel from the search field side into the lens.
    c.globalCompositeOperation='lighter';
    for(let i=0;i<40;i++) {
      const progress=packets[i*4];if(progress<0||progress>1)continue;
      const startY=packets[i*4+1],bend=packets[i*4+2],endY=254+packets[i*4+3];
      curvePoint(25,startY,320,endY,bend,progress,0);
      const x=screen[0],y=screen[1];
      // Several fading segments follow the curve, rather than a single straight dash.
      for(let trail=3;trail>0;trail--) {
        curvePoint(25,startY,320,endY,bend,Math.max(0,progress-trail*.04),3);
        curvePoint(25,startY,320,endY,bend,Math.max(0,progress-(trail-1)*.04),6);
        c.beginPath();c.moveTo(screen[3],screen[4]);c.lineTo(screen[6],screen[7]);line(Math.sin(progress*Math.PI)*(.85-trail*.16),1.05);
      }
      dot(x,y,3.2,Math.sin(progress*Math.PI));dot(x,y,8,Math.sin(progress*Math.PI)*.26);
      if(i%5===0)glint(x,y,5,Math.sin(progress*Math.PI)*.9);
    }
    c.globalCompositeOperation='source-over';
    launchFragments();
    c.textAlign='center';c.textBaseline='alphabetic';
    c.beginPath();c.roundRect(miniature?102:76,miniature?470:457,miniature?436:488,miniature?62:76,8);
    c.fillStyle='#071626ed';c.fill();line(.5,.7);
    if(miniature) {
      font(18,12);c.fillStyle=color(rgb,1);
      c.fillText(launchPulse>.1?'搜索已提交':`${ENGINES[selected].label}检索`,320,512);
    } else {
      font(13,12);c.letterSpacing='2px';c.fillStyle=color(rgb,1);c.fillText('SEARCH / OBSERVATORY',320,483);c.letterSpacing='0px';
      font(17,14);c.fillStyle='#f1fffd';
      c.fillText(launchPulse>.1?'搜索已提交':switchPulse>.15?`${ENGINES[selected].label} · 引擎已切换`:count?`输入联动 · ${count} 字符`:focused?'检索透镜已唤醒':'点击搜索框 · 唤醒透镜',320,516);
    }
    c.beginPath();c.moveTo(249,447);c.lineTo(391,447);line(.75,1);
    dot(320,447,3,1);
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
    miniature=rect.width<280;cssUnit=640/Math.max(rect.width,1);
    canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);scale=canvas.width/640;
    minStroke=1.8*cssUnit;
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
