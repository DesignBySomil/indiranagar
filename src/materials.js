// src/materials.js
import * as THREE from 'three';
import { makeWetRoadMaterialPatch } from './lamps.js';

export const nightUniform = { value: 0 };

function createNoiseCanvas(w, h, baseHex, variance, specks = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(baseHex);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * variance;
    const sp = specks && Math.random() < 0.05 ? (Math.random() - 0.3) * 0.12 : 0;
    d[i]     = Math.min(255, Math.max(0, (col.r + n + sp) * 255));
    d[i + 1] = Math.min(255, Math.max(0, (col.g + n + sp) * 255));
    d[i + 2] = Math.min(255, Math.max(0, (col.b + n + sp) * 255));
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAsphaltMaterial() {
  // One 512px tile maps across full road width (u 0..1) and 5 m along (v = len*0.2)
  const W = 512, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // base asphalt with per-pixel noise
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const u = x / W;
      const n = (Math.random() - 0.5) * 26;
      const sp = Math.random() < 0.03 ? (Math.random() - 0.35) * 60 : 0;
      // wheel tracks: darker bands where tyres run
      const tr = Math.exp(-Math.pow((u - 0.28) / 0.10, 2)) + Math.exp(-Math.pow((u - 0.72) / 0.10, 2));
      // dusty lighter edges near kerbs
      const edge = Math.exp(-Math.pow(u / 0.08, 2)) + Math.exp(-Math.pow((1 - u) / 0.08, 2));
      let v = 172 + n + sp - tr * 18 + edge * 12;
      v = Math.min(255, Math.max(0, v));
      d[i] = v; d[i + 1] = v; d[i + 2] = v + 2; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // cracks: dark random walks along the road direction
  ctx.strokeStyle = 'rgba(30,31,34,0.20)';
  for (let k = 0; k < 5; k++) {
    ctx.lineWidth = 0.8 + Math.random() * 1.0;
    ctx.beginPath();
    let x = Math.random() * W, y = Math.random() * H;
    ctx.moveTo(x, y);
    const steps = 8 + (Math.random() * 14 | 0);
    for (let s2 = 0; s2 < steps; s2++) {
      x += (Math.random() - 0.5) * 26;
      y += 14 + Math.random() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // tar snakes (repaired cracks): slightly glossy dark squiggles
  ctx.strokeStyle = 'rgba(22,23,26,0.30)';
  for (let k = 0; k < 3; k++) {
    ctx.lineWidth = 2.5 + Math.random() * 2;
    ctx.beginPath();
    let x = Math.random() * W, y = Math.random() * H;
    ctx.moveTo(x, y);
    for (let s2 = 0; s2 < 6; s2++) {
      x += (Math.random() - 0.5) * 40;
      y += 20 + Math.random() * 36;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // repair patches: rectangles of slightly different tone
  for (let k = 0; k < 2; k++) {
    const pw = 40 + Math.random() * 90, ph = 60 + Math.random() * 140;
    const px = Math.random() * (W - pw), py = Math.random() * (H - ph);
    const tone = 150 + Math.random() * 60;
    ctx.fillStyle = `rgba(${tone},${tone},${tone + 4},0.30)`;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(25,26,29,0.20)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);
  }

  // oil stains in wheel tracks
  for (let k = 0; k < 6; k++) {
    const u = Math.random() < 0.5 ? 0.28 : 0.72;
    const ox = (u + (Math.random() - 0.5) * 0.12) * W;
    const oy = Math.random() * H;
    const r = 5 + Math.random() * 9;
    const g = ctx.createRadialGradient(ox, oy, 1, ox, oy, r);
    g.addColorStop(0, 'rgba(18,19,22,0.16)');
    g.addColorStop(1, 'rgba(18,19,22,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ox, oy, r, 0, 7); ctx.fill();
  }

  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 1);
  map.anisotropy = 8;
  map.colorSpace = THREE.SRGBColorSpace;

  // bump from a downscaled noise pass
  const bump = createNoiseCanvas(256, 256, 0x808080, 0.22, true);
  bump.repeat.set(1, 1);

  const mat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 0.035,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.03,
    side: THREE.DoubleSide
  });

  mat.color.setScalar(0.62);
  return mat;
}

export function createPavementMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#888379';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#6b675e';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0.02 });
}

export function createKerbMaterial() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eae8e0';
  ctx.fillRect(0, 0, 64, 32);
  ctx.fillStyle = '#24262a';
  ctx.fillRect(64, 0, 64, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
}

export function createWallMaterial() {
  // No bumpMap: the merged facade geometry has no UV attribute, and the bump
  // shader path gave a non-finite HDR pixel on one far sliver triangle.
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.02
  });
}

export function makeSign(text, bg = '#1a1a1a', fg = '#ffffff', font = '700 44px sans-serif', w = 512, h = 128, subtext = '', border = '') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(4, h * 0.06);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  }
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, subtext ? h * 0.4 : h * 0.52);
  if (subtext) {
    ctx.font = '600 ' + Math.round(h * 0.18) + 'px sans-serif';
    ctx.fillStyle = border || fg;
    ctx.fillText(subtext, w / 2, h * 0.76);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeEmissiveSignMaterial(tex, glowStrength = 1.1) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.08
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= (0.25 + uNight * ${glowStrength.toFixed(2)});`);
  };
  return mat;
}

export function makeNeonMaterial(colorHex, strength = 2.0) {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.45,
    roughness: 0.2
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= (0.35 + uNight * ${strength.toFixed(2)});`);
  };
  return mat;
}

export function createBrickTexture(baseHex = '#8c3b2b', mortarHex = '#b8ada0') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, 256, 256);
  const rows = 16, cols = 8;
  const bh = 256 / rows, bw = 256 / cols;
  const base = new THREE.Color(baseHex);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (bw / 2);
    for (let k = -1; k <= cols; k++) {
      const cVar = base.clone().offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08);
      ctx.fillStyle = '#' + cVar.getHexString();
      ctx.fillRect(k * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
