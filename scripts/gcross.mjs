import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step && window.__gantry', { timeout: 180000 });
const out = await p.evaluate(() => {
  const g = window.__game, C = window.__gantry.userData.centers, c = C[0], res = [];
  g.state.hour = 12.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true;
  const a = 0.0547, ux = Math.sin(a), uz = Math.cos(a);
  for (const v0 of [0, 8, 17]) {
    g.auto.x = c[0] - ux * 40; g.auto.z = c[1] - uz * 40; g.auto.a = a; g.auto.v = v0; g.auto.y = 0; g.state.snap = true;
    window.__step(0.05, performance.now()); g.state.snap = false;
    window.__keys.KeyW = v0 > 0; let minD = 1e9, camYatMin = 0, beamClear = true, maxCamY = 0, minCamY = 99, camInBeamBox = false;
    for (let i = 0; i < 220; i++) {
      window.__step(0.05, performance.now());
      const cam = g.camera.position; const d = Math.hypot(cam.x - c[0], cam.z - c[1]);
      if (d < minD) { minD = d; camYatMin = cam.y; }
      maxCamY = Math.max(maxCamY, cam.y); minCamY = Math.min(minCamY, cam.y);
      // beam is at y 5.35-5.65 across the road; camera inside the beam slab when within 0.5 m of its plane
      if (d < 0.6 && cam.y > 4.4 && cam.y < 5.7) camInBeamBox = true;
    }
    window.__keys.KeyW = false;
    res.push({ v0, endSpeed: +g.auto.v.toFixed(1), minHorizDistCamToGantry: +minD.toFixed(2), camYatMin: +camYatMin.toFixed(2), camYrange: [+minCamY.toFixed(2), +maxCamY.toFixed(2)], camInBeamSlab: camInBeamBox, carZpass: +(g.auto.z - c[1]).toFixed(1) });
  }
  return res;
});
console.log(JSON.stringify(out)); await b.close();
