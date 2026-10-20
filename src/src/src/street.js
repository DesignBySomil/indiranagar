// src/street.js
import * as THREE from 'three';
import { createAsphaltMaterial, createPavementMaterial, createKerbMaterial, makeSign, makeEmissiveSignMaterial, makeNeonMaterial } from './materials.js';

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function buildStreet(world, scene, nightUniform, solidFn) {
  const roadSegs = [];
  const solid = solidFn || (() => 0);

  // Visible dusty green/tan Bangalore ground plane (#6b705a)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b705a, roughness: 0.92, metalness: 0.0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const width = { 5: 17, 4: 13, 3: 9, 2: 6.5, 1: 4.5 };
  // Clear mid-dark grey asphalt (~#4b4e53 lit) with 100 Feet Road (rank 5) slightly lighter
  const colors = {
    5: [0.43, 0.45, 0.48],
    4: [0.38, 0.40, 0.43],
    3: [0.35, 0.37, 0.40],
    2: [0.33, 0.35, 0.38],
    1: [0.31, 0.33, 0.36]
  };

  const pos = [], col = [], uvs = [], idx = [];
  const fpPos = [], fpUvs = [], fpIdx = [];
  const kbPos = [], kbUvs = [], kbIdx = [];
  const dp = [], di = [];
  const zp = [], zi = [];
  const medians = [];
  const metroPiers = [];

  let v = 0, fpV = 0, kbV = 0, dv = 0, zv = 0;

  for (const r of world.roads) {
    const w = width[r.k] || 6;
    const c = colors[r.k] || colors[2];
    const y = 0.03 + r.k * 0.012;
    const isCMH = r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'));
    const is100Ft = r.n && r.n.includes('100 Feet');

    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      if (L < 0.1) continue;
      const ux = dx / L, uz = dz / L;
      const nx = -uz * (w / 2), nz = ux * (w / 2);

      // Asphalt surface (uv.x 0..1 across width so edge dust shader works cleanly)
      pos.push(x1 + nx, y, z1 + nz, x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz);
      uvs.push(0, 0, 1, 0, 0, L * 0.2, 1, L * 0.2);
      for (let k = 0; k < 4; k++) col.push(...c);
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 4;
      roadSegs.push([x1, z1, x2, z2, r.n, r.k, w]);

      // Raised footpaths + kerbs on Rank >= 3 roads
      if (r.k >= 3) {
        const fw = r.k >= 4 ? 2.4 : 1.6;
        const fy = 0.18;
        for (const s of [-1, 1]) {
          const inX = -uz * (w / 2) * s, inZ = ux * (w / 2) * s;
          const outX = -uz * (w / 2 + fw) * s, outZ = ux * (w / 2 + fw) * s;
          fpPos.push(
            x1 + inX, fy, z1 + inZ, x1 + outX, fy, z1 + outZ,
            x2 + inX, fy, z2 + inZ, x2 + outX, fy, z2 + outZ
          );
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

      // Center lane dashes on main roads
      if (r.k >= 3) {
        for (let s = 0; s + 2.5 < L; s += 6.5) {
          const a = s / L, b = (s + 2.8) / L;
          const dnx = -uz * 0.13, dnz = ux * 0.13, dy = y + 0.02;
          dp.push(
            x1 + dx * a + dnx, dy, z1 + dz * a + dnz,
            x1 + dx * a - dnx, dy, z1 + dz * a - dnz,
            x1 + dx * b + dnx, dy, z1 + dz * b + dnz,
            x1 + dx * b - dnx, dy, z1 + dz * b - dnz
          );
          di.push(dv, dv + 1, dv + 2, dv + 1, dv + 3, dv + 2);
          dv += 4;
        }

        // Zebra crossings
        if (r.k >= 4 && i % 4 === 0 && L > 14) {
          const zOff = 2.5 / L;
          const zx = x1 + dx * zOff, zz = z1 + dz * zOff;
          for (let st = -w * 0.38; st <= w * 0.38; st += 1.1) {
            const sx = zx - uz * st, sz = zz + ux * st;
            const bwx = -uz * 0.28, bwz = ux * 0.28;
            const blx = ux * 1.4, blz = uz * 1.4;
            const zy = y + 0.025;
            zp.push(
              sx - blx + bwx, zy, sz - blz + bwz,
              sx - blx - bwx, zy, sz - blz - bwz,
              sx + blx + bwx, zy, sz + blz + bwz,
              sx + blx - bwx, zy, sz + blz - bwz
            );
            zi.push(zv, zv + 1, zv + 2, zv + 1, zv + 3, zv + 2);
            zv += 4;
          }
        }
      }

      // 100 Feet Road planter medians
      if (is100Ft && L > 18) {
        for (let s = 9; s + 9 < L; s += 22) {
          medians.push([x1 + ux * s, z1 + uz * s, Math.atan2(ux, uz)]);
        }
      }

      // Namma Metro Purple Line corridor along CMH Road
      if (isCMH && L > 12) {
        for (let s = 6; s < L; s += 26) {
          metroPiers.push([x1 + ux * s, z1 + uz * s, Math.atan2(ux, uz)]);
        }
      }
    }
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

  // Build Footpaths & Kerbs
  const fpGeo = new THREE.BufferGeometry();
  fpGeo.setAttribute('position', new THREE.Float32BufferAttribute(fpPos, 3));
  fpGeo.setAttribute('uv', new THREE.Float32BufferAttribute(fpUvs, 2));
  fpGeo.setIndex(fpIdx);
  fpGeo.computeVertexNormals();
  const fpMesh = new THREE.Mesh(fpGeo, createPavementMaterial());
  fpMesh.receiveShadow = true;
  scene.add(fpMesh);

  const kbGeo = new THREE.BufferGeometry();
  kbGeo.setAttribute('position', new THREE.Float32BufferAttribute(kbPos, 3));
  kbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kbUvs, 2));
  kbGeo.setIndex(kbIdx);
  kbGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(kbGeo, createKerbMaterial()));

  // Markings & Zebra Crossings
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  dg.setIndex(di);
  scene.add(new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: 0xf2d06b, side: THREE.DoubleSide })));

  const zg = new THREE.BufferGeometry();
  zg.setAttribute('position', new THREE.Float32BufferAttribute(zp, 3));
  zg.setIndex(zi);
  scene.add(new THREE.Mesh(zg, new THREE.MeshBasicMaterial({ color: 0xf4f6f8, side: THREE.DoubleSide })));

  // 100 Feet Road Planter Medians
  if (medians.length) {
    const medKerb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.35, 12), createKerbMaterial(), medians.length);
    const medShrub = new THREE.InstancedMesh(new THREE.BoxGeometry(0.65, 0.65, 11.2), new THREE.MeshStandardMaterial({ color: 0x3b7a40, roughness: 0.88 }), medians.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    medians.forEach(([x, z, yaw], i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m4.compose(v3.set(x, 0.18, z), q4, s3); medKerb.setMatrixAt(i, m4);
      m4.compose(v3.set(x, 0.55, z), q4, s3); medShrub.setMatrixAt(i, m4);
    });
    scene.add(medKerb, medShrub);
  }

  // Namma Metro Purple Line Viaduct & Pillars along CMH Road
  if (metroPiers.length) {
    const concMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.82 });
    const purpMat = makeNeonMaterial(0x7c3aed, 1.2);
    const pierInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.95, 1.1, 8.8, 12), concMat, metroPiers.length);
    const deckInst = new THREE.InstancedMesh(new THREE.BoxGeometry(8.6, 1.35, 27), concMat, metroPiers.length);
    const bandInst = new THREE.InstancedMesh(new THREE.BoxGeometry(8.8, 0.32, 27), purpMat, metroPiers.length);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1);
    metroPiers.forEach(([x, z, yaw], i) => {
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m4.compose(v3.set(x, 4.4, z), q4, s3); pierInst.setMatrixAt(i, m4);
      m4.compose(v3.set(x, 9.2, z), q4, s3); deckInst.setMatrixAt(i, m4);
      m4.compose(v3.set(x, 9.25, z), q4, s3); bandInst.setMatrixAt(i, m4);
    });
    pierInst.castShadow = deckInst.castShadow = true;
    scene.add(pierInst, deckInst, bandInst);
  }

  // Helper to ensure trees never sit inside ANY carriageway (including intersecting side roads)
  function isInCarriageway(x, z) {
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const halfW = s[6] * 0.5 + 1.15;
      if (x < Math.min(s[0], s[2]) - halfW || x > Math.max(s[0], s[2]) + halfW) continue;
      if (z < Math.min(s[1], s[3]) - halfW || z > Math.max(s[1], s[3]) + halfW) continue;
      const dx = s[2] - s[0], dz = s[3] - s[1];
      const L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (s[0] + dx * t), z - (s[1] + dz * t));
      if (d < halfW) return true;
    }
    return false;
  }

  // Bangalore Street Trees: strictly on verge between footpath & building, >= 14m spacing, trunk 4-6m, crown radius 2.5-4.5m, total height 8-11m
  const treeSpots = [];
  const CELL = 14;
  const treeGrid = new Set();

  for (const r of world.roads) {
    const rw = width[r.k] || 6;
    const fw = r.k >= 4 ? 2.4 : (r.k >= 3 ? 1.6 : 1.0);
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

          // Enforce >= 14m spacing globally
          const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
          let tooClose = false;
          for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
              if (treeGrid.has(`${gx + ox},${gz + oz}`)) tooClose = true;
            }
          }
          if (tooClose) continue;

          // Never in carriageway and never inside a building footprint
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

  // Multi-cluster low-poly canopy (4 overlapping icosahedron lobes per tree, trunk 4-6m, crown radius 2.5-4.5m, total height 8-11m)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3d2e, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true });
  const trInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.30, 1.0, 6), trunkMat, treeSpots.length);

  const lobeGeo = new THREE.IcosahedronGeometry(1.0, 1);
  const lobe1 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);
  const lobe2 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);
  const lobe3 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);
  const lobe4 = new THREE.InstancedMesh(lobeGeo, crownMat, treeSpots.length);

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), colC = new THREE.Color();
  treeSpots.forEach(([x, z], i) => {
    const r = hash(x, z);
    const r2 = hash(z, x);

    // Trunk 4.0m to 5.8m tall; Crown radius 2.5m to 4.3m; Total height 8.0m to 10.8m
    const trunkH = 4.2 + r * 1.6;
    const crownR = 2.5 + r2 * 1.8;
    const crownBaseY = trunkH + 1.2;

    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, trunkH * 0.5, z), q4, new THREE.Vector3(1, trunkH, 1));
    trInst.setMatrixAt(i, m4);

    // 4 overlapping organic canopy clusters with small scale & height variation
    m4.compose(
      new THREE.Vector3(x, crownBaseY + 0.9, z),
      q4,
      new THREE.Vector3(crownR * 0.65, crownR * 0.48, crownR * 0.65)
    );
    lobe1.setMatrixAt(i, m4);

    m4.compose(
      new THREE.Vector3(x - crownR * 0.36, crownBaseY + 0.25, z + crownR * 0.24),
      q4,
      new THREE.Vector3(crownR * 0.56, crownR * 0.42, crownR * 0.52)
    );
    lobe2.setMatrixAt(i, m4);

    m4.compose(
      new THREE.Vector3(x + crownR * 0.38, crownBaseY + 0.35, z - crownR * 0.22),
      q4,
      new THREE.Vector3(crownR * 0.54, crownR * 0.40, crownR * 0.56)
    );
    lobe3.setMatrixAt(i, m4);

    m4.compose(
      new THREE.Vector3(x + (r - 0.5) * crownR * 0.3, crownBaseY + 0.45, z + crownR * 0.36),
      q4,
      new THREE.Vector3(crownR * 0.50, crownR * 0.38, crownR * 0.50)
    );
    lobe4.setMatrixAt(i, m4);

    // Foliage colours: ~1 in 10 Gulmohar red-orange, ~1 in 12 Copper-pod yellow, rest deep Bangalore greens
    if (r < 0.10) {
      colC.setHSL(0.03 + r2 * 0.025, 0.82, 0.46); // Gulmohar red-orange
    } else if (r < 0.183) {
      colC.setHSL(0.12 + r2 * 0.02, 0.80, 0.48);  // Copper-pod golden yellow
    } else {
      colC.setHSL(0.29 + (r - 0.18) * 0.06, 0.48, 0.26 + r2 * 0.09); // Deep rich greens
    }

    lobe1.setColorAt(i, colC.clone().multiplyScalar(1.06));
    lobe2.setColorAt(i, colC);
    lobe3.setColorAt(i, colC.clone().multiplyScalar(0.92));
    lobe4.setColorAt(i, colC.clone().multiplyScalar(1.02));
  });

  trInst.castShadow = lobe1.castShadow = lobe2.castShadow = lobe3.castShadow = lobe4.castShadow = true;
  scene.add(trInst, lobe1, lobe2, lobe3, lobe4);

  // Curved Street Lamps + Ground Light Pools + BMTC Bus Stops + Chai/Flower Stalls
  const lampSpots = [];
  const propsGroup = new THREE.Group();
  const bbGreenTex = makeSign('100 FEET ROAD · ಇಂದಿರಾನಗರ', '#14532d', '#ffffff', '700 32px sans-serif', 512, 96, 'BBMP · INDIRANAGAR', '#ffffff');
  const bbGreenMat = makeEmissiveSignMaterial(bbGreenTex, 0.8);
  const chaiTex = makeSign('GARMA GARAM CHAI & BUN MASKA', '#b45309', '#fef08a', '800 32px sans-serif', 256, 64);
  const chaiMat = makeEmissiveSignMaterial(chaiTex, 1.4);

  for (const r of world.roads) {
    if (r.k < 3) continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      for (let s = 6; s < L; s += 32) {
        const side = i % 2 ? 1 : -1;
        const off = ((width[r.k] || 9) / 2 + 1.1) * side;
        const lx = x1 + (dx * s) / L - (dz / L) * off;
        const lz = z1 + (dz * s) / L + (dx / L) * off;
        const yaw = Math.atan2(-dz * side, dx * side);
        lampSpots.push([lx, lz, yaw]);

        if (propsGroup.children.length < 95 && hash(lx, lz) > 0.82 && !solid(lx, lz) && !isInCarriageway(lx, lz)) {
          const g = new THREE.Group();
          g.position.set(lx, 0, lz);
          g.rotation.y = yaw;
          const kind = hash(lz, lx);
          if (kind < 0.35 && r.k >= 4) {
            const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 4.2), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
            roof.position.y = 2.5;
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 4.0), new THREE.MeshStandardMaterial({ color: 0x334155 }));
            back.position.set(-0.7, 1.25, 0);
            g.add(roof, back);
          } else if (kind < 0.7) {
            const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.8), new THREE.MeshStandardMaterial({ color: 0x2563eb }));
            counter.position.y = 0.5;
            const tarp = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 4), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
            tarp.position.y = 2.3;
            tarp.rotation.y = Math.PI / 4;
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), makeNeonMaterial(0xffaa33, 2.2));
            bulb.position.y = 1.95;
            const cSign = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.6), chaiMat);
            cSign.position.set(0.58, 0.9, 0);
            g.add(counter, tarp, bulb, cSign);
          } else {
            const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 2.6), bbGreenMat);
            board.position.y = 2.4;
            g.add(board);
          }
          propsGroup.add(g);
        }
      }
    }
  }
  scene.add(propsGroup);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.5, metalness: 0.6 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffc878 });
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xffb85c,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const poleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 6.2, 6), poleMat, lampSpots.length);
  const armInst  = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), poleMat, lampSpots.length);
  const headInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.12, 0.25), headMat, lampSpots.length);
  const poolInst = new THREE.InstancedMesh(new THREE.CircleGeometry(4.5, 16), poolMat, lampSpots.length);

  lampSpots.forEach(([x, z, yaw], i) => {
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    m4.compose(new THREE.Vector3(x, 3.1, z), q4, new THREE.Vector3(1, 1, 1));
    poleInst.setMatrixAt(i, m4);

    const ax = x + Math.cos(yaw) * 0.55, az = z - Math.sin(yaw) * 0.55;
    m4.compose(new THREE.Vector3(ax, 6.1, az), q4, new THREE.Vector3(1, 1, 1));
    armInst.setMatrixAt(i, m4);

    const hx = x + Math.cos(yaw) * 1.1, hz = z - Math.sin(yaw) * 1.1;
    m4.compose(new THREE.Vector3(hx, 6.05, hz), q4, new THREE.Vector3(1, 1, 1));
    headInst.setMatrixAt(i, m4);

    const qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    m4.compose(new THREE.Vector3(hx, 0.09, hz), qFlat, new THREE.Vector3(1, 1, 1));
    poolInst.setMatrixAt(i, m4);
  });

  scene.add(poleInst, armInst, headInst, poolInst);
  return { roadSegs, lampHead: headInst, lampPool: poolInst };
}
