// src/vehicles.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const hash = (x, z, seed = 0) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
};

function buildWheelGeometry(T) {
  const tire = new T.CylinderGeometry(0.32, 0.32, 0.22, 16);
  tire.rotateZ(Math.PI / 2);
  const hub = new T.CylinderGeometry(0.18, 0.18, 0.24, 12);
  hub.rotateZ(Math.PI / 2);

  const tCount = tire.attributes.position.count;
  const tArr = new Float32Array(tCount * 3);
  for (let i = 0; i < tCount; i++) {
    tArr[i * 3] = 0.18; tArr[i * 3 + 1] = 0.18; tArr[i * 3 + 2] = 0.18;
  }
  tire.setAttribute('color', new T.BufferAttribute(tArr, 3));

  const hCount = hub.attributes.position.count;
  const hArr = new Float32Array(hCount * 3);
  for (let i = 0; i < hCount; i++) {
    hArr[i * 3] = 0.85; hArr[i * 3 + 1] = 0.88; hArr[i * 3 + 2] = 0.92;
  }
  hub.setAttribute('color', new T.BufferAttribute(hArr, 3));
  return mergeGeometries([tire, hub], false);
}

function buildCarGeometry(T, type = 'sedan') {
  const parts = [];
  const colPaint = new T.Color(0xd93829);
  const colGlass = new T.Color(0x93c5fd);
  const colBumper = new T.Color(0x1e2229);
  const colLight = new T.Color(0xfffbeb);
  const colTail = new T.Color(0xef4444);

  function paint(geo, col, shade = 1.0) {
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const py = geo.attributes.position.getY(i);
      const s = shade * (0.88 + Math.min(0.2, py * 0.08));
      arr[i * 3] = col.r * s;
      arr[i * 3 + 1] = col.g * s;
      arr[i * 3 + 2] = col.b * s;
    }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  // Lower Hull / Body
  const len = type === 'suv' ? 4.4 : (type === 'hatch' ? 3.8 : 4.2);
  const wdt = type === 'suv' ? 1.85 : 1.72;
  const hgt = type === 'suv' ? 1.72 : 1.45;

  const hull = new T.BoxGeometry(wdt, hgt * 0.52, len);
  hull.translate(0, hgt * 0.32, 0);
  parts.push(paint(hull, colPaint, 1.0));

  // Cabin / Greenhouse
  const cabLen = len * 0.56;
  const cab = new T.BoxGeometry(wdt * 0.88, hgt * 0.44, cabLen);
  cab.translate(0, hgt * 0.76, -0.05);
  parts.push(paint(cab, colGlass, 0.85));

  // Bumpers & Grill
  const fBump = new T.BoxGeometry(wdt * 0.98, 0.28, 0.25);
  fBump.translate(0, 0.32, len * 0.52);
  const rBump = fBump.clone();
  rBump.translate(0, 0, -len * 1.04);
  parts.push(paint(fBump, colBumper), paint(rBump, colBumper));

  // Headlights & Tail Lights
  const hl = new T.BoxGeometry(0.35, 0.16, 0.1);
  hl.translate(wdt * 0.34, 0.52, len * 0.53);
  const hlR = hl.clone(); hlR.translate(-wdt * 0.68, 0, 0);
  const tl = new T.BoxGeometry(0.32, 0.14, 0.1);
  tl.translate(wdt * 0.34, 0.55, -len * 0.53);
  const tlR = tl.clone(); tlR.translate(-wdt * 0.68, 0, 0);
  parts.push(paint(hl, colLight), paint(hlR, colLight), paint(tl, colTail), paint(tlR, colTail));

  return mergeGeometries(parts, false);
}

