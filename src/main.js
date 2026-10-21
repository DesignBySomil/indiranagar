// src/main.js
import * as THREE from 'three';
import { setupLighting } from './lighting.js';
import { createPost } from './post.js';
import { createLampLights, attachHeadlightsToNearest } from './lamps.js';
import { buildAuto, updateAuto } from './auto.js';
import { buildLandmark, nightUniform } from './landmarks.js';
import { buildCity } from './city.js';
import { buildStreet } from './street.js';
import { createStopsGame } from './stops.js';
import { createStreetLife } from './life.js';
import { createNPCs } from './npcs.js';
import { createRainTrees } from './trees.js';
import { createCameraRig } from './cameras.js';
import { createRimLight } from './rim.js';
import { buildIcons } from './icons.js';
import { createTraffic } from './vehicles.js';
import { createParkedVehicles } from './vehicles.js';
import { createCrowd } from './people.js';
import { upgradeBuildingFacades } from './buildingsHQ.js';
import { createHazards } from './hazards.js';
import { buildBrandStore, updateBrandStores } from './brands.js';
import { STOP_LIST, STOP_PLACES, LEELA_ACCESS_ROAD } from './stopsdata.js';
import { createAmbientOcclusion, tuneShadows } from './ao.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54, 1, 0.5, 2200);
const post = createPost(renderer, scene, camera);

let ao = null, shadowTuner = null, extras = null, traffic = null, parkedVehicles = null, crowd = null, bldgHQ = null;
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  post.setSize(innerWidth, innerHeight);
  if (ao && ao.setSize) ao.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const setLoad = (p, m) => {
  if ($('lbar')) $('lbar').style.width = p + '%';
  if (m && $('lmsg')) $('lmsg').textContent = m;
};

// ---------- lighting & sky ----------
const lighting = setupLighting(scene, renderer);
const applyTime = (h) => lighting.applyTime(h, 0.016, car.position);

const LANDMARKS_DATA = [
  { name: 'Toit', type: 'pub', x: -148.9, z: -377.2, nearestRoad: '100 Feet Road', roadDist: 15.7, faceYaw: 1.614 },
  { name: 'Truffles', type: 'restaurant', x: -155.6, z: -519.4, nearestRoad: '100 Feet Road', roadDist: 14.8, faceYaw: 1.632 },
  { name: 'MTR 1924', type: 'restaurant', x: -156.5, z: -502.3, nearestRoad: '100 Feet Road', roadDist: 16.7, faceYaw: 1.632 },
  { name: 'Burma Burma Restaurant & Tea Room', type: 'restaurant', x: 296.2, z: 601.9, nearestRoad: '12th Main Road', roadDist: 22.3, faceYaw: 0.024 },
  { name: 'Indiranagar Social', type: 'restaurant', x: 605.4, z: 579.0, nearestRoad: '80 Feet Road', roadDist: 23.2, faceYaw: -1.351 },
  { name: 'Arena Brewhouse', type: 'pub', x: -83.9, z: -87.1, nearestRoad: '2nd Main Road', roadDist: 17.1, faceYaw: 0.033 },
  { name: 'Meghana Biryani', type: 'restaurant', x: -444.3, z: -231.7, nearestRoad: 'Chinmaya Mission Hospital Road', roadDist: 16.5, faceYaw: -3.113 },
  { name: "Pizza 4P's", type: 'restaurant', x: -639.3, z: 657.5, nearestRoad: 'Indiranagar Double Road', roadDist: 14.7, faceYaw: -1.564 },
  { name: 'Jamie Oliver Kitchen', type: 'restaurant', x: -287.0, z: 631.3, nearestRoad: '12th Main Road', roadDist: 23.2, faceYaw: 0.075 },
  { name: 'Third Wave', type: 'cafe', x: 357.0, z: -293.8, nearestRoad: 'Chinmaya Mission Hospital Road', roadDist: 8.7, faceYaw: 0.027 },
  { name: 'The Fatty Bao', type: 'restaurant', x: 349.5, z: 609.0, nearestRoad: '12th Main Road', roadDist: 13.9, faceYaw: 0.027 },
  { name: 'Sri Udupi Park', type: 'restaurant', x: -117.8, z: 257.5, nearestRoad: '100 Feet Road', roadDist: 14.0, faceYaw: 1.618 },
  { name: 'Chin Lung Brewery', type: 'pub', x: -35.9, z: 744.2, nearestRoad: '100 Feet Road', roadDist: 30.6, faceYaw: -1.518 },
  { name: 'Starbucks', type: 'cafe', x: -225.7, z: 629.7, nearestRoad: '12th Main Road', roadDist: 20.2, faceYaw: 0.073 }
];

// ---------- world & modules ----------
let world, solid = () => 0;
let trees = null, camRig = null, destination = null, rimLight = null;
let npcs = null, roadSegs = [], lampHead = null, lampLights = null, stopsGame = null, life = null, icons = null;
const state = { hour: 17.8, auto: true };

const WANT = [
  ['Toit', 'Brewpub'],
  ['Indiranagar station', 'Namma Metro'],
  ['Truffles', 'Burgers'],
  ['MTR 1924', 'South Indian'],
  ['Burma Burma Restaurant & Tea Room', 'Burmese'],
  ['Indiranagar Social', 'Social'],
  ['Arena Brewhouse', 'Brewhouse'],
  ['Meghana Biryani', 'Biryani'],
  ["Pizza 4P's", 'Pizza'],
  ['Jamie Oliver Kitchen', 'Italian'],
  ['Third Wave', 'Coffee'],
  ['The Fatty Bao', 'Asian'],
  ['Sri Udupi Park', 'Tiffin'],
  ['Chin Lung Brewery', 'Brewery'],
  ['Swami Vivekananda Road station', 'Namma Metro'],
  ['Starbucks', 'Coffee']
];

