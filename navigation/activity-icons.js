// Small pixel sprites use the same 16 px canvas and palette as the HUD icons.
const COLORS = { k: '#1d1d1f', w: '#fff8df', c: '#4fb3e0', C: '#2b6c9e', b: '#9c6b3f', y: '#f2c94c', r: '#d23c3c', e: '#6aa84f', g: '#c6c6c6' };
const SPRITES = {
  walk: [
    '................', '......kkkk......', '......kwwk......', '......kwwk......',
    '......kkkk......', '.....kcccck.....', '....kkcccckk....', '....kwkcckwk....',
    '....kwkcckwk....', '.....kkCCkk.....', '......kCCk......', '.....kCkkCk.....',
    '.....kCkkCk.....', '....kkk..kkk....', '....kww..wwk....', '....kkk..kkk....',
  ],
  run: [
    '................', '.........kkkk...', '.........kwwk...', '.........kkkk...',
    '..yyy...kcck....', '.......kccck....', '.yyyy.kckcckwk..', '......kwkcckk...',
    '..yy...kCCk.....', '......kCCkkCk...', '.....kCCk..kCk..', '....kCCk...kCk..',
    '...kwwk....kwk..', '...kkkk....kkk..', '................', '................',
  ],
  interact: [
    '................', '.......kk.......', '......kwwk......', '......kwwk......',
    '......kwwk......', '......kwwkkk....', '......kwwkwwkk..', '...kk.kwwwwwwk..',
    '..kwwkkwwwwwwk..', '..kwwwwwwwwwwk..', '...kwwwwwwwwwk..', '....kwwwwwwwk...',
    '....kyyyyyyyk...', '....kyyyyyyyk...', '....kkkkkkkkk...', '................',
  ],
  stop: [
    '................', '................', '..kkkkkkkkkkkk..', '..kwwwwwwwwwwk..',
    '..kwrrrrrrrrwk..', '..kwrrrrrrrrwk..', '..kwrrrrrrrrwk..', '..kwrrrrrrrrwk..',
    '..kwrrrrrrrrwk..', '..kwrrrrrrrrwk..', '..kwrrrrrrrrwk..', '..kwrrrrrrrrwk..',
    '..kwwwwwwwwwwk..', '..kkkkkkkkkkkk..', '................', '................',
  ],
  sit: [
    '................', '...kkkkkkkkkk...', '...kbbbbbbbbk...', '...kbwwwwwwbk...',
    '...kbwwwwwwbk...', '...kbwwwwwwbk...', '...kbwwwwwwbk...', '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..', '..kyyyyyyyyyyk..', '..kkkkkkkkkkkk..', '...kbk....kbk...',
    '...kbk....kbk...', '...kbk....kbk...', '...kkk....kkk...', '................',
  ],
  detail: [
    '................', '..kkkkkkkkkkkk..', '..kwwwwwwwwwwk..', '..kwkkwwwwwwwk..',
    '..kwkewkkkkwwk..', '..kwkkwwwwwwwk..', '..kwwwwwwwwwwk..', '..kwkkwwwwwwwk..',
    '..kwkewkkkkwwk..', '..kwkkwwwwwwwk..', '..kwwwwwwwwwwk..', '..kwkkwwwwwwwk..',
    '..kwkewkkkkwwk..', '..kwkkwwwwwwwk..', '..kkkkkkkkkkkk..', '................',
  ],
};
const cache = new Map();
function icon(name) {
  if (cache.has(name)) return cache.get(name);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
  const context = canvas.getContext('2d');
  SPRITES[name].forEach((row, y) => [...row].forEach((color, x) => {
    if (!COLORS[color]) return;
    context.fillStyle = COLORS[color]; context.fillRect(x, y, 1, 1);
  }));
  const url = canvas.toDataURL(); cache.set(name, url); return url;
}
export function setActivityControl(button, name, label) {
  button.setAttribute('aria-label', label);
  if (button.dataset.icon === name) return;
  button.dataset.icon = name;
  button.querySelector('span').style.backgroundImage = `url(${icon(name)})`;
}
