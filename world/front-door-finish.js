import * as THREE from 'three';

// Draw the gold characters as strokes so the carving is independent of installed fonts.
const SHI_RADICAL = 'M2.7 1.4l1.5 1.5 M1.2 5h5L4.5 7.8 1 11 M3.8 8.5v7 M4.7 8.4l1.6 1.7';
const FRONT_DOOR_GLYPHS = {
  禄: SHI_RADICAL + ' M7.8 1.6h6.6v5.8 M8.1 4.5h6.3 M7.1 7.4h8.4 M11.2 7.4v7q0 1.5-2 1 M7.7 9.2l1.8 1.3 M10.1 11.6l-3.3 2.7 M14.8 9.2l-2.4 1.9q1.3 2 3.4 3.4',
  福: SHI_RADICAL + ' M7.2 1.7h8.1 M8.2 4.2h6.1v3.1H8.2z M7.2 9.7h8.1v5.8H7.2z M11.2 9.7v5.8 M7.2 12.6h8.1',
  寿: 'M3.2 2.9h10.2 M4.1 5.3h8.5 M1.3 7.7h14.2 M8.5 1q-.7 8.1-7.3 12.9 M6.2 10.6h8.7 M12.4 8.7v5.7q0 1.7-2.4 1.1 M7.5 12.4l1.5 1.6',
};

