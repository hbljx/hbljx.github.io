// Each navigation grid owns its moving bodies, independent of terrain and furniture.
const bodiesByNav = new WeakMap();

export function registerActor(nav, pos, radius, height, feet = () => pos.y, active = () => true) {
  let bodies = bodiesByNav.get(nav);
  if (!bodies) bodiesByNav.set(nav, bodies = new Set());
  const body = { pos, radius, height, feet, active };
  bodies.add(body);

  function occupied(x, y, z) {
    for (const other of bodies) {
      if (other === body || !other.active()) continue;
      const bottom = other.feet();
      if (y >= bottom + other.height || y + height <= bottom) continue;
      if ((x - other.pos.x) ** 2 + (z - other.pos.z) ** 2 < (radius + other.radius) ** 2) return true;
    }
    return false;
  }

  // Return the fraction of this move before contact. Within the time interval
  // when the bodies overlap vertically, test the whole horizontal segment.
  function travel(x, y, z) {
    const startY = feet(), dx = x - pos.x, dy = y - startY, dz = z - pos.z;
    const lengthSq = dx * dx + dz * dz;
    let limit = 1;
    for (const other of bodies) {
      if (other === body || !other.active()) continue;
      const bottom = other.feet(), top = bottom + other.height;
      if (Math.min(startY, y) >= top || Math.max(startY, y) + height <= bottom) continue;
      const ox = pos.x - other.pos.x, oz = pos.z - other.pos.z;
      const gap = ox * ox + oz * oz - (radius + other.radius) ** 2;
      const dot = ox * dx + oz * dz;
      const verticalOverlap = startY < top && startY + height > bottom;
      // Allow bodies already overlapping to separate without crossing each other.
      if (verticalOverlap && gap < 0 && dot >= 0 &&
          (!dy || dy * (startY + height / 2 - bottom - other.height / 2) >= 0)) continue;
      const firstY = dy > 0 ? (bottom - height - startY) / dy : dy < 0 ? (top - startY) / dy : 0;
      const lastY = dy > 0 ? (top - startY) / dy : dy < 0 ? (bottom - height - startY) / dy : 1;
      let enter = Math.max(0, firstY), leave = Math.min(limit, lastY);
      if (lengthSq > 0) {
        const discriminant = dot * dot - lengthSq * gap;
        if (discriminant <= 0) continue;
        const span = Math.sqrt(discriminant);
        enter = Math.max(enter, (-dot - span) / lengthSq);
        leave = Math.min(leave, (-dot + span) / lengthSq);
      } else if (gap >= 0) continue;
      if (enter < leave) limit = enter;
    }
    return limit;
  }

  return { occupied, travel };
}

// Deck hands animate in ship coordinates. Keep their colliders in the same
// world coordinates as the player, including when the ship turns or moves.
export function registerLocalActor(nav, parent, local, radius, height, active) {
  const world = local.clone(), target = local.clone();
  const body = registerActor(nav, world, radius, height, undefined, active);
  return {
    sync(x, y, z) { world.set(x, y, z).applyMatrix4(parent.matrixWorld); },
    blocked(x, y, z) {
      target.set(x, y, z).applyMatrix4(parent.matrixWorld);
      return body.travel(target.x, target.y, target.z) < 1;
    },
  };
}
