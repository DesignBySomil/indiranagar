import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
await p.goto(process.env.URL+'?ao=0', { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step && window.__gantry', { timeout: 180000 });
const info = await p.evaluate((k) => { const g = window.__game, C = window.__gantry.userData.centers; const c = C[k]; let best=null,bd=1e9; for (const s of g.roadSegs()) { if(!/100 Feet/.test(s.name||''))continue; const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((c[0]-s.x1)*dx+(c[1]-s.z1)*dz)/L2)); const d=Math.hypot(c[0]-s.x1-dx*t,c[1]-s.z1-dz*t); if(d<bd){bd=d;best=s;} } const L=Math.hypot(best.x2-best.x1,best.z2-best.z1),ux=(best.x2-best.x1)/L,uz=(best.z2-best.z1)/L; const a=Math.atan2(ux,uz); g.state.hour=12.5; g.state.auto=false; g.go(); window.__paused=true; g.auto.a=a; g.auto.x=c[0]-ux*+((window.__off)||0); return {c,a,ux,uz}; }, +(process.env.K||0));
console.log(JSON.stringify(info));
for (const [off, tag] of [[14,'a'],[7,'b'],[1,'c'],[-6,'d']]) {
  await p.evaluate(([c,ux,uz,a,off]) => { const g = window.__game; g.auto.x=c[0]-ux*off; g.auto.z=c[1]-uz*off; g.auto.a=a; g.auto.v=0; g.auto.y=0; g.state.snap=true; window.__noRender=false; window.__paused=false; }, [info.c,info.ux,info.uz,info.a,off]);
  await new Promise(r => setTimeout(r, 14000));
  await p.evaluate(() => { window.__paused = true; });
  await new Promise(r => setTimeout(r, 5000));
  await p.screenshot({ path: process.env.OUT + tag + '.png' });
}
await b.close();
