import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ============================================================================
// CACHES (TEXTURES, MATERIALS, SHARED GEOMETRIES)
// ============================================================================
const textureCache = new Map();
const materialCache = new Map();
const geometryCache = new Map();

function getCanvasTexture(key, drawFn, width = 512, height = 512, repeatX = 1, repeatY = 1) {
  const fullKey = `${key}_${width}x${height}_${repeatX}_${repeatY}`;
  if (textureCache.has(fullKey)) return textureCache.get(fullKey);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  textureCache.set(fullKey, tex);
  return tex;
}

function getMat(key, params) {
  if (materialCache.has(key)) return materialCache.get(key);
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0.04,
    flatShading: false,
    ...params,
  });
  materialCache.set(key, mat);
  return mat;
}

function getSphereGeo(radius, wSeg = 20, hSeg = 16) {
  const key = `sphere_${radius.toFixed(4)}_${wSeg}_${hSeg}`;
  if (!geometryCache.has(key)) {
    geometryCache.set(key, new THREE.SphereGeometry(radius, wSeg, hSeg));
  }
  return geometryCache.get(key);
}

// ============================================================================
// PROCEDURAL PARAMETRIC LOFTING & ANATOMICAL GEOMETRY HELPERS
// ============================================================================

/**
 * Lofts a smooth 3D tubular/garment mesh through a vertical stack of cross-sectional slices.
 * Each slice defines:
 *   y: vertical coordinate
 *   rx: half-width (X radius)
 *   rz: half-depth (Z radius)
 *   cx: X center offset (default 0)
 *   cz: Z center offset (default 0)
 *   pleatAmp: radial pleat wave amplitude (default 0)
 *   pleatFreq: number of pleats around circumference (default 0)
 *   frontFlatten: flattens or shapes front/back asymmetry (default 0)
 */
function createLoftedMesh(slices, radialSegs = 40, openEnded = false, startAngle = 0, arcAngle = Math.PI * 2) {
  const rings = slices.length;
  const cols = radialSegs + 1;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < rings; i++) {
    const s = slices[i];
    const v = i / (rings - 1);
    const cx = s.cx || 0;
    const cz = s.cz || 0;
    const pleatAmp = s.pleatAmp || 0;
    const pleatFreq = s.pleatFreq || 12;
    const frontPleatOnly = s.frontPleatOnly || false;

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = startAngle + u * arcAngle;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      // Optional pleating modulation (stronger on front +Z if frontPleatOnly is true)
      let mask = 1.0;
      if (frontPleatOnly) {
        mask = Math.max(0, cosT);
      }
      const pleat = pleatAmp * mask * Math.sin(theta * pleatFreq);

      // Optional chest/back anatomical asymmetry
      const zAsym = s.zAsym ? (cosT > 0 ? s.zAsym : -s.zAsym * 0.45) : 0;

      const x = cx + (s.rx + pleat) * sinT;
      const z = cz + (s.rz + pleat + zAsym * Math.abs(cosT)) * cosT;
      const y = s.y;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + (j + 1);
      const d = i * cols + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Cap ends if closed cylinder and not openEnded
  if (!openEnded && Math.abs(arcAngle - Math.PI * 2) < 0.01) {
    // Bottom cap
    const bottomCenterIdx = positions.length / 3;
    const s0 = slices[0];
    positions.push(s0.cx || 0, s0.y, s0.cz || 0);
    uvs.push(0.5, 0);
    for (let j = 0; j < radialSegs; j++) {
      indices.push(bottomCenterIdx, j + 1, j);
    }
    // Top cap
    const topCenterIdx = positions.length / 3;
    const sTop = slices[rings - 1];
    positions.push(sTop.cx || 0, sTop.y, sTop.cz || 0);
    uvs.push(0.5, 1);
    const baseTop = (rings - 1) * cols;
    for (let j = 0; j < radialSegs; j++) {
      indices.push(topCenterIdx, baseTop + j, baseTop + j + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an anatomical limb segment (origin at top joint y = 0, extending down to -length)
 * using smooth elliptical cross-sections for natural muscle belly curves (bicep, forearm, thigh, calf).
 */
function createOrganicLimbGeo(length, profile, radialSegs = 28) {
  // profile is array of [t (0..1), rx, rz, czOffset]
  const slices = profile.map(([t, rx, rz, cz = 0]) => ({
    y: -t * length,
    rx,
    rz,
    cz,
  }));
  return createLoftedMesh(slices, radialSegs, false);
}

// ============================================================================
// HIGH-DETAIL PROCEDURAL CANVAS TEXTURES (512x512)
// ============================================================================

function getKanjeevaramTexture(key, bodyHex, borderHex, goldHex) {
  return getCanvasTexture(key, (ctx, w, h) => {
    // Rich silk weave base with subtle dual-tone shimmer lines
    ctx.fillStyle = bodyHex;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 215, 100, 0.06)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // Woven golden chakra/floral butti motifs across the saree body
    ctx.fillStyle = goldHex;
    const spacing = 48;
    for (let y = 24; y < h - 120; y += spacing) {
      const offset = ((y / spacing) % 2) * (spacing / 2);
      for (let x = offset + 20; x < w; x += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc(x + Math.cos(ang) * 7, y + Math.sin(ang) * 7, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Contrast Silk Border (bottom 110px)
    const borderTop = h - 110;
    ctx.fillStyle = borderHex;
    ctx.fillRect(0, borderTop, w, 110);

    // Traditional South Indian Temple (Rekku) serrated triangles along border edge
    ctx.fillStyle = goldHex;
    const triW = 24;
    for (let x = 0; x < w; x += triW) {
      ctx.beginPath();
      ctx.moveTo(x, borderTop);
      ctx.lineTo(x + triW / 2, borderTop - 18);
      ctx.lineTo(x + triW, borderTop);
      ctx.closePath();
      ctx.fill();
    }

    // Heavy Zari gold bands inside border
    ctx.fillRect(0, borderTop + 8, w, 14);
    ctx.fillRect(0, borderTop + 28, w, 4);
    ctx.fillRect(0, h - 26, w, 16);

    // Diamond jaali weave inside gold band
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, borderTop + 15);
      ctx.lineTo(x + 8, borderTop + 8);
      ctx.lineTo(x + 16, borderTop + 15);
      ctx.lineTo(x + 8, borderTop + 22);
      ctx.closePath();
      ctx.stroke();
    }
  });
}

function getCottonHandloomSareeTexture(key, bodyHex, borderHex, accentHex) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = bodyHex;
    ctx.fillRect(0, 0, w, h);

    // Slub cotton cross-hatch texture
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    for (let x = 0; x < w; x += 6) ctx.fillRect(x, 0, 1, h);

    // Subtle horizontal Pochampally/Ilkal-inspired geometric stripes
    ctx.fillStyle = accentHex;
    for (let y = 36; y < h - 100; y += 52) {
      ctx.fillRect(0, y, w, 2);
      for (let x = 0; x < w; x += 24) {
        ctx.fillRect(x + 6, y - 5, 12, 12);
      }
    }

    // Striped contrasting cotton border
    const bTop = h - 96;
    ctx.fillStyle = borderHex;
    ctx.fillRect(0, bTop, w, 96);

    ctx.fillStyle = accentHex;
    ctx.fillRect(0, bTop + 6, w, 8);
    ctx.fillRect(0, bTop + 20, w, 3);
    ctx.fillRect(0, h - 22, w, 10);
  });
}

function getAnarkaliTexture(key, baseHex, borderHex, goldHex) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    // Vertical kalidar panel seam lines with gold gota patti trim
    ctx.fillStyle = goldHex;
    const panels = 16;
    const step = w / panels;
    for (let i = 0; i <= panels; i++) {
      ctx.fillRect(i * step - 1, 0, 2, h);
    }

    // Embroidered floralhem border
    const bTop = h - 85;
    ctx.fillStyle = borderHex;
    ctx.fillRect(0, bTop, w, 85);

    ctx.fillStyle = goldHex;
    ctx.fillRect(0, bTop, w, 6);
    ctx.fillRect(0, h - 16, w, 8);

    // Floral medallion arches along hem
    for (let x = 16; x < w; x += 32) {
      ctx.beginPath();
      ctx.arc(x, bTop + 42, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = borderHex;
      ctx.beginPath();
      ctx.arc(x, bTop + 42, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = goldHex;
    }
  });
}

function getKurtiPrintTexture(key, baseHex, motifHex) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    // Subtle Jaipur block-print leaf/diamond motif
    ctx.strokeStyle = motifHex;
    ctx.lineWidth = 2;
    const step = 40;
    for (let y = 20; y < h; y += step) {
      for (let x = 20; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.quadraticCurveTo(x + 9, y, x, y + 9);
        ctx.quadraticCurveTo(x - 9, y, x, y - 9);
        ctx.stroke();
      }
    }

    // Hem trim
    ctx.fillStyle = motifHex;
    ctx.fillRect(0, h - 18, w, 8);
  });
}

function getMadrasLungiTexture(key, primaryHex, darkCheckHex, lightCheckHex, accentRedHex) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = primaryHex;
    ctx.fillRect(0, 0, w, h);

    const tile = 64;
    // Woven plaid horizontal & vertical bands
    for (let i = 0; i < w; i += tile) {
      ctx.fillStyle = darkCheckHex;
      ctx.fillRect(i, 0, 22, h);
      ctx.fillRect(0, i, w, 22);

      ctx.fillStyle = lightCheckHex;
      ctx.fillRect(i + 26, 0, 10, h);
      ctx.fillRect(0, i + 26, w, 10);

      ctx.fillStyle = accentRedHex;
      ctx.fillRect(i + 44, 0, 4, h);
      ctx.fillRect(0, i + 44, w, 4);
    }

    // Subtle fabric thread grain
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);

    // Classic white/gold lower border strip
    ctx.fillStyle = lightCheckHex;
    ctx.fillRect(0, h - 24, w, 16);
  });
}