const MAP = { x0: -650, x1: 830, z0: -805, z1: 775 };
const stops = [];

function nearestRoadInfo(x, z) {
  let best = 1e9, name = '', yaw = 0;
  for (const s of roadSegs) {
    if (!s[4]) continue;
    const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1;
    const t = THREE.MathUtils.clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1);
    const px = s[0] + dx * t, pz = s[1] + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      name = s[4];
      yaw = Math.atan2(px - x, pz - z);
    }
  }
  return { name: best < 60 ? name : '', yaw };
}

const brandGroup = new THREE.Group();
scene.add(brandGroup);

// push a brand plot off the carriageway and face it at the nearest road
function plotBesideRoad(x, z) {
  let best = 1e9, nx = x, nz = z;
  for (const r of world.roads) {
    if (r.k < 2) continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; nx = px; nz = pz; }
    }
  }
  const want = 15;
  let ox = x, oz = z;
  if (best < want) {
    let vx = x - nx, vz = z - nz; const vl = Math.hypot(vx, vz);
    if (vl < 0.5) { vx = 1; vz = 0; } else { vx /= vl; vz /= vl; }
    ox = nx + vx * want; oz = nz + vz * want;
  }
  return { x: ox, z: oz, yaw: Math.atan2(nx - ox, nz - oz) };
}
const brandPlots = {};

function setupLandmarks() {
  const used = new Set();
  for (const item of STOP_LIST) {
    const { name, tag, brand } = item;
    if (brand && STOP_PLACES[name]) {
      const sp = STOP_PLACES[name];
      const pl = brandPlots[name] || plotBesideRoad(sp.x, sp.z);
      const model = buildBrandStore(name, THREE, nightUniform);
      model.position.set(pl.x, 0, pl.z);
      model.rotation.y = pl.yaw;
      brandGroup.add(model);
      stops.push({ p: { n: name, t: tag.toLowerCase(), x: pl.x, z: pl.z }, tag, road: sp.road, brand: true });
      continue;
    }
    if (name === 'Indiranagar Metro' && extras && extras.station && extras.station.pts) {
      const pts = extras.station.pts;
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      stops.push({ p: { n: name, t: 'station', x: cx, z: cz }, tag, road: nearestRoadInfo(cx, cz).name || 'CMH Road', brand: false });
      continue;
    }
    const searchName = name === 'Indiranagar Metro' ? 'Indiranagar station' : name;
    const lmExact = LANDMARKS_DATA.find(l => l.name === searchName);
    let p = world.pois.find(q => q.n === searchName && !used.has(q));
    if (!p && lmExact) p = { n: name, t: lmExact.type, x: lmExact.x, z: lmExact.z };
    if (!p) continue;
    used.add(p);
    const rInfo = nearestRoadInfo(p.x, p.z);
    const road = lmExact ? lmExact.nearestRoad : rInfo.name;
    const yaw = lmExact ? lmExact.faceYaw : rInfo.yaw;
    const model = buildLandmark(searchName, THREE);
    model.position.set(p.x, 0, p.z);
    model.rotation.y = yaw;
    scene.add(model);
    stops.push({ p: { n: name, t: p.t, x: p.x, z: p.z }, tag, road, brand: false });
  }
}

// POI text sprites near player
const labelPool = [];
function makeLabel() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.4, 0.18), new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.7 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.31), new THREE.MeshBasicMaterial({ map: t }));
  face.position.z = 0.1;
  g.add(back, face);
  g.userData = { c, t, name: '' };
  scene.add(g);
  return g;
}
function setLabel(s, text) {
  if (s.userData.name === text) return;
  s.userData.name = text;
  const c = s.userData.c, x = c.getContext('2d');
  x.fillStyle = '#20242b'; x.fillRect(0, 0, 512, 96);
  x.strokeStyle = '#f5c542'; x.lineWidth = 5; x.strokeRect(5, 5, 502, 86);
  let fs = 40; x.font = '700 ' + fs + 'px "Bricolage Grotesque", sans-serif';
  while (x.measureText(text).width > 470 && fs > 18) { fs -= 2; x.font = '700 ' + fs + 'px "Bricolage Grotesque", sans-serif'; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#fff6d8';
  x.fillText(text, 256, 50);
  s.userData.t.needsUpdate = true;
}

// ---------- the auto ----------
const car = buildAuto();
scene.add(car);
const auto = { x: -133, z: -345, a: Math.PI, v: 0, steer: 0, goldAuto: false };

function syncCamera(dt, snap = false) {
  const back = 11.0 + Math.abs(auto.v) * 0.25;
  const sideSwing = snap ? 0 : auto.steer * (auto.v / 17) * 1.4;
  const tx = auto.x - Math.sin(auto.a) * back + Math.cos(auto.a) * sideSwing;
  const tz = auto.z - Math.cos(auto.a) * back - Math.sin(auto.a) * sideSwing;
  const bounceY = snap ? 0 : Math.sin(performance.now() * 0.018) * Math.abs(auto.v) * 0.008;
  const ty = 4.3 + Math.abs(auto.v) * 0.05 + bounceY;

  if (snap) {
    camera.position.set(tx, ty, tz);
    camRoll = 0;
  } else {
    const kc = Math.min(1, dt * 5.0);
    camera.position.x += (tx - camera.position.x) * kc;
    camera.position.z += (tz - camera.position.z) * kc;
    camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 3.8);
    camRoll += ((-auto.steer * auto.v * 0.0028) - camRoll) * Math.min(1, dt * 6);
  }

  function nearSolid(x, z) { const m = 1.4; return solid(x, z) || solid(x + m, z) || solid(x - m, z) || solid(x, z + m) || solid(x, z - m); }
  // keep the camera outside buildings: pull it toward the auto until the spot is free
  for (let k = 0; k < 14; k++) {
    if (!(nearSolid(camera.position.x, camera.position.z) || (parkedVehicles && parkedVehicles.solid(camera.position.x, camera.position.z)))) break;
    camera.position.x += (auto.x - camera.position.x) * 0.25;
    camera.position.z += (auto.z - camera.position.z) * 0.25;
  }
  camera.up.set(0, 1, 0);
  const lookAhead = 7.5;
  const sideLook = snap ? 0 : auto.steer * 1.1;
  camera.lookAt(
    auto.x + Math.sin(auto.a) * lookAhead - Math.cos(auto.a) * sideLook,
    1.2,
    auto.z + Math.cos(auto.a) * lookAhead + Math.sin(auto.a) * sideLook
  );
  if (!snap && Math.abs(camRoll) > 0.0001) {
    camera.rotateZ(camRoll);
  }
  camera.fov += ((54 + Math.abs(auto.v) * 0.72) - camera.fov) * (snap ? 1 : dt * 3);
  camera.updateProjectionMatrix();
}

