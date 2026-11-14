// Decorative layers share the artwork's palette, but each room has its own choreography.
// Everything is scroll-driven; there is no timer, scroll lock or animation library.
const repeated = (count, render) => Array.from({length:count}, (_, i) => render(i)).join('');
const svg = content => `<svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" fill="none">${content}</svg>`;

export function sceneDecoration(id, index) {
  const dust = repeated(18, i => `<i style="--x:${(i * 37 + 11) % 100}%;--y:${(i * 53 + 19) % 100}%;--z:${1 + i % 3};--seed:${i % 5}"></i>`);
  const effects = {
    about: `<div class="window-wings"><i></i><i></i></div><div class="window-sun"></div>`,
    works: `<div class="scan-field"></div><div class="scan-edge"></div><div class="circuit-traces">${svg('<path pathLength="1" d="M570 110H800V180H910V340H850V490H960 M620 610H750V540H900 M720 70V240H660V300"/><g class="circuit-nodes"><rect x="795" y="105" width="10" height="10"/><rect x="845" y="335" width="10" height="10"/><rect x="745" y="535" width="10" height="10"/></g>')}</div>`,
    writing: `<div class="paper-leaves">${repeated(5, i => `<i style="--i:${i}"><span></span></i>`)}</div><div class="library-light"></div>`,
    coffee: `<div class="record-halo"><div class="record-grooves"></div>${svg('<circle cx="500" cy="350" r="270"/><circle cx="500" cy="350" r="257" stroke-dasharray="1 12"/><circle cx="500" cy="350" r="240"/><path d="M500 80A270 270 0 0 1 770 350" stroke-width="3"/>')}</div><div class="coffee-glow"></div>`,
    lab: `<div class="shutter-slats">${repeated(18, i => `<i style="--i:${i}"><span></span></i>`)}</div><div class="workshop-rails"><i></i><i></i></div><div class="workshop-light"></div>`,
    court: `<div class="observatory-grid">${svg('<g stroke-opacity=".16"><path d="M0 140H1000M0 280H1000M0 420H1000M0 560H1000M200 0V700M400 0V700M600 0V700M800 0V700"/></g><g class="orbital-lines"><ellipse cx="780" cy="340" rx="200" ry="200"/><ellipse cx="780" cy="340" rx="176" ry="176" stroke-dasharray="2 14"/><path d="M550 340H1000M780 110V570"/></g><path class="signal-path" pathLength="1" d="M540 470H580V420H650V440H705V340H770V355H820V260H910V220H1000"/>')}</div><div class="horizon-light"></div><div class="scene-counter"><strong>0</strong><span>个网址</span><i></i></div>`,
    pool: `<div class="garden-canopy">${repeated(6, i => `<i style="--i:${i}"></i>`)}</div><div class="garden-rays"></div><div class="garden-bloom"></div>`,
  };
  return `<div class="scene-fx" aria-hidden="true">${effects[id]}<div class="scene-motes">${dust}</div><div class="scene-vignette"></div></div><div class="scene-folio" aria-hidden="true"><span>${String(index+1).padStart(2,'0')}</span><i></i><small>07</small></div>`;
}

const clamp = n => Math.max(0, Math.min(1, n));
// Quintic easing has zero velocity and acceleration at both ends of each phase.
const smooth = n => { const t=clamp(n); return t*t*t*(t*(t*6-15)+10); };
const phase = (p, start, end) => smooth((p-start)/(end-start));
const entryEnd = {about:.40, works:.48, writing:.45, coffee:.47, lab:.46, court:.46, pool:.48};

export function paintSceneMotion(scene, progress, staticView) {
  const entry = staticView ? 1 : phase(progress, .015, entryEnd[scene.dataset.room]);
  const exit = staticView ? 0 : phase(progress, .84, 1);
  const values = {
    '--enter':entry,
    '--exit':exit,
    '--travel':staticView ? .5 : progress,
    '--atmosphere':staticView ? 0 : (1-phase(progress,.38,.65)) * .7 + .2,
    '--title-in':staticView ? 1 : phase(progress,.20,.47),
    '--body-in':staticView ? 1 : phase(progress,.28,.54),
    '--actions-in':staticView ? 1 : phase(progress,.34,.59),
  };
  for (const key in values) scene.style.setProperty(key, values[key].toFixed(5));
  return {entry, exit};
}
