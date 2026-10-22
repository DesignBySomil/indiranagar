import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 120000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__overpass', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 3000));
const out = await p.evaluate(() => {
  const g = window.__game, res = {};
  const spots = { spawn: [-150, -450, 0], approach: [-33.9, 1455.6, 0.037], deck: [-33.0, 1560, 0.037], south: [-62, 1950, 0.0] };
  for (const [k, [x, z, a]] of Object.entries(spots)) {
    g.auto.x = x; g.auto.z = z; g.auto.a = a; g.auto.v = 4; g.auto.y = 0;
    const t = []; for (let i = 0; i < 12; i++) { const s = performance.now(); window.__step(0.05, 0); t.push(Math.round((performance.now() - s) * 10) / 10); }
    const s2 = performance.now(); for (let i = 0; i < 200; i++) g.solid(x, z); const solidMs = (performance.now() - s2) / 200;
    res[k] = { stepMs: t, solidMs: +solidMs.toFixed(3), solidHere: g.solid(x, z), y: g.auto.y, pos: [Math.round(g.auto.x), Math.round(g.auto.z)] };
  }
  return res;
});
console.log(JSON.stringify(out)); await b.close();
