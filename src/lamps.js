// src/lamps.js
import * as THREE from 'three';
import { nightUniform } from './materials.js';

function makeHaloTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0.0, 'rgba(255, 246, 215, 1.0)');
  g.addColorStop(0.22, 'rgba(255, 195, 105, 0.72)');
  g.addColorStop(0.58, 'rgba(255, 145, 55, 0.18)');
  g.addColorStop(1.0, 'rgba(255, 120, 30, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Deliverable 2: Pooled real SpotLights + additive lamp-head halos (NO flat ground discs)
export function createLampLights(scene, lampSpots = [], opts = {}) {
  const poolSize = opts.poolSize || 10;
  const spots = lampSpots.map((s, idx) => {
    if (Array.isArray(s)) {
      const yaw = s[2] || 0;
      return {
        x: s[0] + Math.cos(yaw) * 1.1,
        z: s[1] - Math.sin(yaw) * 1.1,
        h: 6.05,
        flicker: idx % 7 === 0
      };
    }
    return {
      x: s.x,
      z: s.z,
      h: s.h || 6.05,
      flicker: idx % 7 === 0
    };
  });

  // Additive glow halos at each lamp head using a single Points draw call
  const haloPos = new Float32Array(spots.length * 3);
  const haloSeed = new Float32Array(spots.length);
  for (let i = 0; i < spots.length; i++) {
    haloPos[i * 3] = spots[i].x;
    haloPos[i * 3 + 1] = spots[i].h - 0.08;
    haloPos[i * 3 + 2] = spots[i].z;
    haloSeed[i] = (i * 0.37) % 1.0;
  }

  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
  haloGeo.setAttribute('aSeed', new THREE.BufferAttribute(haloSeed, 1));

  const haloMat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: makeHaloTexture() },
      uNight: { get value() { return nightUniform.value; } },
      uTime: { value: 0 },
      uScale: { value: window.innerHeight * 0.5 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSeed;
      varying float vFlicker;
      uniform float uNight;
      uniform float uTime;
      uniform float uScale;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float fl = aSeed > 0.82 ? (0.86 + 0.14 * sin(uTime * 19.0 + aSeed * 90.0)) : 1.0;
        vFlicker = fl * (0.12 + uNight * 0.95);
        gl_PointSize = clamp((3.4 * uScale) / max(-mvPosition.z, 1.0), 4.0, 96.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vFlicker;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(tex.rgb * vFlicker, tex.a * vFlicker);
      }
    `
  });

  const haloPoints = new THREE.Points(haloGeo, haloMat);
  haloPoints.frustumCulled = false;
  scene.add(haloPoints);

  // Pool of 10 real THREE.SpotLights reassigned every 0.25s with smooth fade
  const lightPool = [];
  const lightGroup = new THREE.Group();
  scene.add(lightGroup);

  for (let i = 0; i < poolSize; i++) {
    const sl = new THREE.SpotLight(0xffb45a, 0, 38, 0.92, 0.82, 1.8);
    sl.castShadow = false;
    lightGroup.add(sl, sl.target);
    lightPool.push({
      light: sl,
      spotIdx: -1,
      targetIdx: -1,
      fade: 0
    });
  }

  let reassignTimer = 0;
  let elapsed = 0;

  function reassignNearest(px, pz) {
    if (!spots.length) return;
    // Find nearest poolSize spots
    const bestIndices = [];
    const bestDists = [];

    for (let i = 0; i < spots.length; i++) {
      const dx = spots[i].x - px, dz = spots[i].z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > 85 * 85) continue;
      let ins = bestDists.length;
      if (ins < poolSize || d2 < bestDists[ins - 1]) {
        while (ins > 0 && d2 < bestDists[ins - 1]) ins--;
        bestDists.splice(ins, 0, d2);
        bestIndices.splice(ins, 0, i);
        if (bestDists.length > poolSize) {
          bestDists.pop();
          bestIndices.pop();
        }
      }
    }

    const assignedSet = new Set();
    // Keep existing lights that are still in top poolSize
    for (const slot of lightPool) {
      if (slot.spotIdx !== -1 && bestIndices.includes(slot.spotIdx)) {
        slot.targetIdx = slot.spotIdx;
        assignedSet.add(slot.spotIdx);
      } else {
        slot.targetIdx = -1;
      }
    }

    // Assign remaining top indices to free or fading-out slots
    for (const idx of bestIndices) {
      if (assignedSet.has(idx)) continue;
      const freeSlot = lightPool.find(s => s.targetIdx === -1);
      if (freeSlot) {
        freeSlot.targetIdx = idx;
        if (freeSlot.spotIdx === -1 || freeSlot.fade <= 0.05) {
          freeSlot.spotIdx = idx;
          const sp = spots[idx];
          freeSlot.light.position.set(sp.x, sp.h, sp.z);
          freeSlot.light.target.position.set(sp.x, 0, sp.z);
        }
        assignedSet.add(idx);
      }
    }
  }

  function update(playerPos, nightFactor = nightUniform.value, dt = 0.016) {
    elapsed += dt;
    haloMat.uniforms.uTime.value = elapsed;
    haloMat.uniforms.uScale.value = window.innerHeight * 0.5;

    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;

    reassignTimer -= dt;
    if (reassignTimer <= 0) {
      reassignTimer = 0.25;
      reassignNearest(px, pz);
    }

    const maxInt = nightFactor * 28.0;
    for (let i = 0; i < lightPool.length; i++) {
      const slot = lightPool[i];
      if (slot.targetIdx === slot.spotIdx && slot.spotIdx !== -1) {
        slot.fade = Math.min(1, slot.fade + dt * 3.5);
      } else {
        slot.fade = Math.max(0, slot.fade - dt * 4.5);
        if (slot.fade <= 0.02 && slot.targetIdx !== -1) {
          slot.spotIdx = slot.targetIdx;
          const sp = spots[slot.spotIdx];
          slot.light.position.set(sp.x, sp.h, sp.z);
          slot.light.target.position.set(sp.x, 0, sp.z);
        }
      }

      if (slot.spotIdx !== -1) {
        const sp = spots[slot.spotIdx];
        const flick = sp.flicker ? (0.85 + 0.15 * Math.sin(elapsed * 22.0 + i * 5.0)) : 1.0;
        slot.light.intensity = slot.fade * maxInt * flick;
      } else {
        slot.light.intensity = 0;
      }
    }
  }

  return { update, haloPoints, lightPool };
}

// Deliverable 2b: Wet-asphalt puddle & warm lamp-streak reflection patch
export function makeWetRoadMaterialPatch(material) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = nightUniform;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nvarying vec2 vRoadUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvRoadUv = uv;');

    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight;
        varying vec3 vWorldPos;
        varying vec2 vRoadUv;
        float hashW(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noiseW(vec2 p){
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hashW(i), hashW(i + vec2(1,0)), f.x),
                     mix(hashW(i + vec2(0,1)), hashW(i + vec2(1,1)), f.x), f.y);
        }
      `)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float edgeDist = abs(vRoadUv.x - 0.5) * 2.0;
        float dustNoise = 0.75 + 0.25 * sin(vWorldPos.x * 0.25 + vWorldPos.z * 0.19);
        float dustMask = smoothstep(0.66, 0.98, edgeDist) * dustNoise;
        vec3 dustColor = vec3(0.46, 0.42, 0.36);
        diffuseColor.rgb = mix(diffuseColor.rgb, dustColor, dustMask * 0.48);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float puddleNoise = noiseW(vWorldPos.xz * 0.11) * 0.65 + noiseW(vWorldPos.xz * 0.31) * 0.35;
        float puddle = smoothstep(0.46, 0.72, puddleNoise) * (1.0 - smoothstep(0.75, 0.98, abs(vRoadUv.x - 0.5) * 2.0));
        roughnessFactor = mix(roughnessFactor, 0.10, uNight * (0.35 + 0.65 * puddle));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // Anisotropic wet-road specular lamp-glow streaks aligned with view direction at night
        if (uNight > 0.02) {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - clamp(abs(viewDir.y), 0.0, 1.0), 3.2);
          float pNoise = noiseW(vWorldPos.xz * 0.11);
          float pMask = smoothstep(0.42, 0.68, pNoise);
          // Periodic street-lamp reflection cells every ~32m with longitudinal streak stretching
          vec2 lampCell = fract(vWorldPos.xz / 32.0) - 0.5;
          float streak = exp(-dot(lampCell * vec2(2.6, 0.9), lampCell * vec2(2.6, 0.9)) * 18.0);
          float ripple = 0.75 + 0.25 * sin(vWorldPos.x * 3.5 + vWorldPos.z * 3.2);
          vec3 lampGlow = vec3(1.0, 0.68, 0.32) * streak * ripple * (0.35 + 0.65 * pMask) * fresnel * uNight * 0.85;
          totalEmissiveRadiance += lampGlow;
        }
      `);
  };
  return material;
}

// Deliverable 3: Volumetric Headlight Cone Shader + Flare + Shared SpotLight Pool
const VolumetricConeShader = {
  uniforms: {
    uColor: { value: new THREE.Color(0xfff1c2) },
    uNight: { get value() { return nightUniform.value; } },
    uOn: { value: 1.0 }
  },
  vertexShader: `
    varying float vAxial;
    varying vec3 vNormalView;
    varying vec3 vViewPos;
    void main() {
      vAxial = uv.y;
      vNormalView = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vViewPos = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uNight;
    uniform float uOn;
    varying float vAxial;
    varying vec3 vNormalView;
    varying vec3 vViewPos;
    void main() {
      vec3 viewDir = normalize(vViewPos);
      // Soft edge fade + smooth axial falloff from tip to end of beam
      float edgeFade = pow(abs(dot(vNormalView, viewDir)), 1.35);
      float lengthFade = smoothstep(0.0, 0.88, vAxial) * (1.0 - smoothstep(0.88, 1.0, vAxial));
      float alpha = edgeFade * lengthFade * (0.04 + uNight * 0.24) * uOn;
      gl_FragColor = vec4(uColor, alpha);
    }
  `
};

let sharedConeGeo = null;
let sharedFlareMat = null;

export function makeHeadlightRig(opts = {}) {
  const rig = new THREE.Group();
  const singleCenter = Boolean(opts.single);

  if (!sharedConeGeo) {
    sharedConeGeo = new THREE.ConeGeometry(1.45, 7.2, 20, 1, true);
    sharedConeGeo.translate(0, -3.6, 0);
    sharedConeGeo.rotateX(-Math.PI / 2 + 0.10);
  }
  if (!sharedFlareMat) {
    sharedFlareMat = new THREE.SpriteMaterial({
      map: makeHaloTexture(),
      color: 0xfff6d6,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  const coneMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(VolumetricConeShader.uniforms),
    vertexShader: VolumetricConeShader.vertexShader,
    fragmentShader: VolumetricConeShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });

  const offsets = singleCenter ? [0] : [-0.36, 0.36];
  const flares = [];
  const cones = [];

  for (const ox of offsets) {
    const cone = new THREE.Mesh(sharedConeGeo, coneMat);
    cone.position.set(ox, 0, 0);
    rig.add(cone);
    cones.push(cone);

    const flare = new THREE.Sprite(sharedFlareMat);
    flare.scale.set(0.65, 0.65, 1);
    flare.position.set(ox, 0, 0.04);
    rig.add(flare);
    flares.push(flare);
  }

  let isOn = true;
  rig.userData = {
    isOn: true,
    coneMat,
    flares,
    cones,
    setOn(v) {
      isOn = Boolean(v);
      rig.userData.isOn = isOn;
      coneMat.uniforms.uOn.value = isOn ? 1.0 : 0.0;
      for (const f of flares) f.visible = isOn;
    }
  };

  return rig;
}

// Shared pool of real SpotLights attached only to the nearest N vehicles
const vehicleSpotPool = [];
let vehicleSpotGroup = null;

export function attachHeadlightsToNearest(vehicles = [], playerPos, max = 4, sceneRef = null) {
  if (!vehicleSpotGroup && (sceneRef || (vehicles[0] && vehicles[0].parent))) {
    const rootScene = sceneRef || vehicles[0].parent;
    vehicleSpotGroup = new THREE.Group();
    rootScene.add(vehicleSpotGroup);
    for (let i = 0; i < max * 2; i++) {
      const sl = new THREE.SpotLight(0xfff2cc, 0, 30, 0.35, 0.7, 1.5);
      sl.castShadow = false;
      vehicleSpotGroup.add(sl, sl.target);
      vehicleSpotPool.push(sl);
    }
  }
  if (!vehicleSpotGroup || !playerPos) return;

  const nightVal = nightUniform.value;
  if (nightVal <= 0.02) {
    for (const sl of vehicleSpotPool) sl.intensity = 0;
    return;
  }

  const ranked = [];
  const wPos = new THREE.Vector3();
  const wQuat = new THREE.Quaternion();
  const fwd = new THREE.Vector3();

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v || !v.visible) continue;
    v.getWorldPosition(wPos);
    const d2 = (wPos.x - playerPos.x) ** 2 + (wPos.z - playerPos.z) ** 2;
    if (d2 < 75 * 75) ranked.push({ v, d2 });
  }
  ranked.sort((a, b) => a.d2 - b.d2);

  const count = Math.min(max, ranked.length);
  for (let i = 0; i < max; i++) {
    const slL = vehicleSpotPool[i * 2];
    const slR = vehicleSpotPool[i * 2 + 1];
    if (i < count) {
      const veh = ranked[i].v;
      veh.getWorldPosition(wPos);
      veh.getWorldQuaternion(wQuat);
      fwd.set(0, -0.08, 1).applyQuaternion(wQuat).normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(wQuat);

      slL.position.copy(wPos).addScaledVector(right, -0.32).addScaledVector(fwd, 1.4).setY(wPos.y + 0.65);
      slL.target.position.copy(slL.position).addScaledVector(fwd, 14);
      slL.intensity = nightVal * 26;

      slR.position.copy(wPos).addScaledVector(right, 0.32).addScaledVector(fwd, 1.4).setY(wPos.y + 0.65);
      slR.target.position.copy(slR.position).addScaledVector(fwd, 14);
      slR.intensity = nightVal * 26;
    } else {
      if (slL) slL.intensity = 0;
      if (slR) slR.intensity = 0;
    }
  }
}
