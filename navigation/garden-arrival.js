import { mountFooterLandscape } from './footer-landscape.js';

// The final chapter shares the garden terrain; the journal is always readable.
export function mountGardenArrival() {
  const section = document.querySelector('#about-us');
  if (!section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const journey = document.createElement('div');
  journey.className = 'garden-arrival';
  section.before(journey);
  journey.append(section);
  const ridge = document.createElement('div');
  ridge.className = 'arrival-ridge';
  ridge.setAttribute('aria-hidden', 'true');
  ridge.innerHTML = '<span></span><span></span>' + Array.from({length:16}, (_,i) =>
    `<i style="--i:${i};--x:${(i*43+7)%100}%;--lift:${22+i%4*14}px;--size:${5+i%3*4}px"></i>`).join('');
  journey.prepend(ridge);
  let raf = 0, visible = false, last = -1;
  const smooth = n => { const t = Math.max(0, Math.min(1,n)); return t*t*(3-2*t); };
  function draw() {
    raf = 0;
    if (document.hidden) return;
    // offsetTop is stable while the card itself transforms.
    const top = journey.getBoundingClientRect().top + section.offsetTop;
    const p = reduced.matches ? 1 : smooth((innerHeight*.96-top)/(innerHeight*.76));
    if (Math.abs(p-last)<.0001) return;
    last = p;
    journey.style.setProperty('--arrival', p.toFixed(4));
  }
  function schedule() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw);
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
  }, {rootMargin:'100px'}).observe(journey);
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(journey);
  reduced.addEventListener('change', () => {last=-1;schedule();});
  document.addEventListener('visibilitychange', schedule);
  // The directory is populated asynchronously above this section. Restore a direct
  // about link after that layout change, unless the visitor has started navigating.
  if (location.hash === '#about-us') {
    const initial = new AbortController();
    const restore = () => {
      if (initial.signal.aborted || location.hash !== '#about-us') return;
      journey.style.setProperty('--arrival', '1');
      last = 1;
      section.scrollIntoView({behavior:'instant',block:'start'});
      schedule();
    };
    for (const type of ['wheel','touchstart','pointerdown','keydown']) {
      window.addEventListener(type, () => initial.abort(), {once:true,passive:true,signal:initial.signal});
    }
    document.addEventListener('li-directory-update', () => requestAnimationFrame(() => {
      restore();
      initial.abort();
    }), {once:true,signal:initial.signal});
    requestAnimationFrame(restore);
  }
  mountFooterLandscape();
}
