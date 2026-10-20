// src/materials.js
import * as THREE from 'three';

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
  // Neutral bright base texture so vertexColors directly control the target #4b4e53 lit tone
  const map = createNoiseCanvas(256, 256, 0xdedede, 0.08, true);
  map.repeat.set(60, 60);
  const bump = createNoiseCanvas(256, 256, 0x808080, 0.18, true);
  bump.repeat.set(60, 60);

  const mat = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 0.025,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide
  });

  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nvarying vec2 vRoadUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvRoadUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying vec3 vWorldPos;\nvarying vec2 vRoadUv;\nfloat hashA(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Warm brown-grey Bangalore dust along road edges (uv.x near 0 or 1) and subtle centre wear
        float edgeDist = abs(vRoadUv.x - 0.5) * 2.0;
        float dustNoise = 0.75 + 0.25 * sin(vWorldPos.x * 0.25 + vWorldPos.z * 0.19);
        float dustMask = smoothstep(0.62, 0.98, edgeDist) * dustNoise;
        vec3 dustColor = vec3(0.54, 0.49, 0.42);
        diffuseColor.rgb = mix(diffuseColor.rgb, dustColor, dustMask * 0.58);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float puddle = smoothstep(0.55, 0.78, sin(vWorldPos.x * 0.14) * cos(vWorldPos.z * 0.14) + hashA(floor(vWorldPos.xz * 0.25)) * 0.3);
        roughnessFactor = mix(roughnessFactor, 0.22, uNight * (0.45 + 0.55 * puddle));
      `);
  };
  return mat;
}

export function createPavementMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#918c82';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#736f66';
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
  ctx.fillStyle = '#f0eee6';
  ctx.fillRect(0, 0, 64, 32);
  ctx.fillStyle = '#282a2e';
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
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= (0.28 + uNight * ${glowStrength.toFixed(2)});`);
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
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= (0.38 + uNight * ${strength.toFixed(2)});`);
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
