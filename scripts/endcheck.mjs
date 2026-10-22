import puppeteer from 'puppeteer-core';
import fs from 'fs';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=640,360'] });
const p = await b.newPage(); await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
const rd = JSON.parse(fs.readFileSync('/tmp/rd-static.json', 'utf8'));
const out = await p.evaluate((rd) => {
  const segs = window.__game.roadSegs(); return rd.map(r => {
    const s = segs[r.idx], dir = r.dir === 0 ? 1 : -1; const ex = dir === 1 ? s.x2 : s.x1, ez = dir === 1 ? s.z2 : s.z1;
    const L = Math.hypot(s.x2 - s.x1, s.z2 - s.z1); const toEnd = Math.hypot(ex - r.start[0], ez - r.start[1]);
    let conn = 0; segs.forEach((o, i) => { if (i === r.idx) return; for (const [x, z] of [[o.x1, o.z1], [o.x2, o.z2]]) if (Math.hypot(x - ex, z - ez) < 4) conn++; });
    return { idx: r.idx, dir: r.dir, L: +L.toFixed(1), startToEnd: +toEnd.toFixed(1), endConnections: conn, end: [Math.round(ex), Math.round(ez)] };
  });
}, rd);
console.log(JSON.stringify(out)); await b.close();