function getWovenFabricTexture(key, baseHex, stripeHex = null, checkMode = false) {
  return getCanvasTexture(key, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    // Fine linen/cotton slub weave
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);

    if (stripeHex) {
      ctx.fillStyle = stripeHex;
      for (let x = 0; x < w; x += 24) {
        ctx.fillRect(x, 0, 3, h);
      }
      if (checkMode) {
        for (let y = 0; y < h; y += 24) {
          ctx.fillRect(0, y, w, 3);
        }
      }
    }
  });
}

// ============================================================================
// ANATOMICAL HEAD, FACE, HAIR & JEWELRY BUILDER
// ============================================================================

function buildDetailedHead(cfg) {
  const headGroup = new THREE.Group();
  headGroup.name = 'head';

  const skinMat = getMat(`skin_${cfg.skin}`, {
    color: cfg.skin,
    roughness: 0.62,
    metalness: 0.02,
  });
  const lipMat = getMat(`lip_${cfg.lipColor}`, {
    color: cfg.lipColor,
    roughness: 0.48,
  });
  const hairMat = getMat(`hair_${cfg.hairColor}`, {
    color: cfg.hairColor,
    roughness: 0.82,
  });
  const scleraMat = getMat('eye_sclera', { color: '#f8fafc', roughness: 0.2 });
  const irisMat = getMat('eye_iris', { color: '#2b1b12', roughness: 0.15 });
  const pupilMat = getMat('eye_pupil', { color: '#09090b', roughness: 0.1 });
  const goldMat = getMat('jewelry_gold', {
    color: '#f59e0b',
    roughness: 0.25,
    metalness: 0.85,
  });

  // 1. Curved Neck with Sternocleidomastoid taper (y: -0.02 -> 0.085m)
  const neckGeo = createLoftedMesh(
    [
      { y: -0.02, rx: 0.062, rz: 0.064, cz: -0.004 },
      { y: 0.02, rx: 0.054, rz: 0.056, cz: -0.002 },
      { y: 0.06, rx: 0.052, rz: 0.055, cz: 0.002 },
      { y: 0.095, rx: 0.056, rz: 0.058, cz: 0.004 },
    ],
    28,
    false
  );
  headGroup.add(new THREE.Mesh(neckGeo, skinMat));

  // 2. Sculpted Cranium + Jawline + Chin + Cheekbones (y: 0.06 -> 0.285m)
  const skullSlices = [
    { y: 0.062, rx: 0.032, rz: 0.042, cz: 0.032 }, // Chin tip
    { y: 0.082, rx: 0.058, rz: 0.072, cz: 0.018 }, // Lower jaw / mandible
    { y: 0.112, rx: 0.074, rz: 0.088, cz: 0.010 }, // Mouth / cheeks
    { y: 0.145, rx: 0.082, rz: 0.096, cz: 0.006 }, // Zygomatic cheekbones
    { y: 0.178, rx: 0.081, rz: 0.098, cz: 0.002 }, // Eye/brow ridge level
    { y: 0.215, rx: 0.083, rz: 0.100, cz: -0.004 }, // Forehead / parietal
    { y: 0.252, rx: 0.072, rz: 0.088, cz: -0.008 }, // Upper cranium
    { y: 0.278, rx: 0.046, rz: 0.056, cz: -0.010 }, // Crown
    { y: 0.288, rx: 0.015, rz: 0.018, cz: -0.010 }, // Top apex
  ];
  const skullGeo = createLoftedMesh(skullSlices, 36, false);
  const skullMesh = new THREE.Mesh(skullGeo, skinMat);
  headGroup.add(skullMesh);

  // 3. Brow Ridge & Nose Bridge / Tip / Nostrils
  const noseBridgeGeo = createLoftedMesh(
    [
      { y: 0.130, rx: 0.014, rz: 0.018, cz: 0.098 }, // Nose tip base
      { y: 0.140, rx: 0.012, rz: 0.022, cz: 0.102 }, // Pronasale tip
      { y: 0.160, rx: 0.009, rz: 0.015, cz: 0.096 }, // Nasal bridge
      { y: 0.180, rx: 0.011, rz: 0.010, cz: 0.091 }, // Glabella root
    ],
    18,
    false
  );
  headGroup.add(new THREE.Mesh(noseBridgeGeo, skinMat));

  // Nostril wings (alae)
  [-1, 1].forEach((side) => {
    const nostril = new THREE.Mesh(getSphereGeo(0.0085, 12, 10), skinMat);
    nostril.scale.set(1.1, 0.85, 1.2);
    nostril.position.set(side * 0.011, 0.134, 0.098);
    headGroup.add(nostril);
  });

  // Nose stud (Nath / Mookuthi) for traditional women
  if (cfg.nosePin) {
    const pin = new THREE.Mesh(getSphereGeo(0.0032, 10, 10), goldMat);
    pin.position.set(-0.015, 0.137, 0.102);
    headGroup.add(pin);
  }

  // 4. Sculpted Upper & Lower Lips
  const upperLip = new THREE.Mesh(getSphereGeo(0.014, 16, 12), lipMat);
  upperLip.scale.set(1.65, 0.42, 0.85);
  upperLip.position.set(0, 0.111, 0.091);
  headGroup.add(upperLip);

  const lowerLip = new THREE.Mesh(getSphereGeo(0.0135, 16, 12), lipMat);
  lowerLip.scale.set(1.5, 0.48, 0.88);
  lowerLip.position.set(0, 0.103, 0.090);
  headGroup.add(lowerLip);

  // 5. Eyes (Sclera, Iris, Pupil, Upper Eyelid, Eyebrows)
  [-1, 1].forEach((side) => {
    const eyeX = side * 0.031;
    const eyeY = 0.172;
    const eyeZ = 0.084;

    const eyeball = new THREE.Mesh(getSphereGeo(0.0125, 16, 14), scleraMat);
    eyeball.scale.set(1.05, 0.88, 0.9);
    eyeball.position.set(eyeX, eyeY, eyeZ);
    headGroup.add(eyeball);

    const iris = new THREE.Mesh(getSphereGeo(0.0068, 14, 12), irisMat);
    iris.scale.set(1.0, 1.0, 0.45);
    iris.position.set(eyeX, eyeY, eyeZ + 0.0095);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(getSphereGeo(0.0036, 12, 10), pupilMat);
    pupil.scale.set(1.0, 1.0, 0.4);
    pupil.position.set(eyeX, eyeY, eyeZ + 0.0112);
    headGroup.add(pupil);

    // Upper Eyelid fold
    const eyelid = new THREE.Mesh(getSphereGeo(0.0135, 16, 12), skinMat);
    eyelid.scale.set(1.12, 0.45, 0.92);
    eyelid.position.set(eyeX, eyeY + 0.0045, eyeZ + 0.001);
    eyelid.rotation.x = 0.18;
    headGroup.add(eyelid);

    // Curved Eyebrow
    const browGeo = new THREE.CapsuleGeometry(0.0038, 0.022, 6, 12);
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.rotation.z = Math.PI / 2 - side * 0.12;
    brow.rotation.y = side * 0.25;
    brow.position.set(eyeX, eyeY + 0.017, eyeZ + 0.008);
    headGroup.add(brow);
  });

  // 6. Forehead Bindi or Vibhuti Tripundra
  if (cfg.bindi) {
    const bindiMat = getMat(`bindi_${cfg.bindiColor}`, {
      color: cfg.bindiColor,
      roughness: 0.4,
    });
    const bindi = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.002, 16), bindiMat);
    bindi.rotation.x = Math.PI / 2 - 0.08;
    bindi.position.set(0, 0.193, 0.095);
    headGroup.add(bindi);
  }

  if (cfg.vibhuti) {
    const ashMat = getMat('vibhuti_ash', { color: '#e5e7eb', roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const line = new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.028, 4, 8), ashMat);
      line.rotation.z = Math.PI / 2;
      line.position.set(0, 0.205 + i * 0.0055, 0.095 - i * 0.001);
      headGroup.add(line);
    }
    const kumkum = new THREE.Mesh(getSphereGeo(0.0032, 10, 10), getMat('kumkum', { color: '#dc2626' }));
    kumkum.position.set(0, 0.205, 0.097);
    headGroup.add(kumkum);
  }

  // 7. Sculpted Ears + Earrings (Jhumkas or Studs)
  [-1, 1].forEach((side) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.081, 0.158, -0.004);
    earGroup.rotation.y = -side * 0.28;

    const helix = new THREE.Mesh(getSphereGeo(0.018, 14, 12), skinMat);
    helix.scale.set(0.38, 1.35, 0.78);
    earGroup.add(helix);

    const lobe = new THREE.Mesh(getSphereGeo(0.009, 12, 10), skinMat);
    lobe.position.set(0, -0.018, 0.002);
    earGroup.add(lobe);

    if (cfg.earrings === 'jhumka') {
      // Gold stud + bell-shaped South Indian jhumka dome
      const stud = new THREE.Mesh(getSphereGeo(0.0045, 10, 10), goldMat);
      stud.position.set(side * 0.004, -0.019, 0.004);
      earGroup.add(stud);

      const bellGeo = new THREE.CylinderGeometry(0.003, 0.010, 0.014, 16, 1, false);
      const bell = new THREE.Mesh(bellGeo, goldMat);
      bell.position.set(side * 0.005, -0.032, 0.004);
      earGroup.add(bell);
    } else if (cfg.earrings === 'stud') {
      const stud = new THREE.Mesh(getSphereGeo(0.004, 10, 10), goldMat);
      stud.position.set(side * 0.004, -0.019, 0.004);
      earGroup.add(stud);
    }

    headGroup.add(earGroup);
  });

  // 8. Facial Hair (Mustache / Full Groomed Beard)
  if (cfg.mustache) {
    const stacheMat = getMat(`stache_${cfg.facialHairColor || cfg.hairColor}`, {
      color: cfg.facialHairColor || cfg.hairColor,
      roughness: 0.85,
    });
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.022, 8, 12), stacheMat);
      wing.rotation.z = Math.PI / 2 + side * 0.26;
      wing.rotation.y = -side * 0.22;
      wing.position.set(side * 0.013, 0.120, 0.095);
      headGroup.add(wing);
    });
  }

  if (cfg.beard) {
    const beardMat = getMat(`beard_${cfg.hairColor}`, {
      color: cfg.hairColor,
      roughness: 0.88,
    });
    const beardGeo = createLoftedMesh(
      [
        { y: 0.055, rx: 0.038, rz: 0.048, cz: 0.034 },
        { y: 0.082, rx: 0.064, rz: 0.076, cz: 0.020 },
        { y: 0.115, rx: 0.078, rz: 0.084, cz: 0.012 },
        { y: 0.145, rx: 0.083, rz: 0.068, cz: -0.002 },
      ],
      28,
      false,
      -Math.PI * 0.48,
      Math.PI * 0.96
    );
    headGroup.add(new THREE.Mesh(beardGeo, beardMat));
  }

  // 9. Eyeglasses / Spectacles (3D frames + bridge + temples)
  if (cfg.glasses) {
    const frameMat = getMat('glasses_frame', {
      color: cfg.glassesColor || '#1e1b18',
      roughness: 0.3,
      metalness: 0.7,
    });
    const lensMat = getMat('glasses_lens', {
      color: '#e0f2fe',
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.28,
    });

    [-1, 1].forEach((side) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0022, 10, 24), frameMat);
      rim.scale.set(1.15, 0.88, 1);
      rim.position.set(side * 0.032, 0.172, 0.098);
      headGroup.add(rim);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 20), lensMat);
      lens.scale.set(1.15, 0.88, 1);
      lens.position.set(side * 0.032, 0.172, 0.0985);
      headGroup.add(lens);

      // Temple arm back to ear
      const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.095, 8), frameMat);
      temple.rotation.x = Math.PI / 2;
      temple.position.set(side * 0.052, 0.174, 0.050);
      headGroup.add(temple);
    });

    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.022, 8), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.175, 0.099);
    headGroup.add(bridge);
  }

  // 10. Sculpted 3D Hairstyles
  const buildScalpBase = () => {
    const scalpGeo = createLoftedMesh(
      [
        { y: 0.130, rx: 0.078, rz: 0.088, cz: -0.022 },
        { y: 0.175, rx: 0.086, rz: 0.100, cz: -0.012 },
        { y: 0.220, rx: 0.089, rz: 0.105, cz: -0.006 },
        { y: 0.260, rx: 0.078, rz: 0.094, cz: -0.008 },
        { y: 0.288, rx: 0.052, rz: 0.064, cz: -0.010 },
        { y: 0.296, rx: 0.012, rz: 0.015, cz: -0.010 },
      ],
      32,
      false
    );
    headGroup.add(new THREE.Mesh(scalpGeo, hairMat));

    // Side parted front hair sweeps framing forehead
    [-1, 1].forEach((side) => {
      const sweep = new THREE.Mesh(getSphereGeo(0.048, 18, 14), hairMat);
      sweep.scale.set(1.15, 0.55, 0.95);
      sweep.position.set(side * 0.038, 0.242, 0.048);
      sweep.rotation.z = -side * 0.35;
      sweep.rotation.x = 0.28;
      headGroup.add(sweep);
    });
  };

  if (cfg.hairStyle === 'bun_gajra') {
    buildScalpBase();
    // Nape chignon bun
    const bun = new THREE.Mesh(getSphereGeo(0.052, 22, 18), hairMat);
    bun.scale.set(1.08, 0.95, 1.15);
    bun.position.set(0, 0.148, -0.118);
    headGroup.add(bun);

    // Mallige (Jasmine flower) Gajra wreath around the bun
    const jasmineMat = getMat('jasmine_white', { color: '#fefce8', roughness: 0.65 });
    const leafMat = getMat('jasmine_leaf', { color: '#15803d', roughness: 0.7 });
    const ringCount = 16;
    for (let i = 0; i < ringCount; i++) {
      const ang = (i / ringCount) * Math.PI * 2;
      const bud = new THREE.Mesh(getSphereGeo(0.012, 10, 8), jasmineMat);
      bud.scale.set(1.2, 0.85, 1.0);
      bud.position.set(
        Math.cos(ang) * 0.052,
        0.148 + Math.sin(ang) * 0.048,
        -0.095
      );
      headGroup.add(bud);
    }
    const gajraBand = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 8, 20), leafMat);
    gajraBand.position.set(0, 0.148, -0.092);
    headGroup.add(gajraBand);
  } else if (cfg.hairStyle === 'long_braid') {
    buildScalpBase();
    // Sculpted interlocking braid segments down the back
    const segCount = 9;
    for (let i = 0; i < segCount; i++) {
      const t = i / (segCount - 1);
      const r = 0.026 * (1 - t * 0.45);
      const knot = new THREE.Mesh(getSphereGeo(r, 14, 12), hairMat);
      knot.scale.set(1.15, 0.9, 0.85);
      knot.position.set(
        (i % 2 === 0 ? 1 : -1) * 0.004,
        0.135 - i * 0.032,
        -0.095 - Math.sin(t * Math.PI) * 0.018
      );
      headGroup.add(knot);
    }
    // Red/black parandi ribbon & tassel at end of braid
    const ribbon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.015, 0.045, 12),
      getMat('braid_tassel', { color: '#991b1b' })
    );
    ribbon.position.set(0, -0.155, -0.095);
    headGroup.add(ribbon);
  } else if (cfg.hairStyle === 'wavy_open') {
    buildScalpBase();
    // Voluminous wavy locks cascading over shoulders and back
    const backWaveGeo = createLoftedMesh(
      [
        { y: -0.12, rx: 0.115, rz: 0.055, cz: -0.088, pleatAmp: 0.008, pleatFreq: 10 },
        { y: -0.02, rx: 0.110, rz: 0.062, cz: -0.085, pleatAmp: 0.007, pleatFreq: 10 },
        { y: 0.08, rx: 0.098, rz: 0.068, cz: -0.075, pleatAmp: 0.005, pleatFreq: 10 },
        { y: 0.18, rx: 0.086, rz: 0.065, cz: -0.055 },
      ],
      28,
      false
    );
    headGroup.add(new THREE.Mesh(backWaveGeo, hairMat));
  } else if (cfg.hairStyle === 'high_ponytail') {
    buildScalpBase();
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.006, 10, 18),
      getMat('scrunchie', { color: '#be185d' })
    );
    band.rotation.x = 0.4;
    band.position.set(0, 0.215, -0.098);
    headGroup.add(band);

    const tailGeo = createLoftedMesh(
      [
        { y: -0.04, rx: 0.014, rz: 0.014, cz: -0.145 },
        { y: 0.04, rx: 0.032, rz: 0.028, cz: -0.150 },
        { y: 0.13, rx: 0.036, rz: 0.032, cz: -0.138 },
        { y: 0.21, rx: 0.022, rz: 0.022, cz: -0.105 },
      ],
      20,
      false
    );
    headGroup.add(new THREE.Mesh(tailGeo, hairMat));
  } else if (cfg.hairStyle === 'mens_wavy') {
    buildScalpBase();
    // Extra textured crown pompadour volume
    const crownWave = new THREE.Mesh(getSphereGeo(0.062, 20, 16), hairMat);
    crownWave.scale.set(1.18, 0.58, 1.25);
    crownWave.position.set(0, 0.258, 0.018);
    headGroup.add(crownWave);
  } else if (cfg.hairStyle === 'receding_uncle') {
    // Horseshoe side-and-back salt-and-pepper fringe with exposed forehead/crown
    const horseshoeGeo = createLoftedMesh(
      [
        { y: 0.115, rx: 0.078, rz: 0.085, cz: -0.014 },
        { y: 0.165, rx: 0.087, rz: 0.096, cz: -0.012 },
        { y: 0.210, rx: 0.085, rz: 0.092, cz: -0.016 },
      ],
      28,
      false,
      Math.PI * 0.35,
      Math.PI * 1.30
    );
    headGroup.add(new THREE.Mesh(horseshoeGeo, hairMat));
  }

  return headGroup;
}

