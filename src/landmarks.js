// src/landmarks.js
import * as THREE from 'three';
import { makeSign, makeEmissiveSignMaterial, makeNeonMaterial, createBrickTexture, nightUniform } from './materials.js';

export { nightUniform };

export const LANDMARK_SPECS = {
  'Toit': { w: 18, d: 15, h: 12.5 },
  'Indiranagar station': { w: 28, d: 56, h: 16.5 },
  'Swami Vivekananda Road station': { w: 28, d: 56, h: 16.5 },
  'Truffles': { w: 14, d: 13, h: 10.5 },
  'MTR 1924': { w: 14, d: 14, h: 10.5 },
  'Burma Burma Restaurant & Tea Room': { w: 15, d: 14, h: 10.5 },
  'Indiranagar Social': { w: 18, d: 15, h: 11.5 },
  'Arena Brewhouse': { w: 18, d: 18, h: 15.0 },
  'Meghana Biryani': { w: 15, d: 14, h: 12.0 },
  "Pizza 4P's": { w: 15, d: 14, h: 10.5 },
  'Jamie Oliver Kitchen': { w: 15, d: 14, h: 10.5 },
  'Third Wave': { w: 13, d: 12, h: 9.5 },
  'The Fatty Bao': { w: 14, d: 13, h: 11.0 },
  'Sri Udupi Park': { w: 15, d: 14, h: 10.0 },
  'Chin Lung Brewery': { w: 16, d: 15, h: 13.0 },
  'Starbucks': { w: 15, d: 14, h: 9.5 }
};

function addWindowGrid(group, w, h, z, rows, cols, frameColor = 0x1c1e22, warmColor = 0xffcb78) {
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.5, metalness: 0.4 });
  const glassMat = makeNeonMaterial(warmColor, 1.35);
  const startX = -w * 0.36, endX = w * 0.36;
  const startY = 4.2, endY = h - 1.6;
  const cw = (endX - startX) / Math.max(1, cols);
  const ch = (endY - startY) / Math.max(1, rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = startX + (c + 0.5) * cw;
      const wy = startY + (r + 0.5) * ch;
      const fr = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.68, ch * 0.68, 0.18), frameMat);
      fr.position.set(wx, wy, z);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(cw * 0.56, ch * 0.56), glassMat);
      gl.position.set(wx, wy, z + 0.11);
      group.add(fr, gl);
    }
  }
}

function addAwning(group, w, y, z, colorHex = 0x8b261d) {
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7 });
  const aw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 1.6), mat);
  aw.position.set(0, y, z + 0.75);
  aw.rotation.x = 0.28;
  aw.castShadow = true;
  group.add(aw);
}

function addRooftopProps(group, w, d, h) {
  const pMat = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.7 });
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 12), pMat);
  tank.position.set(-w * 0.25, h + 0.8, -d * 0.2);
  const hvac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a929a, roughness: 0.5 }));
  hvac.position.set(w * 0.22, h + 0.55, -d * 0.18);
  group.add(tank, hvac);
}

function buildToit() {
  const g = new THREE.Group();
  const { w, d, h } = LANDMARK_SPECS['Toit'];
  const brickTex = createBrickTexture('#8b3222', '#4a423d');
  brickTex.repeat.set(4, 3);
  const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.4, metalness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brickMat);
  body.position.y = h / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  // Exposed steel I-beam columns & industrial cornice
  for (let x = -w / 2 + 0.4; x <= w / 2 - 0.3; x += 4.3) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.38, h + 0.3, 0.45), steelMat);
    col.position.set(x, h / 2, d / 2);
    g.add(col);
  }
  const beamTop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), steelMat);
  beamTop.position.y = h;
  g.add(beamTop);

  // Copper brew kettles visible through ground-floor glass
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xd4743b, roughness: 0.25, metalness: 0.8 });
  for (const kx of [-3.5, 0, 3.5]) {
    const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.8, 14), copperMat);
    vat.position.set(kx, 1.8, d / 2 - 1.1);
    g.add(vat);
  }
  const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, 3.2), makeNeonMaterial(0xffb85c, 1.2));
  glassFront.position.set(0, 2.0, d / 2 + 0.04);
  g.add(glassFront);

  addWindowGrid(g, w, h, d / 2, 2, 4, 0x181a1d, 0xffaa44);
  addAwning(g, w * 0.85, 3.8, d / 2, 0x1e2024);

  // Iconic TOIT vertical & horizontal signage
  const signTex = makeSign('TOIT', '#141414', '#ffcc44', '900 72px sans-serif', 512, 160, 'BREWPUB · INDIRANAGAR', '#d45b2b');
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 0.35), makeEmissiveSignMaterial(signTex, 1.8));
  sign.position.set(0, h - 1.6, d / 2 + 0.3);
  g.add(sign);

  addRooftopProps(g, w, d, h);
  return g;
}

