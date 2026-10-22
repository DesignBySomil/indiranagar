import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
const T0 = Date.now();
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); });
await p.waitForFunction('window.__aoAuto==="off"', { timeout: 200000 }).catch(() => {});
const aoOffAt = (Date.now() - T0) / 1000;
await new Promise(r => setTimeout(r, 3000));
const out = await p.evaluate(async () => {
  const g = window.__game; const m = { w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68] };
  const fire = (t, x) => { const [code, kc] = m[x]; for (const tg of [document, window]) tg.dispatchEvent(new KeyboardEvent(t, { key: x, code, keyCode: kc, which: kc, bubbles: true, cancelable: true })); };
  let frames = 0; (function f() { frames++; requestAnimationFrame(f); })();
  const seq = [['w', 8000], ['wd', 2500], ['w', 4000], ['wa', 2500], ['w', 4000], ['s', 3000]];
  const t0 = performance.now(), samples = []; let keyMs = 0;
  for (const [k, ms] of seq) { k.split('').forEach(x => fire('keydown', x)); const t = performance.now(); while (performance.now() - t < ms) { await new Promise(r => setTimeout(r, 1000)); samples.push([k, +((performance.now() - t0) / 1000).toFixed(1), +g.auto.x.toFixed(1), +g.auto.z.toFixed(1), +g.auto.a.toFixed(2), +g.auto.v.toFixed(2)]); } keyMs += performance.now() - t; k.split('').forEach(x => fire('keyup', x)); }
  return { wallS: (performance.now() - t0) / 1000, keyHeldS: keyMs / 1000, fps: frames / ((performance.now() - t0) / 1000), aoAuto: window.__aoAuto, samples };
});
await p.screenshot({ path: '/tmp/drive-end.png' });
console.log(JSON.stringify({ aoOffAtS: aoOffAt, ...out }));
await b.close();
