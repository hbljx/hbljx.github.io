// Event-driven spectacle layer. No permanent JavaScript animation loop.
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
  const type=room.closest('.scene').dataset.room;
  const stage=document.createElement('div');stage.className='spectacle-stage';stage.setAttribute('aria-hidden','true');
  stage.innerHTML=`<div class="hyper-rays">${Array.from({length:24},(_,i)=>`<i style="--angle:${i*15}deg;--n:${i}"></i>`).join('')}</div><div class="theme-device device-${type}"><div class="device-halo"></div><div class="device-ring ring-a"></div><div class="device-ring ring-b"></div><div class="device-ring ring-c"></div><div class="device-heart"></div>${Array.from({length:8},(_,i)=>`<b style="--n:${i}"></b>`).join('')}</div><div class="boot-door door-left"></div><div class="boot-door door-right"></div><div class="shock-front"></div><div class="search-beam"></div><svg class="energy-wires" width="100%" height="100%"></svg>`;
  room.prepend(stage);observer.observe(room);
 });
 let lastCard=null, tick=0,lastWave=0;
 function chain(card){
  if(!card||reduce.matches)return;
  const room=card.closest('.room-directory'),svg=room.querySelector('.energy-wires'),base=room.getBoundingClientRect(),r=card.getBoundingClientRect();
  svg.replaceChildren();
  const x=r.left+r.width/2-base.left,y=r.top+r.height/2-base.top;
  [...room.querySelectorAll('.room-card.fx-visible')].filter(c=>c!==card).map(c=>({c,r:c.getBoundingClientRect()})).sort((a,b)=>Math.hypot(a.r.left-r.left,a.r.top-r.top)-Math.hypot(b.r.left-r.left,b.r.top-r.top)).slice(0,4).forEach(({c,r:t},i)=>{
   const tx=t.left+t.width/2-base.left,ty=t.top+t.height/2-base.top;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x} ${y} V ${(y+ty)/2} H ${tx} V ${ty}`);path.setAttribute('pathLength','1');svg.append(path);
   animate(path,[{strokeDashoffset:1,opacity:0},{opacity:1,offset:.3},{strokeDashoffset:0,opacity:0}],{duration:950,delay:i*65})?.finished.then(()=>path.remove(),()=>path.remove());
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
   const r=room.getBoundingClientRect(),y=Math.max(0,-r.top)+innerHeight*.15;
   const wave=room.querySelector('.shock-front');wave.style.top=`${y}px`;
   animate(wave,[{opacity:0,transform:'translateY(0)'},{opacity:.65,offset:.15},{opacity:0,transform:`translateY(${innerHeight*.7}px)`}],{duration:850});
   room.querySelectorAll('.room-card.fx-visible').forEach((card,i)=>animate(card,[{translate:'0 0'},{translate:'0 -5px',offset:.45},{translate:'0 0'}],{duration:500,delay:Math.min(i*25,250)}));
  });
 },{passive:true});
 let searchTimer;
 document.querySelector('#room-query')?.addEventListener('input',()=>{
  clearTimeout(searchTimer);searchTimer=setTimeout(()=>{
   if(reduce.matches)return;
   rooms.forEach(room=>{
    room.classList.toggle('target-lock',Boolean(document.querySelector('#room-query').value.trim()));
    const beam=room.querySelector('.search-beam');
    if(active.has(room))animate(beam,[{opacity:0,transform:'translateY(0)'},{opacity:.6,offset:.2},{opacity:0,transform:`translateY(${Math.min(room.clientHeight,innerHeight)}px)`}],{duration:950});
   });
  },100);
 });
 reduce.addEventListener('change',()=>{if(reduce.matches)rooms.forEach(room=>{room.getAnimations({subtree:true}).forEach(a=>a.cancel());});});
}
