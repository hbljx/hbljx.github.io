// Small activity state machines. Time comes from the world's update loop,
// so leaving an activity never leaves a timer or an audio loop behind.
export function createLifeActions(sound, changed) {
  const fishing = { phase: 'idle', elapsed: 0, wait: 0, catches: 0, message: '按空格抛竿，留意浮漂' };
  const cooking = { phase: 'prep', chops: 0, stirs: 0, elapsed: 0, cooldown: 0, dishes: 0 };
  const treadmill = { paused: false, speed: 1, elapsed: 0, distance: 0, stride: 0 };
  let current = null;
  const change = () => changed?.();
  function start(id) {
    current = id;
    if (id === 'fishing') { fishing.phase = 'idle'; fishing.elapsed = 0; fishing.message = '按空格抛竿，留意浮漂'; }
    if (id === 'cooking') { cooking.phase = 'prep'; cooking.chops = cooking.stirs = cooking.elapsed = cooking.cooldown = 0; }
    if (id === 'treadmill') { treadmill.paused = false; treadmill.elapsed = treadmill.distance = treadmill.stride = 0; }
  }
  function primary() {
    if (current === 'fishing') {
      const f = fishing;
      if (f.phase === 'idle' || f.phase === 'caught') { f.phase = 'casting'; f.elapsed = 0; f.message = '抛竿中……'; sound.effect('cast'); }
      else if (f.phase === 'bite') { f.phase = 'reeling'; f.elapsed = 0; f.message = '咬住了，正在收线！'; sound.effect('reel'); }
      else if (f.phase === 'waiting') { f.phase = 'idle'; f.elapsed = 0; f.message = '提竿早了，按空格重新抛竿'; sound.effect('reel'); }
      change(); return true;
    }
    if (current === 'cooking') {
      const c = cooking;
      if (c.cooldown > 0) return true;
      c.cooldown = .35;
      if (c.phase === 'prep') {
        c.chops++; sound.effect('chop');
        if (c.chops >= 3) { c.phase = 'cooking'; c.elapsed = 0; }
      } else if (c.phase === 'cooking') { c.stirs++; sound.effect('stir'); }
      else { start('cooking'); sound.effect('start'); }
      change(); return true;
    }
    if (current === 'treadmill') { treadmill.paused = !treadmill.paused; sound.effect(treadmill.paused ? 'stop' : 'start'); change(); return true; }
    return false;
  }
  function secondary() {
    if (current !== 'treadmill') return false;
    treadmill.speed = treadmill.speed < .9 ? 1 : treadmill.speed < 1.2 ? 1.3 : .75;
    sound.effect('click'); change(); return true;
  }
  function update(dt) {
    if (current === 'fishing') {
      const f = fishing; f.elapsed += dt;
      if (f.phase === 'casting' && f.elapsed >= .8) { f.phase = 'waiting'; f.elapsed = 0; f.wait = 3 + Math.random() * 3; f.message = '等待鱼儿上钩……'; sound.effect('splash', .2); change(); }
      else if (f.phase === 'waiting' && f.elapsed >= f.wait) { f.phase = 'bite'; f.elapsed = 0; f.message = '鱼儿咬钩！现在按空格收线'; sound.effect('bite'); change(); }
      else if (f.phase === 'bite' && f.elapsed >= 2.5) { f.phase = 'idle'; f.elapsed = 0; f.message = '鱼儿游走了，按空格再试一次'; sound.effect('splash', .15); change(); }
      else if (f.phase === 'reeling' && f.elapsed >= 1.2) { f.phase = 'caught'; f.elapsed = 0; f.catches++; f.message = '钓到了！按空格继续垂钓'; sound.effect('catch'); change(); }
    } else if (current === 'cooking') {
      const c = cooking; c.cooldown = Math.max(0, c.cooldown - dt);
      if (c.phase === 'cooking') {
        c.elapsed += dt; sound.loop('sizzle', .65);
        if (c.elapsed >= 6 && c.stirs >= 3) { c.phase = 'ready'; c.dishes++; sound.loop(null); sound.effect('ready'); change(); }
      }
    } else if (current === 'treadmill') {
      const t = treadmill;
      sound.loop(t.paused ? null : 'treadmill', t.speed / 1.3);
      if (!t.paused) {
        t.elapsed += dt; t.distance += 6 / 3.6 * t.speed * dt; t.stride += dt * t.speed;
        if (t.stride >= .32) { t.stride %= .32; sound.effect('run', .55); }
      }
    }
  }
  return { fishing, cooking, treadmill, start, primary, secondary, update, stop() { current = null; sound.loop(null); } };
}