function buildMetroStation(name) {
  const g = new THREE.Group();
  const { w, d, h } = LANDMARK_SPECS[name] || LANDMARK_SPECS['Indiranagar station'];
  const concMat = new THREE.MeshStandardMaterial({ color: 0xc2c6cc, roughness: 0.85 });
  const purpleMat = new THREE.MeshStandardMaterial({ color: 0x6b2d8a, roughness: 0.4, metalness: 0.2 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xedeff2, roughness: 0.5 });

  // Heavy cylindrical piers along Z
  for (const z of [-18, 0, 18]) {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 8.2, 16), concMat);
    pier.position.set(0, 4.1, z);
    pier.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 3.6), concMat);
    cap.position.set(0, 7.8, z);
    g.add(pier, cap);
  }

  // Concourse & platform deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 1.6, d), concMat);
  deck.position.set(0, 9.0, 0);
  deck.castShadow = deck.receiveShadow = true;
  g.add(deck);

  // Purple accent fascia stripe along platform
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w * 0.64, 0.55, d + 0.2), makeNeonMaterial(0x8838b5, 1.4));
  stripe.position.set(0, 9.2, 0);
  g.add(stripe);

  // Curved gull-wing station roof canopy
  const roofCurve = new THREE.Shape();
  roofCurve.moveTo(-w * 0.36, 0);
  roofCurve.quadraticCurveTo(0, 3.2, w * 0.36, 0);
  roofCurve.lineTo(w * 0.36, 0.35);
  roofCurve.quadraticCurveTo(0, 3.6, -w * 0.36, 0.35);
  roofCurve.closePath();

  const canopyGeo = new THREE.ExtrudeGeometry(roofCurve, { depth: d, bevelEnabled: false });
  const canopy = new THREE.Mesh(canopyGeo, whiteMat);
  canopy.position.set(0, 13.2, -d / 2);
  canopy.castShadow = true;
  g.add(canopy);

  const purpleRim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.73, 0.45, d + 0.4), purpleMat);
  purpleRim.position.set(0, 13.3, 0);
  g.add(purpleRim);

  // Namma Metro glowing signboards on front (+Z) and sides
  const label = name.includes('Swami') ? 'SWAMI VIVEKANANDA RD' : 'INDIRANAGAR METRO';
  const sTex = makeSign(label, '#5a1e7a', '#ffffff', '800 42px sans-serif', 512, 128, 'ನಮ್ಮ ಮೆಟ್ರೋ · PURPLE LINE', '#f5c518');
  const sMat = makeEmissiveSignMaterial(sTex, 1.7);
  for (const zSide of [-1, 1]) {
    const sb = new THREE.Mesh(new THREE.BoxGeometry(11, 2.2, 0.3), sMat);
    sb.position.set(0, 11.2, zSide * (d / 2 + 0.2));
    g.add(sb);
  }
  return g;
}

