// One loading screen for startup, world selection and return journeys.
let dismissTimer = null, fadeTimer = null, tipTimer = null, tipIndex = -1;
let currentProgress = 0;
const tips = [
  ['用 WASD 或方向键移动，也可以点击地面走过去。', 'Move with WASD or the arrow keys, or click the ground to walk.'],
  ['拖动调整视角，Shift 跑步，空格跳跃。', 'Drag to look around, hold Shift to run, and press Space to jump.'],
  ['靠近物件按 E 开始互动，多数活动可再按 E 或 Esc 结束。', 'Press E near an object to interact. Press E or Esc to leave most activities.'],
  ['靠近椅凳、沙发或床沿，按 Q 坐下或起身。', 'Press Q near a chair, sofa or bed to sit down or stand up.'],
  ['到屋外空地按 R 切换飞行，空格升高，Ctrl 降低。', 'Press R outdoors to switch to flight. Space ascends; Ctrl descends.'],
  ['右上角「天气与时段」可以切换晴天、下雪和黄昏等风景。', 'Use Weather and Time in the top corner to try snow, sunshine or sunset.'],
  ['底部快捷栏可以打开网址目录；门口的绿色书本里有完整游玩指南。', 'Open the website directory from the bottom bar. The green book by the door contains the full guide.'],
  ['海边钓鱼时，等浮漂下沉后及时按空格收线。', 'When fishing by the sea, press Space to reel in as soon as the float sinks.'],
  ['走到公交或地铁站台按 E 候车，到站停稳后按 E 下车。', 'Press E at a bus or metro stop to wait, and E again after arrival to get off.'],
  ['手机上可以点击地面移动，用屏幕按钮互动和切换移动模式。', 'On a phone, tap the ground to move and use the on-screen controls to interact.'],
];
const english = () => document.documentElement.lang === 'en';

function changeTip(root) {
  // Uniform choice among all tips except the one currently on screen.
  const next = Math.floor(Math.random() * (tips.length - (tipIndex < 0 ? 0 : 1)));
  tipIndex = tipIndex < 0 || next < tipIndex ? next : next + 1;
  root.querySelector('.loading-tip').textContent = tips[tipIndex][english() ? 1 : 0];
}

export function showLoading(label = '', fraction = .08, image = null) {
  clearTimeout(dismissTimer); clearTimeout(fadeTimer);
  let root = document.getElementById('loading');
  if (!root) {
    root = document.createElement('div'); root.id = 'loading';
    document.body.append(root);
  }
  const fresh = !root.dataset.active || root.dataset.finishing || root.classList.contains('done');
  delete root.dataset.finishing;
  root.classList.remove('done');
  if (!root.querySelector('.loading-content')) {
    root.innerHTML = '<div class="loading-content"><p class="loading-eyebrow">LI+ / EXPLORE THE ISLAND</p><h1 class="loading-title"></h1><div class="loading-meta"><p class="loading-label" role="status"></p><span class="loading-percent" aria-hidden="true">0%</span></div><div class="bar"><i></i></div><p class="loading-tip"></p></div>';
  }
  root.querySelector('.loading-title').textContent = english() ? 'Your little world awaits' : '即将抵达，像素家园';
  root.querySelector('.loading-label').textContent = label || (english() ? 'Preparing the world' : '正在准备世界');
  if (fresh) {
    currentProgress = 0;
    clearInterval(tipTimer);
    changeTip(root);
    tipTimer = setInterval(() => {
      if (!root.isConnected) { clearInterval(tipTimer); tipTimer = null; return; }
      if (!document.hidden) changeTip(root);
    }, 2000);
  }
  root.dataset.active = 'true';
  let picture = root.querySelector('.loading-preview');
  if (image) {
    if (!picture) {
      picture = Object.assign(new Image(), { className: 'loading-preview', alt: '', decoding: 'async', referrerPolicy: 'no-referrer' });
      picture.addEventListener('error', () => picture.remove());
      root.prepend(picture);
    }
    picture.src = image;
  } else picture?.remove();
  setLoadingProgress(fraction);
}

export function setLoadingProgress(fraction, label = '') {
  const root = document.getElementById('loading');
  if (!root) return;
  if (!root.dataset.active) { showLoading('', fraction); return; }
  if (!Number.isFinite(fraction)) return;
  currentProgress = Math.max(currentProgress, Math.max(0, Math.min(1, fraction)));
  const value = Math.round(currentProgress * 100), bar = root.querySelector('.bar');
  bar.querySelector('i').style.width = `${value}%`;
  root.querySelector('.loading-percent').textContent = `${value}%`;
  if (label) root.querySelector('.loading-label').textContent = label;
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-label', english() ? 'Loading world' : '加载世界');
  bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
  bar.setAttribute('aria-valuenow', String(value));
}

export function finishLoading() {
  clearTimeout(dismissTimer); clearTimeout(fadeTimer); clearInterval(tipTimer); tipTimer = null;
  const root = document.getElementById('loading');
  if (!root) return;
  setLoadingProgress(1);
  clearInterval(tipTimer); tipTimer = null;
  root.dataset.finishing = 'true';
  root.querySelector('.loading-label').textContent = english() ? 'Ready — welcome home' : '准备就绪，欢迎回家';
  // Let the completed bar paint before fading to the first rendered world frame.
  fadeTimer = setTimeout(() => {
    root.classList.add('done');
    dismissTimer = setTimeout(() => root.remove(), 500);
  }, 300);
}

export function hideLoading() {
  clearTimeout(dismissTimer); clearTimeout(fadeTimer); clearInterval(tipTimer); tipTimer = null;
  document.getElementById('loading')?.remove();
}
