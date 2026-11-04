// A rectangular patrol with tangent quarter-circle turns: no stops at corners.
export const PATROL_BOUNDS = Object.freeze({ x0: -610, x1: -360, z0: 260, z1: 540, radius: 48, depth: 300 });
const { x0, x1, z0, z1, radius: r, depth } = PATROL_BOUNDS;
const w = x1 - x0 - 2 * r, h = z1 - z0 - 2 * r, arc = Math.PI * r / 2;
export const PATROL_LENGTH = 2 * (w + h) + 4 * arc;
export function samplePatrol(distance, out) {
  let s = ((distance % PATROL_LENGTH) + PATROL_LENGTH) % PATROL_LENGTH;
  out.y = -depth;
  if (s < w) { out.x = x1 - r - s; out.z = z0; out.yaw = -Math.PI / 2; return out; }
  s -= w;
  let cx, cz, a;
  if (s < arc) { cx = x0 + r; cz = z0 + r; a = -Math.PI / 2 - s / r; }
  else {
    s -= arc;
    if (s < h) { out.x = x0; out.z = z0 + r + s; out.yaw = 0; return out; }
    s -= h;
    if (s < arc) { cx = x0 + r; cz = z1 - r; a = Math.PI - s / r; }
    else {
      s -= arc;
      if (s < w) { out.x = x0 + r + s; out.z = z1; out.yaw = Math.PI / 2; return out; }
      s -= w;
      if (s < arc) { cx = x1 - r; cz = z1 - r; a = Math.PI / 2 - s / r; }
      else {
        s -= arc;
        if (s < h) { out.x = x1; out.z = z1 - r - s; out.yaw = Math.PI; return out; }
        s -= h; cx = x1 - r; cz = z0 + r; a = -s / r;
      }
    }
  }
  out.x = cx + Math.cos(a) * r; out.z = cz + Math.sin(a) * r;
  out.yaw = Math.atan2(Math.sin(a), -Math.cos(a)); return out;
}
