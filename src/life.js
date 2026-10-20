// src/life.js
import * as THREE from 'three';
import { nightUniform } from './materials.js';

const FIGHT_LINES = [
  'Meter haaku guru!',
  'Ola illa, nanna auto!',
  'Yenappa idu, kannu kanalva?',
  'Eh, horn yaake maadtya!',
  'Return fare double sir!',
  'Sir, 100 Feet Road ge extra!',
  'Arre bhai, signal dekh ke chalo!',
  'Swalpa adjust maadi!',
  'Namma Bengaluru, namma rules!',
  'One-and-half kodlebeku guru!',
  'Left indicator haaki right tirugtya?!'
];

const FARE_SCENARIOS = [
  {
    pass: 'Passenger: "Anna, Indiranagar Metro ge 60 rupees? Meter chalega?"',
    driver: 'You: "Madam meter repair! Traffic jaasti, 150 kodri!" (Tip: Honk SPACE to bargain!)',
    detour: false,
    base: 150
  },
  {
    pass: 'Passenger: "Bhaiya 12th Main hogbeku, urgent!"',
    driver: 'You: "12th Main dug up sir! Taking secret shortcut via tea stall — return fare double!"',
    detour: true,
    base: 220
  },
  {
    pass: 'Passenger: "Sir 100 Feet Road Toit stop, Rapido shows 85 rupees!"',
    driver: 'You: "Aa app ella beda guru! Rain coming, one-and-half plus 50 extra!" (Tip: Honk SPACE to bargain!)',
    detour: true,
    base: 190
  },
  {
    pass: 'Passenger: "Anna, CMH Road signal alli drop maadi!"',
    driver: 'You: "Signal full jam! Come via side cross road, 180 fix!"',
    detour: true,
    base: 180
  }
];

