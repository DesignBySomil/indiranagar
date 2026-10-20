// src/lighting.js
import * as THREE from 'three';
import { nightUniform } from './materials.js';

// Subtle, natural sky & lighting curve: golden hour (17.6-18.0) has a soft blue zenith and pale warm peach horizon
const skyKeys = [
  // hour, zenithHex, horizonHex, sunHex, sunInt, hemiInt, ambInt
  [0.0,  0x070b18, 0x12192e, 0x6a80b8, 0.12, 0.65, 0.50],
  [5.0,  0x0d152b, 0x242e52, 0x7c8cc4, 0.18, 0.72, 0.55],
  [6.3,  0x5c84b8, 0xf2cdb0, 0xffe0be, 1.55, 1.15, 0.78],
  [9.0,  0x5492d6, 0xc8e3f7, 0xfff8eb, 2.40, 1.38, 0.88],
  [13.0, 0x4886cf, 0xd4eaf9, 0xffffff, 2.65, 1.48, 0.94],
  [16.5, 0x5c8dc4, 0xe8dec8, 0xfff0d4, 2.15, 1.32, 0.86],
  [17.8, 0x6992bf, 0xf5d4b8, 0xffe4be, 1.75, 1.25, 0.84], // Golden hour: soft blue overhead, pale peach horizon
  [18.5, 0x3f5882, 0xdba88c, 0xffbe8a, 0.95, 0.98, 0.72],
  [19.4, 0x161d38, 0x2e3152, 0x8088c2, 0.25, 0.72, 0.56],
  [21.5, 0x080d1c, 0x141c33, 0x6a80b8, 0.12, 0.65, 0.50],
  [24.0, 0x070b18, 0x12192e, 0x6a80b8, 0.12, 0.65, 0.50]
];

export function setupLighting(scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // High minimum ambient + hemisphere + counter-fill so shadow areas never drop below ~38-45% brightness
  const amb = new THREE.AmbientLight(0xd8e2f0, 0.85);
  scene.add(amb);

  const hemi = new THREE.HemisphereLight(0xebf3fa, 0x807a68, 1.25);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0xc8dcf5, 0.68);
  fill.position.set(-90, 75, -70);
  scene.add(fill);

  const sun = new THREE.DirectionalLight(0xffe8c8, 1.85);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2.5;
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 380 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.userData.dir = new THREE.Vector3(0.5, 0.35, 0.5).normalize();
  scene.add(sun, sun.target);

  scene.fog = new THREE.FogExp2(0xe8d5c2, 0.0011);

  const skyUniforms = {
    uZenith:  { value: new THREE.Color(0x6992bf) },
    uHorizon: { value: new THREE.Color(0xf5d4b8) },
    uSunColor:{ value: new THREE.Color(0xffe4be) },
    uSunDir:  { value: new THREE.Vector3(0.6, 0.25, 0.5).normalize() },
    uNight:   nightUniform,
    uTime:    { value: 0 }
  };

  const skyGeo = new THREE.SphereGeometry(1850, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uNight;
      uniform float uTime;
      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
                   mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise2(p); p *= 2.03; a *= 0.5; }
        return v;
      }

      void main() {
        vec3 d = normalize(vWorldDir);
        float y = clamp(d.y, 0.0, 1.0);
        // Confine warm peach horizon band to lower sky; transition smoothly into soft blue zenith
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.52, pow(y, 0.62)));

        // Subtle, non-blown-out sun disc & gentle halo
        float sunAmt = max(dot(d, uSunDir), 0.0);
        col += uSunColor * pow(sunAmt, 18.0) * 0.18 * (1.0 - uNight * 0.9);
        float sunDisc = smoothstep(0.9986, 0.9995, sunAmt);
        col = mix(col, uSunColor * 1.18, sunDisc * 0.85 * (1.0 - uNight));

        // Soft high clouds
        if (d.y > 0.05) {
          vec2 uv = d.xz / (d.y + 0.22) * 1.5 + vec2(uTime * 0.006, 0.0);
          float cl = fbm(uv);
          float cloudMask = smoothstep(0.52, 0.78, cl) * smoothstep(0.05, 0.25, d.y) * (1.0 - uNight * 0.8);
          vec3 cloudCol = mix(uHorizon, vec3(0.98, 0.97, 0.95), 0.65);
          col = mix(col, cloudCol, cloudMask * 0.42);
        }

        // Crisp night stars
        if (uNight > 0.05 && d.y > 0.08) {
          vec2 suv = floor(d.xz / (d.y + 0.35) * 260.0);
          float s = hash21(suv);
          if (s > 0.994) {
            float twinkle = 0.65 + 0.35 * sin(uTime * 3.0 + s * 90.0);
            col += vec3(0.88, 0.93, 1.0) * uNight * twinkle * smoothstep(0.08, 0.3, d.y);
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const c1 = new THREE.Color(), c2 = new THREE.Color();

  function applyTime(h, dt = 0.016, focusPos = null) {
    let i = 0;
    while (i < skyKeys.length - 2 && h >= skyKeys[i + 1][0]) i++;
    const a = skyKeys[i], b = skyKeys[i + 1];
    const t = THREE.MathUtils.clamp((h - a[0]) / (b[0] - a[0]), 0, 1);

    const zen = c1.setHex(a[1]).lerp(c2.setHex(b[1]), t);
    skyUniforms.uZenith.value.copy(zen);

    const hor = c1.setHex(a[2]).lerp(c2.setHex(b[2]), t);
    skyUniforms.uHorizon.value.copy(hor);

    const sCol = c1.setHex(a[3]).lerp(c2.setHex(b[3]), t);
    sun.color.copy(sCol);
    skyUniforms.uSunColor.value.copy(sCol);

    sun.intensity = a[4] + (b[4] - a[4]) * t;
    hemi.intensity = a[5] + (b[5] - a[5]) * t;
    amb.intensity = a[6] + (b[6] - a[6]) * t;

    hemi.color.copy(zen).lerp(new THREE.Color(0xffffff), 0.45);
    hemi.groundColor.setHex(0x8a8470).lerp(hor, 0.25);

    const fogCol = hor.clone().lerp(zen, 0.28);
    scene.fog.color.copy(fogCol);
    scene.background = fogCol;

    const ang = ((h - 6) / 12) * Math.PI;
    const dayA = h > 5.8 && h < 18.6 ? ang : (h <= 5.8 ? 0.08 : Math.PI - 0.08);
    sun.userData.dir.set(Math.cos(dayA) * 0.88, Math.max(Math.sin(dayA), 0.16), 0.42).normalize();
    skyUniforms.uSunDir.value.copy(sun.userData.dir);
    fill.position.copy(sun.userData.dir).multiplyScalar(-120).setY(75);

    nightUniform.value = THREE.MathUtils.clamp(1.0 - sun.intensity / 1.35, 0, 1);
    fill.intensity = 0.68 - nightUniform.value * 0.35;
    scene.fog.density = 0.0010 + nightUniform.value * 0.0005;
    skyUniforms.uTime.value += dt;

    if (focusPos) {
      skyDome.position.set(focusPos.x, 0, focusPos.z);
      sun.position.copy(focusPos).addScaledVector(sun.userData.dir, 160);
      sun.target.position.copy(focusPos);
    }
  }

  return { sun, hemi, amb, fill, skyDome, applyTime, nightUniform };
}
