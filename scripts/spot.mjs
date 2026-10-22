import puppeteer from 'puppeteer-core';
const [X,Z,A]=[+process.env.X,+process.env.Z,+process.env.A];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
const out = await p.evaluate(([X,Z,A]) => {
  const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true;
  const pr = (x, z) => { const r = []; if (window.__inDivider(x, z)) r.push('div'); if (g.solid(x, z)) r.push('solid'); if (g.life && g.life.solid && g.life.solid(x, z)) r.push('life'); if (g.parked && g.parked.solid(x, z)) r.push('parked'); if (g.traffic && g.traffic.solid(x, z)) r.push('traffic'); if (g.crowd && g.crowd.solid(x, z)) r.push('crowd'); if ((window.__piers||[]).some(q=>Math.hypot(q[0]-x,q[1]-z)<1.15)) r.push('pier'); return r.join(','); };
  const res = { grid: [] };
  for (let dz = -6; dz <= 10; dz += 2) { const row = []; for (let dx = -6; dx <= 6; dx += 2) row.push(pr(X + dx, Z + dz) || '.'); res.grid.push(row.join(' | ')); }
  // timeline: 3 repeat runs, record traffic / crowd positions near spot over time
  const keys = window.__keys; g.auto.x = X - 1.5; g.auto.z = Z - 12; g.auto.a = A; g.auto.v = 0; keys.KeyW = true; res.tl = [];
  for (let i = 0; i < 90; i++) { window.__step(0.05, performance.now()); if (i % 10 === 9) res.tl.push([i, +g.auto.x.toFixed(1), +g.auto.z.toFixed(1), +g.auto.v.toFixed(1)]); }
  keys.KeyW = false;
  return res;
}, [X,Z,A]);
console.log(JSON.stringify(out, null, 1)); await b.close();
