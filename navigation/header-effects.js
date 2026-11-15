// Event-driven header effects: no idle animation loop, canvas or document-wide filter.
export function mountHeaderEffects() {
  const header = document.querySelector('.site-header');
  if (!header || header.classList.contains('header-enhanced')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const links = [...header.querySelectorAll('nav a,.about-nav,.world-link')];
  const sections = links.map(link => {
    const href = link.getAttribute('href');
    const section = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
    const color = getComputedStyle(link).getPropertyValue('--item-accent').trim() || section?.style.getPropertyValue('--accent-room') || (link.classList.contains('world-link') ? '#c39aff' : '#c7f776');
    link.style.setProperty('--item-accent',color);
    return {link,section,color,top:0};
  });
  let destinations = sections.filter(item => item.section);
  const aura = document.createElement('div'), rail = document.createElement('div');
  const auraClip = document.createElement('div'), sparkLayer = document.createElement('div');
  auraClip.className='header-aura-clip';sparkLayer.className='header-sparks';
  auraClip.setAttribute('aria-hidden','true');sparkLayer.setAttribute('aria-hidden','true');
  aura.className = 'header-aura'; rail.className = 'header-rail';
  aura.setAttribute('aria-hidden','true'); rail.setAttribute('aria-hidden','true');
  auraClip.append(aura); header.append(auraClip,rail,sparkLayer); header.classList.add('header-enhanced');
  let frame = 0, measure = true, hovered = null, focused = null, selected = null;
  let pointer = null, lastBurst = -Infinity, lastAccent = null, lastRailX = -1, lastRailWidth = -1;
  const bursts = new Map();
  const targetLink = node => node instanceof Element ? node.closest('nav a,.about-nav,.world-link') : null;

  function render() {
    frame = 0;
    if (document.hidden) return;
    header.classList.toggle('is-scrolled', scrollY > 40);
    const bounds = header.getBoundingClientRect();
    if (measure) {
      for (const item of sections) {
        const href = item.link.getAttribute('href');
        item.section = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
      }
      destinations = sections.filter(item => item.section);
      for (const item of destinations) item.top = item.section.getBoundingClientRect().top + scrollY;
      // Decorative overflow must never extend the horizontal navigation track.
      const end=links.at(-1).getBoundingClientRect().right-bounds.left+header.scrollLeft;
      const width=Math.max(bounds.width,Math.ceil(end+parseFloat(getComputedStyle(header).paddingRight)));
      auraClip.style.width=sparkLayer.style.width=`${width}px`;
      measure = false;
    }
    const readingAt = scrollY + bounds.height + Math.min(180,innerHeight * .2);
    const current = destinations.reduce((found,item) => item.top <= readingAt ? item : found,destinations[0]);
    if (selected !== current?.link) {
      selected = current?.link;
      for (const item of destinations) {
        if (item.link === selected) item.link.setAttribute('aria-current','location');
        else item.link.removeAttribute('aria-current');
      }
    }
    const target = hovered || focused || selected;
    const rect = target?.getBoundingClientRect();
    if (rect) {
      const x = Math.round(rect.left - bounds.left + header.scrollLeft + 7), width = Math.max(8,Math.round(rect.width - 14));
      // Keep the rail and aura matched to the hovered, focused or current button.
      const accent = sections.find(item => item.link === target)?.color || '#c7f776';
      if (lastAccent !== accent) {
        header.style.setProperty('--nav-accent',accent);
        lastAccent = accent;
      }
      if (x !== lastRailX) {rail.style.transform = `translateX(${x}px)`; lastRailX = x;}
      if (width !== lastRailWidth) {rail.style.width = `${width}px`; lastRailWidth = width;}
      rail.style.opacity = '1';
    }
    if (pointer && fine.matches && !reduced.matches) {
      const x = Math.round(pointer.x - bounds.left + header.scrollLeft - 130);
      const y = Math.round(pointer.y - bounds.top - 75);
      aura.style.transform = `translate3d(${x}px,${y}px,0)`;
    }
  }
  function schedule() {if (!frame && !document.hidden) frame = requestAnimationFrame(render);}
  function remeasure() {measure = true; schedule();}
  function clearBursts() {
    for (const [node,animation] of bursts) {animation.cancel(); node.remove();}
    bursts.clear();
  }
  function spark(node,keyframes,duration) {
    sparkLayer.append(node);
    const animation = node.animate(keyframes,{duration,easing:'cubic-bezier(.16,.75,.3,1)',fill:'forwards'});
    bursts.set(node,animation);
    animation.finished.then(() => {node.remove();bursts.delete(node);},() => {});
  }
  function burst(event,link) {
    if (reduced.matches || document.hidden || performance.now()-lastBurst<100) return;
    lastBurst = performance.now();
    const bounds = header.getBoundingClientRect(), rect = link.getBoundingClientRect();
    const x = (event.detail ? event.clientX : rect.left+rect.width/2)-bounds.left+header.scrollLeft;
    const y = (event.detail ? event.clientY : rect.top+rect.height/2)-bounds.top;
    const color = sections.find(item => item.link===link)?.color || '#c7f776';
    const count = fine.matches ? 12 : 6;
    if (bursts.size + count + 1 > 36) clearBursts();
    for (let i=0;i<count;i++) {
      const node=document.createElement('i');node.className='header-spark';node.setAttribute('aria-hidden','true');
      node.style.setProperty('--spark-color',i%3===0?'#f2ffe2':color);
      const angle=2*Math.PI*i/count, distance=22+Math.random()*28;
      const from=`translate(${x-2}px,${y-2}px)`;
      const to=`translate(${x+Math.cos(angle)*distance-2}px,${y+Math.sin(angle)*distance*.65-2}px)`;
      spark(node,[{transform:from+' scale(1)',opacity:1},{transform:to+' rotate(90deg) scale(.25)',opacity:0}],420+Math.random()*180);
    }
    const ring=document.createElement('i');ring.className='header-ring';ring.setAttribute('aria-hidden','true');ring.style.setProperty('--spark-color',color);
    spark(ring,[{transform:`translate(${x-16}px,${y-16}px) scale(.25)`,opacity:.7},{transform:`translate(${x-16}px,${y-16}px) scale(1.8)`,opacity:0}],420);
  }
  header.addEventListener('pointermove',event => {
    if (!fine.matches || reduced.matches || event.pointerType==='touch') return;
    pointer={x:event.clientX,y:event.clientY};hovered=targetLink(event.target);
    header.toggleAttribute('data-pointer',true);schedule();
  },{passive:true});
  header.addEventListener('pointerleave',() => {pointer=null;hovered=null;header.removeAttribute('data-pointer');schedule();});
  header.addEventListener('focusin',event => {focused=targetLink(event.target);schedule();});
  header.addEventListener('focusout',event => {focused=targetLink(event.relatedTarget);schedule();});
  header.addEventListener('click',event => {
    const link=targetLink(event.target);if(!link || !header.contains(link))return;
    burst(event,link);schedule(); // Native anchors keep navigation, modifiers and new tabs intact.
  });
  header.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',remeasure,{passive:true});
  window.addEventListener('hashchange',schedule);
  const resize=new ResizeObserver(remeasure);resize.observe(header);resize.observe(document.querySelector('#flat-home'));
  document.fonts?.ready.then(remeasure);
  const reset = () => {pointer=null;hovered=null;header.removeAttribute('data-pointer');clearBursts();schedule();};
  reduced.addEventListener('change',reset);fine.addEventListener('change',reset);
  document.addEventListener('visibilitychange',() => {
    if(document.hidden){cancelAnimationFrame(frame);frame=0;reset();}else remeasure();
  });
  window.addEventListener('pagehide',() => {cancelAnimationFrame(frame);frame=0;clearBursts();});
  window.addEventListener('pageshow',remeasure);
  schedule();
}
