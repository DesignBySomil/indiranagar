import puppeteer from 'puppeteer-core';
const pts = JSON.parse(process.argv[2]);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.state.snap = true; g.go(); });
await new Promise(r => setTimeout(r, 1500));
let i = 0;
for (const [x, z, name] of pts) {
  await p.keyboard.down('KeyW');
  const res = await p.evaluate(async ([x, z]) => {
    const g = window.__game; window.__paused = true; window.__spawnAt(x, z);
    const a0 = { x: g.auto.x, z: g.auto.z }; let solidHits = 0, un = 0, u0 = g.auto.unstickAt || 0;
    for (let k = 0; k < 800; k++) { window.__step(0.05, 0); if (k % 10 === 0 && g.solid(g.auto.x, g.auto.z)) solidHits++; if ((g.auto.unstickAt || 0) !== u0) { un++; u0 = g.auto.unstickAt; } }
    window.__paused = false;
    return { dist: Math.round(Math.hypot(g.auto.x - a0.x, g.auto.z - a0.z)), solidHits, unsticks: un, end: [Math.round(g.auto.x), Math.round(g.auto.z)] };
  }, [x, z]);
  await p.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 1200));
  await p.screenshot({ path: `/tmp/edge-${name}.png` });
  console.log('EDGE', name, JSON.stringify(res));
}
await b.close();
