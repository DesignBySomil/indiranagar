import puppeteer from 'puppeteer-core';
import fs from 'fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 2500));
const S = +(process.env.S || 0), C = +(process.env.C || 100);
const out = await p.evaluate((S, C) => {
  const g = window.__game, K = window.__keys, segsAll = g.roadSegs();
  const seen = new Set(), segs = [];
  segsAll.forEach((s, idx) => { const k = [s.x1, s.z1, s.x2, s.z2].map(v => Math.round(v)).join(','); const k2 = [s.x2, s.z2, s.x1, s.z1].map(v => Math.round(v)).join(','); if (seen.has(k) || seen.has(k2)) return; seen.add(k); segs.push({ ...s, idx }); });
  const MAP = { x0: -622, x1: 802, z0: -777, z1: 747 };
  const total = segs.length; const list = segs.slice(S, S + C); const res = [];
  const preds = (x, z) => { const o = []; if (window.__inDivider(x, z)) o.push('divider'); if (g.solid(x, z)) o.push('solid'); if ((window.__piers || []).some(P => (x - P[0]) ** 2 + (z - P[1]) ** 2 < 1.32)) o.push('pier'); if (g.parked && g.parked.solid(x, z)) o.push('parked'); if (g.life && g.life.solid(x, z)) o.push('life'); if (g.traffic && g.traffic.solid(x, z)) o.push('traffic'); if (g.crowd && g.crowd.solid(x, z)) o.push('crowd'); return o; };
  for (const s of list) {
    const L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1); const mx = (s.x1 + s.x2) / 2, mz = (s.z1 + s.z2) / 2;
    const rec = { i: s.idx, name: s.name || '', len: +L.toFixed(1), w: s.width, mid: [Math.round(mx), Math.round(mz)] };
    if (mx < MAP.x0 || mx > MAP.x1 || mz < MAP.z0 || mz > MAP.z1) { rec.status = 'out-of-bounds'; res.push(rec); continue; }
    if (L < 16) { rec.status = 'too-short'; res.push(rec); continue; }
    const ux = (s.x2 - s.x1) / L, uz = (s.z2 - s.z1) / L; rec.dirs = [];
    for (const dir of [1, -1]) {
      const a = Math.atan2(ux * dir, uz * dir); const sx = mx - Math.sin(a) * Math.min(8, L / 2 - 2), sz = mz - Math.cos(a) * Math.min(8, L / 2 - 2);
      const d = {};
      if (g.solid(sx, sz)) { d.status = 'start-solid'; rec.dirs.push(d); continue; }
      g.auto.x = sx; g.auto.z = sz; g.auto.a = a; g.auto.v = 0; g.auto.steer = 0; K.KeyW = true; let jumps = 0;
      for (let i = 0; i < 50; i++) { const px = g.auto.x, pz = g.auto.z; window.__step(0.05, performance.now()); if (Math.hypot(g.auto.x - px, g.auto.z - pz) > 1.5) jumps++; }
      K.KeyW = false; const moved = Math.hypot(g.auto.x - sx, g.auto.z - sz);
      d.moved = +moved.toFixed(1); d.jumps = jumps;
      if (moved >= 14) d.status = jumps ? 'moved-with-relocation' : 'pass';
      else { const sn = Math.sin(g.auto.a), cs = Math.cos(g.auto.a); const c = new Set(); for (const f of [0, 1, 2.2, 3.5]) preds(g.auto.x + sn * f, g.auto.z + cs * f).forEach(v => c.add(v)); d.status = 'stalled'; d.cause = [...c].join('+') || 'none-found'; }
      rec.dirs.push(d);
    }
    res.push(rec);
  }
  return { total, from: S, n: list.length, res };
}, S, C);
fs.writeFileSync(process.env.OUT, JSON.stringify(out)); console.log(out.total, out.n); await b.close();
