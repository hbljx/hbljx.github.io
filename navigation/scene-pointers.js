// One viewport canvas, bounded trails, and an animation loop that sleeps when idle.
export function mountScenePointers() {
 const modes={about:'comet',works:'lightning',writing:'ribbon',coffee:'stardust',lab:'scanner',court:'water',pool:'fairy'};
 const colors=['#c7ff83','#8dffe6','#dab4ff','#ffd68e','#8eeaff','#91dcff','#ffbce5','#c6ff98'];
 const names=Object.values(modes).concat('magnet');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
 const canvas=document.createElement('canvas');canvas.className='scene-pointer-canvas';canvas.setAttribute('aria-hidden','true');
 Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'90'});document.body.append(canvas);
 const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return;}
 let mode='',x=0,y=0,lastX=0,lastY=0,frame=0,lastTime=0,moved=0,spawn=0,target=null,trail=[],particles=[],blocks=Array.from({length:12},()=>({x:0,y:0}));
 function size(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 function clear(){cancelAnimationFrame(frame);frame=0;mode='';canvas.dataset.mode='';trail=[];particles=[];ctx.clearRect(0,0,innerWidth,innerHeight);}
 function choose(el){
  if(!fine.matches||reduced.matches||document.hidden||!el||el.closest('dialog,.site-header'))return '';
  const scene=el.closest('.scene');return scene?modes[scene.dataset.room]||'':el.closest('#about-us')?'magnet':'';
 }
 function setMode(next){if(next===mode)return;clear();mode=next;canvas.dataset.mode=mode;blocks.forEach((b,i)=>{b.x=x+Math.cos(i)*30;b.y=y+Math.sin(i)*30;});}
 function wake(){if(mode&&!frame){lastTime=performance.now();frame=requestAnimationFrame(draw);}}
 function star(px,py,r){ctx.beginPath();ctx.moveTo(px-r,py);ctx.lineTo(px-r*.2,py-r*.2);ctx.lineTo(px,py-r);ctx.lineTo(px+r*.2,py-r*.2);ctx.lineTo(px+r,py);ctx.lineTo(px+r*.2,py+r*.2);ctx.lineTo(px,py+r);ctx.lineTo(px-r*.2,py+r*.2);ctx.closePath();ctx.fill();}
 function draw(now){
  frame=0;if(!mode||document.hidden)return;
  const dt=Math.min(40,now-lastTime);lastTime=now;ctx.clearRect(0,0,innerWidth,innerHeight);
  const age=now-moved,fade=Math.max(0,1-Math.max(0,age-1200)/900),color=colors[names.indexOf(mode)];
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.5;ctx.shadowColor=color;ctx.shadowBlur=7;
  trail=trail.filter(p=>now-p.t<750);particles=particles.filter(p=>now-p.t<p.life);
  if(mode==='comet'||mode==='stardust')particles.forEach(p=>{const t=(now-p.t)/p.life;ctx.globalAlpha=(1-t)*.85;const px=p.x+p.vx*t,py=p.y+p.vy*t;ctx.fillStyle=p.color;if(mode==='stardust')star(px,py,p.size*(1-t));else ctx.fillRect(px,py,p.size*(1-t),p.size*(1-t));});
  ctx.fillStyle=color;ctx.globalAlpha=fade;
  if(mode==='lightning'){
   const end=target?.isConnected?target.getBoundingClientRect():null;
   const tx=end?Math.max(end.left,Math.min(x,end.right)):x-45,ty=end?end.top:y+35;
   for(let branch=0;branch<2;branch++){
    ctx.beginPath();ctx.moveTo(x,y);for(let i=1;i<=7;i++){const wobble=Math.sin(i*29+Math.floor(now/90)*7+branch)*9;ctx.lineTo(x+(tx-x)*i/7+wobble, y+(ty-y)*i/7+wobble);}ctx.stroke();
   }
   star(x,y,5);
  }else if(mode==='ribbon'){
   ['#e3b7ff','#7ceeff','#ff9fcf'].forEach((c,j)=>{ctx.strokeStyle=c;ctx.lineWidth=3-j*.65;ctx.beginPath();trail.forEach((p,i)=>{const offset=Math.sin(i*.45-now*.003+j)*5;const px=p.x+offset*j,py=p.y+offset*j;if(!i)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.stroke();});
  }else if(mode==='scanner'){
   let sx=x,sy=y,w=54,h=54;
   if(target?.isConnected){const r=target.getBoundingClientRect();sx=r.left+r.width/2;sy=r.top+r.height/2;w=r.width+8;h=r.height+8;}
   const l=sx-w/2,t=sy-h/2;ctx.lineWidth=2;ctx.beginPath();[[l,t,1,1],[l+w,t,-1,1],[l,t+h,1,-1],[l+w,t+h,-1,-1]].forEach(([a,b,u,v])=>{ctx.moveTo(a+u*12,b);ctx.lineTo(a,b);ctx.lineTo(a,b+v*12);});ctx.stroke();
   ctx.globalAlpha=fade*.45;const scan=t+(now%1400)/1400*h;ctx.beginPath();ctx.moveTo(l,scan);ctx.lineTo(l+w,scan);ctx.stroke();
   ctx.beginPath();ctx.arc(x,y,14,now*.002,now*.002+4.5);ctx.stroke();
  }else if(mode==='water'){
   particles.forEach(p=>{const t=(now-p.t)/p.life;ctx.globalAlpha=(1-t)*.6;ctx.beginPath();ctx.ellipse(p.x,p.y,5+t*p.size,(5+t*p.size)*.65,0,0,Math.PI*2);ctx.stroke();});
  }else if(mode==='fairy'){
   const fx=x+22+Math.cos(now*.004)*12,fy=y-23+Math.sin(now*.005)*9;
   ctx.globalAlpha=fade*.45;ctx.beginPath();ctx.ellipse(fx-7,fy-2,8,3+Math.abs(Math.sin(now*.02))*6,-.6,0,7);ctx.ellipse(fx+7,fy-2,8,3+Math.abs(Math.sin(now*.02))*6,.6,0,7);ctx.fill();
   ctx.globalAlpha=fade;ctx.fillStyle='#fff5ca';ctx.fillRect(fx-3,fy-5,6,10);star(fx-15,fy+14,3);
  }else if(mode==='magnet'){
   const force=1-Math.exp(-dt/110);blocks.forEach((b,i)=>{const moving=age<120,angle=i*Math.PI/6+now*.0004;const radius=moving?38+i%3*8:23;const tx=x+Math.cos(angle)*radius,ty=y+Math.sin(angle)*radius;b.x+=(tx-b.x)*force;b.y+=(ty-b.y)*force;ctx.globalAlpha=fade*(.35+i%3*.2);ctx.fillRect(b.x-3,b.y-3,6,6);ctx.strokeRect(b.x-4,b.y-4,8,8);});
  }
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  if(age<2100||particles.length)frame=requestAnimationFrame(draw);else ctx.clearRect(0,0,innerWidth,innerHeight);
 }
 window.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  lastX=x;lastY=y;x=e.clientX;y=e.clientY;setMode(choose(e.target));if(!mode)return;
  moved=performance.now();target=e.target.closest('.room-card,.solid-link,.scene-enter');
  trail.push({x,y,t:moved});if(trail.length>32)trail.shift();
  if(moved-spawn>24){spawn=moved;const speed=Math.min(60,Math.hypot(x-lastX,y-lastY));
   if(mode==='comet'||mode==='stardust')for(let i=0;i<3;i++)particles.push({x:x+(Math.random()-.5)*12,y:y+(Math.random()-.5)*12,t:moved,life:mode==='comet'?600:1100,vx:(lastX-x)*.7+(Math.random()-.5)*30,vy:(lastY-y)*.7+(Math.random()-.5)*30,size:mode==='comet'?4+speed*.08:3+Math.random()*4,color:colors[(names.indexOf(mode)+i)%8]});
   if(mode==='water'&&(particles.length===0||moved-particles.at(-1).t>100))particles.push({x,y,t:moved,life:1000,size:45});
   if(particles.length>100)particles.splice(0,particles.length-100);
  }wake();
 },{passive:true});
 window.addEventListener('pointerdown',e=>{if(mode==='water'){particles.push({x:e.clientX,y:e.clientY,t:performance.now(),life:1300,size:100});wake();}});
 window.addEventListener('scroll',()=>{setMode(choose(document.elementFromPoint(x,y)));target=null;wake();},{passive:true});
 window.addEventListener('resize',()=>{size();clear();});
 document.addEventListener('pointerleave',clear);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 fine.addEventListener('change',clear);reduced.addEventListener('change',clear);size();
}
