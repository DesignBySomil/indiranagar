// src/brands.js
import * as THREE from 'three';

export const BRAND_FOOTPRINTS = {
  'Nike': { w: 14, d: 12, h: 12 },
  'Adidas': { w: 14, d: 12, h: 12 },
  'The Souled Store': { w: 14, d: 12, h: 12 },
  "Levi's": { w: 14, d: 12, h: 12 },
  'Hush Puppies': { w: 14, d: 12, h: 12 },
  'Equilibrium Climbing': { w: 14, d: 12, h: 12 },
  'CRED': { w: 14, d: 12, h: 21 },
  'The Leela Palace': { w: 34, d: 26, h: 26 }
};

function bindNightGlow(mat, nightUniform, base = 0.15, mult = 1.6) {
  if (!nightUniform) return mat;
  mat.userData.nightGlow = { base, mult };
  const dummy = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  dummy.frustumCulled = false;
  dummy.onBeforeRender = () => {
    mat.emissiveIntensity = base + nightUniform.value * mult;
  };
  mat.userData.glowProxy = dummy;
  return mat;
}

export function updateBrandStores(group, nightUniform) {
  if (!group || !nightUniform) return;
  const n = nightUniform.value;
  group.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (m && m.userData && m.userData.nightGlow) {
        m.emissiveIntensity = m.userData.nightGlow.base + n * m.userData.nightGlow.mult;
      }
    }
  });
}

