// Converts OpenStreetMap (ODbL, (c) OpenStreetMap contributors) data for the Domlur flyover area
// into game coordinates. Usage: node scripts/build-domlur.mjs roads.json blds.json > public/data/domlur.json
import fs from 'fs';
const [,, rp, bp] = process.argv;
const roads = JSON.parse(fs.readFileSync(rp)).elements, blds = JSON.parse(fs.readFileSync(bp)).elements;
const LAT0 = 12.976, LON0 = 77.642, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110574;
const P = (g) => g.map(p => [Math.round((p.lon - LON0) * KX * 10) / 10, Math.round(-(p.lat - LAT0) * KZ * 10) / 10]);
const ZMIN = 1395;
// ways that become the elevated flyover decks (excluded from ground roads)
const DECK_IDS = new Set([423269031, 23217833, 15802887, 27227541, 1458672911, 464465650, 1286537528, 1286537527, 1286537540, 1286537541, 1302988906, 1314297631]);
const KMAP = { trunk: 4, primary: 4, secondary: 4, primary_link: 3, secondary_link: 3, tertiary: 3, tertiary_link: 2, unclassified: 2, residential: 2, living_street: 2, service: 1 };
const byId0 = new Map(roads.map(e => [e.id, e]));
const deckSamples = [];
for (const id of [1314297631, 1286537540, 423269031, 15802887, 1286537528, 1302988906, 1286537527, 464465650, 27227541, 1458672911, 23217833, 1286537541]) for (const q of P(byId0.get(id).geometry)) deckSamples.push(q);
const nearDeck = (pts) => pts.some(p => deckSamples.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 22));
const outRoads = [];
for (const e of roads) {
  const t = e.tags; if (!t || !t.highway || DECK_IDS.has(e.id)) continue;
  const k = KMAP[t.highway]; if (!k) continue;
  // elevated link ramps (bridge-tagged) and links running along the flyover are not modelled: never render them as usable ground roads
  if (/_link$/.test(t.highway) && (t.bridge || nearDeck(P(e.geometry)))) continue;
  let pts = P(e.geometry).filter(p => p[1] >= ZMIN);
  if (pts.length < 2) continue;
  outRoads.push({ k, n: t.name || '', p: pts, oneway: t.oneway === 'yes' ? 1 : 0 });
}
const byId = new Map(roads.map(e => [e.id, e]));
const chain = (ids) => { const out = []; for (const id of ids) { const g = P(byId.get(id).geometry); for (const q of g) { const l = out[out.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 0.5) out.push(q); } } return out; };
const sb = chain([1314297631, 1286537540, 423269031, 15802887, 1286537528, 1302988906]);
const nb = chain([1286537527, 464465650, 27227541, 1458672911, 23217833, 1286537541]).reverse(); // nb listed north->south? keep travel order south->north reversed below
const outB = [];
for (const e of blds) {
  const t = e.tags || {}; const pts = P(e.geometry); if (pts.length < 4) continue;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length; if (cz < ZMIN + 6) continue;
  let h = parseFloat(t.height) || (parseFloat(t['building:levels']) || 0) * 3.3 || (6.6 + ((Math.abs(Math.round(pts[0][0] * 7 + pts[0][1] * 3)) % 4) * 3.3));
  if (!(h > 2)) h = 6.6; h = Math.min(h, 60);
  const closed = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts : [...pts, pts[0]];
  outB.push({ p: closed, h: Math.round(h * 10) / 10 });
}
console.log(JSON.stringify({ attribution: 'Map data (c) OpenStreetMap contributors, ODbL', roads: outRoads, buildings: outB, decks: { sb, nb } }));
