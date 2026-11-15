// Event-driven decoration around a native GET form. Search never waits for animation.
export function mountSearchEnergy(form, query) {
  if (form.dataset.energyMounted) return;
  form.dataset.energyMounted = 'true';
  const stage = form.closest('.hero-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const colors = { baidu: '#c7f776', bing: '#80e4ff', google: '#e4a1ff', yuanbao: '#ffd087' };
  const submit = form.querySelector('button[type=submit]');
  const face = document.createElement('span');
  face.className = 'search-trigger-face'; face.setAttribute('aria-hidden', 'true');
  face.append(...submit.childNodes); submit.append(face);
  const row = form.querySelector('.web-search-row');
  const create = (className, parent, tag = 'div') => {
    const node = document.createElement(tag);
    node.className = className;
    node.setAttribute('aria-hidden', 'true');
    parent.append(node);
    return node;
  };
  const halo = create('search-edge-light', form);
  const scan = create('search-scan', create('search-scan-track', row));
  const meter = create('search-charge', form);
  meter.innerHTML = '<i></i>'.repeat(12);
  const particles = create('search-particles', form);
  const burst = create('search-burst', form);
  burst.innerHTML = '<i></i><i></i>';
  const environment = create('search-environment', stage);
  environment.innerHTML = '<div class="search-orbits"><i></i><i></i><i></i></div><div class="search-world-pulse"></div>' +
    Array.from({length:6}, (_, i) => `<div class="search-crystal-anchor" style="--crystal:${i}"><i class="search-crystal"></i></div>`).join('');
  const status = document.createElement('div');
  status.className = 'search-energy-status';
  status.innerHTML = '<span>搜索能量台 · 就绪</span><kbd>Enter ↵</kbd>';
  form.append(status);
  const message = status.firstElementChild;
  const live = document.createElement('span');
  live.className = 'visually-hidden';
  live.setAttribute('role', 'status');
  form.append(live);
  const inventory = document.createElement('div');
  inventory.className = 'search-inventory-popup';
  inventory.hidden = true;
  const caption = document.createElement('div');
  caption.className = 'search-inventory-caption';
  caption.textContent = '搜索灵感 · ↑ ↓ 选择 · Enter 搜索';
  const list = document.createElement('div');
  list.id = 'home-search-suggestions';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', '搜索建议');
  inventory.append(caption, list);
  form.append(inventory);
  query.setAttribute('role', 'combobox');
  query.setAttribute('aria-autocomplete', 'list');
  query.setAttribute('aria-controls', list.id);
  query.setAttribute('aria-expanded', 'false');

  const animations = new Set();
  const particleAnimations = new Map();
  let composing = false, active = -1, suggestions = [], pointerFrame = 0, lastInput = 0, lastSubmit = 0;
  let pointerX = 0, pointerY = 0, engine = '', resetTimer = 0, visible = true;
  let candidates = ['AI 工具', '像素壁纸', '在线音乐', '开发工具'].map(name => ({name, keywords:name}));
  const canAnimate = () => visible && !reduced.matches && !document.hidden;
  function animate(node, frames, duration = 450, delay = 0) {
    if (!canAnimate()) return;
    const animation = node.animate(frames, {duration, delay, easing:'cubic-bezier(.2,.8,.2,1)'});
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  }
  function sweep() {
    scan.getAnimations().forEach(a => a.cancel());
    animate(scan, [{transform:'translateX(-100%)',opacity:0}, {opacity:1,offset:.2}, {transform:'translateX(100%)',opacity:0}], 520);
  }
  function sparks(mode, count) {
    if (!canAnimate()) return;
    const r = form.getBoundingClientRect(), b = submit.getBoundingClientRect(), q = query.getBoundingClientRect();
    const bx = b.left - r.left + b.width / 2, by = b.top - r.top + b.height / 2;
    while (particleAnimations.size + count > 36) {
      const [node, animation] = particleAnimations.entries().next().value;
      animation.cancel(); node.remove(); particleAnimations.delete(node);
    }
    for (let i = 0; i < count; i++) {
      const node = create('search-spark', particles, 'i');
      const angle = i / count * Math.PI * 2, distance = 34 + Math.random() * (fine.matches ? 92 : 45);
      const x = mode === 'gather' ? q.left - r.left + q.width * (.35 + Math.random() * .55) : bx;
      const y = mode === 'gather' ? by + (Math.random() - .5) * 34 : by;
      node.style.left = `${x}px`; node.style.top = `${y}px`;
      const dx = mode === 'gather' ? bx - x : Math.cos(angle) * distance;
      const dy = mode === 'gather' ? by - y : Math.sin(angle) * distance;
      const a = animate(node, [{transform:'translate(0,0) scale(.6)',opacity:0}, {opacity:1,offset:.2},
        {transform:`translate(${dx}px,${dy}px) rotate(90deg) scale(.2)`,opacity:0}], mode === 'gather' ? 380 : 650);
      if (!a) { node.remove(); continue; }
      particleAnimations.set(node, a);
      const remove = () => { node.remove(); particleAnimations.delete(node); };
      a.finished.then(remove, remove);
    }
  }
  function charge() {
    const amount = Math.min(12, Math.ceil([...query.value.trim()].length / 2));
    [...meter.children].forEach((cell, i) => cell.classList.toggle('charged', i < amount));
    form.style.setProperty('--search-charge', String(amount / 12));
    message.textContent = amount ? `能量汇聚 · ${form.querySelector('[name=engine]:checked').parentElement.textContent.trim()}` : '搜索能量台 · 就绪';
  }
  function selectEngine(flash = true) {
    const choice = form.querySelector('[name=engine]:checked');
    const next = choice.value;
    stage.style.setProperty('--search-energy', colors[next] || colors.baidu);
    form.dataset.energy = next;
    if (flash && next !== engine) {
      animate(choice.parentElement.querySelector('.search-gem'), [{transform:'rotateY(0deg) translateY(0)'},
        {transform:'rotateY(180deg) translateY(-5px)',offset:.5}, {transform:'rotateY(360deg) translateY(0)'}], 520);
      sweep();
    }
    engine = next;
    charge();
  }
  function closeSuggestions() {
    inventory.hidden = true; active = -1;
    query.setAttribute('aria-expanded', 'false'); query.removeAttribute('aria-activedescendant');
  }
  function positionInventory() {
    if (inventory.hidden) return;
    const rect = form.getBoundingClientRect();
    const viewportBottom = window.visualViewport ? visualViewport.height + visualViewport.offsetTop : innerHeight;
    inventory.classList.toggle('opens-above', viewportBottom - rect.bottom < inventory.offsetHeight + 18);
  }
  function showSuggestions() {
    if (composing || document.activeElement !== query) return;
    const term = query.value.trim().toLocaleLowerCase();
    const limit = (window.visualViewport?.height || innerHeight) < 600 ? 2 : 4;
    suggestions = candidates.filter(item => !term || item.keywords.includes(term)).slice(0,limit);
    if (!suggestions.length) { closeSuggestions(); return; }
    const wasClosed = inventory.hidden;
    list.replaceChildren(); active = -1;
    query.removeAttribute('aria-activedescendant');
    suggestions.forEach((item, i) => {
      const option = document.createElement('div');
      option.id = `home-search-option-${i}`; option.className = 'search-inventory-slot';
      option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
      option.dataset.index = String(i);
      const number = document.createElement('span'), name = document.createElement('span');
      number.className = 'search-slot-number'; number.textContent = String(i + 1).padStart(2,'0');
      name.className = 'search-slot-name'; name.textContent = item.name;
      option.append(number, name); list.append(option);
      if (wasClosed) animate(option, [{transform:'translateY(9px)',opacity:0}, {transform:'translateY(0)',opacity:1}], 200, i * 35);
    });
    inventory.hidden = false; query.setAttribute('aria-expanded', 'true'); positionInventory();
  }
  function highlight(index) {
    active = index;
    [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
    query.setAttribute('aria-activedescendant', list.children[active].id);
  }
  function accept(index) {
    if (!suggestions[index]) return;
    query.value = suggestions[index].name;
    closeSuggestions(); charge(); sparks('gather', 3);
  }
  document.addEventListener('li-directory-update', ({detail}) => {
    const unique = new Map();
    for (const group of detail.groups || []) for (const item of group.items) {
      if (!unique.has(item.name)) unique.set(item.name, {name:item.name,
        keywords:[item.name, item.description, group.title, ...(item.aliases || [])].join(' ').toLocaleLowerCase()});
    }
    if (unique.size) candidates = [...unique.values()];
    showSuggestions();
  });
  list.addEventListener('pointerdown', event => { if (event.target.closest('[role=option]')) event.preventDefault(); });
  list.addEventListener('click', event => {
    const option = event.target.closest('[role=option]');
    if (!option) return;
    accept(Number(option.dataset.index)); query.focus({preventScroll:true}); form.requestSubmit(submit);
  });
  query.addEventListener('keydown', event => {
    if (event.isComposing || composing || event.keyCode === 229) return;
    if (event.key === 'Escape') { closeSuggestions(); event.preventDefault(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (inventory.hidden) showSuggestions();
      if (!suggestions.length || inventory.hidden) return;
      event.preventDefault();
      highlight((active + (event.key === 'ArrowDown' ? 1 : (active < 0 ? 0 : -1)) + suggestions.length) % suggestions.length);
    }
    if (event.key === 'Enter' && !inventory.hidden && active >= 0) accept(active);
  });
  query.addEventListener('compositionstart', () => { composing = true; closeSuggestions(); });
  query.addEventListener('compositionend', () => { composing = false; charge(); showSuggestions(); sparks('gather', 3); });
  query.addEventListener('input', () => {
    charge();
    if (composing) return;
    showSuggestions();
    if (query.value && performance.now() - lastInput > 100) { sparks('gather', 2); lastInput = performance.now(); }
  });
  query.addEventListener('focus', () => { sweep(); showSuggestions(); });
  query.addEventListener('blur', closeSuggestions);
  form.addEventListener('focusin', () => { stage.classList.add('search-focused'); });
  form.addEventListener('focusout', event => { if (!form.contains(event.relatedTarget)) stage.classList.remove('search-focused'); });
  form.addEventListener('change', event => { if (event.target.name === 'engine') selectEngine(); });
  form.addEventListener('submit', event => {
    if (composing) { event.preventDefault(); return; }
    if (event.defaultPrevented || !query.value.trim()) return;
    closeSuggestions();
    const now = performance.now();
    if (now - lastSubmit < 160) return; // Throttle decoration only; preserve every native submission.
    lastSubmit = now;
    sweep(); sparks('burst', fine.matches ? 20 : 10);
    // Keep the native hit area still while its face moves, including rapid repeated searches.
    animate(face, [{translate:'0 0'}, {translate:'0 3px',offset:.25}, {translate:'0 0'}], 230);
    animate(face, [{boxShadow:'inset 0 -4px #213b2444,0 3px #0b160e'},
      {boxShadow:'inset 0 3px #213b2466,0 0 #0b160e',offset:.25}, {boxShadow:'inset 0 -4px #213b2444,0 3px #0b160e'}], 230);
    [...burst.children].forEach((ring,i) => animate(ring, [{transform:'scale(.2) rotate(0deg)',opacity:0},
      {opacity:.8,offset:.15}, {transform:'scale(1.9) rotate(45deg)',opacity:0}], 620, i * 60));
    animate(environment.querySelector('.search-world-pulse'), [{transform:'scale(.2)',opacity:0},
      {opacity:.6,offset:.2}, {transform:'scale(1.5)',opacity:0}], 720);
    environment.querySelectorAll('.search-crystal').forEach((crystal,i) => animate(crystal,
      [{translate:'0 0'}, {translate:`${i % 2 ? 9 : -9}px -12px`,offset:.3}, {translate:'0 0'}], 620, i * 25));
    message.textContent = '传送已启动 · 探索世界'; live.textContent = '正在新标签页中搜索';
    clearTimeout(resetTimer); resetTimer = setTimeout(charge, 1000);
  });
  form.addEventListener('formdata', () => {
    // The native handler clears the input once the request has captured its value.
    queueMicrotask(() => { meter.querySelectorAll('.charged').forEach(cell => cell.classList.remove('charged')); form.style.setProperty('--search-charge','0'); });
  });
  function movePointer() {
    pointerFrame = 0;
    if (!canAnimate() || !fine.matches) return;
    const r = form.getBoundingClientRect(), b = submit.getBoundingClientRect();
    halo.style.setProperty('--pointer-x', `${pointerX - r.left}px`);
    halo.style.setProperty('--pointer-y', `${pointerY - r.top}px`);
    const dx = pointerX - (b.left + b.width / 2), dy = pointerY - (b.top + b.height / 2);
    const near = Math.hypot(dx, dy) < 95;
    submit.style.setProperty('--magnet-x', `${near ? Math.max(-3, Math.min(3, dx * .06)) : 0}px`);
    submit.style.setProperty('--magnet-y', `${near ? Math.max(-3, Math.min(3, dy * .06)) : 0}px`);
  }
  form.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !fine.matches || !canAnimate()) return;
    pointerX = event.clientX; pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(movePointer);
  }, {passive:true});
  function resetPointer() {
    cancelAnimationFrame(pointerFrame); pointerFrame = 0;
    submit.style.removeProperty('--magnet-x'); submit.style.removeProperty('--magnet-y');
  }
  form.addEventListener('pointerleave', resetPointer);
  function stop() {
    resetPointer();
    for (const animation of animations) animation.cancel();
    animations.clear(); particleAnimations.clear(); particles.replaceChildren();
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { stop(); closeSuggestions(); stage.classList.remove('search-focused'); }
    else stage.classList.toggle('search-focused', form.contains(document.activeElement));
  });
  observer.observe(form);
  reduced.addEventListener('change', stop); fine.addEventListener('change', resetPointer);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', () => { stop(); clearTimeout(resetTimer); });
  const resizeInventory = () => { if (!inventory.hidden) showSuggestions(); };
  window.addEventListener('resize', resizeInventory, {passive:true});
  window.visualViewport?.addEventListener('resize', resizeInventory, {passive:true});
  selectEngine(false);
}