function clampCam() {
  if (camRig && camRig.name && !/chase/i.test(camRig.name)) return;
  const bad = (x, z) => solid(x, z) || solid(x + 1.4, z) || solid(x - 1.4, z) || solid(x, z + 1.4) || solid(x, z - 1.4) || (parkedVehicles && parkedVehicles.solid(x, z)) || (traffic && traffic.solid(x, z)) || (crowd && crowd.solid(x, z));
  const q = camera.quaternion.clone();
  for (let k = 0; k < 24; k++) {
    if (!bad(camera.position.x, camera.position.z)) break;
    camera.position.x += (auto.x - camera.position.x) * 0.2;
    camera.position.z += (auto.z - camera.position.z) * 0.2;
  }
  camera.quaternion.copy(q);
}

// ---------- input ----------
const keys = {}; window.__keys = keys;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { honk(); if (life) life.onHorn(); }
  if (e.code === 'KeyN') state.hour = (state.hour + 3) % 24;
  if (e.code === 'KeyT') state.auto = !state.auto;
});
addEventListener('keyup', e => keys[e.code] = false);

const joy = { x: 0, y: 0, on: false };
const stick = $('stick');
let sid = null;
if (stick) {
  stick.addEventListener('pointerdown', e => { sid = e.pointerId; joy.on = true; stick.setPointerCapture(sid); upd(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) upd(e); });
  stick.addEventListener('pointerup', () => { joy.on = false; joy.x = joy.y = 0; stick.firstElementChild.style.transform = ''; });
}
function upd(e) {
  const r = stick.getBoundingClientRect();
  let x = (e.clientX - r.left - r.width / 2) / 45, y = (e.clientY - r.top - r.height / 2) / 45;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  joy.x = x; joy.y = y;
  stick.firstElementChild.style.transform = `translate(${x * 35}px,${y * 35}px)`;
}

// ---------- audio ----------
let AC, engine, eg, amb;
function startAudio() {
  if (AC) return;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  const master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination);
  engine = AC.createOscillator(); engine.type = 'sawtooth';
  eg = AC.createGain(); eg.gain.value = 0.0;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280;
  engine.connect(lp); lp.connect(eg); eg.connect(master); engine.start();

  const buf = AC.createBuffer(1, AC.sampleRate * 3, AC.sampleRate), d = buf.getChannelData(0);
  let l = 0;
  for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  amb = AC.createGain(); amb.gain.value = 0.10;
  const wl = AC.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 500;
  src.connect(wl); wl.connect(amb); amb.connect(master); src.start();
  const chirp = (f0, f1, dur, vol, when) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, when); o.frequency.exponentialRampToValueAtTime(f1, when + dur);
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(master); o.start(when); o.stop(when + dur + 0.05);
  };
  const bird = () => {
    if (!started) return;
    const t = AC.currentTime, night = nightUniform.value > 0.5;
    if (night) { for (let i = 0; i < 4; i++) chirp(4200, 4300, 0.06, 0.012, t + i * 0.09); return; }
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) chirp(base * (1 + Math.random() * 0.3), base * (1.3 + Math.random() * 0.5), 0.09 + Math.random() * 0.08, 0.02, t + i * (0.13 + Math.random() * 0.08));
  };
  const pom = () => {
    if (!started) return;
    const t = AC.currentTime;
    for (let k = 0; k < 2; k++) {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = 330;
      g.gain.setValueAtTime(0.0001, t + k * 0.28); g.gain.exponentialRampToValueAtTime(0.03, t + k * 0.28 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.28 + 0.2);
      o.connect(g); g.connect(master); o.start(t + k * 0.28); o.stop(t + k * 0.28 + 0.25);
    }
  };
  setInterval(() => { if (Math.random() < 0.7) bird(); }, 2200);
  setInterval(() => { if (Math.random() < 0.5) pom(); }, 9000);
}
let lastHonk = 0;
function honk() {
  if (!AC) return;
  const now = performance.now(); if (now - lastHonk < 600) return; lastHonk = now;
  // rubber bulb reed horn: two short nasal squeezes ("pom-pom"), reed-like saw through a nasal bandpass
  const squeeze = (t0, f0, len) => {
    const t = AC.currentTime + t0;
    const o = AC.createOscillator(), o2 = AC.createOscillator(), bp = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(f0 * 0.82, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.04); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + len);
    o2.frequency.setValueAtTime(f0 * 1.5 * 0.82, t); o2.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.04); o2.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + len);
    bp.type = 'bandpass'; bp.frequency.value = 1150; bp.Q.value = 2.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
    g.gain.setValueAtTime(0.16, t + len * 0.55); g.gain.exponentialRampToValueAtTime(0.001, t + len + 0.06);
    o.connect(bp); o2.connect(bp); bp.connect(g); g.connect(AC.destination);
    o.start(t); o2.start(t); o.stop(t + len + 0.08); o2.stop(t + len + 0.08);
  };
  squeeze(0, 395, 0.13); squeeze(0.2, 440, 0.17);
}

