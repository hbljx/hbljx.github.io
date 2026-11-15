import assert from 'node:assert/strict';
import { Runner } from '../navigation/runner-core.js';

const step = (game, seconds) => {
  for (let i = 0; i < Math.round(seconds * 120); i++) game.update(1 / 120, game.elapsed * 1000);
};
function jumpProfile(hold, fast = false) {
  const game = new Runner(); game.start(); game.jump();
  let apex = 0, duration = 0;
  do {
    if (!hold) game.jumpHeld = false;
    if (fast && duration > .12) game.duck = true;
    step(game, 1 / 120); duration += 1 / 120; apex = Math.max(apex, game.y);
  } while (game.y > 0 && duration < 2);
  return { apex, duration };
}
const tap = jumpProfile(false), hold = jumpProfile(true), fast = jumpProfile(true, true);
assert.ok(tap.apex >= 48 && hold.apex > tap.apex * 1.8);
assert.ok(fast.duration < hold.duration * .6);
console.log('PASS variable jump and fast fall', { tap, hold, fast });

const game = new Runner(() => .1); game.start();
step(game, 2.99); assert.ok(game.obstacles.every(o => !o.active));
step(game, .03); assert.equal(game.obstacles.filter(o => o.active).length, 1);
assert.equal(game.obstacles[0].kind, 'cactus');
const obstacle = game.obstacles[0]; obstacle.x = game.playerX + 15;
game.duck = true; assert.ok(game.collides(obstacle), 'crouching must not bypass a cactus');
game.duck = false; step(game, .01); assert.equal(game.state, 'over');
assert.equal(game.start(game.deadAt + 499), false);
assert.equal(game.start(game.deadAt + 500), true);
assert.equal(game.speed, 6); assert.equal(game.score, 0);
assert.ok(game.obstacles.every(o => !o.active));
console.log('PASS warmup, collision, restart delay and reset');

Object.assign(obstacle, { active: true, kind: 'bird', width: 48, height: 20, x: game.playerX + 15, bottom: 26 });
assert.ok(game.collides(obstacle)); game.duck = true; assert.equal(game.collides(obstacle), false);
obstacle.bottom = 3; assert.ok(game.collides(obstacle));
obstacle.bottom = 65; game.duck = false; assert.equal(game.collides(obstacle), false);
game.y = 80; obstacle.bottom = 3; assert.equal(game.collides(obstacle), false);
game.start(); game.score = 449; game.spawn(); assert.equal(game.obstacles[0].kind, 'cactus');
game.start(); game.score = 450; game.spawn(); assert.equal(game.obstacles[0].kind, 'bird');
for (const [score, night] of [[699, false], [700, true], [1399, true], [1400, false], [2100, true]]) {
  game.score = score; assert.equal(game.night, night);
}
game.state = 'paused'; const distance = game.distance; step(game, 10); assert.equal(game.distance, distance);
console.log('PASS bird heights/unlock, day-night cycle and pause');

// Play seeded runs through maximum speed. This tests whole obstacle sequences,
// not just individual rectangles, at both desktop and phone world widths.
for (const width of [480, 960, 1280]) {
  for (let seed = 1; seed <= 12; seed++) {
    let value = seed;
    const rng = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
    const run = new Runner(rng); run.resize(width, 240); run.start();
    for (let i = 0; i < 120 * 180; i++) {
      let next = null;
      for (const item of run.obstacles) if (item.active && item.x + item.width > run.playerX + 5 && (!next || item.x < next.x)) next = item;
      run.duck = false;
      if (next && next.x < run.playerX + 44 + run.velocity * .22) {
        if (next.kind === 'bird' && next.level === 1) run.duck = true;
        else if (next.kind !== 'bird' || next.level === 0) run.jump();
      }
      run.update(1 / 120, i * 1000 / 120);
      assert.equal(run.state, 'running', `unfair sequence: width ${width}, seed ${seed}, time ${run.elapsed}, obstacle ${JSON.stringify(next)}`);
    }
    assert.equal(run.speed, 13);
  }
  console.log(`PASS 12 seeded three-minute runs at width ${width}, including maximum speed`);
}
