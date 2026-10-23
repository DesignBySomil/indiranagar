// src/buildingsHQ.js
import * as THREE from 'three';
import { nightUniform, makeSign, makeEmissiveSignMaterial } from './materials.js';

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const SHOP_BILINGUAL_TITLES = [
  { kannada: '', eng: 'Sri Lakshmi Stores', sub: 'PROVISIONS & GENERAL' },
  { kannada: '', eng: 'Amrut Medicals', sub: '24/7 CHEMIST & PHARMA' },
  { kannada: '', eng: 'Raghu Tailor', sub: 'ALTERATIONS & DRESSMAKING' },
  { kannada: '', eng: 'Mysore Bakery', sub: 'FRESH BUNS & DILKHUSH' },
  { smart: '', eng: 'Swastik Salon', sub: 'HAIR CUTTING & SHAVE' },
  { kannada: '', eng: 'Srinivasa Mobiles', sub: 'REPAIRS & RECHARGE' },
  { kannada: '', eng: 'Mallige Flowers', sub: 'FRESH JASMINE GARLANDS' },
  { kannada: '', eng: 'Nagaraja Stationery', sub: 'NOTEBOOKS & XEROX' }
];

function makeShopSignCanvas(kannada, eng, sub) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = '#fef08a';
  ctx.font = '700 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kannada || '', 256, 34);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px sans-serif';
  ctx.fillText(eng || '', 256, 68);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 18px sans-serif';
  ctx.fillText(sub || '', 256, 102);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