// ---------- minimap ----------
const mini = $('mini'), mx = mini.getContext('2d');
let miniBase;
function buildMini() {
  miniBase = document.createElement('canvas');
  miniBase.width = miniBase.height = 1800;
  const c = miniBase.getContext('2d');
  c.translate(900, 900); c.lineCap = 'round'; c.lineJoin = 'round';
  c.fillStyle = '#3a4048';
  for (const b of world.buildings) {
    c.beginPath();
    b.p.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.fill();
  }
  for (const k of [1, 2, 3, 4, 5]) {
    c.strokeStyle = k >= 4 ? '#8a939d' : '#59616b';
    c.lineWidth = [0, 3, 4, 6, 9, 11][k];
    for (const r of world.roads) if (r.k === k) {
      c.beginPath();
      r.p.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.stroke();
    }
  }
}
function drawMini() {
  const S = 360, R = 170;
  mx.clearRect(0, 0, S, S); mx.save();
  mx.beginPath(); mx.arc(S / 2, S / 2, S / 2 - 1, 0, 7); mx.clip();
  mx.fillStyle = '#14181c'; mx.fillRect(0, 0, S, S);
  mx.translate(S / 2, S / 2); mx.rotate(-auto.a + Math.PI);
  const sc = S / (R * 2); mx.scale(sc, sc);
  mx.drawImage(miniBase, -auto.x - 900, -auto.z - 900);
  for (const s of stops) {
    if (s.secret && !s.revealed) continue;
    mx.fillStyle = s.got ? '#d4af37' : (s.colorHex || '#38e07b');
    mx.beginPath();
    mx.arc(s.p.x - auto.x, s.p.z - auto.z, s.got ? 6 : 9, 0, 7);
    mx.fill();
  }
  if (destination && destination.active && destination.route && destination.route.length > 1) {
    mx.strokeStyle = '#38bdf8'; mx.lineWidth = 5; mx.beginPath();
    destination.route.forEach((pt, idx) => { idx ? mx.lineTo(pt.x - auto.x, pt.z - auto.z) : mx.moveTo(pt.x - auto.x, pt.z - auto.z); });
    mx.stroke();
  }
  mx.restore();
  mx.fillStyle = '#f6c30f';
  mx.beginPath(); mx.moveTo(S / 2, S / 2 - 12); mx.lineTo(S / 2 + 8, S / 2 + 9); mx.lineTo(S / 2 - 8, S / 2 + 9); mx.closePath(); mx.fill();
}

// ---------- loop ----------
let hazards = null, streetRef = null;
let last = performance.now(), cardT = 0, frame = 0, started = false, camRoll = 0;
function showCard(kind, name, text) {
  if ($('cardKind')) $('cardKind').textContent = kind;
  if ($('cardName')) $('cardName').textContent = name;
  if ($('cardText')) $('cardText').textContent = text;
  if ($('card')) $('card').classList.add('on');
  cardT = 4.5;
}

function inDivider(px, pz) {
    const mq = streetRef && streetRef.medianQuads;
    if (!mq) return false;
    for (let i = 0; i < mq.length; i++) {
      const q = mq[i];
      const ux = q[2] - q[0], uz = q[3] - q[1], vx = q[4] - q[0], vz = q[5] - q[1];
      const det = ux * vz - uz * vx; if (Math.abs(det) < 1e-6) continue;
      const rx = px - q[0], rz = pz - q[1];
      const sU = (rx * vz - rz * vx) / det, tV = (ux * rz - uz * rx) / det;
      if (sU > -0.35 && sU < 1.35 && tV > 0 && tV < 1) return true;
    }
    return false;
  }

