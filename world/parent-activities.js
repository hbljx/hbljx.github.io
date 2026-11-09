import { Vector3 } from 'three';
import { RIM } from './layout.js';

const TAU = Math.PI * 2;
const smooth = t => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const STEEL = 0xa3adb1, RUBBER = 0x293338;

export function createParentPerformance(avatar, activities) {
  const { root, prop, rod } = avatar;
  const hands = [new Vector3(), new Vector3()], feet = [new Vector3(), new Vector3()];
  const knees = [new Vector3(), new Vector3()];
  const pose = { hands, feet, knees, seated: false, pitch: 0, headPitch: 0, headYaw: 0 };
  const a = new Vector3(), b = new Vector3(), ball = new Vector3();
  let lastReach = 0;

  function contact(point, x, y, z) {
    const c = Math.cos(pose.pitch), s = Math.sin(pose.pitch);
    point.set(x, .67 + (y - root.position.y - .67) * c + z * s, z * c - (y - root.position.y - .67) * s);
  }
  function sit(height, floor, sofa) {
    const front = sofa ? .44 : .39;
    root.position.y = height - .57;
    if (sofa) root.position.x -= .12;
    pose.seated = true;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1;
      knees[i].set(side * .125, .685, front);
      feet[i].set(side * .13, floor + .105 + (sofa ? .025 : 0) - root.position.y, front + .075);
      hands[i].set(side * .21, .83, .27);
    }
  }
  function book(t) {
    const flip = smooth((t % 6 - 4.8) / .75) * Math.PI;
    hands[0].set(-.25, .99, .37);
    hands[1].set(.23 * Math.cos(flip), 1.05 + .23 * Math.sin(flip), .39);
    pose.headPitch = .27;
    prop(0, 1, .39, .56, .033, .35, 0x416754);
    prop(0, 1.027, .39, .53, .024, .32, 0xf4e8ca);
    prop(0, 1.043, .39, .018, .012, .32, 0xb89d75);
    prop(.128 * Math.cos(flip), 1.048 + .128 * Math.sin(flip), .39, .256, .012, .31, 0xfff4d8, 0, 0, flip);
    for (let i = 0; i < 4; i++) prop(-.13, 1.043, .29 + i * .06, .16 - (i % 2) * .035, .003, .01, 0xa89d83);
  }
  function tv(t, remote) {
    pose.headYaw = Math.sin(t * .65) * .06;
    if (!remote) {
      pose.headPitch = Math.sin(t * 1.1) * .032;
      return;
    }
    const lift = Math.sin(Math.PI * smooth(t % 12 / 1.6));
    hands[1].set(.22, .84 + .22 * lift, .28 + .16 * lift);
    prop(.22, hands[1].y + .055, hands[1].z + .045, .087, .041, .18, RUBBER, -.13 * lift);
    prop(.22, hands[1].y + .078, hands[1].z + .09, .026, .009, .025, 0xc66253);
  }
  function game(t) {
    hands[0].set(-.19 + Math.sin(t * 11) * .045, 1.056 + Math.abs(Math.sin(t * 15)) * .024, .52);
    hands[1].set(.24 + Math.sin(t * 2.3) * .065, 1.072, .52);
    pose.headPitch = .06;
    prop(hands[1].x, 1.036, .54, .09, .043, .13, RUBBER);
  }
  function cooking(t) {
    const stage = t % 17;
    const chopping = stage < 5, serving = stage >= 12.5;
    const chop = Math.abs(Math.sin(t * 11));
    const stirX = .115 * Math.cos(t * 6), stirZ = .115 * Math.sin(t * 6);
    const foodZ = .67;
    pose.headPitch = .29;
    if (chopping) {
      hands[0].set(-.46, 1.11 + chop * .075, .45);
      hands[1].set(.17, 1.04, .44);
      prop(-.46, hands[0].y - .01, .48, .05, .05, .14, RUBBER);
      prop(-.46, hands[0].y - .053, .61, .035, .095, .16, STEEL, .08 * chop);
    } else if (serving) {
      const plate = smooth((stage - 12.5) / 1.4);
      hands[0].set(-.44, 1.085 + .06 * plate, .48 - .09 * plate);
      hands[1].set(-.04, 1.1 + .06 * plate, .48 - .09 * plate);
      prop(-.24, hands[0].y + .045, hands[0].z + .09, .44, .025, .38, 0xe9e4d2);
      prop(-.30, hands[0].y + .085, hands[0].z + .08, .18, .065, .23, 0x83a95b);
      prop(-.15, hands[0].y + .09, hands[0].z + .09, .14, .085, .19, 0xd58b4f);
    } else {
      hands[0].set(-.27, 1.17, .51);
      hands[1].set(.12 + stirX * .35, 1.24, .49 + stirZ * .3);
      a.set(stirX, 1.13, .76 + stirZ);
      rod(hands[1], a, .034, 0xac8252);
      prop(a.x, a.y, a.z, .095, .032, .09, 0xac8252);
    }
    // The pot rests on the front burner and the board on the worktop beside it.
    prop(0, 1.072, .76, .43, .122, .34, 0x506b70);
    prop(0, 1.145, .76, .45, .025, .36, STEEL);
    prop(0, 1.159, .76, .40, .015, .31, chopping ? 0x977354 : 0xb67142);
    for (let side = -1; side <= 1; side += 2) prop(side * .25, 1.105, .72, .13, .037, .085, RUBBER);
    prop(-.50, .977, foodZ, .47, .036, .37, 0xb28450);
    for (let i = 0; i < 3; i++) {
      const x = -.63 + i * .12, color = i === 1 ? 0xd58b4f : 0x83a95b;
      if (chopping) prop(x, 1.02, foodZ - i * .015, .082, .048, .09 - i * .014, color);
      else if (!serving) prop(stirX + i * .065 - .065, 1.18, .76 + stirZ * .7, .067, .032, .058, color);
      if (!chopping && !serving) prop(Math.sin(t * 3 + i) * .1, 1.25 + (t * .46 + i * .17) % .46, .78, .058, .081, .057, 0xe7e7d8);
    }
  }
  function run(t) {
    const stride = t * 11;
    root.position.y += .026 + Math.abs(Math.sin(stride)) * .022;
    pose.pitch = .095;
    for (let i = 0; i < 2; i++) {
      const p = stride + i * Math.PI, side = i * 2 - 1;
      const lift = Math.max(0, Math.cos(p)) * .22;
      contact(feet[i], side * .113, .27 + .105 + lift, .30 * Math.sin(p));
      hands[i].set(side * .31, .92 + .11 * Math.sin(p), .12 + .23 * Math.sin(p));
    }
    activities.moveResidentBelt(t);
  }
  function bike(t) {
    root.position.y = .98 - .57;
    pose.pitch = .55;
    pose.headPitch = -.35;
    const crank = t * 5.5;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1, phase = crank + i * Math.PI;
      contact(feet[i], side * .23, .60 + .106 * Math.cos(phase) + .14, .27 + .106 * Math.sin(phase) - .04);
      contact(hands[i], side * .22, 1.22, .73);
    }
    activities.moveBikeCrank(crank);
  }
  function pullup(t) {
    const pull = (1 - Math.cos(t * TAU / 2.6)) / 2;
    root.position.y = .55 + .43 * pull;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1;
      feet[i].set(side * .12, .16 + pull * .05, -.16);
      hands[i].set(side * .31, 2.385 - root.position.y, .3);
    }
    pose.headPitch = -.09;
  }
  function dumbbell(x, y, z, width = .26) {
    prop(x, y, z, width, .045, .046, STEEL);
    for (let side = -1; side <= 1; side += 2) prop(x + side * width * .43, y, z, .065, .14, .14, RUBBER);
  }
  function bench(t) {
    root.position.y = .018;
    pose.pitch = -1.43;
    pose.seated = true;
    const press = (1 - Math.cos(t * TAU / 2.25)) / 2;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1;
      // Feet are planted off the end of the bench, with the knees bent.
      contact(knees[i], side * .15, .67, .46);
      contact(feet[i], side * .16, .13, .54);
      hands[i].set(side * .32, 1.11, .19 + .34 * press);
      dumbbell(hands[i].x, hands[i].y, hands[i].z);
    }
  }
  function curls(t) {
    pose.headPitch = .11;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1, lift = (1 - Math.cos(t * TAU / 2.5 + i * Math.PI)) / 2;
      hands[i].set(side * .34, .77 + .45 * lift, .16 + .14 * Math.sin(lift * Math.PI));
      dumbbell(hands[i].x, hands[i].y, hands[i].z + .04);
    }
  }
  function cable(t) {
    const pull = (1 - Math.cos(t * TAU / 2.35)) / 2;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1;
      feet[i].z = side * .14;
      hands[i].set(side * (.4 - pull * .1), 1.17 - .16 * pull, .53 - .28 * pull);
      a.set(side * .90, 2.15, 1.11);
      b.copy(hands[i]); b.y += .053;
      rod(a, b, .016, STEEL);
      prop(b.x, b.y - .05, b.z, .16, .045, .05, RUBBER);
      const stack = .83 + .23 * pull;
      for (let j = 0; j < 3; j++) prop(side * .90, stack + j * .034, .71, .34, .031, .24, RUBBER);
      b.set(side * .90, stack + .075, .71);
      rod(a, b, .016, STEEL);
    }
  }
  function vertec(t) {
    const cycle = t % 3.8;
    if (cycle < .4) lastReach = 0;
    const flight = Math.max(0, Math.min(1, (cycle - .65) / .88));
    const crouch = cycle < .65 ? Math.sin(smooth(cycle / .65) * Math.PI) : 0;
    root.position.y += 1.12 * 4 * flight * (1 - flight) - crouch * .10;
    const reach = Math.sin(flight * Math.PI) ** .55;
    hands[0].set(-.25, .84, .22);
    hands[1].set(.30, .86 + 1.02 * reach, .13 - .09 * reach);
    feet[0].y += crouch * .10; feet[1].y += crouch * .10;
    pose.headPitch = -.24 * reach;
    const hand = root.position.y + hands[1].y;
    if (flight < .5 && hand > lastReach && hand >= 2.64) {
      activities.tapVertec(hand);
      lastReach = hand;
    }
  }
  function basketball(t, spot, actor, dt) {
    const cycle = t % 13;
    const [x, z] = spot.at;
    const heading = Math.atan2(RIM.x - x, RIM.z - z);
    const fx = Math.sin(heading), fz = Math.cos(heading);
    root.position.set(x, spot.floor, z);
    root.rotation.y = heading;
    const reboundX = RIM.x + 1.5, reboundZ = RIM.z + 1.35;
    const dribble = cycle < 2.1, launch = cycle >= 2.75;
    if (dribble) {
      const height = .18 + .84 * Math.abs(Math.cos(cycle * Math.PI / .7));
      hands[1].set(.28, .77 + Math.max(0, height - .52) * .58, .43);
      ball.set(x + fx * .43 + fz * .28, height, z + fz * .43 - fx * .28);
    } else if (!launch) {
      const lift = smooth((cycle - 2.1) / .65);
      hands[0].set(-.15, 1.04 + .79 * lift, .42 - .12 * lift);
      hands[1].set(.15, hands[0].y, hands[0].z);
      root.position.y += lift * .17;
      ball.set(x + fx * hands[0].z, root.position.y + hands[0].y + .10, z + fz * hands[0].z);
    } else if (cycle < 4.04) {
      const flight = (cycle - 2.75) / 1.29, hold = 1 - smooth(flight * 4);
      hands[0].set(-.15, .80 + 1.03 * hold, .30);
      hands[1].set(.15, hands[0].y, .30);
      root.position.y += .17 * hold;
      ball.set(mix(x + fx * .30, RIM.x, flight), mix(2.10, RIM.y, flight) + 1.85 * Math.sin(Math.PI * flight), mix(z + fz * .30, RIM.z, flight));
    } else if (cycle < 5.4) {
      const drop = (cycle - 4.04) / 1.36;
      const height = drop < .63 ? mix(RIM.y, .18, (drop / .63) ** 2) : .18 + .49 * Math.sin(Math.PI * (drop - .63) / .37);
      ball.set(mix(RIM.x, reboundX, smooth((drop - .25) / .75)), height, mix(RIM.z, reboundZ, smooth((drop - .25) / .75)));
    } else {
      const walk = cycle < 8.15 ? smooth((cycle - 5.4) / 2.75) : 1 - smooth((cycle - 8.8) / 3.2);
      const pickX = reboundX + .43, pickZ = reboundZ;
      root.position.x = mix(x, pickX, walk); root.position.z = mix(z, pickZ, walk);
      if (cycle < 8.8) root.rotation.y = Math.atan2(reboundX - root.position.x, reboundZ - root.position.z);
      else if (cycle < 12) root.rotation.y = Math.atan2(x - pickX, z - pickZ);
      const crouch = smooth((cycle - 8.15) / .31);
      const lift = smooth((cycle - 8.46) / .34);
      if (cycle < 8.8) ball.set(reboundX, .18 + .92 * lift, reboundZ);
      else ball.set(root.position.x + Math.sin(root.rotation.y) * .43, 1.10, root.position.z + Math.cos(root.rotation.y) * .43);
      if ((cycle < 8.15 || cycle >= 8.8 && cycle < 12) && walk > 0 && walk < 1) {
        activities.setResidentBall(ball.x, ball.y, ball.z);
        if (cycle < 8.15) {
          const moved = actor.moveAnchor(root.position.x, spot.floor, root.position.z, root.rotation.y);
          root.position.x = actor.pos.x; root.position.z = actor.pos.z;
          avatar.update(dt, { speed: moved ? .55 : 0 });
          return true;
        }
        for (let i = 0; i < 2; i++) {
          const stride = t * 8 + i * Math.PI;
          feet[i].z = Math.sin(stride) * .22;
          feet[i].y += Math.max(0, Math.cos(stride)) * .12;
        }
      }
      if (cycle >= 8.15) {
        const bend = crouch * (1 - lift);
        const grip = .87 - .67 * crouch + .87 * lift;
        pose.pitch = .72 * bend;
        pose.headPitch = .18 * bend;
        root.position.y -= .34 * bend;
        if (bend) {
          contact(feet[0], -.13, .105, 0);
          contact(feet[1], .13, .105, 0);
        }
        contact(hands[0], -.14, grip, .43);
        contact(hands[1], .14, grip, .43);
      }
    }
    actor.moveAnchor(root.position.x, spot.floor, root.position.z, root.rotation.y);
    root.position.x = actor.pos.x; root.position.z = actor.pos.z;
    activities.setResidentBall(ball.x, ball.y, ball.z);
    return false;
  }
  function update(spot, actor, t, dt) {
    const id = spot.activityId || spot.id;
    root.position.set(actor.pos.x, actor.y, actor.pos.z);
    root.rotation.set(0, actor.heading, 0);
    pose.pitch = pose.headPitch = pose.headYaw = 0;
    pose.seated = false;
    for (let i = 0; i < 2; i++) {
      const side = i * 2 - 1;
      feet[i].set(side * .13, .105, 0);
      hands[i].set(side * .31, .78, .09);
    }
    // Start a fresh instance list, then place props and pose the same hands
    // that hold them. All prop coordinates are local to the articulated body.
    avatar.beginProps();
    if (spot.seatHeight !== undefined) sit(spot.seatHeight, spot.floor, id === 'tv');
    if (id === 'reading') book(t);
    else if (id === 'tv') tv(t, spot.id === 'tv');
    else if (id === 'gaming') game(t);
    else if (id === 'cooking') cooking(t);
    else if (id === 'treadmill') run(t);
    else if (id === 'gym-bike') bike(t);
    else if (id === 'gym-pullup') pullup(t);
    else if (id === 'gym-bench') bench(t);
    else if (id === 'gym-dumbbells') curls(t);
    else if (id === 'gym-cable') cable(t);
    else if (id === 'gym-vertec') vertec(t);
    else if (id === 'basketball' && basketball(t, spot, actor, dt)) return;
    avatar.update(dt, pose, true);
    avatar.endProps();
    if (id === 'tv' || id === 'gaming') activities.setAmbientActivity(spot.id, root, t);
  }
  function stop(id) {
    if (id === 'tv' || id === 'gaming') activities.setAmbientActivity(null, root);
    if (id === 'basketball') activities.setResidentBall(null);
    if (id === 'treadmill') activities.moveResidentBelt(null);
    if (id === 'gym-bike') activities.moveBikeCrank(0);
  }
  return { update, stop };
}
