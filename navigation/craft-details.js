// Local, finite effects. Native anchors keep normal clicks and modifier keys.
export function mountCraftDetails() {
  const brand = document.querySelector('.craft-brand');
  if (!brand || brand.dataset.craftMounted) return;
  brand.dataset.craftMounted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const portal = document.querySelector('.site-header .world-link');
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
  for (const [node, name, duration] of [[brand, 'brand-awake', 1200], [portal, 'portal-awake', 1400]]) {
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

  // One shared, hoverable tooltip outside the clipped scene containers.
  const tip = document.createElement('div');
  tip.id = 'craft-item-tooltip';
  tip.className = 'craft-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  const title = document.createElement('strong');
  const description = document.createElement('p');
  const domain = document.createElement('span');
  domain.className = 'craft-tooltip-domain';
  const hint = document.createElement('small');
  hint.textContent = '↗ 在新标签页打开';
  tip.append(title, description, domain, hint);
  document.body.append(tip);
  let current = null, showTimer = 0, hideTimer = 0;
  const removalObserver = new MutationObserver(() => {
    if (current && !current.isConnected) hide();
  });
  function hide() {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    removalObserver.disconnect();
    if (current) {
      const ids = (current.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tip.id);
      if (ids.length) current.setAttribute('aria-describedby', ids.join(' '));
      else current.removeAttribute('aria-describedby');
    }
    current = null;
    tip.hidden = true;
  }
  function show(link) {
    hide();
    if (!link.isConnected || document.hidden || document.querySelector('dialog[open]')) return;
    current = link;
    removalObserver.observe(link.closest('.room-groups'), { childList: true });
    title.textContent = link.querySelector('strong').textContent;
    description.textContent = link.querySelector('small').textContent;
    domain.textContent = new URL(link.href).hostname;
    link.setAttribute('aria-describedby', [link.getAttribute('aria-describedby'), tip.id].filter(Boolean).join(' '));
    tip.hidden = false;
    const rect = link.getBoundingClientRect(), bounds = tip.getBoundingClientRect();
    const top = rect.bottom + 6 + bounds.height <= innerHeight - 12 ? rect.bottom + 6 : rect.top - bounds.height - 6;
    tip.style.left = `${Math.max(12, Math.min(innerWidth - bounds.width - 12, rect.left + 14))}px`;
    tip.style.top = `${Math.max(12, Math.min(innerHeight - bounds.height - 12, top))}px`;
  }
  function schedule(link, delay) {
    clearTimeout(hideTimer); clearTimeout(showTimer);
    if (link === current && !tip.hidden) return;
    showTimer = setTimeout(() => show(link), delay);
  }
  const root = document.querySelector('#zone-scenes');
  root.addEventListener('pointerover', event => {
    const link = event.target.closest('.room-card > a');
    if (fine.matches && event.pointerType !== 'touch' && link && !link.contains(event.relatedTarget)) schedule(link, 240);
  });
  root.addEventListener('pointerout', event => {
    const link = event.target.closest('.room-card > a');
    if (!link || link.contains(event.relatedTarget)) return;
    clearTimeout(showTimer);
    if (event.relatedTarget && tip.contains(event.relatedTarget)) return;
    if (document.activeElement === link) return;
    hideTimer = setTimeout(hide, 140);
  });
  root.addEventListener('focusin', event => {
    const link = event.target.closest('.room-card > a');
    if (link && link.matches(':focus-visible')) schedule(link, 0);
  });
  root.addEventListener('focusout', hide);
  root.addEventListener('click', hide);
  tip.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  tip.addEventListener('pointerleave', hide);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, { passive: true, capture: true });
  window.addEventListener('resize', hide);
  document.addEventListener('li-directory-update', hide);
  function reset() {
    hide();
    for (const [node, { name, timer }] of active) { clearTimeout(timer); node.classList.remove(name); }
    active.clear();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  window.addEventListener('pagehide', reset);
  reduced.addEventListener('change', reset);
  fine.addEventListener('change', reset);
}
