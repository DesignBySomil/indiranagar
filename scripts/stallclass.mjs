import puppeteer from 'puppeteer-core';
const starts = JSON.parse(process.env.STARTS);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
const out = await p.evaluate((starts) => {
  const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true;
  const pts = [[0.85, 1.8], [-0.85, 1.8], [0.85, -1.3], [-0.85, -1.3], [0, 1.95], [0, 0.3], [0, -1.3]];
  const why = (x, z, a) => { const s = Math.sin(a), c = Math.cos(a), r = {}; for (const [lx, lz] of pts) { const px = x + c * lx + s * lz, pz = z - s * lx + c * lz; if (window.__inDivider(px, pz)) r.div = 1; if (g.solid(px, pz)) r.solid = 1; if (g.life && g.life.solid && g.life.solid(px, pz)) r.life = 1; if (g.parked && g.parked.solid(px, pz)) r.parked = 1; if (g.traffic && g.traffic.solid(px, pz)) r.traffic = 1; if (g.crowd && g.crowd.solid(px, pz)) r.crowd = 1; } return Object.keys(r).join(','); };
  return starts.map(([x, z, ex, ez]) => {
    const a = Math.atan2(ex - x, ez - z); g.auto.x = x; g.auto.z = z; g.auto.a = a; g.auto.v = 0; g.auto.steer = 0; window.__keys.KeyW = true;
    const startWhy = why(x, z, a); let firstMove = -1, lastBlockedWhy = '', blockedSteps = 0, prev = [x, z];
    for (let i = 0; i < 90; i++) { window.__step(0.05, performance.now()); const d = Math.hypot(g.auto.x - prev[0], g.auto.z - prev[1]); if (firstMove < 0 && d > 0.2) firstMove = i; prev = [g.auto.x, g.auto.z]; const w = why(g.auto.x, g.auto.z, g.auto.a); if (w) { blockedSteps++; lastBlockedWhy = w; } }
    window.__keys.KeyW = false;
    return { from: [x, z], startOverlap: startWhy, firstMoveStep: firstMove, overlapSteps: blockedSteps, lastWhy: lastBlockedWhy, end: [+g.auto.x.toFixed(1), +g.auto.z.toFixed(1)], v: +g.auto.v.toFixed(1), moved: +Math.hypot(g.auto.x - x, g.auto.z - z).toFixed(1) };
  });
}, starts);
console.log(JSON.stringify(out)); await b.close();
