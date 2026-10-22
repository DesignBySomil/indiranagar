import puppeteer from 'puppeteer-core';
const W=+(process.env.W||640),H=+(process.env.H||360),R=+(process.env.R||3);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); });
await new Promise(r => setTimeout(r, 45000)); await p.evaluate(() => { window.__noRender = true; }); await new Promise(r => setTimeout(r, 8000));
const out = await p.evaluate(async (R) => {
  const g = window.__game, gl = g.renderer.getContext(); const res = {};
  let sun = null; g.scene.traverse(o => { if (o.isDirectionalLight && o.castShadow && !sun) sun = o; });
  const timeIt = () => { const t = []; for (let i = 0; i < R; i++) { const s = performance.now(); g.post.render(0.016); gl.finish(); t.push(Math.round(performance.now() - s)); } return t; };
  const info = g.renderer.info; 
  res.baseline = timeIt();
  if (sun) { sun.castShadow = false; res.noShadow = timeIt(); sun.castShadow = true; }
  const ao = g.ao && g.ao.pass; if (ao) { ao.enabled = false; res.noGTAO = timeIt(); ao.enabled = true; }
  g.post.bloomPass.enabled = false; res.noBloom = timeIt(); g.post.bloomPass.enabled = true;
  const tr = g.renderer.shadowMap.enabled; 
  const pr = g.renderer.getPixelRatio(); res.pixelRatio = pr;
  res.shadowMapSize = sun ? sun.shadow.mapSize.x : null;
  res.hasAO = !!ao;
  return res;
}, R);
console.log(JSON.stringify({ url: process.env.URL, W, H, out }));
await b.close();
