// src/auto.js
import * as THREE from 'three';
import { makeSign, nightUniform } from './materials.js';
import { makeHeadlightRig } from './lamps.js';

function createWheel() {
  const g = new THREE.Group();
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.78 });
  const whiteWallMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.82 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.4, metalness: 0.6 });

  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.105, 12, 22), tireMat);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);

  for (const s of [-1, 1]) {
    const ww = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.225, 20), whiteWallMat);
    ww.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    ww.position.x = s * 0.095;
    g.add(ww);
  }

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.15, 16), rimMat);
  rim.rotation.z = Math.PI / 2;
  g.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.19, 12), rimMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.21, 10), hubMat);
  cap.rotation.z = Math.PI / 2;
  g.add(cap);

  const spokeGeo = new THREE.BoxGeometry(0.17, 0.31, 0.03);
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(spokeGeo, rimMat);
    sp.rotation.x = (i * Math.PI) / 3;
    g.add(sp);
  }
  return g;
}

export function buildAuto() {
  const root = new THREE.Group();
  root.scale.setScalar(0.95);

  const chassis = new THREE.Group();
  root.add(chassis);

  const greenMat = new THREE.MeshStandardMaterial({
    color: 0x1f7a43,
    emissive: 0x072412,
    emissiveIntensity: 0.22,
    roughness: 0.36,
    metalness: 0.12
  });
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xf6c30f,
    emissive: 0x3b2c00,
    emissiveIntensity: 0.20,
    roughness: 0.38,
    metalness: 0.05
  });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.65 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.18, metalness: 0.88 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x6b321c, roughness: 0.65 });
  const canvasFlapMat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.85, side: THREE.DoubleSide });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb8e2f4, transparent: true, opacity: 0.5, roughness: 0.08, metalness: 0.15 });

  const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.22, 2.24), blackMat);
  lowerPanel.position.set(0, 0.36, -0.04);
  lowerPanel.castShadow = true;
  chassis.add(lowerPanel);

  const rearShape = new THREE.Shape();
  rearShape.moveTo(-0.66, -0.64);
  rearShape.lineTo(0.66, -0.64);
  rearShape.quadraticCurveTo(0.70, 0, 0.62, 0.64);
  rearShape.lineTo(-0.62, 0.64);
  rearShape.quadraticCurveTo(-0.70, 0, -0.66, -0.64);

  const rearBodyGeo = new THREE.ExtrudeGeometry(rearShape, {
    depth: 0.70,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06
  });
  rearBodyGeo.rotateX(-Math.PI / 2);
  const rearBody = new THREE.Mesh(rearBodyGeo, greenMat);
  rearBody.position.set(0, 0.44, -0.52);
  rearBody.castShadow = true;
  chassis.add(rearBody);

  for (const s of [-1, 1]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.78), greenMat);
    sideWall.position.set(s * 0.63, 0.70, -0.55);
    chassis.add(sideWall);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 1.36), yellowMat);
    stripe.position.set(s * 0.64, 0.62, -0.48);
    chassis.add(stripe);

    const rFender = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.24, 16, 1, false, 0, Math.PI), blackMat);
    rFender.rotation.z = Math.PI / 2;
    rFender.position.set(s * 0.68, 0.35, -0.82);
    chassis.add(rFender);
  }

  const cowlShape = new THREE.Shape();
  cowlShape.moveTo(-0.58, -0.36);
  cowlShape.lineTo(0.58, -0.36);
  cowlShape.quadraticCurveTo(0.48, 0.36, 0.0, 0.50);
  cowlShape.quadraticCurveTo(-0.48, 0.36, -0.58, -0.36);

  const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
    depth: 0.74,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.07,
    bevelThickness: 0.07
  });
  cowlGeo.rotateX(-Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, greenMat);
  cowl.position.set(0, 0.42, 0.98);
  cowl.castShadow = true;
  chassis.add(cowl); cowl.userData.hideInDriver = true;

  const nosePts = [
    new THREE.Vector2(0.01, 0.28),
    new THREE.Vector2(0.19, 0.24),
    new THREE.Vector2(0.29, 0.13),
    new THREE.Vector2(0.34, 0.0)
  ];
  const noseGeo = new THREE.LatheGeometry(nosePts, 18);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, greenMat);
  nose.position.set(0, 0.75, 1.38);
  chassis.add(nose);

  const wsGroup = new THREE.Group();
  wsGroup.position.set(0, 1.46, 0.92);
  wsGroup.rotation.x = -0.26;
  const wsPane = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.64, 0.03), glassMat);
  const wsTop = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.07, 0.06), yellowMat);
  wsTop.position.y = 0.32;
  const wsBot = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.07, 0.05), yellowMat);
  wsBot.position.y = -0.32;
  const wsMid = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.64, 0.04), chromeMat);
  const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 0.03), blackMat);
  wiper.position.set(0.15, 0.05, 0.03);
  wiper.rotation.z = 0.35;
  wsGroup.add(wsPane, wsTop, wsBot, wsMid, wiper);
  for (const sd of [-1, 1]) { const sb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.06), yellowMat); sb.position.x = sd * 0.60; wsGroup.add(sb); }
  chassis.add(wsGroup); wsGroup.userData.hideInDriver = true;

  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6), chromeMat);
    arm.rotation.z = s * 1.1;
    arm.position.set(s * 0.67, 1.35, 0.92);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.03), chromeMat);
    mirror.position.set(s * 0.78, 1.41, 0.92);
    chassis.add(arm, mirror); arm.userData.hideInDriver = true; mirror.userData.hideInDriver = true;
  }

  const pillarGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.98, 8);
  for (const [px, pz] of [[-0.58, 0.65], [0.58, 0.65], [-0.60, -1.05], [0.60, -1.05]]) {
    const p = new THREE.Mesh(pillarGeo, blackMat);
    p.position.set(px, 1.45, pz);
    chassis.add(p);
  }

  const roofProfile = new THREE.Shape();
  roofProfile.moveTo(-0.68, 0);
  roofProfile.quadraticCurveTo(-0.68, 0.24, 0, 0.26);
  roofProfile.quadraticCurveTo(0.68, 0.24, 0.68, 0);
  roofProfile.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofProfile, {
    depth: 2.12,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.08
  });
  const roof = new THREE.Mesh(roofGeo, yellowMat);
  roof.position.set(0, 1.88, -1.14);
  roof.castShadow = true;
  chassis.add(roof);

  for (const s of [-1, 1]) {
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.58, 8), canvasFlapMat);
    roll.rotation.x = Math.PI / 2;
    roll.position.set(s * 0.65, 1.84, -0.2);
    const flapRear = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.80), canvasFlapMat);
    flapRear.rotation.y = Math.PI / 2;
    flapRear.position.set(s * 0.63, 1.44, -0.88);
    chassis.add(roll, flapRear);
  }

  const pSeat = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.16, 0.54), seatMat);
  pSeat.position.set(0, 0.76, -0.68);
  const pBack = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.48, 0.14), seatMat);
  pBack.position.set(0, 1.06, -0.96);
  const dSeat = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.18, 6, 12), blackMat);
  dSeat.rotation.z = Math.PI / 2;
  dSeat.position.set(0, 0.82, 0.42);
  chassis.add(pSeat, pBack, dSeat);

  const meterBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.12), blackMat);
  meterBox.position.set(0.24, 1.12, 0.92);
  const meterLed = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.05), new THREE.MeshBasicMaterial({ color: 0x38ff7a }));
  meterLed.position.set(0.24, 1.13, 0.858);
  meterLed.rotation.y = Math.PI;
  meterBox.userData.hideDriver = true; meterLed.userData.hideDriver = true;
  chassis.add(meterBox, meterLed);

  const frontFork = new THREE.Group();
  frontFork.position.set(0, 0.34, 1.40);
  chassis.add(frontFork);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.88, 8), blackMat);
  column.position.set(0, 0.44, -0.22);
  column.rotation.x = -0.28;
  frontFork.add(column);

  const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.64, 8), chromeMat);
  hBar.rotation.z = Math.PI / 2;
  hBar.position.set(0, 0.80, -0.34);
  frontFork.add(hBar);

  for (const s of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.13, 8), blackMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(s * 0.29, 0.80, -0.34);
    grip.userData.keep = true; frontFork.add(grip);
  }

  const fMudguard = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), greenMat);
  fMudguard.position.set(0, 0.04, 0.02);
  fMudguard.scale.set(0.68, 1.0, 1.15);
  frontFork.add(fMudguard);

  const hlHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.15, 14), chromeMat);
  hlHousing.rotation.x = Math.PI / 2;
  hlHousing.position.set(0, 0.44, 0.19);
  const hlLens = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff8d6 }));
  hlLens.scale.z = 0.4;
  hlLens.position.set(0, 0.44, 0.25);
  frontFork.add(hlHousing, hlLens);

  // Attach volumetric headlight rig (cone + lens flare)
  const hlRig = makeHeadlightRig({ single: true });
  hlRig.position.set(0, 0.44, 0.26);
  frontFork.add(hlRig);

  const frontWheel = createWheel();
  frontFork.add(frontWheel);

  const wheelRL = createWheel();
  wheelRL.position.set(-0.68, 0.34, -0.82);
  const wheelRR = createWheel();
  wheelRR.position.set(0.68, 0.34, -0.82);
  root.add(wheelRL, wheelRR);

  const spare = createWheel();
  spare.scale.setScalar(0.92);
  spare.rotation.y = Math.PI / 2;
  spare.rotation.z = -0.15;
  spare.position.set(0, 0.82, -1.25);
  const spareCover = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.13, 16), yellowMat);
  spareCover.rotation.x = Math.PI / 2;
  spareCover.position.set(0, 0.82, -1.28);
  chassis.add(spare, spareCover);

  const plateTex = makeSign('KA 03 AG 4210', '#f6c30f', '#111111', '800 38px sans-serif', 256, 64, '', '#111111');
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.12), new THREE.MeshBasicMaterial({ map: plateTex }));
  plate.position.set(0, 0.50, -1.24);
  plate.rotation.y = Math.PI;
  chassis.add(plate);
  frontFork.children.forEach(c => { if (c !== hBar && c !== column && !c.userData.keep) c.userData.hideInDriver = true; });
  frontFork.children.forEach(c => { if (c === column) c.userData.hideInDriver = false; });
  nose.userData.hideInDriver = true;

  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  for (const s of [-1, 1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.09, 0.05), tailMat);
    tl.position.set(s * 0.46, 0.52, -1.22);
    chassis.add(tl);
  }

  const rBumper = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.28, 8), chromeMat);
  rBumper.rotation.z = Math.PI / 2;
  rBumper.position.set(0, 0.34, -1.27);
  chassis.add(rBumper);

  const spot = new THREE.SpotLight(0xfff0c8, 8, 38, 0.48, 0.8, 1.6);
  spot.position.set(0, 0.95, 1.65);
  spot.target.position.set(0, 0.1, 15);
  chassis.add(spot, spot.target);

  root.userData = {
    chassis,
    frontFork,
    wheels: [frontWheel, wheelRL, wheelRR],
    hl: spot,
    hlLens,
    hlRig,
    greenMat,
    prevV: 0,
    pitch: 0,
    roll: 0,
    phase: 0
  };

  return root;
}

