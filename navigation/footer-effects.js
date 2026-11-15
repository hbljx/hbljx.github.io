// A single welcome glint, then pointer-triggered flourishes. No idle timer loop.
export function mountFooterEffects() {
  const footer = document.querySelector('.home-footer');
  if (!footer || footer.dataset.effectsMounted) return;
  footer.dataset.effectsMounted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const plaques = [...footer.querySelectorAll('[data-footer-effect]')];
  const timers = new Map();
  const visible = new Set();
  const greeted = new Set();
  function stop(node) {
    clearTimeout(timers.get(node));
    timers.delete(node);
    node.classList.remove('footer-awake');
  }
  function play(node) {
    if (reduced.matches || document.hidden || !visible.has(node) || timers.has(node)) return;
    node.classList.add('footer-awake');
    timers.set(node, setTimeout(() => stop(node), 1800));
  }
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visible.add(target);
        if (!greeted.has(target)) { greeted.add(target); play(target); }
      } else { visible.delete(target); stop(target); }
    }
  }, { threshold: .7 });
  for (const node of plaques) {
    observer.observe(node);
    node.addEventListener('pointerenter', event => {
      if (fine.matches && event.pointerType !== 'touch') play(node);
    });
  }
  const reset = () => plaques.forEach(stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  window.addEventListener('pagehide', reset);
  reduced.addEventListener('change', reset);
  fine.addEventListener('change', reset);
}
