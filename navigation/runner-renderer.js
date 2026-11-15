// Original procedural pixel art. All scenery stays behind the collision plane.
export function createRunnerRenderer(ctx, runner, reduced) {
  function rect(color, x, y, w, h) {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  }
  function tree(x, y, size, night) {
    rect(night ? '#4f4435' : '#71543c', x, y - 38 * size, 7 * size, 38 * size);
    rect(night ? '#284e40' : '#557346', x - 18 * size, y - 66 * size, 44 * size, 32 * size);
    rect(night ? '#3b6147' : '#6d8c50', x - 12 * size, y - 77 * size, 31 * size, 17 * size);
    rect(night ? '#55764e' : '#91aa62', x - 9 * size, y - 77 * size, 18 * size, 5 * size);
    rect(night ? '#345b43' : '#62854b', x - 18 * size, y - 63 * size, 10 * size, 20 * size);
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
    }
  }
  function dinosaur() {
    const x = runner.playerX, foot = runner.ground - runner.y;
    const crouching = runner.duck && runner.y === 0;
    const leg = runner.state === 'running' && runner.y === 0 ? Math.floor(runner.elapsed * 13) % 2 * 5 : 0;
    const green = runner.state === 'over' ? '#a9aa8a' : '#a8cf74';
    const dark = runner.state === 'over' ? '#626b58' : '#53804d';
    ctx.globalAlpha = .25; rect('#091812', x + 4, runner.ground + 2, 48, 3); ctx.globalAlpha = 1;
    if (crouching) {
      rect(dark, x - 1, foot - 21, 19, 9);
      rect(green, x + 10, foot - 24, 33, 16);
      rect(green, x + 37, foot - 22, 20, 15);
      rect('#d9edab', x + 14, foot - 24, 28, 4);
      rect('#172b23', x + 49, foot - 19, 3, 3);
      rect(dark, x + 14, foot - 8, 7, 8 - leg);
      rect(dark, x + 34, foot - 8, 7, 3 + leg);
    } else {
      rect(dark, x - 3, foot - 29, 8, 10); rect(dark, x + 2, foot - 24, 15, 10);
      rect(green, x + 10, foot - 31, 25, 22);
      rect(green, x + 24, foot - 46, 23, 23);
      rect('#d7eba9', x + 24, foot - 46, 23, 5);
      rect('#c1dd8a', x + 29, foot - 29, 18, 5);
      rect('#172b23', x + 39, foot - 39, 4, 4);
      rect(dark, x + 36, foot - 29, 11, 2);
      rect('#d7eba9', x + 25, foot - 23, 7, 13);
      rect(dark, x + 33, foot - 22, 8, 5);
      rect(dark, x + 12, foot - 11, 8, 11 - leg);
      rect(dark, x + 26, foot - 11, 8, 6 + leg);
      rect(green, x + 12, foot - 3 - leg, 12, 3);
      rect(green, x + 26, foot - 8 + leg, 12, 3);
      if (runner.state === 'over') {
        rect('#1c2a25', x + 38, foot - 40, 2, 2); rect('#1c2a25', x + 42, foot - 36, 2, 2);
        rect('#1c2a25', x + 42, foot - 40, 2, 2); rect('#1c2a25', x + 38, foot - 36, 2, 2);
      }
    }
  }
  return function paint(width, height) {
    const night = runner.night, ground = runner.ground, scroll = runner.distance;
    rect(night ? '#101d28' : '#b7cabb', 0, 0, width, height);
    rect(night ? '#182f39' : '#c8d5be', 0, height * .45, width, height * .55);
    if (night) {
      for (let i = 0; i < 45; i++) rect('#b6cbb1', (i * 137 + 29) % width, 38 + (i * 23) % Math.max(40, ground - 130), 1, 1);
      rect('#dce6b5', width * .82, 53, 21, 21); rect('#afc2a4', width * .82 + 5, 65, 7, 5);
    } else {
      rect('#f4e6ad', width * .82, 53, 23, 23); rect('#fff0bf', width * .82, 53, 18, 18);
      for (let i = 0; i < 5; i++) {
        const x = ((i * 271 - (reduced.matches ? 0 : scroll * .08)) % (width + 120) + width + 120) % (width + 120) - 60;
        rect('#e3e9d4', x, 63 + i % 2 * 30, 63, 9); rect('#e3e9d4', x + 14, 55 + i % 2 * 30, 32, 10);
      }
    }
    const backgroundScroll = reduced.matches ? 0 : scroll;
    for (let x = -24; x < width + 24; x += 24) {
      const sample = x + Math.floor(backgroundScroll * .12 / 24) * 24;
      const farY = ground - 72 + Math.round((Math.sin(sample * .016) + Math.sin(sample * .039)) * 12 / 6) * 6;
      rect(night ? '#24454b' : '#829b7c', x - backgroundScroll * .12 % 24, farY, 24, ground - farY);
      const nearY = ground - 38 + Math.round(Math.sin(sample * .028 + 2) * 12 / 6) * 6;
      rect(night ? '#305448' : '#6b8966', x - backgroundScroll * .12 % 24, nearY, 24, ground - nearY);
    }
    for (let i = -1; i < Math.ceil(width / 360) + 1; i++) {
      const x = i * 360 - backgroundScroll * .22 % 360;
      tree(x + 44, ground - 12, .78, night); tree(x + 252, ground - 10, .48, night);
    }
    const portalX = ((width * .68 - backgroundScroll * .16) % (width + 160) + width + 160) % (width + 160) - 60;
    portal(portalX, ground - 11, night);
    rect(night ? '#494435' : '#77654b', 0, ground, width, height - ground);
    rect(night ? '#638049' : '#779b4e', 0, ground, width, 8);
    rect(night ? '#98b165' : '#b1c97b', 0, ground, width, 3);
    for (let x = -24; x < width + 24; x += 24) {
      const pos = x - scroll % 24;
      rect(night ? '#34392e' : '#60523e', pos + 3, ground + 15, 7, 5);
      rect(night ? '#61533b' : '#8c7654', pos + 15, ground + 25, 5, 5);
      rect(night ? '#344b35' : '#506c38', pos + 12, ground + 5, 5, 6);
    }
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
