// src/city.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createWallMaterial, makeSign, makeEmissiveSignMaterial } from './materials.js';

const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Rich Indiranagar residential & commercial palette: warm pastels, ochre, terracotta, mango, sage, teal
const PALETTE = [
  0xe6dfd1, // off-white
  0xd9d0bd, // cream
  0xcfc4ae, // beige
  0xc4c2bb, // light grey
  0xb5b2a9, // weathered concrete
  0xd8cdb9, // dusty cream
  0xcfc0b0, // faded stone pink
  0xbdb8a8, // sage-grey
  0xc8a58a, // muted terracotta
  0xa9a8a0  // stained grey
];

const SHOP_NAMES = [
  ['SLV DARSHINI TIFFINS', '#14532d', '#fef08a', 'IDLI · VADA · FILTER COFFEE'],
  ['KANCHEEVARAM SILKS', '#7f1d1d', '#fde047', 'BRIDAL & HANDLOOM SAREES'],
  ['INDIRANAGAR OPTICS', '#1e3a8a', '#ffffff', 'EYE TESTING & FRAMES'],
  ['CAUVERY MEDICALS', '#065f46', '#ffffff', '24 HR PHARMACY & CHEMIST'],
  ['UDUPI FILTER COFFEE', '#78350f', '#fed7aa', 'FRESH ROAST & POWDERS'],
  ['BLOSSOM BOOK HOUSE', '#1e293b', '#38bdf8', 'NEW & RARE BOOKS'],
  ['VARIAR BAKERY & SWEETS', '#831843', '#fbcfe8', 'PUFFS · CAKES · RUSK'],
  ['NANDINI MILK PARLOUR', '#1d4ed8', '#ffffff', 'CURD · GHEE · PEDA'],
  ['CRAFT DESIGN STUDIO', '#18181b', '#f59e0b', 'BOUTIQUE & INTERIORS'],
  ['SHANTI SAGAR VEG', '#15803d', '#fef9c3', 'SOUTH & NORTH INDIAN'],
  ['BANGALORE CYCLES', '#9a3412', '#ffedd5', 'SALES & SERVICE'],
  ['A2B SWEETS & SNACKS', '#991b1b', '#fef08a', 'PURE GHEE SWEETS']
];

