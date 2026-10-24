import { applyAlleyFix, applyBldgFix } from './alleyfix.js';
// src/main.js
import * as THREE from 'three';
import { setupLighting } from './lighting.js';
import { createPost } from './post.js';
import { createLampLights, attachHeadlightsToNearest } from './lamps.js';
import { buildAuto, updateAuto } from './auto.js';
import { buildLandmark, nightUniform } from './landmarks.js';
import { buildCity } from './city.js';
import { buildStreet, prepareRoadCorridors, getRoadWidth } from './street.js';
import { createStopsGame } from './stops.js';
import { createStreetLife } from './life.js';
import { createMapEdge } from './edge.js';
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

// push a brand/landmark plot off the doubled carriageway + footpath and face it at the nearest road
function plotBesideRoad(x, z) {
  let best = 1e9, nx = x, nz = z, bestW = 14.0;
  for (const r of world.roads) {
    if (r.k < 2) continue;
    const rw = getRoadWidth(r);
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; nx = px; nz = pz; bestW = rw; }
    }
  }
  const want = Math.max(17.5, bestW * 0.5 + 8.5);
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
    const pl = plotBesideRoad(p.x, p.z);
    const lx = pl.x, lz = pl.z;
    if (lmExact) { lmExact.x = lx; lmExact.z = lz; }
    const rInfo = nearestRoadInfo(lx, lz);
    const road = lmExact ? lmExact.nearestRoad : rInfo.name;
    const yaw = lmExact ? lmExact.faceYaw : rInfo.yaw;
    const model = buildLandmark(searchName, THREE);
    model.position.set(lx, 0, lz);
    model.rotation.y = yaw;
    scene.add(model);
    stops.push({ p: { n: name, t: p.t, x: lx, z: lz }, tag, road, brand: false });
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

  function nearSolid(x, z, m = 1.4) { return solid(x, z) || solid(x + m, z) || solid(x - m, z) || solid(x, z + m) || solid(x, z - m); }
  function losBlocked(cx, cz) { if (solid(auto.x, auto.z)) return false; for (let t = 0.15; t < 0.9; t += 0.15) if (solid(cx + (auto.x - cx) * t, cz + (auto.z - cz) * t)) return true; return false; }
  // keep the camera outside buildings: pull it toward the auto until the spot is free
  for (let k = 0; k < 14; k++) {
    if (!(nearSolid(camera.position.x, camera.position.z, 0.8) || losBlocked(camera.position.x, camera.position.z) || (parkedVehicles && parkedVehicles.solid(camera.position.x, camera.position.z)))) break;
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

let camBridgeVols = [];
let camLiftY = 2.7;
const _clM = new THREE.Matrix4(), _clQ0 = new THREE.Quaternion(), _clQ1 = new THREE.Quaternion(), _clF = new THREE.Vector3(), _clT = new THREE.Vector3();
function clampCam() {
  if (camRig && camRig.name && !/chase/i.test(camRig.name)) return;
  const m = 0.8; const los = (x, z) => { if (solid(auto.x, auto.z)) return false; for (let t = 0.15; t < 0.9; t += 0.15) if (solid(x + (auto.x - x) * t, z + (auto.z - z) * t)) return true; return false; };
  const dressOcc = (world && world.camDressOcc) || [];
  const dressBad = (x, z) => {
    const y = camera.position.y;
    if (y < 2.3 || y > 4.6) return false;
    for (let i = 0; i < dressOcc.length; i++) {
      const o = dressOcc[i];
      if (y < o.y0 || y > o.y1) continue;
      const dx = x - o.x, dz = z - o.z;
      if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
      const lx = dx * o.sy + dz * o.cy, lz = dx * o.cy - dz * o.sy;
      if (Math.abs(lx) <= o.hl + 0.5 && Math.abs(lz) <= o.ht + 0.5) return true;
    }
    return false;
  };
  const bad = (x, z) => solid(x, z) || solid(x + m, z) || solid(x - m, z) || solid(x, z + m) || solid(x, z - m) || los(x, z) || dressBad(x, z) || (parkedVehicles && parkedVehicles.solid(x, z)) || (traffic && traffic.solid(x, z)) || (crowd && crowd.solid(x, z));
  const q = camera.quaternion.clone();
  for (let k = 0; k < 24; k++) {
    if (!bad(camera.position.x, camera.position.z)) break;
    camera.position.x += (auto.x - camera.position.x) * 0.2;
    camera.position.z += (auto.z - camera.position.z) * 0.2;
  }
  camera.quaternion.copy(q);
  // Narrow-lane usability: when the pull-in above had to crush the camera onto the car, the roof
  // fills the frame and the road ahead is unreadable. Rise (smoothed) so the view clears the roof,
  // re-aiming at the same view-axis point so heading/drag-look and roll are preserved. The x/z spot
  // is unchanged from the pull-in result, so the camera still never enters a building footprint;
  // height is capped below any overhead deck's clearance.
  const dCam = Math.hypot(camera.position.x - auto.x, camera.position.z - auto.z);
  let yT = camera.position.y;
  if (dCam < 4.2) {
    let cap = 8.0;
    for (let i = 0; i < camBridgeVols.length; i++) {
      const b = camBridgeVols[i];
      if (Math.hypot(camera.position.x - b.x, camera.position.z - b.z) >= (b.r || 18)) continue;
      let under = true;
      if (b.poly) { // exact: station concourse is the extruded station polygon at 7.4m
        under = false; const P = b.poly, cx = camera.position.x, cz = camera.position.z;
        for (let u = 0, w = P.length - 1; u < P.length; w = u++) {
          const xi = P[u][0], zi = P[u][1], xj = P[w][0], zj = P[w][1];
          if ((zi > cz) !== (zj > cz) && cx < ((xj - xi) * (cz - zi)) / (zj - zi) + xi) under = !under;
        }
      } else if (b.rect) { // exact: footbridge deck slab (2.4m wide x span), cap only when under the slab
        const r = b.rect, dx = camera.position.x - r.x, dz = camera.position.z - r.z;
        const sy = Math.sin(r.yaw), cy = Math.cos(r.yaw);
        under = Math.abs(dx * sy + dz * cy) <= r.halfLen + 1 && Math.abs(dx * cy - dz * sy) <= r.halfW;
      }
      if (under) cap = Math.min(cap, (b.clearanceY || 7) - 0.4);
    }
    yT = Math.min(cap, camera.position.y + (4.2 - dCam) * 1.8);
  }
  camLiftY += (yT - camLiftY) * 0.12;
  if (camLiftY > camera.position.y + 0.02) {
    _clF.set(0, 0, -1).applyQuaternion(camera.quaternion);
    // Aim just ahead of the auto's roof along the view axis: the vehicle stays in frame even at
    // full lift, heading is unchanged (the target lies on the view-axis vertical plane).
    _clT.set(auto.x + _clF.x * 4, 1.2, auto.z + _clF.z * 4);
    _clM.lookAt(camera.position, _clT, camera.up); _clQ0.setFromRotationMatrix(_clM);
    camera.position.y = camLiftY;
    _clM.lookAt(camera.position, _clT, camera.up); _clQ1.setFromRotationMatrix(_clM);
    camera.quaternion.premultiply(_clQ1.multiply(_clQ0.invert()));
  }
}

// ---------- input ----------
const keys = {}; window.__keys = keys;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { if (!e.repeat) { honk(); if (life) life.onHorn(); } }
  if (e.code === 'KeyN') state.hour = (state.hour + 3) % 24;
  if (e.code === 'KeyT') state.auto = !state.auto;
});
addEventListener('keyup', e => keys[e.code] = false);

