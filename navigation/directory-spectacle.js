import { mountInstallations } from './directory-installations.js';

// Event-driven card effects, with visibility-gated procedural installations.
export function mountSpectacle(root) {
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(pointer:fine)');
 const rooms=[...root.querySelectorAll('.room-directory')];
 const active=new Set();
 const animate=(el,frames,options)=>{if(!reduce.matches&&!document.hidden)return el.animate(frames,options);};
 const observer=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
  if(isIntersecting){active.add(target); if(!target.dataset.booted){target.dataset.booted='true';target.classList.add('spectacle-boot');}}
  else active.delete(target);
 }),{threshold:0});
 rooms.forEach(room=>{
  const stage=document.createElement('div');stage.className='spectacle-stage';stage.setAttribute('aria-hidden','true');
  room.prepend(stage);observer.observe(room);
  // Wires sit between the background artwork and the link cards.
  const wires=document.createElementNS('http://www.w3.org/2000/svg','svg');
  wires.classList.add('energy-wires');wires.setAttribute('aria-hidden','true');
  wires.setAttribute('width','100%');wires.setAttribute('height','100%');
  room.append(wires);
 });
 mountInstallations(root);
 let lastCard=null,lastWave=0;
 function clearWires(svg){
  svg.querySelectorAll('path').forEach(path=>path.getAnimations().forEach(animation=>animation.cancel()));
  svg.replaceChildren();
 }
 function chain(card){
  if(!card||reduce.matches||document.hidden)return;
  const room=card.closest('.room-directory'),svg=room.querySelector('.energy-wires'),base=svg.getBoundingClientRect(),r=card.getBoundingClientRect();
  clearWires(svg);
  const cards=[...room.querySelectorAll('.room-card')].map(c=>({c,r:c.getBoundingClientRect()}));
  // Cut out the entire card surface, so wires cannot show through its glass.
  // Rebuild from current geometry after filtering or responsive layout changes.
  const ns='http://www.w3.org/2000/svg',defs=document.createElementNS(ns,'defs'),mask=document.createElementNS(ns,'mask');
  const maskId=`wire-mask-${rooms.indexOf(room)}`;
  mask.id=maskId;mask.setAttribute('maskUnits','userSpaceOnUse');
  mask.setAttribute('x','0');mask.setAttribute('y','0');
  mask.setAttribute('width',base.width);mask.setAttribute('height',base.height);
  const surface=document.createElementNS(ns,'rect');
  surface.setAttribute('width',base.width);surface.setAttribute('height',base.height);surface.setAttribute('fill','white');mask.append(surface);
  for(const {r:t} of cards){
   const cutout=document.createElementNS(ns,'rect');
   cutout.setAttribute('x',t.left-base.left-2);cutout.setAttribute('y',t.top-base.top-2);
   cutout.setAttribute('width',t.width+4);cutout.setAttribute('height',t.height+4);cutout.setAttribute('fill','black');mask.append(cutout);
  }
  defs.append(mask);
  const lines=document.createElementNS(ns,'g');lines.setAttribute('mask',`url(#${maskId})`);svg.append(defs,lines);
  const x=r.left+r.width/2-base.left,y=r.top+r.height/2-base.top;
  const nearby=cards.filter(({c})=>c!==card)
   .filter(({r:t})=>t.width&&t.height&&t.bottom>0&&t.top<innerHeight&&t.right>0&&t.left<innerWidth)
   .sort((a,b)=>Math.hypot(a.r.left-r.left,a.r.top-r.top)-Math.hypot(b.r.left-r.left,b.r.top-r.top)).slice(0,8);
  // Choose fresh connections from the nearest visible neighbours on each hover.
  for(let i=nearby.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[nearby[i],nearby[j]]=[nearby[j],nearby[i]];}
  const colors=['var(--accent-room)','#8bdfff','#c7a6ff','#ffdb91'];
  nearby.slice(0,4).forEach(({c,r:t},i)=>{
   const tx=t.left+t.width/2-base.left,ty=t.top+t.height/2-base.top;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',`M ${x} ${y} V ${(y+ty)/2} H ${tx} V ${ty}`);path.setAttribute('pathLength','1');
   path.style.color=colors[i];lines.append(path);
   animate(path,[{strokeDashoffset:1,opacity:0},{opacity:.65,offset:.2},{strokeDashoffset:0,opacity:.55,offset:.65},{strokeDashoffset:0,opacity:0}],{duration:1100,delay:i*65,fill:'both'})?.finished.then(()=>path.remove(),()=>path.remove());
   animate(c,[{borderColor:'rgb(var(--glow-room)/.65)'},{}],{duration:650,delay:150+i*65,easing:'ease-out'});
  });
 }
 root.addEventListener('pointerover',e=>{
  const card=e.target.closest('.room-card');
  if(card!==lastCard){lastCard=card;chain(card);}
 }); root.addEventListener('focusin',e=>chain(e.target.closest('.room-card')));
 root.addEventListener('pointerleave',()=>{lastCard=null;});
 root.addEventListener('pointerdown',e=>{if(!fine.matches)chain(e.target.closest('.room-card'));});
 window.addEventListener('scroll',()=>{
  rooms.forEach(room=>clearWires(room.querySelector('.energy-wires')));
  if(reduce.matches||document.hidden||performance.now()-lastWave<850)return;lastWave=performance.now();
  active.forEach(room=>{
   room.querySelectorAll('.room-card.fx-visible').forEach((card,i)=>animate(card,[{translate:'0 0'},{translate:'0 -5px',offset:.45},{translate:'0 0'}],{duration:500,delay:Math.min(i*25,250)}));
  });
 },{passive:true});
 window.addEventListener('resize',()=>rooms.forEach(room=>clearWires(room.querySelector('.energy-wires'))));
 let searchTimer;
 document.querySelector('#room-query')?.addEventListener('input',()=>{
  clearTimeout(searchTimer);searchTimer=setTimeout(()=>{
   if(reduce.matches)return;
   rooms.forEach(room=>{
    room.classList.toggle('target-lock',Boolean(document.querySelector('#room-query').value.trim()));
   });
  },100);
 });
 reduce.addEventListener('change',()=>{if(reduce.matches)rooms.forEach(room=>{room.getAnimations({subtree:true}).forEach(a=>a.cancel());});});
}
