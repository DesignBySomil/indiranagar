import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); });
await new Promise(r => setTimeout(r, 8000));
const out = await p.evaluate(async () => {
  const res = {};
  const raf = (ms) => new Promise(r => { let n = 0; const s = performance.now(); (function f() { n++; if (performance.now() - s > ms) r([n, +((performance.now() - s) / 1000).toFixed(1)]); else requestAnimationFrame(f); })(); });
  window.__noRender = true; await raf(500);
  res.rafNoRender = await raf(5000);
  const t = []; for (let i = 0; i < 10; i++) { const s = performance.now(); window.__step(0.016, 0); t.push(Math.round(performance.now() - s)); } res.stepMs = t;
  window.__noRender = false; await raf(500);
  res.rafWithRender = await raf(8000);
  return res;
});
console.log(JSON.stringify(out)); await b.close();
