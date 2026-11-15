import { mountAboutWorld } from './about-world.js';
import { mountAboutCountdown } from './about-countdown.js';

export function mountAboutEffects() {
  const section=document.querySelector('#about-us');
  if(!section || section.classList.contains('about-enhanced'))return;
  mountAboutCountdown();
  mountAboutWorld(section);
  section.classList.add('about-enhanced');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const cards=section.querySelectorAll('.about-project-card');
  cards.forEach((card,i)=>{
    card.style.setProperty('--item-order',i);
    const note=document.createElement('span');note.className='inventory-tooltip';
    note.textContent=['工作台 / 把想法合成为作品','红石 / 让设备配合得更顺手','书与笔 / 把发现留在下一页'][i];
    note.id=`inventory-note-${i}`;note.setAttribute('role','tooltip');
    const slot=card.querySelector('.about-item-slot');slot.append(note);
    card.querySelector('summary').setAttribute('aria-describedby',note.id);
  });
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting){
        entry.target.classList.add('craft-arrived');
        observer.unobserve(entry.target);
      }
    }
  },{threshold:.12});
  section.querySelectorAll('.about-journal,.about-homestead,.about-project-card').forEach(el=>observer.observe(el));
  // Escape dismisses expanded tool inventories and keeps focus on the control.
  section.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    event.target.closest('.about-project-card')?.classList.add('tooltip-dismissed');
    const details=event.target.closest('details[open]');
    if(details){details.open=false;details.querySelector('summary').focus();event.preventDefault();}
  });
  cards.forEach(card=>{
    card.addEventListener('pointerleave',()=>card.classList.remove('tooltip-dismissed'));
    card.addEventListener('focusout',event=>{if(!card.contains(event.relatedTarget))card.classList.remove('tooltip-dismissed');});
  });
  reduced.addEventListener('change',()=>{if(reduced.matches)section.querySelectorAll('.craft-arrived').forEach(el=>el.getAnimations().forEach(a=>a.finish()));});
}