function drawRedLacquer(ctx) {
  const gold = ctx.createLinearGradient(0, 8, 128, 120);
  gold.addColorStop(0, '#ffe4a0');
  gold.addColorStop(0.5, '#b97824');
  gold.addColorStop(1, '#ffd278');
  const colors = { base: '#971d26', grain: '#a92730', panel: '#b52a34', trim: gold, detail: '#ffe1a0' };
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, 128, 128);

  // Fine vertical grain keeps the lacquered timber visible beneath the carving.
  for (let x = 3; x < 128; x += 7) {
    ctx.fillStyle = x % 2 ? colors.grain : colors.base;
    ctx.fillRect(x, 0, 1, 128);
  }

  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 8, 108, 112);

  // Shaded brass studs sit in the red band around each leaf.
  const stud = ctx.createRadialGradient(-0.6, -0.7, 0.1, 0, 0, 2.3);
  stud.addColorStop(0, '#fff0be');
  stud.addColorStop(0.48, '#efbd60');
  stud.addColorStop(1, '#804611');
  ctx.fillStyle = stud;
  for (const [xs, ys] of [
    [[18, 29, 40, 51, 64, 77, 88, 99, 110], [4, 124]],
    [[5, 123], [16, 28, 40, 52, 64, 76, 88, 100, 112]],
  ]) {
    for (const x of xs) {
      for (const y of ys) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, 2.3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.strokeStyle = colors.grain;
  ctx.lineWidth = 1;
  ctx.strokeRect(15, 13, 98, 102);
  ctx.fillStyle = colors.panel;
  ctx.fillRect(19, 17, 90, 94);
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(19, 17, 90, 94);

  // Recessed moldings and stepped corner inlays frame the carved panel.
  ctx.strokeStyle = colors.base;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(22, 20, 84, 88);
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 0.7;
  ctx.strokeRect(24, 22, 80, 84);
  const corner = new Path2D('M0 16V0h16 M3 13V3h10 M6 10V6h4v4H6');
  for (const [x, sx] of [[26, 1], [102, -1]]) {
    for (const [y, sy] of [[24, 1], [104, -1]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      ctx.stroke(corner);
      ctx.restore();
    }
  }

  // Mirrored botanical scrollwork gives the entrance a carved, formal center.
  ctx.save();
  ctx.translate(128, 0);
  ctx.scale(-1, 1);
  const drawScroll = () => {
    ctx.beginPath();
    ctx.moveTo(64, 27);
    ctx.bezierCurveTo(48, 35, 49, 48, 64, 54);
    ctx.bezierCurveTo(80, 60, 80, 72, 64, 81);
    ctx.bezierCurveTo(52, 88, 53, 98, 64, 103);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 39);
    ctx.bezierCurveTo(53, 33, 42, 35, 39, 43);
    ctx.bezierCurveTo(36, 50, 44, 54, 49, 49);
    ctx.moveTo(64, 66);
    ctx.bezierCurveTo(76, 58, 88, 61, 90, 69);
    ctx.bezierCurveTo(92, 77, 83, 80, 79, 74);
    ctx.moveTo(64, 91);
    ctx.bezierCurveTo(53, 84, 43, 87, 42, 94);
    ctx.bezierCurveTo(41, 101, 50, 103, 54, 98);
    ctx.stroke();
  };
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 2;
  drawScroll();
  ctx.restore();
  ctx.strokeStyle = colors.detail;
  ctx.lineWidth = 1;
  drawScroll();

  // Paired leaves with engraved veins follow the mirrored vines.
  const leaf = new Path2D('M0 0Q1-6 7-7Q6-2 0 0L5-5');
  ctx.strokeStyle = colors.trim;
  ctx.lineWidth = 0.8;
  for (const [x, y] of [[42, 59], [47, 79], [51, 32]]) {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(64 + side * (64 - x), y);
      ctx.scale(-side, 1);
      ctx.stroke(leaf);
      ctx.restore();
    }
  }

  // Small blossoms fill the open space beside the character medallions.
  const blossom = new Path2D('M0-1Q-3-6 0-6Q3-6 0-1Q5-4 6-1Q7 2 1 1Q4 5 2 6Q-1 7 0 2Q-2 7-4 5Q-6 3-1 1Q-7 1-6-2Q-5-4 0-1Z');
  ctx.strokeStyle = colors.detail;
  ctx.lineWidth = 0.75;
  for (const x of [34, 94]) {
    for (const y of [51, 77]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.stroke(blossom);
      ctx.restore();
    }
  }

  // The two leaves share a vertical arrangement with 福 at the panel center.
  for (const [character, y] of [['禄', 38], ['福', 64], ['寿', 90]]) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(64, y, 11.5, 0, 2 * Math.PI);
    ctx.fillStyle = colors.base;
    ctx.fill();
    ctx.strokeStyle = colors.trim;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(64, y, 10, 0, 2 * Math.PI);
    ctx.lineWidth = 0.55;
    ctx.stroke();

    ctx.save();
    ctx.translate(64 - 8.4, y - 8.4);
    ctx.strokeStyle = colors.detail;
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(FRONT_DOOR_GLYPHS[character]));
    ctx.restore();
  }

  ctx.fillStyle = colors.detail;
  for (const y of [24, 104]) {
    ctx.beginPath();
    ctx.moveTo(64, y - 3);
    ctx.lineTo(67, y);
    ctx.lineTo(64, y + 3);
    ctx.lineTo(61, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = colors.base;
  ctx.fillRect(97, 58, 9, 14);
  ctx.strokeStyle = colors.trim;
  ctx.strokeRect(97.5, 58.5, 8, 13);
  ctx.strokeStyle = colors.detail;
  ctx.beginPath();
  ctx.ellipse(101.5, 65.5, 2.3, 4, 0, 0, 2 * Math.PI);
  ctx.stroke();
}


// Each tile is centered at the origin and drawn as engraved linework.
const FINISHES = [
  // Jade ruyi clouds
  { palette: ['#123b32', '#287961', '#ecce83'], step: 18,
    motif: 'M-8 3C-8-1-4-3-1-1C-2-7 7-7 7-2Q10 3 5 4H-6 M-5 1H2Q5 1 4-2' },
  // Indigo seigaiha waves
  { palette: ['#122741', '#285381', '#bcd9eb'], step: 20, stagger: true,
    motif: 'M-10 5a10 10 0 0 1 20 0 M-7 5a7 7 0 0 1 14 0 M-4 5a4 4 0 0 1 8 0 M-1 5a1 1 0 0 1 2 0' },
  // Walnut herringbone
  { palette: ['#372019', '#86533a', '#e9bb80'], step: 20,
    motif: 'M-10-9L0 1 10-9 M-10-5L0 5 10-5 M-10-1L0 9 10-1 M-7 5l4 4 M7 5l-4 4' },
  // Ivory plum blossom
  { palette: ['#806555', '#f0dfc4', '#853e4d'], step: 22, stagger: true,
    motif: 'M0-2C-7-6 1-12 3-5L2-1C9-6 12 2 5 3L2 2C8 9 0 12-2 5L-2 2C-9 6-12-1-5-3L-2-2Z M0-3V3 M-3 0H3' },
  // Graphite Art Deco fan
  { palette: ['#151922', '#414957', '#f7d38d'], step: 22,
    motif: 'M0 10L-10-3-6-6 0-9 6-6 10-3Z M0 10L-6-6 M0 10V-9 M0 10L6-6 M-8 0L0-4 8 0' },
  // Mulberry lotus
  { palette: ['#352139', '#794c73', '#f1b8b3'], step: 22, stagger: true,
    motif: 'M0 7Q-7 2 0-9Q7 2 0 7Q-9 6-10-2Q-5-2-2 3 M0 7Q9 6 10-2Q5-2 2 3 M0-5V4 M-5 9H5' },
  // Copper sunburst
  { palette: ['#502516', '#b1643e', '#ffe0a1'], step: 20,
    motif: 'M4 0a4 4 0 1 0-8 0a4 4 0 1 0 8 0 M0-9v3 M0 6v3 M-9 0h3 M6 0h3 M-6-6l2 2 M4 4l2 2 M6-6L4-4 M-4 4l-2 2' },
  // Teal interlocking lattice
  { palette: ['#102e36', '#276571', '#b9e2d4'], step: 20,
    motif: 'M0-10L10 0 0 10-10 0Z M0-6L6 0 0 6-6 0Z M-10-10v4h4v-4 M10 10V6H6v4 M0-2v4 M-2 0h4' },
  // Moss fern fronds
  { palette: ['#30371c', '#667044', '#f0d69d'], step: 24, stagger: true,
    motif: 'M-8 8Q-1 1 7-9 M-6 6Q-9 1-6-2Q-3 2-6 6 M-2 2Q-6-4-1-6Q1-2-2 2 M2-3Q1-9 5-10Q6-6 2-3 M-6 6Q1 3 3 7Q-2 10-6 6 M-2 2Q4-2 7 2Q2 5-2 2 M2-3Q6-8 10-5Q8-1 2-3' },
];

const FINISH_COUNT = FINISHES.length + 1;
const FINISH_KEY = 'homecraft-front-door-finish';
let lastFinish = -1;

function nextFinish() {
  let previous = lastFinish;
  try {
    const stored = localStorage.getItem(FINISH_KEY);
    if (stored !== null) previous = Number(stored);
  } catch {}
  lastFinish = Number.isInteger(previous) && previous >= 0 && previous < FINISH_COUNT
    ? (previous + 1) % FINISH_COUNT
    : Math.floor(Math.random() * FINISH_COUNT);
  try { localStorage.setItem(FINISH_KEY, String(lastFinish)); } catch {}
  return lastFinish;
}

function drawEngravedPanel(ctx, { palette: [shadow, panel, metal], motif, step, stagger }) {
  const grain = ctx.createLinearGradient(0, 0, 128, 128);
  grain.addColorStop(0, panel);
  grain.addColorStop(0.6, shadow);
  grain.addColorStop(1, panel);
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, 128, 128);

  ctx.lineWidth = 1;
  ctx.strokeStyle = metal;
  ctx.strokeRect(5, 5, 118, 118);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(8, 8, 112, 112);
  const bead = new Path2D('M0-2L2 0 0 2-2 0Z');
  ctx.fillStyle = metal;
  for (const x of [12, 116]) {
    for (let y = 13; y < 120; y += 8.5) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fill(bead);
      ctx.restore();
    }
  }

  for (const [top, height] of [[13, 72], [91, 24]]) {
    ctx.fillStyle = shadow;
    ctx.fillRect(16, top, 96, height);
    ctx.fillStyle = panel;
    ctx.fillRect(19, top + 3, 90, height - 6);
    ctx.save();
    ctx.beginPath();
    ctx.rect(19, top + 3, 90, height - 6);
    ctx.clip();

    // Offset the grain strokes so the surface catches light unevenly.
    ctx.lineWidth = 0.4;
    for (let x = 18; x < 110; x += 1.65) {
      ctx.strokeStyle = x % 3 < 1.5 ? shadow : metal;
      ctx.globalAlpha = 0.13 + 0.12 * Math.sin(x * 1.7);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.bezierCurveTo(x + 2, top + height / 3, x - 2, top + height * 2 / 3, x + 1, top + height);
      ctx.stroke();
    }

    const tile = new Path2D(motif);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let row = 0; row * step <= height; row++) {
      for (let x = 24 - step; x <= 112; x += step) {
        ctx.save();
        ctx.translate(x + (stagger && row % 2 ? step / 2 : 0), top + 8 + row * step);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = shadow;
        ctx.lineWidth = 1.5;
        ctx.stroke(tile);
        ctx.translate(0, -0.5);
        ctx.strokeStyle = metal;
        ctx.lineWidth = 0.65;
        ctx.stroke(tile);
        ctx.restore();
      }
    }
    ctx.restore();
    ctx.strokeStyle = metal;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(16, top, 96, height);
  }

  // A small inset brass pull sits near the meeting edge of each leaf.
  ctx.fillStyle = shadow;
  ctx.fillRect(99, 56, 10, 19);
  ctx.strokeStyle = metal;
  ctx.strokeRect(99.5, 56.5, 9, 18);
  ctx.lineWidth = 1.5;
  ctx.stroke(new Path2D('M104 59C100 62 100 69 104 72C108 69 108 62 104 59Z'));
}

export function frontDoorGeometry(unitBox) {
  const geometry = unitBox.clone();
  const { normal, uv } = geometry.attributes;
  for (let i = 0; i < uv.count; i++) {
    // Align the pulls with the meeting stile on both sides of the entrance.
    if (normal.getZ(i) < 0) uv.setX(i, 1 - uv.getX(i));
    // Sample the outer rim on the thin edges instead of squeezing the inlay.
    if (normal.getX(i) !== 0) uv.setX(i, 0);
    if (normal.getY(i) !== 0) uv.setY(i, 0);
  }
  return geometry;
}

export function makeFrontDoorMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.anisotropy = 4;

  const redraw = () => {
    const finish = nextFinish();
    ctx.save();
    if (finish === 0) drawRedLacquer(ctx);
    else drawEngravedPanel(ctx, FINISHES[finish - 1]);
    ctx.restore();
    texture.needsUpdate = true;
  };
  redraw();
  // A history-cache restore re-enters the scene without rebuilding its meshes.
  addEventListener('pageshow', event => {
    if (event.persisted) redraw();
  });
  return new THREE.MeshLambertMaterial({ map: texture });
}
