import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
const out = await p.evaluate(() => { const E = window.__edge; return { n: E.spots.length, spots: E.spots.map(s => [Math.round(s.x), Math.round(s.z), +s.w.toFixed(1)]) }; });
console.log(JSON.stringify(out)); await b.close();