function step(dt, now) {
  let thr = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  let str = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  if (joy.on) { thr = -joy.y; str = -joy.x; }
  const input = { thr, str };
  if (destination) destination.update(dt, input);
  thr = input.thr;
  str = input.str;

  const max = 17;
  auto.v += (thr * (thr > 0 ? 9.5 : 12.5) - auto.v * 0.35 * (thr === 0 ? 1.8 : 1)) * dt;
  auto.v = THREE.MathUtils.clamp(auto.v, -6, max);
  auto.steer += (str - auto.steer) * Math.min(1, dt * 8.5);
  const dA = auto.steer * dt * 1.85 * THREE.MathUtils.clamp(auto.v / 5, -1, 1);
  const hitA = (x, z, a) => {
    const s = Math.sin(a), c = Math.cos(a);
    for (const [lx, lz] of [[0.85, 1.8], [-0.85, 1.8], [0.85, -1.3], [-0.85, -1.3], [0, 1.95], [0, 0.3], [0, -1.3]]) {
      const px = x + c * lx + s * lz, pz = z - s * lx + c * lz;
      if (inDivider(px, pz) || solid(px, pz) || (life && life.solid(px, pz)) || (parkedVehicles && parkedVehicles.solid(px, pz)) || (traffic && traffic.solid(px, pz)) || (crowd && crowd.solid(px, pz))) return true;
    }
    return false;
  };
  const hit = (x, z) => hitA(x, z, auto.a);
  // turning never drives the body into something: try full, half, then no rotation (unless already inside)
  if (dA !== 0) {
    if (hit(auto.x, auto.z) || !hitA(auto.x, auto.z, auto.a + dA)) auto.a += dA;
    else if (!hitA(auto.x, auto.z, auto.a + dA * 0.5)) auto.a += dA * 0.5;
  }
  const dx = Math.sin(auto.a) * auto.v * dt, dz = Math.cos(auto.a) * auto.v * dt;
  let blocked = false;
  if (hit(auto.x, auto.z)) {
    blocked = true;
    // inside something: ease out to the nearest free spot (small steps, no big teleport)
    let done = false;
    for (let r = 0.25; r <= 6 && !done; r += 0.25) {
      for (let k = 0; k < 16; k++) {
        const ang = k * Math.PI / 8, nx = auto.x + Math.sin(ang) * r, nz = auto.z + Math.cos(ang) * r;
        if (!hit(nx, nz)) { auto.x = nx; auto.z = nz; auto.v *= 0.3; done = true; break; }
      }
    }
    if (!done) auto.unstickNow = true;
  } else if (!hit(auto.x + dx, auto.z + dz)) { auto.x += dx; auto.z += dz; }
  else {
    blocked = true;
    if (stopsGame) stopsGame.state.cleanDriveTimer = 0;
    let moved = false;
    for (const f of [1, 0.5, 0.25]) {
      if (!hit(auto.x + dx * f, auto.z)) { auto.x += dx * f; auto.v *= 0.8; moved = true; break; }
      if (!hit(auto.x, auto.z + dz * f)) { auto.z += dz * f; auto.v *= 0.8; moved = true; break; }
    }
    if (!moved) auto.v = thr > 0 ? Math.min(auto.v, 0) * 0.2 : Math.max(auto.v, 0) * 0.2;
  }
  // unstick fallback: throttle held but not moving against a collider -> back off, then snap to the road lane
  if (blocked && Math.abs(thr) > 0.1 && Math.abs(auto.v) < 1.2) auto.stuckT = (auto.stuckT || 0) + dt;
  else auto.stuckT = Math.max(0, (auto.stuckT || 0) - dt * 2);
  if (blocked && Math.abs(thr) > 0.1) auto.blockT = (auto.blockT || 0) + dt; else auto.blockT = Math.max(0, (auto.blockT || 0) - dt * 3);
  if (auto.stuckT > 0.6 || auto.blockT > 0.9 || auto.unstickNow) {
    auto.stuckT = 0; auto.blockT = 0; auto.unstickNow = false;
    let freed = false;
    const sgn = thr >= 0 ? -1 : 1;
    for (const d of [0.8, 1.6, 2.4, 3.5]) {
      const nx = auto.x + Math.sin(auto.a) * d * sgn, nz = auto.z + Math.cos(auto.a) * d * sgn;
      if (!hit(nx, nz)) { auto.x = nx; auto.z = nz; auto.v = 0; freed = true; break; }
    }
    const pr = window.__placeOnRoad ? window.__placeOnRoad(auto.x, auto.z) : null;
    if (pr && Math.hypot(pr.x - auto.x, pr.z - auto.z) < 14 && !hit(pr.x, pr.z)) {
      // nudge to the road lane and line up with the road so throttle drives along it, never back into the wall
      const d1 = Math.abs(Math.atan2(Math.sin(pr.a - auto.a), Math.cos(pr.a - auto.a)));
      auto.x = pr.x; auto.z = pr.z; auto.a = d1 <= Math.PI / 2 ? pr.a : pr.a + Math.PI; auto.v = 0;
    }
  }

  auto.x = THREE.MathUtils.clamp(auto.x, MAP.x0 + 10, MAP.x1 - 10);
  auto.z = THREE.MathUtils.clamp(auto.z, MAP.z0 + 10, MAP.z1 - 10);

  if (stopsGame) auto.goldAuto = stopsGame.state.goldAuto;
  car.position.set(auto.x, 0, auto.z);
  car.rotation.y = auto.a;
  updateAuto(car, auto, dt);
  if (hazards) { const sh = hazards.update(dt, auto); if (camRig) camRig.update(dt, Boolean(state.snap)); else syncCamera(dt, Boolean(state.snap)); clampCam(); camera.position.y += sh; }
  else { if (camRig) camRig.update(dt, Boolean(state.snap)); else syncCamera(dt, Boolean(state.snap)); clampCam(); }
  if (trees) trees.update(dt);
  if (parkedVehicles && parkedVehicles.update) parkedVehicles.update(dt);
  if (traffic) traffic.update(dt, state.hour);
  if (crowd) crowd.update(dt, state.hour);
  if (bldgHQ && bldgHQ.update) bldgHQ.update(dt);
  if (shadowTuner && shadowTuner.update) shadowTuner.update();
  updateBrandStores(brandGroup, nightUniform);
  if (rimLight) rimLight.update(dt, nightUniform.value);

  if (state.auto) state.hour = (state.hour + dt / 14) % 24;
  lighting.applyTime(state.hour, dt, car.position);
  post.setNight(nightUniform.value);

  car.userData.hl.intensity = 6 + nightUniform.value * 55;
  if (lampHead) lampHead.material.color.setHex(0xffc878).multiplyScalar(0.35 + nightUniform.value * 1.8);
  if (lampLights) lampLights.update(car.position, nightUniform.value, dt);
  if (stopsGame) stopsGame.update(dt, now);
  if (npcs) npcs.update(dt, performance.now(), state.hour);
  if (life) life.update(dt, auto, state.hour);
  if (icons) icons.update(dt, state.hour);

  if (eg) {
    const spd = Math.abs(auto.v);
    const gearRatio = spd < 5.5 ? spd / 5.5 : (spd < 11.5 ? (spd - 4.0) / 7.5 : (spd - 9.0) / 8.0);
    eg.gain.value = spd < 0.35 ? 0 : 0.02 + (spd / max) * 0.05;
    engine.frequency.value = 48 + gearRatio * 62 + Math.sin(performance.now() * 0.04) * 2.5;
    amb.gain.value = 0.10;
  }

  frame++;
  if (frame % 8 === 0) {
    let best = 1e9, name = '';
    for (const s of roadSegs) {
      if (!s[4]) continue;
      const mxp = (s[0] + s[2]) / 2 - auto.x, mzp = (s[1] + s[3]) / 2 - auto.z;
      if (Math.abs(mxp) > 60 || Math.abs(mzp) > 60) continue;
      const dxs = s[2] - s[0], dzs = s[3] - s[1], L2 = dxs * dxs + dzs * dzs || 1;
      const t = THREE.MathUtils.clamp(((auto.x - s[0]) * dxs + (auto.z - s[1]) * dzs) / L2, 0, 1);
      const d = Math.hypot(auto.x - s[0] - dxs * t, auto.z - s[1] - dzs * t);
      if (d < best) { best = d; name = s[4]; }
    }
    if (name && best < 14 && $('streetName') && $('streetName').textContent !== name) $('streetName').textContent = name;
  }

  if (false && frame % 12 === 0) {
    const near = world.pois
      .filter(p => Math.abs(p.x - auto.x) < 48 && Math.abs(p.z - auto.z) < 48)
      .sort((a, b) => Math.hypot(a.x - auto.x, a.z - auto.z) - Math.hypot(b.x - auto.x, b.z - auto.z))
      .slice(0, 10);
    while (labelPool.length < 10) labelPool.push(makeLabel());
    labelPool.forEach((l, i) => {
      const p = near[i];
      l.visible = !!p;
      if (p) { setLabel(l, p.n); const ri = nearestRoadInfo(p.x, p.z); l.rotation.y = ri.yaw; l.position.set(p.x + Math.sin(ri.yaw) * 1.2, 4.6 + (i % 2) * 1.6, p.z + Math.cos(ri.yaw) * 1.2); }
    });
  }

  if (cardT > 0) { cardT -= dt; if (cardT <= 0 && $('card')) $('card').classList.remove('on'); }
  drawMini();
  if ($('clock')) $('clock').textContent = String(Math.floor(state.hour)).padStart(2, '0') + ':' + String(Math.floor((state.hour % 1) * 60)).padStart(2, '0');
}