// ============================================================================
// ARTICULATED HAND & FOOTWEAR BUILDERS
// ============================================================================

function buildDetailedHand(side, skinMat) {
  const handGroup = new THREE.Group();
  const xSign = side === 'left' ? 1 : -1;

  // Sculpted palm (metacarpal block with rounded edges)
  const palmGeo = createLoftedMesh(
    [
      { y: -0.078, rx: 0.034, rz: 0.014 },
      { y: -0.042, rx: 0.038, rz: 0.016 },
      { y: -0.010, rx: 0.032, rz: 0.018 },
      { y: 0.004, rx: 0.026, rz: 0.020 },
    ],
    18,
    false
  );
  handGroup.add(new THREE.Mesh(palmGeo, skinMat));

  // 4 Fingers (index, middle, ring, pinky) slightly curled naturally
  const fingerLengths = [0.056, 0.062, 0.058, 0.046];
  const fingerX = [-0.024, -0.008, 0.008, 0.023];

  for (let i = 0; i < 4; i++) {
    const fLen = fingerLengths[i];
    const fingerGeo = new THREE.CapsuleGeometry(0.0062, fLen, 6, 10);
    fingerGeo.translate(0, -fLen / 2, 0);
    const finger = new THREE.Mesh(fingerGeo, skinMat);
    finger.position.set(xSign * fingerX[i], -0.072, 0.002);
    finger.rotation.x = 0.22 + i * 0.04;
    handGroup.add(finger);
  }

  // Opposable Thumb
  const thumbGeo = new THREE.CapsuleGeometry(0.0075, 0.042, 6, 10);
  thumbGeo.translate(0, -0.021, 0);
  const thumb = new THREE.Mesh(thumbGeo, skinMat);
  thumb.position.set(-xSign * 0.032, -0.032, 0.008);
  thumb.rotation.z = -xSign * 0.48;
  thumb.rotation.x = 0.35;
  handGroup.add(thumb);

  return handGroup;
}

