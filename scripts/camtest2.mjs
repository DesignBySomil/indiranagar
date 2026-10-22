import puppeteer from 'puppeteer-core';
const pts = JSON.parse(process.argv[2]);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
await p.goto(process.env.URL || 'http://localhost:4173/', { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.state.snap = false; g.go(); });
await new Promise(r => setTimeout(r, 1500));
for (let v = 0; v < 3; v++) {
  for (const [x, z, name] of pts) {
    await p.keyboard.down('KeyW');
    await p.evaluate(([x, z]) => { window.__paused = true; window.__spawnAt(x, z); window.__ci = 0; window.__cn = 0; }, [x, z]);
    for (let c = 0; c < 16; c++) {
      const key = c % 4 < 2 ? 'KeyA' : 'KeyD'; await p.keyboard.down(key);
      await p.evaluate(() => { const g = window.__game; for (let k = 0; k < 30; k++) { window.__step(0.05, 0); window.__cn++; const q = g.camera.position; if (g.solid(q.x, q.z)) window.__ci++; } });
      await p.keyboard.up(key);
    }
    const res = await p.evaluate(() => { window.__paused = false; return { n: window.__cn, inside: window.__ci, mode: window.__game.camRig && window.__game.camRig.name }; });
    await p.keyboard.up('KeyW');
    console.log('CAM', v, name, JSON.stringify(res));
  }
  await p.keyboard.press('KeyV');
  await new Promise(r => setTimeout(r, 800));
}
await b.close();
