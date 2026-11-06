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
