import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360'] });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 });
await p.goto(process.env.URL, { waitUntil: 'load' });
await p.waitForFunction('window.__game && window.__step', { timeout: 180000 });
await p.evaluate(() => { const g = window.__game; g.state.hour = 17.5; g.state.auto = false; g.go(); window.__noRender = true; window.__paused = true; });
await new Promise(r => setTimeout(r, 3000));
await p.evaluate((S) => { if (S) window.__SIDE = JSON.parse(S); }, process.env.SIDE || '');
const out = await p.evaluate((NAME, DIR, LANE0, MAXSTEPS) => {
  let LANE = LANE0, toggleAt = -1e9, slowC = 0, toggles = 0, hops = [];
  const g = window.__game, K = window.__keys;
  let segs = g.roadSegs().filter(s => (s.name || '').includes(NAME)); if (window.__SIDE) { const [xa, xb, side] = window.__SIDE; segs = segs.filter(s => { const mx = (s.x1+s.x2)/2, mz = (s.z1+s.z2)/2; if (mx < xa || mx > xb) return false; const line = -271.5 - (mx - 100) * 0.035; return side > 0 ? mz > line : mz < line; }); }
  // chain: sort by dominant axis
  const ax = Math.abs(segs[segs.length>>1].x2 - segs[segs.length>>1].x1) > Math.abs(segs[segs.length>>1].z2 - segs[segs.length>>1].z1) ? 0 : 1;
  const pts = []; segs.sort((a, b) => (ax ? a.z1 + a.z2 : a.x1 + a.x2) - (ax ? b.z1 + b.z2 : b.x1 + b.x2));
  for (const s of segs) { const p1 = [s.x1, s.z1], p2 = [s.x2, s.z2]; const f = ax ? (p1[1] <= p2[1]) : (p1[0] <= p2[0]); const a = f ? p1 : p2, c = f ? p2 : p1; if (!pts.length || Math.hypot(pts.at(-1)[0] - a[0], pts.at(-1)[1] - a[1]) > 0.5) pts.push(a); pts.push(c); }
  if (DIR < 0) pts.reverse();
  // cumulative
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i-1] + Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
  const total = cum.at(-1);
  const at = (d) => { d = Math.max(0, Math.min(total, d)); let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const t = (d - cum[i-1]) / ((cum[i]-cum[i-1]) || 1); const x = pts[i-1][0] + (pts[i][0]-pts[i-1][0])*t, z = pts[i-1][1] + (pts[i][1]-pts[i-1][1])*t; const dx = pts[i][0]-pts[i-1][0], dz = pts[i][1]-pts[i-1][1], L = Math.hypot(dx, dz)||1; return { x: x + dz/L*LANE*-1, z: z - dx/L*LANE*-1, ux: dx/L, uz: dz/L }; };
  const proj = (x, z) => { let best = 0, bd = 1e9; for (let d = 0; d <= total; d += 2) { const q = at(d); const e = Math.hypot(q.x - x, q.z - z); if (e < bd) { bd = e; best = d; } } return best; };
  const q0 = at(4); g.auto.x = q0.x; g.auto.z = q0.z; g.auto.a = Math.atan2(q0.ux, q0.uz); g.auto.v = 0; g.auto.steer = 0;
  const preds = (x, z) => { const o = []; if (window.__inDivider(x, z)) o.push('div'); if (g.solid(x, z)) o.push('solid'); if ((window.__piers||[]).some(P => (x-P[0])**2 + (z-P[1])**2 < 1.32)) o.push('pier'); if (g.life && g.life.solid(x, z)) o.push('life'); if (g.parked && g.parked.solid(x, z)) o.push('parked'); if (g.traffic && g.traffic.solid(x, z)) o.push('traffic'); if (g.crowd && g.crowd.solid(x, z)) o.push('crowd'); return o; };
  const W = {}; for (const [nm, o] of [['traffic', g.traffic], ['life', g.life], ['crowd', g.crowd], ['parked', g.parked]]) { if (!o || !o.solid) continue; const f = o.solid.bind(o); o.solid = (x, z) => { const r = f(x, z); if (r) W[nm] = (W[nm] || 0) + 1; if (r) W.last = nm + '@' + x.toFixed(1) + ',' + z.toFixed(1); return r; }; }
  let prog = 4, slow = 0, stalls = [], maxd = 4, last = [g.auto.x, g.auto.z], teleports = 0, minV = 99;
  for (let i = 0; i < MAXSTEPS; i++) {
    const d = proj(g.auto.x, g.auto.z); prog = d; maxd = Math.max(maxd, d);
    const tq = at(d + 10 + g.auto.v * 0.5), ta = Math.atan2(tq.x - g.auto.x, tq.z - g.auto.z);
    const err = Math.atan2(Math.sin(ta - g.auto.a), Math.cos(ta - g.auto.a));
    K.KeyA = err > 0.04; K.KeyD = err < -0.04; K.KeyW = g.auto.v < 9;
    for (const k in W) delete W[k];
    const px = g.auto.x, pz = g.auto.z, pv = g.auto.v, pa = g.auto.a;
    window.__step(0.05, performance.now());
    const mv = Math.hypot(g.auto.x - px, g.auto.z - pz);
    if (mv > 6) { teleports++; hops.push({ i, from: [+px.toFixed(1), +pz.toFixed(1)], to: [+g.auto.x.toFixed(1), +g.auto.z.toFixed(1)], v: +pv.toFixed(1), W: JSON.stringify(W), lane: LANE }); }
    slowC = g.auto.v < 4 ? slowC + 1 : 0; if (slowC >= 25 && d - toggleAt > 15) { LANE = LANE >= 0 ? -2.2 : 2.2; toggleAt = d; toggles++; slowC = 0; } if (LANE !== LANE0 && d - toggleAt > 40) LANE = LANE0;
    { const want = Math.abs(pv) * 0.05; if (i >= 600 && want > 0.08 && mv < want * 0.5 && (window.__bl = window.__bl || []).length < 8) { const s0 = Math.sin(pa), c0 = Math.cos(pa), h = []; [[0.85,1.8],[-0.85,1.8],[0.85,-1.3],[-0.85,-1.3],[0,1.95],[0,0.3],[0,-1.3]].forEach(([lx, lz], k) => { const qx = px + c0*lx + s0*lz, qz = pz - s0*lx + c0*lz; const r = preds(qx, qz); if (r.length) h.push(k + ':' + r.join('+') + '@' + qx.toFixed(1) + ',' + qz.toFixed(1)); }); window.__bl.push({ W: JSON.stringify(W), i, v: +pv.toFixed(1), want: +want.toFixed(2), mv: +mv.toFixed(3), h }); } }
    if (g.auto.v < 1.0) slow++; else slow = Math.max(0, slow - 2);
    if (slow === 60) { const s = Math.sin(g.auto.a), c = Math.cos(g.auto.a); stalls.push({ step: i, at: [+g.auto.x.toFixed(1), +g.auto.z.toFixed(1)], alongM: Math.round(d), ahead: [2.2, 3.5].map(f => preds(g.auto.x + s*f, g.auto.z + c*f).join('+') || '-'), here: preds(g.auto.x, g.auto.z).join('+') || '-' }); }
    if (i % 100 === 99) { const sn = Math.sin(g.auto.a), cs = Math.cos(g.auto.a); (window.__tl = window.__tl || []).push([i+1, Math.round(d), +g.auto.x.toFixed(1), +g.auto.z.toFixed(1), +g.auto.v.toFixed(1), +g.auto.steer.toFixed(2), preds(g.auto.x + sn*2.3, g.auto.z + cs*2.3).join('+') || '-', K.KeyA?'A':K.KeyD?'D':'.']); }
    if (d > total - 12) break;
  }
  K.KeyW = K.KeyA = K.KeyD = false;
  return { hops, toggles, bl: window.__bl, tl: window.__tl, name: NAME, dir: DIR, lane: LANE, roadLenM: Math.round(total), reachedM: Math.round(maxd), finished: maxd > total - 14, stalls, teleportsOver6m: teleports };
}, process.env.ROAD, +(process.env.DIR || 1), +(process.env.LANE || 2), +(process.env.STEPS || 2400));
console.log(JSON.stringify(out)); await b.close();
