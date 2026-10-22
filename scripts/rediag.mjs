import puppeteer from 'puppeteer-core';
import fs from 'fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 2500));
const rows = JSON.parse(fs.readFileSync(process.env.ROWS, 'utf8')).slice(+(process.env.S || 0), +(process.env.S || 0) + +(process.env.C || 50));
const out = await p.evaluate((rows) => {
  const g = window.__game, K = window.__keys, segsAll = g.roadSegs(), res = [];
  const preds = (x, z) => { const o = []; if (window.__inDivider(x, z)) o.push('divider'); if (g.solid(x, z)) o.push('solid'); if ((window.__piers || []).some(P => (x - P[0]) ** 2 + (z - P[1]) ** 2 < 1.32)) o.push('pier'); if (g.parked && g.parked.solid(x, z)) o.push('parked'); if (g.life && g.life.solid(x, z)) o.push('life'); if (g.traffic && g.traffic.solid(x, z)) o.push('traffic'); if (g.crowd && g.crowd.solid(x, z)) o.push('crowd'); return o; };
  const FP = [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  for (const [idx, k] of rows) {
    const s = segsAll[idx]; const L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1), mx = (s.x1 + s.x2) / 2, mz = (s.z1 + s.z2) / 2, ux = (s.x2 - s.x1) / L, uz = (s.z2 - s.z1) / L, dir = k === 0 ? 1 : -1;
    const a = Math.atan2(ux * dir, uz * dir); const sx = mx - Math.sin(a) * Math.min(8, L / 2 - 2), sz = mz - Math.cos(a) * Math.min(8, L / 2 - 2);
    const rec = { idx, name: s.name || '', w: s.width, dir: k, start: [+sx.toFixed(1), +sz.toFixed(1)], startSolid: g.solid(sx, sz) };
    if (rec.startSolid) { const f = []; for (const [lx, lz] of FP) { const px = sx + Math.cos(a) * lx + Math.sin(a) * lz, pz = sz - Math.sin(a) * lx + Math.cos(a) * lz; if (g.solid(px, pz)) f.push([lx, lz]); } rec.solidPts = f; res.push(rec); continue; }
    g.auto.x = sx; g.auto.z = sz; g.auto.a = a; g.auto.v = 0; g.auto.steer = 0; K.KeyW = true; let blocked = [], jumps = 0, vmax = 0;
    for (let i = 0; i < 150; i++) {
      const px = g.auto.x, pz = g.auto.z, pv = g.auto.v, pa = g.auto.a; window.__step(0.05, performance.now());
      const mv = Math.hypot(g.auto.x - px, g.auto.z - pz); if (mv > 1.5) jumps++; vmax = Math.max(vmax, g.auto.v);
      if (pv > 0.5 && mv < pv * 0.05 * 0.5 && blocked.length < 3) { const sn = Math.sin(pa), cs = Math.cos(pa), dx = sn * pv * 0.05, dz = cs * pv * 0.05, h = []; FP.forEach(([lx, lz], q) => { const qx = px + dx + Math.cos(pa) * lx + sn * lz, qz = pz + dz - sn * lx + cs * lz; const r = preds(qx, qz); if (r.length) h.push(q + ':' + r.join('+') + '@' + qx.toFixed(1) + ',' + qz.toFixed(1)); }); blocked.push({ i, v: +pv.toFixed(1), h }); }
    }
    K.KeyW = false; rec.moved = +Math.hypot(g.auto.x - sx, g.auto.z - sz).toFixed(1); rec.jumps = jumps; rec.vmax = +vmax.toFixed(1); rec.blocked = blocked; res.push(rec);
  }
  return res;
}, rows);
fs.writeFileSync(process.env.OUT, JSON.stringify(out)); console.log(out.length); await b.close();