function buildDetailedFoot(side, skinMat, footwearType, shoeColor, accentColor = '#d97706') {
  const footGroup = new THREE.Group();
  const xSign = side === 'left' ? 1 : -1;

  const shoeMat = getMat(`shoe_${shoeColor}`, { color: shoeColor, roughness: 0.65 });
  const soleMat = getMat('shoe_sole_dark', { color: '#1c1917', roughness: 0.85 });
  const accentMat = getMat(`shoe_accent_${accentColor}`, {
    color: accentColor,
    roughness: 0.4,
    metalness: 0.5,
  });

  if (footwearType === 'sneakers') {
    // Cushioned rubber midsole (bottom flush at y = 0)
    const midsoleGeo = createLoftedMesh(
      [
        { y: 0.000, rx: 0.046, rz: 0.118, cz: 0.038 },
        { y: 0.022, rx: 0.048, rz: 0.120, cz: 0.038 },
      ],
      24,
      false
    );
    footGroup.add(new THREE.Mesh(midsoleGeo, getMat('sneaker_sole', { color: '#f8fafc', roughness: 0.7 })));

    // Upper sneaker vamp + collar
    const upperGeo = createLoftedMesh(
      [
        { y: 0.020, rx: 0.046, rz: 0.116, cz: 0.036 },
        { y: 0.052, rx: 0.043, rz: 0.095, cz: 0.022 },
        { y: 0.076, rx: 0.036, rz: 0.052, cz: -0.008 },
      ],
      24,
      false
    );
    footGroup.add(new THREE.Mesh(upperGeo, shoeMat));
  } else if (footwearType === 'mojari') {
    // Traditional Indian Jutti / Mojari with curled toe and gold embroidery trim
    const soleGeo = createLoftedMesh(
      [
        { y: 0.000, rx: 0.042, rz: 0.112, cz: 0.036 },
        { y: 0.012, rx: 0.044, rz: 0.114, cz: 0.036 },
      ],
      22,
      false
    );
    footGroup.add(new THREE.Mesh(soleGeo, soleMat));

    const vampGeo = createLoftedMesh(
      [
        { y: 0.012, rx: 0.043, rz: 0.112, cz: 0.036 },
        { y: 0.042, rx: 0.038, rz: 0.088, cz: 0.024 },
        { y: 0.056, rx: 0.033, rz: 0.045, cz: -0.015 },
      ],
      22,
      false
    );
    footGroup.add(new THREE.Mesh(vampGeo, shoeMat));

    // Curled Nokh toe tip
    const curl = new THREE.Mesh(getSphereGeo(0.014, 12, 10), accentMat);
    curl.position.set(0, 0.028, 0.145);
    footGroup.add(curl);
  } else {
    // Anatomical bare/sandaled foot + leather Chappal / Kolhapuri / Ladies Sandal
    const soleGeo = createLoftedMesh(
      [
        { y: 0.000, rx: 0.044, rz: 0.114, cz: 0.036 },
        { y: 0.014, rx: 0.045, rz: 0.115, cz: 0.036 },
      ],
      24,
      false
    );
    footGroup.add(new THREE.Mesh(soleGeo, shoeMat));

    // Sculpted skin foot arch + heel + forefoot
    const skinFootGeo = createLoftedMesh(
      [
        { y: 0.014, rx: 0.041, rz: 0.105, cz: 0.032 },
        { y: 0.042, rx: 0.038, rz: 0.082, cz: 0.016 },
        { y: 0.068, rx: 0.034, rz: 0.042, cz: -0.006 },
      ],
      22,
      false
    );
    footGroup.add(new THREE.Mesh(skinFootGeo, skinMat));

    // Arched Leather Straps across instep and forefoot
    const strap1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.007, 8, 20, Math.PI),
      shoeMat
    );
    strap1.rotation.y = Math.PI / 2;
    strap1.scale.set(1.2, 0.78, 1.0);
    strap1.position.set(0, 0.016, 0.035);
    footGroup.add(strap1);

    const strap2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.041, 0.0065, 8, 20, Math.PI),
      shoeMat
    );
    strap2.rotation.y = Math.PI / 2;
    strap2.scale.set(1.1, 0.65, 1.0);
    strap2.position.set(0, 0.015, 0.082);
    footGroup.add(strap2);
  }

  return footGroup;
}

// ============================================================================
// THE 6 DISTINCT BENGALURU PEDESTRIAN VARIANTS
// ============================================================================

export const PEDESTRIAN_VARIANTS = [
  'kanjeevaram_saree',
  'cotton_saree_commuter',
  'anarkali_salwar',
  'patiala_salwar_student',
  'linen_kurta_man',
  'checked_lungi_uncle',
];

const VARIANT_CONFIGS = {
  // 1. Festive / Temple Kanjeevaram Silk Saree Woman
  kanjeevaram_saree: {
    gender: 'female',
    heightScale: 0.96,
    skin: '#9e6240',
    lipColor: '#9f1239',
    hairColor: '#14110f',
    hairStyle: 'bun_gajra',
    bindi: true,
    bindiColor: '#dc2626',
    nosePin: true,
    earrings: 'jhumka',
    glasses: false,
    blouseColor: '#064e3b', // Emerald green silk blouse
    sareeColors: ['#9f1239', '#064e3b', '#f59e0b'], // Ruby crimson body, emerald/gold temple border
    bangles: true,
    bangleColor: '#f59e0b',
    footwear: 'sandals',
    shoeColor: '#78350f',
    prop: 'clutch_purse',
  },

  // 2. Working Professional Woman in Handloom Indigo Cotton Saree & Tote Bag
  cotton_saree_commuter: {
    gender: 'female',
    heightScale: 0.97,
    skin: '#844d32',
    lipColor: '#88392d',
    hairColor: '#181512',
    hairStyle: 'long_braid',
    bindi: true,
    bindiColor: '#1e1b4b',
    nosePin: false,
    earrings: 'stud',
    glasses: true,
    glassesColor: '#78350f',
    blouseColor: '#be185d', // Contrast magenta cotton blouse with elbow sleeves
    sareeColors: ['#1e3a8a', '#be185d', '#e2e8f0'], // Indigo handloom, magenta/silver border
    bangles: true,
    bangleColor: '#cbd5e1',
    footwear: 'sandals',
    shoeColor: '#3f2314',
    prop: 'shoulder_tote',
  },

  // 3. Flared Floor-Length Anarkali Salwar Kameez Woman
  anarkali_salwar: {
    gender: 'female',
    heightScale: 0.98,
    skin: '#b57855',
    lipColor: '#be123c',
    hairColor: '#1c1613',
    hairStyle: 'wavy_open',
    bindi: true,
    bindiColor: '#be123c',
    nosePin: true,
    earrings: 'jhumka',
    glasses: false,
    kameezColors: ['#d97706', '#9d174d', '#fde047'], // Marigold gold Anarkali with rani pink & gold border
    salwarColor: '#9d174d', // Churidar leggings
    dupattaColor: '#be185d', // Sheer magenta dupatta
    bangles: true,
    bangleColor: '#fde047',
    footwear: 'mojari',
    shoeColor: '#9d174d',
    prop: 'none',
  },

  // 4. College Student / Young Commuter in Short Kurti + Voluminous Pleated Patiala Salwar
  patiala_salwar_student: {
    gender: 'female',
    heightScale: 0.95,
    skin: '#a46949',
    lipColor: '#9d4436',
    hairColor: '#171311',
    hairStyle: 'high_ponytail',
    bindi: false,
    nosePin: false,
    earrings: 'stud',
    glasses: false,
    kurtiColors: ['#0f766e', '#5eead4'], // Teal block-print short kurti
    salwarColor: '#fef3c7', // Warm ivory pleated Patiala salwar
    dupattaColor: '#f43f5e', // Coral neck scarf dupatta
    bangles: false,
    footwear: 'sneakers',
    shoeColor: '#f1f5f9',
    prop: 'backpack',
  },

  // 5. Indiranagar Creative / Architect Man in Mandarin-Collar Olive Kurta & Pajama
  linen_kurta_man: {
    gender: 'male',
    heightScale: 1.03,
    skin: '#8c5336',
    lipColor: '#6e3d28',
    hairColor: '#181412',
    hairStyle: 'mens_wavy',
    mustache: true,
    beard: true,
    glasses: true,
    glassesColor: '#b45309',
    kurtaColor: '#3f6212', // Olive green khadi linen kurta
    pajamaColor: '#f5f5f4', // Off-white narrow cotton pajama
    footwear: 'sandals',
    shoeColor: '#451a03',
    prop: 'messenger_bag',
  },

  // 6. Classic Bengaluru Lungi Uncle with Madras-Check Lungi, Camp-Collar Shirt & Angavastram Towel
  checked_lungi_uncle: {
    gender: 'male',
    heightScale: 0.99,
    skin: '#754228',
    lipColor: '#5c321e',
    hairColor: '#d4d4d8', // Salt and pepper grey
    facialHairColor: '#e4e4e7',
    hairStyle: 'receding_uncle',
    mustache: true,
    beard: false,
    vibhuti: true,
    glasses: true,
    glassesColor: '#27272a',
    shirtColor: '#f5ebe0', // Warm cream linen half-sleeve shirt
    shirtStripe: '#d6ccc2',
    lungiColors: ['#1d4ed8', '#1e3a8a', '#f8fafc', '#dc2626'], // Classic blue/navy/white/red Madras check
    towelColor: '#fef3c7', // Cream angavastram towel with red/gold border
    footwear: 'sandals',
    shoeColor: '#291811',
    prop: 'shoulder_towel',
  },
};

// ============================================================================
// MAIN BUILDER: buildPedestrian(variant)
// ============================================================================

/**
 * Builds a high-detail smooth-shaded Bengaluru pedestrian (~1.7m tall).
 *
 * Hierarchy returned:
 *   THREE.Group ('pedestrian_<variant>')
 *     ├─ body (THREE.Group)
 *     │   ├─ head (THREE.Group, pivot at neck y = 1.42m)
 *     │   ├─ leftArm (THREE.Group, pivot at left shoulder)
 *     │   ├─ rightArm (THREE.Group, pivot at right shoulder)
 *     │   └─ torso / draped pallu / dupatta / props
 *     ├─ leftLeg (THREE.Group, pivot at left hip y = 0.88m)
 *     └─ rightLeg (THREE.Group, pivot at right hip y = 0.88m)
 *
 * @param {string|number} [variant] - Variant name from PEDESTRIAN_VARIANTS, index (0..5), or omitted for random.
 * @returns {THREE.Group}
 */