function makeBrandSignTexture(T, name) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');

  if (name === 'Nike') {
    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#ff5a00';
    ctx.fillRect(0, 236, 1024, 20);

    // Iconic Nike Swoosh drawn with canvas path
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(220, 92);
    ctx.bezierCurveTo(185, 150, 195, 202, 260, 194);
    ctx.bezierCurveTo(340, 184, 495, 110, 565, 76);
    ctx.bezierCurveTo(455, 114, 325, 148, 268, 146);
    ctx.bezierCurveTo(230, 145, 215, 120, 220, 92);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('NIKE', 590, 108);
    ctx.fillStyle = '#ff6a1a';
    ctx.font = '700 40px sans-serif';
    ctx.fillText('100 FEET ROAD', 590, 184);
  } else if (name === 'Adidas') {
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 1008, 240);

    // Three diagonal white stripes badge
    ctx.fillStyle = '#ffffff';
    const bars = [
      { x: 185, y: 148, h: 48 },
      { x: 235, y: 112, h: 84 },
      { x: 285, y: 74,  h: 122 }
    ];
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(-0.42);
      ctx.fillRect(0, 0, 30, b.h);
      ctx.restore();
    }

    ctx.font = '900 86px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('adidas', 395, 106);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 38px sans-serif';
    ctx.fillText('ORIGINALS & PERFORMANCE', 395, 184);
  } else if (name === 'The Souled Store') {
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 1024, 16);
    ctx.fillRect(0, 240, 1024, 16);

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(170, 128, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141416';
    ctx.font = '900 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TSS', 170, 130);

    ctx.fillStyle = '#facc15';
    ctx.font = '900 68px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('THE SOULED STORE', 275, 104);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px sans-serif';
    ctx.fillText('POP CULTURE MERCH', 275, 182);
  } else if (name === "Levi's") {
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, 1024, 256);

    // Classic red Levi's batwing arch logo
    ctx.fillStyle = '#c41230';
    ctx.beginPath();
    ctx.moveTo(150, 36);
    ctx.lineTo(874, 36);
    ctx.lineTo(838, 178);
    ctx.quadraticCurveTo(660, 145, 512, 196);
    ctx.quadraticCurveTo(364, 145, 186, 178);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 82px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("LEVI'S", 512, 106);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 36px sans-serif';
    ctx.fillText('ORIGINAL DENIM · 100 FEET ROAD', 512, 224);
  } else if (name === 'Hush Puppies') {
    ctx.fillStyle = '#0f3c78';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 1000, 232);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 72px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Hush Puppies', 512, 98);

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 38px sans-serif';
    ctx.fillText('COMFORT FOOTWEAR', 512, 184);
  } else if (name === 'Equilibrium Climbing') {
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(0, 0, 28, 256);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(996, 0, 28, 256);

    ctx.fillStyle = '#f97316';
    ctx.font = '900 66px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EQUILIBRIUM', 512, 94);

    ctx.fillStyle = '#2dd4bf';
    ctx.font = '700 36px sans-serif';
    ctx.fillText('CLIMBING STATION', 512, 182);
  } else if (name === 'CRED') {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 976, 208);

    // Shield emblem + thin geometric CRED wordmark
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(255, 62);
    ctx.lineTo(315, 62);
    ctx.lineTo(315, 130);
    ctx.lineTo(285, 168);
    ctx.lineTo(255, 130);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '300 84px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('C R E D', 360, 106);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 36px sans-serif';
    ctx.fillText('INDIRANAGAR', 365, 182);
  } else if (name === 'The Leela Palace') {
    ctx.fillStyle = '#4c0d19';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 996, 228);

    ctx.fillStyle = '#facc15';
    ctx.font = '800 66px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE LEELA PALACE', 512, 98);

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 38px sans-serif';
    ctx.fillText('BENGALURU', 512, 182);
  }

  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function addAttachedStorefrontBase(T, g, w, d, h, opts, nightUniform) {
  const wallMat = new T.MeshStandardMaterial({
    color: opts.wallHex,
    roughness: opts.wallRoughness ?? 0.72,
    metalness: opts.wallMetalness ?? 0.08
  });

  // Main concrete structure centered so front wall is at z = +d/2
  const body = new T.Mesh(new T.BoxGeometry(w, h, d), wallMat);
  body.position.set(0, h * 0.5, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const frontZ = d * 0.5;

  // Ground-floor warm illuminated retail interior backdrop plane
  const intMat = new T.MeshStandardMaterial({
    color: opts.interiorHex || 0xfff0cc,
    emissive: new T.Color(opts.interiorHex || 0xffcf78),
    emissiveIntensity: 0.25,
    roughness: 0.4
  });
  bindNightGlow(intMat, nightUniform, 0.22, 1.55);
  if (intMat.userData.glowProxy) g.add(intMat.userData.glowProxy);

  const gw = w * 0.78;
  const gh = 3.2;
  const backPlane = new T.Mesh(new T.PlaneGeometry(gw, gh), intMat);
  backPlane.position.set(0, 1.9, frontZ - 0.55);
  g.add(backPlane);

  // Interior recess side walls & floor so interior has physical depth
  const recessBox = new T.Mesh(
    new T.BoxGeometry(gw + 0.1, gh + 0.1, 0.6),
    new T.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.6 })
  );
  recessBox.position.set(0, 1.9, frontZ - 0.28);
  g.add(recessBox);

  // Simple mannequins (capsules) & display shelves inside the window
  const manMat = new T.MeshStandardMaterial({ color: opts.mannequinHex || 0xf1f5f9, roughness: 0.35 });
  const shelfMat = new T.MeshStandardMaterial({ color: opts.accentHex || 0x334155, roughness: 0.5 });
  for (let mx = -gw * 0.34; mx <= gw * 0.34; mx += gw * 0.34) {
    const ped = new T.Mesh(new T.BoxGeometry(0.65, 0.45, 0.45), shelfMat);
    ped.position.set(mx, 0.55, frontZ - 0.22);
    const torso = new T.Mesh(new T.CapsuleGeometry(0.18, 0.75, 4, 8), manMat);
    torso.position.set(mx, 1.35, frontZ - 0.22);
    g.add(ped, torso);
  }

  // Transparent shopfront glass pane + mullion frames + rolled-up top shutter box
  const glassMat = new T.MeshStandardMaterial({
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.34,
    roughness: 0.08,
    metalness: 0.25
  });
  const glass = new T.Mesh(new T.PlaneGeometry(gw, gh), glassMat);
  glass.position.set(0, 1.9, frontZ + 0.05);
  g.add(glass);

  const frameMat = new T.MeshStandardMaterial({ color: opts.trimHex || 0x111317, roughness: 0.4, metalness: 0.5 });
  const shutterHood = new T.Mesh(new T.BoxGeometry(gw + 0.4, 0.32, 0.35), frameMat);
  shutterHood.position.set(0, 3.55, frontZ + 0.15);
  g.add(shutterHood);

  // Entrance steps + wheelchair ramp at front (+Z)
  const stepMat = new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const step1 = new T.Mesh(new T.BoxGeometry(4.2, 0.18, 0.9), stepMat);
  step1.position.set(0, 0.09, frontZ + 0.45);
  const step2 = new T.Mesh(new T.BoxGeometry(3.6, 0.18, 0.55), stepMat);
  step2.position.set(0, 0.24, frontZ + 0.25);
  const ramp = new T.Mesh(new T.BoxGeometry(1.8, 0.14, 1.1), stepMat);
  ramp.position.set(2.8, 0.12, frontZ + 0.52);
  ramp.rotation.x = 0.22;
  g.add(step1, step2, ramp);

  // Projecting awning / canopy above entrance
  const awMat = new T.MeshStandardMaterial({ color: opts.awningHex || opts.accentHex || 0x1e293b, roughness: 0.55 });
  const awning = new T.Mesh(new T.BoxGeometry(w * 0.86, 0.20, 1.55), awMat);
  awning.position.set(0, 3.68, frontZ + 0.75);
  awning.rotation.x = 0.18;
  awning.castShadow = true;
  g.add(awning);

  // Physically attached main sign band flush on the building facade
  const signTex = makeBrandSignTexture(T, opts.name);
  const signMat = new T.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: new T.Color(0xffffff),
    emissiveIntensity: 0.2,
    roughness: 0.35,
    metalness: 0.1
  });
  bindNightGlow(signMat, nightUniform, 0.15, 1.6);
  if (signMat.userData.glowProxy) g.add(signMat.userData.glowProxy);

  const signBand = new T.Mesh(new T.BoxGeometry(w * 0.92, 2.05, 0.32), signMat);
  signBand.position.set(0, 4.85, frontZ + 0.16);
  g.add(signBand);

  // Concrete floor ledges / cornices, upper window rows & balconies with railings
  const ledgeMat = new T.MeshStandardMaterial({ color: opts.ledgeHex || 0xd6d3cd, roughness: 0.8 });
  const winGlowMat = new T.MeshStandardMaterial({
    color: opts.upperWinHex || 0xffe4b5,
    emissive: new T.Color(opts.upperWinHex || 0xffc870),
    emissiveIntensity: 0.2,
    roughness: 0.25
  });
  bindNightGlow(winGlowMat, nightUniform, 0.15, 1.45);
  if (winGlowMat.userData.glowProxy) g.add(winGlowMat.userData.glowProxy);

  const floors = Math.max(3, Math.round(h / 3.8));
  for (let f = 1; f < floors; f++) {
    const fy = 3.6 + f * ((h - 4.0) / Math.max(1, floors - 1));
    const ledge = new T.Mesh(new T.BoxGeometry(w + 0.4, 0.24, d + 0.4), ledgeMat);
    ledge.position.set(0, fy - 1.1, 0);
    g.add(ledge);

    // Balcony slab + iron railing on front
    const balcSlab = new T.Mesh(new T.BoxGeometry(w * 0.82, 0.18, 0.95), ledgeMat);
    balcSlab.position.set(0, fy - 1.05, frontZ + 0.45);
    const railTop = new T.Mesh(new T.BoxGeometry(w * 0.82, 0.08, 0.08), frameMat);
    railTop.position.set(0, fy - 0.22, frontZ + 0.88);
    g.add(balcSlab, railTop);

    for (let bx = -w * 0.38; bx <= w * 0.38; bx += 1.4) {
      const bar = new T.Mesh(new T.BoxGeometry(0.05, 0.82, 0.05), frameMat);
      bar.position.set(bx, fy - 0.62, frontZ + 0.88);
      g.add(bar);
    }

    // Upper window panes
    const cols = opts.winCols || 4;
    const spanX = w * 0.74;
    for (let c = 0; c < cols; c++) {
      const wx = -spanX * 0.5 + (c + 0.5) * (spanX / cols);
      const wFrame = new T.Mesh(new T.BoxGeometry(1.9, 1.55, 0.16), frameMat);
      wFrame.position.set(wx, fy, frontZ + 0.04);
      const wPane = new T.Mesh(new T.PlaneGeometry(1.65, 1.32), winGlowMat);
      wPane.position.set(wx, fy, frontZ + 0.13);
      g.add(wFrame, wPane);
    }
  }

  // Roof parapet & black Sintex water tank
  const parapet = new T.Mesh(new T.BoxGeometry(w + 0.45, 0.75, d + 0.45), frameMat);
  parapet.position.set(0, h + 0.25, 0);
  const sintex = new T.Mesh(
    new T.CylinderGeometry(0.85, 0.85, 1.65, 12),
    new T.MeshStandardMaterial({ color: 0x14171a, roughness: 0.5 })
  );
  sintex.position.set(-w * 0.26, h + 0.82, -d * 0.22);
  sintex.castShadow = true;
  g.add(parapet, sintex);
}

