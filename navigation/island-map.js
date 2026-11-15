export function mountIslandMap() {
  const stage = document.querySelector('.hero-stage');
  const art = stage?.querySelector('.stage-art');
  if (!art || art.querySelector('.island-map')) return;
  const map = document.createElement('nav');
  map.className = 'island-map';
  map.setAttribute('aria-label', '岛屿场景地图');
  map.inert = true;
  map.innerHTML = `
    <div class="map-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <span class="map-edition" aria-hidden="true">LI+ <span>/</span> ISLAND MAP</span>
    <span class="map-compass" aria-hidden="true"><b>N</b><img src="assets/bookmark-icons/compass.webp" width="32" height="32" alt=""></span>
    <svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M65 30H48V48H32V66H65V72"/></svg>
    <a class="map-pin map-pin-ai" href="#scene-works-links" style="--pin-x:65%;--pin-y:30%;--pin-tint:#bee2a4"><span class="map-pin-item"><img src="assets/bookmark-icons/command.webp" width="28" height="28" alt=""></span><span class="map-pin-name">AI 工作台<small>对话 · 创作 · 开发 →</small></span></a>
    <a class="map-pin map-pin-books" href="#scene-writing-links" style="--pin-x:32%;--pin-y:48%;--pin-tint:#e2c7f0"><span class="map-pin-item"><img src="assets/bookmark-icons/book.webp" width="28" height="28" alt=""></span><span class="map-pin-name">灵感书房<small>图书 · 壁纸 · 设计 →</small></span></a>
    <a class="map-pin map-pin-music" href="#scene-coffee-links" style="--pin-x:65%;--pin-y:72%;--pin-tint:#f0d29c"><span class="map-pin-item"><img src="assets/bookmark-icons/record.webp" width="28" height="28" alt=""></span><span class="map-pin-name">音乐咖啡吧<small>给日常选一段伴奏 →</small></span></a>
    <span class="map-legend"><img src="assets/bookmark-icons/map.webp" width="22" height="22" alt=""><span>选择一处坐标，开始探索</span><b aria-hidden="true">+ + +</b></span>
    <div class="map-fireflies" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--x:${13+i*37%76}%;--y:${20+i*23%59}%;--delay:${-i*.8}s;--duration:${4+i%3}s"></i>`).join('')}</div>`;
  art.append(map);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  let frame = 0, x = 0, y = 0;
  function reset() {
    cancelAnimationFrame(frame); frame = 0;
    art.style.setProperty('--map-x','0px');art.style.setProperty('--map-y','0px');
  }
  art.addEventListener('pointermove',event=>{
    if(map.inert || reduced.matches || !fine.matches || document.hidden)return;
    const r=art.getBoundingClientRect();x=((event.clientX-r.left)/r.width-.5)*6;y=((event.clientY-r.top)/r.height-.5)*6;
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;art.style.setProperty('--map-x',`${x}px`);art.style.setProperty('--map-y',`${y}px`);});
  },{passive:true});
  art.addEventListener('pointerleave',reset);
  art.addEventListener('pointercancel',reset);
  reduced.addEventListener('change',reset);
  new IntersectionObserver(([entry])=>{
    stage.classList.toggle('map-in-view',entry.isIntersecting);
    if(!entry.isIntersecting)reset();
  }).observe(stage);
  document.addEventListener('visibilitychange',()=>{stage.classList.toggle('map-sleeping',document.hidden);if(document.hidden)reset();});
  // Preserve ordinary links, history and modified clicks. Focus the destination for keyboard users.
  map.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    const destination=document.querySelector(link.getAttribute('href'));
    if(destination)destination.focus({preventScroll:true});
  });
}
