// Offshore turbines and a small drilling platform share the world's static batch.
export function buildOffshore(B) {
  const steel = { tex: 'paint', tint: 0xd8e2dc };
  const darkSteel = { tex: 'paint', tint: 0x52636a };
  const deck = { tex: 'deck', tint: 0x667b78 };
  const yellow = { tex: 'paint', tint: 0xf0bd54 };
  const glass = { tex: 'glass', glass: true };

  function turbine(x, z, height = 25) {
    B.box(x, -8, z, 1.4, 3, 1.4, darkSteel);
    B.box(x, -5, z, .9, height + 5, .9, steel);
    B.box(x, height, z, 2.2, 1.5, 2, steel);
    B.box(x, height, z + .98, .72, .52, .08, glass);
    const hubY = height + .08;
    B.box(x, hubY, z - 1.2, .48, .48, 1.15, darkSteel);
    // Three fixed blades make the turbine silhouette legible at a distance.
    for (const angle of [0, 2 * Math.PI / 3, 4 * Math.PI / 3]) {
      const length = 10.5;
      const bladeX = x + Math.sin(angle) * length / 2;
      const bladeY = hubY + Math.cos(angle) * length / 2;
      B.box(bladeX, bladeY, z - 1.9, .62, length, .34, steel, { rz: -angle });
      B.box(x + Math.sin(angle) * 9.7, hubY + Math.cos(angle) * 9.7, z - 1.9,
        .82, .9, .4, { tex: 'paint', tint: 0xf3f4e9 }, { rz: -angle });
    }
    B.box(x, -5.7, z, 3.5, .3, 3.5, darkSteel);
  }

  // The wind farm sits east of the bridge approach, clear of the island and ship.
  turbine(67, 54, 24);
  turbine(67, 91, 27);
  turbine(119, 73, 25);

  const x = 93, z = 51, y = 4.5;
  // Four deep support legs and diagonal bracing lift the working deck above the sea.
  for (const dx of [-7, 7]) for (const dz of [-6, 6]) {
    B.box(x + dx, -2.6, z + dz, 1.15, 14.2, 1.15, darkSteel);
    B.box(x + dx, -7.4, z + dz, 2.7, 2.2, 2.7, { tex: 'paint', tint: 0x687c7d });
  }
  for (const dx of [-7, 7]) {
    B.box(x + dx, -1.4, z, .28, 11, .28, steel, { rz: dx > 0 ? -.47 : .47 });
  }
  for (const dz of [-6, 6]) {
    B.box(x, -1.4, z + dz, .28, 11, .28, steel, { rx: dz > 0 ? .47 : -.47 });
  }

  B.box(x, y - .45, z, 18, .9, 16, darkSteel);
  B.box(x, y, z, 17.2, .16, 15.2, deck);
  // Perimeter rails leave a wide, unobstructed landing area at the south end.
  for (const dx of [-8.4, 8.4]) {
    B.box(x + dx, y + .72, z, .16, 1.3, 15.2, yellow);
  }
  for (const dz of [-7.4, 7.4]) {
    B.box(x, y + .72, z + dz, 16.8, 1.3, .16, yellow);
  }

  // Drilling derrick, pipe rack, control cabin, crane and flare stack.
  B.box(x - 3.2, y + 1.5, z - 3.2, 4.4, 2.8, 4, { tex: 'paint', tint: 0xd6d9cf });
  B.box(x - 3.2, y + 1.55, z - 1.15, 3.8, 1.5, .08, glass);
  B.box(x + 3.1, y + 1.1, z + 2.5, 1.8, 2, 7, darkSteel);
  for (let i = 0; i < 5; i++) B.box(x + 3.1, y + .28, z - .6 + i * 1.45, 1.35, .12, .12, yellow);
  for (let i = 0; i < 4; i++) {
    const yy = y + 2.2 + i * 2.05, w = 5.2 - i * .9;
    B.box(x + 2.3, yy, z - 3.3, w, .32, .32, yellow);
    B.box(x + 2.3 - w / 2, yy + 1, z - 3.3, .24, 2, .24, steel);
    B.box(x + 2.3 + w / 2, yy + 1, z - 3.3, .24, 2, .24, steel);
  }
  B.box(x + 2.3, y + 7.2, z - 3.3, .34, 8.5, .34, yellow);
  B.box(x + 2.3, y + 11.6, z - 3.3, 5.5, .32, .32, yellow);
  B.box(x + 7, y + 1.5, z - 3, .48, 3, .48, darkSteel);
  B.box(x + 7, y + 3.1, z - 3, .75, .35, .75, { tex: 'paint', tint: 0xff763c, emissive: .8 });
  B.box(x - 7.1, y + 2, z + 2.4, 2.8, 3.8, 2.8, { tex: 'paint', tint: 0x738d8a });

  // Elevated helipad and a parked, clearly visible helicopter.
  const padX = x - 2.8, padZ = z + 4.5, padY = y + .18;
  B.box(padX, padY, padZ, 7.2, .18, 6.4, { tex: 'paint', tint: 0x34464b });
  B.box(padX, padY + .1, padZ, 5.3, .025, .35, yellow);
  B.box(padX, padY + .1, padZ, .35, .025, 4.2, yellow);
  B.box(padX, padY + .13, padZ, 1.2, .025, .22, { tex: 'paint', tint: 0xf3f1dc });
  B.box(padX, padY + .13, padZ, .22, .025, 1.2, { tex: 'paint', tint: 0xf3f1dc });
  // Cabin and tail point toward the open center of the pad.
  B.box(padX, padY + .86, padZ, 1.65, .82, 2.3, { tex: 'paint', tint: 0xd8e2dc });
  B.box(padX, padY + 1.02, padZ + .42, 1.45, .52, .08, glass);
  B.box(padX, padY + .72, padZ - 1.55, .2, .22, 2.1, steel);
  B.box(padX, padY + .78, padZ - 2.45, 1.05, .16, .3, steel);
  B.box(padX, padY + 1.35, padZ, 4.6, .14, .18, darkSteel);
  B.box(padX, padY + .25, padZ, 2.5, .12, .18, darkSteel);
  B.box(padX, padY + .25, padZ, .12, .12, 1.8, darkSteel);
  B.box(padX, padY + 1.5, padZ - 2.55, .12, .65, .12, darkSteel);
  return { turbines: 3, platform: { x, z, y }, helipad: { x: padX, z: padZ, y: padY } };
}
