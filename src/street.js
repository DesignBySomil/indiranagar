// src/street.js
import * as THREE from 'three';
import { createAsphaltMaterial, createPavementMaterial, createKerbMaterial, makeSign, makeEmissiveSignMaterial, makeNeonMaterial } from './materials.js';

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function makePotholeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 56);
  g.addColorStop(0.0, 'rgba(14, 15, 18, 0.92)');
  g.addColorStop(0.55, 'rgba(30, 32, 36, 0.78)');
  g.addColorStop(0.78, 'rgba(95, 90, 82, 0.55)');
  g.addColorStop(1.0, 'rgba(60, 58, 54, 0.0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 44 + Math.sin(i * 3.7) * 10;
    const x = 64 + Math.cos(a) * r;
    const y = 64 + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSpeedBreakerTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#26282c';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#e5c453';
  for (let x = -32; x < 288; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 64);
    ctx.lineTo(x + 14, 64);
    ctx.lineTo(x + 28, 0);
    ctx.lineTo(x + 14, 0);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildStreet(world, scene, nightUniform, solidFn, extras = null) {
  const roadSegs = [];
  const lampSpots = [];
  const vendorSpots = [];
  const parkedSpots = [];
  const bridgeVolumes = [];
  const speedBreakers = [];
  const solid = solidFn || (() => 0);

  // Dusty green/tan Bangalore ground plane
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x57534d, roughness: 0.97, metalness: 0.0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Real Bangalore road widths: single carriageway 1-lane each way (~7m residential, ~10.5m 12th Main/CMH),
  // 100 Feet Road as two separated one-way carriageways (2 lanes each, pale concrete) with narrow 0.5m concrete divider
  // User rule (2026-10-23): ONLY 2-lane roads - one lane each way, no 3/4-lane roads.
  const widthMap = { 5: 7.6, 4: 7.2, 3: 7.0, 2: 6.6, 1: 5.5 };

  const pos = [], col = [], uvs = [], idx = [];
  const fpPos = [], fpCol = [], fpUvs = [], fpIdx = [];
  const kbPos = [], kbUvs = [], kbIdx = [];
  const dp = [], dCol = [], di = [];
  const divPos = [], divIdx = [];
  const patchPos = [], patchCol = [], patchIdx = [];
  const potholeSpots = [];
  const utilityPoles = [];
  const metroPiers = [], metroDecks = [], cmhSegs = [], cmhCands = [];
  let gantryRef = null;

  let v = 0, fpV = 0, kbV = 0, dv = 0, divV = 0, patV = 0;

  // 100 Feet Road: two OSM one-way carriageways. Pre-pass finds the opposite carriageway so the gap becomes a narrow median.
  // User rule (2-lane roads, one lane each way): the raw OSM pair sits 10-30m apart, which reads as a
  // 4-lane-wide corridor from driver height. Narrow the corridor at the source polyline so the two
  // carriageways sit GAP100 apart (5.2m each + 1.2m median) - one divided 2-lane road.
  const W100 = 5.2; // 100 Feet Road: one-way carriageway pair, 1 lane each = 2 lanes total (user rule)
  const GAP100 = W100 + 1.2;
  const medianQuads = [];
  const medianKerbs = [], medianStrips = [];
  let hundredSegs = [];
  const nbrSide = new Map();
  const collectHundred = () => {
    hundredSegs = [];
    world.roads.forEach((r, ri) => {
      if (!(r.n && r.n.includes('100 Feet'))) return;
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.2) continue;
        hundredSegs.push({ ri, i, x1: ax, z1: az, x2: bx, z2: bz, ux: (bx - ax) / L, uz: (bz - az) / L, L });
      }
    });
  };
  const pairHundred = (emit) => {
    for (const a of hundredSegs) {
      const nx = -a.uz, nz = a.ux;
      const mx = (a.x1 + a.x2) / 2, mz = (a.z1 + a.z2) / 2;
      let best = null;
      for (const b of hundredSegs) {
        if (b.ri === a.ri) continue;
        if (Math.abs(a.ux * b.ux + a.uz * b.uz) < 0.9) continue;
        const rx = (b.x1 + b.x2) / 2 - mx, rz = (b.z1 + b.z2) / 2 - mz;
        const along = rx * a.ux + rz * a.uz, perp = rx * nx + rz * nz;
        if (Math.abs(perp) < 5 || Math.abs(perp) > 30 || Math.abs(along) > (a.L + b.L) / 2) continue;
        if (!best || Math.abs(perp) < Math.abs(best.perp)) best = { b, perp };
      }
      if (!best) continue;
      const sg = Math.sign(best.perp);
      nbrSide.set(a.ri + ':' + a.i, sg);
      if (!emit) { nbrPerp.set(a.ri + ':' + a.i, best.perp); continue; }
      if (a.ri < best.b.ri) {
        const o1 = sg * W100 / 2, o2 = best.perp - sg * W100 / 2;
        if (Math.abs(o2) > Math.abs(o1)) {
          medianQuads.push([a.x1 + nx * o1, a.z1 + nz * o1, a.x1 + nx * o2, a.z1 + nz * o2, a.x2 + nx * o1, a.z2 + nz * o1, a.x2 + nx * o2, a.z2 + nz * o2]);
          // kerb edges at each carriageway + raised central divider strip, so the narrow median reads as a divider
          const oM = (o1 + o2) / 2;
          medianKerbs.push([a.x1 + nx * o1, a.z1 + nz * o1, a.x2 + nx * o1, a.z2 + nz * o1]);
          medianKerbs.push([a.x1 + nx * o2, a.z1 + nz * o2, a.x2 + nx * o2, a.z2 + nz * o2]);
          medianStrips.push([a.x1 + nx * oM, a.z1 + nz * oM, a.x2 + nx * oM, a.z2 + nz * oM]);
        }
      }
    }
  };
  const nbrPerp = new Map();
  collectHundred();
  pairHundred(false); // measure original pair separation
  {
    const done = new Set();
    for (const a of hundredSegs) {
      const perp = nbrPerp.get(a.ri + ':' + a.i);
      if (perp === undefined) continue;
      const sh = Math.max(0, (Math.abs(perp) - GAP100) / 2);
      if (sh <= 0) continue;
      const sgn = Math.sign(perp);
      const sx = -a.uz * sgn * sh, sz = a.ux * sgn * sh;
      const rp = world.roads[a.ri].p;
      for (const pi of [a.i, a.i + 1]) {
        const k2 = a.ri + ':' + pi;
        if (done.has(k2)) continue;
        done.add(k2);
        rp[pi][0] += sx; rp[pi][1] += sz;
      }
    }
  }
  nbrSide.clear();
  collectHundred();
  pairHundred(true); // rebuild pairs + median quads on the narrowed corridor

  // Overhead signal gantries across 100 Feet Road carriageways (depth cue, Bangalore-style)
  {
    const gantry = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.4 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x14171b, roughness: 0.5 });
    const lampG = new THREE.MeshBasicMaterial({ color: 0x35e05a });
    const lampR = new THREE.MeshBasicMaterial({ color: 0x5a2222 });
    const lampA = new THREE.MeshBasicMaterial({ color: 0x54400f });
    const poleGeo = new THREE.BoxGeometry(0.26, 5.6, 0.26);
    const headGeo = new THREE.BoxGeometry(0.34, 0.95, 0.22);
    const lampGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10);
    const lastPlaced = new Map();
    gantry.userData.centers = [];
    for (const sg of hundredSegs) {
      if (sg.L < 25) continue;
      const mx = (sg.x1 + sg.x2) / 2, mz = (sg.z1 + sg.z2) / 2;
      const last = lastPlaced.get(sg.ri);
      if (last && Math.hypot(mx - last.x, mz - last.z) < 170) continue;
      lastPlaced.set(sg.ri, { x: mx, z: mz });
      gantry.userData.centers.push([mx, mz]);
      const nx2 = -sg.uz, nz2 = sg.ux;
      const half = W100 / 2 + 0.7;
      for (const sgn of [1, -1]) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(mx + nx2 * half * sgn, 2.8, mz + nz2 * half * sgn);
        pole.castShadow = true;
        gantry.add(pole);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, half * 2), poleMat);
      bar.position.set(mx, 5.5, mz);
      bar.rotation.y = Math.atan2(nx2, nz2);
      gantry.add(bar);
      bridgeVolumes.push({ x: mx, z: mz, r: half + 1, clearanceY: 5.3, rect: { x: mx, z: mz, yaw: Math.atan2(nx2, nz2), halfLen: half, halfW: 0.5 } });
      const fx = -sg.ux, fz = -sg.uz; // face oncoming traffic
      const yawF = Math.atan2(fx, fz);
      for (const off of [-2.2, 2.2]) {
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(mx + nx2 * off, 4.9, mz + nz2 * off);
        head.rotation.y = yawF;
        gantry.add(head);
        for (let li = 0; li < 3; li++) {
          const lamp = new THREE.Mesh(lampGeo, li === 0 ? lampR : (li === 1 ? lampA : lampG));
          lamp.position.set(head.position.x + fx * 0.13, 4.9 + (0.28 - li * 0.28), head.position.z + fz * 0.13);
          lamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(fx, 0, fz));
          gantry.add(lamp);
        }
      }
    }
    scene.add(gantry);
    gantryRef = gantry;
  }

  let ri = -1;
  for (const r of world.roads) {
    ri++;
    const is100Ft = Boolean(r.n && r.n.includes('100 Feet'));
    const isCMH = Boolean(r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras')));
    // User rule (2026-10-23): 2 lanes TOTAL per road, one each way. Divided corridors
    // (100 Ft, CMH/metro) are one-way single-lane carriageway pairs around the median.
    const w = is100Ft ? W100 : (isCMH ? 4.8 : (widthMap[r.k] || 7.0)); // CMH: carriageway pair with a median that holds the metro piers
    // 100 Feet Road is pale white-topped concrete slabs with patches; other roads are worn mid-grey asphalt
    const baseCol = is100Ft
      ? [0.40, 0.40, 0.39]
      : (r.k >= 4 ? [0.36, 0.37, 0.39] : [0.32, 0.33, 0.35]);
    const y = 0.03 + r.k * 0.01;

    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      if (L < 0.2) continue;
      const ux = dx / L, uz = dz / L;
      const nx = -uz * (w / 2), nz = ux * (w / 2);

      // Main carriageway quad
      pos.push(x1 + nx, y, z1 + nz, x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz);
      uvs.push(0, 0, 1, 0, 0, L * 0.2, 1, L * 0.2);
      for (let k = 0; k < 4; k++) {
        const wear = (hash(x1 + k, z1) - 0.5) * 0.04;
        col.push(baseCol[0] + wear, baseCol[1] + wear, baseCol[2] + wear);
      }
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 4;

      // Export roadSegs as both array-compatible AND object properties {x1,z1,x2,z2,name,lanes,oneway,width}
      const segObj = [x1, z1, x2, z2, r.n || '', r.k, w];
      Object.assign(segObj, {
        x1, z1, x2, z2,
        name: r.n || '',
        kind: r.k,
        width: w,
        lanes: 1, // every road: one lane each way; divided corridors are one-way pairs
        oneway: is100Ft || isCMH,
        divided: is100Ft || isCMH
      });
      roadSegs.push(segObj);

      // 100 Feet Road: narrow 0.5m unpainted concrete central divider + transverse slab joint lines
      if (false && is100Ft) {
        const dw = 0.25, dh = 0.28;
        const dnx = -uz * dw, dnz = ux * dw;
        // Top & side faces of 0.5m concrete divider
        divPos.push(
          x1 + dnx, dh, z1 + dnz, x1 - dnx, dh, z1 - dnz,
          x2 + dnx, dh, z2 + dnz, x2 - dnx, dh, z2 - dnz
        );
        divIdx.push(divV, divV + 1, divV + 2, divV + 1, divV + 3, divV + 2);
        divV += 4;

      }
      if (false) {
        // no centre dashes: every carriageway is a single lane now
        for (let s = 2; s + 3.2 < L; s += 9) {
          const a = s / L, b = (s + 3) / L;
          const dnx2 = -uz * 0.12, dnz2 = ux * 0.12, dy2 = y + 0.012;
          dp.push(
            x1 + dx * a + dnx2, dy2, z1 + dz * a + dnz2,
            x1 + dx * a - dnx2, dy2, z1 + dz * a - dnz2,
            x1 + dx * b + dnx2, dy2, z1 + dz * b + dnz2,
            x1 + dx * b - dnx2, dy2, z1 + dz * b - dnz2
          );
          const fade2 = 0.7 + hash(s, z1) * 0.2;
          for (let k = 0; k < 4; k++) dCol.push(0.84 * fade2, 0.84 * fade2, 0.82 * fade2);
          di.push(dv, dv + 1, dv + 2, dv + 1, dv + 3, dv + 2);
          dv += 4;
        }
      } else if (r.k >= 2 && !is100Ft) {
        // Hand-painted faded broken centre line (two-way single lane each way)
        for (let s = 1.5; s + 2.5 < L; s += 7.5) {
          if (hash(x1 + s, z1) < 0.18) continue; // Occasional worn-out missing dash
          const a = s / L, b = (s + 2.4) / L;
          const dnx = -uz * 0.09, dnz = ux * 0.09, dy = y + 0.012;
          dp.push(
            x1 + dx * a + dnx, dy, z1 + dz * a + dnz,
            x1 + dx * a - dnx, dy, z1 + dz * a - dnz,
            x1 + dx * b + dnx, dy, z1 + dz * b + dnz,
            x1 + dx * b - dnx, dy, z1 + dz * b - dnz
          );
          const fade = 0.55 + hash(s, x1) * 0.28;
          const isYellow = r.k >= 4;
          for (let k = 0; k < 4; k++) {
            dCol.push(
              (isYellow ? 0.85 : 0.82) * fade,
              (isYellow ? 0.72 : 0.80) * fade,
              (isYellow ? 0.35 : 0.76) * fade
            );
          }
          di.push(dv, dv + 1, dv + 2, dv + 1, dv + 3, dv + 2);
          dv += 4;
        }
      }

      // Asphalt patch decals & potholes
      if (L > 12) {
        for (let s = 5; s < L - 4; s += 19) {
          const hr = hash(x1 + s, z1 - s);
          const px = x1 + ux * s - uz * ((hr - 0.5) * (w * 0.55));
          const pz = z1 + uz * s + ux * ((hr - 0.5) * (w * 0.55));
          if (hr < 0.28) {
            // Rectangular tar patch
            const pw = 1.1 + hr * 2.2, pl = 1.8 + hr * 3.0;
            const pnx = -uz * pw, pnz = ux * pw;
            const plx = ux * pl, plz = uz * pl;
            const py = y + 0.009;
            patchPos.push(
              px - plx + pnx, py, pz - plz + pnz,
              px - plx - pnx, py, pz - plz - pnz,
              px + plx + pnx, py, pz + plz + pnz,
              px + plx - pnx, py, pz + plz - pnz
            );
            const shade = is100Ft ? 0.34 : 0.22 + hr * 0.08;
            for (let k = 0; k < 4; k++) patchCol.push(shade, shade, shade + 0.01);
            patchIdx.push(patV, patV + 1, patV + 2, patV + 1, patV + 3, patV + 2);
            patV += 4;
          } else if (hr > 0.84 && potholeSpots.length < 260) {
            potholeSpots.push({ x: px, y: y + 0.014, z: pz, s: 0.75 + (hr - 0.84) * 4.5, rot: hr * 6.28 });
          }
        }
      }

      // Speed breakers at ~1 in 4 junction approaches on residential/collector roads
      if (r.k <= 4 && !is100Ft && L > 14 && i % 4 === 0 && hash(x1, z1) < 0.45) {
        const sbx = x1 + ux * 3.8, sbz = z1 + uz * 3.8;
        speedBreakers.push({ x: sbx, y: y, z: sbz, w: w * 0.92, yaw: Math.atan2(ux, uz) });
      }

      // Uneven footpaths with broken slab height & colour variation + parked bikes/cars & utility poles
      if (r.k >= 2) {
        const fw = r.k >= 4 ? 2.3 : 1.5;
        for (const s of [-1, 1]) {
          if (is100Ft && nbrSide.get(world.roads.indexOf(r) + ':' + i) === s) continue;
          const slabJitter = (hash(x1 * s, z1 + i) - 0.5) * 0.07;
          const fy = 0.16 + slabJitter;
          const inX = -uz * (w / 2) * s, inZ = ux * (w / 2) * s;
          const outX = -uz * (w / 2 + fw) * s, outZ = ux * (w / 2 + fw) * s;

          fpPos.push(
            x1 + inX, fy, z1 + inZ, x1 + outX, fy + slabJitter * 0.4, z1 + outZ,
            x2 + inX, fy, z2 + inZ, x2 + outX, fy - slabJitter * 0.4, z2 + outZ
          );
          const slabTone = 0.48 + (hash(i + s, x1) - 0.5) * 0.14;
          for (let k = 0; k < 4; k++) fpCol.push(slabTone + 0.02, slabTone, slabTone - 0.03);
          fpUvs.push(0, 0, 1, 0, 0, L * 0.5, 1, L * 0.5);
          fpIdx.push(fpV, fpV + 1, fpV + 2, fpV + 1, fpV + 3, fpV + 2);
          fpV += 4;

          kbPos.push(
            x1 + inX, 0.02, z1 + inZ, x1 + inX, fy, z1 + inZ,
            x2 + inX, 0.02, z2 + inZ, x2 + inX, fy, z2 + inZ
          );
          kbUvs.push(0, 0, 0, 1, L * 0.6, 0, L * 0.6, 1);
          kbIdx.push(kbV, kbV + 1, kbV + 2, kbV + 1, kbV + 3, kbV + 2);
          kbV += 4;
        }
      }

      // Collect parked bike/car spots, vendor spots, utility poles along road edges
      if (L > 14 && r.k >= 2) {
        const yaw = Math.atan2(ux, uz);
        for (let s = 6; s < L - 5; s += 13) {
          const side = hash(s, z1) > 0.5 ? 1 : -1;
          const edgeOff = (w / 2 - 0.55) * side;
          const kerbOff = (w / 2 + 1.35) * side;
          const px = x1 + ux * s - uz * edgeOff;
          const pz = z1 + uz * s + ux * edgeOff;
          const kx = x1 + ux * s - uz * kerbOff;
          const kz = z1 + uz * s + ux * kerbOff;

          if (Math.hypot(px - (-133), pz - (-345)) < 25) continue;

          const hVal = hash(px, pz);
          if (hVal < 0.26 && parkedSpots.length < 0 && !solid(px, pz)) {
            parkedSpots.push({
              x: px,
              z: pz,
              yaw: yaw + (hVal < 0.18 ? 0.35 * side : 0),
              type: hVal < 0.19 ? 'scooter' : 'car'
            });
          } else if (hVal > 0.86 && vendorSpots.length < 48 && !solid(kx, kz)) {
            vendorSpots.push({ x: kx, z: kz, yaw, roadName: r.n || 'Indiranagar' });
          }
        }

        if (r.k >= 3 && L > 20) {
          // narrowed 100Ft pair: the 1.2m median fits NO pole - flip median-side poles to the outer verge
          const medS = is100Ft ? (nbrSide.get(ri + ':' + i) || 0) : 0;
          const poleOff = (w / 2 + 0.9) * (medS > 0 ? -1 : 1);
          utilityPoles.push({ x: x1 - uz * poleOff, z: z1 + ux * poleOff, yaw });
        }
      }

      if (isCMH && L > 12) {
        cmhSegs.push([x1, z1, x2, z2, ri]);
        for (let s = 6; s < L; s += 26) cmhCands.push([x1 + ux * s, z1 + uz * s, Math.atan2(ux, uz), ri]);
      }
    }
  }

  for (const q of medianQuads) {
    const dh = 0.3;
    divPos.push(q[0], dh, q[1], q[2], dh, q[3], q[4], dh, q[5], q[6], dh, q[7]);
    divIdx.push(divV, divV + 1, divV + 2, divV + 1, divV + 3, divV + 2, divV, divV + 2, divV + 1, divV + 1, divV + 2, divV + 3);
    divV += 4;
  }

  // Build Road Mesh
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roadGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setIndex(idx);
  roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, createAsphaltMaterial());
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // Build 100 Feet Road Narrow 0.5m Concrete Divider
  if (divPos.length) {
    const divGeo = new THREE.BufferGeometry();
    divGeo.setAttribute('position', new THREE.Float32BufferAttribute(divPos, 3));
    divGeo.setIndex(divIdx);
    divGeo.computeVertexNormals();
    const divMesh = new THREE.Mesh(divGeo, new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.85 }));
    divMesh.castShadow = divMesh.receiveShadow = true;
    scene.add(divMesh);
  }

  // 100 Feet median containment: kerb edges at each carriageway + raised central divider strip
  const stripGeo = (list, halfW, h) => {
    const p = [], ix = []; let nv = 0;
    for (const [x1, z1, x2, z2] of list) {
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
      const nx = -dz / L * halfW, nz = dx / L * halfW;
      p.push(x1 + nx, h, z1 + nz, x1 - nx, h, z1 - nz, x2 + nx, h, z2 + nz, x2 - nx, h, z2 - nz);
      ix.push(nv, nv + 2, nv + 1, nv + 1, nv + 2, nv + 3); nv += 4;
      p.push(x1 + nx, 0.3, z1 + nz, x2 + nx, 0.3, z2 + nz, x1 + nx, h, z1 + nz, x2 + nx, h, z2 + nz);
      ix.push(nv, nv + 1, nv + 2, nv + 1, nv + 3, nv + 2); nv += 4;
      p.push(x1 - nx, 0.3, z1 - nz, x1 - nx, h, z1 - nz, x2 - nx, 0.3, z2 - nz, x2 - nx, h, z2 - nz);
      ix.push(nv, nv + 1, nv + 2, nv + 1, nv + 3, nv + 2); nv += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(ix); g.computeVertexNormals(); return g;
  };
  if (medianKerbs.length) {
    const kerbMesh = new THREE.Mesh(stripGeo(medianKerbs, 0.22, 0.42), new THREE.MeshStandardMaterial({ color: 0xcac6ba, roughness: 0.9, side: THREE.DoubleSide }));
    kerbMesh.castShadow = kerbMesh.receiveShadow = true;
    scene.add(kerbMesh);
    const stripMesh = new THREE.Mesh(stripGeo(medianStrips, 0.25, 0.55), new THREE.MeshStandardMaterial({ color: 0xa8a49a, roughness: 0.9, side: THREE.DoubleSide }));
    stripMesh.castShadow = stripMesh.receiveShadow = true;
    scene.add(stripMesh);
  }

  // Build Road Patches & Concrete Joint Lines
  if (patchPos.length) {
    const patGeo = new THREE.BufferGeometry();
    patGeo.setAttribute('position', new THREE.Float32BufferAttribute(patchPos, 3));
    patGeo.setAttribute('color', new THREE.Float32BufferAttribute(patchCol, 3));
    patGeo.setIndex(patchIdx);
    scene.add(new THREE.Mesh(patGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  }

  // Build Pothole Decal Quads
  if (false && potholeSpots.length) {
    const phMat = new THREE.MeshBasicMaterial({
      map: makePotholeTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });
    const phGeo = new THREE.PlaneGeometry(1.4, 1.4);
    phGeo.rotateX(-Math.PI / 2);
    const phInst = new THREE.InstancedMesh(phGeo, phMat, potholeSpots.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
    potholeSpots.forEach((p, i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
      m4.compose(v3.set(p.x, p.y, p.z), q4, s3.set(p.s, 1, p.s * 0.85));
      phInst.setMatrixAt(i, m4);
    });
    scene.add(phInst);
  }

  // Build Raised Striped Speed Breakers
  if (speedBreakers.length) {
    const sbMat = new THREE.MeshStandardMaterial({ map: makeSpeedBreakerTexture(), roughness: 0.85 });
    const sbGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.0, 10, 1, false, 0, Math.PI);
    sbGeo.rotateZ(Math.PI / 2);
    sbGeo.scale(1, 0.26, 1.2);
    const sbInst = new THREE.InstancedMesh(sbGeo, sbMat, speedBreakers.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
    speedBreakers.forEach((sb, i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), sb.yaw);
      m4.compose(v3.set(sb.x, sb.y, sb.z), q4, s3.set(sb.w, 1, 1));
      sbInst.setMatrixAt(i, m4);
    });
    sbInst.receiveShadow = true;
    scene.add(sbInst);
  }

  // Build Uneven Footpaths & Kerbs
  const fpGeo = new THREE.BufferGeometry();
  fpGeo.setAttribute('position', new THREE.Float32BufferAttribute(fpPos, 3));
  fpGeo.setAttribute('color', new THREE.Float32BufferAttribute(fpCol, 3));
  fpGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fpUvs, 2));
  fpGeo.setIndex(fpIdx);
  fpGeo.computeVertexNormals();
  const fpMat = createPavementMaterial();
  fpMat.vertexColors = true;
  const fpMesh = new THREE.Mesh(fpGeo, fpMat);
  fpMesh.receiveShadow = true;
  scene.add(fpMesh);

  const kbGeo = new THREE.BufferGeometry();
  kbGeo.setAttribute('position', new THREE.Float32BufferAttribute(kbPos, 3));
  kbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kbUvs, 2));
  kbGeo.setIndex(kbIdx);
  kbGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(kbGeo, createKerbMaterial()));

  // Faded Hand-Painted Centre Dashes
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  dg.setAttribute('color', new THREE.Float32BufferAttribute(dCol, 3));
  dg.setIndex(di);
  scene.add(new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // Instanced Parked Scooters & Cars along road edges
  const scooters = parkedSpots.filter(p => p.type === 'scooter');
  const parkedCars = parkedSpots.filter(p => p.type === 'car');
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);

  if (scooters.length) {
    const scBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.68, 1.35), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), scooters.length);
    const scSeat = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.18, 0.72), new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.8 }), scooters.length);
    const scPalette = [0xe2e8f0, 0x1e3a8a, 0x991b1b, 0x334155, 0x0284c7, 0xfacc15];
    const colC = new THREE.Color();
    scooters.forEach((p, i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
      m4.compose(v3.set(p.x, 0.42, p.z), q4, s3);
      scBody.setMatrixAt(i, m4);
      m4.compose(v3.set(p.x, 0.80, p.z - 0.1), q4, s3);
      scSeat.setMatrixAt(i, m4);
      colC.setHex(scPalette[i % scPalette.length]).multiplyScalar(0.8);
      scBody.setColorAt(i, colC);
    });
    scBody.castShadow = true;
    scene.add(scBody, scSeat);
  }

  if (parkedCars.length) {
    const pcHull = new THREE.InstancedMesh(new THREE.BoxGeometry(1.62, 0.68, 3.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.15 }), parkedCars.length);
    const pcCab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.44, 0.52, 1.75), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }), parkedCars.length);
    const carPalette = [0xcbd5e1, 0x475569, 0x991b1b, 0x1e40af, 0xf8fafc, 0x78350f];
    const colC = new THREE.Color();
    parkedCars.forEach((p, i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw);
      m4.compose(v3.set(p.x, 0.52, p.z), q4, s3);
      pcHull.setMatrixAt(i, m4);
      m4.compose(v3.set(p.x, 1.08, p.z - 0.1), q4, s3);
      pcCab.setMatrixAt(i, m4);
      colC.setHex(carPalette[i % carPalette.length]).multiplyScalar(0.74);
      pcHull.setColorAt(i, colC);
    });
    pcHull.castShadow = true;
    scene.add(pcHull, pcCab);
  }

  // BESCOM Utility Poles + Overhead Wire Swags
  if (utilityPoles.length) {
    const uPoleMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.85 });
    const uPoleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.11, 7.2, 6), uPoleMat, utilityPoles.length);
    const crossInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), uPoleMat, utilityPoles.length);
    const wirePts = [];

    utilityPoles.forEach((up, i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), up.yaw);
      m4.compose(v3.set(up.x, 3.6, up.z), q4, s3);
      uPoleInst.setMatrixAt(i, m4);
      m4.compose(v3.set(up.x, 6.9, up.z), q4, s3);
      crossInst.setMatrixAt(i, m4);

      if (i > 0) {
        const prev = utilityPoles[i - 1];
        const d = Math.hypot(up.x - prev.x, up.z - prev.z);
        if (d < 48) {
          for (let k = 0; k < 6; k++) {
            const t1 = k / 6, t2 = (k + 1) / 6;
            const sag1 = Math.sin(t1 * Math.PI) * 0.65;
            const sag2 = Math.sin(t2 * Math.PI) * 0.65;
            wirePts.push(
              prev.x + (up.x - prev.x) * t1, 6.85 - sag1, prev.z + (up.z - prev.z) * t1,
              prev.x + (up.x - prev.x) * t2, 6.85 - sag2, prev.z + (up.z - prev.z) * t2
            );
          }
        }
      }
    });
    scene.add(uPoleInst, crossInst);
    if (wirePts.length) {
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
      scene.add(new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ color: 0x1c1917 })));
    }
  }

  // Metro piers stand in the median between the two carriageways (each carriageway is its own OSM way),
  // never on a carriageway centreline. Each candidate is moved to the midpoint with the nearest opposite way.
  // point-to-polyline distance against every other drivable way (junction safety for portal columns)
  // distance to other drivable ways, ignoring the short paired segments near the two reference points
  const distToRoads = (x, z, refA, refB) => {
    let best = 1e9;
    world.roads.forEach((r) => {
      if (r.k < 2) return;
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, az] = r.p[i], [bx2, bz2] = r.p[i + 1];
        const mx2 = (ax + bx2) / 2, mz2 = (az + bz2) / 2;
        if (Math.hypot(mx2 - refA[0], mz2 - refA[1]) < 11 || Math.hypot(mx2 - refB[0], mz2 - refB[1]) < 11) continue;
        const dx = bx2 - ax, dz = bz2 - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
        if (d < best) best = d;
      }
    });
    return best;
  };
  for (const [cx, cz, yaw, rj] of cmhCands) {
    let bd = 1e9, bx = 0, bz = 0, bRi = -1;
    for (const [x1, z1, x2, z2, rk] of cmhSegs) {
      if (rk === rj) continue;
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cz - z1) * dz) / L2));
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(cx - px, cz - pz);
      if (d < bd) { bd = d; bx = px; bz = pz; bRi = rk; }
    }
    if (bd < 4 || bd > 22) continue; // no opposite carriageway nearby: no viaduct here
    const mx = (cx + bx) / 2, mz = (cz + bz) / 2;
    if (metroDecks.some(p => Math.hypot(p[0] - mx, p[1] - mz) < 20)) continue;
    metroDecks.push([mx, mz, yaw]);
    // direction from this carriageway to its opposite = across the median
    let px = bx - cx, pz = bz - cz; const pl = Math.hypot(px, pz) || 1; px /= pl; pz /= pl;
    const HWC = 2.4; // carriageway half-width for the CMH/100 Ft class roads (1 lane each)
    const medianGap = bd - 2 * HWC; // physical clear strip between the carriageway edges
    if (medianGap >= 2.4) {
      // genuine median: single slim central column wholly inside the median strip (>=0.3m clear of both carriageway edges)
      // - unless a third drivable way passes too close
      if (distToRoads(mx, mz, [cx, cz], [bx, bz]) >= 4.95) metroPiers.push([mx, mz, yaw, medianGap]);
      else metroDecks.pop();
    } else {
      // no real median: long-span the viaduct - no ground piers at all beside the lanes.
      // (portal columns hugging the carriageway edges were rejected as lane-side obstacles)
    }
  }

  // Namma Metro Purple Line Viaduct & Real Indiranagar Station from extras.station.pts
  const concMat = new THREE.MeshStandardMaterial({ color: 0xc2c7ce, roughness: 0.84 });
  const purpMat = makeNeonMaterial(0x7c3aed, 1.35);

  if (metroPiers.length) {
    const pierInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.6, 8.8, 12), concMat, metroPiers.length);
    const deckInst = new THREE.InstancedMesh(new THREE.BoxGeometry(8.6, 1.35, 27), concMat, metroDecks.length);
    const bandInst = new THREE.InstancedMesh(new THREE.BoxGeometry(8.8, 0.32, 27), purpMat, metroDecks.length);
    // Green median strip under the piers: concrete curb + grass top, kept >=0.3m clear of both
    // carriageway edges so both driving lanes stay visually and physically clear (user request:
    // pillars must sit inside a visible green strip, not read as 'in the middle of the road').
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.9 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3e7d32, roughness: 0.95 });
    const curbInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), curbMat, metroPiers.length);
    const grassInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), grassMat, metroPiers.length);
    const sc = new THREE.Vector3();
    metroPiers.forEach(([x, z, yaw, gap], i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m4.compose(v3.set(x, 4.4, z), q4, s3); pierInst.setMatrixAt(i, m4);
      const w = Math.max(1.6, Math.min(gap - 0.6, 2.2)); // strip width: inside the clear median, capped
      m4.compose(v3.set(x, 0.08, z), q4, sc.set(w + 0.24, 0.16, 25.9)); curbInst.setMatrixAt(i, m4);
      m4.compose(v3.set(x, 0.15, z), q4, sc.set(w, 0.14, 25.9)); grassInst.setMatrixAt(i, m4);
    });
    metroDecks.forEach(([x, z, yaw], i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m4.compose(v3.set(x, 9.2, z), q4, s3); deckInst.setMatrixAt(i, m4);
      m4.compose(v3.set(x, 9.25, z), q4, s3); bandInst.setMatrixAt(i, m4);
    });
    pierInst.castShadow = deckInst.castShadow = true;
    grassInst.receiveShadow = curbInst.receiveShadow = true;
    scene.add(pierInst, deckInst, bandInst, curbInst, grassInst);
  }

  // Build Indiranagar Metro Station from extras.station.pts (elevated on pillars so autos drive underneath)
  if (extras && extras.station && Array.isArray(extras.station.pts) && extras.station.pts.length >= 3) {
    const sPts = extras.station.pts;
    let scx = 0, scz = 0;
    sPts.forEach(p => { scx += p[0]; scz += p[1]; });
    scx /= sPts.length; scz /= sPts.length;

    const stShape = new THREE.Shape(sPts.map(p => new THREE.Vector2(p[0] - scx, -(p[1] - scz))));
    const stGroup = new THREE.Group();
    stGroup.position.set(scx, 0, scz);

    try {
      const concourseGeo = new THREE.ExtrudeGeometry(stShape, { depth: 4.6, bevelEnabled: false });
      concourseGeo.rotateX(-Math.PI / 2);
      const concourse = new THREE.Mesh(concourseGeo, concMat);
      concourse.position.y = 7.4; // 7.4m clear headroom for autos driving underneath
      concourse.castShadow = concourse.receiveShadow = true;
      stGroup.add(concourse);

      const canopyGeo = new THREE.ExtrudeGeometry(stShape, { depth: 1.4, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.3 });
      canopyGeo.rotateX(-Math.PI / 2);
      const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }));
      canopy.position.y = 12.2;
      stGroup.add(canopy);
    } catch {}

    // Green bed under the station support pillars too - user: EVERY pillar must sit fully on the green strip
    const stCurb = new THREE.Mesh(new THREE.BoxGeometry(44, 0.16, 3.6), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.9 }));
    stCurb.position.set(0, 0.08, 0); stCurb.receiveShadow = true; stGroup.add(stCurb);
    const stGrass = new THREE.Mesh(new THREE.BoxGeometry(44, 0.14, 3.2), new THREE.MeshStandardMaterial({ color: 0x3e7d32, roughness: 0.95 }));
    stGrass.position.set(0, 0.15, 0); stGrass.receiveShadow = true; stGroup.add(stGrass);
    // Support pillars & escalator/stair housings at sides
    for (let px = -18; px <= 18; px += 12) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 7.4, 14), concMat);
      pier.position.set(px, 3.7, 0);
      stGroup.add(pier);
    }
    for (const sz of [-11, 11]) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(7.5, 7.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 }));
      stair.position.set(-10, 3.7, sz);
      stair.rotation.z = 0;
      stGroup.add(stair);
    }

    const stSignTex = makeSign(
      'INDIRANAGAR',
      '#581c87',
      '#ffffff',
      '800 38px sans-serif',
      512,
      128,
      'NAMMA METRO PURPLE LINE',
      '#facc15'
    );
    const stSignMat = makeEmissiveSignMaterial(stSignTex, 1.9);
    for (const sideZ of [-10.5, 10.5]) {
      const sb = new THREE.Mesh(new THREE.BoxGeometry(14, 2.2, 0.35), stSignMat);
      sb.position.set(0, 9.8, sideZ);
      stGroup.add(sb);
    }
    scene.add(stGroup);
    let br = 0; sPts.forEach(pt => { br = Math.max(br, Math.hypot(pt[0] - scx, pt[1] - scz)); });
    bridgeVolumes.push({ x: scx, z: scz, r: br + 2, clearanceY: 7.4, poly: sPts.map(pt => [pt[0], pt[1]]) });
  }

  // Helper to check if a polyline spans a road
  function spansAnyRoad(pts) {
    if (!pts || pts.length < 2) return false;
    const mx = (pts[0][0] + pts[pts.length - 1][0]) * 0.5;
    const mz = (pts[0][1] + pts[pts.length - 1][1]) * 0.5;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      const L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((mx - s.x1) * dx + (mz - s.z1) * dz) / L2, 0, 1);
      if (Math.hypot(mx - (s.x1 + dx * t), mz - (s.z1 + dz * t)) < s.width + 6) return true;
    }
    return false;
  }

  // Foot Overbridges from extras.footbridges (4.5m clearance, steel mesh sides, stairs both ends, ad board)
  if (extras && Array.isArray(extras.footbridges)) {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.45 });
    const meshCageMat = new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: true });
    const adTex = makeSign('NAMMA INDIRANAGAR · DRIVE SAFE', '#1e3a8a', '#fde047', '800 36px sans-serif', 512, 96, 'USE PEDESTRIAN SKYWalk', '#ffffff');
    const adMat = makeEmissiveSignMaterial(adTex, 1.4);

    for (const fb of extras.footbridges) {
      if (!fb.pts || fb.pts.length < 2 || !spansAnyRoad(fb.pts)) continue;
      const p1 = fb.pts[0], p2 = fb.pts[fb.pts.length - 1];
      const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
      const span = Math.hypot(dx, dz);
      if (span < 5 || span > 65) continue;
      const mx = (p1[0] + p2[0]) * 0.5, mz = (p1[1] + p2[1]) * 0.5;
      const yaw = Math.atan2(dx, dz);

      const fbg = new THREE.Group();
      fbg.position.set(mx, 0, mz);
      fbg.rotation.y = yaw;

      // Elevated walkway deck at y = 4.65m (4.5m clear below)
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, span), concMat);
      deck.position.y = 4.65;
      deck.castShadow = true;
      const cage = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.1, span), meshCageMat);
      cage.position.y = 5.85;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, span + 0.4), steelMat);
      roof.position.y = 6.95;

      const ad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, Math.min(9, span * 0.65)), adMat);
      ad.position.set(1.3, 5.4, 0);
      fbg.add(deck, cage, roof, ad);

      // End support columns & stairs on both kerbs
      for (const s of [-1, 1]) {
        const endZ = (span * 0.5 + 0.8) * s;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.8, 10), steelMat);
        col.position.set(0, 2.4, endZ);
        const stair = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 6.2), steelMat);
        stair.position.set(1.4 * s, 2.35, endZ - 2.2 * s);
        stair.rotation.x = 0.68 * s;
        fbg.add(col, stair);
      }

      scene.add(fbg);
      bridgeVolumes.push({ x: mx, z: mz, r: span * 0.5 + 3, clearanceY: 4.5, rect: { x: mx, z: mz, yaw, halfLen: span * 0.5, halfW: 1.5 } });
    }
  }

  // Road Bridges (3rd Cross Road, Sai Baba Mandira Road): culvert-style low concrete parapet railings
  if (extras && Array.isArray(extras.roadBridges)) {
    const culvMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c9, roughness: 0.85 });
    for (const rb of extras.roadBridges) {
      if (!rb.pts || rb.pts.length < 2) continue;
      const p1 = rb.pts[0], p2 = rb.pts[rb.pts.length - 1];
      const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
      const len = Math.hypot(dx, dz);
      if (len < 3) continue;
      const mx = (p1[0] + p2[0]) * 0.5, mz = (p1[1] + p2[1]) * 0.5;
      const yaw = Math.atan2(dx, dz);

      const rbg = new THREE.Group();
      rbg.position.set(mx, 0, mz);
      rbg.rotation.y = yaw;
      for (const s of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.95, len), culvMat);
        wall.position.set(s * 4.4, 0.48, 0);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, len), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        stripe.position.set(s * 4.4, 0.82, 0);
        rbg.add(wall, stripe);
      }
      scene.add(rbg);
    }
  }

  // Under-Construction Flyover (Baiyappanahalli Rotary Flyover): unfinished pillars, rebar, deck stubs, orange barricades
  if (extras && extras.flyoverUC && Array.isArray(extras.flyoverUC.pts) && extras.flyoverUC.pts.length >= 2) {
    const fPts = extras.flyoverUC.pts;
    const ucGroup = new THREE.Group();
    const rebarMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7, metalness: 0.5 });
    const barrMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const ucSignTex = makeSign('WORK IN PROGRESS · BMRCL / BBMP', '#f97316', '#111111', '900 36px sans-serif', 512, 128, 'GO SLOW · TAKE DIVERSION', '#111111');
    const ucSignMat = makeEmissiveSignMaterial(ucSignTex, 1.2);

    for (let i = 0; i < fPts.length - 1; i++) {
      const [x1, z1] = fPts[i], [x2, z2] = fPts[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      if (L < 4) continue;
      const yaw = Math.atan2(dx, dz);

      for (let s = 8; s < L; s += 24) {
        const px = x1 + (dx * s) / L, pz = z1 + (dz * s) / L;
        const pg = new THREE.Group();
        pg.position.set(px, 0, pz);
        pg.rotation.y = yaw;

        const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 7.2, 12), concMat);
        pier.position.y = 3.6;
        pier.castShadow = true;
        pg.add(pier);

        // Exposed vertical steel rebar rods poking out the top
        for (let rx = -0.6; rx <= 0.6; rx += 0.4) {
          for (let rz = -0.6; rz <= 0.6; rz += 0.4) {
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 5), rebarMat);
            rod.position.set(rx, 7.9, rz);
            pg.add(rod);
          }
        }

        // Every second pillar has an unfinished T-cap deck stub
        if (i % 2 === 0) {
          const stub = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.5, 6.8), concMat);
          stub.position.y = 7.4;
          pg.add(stub);
        }

        // Ring of orange plastic construction barricades around pillar base
        for (const [bx, bz] of [[-2.4, 0], [2.4, 0], [0, -2.8], [0, 2.8]]) {
          const barr = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.45), barrMat);
          barr.position.set(bx, 0.5, bz);
          if (bx !== 0) barr.rotation.y = Math.PI / 2;
          pg.add(barr);
        }

        const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.12), ucSignMat);
        sign.position.set(0, 1.5, 2.9);
        pg.add(sign);

        ucGroup.add(pg);
      }
    }
    scene.add(ucGroup);
  }

  // Bangalore Canopy Trees strictly on verge
  function isInCarriageway(x, z) {
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const halfW = s.width * 0.5 + 1.6;
      if (x < Math.min(s.x1, s.x2) - halfW || x > Math.max(s.x1, s.x2) + halfW) continue;
      if (z < Math.min(s.z1, s.z2) - halfW || z > Math.max(s.z1, s.z2) + halfW) continue;
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1;
      const L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - s.x1) * dx + (z - s.z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (s.x1 + dx * t), z - (s.z1 + dz * t));
      if (d < halfW) return true;
    }
    return false;
  }

  const treeSpots = [];
  const CELL = 14;
  const treeGrid = new Set();

  for (const r of world.roads) {
    const rw = (r.n && r.n.includes('100 Feet')) ? W100 : ((r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'))) ? 4.8 : (widthMap[r.k] || 7.0));
    const fw = r.k >= 4 ? 2.3 : 1.5;
    const vergeOffset = rw * 0.5 + fw + 0.55;

    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      if (L < 14) continue;
      const ux = dx / L, uz = dz / L;

      for (let s = 7; s < L - 5; s += 16 + hash(x1 + s, z1) * 6) {
        for (const side of [-1, 1]) {
          if (hash(x1 * side, s) < 0.35) continue;
          const x = x1 + ux * s - uz * vergeOffset * side;
          const z = z1 + uz * s + ux * vergeOffset * side;

          const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
          let tooClose = false;
          for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
              if (treeGrid.has(`${gx + ox},${gz + oz}`)) tooClose = true;
            }
          }
          if (tooClose) continue;

          if (
            !solid(x, z) && !solid(x + 1.8, z) && !solid(x - 1.8, z) &&
            !solid(x, z + 1.8) && !solid(x, z - 1.8) && !isInCarriageway(x, z)
          ) {
            treeGrid.add(`${gx},${gz}`);
            treeSpots.push([x, z]);
          }
        }
      }
    }
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3d2e, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true });
  const trInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.30, 1.0, 6), trunkMat, treeSpots.length);

  const lobeGeo = new THREE.IcosahedronGeometry(1.0, 1);
  const lobe1 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);
  const lobe2 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);
  const lobe3 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);
  const lobe4 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);

  const colC = new THREE.Color();
  treeSpots.forEach(([x, z], i) => {
    const r = hash(x, z);
    const r2 = hash(z, x);
    const trunkH = 4.2 + r * 1.6;
    const crownR = 2.5 + r2 * 1.8;
    const crownBaseY = trunkH + 1.2;

    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, trunkH * 0.5, z), q4, new THREE.Vector3(1, trunkH, 1));
    trInst.setMatrixAt(i, m4);

    m4.compose(new THREE.Vector3(x, crownBaseY + 0.9, z), q4, new THREE.Vector3(crownR * 0.65, crownR * 0.48, crownR * 0.65));
    lobe1.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x - crownR * 0.36, crownBaseY + 0.25, z + crownR * 0.24), q4, new THREE.Vector3(crownR * 0.56, crownR * 0.42, crownR * 0.52));
    lobe2.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x + crownR * 0.38, crownBaseY + 0.35, z - crownR * 0.22), q4, new THREE.Vector3(crownR * 0.54, crownR * 0.40, crownR * 0.56));
    lobe3.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(x + (r - 0.5) * crownR * 0.3, crownBaseY + 0.45, z + crownR * 0.36), q4, new THREE.Vector3(crownR * 0.50, crownR * 0.38, crownR * 0.50));
    lobe4.setMatrixAt(i, m4);

    if (r < 0.10) colC.setHSL(0.03 + r2 * 0.025, 0.82, 0.46);
    else if (r < 0.183) colC.setHSL(0.12 + r2 * 0.02, 0.80, 0.48);
    else colC.setHSL(0.29 + (r - 0.18) * 0.06, 0.48, 0.26 + r2 * 0.09);

    lobe1.setColorAt(i, colC.clone().multiplyScalar(1.06));
    lobe2.setColorAt(i, colC);
    lobe3.setColorAt(i, colC.clone().multiplyScalar(0.92));
    lobe4.setColorAt(i, colC.clone().multiplyScalar(1.02));
  });

  trInst.castShadow = lobe1.castShadow = lobe2.castShadow = lobe3.castShadow = lobe4.castShadow = true;
  // old low-poly trees replaced by trees.js

  // Street Lamps
  for (const r of world.roads) {
    if (r.k < 3) continue;
    const rw = (r.n && r.n.includes('100 Feet')) ? W100 : ((r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'))) ? 4.8 : (widthMap[r.k] || 7.0));
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      for (let s = 6; s < L; s += 32) {
        const side = i % 2 ? 1 : -1;
        const off = (rw / 2 + 1.1) * side;
        const lx = x1 + (dx * s) / L - (dz / L) * off;
        const lz = z1 + (dz * s) / L + (dx / L) * off;
        const yaw = Math.atan2(-dz * side, dx * side);
        if (isInCarriageway(lx, lz)) continue;
        lampSpots.push({ x: lx + Math.cos(yaw) * 1.1, z: lz - Math.sin(yaw) * 1.1, poleX: lx, poleZ: lz, yaw, h: 6.05 });
      }
    }
  }

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.5, metalness: 0.6 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffc878 });

  const poleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 6.2, 6), poleMat, lampSpots.length);
  const armInst  = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), poleMat, lampSpots.length);
  const headInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.12, 0.25), headMat, lampSpots.length);

  lampSpots.forEach((sp, i) => {
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), sp.yaw);
    m4.compose(new THREE.Vector3(sp.poleX, 3.1, sp.poleZ), q4, new THREE.Vector3(1, 1, 1));
    poleInst.setMatrixAt(i, m4);

    const ax = sp.poleX + Math.cos(sp.yaw) * 0.55, az = sp.poleZ - Math.sin(sp.yaw) * 0.55;
    m4.compose(new THREE.Vector3(ax, 6.1, az), q4, new THREE.Vector3(1, 1, 1));
    armInst.setMatrixAt(i, m4);

    m4.compose(new THREE.Vector3(sp.x, sp.h, sp.z), q4, new THREE.Vector3(1, 1, 1));
    headInst.setMatrixAt(i, m4);
  });

  scene.add(poleInst, armInst, headInst);
  return {
    medianQuads,
    roadSegs,
    lampHead: headInst,
    lampSpots,
    vendorSpots,
    parkedSpots,
    bridgeVolumes,
    speedBreakers,
    metroPiers,
    gantry: gantryRef
  };
               }
