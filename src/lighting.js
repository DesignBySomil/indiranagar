// src/lighting.js
import * as THREE from 'three';
import { nightUniform } from './materials.js';

// Painterly sky & exposure curve: rich blue-violet dusk/night, crisp non-washed-out day
const skyKeys = [
  // hour, zenithHex, horizonHex, sunHex, sunInt, hemiInt, ambInt, exposure
  [0.0,  0x060818, 0x161432, 0x7b96d4, 0.22, 0.14, 0.08, 0.92],
  [5.0,  0x0b1028, 0x241d46, 0x899ed8, 0.25, 0.18, 0.10, 0.94],
  [6.2,  0x2c3e6b, 0xd98a6c, 0xffb380, 1.85, 0.42, 0.22, 0.98],
  [9.0,  0x3d6fa8, 0xb8cad9, 0xfff0d4, 2.75, 0.55, 0.28, 0.94],
  [13.0, 0x35649c, 0xc4d4e0, 0xfff8eb, 3.10, 0.60, 0.30, 0.90],
  [16.5, 0x3b5d8f, 0xd9bf9c, 0xffe0b2, 2.75, 0.54, 0.27, 0.98],
  [17.8, 0x262957, 0xd47a55, 0xff9e5e, 2.55, 0.52, 0.30, 1.10], // Painterly blue-violet dusk zenith + warm horizon
  [18.6, 0x16163b, 0x6b385c, 0xc47ac0, 0.55, 0.22, 0.11, 1.00],
  [19.5, 0x090b21, 0x1f1a3d, 0x7b96d4, 0.24, 0.15, 0.08, 0.95],
  [24.0, 0x060818, 0x161432, 0x7b96d4, 0.22, 0.14, 0.08, 0.92]
];