function buildArenaBrewhouse() {
  const g = new THREE.Group();
  const { w, d, h } = LANDMARK_SPECS['Arena Brewhouse'];
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 4.5, d), baseMat);
  base.position.y = 2.25;
  base.castShadow = true;
  g.add(base);

  // Iconic glass & steel pyramid superstructure
  const pyrH = h - 4.5;
  const pyrGeo = new THREE.ConeGeometry(w * 0.65, pyrH, 4);
  pyrGeo.rotateY(Math.PI / 4);
  const pyrMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.2, metalness: 0.7 });
  const pyr = new THREE.Mesh(pyrGeo, pyrMat);
  pyr.position.y = 4.5 + pyrH / 2;
  pyr.castShadow = true;
  g.add(pyr);

  // Glowing gold/cyan pyramid edge ribs
  const wireGeo = new THREE.ConeGeometry(w * 0.66, pyrH + 0.1, 4);
  wireGeo.rotateY(Math.PI / 4);
  const wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({ color: 0xf5b942, wireframe: true }));
  wire.position.copy(pyr.position);
  g.add(wire);

  const sTex = makeSign('ARENA', '#141820', '#f5c518', '900 58px sans-serif', 512, 128, 'ARTISANAL BREWHOUSE', '#f5c518');
  const sign = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.9, 0.3), makeEmissiveSignMaterial(sTex, 1.8));
  sign.position.set(0, 3.8, d / 2 + 0.25);
  g.add(sign);
  return g;
}

function buildStyledLandmark(name, cfg) {
  const g = new THREE.Group();
  const { w, d, h } = LANDMARK_SPECS[name] || { w: 15, d: 14, h: 10.5 };

  const wallMat = cfg.brick
    ? new THREE.MeshStandardMaterial({ map: createBrickTexture(cfg.wallHex, '#554d47'), roughness: 0.85 })
    : new THREE.MeshStandardMaterial({ color: cfg.wallHex, roughness: 0.75 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  // Trim / parapet band
  const trimMat = new THREE.MeshStandardMaterial({ color: cfg.trimHex, roughness: 0.5 });
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.7, d + 0.4), trimMat);
  parapet.position.y = h + 0.15;
  g.add(parapet);

  // Ground floor storefront glaze
  const gfGlass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.76, 2.9), makeNeonMaterial(cfg.glowHex || 0xffcc77, 1.25));
  gfGlass.position.set(0, 1.85, d / 2 + 0.05);
  g.add(gfGlass);

  addWindowGrid(g, w, h, d / 2, cfg.rows || 2, cfg.cols || 3, cfg.trimHex, cfg.glowHex || 0xffcc77);
  addAwning(g, w * 0.82, 3.6, d / 2, cfg.awningHex || cfg.trimHex);

  // Optional foliage planters for leafy facades (Burma Burma, Pizza 4P's, Jamie Oliver)
  if (cfg.leafy) {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6e36, roughness: 0.85 });
    for (let y = 3.6; y < h - 1; y += 3.0) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.7, 0.7), leafMat);
      hedge.position.set(0, y, d / 2 + 0.35);
      g.add(hedge);
    }
  }

  // Optional vertical wood slats (Pizza 4P's, Third Wave)
  if (cfg.woodSlats) {
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x9c6234, roughness: 0.6 });
    for (let x = -w * 0.42; x <= w * 0.42; x += 0.65) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, h - 4.0, 0.25), slatMat);
      slat.position.set(x, (h + 3.6) / 2, d / 2 + 0.12);
      g.add(slat);
    }
  }

  const sTex = makeSign(cfg.title, cfg.signBg, cfg.signFg, cfg.font || '800 48px sans-serif', 512, 136, cfg.sub, cfg.signBorder);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 1.85, 0.32), makeEmissiveSignMaterial(sTex, 1.75));
  sign.position.set(0, cfg.roofSign ? h + 1.1 : 4.2, d / 2 + 0.28);
  g.add(sign);

  addRooftopProps(g, w, d, h);
  return g;
}

