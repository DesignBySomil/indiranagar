// src/rim.js
import * as THREE from 'three';

export function createRimLight({ THREE: T = THREE, scene, camera, targets = [] }) {
  const group = new T.Group();
  scene.add(group);

  // 1. Cool bluish-violet back/rim directional light (no shadows, active at dusk/night)
  const rimDirLight = new T.DirectionalLight(0x6b82d6, 0.0);
  rimDirLight.castShadow = false;
  group.add(rimDirLight, rimDirLight.target);

  // 2. Warm amber side kicker light opposite the rim light
  const kickerLight = new T.DirectionalLight(0xd98a4e, 0.0);
  kickerLight.castShadow = false;
  group.add(kickerLight, kickerLight.target);

  const rimUniforms = {
    uRimStrength: { value: 0.0 },
    uRimColor: { value: new T.Color(0.20, 0.25, 0.35) }, // Kept <= 0.35 linear so UnrealBloomPass never blows out
    uKickerColor: { value: new T.Color(0.32, 0.20, 0.11) }
  };

  const patchedMaterials = new WeakSet();

  function patchTargetMaterials(obj) {
    if (!obj || typeof obj.traverse !== 'function') return;
    obj.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (!m || !m.isMeshStandardMaterial || patchedMaterials.has(m)) continue;
        patchedMaterials.add(m);

        const prevCompile = m.onBeforeCompile;
        m.onBeforeCompile = (sh, renderer) => {
          if (typeof prevCompile === 'function') prevCompile(sh, renderer);
          sh.uniforms.uRimStrength = rimUniforms.uRimStrength;
          sh.uniforms.uRimColor = rimUniforms.uRimColor;
          sh.uniforms.uKickerColor = rimUniforms.uKickerColor;

          sh.fragmentShader = sh.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>
              uniform float uRimStrength;
              uniform vec3 uRimColor;
              uniform vec3 uKickerColor;`
            )
            .replace(
              '#include <opaque_fragment>',
              `if (uRimStrength > 0.005) {
                vec3 vDir = normalize(vViewPosition);
                float fresnel = pow(1.0 - clamp(abs(dot(normal, vDir)), 0.0, 1.0), 2.8);
                float topBias = clamp(normal.y * 0.5 + 0.5, 0.2, 1.0);
                vec3 rimAdd = mix(uKickerColor, uRimColor, topBias) * fresnel * uRimStrength;
                outgoingLight += min(rimAdd, vec3(0.34));
              }
              #include <opaque_fragment>`
            );
        };
        m.needsUpdate = true;
      }
    });
  }

  for (let i = 0; i < targets.length; i++) {
    patchTargetMaterials(targets[i]);
  }

  const camFwd = new T.Vector3();
  const camRight = new T.Vector3();
  const focusPos = new T.Vector3();

  function update(dt = 0.016, nightFactor = 0.0) {
    // Re-check targets list in case dynamic AI auto groups were pushed
    for (let i = 0; i < targets.length; i++) {
      patchTargetMaterials(targets[i]);
    }

    // Active at dusk and night; completely off in strong daylight
    const nf = T.MathUtils.clamp(nightFactor, 0, 1);
    const activeFactor = T.MathUtils.smoothstep(nf, 0.08, 0.85);

    rimUniforms.uRimStrength.value = activeFactor * 0.82;
    rimDirLight.intensity = activeFactor * 0.65;
    kickerLight.intensity = activeFactor * 0.38;

    if (camera && activeFactor > 0.001) {
      camera.getWorldDirection(camFwd);
      camRight.crossVectors(camFwd, camera.up).normalize();
      focusPos.copy(camera.position).addScaledVector(camFwd, 12.0);

      // Place cool rim light ahead/above camera pointing back toward vehicles for a crisp silhouette edge
      rimDirLight.target.position.copy(focusPos);
      rimDirLight.position.copy(focusPos)
        .addScaledVector(camFwd, 24.0)
        .addScaledVector(camRight, -10.0)
        .add(new T.Vector3(0, 16.0, 0));
      rimDirLight.target.updateMatrixWorld();

      // Place warm kicker light to the right-rear
      kickerLight.target.position.copy(focusPos);
      kickerLight.position.copy(focusPos)
        .addScaledVector(camFwd, -14.0)
        .addScaledVector(camRight, 18.0)
        .add(new T.Vector3(0, 9.0, 0));
      kickerLight.target.updateMatrixWorld();
    }
  }

  return {
    update,
    patchTargetMaterials,
    rimDirLight,
    kickerLight
  };
}
