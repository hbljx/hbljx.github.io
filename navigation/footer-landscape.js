import { Runner } from './runner-core.js';
import { createRunnerRenderer } from './runner-renderer.js';

// The footer itself is the game: no assets, dependencies or background timers.
export function mountFooterLandscape() {
  const footer = document.querySelector('.home-footer');
  if (!footer || footer.querySelector('.footer-runner')) return;
  const game = document.createElement('section');
  game.className = 'footer-runner';
  game.setAttribute('aria-label', '方块小恐龙无限跑酷');
  game.innerHTML = `
    <canvas class="runner-canvas" tabindex="0" aria-label="跑酷游戏。空格或上箭头跳跃，长按跳得更高，下箭头下蹲或快速落地，Escape 暂停。" aria-describedby="runner-help"></canvas>
    <header class="runner-hud"><span class="runner-label"><i aria-hidden="true"></i> 方块小恐龙 <small>BLOCK RUNNER</small></span><span class="runner-scores"><span>最高 <b data-best>00000</b></span><span>距离 <b data-score>00000</b></span></span></header>
    <aside class="runner-overlay" aria-labelledby="runner-dialog-title">
      <span class="runner-panel-heading"><svg class="runner-dialog-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <g class="runner-icon-ready"><path fill="#416b3e" d="M2 6h20v16H2z"/><path fill="#8fae62" d="M2 2h20v6H2z"/><path fill="#b9d780" d="M2 2h20v2H2z"/><path fill="#64543c" d="M2 11h20v11H2z"/><path fill="#8c7550" d="M4 13h5v4H4zm9 5h5v3h-5z"/><path fill="#2c4630" d="M18 8h4v14h-4z"/></g>
        <g class="runner-icon-paused"><path fill="#645f43" d="M3 3h7v20H3zm12 0h7v20h-7z"/><path fill="#d7c68b" d="M3 2h6v18H3zm12 0h6v18h-6z"/><path fill="#fff0b4" d="M3 2h6v3H3zm12 0h6v3h-6z"/></g>
        <g class="runner-icon-over"><path fill="#5d6257" d="M4 4h16v3h3v12h-5v4H7v-4H2V7h2z"/><path fill="#c5c8aa" d="M4 2h15v3h3v12h-6v4H7v-4H1V5h3z"/><path fill="#f0eacb" d="M4 2h15v3H4z"/><path fill="#293b34" d="M4 7h5v5H4zm10 0h5v5h-5zm-4 6h4v3h-4zm-1 5h2v3H9zm4 0h2v3h-2z"/></g>
      </svg><span class="runner-eyebrow" hidden></span></span>
      <h2 id="runner-dialog-title">方块世界，无限冒险</h2>
      <span class="runner-results" hidden><span>本次距离<b data-result-score>00000</b></span><span>最高纪录<b data-result-best>00000</b></span></span>
      <button type="button" class="runner-start">开始奔跑 <span aria-hidden="true">→</span></button><span class="runner-start-hint">空格 / ↑ / Enter 开始</span>
    </aside>
    <nav class="runner-toolbar" aria-label="跑酷操作"><p id="runner-help"><span class="runner-desktop-help">空格 / ↑ 跳跃 · 长按大跳 · ↓ 蹲下 / 快速落地</span><span class="runner-touch-help">点画面跳跃 · 长按大跳 · 按住 ↓ 蹲下</span></p><span class="runner-settings"><button type="button" data-pause disabled aria-label="暂停游戏">暂停</button><button type="button" data-sound aria-pressed="false" aria-label="开启游戏音效">音效：关</button></span></nav>
    <span class="runner-touch-controls"><button type="button" data-duck aria-label="按住下蹲，空中按住快速落地">↓ 蹲下</button><button type="button" data-jump aria-label="跳跃，长按跳得更高">↑ 跳跃</button></span>
    <p class="runner-announcement" role="status" aria-live="polite"></p>`;
  const canvas = game.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  footer.classList.add('footer-landscape');
  footer.prepend(game);
  const runner = new Runner();
  const overlay = game.querySelector('.runner-overlay');
  const title = overlay.querySelector('h2');
  const eyebrow = overlay.querySelector('.runner-eyebrow');
  const start = game.querySelector('.runner-start'), hint = game.querySelector('.runner-start-hint');
  const scoreNode = game.querySelector('[data-score]'), bestNode = game.querySelector('[data-best]');
  const pauseButton = game.querySelector('[data-pause]'), soundButton = game.querySelector('[data-sound]');
  const announcement = game.querySelector('.runner-announcement');
  const results = game.querySelector('.runner-results');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const draw = createRunnerRenderer(ctx, runner, reduced);
  const jumpKeys = new Set(['Space', 'ArrowUp']);
  const heldKeys = new Set(), jumpPointers = new Set(), duckPointers = new Set();
  let width = 960, height = 240, visible = false, raf = 0, last = 0, accumulator = 0;
  let best = 0, shownScore = -1, milestone = 0, audio = null, sound = false;
  try { best = Math.max(0, Math.min(99999999, Number(localStorage.getItem('li-block-runner-best')) || 0)); } catch { /* Storage may be disabled. */ }
  bestNode.textContent = String(best).padStart(5, '0');

  function tone(frequency, duration, end = frequency) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + duration);
      gain.gain.setValueAtTime(.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is optional. */ }
  }
  function clearInput() {
    heldKeys.clear(); jumpPointers.clear(); duckPointers.clear();
    runner.jumpHeld = runner.duck = false;
  }
  function syncInput() {
    runner.jumpHeld = heldKeys.has('Space') || heldKeys.has('ArrowUp') || jumpPointers.size > 0;
    runner.duck = heldKeys.has('ArrowDown') || duckPointers.size > 0;
  }
  function showState() {
    game.dataset.state = runner.state;
    overlay.hidden = runner.state === 'running';
    eyebrow.hidden = runner.state !== 'paused';
    results.hidden = runner.state !== 'over';
    pauseButton.disabled = runner.state !== 'running' && runner.state !== 'paused';
    pauseButton.textContent = runner.state === 'paused' ? '继续' : '暂停';
    pauseButton.setAttribute('aria-label', runner.state === 'paused' ? '继续游戏' : '暂停游戏');
    if (runner.state === 'over') {
      title.textContent = '冒险结束';
      game.querySelector('[data-result-score]').textContent = String(runner.score).padStart(5, '0');
      game.querySelector('[data-result-best]').textContent = String(best).padStart(5, '0');
      start.innerHTML = '重新奔跑 <span aria-hidden="true">↻</span>';
      hint.textContent = '空格 / ↑ / Enter 或点击重开';
      announcement.textContent = `游戏结束，本次 ${runner.score} 分，最高 ${best} 分。`;
    } else if (runner.state === 'paused') {
      eyebrow.textContent = 'GAME PAUSED';
      title.textContent = '游戏已暂停';
      start.textContent = '返回冒险 →';
      hint.textContent = '空格 / ↑ / Enter 或点击继续';
      announcement.textContent = '游戏已暂停。';
    }
  }
  function paint() {
    const night = String(runner.night);
    if (game.dataset.night !== night) game.dataset.night = night;
    draw(width, height);
    if (shownScore !== runner.score) {
      shownScore = runner.score;
      scoreNode.textContent = String(runner.score).padStart(5, '0');
    }
  }
  function schedule() {
    if (!raf && visible && !document.hidden && runner.state === 'running') raf = requestAnimationFrame(tick);
  }
  function activate() {
    if (!visible || document.hidden) return false;
    if (runner.state === 'paused') runner.state = 'running';
    else if (runner.state !== 'running') {
      if (!runner.start(performance.now())) return false;
      milestone = 0; shownScore = -1;
    }
    clearInput(); last = performance.now(); accumulator = 0;
    showState(); paint(); schedule();
    announcement.textContent = '开始奔跑。';
    return true;
  }
  function pause() {
    clearInput();
    if (runner.state !== 'running') return;
    runner.state = 'paused';
    cancelAnimationFrame(raf); raf = 0;
    showState(); paint();
  }
  function jump() { if (runner.jump()) tone(310, .09, 650); }
  start.addEventListener('click', () => { if (activate()) canvas.focus({ preventScroll: true }); });
  pauseButton.addEventListener('click', () => {
    if (runner.state === 'running') pause();
    else if (activate()) canvas.focus({ preventScroll: true });
  });
  soundButton.addEventListener('click', () => {
    sound = !sound;
    soundButton.textContent = sound ? '音效：开' : '音效：关';
    soundButton.setAttribute('aria-pressed', String(sound));
    soundButton.setAttribute('aria-label', sound ? '关闭游戏音效' : '开启游戏音效');
    tone(520, .06);
  });
  window.addEventListener('keydown', event => {
    // Buttons keep native Enter/Space activation; game keys belong to the canvas.
    const pageFocused = event.target === document.body || event.target === document.documentElement;
    if (event.target !== canvas && !(visible && pageFocused)) return;
    if (!['Space', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    if (event.code === 'Escape') { pause(); return; }
    if (runner.state !== 'running') {
      if ((jumpKeys.has(event.code) || event.code === 'Enter') && activate()) {
        canvas.focus({ preventScroll: true });
        heldKeys.add(event.code); syncInput();
      }
      return;
    }
    heldKeys.add(event.code);
    if (jumpKeys.has(event.code)) jump();
    syncInput();
  });
  window.addEventListener('keyup', event => { heldKeys.delete(event.code); syncInput(); });
  function bindPointer(target, action) {
    target.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); canvas.focus({ preventScroll: true });
      target.setPointerCapture(event.pointerId);
      if (runner.state !== 'running') { activate(); return; }
      (action === 'duck' ? duckPointers : jumpPointers).add(event.pointerId);
      if (action === 'jump') jump();
      syncInput();
    });
    const release = event => {
      jumpPointers.delete(event.pointerId); duckPointers.delete(event.pointerId); syncInput();
    };
    target.addEventListener('pointerup', release);
    target.addEventListener('pointercancel', release);
    target.addEventListener('lostpointercapture', release);
  }
  bindPointer(canvas, 'jump');
  bindPointer(game.querySelector('[data-jump]'), 'jump');
  bindPointer(game.querySelector('[data-duck]'), 'duck');
  for (const action of ['jump', 'duck']) {
    const button = game.querySelector(`[data-${action}]`);
    button.addEventListener('keydown', event => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (runner.state !== 'running' && !activate()) return;
      heldKeys.add(action === 'jump' ? 'Space' : 'ArrowDown');
      if (action === 'jump') jump();
      syncInput();
    });
    button.addEventListener('keyup', () => {
      heldKeys.delete(action === 'jump' ? 'Space' : 'ArrowDown'); syncInput();
    });
  }
  window.addEventListener('blur', pause);
  game.addEventListener('focusout', event => { if (!game.contains(event.relatedTarget)) pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  function tick(now) {
    raf = 0;
    if (!visible || document.hidden || runner.state !== 'running') return;
    // Fixed steps keep jump height and collision stable across refresh rates.
    accumulator += Math.min((now - last) / 1000, .08); last = now;
    while (accumulator >= 1 / 120) {
      runner.update(1 / 120, now); accumulator -= 1 / 120;
    }
    if (runner.state === 'over') {
      clearInput();
      if (runner.score > best) {
        best = runner.score;
        bestNode.textContent = String(best).padStart(5, '0');
        try { localStorage.setItem('li-block-runner-best', String(best)); } catch { /* Optional persistence. */ }
      }
      tone(180, .23, 45); showState();
    } else if (Math.floor(runner.score / 100) > milestone) {
      milestone = Math.floor(runner.score / 100); tone(660, .1, 880);
    }
    paint(); schedule();
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width) return;
    const nextWidth = Math.max(480, Math.round(bounds.width / 1.5));
    if (runner.state === 'running' && nextWidth !== width) pause();
    width = nextWidth; height = Math.round(bounds.height * width / bounds.width);
    canvas.width = width; canvas.height = height;
    ctx.imageSmoothingEnabled = false;
    runner.resize(width, height - 34); paint();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .55;
    if (!visible) pause();
  }, { threshold: [0, .55] }).observe(canvas);
  reduced.addEventListener('change', paint);
  showState(); resize();
}
