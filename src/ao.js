// src/ao.js
import * as THREE from 'three';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

export function createAmbientOcclusion({ THREE: T = THREE, renderer, scene, camera, composer, width, height }) {
  const w = width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const h = height || (typeof window !== 'undefined' ? window.innerHeight : 720);

  try {
    const gtaoPass = new GTAOPass(scene, camera, w, h);
    gtaoPass.output = GTAOPass.OUTPUT.Default;

    if (typeof gtaoPass.updateGtaoMaterial === 'function') {
      gtaoPass.updateGtaoMaterial({
        radius: 2.5,
        distanceExponent: 1.0,
        thickness: 1.0,
        scale: 1.0,
        samples: 12,
        distanceFallOff: 1.0
      });
    }

    if (typeof gtaoPass.updatePdMaterial === 'function') {
      gtaoPass.updatePdMaterial({
        lumaPhi: 10.0,
        depthPhi: 2.0,
        normalPhi: 3.0,
        radius: 4.0,
        radiusExponent: 1.0,
        rings: 2.0,
        samples: 16
      });
    }

    if (composer && Array.isArray(composer.passes)) {
      // Insert GTAOPass right after the RenderPass (index 1)
      if (composer.passes.length >= 1) {
        composer.passes.splice(1, 0, gtaoPass);
      } else {
        composer.addPass(gtaoPass);
      }
    }

    return {
      pass: gtaoPass,
      setSize(nw, nh) {
        if (gtaoPass && typeof gtaoPass.setSize === 'function') {
          gtaoPass.setSize(nw, nh);
        }
      },
      setEnabled(b) {
        if (gtaoPass) gtaoPass.enabled = Boolean(b);
      }
    };
  } catch (err) {
    console.warn('GTAOPass unavailable, using fallback no-op AO:', err);
    return {
      pass: null,
      setSize() {},
      setEnabled() {}
    };
  }
}

export function tuneShadows({ THREE: T = THREE, renderer, sun, getAuto }) {
  if (renderer && renderer.shadowMap) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
  }

  const mapSz = (renderer && renderer.capabilities)
    ? Math.min(4096, renderer.capabilities.maxTextureSize || 4096)
    : 4096;

  const frustumHalf = 68;

  if (sun && sun.shadow) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(mapSz, mapSz);
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.04;
    Object.assign(sun.shadow.camera, {
      left: -frustumHalf,
      right: frustumHalf,
      top: frustumHalf,
      bottom: -frustumHalf,
      near: 2,
      far: 320
    });
    sun.shadow.camera.updateProjectionMatrix();
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
  }

  const lightSpace = new T.Matrix4();
  const invLightSpace = new T.Matrix4();
  const tmpTarget = new T.Vector3();
  const upVec = new T.Vector3(0, 1, 0);
  const fallbackDir = new T.Vector3(0.55, 0.38, 0.45).normalize();

  function update() {
    if (!sun || !getAuto) return;
    const a = getAuto();
    if (!a) return;

    const dir = (sun.userData && sun.userData.dir) ? sun.userData.dir : fallbackDir;
    const unitsPerTexel = (frustumHalf * 2) / mapSz;

    tmpTarget.set(a.x || 0, 0, a.z || 0);
    lightSpace.lookAt(
      tmpTarget.clone().addScaledVector(dir, 140),
      tmpTarget,
      upVec
    );
    invLightSpace.copy(lightSpace).invert();

    // Snap target to shadow-map texel grid in light space so shadows never shimmer
    tmpTarget.applyMatrix4(invLightSpace);
    tmpTarget.x = Math.round(tmpTarget.x / unitsPerTexel) * unitsPerTexel;
    tmpTarget.y = Math.round(tmpTarget.y / unitsPerTexel) * unitsPerTexel;
    tmpTarget.applyMatrix4(lightSpace);

    sun.target.position.copy(tmpTarget);
    sun.position.copy(tmpTarget).addScaledVector(dir, 140);
    sun.target.updateMatrixWorld();
  }

  return { update };
}
