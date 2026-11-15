// Local, finite effects. Native anchors keep normal clicks and modifier keys.
export function mountCraftDetails() {
  const brand = document.querySelector('.craft-brand');
  if (!brand || brand.dataset.craftMounted) return;
  brand.dataset.craftMounted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const portals = [...document.querySelectorAll('.site-header :is(nav a,.about-nav,.world-link)')];
  const active = new Map();
  const decorations = document.createElement('span');
  decorations.className = 'brand-xp';
  decorations.setAttribute('aria-hidden', 'true');
  decorations.innerHTML = '<i></i><i></i><i></i><i></i>';
  brand.querySelector('b').append(decorations);

  function play(node, name, duration) {
    if (reduced.matches || document.hidden || active.has(node)) return;
    node.classList.add(name);
    active.set(node, { name, timer: setTimeout(() => {
      node.classList.remove(name);
      active.delete(node);
    }, duration) });
  }
  for (const [node, name, duration] of [[brand, 'brand-awake', 1200], ...portals.map(node => [node, 'portal-awake', 1400])]) {
    if (!node) continue;
    node.addEventListener('pointerenter', event => {
      if (fine.matches && event.pointerType !== 'touch') play(node, name, duration);
    });
    node.addEventListener('focusin', () => play(node, name, duration));
    node.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') play(node, name, duration);
    });
  }
  play(brand, 'brand-arrive', 700);

  function reset() {
    for (const [node, { name, timer }] of active) { clearTimeout(timer); node.classList.remove(name); }
    active.clear();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  window.addEventListener('pagehide', reset);
  reduced.addEventListener('change', reset);
  fine.addEventListener('change', reset);
}
