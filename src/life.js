// src/life.js
import * as THREE from 'three';
import { nightUniform } from './materials.js';
import { buildAuto, updateAuto } from './auto.js';
import { attachHeadlightsToNearest, makeHeadlightRig } from './lamps.js';

const FIGHT_LINES = [
  'Turn on the meter, friend!',
  'No Ola here, this is my auto!',
  'Hey, are you blind?',
  'Why are you honking at me?',
  'Return fare is double, sir!',
  'Sir, 100 Feet Road costs extra!',
  'Hey, watch the signal!',
  'Please adjust a little!',
  'Our Bengaluru, our rules!',
  'Keep left, friend, this is a one-lane road!'
];

const FARE_SCENARIOS = [
  {
    pass: 'Passenger: "Driver, Indiranagar Metro for 60 rupees? Will you go by meter?"',
    driver: 'You: "Madam, the meter is broken! Traffic is heavy, pay 150!" (Tip: Honk SPACE to bargain!)',
    detour: false,
    base: 150
  },
  {
    pass: 'Passenger: "Please take me to 12th Main, it is urgent!"',
    driver: 'You: "12th Main has too many speed breakers, sir! Taking a shortcut, return fare is double!"',
    detour: true,
    base: 220
  },
  {
    pass: 'Passenger: "Sir, Toit on 100 Feet Road, the app shows 85 rupees!"',
    driver: 'You: "Forget the app, friend! One and a half fare plus 50 extra!" (Tip: Honk SPACE to bargain!)',
    detour: true,
    base: 190
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
      const rx = i % 2 === 0 ? 220 : 105;
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
    ctx.font = '900 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 82);
  } else {
    const r = 26, x = 18, y = 14, w = 476, h = 106;
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = '800 27px sans-serif';
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

// Tint a cloned buildAuto() model to create yellow/green, black/yellow, or blue electric auto variants with wear jitter
function applyAutoVariantAndWear(autoGroup, idx) {
  const bodyColors = [0x1f7a43, 0x166534, 0x18181b, 0x0284c7, 0x115e59];
  const roofColors = [0xf6c30f, 0xeab308, 0xfacc15, 0xe2e8f0, 0xd97706];
  const bodyHex = bodyColors[idx % bodyColors.length];
  const roofHex = roofColors[idx % roofColors.length];

  // Disable individual real SpotLight on AI autos so we use the shared attachHeadlightsToNearest pool
  if (autoGroup.userData && autoGroup.userData.hl) {
    autoGroup.userData.hl.intensity = 0;
  }

  autoGroup.traverse((child) => {
    if (child.isMesh && child.material && child.material.color) {
      const hex = child.material.color.getHex();
      if (hex === 0x1f7a43) {
        child.material = child.material.clone();
        child.material.color.setHex(bodyHex);
        child.material.roughness = 0.42 + (idx % 3) * 0.12;
      } else if (hex === 0xf6c30f) {
        child.material = child.material.clone();
        child.material.color.setHex(roofHex);
      }
    }
  });

  // Slight scale & mirror tilt jitter for authentic Bangalore street wear
  const sx = 0.96 + (idx % 3) * 0.03;
  const sy = 0.97 + ((idx + 1) % 3) * 0.025;
  autoGroup.scale.set(1.18 * sx, 1.18 * sy, 1.18);
}

function createLodAutoMesh(idx) {
  const g = new THREE.Group();
  const bodyColors = [0x1f7a43, 0x166534, 0x18181b, 0x0284c7, 0x115e59];
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.0, 2.5),
    new THREE.MeshStandardMaterial({ color: bodyColors[idx % bodyColors.length], roughness: 0.7 })
  );
  body.position.y = 0.7;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.45, 2.1),
    new THREE.MeshStandardMaterial({ color: 0xf6c30f, roughness: 0.6 })
  );
  roof.position.set(0, 1.55, -0.1);
  g.add(body, roof);
  return g;
}