const STYLE_MAP = {
  'Truffles': {
    wallHex: '#7d8590', trimHex: '#f5b818', awningHex: '#d43828', glowHex: 0xffd27a,
    title: 'TRUFFLES', sub: 'ALL AMERICAN BURGERS & CAFE', signBg: '#16181c', signFg: '#ffcf24', signBorder: '#ffffff'
  },
  'MTR 1924': {
    wallHex: '#f5ebd6', trimHex: '#7a1c1c', awningHex: '#7a1c1c', glowHex: 0xffe099,
    title: 'MTR 1924', sub: 'MAVALLI TIFFIN ROOMS', signBg: '#731414', signFg: '#ffdf6b', signBorder: '#e8c455',
    font: '700 54px Georgia, serif'
  },
  'Burma Burma Restaurant & Tea Room': {
    wallHex: '#5f8a6d', trimHex: '#c89d54', awningHex: '#2f8a55', glowHex: 0xffe49e, leafy: true,
    title: 'BURMA BURMA', sub: 'RESTAURANT & TEA ROOM', signBg: '#163020', signFg: '#f2cf7e', signBorder: '#c89d54'
  },
  'Indiranagar Social': {
    wallHex: '#783426', trimHex: '#c9ccd1', awningHex: '#d9a441', glowHex: 0xff9436, brick: true, roofSign: true,
    title: 'INDIRANAGAR SOCIAL', sub: 'CAFE · BAR · CO-WORKING', signBg: '#18181b', signFg: '#ff7b24', signBorder: '#ff7b24'
  },
  'Meghana Biryani': {
    wallHex: '#d9c8b4', trimHex: '#b8281e', awningHex: '#b8281e', glowHex: 0xffcf70, rows: 3,
    title: 'MEGHANA FOODS', sub: 'ANDHRA STYLE BIRYANI', signBg: '#a81812', signFg: '#ffea54', signBorder: '#ffffff'
  },
  "Pizza 4P's": {
    wallHex: '#8a7f73', trimHex: '#8c5830', awningHex: '#c0703a', glowHex: 0xffc878, woodSlats: true, leafy: true,
    title: "PIZZA 4P's", sub: 'WOOD-FIRED · ARTISANAL CHEESE', signBg: '#1c1b1a', signFg: '#f5efe6', signBorder: '#b88652'
  },
  'Jamie Oliver Kitchen': {
    wallHex: '#d66b4e', trimHex: '#2b4f4b', awningHex: '#2b4f4b', glowHex: 0xffd896, leafy: true,
    title: 'JAMIE OLIVER', sub: 'KITCHEN · ALL DAY DINING', signBg: '#1f3d3a', signFg: '#ffffff', signBorder: '#f08a6c'
  },
  'Third Wave': {
    wallHex: '#6e747c', trimHex: '#b37440', awningHex: '#3b6ea5', glowHex: 0xffca7a, woodSlats: true,
    title: 'THIRD WAVE COFFEE', sub: 'ROASTERS · INDIRANAGAR', signBg: '#121316', signFg: '#f5e6d3', signBorder: '#d48848'
  },
  'The Fatty Bao': {
    wallHex: '#9a8090', trimHex: '#d42c38', awningHex: '#c42430', glowHex: 0xff7582,
    title: 'THE FATTY BAO', sub: 'ASIAN GASTROBAR', signBg: '#b81d2a', signFg: '#fff2d6', signBorder: '#ffcf48'
  },
  'Sri Udupi Park': {
    wallHex: '#f0eada', trimHex: '#1d7a36', awningHex: '#1d7a36', glowHex: 0xfff0b8,
    title: 'SRI UDUPI PARK', sub: 'PURE VEG · FILTER COFFEE · DOSA', signBg: '#14662a', signFg: '#ffffff', signBorder: '#ffdf38'
  },
  'Chin Lung Brewery': {
    wallHex: '#9a6a60', trimHex: '#c92a2a', awningHex: '#9e1c1c', glowHex: 0xffa64d, rows: 3, roofSign: true,
    title: 'CHIN LUNG', sub: 'RESTOBAR & BREWERY', signBg: '#8c1414', signFg: '#ffd43b', signBorder: '#ffd43b'
  },
  'Starbucks': {
    wallHex: '#8f8578', trimHex: '#006241', awningHex: '#006241', glowHex: 0xffe09e, woodSlats: true,
    title: 'STARBUCKS', sub: 'COFFEE · 12TH MAIN', signBg: '#006241', signFg: '#ffffff', signBorder: '#cba258'
  }
};

export function buildLandmark(name) {
  if (name === 'Toit') return buildToit();
  if (name === 'Indiranagar station' || name === 'Swami Vivekananda Road station') return buildMetroStation(name);
  if (name === 'Arena Brewhouse') return buildArenaBrewhouse();
  const cfg = STYLE_MAP[name] || {
    wallHex: '#d8cfc2', trimHex: '#2d3748', awningHex: '#c53030',
    title: name.toUpperCase(), sub: 'INDIRANAGAR', signBg: '#1a202c', signFg: '#ffffff'
  };
  return buildStyledLandmark(name, cfg);
}
