// src/post.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const VignetteGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uNight: { value: 0.0 },
    uGrainStrength: { value: 0.013 },
    uVignette: { value: 0.34 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uNight;
    uniform float uGrainStrength;
    uniform float uVignette;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - 0.5;
      float dist2 = dot(centered, centered);

      // Painterly soft vignette
      float vig = clamp(1.0 - dist2 * (uVignette + uNight * 0.18) * 2.2, 0.45, 1.0);
      vec3 col = texel.rgb * vig;

      // Subtle animated 35mm film grain (prevents sky/fog gradient banding)
      float n = hash12(vUv * 512.0 + vec2(uTime * 37.0, uTime * 19.0)) - 0.5;
      col += n * (uGrainStrength + uNight * 0.006);

      gl_FragColor = vec4(max(col, vec3(0.0)), texel.a);
    }
  `
};

export function createPost(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)),
    0.22, // strength (rises smoothly at night)
    0.55, // radius
    0.82  // threshold
  );
  composer.addPass(bloomPass);

  const grainPass = new ShaderPass(VignetteGrainShader);
  composer.addPass(grainPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  let nightVal = 0;

  return {
    composer,
    bloomPass,
    grainPass,
    setSize(w, h) {
      composer.setSize(w, h);
    },
    setNight(n) {
      nightVal = THREE.MathUtils.clamp(n, 0, 1);
      bloomPass.strength = 0.12 + nightVal * 0.2;
      bloomPass.threshold = 0.9 - nightVal * 0.05;
      grainPass.uniforms.uNight.value = nightVal;
    },
    render(dt = 0.016) {
      grainPass.uniforms.uTime.value = (grainPass.uniforms.uTime.value + dt) % 100.0;
      composer.render(dt);
    }
  };
}
