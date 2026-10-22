import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
const out = await p.evaluate((name) => {
  const g = window.__game; g.state.hour = 17.5; g.go(); window.__paused = true; window.__noRender = true;
  const res = { skipped: [], byOff: {}, total: 0 };
  for (const s of g.roadSegs()) { if (!(s.name || '').includes(name)) continue; const L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1); const ux = (s.x2 - s.x1) / L, uz = (s.z2 - s.z1) / L;
    for (let d = 2; d < L - 14; d += 30) for (const off of [-3.5, 0, 3.5]) { const sx = s.x1 + ux * d - uz * off, sz = s.z1 + uz * d + ux * off; res.total++;
      if (g.solid(sx, sz)) { res.byOff[off] = (res.byOff[off] || 0) + 1; const near = [0.5, 1, 2, 3].map(r => [[r, 0], [-r, 0], [0, r], [0, -r]].filter(([dx, dz]) => g.solid(sx + dx, sz + dz)).length); res.skipped.push({ at: [+sx.toFixed(1), +sz.toFixed(1)], off, w: s.width, div: !!window.__inDivider(sx, sz), ringSolid: near }); } } }
  return res; }, process.env.ROAD || '100 Feet');
console.log(JSON.stringify(out)); await b.close();
