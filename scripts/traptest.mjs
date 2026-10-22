import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 3000));
const out = await p.evaluate(() => {
  const g = window.__game, K = window.__keys, res = [], segs = g.roadSegs().filter(s => /100 Feet|Chinmaya|12th Main/.test(s.name || ''));
  let n = 0;
  for (let k = 0; k < segs.length && n < 12; k += 3) {
    const s = segs[k], L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1); if (L < 20) continue;
    const ux = (s.x2 - s.x1) / L, uz = (s.z2 - s.z1) / L, mx = (s.x1 + s.x2) / 2, mz = (s.z1 + s.z2) / 2;
    for (const sg of [1, -1]) {
      let wall = null; for (let d = 2; d < 30; d += 0.5) { const x = mx + uz * d * sg, z = mz - ux * d * sg; if (g.solid(x, z)) { wall = d; break; } }
      if (wall === null || wall < 5) continue;
      const sx = mx + uz * (wall - 4) * sg, sz = mz - ux * (wall - 4) * sg, a = Math.atan2(uz * sg, -ux * sg);
      g.auto.x = sx; g.auto.z = sz; g.auto.a = a; g.auto.v = 0; g.auto.steer = 0; window.__step(0.05, performance.now());
      K.KeyW = true; let maxJump = 0, jumps = 0, minD = 1e9;
      const rx = mx, rz = mz;
      for (let i = 0; i < 160; i++) { const px = g.auto.x, pz = g.auto.z; window.__step(0.05, performance.now()); const m = Math.hypot(g.auto.x - px, g.auto.z - pz); if (m > 1.5) jumps++; maxJump = Math.max(maxJump, m); }
      K.KeyW = false;
      const dist = Math.hypot(g.auto.x - mx, g.auto.z - mz);
      res.push({ road: s.name, wallDist: wall, jumps, maxJump: +maxJump.toFixed(1), endDistFromRoadMid: +dist.toFixed(1), v: +g.auto.v.toFixed(1) });
      n++; break;
    }
  }
  return res;
});
console.log(JSON.stringify(out)); await b.close();
