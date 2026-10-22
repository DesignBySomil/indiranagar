import puppeteer from 'puppeteer-core';
import fs from 'fs';
const D = JSON.parse(fs.readFileSync('public/data/domlur.json', 'utf8')).decks;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto(process.env.URL || 'http://localhost:4173/?ao=0', { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__overpass', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.state.snap = true; g.go(); });
await new Promise(r => setTimeout(r, 1500));
async function run(name, poly, steps, shot, midShot) {
  await p.keyboard.down('KeyW');
  const res = await p.evaluate(async ([poly, steps, midShot]) => {
    const g = window.__game, op = window.__overpass; window.__paused = true; window.__noRender = true;
    const L = window.__overpass.lanes[poly]; const pts = L.X.map((x, i) => [x, L.Z[i]]); if (poly === 1) pts.reverse(); poly = pts; const s0 = poly[0], s1 = poly[2]; const a0 = Math.atan2(s1[0] - s0[0], s1[1] - s0[1]);
    g.auto.x = s0[0] - Math.sin(a0) * 25; g.auto.z = s0[1] - Math.cos(a0) * 25; g.auto.a = a0; g.auto.v = 0; g.auto.y = 0;
    let maxY = 0, camIn = 0, u0 = g.auto.unstickAt || 0, unst = 0, deckFramesOff = 0; const trace = [];
    const wrap = d => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    const end = poly[poly.length - 1]; const stall = []; let done = -1, midDone = false;
    for (let k = 0; k < steps; k++) {
      // nearest poly vertex then look ahead 2 vertices
      let bi = 0, bd = 1e9; for (let i = 0; i < poly.length; i++) { const d = Math.hypot(poly[i][0] - g.auto.x, poly[i][1] - g.auto.z); if (d < bd) { bd = d; bi = i; } }
      const tgt = poly[Math.min(poly.length - 1, bi + 5)];
      const want = Math.atan2(tgt[0] - g.auto.x, tgt[1] - g.auto.z);
      g.auto.a += Math.max(-0.05, Math.min(0.05, wrap(want - g.auto.a)));
      window.__keyW = true; window.__step(0.05, 0);
      maxY = Math.max(maxY, g.auto.y || 0);
      if ((g.auto.unstickAt || 0) !== u0) { unst++; u0 = g.auto.unstickAt; }
      const c = g.camera.position; if (g.solid(c.x, c.z) && (g.auto.y || 0) < 1) camIn++;
      if (k % 100 === 0) trace.push([Math.round(g.auto.x), Math.round(g.auto.z), +(g.auto.y || 0).toFixed(2), +g.auto.v.toFixed(1)]);
      if (g.auto.v < 1 && k > 40 && stall.length < 4) stall.push([k, Math.round(g.auto.x*10)/10, Math.round(g.auto.z*10)/10, +(g.auto.y||0).toFixed(2), g.solid(g.auto.x, g.auto.z), op.pierSolid(g.auto.x, g.auto.z), !!op.probe(g.auto.x, g.auto.z)]);
      if (Math.hypot(end[0] - g.auto.x, end[1] - g.auto.z) < 14) { done = k; break; }
    }
    window.__paused = false; window.__noRender = false;
    return { maxY: +maxY.toFixed(2), endY: +(g.auto.y || 0).toFixed(2), end: [Math.round(g.auto.x), Math.round(g.auto.z)], reachedEndAtStep: done, unst, camIn, stall, trace };
  }, [poly, steps, midShot]);
  await p.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 1500));
  if (shot) await p.screenshot({ path: shot });
  console.log('FLY', name, JSON.stringify(res));
}
await run('SB follow', 0, 1600, '/tmp/fly2-sb-end.png');
await run('NB follow', 1, 1600, '/tmp/fly2-nb-end.png');
await b.close();
