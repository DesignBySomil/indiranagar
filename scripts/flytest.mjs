import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
p.on('pageerror', e => console.log('pageerror', e.message));
const t0 = Date.now();
await p.goto(process.env.URL || 'http://localhost:4173/?ao=0', { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__overpass', { timeout: 180000 });
console.log('LOAD_MS', Date.now() - t0);
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.state.snap = true; g.go(); });
await new Promise(r => setTimeout(r, 1500));
async function run(name, x, z, a, steps, shot) {
  await p.keyboard.down('KeyW');
  const res = await p.evaluate(async ([x, z, a, steps]) => {
    const g = window.__game; window.__paused = true; window.__noRender = true;
    g.auto.x = x; g.auto.z = z; g.auto.a = a; g.auto.v = 0; g.auto.y = 0;
    let maxY = 0, hits = 0, camIn = 0, minZ = z, maxZ = z, unst = 0, u0 = g.auto.unstickAt || 0, yAtMid = null;
    const trace = [];
    for (let k = 0; k < steps; k++) {
      window.__step(0.05, 0);
      maxY = Math.max(maxY, g.auto.y || 0);
      if ((g.auto.unstickAt || 0) !== u0) { unst++; u0 = g.auto.unstickAt; }
      minZ = Math.min(minZ, g.auto.z); maxZ = Math.max(maxZ, g.auto.z);
      const c = g.camera.position; if (g.solid(c.x, c.z) && (g.auto.y || 0) < 1) camIn++;
      if (k === 0) trace.push(['start solid', g.solid(g.auto.x, g.auto.z)]);
      if (k % 100 === 0) trace.push([Math.round(g.auto.x), Math.round(g.auto.z), +(g.auto.y || 0).toFixed(2)]);
    }
    window.__paused = false; window.__noRender = false;
    return { maxY: +maxY.toFixed(2), endY: +(g.auto.y||0).toFixed(2), end: [Math.round(g.auto.x), Math.round(g.auto.z)], minZ: Math.round(minZ), maxZ: Math.round(maxZ), unst, camIn, trace };
  }, [x, z, a, steps]);
  await p.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 1200));
  if (shot) await p.screenshot({ path: shot });
  console.log('FLY', name, JSON.stringify(res));
}
// southbound over the deck (heading +z, a = 0): from ground on 100 Feet Road north of the ramp
await run('SB-up-over-down', -33.9, 1455.6, 0.037, 1400, '/tmp/fly-sb-end.png');
// northbound (heading -z, a = PI) from south of the deck
await run('NB-up-over-down', -69.0, 1980.8, 2.984, 1400, '/tmp/fly-nb-end.png');
// ground underpass: drive east along HAL Old Airport Road beneath the deck
await run('ground-under', -200, 1672, Math.atan2(1, 0.12), 500, '/tmp/fly-under-end.png');
await b.close();
