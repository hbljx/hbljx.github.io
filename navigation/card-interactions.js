/* One finite scene per card. Text, links and details retain their native behavior. */
const scenes = {
  craft: `<g class="craft-board"><path fill="#342b22" d="M12 10h67v62H12z"/><path fill="#ac9060" d="M12 10h67v3H12zM12 13h3v59h-3z"/><path fill="#6d593b" d="M18 17h55v49H18z"/>${Array.from({length:9},(_,i)=>`<path fill="#26352b" stroke="#918165" d="M${21+i%3*17} ${20+Math.floor(i/3)*14}h13v10h-13z"/>`).join('')}</g>
    <g class="craft-feed feed-a"><path fill="#9d783e" d="M25 24h9v7h-9z"/><path fill="#d7b87a" d="M25 24h9v2h-9zM25 28h9v1h-9z"/></g>
    <g class="craft-feed feed-b"><path fill="#a6beb4" d="M58 24h9v7h-9z"/><path fill="#e0e6d2" d="M58 24h9v2h-9z"/></g>
    <g class="craft-feed feed-c"><path fill="#8eac65" d="M42 52h9v7h-9z"/><path fill="#c0d991" d="M42 52h9v2h-9z"/></g>
    <path fill="#627b4f" d="M89 37h17v-5l10 10-10 10v-5H89z" class="craft-arrow"/>
    <path fill="#101e17" stroke="#73805b" d="M129 20h46v46h-46z"/><path fill="#3a4c31" d="M133 60h38v3h-38z"/>
    <g class="craft-result"><path fill="#193b26" d="m151 27 15 8v18l-15 8-15-8V35z"/><path fill="#b6d987" d="m151 27 15 8-15 8-15-8z"/><path fill="#6b9a54" d="m136 35 15 8v18l-15-8z"/><path fill="#477641" d="m151 43 15-8v18l-15 8z"/><path fill="#d3e7a1" d="m142 34 8-4 5 3-8 4z"/></g>
    <g class="craft-finish" fill="#dbefaa"><path d="M123 13h3v8h-3zm-3 3h9v2h-9zM178 49h3v9h-3zm-3 3h9v3h-9z"/></g>`,
  redstone: `<path fill="none" stroke="#322d22" stroke-width="9" d="M19 57h32V29h53v28h33V39h25"/><path class="redstone-wire" fill="none" stroke="#764b36" stroke-width="3" d="M19 57h32V29h53v28h33V39h25"/>
    <g class="redstone-lever"><path fill="#788275" d="M9 57h23v10H9z"/><path fill="#b3bda5" d="M9 57h23v3H9z"/><path fill="#ad9364" d="m18 58-5-19 5-2 6 20z"/><path fill="#d6c393" d="m13 39 5-2 1 4-5 2z"/></g>
    <g class="redstone-repeater"><path fill="#444f41" d="M67 17h23v25H67z"/><path fill="#adab8d" d="M67 17h23v3H67z"/><path fill="#b77053" d="M72 24h4v11h-4zm9 0h4v11h-4z"/><path class="redstone-torch" fill="#edb273" d="M71 23h6v5h-6zm9 0h6v5h-6z"/></g>
    <g class="redstone-lamp"><path fill="#393b2d" d="M150 13h32v46h-32z"/><path fill="#8d8056" d="M150 13h32v4h-32zM150 17h4v42h-4z"/><path class="lamp-glass" fill="#6b653e" d="M157 21h18v29h-18z"/><path fill="#50492e" d="M164 19h4v33h-4zM155 33h22v3h-22z"/><path fill="#afa17b" d="M152 56h28v3h-28z"/></g>
    <g class="lamp-rays" stroke="#e6cc85" stroke-width="2"><path d="M166 4v5m20 12 6-3m-6 29 6 3m-26 13v6"/></g>
    <g class="redstone-pulse" fill="#ffba83"><path d="M16 54h6v6h-6zM48 26h6v6h-6zM101 54h6v6h-6zM134 36h6v6h-6z"/></g>`,
  journal: `<path fill="#0d1c16" d="M31 21h125v52H31z"/><path fill="#735b3d" d="M27 17h61l7 5 7-5h57v53h-57l-7 5-7-5H27z"/>
    <path fill="#d1c69c" d="M32 13h52l11 7v48l-11-5H32z"/><path fill="#e6dbb6" d="M95 20l11-7h48v50h-48l-11 5z"/><path fill="#8f7d52" d="M93 20h3v48h-3z"/>
    <g class="journal-ink" stroke="#777652" stroke-width="2"><path d="M40 27h33M40 35h39M40 43h31M40 51h37"/><path class="journal-writing" d="M107 27h34M107 35h30M107 43h33M107 51h23"/></g>
    <path class="journal-ribbon" fill="#9e5f4d" d="M78 13h7v61l-4-4-3 4z"/>
    <g class="journal-quill"><path fill="#b3cfba" d="m132 48 9-24 15-14 9-1-3 12-12 14z"/><path fill="#eef0ce" d="m132 48 13-16 17-20-13 24z"/><path fill="#667b61" d="m130 53 3-9 3 2z"/></g>
    <g class="journal-seal"><path fill="#a46a4b" d="M144 53h12v3h3v11h-3v3h-12v-3h-3V56h3z"/><path fill="none" stroke="#f0d3a1" stroke-width="2" d="m145 61 3 3 7-7"/></g>`,
  week: `<path fill="#20362a" d="M8 57h184v16H8z"/>
    <g class="week-sleepers">${Array.from({length:7},(_,i)=>`<g style="--step:${i}"><path fill="#7e6847" d="M${15+i*25} 54h8v17h-8z"/><path fill="#a58d5f" d="M${15+i*25} 54h8v3h-8z"/><path class="week-marker" fill="#445b35" d="M${17+i*25} 77h4v3h-4z"/></g>`).join('')}</g>
    <path fill="#94a18a" d="M8 57h184v3H8zm0 9h184v2H8z"/>
    <g class="week-cart"><path fill="#1b241d" d="M10 30h33v22H10z"/><path fill="#aab7a0" d="M8 29h37v5H8z"/><path fill="#6f8170" d="M12 34h29v15H12z"/><path fill="#40554b" d="M16 38h21v8H16z"/><path fill="#c4b78b" d="M17 22h16v7H17z"/><path fill="#839c5c" d="M22 16h8v6h-8z"/><path fill="#101c16" d="M13 49h7v7h-7zm20 0h7v7h-7z"/><path fill="#9eae9a" d="M15 51h3v3h-3zm20 0h3v3h-3z"/></g>
    <g class="week-steam" fill="#c7d5b3"><path d="M17 19h4v4h-4zM12 12h5v5h-5zM6 7h6v6H6z"/></g>
    <g class="week-flag"><path fill="#82714c" d="M183 17h3v37h-3z"/><path fill="#adc77a" d="M168 18h15v11h-15z"/><path fill="#dce8b6" d="M168 18h15v3h-15z"/></g>`,
  month: `<path fill="#19291f" d="M52 15h101v65H52z"/><path fill="#b0a080" d="M48 11h101v65H48z"/><path fill="#746746" d="M48 72h101v4H48z"/>
    <g class="month-sheet"><path fill="#e1d5ae" d="M48 11h101v60H48z"/><path fill="#6e8863" d="M48 11h101v17H48z"/><path fill="#adc49a" d="M48 11h101v3H48z"/>
    <g fill="#70795a">${Array.from({length:21},(_,i)=>`<path class="month-day" style="--day:${i}" d="M${58+i%7*12} ${35+Math.floor(i/7)*10}h6v4h-6z"/>`).join('')}</g><path class="month-selection" fill="none" stroke="#a9754c" stroke-width="2" d="M116 43h10v8h-10z"/></g>
    <g fill="#c5c9af" stroke="#455b47" stroke-width="2"><path d="M64 6h5v13h-5zM127 6h5v13h-5z"/></g>
    <g class="month-turn"><path fill="#f0e4c4" d="M48 29h101v42H48z"/><path fill="#a6b58c" d="M58 38h25v3H58zm0 9h61v2H58zm0 8h72v2H58z"/></g>
    <path class="month-corner" fill="#b9a77d" d="M135 57h14v14z"/>`,
  year: `<path fill="#344b2f" d="M67 65h67v10H67z"/><path fill="#87a35c" d="M67 61h67v5H67z"/><path fill="#665439" d="M71 75h59v5H71z"/>
    <g class="year-tree"><path fill="#87693e" d="M96 33h10v29H96z"/><path fill="#b19054" d="M96 33h3v29h-3z"/>
    <path class="year-leaves" fill="#8cab5e" d="M74 25h10V15h12V6h15v9h13v10h9v22h-12v7H83v-7h-9z"/><path fill="#b7c982" d="M96 6h15v5H96zM84 15h12v5H84zM74 25h10v5H74z"/><path fill="#4e733d" d="M124 25h9v22h-12v7H83v-5h32v-8h9z"/>
    <g class="year-fruit" fill="#cf9564"><path d="M86 30h5v5h-5zM112 23h5v5h-5zM105 42h5v5h-5z"/></g></g>
    <g class="year-seasons"><path class="season-spring" fill="#c0d9a0" d="M35 18h6v6h6v6h-6v6h-6v-6h-6v-6h6z"/><path class="season-summer" fill="#e5c888" d="M157 16h13v13h-13z"/><path class="season-autumn" fill="#c68e5b" d="M159 53h10v4h-3v7h-7z"/><path class="season-winter" fill="#bad4d5" d="M35 55h3v6h6v3h-6v6h-3v-6h-6v-3h6z"/></g>
    <g class="year-falling" fill="#d8b37b"><path d="M77 29h5v3h-5zM121 35h4v4h-4zM108 17h5v3h-5z"/></g>`
};

