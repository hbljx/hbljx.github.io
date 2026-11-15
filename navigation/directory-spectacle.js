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
 });
 mountInstallations(root);
 let lastCard=null,lastWave=0;
 function chain(card){
  if(!card||reduce.matches)return;
  const room=card.closest('.room-directory'),r=card.getBoundingClientRect();
  [...room.querySelectorAll('.room-card.fx-visible')].filter(c=>c!==card).map(c=>({c,r:c.getBoundingClientRect()})).sort((a,b)=>Math.hypot(a.r.left-r.left,a.r.top-r.top)-Math.hypot(b.r.left-r.left,b.r.top-r.top)).slice(0,4).forEach(({c},i)=>{
   animate(c,[{borderColor:'var(--accent-room)',boxShadow:'0 0 26px rgb(var(--glow-room)/.65)'},{borderColor:'#6b87635e',boxShadow:'0 0 0 transparent'}],{duration:800,delay:150+i*65});
  });
 }
 root.addEventListener('pointerover',e=>{
  const card=e.target.closest('.room-card');
  if(card!==lastCard){lastCard=card;chain(card);}
 }); root.addEventListener('focusin',e=>chain(e.target.closest('.room-card')));
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
