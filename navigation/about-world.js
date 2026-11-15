// A procedural miniature world inside a machined portal. No image assets or WebGL.
// Geometry is built once; one shared frame draws only when the artwork is visible.
const TAU=Math.PI*2;
const MINT='139,245,209',GOLD='225,244,159',BLUE='137,202,255';
const rgba=(color,alpha)=>`rgba(${color},${alpha})`;
const DESTINATIONS=[
  {label:'日常',color:'255,211,140',x:145,y:104,icon:'home'},
  {label:'AI',color:'139,245,209',x:326,y:60,icon:'chip'},
  {label:'灵感',color:'218,186,255',x:502,y:113,icon:'book'},
  {label:'音乐',color:'255,180,145',x:551,y:277,icon:'music'},
  {label:'工具',color:'137,202,255',x:469,y:438,icon:'tool'},
  {label:'行情',color:'145,228,255',x:187,y:449,icon:'chart'},
  {label:'社区',color:'244,179,226',x:88,y:285,icon:'leaf'},
];

export function mountAboutWorld(section,decor) {
  const canvas=document.createElement('canvas');canvas.className='about-world';
  canvas.setAttribute('aria-hidden','true');decor.append(canvas);
  const c=canvas.getContext('2d');if(!c)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const point=new Float32Array(3),boxes=[];
  let visible=false,raf=0,last=0,time=0,arrival=0,pulse=0,scale=1,needsResize=true;
  let targetX=0,targetY=0,lookX=0,lookY=0,cy=1,sy=0,cp=1,sp=0;
  let aura,glass,core,metal;
  const box=(x,y,z,w,h,d,top,front,side)=>boxes.push({x,y,z,w,h,d,top,front,side});
  // A terraced landmass with exposed mineral strata and a planted top surface.
  for(let x=-4;x<=4;x++)for(let z=-3;z<=3;z++) {
    if(x*x/22+z*z/13>1)continue;
    const h=10+((x*17+z*13+100)%4)*4;
    box(x*18,-59,z*18,18,h,18,(x+z)%3?'#427e65':'#5f9770','#1e4246','#285754');
    if(Math.abs(x)+Math.abs(z)<5)box(x*17,-76,z*17,17,15,17,'#2e5656','#192e3d','#25434c');
    if(Math.abs(x)+Math.abs(z)<3)box(x*14,-93,z*14,14,16,14,'#283c4a','#172632','#213745');
  }
  // Fine, stepped architecture sits on the island; warm windows are separate faces.
  box(-18,-36,-13,52,6,38,'#7aa88b','#416557','#355d56');
  box(-18,-30,-13,37,34,28,'#427b77','#294d52','#356965');
  box(-18,4,-13,43,5,34,'#b2c7ab','#5b8273','#7b9c85');
  box(-19,-19,2,27,11,1,'#ffe9ae','#edcb86','#cda970');
  box(2,-20,-15,1,12,18,'#fce7aa','#edd195','#d9be7f');
  box(-18,9,-15,23,17,20,'#5c9c90','#325c61','#447f79');
  box(-18,26,-15,28,4,25,'#b5d5b4','#628b78','#759b84');
  box(-18,30,-15,4,22,4,'#f4f7c4','#95dfc5','#6bbcad');
  box(30,-35,-20,20,24,22,'#9cb493','#315c59','#467c69');
  box(30,-11,-20,24,4,26,'#c4d2ab','#6f9b7d','#7caa88');
  box(30,-27,-8,12,8,1,'#fff0b5','#e7c47d','#ceab75');
  // Small geometric trees with tiered canopies.
  for(const [x,z,h] of [[-57,-20,24],[-45,29,20],[50,23,26],[15,-43,18]]) {
    box(x,-35,z,4,h,4,'#a39a77','#635f51','#77715a');
    for(let k=0;k<3;k++)box(x,-25+h*.45+k*8,z,18-k*4,9,18-k*4,k%2?'#87b87a':'#6f9e72','#325f58','#4b7c60');
  }
  // Painter order remains stable under the deliberately small camera movement.
  boxes.sort((a,b)=>(a.z+a.x*.3)-(b.z+b.x*.3)||a.y-b.y);

  function project(x,y,z) {
    const xx=x*cy+z*sy,zz=-x*sy+z*cy,yy=y*cp-zz*sp,depth=-y*sp-zz*cp;
    const f=760/(760+depth);
    point[0]=320+xx*f;point[1]=265-yy*f;point[2]=depth;return point;
  }
  function vertex(x,y,z,first=false) {const p=project(x,y,z);if(first)c.moveTo(p[0],p[1]);else c.lineTo(p[0],p[1]);}
  function line(color=MINT,alpha=.5,width=1) {c.strokeStyle=rgba(color,alpha);c.lineWidth=width;c.stroke();}
  function dot(x,y,r,color=MINT,alpha=1) {c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=rgba(color,alpha);c.fill();}
  function circle(radius,z,start=0,length=TAU,color=MINT,alpha=.4,width=1) {
    c.beginPath();for(let i=0;i<=120;i++){const a=start+length*i/120;vertex(Math.cos(a)*radius,Math.sin(a)*radius,z,i===0);}line(color,alpha,width);
  }
  function floorRing(radius,y,start=0,length=TAU,color=MINT,alpha=.4,width=1) {
    c.beginPath();for(let i=0;i<=100;i++){const a=start+length*i/100;vertex(Math.cos(a)*radius,y,Math.sin(a)*radius,i===0);}line(color,alpha,width);
  }
  function face(b,side) {
    const x=b.x-b.w/2,z=b.z-b.d/2;
    c.beginPath();
    if(side===0){vertex(x,b.y+b.h,z,true);vertex(x+b.w,b.y+b.h,z);vertex(x+b.w,b.y+b.h,z+b.d);vertex(x,b.y+b.h,z+b.d);}
    else if(side===1){vertex(x,b.y,z+b.d,true);vertex(x+b.w,b.y,z+b.d);vertex(x+b.w,b.y+b.h,z+b.d);vertex(x,b.y+b.h,z+b.d);}
    else{vertex(x+b.w,b.y,z,true);vertex(x+b.w,b.y,z+b.d);vertex(x+b.w,b.y+b.h,z+b.d);vertex(x+b.w,b.y+b.h,z);}
    c.closePath();c.fillStyle=side===0?b.top:side===1?b.front:b.side;c.fill();
    c.strokeStyle='rgba(172,226,200,.09)';c.lineWidth=.45;c.stroke();
  }

  function icon(kind,x,y,tint) {
    c.save();c.translate(x,y);c.lineJoin='round';c.lineCap='round';c.beginPath();
    if(kind==='home') {c.moveTo(-8,0);c.lineTo(0,-7);c.lineTo(8,0);c.moveTo(-6,-1);c.lineTo(-6,7);c.lineTo(6,7);c.lineTo(6,-1);c.moveTo(-2,7);c.lineTo(-2,2);c.lineTo(2,2);c.lineTo(2,7);}
    if(kind==='chip') {c.rect(-5,-5,10,10);c.rect(-2,-2,4,4);for(let i=-3;i<=3;i+=3){c.moveTo(i,-8);c.lineTo(i,-5);c.moveTo(i,5);c.lineTo(i,8);c.moveTo(-8,i);c.lineTo(-5,i);c.moveTo(5,i);c.lineTo(8,i);}}
    if(kind==='book') {c.moveTo(0,7);c.lineTo(0,-5);c.quadraticCurveTo(-4,-8,-9,-5);c.lineTo(-9,6);c.quadraticCurveTo(-4,3,0,7);c.quadraticCurveTo(4,3,9,6);c.lineTo(9,-5);c.quadraticCurveTo(4,-8,0,-5);}
    if(kind==='music') {c.moveTo(-3,5);c.lineTo(-3,-6);c.lineTo(7,-8);c.lineTo(7,3);c.moveTo(-3,-2);c.lineTo(7,-4);c.moveTo(-3,5);c.ellipse(-6,5,3,2,-.3,0,TAU);c.moveTo(7,3);c.ellipse(4,3,3,2,-.3,0,TAU);}
    if(kind==='tool') {c.moveTo(-7,7);c.lineTo(2,-2);c.bezierCurveTo(-1,-7,3,-9,7,-7);c.lineTo(4,-4);c.lineTo(6,-2);c.lineTo(9,-5);c.bezierCurveTo(10,0,5,2,3,0);c.lineTo(-5,9);c.closePath();}
    if(kind==='chart') {c.moveTo(-8,-7);c.lineTo(-8,8);c.lineTo(9,8);c.moveTo(-5,4);c.lineTo(-1,-1);c.lineTo(3,1);c.lineTo(8,-6);c.moveTo(3,-6);c.lineTo(8,-6);c.lineTo(8,-1);}
    if(kind==='leaf') {c.moveTo(-7,8);c.quadraticCurveTo(-9,-6,8,-8);c.quadraticCurveTo(9,7,-7,8);c.lineTo(5,-5);c.moveTo(-2,3);c.lineTo(3,3);}
    line(tint,.95,1.15);c.restore();
  }

  function satellites() {
    const a=Math.min(1,arrival/2);
    for(let i=0;i<7;i++) {
      const node=DESTINATIONS[i],x=node.x+Math.sin(time*.4+i)*3,y=node.y+Math.cos(time*.35+i)*4;
      const dx=x-320,dy=y-265,len=Math.hypot(dx,dy),tx=320+dx/len*174,ty=265+dy/len*174;
      const reveal=reduced.matches?1:Math.min(1,Math.max(0,(arrival-.6-i*.13)*2));
      if(!reveal)continue;
      c.globalAlpha=reveal;
      const mx=(x+tx)*.5-dy*.09,my=(y+ty)*.5+dx*.09;
      c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(mx,my,x,y);line(node.color,.34,.8);
      for(let j=0;j<2;j++) {
        const u=(time*.24+i*.12+j*.5)%1,v=1-u;
        const px=v*v*tx+2*v*u*mx+u*u*x,py=v*v*ty+2*v*u*my+u*u*y;
        dot(px,py,1.65,node.color,.8);dot(px,py,4,node.color,.08);
      }
      c.beginPath();c.moveTo(x-32,y-21);c.lineTo(x+21,y-21);c.lineTo(x+32,y-10);c.lineTo(x+32,y+21);c.lineTo(x-32,y+21);c.closePath();
      c.fillStyle='rgba(8,27,31,.88)';c.fill();line(node.color,.55,.8);
      icon(node.icon,x,y-4,node.color);
      c.font='9px "Microsoft YaHei",system-ui,sans-serif';c.textAlign='center';c.fillStyle=rgba(node.color,.9);c.fillText(node.label,x,y+14);
      c.beginPath();c.moveTo(x-36,y-12);c.lineTo(x-36,y-25);c.lineTo(x-20,y-25);line(node.color,.26,.65);
    }
    c.globalAlpha=a;
  }

  function portal(back=false) {
    const spin=time*.065;
    if(back) {
      circle(163,20,0,TAU,BLUE,.2,1.2);circle(149,20,0,TAU,MINT,.19,.8);
      for(let i=0;i<36;i++) {
        const a=i/36*TAU;
        c.beginPath();vertex(Math.cos(a)*163,Math.sin(a)*163,20,true);vertex(Math.cos(a)*163,Math.sin(a)*163,-10);line(BLUE,.15,.7);
      }
      return;
    }
    // Machined annular segments expose the portal's thickness and bevel.
    for(let i=0;i<48;i++) {
      const a=i/48*TAU+spin,b=a+TAU/48*.79;
      c.beginPath();vertex(Math.cos(a)*157,Math.sin(a)*157,-10,true);
      for(let j=1;j<=5;j++){const v=a+(b-a)*j/5;vertex(Math.cos(v)*157,Math.sin(v)*157,-10);}
      for(let j=5;j>=0;j--){const v=a+(b-a)*j/5;vertex(Math.cos(v)*145,Math.sin(v)*145,-10);}
      c.closePath();c.fillStyle=metal;c.fill();line(MINT,i%6===0?.7:.32,.6);
    }
    circle(161,-10,0,TAU,MINT,.48,.8);circle(142,-12,0,TAU,MINT,.6,.85);
    for(let i=0;i<3;i++) {
      circle(138,-13,-time*.2+i*TAU/3,1.1,i===1?GOLD:MINT,.85,2);
      circle(169,-8,time*.13+i*TAU/3,.55,BLUE,.5,.9);
    }
    for(let i=0;i<120;i++) {
      const a=i/120*TAU,r=i%5===0?177:180;
      c.beginPath();vertex(Math.cos(a)*r,Math.sin(a)*r,0,true);vertex(Math.cos(a)*184,Math.sin(a)*184,0);line(i%5===0?GOLD:MINT,i%5===0?.5:.17,.6);
    }
    // Three gimbal braces catch light as the camera shifts.
    for(let i=0;i<3;i++) {
      const a=i*TAU/3-.5;
      circle(159,-16,a,.18,GOLD,.9,3);
      const p=project(Math.cos(a+.09)*164,Math.sin(a+.09)*164,-16);dot(p[0],p[1],2,GOLD,.9);
    }
  }

  function island() {
    const bob=Math.sin(time*.7)*3;
    c.save();c.translate(0,bob);
    c.beginPath();c.ellipse(320,293,115,74,0,0,TAU);c.fillStyle=glass;c.fill();
    for(const b of boxes){face(b,2);face(b,1);face(b,0);}
    // Luminous footpaths connect the miniature buildings.
    c.beginPath();vertex(-57,-33,10,true);vertex(30,-33,10);vertex(30,-33,32);vertex(53,-33,32);line(GOLD,.8,1.5);
    for(let i=0;i<6;i++) {
      const u=(time*.13+i/6)%1,p=project(-57+u*110,-32,10);
      dot(p[0],p[1],1.6,GOLD,.9);
    }
    // Pixel waterfalls become falling data particles below the suspended island.
    c.globalCompositeOperation='lighter';
    for(let stream=0;stream<3;stream++)for(let i=0;i<18;i++) {
      const age=(time*.38+i/18+stream*.29)%1,x=stream===0?-51:stream===1?57:18,z=stream===0?28:stream===1?-10:47;
      const y=-42-age*104;
      c.beginPath();vertex(x+Math.sin(i*5)*2,y,z,true);vertex(x+Math.sin(i*5)*2,y-3-age*3,z);line(stream===2?GOLD:BLUE,(1-age)*.58,.7);
    }
    const p=project(-18,55,-15),x=p[0],y=p[1];
    dot(x,y,10,MINT,.045);dot(x,y,4,MINT,.2);dot(x,y,1.6,'242,255,221',1);
    c.globalCompositeOperation='source-over';c.restore();
    // Curved holographic meridians form a protective canopy over the small world.
    for(let j=0;j<5;j++) {
      c.beginPath();
      for(let i=0;i<=75;i++) {
        const a=i/75*Math.PI,lon=j*Math.PI/5+time*.06;
        vertex(Math.cos(a)*Math.cos(lon)*111,-30+Math.sin(a)*126,Math.cos(a)*Math.sin(lon)*111,i===0);
      }
      line(MINT,.17,.7);
    }
    floorRing(109,-31,0,TAU,MINT,.3,.8);
    // Brand plate is deliberately distinct from the seven destination nodes.
    const badge=project(0,107,-25);
    c.fillStyle='rgba(9,30,34,.9)';c.fillRect(badge[0]-33,badge[1]-13,66,28);
    c.strokeStyle=rgba(MINT,.35);c.lineWidth=.7;c.strokeRect(badge[0]-33,badge[1]-13,66,28);
    c.fillStyle='#e4ffd2';c.font='700 20px Consolas,monospace';c.textAlign='center';c.fillText('Li+',badge[0],badge[1]+8);
  }

  function draw() {
    if(!canvas.width)return;
    c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,640,560);
    const reveal=reduced.matches?1:Math.min(1,arrival/1.3);
    c.globalAlpha=reveal;
    const yaw=-.23+Math.sin(time*.19)*.055+lookX*.075,pitch=.37+lookY*.055;
    cy=Math.cos(yaw);sy=Math.sin(yaw);cp=Math.cos(pitch);sp=Math.sin(pitch);
    c.fillStyle=aura;c.fillRect(0,0,640,560);
    for(let i=0;i<60;i++)dot(55+(i*79.7)%535,40+(i*43.17)%470+Math.sin(time*.25+i)*3,i%9?.6:1.2,MINT,.11+(i%3)*.045);
    satellites();c.globalAlpha=reveal;
    portal(true);
    // Subtle volumetric beam from the levitation platform into the island.
    c.beginPath();vertex(-67,-163,0,true);vertex(-35,-77,0);vertex(35,-77,0);vertex(67,-163,0);c.closePath();c.fillStyle=core;c.fill();
    for(let k=0;k<3;k++) {
      floorRing(92+k*17,-157-k*5,0,TAU,k%2?BLUE:MINT,.18+k*.05,.8);
      floorRing(92+k*17,-157-k*5,time*.19+k*2,.85,MINT,.7,1.2);
    }
    island();portal();
    // Activation wave races out from the portal; replay also rebuilds the reveal.
    if(pulse>.005)for(let i=0;i<2;i++)circle(147+(1-pulse)*(65+i*30),-12,0,TAU,i?BLUE:GOLD,pulse*.4,1.2);
    if(!reduced.matches&&arrival<2.4) {
      const y=140-arrival*115;
      c.beginPath();vertex(-124,y,-25,true);vertex(124,y,-25);line(MINT,Math.sin(Math.min(1,arrival/2.4)*Math.PI)*.7,1);
    }
    c.textAlign='center';c.font='9px Consolas,monospace';c.letterSpacing='2px';c.fillStyle=rgba(MINT,.65);c.fillText('ONE SMALL WORLD / ENDLESS CONNECTIONS',320,525);c.letterSpacing='0px';
    c.globalAlpha=1;
  }

  function resize() {
    needsResize=true;
    if(!visible||document.hidden)return;
    needsResize=false;
    // CSS entrance transforms must not resize the backing buffer every frame.
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);scale=canvas.width/640;
    aura=c.createRadialGradient(320,265,30,320,265,252);aura.addColorStop(0,'#82edc317');aura.addColorStop(.65,'#65bddb09');aura.addColorStop(1,'#65bddb00');
    glass=c.createRadialGradient(290,250,12,320,290,122);glass.addColorStop(0,'#173e4533');glass.addColorStop(.75,'#63dbd00a');glass.addColorStop(.97,'#8dedda24');glass.addColorStop(1,'#8dedda00');
    core=c.createLinearGradient(320,340,320,452);core.addColorStop(0,'#85dfd002');core.addColorStop(1,'#85dfd01f');
    metal=c.createLinearGradient(160,100,470,405);metal.addColorStop(0,'#698d8b');metal.addColorStop(.23,'#16383f');metal.addColorStop(.48,'#92c4b0');metal.addColorStop(.51,'#28474c');metal.addColorStop(.8,'#456778');metal.addColorStop(1,'#142c36');
    draw();
  }
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function frame(now) {
    raf=0;if(!visible||document.hidden||reduced.matches){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;time+=dt;arrival+=dt;pulse=Math.max(0,pulse-dt*.65);
    const easing=1-Math.exp(-dt*5);lookX+=(targetX-lookX)*easing;lookY+=(targetY-lookY)*easing;
    draw();raf=requestAnimationFrame(frame);
  }
  function start(){if(!visible||document.hidden)return;if(needsResize)resize();if(reduced.matches){draw();return;}if(!raf)raf=requestAnimationFrame(frame);}
  new ResizeObserver(resize).observe(canvas);resize();
  new IntersectionObserver(entries=>{
    // Rapid layout changes can queue both entry and exit in one delivery.
    visible=entries[entries.length-1].isIntersecting;
    if(visible)start();else stop();
  }).observe(canvas);
  section.addEventListener('about:replay',()=>{arrival=0;pulse=1;start();});
  section.addEventListener('pointermove',event=>{
    if(!fine.matches||reduced.matches||!visible||document.hidden)return;
    const r=section.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));targetY=Math.max(-1,Math.min(1,(event.clientY-r.top)/Math.min(r.height,600)*2-1));
  },{passive:true});
  section.addEventListener('pointerleave',()=>{targetX=targetY=0;});
  section.addEventListener('pointerdown',()=>{if(!visible||reduced.matches)return;pulse=1;start();});
  reduced.addEventListener('change',()=>{stop();lookX=lookY=targetX=targetY=0;start();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start();});
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',start);
}