export function mountCardInteraction(card, kind) {
  if(card.dataset.cardEffect || !scenes[kind])return;
  card.dataset.cardEffect=kind;
  const scene=document.createElement('div');scene.className='card-vignette';scene.setAttribute('aria-hidden','true');
  scene.innerHTML=`<svg viewBox="0 0 200 86" fill="none" focusable="false" aria-hidden="true">${scenes[kind]}</svg>`;
  if(card.matches('.about-project-card'))card.querySelector('.about-item-slot').after(scene);
  else card.querySelector('h3').before(scene);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  let visible=false,timer=0;
  function stop(){clearTimeout(timer);card.classList.remove('card-fx-playing','card-fx-clicked');}
  function play(clicked=false){
    if(!visible || document.hidden)return;
    stop();
    if(reduced.matches)return;
    // Restart a bounded timeline even when a second click arrives mid-animation.
    void scene.offsetWidth;
    card.classList.toggle('card-fx-clicked',clicked);
    card.classList.add('card-fx-playing');
    timer=setTimeout(stop,clicked?2800:2300);
  }
  card.addEventListener('pointerenter',event=>{if(fine.matches&&event.pointerType==='mouse')play();});
  card.addEventListener('focusin',event=>{if(!card.contains(event.relatedTarget))play();});
  card.addEventListener('click',()=>{
    // Dragging over readable text should never look like activating the scene.
    const selection=getSelection();
    if(selection&&!selection.isCollapsed&&card.contains(selection.anchorNode))return;
    play(true);
  });
  new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(!visible)stop();},{threshold:.05}).observe(card);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);
  reduced.addEventListener('change',stop);
  return {play,stop};
}
