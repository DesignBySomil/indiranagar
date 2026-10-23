import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 2500));
const out = await p.evaluate(() => {
  const g = window.__game, K = window.__keys, res = [];
  const T = (x, z) => !!(g.traffic && g.traffic.solid(x, z));
  // find traffic vehicles: scan CMH area grid, then step the world a bit
  window.__step(0.05, performance.now());
  const found = [];
  for (let x = -100; x < 480 && found.length < 6; x += 1.0) for (const z of [-262, -265, -268, -271, -274, -277, -280, -283, -286, -289]) { if (T(x, z) && !found.some(f => Math.hypot(f[0] - x, f[1] - z) < 8)) found.push([x, z]); }
  for (const [fx, fz] of found) {
    // approach it from the west at 3.5 m gap heading east, then hold W 5 s, then reverse 3 s
    g.auto.x = fx - 5; g.auto.z = fz; g.auto.a = Math.PI / 2; g.auto.v = 0; g.auto.steer = 0; K.KeyW = true;
    let jump = 0, minGap = 99; const start = [g.auto.x, g.auto.z];
    for (let i = 0; i < 100; i++) { const px = g.auto.x, pz = g.auto.z; window.__step(0.05, performance.now()); const m = Math.hypot(g.auto.x - px, g.auto.z - pz); if (m > 1.5) jump++; }
    K.KeyW = false; const afterPush = [g.auto.x, g.auto.z, g.auto.v];
    K.KeyS = true; const p0 = [g.auto.x, g.auto.z]; let jump2 = 0;
    for (let i = 0; i < 60; i++) { const px = g.auto.x, pz = g.auto.z; window.__step(0.05, performance.now()); const m = Math.hypot(g.auto.x - px, g.auto.z - pz); if (m > 1.5) jump2++; }
    K.KeyS = false;
    res.push({ target: [Math.round(fx), Math.round(fz)], hopsWhilePushing5s: jump, endedWithin: +Math.hypot(afterPush[0] - start[0], afterPush[1] - start[1]).toFixed(1), reverseMoved: +Math.hypot(g.auto.x - p0[0], g.auto.z - p0[1]).toFixed(1), hopsReversing: jump2 });
  }
  return res;
});
console.log(JSON.stringify(out)); await b.close();
