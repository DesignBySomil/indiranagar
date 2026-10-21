// src/cameras.js
import * as THREE from 'three';
import { makeSign } from './materials.js';

export const CAMERA_CSS = `
#btn-cam {
  position: fixed;
  right: 18px;
  bottom: 22px;
  z-index: 42;
  cursor: pointer;
  background: rgba(12, 16, 28, 0.88);
  color: #f8fafc;
  border: 2px solid #facc15;
  border-radius: 999px;
  padding: 9px 16px;
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  transition: transform 0.15s ease, background 0.15s ease;
}
#btn-cam:hover {
  transform: translateY(-2px);
  background: rgba(24, 32, 54, 0.95);
}
#btn-cam span {
  color: #facc15;
}
`;

const MODES = ['chase', 'driver', 'passenger'];
const MODE_LABELS = {
  chase: 'Chase Cam',
  driver: 'Driver Cockpit',
  passenger: 'Back Seat'
};

export function createCameraRig({ THREE: T = THREE, camera, auto, carGroup, scene }) {
  if (typeof document !== 'undefined' && !document.getElementById('camera-rig-css')) {
    const st = document.createElement('style');
    st.id = 'camera-rig-css';
    st.textContent = CAMERA_CSS;
    document.head.appendChild(st);
  }

  // Create bottom-right camera view button (#btn-cam)
  let camBtn = typeof document !== 'undefined' ? document.getElementById('btn-cam') : null;
  if (typeof document !== 'undefined' && !camBtn) {
    camBtn = document.createElement('button');
    camBtn.id = 'btn-cam';
    document.body.appendChild(camBtn);
  }

  // Build detailed First-Person Cockpit + Back-Seat Driver Avatar attached to carGroup
  const cockpitGroup = new T.Group();
  const driverAvatar = new T.Group();

  // Build cockpit details (windshield surround, digital red LED meter, dashboard sticker, steerable handlebar)
  const blkMat = new T.MeshStandardMaterial({ color: 0x15181c, roughness: 0.7 });
  const chromeMat = new T.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
  const khakiMat = new T.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.75 });
  const skinMat = new T.MeshStandardMaterial({ color: 0xd4946a, roughness: 0.65 });

  // ---- Driver POV: handlebar with grips, brake levers, mirrors, speedo pod ----
  const rubberMat = new T.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.9 });
  const steelMat = new T.MeshStandardMaterial({ color: 0xaab2bd, roughness: 0.3, metalness: 0.85 });
  const redMat = new T.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.5 });
  const cockpitBar = new T.Group();
  cockpitBar.position.set(0, 1.02, 0.70);
  const crossTube = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.64, 10), steelMat);
  crossTube.rotation.z = Math.PI / 2;
  cockpitBar.add(crossTube);
  for (const sg of [-1, 1]) {
    const grip = new T.Mesh(new T.CylinderGeometry(0.021, 0.021, 0.12, 12), rubberMat);
    grip.rotation.z = Math.PI / 2; grip.position.set(sg * 0.30, 0, 0);
    const lever = new T.Mesh(new T.BoxGeometry(0.012, 0.012, 0.11), steelMat);
    lever.position.set(sg * 0.22, -0.012, 0.05); lever.rotation.y = sg * 0.18;
    const stalk = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 0.26, 6), steelMat);
    stalk.position.set(sg * 0.34, 0.13, 0.02); stalk.rotation.z = -sg * 0.25;
    const mirror = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.012, 20), steelMat);
    mirror.rotation.x = Math.PI / 2; mirror.position.set(sg * 0.385, 0.27, 0.02); mirror.rotation.y = -sg * 0.35;
    const glass = new T.Mesh(new T.CircleGeometry(0.052, 20), new T.MeshStandardMaterial({ color: 0x9fb8cc, roughness: 0.1, metalness: 0.9 }));
    glass.position.set(0, 0, -0.0075); glass.rotation.y = Math.PI; mirror.add(glass);
    cockpitBar.add(grip, lever);
  }
  const pod = new T.Mesh(new T.CylinderGeometry(0.065, 0.075, 0.07, 24), rubberMat);
  pod.position.set(0, 0.06, 0.02); pod.rotation.x = -0.9;
  const speedoCanvas = document.createElement('canvas'); speedoCanvas.width = speedoCanvas.height = 128;
  const speedoCtx = speedoCanvas.getContext('2d');
  const speedoTex = new T.CanvasTexture(speedoCanvas); speedoTex.colorSpace = T.SRGBColorSpace;
  let lastSpeedDrawn = -1;
  function drawSpeedo(kmh) {
    const k = Math.round(kmh);
    if (k === lastSpeedDrawn) return; lastSpeedDrawn = k;
    const c = speedoCtx; c.fillStyle = '#05070a'; c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#e5e7eb'; c.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.75 + 1.5 * i / 8); c.beginPath(); c.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); c.stroke(); }
    const a = Math.PI * (0.75 + 1.5 * Math.min(1, k / 80));
    c.strokeStyle = '#ef4444'; c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); c.stroke();
    c.fillStyle = '#facc15'; c.font = '700 22px monospace'; c.textAlign = 'center'; c.fillText(String(k), 64, 100);
    speedoTex.needsUpdate = true;
  }
  const speedoFace = new T.Mesh(new T.CircleGeometry(0.058, 28), new T.MeshBasicMaterial({ map: speedoTex }));
  speedoFace.position.set(0, 0.036, 0); speedoFace.rotation.x = -Math.PI / 2; pod.add(speedoFace);
  cockpitBar.add(pod);
  cockpitGroup.add(cockpitBar);
  // small Ganesha idol + tricolour tassel on the dash
  const idol = new T.Mesh(new T.SphereGeometry(0.035, 10, 8), new T.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.3 }));
  idol.position.set(0.30, 1.03, 0.90); /* idol removed */

  // ---- Driver seen from behind (passenger view): human proportions ----
  const shirtMat = new T.MeshStandardMaterial({ color: 0xb4aed0, roughness: 0.85 });
  const driverAvatar2 = new T.Group();
  const torso = new T.Mesh(new T.CylinderGeometry(0.17, 0.2, 0.5, 14), shirtMat); torso.position.set(0, 1.02, 0.26); torso.scale.z = 0.7;
  const shoulders = new T.Mesh(new T.CapsuleGeometry(0.075, 0.30, 4, 10), shirtMat); shoulders.rotation.z = Math.PI / 2; shoulders.position.set(0, 1.25, 0.26);
  const neck = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 0.08, 10), skinMat); neck.position.set(0, 1.32, 0.26);
  const head = new T.Mesh(new T.SphereGeometry(0.1, 16, 12), skinMat); head.scale.set(0.92, 1.12, 1.0); head.position.set(0, 1.43, 0.26);
  const hair = new T.Mesh(new T.SphereGeometry(0.104, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), blkMat); hair.scale.set(0.95, 1.12, 1.05); hair.position.set(0, 1.45, 0.255);
  const ears = [-1, 1].map(sg => { const e = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), skinMat); e.position.set(sg * 0.095, 1.43, 0.26); return e; });
  driverAvatar2.add(torso, shoulders, neck, head, hair, ...ears);
  for (const sg of [-1, 1]) {
    const up = new T.Mesh(new T.CapsuleGeometry(0.04, 0.2, 4, 8), shirtMat);
    up.position.set(sg * 0.22, 1.12, 0.38); up.rotation.set(1.0, 0, sg * 0.25);
    const fore = new T.Mesh(new T.CapsuleGeometry(0.034, 0.2, 4, 8), skinMat);
    fore.position.set(sg * 0.27, 1.0, 0.56); fore.rotation.set(1.35, 0, sg * 0.12);
    const hand = new T.Mesh(new T.SphereGeometry(0.036, 8, 6), skinMat); hand.position.set(sg * 0.30, 0.94, 0.66);
    driverAvatar2.add(up, fore, hand);
  }
  driverAvatar.add(driverAvatar2);

  // ---- Back-seat rig (matches the reference photo): seat back, grab rails, extinguisher ----
  const seatMat = new T.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9 });
  const seatBack = new T.Mesh(new T.BoxGeometry(0.70, 0.36, 0.12), seatMat); seatBack.position.set(0, 1.08, 0.02);
  const seatTop = new T.Mesh(new T.BoxGeometry(0.58, 0.04, 0.14), rubberMat); seatTop.position.set(0, 1.19, 0.0);
  driverAvatar.add(seatBack, seatTop);
  for (const yy of [1.17, 1.31]) {
    const bar = new T.Mesh(new T.CylinderGeometry(0.013, 0.013, 1.3, 8), steelMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, yy, -0.08); driverAvatar.add(bar);
  }
  for (const sg of [-1, 1]) for (const yy of [1.12, 1.26]) {
    const rail = new T.Mesh(new T.CylinderGeometry(0.013, 0.013, 1.3, 8), steelMat); rail.rotation.x = Math.PI / 2; rail.position.set(sg * 0.66, yy, 0.2); driverAvatar.add(rail);
  }
  const ext = new T.Mesh(new T.CylinderGeometry(0.065, 0.065, 0.34, 14), redMat); ext.position.set(-0.40, 1.18, -0.12);
  const extTop = new T.Mesh(new T.CylinderGeometry(0.03, 0.05, 0.07, 10), rubberMat); extTop.position.set(-0.40, 1.37, -0.12);
  driverAvatar.add(ext, extTop);

  const cabinLight = new T.PointLight(0xffe0a8, 1.6, 5, 1.5); cabinLight.position.set(0, 1.75, -0.2); driverAvatar.add(cabinLight);
  for (const sg of [-1, 1]) {
    const st = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.3, 6), steelMat); st.rotation.z = sg * 1.2; st.position.set(sg * 0.7, 1.42, 0.9);
    const mr = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.025, 20), rubberMat); mr.rotation.x = Math.PI / 2; mr.position.set(sg * 0.86, 1.52, 0.9);
    const gl = new T.Mesh(new T.CircleGeometry(0.078, 20), new T.MeshStandardMaterial({ color: 0x9fb8cc, roughness: 0.1, metalness: 0.9 })); gl.rotation.y = Math.PI; gl.position.set(sg * 0.86, 1.52, 0.878);
    driverAvatar.add(st, mr, gl);
  }
  // ---- Driver cockpit frame (matches the reference photo): yellow canopy and windshield frame, round mirrors, wiper, dark dash ----
  const driverRig = new T.Group();
  const yelMat = new T.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.45 });
  const dashMat = new T.MeshStandardMaterial({ color: 0x14161a, roughness: 0.8 });
  const box = (w, h, d, x, y, z, m) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); driverRig.add(o); return o; };
  box(1.9, 0.14, 0.05, 0, 1.86, 0.90, yelMat);           // header
  box(1.9, 0.02, 0.06, 0, 1.78, 0.89, dashMat);         // rubber seal top
  box(1.9, 0.05, 0.10, 0, 1.00, 0.90, yelMat);           // lower frame
  box(1.9, 0.16, 0.10, 0, 0.90, 0.90, dashMat);           // dash cowl
  box(1.1, 0.10, 0.30, 0, 0.84, 0.80, dashMat);           // dark dash
  for (const sg of [-1, 1]) {
    box(0.07, 0.9, 0.06, sg * 0.93, 1.40, 0.90, yelMat);  // pillars
    box(0.03, 0.40, 0.06, sg * 0.755, 1.36, 0.89, dashMat);
    const st = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.30, 6), steelMat); st.rotation.z = sg * 0.9; st.position.set(sg * 0.62, 1.28, 0.86); driverRig.add(st);
    const rim = new T.Mesh(new T.CylinderGeometry(0.095, 0.095, 0.03, 24), dashMat); rim.rotation.x = Math.PI / 2; rim.position.set(sg * 0.52, 1.42, 0.86); driverRig.add(rim);
    const glass = new T.Mesh(new T.CircleGeometry(0.082, 24), new T.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.15, metalness: 0.8 })); glass.rotation.y = Math.PI; glass.position.set(sg * 0.52, 1.42, 0.844); driverRig.add(glass);
  }
  const wiperBlade = box(0.62, 0.012, 0.012, -0.05, 1.205, 0.885, dashMat); wiperBlade.rotation.z = 0.05;
  driverRig.position.z = 0.35; driverRig.visible = false;

  const attachTarget = (carGroup && carGroup.userData && carGroup.userData.chassis) ? carGroup.userData.chassis : carGroup;
  if (attachTarget) {
    attachTarget.add(cockpitGroup);
    attachTarget.add(driverAvatar);
    attachTarget.add(driverRig);
  }

  let currentIdx = 0;
  let prevIdx = 0;
  let blend = 1.0; // 0..1 over 0.6s transition
  let camRoll = 0;
  let bobPhase = 0;
  const listeners = [];

  const chasePos = new T.Vector3();
  const chaseLook = new T.Vector3();

  function updateButtonLabel() {
    const modeName = MODES[currentIdx];
    if (camBtn) {
      camBtn.innerHTML = `🎥 View: <span>${MODE_LABELS[modeName]}</span> (V)`;
    }
  }

  function applyVisibilityForMode(mode) {
    cockpitGroup.visible = mode === 'driver' || mode === 'passenger';
    driverAvatar.visible = mode === 'passenger';
    driverRig.visible = mode === 'driver';
    if (attachTarget) attachTarget.traverse(o => { if (o.userData && o.userData.hideDriver) o.visible = !(mode === 'driver' || mode === 'passenger'); if (o.userData && o.userData.hideInDriver) o.visible = mode !== 'driver'; });
  }

  function computePoseForMode(mode, dt, snap, outPos, outLook) {
    const spd = Math.abs(auto.v || 0);
    const steer = auto.steer || 0;
    const sinA = Math.sin(auto.a || 0);
    const cosA = Math.cos(auto.a || 0);

    if (mode === 'chase') {
      const back = 11.0 + spd * 0.25;
      const sideSwing = snap ? 0 : steer * ((auto.v || 0) / 17) * 1.4;
      const tx = auto.x - sinA * back + cosA * sideSwing;
      const tz = auto.z - cosA * back - sinA * sideSwing;
      const bounceY = snap ? 0 : Math.sin(bobPhase * 1.1) * spd * 0.008;
      const ty = 6.0 + spd * 0.06 + bounceY;

      if (snap) {
        chasePos.set(tx, ty, tz);
      } else {
        const kc = Math.min(1, dt * 5.0);
        chasePos.x += (tx - chasePos.x) * kc;
        chasePos.z += (tz - chasePos.z) * kc;
        chasePos.y += (ty - chasePos.y) * Math.min(1, dt * 3.8);
      }

      const lookAhead = 7.5;
      const sideLook = snap ? 0 : steer * 1.1;
      chaseLook.set(
        auto.x + sinA * lookAhead - cosA * sideLook,
        1.2,
        auto.z + cosA * lookAhead + sinA * sideLook
      );

      outPos.copy(chasePos);
      outLook.copy(chaseLook);
      return {
        fov: 54 + spd * 0.72,
        roll: snap ? 0 : -steer * (auto.v || 0) * 0.0028
      };
    }

    // World-space transform from carGroup (accounting for 1.22 carGroup scale and suspension pitch/roll)
    const scale = carGroup ? carGroup.scale.x : 1.05;
    const bob = Math.sin(bobPhase * 1.4) * Math.min(0.004, spd * 0.00025);

    if (mode === 'driver') {
      // Driver head position just behind handlebar (~1.38m local * scale, looking straight out through windshield)
      const localX = -steer * 0.06;
      const localY = (1.30 + bob) * scale;
      const localZ = 0.22 * scale;
      outPos.set(
        auto.x + cosA * localX + sinA * localZ,
        localY,
        auto.z - sinA * localX + cosA * localZ
      );
      outLook.set(
        auto.x + sinA * 18.0 - cosA * (steer * 2.2),
        localY - 0.18,
        auto.z + cosA * 18.0 + sinA * (steer * 2.2)
      );
      return {
        fov: 64 + spd * 0.85,
        roll: -steer * (auto.v || 0) * 0.0045
      };
    }

    // 'passenger' back-seat view: seated on rear bench looking slightly over the driver's right shoulder
    const pLocalX = 0.0 * scale + steer * 0.02;
    const pLocalY = (1.52 + bob * 1.0) * scale;
    const pLocalZ = -0.56 * scale;
    outPos.set(
      auto.x + cosA * pLocalX + sinA * pLocalZ,
      pLocalY,
      auto.z - sinA * pLocalX + cosA * pLocalZ
    );
    outLook.set(
      auto.x + sinA * 14.0 - cosA * (steer * 1.5 - 0.15),
      pLocalY - 3.2,
      auto.z + cosA * 14.0 + sinA * (steer * 1.5 - 0.15)
    );
    return {
      fov: 56 + spd * 0.5,
      roll: -steer * (auto.v || 0) * 0.0038
    };
  }

  function set(name) {
    const idx = MODES.indexOf(name);
    if (idx === -1 || idx === currentIdx) return;
    prevIdx = currentIdx;
    currentIdx = idx;
    blend = 0.0;
    applyVisibilityForMode(MODES[currentIdx]);
    updateButtonLabel();
    for (const cb of listeners) cb(MODES[currentIdx]);
  }

  function next() {
    const nextMode = MODES[(currentIdx + 1) % MODES.length];
    set(nextMode);
    return nextMode;
  }

  if (camBtn) camBtn.addEventListener('click', () => next());
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
      next();
    }
  });

  applyVisibilityForMode(MODES[currentIdx]);
  updateButtonLabel();

  const posA = new T.Vector3(), lookA = new T.Vector3();
  const posB = new T.Vector3(), lookB = new T.Vector3();
  const finalPos = new T.Vector3(), finalLook = new T.Vector3();

  const look = { yaw: 0, pitch: 0, ty: 0, tp: 0, drag: false, x: 0, y: 0 };
  const cv = camera && document.querySelector('canvas');
  const dn = (e) => { if (e.target && e.target.tagName && e.target.tagName !== 'CANVAS') return; look.drag = true; look.x = e.clientX; look.y = e.clientY; };
  const mv = (e) => { if (!look.drag) return; const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
    look.ty = T.MathUtils.clamp(look.ty + dx * 0.006, -1.3, 1.3); look.tp = T.MathUtils.clamp(look.tp + dy * 0.004, -0.3, 0.3); };
  const up = () => { look.drag = false; };
  window.addEventListener('pointerdown', dn); window.addEventListener('pointermove', mv);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  function applyLook(dt) {
    if (MODES[currentIdx] === 'chase') { look.ty = look.tp = look.yaw = look.pitch = 0; return; }
    if (!look.drag) { const k = Math.min(1, dt * 2.5); look.ty -= look.ty * k; look.tp -= look.tp * k; }
    look.yaw += (look.ty - look.yaw) * Math.min(1, dt * 14 + 0.01); look.pitch += (look.tp - look.pitch) * Math.min(1, dt * 14 + 0.01);
    if (Math.abs(look.yaw) > 0.001 || Math.abs(look.pitch) > 0.001) { camera.rotateOnWorldAxis(new T.Vector3(0, 1, 0), -look.yaw); camera.rotateX(-look.pitch); }
  }
  function update(dt = 0.016, snap = false) {
    bobPhase += dt * (10 + Math.abs(auto.v || 0) * 1.6);
    cockpitBar.rotation.y = (auto.steer || 0) * 0.48;
    driverAvatar.rotation.z = -(auto.steer || 0) * 0.12;
    drawSpeedo(Math.abs(auto.v || 0) * 3.6);

    if (snap) {
      blend = 1.0;
      const cur = computePoseForMode(MODES[currentIdx], dt, true, finalPos, finalLook);
      camera.position.copy(finalPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(finalLook);
      applyLook(0.016);
      camera.fov = cur.fov;
      camera.updateProjectionMatrix();
      camRoll = 0;
      return;
    }

    // Keep chasePos warm even while in interior modes so switching back is seamless
    if (MODES[currentIdx] !== 'chase') {
      computePoseForMode('chase', dt, false, posA, lookA);
    }

    const curPose = computePoseForMode(MODES[currentIdx], dt, false, posB, lookB);

    if (blend < 1.0) {
      blend = Math.min(1.0, blend + dt / 0.6);
      const t = blend * blend * (3.0 - 2.0 * blend); // Smoothstep 0.6s transition
      const prevPose = computePoseForMode(MODES[prevIdx], dt, false, posA, lookA);
      finalPos.lerpVectors(posA, posB, t);
      finalLook.lerpVectors(lookA, lookB, t);
      const targetFov = T.MathUtils.lerp(prevPose.fov, curPose.fov, t);
      const targetRoll = T.MathUtils.lerp(prevPose.roll, curPose.roll, t);
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
      camRoll += (targetRoll - camRoll) * Math.min(1, dt * 8);
    } else {
      finalPos.copy(posB);
      finalLook.copy(lookB);
      camera.fov += (curPose.fov - camera.fov) * Math.min(1, dt * 5);
      camRoll += (curPose.roll - camRoll) * Math.min(1, dt * 6);
    }

    camera.position.copy(finalPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(finalLook);
    if (Math.abs(camRoll) > 0.0001) camera.rotateZ(camRoll);
    applyLook(dt);
    camera.updateProjectionMatrix();
  }

  return {
    next,
    set,
    get name() { return MODES[currentIdx]; },
    update,
    onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
  };
}
