import puppeteer from 'puppeteer-core';
const URL_ = process.env.URL, W=+(process.env.W||640), H=+(process.env.H||360), WIN=+(process.env.WIN||12000), N=+(process.env.N||3);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H });
const t0 = Date.now();
await p.goto(URL_, { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
const loadMs = Date.now() - t0;
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); });
await p.evaluate(() => { const g = window.__game; g.renderer.info.autoReset = false; g.renderer.info.reset(); });
await new Promise(r => setTimeout(r, 5000));
const res = [];
for (let i = 0; i < N; i++) {
  res.push(await p.evaluate((win) => new Promise(r => { const g = window.__game; let n = 0; const s = performance.now(); (function f() { n++; if (performance.now() - s > win) { const i = g.renderer.info; const fr = i.render.frame; r({ rframes: fr, frames: n, secs: (performance.now() - s) / 1000, fps: n / ((performance.now() - s) / 1000), calls: i.render.calls / Math.max(1, fr), tris: i.render.triangles / Math.max(1, fr), geoms: i.memory.geometries, tex: i.memory.textures }); } else requestAnimationFrame(f); })(); }), WIN));
}
console.log(JSON.stringify({ url: URL_, W, H, loadMs, res }));
await b.close();