export function createStreetLife({
  THREE: T = THREE,
  scene,
  camera,
  world,
  roadSegs = [],
  speedBreakers = [],
  vendorSpots = [],
  solid = () => 0,
  obstacleFn = () => false,
  auto,
  npcsRef = null,
  ui = {}
}) {
  const root = new T.Group();
  scene.add(root);

  const safeUI = {
    say: (txt, ms = 4000) => ui && typeof ui.say === 'function' && ui.say(txt, ms),
    fare: (txt) => ui && typeof ui.fare === 'function' && ui.fare(txt),
    toast: (txt) => ui && typeof ui.toast === 'function' && ui.toast(txt)
  };

  const stats = { fare: 120, fights: 0, honks: 0, detours: 0 };

  // ---------- Lazy WebAudio Synth ----------
  let AC = null, master = null, muted = false, lastAudioTime = 0;

  function ensureAudio() {
    if (muted) return null;
    if (!AC) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      AC = new Ctx();
      master = AC.createGain();
      master.gain.value = 0.20;
      master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume().catch(() => {});
    return AC;
  }

  function playBeep(freq = 480, dur = 0.22, type = 'square', vol = 0.11) {
    const ctx = ensureAudio();
    if (!ctx || ctx.currentTime - lastAudioTime < 0.09) return;
    lastAudioTime = ctx.currentTime;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o1.type = type; o2.type = type;
    o1.frequency.setValueAtTime(freq, ctx.currentTime);
    o2.frequency.setValueAtTime(freq * 1.24, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o1.connect(g); o2.connect(g); g.connect(master);
    o1.start(); o2.start();
    o1.stop(ctx.currentTime + dur + 0.02);
    o2.stop(ctx.currentTime + dur + 0.02);
  }

  function playMoo() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(145, t);
    o.frequency.linearRampToValueAtTime(175, t + 0.25);
    o.frequency.linearRampToValueAtTime(118, t + 0.85);
    lp.type = 'lowpass'; lp.frequency.value = 340;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.20, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.95);
  }

  function playCashBell() {
    const ctx = ensureAudio();
    if (!ctx) return;
    [784, 1046, 1318].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.08;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.38);
    });
  }

  window.addEventListener('pointerdown', ensureAudio, { once: true });
  window.addEventListener('keydown', ensureAudio, { once: true });

  // ---------- Road Graph (Left-Hand Drive India Lane Logic) ----------
  const navSegs = [];
  for (let i = 0; i < roadSegs.length; i++) {
    const s = roadSegs[i];
    const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    if (len < 6) continue;
    const kind = s.kind ?? s[5] ?? 3;
    if (kind >= 2) {
      navSegs.push({
        x1, z1, x2, z2,
        ux: dx / len, uz: dz / len,
        len,
        name: s.name ?? s[4] ?? '',
        kind,
        width: s.width ?? s[6] ?? 7.5,
        lanes: s.lanes || (kind >= 5 ? 2 : 1),
        divided: Boolean(s.divided),
        next: [], prev: []
      });
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

  // Dense weighting on 100 Feet Road & CMH Road
  const denseSegIndices = [];
  navSegs.forEach((s, idx) => {
    if (Math.hypot(s.x1 - (-133), s.z1 - (-345)) < 26) return;
    if (s.name.includes('100 Feet') || s.name.includes('Chinmaya') || s.name.includes('12th Main')) {
      denseSegIndices.push(idx, idx, idx);
    } else if (s.kind >= 3) {
      denseSegIndices.push(idx);
    }
  });
  if (!denseSegIndices.length) navSegs.forEach((_, idx) => denseSegIndices.push(idx));

  // ---------- Comic Speech Bubbles ----------
  const bubblePool = [];
  for (let i = 0; i < 8; i++) {
    const bData = makeBubbleTexture('Turn on the meter, friend!');
    const mat = new T.SpriteMaterial({ map: bData.tex, transparent: true, depthWrite: false, depthTest: false, fog: false, color: new T.Color(0.8, 0.8, 0.8) });
    const sp = new T.Sprite(mat);
    sp.scale.set(9.2, 2.9, 1);
    sp.renderOrder = 999;
    sp.visible = false;
    root.add(sp);
    bubblePool.push({ sprite: sp, c: bData.c, ctx: bData.ctx, tex: bData.tex, text: '', isBurst: false, timer: 0, target: null, yOff: 3.3 });
  }

  // Size and place a bubble from the camera used for THIS render (the camera moves after the life update, so a size
  // computed in the update lagged behind and the panel overflowed the screen). A bubble is at most 30% of the screen
  // width, is kept fully inside the viewport with a small margin, and is hidden when closer than 1.5 m.
  const _bR = new THREE.Vector3(), _bU = new THREE.Vector3(), _bV = new THREE.Vector3();
  function fitBubble(b, cam) {
    if (!b.target || !cam || !cam.matrixWorldInverse) return;
    const sp = b.sprite;
    sp.position.set(b.target.position.x, b.yOff, b.target.position.z);
    _bV.copy(sp.position).applyMatrix4(cam.matrixWorldInverse);
    const depth = -_bV.z;
    const base = Math.min(1, Math.max(0, b.timer) * 1.5);
    if (_bV.length() < 1.5 || depth < 0.3) { sp.material.opacity = 0; return; }
    sp.material.opacity = base;
    const halfH = depth * Math.tan((cam.fov || 60) * Math.PI / 360), halfW = halfH * (cam.aspect || 1.6);
    const w = Math.min(9.2, (cam.aspect < 1 ? 0.72 : 0.3) * 2 * halfW), h = w * (2.9 / 9.2);
    sp.scale.set(w, h, 1);
    const bw = w / 2 + 0.04 * halfW, bh = h / 2 + 0.04 * halfH;
    const nx = Math.max(-halfW + bw, Math.min(halfW - bw, _bV.x)), ny = Math.max(-halfH + bh, Math.min(halfH - bh, _bV.y));
    if (nx !== _bV.x || ny !== _bV.y) {
      _bR.set(1, 0, 0).transformDirection(cam.matrixWorld); _bU.set(0, 1, 0).transformDirection(cam.matrixWorld);
      sp.position.addScaledVector(_bR, nx - _bV.x).addScaledVector(_bU, ny - _bV.y);
    }
    sp.updateMatrixWorld(true);
  }
  for (const pb of bubblePool) pb.sprite.onBeforeRender = (r, sc, cam) => { if (pb.timer > 0) fitBubble(pb, cam); };

  function spawnBubble(targetObj, text, dur = 3.2, yOff = 3.3, isBurst = false) {
    let slot = bubblePool.find(b => b.timer <= 0) || bubblePool[0];
    updateBubbleCanvas(slot, text, isBurst);
    slot.timer = dur;
    slot.target = targetObj;
    slot.yOff = yOff;
    slot.sprite.scale.set(isBurst ? 7.5 : 9.2, isBurst ? 2.8 : 2.9, 1);
    slot.sprite.material.opacity = 1;
    slot.sprite.visible = true;
  }

  // ---------- 1. Pool of 14 Detailed AI Autos (built via buildAuto() + LOD mesh at distance) ----------
  const npcAutos = [];
  const allHeadlightVehicles = [];

  for (let i = 0; i < 14; i++) {
    const segIdx = denseSegIndices[(i * 7) % denseSegIndices.length] || 0;
    const seg = navSegs[segIdx];

    const wrapper = new T.Group();
    const hiDetail = buildAuto();
    applyAutoVariantAndWear(hiDetail, i);
    const loDetail = createLodAutoMesh(i);
    loDetail.visible = false;
    wrapper.add(hiDetail, loDetail);
    root.add(wrapper);
    allHeadlightVehicles.push(wrapper);

    npcAutos.push({
      mesh: wrapper,
      hiDetail,
      loDetail,
      simState: { v: 7.0, steer: 0 },
      segIdx,
      t: (i * 0.17) % 0.88,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 7.0 + (i % 4) * 1.3,
      baseSpeed: 7.0 + (i % 4) * 1.3,
      overtakeOff: 0,
      x: seg ? seg.x1 : -120,
      z: seg ? seg.z1 : -280,
      yaw: 0,
      fightTimer: 0,
      cooldown: 0,
      pitch: 410 + i * 24
    });
  }

  // ---------- 2. BMTC Buses, Cars, Motorbikes, Scooters & Blue/Yellow Yulu Bikes ----------
  const trafficUnits = [];
  const carColors = [0xd93829, 0x2563eb, 0xeab308, 0xe2e8f0, 0x0d9488, 0xf97316];
  const matDark = new T.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.75 });
  const matYuluBlue = new T.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const matYellow = new T.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });

  function createTrafficVehicle(type, idx) {
    const g = new T.Group();
    if (type === 'bmtc') {
      // BMTC Blue & White City Bus
      const low = new T.Mesh(new T.BoxGeometry(2.35, 1.35, 7.2), new T.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 }));
      low.position.y = 1.05;
      const top = new T.Mesh(new T.BoxGeometry(2.30, 1.15, 7.1), new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }));
      top.position.y = 2.15;
      low.castShadow = top.castShadow = true;
      g.add(low, top);
    } else if (type === 'yulu') {
      // Iconic Bengaluru Blue & Yellow Yulu Electric Micro-Bike + Rider
      const frame = new T.Mesh(new T.BoxGeometry(0.28, 0.42, 1.05), matYuluBlue);
      frame.position.y = 0.38;
      const basket = new T.Mesh(new T.BoxGeometry(0.32, 0.24, 0.24), matYellow);
      basket.position.set(0, 0.65, 0.45);
      const rider = new T.Mesh(new T.BoxGeometry(0.36, 0.58, 0.26), new T.MeshStandardMaterial({ color: 0x10b981 }));
      rider.position.set(0, 0.88, -0.08);
      const head = new T.Mesh(new T.SphereGeometry(0.15, 8, 8), new T.MeshStandardMaterial({ color: 0xd4946a }));
      head.position.set(0, 1.30, -0.05);
      g.add(frame, basket, rider, head);
    } else if (type === 'bike') {
      // Motorbike / Scooter with Helmeted Rider
      const frame = new T.Mesh(new T.BoxGeometry(0.38, 0.55, 1.45), matDark);
      frame.position.y = 0.45;
      const rider = new T.Mesh(new T.BoxGeometry(0.42, 0.62, 0.30), new T.MeshStandardMaterial({ color: idx % 2 ? 0xe11d48 : 0x3b82f6 }));
      rider.position.set(0, 0.94, -0.05);
      const helm = new T.Mesh(new T.SphereGeometry(0.18, 10, 8), idx % 3 === 0 ? matYellow : matDark);
      helm.position.set(0, 1.38, 0.02);
      g.add(frame, rider, helm);
    } else {
      // Hatchback / Sedan
      const cMat = new T.MeshStandardMaterial({ color: carColors[idx % carColors.length], roughness: 0.35, metalness: 0.15 });
      const hull = new T.Mesh(new T.BoxGeometry(1.65, 0.68, 3.3), cMat);
      hull.position.y = 0.55;
      const cab = new T.Mesh(new T.BoxGeometry(1.48, 0.55, 1.8), cMat);
      cab.position.set(0, 1.12, -0.15);
      hull.castShadow = true;
      g.add(hull, cab);
    }

    const hlRig = makeHeadlightRig({ single: type === 'bike' || type === 'yulu' });
    hlRig.position.set(0, 0.52, type === 'bmtc' ? 3.6 : (type === 'car' ? 1.65 : 0.7));
    g.add(hlRig);
    return g;
  }

  for (let i = 0; i < 20; i++) {
    const type = i < 3 ? 'bmtc' : (i < 8 ? 'yulu' : (i < 14 ? 'bike' : 'car'));
    const segIdx = denseSegIndices[(i * 5 + 2) % denseSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const mesh = createTrafficVehicle(type, i);
    root.add(mesh);
    if (type === 'car' || type === 'bmtc') allHeadlightVehicles.push(mesh);

    trafficUnits.push({
      type,
      mesh,
      segIdx,
      t: (i * 0.13) % 0.9,
      dir: i % 2 === 0 ? 1 : -1,
      speed: type === 'yulu' ? 4.8 : (type === 'bike' ? 9.2 : (type === 'bmtc' ? 5.2 : 6.8)),
      baseSpeed: type === 'yulu' ? 4.8 : (type === 'bike' ? 9.2 : (type === 'bmtc' ? 5.2 : 6.8)),
      weavePhase: i * 1.1,
      x: seg ? seg.x1 : -140,
      z: seg ? seg.z1 : -260,
      yaw: 0,
      radius: type === 'bmtc' ? 2.6 : (type === 'car' ? 1.5 : 0.65)
    });
  }

  // Parked Yulu Dock Cluster on 100 Feet Road / 12th Main kerb
  const yuluDockSpots = [[-118, -365], [285, 590], [-145, -490]];
  for (const [yx, yz] of yuluDockSpots) {
    if (solid(yx, yz)) continue;
    for (let k = 0; k < 4; k++) {
      const yb = createTrafficVehicle('yulu', k);
      yb.children[yb.children.length - 1].visible = false; // hide rider head
      yb.children[yb.children.length - 2].visible = false; // hide rider torso
      yb.position.set(yx + k * 0.85, 0, yz);
      yb.rotation.y = 0.4;
      root.add(yb);
    }
  }

  // ---------- 3. Cows Lying/Standing in the Road ----------
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
    }
    g.add(body, spot, hump, head);
    return { group: g, head };
  }

  for (let i = 0; i < 5; i++) {
    const segIdx = denseSegIndices[(i * 11 + 3) % denseSegIndices.length] || 0;
    const seg = navSegs[segIdx];
    const t = 0.4 + (i % 3) * 0.15;
    const cx = seg.x1 + seg.ux * seg.len * t + (-seg.uz) * ((i % 2 ? 1 : -1) * 1.6);
    const cz = seg.z1 + seg.uz * seg.len * t + (seg.ux) * ((i % 2 ? 1 : -1) * 1.6);
    if (Math.hypot(cx - (-133), cz - (-345)) < 28) continue;
    const built = createCowMesh(i % 2 === 0);
    built.group.position.set(cx, 0, cz);
    built.group.rotation.y = i * 1.2;
    root.add(built.group);
    cows.push({ mesh: built.group, head: built.head, x: cx, z: cz, cooldown: 0 });
  }

  // ---------- 4. Street Vendor Carts at exported vendorSpots ----------
  const vendorTypes = [
    { roof: 0x16a34a, prop: 0x22c55e },
    { roof: 0xdc2626, prop: 0xfacc15 },
    { roof: 0xf59e0b, prop: 0xfef08a },
    { roof: 0x2563eb, prop: 0xf97316 }
  ];
  const woodCartMat = new T.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.85 });
  const maxCarts = Math.min(vendorSpots.length, 16);
  for (let i = 0; i < maxCarts; i++) {
    const vs = vendorSpots[i];
    const vt = vendorTypes[i % vendorTypes.length];
    const vg = new T.Group();
    vg.position.set(vs.x, 0, vs.z);
    vg.rotation.y = vs.yaw || 0;
    const bed = new T.Mesh(new T.BoxGeometry(1.25, 0.2, 1.9), woodCartMat);
    bed.position.y = 0.78;
    const canopy = new T.Mesh(new T.ConeGeometry(1.3, 0.6, 4), new T.MeshStandardMaterial({ color: vt.roof, roughness: 0.6 }));
    canopy.position.y = 2.2;
    canopy.rotation.y = Math.PI / 4;
    const mound = new T.Mesh(new T.SphereGeometry(0.45, 8, 6), new T.MeshStandardMaterial({ color: vt.prop, roughness: 0.7 }));
    mound.scale.set(1.1, 0.6, 1.3);
    mound.position.set(0, 1.02, 0);
    vg.add(bed, canopy, mound);
    root.add(vg);
  }

  // ---------- 5. Weird Fare & Detour Waypoint ----------
  const detourGroup = new T.Group();
  detourGroup.visible = false;
  const wpBeam = new T.Mesh(
    new T.CylinderGeometry(1.4, 1.4, 95, 16, 1, true),
    new T.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, fog: false })
  );
  wpBeam.position.y = 47.5;
  detourGroup.add(wpBeam);
  root.add(detourGroup);

  let fareEventTimer = 28;
  let activeQuest = null;

  function triggerFareScenario() {
    const sc = FARE_SCENARIOS[Math.floor(Math.random() * FARE_SCENARIOS.length)];
    safeUI.say(sc.pass, 4200);
    setTimeout(() => safeUI.say(sc.driver, 4800), 2200);

    const pois = (world && world.pois && world.pois.length) ? world.pois : [{ n: '12th Main Corner', x: 180, z: 220 }];
    const candidates = pois.filter(p => Math.hypot(p.x - auto.x, p.z - auto.z) > 85 && Math.hypot(p.x - auto.x, p.z - auto.z) < 480);
    const targetPoi = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : pois[0];

    if (sc.detour && targetPoi) {
      activeQuest = { type: 'detour', target: targetPoi, timer: 85, reward: sc.base, bargained: false };
      detourGroup.position.set(targetPoi.x, 0, targetPoi.z);
      detourGroup.visible = true;
      safeUI.fare(`DETOUR: Reach ${targetPoi.n} (85s) · Rs.${stats.fare} (+Rs.${sc.base})`);
    } else {
      activeQuest = { type: 'haggle', timer: 14, reward: sc.base, bargained: false };
      stats.fare += Math.round(sc.base * 0.5);
      safeUI.fare(`Meter Off · Won-and-Half: Rs.${stats.fare} (Honk SPACE to demand +Rs.45!)`);
    }
  }

  function triggerArgument(npc, line, isMutual = false) {
    npc.fightTimer = 3.4;
    npc.cooldown = 11.0;
    stats.fights++;
    playBeep(npc.pitch || 490, 0.28, 'sawtooth', 0.15);
    spawnBubble(npc.mesh, line || FIGHT_LINES[stats.fights % FIGHT_LINES.length], 3.3, 3.3, isMutual);
    safeUI.toast(`Auto Lafda! "${line}"`);
  }

  function onHorn() {
    stats.honks++;
    ensureAudio();

    if (activeQuest && !activeQuest.bargained) {
      activeQuest.bargained = true;
      stats.fare += 45;
      playCashBell();
      safeUI.say('Passenger: "No more arguing, brother! Take 45 rupees extra, just drive!"', 3500);
      safeUI.fare(`Bargain Won! Total Fare: Rs.${stats.fare}`);
    }

    for (const na of npcAutos) {
      if (Math.hypot(na.x - auto.x, na.z - auto.z) < 15 && na.cooldown <= 0) {
        triggerArgument(na, 'Hey, why are you honking?! Stay in the left lane!');
        break;
      }
    }

    for (const c of cows) {
      if (Math.hypot(c.x - auto.x, c.z - auto.z) < 13 && c.cooldown <= 0) {
        c.cooldown = 6;
        playMoo();
        spawnBubble(c.mesh, 'Shoo, cow - move aside, please!', 3.0, 2.6, false);
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
          spawnBubble(c.mesh, 'MOOO! Go around me!', 2.8, 2.5, false);
        }
        return true;
      }
    }
    for (let i = 0; i < npcAutos.length; i++) {
      const na = npcAutos[i];
      const nax = na.x + (na.kn ? na.kn.ox : 0), naz = na.z + (na.kn ? na.kn.oz : 0);
      if (Math.hypot(x - nax, z - naz) < 1.35) {
        if (na.cooldown <= 0) triggerArgument(na, 'What is this, are you blind?! You hit my bumper!');
        return true;
      }
    }
    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      if (Math.hypot(x - tu.x, z - tu.z) < tu.radius * 0.72) return true;
    }
    return false;
  }

  // Helper: check if vehicle is near a speed breaker or traffic cop
  function getRoadHazardFactor(x, z) {
    for (let i = 0; i < speedBreakers.length; i++) {
      const sb = speedBreakers[i];
      if (Math.hypot(x - sb.x, z - sb.z) < 6.5) return 0.38; // Slow down for speed breaker
    }
    if (npcsRef && Array.isArray(npcsRef.npcs)) {
      for (let i = 0; i < npcsRef.npcs.length; i++) {
        const npc = npcsRef.npcs[i];
        if (npc.role === 'cop' && Math.hypot(x - npc.x, z - npc.z) < 11.0) return 0.18; // Stop/crawl for Constable Gowda
      }
    }
    return 1.0;
  }

  // Compute India Left-Hand Drive lane offset
  // Forward vector is (ux * dir, uz * dir); Left-hand normal is (uz * dir, -ux * dir)
  function computeLeftLanePos(seg, t, dir, extraOffset = 0) {
    const laneCenter = seg.divided ? seg.width * 0.24 : seg.width * 0.23;
    const offsetLeft = laneCenter + extraOffset;
    const lx = seg.uz * dir * offsetLeft;
    const lz = -seg.ux * dir * offsetLeft;
    return {
      x: seg.x1 + seg.ux * seg.len * t + lx,
      z: seg.z1 + seg.uz * seg.len * t + lz,
      yaw: Math.atan2(seg.ux * dir, seg.uz * dir)
    };
  }

  let clock = 0;

  function update(dt, playerAuto, hour = 17.8) {
    clock += dt;

    // 1. Update 14 Detailed AI Autos (Left-hand drive, LOD switching, speed-breaker slowdowns, rare overtaking)
    for (let i = 0; i < npcAutos.length; i++) {
      const na = npcAutos[i];
      if (na.cooldown > 0) na.cooldown -= dt;

      const distToPlayer = Math.hypot(na.x - playerAuto.x, na.z - playerAuto.z);
      // struck auto: slide/spin/hop with friction, collision-checked, then stays exactly where it lands (released only when the player is far away)
      if (na.kn) {
        const k = na.kn;
        if (distToPlayer > 160 && !inCameraView(na.x + k.ox, na.z + k.oz)) { na.kn = null; na.wreck = false; na.mesh.position.y = 0; }
        else {
          const fr = Math.exp(-3.2 * dt), frs = Math.exp(-4.5 * dt);
          const n = Math.max(1, Math.min(10, Math.ceil(Math.hypot(k.vx, k.vz) * dt / 0.15)));
          for (let q = 0; q < n; q++) {
            const nx = k.ox + k.vx * dt / n, nz = k.oz + k.vz * dt / n;
            if (!autoBlockedAt(na, na.x + nx, na.z + nz, na.yaw + k.oyaw)) { k.ox = nx; k.oz = nz; }
            else { k.vx = 0; k.vz = 0; break; }
          }
          const ny = k.oyaw + k.vsv * dt; if (!autoBlockedAt(na, na.x + k.ox, na.z + k.oz, na.yaw + ny)) k.oyaw = ny; else k.vsv = 0;
          k.vx *= fr; k.vz *= fr; k.vsv *= frs;
          if (k.ky > 0 || k.vy > 0) { k.vy -= 26 * dt; k.ky += k.vy * dt; if (k.ky < 0) { k.ky = 0; k.vy = 0; } }
          if (Math.abs(k.vx) + Math.abs(k.vz) < 0.05) { k.vx = 0; k.vz = 0; }
          if (Math.abs(k.vsv) < 0.05) k.vsv = 0;
          na.mesh.position.set(na.x + k.ox, k.ky, na.z + k.oz);
          na.mesh.rotation.y = na.yaw + k.oyaw;
          const useHi2 = distToPlayer < 95; na.hiDetail.visible = useHi2; na.loDetail.visible = !useHi2;
          continue;
        }
      }
      // Switch between full buildAuto() mesh (<95m) and cheap LOD mesh (>=95m)
      const useHi = distToPlayer < 95;
      na.hiDetail.visible = useHi;
      na.loDetail.visible = !useHi;

      if (distToPlayer < 4.2 && Math.abs(playerAuto.v) > 8 && na.cooldown <= 0 && na.fightTimer <= 0) {
        triggerArgument(na, FIGHT_LINES[(i + stats.fights) % FIGHT_LINES.length]);
      }

      if (na.fightTimer > 0) {
        na.fightTimer -= dt;
        na.mesh.rotation.y = Math.atan2(playerAuto.x - na.x, playerAuto.z - na.z);
        na.mesh.position.y = Math.abs(Math.sin(clock * 14)) * 0.12;
        continue;
      } else {
        na.mesh.position.y = 0;
      }

      const seg = navSegs[na.segIdx];
      if (!seg) continue;

      let hazardMult = getRoadHazardFactor(na.x, na.z);
      if (distToPlayer < 9.5) hazardMult = Math.min(hazardMult, 0.35);

      // Rare overtake offset when blocked ahead
      if (i % 4 === 0 && Math.sin(clock * 0.7 + i) > 0.82) {
        na.overtakeOff += (-1.2 - na.overtakeOff) * dt * 2.5;
      } else {
        na.overtakeOff += (0 - na.overtakeOff) * dt * 3.0;
      }

      const curSpeed = na.baseSpeed * hazardMult;
      na.simState.v = curSpeed;
      na.simState.steer = na.overtakeOff * 0.25;
      if (useHi) updateAuto(na.hiDetail, na.simState, dt);

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
      const lp = computeLeftLanePos(activeSeg, na.t, na.dir, na.overtakeOff);
      na.x = lp.x;
      na.z = lp.z;
      na.yaw = lp.yaw;
      na.mesh.position.set(na.x, 0, na.z);
      na.mesh.rotation.y = na.yaw;

      if (distToPlayer < 32 && Math.random() < dt * 0.16) {
        playBeep(na.pitch, 0.15, 'square', 0.05 * Math.max(0.2, 1 - distToPlayer / 35));
      }
    }

    // 2. Update BMTC Buses, Cars, Bikes & Yulu Riders on Left Lane
    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      const seg = navSegs[tu.segIdx];
      if (!seg) continue;

      const dPlayer = Math.hypot(tu.x - playerAuto.x, tu.z - playerAuto.z);
      const hazard = getRoadHazardFactor(tu.x, tu.z);
      const effSpeed = (dPlayer < 7 ? tu.baseSpeed * 0.25 : tu.baseSpeed) * hazard;

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
      const kerbHug = tu.type === 'yulu' ? 0.95 : (tu.type === 'bike' ? Math.sin(clock * 3.2 + tu.weavePhase) * 0.65 : 0);
      const lp = computeLeftLanePos(s, tu.t, tu.dir, kerbHug);
      tu.x = lp.x;
      tu.z = lp.z;
      tu.yaw = lp.yaw;
      tu.mesh.position.set(tu.x, 0, tu.z);
      tu.mesh.rotation.y = tu.yaw;
    }

    // Attach real SpotLight pool to nearest 4 AI vehicles at night
    attachHeadlightsToNearest(allHeadlightVehicles, playerAuto, 4, scene);

    // 3. Update Cows
    for (let i = 0; i < cows.length; i++) {
      const c = cows[i];
      if (c.cooldown > 0) c.cooldown -= dt;
      c.head.rotation.z = Math.sin(clock * 1.8 + i) * 0.08;
      if (c.kn) { // struck cow: slides sideways out of the path, collision-checked, stays where it lands
        const k = c.kn, fr = Math.exp(-3.2 * dt);
        const nx = c.x + k.vx * dt, nz = c.z + k.vz * dt;
        if (!solid(nx, nz)) { c.x = nx; c.z = nz; } else { k.vx = 0; k.vz = 0; }
        k.vx *= fr; k.vz *= fr;
        if (k.ky > 0 || k.vy > 0) { k.vy -= 26 * dt; k.ky += k.vy * dt; if (k.ky < 0) { k.ky = 0; k.vy = 0; } }
        c.mesh.position.set(c.x, k.ky, c.z); c.mesh.rotation.y += k.vsv * dt; k.vsv *= Math.exp(-4.5 * dt);
        if (Math.abs(k.vx) + Math.abs(k.vz) < 0.05) { k.vx = 0; k.vz = 0; }
      }
    }

    // 4. Update Speech Bubbles
    for (let i = 0; i < bubblePool.length; i++) {
      const b = bubblePool[i];
      if (b.timer > 0 && b.target) {
        b.timer -= dt;
        b.sprite.position.set(b.target.position.x, b.yOff, b.target.position.z);
        b.sprite.material.opacity = Math.min(1, b.timer * 1.5);
        if (camera && camera.matrixWorldInverse) fitBubble(b, camera);
        if (b.timer <= 0) b.sprite.visible = false;
      }
    }

    // 5. Weird Fare & Detour Loop
    fareEventTimer -= dt;
    if (!activeQuest && fareEventTimer <= 0) {
      fareEventTimer = 42 + Math.random() * 18;
      triggerFareScenario();
    }

    if (activeQuest) {
      activeQuest.timer -= dt;
      if (activeQuest.type === 'detour' && activeQuest.target) {
        const dist = Math.hypot(playerAuto.x - activeQuest.target.x, playerAuto.z - activeQuest.target.z);
        if (dist < 13.5) {
          stats.fare += activeQuest.reward;
          stats.detours++;
          playCashBell();
          safeUI.say(`You: "Sir, I took a shortcut for you! Give Rs.${activeQuest.reward}!"`, 4200);
          safeUI.fare(`Detour Complete! Fare: Rs.${stats.fare}`);
          detourGroup.visible = false;
          activeQuest = null;
        } else if (activeQuest.timer <= 0) {
          safeUI.say('Passenger: "Where are you taking me?! Let me out here!"', 4200);
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
    if (master && AC) master.gain.setValueAtTime(muted ? 0 : 0.20, AC.currentTime);
  }

  function dispose() {
    scene.remove(root);
    if (AC) AC.close().catch(() => {});
  }

  // footprint test for a struck npc auto (centre + 4 corners): solid world geometry only, so it may land on the footpath
  function autoBlockedAt(na, x, z, yaw) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    for (const [lx, lz] of [[0, 0], [0.85, 1.55], [-0.85, 1.55], [0.85, -1.55], [-0.85, -1.55]]) {
      const px = x + lx * c + lz * sn, pz = z - lx * sn + lz * c;
      if (solid(px, pz)) return true;
      if (obstacleFn(px, pz)) return true;
    }
    return false;
  }

  // true when a world point projects inside (a margin around) the camera view; used so a released auto never re-appears in view
  const _fr = new T.Frustum(), _pm = new T.Matrix4(), _sp = new T.Sphere(new T.Vector3(), 6);
  function inCameraView(x, z) {
    if (!camera || !camera.matrixWorldInverse || !camera.projectionMatrix) return true; // unknown camera: treat as visible, never release
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _fr.setFromProjectionMatrix(_pm);
    _sp.center.set(x, 1, z);
    return _fr.intersectsSphere(_sp);
  }

  // player impact on the autos/cows handled here (main.js calls life.kickAt): launch OUT of the carriageway, never reset
  function kickAt(x, z, dx, dz, power) {
    let best = null, bd = 2.7 * 2.7;
    for (let i = 0; i < npcAutos.length; i++) {
      const na = npcAutos[i]; if (na.kn && (Math.abs(na.kn.vx) + Math.abs(na.kn.vz) > 1.2 || na.kn.cool > 0)) continue;
      const ex = na.x + (na.kn ? na.kn.ox : 0) - x, ez = na.z + (na.kn ? na.kn.oz : 0) - z, d2 = ex * ex + ez * ez;
      if (d2 < bd) { bd = d2; best = na; }
    }
    if (best) {
      const na = best, seg = navSegs[na.segIdx];
      const k = na.kn || (na.kn = { ox: 0, oz: 0, oyaw: 0, vx: 0, vz: 0, vsv: 0, ky: 0, vy: 0, cool: 0 });
      na.wreck = true;
      const p = power * 1.0;
      if (seg) {
        const nx = -seg.uz, nz = seg.ux;
        const lat = (na.x + k.ox - seg.x1) * nx + (na.z + k.oz - seg.z1) * nz;
        const yEst = Math.min(1.5, p * 0.6 / 4.5);
        const ext = Math.abs(Math.sin(yEst)) * 1.6 + Math.abs(Math.cos(yEst)) * 0.9;
        const need = seg.width * 0.5 + ext + 0.4;
        let pick = 0, D = 0;
        const pref = lat >= 0 ? 1 : -1;
        for (const sd of [pref, -pref]) {
          const Dn = Math.max(1.5, need - sd * lat);
          if (!autoBlockedAt(na, na.x + k.ox + nx * sd * Dn, na.z + k.oz + nz * sd * Dn, na.yaw + k.oyaw)) { pick = sd; D = Dn; break; }
        }
        if (!pick) { pick = pref; D = Math.max(1.5, need - pick * lat); }
        const vl = Math.min(26, D * 3.3);
        k.vx = dx * p * 0.5 + nx * pick * vl; k.vz = dz * p * 0.5 + nz * pick * vl;
      } else { k.vx = dx * p; k.vz = dz * p; }
      const side = (na.x - x) * dz - (na.z - z) * dx;
      k.vsv += (side >= 0 ? 1 : -1) * p * 0.6;
      if (!(k.ky > 0.02)) k.vy = Math.min(12, 4.5 + p * 1.15);
      k.ky = 0.02; k.cool = 0.9;
      return true;
    }
    let cb = null, cd = 2.4 * 2.4;
    for (let i = 0; i < cows.length; i++) {
      const c = cows[i]; if (c.kn && Math.abs(c.kn.vx) + Math.abs(c.kn.vz) > 1.0) continue;
      const ex = c.x - x, ez = c.z - z, d2 = ex * ex + ez * ez; if (d2 < cd) { cd = d2; cb = c; }
    }
    if (cb) {
      const side = (cb.x - x) * dz - (cb.z - z) * dx, sg = side >= 0 ? 1 : -1;
      const sp = Math.min(14, 6 + power * 1.2);
      cb.kn = { vx: -dz * sg * sp + dx * power * 0.4, vz: dx * sg * sp + dz * power * 0.4, vy: 3.5 + power * 0.5, ky: 0.02, vsv: sg * 2.5 };
      return true;
    }
    return false;
  }

  return {
    update,
    kickAt,
    onHorn,
    solid: checkNpcSolid,
    setMuted,
    stats,
    dispose
  };
}
