import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step && window.__piers', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 2000));
const out = await p.evaluate(() => {
  const g = window.__game, P = window.__piers, segs = g.roadSegs().filter(s => /Chinmaya/.test(s.name || ''));
  const dseg = (x, z) => { let bd = 1e9; for (const s of segs) { const dx = s.x2 - s.x1, dz = s.z2 - s.z1, L2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / L2)); bd = Math.min(bd, Math.hypot(x - s.x1 - dx * t, z - s.z1 - dz * t)); } return bd; };
  const ds = P.map(q => +dseg(q[0], q[1]).toFixed(1));
  const res = { piers: P.length, minDistToCentreline: Math.min(...ds), maxD: Math.max(...ds), sample: P.slice(0, 4).map(q => q.map(v => +v.toFixed(1))) };
  // drive each carriageway: start on each CMH way's first point, follow the way's points with a lane-follower
  const keys = window.__keys; res.runs = [];
  const ways = {}; for (const s of segs) (ways[s.name + '|' + Math.round(s.x1 / 50) + '|' + Math.round(s.z1)] ??= []).push(s);
  const lines = g.world && g.world.roads ? g.world.roads : null;
  return res;
});
console.log(JSON.stringify(out)); await b.close();