const SIGN_BG = ['#0f3d2e', '#7a1f1f', '#14305c', '#5a2d82', '#8a5a00', '#0b5563', '#2b2b2b', '#a3341c'];
function makeColouredSign(i) {
  const t = SHOP_BILINGUAL_TITLES[i % SHOP_BILINGUAL_TITLES.length];
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = SIGN_BG[i % SIGN_BG.length];
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#fde047'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 500, 148);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff'; ctx.font = '800 46px sans-serif'; ctx.fillText(t.eng, 256, 72);
  ctx.fillStyle = '#7dd3fc'; ctx.font = '600 22px sans-serif'; ctx.fillText(t.sub, 256, 122);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
function makeShutterTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5b6470'; ctx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 8) { ctx.fillStyle = y % 16 ? '#4a525c' : '#69727e'; ctx.fillRect(0, y, 128, 5); }
  ctx.fillStyle = '#22262c'; ctx.fillRect(54, 232, 20, 8);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

export function upgradeBuildingFacades({ THREE: T = THREE, landmarks = [], scene, world, roadSegs = [], solidFn = () => 0, nightUniform, getAuto }) {
  const group = new T.Group();
  scene.add(group);

  // Instanced pool capacity for high-detail road-facing facade elements
  const MAX_INSTANCES = 3500;
  const matConcrete = new T.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.82 });
  const matIron = new T.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.7, metalness: 0.1 });
  const matAc = new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
  const matTank = new T.MeshStandardMaterial({ color: 0x8d979c, roughness: 0.6 });

  // 1. Balconies (slab + railing)
  const balcGeo = T.BufferGeometryUtils ? null : new T.BoxGeometry(1.8, 0.18, 0.9);
  // We can merge slab + railing or use two instanced meshes
  const balcSlabInst = new T.InstancedMesh(new T.BoxGeometry(1.8, 0.16, 0.9), matConcrete, MAX_INSTANCES);
  const balcRailInst = new T.InstancedMesh(new T.BoxGeometry(1.8, 0.72, 0.05), matIron, MAX_INSTANCES);

  // 2. AC Outdoor Units & Chajjas
  const acInst = new T.InstancedMesh(new T.BoxGeometry(0.85, 0.52, 0.45), matAc, MAX_INSTANCES);
  const chajjaInst = new T.InstancedMesh(new T.BoxGeometry(1.8, 0.12, 0.65), matConcrete, MAX_INSTANCES);

  // 3. Rooftop Tanks & Parapet Cornices
  const tankInst = new T.InstancedMesh(new T.CylinderGeometry(0.82, 0.82, 1.5, 12), matTank, 600);
  const corniceInst = new T.InstancedMesh(new T.BoxGeometry(2.0, 0.22, 0.25), matConcrete, MAX_INSTANCES);

  // 4. Shopfronts: coloured bilingual signboards (8 designs) and roller shutters on ground floors
  const NSIGN = SHOP_BILINGUAL_TITLES.length;
  const signInsts = [];
  for (let i = 0; i < NSIGN; i++) {
    const tex = makeColouredSign(i);
    const m = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new T.Color(0xffffff), emissiveIntensity: 0.28, roughness: 0.6 });
    const im = new T.InstancedMesh(new T.BoxGeometry(2.6, 0.8, 0.12), m, 500);
    im.frustumCulled = false; im.count = 0; signInsts.push(im); group.add(im);
  }
  const shutTex = makeShutterTexture();
  const shutterInst = new T.InstancedMesh(new T.BoxGeometry(2.3, 2.5, 0.07), new T.MeshStandardMaterial({ map: shutTex, roughness: 0.55, metalness: 0.4 }), 3500);
  shutterInst.frustumCulled = false; shutterInst.count = 0; group.add(shutterInst);
  const yAxisS = new T.Vector3(0, 1, 0);

  balcSlabInst.castShadow = balcRailInst.castShadow = acInst.castShadow = chajjaInst.castShadow = tankInst.castShadow = true;
  group.add(balcSlabInst, balcRailInst, acInst, chajjaInst, tankInst, corniceInst);

  let lastPlayerX = -999, lastPlayerZ = -999;
  let timeAccum = 1.0; // force immediate build on start

  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3 = new T.Vector3(), s3 = new T.Vector3(1, 1, 1);

  function rebuildDecorations(px, pz) {
    let bCount = 0, aCount = 0, cCount = 0, tCount = 0, cornCount = 0;
    const sgC = new Array(NSIGN).fill(0); let shC = 0;
    balcSlabInst.count = 0; balcRailInst.count = 0; acInst.count = 0; chajjaInst.count = 0; tankInst.count = 0; corniceInst.count = 0;

    const buildings = world && world.buildings ? world.buildings : [];
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const pts = b.p;
      if (!pts || pts.length < 3) continue;

      // Compute building stats exactly as city.js does
      let area = 0, cx = 0, cz = 0;
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j], q = pts[(j + 1) % pts.length];
        area += p[0] * q[1] - q[0] * p[1];
        cx += p[0]; cz += p[1];
      }
      area = Math.abs(area) / 2;
      if (area < 12) continue;
      cx /= pts.length; cz /= pts.length;
      { let ov = false; for (const lm of landmarks) { if (Math.hypot(cx - lm.x, cz - lm.z) < 13.5) { ov = true; break; } } if (ov) continue; }

      if (Math.hypot(cx - px, cz - pz) > 90) continue;

      const r = hash(cx, cz);
      const floors = 2 + Math.floor(r * 3.5) + (area > 380 ? 1 : 0);
      const h = b.h ? Math.max(6.8, b.h) : floors * 3.3;

      // Evaluate road-facing edges
      for (let j = 0; j < pts.length - 1; j++) {
        const x1 = pts[j][0], z1 = pts[j][1];
        const x2 = pts[j + 1][0], z2 = pts[j + 1][1];
        const edx = x2 - x1, edz = z2 - z1;
        const eLen = Math.hypot(edx, edz);
        if (eLen < 4.0) continue;

        const mx = (x1 + x2) * 0.5, mz = (z1 + z2) * 0.5;

        // Check proximity to any road segment (within 22m)
        let nearRoad = false;
        for (let k = 0; k < roadSegs.length; k++) {
          const s = roadSegs[k];
          const rx1 = s.x1 ?? s[0], rz1 = s.z1 ?? s[1], rx2 = s.x2 ?? s[2], rz2 = s.z2 ?? s[3];
          const rdx = rx2 - rx1, rdz = rz2 - rz1;
          const rL2 = rdx * rdx + rdz * rdz || 1;
          const t = T.MathUtils.clamp(((mx - rx1) * rdx + (mz - rz1) * rdz) / rL2, 0, 1);
          if (Math.hypot(mx - (rx1 + rdx * t), mz - (rz1 + rdz * t)) < 22.0) {
            nearRoad = true;
            break;
          }
        }
        if (!nearRoad) continue;

        // Outward normal vector (perpendicular to edge pointing away from centroid)
        const dirX = edx / eLen, dirZ = edz / eLen;
        let nx = -dirZ, nz = dirX;
        const toCentroidX = cx - mx, toCentroidZ = cz - mz;
        if (nx * toCentroidX + nz * toCentroidZ > 0) {
          nx = -nx; nz = -nz;
        }
        const edgeYaw = Math.atan2(dirX, dirZ);
        q4.setFromAxisAngle(new T.Vector3(0, 1, 0), edgeYaw);

        // Add parapet cornice & roof water tank on top edge
        if (cornCount < MAX_INSTANCES) {
          for (let sPos = 1.2; sPos < eLen - 1.0; sPos += 2.0) {
            const pxCoord = x1 + dirX * sPos + nx * 0.12;
            const pzCoord = z1 + dirZ * sPos + nz * 0.12;
            v3.set(pxCoord, h + 0.15, pzCoord);
            m4.compose(v3, q4, s3);
            corniceInst.setMatrixAt(cornCount++, m4);
          }
        }

        if (area > 50 && r > 0.32 && tCount < 60) {
          v3.set(mx + nx * 1.2, h + 0.85, mz + nz * 1.2);
          m4.compose(v3, q4, s3.set(1, 1, 1));
          tankInst.setMatrixAt(tCount++, m4);
        }

        // Ground-floor shopfronts: signboards, projecting boards and roller shutters
        {
          const yawN = Math.atan2(nx, nz);
          for (let sd = 1.6; sd < eLen - 1.6; sd += 3.1) {
            const gx = x1 + dirX * sd + nx * 0.16, gz = z1 + dirZ * sd + nz * 0.16;
            const hh = hash(gx * 1.3, gz * 0.7);
            if (hh < 0.12) continue;
            const ti = Math.floor(hash(gz, gx) * NSIGN) % NSIGN;
            if (sgC[ti] < 500) {
              q4.setFromAxisAngle(yAxisS, yawN);
              v3.set(gx, 3.05, gz);
              m4.compose(v3, q4, s3.set(1, 1, 1));
              signInsts[ti].setMatrixAt(sgC[ti]++, m4);
            }
            if (hh > 0.45 && shC < 3500) {
              q4.setFromAxisAngle(yAxisS, yawN);
              v3.set(gx - nx * 0.04, 1.25, gz - nz * 0.04);
              m4.compose(v3, q4, s3.set(1, 1, 1));
              shutterInst.setMatrixAt(shC++, m4);
            }
            if (hh > 0.7) {
              const ti2 = (ti + 3) % NSIGN;
              if (sgC[ti2] < 500) {
                q4.setFromAxisAngle(yAxisS, yawN + Math.PI / 2);
                v3.set(gx + nx * 0.5 + dirX * 1.3, 3.5, gz + nz * 0.5 + dirZ * 1.3);
                m4.compose(v3, q4, s3.set(0.4, 0.4, 1));
                signInsts[ti2].setMatrixAt(sgC[ti2]++, m4);
              }
            }
          }
        }

        // Add balconies and AC units on upper floors (floors 2+)
        const bayWidth = 2.4;
        const bays = Math.floor(eLen / bayWidth);
        for (let bay = 0; bay < bays; bay++) {
          const bayDist = (bay + 0.5) * bayWidth;
          const bx = x1 + dirX * bayDist + nx * 0.45;
          const bz = z1 + dirZ * bayDist + nz * 0.45;

          for (let f = 1; f < floors; f++) {
            const fy = 3.3 + f * 3.3;
            const bayHash = hash(bx + f, bz + bay);
            if (fy + 1.2 > h) continue;

            if (bayHash > 0.45 && bCount < MAX_INSTANCES) {
              v3.set(bx + nx * 0.45, fy - 0.45, bz + nz * 0.45);
              m4.compose(v3, q4, s3);
              balcSlabInst.setMatrixAt(bCount++, m4);
              v3.set(bx + nx * 0.85, fy - 0.05, bz + nz * 0.85);
              m4.compose(v3, q4, s3);
              balcRailInst.setMatrixAt(bCount++, m4);
            } else if (bayHash <= 0.45 && aCount < MAX_INSTANCES) {
              v3.set(bx + nx * 0.28, fy - 0.25, bz + nz * 0.28);
              m4.compose(v3, q4, s3);
              acInst.setMatrixAt(aCount++, m4);
              v3.set(bx + nx * 0.32, fy + 0.22, bz + nz * 0.32);
              m4.compose(v3, q4, s3);
              chajjaInst.setMatrixAt(cCount++, m4);
            }
          }
        }
      }
    }

    for (let i = 0; i < NSIGN; i++) { signInsts[i].count = sgC[i]; signInsts[i].instanceMatrix.needsUpdate = true; }
    shutterInst.count = shC; shutterInst.instanceMatrix.needsUpdate = true;
    balcSlabInst.count = bCount;
    balcRailInst.count = bCount;
    acInst.count = aCount;
    chajjaInst.count = cCount;
    tankInst.count = 0;
    corniceInst.count = cornCount;

    balcSlabInst.instanceMatrix.needsUpdate = true;
    balcRailInst.instanceMatrix.needsUpdate = true;
    acInst.instanceMatrix.needsUpdate = true;
    chajjaInst.instanceMatrix.needsUpdate = true;
    tankInst.instanceMatrix.needsUpdate = true;
    corniceInst.instanceMatrix.needsUpdate = true;
  }

  function update(dt = 0.016) {
    timeAccum += dt;
    if (timeAccum < 1.0) return;

    const p = getAuto ? getAuto() : { x: 0, z: 0 };
    if (Math.hypot(p.x - lastPlayerX, p.z - lastPlayerZ) > 8.0) {
      lastPlayerX = p.x;
      lastPlayerZ = p.z;
      timeAccum = 0.0;
      rebuildDecorations(p.x, p.z);
    }
  }

  // Initial build
  rebuildDecorations(0, 0);

  return { group, update };
}
