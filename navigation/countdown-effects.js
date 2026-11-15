export function mountCountdownEffects(section) {
  if (section.dataset.effectsMounted) return;
  section.dataset.effectsMounted = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const states = [];
  const header = document.createElement('h3');
  header.className = 'about-section-title countdown-header';
  header.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#765a32" d="M4 1h16v5h-2v4l-2 2 2 2v4h2v5H4v-5h2v-4l2-2-2-2V6H4z"/><path fill="#dfc389" d="M5 2h14v3H5zm0 17h14v3H5z"/><path fill="#89d8c8" d="M8 6h8v3l-4 4-4-4zm4 7 4 3v2H8v-2z"/><path fill="#f0db9d" d="M9 7h6l-3 3zm3 7 3 3H9z"/><path fill="#fff0c6" d="M6 2h12v1H6zm0 17h12v1H6z"/></svg><span>时间刻度</span><small lang="en">TIME REMAINING</small>';
  section.prepend(header);

  function resetPointer(state) {
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    for (const name of ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y']) state.card.style.removeProperty(name);
    state.card.classList.remove('countdown-tracking');
  }
  function clearBurst(state) {
    clearTimeout(state.cleanup);
    state.card.querySelectorAll('.countdown-spark').forEach(el => el.remove());
  }
  function play(state, burst = false, event) {
    if (reduced.matches || document.hidden || !state.visible) return;
    const { card } = state;
    clearBurst(state);
    card.classList.remove('countdown-charging');
    void card.offsetWidth;
    card.classList.add('countdown-charging');
    if (!burst) return;
    const rect = card.getBoundingClientRect();
    const x = event?.detail ? Math.max(12, Math.min(rect.width - 12, event.clientX - rect.left)) : rect.width / 2;
    const y = event?.detail ? Math.max(12, Math.min(rect.height - 12, event.clientY - rect.top)) : rect.height / 2;
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('i'), angle = i * Math.PI / 4;
      spark.className = 'countdown-spark';
      spark.setAttribute('aria-hidden', 'true');
      spark.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(angle) * 55}px;--dy:${Math.sin(angle) * 45}px;--turn:${i * 45}deg`;
      card.append(spark);
    }
    state.cleanup = setTimeout(() => clearBurst(state), 850);
  }

  section.querySelectorAll('[data-countdown]').forEach((card, index) => {
    const state = { card, visible: false, entered: false, frame: 0, cleanup: 0, x: 0, y: 0 };
    states.push(state);
    card.style.setProperty('--card-order', index);
    const badge = document.createElement('div');
    badge.className = 'countdown-code';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = `<span>0${index + 1} / ${card.dataset.countdown.toUpperCase()}</span><svg viewBox="0 0 24 24"><path d="M5 2h14v3h-2v4l-3 3 3 3v4h2v3H5v-3h2v-4l3-3-3-3V5H5zm5 3v3l2 2 2-2V5zm2 9-2 2v3h4v-3z"/></svg>`;
    card.prepend(badge);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'countdown-activate';
    button.setAttribute('aria-label', `重播${card.querySelector('h3').textContent}动效`);
    button.innerHTML = '<span aria-hidden="true">↗</span>';
    button.addEventListener('click', event => play(state, true, event));
    card.append(button);
    card.addEventListener('pointermove', event => {
      if (reduced.matches || !fine.matches || event.pointerType !== 'mouse' || !state.visible || document.hidden) return;
      state.x = event.clientX; state.y = event.clientY;
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (state.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (state.y - rect.top) / rect.height));
        card.style.setProperty('--spot-x', `${x * 100}%`);
        card.style.setProperty('--spot-y', `${y * 100}%`);
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
        card.classList.add('countdown-tracking');
      });
    });
    card.addEventListener('pointerleave', () => resetPointer(state));
    card.addEventListener('pointercancel', () => resetPointer(state));
    card.addEventListener('animationend', event => {
      if (event.animationName === 'countdown-charge') card.classList.remove('countdown-charging');
      if (event.animationName === 'countdown-arrive') card.classList.remove('countdown-arriving');
    });
    card.addEventListener('countdown:update', () => play(state));
  });

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.find(item => item.card === entry.target);
      state.visible = entry.isIntersecting;
      state.card.classList.toggle('countdown-in-view', state.visible);
      if (state.visible && !state.entered) {
        state.entered = true;
        if (!reduced.matches) state.card.classList.add('countdown-arriving');
        play(state);
      } else if (!state.visible) {
        resetPointer(state); clearBurst(state);
        state.card.classList.remove('countdown-arriving', 'countdown-charging');
      }
    }
  }, { threshold: 0.15 });
  states.forEach(state => observer.observe(state.card));
  section.closest('#about-us')?.addEventListener('about:replay', () => states.forEach(state => play(state)));
  function syncMotion() {
    section.classList.toggle('countdown-paused', document.hidden);
    for (const state of states) {
      state.card.querySelector('.countdown-activate').hidden = reduced.matches;
      if (document.hidden || reduced.matches || !fine.matches) resetPointer(state);
      if (document.hidden || reduced.matches) {
        clearBurst(state);
        state.card.classList.remove('countdown-arriving', 'countdown-charging');
      }
    }
  }
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', () => states.forEach(state => { resetPointer(state); clearBurst(state); }));
  reduced.addEventListener('change', syncMotion);
  fine.addEventListener('change', syncMotion);
  syncMotion();
}
