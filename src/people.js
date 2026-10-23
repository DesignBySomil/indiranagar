// src/people.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildPedestrianMerged, tickWalk } from './gempeds.js';

const hash = (x, z, seed = 0) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
};

function paintGeo(T, geo, hex, shadeY = 0.08) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  const col = new T.Color(hex);
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const py = g.attributes.position.getY(i);
    const s = 0.92 + Math.min(0.16, Math.max(-0.12, py * shadeY));
    arr[i * 3] = Math.min(1, col.r * s);
    arr[i * 3 + 1] = Math.min(1, col.g * s);
    arr[i * 3 + 2] = Math.min(1, col.b * s);
  }
  g.setAttribute('color', new T.BufferAttribute(arr, 3));
  return g;
}

function buildHeadVariant(T, style = 'blackHair') {
  const parts = [];
  const skinHex = style === 'greyHair' ? 0xc68658 : (style === 'bun' ? 0xd29267 : 0xbd7e52);

  // Rounded head sphere (12x10 as requested) + neck cylinder
  const skull = new T.SphereGeometry(0.135, 12, 10);
  skull.scale(0.95, 1.06, 0.98);
  parts.push(paintGeo(T, skull, skinHex, 0.12));

  const neck = new T.CylinderGeometry(0.055, 0.065, 0.10, 8);
  neck.translate(0, -0.13, -0.01);
  parts.push(paintGeo(T, neck, skinHex, 0.08));

  // Visible face hint: nose bridge & dark eyes (facing +Z)
  const nose = new T.BoxGeometry(0.028, 0.048, 0.045);
  nose.translate(0, -0.005, 0.132);
  parts.push(paintGeo(T, nose, 0x9e633b, 0.05));

  for (const side of [-1, 1]) {
    const eye = new T.BoxGeometry(0.028, 0.018, 0.02);
    eye.translate(side * 0.045, 0.025, 0.124);
    parts.push(paintGeo(T, eye, 0x181412, 0.0));

    const brow = new T.BoxGeometry(0.036, 0.01, 0.022);
    brow.translate(side * 0.045, 0.044, 0.125);
    parts.push(paintGeo(T, brow, 0x181412, 0.0));

    const ear = new T.BoxGeometry(0.025, 0.048, 0.032);
    ear.translate(side * 0.128, -0.005, -0.005);
    parts.push(paintGeo(T, ear, skinHex, 0.05));
  }

  // Hair / Cap variations
  if (style === 'blackHair' || style === 'bun') {
    const hair = new T.SphereGeometry(0.142, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.62);
    hair.scale(0.97, 1.05, 1.02);
    hair.rotateX(-0.22);
    hair.translate(0, 0.015, -0.012);
    parts.push(paintGeo(T, hair, 0x16161a, 0.06));

    if (style === 'bun') {
      const bun = new T.SphereGeometry(0.065, 8, 8);
      bun.translate(0, 0.01, -0.155);
      parts.push(paintGeo(T, bun, 0x141418, 0.06));
      // Small flower gajra ring around bun
      const gajra = new T.TorusGeometry(0.052, 0.016, 6, 10);
      gajra.translate(0, 0.01, -0.125);
      parts.push(paintGeo(T, gajra, 0xfef08a, 0.04));
    }
  } else if (style === 'greyHair') {
    const hair = new T.SphereGeometry(0.141, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.58);
    hair.rotateX(-0.26);
    hair.translate(0, 0.012, -0.014);
    parts.push(paintGeo(T, hair, 0x94a3b8, 0.06));
    const moustache = new T.BoxGeometry(0.075, 0.018, 0.026);
    moustache.translate(0, -0.042, 0.128);
    parts.push(paintGeo(T, moustache, 0x94a3b8, 0.0));
  } else if (style === 'cap') {
    // Simple mask-free cap / topi
    const dome = new T.SphereGeometry(0.142, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
    dome.translate(0, 0.025, 0);
    parts.push(paintGeo(T, dome, 0xf1f5f9, 0.08));
    const visor = new T.CylinderGeometry(0.135, 0.135, 0.02, 10, 1, false, -Math.PI * 0.35, Math.PI * 0.7);
    visor.translate(0, 0.03, 0.055);
    parts.push(paintGeo(T, visor, 0x334155, 0.04));
  }

  return mergeGeometries(parts, false);
}

function buildTorsoVariant(T, variant = 'shirt') {
  const parts = [];

  if (variant === 'saree') {
    // Fitted blouse + colourful saree pallu & long draped conical skirt
    const chest = new T.CapsuleGeometry(0.135, 0.28, 6, 12);
    chest.scale(1.12, 1.0, 0.82);
    chest.translate(0, 0.98, 0);
    parts.push(paintGeo(T, chest, 0xffffff, 0.12));

    // Long conical saree skirt down to ankles (covers legs gracefully while walking)
    const skirt = new T.CylinderGeometry(0.135, 0.215, 0.72, 14);
    skirt.scale(1.05, 1.0, 0.88);
    skirt.translate(0, 0.44, -0.01);
    parts.push(paintGeo(T, skirt, 0xffffff, 0.14));

    // Contrast gold/bright zari border at bottom of saree + diagonal pallu sash
    const border = new T.CylinderGeometry(0.214, 0.22, 0.08, 14);
    border.scale(1.06, 1.0, 0.89);
    border.translate(0, 0.11, -0.01);
    parts.push(paintGeo(T, border, 0xfacc15, 0.08));

    const pallu = new T.BoxGeometry(0.14, 0.56, 0.23);
    pallu.rotateZ(0.32);
    pallu.translate(-0.04, 0.92, 0);
    parts.push(paintGeo(T, pallu, 0xfde047, 0.10));

    // Shoulder handbag
    const strap = new T.BoxGeometry(0.03, 0.38, 0.21);
    strap.translate(0.14, 0.94, 0);
    const purse = new T.BoxGeometry(0.09, 0.18, 0.24);
    purse.translate(0.20, 0.72, -0.02);
    parts.push(paintGeo(T, strap, 0x3f2314), paintGeo(T, purse, 0x5c341d));
  } else if (variant === 'kurta') {
    // Rounded capsule chest + flared knee-length kurta tunic + dupatta/stole or sling bag
    const chest = new T.CapsuleGeometry(0.145, 0.30, 6, 12);
    chest.scale(1.18, 1.0, 0.82);
    chest.translate(0, 0.99, 0);
    parts.push(paintGeo(T, chest, 0xffffff, 0.12));

    const tunic = new T.CylinderGeometry(0.155, 0.195, 0.48, 12);
    tunic.scale(1.10, 1.0, 0.82);
    tunic.translate(0, 0.66, 0);
    parts.push(paintGeo(T, tunic, 0xffffff, 0.10));

    // Dupatta / scarf draped around neck and down back/chest
    const scarfNeck = new T.TorusGeometry(0.115, 0.032, 6, 12);
    scarfNeck.rotateX(Math.PI / 2 + 0.15);
    scarfNeck.translate(0, 1.18, 0.01);
    parts.push(paintGeo(T, scarfNeck, 0xfef08a, 0.06));

    const scarfTail = new T.BoxGeometry(0.09, 0.38, 0.03);
    scarfTail.translate(0.09, 0.98, 0.115);
    parts.push(paintGeo(T, scarfTail, 0xfef08a, 0.06));

    // Cross-body jhola / shoulder bag
    const bag = new T.BoxGeometry(0.10, 0.24, 0.26);
    bag.translate(-0.20, 0.72, -0.02);
    parts.push(paintGeo(T, bag, 0x78350f, 0.08));
  } else if (variant === 'lungi') {
    // Casual shirt + traditional wrapped lungi / mundu cylinder + collar
    const chest = new T.CapsuleGeometry(0.145, 0.32, 6, 12);
    chest.scale(1.20, 1.0, 0.84);
    chest.translate(0, 0.99, 0);
    parts.push(paintGeo(T, chest, 0xffffff, 0.12));

    const collar = new T.CylinderGeometry(0.085, 0.095, 0.06, 10);
    collar.translate(0, 1.18, -0.005);
    parts.push(paintGeo(T, collar, 0xffffff, 0.10));

    // Lungi wrap (checkered/patterned look via cream/blue contrast band)
    const lungi = new T.CylinderGeometry(0.155, 0.175, 0.56, 12);
    lungi.scale(1.08, 1.0, 0.88);
    lungi.translate(0, 0.50, 0);
    parts.push(paintGeo(T, lungi, 0xe2e8f0, 0.08));

    const lungiBorder = new T.CylinderGeometry(0.176, 0.176, 0.06, 12);
    lungiBorder.scale(1.09, 1.0, 0.89);
    lungiBorder.translate(0, 0.26, 0);
    parts.push(paintGeo(T, lungiBorder, 0x1d4ed8, 0.05));
  } else {
    // 'shirt' with school/office backpack + pelvis
    const chest = new T.CapsuleGeometry(0.148, 0.34, 6, 12);
    chest.scale(1.22, 1.0, 0.84);
    chest.translate(0, 0.98, 0);
    parts.push(paintGeo(T, chest, 0xffffff, 0.12));

    const pelvis = new T.CylinderGeometry(0.15, 0.145, 0.16, 10);
    pelvis.scale(1.15, 1.0, 0.82);
    pelvis.translate(0, 0.72, 0);
    parts.push(paintGeo(T, pelvis, 0x1e293b, 0.06));

    // Rounded backpack / school bag on back (-Z)
    const pack = new T.CapsuleGeometry(0.11, 0.22, 6, 10);
    pack.scale(1.15, 1.0, 0.72);
    pack.translate(0, 0.98, -0.155);
    parts.push(paintGeo(T, pack, 0x1e293b, 0.08));

    const pocket = new T.BoxGeometry(0.18, 0.16, 0.06);
    pocket.translate(0, 0.92, -0.21);
    parts.push(paintGeo(T, pocket, 0x334155, 0.06));
  }

  return mergeGeometries(parts, false);
}

function buildArmGeo(T) {
  const parts = [];
  // Pivot is at shoulder (y = 0); arm hangs down to y = -0.54
  // Upper sleeve (tinted by instanceColor because painted white)
  const sleeve = new T.CylinderGeometry(0.054, 0.046, 0.22, 8);
  sleeve.translate(0, -0.10, 0);
  parts.push(paintGeo(T, sleeve, 0xffffff, 0.08));

  // Forearm (skin tone)
  const forearm = new T.CapsuleGeometry(0.038, 0.22, 5, 8);
  forearm.translate(0, -0.32, 0.01);
  parts.push(paintGeo(T, forearm, 0xc68658, 0.08));

  // Hand
  const hand = new T.SphereGeometry(0.042, 7, 6);
  hand.scale(0.85, 1.15, 0.95);
  hand.translate(0, -0.47, 0.015);
  parts.push(paintGeo(T, hand, 0xc68658, 0.05));

  return mergeGeometries(parts, false);
}

function buildLegGeo(T) {
  const parts = [];
  // Pivot is at hip (y = 0); leg extends down to foot at y = -0.68
  const trouser = new T.CapsuleGeometry(0.065, 0.46, 6, 8);
  trouser.translate(0, -0.30, 0);
  parts.push(paintGeo(T, trouser, 0x1e293b, 0.08));

  // Ankle + Sandal / Shoe protruding forward (+Z)
  const shoe = new T.BoxGeometry(0.095, 0.065, 0.20);
  shoe.translate(0, -0.645, 0.035);
  parts.push(paintGeo(T, shoe, 0x27201c, 0.04));

  return mergeGeometries(parts, false);
}

function buildVendorCartAndVendorGeo(T) {
  const parts = [];

  // Wooden 4-wheeled Indian street thela (fruit/chai pushcart) + standing vendor
  // Cart bed at y = 0.78
  const bed = new T.BoxGeometry(1.15, 0.10, 1.65);
  bed.translate(0, 0.78, 0);
  parts.push(paintGeo(T, bed, 0x854d0e, 0.08));

  const rimL = new T.BoxGeometry(0.06, 0.14, 1.65);
  rimL.translate(0.55, 0.86, 0);
  const rimR = rimL.clone();
  rimR.translate(-1.10, 0, 0);
  parts.push(paintGeo(T, rimL, 0x713f12), paintGeo(T, rimR, 0x713f12));

  // 4 Spoked Cart Wheels
  for (const sx of [-0.54, 0.54]) {
    for (const sz of [-0.58, 0.58]) {
      const wheel = new T.CylinderGeometry(0.28, 0.28, 0.06, 12);
      wheel.rotateZ(Math.PI / 2);
      wheel.translate(sx, 0.28, sz);
      parts.push(paintGeo(T, wheel, 0x1e293b, 0.04));

      const leg = new T.BoxGeometry(0.05, 0.46, 0.05);
      leg.translate(sx * 0.88, 0.52, sz);
      parts.push(paintGeo(T, leg, 0x451a03));
    }
  }

  // 4 Corner Bamboo Poles + Colorful Tarpaulin Canopy Roof
  for (const sx of [-0.50, 0.50]) {
    for (const sz of [-0.72, 0.72]) {
      const pole = new T.CylinderGeometry(0.025, 0.028, 1.18, 6);
      pole.translate(sx, 1.38, sz);
      parts.push(paintGeo(T, pole, 0xa16207));
    }
  }
  const canopy = new T.ConeGeometry(1.18, 0.36, 4);
  canopy.rotateY(Math.PI / 4);
  canopy.scale(0.88, 1.0, 1.22);
  canopy.translate(0, 2.08, 0);
  parts.push(paintGeo(T, canopy, 0xea580c, 0.10));

  // Colourful fruit/vegetable mounds on cart bed (bananas, mangoes, coconuts, greens)
  const moundColors = [0xfacc15, 0x16a34a, 0xef4444, 0xf97316];
  for (let m = 0; m < 4; m++) {
    const mound = new T.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    mound.scale(1.15, 0.85, 1.05);
    mound.translate((m % 2 === 0 ? -0.24 : 0.24), 0.82, (m < 2 ? -0.38 : 0.38));
    parts.push(paintGeo(T, mound, moundColors[m], 0.12));
  }

  // Standing Vendor beside the cart (x = -0.82, z = 0)
  const vx = -0.82;
  const vLegs = new T.CylinderGeometry(0.14, 0.16, 0.72, 10);
  vLegs.translate(vx, 0.36, 0);
  parts.push(paintGeo(T, vLegs, 0xf1f5f9, 0.06)); // white dhoti/lungi

  const vTorso = new T.CapsuleGeometry(0.145, 0.34, 6, 10);
  vTorso.scale(1.15, 1.0, 0.85);
  vTorso.translate(vx, 0.98, 0);
  parts.push(paintGeo(T, vTorso, 0x0284c7, 0.10));

  // Gamcha towel over vendor shoulder
  const gamcha = new T.BoxGeometry(0.10, 0.42, 0.24);
  gamcha.translate(vx + 0.11, 1.00, 0.02);
  parts.push(paintGeo(T, gamcha, 0xdc2626, 0.08));

  const vHead = new T.SphereGeometry(0.135, 12, 10);
  vHead.translate(vx, 1.42, 0);
  parts.push(paintGeo(T, vHead, 0xbd7e52, 0.10));

  const vTurban = new T.TorusGeometry(0.105, 0.045, 6, 10);
  vTurban.rotateX(Math.PI / 2 - 0.1);
  vTurban.translate(vx, 1.50, 0);
  parts.push(paintGeo(T, vTurban, 0xf97316, 0.08));

  for (const side of [-1, 1]) {
    const vArm = new T.CapsuleGeometry(0.042, 0.38, 5, 8);
    vArm.rotateZ(side === 1 ? -0.35 : 0.12);
    vArm.translate(vx + side * 0.20, 0.95, side === 1 ? 0.08 : 0);
    parts.push(paintGeo(T, vArm, 0xbd7e52, 0.06));
  }

  return mergeGeometries(parts, false);
}

function normalizeWalkSegs(roadSegs, solidFn) {
  const list = [];
  for (let i = 0; i < roadSegs.length; i++) {
    const s = roadSegs[i];
    if (!s) continue;
    const x1 = s.x1 ?? s[0] ?? 0;
    const z1 = s.z1 ?? s[1] ?? 0;
    const x2 = s.x2 ?? s[2] ?? 0;
    const z2 = s.z2 ?? s[3] ?? 0;
    const width = s.width ?? s[6] ?? 8.2;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 10) continue;
    const ux = dx / len;
    const uz = dz / len;
    const mx = (x1 + x2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    list.push({
      x1, z1, x2, z2,
      mx, mz,
      width,
      len,
      ux, uz,
      name: s.name || ''
    });
  }
  if (list.length === 0) {
    list.push({
      x1: -133, z1: -430, x2: -133, z2: -200,
      mx: -133, mz: -315, width: 10, len: 230, ux: 0, uz: 1, name: '100 Feet Road'
    });
  }
  return list;
}

export function createCrowd({
  THREE: T = THREE,
  scene,
  roadSegs = [],
  solidFn = () => 0,
  getAuto,
  nightUniform,
  count = 78
}) {
  // Strictly enforce performance budget: cap pedestrian count at 120
  const maxPeds = Math.min(84, Math.max(36, count || 78));
  const group = new T.Group();
  scene.add(group);

  const walkSegs = normalizeWalkSegs(roadSegs, solidFn);

  // Materials (shared across all instanced meshes for minimal state switches)
  const clothMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.68,
    metalness: 0.05
  });
  const fixedMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.06
  });

  // 4 Torso Attire Variants (Kurta, Shirt+Backpack, Saree, Lungi)
  // Walker clothing-class quotas (identity classes; geometry comes from the shared gem variants)
  const classCounts = [
    ['saree', Math.round(maxPeds * 0.25)],
    ['kurta', Math.round(maxPeds * 0.25)],
    ['lungi', Math.round(maxPeds * 0.20)],
    ['shirt', 0]
  ];
  classCounts[3][1] = Math.max(1, maxPeds - (classCounts[0][1] + classCounts[1][1] + classCounts[2][1]));

  // High-fidelity articulated pedestrians for the nearest walkers (draw calls bounded by slot count)
  const GEM_SLOTS = 26;
  const gemProto = [0, 1, 2, 3, 4, 5].map(v => buildPedestrianMerged(v));
  const gemSlots = [];
  for (let j = 0; j < GEM_SLOTS; j++) {
    const g = gemProto[j % gemProto.length].clone(true);
    g.userData.parts = {
      body: g.getObjectByName('body'), head: g.getObjectByName('head'),
      leftArm: g.getObjectByName('leftArm'), rightArm: g.getObjectByName('rightArm'),
      leftLeg: g.getObjectByName('leftLeg'), rightLeg: g.getObjectByName('rightLeg')
    };
    g.visible = false;
    group.add(g);
    gemSlots.push({ g, variant: j % gemProto.length, pedId: -1 });
  }
  // a walker's model must be STABLE: a slot stays locked to the same ped until that ped is far away
  const gemClass = { saree: [0, 1], kurta: [4], lungi: [5], shirt: [2, 3] };
  const mZero = new T.Matrix4().makeScale(0, 0, 0);
  const sOne = new T.Vector3(1, 1, 1);
  // Far LOD: each clothing variant baked to a static merged mesh set, instanced.
  // Far walkers render the SAME model as the near detailed mesh (no walk articulation) - the 60m swap no longer changes a walker's silhouette.
  const farVariants = [];
  for (let v = 0; v < gemProto.length; v++) {
    const proto = buildPedestrianMerged(v);
    proto.updateWorldMatrix(true, true);
    const byMat = new Map();
    proto.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const key = o.material.uuid;
      if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] });
      byMat.get(key).geos.push(geo);
    });
    const sets = [];
    for (const { mat, geos } of byMat.values()) {
      const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
      if (!merged) continue;
      const im = new T.InstancedMesh(merged, mat, maxPeds);
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      for (let k = 0; k < maxPeds; k++) im.setMatrixAt(k, mZero);
      group.add(im);
      sets.push(im);
    }
    farVariants.push(sets);
  }
  const farVariantOf = (p) => {
    const cls = gemClass[p.tkey] || [2, 3];
    return p._gemVariant !== undefined ? p._gemVariant : (p._lastGemVariant !== undefined ? p._lastGemVariant : cls[p.id % cls.length]);
  };

  // 8 Vibrant Indian Street Clothing Palette Variants
  const palette8 = [
    0xe11d48, // Rani Pink / Crimson
    0x2563eb, // Royal Cobalt Blue
    0x16a34a, // Emerald Green
    0xd97706, // Marigold Ochre
    0x9333ea, // Deep Jamun Purple
    0x0891b2, // Peacock Teal
    0xfacc15, // Haldi Yellow
    0xf97316  // Saffron Orange
  ];
  const colC = new T.Color();

  function readPlayer() {
    const raw = getAuto ? getAuto() : null;
    const px = (raw && typeof raw.x === 'number') ? raw.x : -133;
    const pz = (raw && typeof raw.z === 'number') ? raw.z : -345;
    const pyaw = (raw && typeof raw.yaw === 'number') ? raw.yaw
      : ((raw && typeof raw.heading === 'number') ? raw.heading
      : ((raw && typeof raw.rotY === 'number') ? raw.rotY : 0));
    return { x: px, z: pz, hx: Math.sin(pyaw), hz: Math.cos(pyaw) };
  }

  // Compute valid footpath/verge offset strictly between 3.4m and 6.0m from road centreline
  function pointOnAnyCarriageway(x, z) {
    for (let i = 0; i < roadSegs.length; i++) {
      const r = roadSegs[i];
      const x1 = r.x1 ?? r[0], z1 = r.z1 ?? r[1], x2 = r.x2 ?? r[2], z2 = r.z2 ?? r[3];
      if (x < Math.min(x1, x2) - 9 || x > Math.max(x1, x2) + 9 || z < Math.min(z1, z2) - 9 || z > Math.max(z1, z2) + 9) continue;
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
      const w = r.width ?? r[6] ?? 7;
      if (d < w * 0.5 + 0.4) return true;
    }
    return false;
  }
  function offsetClear(seg, off) {
    for (const t of [0.05, 0.3, 0.55, 0.8, 0.95]) {
      const p = evalFootpathPoint(seg, t, off);
      if (pointOnAnyCarriageway(p.x, p.z)) return false;
    }
    return true;
  }
  function computeFootpathOffset(seg, side, seedVal) {
    const minOff = Math.max(3.4, seg.width * 0.5 + 0.65);
    const maxOff = Math.min(6.0, Math.max(minOff + 0.4, seg.width * 0.5 + 1.85));
    const mag = T.MathUtils.clamp(minOff + hash(seedVal, seg.mx, 19) * (maxOff - minOff), 3.4, 6.0);
    if (offsetClear(seg, mag * side)) return mag * side;
    if (offsetClear(seg, -mag * side)) return -mag * side;
    return mag * side;
  }

  function isSolidSafe(x, z) {
    if (!solidFn) return true;
    if (solidFn(x, z)) return false;
    if (solidFn(x + 0.35, z)) return false;
    if (solidFn(x - 0.35, z)) return false;
    if (solidFn(x, z + 0.35)) return false;
    if (solidFn(x, z - 0.35)) return false;
    return true;
  }

  function evalFootpathPoint(seg, t, kerbOff) {
    const x = seg.x1 + seg.ux * seg.len * t - seg.uz * kerbOff;
    const z = seg.z1 + seg.uz * seg.len * t + seg.ux * kerbOff;
    return { x, z };
  }

  // Pick a footpath placement within [minDist, maxDist] of player, clear of solidFn
  function pickFootpathPlacement(px, pz, hx, hz, minDist, maxDist, biasAhead, seedVal) {
    let bestSeg = walkSegs[0];
    let bestT = 0.5;
    let bestOff = 4.2;
    let bestScore = -1e9;

    const trials = Math.min(walkSegs.length, 28);
    const startIdx = Math.floor(hash(seedVal, px + pz, 13) * walkSegs.length);

    for (let k = 0; k < trials; k++) {
      const seg = walkSegs[(startIdx + k * 3) % walkSegs.length];
      const tCand = 0.08 + hash(seedVal + k, seg.mz, 29) * 0.84;
      const side = ((k + Math.floor(seedVal)) % 2 === 0) ? 1 : -1;
      const offCand = computeFootpathOffset(seg, side, seedVal + k);
      const pt = evalFootpathPoint(seg, tCand, offCand);

      const dx = pt.x - px;
      const dz = pt.z - pz;
      const dist = Math.hypot(dx, dz);

      let score = 0;
      if (dist >= minDist && dist <= maxDist) {
        score += 200 - Math.abs(dist - (minDist + maxDist) * 0.5);
      } else {
        score -= Math.abs(dist - (minDist + maxDist) * 0.5);
      }

      if (biasAhead && dist > 1) {
        const dot = (dx * hx + dz * hz) / dist;
        score += dot * 75;
      }

      if (!isSolidSafe(pt.x, pt.z)) {
        score -= 2000;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSeg = seg;
        bestT = tCand;
        bestOff = offCand;
      }
    }

    return { seg: bestSeg, t: bestT, kerbOff: bestOff };
  }

  const p0 = readPlayer();
  const nearSegs = walkSegs.filter(s => Math.hypot(s.mx - p0.x, s.mz - p0.z) < 155);
  const startPool = nearSegs.length > 0 ? nearSegs : walkSegs;

  const peds = [];
  let cIdx = 0, cSub = 0;

  for (let i = 0; i < maxPeds; i++) {
    while (cIdx < classCounts.length - 1 && cSub >= classCounts[cIdx][1]) { cIdx++; cSub = 0; }
    const tkey = classCounts[cIdx][0]; cSub++;

    // Initial placement along nearby footpaths within 15m..140m of player
    let seg = startPool[i % startPool.length];
    const side = (i % 2 === 0) ? 1 : -1;
    let kerbOff = computeFootpathOffset(seg, side, i * 7.1);
    let tParam = 0.08 + ((i * 0.19) % 0.84);
    let pt = evalFootpathPoint(seg, tParam, kerbOff);

    if (Math.hypot(pt.x - p0.x, pt.z - p0.z) > 145 || !isSolidSafe(pt.x, pt.z)) {
      const picked = pickFootpathPlacement(p0.x, p0.z, p0.hx, p0.hz, 14, 138, false, i * 17.3);
      seg = picked.seg;
      tParam = picked.t;
      kerbOff = picked.kerbOff;
      pt = evalFootpathPoint(seg, tParam, kerbOff);
    }

    const dir = (i % 2 === 0) ? 1 : -1;
    peds.push({
      id: i,
      isSaree: tkey === 'saree',
      tkey,
      seg,
      t: tParam,
      dir,
      kerbOff,
      speed: 1.05 + hash(i, cSub, 41) * 0.55,
      phase: i * 1.13,
      x: pt.x,
      z: pt.z,
      yaw: Math.atan2(seg.ux * dir, seg.uz * dir)
    });
  }


  // Static Street Vendors standing by pushcarts on wide verges
  const vendorSpots = [];
  for (let i = 0; i < walkSegs.length && vendorSpots.length < 14; i++) {
    const s = walkSegs[i];
    if (s.len < 28) continue;
    for (const frac of [0.28, 0.72]) {
      if (vendorSpots.length >= 14) break;
      const side = (i % 2 === 0) ? 1 : -1;
      const vOff = Math.min(5.8, Math.max(4.1, s.width * 0.5 + 1.45)) * side;
      const vx = s.x1 + s.ux * s.len * frac - s.uz * vOff;
      const vz = s.z1 + s.uz * s.len * frac + s.ux * vOff;
      if (Math.hypot(vx - (-133), vz - (-345)) < 16) continue;
      if (!isSolidSafe(vx, vz) || !isSolidSafe(vx + 0.9, vz + 0.9) || !isSolidSafe(vx - 0.9, vz - 0.9)) continue;
      vendorSpots.push({ x: vx, z: vz, yaw: Math.atan2(s.ux, s.uz) });
    }
  }

  if (vendorSpots.length > 0) {
    const vendorCartGeo = buildVendorCartAndVendorGeo(T);
    const vendorInst = new T.InstancedMesh(vendorCartGeo, fixedMat, vendorSpots.length);
    const vm4 = new T.Matrix4();
    const vq4 = new T.Quaternion();
    const vv3 = new T.Vector3();
    const vs3 = new T.Vector3(1, 1, 1);
    const vyAxis = new T.Vector3(0, 1, 0);
    for (let i = 0; i < vendorSpots.length; i++) {
      const vp = vendorSpots[i];
      vq4.setFromAxisAngle(vyAxis, vp.yaw);
      vm4.compose(vv3.set(vp.x, 0, vp.z), vq4, vs3);
      vendorInst.setMatrixAt(i, vm4);
    }
    vendorInst.castShadow = true;
    vendorInst.receiveShadow = true;
    vendorInst.frustumCulled = false;
    vendorInst.instanceMatrix.needsUpdate = true;
    group.add(vendorInst);
  }

  // Reusable math scratch objects for update()
  const m4 = new T.Matrix4();
  const qYaw = new T.Quaternion();
  const qSwing = new T.Quaternion();
  const qLimb = new T.Quaternion();
  const vPos = new T.Vector3();
  const PS = 1.12;
  const s3 = new T.Vector3(PS, PS, PS);
  const yAxis = new T.Vector3(0, 1, 0);
  const xAxis = new T.Vector3(1, 0, 0);
  const eul = new T.Euler();
  const qAll = new T.Quaternion();
  let elapsed = 0;

  function update(dt = 0.016, hour = 17.8) {
    const safeDt = Math.min(0.1, Math.max(0.001, dt || 0.016));
    elapsed += safeDt;
    const player = readPlayer();

    for (let i = 0; i < maxPeds; i++) {
      const p = peds[i];

      // Knocked-by-impact ped: ballistic flight, tumble, land, recover to a footpath
      if (p.kn) {
        const kn = p.kn;
        kn.t += safeDt;
        kn.vx *= Math.max(0, 1 - 1.6 * safeDt); kn.vz *= Math.max(0, 1 - 1.6 * safeDt);
        kn.vy -= 22 * safeDt;
        p.x += kn.vx * safeDt; p.z += kn.vz * safeDt;
        p.ky = (p.ky || 0) + kn.vy * safeDt;
        if (p.ky <= 0 && kn.vy < 0) {
          p.ky = 0;
          if (kn.landT === undefined) kn.landT = elapsed;
          if (elapsed - kn.landT > 1.1) {
            // stand up where it landed and walk back to the footpath: re-attach to the nearest footpath segment at the
            // ped's real lateral offset (no position jump), then ease the offset to a normal footpath lane.
            let bs = null, bt = 0.5, bl = 0, bd = 1e9;
            for (let wi = 0; wi < walkSegs.length; wi++) {
              const sg = walkSegs[wi];
              const rx = p.x - sg.x1, rz = p.z - sg.z1;
              const tt = (rx * sg.ux + rz * sg.uz) / sg.len;
              if (tt < 0.06 || tt > 0.94) continue;
              const lat = rx * (-sg.uz) + rz * sg.ux;
              const d = Math.abs(lat - 4.2 * Math.sign(lat || 1)); // distance from a typical footpath lane
              if (d < bd) { bd = d; bs = sg; bt = tt; bl = lat; }
            }
            if (bs && bd < 40) {
              p.seg = bs; p.t = bt; p.kerbOff = bl;
              p.kerbTarget = computeFootpathOffset(bs, bl >= 0 ? 1 : -1, p.id);
            } else {
              const picked = pickFootpathPlacement(p.x, p.z, 0, 0, 2, 60, false, p.id + elapsed * 13);
              p.seg = picked.seg; p.t = picked.t; p.kerbOff = picked.kerbOff;
            }
            p.kn = null; p.ky = 0;
            continue;
          }
        }
        const tumble = kn.t * kn.spin;
        eul.set(tumble, p.yaw, tumble * 0.6);
        qAll.setFromEuler(eul);
        vPos.set(p.x, p.ky, p.z);
        m4.compose(vPos, qAll, sOne);
        for (const im of farVariants[farVariantOf(p)]) im.setMatrixAt(i, m4);
        continue;
      }
      const seg = p.seg;

      if (p.kerbTarget !== undefined) { // walking back to the footpath lane after being struck
        const dk = p.kerbTarget - p.kerbOff, stp = 1.4 * safeDt;
        if (Math.abs(dk) <= stp) { p.kerbOff = p.kerbTarget; p.kerbTarget = undefined; } else p.kerbOff += Math.sign(dk) * stp;
      }
      // Advance along footpath
      const nextT = p.t + (p.dir * p.speed * safeDt) / seg.len;
      const candPt = evalFootpathPoint(seg, nextT, p.kerbOff);

      // Reverse direction at segment ends or if a solid building/obstacle blocks the footpath
      if (nextT > 0.95 || nextT < 0.05 || !isSolidSafe(candPt.x, candPt.z)) {
        p.dir *= -1;
        p.t = T.MathUtils.clamp(p.t, 0.06, 0.94);
      } else {
        p.t = nextT;
      }

      let pt = evalFootpathPoint(p.seg, p.t, p.kerbOff);

      // Keep within 150m of the player; recycle distant pedestrians or those in solid cells
      const dx = pt.x - player.x;
      const dz = pt.z - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 150 || !isSolidSafe(pt.x, pt.z)) {
        const picked = pickFootpathPlacement(player.x, player.z, player.hx, player.hz, 35, 135, true, i + elapsed * 10);
        p.seg = picked.seg;
        p.t = picked.t;
        p.kerbOff = picked.kerbOff;
        p.dir = (i % 2 === 0) ? 1 : -1;
        pt = evalFootpathPoint(p.seg, p.t, p.kerbOff);
      }

      p.x = pt.x;
      p.z = pt.z;
      p.yaw = Math.atan2(p.seg.ux * p.dir, p.seg.uz * p.dir);

      qYaw.setFromAxisAngle(yAxis, p.yaw);
      vPos.set(p.x, 0, p.z);
      m4.compose(vPos, qYaw, sOne);
      for (const im of farVariants[farVariantOf(p)]) im.setMatrixAt(i, m4);
    }

    // Swap the nearest walkers to the high-fidelity models (hide their instanced proxies)
    const byDist = [];
    for (let i = 0; i < peds.length; i++) {
      const dx = peds[i].x - player.x, dz = peds[i].z - player.z;
      byDist.push([dx * dx + dz * dz, i]);
    }
    byDist.sort((a, b) => a[0] - b[0]);
    // release locks for peds that moved out of range (hysteresis: in at 60m, out at 65m)
    for (let j = 0; j < gemSlots.length; j++) {
      const sl = gemSlots[j];
      if (sl.pedId < 0) continue;
      const q = peds[sl.pedId];
      const ddx = q.x - player.x, ddz = q.z - player.z;
      if (ddx * ddx + ddz * ddz > 65 * 65) { q._lastGemVariant = sl.variant; sl.pedId = -1; sl.g.visible = false; q._gemVariant = undefined; }
    }
    // assign free slots to the nearest unlocked peds, matching clothing class so the swap never changes who someone is
    for (let k = 0; k < byDist.length; k++) {
      if (byDist[k][0] > 3600) break;
      const p = peds[byDist[k][1]];
      let locked = false;
      for (let j = 0; j < gemSlots.length; j++) if (gemSlots[j].pedId === p.id) { locked = true; break; }
      if (locked) continue;
      const classes = gemClass[p.tkey] || [2, 3];
      let picked = -1;
      if (p._lastGemVariant !== undefined) {
        for (let j = 0; j < gemSlots.length; j++) if (gemSlots[j].pedId === -1 && gemSlots[j].variant === p._lastGemVariant) { picked = j; break; }
      }
      if (picked === -1) for (let j = 0; j < gemSlots.length; j++) { if (gemSlots[j].pedId === -1 && classes.includes(gemSlots[j].variant)) { picked = j; break; } }
      if (picked !== -1) { gemSlots[picked].pedId = p.id; p._gemVariant = gemSlots[picked].variant; }
    }
    for (let j = 0; j < gemSlots.length; j++) {
      const g = gemSlots[j].g;
      if (gemSlots[j].pedId < 0) { g.visible = false; continue; }
      const p = peds[gemSlots[j].pedId];
      for (const im of farVariants[farVariantOf(p)]) im.setMatrixAt(p.id, mZero);
      g.visible = true;
      if (p.kn) {
        g.position.set(p.x, p.ky || 0, p.z);
        g.rotation.set(p.kn.t * p.kn.spin, p.yaw, p.kn.t * p.kn.spin * 0.6);
      } else {
        g.position.set(p.x, 0, p.z);
        g.rotation.set(0, p.yaw, 0);
        tickWalk(g, elapsed + p.phase, Math.min(1.6, p.speed * 0.8));
      }
    }

    for (const sets of farVariants) for (const im of sets) im.instanceMatrix.needsUpdate = true;
  }

  // Populate initial transforms immediately at startup
  update(0.016, 17.8);

  // impact reaction: the nearest walker gets knocked off their feet (playful hop, no gore)
  function kickAt(x, z, dx, dz, power) {
    let best = null, bestD = 2.4 * 2.4;
    for (let i = 0; i < peds.length; i++) {
      const q = peds[i];
      if (q.kn) continue;
      const ddx = q.x - x, ddz = q.z - z;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < bestD) { bestD = d2; best = q; }
    }
    if (!best) return false;
    const pw = Math.min(8, power * 1.5);
    const side = (best.x - x) * dz - (best.z - z) * dx;
    best.kn = {
      vx: dx * pw * 1.6 + (side >= 0 ? dz : -dz) * pw * 0.35,
      vz: dz * pw * 1.6 - (side >= 0 ? dx : -dx) * pw * 0.35,
      vy: 3.4 + pw * 0.5,
      spin: (side >= 0 ? 1 : -1) * (2.2 + Math.min(3, pw * 0.4)),
      t: 0,
      landT: undefined
    };
    best.ky = 0.02;
    return true;
  }

  function solid(x, z) {
    for (let i = 0; i < peds.length; i++) {
      const q = peds[i];
      if (q.kn) continue; // a knocked ped is airborne/recovering, not a wall
      const dx = x - q.x, dz = z - q.z;
      if (dx * dx + dz * dz < 0.36) return true;
    }
    return false;
  }

  return { group, update, solid, peds, kickAt };
}
