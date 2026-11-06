import { SUBMARINE_HOME } from './layout.js';

// A deep-sea ellipse encloses the landmark field and stays west of transit.
export const PATROL_BOUNDS = Object.freeze({ cx: -485, cz: 415, rx: 210, rz: 180, x0: -695, x1: -275, z0: 235, z1: 595, depth: 300 });
const { cx, cz, rx, rz, depth } = PATROL_BOUNDS;
const SEGMENTS = 512;
const distances = new Float64Array(SEGMENTS + 1);
for (let i = 1; i <= SEGMENTS; i++) {
  const a = (i - 1) * Math.PI * 2 / SEGMENTS, b = i * Math.PI * 2 / SEGMENTS;
  distances[i] = distances[i - 1] + Math.hypot(rx * (Math.cos(b) - Math.cos(a)), rz * (Math.sin(b) - Math.sin(a)));
}
export const PATROL_LENGTH = distances[SEGMENTS];

export function samplePatrol(distance, out) {
  const s = ((distance % PATROL_LENGTH) + PATROL_LENGTH) % PATROL_LENGTH;
  let lo = 0, hi = SEGMENTS;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (distances[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = lo * Math.PI * 2 / SEGMENTS, b = hi * Math.PI * 2 / SEGMENTS;
  const t = (s - distances[lo]) / (distances[hi] - distances[lo]);
  const angle = a + (b - a) * t;
  out.x = cx + rx * Math.cos(angle);
  out.z = cz + rz * Math.sin(angle);
  out.y = -depth;
  out.yaw = Math.atan2(-rx * Math.sin(angle), rz * Math.cos(angle));
  return out;
}

// Cross the high western metro span between its s=144 and s=168 piers.
// Keep the bow along the travel tangent until aligned, then back into the berth.
const berth = SUBMARINE_HOME;
export const RETURN_ENTRY = Object.freeze({ x: berth.x - 120, y: 0, z: berth.z + 57.5, yaw: Math.atan2(100, -50) });
const turnStart = { x: berth.x - 20, z: berth.z + 7.5 };
const turnEnd = { x: berth.x, z: berth.z + 27 };
const crossingLength = Math.hypot(100, 50), returnSamples = [];
let returnLength = crossingLength;
for (let i = 0; i <= 128; i++) {
  const t = i / 128, u = 1 - t;
  const x = u ** 3 * turnStart.x + 3 * u * u * t * (berth.x - 10) + (3 * u * t * t + t ** 3) * berth.x;
  const z = u ** 3 * turnStart.z + 3 * u * u * t * (berth.z + 2.5) + 3 * u * t * t * (berth.z + 19.5) + t ** 3 * turnEnd.z;
  const dx = 30 * u * u + 60 * u * t, dz = -15 * u * u + 102 * u * t + 22.5 * t * t;
  const ddx = -60 * t, ddz = 132 * u - 57 * t;
  const curvature = Math.abs(dx * ddz - dz * ddx) / Math.hypot(dx, dz) ** 3;
  if (i) returnLength += Math.hypot(x - returnSamples[i - 1].x, z - returnSamples[i - 1].z);
  returnSamples.push({ x, z, yaw: Math.atan2(dx, dz), s: returnLength, speed: Math.min(3, .16 / Math.max(curvature, .001)) });
}
export const RETURN_LENGTH = returnLength;
export function sampleReturn(distance, out) {
  const s = Math.max(0, Math.min(RETURN_LENGTH, distance));
  out.y = 0;
  if (s < crossingLength) {
    const t = s / crossingLength;
    out.x = RETURN_ENTRY.x + 100 * t; out.z = RETURN_ENTRY.z - 50 * t;
    out.yaw = RETURN_ENTRY.yaw; out.stage = 'bridge-crossing';
    out.speed = Math.min(8, returnSamples[0].speed + (crossingLength - s) * .1);
    return out;
  }
  let lo = 0, hi = returnSamples.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (returnSamples[mid].s <= s) lo = mid; else hi = mid; }
  const a = returnSamples[lo], b = returnSamples[hi], t = (s - a.s) / (b.s - a.s);
  out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t;
  out.yaw = a.yaw + (b.yaw - a.yaw) * t; out.speed = Math.min(a.speed, b.speed);
  out.stage = 'harbor-align';
  return out;
}
