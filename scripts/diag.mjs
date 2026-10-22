import puppeteer from 'puppeteer-core';
const [,, x, z] = process.argv;
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.auto = false; g.go(); });
await new Promise(r => setTimeout(r, 1000));
await p.keyboard.down('KeyW');
const out = await p.evaluate(([x, z]) => { const g = window.__game; window.__paused = true; window.__spawnAt(+x, +z); const L = [];
  L.push(['spawn', +g.auto.x.toFixed(1), +g.auto.z.toFixed(1), +g.auto.a.toFixed(2)]);
  for (let k = 0; k < 220; k++) { window.__step(0.05, 0); if (k % 40 === 0) L.push([k, +g.auto.x.toFixed(1), +g.auto.z.toFixed(1), +g.auto.a.toFixed(2), +g.auto.v.toFixed(1), g.solid(g.auto.x, g.auto.z) ? 'SOLID' : '']); }
  const a=g.auto, f=(px,pz)=>({solid:!!g.solid(px,pz),park:!!(g.parked&&g.parked.solid(px,pz)),traf:!!(g.traffic&&g.traffic.solid(px,pz)),crowd:!!(g.crowd&&g.crowd.solid(px,pz)),div:!!window.__inDivider(px,pz),life:!!(g.life&&g.life.solid&&g.life.solid(px,pz))}); const sn=Math.sin(a.a),c=Math.cos(a.a); for(const [lx,lz] of [[0.85,2.4],[-0.85,2.4],[0,2.6],[0.85,3.5],[0,3.5],[-0.85,3.5]]){const px=a.x+c*lx+sn*lz,pz=a.z-sn*lx+c*lz; L.push(['pt',lx,lz,+px.toFixed(1),+pz.toFixed(1),JSON.stringify(f(px,pz))]);} return L; }, [x, z]);
console.log(out.map(r => r.join(' ')).join('\n'));
await b.close();
