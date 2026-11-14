import { onLocation } from '../location.js';
const RAD = Math.PI / 180, TAU = Math.PI * 2, SYNODIC = 29.530588853;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = x => ((x % TAU) + TAU) % TAU;

// Compact Meeus-style solar/lunar coordinates, sufficient for a sky disk and
// its illuminated fraction (the lunar longitude approximation is <~1 degree).
function coordinates(date) {
  const d = date.getTime() / 86400000 - 10957.5;
  const L = (218.316 + 13.176396 * d) * RAD;
  const M = (134.963 + 13.064993 * d) * RAD;
  const F = (93.272 + 13.229350 * d) * RAD;
  const moonLon = L + 6.289 * RAD * Math.sin(M);
  const moonLat = 5.128 * RAD * Math.sin(F);
  const obliquity = 23.4397 * RAD;
  const toEquatorial = (lon, lat) => ({
    ra: Math.atan2(Math.sin(lon) * Math.cos(obliquity) - Math.tan(lat) * Math.sin(obliquity), Math.cos(lon)),
    dec: Math.asin(Math.sin(lat) * Math.cos(obliquity) + Math.cos(lat) * Math.sin(obliquity) * Math.sin(lon)),
  });
  const sunM = (357.5291 + .98560028 * d) * RAD;
  const sunLon = sunM + (1.9148 * Math.sin(sunM) + .0200 * Math.sin(2 * sunM) + .0003 * Math.sin(3 * sunM)) * RAD + (102.9372 * RAD) + Math.PI;
  return { moon: toEquatorial(moonLon, moonLat), sun: toEquatorial(sunLon, 0), d, M };
}

export function lunarSky(date = new Date(), latitude = 0, longitude = 0) {
  const { moon, sun, d, M } = coordinates(date);
  const cosElongation = clamp(Math.sin(moon.dec) * Math.sin(sun.dec) + Math.cos(moon.dec) * Math.cos(sun.dec) * Math.cos(moon.ra - sun.ra), -1, 1);
  const elongation = Math.acos(cosElongation);
  const illumination = (1 - Math.cos(elongation)) * .5;
  const waxing = Math.sin(moon.ra - sun.ra) >= 0;
  const brightAngle = Math.atan2(Math.cos(sun.dec) * Math.sin(sun.ra - moon.ra), Math.sin(sun.dec) * Math.cos(moon.dec) - Math.cos(sun.dec) * Math.sin(moon.dec) * Math.cos(sun.ra - moon.ra));

  // Topocentric placement makes the disk follow the real sky at this location.
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const sidereal = wrap((280.46061837 + 360.98564736629 * (jd - 2451545) + .000387933 * T * T) * RAD + longitude * RAD);
  const hourAngle = Math.atan2(Math.sin(sidereal - moon.ra), Math.cos(sidereal - moon.ra));
  const lat = latitude * RAD, dec = moon.dec;
  const east = -Math.cos(dec) * Math.sin(hourAngle);
  const north = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(hourAngle) * Math.sin(lat);
  const up = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(hourAngle) * Math.cos(lat);
  const altitude = Math.asin(clamp(up, -1, 1));
  const azimuth = Math.atan2(east, north);
  const parallacticAngle = Math.atan2(Math.sin(hourAngle), Math.tan(lat) * Math.cos(dec) - Math.sin(dec) * Math.cos(hourAngle));
  // World convention: +x east, +y up, +z south.
  const dir = { x: Math.cos(altitude) * Math.sin(azimuth), y: Math.sin(altitude), z: -Math.cos(altitude) * Math.cos(azimuth) };
  const phaseAge = (((d + 1.5) % SYNODIC) + SYNODIC) % SYNODIC;
  return { dir, illumination, brightAngle: brightAngle - parallacticAngle, waxing, phaseAge, latitude, longitude, meanAnomaly: M };
}

export function locateForLunarSky(onChange) {
  return onLocation(({latitude,longitude})=>onChange(latitude,longitude));
}
