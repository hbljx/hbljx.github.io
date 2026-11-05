import * as THREE from 'three';

// Avatar origins, not cushion centres. The existing seated hips sit .675 m
// above this origin; both occupants use the same points during flight.
export const CAR_SEAT = Object.freeze({ x: -.28, y: -.14, side: .44 });

export function buildCarCabin({ box, geometry, transform, rail }) {
  const ivory = 0xdad8d0, seam = 0xa6a69f, trim = 0x25292c;
  function cushion(x, y, z, w, h, d, color, tilt = 0, radius = .025) {
    const r = Math.min(radius, w / 4, h / 4, d / 4);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(w - 2 * r, 0);
    shape.lineTo(w - 2 * r, h - 2 * r); shape.lineTo(0, h - 2 * r); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, steps: 1, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3 });
    g.translate(-w / 2 + r, -h / 2 + r, -d / 2 + r);
    geometry(g, color, -1, transform(x, y, z, 0, 0, tilt));
  }
  box(-.35, .30, 0, 2.65, .07, 1.60, 0x242527);
  for (const side of [-1, 1]) {
    // Inner door cards and armrests close the body shell without a lid.
    box(-.38, .65, side * .81, 2.60, .62, .055, trim);
    box(-.28, .76, side * .765, .85, .065, .10, ivory, -1);
    for (const [x, back, top] of [[-.20, -.51, 1.43], [-1.18, -1.53, 1.31]]) {
      const z = side * CAR_SEAT.side;
      cushion(x, .38, z, .66, .085, .60, ivory);
      cushion(back, .89, z, .145, .86, .59, ivory, .10, .035);
      cushion(back - .06, top, z, .16, .22, .32, ivory);
      for (const edge of [-1, 1]) {
        cushion(x - .01, .445, z + edge * .265, .59, .09, .065, ivory);
        rail([back + .081, .57, z + edge * .20], [back + .014, 1.21, z + edge * .20], .008, seam, -1);
      }
    }
  }
  // A low console leaves the lap and footwell visible through the roof.
  cushion(-.20, .53, 0, 1.15, .30, .19, trim);
  cushion(-.40, .71, 0, .42, .08, .20, ivory);
  box(.22, .69, 0, .31, .018, .16, 0x101316);
  box(.83, .88, 0, .32, .18, 1.56, trim);
  box(.647, .93, 0, .022, .045, 1.48, ivory, -1);
  // Thin centre screen, with its face pointing back toward the occupants.
  cushion(.59, 1.06, 0, .035, .25, .36, 0x0b1015, -.12, .008);
  box(.568, 1.06, 0, .008, .209, .319, 0x304955, -1, 0, 0, -.12);
  box(.561, 1.09, -.065, .009, .009, .13, 0xa4c1cc, -1);
  box(.561, 1.04, .067, .009, .07, .085, 0x6d8790, -1);
  rail([.62, .84, -CAR_SEAT.side], [.25, 1.03, -CAR_SEAT.side], .055, trim);
  geometry(new THREE.TorusGeometry(.16, .022, 6, 28), trim, -1, transform(.24, 1.04, -CAR_SEAT.side, 0, Math.PI / 2, -.18));
  box(.24, 1.04, -CAR_SEAT.side, .045, .055, .24, trim);
  box(.24, .98, -CAR_SEAT.side, .045, .13, .035, trim);
}
