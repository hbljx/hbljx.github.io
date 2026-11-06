export const VEHICLE_COLORS = [
  0xf0eee8,
  0x252a30,
  0x8b969c,
  0xb82f36,
  0x285a91,
  0x176b59,
  0xd5ad3f,
  0xc86b32,
  0x694b82,
  0x52615e,
];

export function chooseVehicleColor(type) {
  const key = `homecraft-vehicle-color:${type}`;
  let previous = -1;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) previous = Number(stored);
  } catch {}
  const options = VEHICLE_COLORS.map((_, index) => index).filter(index => index !== previous);
  const selected = options[Math.floor(Math.random() * options.length)];
  try { localStorage.setItem(key, String(selected)); } catch {}
  return VEHICLE_COLORS[selected];
}