function buildScooterGeometry(T) {
  const parts = [];
  const colBody = new THREE.Color(0x38bdf8);
  const colSeat = new THREE.Color(0x181a1e);
  const colHelmet = new THREE.Color(0xfacc15);

  function paint(geo, col) {
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  const body = new T.BoxGeometry(0.38, 0.52, 1.35);
  body.translate(0, 0.38, 0);
  const seat = new T.BoxGeometry(0.34, 0.14, 0.72);
  seat.translate(0, 0.68, -0.05);
  const torso = new T.CapsuleGeometry(0.18, 0.42, 4, 8);
  torso.translate(0, 1.08, -0.08);
  const helmet = new T.SphereGeometry(0.18, 10, 8);
  helmet.translate(0, 1.54, -0.05);

  parts.push(paint(body, colBody), paint(seat, colSeat), paint(torso, new THREE.Color(0x2563eb)), paint(helmet, colHelmet));
  return mergeGeometries(parts, false);
}

export function createTraffic({ THREE: T = THREE, scene, roadSegs = [], solidFn = () => 0, nightUniform, getAuto, count = 90 }) {
  const group = new T.Group();
  scene.add(group);

  const carGeo = buildCarGeometry(T, 'sedan');
  const suvGeo = buildCarGeometry(T, 'suv');
  const scooterGeo = buildScooterGeometry(T);

  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  const carInst = new T.InstancedMesh(carGeo, mat, Math.round(count * 0.5));
  const suvInst = new T.InstancedMesh(suvGeo, mat, Math.round(count * 0.25));
  const scInst = new T.InstancedMesh(scooterGeo, mat, Math.round(count * 0.25));

  carInst.castShadow = suvInst.castShadow = scInst.castShadow = true;
  carInst.frustumCulled = suvInst.frustumCulled = scInst.frustumCulled = false;
  group.add(carInst, suvInst, scInst);

  const palette = [0xd93829, 0x2563eb, 0x1f7a43, 0xf6c30f, 0xe2e8f0, 0x1e293b, 0x0284c7, 0xf97316];
  const colC = new T.Color();

  const trafficUnits = [];
  const segMid = (sg) => [((sg.x1 ?? sg[0]) + (sg.x2 ?? sg[2])) / 2, ((sg.z1 ?? sg[1]) + (sg.z2 ?? sg[3])) / 2];
  const segLen = (sg) => Math.hypot((sg.x2 ?? sg[2]) - (sg.x1 ?? sg[0]), (sg.z2 ?? sg[3]) - (sg.z1 ?? sg[1]));
  function pickNearSeg(k, maxD = 200) {
    const pa = getAuto ? getAuto() : { x: 0, z: 0 };
    const near = roadSegs.filter((sg) => { const m = segMid(sg); return segLen(sg) > 25 && Math.hypot(m[0] - pa.x, m[1] - pa.z) < maxD; });
    if (!near.length) return null;
    return near[Math.floor(Math.random() * near.length + k * 0) % near.length];
  }
  let cIdx = 0, sIdx = 0, scIdx = 0;

  for (let i = 0; i < count; i++) {
    const isSuv = i % 4 === 0;
    const isSc = i % 4 === 1;
    const inst = isSc ? scInst : (isSuv ? suvInst : carInst);
    const subIdx = isSc ? scIdx++ : (isSuv ? sIdx++ : cIdx++);

    colC.setHex(palette[i % palette.length]);
    inst.setColorAt(subIdx, colC);

    const seg = pickNearSeg(i) || roadSegs[(i * 7) % roadSegs.length] || { x1: 0, z1: 0, x2: 10, z2: 10, width: 8.2 };
    trafficUnits.push({
      inst,
      subIdx,
      seg,
      t: (i * 0.08) % 0.94,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 6.0 + (i % 5) * 1.4,
      x: 0, z: 0, yaw: 0
    });
  }

  carInst.instanceColor.needsUpdate = true;
  suvInst.instanceColor.needsUpdate = true;
  scInst.instanceColor.needsUpdate = true;

  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3 = new T.Vector3(), s3 = new T.Vector3(1, 1, 1);
  const yAxis = new T.Vector3(0, 1, 0);

  function update(dt, hour = 17.8) {
    const pAuto = getAuto ? getAuto() : { x: 0, z: 0 };

    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      const x1 = tu.seg.x1 ?? tu.seg[0], z1 = tu.seg.z1 ?? tu.seg[1], x2 = tu.seg.x2 ?? tu.seg[2], z2 = tu.seg.z2 ?? tu.seg[3];
      const width = tu.seg.width ?? tu.seg[6] ?? 8.2;
      const mdx = (x1 + x2) / 2 - pAuto.x, mdz = (z1 + z2) / 2 - pAuto.z;
      if (mdx * mdx + mdz * mdz > 260 * 260) {
        const ns = pickNearSeg(i, 180);
        if (ns) { tu.seg = ns; tu.t = 0.1 + Math.random() * 0.8; continue; }
      }
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len;

      tu.t += (tu.dir * tu.speed * dt) / len;
      if (tu.t > 0.98 || tu.t < 0.02) {
        tu.dir *= -1;
        tu.t = T.MathUtils.clamp(tu.t, 0.02, 0.98);
      }

      // India left-hand drive lane offset (1.7m from centreline)
      const leftOff = 1.7;
      tu.x = x1 + ux * len * tu.t - uz * leftOff * tu.dir;
      tu.z = z1 + uz * len * tu.t + ux * leftOff * tu.dir;
      tu.yaw = Math.atan2(ux * tu.dir, uz * tu.dir);

      q4.setFromAxisAngle(yAxis, tu.yaw);
      v3.set(tu.x, 0, tu.z);
      m4.compose(v3, q4, s3);
      tu.inst.setMatrixAt(tu.subIdx, m4);
    }

    carInst.instanceMatrix.needsUpdate = true;
    suvInst.instanceMatrix.needsUpdate = true;
    scInst.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}

export function createParkedVehicles({ THREE: T = THREE, scene, roadSegs = [], solidFn = () => 0, nightUniform, seed = 42 }) {
  const group = new T.Group();
  scene.add(group);

  const carGeo = buildCarGeometry(T, 'hatch');
  const scooterGeo = buildScooterGeometry(T);
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });

  const parkedSpots = [];

  for (let i = 0; i < roadSegs.length; i++) {
    const s = roadSegs[i];
    const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
    const width = s.width ?? s[6] ?? 8.2;
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 16) continue;
    const ux = dx / len, uz = dz / len;
    const yaw = Math.atan2(ux, uz);

    const isDense = s.name && (s.name.includes('100 Feet') || s.name.includes('12th Main') || s.name.includes('Chinmaya'));
    const step = isDense ? 5.2 : 8.5;

    for (let d = 4; d < len - 4; d += step + hash(x1 + d, z1, seed) * 3.0) {
      for (const side of [-1, 1]) {
        // Kerbside verge offset (road half-width + 2.6m minimum offset)
        const vergeOff = width * 0.5 + 2.6;
        const px = x1 + ux * d - uz * vergeOff * side;
        const pz = z1 + uz * d + ux * vergeOff * side;

        if (Math.hypot(px - (-133), pz - (-345)) < 18) continue;
        if (solidFn && solidFn(px, pz)) continue;

        const h = hash(px, pz, seed);
        parkedSpots.push({ x: px, z: pz, yaw: yaw + (h > 0.5 ? 0.25 * side : 0), isCar: h > 0.45 });
      }
    }
  }

  const cars = parkedSpots.filter(p => p.isCar);
  const scooters = parkedSpots.filter(p => !p.isCar);

  if (cars.length) {
    const carInst = new T.InstancedMesh(carGeo, mat, cars.length);
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3 = new T.Vector3(), s3 = new T.Vector3(1, 1, 1);
    const colC = new T.Color(0x94a3b8);
    cars.forEach((p, idx) => {
      q4.setFromAxisAngle(new T.Vector3(0, 1, 0), p.yaw);
      m4.compose(v3.set(p.x, 0, p.z), q4, s3);
      carInst.setMatrixAt(idx, m4);
      carInst.setColorAt(idx, colC);
    });
    carInst.castShadow = true;
    carInst.instanceColor.needsUpdate = true;
    group.add(carInst);
  }

  if (scooters.length) {
    const scInst = new T.InstancedMesh(scooterGeo, mat, scooters.length);
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3 = new T.Vector3(), s3 = new T.Vector3(1, 1, 1);
    const colC = new T.Color(0xe2e8f0);
    scooters.forEach((p, idx) => {
      q4.setFromAxisAngle(new T.Vector3(0, 1, 0), p.yaw + 0.45);
      m4.compose(v3.set(p.x, 0, p.z), q4, s3);
      scInst.setMatrixAt(idx, m4);
      scInst.setColorAt(idx, colC);
    });
    scInst.castShadow = true;
    scInst.instanceColor.needsUpdate = true;
    group.add(scInst);
  }

  return { group };
}
