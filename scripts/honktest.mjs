import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 300000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.evaluateOnNewDocument(() => {
  window.__h = { starts: [], decoded: null, ctxState: null, synthOsc: 0 };
  const AC = window.AudioContext; const cs = AC.prototype.createBufferSource, dd = AC.prototype.decodeAudioData, co = AC.prototype.createOscillator;
  AC.prototype.createBufferSource = function () { const s = cs.call(this); const st = s.start.bind(s); s.start = (t) => { window.__h.starts.push([Math.round(performance.now()), +(s.buffer ? s.buffer.duration : 0).toFixed(2)]); window.__h.ctxState = this.state; return st(t); }; return s; };
  AC.prototype.decodeAudioData = function (b) { const r = dd.call(this, b); r.then(buf => { window.__h.decoded = { dur: +buf.duration.toFixed(2), ch: buf.numberOfChannels, sr: buf.sampleRate }; }); return r; };
});
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.auto = false; g.go(); window.__noRender = true; });
await new Promise(r => setTimeout(r, 2500));
const key = (down, rep) => p.evaluate((down, rep) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code: 'Space', key: ' ', repeat: rep })), down, rep);
const res = {};
await key(true, false); await key(false, false); await new Promise(r => setTimeout(r, 1200));
res.single = await p.evaluate(() => window.__h.starts.length);
res.decoded = await p.evaluate(() => window.__h.decoded); res.ctx = await p.evaluate(() => window.__h.ctxState);
// held: keydown then repeats for 2 s
const n0 = res.single; await key(true, false); for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 100)); await key(true, true); } await key(false, false);
res.heldStartsAdded = (await p.evaluate(() => window.__h.starts.length)) - n0;
await new Promise(r => setTimeout(r, 1000));
// rapid taps every 100 ms x 10 (cooldown 380 ms)
const n1 = await p.evaluate(() => window.__h.starts.length); for (let i = 0; i < 10; i++) { await key(true, false); await key(false, false); await new Promise(r => setTimeout(r, 100)); }
res.rapidTapsAdded = (await p.evaluate(() => window.__h.starts.length)) - n1;
await new Promise(r => setTimeout(r, 1000));
const n2 = await p.evaluate(() => window.__h.starts.length); for (let i = 0; i < 5; i++) { await key(true, false); await key(false, false); await new Promise(r => setTimeout(r, 500)); }
res.spacedTapsAdded = (await p.evaluate(() => window.__h.starts.length)) - n2;
res.errors = await p.evaluate(() => [window.__stepErr, window.__renderErr].filter(Boolean));
console.log(JSON.stringify(res)); await b.close();
