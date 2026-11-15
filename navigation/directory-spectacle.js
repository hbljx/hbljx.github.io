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
  // Keep the wires above the cards, separate from the background artwork.
  const wires=document.createElementNS('http://www.w3.org/2000/svg','svg');
  wires.classList.add('energy-wires');wires.setAttribute('aria-hidden','true');
  wires.setAttribute('width','100%');wires.setAttribute('height','100%');
  room.append(wires);
 });
 mountInstallations(root);
 let lastCard=null,lastWave=0;
 function chain(card){
  if(!card||reduce.matches||document.hidden)return;
  const room=card.closest('.room-directory'),svg=room.querySelector('.energy-wires'),base=svg.getBoundingClientRect(),r=card.getBoundingClientRect();
  svg.querySelectorAll('path').forEach(path=>path.getAnimations().forEach(animation=>animation.cancel()));
  svg.replaceChildren();
  const x=r.left+r.width/2-base.left,y=r.top+r.height/2-base.top;
  const nearby=[...room.querySelectorAll('.room-card')].filter(c=>c!==card).map(c=>({c,r:c.getBoundingClientRect()}))
   .filter(({r:t})=>t.width&&t.height&&t.bottom>0&&t.top<innerHeight&&t.right>0&&t.left<innerWidth)
   .sort((a,b)=>Math.hypot(a.r.left-r.left,a.r.top-r.top)-Math.hypot(b.r.left-r.left,b.r.top-r.top)).slice(0,8);
  // Choose fresh connections from the nearest visible neighbours on each hover.
  for(let i=nearby.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[nearby[i],nearby[j]]=[nearby[j],nearby[i]];}
  const colors=['var(--accent-room)','#8bdfff','#c7a6ff','#ffdb91'];
  nearby.slice(0,4).forEach(({c,r:t},i)=>{
   const tx=t.left+t.width/2-base.left,ty=t.top+t.height/2-base.top;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',`M ${x} ${y} V ${(y+ty)/2} H ${tx} V ${ty}`);path.setAttribute('pathLength','1');
   path.style.color=colors[i];svg.append(path);
   animate(path,[{strokeDashoffset:1,opacity:0},{opacity:.9,offset:.2},{strokeDashoffset:0,opacity:.85,offset:.65},{strokeDashoffset:0,opacity:0}],{duration:1100,delay:i*65,fill:'both'})?.finished.then(()=>path.remove(),()=>path.remove());
   animate(c,[{borderColor:'var(--accent-room)',boxShadow:'0 0 26px rgb(var(--glow-room)/.65)'},{borderColor:'#6b87635e',boxShadow:'0 0 0 transparent'}],{duration:800,delay:150+i*65});
  });
 }
 root.addEventListener('pointerover',e=>{
  const card=e.target.closest('.room-card');
  if(card!==lastCard){lastCard=card;chain(card);}
 }); root.addEventListener('focusin',e=>chain(e.target.closest('.room-card')));
 root.addEventListener('pointerleave',()=>{lastCard=null;});
 root.addEventListener('pointerdown',e=>{if(!fine.matches)chain(e.target.closest('.room-card'));});
 window.addEventListener('scroll',()=>{
  if(reduce.matches||document.hidden||performance.now()-lastWave<850)return;lastWave=performance.now();
  active.forEach(room=>{
   room.querySelectorAll('.room-card.fx-visible').forEach((card,i)=>animate(card,[{translate:'0 0'},{translate:'0 -5px',offset:.45},{translate:'0 0'}],{duration:500,delay:Math.min(i*25,250)}));
  });
 },{passive:true});
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
