// Chapter 08 is an introduction, not an eighth directory category.
export function mountAboutScene() {
  const host = document.querySelector('#zone-scenes');
  if (!host || document.querySelector('#scene-about-us')) return;
  const section = document.createElement('section');
  section.id = 'scene-about-us';
  section.className = 'scene about-scene';
  section.dataset.room = 'team';
  section.setAttribute('aria-labelledby', 'about-scene-title');
  section.innerHTML = `
    <div class="scene-cinema"><div class="scene-screen">
      <div class="scene-art"><img width="1536" height="1024" decoding="async" alt="夕阳中的像素工作室，木石书桌、电脑与窗外的方块山谷"><div class="about-build" aria-hidden="true"></div></div>
      <div class="scene-opening" aria-hidden="true"><span>关于我们</span><small>08 · 每一块热爱，都有来处 / 滚动探索 ↓</small></div>
      <div class="scene-folio" aria-hidden="true"><span>08</span><i></i><small>08</small></div>
      <div class="scene-info">
        <p class="kicker"><span></span> About us</p>
        <h2 id="about-scene-title">关于我们<span>.</span></h2>
        <p class="scene-description">从一次收藏到一座像素家园，认识 Li+ 背后的热爱、折腾与分享。把好用的工具留下，把有趣的想法变成日常。</p>
        <div class="scene-actions"><a class="scene-enter" href="#about-us"><span>了解我们的故事</span><span class="scene-action-arrow" aria-hidden="true">↓</span></a><a class="scene-next" href="#about-projects-title"><span>看看我们在折腾什么</span><span class="scene-action-arrow" aria-hidden="true">↘</span></a></div>
      </div>
      <div class="about-scene-exit" aria-hidden="true"></div>
      <p class="about-scene-caption">热爱 · 探索 · 分享 <span>下一屏 · 我们的故事 ↓</span></p>
      <div class="scene-meter" aria-hidden="true"><i></i></div>
    </div></div>`;
  host.append(section);
  host.querySelector('[data-room="pool"] .scene-next').href = '#scene-about-us';
  host.querySelectorAll('.scene-folio small').forEach(label => {label.textContent = '08';});
  const image = section.querySelector('img');
  const build = section.querySelector('.about-build');
  for (let i = 0; i < 96; i++) {
    const tile = document.createElement('i');
    // A diagonal wave of individually collapsing blocks, unlike the other seven entrances.
    tile.style.setProperty('--delay', `${((i % 12) + Math.floor(i / 12)) * 48}ms`);
    build.append(tile);
  }
  let loaded = false, entered = false;
  const reveal = () => {if (loaded && entered) section.classList.add('about-image-ready');};
  image.addEventListener('load', async () => {
    try {await image.decode();} catch {}
    loaded = true; reveal();
  }, {once:true});
  image.addEventListener('error', () => {
    section.classList.add('about-image-error');
    section.querySelector('.scene-opening small').textContent = '图片暂时未能加载 · 向下滚动阅读我们的故事 ↓';
  }, {once:true});
  const preload = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    image.src = new URL('../assets/scenes/about-us.webp', import.meta.url).href;
    preload.disconnect();
  }, {rootMargin:'600px'});
  preload.observe(section);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-height: 640px)');
  const cinema = section.firstElementChild;
  const screen = cinema.firstElementChild;
  let raf = 0, visible = false;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => {const t = clamp(n); return t*t*(3-2*t);};
  function draw() {
    raf = 0;
    if (!visible || document.hidden) return;
    const staticView = reduced.matches || compact.matches;
    const p = staticView ? .65 : clamp(-cinema.getBoundingClientRect().top / Math.max(1, cinema.offsetHeight-screen.offsetHeight));
    const title = staticView ? 1 : ease((p-.15)/.25);
    const body = staticView ? 1 : ease((p-.23)/.24);
    const actions = staticView ? 1 : ease((p-.31)/.23);
    const values = {'--track':p,'--enter':ease(p/.45),'--opening':staticView?0:1-ease(p/.22),'--title-in':title,'--body-in':body,'--actions-in':actions,'--exit':staticView?0:ease((p-.79)/.21)};
    for (const key in values) section.style.setProperty(key, values[key]);
    section.toggleAttribute('data-copy', actions>.1);
    section.toggleAttribute('data-static', staticView);
  }
  function schedule() {if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw);}
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {entered = true; reveal(); schedule();}
  }).observe(section);
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(host);
  reduced.addEventListener('change', schedule);
  compact.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  // Late directory data changes all chapter offsets. Restore direct chapter links once.
  if (location.hash === '#scene-about-us') {
    const initial = new AbortController();
    const restore = () => section.scrollIntoView({behavior:'instant'});
    for (const type of ['wheel','touchstart','pointerdown','keydown']) addEventListener(type, () => initial.abort(), {once:true,passive:true,signal:initial.signal});
    document.addEventListener('li-directory-update', () => {restore(); initial.abort();}, {once:true,signal:initial.signal});
    requestAnimationFrame(restore);
  }
}