export function updateAuto(group, state, dt = 0.016) {
  const u = group.userData;
  if (!u || !u.chassis) return;

  const v = state.v || 0;
  const steer = state.steer || 0;

  // Golden auto skin unlock from completing the Passport
  if (state.goldAuto && u.greenMat && !u.isGold) {
    u.isGold = true;
    u.greenMat.color.setHex(0xd4af37);
    u.greenMat.metalness = 0.78;
    u.greenMat.roughness = 0.22;
  }

  const spin = (v * dt) / 0.34;
  for (const w of u.wheels) w.rotation.x += spin;

  u.frontFork.rotation.y = steer * 0.52;

  const accel = (v - u.prevV) / Math.max(dt, 0.001);
  u.prevV = v;

  const targetPitch = THREE.MathUtils.clamp(-accel * 0.0045, -0.08, 0.08);
  const targetRoll = THREE.MathUtils.clamp(-steer * v * 0.0075, -0.14, 0.14);

  u.pitch += (targetPitch - u.pitch) * Math.min(1, dt * 10);
  u.roll += (targetRoll - u.roll) * Math.min(1, dt * 10);

  u.phase += dt * (14 + Math.abs(v) * 2.2);
  const bounce = Math.sin(u.phase) * (0.004 + Math.abs(v) * 0.0012) + Math.cos(u.phase * 2.3) * 0.003;

  u.chassis.position.y = bounce;
  u.chassis.rotation.x = u.pitch;
  u.chassis.rotation.z = u.roll;
}
