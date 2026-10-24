import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural Indiranagar (Bengaluru) Building Generator for Three.js r160
 * Units: Meters | Origin: Bottom-Center of the plot (Y = 0) | Front Facade: +Z
 */

// ============================================================================
// 1. DETERMINISTIC PRNG & UTILITIES
// ============================================================================
class PRNG {
  constructor(seed = 1337) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(prob = 0.5) {
    return this.next() < prob;
  }
}

// ============================================================================
// 2. PROCEDURAL CANVAS TEXTURE ENGINE (CACHED)
// ============================================================================
const TexCache = new Map();

function createStuccoTexture(hexColor, grimeIntensity = 0.35, streakiness = 0.5) {
  const key = `stucco_${hexColor}_${grimeIntensity}_${streakiness}`;
  if (TexCache.has(key)) return TexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base color
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 512, 512);

  // Fine plaster speckle noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < data.length; i += 4) {
    const diff = (rand() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + diff));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + diff));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + diff));
  }
  ctx.putImageData(imgData, 0, 0);

  // Monsoon vertical damp streaks
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 90; i++) {
    const x = rand() * 512;
    const y = rand() * 250;
    const w = 2 + rand() * 14;
    const h = 60 + rand() * 320;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    const alpha = rand() * 0.18 * streakiness;
    grad.addColorStop(0, `rgba(35, 40, 30, ${alpha})`);
    grad.addColorStop(0.3, `rgba(45, 48, 38, ${alpha * 0.7})`);
    grad.addColorStop(1, 'rgba(45, 48, 38, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  // Bottom splash & top parapet algae gradient
  const topGrad = ctx.createLinearGradient(0, 0, 0, 512);
  topGrad.addColorStop(0, `rgba(30, 35, 25, ${0.42 * grimeIntensity})`);
  topGrad.addColorStop(0.15, 'rgba(30, 35, 25, 0)');
  topGrad.addColorStop(0.82, 'rgba(45, 38, 30, 0)');
  topGrad.addColorStop(1, `rgba(38, 30, 22, ${0.55 * grimeIntensity})`);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

function createBrickTexture() {
  const key = 'exposed_wirecut_brick';
  if (TexCache.has(key)) return TexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Mortar background
  ctx.fillStyle = '#b5ada2';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const cols = 8;
  const brickH = 512 / rows;
  const brickW = 512 / cols;
  const mortar = 3.5;

  let seed = 991;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * brickW + offset;
      const y = r * brickH;
      const hue = 10 + rand() * 10;
      const sat = 52 + rand() * 20;
      const light = 30 + rand() * 16;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
      ctx.fillRect(x + mortar * 0.5, y + mortar * 0.5, brickW - mortar, brickH - mortar);

      // Subtle kiln burn mark
      if (rand() < 0.35) {
        ctx.fillStyle = `rgba(25, 15, 10, ${rand() * 0.22})`;
        ctx.fillRect(x + mortar, y + mortar, (brickW - mortar * 2) * rand(), brickH - mortar * 2);
      }
    }
  }

  // Weathering overlay
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(20, 22, 18, 0.25)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(25, 20, 15, 0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

function createTileCladdingTexture(baseHex = '#2b3a42', groutHex = '#7a8288') {
  const key = `tile_${baseHex}_${groutHex}`;
  if (TexCache.has(key)) return TexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = groutHex;
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 4;
  const w = 256 / cols;
  const h = 256 / rows;

  let seed = 77;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const baseColor = new THREE.Color(baseHex);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = baseColor.clone().offsetHSL(0, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.06);
      ctx.fillStyle = `#${col.getHexString()}`;
      ctx.fillRect(c * w + 2, r * h + 2, w - 4, h - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

function createShutterTexture(tintHex = '#525b66') {
  const key = `shutter_${tintHex}`;
  if (TexCache.has(key)) return TexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const slats = 24;
  const slatH = 256 / slats;
  const base = new THREE.Color(tintHex);

  for (let i = 0; i < slats; i++) {
    const y = i * slatH;
    const grad = ctx.createLinearGradient(0, y, 0, y + slatH);
    const light = base.clone().offsetHSL(0, 0, 0.12);
    const dark = base.clone().offsetHSL(0, 0, -0.18);
    grad.addColorStop(0, `#${dark.getHexString()}`);
    grad.addColorStop(0.35, `#${light.getHexString()}`);
    grad.addColorStop(0.85, `#${base.getHexString()}`);
    grad.addColorStop(1, '#1a1c1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, 256, slatH);
  }

  // Bottom rust & street dust
  const dustGrad = ctx.createLinearGradient(0, 160, 0, 256);
  dustGrad.addColorStop(0, 'rgba(90, 65, 45, 0)');
  dustGrad.addColorStop(1, 'rgba(85, 55, 35, 0.55)');
  ctx.fillStyle = dustGrad;
  ctx.fillRect(0, 160, 256, 96);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

function createWindowGlassTexture(seed = 1) {
  const key = `glass_${seed % 8}`;
  if (TexCache.has(key)) return TexCache.get(key);

  const rng = new PRNG(seed * 311);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep interior room gradient
  const bg = ctx.createLinearGradient(0, 0, 256, 256);
  const isWarmLit = rng.chance(0.28);
  if (isWarmLit) {
    bg.addColorStop(0, '#2c2219');
    bg.addColorStop(0.5, '#59422a');
    bg.addColorStop(1, '#1a1612');
  } else {
    bg.addColorStop(0, '#101a24');
    bg.addColorStop(0.5, '#1d2d3a');
    bg.addColorStop(1, '#0b1116');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle curtains or vertical blinds inside
  const hasCurtains = rng.chance(0.65);
  if (hasCurtains) {
    const curtainColor = rng.pick([
      'rgba(195, 185, 165, 0.35)',
      'rgba(140, 160, 175, 0.3)',
      'rgba(180, 130, 110, 0.3)',
      'rgba(210, 205, 190, 0.42)'
    ]);
    ctx.fillStyle = curtainColor;
    const leftW = rng.range(45, 95);
    const rightW = rng.range(45, 95);
    ctx.fillRect(0, 0, leftW, 256);
    ctx.fillRect(256 - rightW, 0, rightW, 256);

    // Vertical fold lines
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = 12; x < leftW; x += 14) ctx.fillRect(x, 0, 4, 256);
    for (let x = 256 - rightW + 10; x < 256; x += 14) ctx.fillRect(x, 0, 4, 256);
  }

  // Diagonal exterior sky reflection streak
  ctx.fillStyle = 'rgba(185, 220, 245, 0.14)';
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.lineTo(180, 0);
  ctx.lineTo(235, 0);
  ctx.lineTo(0, 235);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

function createACFrontTexture() {
  const key = 'ac_unit_front';
  if (TexCache.has(key)) return TexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  // Off-white weathered metal body
  ctx.fillStyle = '#dcd9d0';
  ctx.fillRect(0, 0, 256, 192);

  // Circular fan grille on left
  const cx = 88, cy = 96, r = 68;
  ctx.fillStyle = '#1e2022';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Fan blades hint
  ctx.fillStyle = '#383c40';
  for (let a = 0; a < 3; a++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((a * Math.PI * 2) / 3 + 0.4);
    ctx.beginPath();
    ctx.ellipse(26, 0, 28, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Wire mesh bars over fan
  ctx.strokeStyle = '#aba69c';
  ctx.lineWidth = 2.5;
  for (let y = cy - r; y <= cy + r; y += 8) {
    const dx = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.beginPath();
    ctx.moveTo(cx - dx, y);
    ctx.lineTo(cx + dx, y);
    ctx.stroke();
  }

  // Right side panel vents & badge
  ctx.fillStyle = '#b8b3a8';
  ctx.fillRect(178, 20, 62, 152);
  ctx.fillStyle = '#c4302b';
  ctx.fillRect(194, 34, 30, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

// ============================================================================
// 3. AUTHENTIC INDIRANAGAR SHOP SIGNBOARD GENERATOR
// ============================================================================
const SHOP_CATALOG = [
  { name: 'FILTER KAAPI & TIFFINS', kannada: 'ಫಿಲ್ಟರ್ ಕಾಫಿ ಮತ್ತು ಟಿಫಿನ್ಸ್', sub: 'IDLI • VADA • MASALA DOSA', bg: '#1b4332', fg: '#ffffff', accent: '#f4a261' },
  { name: '100 FT CRAFT KITCHEN', kannada: '೧೦೦ ಅಡಿ ಕ್ರಾಫ್ಟ್ ಕಿಚನ್', sub: 'WOODFIRED PIZZA • MICROBREWERY', bg: '#18181b', fg: '#f4f4f5', accent: '#eab308' },
  { name: 'SRI UDUPI GRAND', kannada: 'ಶ್ರೀ ಉಡುಪಿ ಗ್ರ್ಯಾಂಡ್', sub: 'PURE VEG • SOUTH & NORTH INDIAN', bg: '#7f1d1d', fg: '#fef08a', accent: '#ffffff' },
  { name: 'CMH OPTICS & EYE CARE', kannada: 'ಸಿಎಂಹೆಚ್ ಆಪ್ಟಿಕ್ಸ್', sub: 'COMPUTERIZED EYE TESTING • FRAMES', bg: '#0f172a', fg: '#38bdf8', accent: '#f8fafc' },
  { name: 'THIRD WAVE ROASTERS', kannada: 'ಥರ್ಡ್ ವೇವ್ ಕಾಫಿ', sub: 'ARTISANAL SINGLE ESTATE COFFEE', bg: '#271c19', fg: '#f3e5ab', accent: '#d97706' },
  { name: 'INDIRANAGAR PHARMA', kannada: 'ಇಂದಿರಾನಗರ ಫಾರ್ಮಾ', sub: 'CHEMISTS & DRUGGISTS • 24/7', bg: '#065f46', fg: '#ffffff', accent: '#6ee7b7' },
  { name: 'BENGALURU SILK HOUSE', kannada: 'ಬೆಂಗಳೂರು ಸಿಲ್ಕ್ ಹೌಸ್', sub: 'KANCHIPURAM & MYSORE CREPE SILKS', bg: '#581c87', fg: '#fde047', accent: '#f3e8ff' },
  { name: 'CHAI POINT & BUN MASKA', kannada: 'ಚಾಯ್ ಮತ್ತು ಬನ್ ಮಸ್ಕಾ', sub: 'GINGER TEA • SAMOSA • PUFFS', bg: '#9a3412', fg: '#fffbeb', accent: '#fde68a' },
  { name: 'APERTO DESIGN STUDIO', kannada: 'ಅಪರ್ಟೊ ಡಿಸೈನ್ ಸ್ಟುಡಿಯೋ', sub: 'INTERIORS • BESPOKE FURNITURE', bg: '#262626', fg: '#e5e5e5', accent: '#a3a3a3' },
  { name: 'KARNATAKA PROVISION STORE', kannada: 'ಕರ್ನಾಟಕ ಪ್ರಾವಿಜನ್ ಸ್ಟೋರ್', sub: 'WHOLESALE GROCERIES & SPICES', bg: '#1e3a8a', fg: '#ffffff', accent: '#facc15' },
  { name: 'METRO DIGITAL PRINTS', kannada: 'ಮೆಟ್ರೋ ಡಿಜಿಟಲ್ ಪ್ರಿಂಟ್ಸ್', sub: 'XEROX • CAD PLOTTING • LAMINATION', bg: '#31102f', fg: '#fbcfe8', accent: '#f43f5e' },
  { name: 'THE BERRY BOWL CAFE', kannada: 'ದಿ ಬೆರ್ರಿ ಬೌಲ್ ಕೆಫೆ', sub: 'SMOOTHIES • SALADS • COLD PRESS', bg: '#134e4a', fg: '#ccfbf1', accent: '#f97316' }
];

function createSignboardTexture(shop) {
  const key = `sign_${shop.name}`;
  if (TexCache.has(key)) return TexCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background panel
  ctx.fillStyle = shop.bg;
  ctx.fillRect(0, 0, 512, 128);

  // Subtle ACP panel metallic sheen gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.08)');
  grad.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);

  // Outer trim border
  ctx.strokeStyle = shop.accent;
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 500, 116);

  // English-only signage (owner instruction)
  ctx.textAlign = 'center';

  // Main English Title, vertically centered in the panel
  ctx.fillStyle = shop.fg;
  ctx.font = 'bold 34px "Inter", "Arial Black", sans-serif';
  ctx.fillText(shop.name, 256, 60);

  // Bottom Sub-caption bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(10, 90, 492, 28);
  ctx.fillStyle = shop.accent;
  ctx.font = '600 15px "Inter", Arial, sans-serif';
  ctx.fillText(shop.sub, 256, 110);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  TexCache.set(key, tex);
  return tex;
}

// ============================================================================
// 4. STYLE PRESETS (INDIRANAGAR ARCHITECTURAL ARCHETYPES)
// ============================================================================
export const BUILDING_STYLES = [
  '100ft_boutique_brick',   // Exposed red wire-cut brick + charcoal steel frames + warm wood soffits + planters
  'cmh_commercial_plaza',   // Deep-blue/grey ceramic tile spandrels + semi-reflective glazing + multi-signage
  'classic_pastel_mixed',   // 80s/90s Bengaluru warm ochre/terracotta plaster + concrete chajjas + ornate grilles
  'modern_minimal_bistro',  // Crisp off-white stucco + teak wood louvers + sleek glass balustrades + cafe awnings
  'heritage_ochre_corner',  // Deep Mysore-ochre & cream bands + curved corner balconies + heavy cornice molding
  'it_studio_loft'          // Raw architectural concrete + dark bronze mullions + vertical metal fin screens
];

const STYLE_CONFIGS = {
  '100ft_boutique_brick': {
    wallType: 'brick',
    wallColors: ['#8c3f2b'],
    trimColors: ['#22252a', '#2e3238'],
    frameColor: '#1e2022',
    railingType: 'metal_bars',
    chajjaStyle: 'sleek_metal',
    hasPlanters: true,
    windowStyle: 'industrial_grid',
    defaultFloors: 3
  },
  'cmh_commercial_plaza': {
    wallType: 'tile',
    wallColors: ['#2a3b47', '#354652', '#423833'],
    trimColors: ['#d0d5dd', '#e2e8f0'],
    frameColor: '#1f2937',
    railingType: 'glass_panel',
    chajjaStyle: 'box_band',
    hasPlanters: false,
    windowStyle: 'ribbon_glazing',
    defaultFloors: 4
  },
  'classic_pastel_mixed': {
    wallType: 'stucco',
    wallColors: ['#dfbe99', '#d99b78', '#c8d3c5', '#e3c898'],
    trimColors: ['#f5efe6', '#8c4a32', '#6b705c'],
    frameColor: '#f4f1ea',
    railingType: 'concrete_half',
    chajjaStyle: 'sloped_chajja',
    hasPlanters: true,
    windowStyle: 'casement_grille',
    defaultFloors: 3
  },
  'modern_minimal_bistro': {
    wallType: 'stucco',
    wallColors: ['#f0eee9', '#e5e2dc'],
    trimColors: ['#7c4d2b', '#27272a'],
    frameColor: '#18181b',
    railingType: 'glass_panel',
    chajjaStyle: 'wooden_louver',
    hasPlanters: true,
    windowStyle: 'large_picture',
    defaultFloors: 3
  },
  'heritage_ochre_corner': {
    wallType: 'stucco',
    wallColors: ['#c98a3e', '#b85d38', '#a36635'],
    trimColors: ['#f7f3e8', '#dfd7c6'],
    frameColor: '#472d1c',
    railingType: 'ornate_iron',
    chajjaStyle: 'stepped_cornice',
    hasPlanters: false,
    windowStyle: 'arched_top',
    defaultFloors: 2
  },
  'it_studio_loft': {
    wallType: 'stucco',
    wallColors: ['#9ca3af', '#8b929e'],
    trimColors: ['#1f242d', '#b45309'],
    frameColor: '#111827',
    railingType: 'metal_bars',
    chajjaStyle: 'fin_box',
    hasPlanters: true,
    windowStyle: 'industrial_grid',
    defaultFloors: 4
  }
};

// ============================================================================
// 5. GEOMETRY BUILDER ACCUMULATOR
// ============================================================================
class GeometryBuilder {
  constructor() {
    this.buckets = new Map();
  }

  add(matKey, material, geom, matrix) {
    if (!this.buckets.has(matKey)) {
      this.buckets.set(matKey, { material, geoms: [] });
    }
    const g = geom.clone();
    if (matrix) g.applyMatrix4(matrix);
    // Ensure clean attributes for mergeGeometries
    g.deleteAttribute('tangent');
    this.buckets.get(matKey).geoms.push(g);
  }

  addBox(matKey, material, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, uvScale = null) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (uvScale) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * uvScale[0], uv.getY(i) * uvScale[1]);
      }
    }
    const m = new THREE.Matrix4();
    if (rx !== 0 || ry !== 0 || rz !== 0) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    } else {
      m.makeTranslation(x, y, z);
    }
    this.add(matKey, material, g, m);
    g.dispose();
  }

  addCylinder(matKey, material, rt, rb, h, segs, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, segs);
    const m = new THREE.Matrix4();
    if (rx !== 0 || ry !== 0 || rz !== 0) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
    } else {
      m.makeTranslation(x, y, z);
    }
    this.add(matKey, material, g, m);
    g.dispose();
  }

  buildGroup(name = 'IndiranagarBuilding') {
    const group = new THREE.Group();
    group.name = name;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.geoms.length === 0) continue;
      const merged = mergeGeometries(bucket.geoms, false);
      bucket.geoms.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(merged, bucket.material);
      mesh.name = key;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

// ============================================================================
// 6. ARCHITECTURAL SUB-ASSEMBLIES
// ============================================================================

/**
 * Adds a detailed Split AC Outdoor Condenser Unit + Wall Brackets + Copper Pipe
 */
function addSplitACUnit(builder, mats, x, y, z, facingAngle = 0) {
  const groupMat = new THREE.Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new THREE.Matrix4().makeRotationY(facingAngle));

  const place = (matKey, mat, geom, lx, ly, lz, rx = 0, ry = 0, rz = 0) => {
    const localM = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    localM.compose(new THREE.Vector3(lx, ly, lz), q, new THREE.Vector3(1, 1, 1));
    const finalM = groupMat.clone().multiply(localM);
    builder.add(matKey, mat, geom, finalM);
    geom.dispose();
  };

  const w = 0.82, h = 0.56, d = 0.32;

  // Main condenser body
  place('metal_ac_body', mats.acBody, new THREE.BoxGeometry(w, h, d), 0, 0, d * 0.5 + 0.06);
  // Textured front face plate
  place('ac_front_plate', mats.acFront, new THREE.PlaneGeometry(w - 0.02, h - 0.02), 0, 0, d + 0.062);
  // Top overhanging lid
  place('metal_ac_body', mats.acBody, new THREE.BoxGeometry(w + 0.03, 0.03, d + 0.03), 0, h * 0.5 + 0.015, d * 0.5 + 0.06);

  // L-Brackets mounted to wall
  for (const bx of [-w * 0.36, w * 0.36]) {
    place('dark_iron', mats.darkIron, new THREE.BoxGeometry(0.04, 0.32, 0.03), bx, -h * 0.5 - 0.06, 0.015);
    place('dark_iron', mats.darkIron, new THREE.BoxGeometry(0.04, 0.03, d + 0.06), bx, -h * 0.5 - 0.015, (d + 0.06) * 0.5);
  }

  // Insulated copper refrigerant conduit going into wall
  place('dark_iron', mats.darkIron, new THREE.CylinderGeometry(0.022, 0.022, 0.45, 8), w * 0.48, 0.1, 0.12, 0, 0, 0.25);
  place('dark_iron', mats.darkIron, new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), w * 0.43, 0.3, 0.06, Math.PI * 0.5, 0, 0);
}

/**
 * Adds a ribbed black plastic Sintex-style rooftop water tank on a brick pedestal
 */
function addRooftopWaterTank(builder, mats, x, y, z, radius = 0.68, height = 1.45) {
  // Masonry support platform
  const platW = radius * 2.1;
  builder.addBox('trim_wall', mats.trimWall, platW, 0.35, platW, x, y + 0.175, z);

  const tankBaseY = y + 0.35;
  // Main black high-density polyethylene cylinder
  builder.addCylinder('black_tank', mats.blackTank, radius, radius, height, 20, x, tankBaseY + height * 0.5, z);

  // Structural horizontal ribs
  const ribCount = 5;
  for (let i = 1; i <= ribCount; i++) {
    const ry = tankBaseY + (height / (ribCount + 1)) * i;
    const torus = new THREE.TorusGeometry(radius + 0.008, 0.018, 8, 20);
    const m = new THREE.Matrix4()
      .makeTranslation(x, ry, z)
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI * 0.5));
    builder.add('black_tank', mats.blackTank, torus, m);
    torus.dispose();
  }

  // Conical shoulder + top manhole lid
  builder.addCylinder('black_tank', mats.blackTank, radius * 0.45, radius, 0.14, 20, x, tankBaseY + height + 0.07, z);
  builder.addCylinder('black_tank', mats.blackTank, radius * 0.42, radius * 0.42, 0.08, 16, x, tankBaseY + height + 0.17, z);

  // PVC distribution pipe running along roof
  builder.addCylinder('pvc_pipe', mats.pvcPipe, 0.025, 0.025, 1.8, 8, x + radius + 0.85, y + 0.08, z, 0, 0, Math.PI * 0.5);
}

