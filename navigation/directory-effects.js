import { mountSpectacle } from './directory-spectacle.js';
// Lightweight effects: animation is restricted to visible directories and cards.
export function mountDirectoryEffects(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const observer = new IntersectionObserver(entries => {
    for (const {target,isIntersecting} of entries) {
      target.classList.toggle('fx-visible', isIntersecting);
      if (isIntersecting) target.classList.add('fx-entered');
    }
  }, {threshold:0, rootMargin:'0px'});
  const rooms = [...root.querySelectorAll('.room-directory')];
  for (const room of rooms) {
    room.classList.add('directory-fx');
    const decor = document.createElement('div');
    decor.className = 'directory-atmosphere';
    decor.setAttribute('aria-hidden','true');
    decor.innerHTML = '<div class="fx-grid"></div><div class="fx-orbit"></div><div class="fx-spectrum">'+Array.from({length:24},(_,i)=>`<i style="--i:${i};--level:${20+(i*37)%80}%"></i>`).join('')+'</div>'+Array.from({length:22},(_,i)=>`<b class="fx-mote" style="--i:${i};left:${(i*47)%100}%;top:${(i*31)%100}%;--duration:${7+i%7}s"></b>`).join('');
    const bridge = document.createElement('div');
    bridge.className='fx-bridge'; bridge.setAttribute('aria-hidden','true');
    bridge.innerHTML=Array.from({length:32},(_,i)=>`<i style="--i:${i};left:${i*3.2}%;--drop:${25+(i*43)%110}px"></i>`).join('');
    room.prepend(decor,bridge);
    observer.observe(room);
  }
  mountSpectacle(root);
  let observed=[];
  function refresh() {
    observed.forEach(node=>observer.unobserve(node));
    observed=[...root.querySelectorAll('.room-card,.room-category h4')];
    observed.forEach((node,i)=>{node.style.setProperty('--delay',`${(i%8)*45}ms`);observer.observe(node);});
  }
  let pending=0;
  root.addEventListener('pointermove',event=>{
    if (!fine.matches || reduced.matches || pending) return;
    const card=event.target.closest('.room-card');
    const room=event.target.closest('.room-directory');
    if (!room) return;
    const x=event.clientX,y=event.clientY;
    pending=requestAnimationFrame(()=>{
      pending=0;
      room.style.setProperty('--grid-shift',`${(x/innerWidth-.5)*12}px`);
      if (!card?.isConnected) return;
      const r=card.getBoundingClientRect(), px=(x-r.left)/r.width,py=(y-r.top)/r.height;
      card.style.setProperty('--mx',`${px*100}%`);card.style.setProperty('--my',`${py*100}%`);
      card.style.setProperty('--rx',`${(0.5-py)*9}deg`);card.style.setProperty('--ry',`${(px-.5)*10}deg`);
    });
  });
  root.addEventListener('pointerout',event=>{
    const card=event.target.closest('.room-card');
    if (card && !card.contains(event.relatedTarget)) {card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');}
  });
  root.addEventListener('click',event=>{
    const card=event.target.closest('.room-card');
    if (!card || reduced.matches) return;
    const r=card.getBoundingClientRect(), pulse=document.createElement('span');
    pulse.className='fx-pulse';pulse.setAttribute('aria-hidden','true');
    pulse.style.left=`${event.detail ? event.clientX-r.left : r.width/2}px`;
    pulse.style.top=`${event.detail ? event.clientY-r.top : r.height/2}px`;
    card.append(pulse);pulse.addEventListener('animationend',()=>pulse.remove(),{once:true});
  });
  document.addEventListener('visibilitychange',()=>root.classList.toggle('fx-paused',document.hidden));
  return {
    beforeRender() {
      return new Map([...root.querySelectorAll('.room-card')].map(card=>[card.dataset.site,{rect:card.getBoundingClientRect(),node:card}]));
    },
    afterRender(previous) {
      refresh();
      if (reduced.matches || !previous?.size) return;
      const cards=[...root.querySelectorAll('.room-card')];
      const current=new Set(cards.map(card=>card.dataset.site));
      for (const card of cards) {
        const old=previous.get(card.dataset.site),rect=card.getBoundingClientRect();
        if (!old || rect.bottom<0 || rect.top>innerHeight) continue;
        card.classList.add('fx-entered');
        const dx=old.rect.left-rect.left,dy=old.rect.top-rect.top;
        if (dx || dy) card.animate([{translate:`${dx}px ${dy}px`},{translate:'0px 0px'}],{duration:440,easing:'cubic-bezier(.2,.8,.2,1)'});
      }
      for (const [id,{rect,node}] of previous) {
        if (current.has(id) || rect.bottom<0 || rect.top>innerHeight) continue;
        const ghost=node.cloneNode(true);ghost.removeAttribute('data-site');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
        Object.assign(ghost.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,pointerEvents:'none',zIndex:'20'});
        document.body.append(ghost);
        ghost.animate([{opacity:.7},{opacity:0,translate:'0px -12px'}],{duration:220}).finished.then(()=>ghost.remove());
      }
      rooms.forEach(room=>{room.classList.remove('fx-filter');void room.offsetWidth;room.classList.add('fx-filter');});
    }
  };
}