let tiltEnabled=false,tiltValue=0,tiltNeutral=null,tiltTimer;
const mobileInput={left:new Set(),right:new Set(),pedal:new Set(),reverse:new Set()};
function releaseMobile(){for(const ids of Object.values(mobileInput))ids.clear();tiltValue=0;document.querySelectorAll('#mobile-drive button').forEach(e=>e.classList.remove('held'));}
const mobileDrive=document.createElement('div');mobileDrive.id='mobile-drive';mobileDrive.innerHTML='<div class="steer-pair"><button id="steer-left" aria-label="Steer left"><svg viewBox="0 0 24 24"><path d="m14 5-7 7 7 7"/></svg></button><button id="steer-right" aria-label="Steer right"><svg viewBox="0 0 24 24"><path d="m10 5 7 7-7 7"/></svg></button></div><button id="tilt-toggle" aria-label="Enable tilt steering">Enable tilt</button><div class="pedal-pair"><button id="reverse" aria-label="Reverse pedal"><span>R</span><svg viewBox="0 0 32 48"><rect x="5" y="2" width="22" height="44" rx="5"/><path d="M11 10v23m5-23v23m5-23v23"/></svg></button><button id="accelerator" aria-label="Forward pedal"><span>F</span><svg viewBox="0 0 32 48"><rect x="5" y="2" width="22" height="44" rx="5"/><path d="M11 10v23m5-23v23m5-23v23"/></svg></button></div>';document.body.appendChild(mobileDrive);
for(const [id,key]of [['steer-left','left'],['steer-right','right'],['accelerator','pedal'],['reverse','reverse']]){const el=$(id),ids=mobileInput[key];el.addEventListener('pointerdown',e=>{e.preventDefault();ids.add(e.pointerId);el.setPointerCapture(e.pointerId);el.classList.add('held');});const release=e=>{ids.delete(e.pointerId);el.classList.toggle('held',ids.size>0);};for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,release);}
const tiltButton=$('tilt-toggle');
function stopTilt(message='Enable tilt'){tiltEnabled=false;tiltValue=0;tiltNeutral=null;clearTimeout(tiltTimer);tiltButton.textContent=message;tiltButton.setAttribute('aria-pressed','false');}
tiltButton.addEventListener('click',async()=>{if(tiltEnabled){stopTilt();return;}try{if(!window.DeviceOrientationEvent){stopTilt('Tilt unavailable');return;}if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){stopTilt('Tilt denied - use arrows');return;}tiltEnabled=true;tiltNeutral=null;tiltButton.textContent='Hold level...';tiltButton.setAttribute('aria-pressed','true');tiltTimer=setTimeout(()=>{if(tiltNeutral===null)stopTilt('No sensor - use arrows');},2500);}catch{stopTilt('Tilt unavailable');}});
addEventListener('deviceorientation',e=>{if(!tiltEnabled||typeof e.beta!=='number'||typeof e.gamma!=='number')return;const angle=(screen.orientation?.angle??window.orientation??0)*Math.PI/180;const value=e.gamma*Math.cos(angle)+e.beta*Math.sin(angle);if(tiltNeutral===null){tiltNeutral=value;clearTimeout(tiltTimer);tiltButton.textContent='Tilt on · tap to stop';}const delta=value-tiltNeutral;tiltValue=Math.abs(delta)<3?0:-Math.max(-1,Math.min(1,(delta-Math.sign(delta)*3)/22));});
addEventListener('blur',()=>{releaseMobile();tiltNeutral=null;});document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseMobile();tiltNeutral=null;}});

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
let lastHonk = 0, honkBuf = null, honkLoading = false, honkSrc = null, honkGain = null;
// Real auto-rickshaw horn recording (CC0, SoundEnsemble, Freesound 508975, Jaipur). See CREDITS.md.
function loadHonk() {
  if (honkBuf || honkLoading || !AC) return; honkLoading = true;
  fetch(import.meta.env.BASE_URL + 'audio/auto-horn.mp3').then(r => r.arrayBuffer()).then(b => AC.decodeAudioData(b)).then(buf => { honkBuf = buf; }).catch(e => { honkLoading = false; console.warn('horn load failed', e); });
}
function honk(rep) {
  if (!AC) return; loadHonk();
  if (!honkBuf) return;
  const now = performance.now(); if (now - lastHonk < 380) return; lastHonk = now;
  const t = AC.currentTime;
  if (honkSrc) { try { honkGain.gain.cancelScheduledValues(t); honkGain.gain.setValueAtTime(honkGain.gain.value, t); honkGain.gain.linearRampToValueAtTime(0, t + 0.04); honkSrc.stop(t + 0.05); } catch (e) {} }
  const src = AC.createBufferSource(), g = AC.createGain();
  src.buffer = honkBuf; src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.04;
  g.gain.value = 0.9; src.connect(g); g.connect(AC.destination); src.start(t);
  honkSrc = src; honkGain = g; src.onended = () => { if (honkSrc === src) honkSrc = null; };
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
  // neon boundary wall, drawn where the car is stopped (same limits as the clamp + createMapEdge)
  c.strokeStyle = '#ff2bd6'; c.lineWidth = 6; c.lineJoin = 'miter';
  c.strokeRect(MAP.x0 + 28, MAP.z0 + 28, MAP.x1 - MAP.x0 - 56, MAP.z1 - MAP.z0 - 56);
}
function drawMini() {
  const S = 360, R = 170;
  mx.clearRect(0, 0, S, S); mx.save();
  mx.beginPath(); mx.arc(S / 2, S / 2, S / 2 - 1, 0, 7); mx.clip();
  mx.fillStyle = '#14181c'; mx.fillRect(0, 0, S, S);
  mx.translate(S / 2, S / 2); mx.rotate(auto.a + Math.PI);
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

let dividerSource = null, dividerCells = new Map();
function inDivider(px, pz) {
    const mq = streetRef && streetRef.medianQuads;
    if (!mq) return false;
    if (dividerSource !== mq) {
      dividerSource = mq; dividerCells = new Map();
      for (const q of mq) {
        const x3=q[2]+q[4]-q[0], z3=q[3]+q[5]-q[1];
        const minX=Math.min(q[0],q[2],q[4],x3), maxX=Math.max(q[0],q[2],q[4],x3);
        const minZ=Math.min(q[1],q[3],q[5],z3), maxZ=Math.max(q[1],q[3],q[5],z3);
        for(let ix=Math.floor(minX/32);ix<=Math.floor(maxX/32);ix++)for(let iz=Math.floor(minZ/32);iz<=Math.floor(maxZ/32);iz++) {
          const key=ix+','+iz; let cell=dividerCells.get(key); if(!cell)dividerCells.set(key,cell=[]);cell.push(q);
        }
      }
    }
    const candidates=dividerCells.get(Math.floor(px/32)+','+Math.floor(pz/32));
    if (!candidates) return false;
    for (const q of candidates) {
      const ux = q[2] - q[0], uz = q[3] - q[1], vx = q[4] - q[0], vz = q[5] - q[1];
      const det = ux * vz - uz * vx; if (Math.abs(det) < 1e-6) continue;
      const rx = px - q[0], rz = pz - q[1];
      const sU = (rx * vz - rz * vx) / det, tV = (ux * rz - uz * rx) / det;
      if (sU > 0 && sU < 1 && tV > 0 && tV < 1) return true;
    }
    return false;
  }

function pierHit(x, z) { const P = window.__piers; if (!P) return false; for (let i = 0; i < P.length; i++) { const dx = x - P[i][0], dz = z - P[i][1]; if (dx * dx + dz * dz < 0.49) return true; } return false; }

function step(dt, now, sliced = false) {
  if (!sliced && Math.abs(auto.v) * dt > 0.5) {
    const n = Math.ceil(Math.abs(auto.v) * dt / 0.5);
    for (let i = 0; i < n; i++) step(dt / n, now - dt * 1000 + (i + 1) * dt * 1000 / n, true);
    return;
  }
  const startX = auto.x, startZ = auto.z;
  let thr = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  let str = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  if(mobileInput.pedal.size||mobileInput.reverse.size)thr=(mobileInput.pedal.size?1:0)-(mobileInput.reverse.size?1:0);
  str+=mobileInput.left.size||mobileInput.right.size?(mobileInput.left.size?1:0)-(mobileInput.right.size?1:0):(tiltEnabled?tiltValue:0);
  const input = { thr, str };
  if (destination) destination.update(dt, input);
  thr = input.thr;
  str = input.str;

  const max = 17;
  const driveAccel = thr > 0 ? 9.5 * Math.max(0, 1 - Math.pow(Math.max(0, auto.v) / 26, 4)) : 12.5;
  auto.v += (thr * driveAccel - (thr === 0 ? auto.v * 0.63 : 0)) * dt;
  auto.v = Math.max(-6, auto.v);
  const preV = auto.v;
  auto.steer += (str - auto.steer) * Math.min(1, dt * 8.5);
  const dA = auto.steer * dt * 1.85 * THREE.MathUtils.clamp(auto.v / 5, -1, 1);
  const hitA = (x, z, a) => {
    const s = Math.sin(a), c = Math.cos(a);
    for (const [lx, lz] of [[0.85, 1.8], [-0.85, 1.8], [0.85, -1.3], [-0.85, -1.3], [0, 1.95], [0, 0.3], [0, -1.3]]) {
      const px = x + c * lx + s * lz, pz = z - s * lx + c * lz;
      if (inDivider(px, pz) || pierHit(px, pz) || solid(px, pz) || (life && life.solid(px, pz)) || (parkedVehicles && parkedVehicles.solid(px, pz)) || (traffic && traffic.solid(px, pz)) || (crowd && crowd.solid(px, pz))) return true;
    }
    return false;
  };
  const hit = (x, z) => hitA(x, z, auto.a);
  // what is blocking? 1 = static geometry (solid, divider, pier, parked car), 2 = ordinary moving obstruction (traffic, street life, crowd)
  const hitKind = (x, z, a) => {
    const s = Math.sin(a), c = Math.cos(a); let dyn = 0;
    for (const [lx, lz] of [[0.85, 1.8], [-0.85, 1.8], [0.85, -1.3], [-0.85, -1.3], [0, 1.95], [0, 0.3], [0, -1.3]]) {
      const px = x + c * lx + s * lz, pz = z - s * lx + c * lz;
      if (inDivider(px, pz) || pierHit(px, pz) || solid(px, pz) || (parkedVehicles && parkedVehicles.solid(px, pz))) return 1;
      if ((life && life.solid(px, pz)) || (traffic && traffic.solid(px, pz)) || (crowd && crowd.solid(px, pz))) dyn = 2;
    }
    return dyn;
  };
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
    const rMax = hitKind(auto.x, auto.z, auto.a) === 2 ? 1.5 : 6; // overlapped by a moving obstruction: only a small nudge, never a long relocation
    for (let r = 0.25; r <= rMax && !done; r += 0.25) {
      for (let k = 0; k < 16; k++) {
        const ang = k * Math.PI / 8, nx = auto.x + Math.sin(ang) * r, nz = auto.z + Math.cos(ang) * r;
        if (!hit(nx, nz)) { auto.x = nx; auto.z = nz; auto.v *= 0.3; done = true; break; }
      }
    }
    if (!done && rMax > 1.5) auto.unstickNow = true;
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
  // impact feedback: dispatch across front/rear bumper contact points with car origin (auto.x, auto.z)
  if (Math.abs(preV) > 2.0) {
    const dirS = preV > 0 ? 1 : -1;
    const fx0 = Math.sin(auto.a) * dirS, fz0 = Math.cos(auto.a) * dirS;
    const rx0 = Math.cos(auto.a), rz0 = -Math.sin(auto.a);
    const pw = Math.min(7.5, Math.max(2.8, Math.abs(preV) * 0.62));
    for (const [fOff, sOff] of [[2.05, 0], [1.95, 0.8], [1.95, -0.8], [1.4, 0]]) {
      const px0 = auto.x + fx0 * fOff + rx0 * sOff;
      const pz0 = auto.z + fz0 * fOff + rz0 * sOff;
      if (traffic && traffic.kickAt) traffic.kickAt(px0, pz0, fx0, fz0, pw, auto.x, auto.z);
      if (crowd && crowd.kickAt) crowd.kickAt(px0, pz0, fx0, fz0, pw * 1.15, auto.x, auto.z);
      if (life && life.kickAt) life.kickAt(px0, pz0, fx0, fz0, pw, auto.x, auto.z);
      if (parkedVehicles && parkedVehicles.kickAt) parkedVehicles.kickAt(px0, pz0, fx0, fz0, pw * 0.9, auto.x, auto.z);
    }
  }
  // unstick fallback: throttle held but not moving against a collider -> back off, then snap to the road lane
  // Only static geometry triggers the recovery hop. Waiting behind traffic, a cow or a crowd never moves the player: they can wait, reverse or steer around.
  const bk = blocked ? Math.max(hitKind(auto.x + dx, auto.z + dz, auto.a), hitKind(auto.x, auto.z, auto.a)) : 0;
  // Only a truly wedged car (blocked in the direction of travel AND the opposite direction is blocked too) counts as stuck.
  // If the player can simply reverse or drive away, nothing relocates or re-aims them: holding the throttle against a divider or wall just holds the car there.
  const oppD = thr >= 0 ? -0.9 : 0.9;
  const wedged = hit(auto.x + Math.sin(auto.a) * oppD, auto.z + Math.cos(auto.a) * oppD);
  const staticBlock = bk === 1 && wedged;
  if (blocked && bk === 2 && Math.abs(thr) > 0.1) auto.dynT = (auto.dynT || 0) + dt; else auto.dynT = Math.max(0, (auto.dynT || 0) - dt * 3);
  if (staticBlock && Math.abs(thr) > 0.1 && Math.abs(auto.v) < 1.2) auto.stuckT = (auto.stuckT || 0) + dt;
  else auto.stuckT = Math.max(0, (auto.stuckT || 0) - dt * 2);
  if (staticBlock && Math.abs(thr) > 0.1) auto.blockT = (auto.blockT || 0) + dt; else auto.blockT = Math.max(0, (auto.blockT || 0) - dt * 3);
  // no relocation for moving obstructions at all: the player can wait, reverse or steer; they clear on their own
  if (auto.stuckT > 0.6 || auto.blockT > 0.9 || auto.unstickNow) {
    auto.stuckT = 0; auto.blockT = 0; auto.unstickNow = false;
    auto.clk = auto.clk || 0;
    auto.unstickN = (auto.clk - (auto.unstickAt ?? -99) < 4) ? (auto.unstickN || 0) + 1 : 1;
    auto.unstickAt = auto.clk;
    let skipSnap = false;
    if (auto.unstickN >= 3) {
      // repeatedly blocked (parked car / queue): hop past it along the heading, else sideways
      const fx = Math.sin(auto.a), fz = Math.cos(auto.a);
      let hopped = false;
      for (const [f, l] of [[7, 0], [9, 2.2], [9, -2.2], [12, 0], [0, 3], [0, -3], [14, 3], [14, -3]]) {
        const nx = auto.x + fx * f + fz * l, nz = auto.z + fz * f - fx * l;
        if (!hit(nx, nz) && !hit(nx + fx * 2, nz + fz * 2)) { auto.x = nx; auto.z = nz; auto.v = 0; hopped = true; break; }
      }
      if (hopped) { auto.unstickN = 0; skipSnap = true; }
      else if (auto.unstickN >= 4) { auto.a += Math.PI; auto.v = 0; auto.unstickN = 0; skipSnap = true; } // dead end: turn around
    }
    let freed = false;
    const sgn = thr >= 0 ? -1 : 1;
    for (const d of (skipSnap ? [] : [0.8, 1.6, 2.4, 3.5])) {
      const nx = auto.x + Math.sin(auto.a) * d * sgn, nz = auto.z + Math.cos(auto.a) * d * sgn;
      if (!hit(nx, nz)) { auto.x = nx; auto.z = nz; auto.v = 0; freed = true; break; }
    }
    const pr = window.__placeOnRoad ? window.__placeOnRoad(auto.x, auto.z) : null;
    if (!skipSnap && pr && Math.hypot(pr.x - auto.x, pr.z - auto.z) < 14 && !hit(pr.x, pr.z)) {
      // nudge to the road lane and line up with the road so throttle drives along it, never back into the wall
      const d1 = Math.abs(Math.atan2(Math.sin(pr.a - auto.a), Math.cos(pr.a - auto.a)));
      auto.x = pr.x; auto.z = pr.z; auto.a = d1 <= Math.PI / 2 ? pr.a : pr.a + Math.PI; auto.v = 0;
    }
  }

  // A sustained accelerator with no actual progress recovers only onto a clear nearby road.
  const progress = Math.hypot(auto.x - startX, auto.z - startZ);
  auto.noProgressT = thr > 0.3 && Math.abs(auto.v) < 3 && progress < dt * 2.5 ? (auto.noProgressT || 0) + dt : 0;
  if (auto.noProgressT > 2.0) {
    const candidates = [];
    for (const sg of (streetRef?.roadSegs || [])) {
      const sx = sg.x2 - sg.x1, sz = sg.z2 - sg.z1, len2 = sx * sx + sz * sz;
      if (!len2) continue;
      const t = THREE.MathUtils.clamp(((auto.x - sg.x1) * sx + (auto.z - sg.z1) * sz) / len2, 0, 1);
      const len = Math.sqrt(len2), yaw = Math.atan2(sx, sz);
      for (const along of [-5, 0, 5]) for (const off of [-0.22, 0.22]) {
        const x = sg.x1 + sx * t + sx / len * along - sz / len * sg.width * off;
        const z = sg.z1 + sz * t + sz / len * along + sx / len * sg.width * off;
        const d = Math.hypot(x - auto.x, z - auto.z);
        if (d > 1 && d < 18 && Math.abs(x) < 970 && Math.abs(z) < 970) candidates.push({x,z,yaw,d});
      }
    }
    candidates.sort((a,b) => a.d-b.d);
    for (const q of candidates) {
      const a = Math.cos(q.yaw - auto.a) >= 0 ? q.yaw : q.yaw + Math.PI;
      if (hitA(q.x,q.z,a) || hitA(q.x + Math.sin(a)*3,q.z + Math.cos(a)*3,a)) continue;
      auto.x=q.x;auto.z=q.z;auto.a=a;auto.v=0;auto.noProgressT=0;auto.recoveryCount=(auto.recoveryCount||0)+1;
      break;
    }
  }
  if (auto.unstickAt === undefined) { auto.unstickAt = -99; auto.unstickN = 0; }
  auto.clk = (auto.clk || 0) + dt;
  if (auto._didUnstick) { auto._didUnstick = false; }
  auto.x = THREE.MathUtils.clamp(auto.x, MAP.x0 + 28, MAP.x1 - 28);
  auto.z = THREE.MathUtils.clamp(auto.z, MAP.z0 + 28, MAP.z1 - 28);
  // sitting inside solid geometry AT the boundary (e.g. clamped into a building edge): nudge to the nearest free spot
  const atBound = auto.x === MAP.x0 + 28 || auto.x === MAP.x1 - 28 || auto.z === MAP.z0 + 28 || auto.z === MAP.z1 - 28;
  if (atBound && hit(auto.x, auto.z)) {
    let fixed = false;
    for (let r = 0.5; r <= 18 && !fixed; r += 0.5) {
      for (let k = 0; k < 16 && !fixed; k++) {
        const ang = k * Math.PI / 8;
        const nx = THREE.MathUtils.clamp(auto.x + Math.sin(ang) * r, MAP.x0 + 28, MAP.x1 - 28);
        const nz = THREE.MathUtils.clamp(auto.z + Math.cos(ang) * r, MAP.z0 + 28, MAP.z1 - 28);
        if (!hit(nx, nz)) { auto.x = nx; auto.z = nz; auto.v = 0; fixed = true; }
      }
    }
  }

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
    eg.gain.value = spd < 0.35 ? 0 : 0.02 + Math.min(1.8, spd / max) * 0.05;
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
  if(!matchMedia('(pointer:coarse)').matches)drawMini();
  if ($('clock')) $('clock').textContent = String(Math.floor(state.hour)).padStart(2, '0') + ':' + String(Math.floor((state.hour % 1) * 60)).padStart(2, '0');
}

function loop(now) {
  const dt = Math.min(window.__dtCap || 0.05, (now - last) / 1000);
  last = now;
  try { if (started && !window.__paused && !(matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth)) step(dt, now); } catch (e) { if (!window.__stepErr) { window.__stepErr = String(e && e.stack || e); console.error(e); } }
  try { if (!window.__noRender && !(matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth)) post.render(dt); } catch (e) { if (!window.__renderErr) { window.__renderErr = String(e); console.error(e); } }
  requestAnimationFrame(loop);
}

async function boot() {
  setLoad(8, 'Fetching the map');
  world = await (await fetch(import.meta.env.BASE_URL + 'data/world.json')).json();
  applyAlleyFix(world.roads);
  applyBldgFix(world.buildings);
  world.roads.push({ k: 3, n: 'Old Airport Road', p: LEELA_ACCESS_ROAD });
  prepareRoadCorridors(world);
  for (const lm of LANDMARKS_DATA) {
    const adj = plotBesideRoad(lm.x, lm.z);
    lm.x = adj.x; lm.z = adj.z;
  }
  (function infill() {
    const segs = [];
    for (const r of world.roads) {
      if (!r.p || r.p.length < 2) continue;
      const fw = r.k >= 4 ? 2.3 : 1.5;
      const hw = getRoadWidth(r) * 0.5 + fw + 2.8;
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
  camBridgeVols = street.bridgeVolumes || [];
  window.__camBridgeVols = camBridgeVols;
  window.__piers = street.metroPiers; window.__gantry = street.gantry;
  window.__edge = createMapEdge({ THREE, scene, MAP });
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
    getAuto: () => { const cd = camera.getWorldDirection(new THREE.Vector3()); return { x: auto.x, z: auto.z, a: auto.a, speed: auto.v, yaw: Math.atan2(cd.x, cd.z) }; },
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
    getAuto: () => { const cd = camera.getWorldDirection(new THREE.Vector3()); return { x: auto.x, z: auto.z, a: auto.a, speed: auto.v, yaw: Math.atan2(cd.x, cd.z) }; },
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
  
  const obstacleFn = (x, z) => Boolean(solid(x, z) || inDivider(x, z) || pierHit(x, z));
  life = createStreetLife({
    THREE,
    scene,
    camera,
    world,
    roadSegs: street.roadSegs,
    speedBreakers: street.speedBreakers,
    vendorSpots: street.vendorSpots,
    solid,
    obstacleFn,
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
  traffic = createTraffic({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, obstacleFn, nightUniform, getAuto: () => ({ x: auto.x, z: auto.z, a: auto.a }), count: (() => { const q = new URLSearchParams(location.search).get('traffic'); if (q === null || q === '') return 150; const n = parseInt(q); return Number.isFinite(n) ? Math.max(0, Math.min(220, n)) : 150; })() });
  parkedVehicles = null; // Removed entirely at Somil's request, not just hidden.
  crowd = createCrowd({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid, obstacleFn, avoidFn: (parkedVehicles && parkedVehicles.overlaps) ? parkedVehicles.overlaps : undefined, getAuto: () => { const cd = camera.getWorldDirection(new THREE.Vector3()); return { x: auto.x, z: auto.z, yaw: Math.atan2(cd.x, cd.z) }; }, nightUniform, count: 120 });
  bldgHQ = upgradeBuildingFacades({ THREE, landmarks: LANDMARKS_DATA.concat(clearing), scene, world, roadSegs: street.roadSegs, solidFn: solid, nightUniform, getAuto: () => ({ x: auto.x, z: auto.z }) });
  hazards = createHazards({ THREE, scene, roadSegs: street.roadSegs, solidFn: solid });
  buildMini();

  function placeOnRoad(x, z, aPref) {
    let cands = [];
    for (const s of street.roadSegs) {
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t;
      cands.push({ d: Math.hypot(x - px, z - pz), x1, z1, dx, dz, L: Math.sqrt(L2), t });
    }
    cands.sort((a, b) => a.d - b.d);
    // Junction nodes touch several roads at distance ~0; pure distance order is then a
    // coin flip that can turn a spawn ~90 deg onto the cross street. Among the nearest
    // tied candidates only, prefer the road whose direction best matches the preferred
    // heading. Roads farther than the tie window keep pure distance order.
    if (aPref !== undefined) {
      const aScore = (c) => {
        const ang = Math.atan2(c.dx, c.dz);
        const d = Math.abs(Math.atan2(Math.sin(ang - aPref), Math.cos(ang - aPref)));
        return Math.min(d, Math.PI - d);
      };
      const dBest = cands[0].d;
      const tied = cands.filter((c) => c.d <= dBest + 3).sort((a, b) => aScore(a) - aScore(b));
      cands = [...tied, ...cands.filter((c) => c.d > dBest + 3)];
    }
    for (const c of cands.slice(0, 12)) {
      const ux = c.dx / c.L, uz = c.dz / c.L, ang = Math.atan2(c.dx, c.dz);
      const nx = uz, nz = -ux;
      for (const along of [0, 6, -6, 12, -12, 20, -20, 30, -30]) {
        const base = c.t * c.L + along;
        if (base < 1 || base > c.L - 1) continue;
        for (const off of [2.2, -2.2, 3.4, -3.4, 0]) {
          const cx = c.x1 + ux * base + nx * off, cz = c.z1 + uz * base + nz * off;
          if (!hitArea(cx, cz)) return { x: cx, z: cz, a: ang };
        }
      }
    }
    return { x, z, a: Math.PI };
  }
  function hitAt(px, pz) {
    return !!(solid(px, pz) || (parkedVehicles && parkedVehicles.solid(px, pz)) || (traffic && traffic.solid(px, pz)));
  }
  // Footprint-aware check: the auto is ~2.6m long / ~1.6m wide; a point probe lets spawns
  // land with a pole or parked vehicle clipping the body, which pins the car at 0 speed.
  function hitArea(px, pz) {
    if (hitAt(px, pz)) return true;
    for (const [ox, oz] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9]]) {
      if (hitAt(px + ox, pz + oz)) return true;
    }
    return false;
  }
  function spawnAt(x, z, aPref) {
    x = THREE.MathUtils.clamp(x, MAP.x0 + 30, MAP.x1 - 30); z = THREE.MathUtils.clamp(z, MAP.z0 + 30, MAP.z1 - 30);
    const r = placeOnRoad(x, z, aPref);
    let a = r.a;
    if (aPref !== undefined) { const d = Math.abs(Math.atan2(Math.sin(a - aPref), Math.cos(a - aPref))); if (d > Math.PI / 2) a += Math.PI; }
    { const fx1 = Math.sin(a), fz1 = Math.cos(a), ex = r.x + fx1 * 70, ez = r.z + fz1 * 70;
      if (ex < MAP.x0 + 28 || ex > MAP.x1 - 28 || ez < MAP.z0 + 28 || ez > MAP.z1 - 28) a += Math.PI; } // face away from the map edge
    // Never spawn facing a wall: probe clearance at several distances, flip only when
    // the way ahead is badly blocked AND the reverse run is genuinely longer - never
    // flip from one blocked space into another.
    { const fx0 = Math.sin(a), fz0 = Math.cos(a);
      const clearRun = (sx, sz) => { let m = 0; for (const d of [1, 2, 3.5, 5, 7, 9, 12]) { if (hitArea(r.x + sx * d, r.z + sz * d)) break; m = d; } return m; };
      const fwd = clearRun(fx0, fz0), back = clearRun(-fx0, -fz0);
      if (fwd < 3.5 && back >= fwd + 3) a += Math.PI; }
    window.__noCardUntil = performance.now() + 3500;
    { const ce = document.getElementById('stop-card-v2'); if (ce) ce.classList.remove('on'); }
    auto.x = r.x; auto.z = r.z; auto.a = a; auto.v = 0; auto.steer = 0;
    car.position.set(auto.x, 0, auto.z); car.rotation.set(0, auto.a, 0);
    updateAuto(car, auto, 0.016);
    if (camRig) camRig.update(0.016, true); else syncCamera(0.016, true);
    clampCam();
  }
  window.__renderer = renderer; window.__scene = scene; window.__step = step; window.__pick = (nx, ny) => { const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(nx, ny), camera); return rc.intersectObjects(scene.children, true).slice(0, 6).map(h => ({ d: +h.distance.toFixed(1), pt: [+h.point.x.toFixed(1), +h.point.y.toFixed(1), +h.point.z.toFixed(1)], type: h.object.type, geo: h.object.geometry && h.object.geometry.type, inst: h.instanceId ?? null, mat: h.object.material && h.object.material.color ? h.object.material.color.getHexString() : (h.object.material && h.object.material.type) || '' })); }; window.__inDivider = inDivider; window.__spawnAt = spawnAt; Object.defineProperty(window, '__peds', { get: () => crowd && crowd.peds }); window.__placeOnRoad = placeOnRoad; window.__traffic = () => traffic; window.__solid = solid;
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

  // Disabled categories have no simulation, collision, avoidance or impact interactions.
  for (const entity of [traffic, parkedVehicles, crowd, hazards]) {
    if (!entity) continue;
    entity.enabled = true;
    for (const key of ['solid','kickAt','overlaps','update']) {
      const original = entity[key];
      if (typeof original !== 'function') continue;
      entity[key] = (...args) => entity.enabled ? original(...args) : (key === 'update' ? 0 : false);
    }
  }
  (function settingsPanel() {
    const box=document.createElement('div');box.id='toggles';
    box.innerHTML='<button id="tgbtn" aria-label="Settings" aria-expanded="false"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="#18222a"/><circle cx="15" cy="17" r="3" fill="#18222a"/></svg></button><div id="tgpanel"><h3>Your neighbourhood</h3></div>';
    document.body.appendChild(box);const panel=box.querySelector('#tgpanel');
    function slider(id,name,min,max,step,value,format,change){
      const row=document.createElement('label');row.htmlFor=id;
      row.innerHTML=`<span>${name}<output></output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
      const input=row.querySelector('input'),out=row.querySelector('output');
      const sync=()=>{out.textContent=format(+input.value);change(+input.value);};input.addEventListener('input',sync);panel.appendChild(row);sync();
    }
    slider('setting-time','Time of day',0,23.75,.25,state.hour,h=>`${String(Math.floor(h)).padStart(2,'0')}:${String(Math.round((h%1)*60)).padStart(2,'0')}`,h=>{state.hour=h;applyTime(h);});
    const density=(id,name,entity,extra)=>slider(id,name,0,100,10,100,v=>v===0?'Off':v+'%',v=>{const f=v/100;entity.enabled=v>0;entity.group.visible=v>0;entity.setDensity?.(f);extra?.(f);});
    density('setting-traffic','Traffic',traffic,f=>{life.setTrafficEnabled(f>0);life.setTrafficDensity(f);});
    density('setting-pedestrians','Pedestrians',crowd);
    density('setting-trees','Trees',trees);
    density('setting-hazards','Potholes and puddles',hazards);

    box.querySelector('#tgbtn').addEventListener('click',()=>{box.classList.toggle('open');box.querySelector('#tgbtn').setAttribute('aria-expanded',box.classList.contains('open'));});
    const closeSettings=()=>{box.classList.remove('open');box.querySelector('#tgbtn').setAttribute('aria-expanded','false');};
    document.addEventListener('pointerdown',e=>{if(box.classList.contains('open')&&!box.contains(e.target))closeSettings();});
    document.addEventListener('keydown',e=>{if(e.code==='Escape'){closeSettings();box.querySelector('#tgbtn').focus();}});
  })();
  const pick = document.getElementById('startpick');
  if (pick) {
    pick.innerHTML = stops.map((s, i) => `<option value="${i}">${s.p.n}</option>`).join('');
    pick.addEventListener('change', () => { const s = stops[+pick.value]; spawnAt(s.p.x, s.p.z); });
  }
  const go = () => {
    if(matchMedia('(pointer:coarse)').matches && innerHeight>innerWidth){document.getElementById('rotate-entry')?.classList.add('required');return;}
    $('start').classList.remove('on');
    $('hud').classList.add('on');
    started = true;
    startAudio();
  };
  $('go').addEventListener('click', go);
  const rotateEntry=document.createElement('div');rotateEntry.id='rotate-entry';rotateEntry.innerHTML='<div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="7" width="14" height="10" rx="2"/><path d="M3 9V4h5M21 15v5h-5"/></svg><h2>Turn your phone to play</h2><p>Indiranagar is built for landscape.<br>Rotate your phone sideways to start driving.</p></div>';document.body.appendChild(rotateEntry);
  const syncOrientation=()=>{const portrait=matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth;rotateEntry.classList.toggle('required',portrait);if(portrait){for(const k of Object.keys(keys))keys[k]=false;releaseMobile();tiltNeutral=null;}};addEventListener('resize',syncOrientation);screen.orientation?.addEventListener('change',()=>{tiltNeutral=null;tiltValue=0;syncOrientation();});syncOrientation();
  const streetEl=$('street');
  const locationControl=document.createElement('div');locationControl.id='location-control';
  locationControl.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>';
  const locationSelect=document.createElement('select');locationSelect.id='location-select';locationSelect.setAttribute('aria-label','Change location');
  locationSelect.innerHTML='<option value="" disabled>Choose a place</option>'+stops.map((s,i)=>`<option value="${i}">${s.p.n}</option>`).join('');locationSelect.value='';
  locationSelect.addEventListener('change',()=>{if(locationSelect.value==='')return;const s=stops[+locationSelect.value];spawnAt(s.p.x,s.p.z);locationSelect.value='';});
  locationControl.appendChild(locationSelect);streetEl.appendChild(locationControl);
  window.__game = { get crowd() { return crowd; }, get trees() { return trees; }, roadSegs: () => street.roadSegs, get parked() { return parkedVehicles; }, get traffic() { return traffic; }, get hazards() { return hazards; }, get camRig() { return camRig; }, get destination() { return destination; }, scene, npcs, auto, state, stops, stopsGame, life, go, solid, world, applyTime, camera, get started() { return started; }, get engGain() { return eg ? eg.gain.value : null; } };
}
boot();