/**
 * Adds a protruding residential balcony with floor slab, railing, french doors, and optional drying clothes/planters
 */
function addBalconyAssembly(builder, mats, rng, bx, by, bz, bw, floorH, config) {
  const balcD = rng.range(1.05, 1.35);
  const slabH = 0.16;
  const railH = 0.98;

  // Cantilevered concrete slab with drip lip
  builder.addBox('concrete_raw', mats.concrete, bw, slabH, balcD, bx, by + slabH * 0.5, bz + balcD * 0.5);

  const frontZ = bz + balcD - 0.04;
  const railCenterY = by + slabH + railH * 0.5;

  if (config.railingType === 'concrete_half') {
    // Classic solid half-parapet with top steel handrail
    const solidH = railH * 0.68;
    builder.addBox('trim_wall', mats.trimWall, bw, solidH, 0.1, bx, by + slabH + solidH * 0.5, frontZ);
    builder.addBox('trim_wall', mats.trimWall, 0.1, solidH, balcD, bx - bw * 0.5 + 0.05, by + slabH + solidH * 0.5, bz + balcD * 0.5);
    builder.addBox('trim_wall', mats.trimWall, 0.1, solidH, balcD, bx + bw * 0.5 - 0.05, by + slabH + solidH * 0.5, bz + balcD * 0.5);
    // Top tubular steel rail
    builder.addCylinder('dark_iron', mats.darkIron, 0.022, 0.022, bw, 8, bx, by + slabH + railH, frontZ, 0, 0, Math.PI * 0.5);
  } else if (config.railingType === 'glass_panel') {
    // Sleek stainless posts + tinted glass balustrade
    const postCount = Math.max(2, Math.round(bw / 1.1) + 1);
    for (let i = 0; i < postCount; i++) {
      const px = bx - bw * 0.5 + 0.06 + (i / (postCount - 1)) * (bw - 0.12);
      builder.addBox('dark_iron', mats.darkIron, 0.04, railH, 0.04, px, railCenterY, frontZ);
    }
    builder.addBox('balcony_glass', mats.balconyGlass, bw - 0.12, railH - 0.14, 0.02, bx, railCenterY, frontZ);
    builder.addBox('dark_iron', mats.darkIron, bw, 0.04, 0.06, bx, by + slabH + railH, frontZ);
  } else {
    // Vertical mild-steel grille bars
    builder.addBox('dark_iron', mats.darkIron, bw, 0.04, 0.05, bx, by + slabH + railH, frontZ);
    builder.addBox('dark_iron', mats.darkIron, bw, 0.03, 0.04, bx, by + slabH + 0.08, frontZ);
    const barCount = Math.floor(bw / 0.12);
    for (let b = 0; b <= barCount; b++) {
      const barX = bx - bw * 0.5 + 0.05 + (b / barCount) * (bw - 0.1);
      builder.addCylinder('dark_iron', mats.darkIron, 0.009, 0.009, railH - 0.08, 6, barX, railCenterY, frontZ);
    }
    // Side returns
    for (const side of [-1, 1]) {
      const sx = bx + side * (bw * 0.5 - 0.03);
      builder.addBox('dark_iron', mats.darkIron, 0.04, 0.04, balcD, sx, by + slabH + railH, bz + balcD * 0.5);
    }
  }

  // Terracotta / foliage planters along balcony edge
  if (config.hasPlanters && rng.chance(0.75)) {
    const numPots = rng.int(2, 4);
    for (let p = 0; p < numPots; p++) {
      const px = bx - bw * 0.35 + (p / Math.max(1, numPots - 1)) * (bw * 0.7);
      const pz = bz + balcD - 0.22;
      builder.addCylinder('terracotta', mats.terracotta, 0.15, 0.11, 0.26, 10, px, by + slabH + 0.13, pz);
      // Bushy tropical foliage cluster
      const foliageGeo = new THREE.DodecahedronGeometry(rng.range(0.18, 0.25), 1);
      const fm = new THREE.Matrix4().makeTranslation(px, by + slabH + 0.34, pz);
      builder.add('foliage', mats.foliage, foliageGeo, fm);
      foliageGeo.dispose();
    }
  }

  // Draped laundry / drying clothes on some residential balconies
  if (rng.chance(0.45)) {
    const clothCount = rng.int(2, 4);
    for (let c = 0; c < clothCount; c++) {
      const cw = rng.range(0.32, 0.52);
      const ch = rng.range(0.45, 0.72);
      const cx = bx - bw * 0.32 + c * (bw * 0.22);
      const clothMat = rng.pick(mats.clothMaterials);
      const clothKey = `cloth_${clothMat.uuid}`;
      // Draped over front rail
      builder.addBox(clothKey, clothMat, cw, ch, 0.025, cx, by + slabH + railH - ch * 0.45, frontZ + 0.02, 0.06, 0, 0);
    }
  }
}

