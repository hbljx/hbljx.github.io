// The house shell, the pool's basin and the island's surface, built from
// blocks. The island itself comes from the engine (terrain.js buildIsland).
import { HOUSE, LOFT, SECRET, GARAGE, POOL, TERRACE, DRIVEWAY, ENTRANCE, BACKDOOR, ROOF_GLASS, ROOF_LADDER, STUDIO_WALL_END, SEA_BRIDGE } from './layout.js';
import { inRect } from '@engine/world/terrain.js';
import { HOUSE_COLORS as colors } from './house-palette.js';

const SHELL = { x0: HOUSE.x0 - 1, x1: HOUSE.x1 + 1, z0: HOUSE.z0 - 1, z1: HOUSE.z1 + 1 };
const POOL_DECK = { x0: POOL.x0 - 1, x1: POOL.x1 + 1, z0: POOL.z0 - 1, z1: POOL.z1 + 1 };

export function defineHouseBlocks(grid) {
  grid.define('wood_floor', { tex: { all: 'greige_floor' }, tint: colors.lavender, merge: true });
  grid.define('entry_oak', { tex: { all: 'maple' }, merge: true });
  // The level bridge approach owns the visible surface at y=0. Keep its
  // underlying land solid, but omit the grass top that would fight the deck.
  grid.define('bridge_ground', {
    tex: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' },
    skipFace: face => face === 2,
  });
  grid.define('epoxy', { tex: { all: 'concrete' }, tint: 0xc2c5c8 });
  grid.define('pool_tile', { tex: { all: 'pool_tile' } });
  grid.define('pool_deep', { tex: { all: 'pool_deep' } });
  // The pool's rim: travertine on top, tiled down its inner face to the water.
  grid.define('coping', { tex: { top: 'travertine', side: 'pool_tile', bottom: 'pool_tile' } });
  grid.define('exterior_wall', { tex: { all: 'paint' }, tint: colors.facade, merge: true });
  grid.define('wall', { tex: { all: 'paint' }, tint: colors.lavender, merge: true });
  grid.define('roof', { tex: { all: 'paint' }, tint: colors.facade, merge: true });
  grid.define('parapet', { tex: { all: 'paint' }, tint: colors.trim, merge: true });
  // A glazed cell is a metre deep; drawing all its faces reads as two thick
  // sheets. Keep one face, on the inner wall line beside the steel frames
  // (the top for roof lights), so every window is a single pane.
  const paneFace = (x, y, z) => y >= HOUSE.height ? 2
    : x === HOUSE.x0 - 1 ? 0 : x === HOUSE.x1 ? 1 : z === HOUSE.z0 - 1 ? 4
    : z === GARAGE.z1 ? 5 : x === GARAGE.x0 - 1 ? 0 : -1;
  grid.define('glass', { kind: 'glass', tex: { all: 'glass' }, merge: true,
    skipFace: (f, x, y, z) => {
      const keep = paneFace(x, y, z); return keep >= 0 && f !== keep;
    } });
  // Keep the facade's collision cells; furnish draws thin panes at the inner
  // wall line so the metre-deep voxel shell cannot slice through open doors.
  grid.define('front_glass', { kind: 'glass', tex: { all: 'glass' }, skipFace: () => true });
  grid.define('brick', { tex: { all: 'paint' }, tint: colors.lavender, merge: true });
  grid.define('loft', { tex: { top: 'greige_floor', side: 'paint', bottom: 'greige_floor' }, tint: colors.lavender, merge: true });
  grid.define('osmanthus', { kind: 'cutout', tex: { all: 'leaves_osmanthus' } });
  grid.define('bookshelf', { tex: { all: 'paint' }, tint: colors.heather, merge: true });
}

// What tops each column of the island: floors, decks and paving, else grass.
export function surfaceAt(x, z) {
  if (x >= SEA_BRIDGE.x - SEA_BRIDGE.width / 2 && x < SEA_BRIDGE.x + SEA_BRIDGE.width / 2
    && z >= SEA_BRIDGE.z0 && z < 30) return 'bridge_ground';
  if (z === HOUSE.z1 && x >= ENTRANCE.x0 && x < ENTRANCE.x1) return 'entry_oak';
  if (inRect(SHELL, x, z)) {
    return 'wood_floor';
  }
  if (inRect(TERRACE, x, z)) return 'deck';

  if (inRect(POOL_DECK, x, z)) return 'travertine';
  if (inRect(DRIVEWAY, x, z)) return 'grass';
  // Stepping stones from the terrace east to the drive and west to the garden.
  if (z >= TERRACE.z0 && z < TERRACE.z1 && (x === 22 || x === 24 || x === -23 || x === -25)) return 'travertine';
  return 'grass';
}

export function buildPool(grid) {
  for (let x = POOL.x0 - 1; x <= POOL.x1; x++) for (let z = POOL.z0 - 1; z <= POOL.z1; z++) {
    const inside = x >= POOL.x0 && x < POOL.x1 && z >= POOL.z0 && z < POOL.z1;
    const seaEdge = x >= POOL.x0 && x < POOL.x1 && z === POOL.z1;
    for (let y = POOL.bed - 2; y < 0; y++) {
      if (inside) grid.set(x, y, z, y < POOL.bed ? 'pool_deep' : null);
      // Every cell from the floor up must go: a y=-2 cell would leave a broad
      // ledge at y=-1, just above the sea, and any cell beside the floor would
      // share a face with the narrow waterline wall (batched furniture) and flicker.
      else if (seaEdge) grid.set(x, y, z, y < POOL.bed ? 'pool_tile' : null);
      else grid.set(x, y, z, y === -1 ? 'coping' : 'pool_tile');
    }
  }
}

