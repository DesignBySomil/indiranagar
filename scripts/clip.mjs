import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [,, dir, hour, mode, x, z, nf='16'] = process.argv;
fs.mkdirSync(dir, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
p.on('pageerror', e => console.log('pageerror', e.message)); console.log('goto');
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(([h, m, x, z]) => { const g = window.__game; g.state.hour = +h; g.state.auto = false; g.go(); window.__paused = true; window.__spawnAt(+x, +z, 0); g.camRig.set(m); }, [hour, mode, x, z]);
console.log('ready'); await p.keyboard.down('KeyW');
for (let i = 0; i < +nf; i++) {
  await p.evaluate(() => { for (let k = 0; k < 10; k++) window.__step(0.05, 0); });
  await new Promise(r => setTimeout(r, 2500));
  await p.screenshot({ path: `${dir}/f${String(i).padStart(3, '0')}.png` });
}
await p.keyboard.up('KeyW');
await b.close();
