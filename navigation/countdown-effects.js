import { mountCardInteraction } from './card-interactions.js';

export function mountCountdownEffects(section) {
  if(section.dataset.effectsMounted)return;
  section.dataset.effectsMounted='true';
  const header=document.createElement('h3');header.className='about-section-title countdown-header';
  header.innerHTML='<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#765a32" d="M4 1h16v5h-2v4l-2 2 2 2v4h2v5H4v-5h2v-4l2-2-2-2V6H4z"/><path fill="#dfc389" d="M5 2h14v3H5zm0 17h14v3H5z"/><path fill="#89d8c8" d="M8 6h8v3l-4 4-4-4zm4 7 4 3v2H8v-2z"/><path fill="#f0db9d" d="M9 7h6l-3 3zm3 7 3 3H9z"/></svg><span>时间刻度</span><small lang="en">TIME REMAINING</small>';
  section.prepend(header);
  const titles={week:'发车 · 七日轨道',month:'翻页 · 月历手册',year:'生长 · 四季之树'};
  section.querySelectorAll('[data-countdown]').forEach((card,index)=>{
    const kind=card.dataset.countdown;
    const badge=document.createElement('div');badge.className='countdown-code';badge.setAttribute('aria-hidden','true');
    badge.innerHTML=`<span>0${index+1} / ${kind.toUpperCase()}</span><i></i>`;card.prepend(badge);
    const button=document.createElement('button');button.type='button';button.className='countdown-activate';
    button.setAttribute('aria-label',`播放${card.querySelector('h3').textContent}的${titles[kind].split(' · ')[1]}动画`);
    button.innerHTML=`<span>${titles[kind]}</span><span aria-hidden="true">↻</span>`;card.append(button);
    mountCardInteraction(card,kind);
  });
}