export function buildShell(grid) {
  const { x0, x1, z0, z1, height } = HOUSE;
  // Four walls, each its own group so the camera can lower whichever is in the way.
  for (let y = 0; y < height; y++) {
    for (let x = x0 - 1; x <= x1; x++) {
      const back = x >= BACKDOOR.x0 && x < BACKDOOR.x1 && y < 3;
      grid.set(x, y, z0 - 1, back ? null : northWall(x, y) ? 'exterior_wall' : 'glass', 'wallN');
      const south = southWall(x, y);
      grid.set(x, y, z1, south, 'wallS');
    }
    for (let z = z0; z < z1; z++) {
      grid.set(x0 - 1, y, z, westWall(z, y) ? 'wall' : 'glass', 'wallW');
      grid.set(x1, y, z, eastWall(z, y), 'wallE');
    }
  }
  // Broad walkable glazing; the solid perimeter and 3 m cross remain flush.
  for (let x = x0 - 1; x <= x1; x++) for (let z = z0 - 1; z <= z1; z++) {
    const sky = ROOF_GLASS.some(s => inRect(s, x, z));
    grid.set(x, height, z, sky ? 'glass' : 'roof', 'roof');
    const rim = x === x0 - 1 || x === x1 || z === z0 - 1 || z === z1;
    const gate = x === x1 && z >= ROOF_LADDER.gate0 && z < ROOF_LADDER.gate1;
    if (rim && !gate) grid.set(x, height + 1, z, 'parapet', 'roof');
  }
  // Back rooms under the loft, and the loft deck on top of them.
  grid.fill(LOFT.x0, 0, LOFT.z0, LOFT.x1, LOFT.y - 1, LOFT.z1, 'brick');
  grid.fill(LOFT.x0, LOFT.y - 1, LOFT.z0, LOFT.x1, LOFT.y, LOFT.z1, 'loft');
  // The save room keeps its existing collision/door identity, with quiet wood
  // panels. A single curated bookcase is built as furniture beside the desk.
  grid.fill(SECRET.x1, LOFT.y, SECRET.z0, SECRET.x1 + 1, LOFT.y + 3, SECRET.door, 'bookshelf');
  grid.fill(SECRET.x1, LOFT.y, SECRET.door + 1, SECRET.x1 + 1, LOFT.y + 3, SECRET.z1 + 1, 'bookshelf');
  grid.fill(SECRET.x0, LOFT.y, SECRET.z1, SECRET.x1, LOFT.y + 3, SECRET.z1 + 1, 'bookshelf');
  grid.fill(SECRET.x0, LOFT.y + 3, SECRET.z0, SECRET.x1 + 1, LOFT.y + 4, SECRET.z1 + 1, 'loft', 'secretTop');
  // The hidden bookshelf door is a movable mesh; its opening stays clear so
  // the shared door collider controls walking and navigation.
  // Standalone feature walls support the existing court and studio as the
  // outer glazed envelope expands around them.
  grid.fill(-21,0,-3,-20,7,7,'wall');
  // The fractional end is drawn and collided by shared-rooms, so the cut
  // falls between the diploma and the removed jersey instead of a full cell.
  grid.fill(3,0,-13,Math.floor(STUDIO_WALL_END),4,-12,'wall');
  grid.fill(SECRET.x0-1,LOFT.y,SECRET.z0,SECRET.x0,LOFT.y+3,SECRET.z1,'brick');
  grid.fill(SECRET.x0,LOFT.y,SECRET.z0-1,SECRET.x1,LOFT.y+3,SECRET.z0,'brick');
  // The garage: a steel-framed glass wall to the west with a door in it, and a
  // low brick wall to the south that carries the TV of the games corner.
  for (let y = 0; y < height; y++) {
    for (let z = GARAGE.z0; z < GARAGE.z1; z++) {
      const door = z >= GARAGE.glassDoor.z0 && z < GARAGE.glassDoor.z1 && y < 3;
      // Keep the car/living-room divider on the same voxel-glass surface as
      // the neighboring garage panes; the former clear aisle left a visibly
      // different overlay when a furniture glass panel was placed beside it.
      grid.set(GARAGE.x0 - 1, y, z, door ? null : 'glass');
    }
    for (let x = GARAGE.x0 - 1; x < GARAGE.x1; x++) grid.set(x, y, GARAGE.z1, y < 3 ? 'brick' : 'glass');
  }
}

// The expanded envelope uses full-height glazing with slim batched frames.
function northWall(x,y){return x===HOUSE.x0-1||x===HOUSE.x1;}
function westWall(z,y){return false;}
function eastWall(z,y){
  if(z>=GARAGE.door.z0&&z<GARAGE.door.z1&&y<4)return null;
  // Keep the collision shell; furnish draws this facade to the exact jambs.
  // Integer voxel edges cannot match the garage's half-metre opening.
  return 'front_glass';
}
function southWall(x,y){
  if(x===HOUSE.x0-1||x===HOUSE.x1)return 'exterior_wall';
  if(x>=ENTRANCE.x0&&x<ENTRANCE.x1&&y<3)return null;
  return 'front_glass';
}
