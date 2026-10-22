import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
await p.goto('http://localhost:4173/?ao=0', { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__overpass', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.state.snap = true; g.go(); window.__paused = true; });
const shots = [['deck-chase', -27.5, 1590, 0.04, 7.2, 'chase'], ['deck-driver', -27.5, 1590, 0.04, 7.2, 'driver'], ['under-chase', -75, 1688, 1.45, 0, 'chase'], ['ramp-chase', -31, 1520, 0.04, 3.9, 'chase']];
for (const [n, x, z, a, y, m] of shots) {
  await p.evaluate(([x, z, a, y, m]) => { const g = window.__game; g.auto.x = x; g.auto.z = z; g.auto.a = a; g.auto.y = y; g.auto.v = 0; g.camRig.set(m); g.state.snap = true; g.camRig.update(0.016, true); }, [x, z, a, y, m]);
  await new Promise(r => setTimeout(r, 14000));
  await p.screenshot({ path: `/tmp/fs-${n}.png` });
}
await b.close();