export function buildPedestrian(variant) {
  let variantKey = variant;
  if (typeof variant === 'number') {
    variantKey = PEDESTRIAN_VARIANTS[Math.abs(variant) % PEDESTRIAN_VARIANTS.length];
  } else if (!variantKey || !VARIANT_CONFIGS[variantKey]) {
    variantKey = PEDESTRIAN_VARIANTS[Math.floor(Math.random() * PEDESTRIAN_VARIANTS.length)];
  }

  const cfg = VARIANT_CONFIGS[variantKey];
  const isFemale = cfg.gender === 'female';

  const root = new THREE.Group();
  root.name = `pedestrian_${variantKey}`;

  const skinMat = getMat(`skin_${cfg.skin}`, {
    color: cfg.skin,
    roughness: 0.62,
    metalness: 0.02,
  });
  const goldMat = getMat('jewelry_gold', {
    color: '#f59e0b',
    roughness: 0.25,
    metalness: 0.85,
  });

  // Anatomical reference heights (in meters, pre-heightScale)
  const hipY = 0.88;
  const shoulderY = 1.35;
  const neckY = 1.42;
  const shoulderHalfWidth = isFemale ? 0.175 : 0.205;
  const hipHalfOffset = isFemale ? 0.088 : 0.095;

  // --------------------------------------------------------------------------
  // 1. BODY GROUP (Torso + Garment Overlays + Draperies)
  // --------------------------------------------------------------------------
  const body = new THREE.Group();
  body.name = 'body';
  root.add(body);

  // Build distinct upper-body & draped garment silhouettes per variant
  if (variantKey === 'kanjeevaram_saree' || variantKey === 'cotton_saree_commuter') {
    const isSilk = variantKey === 'kanjeevaram_saree';
    const sareeTex = isSilk
      ? getKanjeevaramTexture(`saree_${variantKey}`, ...cfg.sareeColors)
      : getCottonHandloomSareeTexture(`saree_${variantKey}`, ...cfg.sareeColors);

    const sareeMat = getMat(`saree_mat_${variantKey}`, {
      map: sareeTex,
      roughness: isSilk ? 0.36 : 0.78,
      metalness: isSilk ? 0.18 : 0.02,
      side: THREE.DoubleSide,
    });
    const blouseMat = getMat(`blouse_${cfg.blouseColor}`, {
      color: cfg.blouseColor,
      roughness: isSilk ? 0.45 : 0.75,
    });

    // Exposed midriff skin waist section (y: 0.86 -> 1.03m)
    const midriffGeo = createLoftedMesh(
      [
        { y: 0.86, rx: 0.152, rz: 0.112 },
        { y: 0.95, rx: 0.128, rz: 0.095 },
        { y: 1.04, rx: 0.138, rz: 0.104 },
      ],
      36,
      false
    );
    body.add(new THREE.Mesh(midriffGeo, skinMat));

    // Fitted Saree Choli / Blouse with anatomical bust contour (y: 1.03 -> 1.41m)
    const blouseGeo = createLoftedMesh(
      [
        { y: 1.03, rx: 0.138, rz: 0.105 },
        { y: 1.15, rx: 0.158, rz: 0.135, zAsym: 0.028 }, // Bust projection
        { y: 1.27, rx: 0.154, rz: 0.115, zAsym: 0.012 },
        { y: 1.36, rx: 0.172, rz: 0.098 },
        { y: 1.41, rx: 0.075, rz: 0.068 },
      ],
      36,
      false
    );
    body.add(new THREE.Mesh(blouseGeo, blouseMat));

    // Saree Waist Band + Nivi Front Pleat Fan (hangs down front center between legs)
    const waistWrapGeo = createLoftedMesh(
      [
        { y: 0.76, rx: 0.168, rz: 0.125, pleatAmp: 0.008, pleatFreq: 16, frontPleatOnly: true },
        { y: 0.89, rx: 0.156, rz: 0.116, pleatAmp: 0.005, pleatFreq: 16, frontPleatOnly: true },
      ],
      36,
      false
    );
    body.add(new THREE.Mesh(waistWrapGeo, sareeMat));

    // Diagonal Saree Pallu Sash sweeping from right hip (y=0.88, x=-0.15) to left shoulder (y=1.39, x=+0.13)
    const palluSlices = [
      { y: 0.88, rx: 0.09, rz: 0.122, cx: -0.06, cz: 0.01, pleatAmp: 0.006, pleatFreq: 10 },
      { y: 1.02, rx: 0.12, rz: 0.132, cx: -0.02, cz: 0.018, pleatAmp: 0.007, pleatFreq: 10 },
      { y: 1.16, rx: 0.13, rz: 0.148, cx: 0.03, cz: 0.022, pleatAmp: 0.007, pleatFreq: 10 },
      { y: 1.29, rx: 0.11, rz: 0.126, cx: 0.08, cz: 0.010, pleatAmp: 0.006, pleatFreq: 10 },
      { y: 1.39, rx: 0.085, rz: 0.105, cx: 0.11, cz: -0.01, pleatAmp: 0.005, pleatFreq: 10 },
    ];
    const palluDrapeGeo = createLoftedMesh(palluSlices, 32, true, -Math.PI * 0.65, Math.PI * 1.35);
    body.add(new THREE.Mesh(palluDrapeGeo, sareeMat));

    // Hanging Back Pallu Trail (draping gracefully down behind the left shoulder)
    const trailLen = isSilk ? 0.62 : 0.48;
    const palluTrailGeo = createLoftedMesh(
      [
        { y: 1.38 - trailLen, rx: 0.11, rz: 0.018, cx: 0.10, cz: -0.145, pleatAmp: 0.008, pleatFreq: 8 },
        { y: 1.38 - trailLen * 0.5, rx: 0.095, rz: 0.018, cx: 0.105, cz: -0.132, pleatAmp: 0.006, pleatFreq: 8 },
        { y: 1.38, rx: 0.075, rz: 0.022, cx: 0.11, cz: -0.095, pleatAmp: 0.004, pleatFreq: 8 },
      ],
      24,
      false
    );
    body.add(new THREE.Mesh(palluTrailGeo, sareeMat));

    // Gold Necklace / Mangalsutra for Kanjeevaram variant
    if (isSilk) {
      const haar = new THREE.Mesh(
        new THREE.TorusGeometry(0.082, 0.0055, 10, 28, Math.PI * 1.1),
        goldMat
      );
      haar.rotation.x = Math.PI / 2 + 0.38;
      haar.rotation.z = -0.05;
      haar.position.set(0, 1.35, 0.048);
      body.add(haar);
    }
  } else if (variantKey === 'anarkali_salwar') {
    const anarkaliTex = getAnarkaliTexture(`anarkali_${variantKey}`, ...cfg.kameezColors);
    const kameezMat = getMat(`kameez_${variantKey}`, {
      map: anarkaliTex,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const dupattaMat = getMat(`dupatta_${cfg.dupattaColor}`, {
      color: cfg.dupattaColor,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    // Fitted Bodice + Flared 24-Kalidar Pleated Anarkali Skirt (y: 0.24m -> 1.41m)
    const anarkaliGeo = createLoftedMesh(
      [
        { y: 0.24, rx: 0.34, rz: 0.29, pleatAmp: 0.022, pleatFreq: 20 }, // Wide flared hem
        { y: 0.48, rx: 0.27, rz: 0.23, pleatAmp: 0.016, pleatFreq: 20 },
        { y: 0.72, rx: 0.20, rz: 0.16, pleatAmp: 0.010, pleatFreq: 20 },
        { y: 0.92, rx: 0.155, rz: 0.118, pleatAmp: 0.004, pleatFreq: 20 },
        { y: 1.04, rx: 0.135, rz: 0.102 }, // Fitted empire waist
        { y: 1.16, rx: 0.158, rz: 0.132, zAsym: 0.026 }, // Bust
        { y: 1.35, rx: 0.172, rz: 0.098 },
        { y: 1.41, rx: 0.075, rz: 0.068 },
      ],
      48,
      false
    );
    body.add(new THREE.Mesh(anarkaliGeo, kameezMat));

    // U-shaped Dupatta draped across front chest and trailing down back over both shoulders
    const chestU = new THREE.Mesh(
      new THREE.TorusGeometry(0.125, 0.024, 12, 28, Math.PI),
      dupattaMat
    );
    chestU.rotation.x = Math.PI + 0.32;
    chestU.scale.set(1.05, 1.15, 0.55);
    chestU.position.set(0, 1.36, 0.108);
    body.add(chestU);

    [-1, 1].forEach((side) => {
      const tailGeo = createLoftedMesh(
        [
          { y: 0.72, rx: 0.065, rz: 0.012, cx: side * 0.12, cz: -0.145, pleatAmp: 0.005, pleatFreq: 6 },
          { y: 1.05, rx: 0.055, rz: 0.014, cx: side * 0.115, cz: -0.128, pleatAmp: 0.004, pleatFreq: 6 },
          { y: 1.37, rx: 0.042, rz: 0.018, cx: side * 0.11, cz: -0.085 },
        ],
        18,
        false
      );
      body.add(new THREE.Mesh(tailGeo, dupattaMat));
    });
  } else if (variantKey === 'patiala_salwar_student') {
    const kurtiTex = getKurtiPrintTexture(`kurti_${variantKey}`, ...cfg.kurtiColors);
    const kurtiMat = getMat(`kurti_${variantKey}`, {
      map: kurtiTex,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const dupattaMat = getMat(`dupatta_${cfg.dupattaColor}`, {
      color: cfg.dupattaColor,
      roughness: 0.65,
    });

    // Fitted Short Kurti with side slits (y: 0.66m -> 1.41m)
    const kurtiGeo = createLoftedMesh(
      [
        { y: 0.66, rx: 0.195, rz: 0.142 },
        { y: 0.84, rx: 0.168, rz: 0.122 },
        { y: 1.02, rx: 0.136, rz: 0.102 },
        { y: 1.16, rx: 0.156, rz: 0.130, zAsym: 0.024 },
        { y: 1.35, rx: 0.168, rz: 0.096 },
        { y: 1.41, rx: 0.074, rz: 0.066 },
      ],
      36,
      false
    );
    body.add(new THREE.Mesh(kurtiGeo, kurtiMat));

    // Coiled neck scarf dupatta
    const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.022, 12, 24), dupattaMat);
    scarfRing.rotation.x = Math.PI / 2 + 0.12;
    scarfRing.scale.set(1.05, 1.15, 0.85);
    scarfRing.position.set(0, 1.38, 0.012);
    body.add(scarfRing);
  } else if (variantKey === 'linen_kurta_man') {
    const kurtaTex = getWovenFabricTexture(`kurta_${variantKey}`, cfg.kurtaColor);
    const kurtaMat = getMat(`kurta_${variantKey}`, {
      map: kurtaTex,
      roughness: 0.82,
    });

    // Tailored Men's Long Linen Kurta reaching knees (y: 0.56m -> 1.41m)
    const kurtaGeo = createLoftedMesh(
      [
        { y: 0.56, rx: 0.215, rz: 0.148 },
        { y: 0.78, rx: 0.192, rz: 0.136 },
        { y: 0.98, rx: 0.175, rz: 0.126 },
        { y: 1.18, rx: 0.192, rz: 0.138, zAsym: 0.012 },
        { y: 1.36, rx: 0.205, rz: 0.115 },
        { y: 1.41, rx: 0.082, rz: 0.078 },
      ],
      36,
      false
    );
    body.add(new THREE.Mesh(kurtaGeo, kurtaMat));

    // Mandarin Bandhgala Collar + Button Placket
    const collarGeo = new THREE.CylinderGeometry(0.068, 0.074, 0.038, 24, 1, true, -Math.PI * 0.85, Math.PI * 1.7);
    collarGeo.rotateY(Math.PI);
    const collar = new THREE.Mesh(collarGeo, kurtaMat);
    collar.position.set(0, 1.415, 0.002);
    body.add(collar);

    const placketMat = getMat('kurta_placket', { color: '#2e480d', roughness: 0.8 });
    const placket = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.22, 6, 12), placketMat);
    placket.scale.set(1.2, 1.0, 0.35);
    placket.position.set(0, 1.26, 0.138);
    body.add(placket);

    // 3 Wooden Kurta Buttons
    const btnMat = getMat('wood_btn', { color: '#78350f', roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 12), btnMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, 1.33 - i * 0.055, 0.143);
      body.add(btn);
    }
  } else if (variantKey === 'checked_lungi_uncle') {
    const shirtTex = getWovenFabricTexture(`shirt_${variantKey}`, cfg.shirtColor, cfg.shirtStripe, false);
    const shirtMat = getMat(`shirt_${variantKey}`, {
      map: shirtTex,
      roughness: 0.78,
    });
    const lungiTex = getMadrasLungiTexture(`lungi_${variantKey}`, ...cfg.lungiColors);
    const lungiMat = getMat(`lungi_${variantKey}`, {
      map: lungiTex,
      roughness: 0.76,
    });

    // Relaxed Camp-Collar Half-Sleeve Shirt with slight uncle belly contour (y: 0.82 -> 1.41m)
    const shirtGeo = createLoftedMesh(
      [
        { y: 0.82, rx: 0.195, rz: 0.148, cz: 0.012 },
        { y: 0.98, rx: 0.198, rz: 0.158, cz: 0.018, zAsym: 0.018 }, // Gentle belly curve
        { y: 1.18, rx: 0.195, rz: 0.142, cz: 0.008 },
        { y: 1.35, rx: 0.202, rz: 0.115 },
        { y: 1.41, rx: 0.082, rz: 0.078 },
      ],
      36,
      false
    );
    body.add(new THREE.Mesh(shirtGeo, shirtMat));

    // Folded Lungi Waist Tuck Knot under shirt hem
    const waistKnotGeo = createLoftedMesh(
      [
        { y: 0.72, rx: 0.186, rz: 0.142, pleatAmp: 0.008, pleatFreq: 14 },
        { y: 0.84, rx: 0.188, rz: 0.145, pleatAmp: 0.006, pleatFreq: 14 },
      ],
      32,
      false
    );
    body.add(new THREE.Mesh(waistKnotGeo, lungiMat));

    // Left Chest Shirt Pocket + Ballpoint Pen Clip
    const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.025, 8, 12), shirtMat);
    pocket.scale.set(1.1, 1.0, 0.22);
    pocket.position.set(0.072, 1.21, 0.142);
    body.add(pocket);

    const pen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8),
      getMat('pen_blue', { color: '#1d4ed8', metalness: 0.5 })
    );
    pen.position.set(0.082, 1.24, 0.146);
    body.add(pen);
  }

  // --------------------------------------------------------------------------
  // 2. HEAD GROUP (Pivot at Neck: y = 1.42m)
  // --------------------------------------------------------------------------
  const headGroup = buildDetailedHead(cfg);
  headGroup.position.set(0, neckY, 0);
  body.add(headGroup);

  // --------------------------------------------------------------------------
  // 3. LEFT & RIGHT ARMS (Pivot at Shoulders: y = 1.35m, x = ±shoulderHalfWidth)
  // --------------------------------------------------------------------------
  function buildArm(side) {
    const armGroup = new THREE.Group();
    armGroup.name = side === 'left' ? 'leftArm' : 'rightArm';
    const xSign = side === 'left' ? 1 : -1;
    armGroup.position.set(xSign * shoulderHalfWidth, shoulderY, 0);

    // Determine sleeve style & material
    let sleeveMat = skinMat;
    let sleeveCoverage = 'short'; // 'short', 'elbow', 'three_quarter', 'rolled_kurta'

    if (variantKey === 'kanjeevaram_saree') {
      sleeveMat = getMat(`blouse_${cfg.blouseColor}`, { color: cfg.blouseColor, roughness: 0.45 });
      sleeveCoverage = 'short';
    } else if (variantKey === 'cotton_saree_commuter') {
      sleeveMat = getMat(`blouse_${cfg.blouseColor}`, { color: cfg.blouseColor, roughness: 0.75 });
      sleeveCoverage = 'elbow';
    } else if (variantKey === 'anarkali_salwar') {
      sleeveMat = getMat(`sleeve_${cfg.kameezColors[0]}`, { color: cfg.kameezColors[0], roughness: 0.55 });
      sleeveCoverage = 'three_quarter';
    } else if (variantKey === 'patiala_salwar_student') {
      sleeveMat = getMat(`sleeve_${cfg.kurtiColors[0]}`, { color: cfg.kurtiColors[0], roughness: 0.75 });
      sleeveCoverage = 'short';
    } else if (variantKey === 'linen_kurta_man') {
      sleeveMat = getMat(`kurta_${variantKey}`);
      sleeveCoverage = 'rolled_kurta';
    } else if (variantKey === 'checked_lungi_uncle') {
      sleeveMat = getMat(`shirt_${variantKey}`);
      sleeveCoverage = 'short';
    }

    // Deltoid shoulder cap sphere
    const shoulderCap = new THREE.Mesh(getSphereGeo(isFemale ? 0.048 : 0.056, 18, 14), sleeveMat);
    armGroup.add(shoulderCap);

    // Upper Arm (0 -> -0.26m)
    const rArmScale = isFemale ? 0.88 : 1.04;
    const upperArmGeo = createOrganicLimbGeo(0.26, [
      [0.0, 0.048 * rArmScale, 0.050 * rArmScale],
      [0.45, 0.045 * rArmScale, 0.048 * rArmScale], // Bicep/tricep belly
      [0.85, 0.039 * rArmScale, 0.041 * rArmScale],
      [1.0, 0.037 * rArmScale, 0.038 * rArmScale],
    ]);
    armGroup.add(new THREE.Mesh(upperArmGeo, sleeveMat));

    // Decorative gold zari sleeve cuff on saree blouse
    if (variantKey === 'kanjeevaram_saree' || variantKey === 'cotton_saree_commuter') {
      const cuffY = sleeveCoverage === 'elbow' ? -0.23 : -0.15;
      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(0.042 * rArmScale, 0.005, 10, 22),
        goldMat
      );
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(0, cuffY, 0);
      armGroup.add(cuff);
    }

    // Forearm Group (Pivot at Elbow y = -0.26m, natural slight bend forward)
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.26, 0);
    forearmGroup.rotation.x = -0.14;
    armGroup.add(forearmGroup);

    const isForearmSleeved = sleeveCoverage === 'three_quarter' || sleeveCoverage === 'rolled_kurta';
    const upperForearmMat = isForearmSleeved ? sleeveMat : skinMat;

    // Elbow joint sphere
    forearmGroup.add(new THREE.Mesh(getSphereGeo(0.036 * rArmScale, 14, 12), upperForearmMat));

    // Forearm (0 -> -0.24m)
    const forearmGeo = createOrganicLimbGeo(0.24, [
      [0.0, 0.037 * rArmScale, 0.038 * rArmScale],
      [0.32, 0.039 * rArmScale, 0.041 * rArmScale], // Brachioradialis curve
      [0.75, 0.031 * rArmScale, 0.033 * rArmScale],
      [1.0, 0.027 * rArmScale, 0.022 * rArmScale], // Wrist
    ]);
    forearmGroup.add(new THREE.Mesh(forearmGeo, skinMat));

    if (isForearmSleeved) {
      // Sleeve cuff overlay on upper half of forearm
      const sleeveCuffGeo = createOrganicLimbGeo(0.14, [
        [0.0, 0.040 * rArmScale, 0.041 * rArmScale],
        [0.8, 0.042 * rArmScale, 0.043 * rArmScale],
        [1.0, 0.044 * rArmScale, 0.045 * rArmScale],
      ]);
      forearmGroup.add(new THREE.Mesh(sleeveCuffGeo, sleeveMat));
    }

    // Bangles or Wristwatch
    if (cfg.bangles) {
      const bangleMat = getMat(`bangle_${cfg.bangleColor}`, {
        color: cfg.bangleColor,
        roughness: 0.25,
        metalness: 0.8,
      });
      for (let b = 0; b < 3; b++) {
        const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0032, 8, 20), bangleMat);
        bangle.rotation.x = Math.PI / 2;
        bangle.position.set(0, -0.185 - b * 0.011, 0);
        forearmGroup.add(bangle);
      }
    } else if (side === 'left' && (variantKey === 'linen_kurta_man' || variantKey === 'cotton_saree_commuter')) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.029, 0.0045, 8, 20),
        getMat('watch_strap', { color: '#291811' })
      );
      strap.rotation.x = Math.PI / 2;
      strap.position.set(0, -0.20, 0);
      forearmGroup.add(strap);

      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 16), goldMat);
      dial.position.set(0.026, -0.20, 0);
      dial.rotation.z = Math.PI / 2;
      forearmGroup.add(dial);
    }

    // Detailed Sculpted Hand with 5 fingers at y = -0.24m
    const hand = buildDetailedHand(side, skinMat);
    hand.position.set(0, -0.24, 0);
    forearmGroup.add(hand);

    // Handheld / Arm-draped Props
    if (side === 'left' && cfg.prop === 'clutch_purse') {
      const clutchGeo = new THREE.CapsuleGeometry(0.032, 0.11, 10, 16);
      const clutch = new THREE.Mesh(
        clutchGeo,
        getMat('clutch_gold', { color: '#b45309', roughness: 0.35, metalness: 0.65 })
      );
      clutch.rotation.x = Math.PI / 2;
      clutch.scale.set(0.65, 1.0, 1.2);
      clutch.position.set(0.025, -0.28, 0.015);
      forearmGroup.add(clutch);
    }

    return armGroup;
  }

  const leftArm = buildArm('left');
  const rightArm = buildArm('right');
  body.add(leftArm, rightArm);

  // --------------------------------------------------------------------------
  // 4. TORSO-MOUNTED PROPS (Tote Bag, Backpack, Messenger Bag, Angavastram Towel)
  // --------------------------------------------------------------------------
  if (cfg.prop === 'shoulder_tote') {
    const leatherMat = getMat('tote_leather', { color: '#5c2d16', roughness: 0.55 });
    // Dual shoulder straps over right shoulder
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.007, 10, 28), leatherMat);
    strap.rotation.y = Math.PI / 2;
    strap.scale.set(0.68, 1.35, 1.0);
    strap.position.set(-0.15, 1.18, 0.01);
    body.add(strap);

    // Sculpted soft leather tote pouch at right hip
    const bagGeo = createLoftedMesh(
      [
        { y: 0.78, rx: 0.055, rz: 0.155 },
        { y: 0.90, rx: 0.068, rz: 0.172 },
        { y: 1.02, rx: 0.048, rz: 0.160 },
      ],
      24,
      false
    );
    const bagMesh = new THREE.Mesh(bagGeo, leatherMat);
    bagMesh.position.set(-0.20, 0, 0.01);
    body.add(bagMesh);
  } else if (cfg.prop === 'backpack') {
    const packMat = getMat('backpack_canvas', { color: '#1e293b', roughness: 0.8 });
    const pocketMat = getMat('backpack_pocket', { color: '#0f172a', roughness: 0.85 });

    // Contoured rounded backpack dome
    const packGeo = createLoftedMesh(
      [
        { y: 0.96, rx: 0.135, rz: 0.075, cz: -0.175 },
        { y: 1.12, rx: 0.145, rz: 0.088, cz: -0.185 },
        { y: 1.26, rx: 0.132, rz: 0.078, cz: -0.175 },
        { y: 1.33, rx: 0.095, rz: 0.052, cz: -0.155 },
      ],
      28,
      false
    );
    body.add(new THREE.Mesh(packGeo, packMat));

    // Outer front zip pouch
    const pouchGeo = createLoftedMesh(
      [
        { y: 0.98, rx: 0.105, rz: 0.032, cz: -0.245 },
        { y: 1.13, rx: 0.102, rz: 0.032, cz: -0.245 },
      ],
      20,
      false
    );
    body.add(new THREE.Mesh(pouchGeo, pocketMat));

    // Shoulder harness straps
    [-1, 1].forEach((side) => {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.012, 10, 24), pocketMat);
      strap.rotation.y = Math.PI / 2;
      strap.scale.set(0.85, 1.25, 1.0);
      strap.position.set(side * 0.105, 1.22, -0.02);
      body.add(strap);
    });
  } else if (cfg.prop === 'messenger_bag') {
    const strapMat = getMat('messenger_strap', { color: '#451a03', roughness: 0.7 });
    const canvasMat = getMat('messenger_canvas', { color: '#78350f', roughness: 0.78 });

    // Cross-body strap from left shoulder to right hip
    const crossStrap = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.011, 10, 32), strapMat);
    crossStrap.rotation.y = Math.PI / 2;
    crossStrap.rotation.x = 0.52;
    crossStrap.scale.set(0.58, 1.35, 1.0);
    crossStrap.position.set(-0.02, 1.12, 0.005);
    body.add(crossStrap);

    // Satchel bag resting on right hip
    const satchelGeo = createLoftedMesh(
      [
        { y: 0.72, rx: 0.052, rz: 0.155 },
        { y: 0.86, rx: 0.058, rz: 0.165 },
        { y: 0.96, rx: 0.050, rz: 0.158 },
      ],
      24,
      false
    );
    const satchel = new THREE.Mesh(satchelGeo, canvasMat);
    satchel.position.set(-0.22, 0, -0.02);
    body.add(satchel);
  } else if (cfg.prop === 'shoulder_towel') {
    // Classic South Indian folded Angavastram towel draped over left shoulder
    const towelTex = getWovenFabricTexture('towel_tex', cfg.towelColor, '#dc2626', false);
    const towelMat = getMat('towel_mat', { map: towelTex, roughness: 0.85 });
    const towelGeo = createLoftedMesh(
      [
        { y: 1.06, rx: 0.048, rz: 0.145, cx: 0.125, cz: 0.015, pleatAmp: 0.004, pleatFreq: 8 },
        { y: 1.24, rx: 0.052, rz: 0.155, cx: 0.130, cz: 0.010, pleatAmp: 0.004, pleatFreq: 8 },
        { y: 1.39, rx: 0.055, rz: 0.125, cx: 0.128, cz: -0.005 },
      ],
      24,
      false
    );
    body.add(new THREE.Mesh(towelGeo, towelMat));
  }

  // --------------------------------------------------------------------------
  // 5. LEFT & RIGHT LEGS (Pivot at Hips: y = 0.88m, x = ±hipHalfOffset)
  // --------------------------------------------------------------------------
  function buildLeg(side) {
    const legGroup = new THREE.Group();
    legGroup.name = side === 'left' ? 'leftLeg' : 'rightLeg';
    const xSign = side === 'left' ? 1 : -1;
    legGroup.position.set(xSign * hipHalfOffset, hipY, 0);

    // Distinct lower-body leg & garment geometry per variant
    if (variantKey === 'kanjeevaram_saree' || variantKey === 'cotton_saree_commuter') {
      const isSilk = variantKey === 'kanjeevaram_saree';
      const sareeTex = isSilk
        ? getKanjeevaramTexture(`saree_${variantKey}`, ...cfg.sareeColors)
        : getCottonHandloomSareeTexture(`saree_${variantKey}`, ...cfg.sareeColors);
      const sareeMat = getMat(`saree_mat_${variantKey}`, {
        map: sareeTex,
        roughness: isSilk ? 0.36 : 0.78,
        metalness: isSilk ? 0.18 : 0.02,
      });

      // Flowing pleated saree skirt column with radial accordion pleats at the front
      const skirtColumnGeo = createLoftedMesh(
        [
          { y: -0.78, rx: 0.118, rz: 0.135, cx: -xSign * 0.018, pleatAmp: 0.014, pleatFreq: 14, frontPleatOnly: true },
          { y: -0.52, rx: 0.110, rz: 0.126, cx: -xSign * 0.016, pleatAmp: 0.011, pleatFreq: 14, frontPleatOnly: true },
          { y: -0.25, rx: 0.104, rz: 0.118, cx: -xSign * 0.012, pleatAmp: 0.008, pleatFreq: 14, frontPleatOnly: true },
          { y: 0.00, rx: 0.098, rz: 0.112, cx: -xSign * 0.008, pleatAmp: 0.005, pleatFreq: 14, frontPleatOnly: true },
        ],
        36,
        false
      );
      legGroup.add(new THREE.Mesh(skirtColumnGeo, sareeMat));

      // Lower ankle skin + silver payal anklet
      const ankleGeo = createOrganicLimbGeo(0.10, [
        [0.0, 0.044, 0.048],
        [1.0, 0.036, 0.040],
      ]);
      const ankleMesh = new THREE.Mesh(ankleGeo, skinMat);
      ankleMesh.position.set(0, -0.76, 0);
      legGroup.add(ankleMesh);
    } else if (variantKey === 'anarkali_salwar') {
      const churidarMat = getMat(`churidar_${cfg.salwarColor}`, {
        color: cfg.salwarColor,
        roughness: 0.65,
      });

      // Fitted Churidar Trousers with horizontal gathered churi folds at the ankle
      const churidarGeo = createLoftedMesh(
        [
          { y: -0.81, rx: 0.042, rz: 0.046 },
          { y: -0.76, rx: 0.048, rz: 0.052 }, // Churi gather 1
          { y: -0.72, rx: 0.043, rz: 0.046 },
          { y: -0.68, rx: 0.050, rz: 0.054 }, // Churi gather 2
          { y: -0.63, rx: 0.045, rz: 0.049 },
          { y: -0.58, rx: 0.052, rz: 0.056 }, // Churi gather 3
          { y: -0.42, rx: 0.058, rz: 0.062 },
          { y: -0.20, rx: 0.072, rz: 0.076 },
          { y: 0.00, rx: 0.084, rz: 0.088 },
        ],
        28,
        false
      );
      legGroup.add(new THREE.Mesh(churidarGeo, churidarMat));
    } else if (variantKey === 'patiala_salwar_student') {
      const patialaMat = getMat(`patiala_${cfg.salwarColor}`, {
        color: cfg.salwarColor,
        roughness: 0.78,
      });

      // Voluminous draped Patiala Salwar with wide pleated thigh/calf balloon tapering to a stitched ankle cuff (poncha)
      const patialaGeo = createLoftedMesh(
        [
          { y: -0.80, rx: 0.048, rz: 0.052 }, // Stitched poncha ankle cuff
          { y: -0.73, rx: 0.052, rz: 0.056 },
          { y: -0.58, rx: 0.118, rz: 0.125, pleatAmp: 0.012, pleatFreq: 12 }, // Billowing lower folds
          { y: -0.35, rx: 0.128, rz: 0.134, pleatAmp: 0.014, pleatFreq: 12 }, // Wide Patiala pleats
          { y: -0.14, rx: 0.112, rz: 0.118, pleatAmp: 0.010, pleatFreq: 12 },
          { y: 0.00, rx: 0.095, rz: 0.102, pleatAmp: 0.006, pleatFreq: 12 },
        ],
        32,
        false
      );
      legGroup.add(new THREE.Mesh(patialaGeo, patialaMat));
    } else if (variantKey === 'linen_kurta_man') {
      const pajamaMat = getMat(`pajama_${cfg.pajamaColor}`, {
        color: cfg.pajamaColor,
        roughness: 0.8,
      });

      // Tailored Straight/Tapered Cotton Aligarhi Pajama Trousers
      const pajamaGeo = createLoftedMesh(
        [
          { y: -0.81, rx: 0.056, rz: 0.062 }, // Hem opening
          { y: -0.62, rx: 0.064, rz: 0.070 },
          { y: -0.40, rx: 0.074, rz: 0.080 }, // Knee
          { y: -0.18, rx: 0.086, rz: 0.092 },
          { y: 0.00, rx: 0.095, rz: 0.100 },
        ],
        28,
        false
      );
      legGroup.add(new THREE.Mesh(pajamaGeo, pajamaMat));

      // Exposed ankle skin below pajama cuff
      const ankleGeo = createOrganicLimbGeo(0.06, [
        [0.0, 0.044, 0.048],
        [1.0, 0.040, 0.044],
      ]);
      const ankleMesh = new THREE.Mesh(ankleGeo, skinMat);
      ankleMesh.position.set(0, -0.80, 0);
      legGroup.add(ankleMesh);
    } else if (variantKey === 'checked_lungi_uncle') {
      const lungiTex = getMadrasLungiTexture(`lungi_${variantKey}`, ...cfg.lungiColors);
      const lungiMat = getMat(`lungi_${variantKey}`, {
        map: lungiTex,
        roughness: 0.76,
      });

      // Full-length Madras-Check Lungi cylindrical wrap (reaching mid-shin y = -0.64m)
      const lungiColumnGeo = createLoftedMesh(
        [
          { y: -0.64, rx: 0.115, rz: 0.128, cx: -xSign * 0.018, pleatAmp: 0.009, pleatFreq: 10 },
          { y: -0.42, rx: 0.110, rz: 0.122, cx: -xSign * 0.015, pleatAmp: 0.008, pleatFreq: 10 },
          { y: -0.20, rx: 0.105, rz: 0.118, cx: -xSign * 0.012, pleatAmp: 0.006, pleatFreq: 10 },
          { y: 0.00, rx: 0.100, rz: 0.114, cx: -xSign * 0.008, pleatAmp: 0.005, pleatFreq: 10 },
        ],
        32,
        false
      );
      legGroup.add(new THREE.Mesh(lungiColumnGeo, lungiMat));

      // Anatomical Gastrocnemius Calf & Ankle below the lungi hem (-0.60 -> -0.84m)
      const lowerLegGeo = createOrganicLimbGeo(0.24, [
        [0.0, 0.056, 0.060, -0.006], // Muscular calf belly
        [0.45, 0.048, 0.052, -0.004],
        [0.85, 0.038, 0.042, 0.0], // Achilles / ankle
        [1.0, 0.040, 0.044, 0.0],
      ]);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, skinMat);
      lowerLeg.position.set(0, -0.61, 0);
      legGroup.add(lowerLeg);
    }

    // Foot + Footwear (bottom of sole rests flush on ground y = 0 -> local y = -hipY)
    const foot = buildDetailedFoot(side, skinMat, cfg.footwear, cfg.shoeColor);
    foot.position.set(0, -hipY, 0);
    legGroup.add(foot);

    return legGroup;
  }

  const leftLeg = buildLeg('left');
  const rightLeg = buildLeg('right');
  root.add(leftLeg, rightLeg);

  // Apply height scale & store named limb groups in userData for fast tickWalk() lookup
  root.scale.setScalar(cfg.heightScale);
  root.userData = {
    variant: variantKey,
    gender: cfg.gender,
    heightScale: cfg.heightScale,
    parts: {
      body,
      head: headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
    },
  };

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return root;
}