/**
 * Adds a recessed window bay with outer concrete frame, deep sill, chajja (sunshade), mullions, and security grille
 */
function addRecessedWindowBay(builder, mats, rng, wx, wy, wz, winW, winH, config, facing = 'front') {
  const recessD = 0.22;
  const frameT = 0.055;

  // Coordinate frame transform so windows can be placed on Front (+Z) or Side (+X / -X) walls
  const rotY = facing === 'front' ? 0 : facing === 'right' ? Math.PI * 0.5 : facing === 'left' ? -Math.PI * 0.5 : Math.PI;
  const rootM = new THREE.Matrix4()
    .makeTranslation(wx, wy, wz)
    .multiply(new THREE.Matrix4().makeRotationY(rotY));

  const box = (matKey, mat, w, h, d, lx, ly, lz, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const lm = new THREE.Matrix4();
    if (rx !== 0) {
      lm.compose(new THREE.Vector3(lx, ly, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(1, 1, 1));
    } else {
      lm.makeTranslation(lx, ly, lz);
    }
    builder.add(matKey, mat, g, rootM.clone().multiply(lm));
    g.dispose();
  };

  // 1. Deep window reveal box (top, bottom sill, left & right jambs)
  box('trim_wall', mats.trimWall, winW + 0.16, 0.09, recessD + 0.14, 0, -winH * 0.5 - 0.045, 0.04); // Projecting Sill
  box('trim_wall', mats.trimWall, 0.08, winH, recessD + 0.04, -winW * 0.5 - 0.04, 0, -recessD * 0.3);
  box('trim_wall', mats.trimWall, 0.08, winH, recessD + 0.04, winW * 0.5 + 0.04, 0, -recessD * 0.3);

  // 2. Chajja (Monsoon Sunshade / Overhang)
  const chajjaW = winW + 0.38;
  const chajjaD = 0.48;
  if (config.chajjaStyle === 'sloped_chajja') {
    box('concrete_raw', mats.concrete, chajjaW, 0.07, chajjaD, 0, winH * 0.5 + 0.08, chajjaD * 0.4, 0.18);
    // Side drop fins (classic Bengaluru box-chajja ear fins)
    box('concrete_raw', mats.concrete, 0.06, 0.36, chajjaD * 0.85, -chajjaW * 0.5 + 0.03, winH * 0.5 - 0.08, chajjaD * 0.35);
    box('concrete_raw', mats.concrete, 0.06, 0.36, chajjaD * 0.85, chajjaW * 0.5 - 0.03, winH * 0.5 - 0.08, chajjaD * 0.35);
  } else if (config.chajjaStyle === 'wooden_louver') {
    box('trim_wall', mats.trimWall, chajjaW, 0.06, chajjaD, 0, winH * 0.5 + 0.06, chajjaD * 0.45);
    for (let l = 0; l < 4; l++) {
      box('wood_accent', mats.woodAccent, chajjaW - 0.08, 0.025, 0.06, 0, winH * 0.5 - 0.02, 0.12 + l * 0.09);
    }
  } else if (config.chajjaStyle === 'fin_box') {
    // Full modernist projecting box surround
    box('trim_wall', mats.trimWall, chajjaW, 0.07, chajjaD, 0, winH * 0.5 + 0.06, chajjaD * 0.45);
    box('trim_wall', mats.trimWall, 0.07, winH + 0.2, chajjaD, -winW * 0.5 - 0.06, 0, chajjaD * 0.45);
    box('trim_wall', mats.trimWall, 0.07, winH + 0.2, chajjaD, winW * 0.5 + 0.06, 0, chajjaD * 0.45);
  } else {
    box('trim_wall', mats.trimWall, chajjaW, 0.09, chajjaD * 0.85, 0, winH * 0.5 + 0.06, chajjaD * 0.35);
  }

  // 3. Recessed Glass Pane
  const glassMat = rng.pick(mats.windowGlasses);
  box(`glass_${glassMat.uuid}`, glassMat, winW - 0.04, winH - 0.04, 0.02, 0, 0, -recessD + 0.02);

  // 4. Window Outer Frame & Mullions
  box('window_frame', mats.windowFrame, winW, frameT, 0.05, 0, winH * 0.5 - frameT * 0.5, -recessD + 0.04);
  box('window_frame', mats.windowFrame, winW, frameT, 0.05, 0, -winH * 0.5 + frameT * 0.5, -recessD + 0.04);
  box('window_frame', mats.windowFrame, frameT, winH, 0.05, -winW * 0.5 + frameT * 0.5, 0, -recessD + 0.04);
  box('window_frame', mats.windowFrame, frameT, winH, 0.05, winW * 0.5 - frameT * 0.5, 0, -recessD + 0.04);

  const panes = winW > 1.5 ? 3 : 2;
  for (let p = 1; p < panes; p++) {
    const mx = -winW * 0.5 + (p / panes) * winW;
    box('window_frame', mats.windowFrame, frameT * 0.8, winH - frameT * 2, 0.04, mx, 0, -recessD + 0.04);
  }
  // Horizontal transom bar
  box('window_frame', mats.windowFrame, winW - frameT * 2, frameT * 0.75, 0.04, 0, winH * 0.18, -recessD + 0.04);

  // 5. Security Iron Grille (ubiquitous on Bengaluru residential windows)
  if (config.windowStyle === 'casement_grille' || config.windowStyle === 'industrial_grid') {
    const bars = 4;
    for (let b = 1; b < bars; b++) {
      const gy = -winH * 0.5 + (b / bars) * winH;
      box('dark_iron', mats.darkIron, winW - 0.04, 0.014, 0.014, 0, gy, -0.04);
    }
  }
}

/**
 * Builds an individual Ground-Floor Commercial Shopfront Bay (Signboard + Awning + Glass/Shutter + Plinth Steps)
 */
function addGroundShopBay(builder, mats, rng, x, groundH, zFront, bayW, shopData) {
  const plinthH = 0.32;
  const signH = 0.88;
  const signY = groundH - signH * 0.5 - 0.14;
  const openH = groundH - plinthH - signH - 0.18;
  const openCenterY = plinthH + openH * 0.5;

  // 1. Granite Entrance Steps & Plinth
  builder.addBox('granite_plinth', mats.granite, bayW - 0.1, plinthH, 0.45, x, plinthH * 0.5, zFront + 0.18);
  builder.addBox('granite_plinth', mats.granite, bayW * 0.75, plinthH * 0.5, 0.25, x, plinthH * 0.25, zFront + 0.48);

  // 2. Illuminated Shop Signboard Box
  const signTex = createSignboardTexture(shopData);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.35,
    metalness: 0.15
  });
  const signW = bayW - 0.16;
  // Signboard Aluminum Frame
  builder.addBox('dark_iron', mats.darkIron, signW + 0.06, signH + 0.06, 0.18, x, signY, zFront + 0.11);
  // Textured front face
  const faceGeo = new THREE.PlaneGeometry(signW, signH);
  const faceMat4 = new THREE.Matrix4().makeTranslation(x, signY, zFront + 0.205);
  builder.add(`sign_${shopData.name}`, signMat, faceGeo, faceMat4);
  faceGeo.dispose();

  // Gooseneck LED Spotlights above signboard
  const lightCount = Math.max(2, Math.floor(signW / 1.3));
  for (let i = 0; i < lightCount; i++) {
    const lx = x - signW * 0.38 + (i / Math.max(1, lightCount - 1)) * (signW * 0.76);
    builder.addCylinder('dark_iron', mats.darkIron, 0.012, 0.012, 0.28, 6, lx, signY + signH * 0.5 + 0.08, zFront + 0.2, Math.PI * 0.5, 0, 0);
    builder.addBox('dark_iron', mats.darkIron, 0.1, 0.04, 0.08, lx, signY + signH * 0.5 + 0.06, zFront + 0.34, 0.35, 0, 0);
  }

  // 3. Shopfront state: Open boutique glass, Half-shuttered, or Closed corrugated shutter
  const stateRoll = rng.next();
  const recessZ = zFront - 0.18;

  // Rolled-up shutter housing box under signboard
  builder.addBox('shutter_mat', mats.shutter, bayW - 0.22, 0.26, 0.26, x, plinthH + openH - 0.1, zFront - 0.02);

  if (stateRoll < 0.68) {
    // OPEN SHOPFRONT: Glass display + double door + interior warm display counter hint
    builder.addBox('shop_glass', mats.shopGlass, bayW - 0.28, openH - 0.2, 0.03, x, openCenterY - 0.05, recessZ);

    // Door frame mullions
    const doorW = Math.min(1.1, bayW * 0.38);
    const doorX = x - bayW * 0.22;
    builder.addBox('window_frame', mats.windowFrame, 0.05, openH - 0.2, 0.07, doorX - doorW * 0.5, openCenterY - 0.05, recessZ + 0.01);
    builder.addBox('window_frame', mats.windowFrame, 0.05, openH - 0.2, 0.07, doorX + doorW * 0.5, openCenterY - 0.05, recessZ + 0.01);
    // Stainless push handle
    builder.addCylinder('concrete_raw', mats.concrete, 0.015, 0.015, 0.42, 8, doorX + doorW * 0.35, openCenterY - 0.1, recessZ + 0.05);

    // Interior back wall & warm ceiling glow panel inside shop depth
    builder.addBox('interior_wall', mats.interiorWall, bayW - 0.25, openH, 0.05, x, openCenterY, recessZ - 1.1);
    builder.addBox('warm_ceiling', mats.warmLight, bayW - 0.5, 0.04, 0.6, x, plinthH + openH - 0.28, recessZ - 0.55);

    // Retractable striped fabric awning over open shop
    if (rng.chance(0.72)) {
      const awnMat = rng.pick(mats.awningMaterials);
      const awnKey = `awning_${awnMat.uuid}`;
      const awnD = 0.95;
      const awnY = signY - signH * 0.5 - 0.08;
      builder.addBox(awnKey, awnMat, bayW - 0.2, 0.04, awnD, x, awnY - 0.16, zFront + awnD * 0.48, 0.34, 0, 0);
      // Front valance flap
      builder.addBox(awnKey, awnMat, bayW - 0.2, 0.16, 0.03, x, awnY - 0.39, zFront + awnD * 0.92);
    }
  } else {
    // CLOSED OR HALF-CLOSED CORRUGATED ROLLER SHUTTER
    const shutterRatio = stateRoll < 0.85 ? 0.45 : 1.0;
    const shH = openH * shutterRatio;
    const shY = plinthH + openH - shH * 0.5;
    builder.addBox('shutter_mat', mats.shutter, bayW - 0.24, shH, 0.05, x, shY, zFront - 0.04, 0, 0, 0, [1, shutterRatio * 1.5]);

    if (shutterRatio < 1.0) {
      // Visible glass below half-pulled shutter
      builder.addBox('shop_glass', mats.shopGlass, bayW - 0.28, openH * (1 - shutterRatio), 0.03, x, plinthH + (openH * (1 - shutterRatio)) * 0.5, recessZ);
    }
  }
}