function makeBubbleTexture(text, bg = '#ffffff', fg = '#111111', border = '#111111', isBurst = false) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 160);

  if (isBurst) {
    ctx.fillStyle = '#ffdd1f';
    ctx.strokeStyle = '#c81e1e';
    ctx.lineWidth = 8;
    ctx.beginPath();
    const cx = 256, cy = 80, spikes = 14;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 220 : 135;
      const rx = i % 2 === 0 ? r : r * 0.72;
      const ry = i % 2 === 0 ? 72 : 44;
      const ang = (i / (spikes * 2)) * Math.PI * 2;
      const x = cx + Math.cos(ang) * rx;
      const y = cy + Math.sin(ang) * ry;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 82);
  } else {
    const r = 28, x = 18, y = 14, w = 476, h = 106;
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(278, y + h);
    ctx.lineTo(256, y + h + 28);
    ctx.lineTo(234, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.font = '800 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, y + h * 0.52, 446);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx, tex };
}

function updateBubbleCanvas(entry, text, isBurst = false) {
  if (entry.text === text && entry.isBurst === isBurst) return;
  entry.text = text;
  entry.isBurst = isBurst;
  const fresh = makeBubbleTexture(text, isBurst ? '#ffdd1f' : '#ffffff', '#111111', '#111111', isBurst);
  entry.ctx.clearRect(0, 0, 512, 160);
  entry.ctx.drawImage(fresh.c, 0, 0);
  entry.tex.needsUpdate = true;
}

export function createStreetLife({ THREE: T = THREE, scene, camera, world, roadSegs = [], solid = () => 0, auto, ui = {} }) {
  const root = new T.Group();
  scene.add(root);

  const safeUI = {
    say: (txt, ms = 4000) => ui && typeof ui.say === 'function' && ui.say(txt, ms),
    fare: (txt) => ui && typeof ui.fare === 'function' && ui.fare(txt),
    toast: (txt) => ui && typeof ui.toast === 'function' && ui.toast(txt)
  };

  const stats = { fare: 120, fights: 0, honks: 0, detours: 0 };

  // ---------- Lazy WebAudio Synth ----------
  let AC = null;
  let master = null;
  let muted = false;
  let lastAudioTime = 0;

  function ensureAudio() {
    if (muted) return null;
    if (!AC) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      AC = new Ctx();
      master = AC.createGain();
      master.gain.value = 0.22;
      master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume().catch(() => {});
    return AC;
  }

  function playBeep(freq = 480, dur = 0.22, type = 'square', vol = 0.12) {
    const ctx = ensureAudio();
    if (!ctx || ctx.currentTime - lastAudioTime < 0.09) return;
    lastAudioTime = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = type;
    o2.type = type;
    o1.frequency.setValueAtTime(freq, ctx.currentTime);
    o2.frequency.setValueAtTime(freq * 1.24, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o1.connect(g);
    o2.connect(g);
    g.connect(master);
    o1.start();
    o2.start();
    o1.stop(ctx.currentTime + dur + 0.02);
    o2.stop(ctx.currentTime + dur + 0.02);
  }

  function playBark() {
    const ctx = ensureAudio();
    if (!ctx || ctx.currentTime - lastAudioTime < 0.14) return;
    lastAudioTime = ctx.currentTime;
    [0, 0.16].forEach((offset) => {
      const t = ctx.currentTime + offset;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.11);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.13);
    });
  }

  function playMoo() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(145, t);
    o.frequency.linearRampToValueAtTime(175, t + 0.25);
    o.frequency.linearRampToValueAtTime(118, t + 0.85);
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(lp);
    lp.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.95);
  }

  function playCashBell() {
    const ctx = ensureAudio();
    if (!ctx) return;
    [784, 1046, 1318].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.08;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.38);
    });
  }

  window.addEventListener('pointerdown', ensureAudio, { once: true });
  window.addEventListener('keydown', ensureAudio, { once: true });

  // ---------- Road Segment Graph ----------
  const navSegs = [];
  for (let i = 0; i < roadSegs.length; i++) {
    const s = roadSegs[i];
    const dx = s[2] - s[0], dz = s[3] - s[1];
    const len = Math.hypot(dx, dz);
    if (len < 6) continue;
    if ((s[5] || 2) >= 2) {
      navSegs.push({
        x1: s[0], z1: s[1], x2: s[2], z2: s[3],
        ux: dx / len, uz: dz / len,
        len, name: s[4] || '', kind: s[5] || 3, width: s[6] || 8,
        next: [], prev: []
      });
    }
  }
  // Fallback if roadSegs wasn't populated yet
  if (navSegs.length === 0 && world && world.roads) {
    for (const r of world.roads) {
      if (r.k < 2) continue;
      const w = { 5: 17, 4: 13, 3: 9, 2: 6.5, 1: 4.5 }[r.k] || 8;
      for (let i = 0; i < r.p.length - 1; i++) {
        const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
        const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
        if (len > 6) navSegs.push({ x1, z1, x2, z2, ux: dx / len, uz: dz / len, len, name: r.n || '', kind: r.k, width: w, next: [], prev: [] });
      }
    }
  }

  for (let i = 0; i < navSegs.length; i++) {
    const a = navSegs[i];
    for (let j = 0; j < navSegs.length; j++) {
      if (i === j) continue;
      const b = navSegs[j];
      if (Math.hypot(a.x2 - b.x1, a.z2 - b.z1) < 9) a.next.push({ idx: j, dir: 1 });
      else if (Math.hypot(a.x2 - b.x2, a.z2 - b.z2) < 9) a.next.push({ idx: j, dir: -1 });
      if (Math.hypot(a.x1 - b.x2, a.z1 - b.z2) < 9) a.prev.push({ idx: j, dir: -1 });
      else if (Math.hypot(a.x1 - b.x1, a.z1 - b.z1) < 9) a.prev.push({ idx: j, dir: 1 });
    }
  }

  const mainSegIndices = [];
  navSegs.forEach((s, idx) => {
    if (s.kind >= 3 && Math.hypot(s.x1 - (-133), s.z1 - (-345)) < 550 && Math.hypot(s.x1 - (-133), s.z1 - (-345)) > 26) {
      mainSegIndices.push(idx);
    }
  });
  if (mainSegIndices.length === 0) {
    navSegs.forEach((_, idx) => mainSegIndices.push(idx));
  }

  // ---------- Comic Speech Bubbles & Dust Cloud Sprites ----------
  const bubblePool = [];
  for (let i = 0; i < 8; i++) {
    const bData = makeBubbleTexture('Meter haaku guru!');
    const mat = new T.SpriteMaterial({ map: bData.tex, transparent: true, depthWrite: false, fog: false });
    const sp = new T.Sprite(mat);
    sp.scale.set(9.5, 3.0, 1);
    sp.visible = false;
    root.add(sp);
    bubblePool.push({ sprite: sp, c: bData.c, ctx: bData.ctx, tex: bData.tex, text: '', isBurst: false, timer: 0, target: null, yOff: 3.4 });
  }

  function spawnBubble(targetObj, text, dur = 3.2, yOff = 3.4, isBurst = false) {
    let slot = bubblePool.find(b => b.timer <= 0);
    if (!slot) slot = bubblePool[0];
    updateBubbleCanvas(slot, text, isBurst);
    slot.timer = dur;
    slot.target = targetObj;
    slot.yOff = yOff;
    slot.sprite.scale.set(isBurst ? 7.5 : 9.5, isBurst ? 2.8 : 3.0, 1);
    slot.sprite.material.opacity = 1;
    slot.sprite.visible = true;
  }

  // ---------- Shared Geometries & Materials ----------
  const matYellow = new T.MeshStandardMaterial({ color: 0xf6c30f, roughness: 0.4 });
  const matBlackCanopy = new T.MeshStandardMaterial({ color: 0x1e2229, roughness: 0.6 });
  const matGreenCanopy = new T.MeshStandardMaterial({ color: 0x16803c, roughness: 0.45 });
  const matAutoGreen = new T.MeshStandardMaterial({ color: 0x1b723c, roughness: 0.4 });
  const matKhaki = new T.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.75 });
  const matSkin = new T.MeshStandardMaterial({ color: 0xd4946a, roughness: 0.7 });
  const matDark = new T.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.75 });
  const matHeadlight = new T.MeshBasicMaterial({ color: 0xfff3b0 });

  // ---------- 1. NPC Auto-Rickshaws (10 characterful autos with animated driver arms) ----------
  const npcAutos = [];
  const canopyMats = [matYellow, matYellow, matBlackCanopy, matGreenCanopy];

  function createNpcAutoMesh(idx) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(1.25, 0.65, 2.2), matAutoGreen);
    body.position.set(0, 0.55, 0);
    body.castShadow = true;
    const nose = new T.Mesh(new T.CylinderGeometry(0.32, 0.48, 0.75, 10), matAutoGreen);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.52, 1.15);
    const roof = new T.Mesh(new T.BoxGeometry(1.32, 0.18, 1.95), canopyMats[idx % canopyMats.length]);
    roof.position.set(0, 1.68, -0.08);
    roof.castShadow = true;

    const wGeo = new T.CylinderGeometry(0.24, 0.24, 0.16, 10);
    wGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.62, -0.75], [0.62, -0.75], [0, 1.25]]) {
      const w = new T.Mesh(wGeo, matDark);
      w.position.set(wx, 0.24, wz);
      g.add(w);
    }

    // Khaki driver + animated right arm for fist-shaking during arguments
    const driver = new T.Group();
    driver.position.set(0, 0.85, 0.35);
    const torso = new T.Mesh(new T.BoxGeometry(0.42, 0.48, 0.28), matKhaki);
    const head = new T.Mesh(new T.SphereGeometry(0.16, 8, 8), matSkin);
    head.position.y = 0.38;
    const armR = new T.Mesh(new T.BoxGeometry(0.12, 0.42, 0.12), matKhaki);
    armR.position.set(0.28, 0.15, 0);
    driver.add(torso, head, armR);

    // Headlight cone for night
    const hl = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), matHeadlight);
    hl.position.set(0, 0.58, 1.52);
    const coneGeo = new T.ConeGeometry(1.2, 4.8, 10, 1, true);
    coneGeo.translate(0, -2.4, 0);
    coneGeo.rotateX(-Math.PI / 2 + 0.12);
    const cone = new T.Mesh(coneGeo, new T.MeshBasicMaterial({
      color: 0xffe89e, transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending
    }));
    cone.position.set(0, 0.52, 1.55);

    g.add(body, nose, roof, driver, hl, cone);
    return { group: g, armR, driver, cone };
  }

  for (let i = 0; i < 10; i++) {
    const segIdx = mainSegIndices[(i * 7) % mainSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const built = createNpcAutoMesh(i);
    root.add(built.group);
    npcAutos.push({
      mesh: built.group,
      armR: built.armR,
      driver: built.driver,
      cone: built.cone,
      segIdx,
      t: (i * 0.19) % 0.85,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 6.5 + (i % 4) * 1.4,
      baseSpeed: 6.5 + (i % 4) * 1.4,
      x: seg ? seg.x1 : -120,
      z: seg ? seg.z1 : -280,
      yaw: 0,
      fightTimer: 0,
      chatTimer: 0,
      cooldown: 0,
      pitch: 410 + i * 28
    });
  }

  // ---------- 4. Traffic Jam Zone (100 Feet Rd & CMH Rd junction + Rapido bikes + KSRTC buses) ----------
  const trafficUnits = [];
  const carColors = [0xd93829, 0x2563eb, 0xeab308, 0xe2e8f0, 0x0d9488, 0xf97316];

  function createTrafficMesh(type, idx) {
    const g = new T.Group();
    if (type === 'bus') {
      // KSRTC Maroon/Cream Bus
      const low = new T.Mesh(new T.BoxGeometry(2.3, 1.3, 6.8), new T.MeshStandardMaterial({ color: 0x8b1e24, roughness: 0.5 }));
      low.position.y = 1.0;
      const top = new T.Mesh(new T.BoxGeometry(2.26, 1.1, 6.7), new T.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5 }));
      top.position.y = 2.1;
      low.castShadow = top.castShadow = true;
      g.add(low, top);
    } else if (type === 'bike') {
      // Royal Enfield / Activa with Rapido yellow helmet rider
      const frame = new T.Mesh(new T.BoxGeometry(0.38, 0.55, 1.45), matDark);
      frame.position.y = 0.45;
      const rider = new T.Mesh(new T.BoxGeometry(0.42, 0.65, 0.32), new T.MeshStandardMaterial({ color: 0x1d4ed8 }));
      rider.position.set(0, 0.95, -0.05);
      const helmet = new T.Mesh(new T.SphereGeometry(0.19, 10, 8), matYellow);
      helmet.position.set(0, 1.42, 0.02);
      g.add(frame, rider, helmet);
    } else {
      // Boxy Hatchback
      const cMat = new T.MeshStandardMaterial({ color: carColors[idx % carColors.length], roughness: 0.35, metalness: 0.15 });
      const hull = new T.Mesh(new T.BoxGeometry(1.65, 0.68, 3.2), cMat);
      hull.position.y = 0.55;
      const cab = new T.Mesh(new T.BoxGeometry(1.48, 0.55, 1.8), cMat);
      cab.position.set(0, 1.12, -0.15);
      hull.castShadow = true;
      g.add(hull, cab);
    }
    return g;
  }

  // Pick segments near 100 Feet Rd & CMH junction + arterial stretches
  const jamSegs = [];
  navSegs.forEach((s, idx) => {
    if (s.kind >= 4 && Math.hypot(s.x1 - (-133), s.z1 - (-345)) > 30) jamSegs.push(idx);
  });
  const trafficPoolSegs = jamSegs.length ? jamSegs : mainSegIndices;

  for (let i = 0; i < 16; i++) {
    const type = i < 2 ? 'bus' : (i < 9 ? 'bike' : 'car');
    const segIdx = trafficPoolSegs[(i * 3) % trafficPoolSegs.length] || 0;
    const seg = navSegs[segIdx];
    const mesh = createTrafficMesh(type, i);
    root.add(mesh);
    trafficUnits.push({
      type,
      mesh,
      segIdx,
      t: (i * 0.13) % 0.9,
      dir: i % 2 === 0 ? 1 : -1,
      speed: type === 'bike' ? 9.5 : (type === 'bus' ? 4.2 : 5.4),
      weavePhase: i * 1.1,
      x: seg ? seg.x1 : -140,
      z: seg ? seg.z1 : -260,
      yaw: 0,
      radius: type === 'bus' ? 2.6 : (type === 'car' ? 1.5 : 0.7)
    });
  }

  // ---------- 5. Animals: Cows on roads (solid obstacles) & Stray Dogs on kerbs ----------
  const cows = [];
  const cowWhite = new T.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.8 });
  const cowPatch = new T.MeshStandardMaterial({ color: 0x5c3a24, roughness: 0.85 });
  const hornMat = new T.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.5 });

  function createCowMesh(lying = false) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(0.95, 0.85, 1.75), cowWhite);
    body.position.y = lying ? 0.45 : 0.85;
    body.castShadow = true;
    const spot = new T.Mesh(new T.BoxGeometry(0.97, 0.45, 0.65), cowPatch);
    spot.position.set(0, body.position.y + 0.12, 0.1);
    const hump = new T.Mesh(new T.SphereGeometry(0.28, 8, 6), cowWhite);
    hump.position.set(0, body.position.y + 0.42, 0.45);
    const head = new T.Mesh(new T.BoxGeometry(0.48, 0.48, 0.62), cowWhite);
    head.position.set(0, body.position.y + 0.32, 1.02);
    for (const s of [-1, 1]) {
      const horn = new T.Mesh(new T.ConeGeometry(0.06, 0.32, 6), hornMat);
      horn.position.set(s * 0.2, body.position.y + 0.65, 0.95);
      horn.rotation.z = -s * 0.3;
      g.add(horn);
      if (!lying) {
        for (const lz of [-0.6, 0.6]) {
          const leg = new T.Mesh(new T.BoxGeometry(0.16, 0.55, 0.16), cowWhite);
          leg.position.set(s * 0.32, 0.28, lz);
          g.add(leg);
        }
      }
    }
    g.add(body, spot, hump, head);
    return { group: g, head };
  }

  for (let i = 0; i < 6; i++) {
    const segIdx = mainSegIndices[(i * 11 + 3) % mainSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const t = 0.35 + (i % 3) * 0.15;
    const cx = seg.x1 + seg.ux * seg.len * t + (-seg.uz) * ((i % 2 ? 1 : -1) * 1.8);
    const cz = seg.z1 + seg.uz * seg.len * t + (seg.ux) * ((i % 2 ? 1 : -1) * 1.8);
    if (Math.hypot(cx - (-133), cz - (-345)) < 28) continue;
    const built = createCowMesh(i % 2 === 0);
    built.group.position.set(cx, 0, cz);
    built.group.rotation.y = i * 1.2;
    root.add(built.group);
    cows.push({ mesh: built.group, head: built.head, x: cx, z: cz, cooldown: 0 });
  }

  const dogs = [];
  const dogMat = new T.MeshStandardMaterial({ color: 0xb87a44, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const segIdx = mainSegIndices[(i * 5 + 2) % mainSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const g = new T.Group();
    const torso = new T.Mesh(new T.BoxGeometry(0.32, 0.32, 0.72), dogMat);
    torso.position.y = 0.36;
    const dHead = new T.Mesh(new T.BoxGeometry(0.26, 0.26, 0.32), dogMat);
    dHead.position.set(0, 0.54, 0.38);
    const tail = new T.Mesh(new T.BoxGeometry(0.08, 0.26, 0.08), dogMat);
    tail.position.set(0, 0.52, -0.36);
    tail.rotation.x = -0.5;
    g.add(torso, dHead, tail);
    root.add(g);

    const kerbOff = (seg.width * 0.5 + 1.2) * (i % 2 ? 1 : -1);
    dogs.push({
      mesh: g,
      tail,
      seg,
      kerbOff,
      t: (i * 0.21) % 0.9,
      dir: 1,
      x: seg.x1,
      z: seg.z1,
      barkCooldown: 0
    });
  }

  // ---------- 6. Street Vendors (Tender Coconut, Pani-Puri, Flower Seller, Fruit, Chai/Maggi, Tiffin) ----------
  const vendorTypes = [
    { name: 'ELANEER / COCONUT', roof: 0x16a34a, prop: 0x22c55e },
    { name: 'GOLGAPPA / PANI PURI', roof: 0xdc2626, prop: 0xfacc15 },
    { name: 'MALLIGE FLOWER CART', roof: 0xf59e0b, prop: 0xfef08a },
    { name: 'FRESH FRUIT CART', roof: 0x2563eb, prop: 0xf97316 },
    { name: 'CHAI & HOT MAGGI', roof: 0xd97706, prop: 0xfde047 },
    { name: 'IDLI VADA TIFFIN CART', roof: 0x059669, prop: 0xf8fafc }
  ];
  const vendorLanterns = [];
  const woodCartMat = new T.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.85 });

  for (let i = 0; i < 12; i++) {
    const segIdx = mainSegIndices[(i * 4 + 1) % mainSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const side = i % 2 ? 1 : -1;
    const off = seg.width * 0.5 + 2.2;
    const vx = seg.x1 + seg.ux * (seg.len * 0.5) - seg.uz * off * side;
    const vz = seg.z1 + seg.uz * (seg.len * 0.5) + seg.ux * off * side;
    if (solid(vx, vz) || Math.hypot(vx - (-133), vz - (-345)) < 26) continue;

    const vt = vendorTypes[i % vendorTypes.length];
    const vg = new T.Group();
    vg.position.set(vx, 0, vz);
    vg.rotation.y = Math.atan2(seg.ux, seg.uz);

    const bed = new T.Mesh(new T.BoxGeometry(1.3, 0.2, 2.0), woodCartMat);
    bed.position.y = 0.78;
    const canopy = new T.Mesh(new T.ConeGeometry(1.35, 0.65, 4), new T.MeshStandardMaterial({ color: vt.roof, roughness: 0.6 }));
    canopy.position.y = 2.25;
    canopy.rotation.y = Math.PI / 4;

    // Mound of coconuts / flowers / snacks
    const mound = new T.Mesh(new T.SphereGeometry(0.48, 8, 6), new T.MeshStandardMaterial({ color: vt.prop, roughness: 0.7 }));
    mound.scale.set(1.1, 0.65, 1.4);
    mound.position.set(0, 1.05, 0);

    // Warm night lantern
    const lanternMat = new T.MeshBasicMaterial({ color: 0xffb347 });
    const lantern = new T.Mesh(new T.SphereGeometry(0.14, 8, 6), lanternMat);
    lantern.position.set(0, 1.85, 0);
    const pool = new T.Mesh(new T.CircleGeometry(2.6, 12), new T.MeshBasicMaterial({
      color: 0xffa733, transparent: true, opacity: 0.0, depthWrite: false, blending: T.AdditiveBlending
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.06;
    vendorLanterns.push({ lantern, pool });

    vg.add(bed, canopy, mound, lantern, pool);
    root.add(vg);
  }

  // ---------- 6b. ~30 Instanced Pedestrians on Pavements & Crossings ----------
  const PED_COUNT = 32;
  const pedTorsoInst = new T.InstancedMesh(new T.BoxGeometry(0.38, 0.62, 0.24), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), PED_COUNT);
  const pedHeadInst = new T.InstancedMesh(new T.SphereGeometry(0.16, 8, 8), matSkin, PED_COUNT);
  const pedLegLInst = new T.InstancedMesh(new T.BoxGeometry(0.14, 0.52, 0.14), matDark, PED_COUNT);
  const pedLegRInst = new T.InstancedMesh(new T.BoxGeometry(0.14, 0.52, 0.14), matDark, PED_COUNT);
  pedTorsoInst.castShadow = true;
  root.add(pedTorsoInst, pedHeadInst, pedLegLInst, pedLegRInst);

  const pedShirtPalette = [0xe11d48, 0x2563eb, 0x16a34a, 0xd97706, 0x9333ea, 0x0891b2, 0xfacc15, 0xf43f5e];
  const peds = [];
  const tmpCol = new T.Color();

  for (let i = 0; i < PED_COUNT; i++) {
    const segIdx = mainSegIndices[(i * 3) % mainSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const side = i % 2 ? 1 : -1;
    const kerbOff = (seg.width * 0.5 + 1.45) * side;
    tmpCol.setHex(pedShirtPalette[i % pedShirtPalette.length]);
    pedTorsoInst.setColorAt(i, tmpCol);

    const anchor = new T.Object3D();
    root.add(anchor);

    peds.push({
      seg,
      t: (i * 0.17) % 0.92,
      dir: i % 2 === 0 ? 1 : -1,
      kerbOff,
      baseKerbOff: kerbOff,
      speed: 1.35 + (i % 4) * 0.25,
      phase: i * 0.9,
      hopY: 0,
      cooldown: 0,
      x: seg.x1,
      z: seg.z1,
      yaw: 0,
      anchor
    });
  }
  pedTorsoInst.instanceColor.needsUpdate = true;

  // ---------- 3. Weird Fare & Detour Waypoint System ----------
  const detourGroup = new T.Group();
  detourGroup.visible = false;
  const wpBeam = new T.Mesh(
    new T.CylinderGeometry(1.4, 1.4, 95, 16, 1, true),
    new T.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: false })
  );
  wpBeam.position.y = 47.5;
  const wpRing = new T.Mesh(
    new T.RingGeometry(6.5, 8.0, 32),
    new T.MeshBasicMaterial({ color: 0xfbbf24, side: T.DoubleSide, transparent: true, opacity: 0.9 })
  );
  wpRing.rotation.x = -Math.PI / 2;
  wpRing.position.y = 0.38;
  detourGroup.add(wpBeam, wpRing);
  root.add(detourGroup);

  let fareEventTimer = 18;
  let activeQuest = null;

  function triggerFareScenario() {
    const sc = FARE_SCENARIOS[Math.floor(Math.random() * FARE_SCENARIOS.length)];
    safeUI.say(sc.pass, 4200);
    setTimeout(() => safeUI.say(sc.driver, 4800), 2200);

    const pois = (world && world.pois && world.pois.length) ? world.pois : [{ n: '12th Main Corner', x: 180, z: 220 }];
    const candidates = pois.filter(p => Math.hypot(p.x - auto.x, p.z - auto.z) > 85 && Math.hypot(p.x - auto.x, p.z - auto.z) < 480);
    const targetPoi = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : pois[Math.floor(Math.random() * pois.length)];

    if (sc.detour && targetPoi) {
      activeQuest = {
        type: 'detour',
        target: targetPoi,
        timer: 85,
        reward: sc.base,
        bargained: false
      };
      detourGroup.position.set(targetPoi.x, 0, targetPoi.z);
      detourGroup.visible = true;
      safeUI.fare(`DETOUR: Reach ${targetPoi.n} (85s) · Rs.${stats.fare} (+Rs.${sc.base})`);
      safeUI.toast(`Weird Detour! Drive to orange pillar at ${targetPoi.n} or Honk to haggle!`);
    } else {
      activeQuest = {
        type: 'haggle',
        timer: 14,
        reward: sc.base,
        bargained: false
      };
      stats.fare += Math.round(sc.base * 0.5);
      safeUI.fare(`Meter Off · Won-and-Half: Rs.${stats.fare} (Honk SPACE to demand +Rs.40!)`);
    }
  }

  function triggerArgument(npc, line, isMutual = false) {
    npc.fightTimer = 3.6;
    npc.cooldown = 11.0;
    stats.fights++;
    playBeep(npc.pitch || 490, 0.28, 'sawtooth', 0.16);
    spawnBubble(npc.mesh, line || FIGHT_LINES[stats.fights % FIGHT_LINES.length], 3.4, 3.3, isMutual);
    safeUI.toast(`Auto Lafda! "${line}" (Fights: ${stats.fights})`);
  }

  // ---------- Public API Methods ----------
  function onHorn() {
    stats.honks++;
    ensureAudio();

    // 1. Haggle bonus if a fare event is active
    if (activeQuest && !activeQuest.bargained) {
      activeQuest.bargained = true;
      stats.fare += 45;
      playCashBell();
      safeUI.say('Passenger: "Sari sari bedi anna! Take +45 rupees extra, just drive!"', 3500);
      safeUI.fare(`Bargain Won! Total Fare: Rs.${stats.fare}`);
      safeUI.toast('+Rs. 45 Haggle Bonus!');
    }

    // 2. Check nearby NPC autos for horn argument
    for (const na of npcAutos) {
      const d = Math.hypot(na.x - auto.x, na.z - auto.z);
      if (d < 15 && na.cooldown <= 0) {
        triggerArgument(na, 'Eh, horn yaake maadtya?! Road nimda?!');
        break;
      }
    }

    // 3. Check nearby cows
    for (const c of cows) {
      if (Math.hypot(c.x - auto.x, c.z - auto.z) < 13 && c.cooldown <= 0) {
        c.cooldown = 6;
        playMoo();
        spawnBubble(c.mesh, 'Gomatha, side please!', 3.0, 2.6, false);
        safeUI.say('You: "Aiyyo Gomatha, middle of 100 Feet Road alli malkondbittide!"', 3200);
      }
    }
  }

  function checkNpcSolid(x, z) {
    for (let i = 0; i < cows.length; i++) {
      const c = cows[i];
      if (Math.hypot(x - c.x, z - c.z) < 1.35) {
        if (c.cooldown <= 0) {
          c.cooldown = 5;
          playMoo();
          spawnBubble(c.mesh, 'MOOO! Side hogappa!', 2.8, 2.5, false);
        }
        return true;
      }
    }
    for (let i = 0; i < npcAutos.length; i++) {
      const na = npcAutos[i];
      if (Math.hypot(x - na.x, z - na.z) < 1.35) {
        if (na.cooldown <= 0) {
          triggerArgument(na, 'Yenappa idu, kannu kanalva?! Bumper hoythu!');
        }
        return true;
      }
    }
    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      if (Math.hypot(x - tu.x, z - tu.z) < tu.radius * 0.72) {
        return true;
      }
    }
    return false;
  }

  // Reusable temporaries for 0-GC hot loop
  const m4 = new T.Matrix4();
  const q4 = new T.Quaternion();
  const vPos = new T.Vector3();
  const vScale = new T.Vector3(1, 1, 1);
  const yAxis = new T.Vector3(0, 1, 0);
  const xAxis = new T.Vector3(1, 0, 0);
  let clock = 0;

  function update(dt, playerAuto, hour = 17.8) {
    clock += dt;
    const isNight = nightUniform.value;

    // 1. Update NPC Auto-Rickshaws
    for (let i = 0; i < npcAutos.length; i++) {
      const na = npcAutos[i];
      if (na.cooldown > 0) na.cooldown -= dt;
      na.cone.material.opacity = isNight * 0.22;

      const distToPlayer = Math.hypot(na.x - playerAuto.x, na.z - playerAuto.z);

      // Trigger close-overtake argument
      if (distToPlayer < 4.2 && Math.abs(playerAuto.v) > 8 && na.cooldown <= 0 && na.fightTimer <= 0) {
        triggerArgument(na, FIGHT_LINES[(i + stats.fights) % FIGHT_LINES.length]);
      }

      // Occasional NPC-vs-NPC comic dust cloud ("POW! BAM!")
      if (i < npcAutos.length - 1 && na.fightTimer <= 0 && na.cooldown <= 0) {
        const other = npcAutos[i + 1];
        if (Math.hypot(na.x - other.x, na.z - other.z) < 3.6 && Math.random() < dt * 0.35) {
          na.fightTimer = other.fightTimer = 3.2;
          na.cooldown = other.cooldown = 14;
          stats.fights++;
          spawnBubble(na.mesh, i % 2 ? 'POW! METER HAAKU!' : 'BAM! FULL LAFDA!', 3.0, 3.5, true);
        }
      }

      if (na.fightTimer > 0) {
        na.fightTimer -= dt;
        // Turn toward player & shake fist + hop
        const targetYaw = Math.atan2(playerAuto.x - na.x, playerAuto.z - na.z);
        na.mesh.rotation.y = targetYaw;
        na.mesh.position.y = Math.abs(Math.sin(clock * 14)) * 0.14;
        na.armR.rotation.x = -2.2 + Math.sin(clock * 22) * 0.65;
        continue;
      } else {
        na.mesh.position.y = 0;
        na.armR.rotation.x = -0.5;
      }

      // Advance along road segment graph
      const seg = navSegs[na.segIdx];
      if (!seg) continue;

      let curSpeed = na.baseSpeed;
      if (distToPlayer < 10) curSpeed *= 0.35; // Slow near player

      na.t += (na.dir * curSpeed * dt) / seg.len;
      if (na.t > 1 || na.t < 0) {
        const links = na.t > 1 ? seg.next : seg.prev;
        if (links && links.length > 0) {
          const pick = links[Math.floor(Math.random() * links.length)];
          na.segIdx = pick.idx;
          na.dir = pick.dir;
          na.t = na.dir > 0 ? 0.02 : 0.98;
        } else {
          na.dir *= -1;
          na.t = T.MathUtils.clamp(na.t, 0.02, 0.98);
        }
      }

      const activeSeg = navSegs[na.segIdx];
      const laneOff = (activeSeg.width * 0.24) * na.dir;
      na.x = activeSeg.x1 + activeSeg.ux * activeSeg.len * na.t - activeSeg.uz * laneOff;
      na.z = activeSeg.z1 + activeSeg.uz * activeSeg.len * na.t + activeSeg.ux * laneOff;
      na.yaw = Math.atan2(activeSeg.ux * na.dir, activeSeg.uz * na.dir);

      na.mesh.position.set(na.x, 0, na.z);
      na.mesh.rotation.y = na.yaw;

      // Ambient traffic beep when near player
      if (distToPlayer < 32 && Math.random() < dt * 0.18) {
        playBeep(na.pitch, 0.16, 'square', 0.06 * Math.max(0.2, 1 - distToPlayer / 35));
      }
    }

    // 2. Update Traffic Jam Cars, KSRTC Buses & Weaving Rapido Bikes
    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      const seg = navSegs[tu.segIdx];
      if (!seg) continue;

      const dPlayer = Math.hypot(tu.x - playerAuto.x, tu.z - playerAuto.z);
      const effSpeed = dPlayer < 7 ? tu.speed * 0.2 : tu.speed;

      tu.t += (tu.dir * effSpeed * dt) / seg.len;
      if (tu.t > 1 || tu.t < 0) {
        const links = tu.t > 1 ? seg.next : seg.prev;
        if (links && links.length) {
          const pick = links[i % links.length];
          tu.segIdx = pick.idx;
          tu.dir = pick.dir;
          tu.t = tu.dir > 0 ? 0.02 : 0.98;
        } else {
          tu.dir *= -1;
          tu.t = T.MathUtils.clamp(tu.t, 0.02, 0.98);
        }
      }

      const s = navSegs[tu.segIdx];
      const weave = tu.type === 'bike' ? Math.sin(clock * 3.8 + tu.weavePhase) * 1.15 : 0;
      const lane = (s.width * 0.22) * tu.dir + weave;
      tu.x = s.x1 + s.ux * s.len * tu.t - s.uz * lane;
      tu.z = s.z1 + s.uz * s.len * tu.t + s.ux * lane;
      tu.yaw = Math.atan2(s.ux * tu.dir, s.uz * tu.dir);
      tu.mesh.position.set(tu.x, 0, tu.z);
      tu.mesh.rotation.y = tu.yaw;
    }

    // 3. Update Cows & Stray Dogs
    for (let i = 0; i < cows.length; i++) {
      const c = cows[i];
      if (c.cooldown > 0) c.cooldown -= dt;
      c.head.rotation.z = Math.sin(clock * 1.8 + i) * 0.08;
    }

    for (let i = 0; i < dogs.length; i++) {
      const d = dogs[i];
      if (d.barkCooldown > 0) d.barkCooldown -= dt;
      d.tail.rotation.z = Math.sin(clock * 16 + i) * 0.45;

      const dp = Math.hypot(d.x - playerAuto.x, d.z - playerAuto.z);
      const chase = dp < 16 && Math.abs(playerAuto.v) > 2;
      const spd = chase ? 5.2 : 1.8;

      if (chase && d.barkCooldown <= 0) {
        d.barkCooldown = 4.5;
        playBark();
      }

      d.t += (d.dir * spd * dt) / d.seg.len;
      if (d.t > 0.95) { d.t = 0.95; d.dir = -1; }
      if (d.t < 0.05) { d.t = 0.05; d.dir = 1; }

      d.x = d.seg.x1 + d.seg.ux * d.seg.len * d.t - d.seg.uz * d.kerbOff;
      d.z = d.seg.z1 + d.seg.uz * d.seg.len * d.t + d.seg.ux * d.kerbOff;
      d.mesh.position.set(d.x, chase ? Math.abs(Math.sin(clock * 14)) * 0.12 : 0, d.z);
      d.mesh.rotation.y = Math.atan2(d.seg.ux * d.dir, d.seg.uz * d.dir);
    }

    // 4. Update Instanced Pedestrians (swing walk + hop back "Aiyyo!" when auto nears)
    for (let i = 0; i < PED_COUNT; i++) {
      const p = peds[i];
      if (p.cooldown > 0) p.cooldown -= dt;

      p.t += (p.dir * p.speed * dt) / p.seg.len;
      if (p.t > 0.96) { p.t = 0.96; p.dir = -1; }
      if (p.t < 0.04) { p.t = 0.04; p.dir = 1; }

      p.x = p.seg.x1 + p.seg.ux * p.seg.len * p.t - p.seg.uz * p.kerbOff;
      p.z = p.seg.z1 + p.seg.uz * p.seg.len * p.t + p.seg.ux * p.kerbOff;
      p.yaw = Math.atan2(p.seg.ux * p.dir, p.seg.uz * p.dir);

      const dp = Math.hypot(p.x - playerAuto.x, p.z - playerAuto.z);
      if (dp < 8.5 && Math.abs(playerAuto.v) > 3.5 && p.cooldown <= 0) {
        p.cooldown = 7.0;
        p.hopY = 0.45;
        p.anchor.position.set(p.x, 0, p.z);
        spawnBubble(p.anchor, i % 2 === 0 ? 'Aiyyo! Swalpa side!' : 'Kannu kanalva guru?!', 2.4, 2.5, false);
      }

      if (p.hopY > 0) p.hopY = Math.max(0, p.hopY - dt * 1.4);
      const swing = Math.sin(clock * 7.5 + p.phase) * 0.45;

      q4.setFromAxisAngle(yAxis, p.yaw);
      vPos.set(p.x, 0.82 + p.hopY, p.z);
      m4.compose(vPos, q4, vScale);
      pedTorsoInst.setMatrixAt(i, m4);

      vPos.set(p.x, 1.32 + p.hopY, p.z);
      m4.compose(vPos, q4, vScale);
      pedHeadInst.setMatrixAt(i, m4);

      const qLegL = q4.clone().multiply(new T.Quaternion().setFromAxisAngle(xAxis, swing));
      vPos.set(p.x - Math.cos(p.yaw) * 0.09, 0.28 + p.hopY, p.z + Math.sin(p.yaw) * 0.09);
      m4.compose(vPos, qLegL, vScale);
      pedLegLInst.setMatrixAt(i, m4);

      const qLegR = q4.clone().multiply(new T.Quaternion().setFromAxisAngle(xAxis, -swing));
      vPos.set(p.x + Math.cos(p.yaw) * 0.09, 0.28 + p.hopY, p.z - Math.sin(p.yaw) * 0.09);
      m4.compose(vPos, qLegR, vScale);
      pedLegRInst.setMatrixAt(i, m4);
    }
    pedTorsoInst.instanceMatrix.needsUpdate = true;
    pedHeadInst.instanceMatrix.needsUpdate = true;
    pedLegLInst.instanceMatrix.needsUpdate = true;
    pedLegRInst.instanceMatrix.needsUpdate = true;

    // 5. Update Night Vendor Lanterns
    for (let i = 0; i < vendorLanterns.length; i++) {
      vendorLanterns[i].pool.material.opacity = isNight * 0.35;
    }

    // 6. Update Active Speech Bubbles
    for (let i = 0; i < bubblePool.length; i++) {
      const b = bubblePool[i];
      if (b.timer > 0 && b.target) {
        b.timer -= dt;
        b.sprite.position.set(b.target.position.x, b.yOff, b.target.position.z);
        b.sprite.material.opacity = Math.min(1, b.timer * 1.5);
        if (b.timer <= 0) b.sprite.visible = false;
      }
    }

    // 7. Weird Fare & Detour Gameplay Loop
    fareEventTimer -= dt;
    if (!activeQuest && fareEventTimer <= 0) {
      fareEventTimer = 38 + Math.random() * 18;
      triggerFareScenario();
    }

    if (activeQuest) {
      activeQuest.timer -= dt;
      if (activeQuest.type === 'detour' && activeQuest.target) {
        wpRing.scale.setScalar(1 + Math.sin(clock * 4) * 0.08);
        const dist = Math.hypot(playerAuto.x - activeQuest.target.x, playerAuto.z - activeQuest.target.z);
        if (dist < 13.5) {
          stats.fare += activeQuest.reward;
          stats.detours++;
          playCashBell();
          safeUI.say(`You: "Nodi sir, shortcut alli karkondu bande! Give Rs.${activeQuest.reward}!"`, 4200);
          safeUI.fare(`Detour Complete! Fare: Rs.${stats.fare} (Detours: ${stats.detours})`);
          safeUI.toast(`+Rs.${activeQuest.reward} Detour Bonus!`);
          detourGroup.visible = false;
          activeQuest = null;
        } else if (activeQuest.timer <= 0) {
          safeUI.say('Passenger: "Idu yelli karkondu hogtidya?! Naan ilidbidtini!"', 4200);
          safeUI.fare(`Detour Timed Out · Fare: Rs.${stats.fare}`);
          detourGroup.visible = false;
          activeQuest = null;
        }
      } else if (activeQuest.timer <= 0) {
        activeQuest = null;
      }
    }
  }

  function setMuted(m) {
    muted = Boolean(m);
    if (master && AC) master.gain.setValueAtTime(muted ? 0 : 0.22, AC.currentTime);
  }

  function dispose() {
    scene.remove(root);
    if (AC) AC.close().catch(() => {});
  }

  return {
    update,
    onHorn,
    solid: checkNpcSolid,
    setMuted,
    stats,
    root,
    dispose
  };
}