export function buildCity(world, scene, nightUniform, landmarksData = []) {
  const geos = [];
  const tanks = [];
  const shopFronts = [];

  // Identify commercial road segments (Rank >= 3 plus named commercial streets)
  const commSegs = [];
  for (const r of world.roads) {
    if (r.k >= 3 || (r.n && (r.n.includes('12th Main') || r.n.includes('100 Feet') || r.n.includes('Chinmaya') || r.n.includes('80 Feet')))) {
      for (let i = 0; i < r.p.length - 1; i++) {
        commSegs.push([r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], r.k]);
      }
    }
  }

  function nearestCommRoad(x, z) {
    let bestD = 999, bestYaw = 0, bestRoadX = x, bestRoadZ = z, bestK = 3;
    for (let i = 0; i < commSegs.length; i++) {
      const s = commSegs[i];
      const dx = s[2] - s[0], dz = s[3] - s[1];
      const L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1);
      const px = s[0] + dx * t, pz = s[1] + dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < bestD) {
        bestD = d;
        bestYaw = Math.atan2(px - x, pz - z);
        bestRoadX = px;
        bestRoadZ = pz;
        bestK = s[4];
      }
    }
    return { dist: bestD, yaw: bestYaw, rx: bestRoadX, rz: bestRoadZ, k: bestK };
  }

  for (const b of world.buildings) {
    const pts = b.p.slice(0, -1);
    if (pts.length < 3) continue;

    let area = 0, cx = 0, cz = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      area += p[0] * q[1] - q[0] * p[1];
      cx += p[0]; cz += p[1];
    }
    area = Math.abs(area) / 2;
    if (area < 12) continue;
    cx /= pts.length; cz /= pts.length;

    // Skip generic buildings that overlap hand-crafted landmarks
    let overlapsLandmark = false;
    for (const lm of landmarksData) {
      if (Math.hypot(cx - lm.x, cz - lm.z) < 13.5) {
        overlapsLandmark = true;
        break;
      }
    }
    if (overlapsLandmark) continue;

    const r = hash(cx, cz);
    const r2 = hash(cz, cx);
    const floors = 2 + Math.floor(r * 3.5) + (area > 380 ? 1 : 0);
    const h = b.h ? Math.max(6.8, b.h) : floors * 3.3;

    const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
    let g;
    try {
      g = new THREE.ExtrudeGeometry(shape, {
        depth: h,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.12
      });
    } catch {
      continue;
    }
    g.rotateX(-Math.PI / 2);

    const baseCol = new THREE.Color(PALETTE[Math.floor(r * PALETTE.length)]).offsetHSL((r2 - 0.5) * 0.02, -0.04, (r - 0.5) * 0.10);
    const posAttr = g.attributes.position;
    const normAttr = g.attributes.normal;
    const n = posAttr.count;
    const colArr = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const ny = normAttr.getY(i);
      const py = posAttr.getY(i);
      const isRoof = ny > 0.5;
      const stain = 0.80 + 0.20 * Math.min(1, py / 7) - 0.07 * (((Math.floor(posAttr.getX(i) * 0.7) * 7 + Math.floor(posAttr.getZ(i) * 0.7) * 13) & 3) / 3);
      const shade = isRoof ? 0.66 : stain;
      colArr[i * 3]     = Math.min(1, baseCol.r * shade);
      colArr[i * 3 + 1] = Math.min(1, baseCol.g * shade);
      colArr[i * 3 + 2] = Math.min(1, baseCol.b * shade);
    }

    g.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    g.deleteAttribute('uv');
    geos.push(g);

    if (area > 50 && r > 0.28) {
      tanks.push([cx, h, cz, r]);
    }

    if (area > 32) {
      const comm = nearestCommRoad(cx, cz);
      if (comm.dist < 30 && comm.dist > 7) {
        shopFronts.push({ x: cx, z: cz, rx: comm.rx, rz: comm.rz, dist: comm.dist, h, yaw: comm.yaw, r });
      }
    }
  }

  const mergedGeo = mergeGeometries(geos, false);
  const mat = createWallMaterial();

  // Procedural Indiranagar facade shader: striped ground-floor awnings, concrete chajja ledges, window frames, night glow
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying vec3 vWn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;\nvWn = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight;
        varying vec3 vWp;
        varying vec3 vWn;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vWn.y) < 0.45) {
          float horiz = (vWp.x * abs(vWn.z) + vWp.z * abs(vWn.x));
          float floorV = fract(vWp.y / 3.3);
          float bSeed = h21(floor(vWp.xz * 0.04));

          // Cream concrete floor chajja / sunshade ledge & parapet band
          float ledge = smoothstep(0.89, 0.94, floorV);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.89, 0.82), ledge * 0.75);

          if (vWp.y > 3.3) {
            float u = horiz / 2.8;
            float v = (vWp.y - 0.3) / 3.3;
            vec2 cell = floor(vec2(u, v));
            vec2 f = fract(vec2(u, v));

            // Balcony rail / terracotta planter band on lower part of upper floors
            float balcBand = step(0.06, f.y) * step(f.y, 0.22) * step(0.10, f.x) * step(f.x, 0.90);
            float balcBars = step(0.45, fract(horiz * 3.5));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.24, 0.26), balcBand * balcBars * 0.55);

            // Window frame + warm lit panes
            float win = step(0.20, f.x) * step(f.x, 0.80) * step(0.28, f.y) * step(f.y, 0.78);
            float border = step(0.17, f.x) * step(f.x, 0.83) * step(0.25, f.y) * step(f.y, 0.81) - win;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.93, 0.88), clamp(border, 0.0, 1.0) * 0.8);

            float mullion = step(0.48, f.x) * step(f.x, 0.52) + step(0.51, f.y) * step(f.y, 0.55);
            win *= (1.0 - clamp(mullion, 0.0, 1.0));

            float seed = h21(cell + floor(vWp.xz * 0.02));
            float on = step(0.58, seed);
            float wv = h21(cell + 5.3);
            vec3 warm = mix(vec3(1.0, 0.58, 0.22), vec3(1.0, 0.78, 0.42), wv) * (0.55 + 0.6 * h21(cell + 9.1));

            totalEmissiveRadiance += warm * win * on * (0.08 + uNight * 0.50);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.30, 0.36), win * (1.0 - uNight * 0.6) * 0.65);
          } else {
            // Ground floor striped shopfront awning band (y = 2.45m to 3.15m)
            float awningBand = step(2.45, vWp.y) * step(vWp.y, 3.15);
            float stripe = step(0.5, fract(horiz * 2.2));
            vec3 awColA = bSeed > 0.6 ? vec3(0.82, 0.22, 0.18) : (bSeed > 0.3 ? vec3(0.12, 0.48, 0.28) : vec3(0.16, 0.36, 0.68));
            vec3 awCol = mix(awColA, vec3(0.96, 0.94, 0.88), stripe);
            diffuseColor.rgb = mix(diffuseColor.rgb, awCol, awningBand * 0.92);

            // Ground floor shopfront windows & shutters below awning
            float shopU = fract(horiz / 4.0);
            float shutter = step(0.12, shopU) * step(shopU, 0.88) * step(0.08, vWp.y) * step(vWp.y, 2.38);
            float shopLit = step(0.45, h21(floor(vec2(horiz / 4.0, 1.0))));
            vec3 shopGlass = mix(vec3(0.32, 0.35, 0.38), vec3(1.0, 0.82, 0.48), shopLit * (0.35 + 0.65 * uNight));
            diffuseColor.rgb = mix(diffuseColor.rgb, shopGlass, shutter * 0.75);
            totalEmissiveRadiance += vec3(1.0, 0.78, 0.42) * shutter * shopLit * (0.18 + uNight * 0.75);
          }
        }
      `);
  };

  const cityMesh = new THREE.Mesh(mergedGeo, mat);
  cityMesh.castShadow = true;
  cityMesh.receiveShadow = true;
  scene.add(cityMesh);

  // Rooftop water tanks + solar panels
  const tankGeo = new THREE.CylinderGeometry(0.78, 0.78, 1.45, 12);
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.45 });
  const tkInst = new THREE.InstancedMesh(tankGeo, tankMat, tanks.length);
  const solarGeo = new THREE.BoxGeometry(1.6, 0.08, 1.1);
  solarGeo.rotateX(0.35);
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.25, metalness: 0.5 });
  const solInst = new THREE.InstancedMesh(solarGeo, solarMat, tanks.length);

  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  tanks.forEach(([x, h, z, r], i) => {
    const sc = 0.75 + r * 0.65;
    v3.set(x + (r - 0.5) * 2.5, h + 0.72 * sc, z);
    s3.set(sc, sc, sc);
    m4.compose(v3, q4, s3);
    tkInst.setMatrixAt(i, m4);

    v3.set(x - (r - 0.5) * 2.2, h + 0.45, z + 1.2);
    s3.set(1, 1, 1);
    m4.compose(v3, q4, s3);
    solInst.setMatrixAt(i, m4);
  });
  tkInst.castShadow = true;
  scene.add(tkInst, solInst);

  // Commercial street shopfront signboards + striped 3D awnings positioned cleanly on the road-facing facade
  const signGroup = new THREE.Group();
  const signPool = SHOP_NAMES.map(([txt, bg, fg, sub]) =>
    makeEmissiveSignMaterial(makeSign(txt, bg, fg, '800 36px sans-serif', 384, 96, sub, fg), 1.35)
  );
  const awningColors = [0xb91c1c, 0x15803d, 0x1d4ed8, 0xd97706, 0x0f766e];
  const awningMats = awningColors.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));

  const boardGeo = new THREE.BoxGeometry(4.8, 1.15, 0.28);
  const awningGeo = new THREE.BoxGeometry(5.0, 0.18, 1.45);
  awningGeo.rotateX(0.26);

  const nearRoad = (px, pz, lim) => {
    for (const r of world.roads) {
      const p = r.p;
      for (let j = 0; j < p.length - 1; j++) {
        const ax = p[j][0], az = p[j][1], bx = p[j + 1][0], bz = p[j + 1][1];
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
        if (Math.hypot(px - ax - dx * t, pz - az - dz * t) < lim) return true;
      }
    }
    return false;
  };
  const maxSigns = Math.min(shopFronts.length, 320);
  for (let i = 0; i < maxSigns; i++) {
    const sf = shopFronts[i];
    // Position signboard just outside the building wall along the vector from building centre to nearest road point
    const wallPush = Math.max(3.5, sf.dist - 8.2);
    const sx = sf.x + Math.sin(sf.yaw) * wallPush;
    const sz = sf.z + Math.cos(sf.yaw) * wallPush;

    if (nearRoad(sx, sz, 9.5)) continue;
    const sm = new THREE.Mesh(boardGeo, signPool[i % signPool.length]);
    sm.position.set(sx, 3.85, sz);
    sm.rotation.y = sf.yaw;
    signGroup.add(sm);

    const aw = new THREE.Mesh(awningGeo, awningMats[i % awningMats.length]);
    aw.position.set(sx + Math.sin(sf.yaw) * 0.55, 2.95, sz + Math.cos(sf.yaw) * 0.55);
    aw.rotation.y = sf.yaw;
    signGroup.add(aw);
  }
  scene.add(signGroup);

  // Build 2D occupancy collision grid
  const OCC = { s: 2, n: Math.ceil(2000 / 2) };
  const cv = document.createElement('canvas');
  cv.width = cv.height = OCC.n;
  const cx2d = cv.getContext('2d');
  cx2d.fillStyle = '#fff';
  cx2d.imageSmoothingEnabled = false;
  for (const b of world.buildings) {
    cx2d.beginPath();
    b.p.forEach((p, idx) => {
      const X = (p[0] + 1000) / OCC.s, Y = (p[1] + 1000) / OCC.s;
      idx ? cx2d.lineTo(X, Y) : cx2d.moveTo(X, Y);
    });
    cx2d.closePath();
    cx2d.fill();
  }
  const imgData = cx2d.getImageData(0, 0, OCC.n, OCC.n).data;
  const occ = new Uint8Array(OCC.n * OCC.n);
  for (let i = 0; i < occ.length; i++) occ[i] = imgData[i * 4 + 3] > 140 ? 1 : 0;

  const solid = (x, z) => {
    const i = Math.floor((x + 1000) / OCC.s), j = Math.floor((z + 1000) / OCC.s);
    return i < 0 || j < 0 || i >= OCC.n || j >= OCC.n ? 1 : occ[j * OCC.n + i];
  };

  return { solid, occ, OCC };
}
