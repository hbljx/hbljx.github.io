// Seat surfaces match the existing batched furniture in furnish.js. `at` is
// an open approach point; `anchor` keeps the actual floor for the player, while
// `seatHeight` is the absolute cushion top used by the seated avatar pose.
export function makeSeat(id, title, x, floor, z, seatHeight, yaw, at, radius = 1.65) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  return {
    id: `seat-${id}`, kind: 'seat', title, at, floor, radius,
    anchor: [x, floor, z], seatHeight, yaw,
    view: [x + fx * 3.6 + fz * 2.3, seatHeight + 3.1, z + fz * 3.6 - fx * 2.3],
    look: [x, seatHeight + .65, z],
  };
}

export const SEATS = [
  makeSeat('studio-main', 'AI 工作台 · 电脑椅', 2.1, 0, -9.55, .57, Math.PI, [1.2, -8.3]),
  makeSeat('studio-side', 'AI 工作台 · 双屏电脑椅', 4.05, 0, -9.1, .57, Math.PI / 2, [3.8, -7.9]),
  makeSeat('reading', '灵感书房 · 阅读椅', -8.8, 4, -6.85, 4.57, 0, [-7.4, -6.85]),
  ...[-4.15, -3.2, -2.25].map((z, i) =>
    makeSeat(`sofa-${i + 1}`, '日常客厅 · 沙发', 2.95, 0, z, .56, -Math.PI / 2, [1.85, z], 1.2)),
  makeSeat('bed-west', '卧室 · 床沿', -13.4, 4, -9.15, 4.66, -Math.PI / 2, [-14.5, -9.15], 1.45),
  makeSeat('bed-east', '卧室 · 床沿', -10.6, 4, -9.15, 4.66, Math.PI / 2, [-9.45, -9.15], 1.45),
  ...[-13, -12, -11].map((x, i) =>
    makeSeat(`bed-bench-${i + 1}`, '卧室 · 床尾凳', x, 4, -7.665, 4.49, 0, [x, -6.6], 1.25)),
  ...[16.6, 18.2].map((x, i) =>
    makeSeat(`island-${i + 1}`, '厨房 · 吧台凳', x, 0, 9.8, .75, Math.PI, [x, 10.7], 1.25)),
  ...[15.45, 16.55].flatMap((x, i) => [
    makeSeat(`dining-north-${i + 1}`, '餐厅 · 餐椅', x, 0, 11.8, .51, 0, [x, 10.9], 1.15),
    makeSeat(`dining-south-${i + 1}`, '餐厅 · 餐椅', x, 0, 13.8, .51, Math.PI, [x, 14.75], 1.15),
  ]),
  makeSeat('terrace-west', '露台 · 木凳', -14.8, 0, 19, .45, Math.PI / 2, [-15.75, 19], 1.5),
  makeSeat('terrace-east', '露台 · 木凳', -11.2, 0, 19, .45, -Math.PI / 2, [-10.25, 19], 1.5),
  makeSeat('gym-bench', '健身区 · 训练凳', -15.6, 0, 12.7, .54, Math.PI, [-15.6, 11.6], 1.5),
  makeSeat('exercise-bike', '健身区 · 单车坐垫', -11.7, 0, 12.53, .98, Math.PI, [-10.5, 12.3], 1.5),
];

// Mountain furniture is placed from procedural terrain heights, so its seat
// coordinates are recorded when the matching bench geometry is created.
export function getSeats(world) {
  return [...SEATS, ...(world.mountain?.seats || [])];
}
