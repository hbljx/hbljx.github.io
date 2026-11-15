const worldMode = document.documentElement.classList.contains('world-mode');

function stylesheet(href) {
  const link = Object.assign(document.createElement('link'), { href, rel: 'stylesheet' });
  return new Promise((resolve, reject) => {
    link.onload = resolve;
    link.onerror = () => reject(new Error(`样式加载失败：${href}`));
    document.head.append(link);
  });
}

if (worldMode) {
  if (location.protocol !== 'file:') {
    document.documentElement.classList.add('world-booting');
    let hideLoading;
    try {
      const loading = await import('../engine/ui/loading.js');
      hideLoading = loading.hideLoading;
      loading.showLoading('正在加载世界资源', 0);
      const assets = [
        'engine/style.css',
        'navigation/world-ui.css?v=20261114-location-startup',
        'navigation/activities.css?v=20261107-airplane-controls',
      ];
      await Promise.all(assets.map(stylesheet));
      await import('../engine/main.js?v=20261115-clear-loading');
      await import('./world-ui.js?v=20261114-stable-startup');
    } catch (error) {
      hideLoading?.();
      document.getElementById('loading')?.remove();
      document.documentElement.classList.remove('world-booting');
      document.documentElement.classList.add('world-failed');
      document.body.classList.add('plain');
      window.__homeStartupError = { phase: 'modules', message: error.message || String(error) };
      let notice = document.getElementById('startupNotice');
      if (!notice) {
        notice = document.createElement('aside'); notice.id = 'startupNotice';
        document.getElementById('pages').before(notice);
      }
      notice.replaceChildren();
      const title = document.createElement('h2'), message = document.createElement('p'), retry = document.createElement('button');
      title.textContent = '3D 资源加载失败';
      message.textContent = '请检查网络后重试。' + window.__homeStartupError.message;
      retry.textContent = '重新加载'; retry.type = 'button'; retry.addEventListener('click', () => location.reload());
      notice.append(title, message, retry); notice.hidden = false;
    }
  }
} else {
  const { mountWebSearch } = await import('./web-search.js');
  mountWebSearch();
  const { mountIntroTypewriter } = await import('./intro-typewriter.js');
  mountIntroTypewriter();
  const { mountScenes } = await import('./home-scenes.js');
  mountScenes();
  const { mountAboutScene } = await import('./about-scene.js');
  mountAboutScene();
  const { mountPixelImages } = await import('./pixel-images.js');
  mountPixelImages();
  const { mountAboutEffects } = await import('./about-effects.js');
  mountAboutEffects();
  const { mountGardenArrival } = await import('./garden-arrival.js');
  mountGardenArrival();
  const { mountScenePointers } = await import('./scene-pointers.js?v=20261115-about-pointers');
  mountScenePointers();
  const { mountHeaderEffects } = await import('./header-effects.js');
  mountHeaderEffects();
  const { mountCraftDetails } = await import('./craft-details.js');
  mountCraftDetails();
  const { mountFooterEffects } = await import('./footer-effects.js');
  mountFooterEffects();
  const { mountIslandMap } = await import('./island-map.js');
  mountIslandMap();

  const hero = document.querySelector('.hero');
  const stage = document.querySelector('.hero-stage');
  const opening = document.querySelector('.hero-copy');
  const bottom = document.querySelector('.hero-bottom');
  const closing = document.querySelector('.stage-copy');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, progress = -1, visible = true, scrollRange = 1;
  const clamp = value => Math.min(1,Math.max(0,value));
  const ease = value => value * value * (3 - 2 * value);

  function updateScene() {
    const shrink = ease(clamp(progress / .83));
    const reveal = ease(clamp((progress - .42) / .45));
    const fade = 1 - ease(clamp(progress / .45));
    stage.style.setProperty('--progress',progress);
    stage.style.setProperty('--shrink',shrink);
    stage.style.setProperty('--fade',fade);
    stage.style.setProperty('--reveal',reveal);
    opening.inert = bottom.inert = !reduced.matches && fade < .05;
    opening.setAttribute('aria-hidden',String(opening.inert));
    bottom.setAttribute('aria-hidden',String(bottom.inert));
    closing.inert = reveal < .1;
    closing.toggleAttribute('data-visible',!closing.inert);
    const map = stage.querySelector('.island-map');
    if (map) map.inert = reveal < .85;
    stage.classList.toggle('explore-ready', reveal >= .85);
  }
  function render() {
    frame = 0;
    if (!visible || document.hidden) return;
    const next = reduced.matches ? 1 : clamp(scrollY / scrollRange);
    if (next !== progress) {
      progress = next;
      updateScene();
    }

  }
  function start() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  }
  const resize = () => {
    scrollRange = Math.max(1,hero.offsetHeight - stage.offsetHeight);
    progress = -1;
    start();
  };
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }).observe(hero);
  document.addEventListener('visibilitychange',start);
  window.addEventListener('scroll',start,{passive:true});
  reduced.addEventListener('change',resize);
  resize();
}
