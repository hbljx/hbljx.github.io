// Build the Homecraft show-home example. The engine calls build() once at boot,
// then setup() once the player exists.
import { buildIsland } from '@engine/world/terrain.js';
import { BoxBatch } from '@engine/world/blocks.js';
import { buildForest } from '@engine/world/landscape.js';
import { defineHouseBlocks, surfaceAt, buildPool, buildShell } from './house.js';
import { furnish } from './furnish.js';
import { buildSeaBridge, travelLandscape } from './sea-bridge.js';
import { buildOuter } from './outer.js';
import { buildMountain } from './mountain.js';
import { buildRoofAccess } from './roof-access.js';
import { createStainless } from './stainless.js';
import { atlasPlanes } from './atlas-planes.js';
import { ISLAND, HOUSE, FOREST, COURT, RIM } from './layout.js';
import { createActivities } from './activities.js';
import { buildThirdFloor } from './third-floor.js';
import { createOceanLife } from './ocean-life.js';
import { createAircraftFleet } from './aircraft-fleet.js';
import { buildCarrier } from './carrier.js';
import { buildSubmarine } from './submarine.js';
import { buildOffshore } from './offshore.js';
import { createHousehold } from './household.js';
import { flattenGlazing, flattenBatchGlazing } from './glazing.js';
import { buildSeaTransit } from './sea-transit.js';

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
  // The garage approach shares the surrounding grass-and-dirt shore. These
  // voxels own both its visible surface and collision, with no overlapping
  // road boxes along the coast. Keep the filled route to the bridge solid.
  for (const [x0, z0, x1, z1] of [[31, -10, 38, 30], [19, 22, 31, 26]]) {
    grid.fill(x0,-2,z0,x1,-1,z1,'dirt');
    grid.fill(x0,-1,z0,x1,0,z1,'grass');
  }
  const third = buildThirdFloor({ grid, layer });
  // Clear the three trees inside the new outside stair's footprint.
  const forest = buildForest(grid, layer, [...FOREST,[-29,-35],[-22,-36],[-15,-35],[-8,-36],[15,-35],[23,-36],[31,-35]].filter(([x,z])=>!(x>=19&&x<=38&&z>=10&&z<=33)&&!(x>=-43&&x<=-12&&z>=20&&z<=35)&&!(x>HOUSE.x0-3&&x<HOUSE.x1+3&&z>HOUSE.z0-3&&z<HOUSE.z1+3)&&!(x>=-36&&x<=-26&&z>=-16&&z<=-2)));
  const furn = furnish({ layer });
  furn.planes.push(third.skylights);
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
  // The pier and sailboat, the mountain and the roof's outside stair are
  // ground of their own, outside the block grid.
  const outer = buildOuter(layer, materials, furn.batches.static), mountain = buildMountain(layer, materials), roofAccess = buildRoofAccess(layer, materials);
  const seaBridge=buildSeaBridge(furn.batches.static,furn.obstacles,furn.lighting);
  const transit=buildSeaTransit({B:furn.batches.static,planes:furn.planes,layer,materials,scene:stage.scene});
  const carrier = buildCarrier(layer, furn.batches.static);
  const submarine = buildSubmarine(furn.batches.static, furn.planes);
  const offshore = buildOffshore();
  stage.scene.add(offshore.group);
  const deepBatch=new BoxBatch(layer),oceanLife=createOceanLife(furn.batches.static,deepBatch,transit.tunnel.path);
  for(const mesh of deepBatch.build(materials)){mesh.castShadow=false;oceanLife.deepGroup.add(mesh);}
  stage.scene.add(oceanLife.deepGroup,oceanLife.tunnelGroup);
  const aircraftFleet=createAircraftFleet(carrier,oceanLife,[furn.animated.roadster,submarine.mesh]);furn.animated.airplane=aircraftFleet.planes[0];furn.planes.push(...aircraftFleet.draws);
  const planeObstacle=aircraftFleet.obstructed;
  third.source.setPlaneObstacle(planeObstacle); mountain.setPlaneObstacle(planeObstacle);carrier.setPlaneObstacle(planeObstacle);
  stage.scene.add(outer.group, mountain.group, roofAccess.group, carrier.mesh);
  for(const batch of Object.values(furn.batches))flattenBatchGlazing(batch);
  for(const group of [outer.group,mountain.group,roofAccess.group])group.traverse(mesh=>flattenGlazing(mesh,materials.boxGlass));
  return {
    batches: furn.batches, planes: atlasPlanes(furn.planes), obstacles: furn.obstacles, lights: furn.lights, bakes: furn.lighting,
    hotspots: furn.hotspots, animated: furn.animated, surfaces: furn.surfaces, forest,
    sites: [outer, mountain, furn.stairs, third.source, carrier, submarine, furn.partitions, seaBridge,transit.platform,transit.approach,transit.tunnel], sitesAfter: [roofAccess],
    named: { seaBridge, transit, seaTunnel:transit.tunnel, drawTransitMap:transit.drawMap, travelLandscape, outer, mountain, roofAccess, carrier, submarine, offshore, aircraftFleet, oceanLife, thirdFloor: third.source, drawMap },
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
  world.oceanLife.configureSea(world.coast);
  world.transit.maskWater(world.coast);
  const activities = createActivities(app);
  const household = createHousehold(app,activities);
  return {
    activities,household,
    get locked() { return activities.active || household.sleeping || household.bathing; },
    get running() { return activities.running; },
    keyDown: e => { if(household.sleeping||household.walking){household.wakeMale();if(['e','escape'].includes(e.key.toLowerCase()))return true;}return activities.keyDown(e); },
    keyUp: e => activities.keyUp(e),
    stop: (force = true) => { household.wakeMale();return activities.stop(force); },
    pause: () => activities.pause(),
    update(dt) {
      world.outer.update(dt, stage.camera);
      activities.update(dt);
      household.update(dt);
      world.carrier.updateCabin(app.player,stage.camera);
      const cutaway = world.hidden.has('roof');
      world.oceanLife.update(dt,world.carrier,stage.camera);
      world.aircraftFleet.update(cutaway);
      world.offshore.rotor.rotation.z -= dt * 0.42;
      const dx = app.player.pos.x - world.offshore.x, dz = app.player.pos.z - world.offshore.z;
      const distance = Math.hypot(dx, dz);
      app.sound.wind(distance < 36 ? 1 - distance / 36 : 0);
      world.setHidden('thirdRoomRoof', cutaway);
    },
  };
}
