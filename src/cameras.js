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

  // Digital fare meter canvas updated live when fare changes
  const meterCanvas = document.createElement('canvas');
  meterCanvas.width = 256;
  meterCanvas.height = 128;
  const meterCtx = meterCanvas.getContext('2d');
  const meterTex = new T.CanvasTexture(meterCanvas);
  meterTex.colorSpace = T.SRGBColorSpace;
  let lastFareDrawn = -1;

  function drawDigitalMeter(fareVal = 30) {
    const f = Math.round(fareVal);
    if (f === lastFareDrawn) return;
    lastFareDrawn = f;
    meterCtx.fillStyle = '#090b10';
    meterCtx.fillRect(0, 0, 256, 128);
    meterCtx.strokeStyle = '#334155';
    meterCtx.lineWidth = 6;
    meterCtx.strokeRect(4, 4, 248, 120);

    meterCtx.fillStyle = '#facc15';
    meterCtx.font = '700 18px sans-serif';
    meterCtx.fillText('NAMMA METER · FOR HIRE', 18, 28);

    meterCtx.fillStyle = '#ff2a2a';
    meterCtx.font = '900 54px monospace';
    meterCtx.fillText(`₹${String(f).padStart(3, '0')}.00`, 18, 86);

    meterCtx.fillStyle = '#22c55e';
    meterCtx.font = '700 16px monospace';
    meterCtx.fillText('MIN ₹30 · WAIT 00:00', 18, 114);
    meterTex.needsUpdate = true;
  }
  drawDigitalMeter(30);

  // Build cockpit details (windshield surround, digital red LED meter, dashboard sticker, steerable handlebar)
  const blkMat = new T.MeshStandardMaterial({ color: 0x15181c, roughness: 0.7 });
  const chromeMat = new T.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
  const khakiMat = new T.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.75 });
  const skinMat = new T.MeshStandardMaterial({ color: 0xd4946a, roughness: 0.65 });

  // Dashboard sticker ("METER HAAKU GURU · NAMMA BENGALURU")
  const stickerTex = makeSign('ನಮ್ಮ ಬೆಂಗಳೂರು · DRIVE SAFE', '#facc15', '#111111', '800 32px sans-serif', 256, 64, 'NO CREDIT · CASH / UPI ONLY', '#b91c1c');
  const stickerMesh = new T.Mesh(new T.PlaneGeometry(0.26, 0.065), new T.MeshBasicMaterial({ map: stickerTex }));
  stickerMesh.position.set(-0.22, 1.05, 0.88);
  stickerMesh.rotation.y = Math.PI;
  cockpitGroup.add(stickerMesh);

  // Live glowing digital fare meter housing
  const meterHousing = new T.Mesh(new T.BoxGeometry(0.22, 0.14, 0.12), blkMat);
  meterHousing.position.set(0.25, 1.07, 0.89);
  const meterScreen = new T.Mesh(new T.PlaneGeometry(0.19, 0.10), new T.MeshBasicMaterial({ map: meterTex }));
  meterScreen.position.set(0.25, 1.07, 0.828);
  meterScreen.rotation.y = Math.PI;
  cockpitGroup.add(meterHousing, meterScreen);

  // Steerable cockpit handlebar with grips, brake levers & side mirrors
  const cockpitBar = new T.Group();
  cockpitBar.position.set(0, 0.96, 0.86);
  const crossTube = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.58, 8), chromeMat);
  crossTube.rotation.z = Math.PI / 2;
  cockpitBar.add(crossTube);
  for (const s of [-1, 1]) {
    const grip = new T.Mesh(new T.CylinderGeometry(0.024, 0.024, 0.13, 8), blkMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(s * 0.25, 0, 0);
    cockpitBar.add(grip);
  }
  cockpitGroup.add(cockpitBar);

  // Stylised Driver Avatar visible in 'passenger' back-seat mode (looking over driver's shoulder)
  const dTorso = new T.Mesh(new T.BoxGeometry(0.44, 0.54, 0.26), khakiMat);
  dTorso.position.set(0, 0.98, 0.36);
  const dHead = new T.Mesh(new T.SphereGeometry(0.16, 12, 10), skinMat);
  dHead.position.set(0, 1.38, 0.36);
  const dHair = new T.Mesh(new T.SphereGeometry(0.168, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), blkMat);
  dHair.position.set(0, 1.40, 0.35);
  const dArmL = new T.Mesh(new T.BoxGeometry(0.11, 0.44, 0.11), khakiMat);
  dArmL.position.set(-0.24, 1.06, 0.58);
  dArmL.rotation.x = 1.15;
  const dArmR = new T.Mesh(new T.BoxGeometry(0.11, 0.44, 0.11), khakiMat);
  dArmR.position.set(0.24, 1.06, 0.58);
  dArmR.rotation.x = 1.15;
  driverAvatar.add(dTorso, dHead, dHair, dArmL, dArmR);

  const attachTarget = (carGroup && carGroup.userData && carGroup.userData.chassis) ? carGroup.userData.chassis : carGroup;
  if (attachTarget) {
    attachTarget.add(cockpitGroup);
    attachTarget.add(driverAvatar);
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
    const scale = carGroup ? carGroup.scale.x : 1.22;
    const bob = Math.sin(bobPhase * 1.4) * (0.004 + spd * 0.0014);

    if (mode === 'driver') {
      // Driver head position just behind handlebar (~1.38m local * scale, looking straight out through windshield)
      const localX = -steer * 0.06;
      const localY = (1.32 + bob) * scale;
      const localZ = 0.28 * scale;
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
    const pLocalX = 0.18 * scale + steer * 0.04;
    const pLocalY = (1.36 + bob * 1.2) * scale;
    const pLocalZ = -0.64 * scale;
    outPos.set(
      auto.x + cosA * pLocalX + sinA * pLocalZ,
      pLocalY,
      auto.z - sinA * pLocalX + cosA * pLocalZ
    );
    outLook.set(
      auto.x + sinA * 14.0 - cosA * (steer * 1.5 - 0.15),
      pLocalY - 0.15,
      auto.z + cosA * 14.0 + sinA * (steer * 1.5 - 0.15)
    );
    return {
      fov: 58 + spd * 0.65,
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

  function update(dt = 0.016, snap = false) {
    bobPhase += dt * (10 + Math.abs(auto.v || 0) * 1.6);
    cockpitBar.rotation.y = (auto.steer || 0) * 0.48;
    driverAvatar.rotation.z = -(auto.steer || 0) * 0.12;
    drawDigitalMeter(auto.liveFare || 30);

    if (snap) {
      blend = 1.0;
      const cur = computePoseForMode(MODES[currentIdx], dt, true, finalPos, finalLook);
      camera.position.copy(finalPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(finalLook);
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
