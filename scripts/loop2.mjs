import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate((process_SMS) => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go();
  const SMS=+(process_SMS); if (SMS > 0) { let sun=null; g.scene.traverse(o=>{ if(o.isDirectionalLight&&o.castShadow&&!sun) sun=o;}); sun.shadow.mapSize.set(SMS,SMS); if (sun.shadow.map){sun.shadow.map.dispose(); sun.shadow.map=null;} }
  if (process_SMS === -1 || process_SMS === -2) { g.ao.pass.enabled = false; } if (process_SMS === -2) { g.post.bloomPass.enabled = false; let sn=null; g.scene.traverse(o=>{ if(o.isDirectionalLight&&o.castShadow&&!sn) sn=o;}); sn.castShadow=false; }
  if (process_SMS === -3) { g.ao.pass.setSize(320, 180); }
  const gl = g.renderer.getContext(); const orig = g.post.render.bind(g.post); window.__pr = [];
  g.post.render = (dt) => { const s = performance.now(); const pc = g.renderer.info.programs ? g.renderer.info.programs.length : -1; orig(dt); gl.finish(); window.__pr.push([Math.round(performance.now() - s), pc, g.renderer.info.programs.length]); };
}, +(process.env.SMS||0));
await new Promise(r => setTimeout(r, 40000));
console.log(JSON.stringify(await p.evaluate(() => window.__pr))); await b.close();
