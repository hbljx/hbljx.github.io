// A tiny, self-contained Chrome-offline-style runner for the room screens.
// It uses one shared simulation and a pair of canvas textures sized for the
// lounge TV / standard monitors and the ultrawide desk display.
import { canvasTexture } from '@engine/world/textures.js';

const HEIGHT = 180;
const GROUND = 148;
const PARTY_COLORS = ['#ee7184', '#f2c75e', '#68a8a0', '#8d83c1'];

export function createDinoRunner() {
  const obstacles = Array.from({ length: 5 }, () => ({ distance: 0, active: false, variant: 0 }));
  const cakes = Array.from({ length: 2 }, () => ({ distance: 0, active: false }));
  const state = {
    time: 0, score: 0, speed: 132, groundOffset: 0,
    nextObstacle: 180, nextCake: 620,
    jumpAge: 2, jumping: false, jumpCount: 0, partyHat: false, partyTime: 0, cakeCount: 0,
    random: 481516, drawClock: 0,
  };
  const standard = canvasTexture(320, HEIGHT, () => {});
  const ultrawide = canvasTexture(480, HEIGHT, () => {});
  // atlasPlanes must leave these source canvases intact: it snapshots regular
  // decorative art into one static atlas and disposes the original textures.
  standard.userData.dynamic = true;
  ultrawide.userData.dynamic = true;
  const textures = [standard, ultrawide];
  let running = false, lastFrame = 0;

  function random() {
    state.random = (state.random * 1664525 + 1013904223) >>> 0;
    return state.random / 4294967296;
  }

  function update(dt) {
    state.time += dt;
    state.speed = Math.min(176, 132 + state.time * 1.05);
    state.score += dt * state.speed * 0.1;
    state.groundOffset = (state.groundOffset + state.speed * dt) % 48;
    if (state.partyTime > 0) state.partyTime = Math.max(0, state.partyTime - dt);

    state.nextObstacle -= state.speed * dt;
    if (state.nextObstacle <= 0) {
      for (let i = 0; i < obstacles.length; i++) {
        if (obstacles[i].active) continue;
        obstacles[i].active = true;
        obstacles[i].distance = 350;
        obstacles[i].variant = random() < 0.5 ? 0 : 1;
        break;
      }
      state.nextObstacle = 300 + random() * 150;
    }
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      if (!obstacle.active) continue;
      obstacle.distance -= state.speed * dt;
      if (obstacle.distance < -42) obstacle.active = false;
      if (!state.jumping && obstacle.distance > 0 && obstacle.distance < 92) {
        state.jumping = true;
        state.jumpAge = 0;
        state.jumpCount++;
      }
    }
    if (state.jumping) {
      state.jumpAge += dt;
      if (state.jumpAge >= 0.96) {
        state.jumping = false;
        state.jumpAge = 0;
      }
    }

    state.nextCake -= state.speed * dt;
    if (state.nextCake <= 0) {
      for (let i = 0; i < cakes.length; i++) {
        if (cakes[i].active) continue;
        cakes[i].active = true;
        cakes[i].distance = 380;
        break;
      }
      state.nextCake = 760 + random() * 380;
    }
    for (let i = 0; i < cakes.length; i++) {
      const cake = cakes[i];
      if (!cake.active) continue;
      cake.distance -= state.speed * dt;
      if (cake.distance < -30) cake.active = false;
      if (cake.active && cake.distance <= 13) {
        cake.active = false;
        state.partyHat = true;
        state.partyTime = 1.6;
        state.cakeCount++;
      }
    }

    state.drawClock += dt;
    if (state.drawClock >= 1 / 12) {
      state.drawClock %= 1 / 12;
      for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];
        draw(texture.image.getContext('2d'), texture.image.width, texture.image.height);
        if (texture.userData.updateAtlas) texture.userData.updateAtlas();
        else texture.needsUpdate = true;
      }
    }
  }

  function animate(now) {
    if (!running) return;
    let remaining = Math.min(1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    // Keep game time in step with real time on a busy 3D scene. Small steps
    // preserve obstacle-jump detection even if the display misses a few frames.
    while (remaining > 0) {
      const dt = Math.min(1 / 30, remaining);
      update(dt);
      remaining -= dt;
    }
    requestAnimationFrame(animate);
  }

  function start() {
    if (running) return;
    running = true;
    lastFrame = performance.now();
    requestAnimationFrame(animate);
  }

  function draw(ctx, width, height) {
    const scale = height / HEIGHT, w = width / scale;
    const ground = GROUND, runnerX = w * 0.16;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#f7f7f4'; ctx.fillRect(0, 0, w, HEIGHT);

    // Quiet block clouds and distant pixel hills keep the screens lively while
    // the classic pale Chrome-game palette stays easy to read from the sofa.
    const cloudShift = (state.time * 5) % (w + 100);
    for (let i = 0; i < 3; i++) {
      const cx = ((i * (w / 3) + 32 - cloudShift + w + 100) % (w + 100)) - 40;
      const cy = 35 + (i % 2) * 17;
      ctx.fillStyle = '#e5e9e4';
      ctx.fillRect(cx, cy + 5, 28, 5); ctx.fillRect(cx + 5, cy, 15, 5); ctx.fillRect(cx + 20, cy + 5, 8, 5);
    }
    ctx.fillStyle = '#eceee9';
    for (let i = 0; i < 8; i++) {
      const hx = i * 74 - (state.groundOffset * 0.2) % 74;
      ctx.fillRect(hx, 122, 21, 3); ctx.fillRect(hx + 8, 118, 23, 4); ctx.fillRect(hx + 23, 122, 16, 3);
    }

    ctx.fillStyle = '#555e5b';
    ctx.font = 'bold 9px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('DINO RUN', 12, 10);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE ${String(Math.floor(state.score)).padStart(5, '0')}`, w - 12, 10);
    ctx.textAlign = 'left';

    // The ground is continuous; only its little pixel marks scroll past.
    ctx.fillStyle = '#6e7773'; ctx.fillRect(0, ground, w, 2);
    ctx.fillStyle = '#9ca29e';
    for (let x = -state.groundOffset; x < w; x += 48) {
      ctx.fillRect(x + 9, ground + 7, 11, 2); ctx.fillRect(x + 32, ground + 4, 4, 2);
    }

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      if (!obstacle.active) continue;
      const x = runnerX + obstacle.distance;
      if (x < -30 || x > w + 24) continue;
      drawCactus(ctx, x, ground, obstacle.variant);
    }
    for (let i = 0; i < cakes.length; i++) {
      const cake = cakes[i];
      if (!cake.active) continue;
      const x = runnerX + cake.distance;
      if (x < -24 || x > w + 24) continue;
      drawCake(ctx, x, ground - 3);
    }

    const jump = state.jumping ? Math.sin(Math.PI * state.jumpAge / 0.96) * 52 : 0;
    drawDinosaur(ctx, runnerX, ground - jump, state.time, state.partyHat);
    if (state.partyTime > 0) drawPartyBits(ctx, runnerX, ground - jump - 36, state.partyTime);
    ctx.restore();
  }

  function drawCactus(ctx, x, ground, variant) {
    const green = '#64866b', dark = '#52765d';
    const h = variant ? 35 : 29;
    ctx.fillStyle = dark; ctx.fillRect(Math.round(x), ground - h, 4, h);
    ctx.fillStyle = green; ctx.fillRect(Math.round(x) + 4, ground - h + 3, 6, h - 3);
    ctx.fillRect(Math.round(x) - 5, ground - 20, 5, 4); ctx.fillRect(Math.round(x) - 5, ground - 27, 4, 9);
    ctx.fillRect(Math.round(x) + 10, ground - 16, 5, 4); ctx.fillRect(Math.round(x) + 11, ground - 23, 4, 9);
    if (variant) { ctx.fillRect(Math.round(x) + 15, ground - 12, 4, 12); ctx.fillRect(Math.round(x) + 15, ground - 16, 7, 4); }
  }

  function drawCake(ctx, x, ground) {
    x = Math.round(x);
    // A little frosted pixel cake with one candle, placed right on the route.
    ctx.fillStyle = '#a66e59'; ctx.fillRect(x, ground - 17, 19, 14);
    ctx.fillStyle = '#e6a58e'; ctx.fillRect(x, ground - 19, 19, 5);
    ctx.fillRect(x + 2, ground - 14, 3, 3); ctx.fillRect(x + 10, ground - 12, 3, 3); ctx.fillRect(x + 16, ground - 15, 3, 3);
    ctx.fillStyle = '#fff0cb'; ctx.fillRect(x + 8, ground - 25, 3, 6);
    ctx.fillStyle = '#f3c65f'; ctx.fillRect(x + 8, ground - 28, 3, 3);
  }

  function drawDinosaur(ctx, x, ground, time, partyHat) {
    x = Math.round(x); const y = Math.round(ground - 38);
    const ink = '#414b4d';
    ctx.fillStyle = ink;
    // Tail, body, neck, head, muzzle, little arm.
    ctx.fillRect(x + 1, y + 22, 10, 5); ctx.fillRect(x + 5, y + 19, 7, 5);
    ctx.fillRect(x + 10, y + 13, 23, 17); ctx.fillRect(x + 23, y + 7, 9, 14);
    ctx.fillRect(x + 22, y + 1, 17, 13); ctx.fillRect(x + 32, y + 8, 10, 7);
    ctx.fillRect(x + 23, y + 17, 8, 3);
    ctx.fillStyle = '#f7f7f4'; ctx.fillRect(x + 31, y + 4, 3, 3);
    ctx.fillStyle = '#30383a'; ctx.fillRect(x + 32, y + 5, 2, 2);
    const step = Math.floor(time * 13) % 2;
    ctx.fillStyle = ink;
    if (state.jumping) {
      ctx.fillRect(x + 13, y + 27, 6, 8); ctx.fillRect(x + 25, y + 27, 6, 8);
      ctx.fillRect(x + 10, y + 33, 10, 3); ctx.fillRect(x + 23, y + 33, 10, 3);
    } else if (step) {
      ctx.fillRect(x + 13, y + 27, 6, 8); ctx.fillRect(x + 24, y + 26, 6, 6);
      ctx.fillRect(x + 9, y + 33, 10, 3); ctx.fillRect(x + 23, y + 30, 10, 3);
    } else {
      ctx.fillRect(x + 13, y + 26, 6, 6); ctx.fillRect(x + 24, y + 27, 6, 8);
      ctx.fillRect(x + 9, y + 30, 10, 3); ctx.fillRect(x + 23, y + 33, 10, 3);
    }
    if (partyHat) {
      // Three stair-stepped bands form a bright party cone that follows the head.
      ctx.fillStyle = '#ee7184'; ctx.fillRect(x + 26, y - 5, 4, 3); ctx.fillRect(x + 24, y - 2, 8, 3);
      ctx.fillStyle = '#f2c75e'; ctx.fillRect(x + 23, y + 1, 11, 3);
      ctx.fillStyle = '#68a8a0'; ctx.fillRect(x + 24, y - 2, 3, 3);
      ctx.fillStyle = '#fff0cb'; ctx.fillRect(x + 27, y - 8, 3, 3);
    }
  }

  function drawPartyBits(ctx, x, y, age) {
    for (let i = 0; i < 4; i++) {
      const rise = (1.6 - age) * (10 + i * 3);
      ctx.fillStyle = PARTY_COLORS[i];
      ctx.fillRect(Math.round(x + (i - 1.5) * 11), Math.round(y - rise + (i % 2) * 4), 3, 3);
    }
  }

  // Redraw once up front so the screens have artwork before the first frame.
  for (let i = 0; i < textures.length; i++) {
    const texture = textures[i];
    draw(texture.image.getContext('2d'), texture.image.width, texture.image.height);
    texture.needsUpdate = true;
  }
  return {
    standard, ultrawide, update, start,
    status() { return { score: Math.floor(state.score), jumping: state.jumping, jumpCount: state.jumpCount, partyHat: state.partyHat, cakeCount: state.cakeCount }; },
  };
}
