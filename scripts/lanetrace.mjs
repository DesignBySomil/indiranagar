import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 3000));
const out = await p.evaluate((mode, S, C, ROAD) => {
  const g = window.__game, keys = window.__keys, res = { stalls: [], runs: 0, hz: 0 };
  const probe = (x, z) => ({ div: !!window.__inDivider(x, z), solid: !!g.solid(x, z), life: !!(g.life && g.life.solid && g.life.solid(x, z)), parked: !!(g.parked && g.parked.solid(x, z)), traffic: !!(g.traffic && g.traffic.solid(x, z)), crowd: !!(g.crowd && g.crowd.solid(x, z)) });
  const run = (x, z, a, tag) => {
    g.auto.x = x; g.auto.z = z; g.auto.a = a; g.auto.v = 0; g.auto.steer = 0;
    keys.KeyW = true; res.runs++;
    let moved = 0;
    const tr = []; const FPT = [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
    for (let i = 0; i < 90; i++) { window.__step(0.05, performance.now());
      if (i % 6 === 5) { const sn = Math.sin(g.auto.a), cs = Math.cos(g.auto.a); const cat = {};
        for (const [lx, lz] of FPT) { const px = g.auto.x + cs * lx + sn * lz, pz = g.auto.z - sn * lx + cs * lz; const q = probe(px, pz); for (const k in q) if (q[k]) cat[k] = 1; }
        const fa = [3, 6].map(d => { const q = probe(g.auto.x + sn * d, g.auto.z + cs * d); return Object.keys(q).filter(k => q[k]).join('+') || '-'; });
        tr.push([i + 1, +g.auto.x.toFixed(1), +g.auto.z.toFixed(1), +g.auto.v.toFixed(1), +g.auto.a.toFixed(2), +(g.auto.steer || 0).toFixed(2), Object.keys(cat).join('+') || '-', fa.join('|')]); } }
    g.__tr = tr; const a0 = a;
    keys.KeyW = false;
    moved = Math.hypot(g.auto.x - x, g.auto.z - z);
    if (moved < 14) {
      const s = Math.sin(g.auto.a), c = Math.cos(g.auto.a), fx = g.auto.x + s * 2, fz = g.auto.z + c * 2;
      res.stalls.push({ tr, a0: +a.toFixed(2), tag, from: [+x.toFixed(1), +z.toFixed(1)], moved: +moved.toFixed(1), at: [+g.auto.x.toFixed(1), +g.auto.z.toFixed(1)], v: +g.auto.v.toFixed(2), ahead: probe(fx, fz), here: probe(g.auto.x, g.auto.z), pierAhead: !!(window.__piers || []).some(q => Math.hypot(q[0] - fx, q[1] - fz) < 1.6) });
    }
  };
  const segs = g.roadSegs();
  if (mode === 'hz') {
    const hz = [...g.hazards.potholes.map(h => ({ ...h, k: 'pot' })), ...g.hazards.puddles.map(h => ({ ...h, k: 'pud' }))];
    res.hz = hz.length;
    for (const h of hz.slice(S, S + C)) {
      let best = null, bd = 1e9;
      for (const s of segs) { const dx = s.x2 - s.x1, dz = s.z2 - s.z1, L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((h.x - s.x1) * dx + (h.z - s.z1) * dz) / L2)); const d = Math.hypot(h.x - (s.x1 + dx * t), h.z - (s.z1 + dz * t)); if (d < bd) { bd = d; best = s; } }
      if (!best) continue;
      const L = Math.hypot(best.x2 - best.x1, best.z2 - best.z1), ux = (best.x2 - best.x1) / L, uz = (best.z2 - best.z1) / L;
      for (const dir of [1, -1]) {
        const a = Math.atan2(ux * dir, uz * dir);
        const sx = h.x - Math.sin(a) * 10, sz = h.z - Math.cos(a) * 10;
        if (g.solid(sx, sz)) continue;
        run(sx, sz, a, h.k + ' r' + h.r.toFixed(2) + ' ' + (best.name || ''));
      }
    }
  }
  if (mode === 'lane') {
    const name = ROAD;
    const list = [];
    for (const s of segs) { if (!(s.name || '').includes(name)) continue; const L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1); const ux = (s.x2 - s.x1) / L, uz = (s.z2 - s.z1) / L; for (let d = 2; d < L - 14; d += 30) for (const off of [-3.5, 0, 3.5]) { const sx = s.x1 + ux * d - uz * off, sz = s.z1 + uz * d + ux * off; list.push([sx, sz, Math.atan2(ux, uz)]); } }
    res.total = list.length;
    for (const [sx, sz, a] of list.slice(S, S + C)) { if (g.solid(sx, sz)) { res.skippedSolid = (res.skippedSolid || 0) + 1; continue; } run(sx, sz, a, name); }
  }
  return res;
}, process.env.MODE || 'hz', +(process.env.S || 0), +(process.env.C || 20), process.env.ROAD || '100 Feet');
console.log(JSON.stringify(out, null, 0)); await b.close();
