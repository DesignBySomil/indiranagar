import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 3000));
const starts = JSON.parse(process.env.STARTS);
const out = await p.evaluate((starts) => {
  const g = window.__game, K = window.__keys, res = [];
  const FPT = [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]];
  const preds = (x, z) => ({ div: !!window.__inDivider(x, z), solid: !!g.solid(x, z), life: !!(g.life && g.life.solid(x, z)), parked: !!(g.parked && g.parked.solid(x, z)), traffic: !!(g.traffic && g.traffic.solid(x, z)), crowd: !!(g.crowd && g.crowd.solid(x, z)) });
  for (const [sx, sz, a] of starts) {
    g.auto.x = sx; g.auto.z = sz; g.auto.a = a; g.auto.v = 0; g.auto.steer = 0; K.KeyW = true;
    const log = []; let prev = null;
    for (let i = 0; i < 90; i++) {
      const before = [g.auto.x, g.auto.z, g.auto.v, g.auto.a];
      window.__step(0.05, performance.now());
      const mv = Math.hypot(g.auto.x - before[0], g.auto.z - before[1]), want = Math.abs(before[2]) * 0.05;
      if (i >= 30 && want > 0.05 && mv < want * 0.5) {
        // blocked this step: which predicate at which footprint point blocks the intended move
        const s = Math.sin(before[3]), c = Math.cos(before[3]), dx = s * before[2] * 0.05, dz = c * before[2] * 0.05, hits = [];
        FPT.forEach(([lx, lz], k) => { const px = before[0] + dx + c * lx + s * lz, pz = before[1] + dz - s * lx + c * lz; const q = preds(px, pz); const n = Object.keys(q).filter(k2 => q[k2]); if (n.length) hits.push(k + ':' + n.join('+') + '@' + px.toFixed(1) + ',' + pz.toFixed(1)); });
        log.push({ step: i, v: +before[2].toFixed(1), want: +want.toFixed(2), moved: +mv.toFixed(3), hits });
        if (log.length >= 4) break;
      }
    }
    K.KeyW = false;
    res.push({ start: [sx, sz, a], end: [+g.auto.x.toFixed(1), +g.auto.z.toFixed(1)], blockedSteps: log });
  }
  return res;
}, starts);
console.log(JSON.stringify(out)); await b.close();
