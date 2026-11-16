// Original procedural pixel art. All scenery stays behind the collision plane.
export function createRunnerRenderer(ctx, runner, reduced) {
  const pageGround = getComputedStyle(ctx.canvas.closest('.home-footer') || document.documentElement).backgroundColor;
  let sky, soilFade, paintedHeight = 0, paintedNight = null;
  function rect(color, x, y, w, h) {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  }
  // Three separately lit faces give the sprites real block volume at pixel scale.
  function block(x, y, w, h, front, top, side, depth = 3) {
    x = Math.round(x); y = Math.round(y);
    rect(front, x, y, w, h);
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + depth, y - depth);
    ctx.lineTo(x + w + depth, y - depth); ctx.lineTo(x + w, y); ctx.fill();
    ctx.fillStyle = side;
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + depth, y - depth);
    ctx.lineTo(x + w + depth, y + h - depth); ctx.lineTo(x + w, y + h); ctx.fill();
  }
  function tree(x, y, size, night) {
    rect('#162c24', x - 10 * size, y - 2, 29 * size, 3);
    block(x, y - 39 * size, 7 * size, 40 * size, '#534636', '#716044', '#342e26', 2 * size);
    rect('#776044', x + 2 * size, y - 28 * size, 2 * size, 21 * size);
    block(x - 18 * size, y - 66 * size, 39 * size, 32 * size, night ? '#274a3c' : '#345a40', '#55764b', '#203d32', 5 * size);
    block(x - 12 * size, y - 77 * size, 29 * size, 17 * size, night ? '#3b6147' : '#476d48', '#668652', '#2e513b', 4 * size);
    rect('#587c4c', x - 14 * size, y - 60 * size, 8 * size, 8 * size);
    rect('#294c37', x + 8 * size, y - 54 * size, 9 * size, 7 * size);
    rect('#789254', x - 8 * size, y - 76 * size, 7 * size, 3 * size);
  }
  function portal(x, ground, night) {
    rect('#292a39', x, ground - 73, 44, 73);
    for (let y = ground - 73; y < ground; y += 10) {
      rect('#51415c', x, y, 9, 2); rect('#51415c', x + 35, y, 9, 2);
    }
    rect('#746080', x, ground - 73, 44, 3);
    rect(night ? '#8556b2' : '#765994', x + 9, ground - 64, 26, 60);
    for (let y = 0; y < 7; y++) rect(y % 2 ? '#a37ac5' : '#9263b1', x + 13 + y % 3 * 3, ground - 62 + y * 8, 13, 8);
    for (let i = 0; i < 2; i++) {
      const offset = i ? 55 : -14;
      rect('#735838', x + offset, ground - 23, 3, 23);
      rect('#d69c51', x + offset - 3, ground - 29, 9, 10);
      rect('#ffe8a3', x + offset, ground - 28, 3, 6);
      rect('#a68046', x + offset - 3, ground - 2, 9, 2);
    }
    block(x - 3, ground - 4, 50, 4, '#3e3b48', '#716079', '#252731', 2);
  }
  function dinosaur() {
    const x = Math.round(runner.playerX), foot = Math.round(runner.ground - runner.y);
    const crouching = runner.duck && runner.y === 0;
    const dead = runner.state === 'over';
    const stride = runner.state === 'running' && runner.y === 0 ? Math.floor(runner.elapsed * 12) % 2 : 0;
    const green = dead ? '#737d69' : '#4b9a65';
    const light = dead ? '#9aa58a' : '#9ad284';
    const dark = dead ? '#3b5045' : '#245940';
    const plate = dead ? '#8a967b' : '#73dfb7';
    const shadowWidth = Math.max(22, 49 - runner.y * .12);
    ctx.globalAlpha = Math.max(.12, .4 - runner.y * .002);
    rect('#050d0c', x + 25 - shadowWidth / 2, runner.ground + 1, shadowWidth, 3);
    ctx.globalAlpha = 1;
    if (crouching) {
      block(x - 10, foot - 19, 14, 5, dark, light, '#183c30', 2);
      block(x + 1, foot - 20, 14, 8, green, light, dark);
      block(x + 12, foot - 22, 29, 14, green, light, dark, 4);
      rect('#b6c68a', x + 19, foot - 12, 20, 4);
      for (let i = 0; i < 3; i++) block(x + 9 + i * 9, foot - 27, 5, 5, '#368f77', plate, '#1d584d', 2);
      block(x + 36, foot - 22, 20, 13, green, light, dark, 3);
      rect('#13382e', x + 45, foot - 20, 9, 5);
      rect('#f4c36b', x + 48, foot - 19, 4, 3); rect('#fff1bd', x + 50, foot - 19, 1, 2);
      rect('#182e24', x + 44, foot - 12, 13, 2);
      rect('#e2ddba', x + 49, foot - 12, 2, 3);
      block(x + 14, foot - 8, 7, stride ? 5 : 8, dark, green, '#163e2e', 2);
      block(x + 33, foot - 8, 7, stride ? 8 : 5, green, light, dark, 2);
      rect('#d4d0a5', x + 37, foot - (stride ? 2 : 5), 6, 2);
    } else {
      // Far leg, segmented tail, torso, neck and head are individually shaded.
      block(x + 25, foot - 14, 8, stride ? 9 : 13, dark, green, '#153b2d', 2);
      block(x - 12, foot - 31, 7, 5, dark, light, '#193f30', 2);
      block(x - 7, foot - 28, 10, 7, green, light, dark, 3);
      block(x + 1, foot - 25, 14, 10, green, light, dark, 3);
      block(x + 11, foot - 32, 22, 21, green, light, dark, 4);
      block(x + 24, foot - 39, 11, 18, green, light, dark, 3);
      for (let i = 0; i < 3; i++) block(x + 4 + i * 7, foot - 30 - i * 6, 5, 6, '#31836c', plate, '#1d5149', 2);
      rect('#bbce94', x + 26, foot - 27, 7, 15);
      rect('#8fa874', x + 26, foot - 22, 7, 2); rect('#8fa874', x + 26, foot - 16, 7, 2);
      block(x + 24, foot - 46, 22, 18, green, light, dark, 4);
      rect('#68b278', x + 27, foot - 44, 7, 3);
      rect('#386e4d', x + 27, foot - 34, 6, 3);
      rect('#173b2f', x + 36, foot - 41, 9, 7);
      rect(dead ? '#cf795f' : '#edb85c', x + 38, foot - 40, 5, 4);
      rect('#fff2b9', x + 41, foot - 40, 2, 2);
      rect(dark, x + 35, foot - 43, 11, 3);
      block(x + 34, foot - 33, 13, 6, green, '#85bd75', dark, 3);
      rect('#162e24', x + 35, foot - 29, 12, 2);
      rect('#e5e0bb', x + 38, foot - 29, 2, 3); rect('#e5e0bb', x + 44, foot - 29, 2, 3);
      rect('#1d4432', x + 45, foot - 34, 2, 2);
      block(x + 32, foot - 23, 7, 5, dark, light, '#193b2e', 2);
      rect('#d7d3ad', x + 38, foot - 20, 4, 2);
      block(x + 12, foot - 14, 9, stride ? 13 : 9, green, light, dark, 3);
      block(x + 13, foot - (stride ? 4 : 8), 12, 4, green, '#80b875', dark, 2);
      rect('#dedab3', x + 21, foot - (stride ? 2 : 6), 5, 2);
      rect('#dedab3', x + 31, foot - (stride ? 6 : 2), 5, 2);
      for (let i = 0; i < 4; i++) rect(i % 2 ? '#76b575' : '#326a4b', x + 14 + i % 2 * 6, foot - 29 + Math.floor(i / 2) * 7, 3, 3);
      if (dead) {
        rect('#20362c', x + 38, foot - 40, 2, 2); rect('#20362c', x + 42, foot - 36, 2, 2);
        rect('#20362c', x + 42, foot - 40, 2, 2); rect('#20362c', x + 38, foot - 36, 2, 2);
      }
    }
  }
  return function paint(width, height) {
    const night = runner.night, ground = runner.ground, scroll = runner.distance;
    // Both ends use the page's own background; day/night changes the interior.
    if (height !== paintedHeight || night !== paintedNight) {
      paintedHeight = height; paintedNight = night;
      sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, pageGround);
      sky.addColorStop(.35, night ? '#263e52' : '#355c67');
      sky.addColorStop(1, night ? '#304d59' : '#486e68');
      soilFade = ctx.createLinearGradient(0, height - 22, 0, height);
      soilFade.addColorStop(0, 'transparent'); soilFade.addColorStop(1, pageGround);
    }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    if (night) {
      for (let i = 0; i < 45; i++) rect('#8aab9b', ((i * 73 + 19) % 997) / 997 * width, 38 + (i * 23) % Math.max(40, ground - 130), 1, 1);
      rect('#dce6b5', width * .82, 53, 21, 21); rect('#afc2a4', width * .82 + 5, 65, 7, 5);
    } else {
      rect('#91a887', width * .82, 53, 19, 19); rect('#c5cba0', width * .82, 53, 14, 14);
      for (let i = 0; i < 5; i++) {
        const x = ((i * 271 - (reduced.matches ? 0 : scroll * .08)) % (width + 120) + width + 120) % (width + 120) - 60;
        rect('#263d3e', x, 63 + i % 2 * 30, 63, 9); rect('#263d3e', x + 14, 55 + i % 2 * 30, 32, 10);
      }
    }
    const backgroundScroll = reduced.matches ? 0 : scroll;
    for (let x = -24; x < width + 24; x += 24) {
      const sample = x + Math.floor(backgroundScroll * .12 / 24) * 24;
      const farY = ground - 72 + Math.round((Math.sin(sample * .016) + Math.sin(sample * .039)) * 12 / 6) * 6;
      rect(night ? '#203841' : '#24433f', x - backgroundScroll * .12 % 24, farY, 24, ground - farY);
      const nearY = ground - 38 + Math.round(Math.sin(sample * .028 + 2) * 12 / 6) * 6;
      rect(night ? '#28483f' : '#315440', x - backgroundScroll * .12 % 24, nearY, 24, ground - nearY);
    }
    for (let i = -1; i < Math.ceil(width / 360) + 1; i++) {
      const x = i * 360 - backgroundScroll * .22 % 360;
      tree(x + 44, ground, .78, night); tree(x + 252, ground, .48, night);
    }
    const portalX = ((width * .68 - backgroundScroll * .16) % (width + 160) + width + 160) % (width + 160) - 60;
    portal(portalX, ground, night);
    rect(night ? '#37392f' : '#424336', 0, ground, width, height - ground);
    rect(night ? '#506c42' : '#60814a', 0, ground, width, 8);
    rect(night ? '#829a59' : '#93ab62', 0, ground, width, 2);
    for (let x = -24; x < width + 24; x += 24) {
      const pos = x - scroll % 24;
      rect('#2c352c', pos + 3, ground + 15, 7, 5);
      rect('#54513a', pos + 15, ground + 25, 5, 5);
      rect('#3c5634', pos + 12, ground + 5, 5, 6);
    }
    ctx.fillStyle = soilFade; ctx.fillRect(0, height - 22, width, 22);
    for (const o of runner.obstacles) {
      if (!o.active) continue;
      const y = ground - o.height - o.bottom;
      if (o.kind === 'cactus') {
        for (let j = 0; j < o.count; j++) {
          const x = o.x + j * 22;
          rect('#244c36', x + 6, y, 13, o.height);
          rect('#559653', x + 7, y + 2, 8, o.height - 2);
          rect('#97bc67', x + 7, y + 2, 3, o.height - 4);
          rect('#356843', x + 1, y + 12, 7, 13); rect('#356843', x + 16, y + 8, 6, 13);
          rect('#78a75b', x + 1, y + 12, 3, 8);
          for (let k = 6; k < o.height; k += 10) rect('#254d35', x + 12, y + k, 3, 3);
        }
      } else {
        const flap = Math.sin(runner.elapsed * 15) > 0;
        rect('#8c709c', o.x + 11, y + 5, 25, 13);
        rect('#bca6bb', o.x + 29, y + 2, 12, 11);
        rect('#e2c68c', o.x + 40, y + 7, 8, 4);
        rect('#26303b', o.x + 36, y + 4, 2, 2);
        rect('#6a557c', o.x + 17, y + (flap ? -10 : 13), 10, 15);
        rect('#8d73a2', o.x + 9, y + (flap ? -16 : 21), 12, 8);
        rect('#665473', o.x, y + 7, 14, 5);
      }
    }
    dinosaur();
  };
}