function buildEquilibriumStore(T, nightUniform) {
  const g = new T.Group();
  const { w, d, h } = BRAND_FOOTPRINTS['Equilibrium Climbing'];

  addAttachedStorefrontBase(T, g, w, d, h, {
    name: 'Equilibrium Climbing',
    wallHex: 0x646b73,
    trimHex: 0x1e242b,
    awningHex: 0x0d9488,
    accentHex: 0xf97316,
    interiorHex: 0xffedd5
  }, nightUniform);

  // Angled exterior climbing wall with 64 colourful climbing holds & orange/teal route tape
  const wallGroup = new T.Group();
  wallGroup.position.set(0, 7.8, d * 0.5 + 0.35);
  wallGroup.rotation.x = 0.12; // Slightly overhanging climbing face

  const panelMat = new T.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const climbWall = new T.Mesh(new T.BoxGeometry(w * 0.76, 5.2, 0.28), panelMat);
  wallGroup.add(climbWall);

  // Route tape strips (orange & teal)
  const tapeOrange = new T.MeshBasicMaterial({ color: 0xf97316 });
  const tapeTeal = new T.MeshBasicMaterial({ color: 0x14b8a6 });
  for (let r = -3.2; r <= 3.2; r += 2.1) {
    const strip = new T.Mesh(new T.BoxGeometry(0.12, 4.8, 0.31), r < 0 ? tapeOrange : tapeTeal);
    strip.position.set(r, 0, 0);
    strip.rotation.z = (r * 0.05);
    wallGroup.add(strip);
  }

  // 64 coloured holds (InstancedMesh for 1 draw call)
  const holdCount = 64;
  const holdGeo = new T.BoxGeometry(0.22, 0.18, 0.18);
  const holdMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const holdInst = new T.InstancedMesh(holdGeo, holdMat, holdCount);
  const holdPalette = [0xf97316, 0x14b8a6, 0xfacc15, 0xec4899, 0x22c55e, 0x38bdf8];
  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), vPos = new T.Vector3(), vSc = new T.Vector3(1, 1, 1), col = new T.Color();

  for (let i = 0; i < holdCount; i++) {
    const row = Math.floor(i / 8);
    const colIdx = i % 8;
    const hx = -4.2 + colIdx * 1.2 + ((row % 2) * 0.35 - 0.17);
    const hy = -2.1 + row * 0.62 + Math.sin(i * 2.3) * 0.12;
    q4.setFromAxisAngle(new T.Vector3(0, 0, 1), i * 0.7);
    m4.compose(vPos.set(hx, hy, 0.18), q4, vSc);
    holdInst.setMatrixAt(i, m4);
    col.setHex(holdPalette[i % holdPalette.length]);
    holdInst.setColorAt(i, col);
  }
  holdInst.instanceMatrix.needsUpdate = true;
  holdInst.instanceColor.needsUpdate = true;
  wallGroup.add(holdInst);
  g.add(wallGroup);

  // Vertical hanging banner sign on side of facade
  const vBanner = new T.Mesh(
    new T.BoxGeometry(1.1, 4.6, 0.25),
    new T.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.35 })
  );
  vBanner.position.set(w * 0.44, 8.0, d * 0.5 + 0.25);
  g.add(vBanner);

  return g;
}

