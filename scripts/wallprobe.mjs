import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step && window.__edge', { timeout: 180000 });
const out = await p.evaluate(() => {
  const g = window.__game, B = window.__edge.bounds, K = window.__keys, res = [];
  g.state.hour = 12.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true;
  const FP = [[0.85,1.95],[-0.85,1.95],[0.85,-1.3],[-0.85,-1.3],[0,1.95]];
  const face = { N: B.z0 - 2.0, S: B.z1 + 2.0, W: B.x0 - 2.0, E: B.x1 + 2.0 };
  const pen = (a) => { let m = -1e9; const s = Math.sin(a), c = Math.cos(a);
    for (const [lx, lz] of FP) { const px = g.auto.x + c * lx + s * lz, pz = g.auto.z - s * lx + c * lz;
      m = Math.max(m, face.N - pz, pz - face.S, face.W - px, px - face.E); } return m; };
  const cases = [
    ['E wall road z242', 730, 242, Math.PI/2],
    ['E wall road z352', 730, 352, Math.PI/2],
    ['E wall road z-614', 730, -614, Math.PI/2],
    ['N wall road x401', 401, -705, Math.PI],
    ['N wall road x-450', -450, -705, Math.PI],
    ['NE corner-ish x401 NE', 401, -705, Math.PI*0.9],
  ];
  for (const [name, x, z, a] of cases) {
    g.auto.x = x; g.auto.z = z; g.auto.a = a; g.auto.v = 0; g.auto.y = 0; g.state.snap = true;
    window.__step(0.05, performance.now()); g.state.snap = false;
    let maxPen = -1e9; K.KeyW = true;
    for (let i = 0; i < 260; i++) { window.__step(0.05, performance.now()); maxPen = Math.max(maxPen, pen(g.auto.a)); }
    const atWall = +pen(g.auto.a).toFixed(2), vEnd = +g.auto.v.toFixed(1);
    K.KeyW = false; K.KeyS = true; const x0 = g.auto.x, z0 = g.auto.z;
    for (let i = 0; i < 80; i++) window.__step(0.05, performance.now());
    K.KeyS = false; const rev = +Math.hypot(g.auto.x - x0, g.auto.z - z0).toFixed(1);
    // turn away: steer full left while throttling
    K.KeyW = true; K.KeyA = true; const x1 = g.auto.x, z1 = g.auto.z;
    for (let i = 0; i < 160; i++) window.__step(0.05, performance.now());
    K.KeyW = false; K.KeyA = false;
    res.push({ name, maxPenetration: +maxPen.toFixed(2), gapAtStop: atWall, vEnd, reversedM: rev, turnAwayM: +Math.hypot(g.auto.x - x1, g.auto.z - z1).toFixed(1) });
  }
  return res;
});
console.log(JSON.stringify(out, null, 1)); await b.close();
