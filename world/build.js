// Build the Homecraft show-home example. The engine calls build() once at boot,
// then setup() once the player exists.
import { buildIsland } from '@engine/world/terrain.js';
import { buildForest } from '@engine/world/landscape.js';
import { defineHouseBlocks, surfaceAt, buildPool, buildShell } from './house.js';
import { furnish } from './furnish.js';
import { buildOuter } from './outer.js';
import { buildMountain } from './mountain.js';
import { buildRoofAccess } from './roof-access.js';
import { createStainless } from './stainless.js';
import { atlasPlanes } from './atlas-planes.js';
import { ISLAND, FOREST, COURT, RIM } from './layout.js';
import { createActivities } from './activities.js';
import { buildThirdFloor } from './third-floor.js';
import { createAirplane, aircraftObstacle } from './aircraft.js';
import { buildCarrier } from './carrier.js';
import { createHousehold } from './household.js';

export function build({ grid, layer, materials, stage }) {
  // Flat glass panes need one two-sided pass rather than separate front/back
  // passes. This retains both faces while reducing overhead in the overview.
  materials.voxelGlass.forceSinglePass = true;
  materials.boxGlass.forceSinglePass = true;
  // The kitchen's brushed steel is a real metal, with its own room reflection.
  materials.boxMetal = createStainless(stage);
  defineHouseBlocks(grid);
  buildIsland(grid, ISLAND, { surfaceAt });
  buildPool(grid);
  buildShell(grid);
  const third = buildThirdFloor({ grid, layer });
  // Clear the three trees inside the new outside stair's footprint.
  const forest = buildForest(grid, layer, FOREST.filter(([x, z]) => !(x >= -32 && x <= -22 && z >= -15 && z <= -3)));
  const furn = furnish({ layer });
  const mergeBatch = (into, from) => {
    for (const kind of Object.keys(into.items)) into.items[kind].push(...from.items[kind]);
  };
  // Facade furniture already stays visible during cutaways. Batch those frames
  // and panes together with the other permanent furniture and outside stair.
  for (const name of ['wallN', 'wallS', 'wallE', 'wallW']) {
    mergeBatch(furn.batches.static, furn.batches[name]); delete furn.batches[name];
  }
  mergeBatch(furn.batches.static, third.batches.thirdStairs);
  // The third-floor shell shares the existing roof's cutaway visibility.
  mergeBatch(furn.batches.roof, third.batches.thirdFloor);
  mergeBatch(furn.batches.roof, third.batches.thirdRoomRoof);
  furn.animated.airplane = createAirplane(); furn.planes.push(furn.animated.airplane);
  // The pier and sailboat, the mountain and the roof's outside stair are
  // ground of their own, outside the block grid.
  const outer = buildOuter(layer, materials, furn.batches.static), mountain = buildMountain(layer, materials), roofAccess = buildRoofAccess(layer, materials);
  const carrier = buildCarrier(layer, furn.batches.static);
  const planeObstacle=aircraftObstacle(furn.animated.airplane);
  third.source.setPlaneObstacle(planeObstacle); mountain.setPlaneObstacle(planeObstacle);
  stage.scene.add(outer.group, mountain.group, roofAccess.group, carrier.mesh);
  return {
    batches: furn.batches, planes: atlasPlanes(furn.planes), obstacles: furn.obstacles, lights: furn.lights, bakes: furn.lighting,
    hotspots: furn.hotspots, animated: furn.animated, surfaces: furn.surfaces, forest,
    sites: [outer, mountain, furn.stairs, third.source, carrier], sitesAfter: [roofAccess],
    named: { outer, mountain, roofAccess, carrier, thirdFloor: third.source, drawMap },
  };
}

// The half court on the radar, painted as it is on the floor.
function drawMap(ctx, X, Z, PPM) {
  ctx.fillStyle = '#2b2e31';
  ctx.fillRect(X(COURT.x0 - 1), Z(COURT.z0 - 1), (COURT.x1 - COURT.x0 + 2) * PPM, (COURT.z1 - COURT.z0 + 2) * PPM);
  ctx.fillStyle = '#d9ae76';
  ctx.fillRect(X(COURT.x0), Z(COURT.z0), (COURT.x1 - COURT.x0) * PPM, (COURT.z1 - COURT.z0) * PPM);
  ctx.fillStyle = '#b92d28';
  ctx.fillRect(X(COURT.x0), Z(RIM.z - 2.45), 5.8 * PPM, 4.9 * PPM);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const courtSide = Math.min((COURT.z1 - COURT.z0) / 2 - 0.9, 6.7);
  ctx.arc(X(RIM.x), Z(RIM.z), 6.75 * PPM, -Math.asin(courtSide / 6.75), Math.asin(courtSide / 6.75));
  ctx.stroke();
  ctx.strokeRect(X(COURT.x0), Z(COURT.z0), (COURT.x1 - COURT.x0) * PPM, (COURT.z1 - COURT.z0) * PPM);
}

// The sailboat and keyboard/touch activities share one update loop.
export function setup(app) {
  const { stage, world } = app;
  const activities = createActivities(app);
  const household = createHousehold(app,activities);
  return {
    activities,household,
    get locked() { return activities.active || household.sleeping; },
    get running() { return activities.running; },
    keyDown: e => { if(household.sleeping||household.walking){household.wakeMale();if(['e','escape'].includes(e.key.toLowerCase()))return true;}return activities.keyDown(e); },
    keyUp: e => activities.keyUp(e),
    stop: (force = true) => { household.wakeMale();return activities.stop(force); },
    pause: () => activities.pause(),
    update(dt) {
      world.outer.update(dt, stage.camera);
      activities.update(dt);
      household.update(dt);
      const cutaway = world.hidden.has('roof');
      world.setHidden('aircraft', cutaway && world.animated.airplane.position.y < 14);
      world.setHidden('thirdRoomRoof', cutaway);
    },
  };
}