function buildLeelaPalace(T, nightUniform) {
  const g = new T.Group();
  const { w, d, h } = BRAND_FOOTPRINTS['The Leela Palace'];
  const stoneMat = new T.MeshStandardMaterial({ color: 0xf3dec0, roughness: 0.68, metalness: 0.05 });
  const maroonMat = new T.MeshStandardMaterial({ color: 0x5c111f, roughness: 0.55 });
  const goldMat = new T.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.78 });

  // Grand 7-storey sandstone palace block
  const mainBody = new T.Mesh(new T.BoxGeometry(w, 20.5, d - 6), stoneMat);
  mainBody.position.set(0, 10.25, -2.0);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  g.add(mainBody);

  // Cornices & horizontal sandstone mouldings across 7 storeys
  for (let floor = 1; floor <= 7; floor++) {
    const fy = floor * 2.8;
    const cornice = new T.Mesh(new T.BoxGeometry(w + 0.6, 0.26, d - 5.4), stoneMat);
    cornice.position.set(0, fy, -2.0);
    g.add(cornice);
  }

  // Warm palace arched windows across 6 upper floors
  const archGlowMat = new T.MeshStandardMaterial({
    color: 0xffe4a3,
    emissive: new T.Color(0xffbe55),
    emissiveIntensity: 0.25,
    roughness: 0.3
  });
  bindNightGlow(archGlowMat, nightUniform, 0.18, 1.6);
  if (archGlowMat.userData.glowProxy) g.add(archGlowMat.userData.glowProxy);

  const frontWallZ = (d - 6) * 0.5 - 2.0;
  for (let floor = 1; floor < 7; floor++) {
    const wy = 1.6 + floor * 2.8;
    for (let cx = -13.5; cx <= 13.5; cx += 3.0) {
      const archFrame = new T.Mesh(new T.BoxGeometry(1.5, 1.9, 0.22), maroonMat);
      archFrame.position.set(cx, wy, frontWallZ + 0.05);
      const pane = new T.Mesh(new T.PlaneGeometry(1.2, 1.55), archGlowMat);
      pane.position.set(cx, wy, frontWallZ + 0.18);
      g.add(archFrame, pane);
    }
  }

  // Central Royal Dome + 4 Corner Chhatri Domes with Golden Finials
  const mainDrum = new T.Mesh(new T.CylinderGeometry(4.4, 4.6, 2.2, 20), stoneMat);
  mainDrum.position.set(0, 21.6, -2.0);
  const mainDome = new T.Mesh(new T.SphereGeometry(4.3, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), stoneMat);
  mainDome.position.set(0, 22.6, -2.0);
  const mainFinial = new T.Mesh(new T.ConeGeometry(0.38, 1.8, 10), goldMat);
  mainFinial.position.set(0, 27.2, -2.0);
  g.add(mainDrum, mainDome, mainFinial);

  const corners = [
    [-w * 0.42, frontWallZ - 1.5],
    [w * 0.42, frontWallZ - 1.5],
    [-w * 0.42, -d * 0.5 + 2.0],
    [w * 0.42, -d * 0.5 + 2.0]
  ];
  for (let i = 0; i < corners.length; i++) {
    const [cx, cz] = corners[i];
    const cup = new T.Mesh(new T.CylinderGeometry(1.8, 1.95, 1.6, 12), stoneMat);
    cup.position.set(cx, 21.3, cz);
    const smDome = new T.Mesh(new T.SphereGeometry(1.75, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), stoneMat);
    smDome.position.set(cx, 22.1, cz);
    const fin = new T.Mesh(new T.ConeGeometry(0.22, 1.1, 8), goldMat);
    fin.position.set(cx, 24.1, cz);
    g.add(cup, smDome, fin);
  }

  // Porte-Cochere with Pillars + Maroon & Gold Signboard attached over the gate
  const porchZ = frontWallZ + 3.2;
  const porchRoof = new T.Mesh(new T.BoxGeometry(14.5, 1.1, 6.4), stoneMat);
  porchRoof.position.set(0, 5.4, porchZ);
  porchRoof.castShadow = true;
  g.add(porchRoof);

  for (const px of [-6.2, -2.4, 2.4, 6.2]) {
    const col = new T.Mesh(new T.CylinderGeometry(0.42, 0.48, 5.2, 12), stoneMat);
    col.position.set(px, 2.6, porchZ + 2.6);
    col.castShadow = true;
    g.add(col);
  }

  const signTex = makeBrandSignTexture(T, 'The Leela Palace');
  const signMat = new T.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: new T.Color(0xffffff),
    emissiveIntensity: 0.22,
    roughness: 0.3
  });
  bindNightGlow(signMat, nightUniform, 0.18, 1.6);
  if (signMat.userData.glowProxy) g.add(signMat.userData.glowProxy);

  const gateSign = new T.Mesh(new T.BoxGeometry(13.2, 2.3, 0.4), signMat);
  gateSign.position.set(0, 6.6, porchZ + 3.1);
  g.add(gateSign);

  // Forecourt Fountain & Royal Palms at +Z entrance
  const basin = new T.Mesh(new T.CylinderGeometry(3.2, 3.5, 0.65, 18), stoneMat);
  basin.position.set(0, 0.32, d * 0.5 - 1.2);
  const water = new T.Mesh(
    new T.CylinderGeometry(2.9, 2.9, 0.72, 18),
    new T.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4, roughness: 0.15 })
  );
  water.position.set(0, 0.34, d * 0.5 - 1.2);
  const spout = new T.Mesh(new T.CylinderGeometry(0.35, 0.55, 1.8, 10), goldMat);
  spout.position.set(0, 1.1, d * 0.5 - 1.2);
  g.add(basin, water, spout);

  const trunkMat = new T.MeshStandardMaterial({ color: 0x5c4632, roughness: 0.9 });
  const frondMat = new T.MeshStandardMaterial({ color: 0x2e6f38, roughness: 0.75 });
  for (const px of [-11.5, 11.5]) {
    const pTrunk = new T.Mesh(new T.CylinderGeometry(0.24, 0.36, 6.8, 8), trunkMat);
    pTrunk.position.set(px, 3.4, d * 0.5 - 1.5);
    const pCrown = new T.Mesh(new T.IcosahedronGeometry(2.1, 1), frondMat);
    pCrown.scale.set(1.3, 0.55, 1.3);
    pCrown.position.set(px, 6.9, d * 0.5 - 1.5);
    g.add(pTrunk, pCrown);
  }

  return g;
}

