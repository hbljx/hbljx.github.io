// Two quiet, material-based trails for the journal and the projects/time chapter.
// Reuse a bounded pool on the shared pointer canvas; never add DOM nodes per move.
const glyphs = [
  [[[0, 0], [-2, 7], [-4, 14], [1, 15], [8, 13]]],
  [[[2, 5], [0, 13], [4, 12]], [[4, 0], [4.5, .5]]],
  [[[0, 8], [10, 8]], [[5, 3], [5, 13]]],
  [[[0, 11], [4, 5], [8, 4], [7, 11], [3, 14], [0, 11], [9, 10], [13, 6]]],
].map(strokes => strokes.map(points => ({
  points,
  length: points.slice(1).reduce((sum, point, i) =>
    sum + Math.hypot(point[0] - points[i][0], point[1] - points[i][1]), 0),
})));

const gear = new Path2D();
for (let i = 0; i < 48; i++) {
  const angle = i * Math.PI / 24, radius = i % 4 < 2 ? 10 : 7.5;
  const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
  if (i === 0) gear.moveTo(x, y); else gear.lineTo(x, y);
}
gear.closePath();

export function createAboutPointerEffects(ctx) {
  const marks = Array.from({ length: 24 }, () => ({ life: 0 }));
  let index = 0, serial = 0, lastX = 0, lastY = 0, lastAt = -Infinity;

  function reset() {
    for (const mark of marks) mark.life = 0;
    index = serial = 0;
    lastAt = -Infinity;
  }

  function move(mode, x, y, now) {
    const distance = Math.hypot(x - lastX, y - lastY);
    if (now - lastAt < 36 || (distance < (mode === 'journal' ? 25 : 32) && now - lastAt < 240)) return;
    // A pause starts a fresh stroke instead of connecting unrelated positions.
    const angle = now - lastAt > 240 ? 0 : Math.atan2(y - lastY, x - lastX);
    const side = serial % 2 ? 1 : -1;
    const mark = marks[index];
    Object.assign(mark, {
      x: x + (mode === 'journal' ? 9 : -Math.sin(angle) * side * 9),
      y: y + (mode === 'journal' ? 13 : Math.cos(angle) * side * 9),
      angle, side, glyph: serial % glyphs.length, t: now,
      life: mode === 'journal' ? 1000 : 900,
    });
    index = (index + 1) % marks.length;
    serial++;
    lastX = x; lastY = y; lastAt = now;
  }

  function stroke({ points, length }, progress) {
    let remaining = length * Math.max(0, Math.min(1, progress));
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length && remaining > 0; i++) {
      const a = points[i - 1], b = points[i];
      const segment = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ratio = Math.min(1, remaining / segment);
      ctx.lineTo(a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio);
      remaining -= segment;
    }
    ctx.stroke();
  }

  function draw(mode, now) {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const mark of marks) {
      if (!mark.life) continue;
      const age = now - mark.t, t = age / mark.life;
      if (t >= 1) { mark.life = 0; continue; }
      const fade = Math.min(1, age / 70) * Math.pow(1 - t, 1.3);
      ctx.save();
      ctx.translate(mark.x, mark.y - (mode === 'journal' ? t * 3 : 0));
      if (mode === 'journal') {
        // Separated pen strokes write themselves; no continuous ribbon or glow.
        ctx.rotate(Math.max(-.24, Math.min(.24, Math.sin(mark.angle) * .24)));
        ctx.globalAlpha = fade * .82;
        ctx.strokeStyle = '#ead7ac';
        ctx.lineWidth = 1.7;
        glyphs[mark.glyph].forEach((path, i) => stroke(path, (age - i * 65) / 165));
      } else {
        // Alternating gears briefly turn into place beside tiny engraved ticks.
        ctx.rotate(mark.angle);
        ctx.globalAlpha = fade * .66;
        ctx.strokeStyle = '#cfba82';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-7, 16); ctx.lineTo(-7, 20);
        ctx.moveTo(0, 16); ctx.lineTo(0, 23);
        ctx.moveTo(7, 16); ctx.lineTo(7, 20);
        ctx.stroke();
        ctx.rotate(mark.side * (1 - Math.pow(1 - Math.min(1, age / 320), 3)) * .85);
        ctx.globalAlpha = fade * .78;
        ctx.fillStyle = '#263b33';
        ctx.strokeStyle = '#d4af72';
        ctx.lineWidth = 1.3;
        ctx.fill(gear); ctx.stroke(gear);
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#9dbdb0';
        ctx.fillRect(-1, -6, 2, 2);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  return { move, draw, reset };
}