function loop(now) {
  const dt = Math.min(window.__dtCap || 0.05, (now - last) / 1000);
  last = now;
  try { if (started && !window.__paused) step(dt, now); } catch (e) { if (!window.__stepErr) { window.__stepErr = String(e && e.stack || e); console.error(e); } }
  try { if (!window.__noRender) post.render(dt); } catch (e) { if (!window.__renderErr) { window.__renderErr = String(e); console.error(e); } }
  requestAnimationFrame(loop);
}

async function boot() {
  setLoad(8, 'Fetching the map');
  world = await (await fetch(import.meta.env.BASE_URL + 'data/world.json')).json();
  world.roads.push({ k: 3, n: 'Old Airport Road', p: LEELA_ACCESS_ROAD });
  (function infill() {
    const WM = { 5: 14.5, 4: 10.5, 3: 8.2, 2: 7, 1: 5.5 };
    const segs = [];
    for (const r of world.roads) {
      if (!r.p || r.p.length < 2) continue;
      const hw = ((r.n || '').includes('100 Feet') ? 10 : (WM[r.k] || 7)) / 2 + 3.2;
      for (let i = 0; i < r.p.length - 1; i++) segs.push([r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], hw]);
    }
    const G = 24, grid = new Map();
    const put = (key, v) => { let a = grid.get(key); if (!a) grid.set(key, a = []); a.push(v); };
    const bbs = [];
    for (const b of world.buildings) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const q of b.p) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
      const bb = [x0 - 0.8, z0 - 0.8, x1 + 0.8, z1 + 0.8, b.p]; bbs.push(bb);
      for (let gx = Math.floor(bb[0] / G); gx <= Math.floor(bb[2] / G); gx++) for (let gz = Math.floor(bb[1] / G); gz <= Math.floor(bb[3] / G); gz++) put(gx + ',' + gz, bb);
    }
    const sg = new Map();
    for (const s of segs) {
      const mnx = Math.min(s[0], s[2]) - s[4], mxx = Math.max(s[0], s[2]) + s[4], mnz = Math.min(s[1], s[3]) - s[4], mxz = Math.max(s[1], s[3]) + s[4];
      for (let gx = Math.floor(mnx / G); gx <= Math.floor(mxx / G); gx++) for (let gz = Math.floor(mnz / G); gz <= Math.floor(mxz / G); gz++) { const k = gx + ',' + gz; let a = sg.get(k); if (!a) sg.set(k, a = []); a.push(s); }
    }
    const nearRoad = (x, z) => {
      const a = sg.get(Math.floor(x / G) + ',' + Math.floor(z / G)); if (!a) return false;
      for (const s of a) {
        const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2));
        if (Math.hypot(x - (s[0] + dx * t), z - (s[1] + dz * t)) < s[4]) return true;
      }
      return false;
    };
    const inBld = (x0, z0, x1, z1) => {
      for (let gx = Math.floor(x0 / G); gx <= Math.floor(x1 / G); gx++) for (let gz = Math.floor(z0 / G); gz <= Math.floor(z1 / G); gz++) {
        const a = grid.get(gx + ',' + gz); if (!a) continue;
        for (const bb of a) {
          if (bb[2] < x0 || bb[0] > x1 || bb[3] < z0 || bb[1] > z1) continue;
          const poly = bb[4];
          for (const q of poly) if (q[0] > x0 - 0.8 && q[0] < x1 + 0.8 && q[1] > z0 - 0.8 && q[1] < z1 + 0.8) return true;
          for (const [px, pz] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, (z0 + z1) / 2]]) {
            let inside = false;
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
              const a1 = poly[i], b1 = poly[j];
              if ((a1[1] > pz) !== (b1[1] > pz) && px < (b1[0] - a1[0]) * (pz - a1[1]) / (b1[1] - a1[1]) + a1[0]) inside = !inside;
            }
            if (inside) return true;
          }
        }
      }
      return false;
    };
    let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const add = [];
    for (let x = MAP.x0; x < MAP.x1; x += 12) for (let z = MAP.z0; z < MAP.z1; z += 14) {
      const w = 11 * (0.9 + rnd() * 0.2), d = 13 * (0.9 + rnd() * 0.2);
      const x1 = x + w, z1 = z + d;
      if (nearRoad(x, z) || nearRoad(x1, z) || nearRoad(x, z1) || nearRoad(x1, z1) || nearRoad(x + w / 2, z + d / 2)) continue;
      if (inBld(x, z, x1, z1)) continue;
      add.push({ p: [[x, z], [x1, z], [x1, z1], [x, z1], [x, z]], h: 6.8 + Math.floor(rnd() * 4) * 3.3 });
    }
    world.buildings.push(...add);
    console.log('infill buildings', add.length);
  })();
