import fs from 'fs';
const raw = JSON.parse(fs.readFileSync(new URL('./osm.json', import.meta.url))).elements;
const LAT0 = 12.9760, LON0 = 77.6420;
const kx = 111320 * Math.cos(LAT0 * Math.PI / 180), kz = 110574;
const P = (lat, lon) => [Math.round((lon - LON0) * kx * 10) / 10, Math.round(-(lat - LAT0) * kz * 10) / 10];
const BOUND = { x: 900, z: 900 };
const inb = ([x, z]) => Math.abs(x) < BOUND.x && Math.abs(z) < BOUND.z;
const roads = [], buildings = [], pois = [];
const rank = { trunk: 5, primary: 5, secondary: 4, tertiary: 3, residential: 2, unclassified: 2, living_street: 1, service: 1 };
for (const e of raw) {
  const t = e.tags || {};
  if (e.type === 'way' && t.highway && rank[t.highway] && e.geometry) {
    const pts = e.geometry.map(g => P(g.lat, g.lon));
    if (pts.some(inb)) roads.push({ k: rank[t.highway], n: t.name || '', p: pts });
  } else if (e.type === 'way' && t.building && e.geometry && e.geometry.length > 3) {
    const pts = e.geometry.map(g => P(g.lat, g.lon));
    if (!pts.every(inb)) continue;
    let h = parseFloat(t.height) || (parseFloat(t['building:levels']) || 0) * 3.2;
    buildings.push({ p: pts, h: h || 0 });
  } else if (e.type === 'node' && t.name) {
    const [x, z] = P(e.lat, e.lon);
    if (!inb([x, z])) continue;
    pois.push({ n: t.name, t: t.amenity || t.railway, x, z });
  }
}
fs.writeFileSync(new URL('../public/data/world.json', import.meta.url), JSON.stringify({ lat0: LAT0, lon0: LON0, roads, buildings, pois }));
console.log(roads.length, buildings.length, pois.length, fs.statSync(new URL('../public/data/world.json', import.meta.url)).size);
