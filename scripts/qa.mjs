import puppeteer from 'puppeteer-core';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/qa';
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=960,540'] });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 540 });
const errors = [];
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'load' });
await p.waitForFunction('window.__game', { timeout: 120000 });
const R = { stops: [], views: {}, buttons: {}, misc: {}, errors };

await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.state.snap = true; g.go(); });
await new Promise(r => setTimeout(r, 1500));

// 1. Every stop: spawn, drive 12 sim-seconds, sample violations
const stops = await p.evaluate(() => window.__game.stops.map(s => ({ x: s.p.x, z: s.p.z, tag: s.tag, road: s.road })));
console.log('STOPS ' + stops.length);
for (let i = 0; i < stops.length; i++) {
  const st = stops[i];
  await p.keyboard.down('KeyW');
  const res = await p.evaluate(async (st) => {
    const g = window.__game;
    window.__paused = true;
    window.__spawnAt(st.x, st.z);
    const a0 = { x: g.auto.x, z: g.auto.z };
    const samp = [];
    let divHits = 0, solidHits = 0, unstick0 = g.auto.unstickAt || 0, unsticks = 0;
    for (let k = 0; k < 240; k++) {
      window.__step(0.05, 0);
      if (k % 10 === 0) {
        if (window.__inDivider(g.auto.x, g.auto.z)) divHits++;
        if (g.solid(g.auto.x, g.auto.z)) solidHits++;
        samp.push([Math.round(g.auto.x * 10) / 10, Math.round(g.auto.z * 10) / 10]);
      }
      if ((g.auto.unstickAt || 0) !== unstick0) { unsticks++; unstick0 = g.auto.unstickAt; }
    }
    window.__paused = false;
    const dist = Math.hypot(g.auto.x - a0.x, g.auto.z - a0.z);
    return { dist: Math.round(dist * 10) / 10, divHits, solidHits, unsticks, end: [Math.round(g.auto.x), Math.round(g.auto.z)] };
  }, st);
  await p.keyboard.up('KeyW');
  await new Promise(r => setTimeout(r, 1200));
  const shot = `${OUT}/stop${i}.png`;
  await p.screenshot({ path: shot });
  res.tag = st.tag; res.road = st.road; res.shot = shot;
  res.pass = res.dist > 4 && res.solidHits === 0;
  R.stops.push(res);
  console.log('STOP ' + i + ' ' + JSON.stringify(res));
}

// 2. Views at a fixed spawn
await p.evaluate(() => { window.__spawnAt(-150, -450, 0); });
for (const mode of ['chase', 'driver', 'passenger']) {
  await p.evaluate((m) => { window.__game.camRig.set(m); window.__game.camRig.update(0.016, true); }, mode);
  await new Promise(r => setTimeout(r, 1200));
  await p.screenshot({ path: `${OUT}/view-${mode}.png` });
  R.views[mode] = `${OUT}/view-${mode}.png`;
}

// 3. Buttons
async function clickSel(sel) { const el = await p.$(sel); if (!el) return 'MISSING'; await el.click(); return 'clicked'; }
R.buttons.chgloc = await clickSel('#chgloc');
await new Promise(r => setTimeout(r, 800));
R.buttons.chglocOverlay = await p.evaluate(() => document.getElementById('start').classList.contains('on'));
await p.screenshot({ path: `${OUT}/btn-chgloc.png` });
await p.evaluate(() => window.__game.go());
await new Promise(r => setTimeout(r, 500));
R.buttons.settings = await clickSel('#tgbtn');
await new Promise(r => setTimeout(r, 500));
R.buttons.settingsPanel = await p.evaluate(() => { const t = document.getElementById('tgpanel'); return !!t && getComputedStyle(t).display !== 'none'; });
await p.screenshot({ path: `${OUT}/btn-settings.png` });
await clickSel('#tgbtn');
R.buttons.passport = await clickSel('#btn-passport');
await new Promise(r => setTimeout(r, 800));
R.buttons.passportVisible = await p.evaluate(() => { const c = document.querySelector('#passport, .passport, [id*=passport]'); return !!c; });
await p.screenshot({ path: `${OUT}/btn-passport.png` });
await p.keyboard.press('KeyP');
await new Promise(r => setTimeout(r, 400));
R.buttons.camBtn = await clickSel('#btn-cam');
await new Promise(r => setTimeout(r, 300));
R.buttons.camBtnLabel = await p.evaluate(() => (document.getElementById('btn-cam') || {}).textContent || '');
await p.evaluate(() => { window.__game.camRig.set('chase'); });

// 4. Night mode
await p.evaluate(() => { const g = window.__game; g.state.hour = 22; g.go(); });
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: `${OUT}/night.png` });
R.misc.night = `${OUT}/night.png`;

// 5. Horn (no errors) + Hinglish text + drag look
await p.evaluate(() => { const g = window.__game; g.state.hour = 12.5; g.go(); });
await p.keyboard.down('Space'); await new Promise(r => setTimeout(r, 400)); await p.keyboard.up('Space');
R.misc.hinglish = await p.evaluate(() => document.getElementById('help').textContent);
await p.mouse.move(480, 270); await p.mouse.down(); await p.mouse.move(700, 250, { steps: 10 }); await p.mouse.up();
await new Promise(r => setTimeout(r, 500));
R.misc.dragOk = errors.length === 0;

// 6. Traffic sanity: vehicles stay on roads
R.misc.traffic = await p.evaluate(() => {
  const g = window.__game; const t = g.traffic;
  const keys = t ? Object.keys(t) : [];
  if (!t || typeof t.debugPositions !== 'function') return { keys, note: 'no debugPositions' };
  return { keys, pos: t.debugPositions().slice(0, 40) };
});

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 1));
console.log('ERRORS ' + JSON.stringify(errors));
console.log('DONE');
await b.close();