// ============================================================================
// NATURAL STREET WALK CYCLE ANIMATOR: tickWalk(group, t, speed = 1.0)
// ============================================================================

/**
 * Animates the pedestrian's limb groups with gait-appropriate stride, arm swing,
 * torso counter-rotation, hip sway, and subtle head look.
 *
 * @param {THREE.Group} group - The pedestrian group returned by buildPedestrian().
 * @param {number} t - Elapsed time in seconds (or walk phase).
 * @param {number} [speed=1.0] - Walk speed multiplier (0 = idle breathing pose, 1 = normal walk).
 */
export function tickWalk(group, t, speed = 1.0) {
  const parts = group.userData?.parts || {
    body: group.getObjectByName('body'),
    head: group.getObjectByName('head'),
    leftArm: group.getObjectByName('leftArm'),
    rightArm: group.getObjectByName('rightArm'),
    leftLeg: group.getObjectByName('leftLeg'),
    rightLeg: group.getObjectByName('rightLeg'),
  };

  const variant = group.userData?.variant || '';
  const isFemale = group.userData?.gender === 'female';
  const isDrapedWrap =
    variant === 'kanjeevaram_saree' ||
    variant === 'cotton_saree_commuter' ||
    variant === 'checked_lungi_uncle' ||
    variant === 'anarkali_salwar';

  const freq = 5.0; // Stride frequency (rad/sec)
  const phase = t * freq * speed;
  const amp = Math.min(Math.max(speed, 0), 1.6);

  const legAmplitude = (isDrapedWrap ? 0.38 : 0.50) * amp;
  const armAmplitude = (isDrapedWrap ? 0.34 : 0.45) * amp;

  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const s2 = Math.sin(phase * 2);

  // 1. Alternating Leg Swing + subtle lateral hip clearance
  if (parts.leftLeg) {
    parts.leftLeg.rotation.x = s * legAmplitude;
    parts.leftLeg.rotation.z = Math.max(0, c) * 0.018 * amp;
  }
  if (parts.rightLeg) {
    parts.rightLeg.rotation.x = -s * legAmplitude;
    parts.rightLeg.rotation.z = -Math.max(0, -c) * 0.018 * amp;
  }

  // 2. Opposite Arm Swing + natural outward shoulder hang
  if (parts.leftArm) {
    const clutchDamp = variant === 'kanjeevaram_saree' ? 0.35 : 1.0;
    parts.leftArm.rotation.x = -s * armAmplitude * clutchDamp - 0.05;
    parts.leftArm.rotation.z = isFemale ? 0.06 : 0.08;
  }
  if (parts.rightArm) {
    const toteDamp = variant === 'cotton_saree_commuter' ? 0.45 : 1.0;
    parts.rightArm.rotation.x = s * armAmplitude * toteDamp - 0.05;
    parts.rightArm.rotation.z = isFemale ? -0.06 : -0.08;
  }

  // 3. Torso Vertical Double-Frequency Bob, Counter-Twist, and Pelvic Sway
  if (parts.body) {
    const walkBob = Math.abs(s) * 0.026 * amp;
    const idleBreath = Math.sin(t * 2.2) * 0.004;
    parts.body.position.y = walkBob + idleBreath;
    parts.body.rotation.y = s * (isFemale ? 0.065 : 0.05) * amp;
    parts.body.rotation.z = c * (isFemale ? 0.028 : 0.018) * amp;
    parts.body.rotation.x = 0.02 * amp + s2 * 0.008 * amp;
  }

  // 4. Head Horizon Stabilization + Gentle Street Observation
  if (parts.head) {
    parts.head.rotation.y = -s * 0.04 * amp + Math.sin(t * 0.75) * 0.09;
    parts.head.rotation.x = Math.sin(t * 1.4) * 0.025;
    parts.head.rotation.z = -c * 0.015 * amp;
  }
}

// Merge same-material geometries inside each articulated part (huge draw-call cut; keeps pivots)
function mergePartGroup(part) {
  part.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(part.matrixWorld).invert();
  const byMat = new Map();
  part.traverse(o => {
    if (!o.isMesh) return;
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const geo = o.geometry.clone().applyMatrix4(rel);
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] });
    byMat.get(key).geos.push(geo);
  });
  while (part.children.length) part.remove(part.children[0]);
  for (const { mat, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false);
    if (merged) {
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true; m.receiveShadow = true;
      part.add(m);
    } else {
      for (const g of geos) { const m = new THREE.Mesh(g, mat); m.castShadow = true; part.add(m); }
    }
  }
}

export function buildPedestrianMerged(variant) {
  const root = buildPedestrian(variant);
  root.updateWorldMatrix(true, true);
  for (const n of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'head']) {
    const part = root.getObjectByName(n);
    if (part) mergePartGroup(part);
  }
  root.updateWorldMatrix(true, true);
  const body = root.getObjectByName('body');
  if (body) mergePartGroup(body);
  return root;
}
