// src/trees.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const hash = (x, z, seed = 0) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
};

function makeLeafLitterTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // Soft distant canopy shadow blob + scattered pale dry leaves & gulmohar petals
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  grad.addColorStop(0.0, 'rgba(18, 22, 16, 0.42)');
  grad.addColorStop(0.65, 'rgba(24, 28, 20, 0.22)');
  grad.addColorStop(1.0, 'rgba(24, 28, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const leafColors = ['#c8b88a', '#b59e6b', '#d4a359', '#d95b38', '#9c8d65'];
  for (let i = 0; i < 65; i++) {
    const a = (i * 2.39996) % (Math.PI * 2);
    const r = Math.sqrt((i + 0.5) / 65) * 52;
    const lx = 64 + Math.cos(a) * r + (Math.sin(i * 9.1) * 4);
    const lz = 64 + Math.sin(a) * r + (Math.cos(i * 7.3) * 4);
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.beginPath();
    ctx.ellipse(lx, lz, 2.5, 1.3, i, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildBranchingTrunkGeometry(T) {
  const parts = [];
  const paintVertexColor = (geo, hex) => {
    const col = new T.Color(hex);
    const count = geo.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const py = geo.attributes.position.getY(i);
      const shade = 0.85 + Math.min(0.25, py * 0.04);
      arr[i * 3] = col.r * shade;
      arr[i * 3 + 1] = col.g * shade;
      arr[i * 3 + 2] = col.b * shade;
    }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    geo.deleteAttribute('uv');
    return geo;
  };

  // Base thick trunk (0 to 3.8m) with slight organic lean
  const baseTrunk = new T.CylinderGeometry(0.34, 0.52, 3.8, 7);
  baseTrunk.translate(0, 1.9, 0);
  baseTrunk.rotateZ(0.05);
  parts.push(paintVertexColor(baseTrunk, 0x4a382b));

  // 4 spreading primary boughs reaching up to support the 5.5m+ overhanging umbrella canopy
  const limbAngles = [0.25, 1.85, 3.45, 4.95];
  for (let i = 0; i < 4; i++) {
    const ang = limbAngles[i];
    const tilt = 0.52 + (i % 2) * 0.12;
    const len = 3.2 + (i % 2) * 0.5;
    const limb = new T.CylinderGeometry(0.16, 0.28, len, 6);
    limb.translate(0, len * 0.5, 0);
    limb.rotateZ(tilt);
    limb.rotateY(ang);
    limb.translate(0, 3.5, 0);
    parts.push(paintVertexColor(limb, 0x544032));
  }

  return mergeGeometries(parts, false);
}

function buildUmbrellaCrownGeometry(T, paletteHexes) {
  const parts = [];
  // 9 overlapping flattened icosphere lobes forming a wide Samanea saman umbrella dome
  // Base of lowest lobe sits at y = 5.8m so even when tilted toward the road, vehicle clearance is >= 5.5m
  const lobes = [
    { x: 0.0,  y: 8.6, z: 0.0,  rx: 4.4, ry: 1.75, rz: 4.4, c: 0 },
    { x: -2.6, y: 7.5, z: 1.6,  rx: 3.3, ry: 1.45, rz: 3.1, c: 1 },
    { x: 2.7,  y: 7.6, z: 1.5,  rx: 3.4, ry: 1.50, rz: 3.2, c: 2 },
    { x: -2.4, y: 7.4, z: -2.1, rx: 3.2, ry: 1.40, rz: 3.2, c: 1 },
    { x: 2.5,  y: 7.5, z: -2.0, rx: 3.3, ry: 1.45, rz: 3.1, c: 0 },
    { x: 0.0,  y: 7.8, z: 3.1,  rx: 3.5, ry: 1.40, rz: 3.0, c: 3 }, // Road-overhanging front lobe
    { x: 0.0,  y: 7.7, z: -2.9, rx: 3.2, ry: 1.38, rz: 2.9, c: 2 },
    { x: -3.6, y: 7.1, z: -0.2, rx: 2.8, ry: 1.25, rz: 2.8, c: 3 },
    { x: 3.7,  y: 7.2, z: 0.2,  rx: 2.9, ry: 1.28, rz: 2.8, c: 4 }
  ];

  const cTmp = new T.Color();
  for (let i = 0; i < lobes.length; i++) {
    const L = lobes[i];
    const g = new T.IcosahedronGeometry(1.0, 1);
    const pos = g.attributes.position;
    const count = pos.count;
    const colArr = new Float32Array(count * 3);
    cTmp.setHex(paletteHexes[L.c % paletteHexes.length]);

    for (let k = 0; k < count; k++) {
      const vx = pos.getX(k), vy = pos.getY(k), vz = pos.getZ(k);
      // Slight organic vertex displacement + top-lit foliar shading
      const n = Math.sin(vx * 3.1 + i) * Math.cos(vz * 2.7 - i) * 0.08;
      pos.setXYZ(k, (vx + n) * L.rx + L.x, (vy * (vy < 0 ? 0.65 : 1.0)) * L.ry + L.y, (vz + n) * L.rz + L.z);

      const sunFacing = 0.78 + Math.max(0, vy) * 0.34 + (hash(vx + i, vz) - 0.5) * 0.1;
      colArr[k * 3]     = Math.min(1, cTmp.r * sunFacing);
      colArr[k * 3 + 1] = Math.min(1, cTmp.g * sunFacing);
      colArr[k * 3 + 2] = Math.min(1, cTmp.b * sunFacing);
    }
    g.computeVertexNormals();
    g.setAttribute('color', new T.BufferAttribute(colArr, 3));
    g.deleteAttribute('uv');
    parts.push(g);
  }
  return mergeGeometries(parts, false);
}

function buildTreeGuardGeometry(T) {
  const parts = [];
  // Iron mesh cage + 4 vertical posts around trunk base
  const ringTop = new T.CylinderGeometry(0.68, 0.68, 0.08, 8, 1, true);
  ringTop.translate(0, 1.45, 0);
  const ringMid = new T.CylinderGeometry(0.68, 0.68, 0.06, 8, 1, true);
  ringMid.translate(0, 0.75, 0);
  parts.push(ringTop, ringMid);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new T.BoxGeometry(0.05, 1.55, 0.05);
    post.translate(Math.cos(a) * 0.66, 0.77, Math.sin(a) * 0.66);
    parts.push(post);
  }
  const merged = mergeGeometries(parts, false);
  merged.deleteAttribute('uv');
  return merged;
}

export function createRainTrees({
  THREE: T = THREE,
  scene,
  roadSegs = [],
  solidFn = () => 0,
  nightUniform,
  bridgeVolumes = [],
  seed = 42
}) {
  const group = new T.Group();
  scene.add(group);

  const treeSpots = [];
  const CELL = 8.5;
  const spatialHash = new Map();

  function isTooCloseToOtherTree(x, z, minDist) {
    const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const list = spatialHash.get(`${gx + ox},${gz + oz}`);
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          if (Math.hypot(x - list[i].x, z - list[i].z) < minDist) return true;
        }
      }
    }
    return false;
  }

  function registerTreeSpot(spot) {
    const gx = Math.floor(spot.x / CELL), gz = Math.floor(spot.z / CELL);
    const key = `${gx},${gz}`;
    if (!spatialHash.has(key)) spatialHash.set(key, []);
    spatialHash.get(key).push(spot);
    treeSpots.push(spot);
  }

  // Check if (x, z) is within 14m of another road segment's centreline (junction zone) or inside ANY carriageway
  function checkJunctionOrCarriageway(x, z, ownSegIdx) {
    const ownSeg = roadSegs[ownSegIdx];
    const ownName = ownSeg ? (ownSeg.name ?? ownSeg[4] ?? '') : '';

    for (let i = 0; i < roadSegs.length; i++) {
      if (i === ownSegIdx) continue;
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const rw = s.width ?? s[6] ?? 7.5;
      const sName = s.name ?? s[4] ?? '';

      const margin = 14.5;
      if (x < Math.min(x1, x2) - margin || x > Math.max(x1, x2) + margin) continue;
      if (z < Math.min(z1, z2) - margin || z > Math.max(z1, z2) + margin) continue;

      const dx = x2 - x1, dz = z2 - z1;
      const L2 = dx * dx + dz * dz || 1;
      const t = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));

      // Never place inside any road's carriageway + kerb buffer
      if (d < rw * 0.5 + 1.8) return true;

      // Skip junction zones within 14m of a cross-road centreline
      const sharesEndpoint =
        Math.hypot(x1 - (ownSeg.x1 ?? ownSeg[0]), z1 - (ownSeg.z1 ?? ownSeg[1])) < 1.5 ||
        Math.hypot(x1 - (ownSeg.x2 ?? ownSeg[2]), z1 - (ownSeg.z2 ?? ownSeg[3])) < 1.5 ||
        Math.hypot(x2 - (ownSeg.x1 ?? ownSeg[0]), z2 - (ownSeg.z1 ?? ownSeg[1])) < 1.5 ||
        Math.hypot(x2 - (ownSeg.x2 ?? ownSeg[2]), z2 - (ownSeg.z2 ?? ownSeg[3])) < 1.5;

      if (!sharesEndpoint || (sName !== ownName)) {
        if (d < 14.0) return true;
      }
    }
    return false;
  }

  function isUnderBridge(x, z) {
    for (let i = 0; i < bridgeVolumes.length; i++) {
      const b = bridgeVolumes[i];
      if (Math.hypot(x - b.x, z - b.z) < (b.r || 18) + 4.0) return true;
    }
    return false;
  }

  // True when parallel roads lie on BOTH sides within 20 m (i.e. the strip between two carriageways)
  function isBetweenCarriageways(x, z) {
    let best = null, bd = 1e9;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
      const tt = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / (L * L), 0, 1);
      const d = Math.hypot(x - (x1 + dx * tt), z - (z1 + dz * tt));
      if (d < bd) { bd = d; best = { ux: dx / L, uz: dz / L }; }
    }
    if (!best) return false;
    let left = false, right = false;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      if (Math.abs(ux * best.ux + uz * best.uz) < 0.9) continue;
      const tt = T.MathUtils.clamp(((x - x1) * ux + (z - z1) * uz) / L, 0, 1);
      const d = Math.hypot(x - (x1 + dx * tt), z - (z1 + dz * tt));
      if (d > 20) continue;
      const cr = (x - x1) * uz - (z - z1) * ux;
      if (cr > 2.5) left = true; else if (cr < -2.5) right = true;
    }
    return left && right;
  }

  // Place roadside trees along both sides of roads: dense on 100 Feet Road, CMH Road, 12th Main, sparser on side streets
  for (let idx = 0; idx < roadSegs.length; idx++) {
    const s = roadSegs[idx];
    const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
    const name = s.name ?? s[4] ?? '';
    const kind = s.kind ?? s[5] ?? 2;
    const width = s.width ?? s[6] ?? 7.0;

    const dx = x2 - x1, dz = z2 - z1;
    const L = Math.hypot(dx, dz);
    if (L < 11) continue;
    const ux = dx / L, uz = dz / L;

    const isPrimeAvenue =
      name.includes('100 Feet') ||
      name.includes('Chinmaya') ||
      name.includes('CMH') ||
      name.includes('12th Main') ||
      name.includes('80 Feet') ||
      kind >= 4;

    const baseStep = isPrimeAvenue ? 9.5 : 13.5;
    const minSpacing = isPrimeAvenue ? 8.2 : 11.2;

    for (let dist = 5.5; dist < L - 4.5; dist += baseStep + hash(x1 + dist, z1, seed) * 5.2) {
      for (const side of [-1, 1]) {
        const hVal = hash(x1 * side + dist, z1 - dist, seed);
        if (!isPrimeAvenue && hVal < 0.36) continue;

        // Verge offset: width/2 + 2.2m to 4.5m from road centreline
        const vergeOff = width * 0.5 + 3.9 + hash(z1 + dist, x1 * side, seed) * 1.6;
        const tx = x1 + ux * dist - uz * vergeOff * side;
        const tz = z1 + uz * dist + ux * vergeOff * side;

        // Keep player spawn (-133, -345) clear
        if (Math.hypot(tx - (-133), tz - (-345)) < 34) continue;

        // Check building footprints (solidFn) with a small clearance buffer
        if (
          solidFn(tx, tz) ||
          solidFn(tx + 1.4, tz) ||
          solidFn(tx - 1.4, tz) ||
          solidFn(tx, tz + 1.4) ||
          solidFn(tx, tz - 1.4)
        ) continue;

        if (isUnderBridge(tx, tz)) continue;
        if (isBetweenCarriageways(tx, tz)) continue;
        if (isTooCloseToOtherTree(tx, tz, minSpacing)) continue;
        if (checkJunctionOrCarriageway(tx, tz, idx)) continue;

        // Yaw pointing inward from the kerb toward the road centreline
        const roadInwardYaw = Math.atan2(uz * side, -ux * side);
        const overhangsRoad = hVal > 0.62; // ~38% of crowns lean out over the kerb/carriageway

        // Species selection: 0 = Samanea saman (Rain Tree), 1 = Gulmohar (Flame red-orange), 2 = Ficus/Copper-pod
        const spRand = hash(tx, tz, seed + 7);
        const species = spRand < 0.72 ? 0 : (spRand < 0.88 ? 1 : 2);

        registerTreeSpot({
          x: tx,
          z: tz,
          roadInwardYaw,
          overhangsRoad,
          species,
          scaleXZ: 0.75 + hash(tz, tx, seed) * 0.42, // Crown radius ~5m to 8m
          scaleY: 0.82 + hash(tx + 9, tz, seed) * 0.38, // Total height ~9m to 13m
          hasBand: hVal > 0.42,
          hasGuard: isPrimeAvenue && hVal < 0.52
        });
      }
    }
  }

  const count = treeSpots.length;
  const rainSpots = treeSpots.filter(t => t.species === 0);
  const gulmoharSpots = treeSpots.filter(t => t.species === 1);
  const ficusSpots = treeSpots.filter(t => t.species === 2);
  const bandSpots = treeSpots.filter(t => t.hasBand);
  const guardSpots = treeSpots.filter(t => t.hasGuard);

  // Shared Wind-Sway Shader Patch for Crowns
  const windUniform = { value: 0 };
  function makeWindCrownMaterial() {
    const mat = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.02,
      flatShading: true
    });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWindTime = windUniform;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nvarying vec3 vTreeW;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 wPos = instanceMatrix * vec4(transformed, 1.0);
          float hFactor = clamp((transformed.y - 5.2) / 5.5, 0.0, 1.0);
          float gust = sin(uWindTime * 1.6 + wPos.x * 0.14 + wPos.z * 0.11)
                     + 0.45 * cos(uWindTime * 2.9 + wPos.x * 0.27 - transformed.z * 0.4);
          transformed.x += gust * 0.22 * hFactor;
          transformed.z += gust * 0.16 * hFactor;
          vTreeW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        `);
      // Camera-occlusion fade: foliage close to the camera dissolves with a screen-space dither
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vTreeW;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          {
            float dCam = distance(vTreeW, cameraPosition);
            float keep = smoothstep(4.5, 15.0, dCam);
            vec2 q = floor(mod(gl_FragCoord.xy, 4.0));
            float bayer = mod(q.x * 4.0 + q.y * 9.0 + floor(q.y * 0.5) * 3.0, 16.0) / 16.0 + 0.03;
            if (keep < bayer) discard;
          }
        `);
    };
    return mat;
  }

  // 1. Instanced Branching Trunks (castShadow = true, receiveShadow = true)
  const trunkGeo = buildBranchingTrunkGeometry(T);
  const trunkMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.0 });
  const trunkInst = new T.InstancedMesh(trunkGeo, trunkMat, count);
  trunkInst.castShadow = true;
  trunkInst.receiveShadow = true;

  // 2-4. Instanced Umbrella Crowns per species (castShadow = false for soft self-shadow performance, receiveShadow = true)
  const rainCrownGeo = buildUmbrellaCrownGeometry(T, [0x1f4526, 0x28582e, 0x336b36, 0x3f7438, 0x4f7a34]);
  const gulmoharCrownGeo = buildUmbrellaCrownGeometry(T, [0xd9381e, 0xe85325, 0xf27429, 0x2f5e2e, 0xe68a2e]);
  const ficusCrownGeo = buildUmbrellaCrownGeometry(T, [0x2e5d2c, 0x3a6b31, 0x4f7a33, 0x5c6524, 0x27501f]);

  const crownMat = makeWindCrownMaterial();
  const rainInst = new T.InstancedMesh(rainCrownGeo, crownMat, rainSpots.length);
  const gulInst = new T.InstancedMesh(gulmoharCrownGeo, crownMat, gulmoharSpots.length);
  const ficusInst = new T.InstancedMesh(ficusCrownGeo, crownMat, ficusSpots.length);
  rainInst.receiveShadow = gulInst.receiveShadow = ficusInst.receiveShadow = true;
  rainInst.castShadow = gulInst.castShadow = ficusInst.castShadow = false;

  // 5. Instanced BBMP Forestry Red-and-White Painted Trunk Bands
  const bandGeo = new T.CylinderGeometry(0.41, 0.46, 0.95, 7);
  bandGeo.translate(0, 1.35, 0);
  const bPos = bandGeo.attributes.position;
  const bCol = new Float32Array(bPos.count * 3);
  for (let i = 0; i < bPos.count; i++) {
    const y = bPos.getY(i);
    const isWhite = y > 1.12 && y < 1.58;
    bCol[i * 3]     = isWhite ? 0.94 : 0.76;
    bCol[i * 3 + 1] = isWhite ? 0.93 : 0.20;
    bCol[i * 3 + 2] = isWhite ? 0.90 : 0.16;
  }
  bandGeo.setAttribute('color', new T.BufferAttribute(bCol, 3));
  const bandInst = new T.InstancedMesh(bandGeo, trunkMat, bandSpots.length);

  // 6. Instanced Black Iron Tree Guard Fences
  const guardGeo = buildTreeGuardGeometry(T);
  const guardMat = new T.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.6, metalness: 0.5 });
  const guardInst = new T.InstancedMesh(guardGeo, guardMat, guardSpots.length);

  // 7. Instanced Leaf-Litter & Soft Ground Shadow Decals
  const litterGeo = new T.PlaneGeometry(6.8, 6.8);
  litterGeo.rotateX(-Math.PI / 2);
  const litterMat = new T.MeshBasicMaterial({
    map: makeLeafLitterTexture(),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });
  const litterInst = new T.InstancedMesh(litterGeo, litterMat, count);

  const m4 = new T.Matrix4();
  const qYaw = new T.Quaternion();
  const qTilt = new T.Quaternion();
  const vPos = new T.Vector3();
  const vScale = new T.Vector3();
  const xAxis = new T.Vector3(1, 0, 0);
  const yAxis = new T.Vector3(0, 1, 0);

  let rIdx = 0, gIdx = 0, fIdx = 0, bIdx = 0, gdIdx = 0;

  for (let i = 0; i < count; i++) {
    const sp = treeSpots[i];
    qYaw.setFromAxisAngle(yAxis, sp.roadInwardYaw);

    // Tilt overhanging trees (~35%+) toward the road so their canopy arches 2-3m over the kerb while keeping >=5.5m clearance
    const tiltAngle = sp.overhangsRoad ? 0.24 : 0.04;
    qTilt.setFromAxisAngle(xAxis, tiltAngle);
    const qCombined = qYaw.clone().multiply(qTilt);

    vPos.set(sp.x, 0, sp.z);
    vScale.set(sp.scaleXZ, sp.scaleY, sp.scaleXZ);
    m4.compose(vPos, qCombined, vScale);
    trunkInst.setMatrixAt(i, m4);

    if (sp.species === 0) rainInst.setMatrixAt(rIdx++, m4);
    else if (sp.species === 1) gulInst.setMatrixAt(gIdx++, m4);
    else ficusInst.setMatrixAt(fIdx++, m4);

    if (sp.hasBand) bandInst.setMatrixAt(bIdx++, m4);

    if (sp.hasGuard) {
      m4.compose(vPos, qYaw, vScale.set(1, 1, 1));
      guardInst.setMatrixAt(gdIdx++, m4);
    }

    // Ground leaf-litter decal shifted slightly toward the overhanging direction
    const shift = sp.overhangsRoad ? 1.4 : 0.2;
    vPos.set(
      sp.x + Math.sin(sp.roadInwardYaw) * shift,
      0.045,
      sp.z + Math.cos(sp.roadInwardYaw) * shift
    );
    vScale.set(sp.scaleXZ, 1, sp.scaleXZ);
    m4.compose(vPos, qYaw, vScale);
    litterInst.setMatrixAt(i, m4);
  }

  // Camera overhead volumes: keep the chase-cam narrow-lane lift below every crown (Somil black-overlay fix)
  if (bridgeVolumes) {
    for (const sp of treeSpots) {
      const shift = sp.overhangsRoad ? 1.8 : 0;
      bridgeVolumes.push({
        x: sp.x + Math.sin(sp.roadInwardYaw) * shift,
        z: sp.z + Math.cos(sp.roadInwardYaw) * shift,
        r: 4.4 * sp.scaleXZ + 0.8,
        clearanceY: 5.8 * sp.scaleY
      });
    }
  }

  const allInstanced = [trunkInst, rainInst, gulInst, ficusInst, bandInst, guardInst, litterInst];
  for (const inst of allInstanced) {
    if (inst.count > 0) {
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.frustumCulled = true;
      group.add(inst);
    }
  }

  function update(dt = 0.016, windTime = null) {
    if (windTime !== null) windUniform.value = windTime;
    else windUniform.value += dt;
  }

  return {
    update,
    group,
    treeSpots
  };
}