extras = null;
try {
  extras = await (await fetch(import.meta.env.BASE_URL + 'data/extras.json')).json();
} catch (e) {
  console.warn('extras.json not found, continuing with base world:', e);
}


  setLoad(30, 'Raising Indiranagar blocks');
  await new Promise(r => setTimeout(r, 20));
  const clearing = [];
  for (const it of STOP_LIST) {
    if (!it.brand || !STOP_PLACES[it.name]) continue;
    const pl = plotBesideRoad(STOP_PLACES[it.name].x, STOP_PLACES[it.name].z);
    brandPlots[it.name] = pl;
    clearing.push({ x: pl.x, z: pl.z }, { x: STOP_PLACES[it.name].x, z: STOP_PLACES[it.name].z });
    if (it.name === 'The Leela Palace') for (let k = -2; k <= 2; k++) clearing.push({ x: pl.x + k * 12, z: pl.z + k * 8 });
  }
  const city = buildCity(world, scene, nightUniform, LANDMARKS_DATA.concat(clearing));
  solid = city.solid;

  setLoad(55, 'Laying 100 Feet Road, metro & trees');
  await new Promise(r => setTimeout(r, 20));
  const street = buildStreet(world, scene, nightUniform, solid, extras);
  streetRef = street;
  roadSegs = street.roadSegs;
  lampHead = street.lampHead;
  lampLights = createLampLights(scene, street.lampSpots);

  setLoad(82, 'Building Toit, MTR, Metro & gamified stops');
  await new Promise(r => setTimeout(r, 20));
  setupLandmarks();
  stopsGame = createStopsGame({
    THREE,
    scene,
    camera,
    renderer,
    world,
    stops,
    getAuto: () => ({ x: auto.x, z: auto.z, a: auto.a, speed: auto.v }),
    ui: { $, showCard }
  });
  icons = buildIcons(world, scene, nightUniform, solid);
  npcs = createNPCs({
    THREE,
    scene,
    camera,
    world,
    vendorSpots: street.vendorSpots,
    roadSegs: street.roadSegs,
    getAuto: () => ({ x: auto.x, z: auto.z, a: auto.a, speed: auto.v }),
    playerCar: car,
    stops,
    ui: { $, showCard: () => {} },
    addXP: (amt) => {
      if (!stopsGame) return;
      stopsGame.state.xp += amt;
      const el = $('shud-xp');
      if (el) el.textContent = stopsGame.state.xp;
    },
    addCoins: (amt) => {
      if (!stopsGame) return;
      stopsGame.state.coins += amt;
      const el = $('shud-coins');
      if (el) el.textContent = stopsGame.state.coins;
    }
  });
  
  life = createStreetLife({
    THREE,
    scene,
    camera,
    world,
    roadSegs: street.roadSegs,
    speedBreakers: street.speedBreakers,
    vendorSpots: street.vendorSpots,
    solid,
    auto,
    npcsRef: npcs,
    ui: {
      say: () => {},
      fare: (txt) => { if ($('streetName')) $('streetName').textContent = txt; },
      toast: (txt) => console.log('[Indiranagar]', txt)
    }
  });
  
  trees = createRainTrees({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, nightUniform, bridgeVolumes: street.bridgeVolumes, seed: 42 });
  camRig = createCameraRig({ THREE, camera, auto, carGroup: car, scene });
  { const dp = document.getElementById('dest-panel'); if (dp) dp.style.display = 'none'; }
  { const st = document.createElement('style'); st.textContent = '.shud-pill, #combo-wrap, #combo-bar, #shud-combo { display: none !important; }'; document.head.appendChild(st); }

  rimLight = createRimLight({ THREE, scene, camera, targets: [car, trees.group] });

  try { ao = createAmbientOcclusion({ THREE, renderer, scene, camera, composer: post.composer, width: innerWidth, height: innerHeight }); } catch (e) { console.warn('AO off', e); }
  shadowTuner = tuneShadows({ THREE, renderer, sun: lighting.sun, getAuto: () => auto });
  traffic = createTraffic({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, nightUniform, getAuto: () => ({ x: auto.x, z: auto.z, a: auto.a }), count: 150 });
  parkedVehicles = createParkedVehicles({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, nightUniform, seed: 42, getAuto: () => ({ x: auto.x, z: auto.z }) });
  crowd = createCrowd({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, getAuto: () => ({ x: auto.x, z: auto.z }), nightUniform, count: 120 });
  bldgHQ = upgradeBuildingFacades({ THREE, landmarks: LANDMARKS_DATA.concat(clearing), scene, world, roadSegs: street.roadSegs, solidFn: solid, nightUniform, getAuto: () => ({ x: auto.x, z: auto.z }) });
  hazards = createHazards({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid });
  buildMini();

  function placeOnRoad(x, z) {
    const cands = [];
    for (const s of street.roadSegs) {
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t;
      cands.push({ d: Math.hypot(x - px, z - pz), x1, z1, dx, dz, L: Math.sqrt(L2), t });
    }
    cands.sort((a, b) => a.d - b.d);
    for (const c of cands.slice(0, 12)) {
      const ux = c.dx / c.L, uz = c.dz / c.L, ang = Math.atan2(c.dx, c.dz);
      const nx = uz, nz = -ux;
      for (const along of [0, 6, -6, 12, -12, 20, -20, 30, -30]) {
        const base = c.t * c.L + along;
        if (base < 1 || base > c.L - 1) continue;
        for (const off of [2.2, -2.2, 3.4, -3.4, 0]) {
          const cx = c.x1 + ux * base + nx * off, cz = c.z1 + uz * base + nz * off;
          if (!hitAt(cx, cz)) return { x: cx, z: cz, a: ang };
        }
      }
    }
    return { x, z, a: Math.PI };
  }
  function hitAt(px, pz) {
    return !!(solid(px, pz) || (parkedVehicles && parkedVehicles.solid(px, pz)) || (traffic && traffic.solid(px, pz)));
  }
  function spawnAt(x, z, aPref) {
    const r = placeOnRoad(x, z);
    let a = r.a;
    if (aPref !== undefined) { const d = Math.abs(Math.atan2(Math.sin(a - aPref), Math.cos(a - aPref))); if (d > Math.PI / 2) a += Math.PI; }
    window.__noCardUntil = performance.now() + 3500;
    { const ce = document.getElementById('stop-card-v2'); if (ce) ce.classList.remove('on'); }
    auto.x = r.x; auto.z = r.z; auto.a = a; auto.v = 0; auto.steer = 0;
    car.position.set(auto.x, 0, auto.z); car.rotation.set(0, auto.a, 0);
    updateAuto(car, auto, 0.016);
    if (camRig) camRig.update(0.016, true); else syncCamera(0.016, true);
    clampCam();
  }
  window.__step = step; window.__inDivider = inDivider; window.__spawnAt = spawnAt; window.__placeOnRoad = placeOnRoad;
  spawnAt(stops[0].p.x, stops[0].p.z, Math.PI);
  auto.v = 0;
  auto.steer = 0;
  car.position.set(auto.x, 0, auto.z);
  car.rotation.set(0, auto.a, 0);
  updateAuto(car, auto, 0.016);
  if (camRig) camRig.update(0.016, true); else syncCamera(0.016, true);

  applyTime(state.hour);
  post.setNight(nightUniform.value);
  setLoad(100, 'Ready');
  $('loader').classList.add('off');
  $('start').classList.add('on');
  requestAnimationFrame(loop);

  (function togglesPanel() {
    const items = [
      ['Traffic', () => traffic && traffic.group], ['Pedestrians', () => crowd && crowd.group], ['Parked vehicles', () => parkedVehicles && parkedVehicles.group],
      ['Trees', () => trees && trees.group], ['Potholes and puddles', () => hazards && hazards.group]
    ];
    const box = document.createElement('div'); box.id = 'toggles';
    box.innerHTML = '<button id="tgbtn">Settings</button><div id="tgpanel"></div>';
    document.body.appendChild(box);
    const panel = box.querySelector('#tgpanel');
    for (const [name, get] of items) {
      const l = document.createElement('label'); const c = document.createElement('input'); c.type = 'checkbox'; c.checked = true;
      c.addEventListener('change', () => { const o = get(); if (o) o.visible = c.checked; });
      l.append(c, ' ' + name); panel.appendChild(l);
    }
    const nl = document.createElement('label'); const nc = document.createElement('input'); nc.type = 'checkbox';
    nc.addEventListener('change', () => { state.hour = nc.checked ? 22 : 15; applyTime(state.hour); }); nl.append(nc, ' Night'); panel.appendChild(nl);
    box.querySelector('#tgbtn').addEventListener('click', () => box.classList.toggle('open'));
  })();
  const pick = document.getElementById('startpick');
  if (pick) {
    pick.innerHTML = stops.map((s, i) => `<option value="${i}">${s.p.n}</option>`).join('');
    pick.addEventListener('change', () => { const s = stops[+pick.value]; spawnAt(s.p.x, s.p.z); });
  }
  const go = () => {
    $('start').classList.remove('on');
    $('hud').classList.add('on');
    started = true;
    startAudio();
  };
  $('go').addEventListener('click', go);
  const chg = document.createElement('button'); chg.id = 'chgloc'; chg.textContent = 'Change location';
  chg.style.cssText = 'position:fixed;left:20px;top:64px;z-index:60;font:600 13px Bricolage Grotesque,sans-serif;padding:8px 14px;border-radius:20px;border:1px solid #ffffff55;background:#10151cdd;color:#fff;cursor:pointer';
  chg.addEventListener('click', () => { const sp = $('startpick'); $('start').classList.add('on'); if (sp) sp.focus(); });
  document.body.appendChild(chg);
  window.__game = { get crowd() { return crowd; }, get trees() { return trees; }, roadSegs: () => street.roadSegs, get parked() { return parkedVehicles; }, get traffic() { return traffic; }, get hazards() { return hazards; }, get camRig() { return camRig; }, get destination() { return destination; }, scene, npcs, auto, state, stops, stopsGame, life, go, solid, world, applyTime, camera, get started() { return started; }, get engGain() { return eg ? eg.gain.value : null; } };
}
boot();
