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
  const map = createNoiseCanvas(256, 256, 0xd4d4d4, 0.08, true);
  map.repeat.set(60, 60);
  const bump = createNoiseCanvas(256, 256, 0x808080, 0.18, true);
  bump.repeat.set(60, 60);

  const mat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 0.025,
    vertexColors: true,
    roughness: 0.84,
    metalness: 0.04,
    side: THREE.DoubleSide
  });

  mat.color.setScalar(0.74);
  return mat; // wet-road shader patch disabled (too much water-like reflection)
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
  const bump = createNoiseCanvas(128, 128, 0x808080, 0.14, false);
  bump.repeat.set(4, 4);
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    bumpMap: bump,
    bumpScale: 0.018,
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
