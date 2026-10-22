// src/post.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';


const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uNight: { value: 0.0 },
    uContrast: { value: 1.07 },
    uSaturation: { value: 1.14 },
    uLift: { value: 0.015 }
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
    uniform float uNight;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uLift;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));

      // warm highlights / teal shadows split tone
      vec3 warm = vec3(1.055, 1.0, 0.93);
      vec3 cool = vec3(0.93, 1.0, 1.09);
      vec3 tint = mix(cool, warm, smoothstep(0.12, 0.78, luma));
      col *= tint;

      // gentle S-curve contrast + slight shadow lift (fades blacks to charcoal)
      col = (col - 0.5) * uContrast + 0.5;
      col += uLift * (1.0 - luma);

      // saturation
      float g = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(g), col, uSaturation + uNight * 0.04);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), texel.a);
    }
  `
};

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

  const gradePass = new ShaderPass(ColorGradeShader);
  composer.addPass(gradePass);

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
      bloomPass.strength = 0.16 + nightVal * 0.24;
      gradePass.uniforms.uNight.value = nightVal;
      bloomPass.threshold = 0.9 - nightVal * 0.05;
      grainPass.uniforms.uNight.value = nightVal;
    },
    render(dt = 0.016) {
      grainPass.uniforms.uTime.value = (grainPass.uniforms.uTime.value + dt) % 100.0;
      composer.render(dt);
    }
  };
}
