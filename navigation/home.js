const worldMode = document.documentElement.classList.contains('world-mode');

function stylesheet(href) {
  const link = Object.assign(document.createElement('link'), { href, rel: 'stylesheet' });
  return new Promise(resolve => {
    link.onload = link.onerror = resolve;
    document.head.append(link);
  });
}

if (worldMode) {
  const assets = [
    'engine/style.css',
    'navigation/world-ui.css?v=20261106-scene-help',
    'navigation/activities.css?v=20261107-airplane-controls',
  ];
  await Promise.all(assets.map(stylesheet));
  document.body.append(document.querySelector('#world-page').content.cloneNode(true));
  await import('../engine/main.js?v=20261114-rendering');
  await import('./world-ui.js?v=20261110-first-visit-guide');
} else {
  const { mountScenes } = await import('./home-scenes.js');
  mountScenes();

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
    opening.inert = bottom.inert = fade < .05;
    opening.setAttribute('aria-hidden',String(opening.inert));
    bottom.setAttribute('aria-hidden',String(bottom.inert));
    closing.inert = reveal < .1;
    closing.toggleAttribute('data-visible',!closing.inert);
  }
  function render() {
    frame = 0;
    if (!visible || document.hidden) return;
    const next = reduced.matches ? 0 : clamp(scrollY / scrollRange);
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
