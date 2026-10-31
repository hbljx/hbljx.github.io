// The home's west-shore pier and its moored sailboat. The surrounding sea
// stays open; personal progress belongs on the mountain behind the house.
import * as THREE from 'three';
import { BoxBatch } from '@engine/world/blocks.js';

export const PIER = { x: -31.6, z: 2, length: 12.8, width: 3.8, deck: 0.12 };
export const FISHING_DECK = { x: -45.3, z: 2, width: 4.4, depth: 5.4, y: 0.2 };
const OAK = { tex: 'wood_floor' }, WALNUT = { tex: 'walnut' }, STEEL = { tex: 'steel' };
const paint = tint => ({ tex: 'paint', tint });
const WHITE = paint(0xf1efe9), CHARCOAL = paint(0x2f3438);
const WARM = { tex: 'paint', tint: 0xffd8a0, emissive: 0.85 };

export function buildOuter(layer, materials) {
  const root = new THREE.Group(); root.name = 'shore';
  const ground = [];
  let B = null, boat = null;
  const box = (x, y, z, w, h, d, look, opts = {}) => B.box(x, y, z, w, h, d, look, { shadow: false, ...opts });
  const flat = (site, x, z, w, d, y) => ground.push({ site, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y });
  function cluster(name, build) {
    B = new BoxBatch(layer); build();
    const group = new THREE.Group(); group.name = name;
    for (const m of B.build(materials)) group.add(m);
    root.add(group);
  }
  function part(name, x, y, z, build) {
    const outerBatch = B; B = new BoxBatch(layer); build();
    const group = new THREE.Group(); group.name = name; group.position.set(x, y, z);
    for (const m of B.build(materials)) group.add(m);
    B = outerBatch; root.add(group); return group;
  }
  cluster('shore-pier', () => {
    // The pier: planks on posts running out from the shore, rails, two lamps.
    // Built along its own length (local z), turned to point west.
    const P = PIER;
    B.at(P.x, 0, P.z, -Math.PI / 2, () => {
      for (let z = 0; z < P.length; z += 0.5) box(0, P.deck, z + 0.25, P.width, 0.08, 0.5, OAK);
      for (let z = 1; z < P.length; z += 2) for (const o of [-P.width / 2 + .1, P.width / 2 - .1]) box(o, -1.6, z, 0.16, 2.67, 0.16, WALNUT);
      for (const o of [-P.width / 2 + .1, P.width / 2 - .1]) box(o, P.deck + 0.85, P.length / 2 + 0.5, 0.06, 0.06, P.length - 1, WALNUT);
      for (const o of [-P.width / 2 + .1, P.width / 2 - .1]) { box(o, P.deck, P.length - 0.3, 0.08, 1.8, 0.08, STEEL); box(o, P.deck + 1.8, P.length - 0.3, 0.24, 0.28, 0.24, WARM); }
    });
    flat('pier', P.x - P.length / 2, P.z, P.length, P.width, P.deck + 0.08);
    // A wider fishing landing overlaps the existing pier, so the route from
    // shore stays continuous. Its west edge is open for casting out to sea.
    const F = FISHING_DECK;
    for (let x = F.x - F.width / 2; x < F.x + F.width / 2; x += .4) box(x + .2, F.y - .08, F.z, .4, .08, F.depth, OAK);
    for (const x of [F.x - 1.95, F.x + 1.95]) for (const z of [F.z - 2.45, F.z + 2.45]) box(x, -1.6, z, .18, 2.7, .18, WALNUT);
    for (const z of [F.z - 2.55, F.z + 2.55]) box(F.x, F.y + .85, z, F.width, .09, .09, WALNUT);
    for (const z of [F.z - 2.25, F.z + 2.25]) box(F.x + 2.1, F.y + .85, z, .09, .09, .6, WALNUT);
    // Bait box, bucket and rod rest identify the landing without adding a UI.
    box(F.x + .2, F.y, F.z - 1.9, .72, .43, .5, WALNUT);
    box(F.x + .2, F.y + .43, F.z - 1.9, .77, .05, .55, OAK);
    box(F.x - 1.4, F.y, F.z + 1.25, .38, .4, .38, STEEL);
    box(F.x - 1.4, F.y + .4, F.z + 1.25, .3, .02, .3, paint(0x274b55));
    box(F.x - 1.9, F.y, F.z - .65, .07, .8, .07, STEEL);
    box(F.x - 1.9, F.y + .77, F.z - .65, .07, .05, .3, WALNUT);
    flat('pier', F.x, F.z, F.width, F.depth, F.y);
    // A small sailboat moored beside the end of the pier, bow out to sea.
    boat = part('shore-boat', P.x - P.length + 2.5, -1.3, P.z + 2.6, () => {
      box(0, 0, 0, 1.6, 0.7, 4.2, WHITE); box(0, 0.1, 2.3, 1.1, 0.6, 0.5, WHITE); box(0, 0.25, 2.65, 0.6, 0.45, 0.3, WHITE);
      box(0, 0.7, -0.2, 1.4, 0.05, 3.4, OAK); box(0, 0.75, -0.9, 1, 0.45, 1.1, WHITE); box(0, 0.95, -0.34, 0.9, 0.16, 0.02, CHARCOAL);
      box(0, 0.75, 0.5, 0.1, 5.5, 0.1, STEEL); box(0, 1.6, -0.7, 0.08, 0.08, 2.4, STEEL);
      for (const [z, len, y] of [[-0.2, 1.9, 1.7], [-0.05, 1.45, 2.7], [0.1, 0.95, 3.7], [0.25, 0.45, 4.7]]) box(0.03, y, z, 0.03, 1, len, paint(0xefe9dc));
      box(0, 6.05, 0.3, 0.02, 0.22, 0.4, paint(0x2f5b46));
    });
    boat.rotation.y = -Math.PI / 2;
  });

  // The original boardwalk and its fishing landing share the same ground site.
  const deckBounds = ground.map(deck => new THREE.Box3(new THREE.Vector3(deck.x0, deck.y - 0.02, deck.z0), new THREE.Vector3(deck.x1, deck.y + 0.02, deck.z1)));
  const hit = new THREE.Vector3();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), sphere = new THREE.Sphere();
  let t = 0, clock = 0, seen = true;
  return {
    group: root,
    foot: { x: PIER.x + 1, z: PIER.z },
    levels(x, z, out) { for (const deck of ground) if (x >= deck.x0 && x <= deck.x1 && z >= deck.z0 && z <= deck.z1) out.push(deck); },
    pick(ray) {
      let best = null;
      for (const bounds of deckBounds) if (ray.intersectBox(bounds, hit)) {
        const t = hit.distanceTo(ray.origin);
        if (!best || t < best.t) best = { t, point: hit.clone(), site: 'pier' };
      }
      return best;
    },
    spots: () => [{ x: FISHING_DECK.x, z: FISHING_DECK.z }],
    update(dt, camera) {
      if (reduced.matches) return;
      t += dt; clock += dt;
      if (camera && clock >= 0.25) {
        clock = 0;
        viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(viewProjection);
        boat.getWorldPosition(sphere.center); sphere.radius = 4; seen = frustum.intersectsSphere(sphere);
      }
      if (seen) {
        boat.rotation.z = Math.sin(t * 0.9) * 0.05; boat.rotation.x = Math.sin(t * 0.7) * 0.025;
        boat.position.y = -1.3 + Math.sin(t * 0.8) * 0.05;
      }
    },
  };
}