export function setupLighting(scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;

  // Low ambient & hemisphere so daytime has crisp directional contrast and night lets lamps/windows carry the scene
  const amb = new THREE.AmbientLight(0x90a4c4, 0.20);
  scene.add(amb);

  const hemi = new THREE.HemisphereLight(0xdbe8f5, 0x3d352e, 0.42);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0x8aa8d6, 0.28);
  fill.position.set(-80, 55, -60);
  scene.add(fill);

  // Tight 4096 shadow camera with texel-grid snapping to eliminate shadow acne and moire banding
  const sun = new THREE.DirectionalLight(0xffe6c2, 2.2);
  sun.castShadow = true;
  const mapSz = Math.min(2048,renderer.capabilities.maxTextureSize||4096);
  sun.shadow.mapSize.set(mapSz, mapSz);
  const frustumHalf = 68;
  Object.assign(sun.shadow.camera, {
    left: -frustumHalf,
    right: frustumHalf,
    top: frustumHalf,
    bottom: -frustumHalf,
    near: 2,
    far: 320
  });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  sun.userData.dir = new THREE.Vector3(0.55, 0.38, 0.45).normalize();
  scene.add(sun, sun.target);

  // Cool directional moonlight for dusk/night silhouettes
  const moon = new THREE.DirectionalLight(0x7c98d6, 0.0);
  moon.position.set(-90, 110, -70);
  scene.add(moon, moon.target);

  // Distance fog tied to sky horizon
  scene.fog = new THREE.FogExp2(0x241d46, 0.0013);

  const skyUniforms = {
    uZenith:   { value: new THREE.Color(0x262957) },
    uHorizon:  { value: new THREE.Color(0xd47a55) },
    uSunColor: { value: new THREE.Color(0xff9e5e) },
    uSunDir:   { value: new THREE.Vector3(0.6, 0.25, 0.5).normalize() },
    uMoonDir:  { value: new THREE.Vector3(-0.55, 0.65, -0.45).normalize() },
    uNight:    nightUniform,
    uTime:     { value: 0 }
  };

  const skyGeo = new THREE.SphereGeometry(1850, 36, 24);
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
      uniform vec3 uMoonDir;
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

        // Layered height haze + blue-violet zenith gradient
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.62, pow(y, 0.58)));
        float groundHaze = exp(-y * 9.5);
        col = mix(col, uHorizon * 1.06, groundHaze * 0.45);

        // Warm dusty sun disc & Mie scattering
        float sunAmt = max(dot(d, uSunDir), 0.0);
        col += uSunColor * pow(sunAmt, 14.0) * 0.28 * (1.0 - uNight * 0.92);
        float sunDisc = smoothstep(0.9985, 0.9995, sunAmt);
        col = mix(col, uSunColor * 1.35, sunDisc * (1.0 - uNight));

        // Crisp Moon disc & silver-blue corona at dusk/night
        float moonAmt = max(dot(d, uMoonDir), 0.0);
        col += vec3(0.55, 0.68, 0.95) * pow(moonAmt, 24.0) * 0.25 * uNight;
        float moonDisc = smoothstep(0.9988, 0.9994, moonAmt);
        col = mix(col, vec3(0.92, 0.95, 1.0), moonDisc * uNight * 0.92);

        // Painterly dusk clouds
        if (d.y > 0.04) {
          vec2 uv = d.xz / (d.y + 0.20) * 1.45 + vec2(uTime * 0.005, 0.0);
          float cl = fbm(uv);
          float cloudMask = smoothstep(0.50, 0.78, cl) * smoothstep(0.04, 0.24, d.y);
          vec3 dayCloud = mix(uHorizon * 1.08, vec3(0.96, 0.92, 0.88), 0.5);
          vec3 nightCloud = mix(uZenith * 1.3, vec3(0.22, 0.20, 0.38), 0.5);
          col = mix(col, mix(dayCloud, nightCloud, uNight), cloudMask * 0.42);
        }

        // Dense twinkling stars at night
        if (uNight > 0.05 && d.y > 0.06) {
          vec2 suv = floor(d.xz / (d.y + 0.32) * 290.0);
          float s = hash21(suv);
          if (s > 0.9985) {
            float twinkle = 0.6 + 0.4 * sin(uTime * 3.2 + s * 110.0);
            col += vec3(0.88, 0.93, 1.0) * uNight * twinkle * 0.55 * smoothstep(0.06, 0.28, d.y);
          }
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const c1 = new THREE.Color(), c2 = new THREE.Color();
  const lightSpaceMatrix = new THREE.Matrix4();
  const invLightSpace = new THREE.Matrix4();
  const tmpTarget = new THREE.Vector3();

  // Snaps the directional shadow camera target to the shadow map texel grid in light-space to eliminate shimmer & moire
  function updateShadowTarget(focusPos) {
    if (!focusPos) return;
    const worldUnitsPerTexel = (frustumHalf * 2) / mapSz;
    tmpTarget.set(focusPos.x, 0, focusPos.z);

    lightSpaceMatrix.lookAt(
      tmpTarget.clone().addScaledVector(sun.userData.dir, 140),
      tmpTarget,
      new THREE.Vector3(0, 1, 0)
    );
    invLightSpace.copy(lightSpaceMatrix).invert();

    tmpTarget.applyMatrix4(invLightSpace);
    tmpTarget.x = Math.round(tmpTarget.x / worldUnitsPerTexel) * worldUnitsPerTexel;
    tmpTarget.y = Math.round(tmpTarget.y / worldUnitsPerTexel) * worldUnitsPerTexel;
    tmpTarget.applyMatrix4(lightSpaceMatrix);

    sun.target.position.copy(tmpTarget);
    sun.position.copy(tmpTarget).addScaledVector(sun.userData.dir, 140);
    sun.target.updateMatrixWorld();

    moon.target.position.set(focusPos.x, 0, focusPos.z);
    moon.position.copy(moon.target.position).addScaledVector(skyUniforms.uMoonDir.value, 130);
    moon.target.updateMatrixWorld();
  }

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
    hemi.intensity = (a[5] + (b[5] - a[5]) * t) * (1 + 0.9 * nightUniform.value);
    amb.intensity = (a[6] + (b[6] - a[6]) * t) * (1 + 0.9 * nightUniform.value);
    renderer.toneMappingExposure = (a[7] + (b[7] - a[7]) * t) * 1.45;

    hemi.color.copy(zen).lerp(new THREE.Color(0xfff4e6), 0.3);
    hemi.groundColor.setHex(0x2b2623).lerp(hor, 0.2);

    const fogCol = hor.clone().lerp(zen, 0.32);
    scene.fog.color.copy(fogCol);
    scene.background = fogCol;

    const ang = ((h - 6) / 12) * Math.PI;
    const dayA = h > 5.8 && h < 18.5 ? ang : (h <= 5.8 ? 0.12 : Math.PI - 0.12);
    sun.userData.dir.set(Math.cos(dayA) * 0.86, Math.max(Math.sin(dayA), 0.22), 0.42).normalize();
    skyUniforms.uSunDir.value.copy(sun.userData.dir);

    nightUniform.value = THREE.MathUtils.clamp(1.0 - (sun.intensity - 0.22) / 1.45, 0, 1);
    moon.intensity = nightUniform.value * 0.48;
    fill.intensity = (1.0 - nightUniform.value * 0.75) * 0.28;
    scene.fog.density = 0.00115 + nightUniform.value * 0.0002;
    skyUniforms.uTime.value += dt;

    if (focusPos) {
      skyDome.position.set(focusPos.x, 0, focusPos.z);
      updateShadowTarget(focusPos);
    }
  }

  return {
    sun,
    moon,
    hemi,
    amb,
    fill,
    skyDome,
    applyTime,
    update: updateShadowTarget,
    nightUniform
  };
}
