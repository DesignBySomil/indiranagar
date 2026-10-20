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
import { createDestinationMode } from './destination.js';
import { createRimLight } from './rim.js';
import { buildIcons } from './icons.js';
import { createTraffic, createParkedVehicles } from './vehicles.js';
import { createCrowd } from './people.js';
import { upgradeBuildingFacades } from './buildingsHQ.js';
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(16, 3, 1);
  s.userData = { c, t, name: '' };
  scene.add(s);
  return s;
}
function setLabel(s, text) {
  if (s.userData.name === text) return;
  s.userData.name = text;
  const c = s.userData.c, x = c.getContext('2d');
  x.clearRect(0, 0, 512, 96);
  x.font = '600 38px "Bricolage Grotesque", sans-serif';
  x.textAlign = 'center';
  x.lineWidth = 8;
  x.strokeStyle = 'rgba(10,14,18,.85)';
  x.strokeText(text, 256, 56);
  x.fillStyle = '#f1f4f8';
  x.fillText(text, 256, 56);
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
  const ty = 6.0 + Math.abs(auto.v) * 0.06 + bounceY;

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

// ---------- input ----------
const keys = {};
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
  amb = AC.createGain(); amb.gain.value = 0.35;
  src.connect(amb); amb.connect(master); src.start();
}
function honk() {
  if (!AC) return;
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain();
  o.type = 'square'; o.frequency.value = 420;
  o2.type = 'square'; o2.frequency.value = 530;
  g.gain.setValueAtTime(0.14, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.45);
  o.connect(g); o2.connect(g); g.connect(AC.destination);
  o.start(); o2.start(); o.stop(AC.currentTime + 0.5); o2.stop(AC.currentTime + 0.5);
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
let last = performance.now(), cardT = 0, frame = 0, started = false, camRoll = 0;
function showCard(kind, name, text) {
  if ($('cardKind')) $('cardKind').textContent = kind;
  if ($('cardName')) $('cardName').textContent = name;
  if ($('cardText')) $('cardText').textContent = text;
  if ($('card')) $('card').classList.add('on');
  cardT = 4.5;
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
  auto.a += auto.steer * dt * 1.85 * THREE.MathUtils.clamp(auto.v / 5, -1, 1);

  const dx = Math.sin(auto.a) * auto.v * dt, dz = Math.cos(auto.a) * auto.v * dt;
  const hit = (x, z) => {
    const s = Math.sin(auto.a), c = Math.cos(auto.a);
    for (const [lx, lz] of [[0.9, 1.9], [-0.9, 1.9], [0.9, -1.4], [-0.9, -1.4], [0, 2]]) {
      const px = x + c * lx + s * lz, pz = z - s * lx + c * lz;
      if (solid(px, pz) || (life && life.solid(px, pz))) return true;
    }
    return false;
  };
  if (!hit(auto.x + dx, auto.z + dz)) { auto.x += dx; auto.z += dz; }
  else {
    if (stopsGame) stopsGame.state.cleanDriveTimer = 0;
    if (!hit(auto.x + dx, auto.z)) { auto.x += dx; auto.v *= 0.8; }
    else if (!hit(auto.x, auto.z + dz)) { auto.z += dz; auto.v *= 0.8; }
    else auto.v *= -0.25;
  }

  auto.x = THREE.MathUtils.clamp(auto.x, -880, 880);
  auto.z = THREE.MathUtils.clamp(auto.z, -880, 880);

  if (stopsGame) auto.goldAuto = stopsGame.state.goldAuto;
  car.position.set(auto.x, 0, auto.z);
  car.rotation.y = auto.a;
  updateAuto(car, auto, dt);
  if (camRig) camRig.update(dt, Boolean(state.snap)); else syncCamera(dt, Boolean(state.snap));
  if (trees) trees.update(dt);
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
    eg.gain.value = 0.025 + (spd / max) * 0.055;
    engine.frequency.value = 48 + gearRatio * 62 + Math.sin(performance.now() * 0.04) * 2.5;
    amb.gain.value = 0.25 + nightUniform.value * 0.1;
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

  if (frame % 12 === 0) {
    const near = world.pois
      .filter(p => Math.abs(p.x - auto.x) < 48 && Math.abs(p.z - auto.z) < 48)
      .sort((a, b) => Math.hypot(a.x - auto.x, a.z - auto.z) - Math.hypot(b.x - auto.x, b.z - auto.z))
      .slice(0, 10);
    while (labelPool.length < 10) labelPool.push(makeLabel());
    labelPool.forEach((l, i) => {
      const p = near[i];
      l.visible = !!p;
      if (p) { setLabel(l, p.n); l.position.set(p.x, 11.5 + (i % 3) * 3.0, p.z); }
    });
  }

  if (cardT > 0) { cardT -= dt; if (cardT <= 0 && $('card')) $('card').classList.remove('on'); }
  drawMini();
  if ($('clock')) $('clock').textContent = String(Math.floor(state.hour)).padStart(2, '0') + ':' + String(Math.floor((state.hour % 1) * 60)).padStart(2, '0');
}

function loop(now) {
  const dt = Math.min(window.__dtCap || 0.05, (now - last) / 1000);
  last = now;
  if (started) step(dt, now);
  post.render(dt);
  requestAnimationFrame(loop);
}

async function boot() {
  setLoad(8, 'Fetching the map');
  world = await (await fetch(import.meta.env.BASE_URL + 'data/world.json')).json();
  world.roads.push({ k: 3, n: 'Old Airport Road', p: LEELA_ACCESS_ROAD });
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
    ui: { $, showCard },
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
      say: (txt) => showCard('Auto Dialogue', 'Driver / Passenger', txt),
      fare: (txt) => { if ($('streetName')) $('streetName').textContent = txt; },
      toast: (txt) => console.log('[Indiranagar]', txt)
    }
  });
  
  trees = createRainTrees({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, nightUniform, bridgeVolumes: street.bridgeVolumes, seed: 42 });
  camRig = createCameraRig({ THREE, camera, auto, carGroup: car, scene });
  destination = createDestinationMode({
    THREE, scene, world, roadSegs: street.roadSegs, stops, auto, solidFn: solid,
    getTraffic: () => (npcs && npcs.npcs ? npcs.npcs.map(n => ({ x: n.x, z: n.z, radius: 0.9 })) : []),
    onHorn: () => { honk(); if (life) life.onHorn(); },
    ui: { $, showCard, toast: (t) => console.log('[Auto]', t) },
    onArrive: (stop, fare) => {
      if (stopsGame) {
        stopsGame.state.coins += fare; stopsGame.state.xp += 80;
        const cEl = $('shud-coins'), xEl = $('shud-xp');
        if (cEl) cEl.textContent = stopsGame.state.coins;
        if (xEl) xEl.textContent = stopsGame.state.xp;
      }
    }
  });
  rimLight = createRimLight({ THREE, scene, camera, targets: [car, trees.group] });

  try { ao = createAmbientOcclusion({ THREE, renderer, scene, camera, composer: post.composer, width: innerWidth, height: innerHeight }); } catch (e) { console.warn('AO off', e); }
  shadowTuner = tuneShadows({ THREE, renderer, sun: lighting.sun, getAuto: () => auto });
  traffic = createTraffic({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, nightUniform, getAuto: () => ({ x: auto.x, z: auto.z, a: auto.a }), count: 90 });
  parkedVehicles = createParkedVehicles({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, nightUniform, seed: 42 });
  crowd = createCrowd({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, getAuto: () => ({ x: auto.x, z: auto.z }), nightUniform, count: 120 });
  bldgHQ = upgradeBuildingFacades({ THREE, scene, world, roadSegs: street.roadSegs, solidFn: solid, nightUniform, getAuto: () => ({ x: auto.x, z: auto.z }) });
  buildMini();

  auto.x = stops[0].p.x + 15.5;
  auto.z = stops[0].p.z + 32;
  auto.a = Math.PI;
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

  const go = () => {
    $('start').classList.remove('on');
    $('hud').classList.add('on');
    started = true;
    startAudio();
  };
  $('go').addEventListener('click', go);
  window.__game = { get camRig() { return camRig; }, get destination() { return destination; }, scene, npcs, auto, state, stops, stopsGame, life, go, solid, world, applyTime, camera, get started() { return started; } };
}
boot();
