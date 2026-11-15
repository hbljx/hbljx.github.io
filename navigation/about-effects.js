import { mountAboutCountdown } from './about-countdown.js';

export function mountAboutEffects() {
 const section=document.querySelector('#about-us');
 if(!section)return;
 mountAboutCountdown();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover: hover) and (pointer: fine)');
 const heading=section.querySelector('h2'),copy=heading.textContent;
 // Keep a single complete accessible heading; character spans reserve the final layout.
 heading.setAttribute('aria-label',copy);
 const typed=document.createElement('span');typed.className='about-typed';typed.setAttribute('aria-hidden','true');
 for(const [i,char] of Array.from(copy).entries()){
  const span=document.createElement('span');span.textContent=char;span.style.setProperty('--char',i);typed.append(span);
 }
 heading.replaceChildren(typed);
 section.style.setProperty('--typing-time',`${Array.from(copy).length*65}ms`);
 const decor=document.createElement('div');decor.className='about-atmosphere';decor.setAttribute('aria-hidden','true');
 decor.innerHTML='<div class="about-aurora"></div><div class="about-matrix"></div><div class="about-portal"><i></i><i></i><i></i><b>LI+</b></div><div class="about-scanner"></div>'+Array.from({length:20},(_,i)=>`<i class="about-star" style="--n:${i};left:${i*47%100}%;top:${i*31%100}%"></i>`).join('');
 section.prepend(decor);
 const controls=document.createElement('div');controls.className='about-actions';
 const enter=section.querySelector('.solid-link');enter.before(controls);controls.append(enter);
 const replay=document.createElement('button');replay.type='button';replay.className='about-replay';replay.textContent='↻ 重播入场';controls.append(replay);
 section.classList.add('about-enhanced');
 let started=false,pending=0;
 function play(){
  section.classList.remove('about-playing');void section.offsetWidth;
  section.classList.add('about-playing');started=true;
 }
 new IntersectionObserver(([entry])=>{
  section.classList.toggle('about-visible',entry.isIntersecting);
  if(entry.isIntersecting&&!started)play();
 },{threshold:.12}).observe(section);
 replay.addEventListener('click',play);
 section.addEventListener('pointermove',event=>{
  if(reduced.matches||!fine.matches||pending)return;
  const x=event.clientX,y=event.clientY;
  pending=requestAnimationFrame(()=>{
   pending=0;const rect=section.getBoundingClientRect();
   section.style.setProperty('--light-x',`${x-rect.left}px`);section.style.setProperty('--light-y',`${y-rect.top}px`);
   section.style.setProperty('--parallax-x',`${((x-rect.left)/rect.width-.5)*22}px`);
   section.style.setProperty('--parallax-y',`${((y-rect.top)/rect.height-.5)*16}px`);
  });
 });
 section.addEventListener('pointerleave',()=>{section.style.setProperty('--parallax-x','0px');section.style.setProperty('--parallax-y','0px');});
 section.addEventListener('pointerdown',event=>{
  if(reduced.matches)return;
  const rect=section.getBoundingClientRect(),pulse=document.createElement('i');pulse.className='about-click-wave';pulse.setAttribute('aria-hidden','true');
  pulse.style.left=`${event.clientX-rect.left}px`;pulse.style.top=`${event.clientY-rect.top}px`;decor.append(pulse);
  pulse.addEventListener('animationend',()=>pulse.remove(),{once:true});
 });
 document.addEventListener('visibilitychange',()=>section.classList.toggle('about-paused',document.hidden));
 reduced.addEventListener('change',()=>{section.querySelectorAll('.about-click-wave').forEach(el=>el.remove());});
}