export function buildBrandStore(name, THREE_REF = THREE, nightUniform = { value: 0 }) {
  const T = THREE_REF || THREE;
  if (name === 'The Leela Palace') {
    return buildLeelaPalace(T, nightUniform);
  }
  if (name === 'Equilibrium Climbing') {
    return buildEquilibriumStore(T, nightUniform);
  }

  const g = new T.Group();
  const fp = BRAND_FOOTPRINTS[name] || { w: 14, d: 12, h: 12 };

  const configs = {
    'Nike': {
      name: 'Nike',
      wallHex: 0x16181d,
      trimHex: 0xffffff,
      awningHex: 0xff5a00,
      accentHex: 0xff5a00,
      interiorHex: 0xfff5eb,
      upperWinHex: 0xffe4cc
    },
    'Adidas': {
      name: 'Adidas',
      wallHex: 0x121417,
      trimHex: 0xf8fafc,
      awningHex: 0x0f172a,
      accentHex: 0xffffff,
      interiorHex: 0xf0f9ff,
      upperWinHex: 0xe0f2fe
    },
    'The Souled Store': {
      name: 'The Souled Store',
      wallHex: 0x1c1917,
      trimHex: 0xfacc15,
      awningHex: 0xeab308,
      accentHex: 0xfacc15,
      interiorHex: 0xfef08a,
      upperWinHex: 0xfde047
    },
    "Levi's": {
      name: "Levi's",
      wallHex: 0x1e2024,
      trimHex: 0xc41230,
      awningHex: 0xb91c1c,
      accentHex: 0x1d4ed8,
      interiorHex: 0xbfdbfe,
      upperWinHex: 0xffedd5
    },
    'Hush Puppies': {
      name: 'Hush Puppies',
      wallHex: 0xede4d3,
      trimHex: 0x1e3a8a,
      awningHex: 0x1d4ed8,
      accentHex: 0x1e40af,
      interiorHex: 0xfffbeb,
      upperWinHex: 0xfde68a
    },
    'CRED': {
      name: 'CRED',
      wallHex: 0x090b0e,
      wallRoughness: 0.18,
      wallMetalness: 0.75,
      trimHex: 0x334155,
      awningHex: 0x0f172a,
      accentHex: 0x94a3b8,
      interiorHex: 0xf8fafc,
      upperWinHex: 0xe2e8f0,
      winCols: 5
    }
  };

  const cfg = configs[name] || configs['Nike'];
  addAttachedStorefrontBase(T, g, fp.w, fp.d, fp.h, cfg, nightUniform);

  // Brand-specific architectural accents on the front facade (+Z)
  const frontZ = fp.d * 0.5;
  if (name === 'Nike') {
    const orangeBar = new T.Mesh(
      new T.BoxGeometry(0.35, fp.h, 0.38),
      new T.MeshStandardMaterial({ color: 0xff5a00, emissive: 0xff5a00, emissiveIntensity: 0.35 })
    );
    orangeBar.position.set(-fp.w * 0.45, fp.h * 0.5, frontZ + 0.12);
    g.add(orangeBar);
  } else if (name === 'The Souled Store') {
    // Quirky pop-culture poster panels in the display windows
    const posterColors = [0xef4444, 0x3b82f6, 0xa855f7, 0x22c55e];
    for (let i = 0; i < 4; i++) {
      const poster = new T.Mesh(
        new T.PlaneGeometry(1.1, 1.5),
        new T.MeshBasicMaterial({ color: posterColors[i] })
      );
      poster.position.set(-3.3 + i * 2.2, 2.1, frontZ - 0.15);
      g.add(poster);
    }
  } else if (name === "Levi's") {
    // Denim-blue feature display wall + projecting red batwing tab
    const denimWall = new T.Mesh(
      new T.PlaneGeometry(fp.w * 0.72, 2.9),
      new T.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 })
    );
    denimWall.position.set(0, 1.9, frontZ - 0.48);
    const redTab = new T.Mesh(
      new T.BoxGeometry(0.9, 2.2, 0.35),
      new T.MeshStandardMaterial({ color: 0xc41230, emissive: 0xc41230, emissiveIntensity: 0.4 })
    );
    redTab.position.set(fp.w * 0.45, 7.5, frontZ + 0.25);
    g.add(denimWall, redTab);
  }

  return g;
}