// ============================================================================
// 7. MAIN EXPORT: buildBuilding(style, opts)
// ============================================================================
/**
 * Builds a complete, self-contained Indiranagar mixed-use building.
 *
 * @param {string} [style] - One of BUILDING_STYLES (or 'random' / omitted)
 * @param {object} [opts]
 * @param {number} [opts.seed=100] - Deterministic seed
 * @param {number} [opts.floors] - Total storeys (2 to 4, including ground floor)
 * @param {number} [opts.width] - Plot frontage width in meters (default 9m - 15m)
 * @param {number} [opts.depth] - Plot depth in meters (default 10m - 14m)
 * @returns {THREE.Group}
 */
export function buildBuilding(style = 'random', opts = {}) {
  const seed = opts.seed !== undefined ? opts.seed : Math.floor(Math.random() * 100000);
  const rng = new PRNG(seed);

  const resolvedStyle =
    !style || style === 'random' || !STYLE_CONFIGS[style]
      ? rng.pick(BUILDING_STYLES)
      : style;
  const config = STYLE_CONFIGS[resolvedStyle];

  const floors = THREE.MathUtils.clamp(opts.floors || config.defaultFloors + rng.int(-1, 1), 2, 4);
  const width = opts.width || Number(rng.range(9.6, 14.8).toFixed(2));
  const depth = opts.depth || Number(rng.range(9.5, 13.5).toFixed(2));

  const groundH = 3.85;
  const upperFloorH = 3.25;
  const totalWallH = groundH + (floors - 1) * upperFloorH;

  // Determine structural bay count along front facade (3.1m to 4.2m per bay)
  const numBays = Math.max(2, Math.min(4, Math.round(width / 3.6)));
  const bayW = width / numBays;

  // Prepare Material Palette for this building
  const primaryHex = rng.pick(config.wallColors);
  const trimHex = rng.pick(config.trimColors);

  let mainWallTex;
  if (config.wallType === 'brick') {
    mainWallTex = createBrickTexture();
  } else if (config.wallType === 'tile') {
    mainWallTex = createTileCladdingTexture(primaryHex, '#8c969e');
  } else {
    mainWallTex = createStuccoTexture(primaryHex, 0.38, 0.55);
  }
  const trimWallTex = createStuccoTexture(trimHex, 0.25, 0.35);

  const mats = {
    mainWall: new THREE.MeshStandardMaterial({ map: mainWallTex, roughness: 0.85, metalness: 0.05 }),
    trimWall: new THREE.MeshStandardMaterial({ map: trimWallTex, roughness: 0.78, metalness: 0.05 }),
    concrete: new THREE.MeshStandardMaterial({
      map: createStuccoTexture('#8f8c84', 0.45, 0.6),
      roughness: 0.9
    }),
    granite: new THREE.MeshStandardMaterial({ color: '#36393c', roughness: 0.45, metalness: 0.1 }),
    windowFrame: new THREE.MeshStandardMaterial({ color: config.frameColor, roughness: 0.4, metalness: 0.5 }),
    darkIron: new THREE.MeshStandardMaterial({ color: '#1c1e21', roughness: 0.45, metalness: 0.75 }),
    woodAccent: new THREE.MeshStandardMaterial({ color: '#6e4226', roughness: 0.65, metalness: 0.05 }),
    shutter: new THREE.MeshStandardMaterial({
      map: createShutterTexture(rng.pick(['#4b5563', '#374151', '#52525b'])),
      roughness: 0.55,
      metalness: 0.6
    }),
    shopGlass: new THREE.MeshStandardMaterial({
      map: createWindowGlassTexture(seed + 7),
      roughness: 0.12,
      metalness: 0.25
    }),
    balconyGlass: new THREE.MeshStandardMaterial({
      color: '#88b2cc',
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55
    }),
    interiorWall: new THREE.MeshStandardMaterial({ color: '#44382c', roughness: 0.9 }),
    warmLight: new THREE.MeshStandardMaterial({
      color: '#ffedd5',
      emissive: '#f59e0b',
      emissiveIntensity: 0.75,
      roughness: 0.3
    }),
    acBody: new THREE.MeshStandardMaterial({ color: '#dcd9d0', roughness: 0.5, metalness: 0.25 }),
    acFront: new THREE.MeshStandardMaterial({ map: createACFrontTexture(), roughness: 0.6 }),
    blackTank: new THREE.MeshStandardMaterial({ color: '#141618', roughness: 0.35, metalness: 0.15 }),
    pvcPipe: new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.4, metalness: 0.1 }),
    terracotta: new THREE.MeshStandardMaterial({ color: '#9e472a', roughness: 0.75 }),
    foliage: new THREE.MeshStandardMaterial({ color: '#2d5a27', roughness: 0.85 }),
    windowGlasses: [
      new THREE.MeshStandardMaterial({ map: createWindowGlassTexture(seed + 1), roughness: 0.15, metalness: 0.3 }),
      new THREE.MeshStandardMaterial({ map: createWindowGlassTexture(seed + 2), roughness: 0.15, metalness: 0.3 }),
      new THREE.MeshStandardMaterial({ map: createWindowGlassTexture(seed + 3), roughness: 0.15, metalness: 0.3 })
    ],
    awningMaterials: [
      new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#065f46', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 })
    ],
    clothMaterials: [
      new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.85 })
    ]
  };

  const builder = new GeometryBuilder();
  const zFront = depth * 0.5;
  const zBack = -depth * 0.5;

  // ==========================================================================
  // A. CORE BUILDING MASS & FLOOR LEDGES
  // ==========================================================================
  // Ground floor core mass (recessed slightly so pillars & shops project forward)
  builder.addBox(
    'trim_wall',
    mats.trimWall,
    width - 0.15,
    groundH,
    depth - 0.2,
    0,
    groundH * 0.5,
    -0.08,
    0, 0, 0,
    [width * 0.35, groundH * 0.35]
  );

  // Upper residential/office storeys mass
  const upperTotalH = (floors - 1) * upperFloorH;
  builder.addBox(
    'main_wall',
    mats.mainWall,
    width,
    upperTotalH,
    depth,
    0,
    groundH + upperTotalH * 0.5,
    0,
    0, 0, 0,
    [width * 0.4, upperTotalH * 0.4]
  );

  // Horizontal concrete slab bands & drip moldings between every storey
  for (let f = 1; f <= floors; f++) {
    const slabY = groundH + (f - 1) * upperFloorH;
    const overhang = f === 1 ? 0.28 : 0.16;
    builder.addBox(
      'trim_wall',
      mats.trimWall,
      width + overhang * 2,
      0.22,
      depth + overhang * 2,
      0,
      slabY,
      0
    );
  }

  // Vertical structural concrete piers dividing bays
  const pierW = 0.34;
  for (let b = 0; b <= numBays; b++) {
    const px = -width * 0.5 + b * bayW;
    const clampedX = THREE.MathUtils.clamp(px, -width * 0.5 + pierW * 0.5, width * 0.5 - pierW * 0.5);
    builder.addBox(
      'trim_wall',
      mats.trimWall,
      pierW,
      totalWallH + 0.1,
      0.32,
      clampedX,
      totalWallH * 0.5,
      zFront - 0.04
    );
  }

  // ==========================================================================
  // B. GROUND FLOOR COMMERCIAL SHOPFRONTS
  // ==========================================================================
  const usedShops = [...SHOP_CATALOG];
  for (let b = 0; b < numBays; b++) {
    const bayCenterX = -width * 0.5 + (b + 0.5) * bayW;
    const shopIdx = rng.int(0, usedShops.length - 1);
    const shopData = usedShops.splice(shopIdx, 1)[0] || rng.pick(SHOP_CATALOG);

    addGroundShopBay(builder, mats, rng, bayCenterX, groundH, zFront, bayW - pierW * 0.6, shopData);
  }

  // Side-wall electric meter box & municipal PVC rainwater downspouts
  builder.addBox('dark_iron', mats.darkIron, 0.12, 0.85, 0.55, width * 0.5 + 0.04, 1.55, zFront - 1.2);
  for (const side of [-1, 1]) {
    const pipeX = side * (width * 0.5 + 0.04);
    builder.addCylinder('pvc_pipe', mats.pvcPipe, 0.038, 0.038, totalWallH + 0.6, 8, pipeX, (totalWallH + 0.6) * 0.5, zFront - 0.65);
    builder.addCylinder('pvc_pipe', mats.pvcPipe, 0.035, 0.035, totalWallH + 0.6, 8, pipeX, (totalWallH + 0.6) * 0.5, zBack + 0.85);
  }

  // ==========================================================================
  // C. UPPER STOREYS: BALCONIES, RECESSED WINDOWS & AC UNITS
  // ==========================================================================
  // Decide which bay indices act as projecting balcony bays vs window bays
  const balconyBayMask = [];
  for (let b = 0; b < numBays; b++) {
    if (numBays === 2) {
      balconyBayMask.push(b === 0);
    } else {
      balconyBayMask.push(b === 0 || b === numBays - 1 ? rng.chance(0.75) : rng.chance(0.35));
    }
  }

  for (let f = 1; f < floors; f++) {
    const floorBaseY = groundH + (f - 1) * upperFloorH;
    const windowCenterY = floorBaseY + upperFloorH * 0.52;

    // Front Facade Bays
    for (let b = 0; b < numBays; b++) {
      const bayCenterX = -width * 0.5 + (b + 0.5) * bayW;
      const clearBayW = bayW - pierW - 0.25;
      const hasBalconyHere = balconyBayMask[b] && rng.chance(0.85);

      if (hasBalconyHere) {
        // Projecting residential/studio balcony + double glass French door
        addBalconyAssembly(builder, mats, rng, bayCenterX, floorBaseY, zFront, clearBayW + 0.1, upperFloorH, config);
        addRecessedWindowBay(
          builder,
          mats,
          rng,
          bayCenterX,
          floorBaseY + 1.18,
          zFront,
          Math.min(1.85, clearBayW * 0.72),
          2.05,
          config,
          'front'
        );
      } else {
        // Recessed architectural window with chajja overhang & sill
        const winW = Math.min(2.15, clearBayW * 0.76);
        addRecessedWindowBay(builder, mats, rng, bayCenterX, windowCenterY, zFront, winW, 1.42, config, 'front');
      }

      // Split AC Outdoor Condenser mounted beside bay
      if (rng.chance(0.68)) {
        const acOffset = (clearBayW * 0.42) * (b % 2 === 0 ? 1 : -1);
        addSplitACUnit(builder, mats, bayCenterX + acOffset, floorBaseY + upperFloorH * 0.72, zFront, 0);
      }
    }

    // Left & Right Side Wall Windows (so driving past shows full 3D depth)
    const sideBays = Math.max(2, Math.floor(depth / 4.2));
    const sideBayD = depth / sideBays;
    for (let sb = 0; sb < sideBays; sb++) {
      const sz = -depth * 0.5 + (sb + 0.5) * sideBayD;
      if (rng.chance(0.75)) {
        addRecessedWindowBay(builder, mats, rng, width * 0.5, windowCenterY, sz, 1.35, 1.28, config, 'right');
      }
      if (rng.chance(0.75)) {
        addRecessedWindowBay(builder, mats, rng, -width * 0.5, windowCenterY, sz, 1.35, 1.28, config, 'left');
      }
      if (rng.chance(0.4)) {
        addSplitACUnit(builder, mats, width * 0.5, floorBaseY + upperFloorH * 0.74, sz + 1.0, Math.PI * 0.5);
      }
    }
  }

  // ==========================================================================
  // D. ROOFTOP PARAPET, MUMTY (STAIRWELL BULKHEAD), WATER TANKS & SOLAR
  // ==========================================================================
  const roofY = totalWallH;
  const parapetH = 0.95;
  const parapetT = 0.22;

  // Perimeter Parapet Walls
  builder.addBox('trim_wall', mats.trimWall, width, parapetH, parapetT, 0, roofY + parapetH * 0.5, zFront - parapetT * 0.5);
  builder.addBox('trim_wall', mats.trimWall, width, parapetH, parapetT, 0, roofY + parapetH * 0.5, zBack + parapetT * 0.5);
  builder.addBox('trim_wall', mats.trimWall, parapetT, parapetH, depth - parapetT * 2, -width * 0.5 + parapetT * 0.5, roofY + parapetH * 0.5, 0);
  builder.addBox('trim_wall', mats.trimWall, parapetT, parapetH, depth - parapetT * 2, width * 0.5 - parapetT * 0.5, roofY + parapetH * 0.5, 0);

  // Decorative Front Parapet Cutout / Coping Detail
  builder.addBox('concrete_raw', mats.concrete, width + 0.14, 0.1, 0.34, 0, roofY + parapetH + 0.04, zFront - parapetT * 0.5);

  // Rooftop Stairwell Bulkhead (Mumty Room)
  const mumtyW = 2.85;
  const mumtyD = 3.2;
  const mumtyH = 2.65;
  const mumtyX = -width * 0.26;
  const mumtyZ = -depth * 0.2;

  builder.addBox('main_wall', mats.mainWall, mumtyW, mumtyH, mumtyD, mumtyX, roofY + mumtyH * 0.5, mumtyZ);
  // Overhanging mumty roof slab
  builder.addBox('concrete_raw', mats.concrete, mumtyW + 0.45, 0.16, mumtyD + 0.45, mumtyX, roofY + mumtyH + 0.08, mumtyZ);
  // Metal access door on mumty
  builder.addBox('dark_iron', mats.darkIron, 0.9, 1.95, 0.06, mumtyX + 0.3, roofY + 0.98, mumtyZ + mumtyD * 0.5 + 0.02);
  // Louvered ventilation window on mumty
  builder.addBox('window_frame', mats.windowFrame, 0.75, 0.55, 0.06, mumtyX - 0.65, roofY + 1.85, mumtyZ + mumtyD * 0.5 + 0.02);

  // 1 or 2 Black Plastic Sintex Water Tanks (one atop the mumty or beside it)
  addRooftopWaterTank(builder, mats, mumtyX, roofY + mumtyH + 0.16, mumtyZ, 0.66, 1.4);
  if (rng.chance(0.75)) {
    addRooftopWaterTank(builder, mats, width * 0.24, roofY, -depth * 0.18, 0.62, 1.32);
  }

  // Rooftop Solar Water Heater (classic Bengaluru tubular collector + insulated cylinder)
  if (rng.chance(0.65)) {
    const sx = width * 0.22;
    const sz = depth * 0.15;
    // Angled collector panel
    builder.addBox('balcony_glass', mats.balconyGlass, 1.65, 0.06, 1.85, sx, roofY + 0.68, sz, 0.42, 0, 0);
    // Top horizontal insulated steel storage tank
    builder.addCylinder('ac_body', mats.acBody, 0.26, 0.26, 1.75, 14, sx, roofY + 1.15, sz - 0.72, 0, 0, Math.PI * 0.5);
    // Support frame legs
    builder.addBox('dark_iron', mats.darkIron, 0.04, 1.1, 0.04, sx - 0.75, roofY + 0.55, sz - 0.72);
    builder.addBox('dark_iron', mats.darkIron, 0.04, 1.1, 0.04, sx + 0.75, roofY + 0.55, sz - 0.72);
  }

  const buildingGroup = builder.buildGroup(`Indiranagar_${resolvedStyle}_${seed}`);
  buildingGroup.userData = {
    style: resolvedStyle,
    seed,
    floors,
    width,
    depth,
    height: totalWallH + parapetH
  };

  return buildingGroup;
}

/**
 * Convenience helper to generate a full street block of varied Indiranagar buildings
 * spaced along the X axis.
 */
export function buildStreetRow(count = 5, startSeed = 101, gap = 0.8) {
  const rowGroup = new THREE.Group();
  rowGroup.name = 'Indiranagar_100Ft_Row';
  let cursorX = 0;

  for (let i = 0; i < count; i++) {
    const style = BUILDING_STYLES[i % BUILDING_STYLES.length];
    const bldg = buildBuilding(style, { seed: startSeed + i * 37 });
    const w = bldg.userData.width;
    bldg.position.x = cursorX + w * 0.5;
    rowGroup.add(bldg);
    cursorX += w + gap;
  }

  return rowGroup;
}
