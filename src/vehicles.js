// src/vehicles.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const hash = (x, z, seed = 0) => {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
};

function paintGeo(T, geo, hex, shadeY = 0.08) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  const col = new T.Color(hex);
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const py = g.attributes.position.getY(i);
    const s = 0.9 + Math.min(0.18, Math.max(-0.1, py * shadeY));
    arr[i * 3] = Math.min(1, col.r * s);
    arr[i * 3 + 1] = Math.min(1, col.g * s);
    arr[i * 3 + 2] = Math.min(1, col.b * s);
  }
  g.setAttribute('color', new T.BufferAttribute(arr, 3));
  return g;
}

function extrudeProfile(T, pts, width, bevelSize = 0.06, bevelThick = 0.06) {
  const shape = new T.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 4) {
      shape.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    } else {
      shape.lineTo(p[0], p[1]);
    }
  }
  shape.closePath();

  const depth = Math.max(0.1, width - bevelThick * 2);
  const geo = new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize,
    bevelThickness: bevelThick,
    curveSegments: 12
  });
  // Extrude is in XY (X = vehicle Z length, Y = height) extruded along +Z (width)
  geo.translate(0, 0, -depth * 0.5);
  // Rotate +90 deg around Y so local X becomes +Z (forward) and local Z becomes +X (width)
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function buildSpokedWheel(T, radius = 0.33, tube = 0.105) {
  const parts = [];
  // Torus tyre with 22 radial segments
  const tyre = new T.TorusGeometry(radius - tube * 0.65, tube, 12, 22);
  tyre.rotateY(Math.PI / 2);
  parts.push(paintGeo(T, tyre, 0x1a1c20, 0.02));

  // Outer chrome rim ring
  const rimR = radius - tube * 1.15;
  const rim = new T.CylinderGeometry(rimR, rimR, tube * 1.1, 16, 1, true);
  rim.rotateZ(Math.PI / 2);
  parts.push(paintGeo(T, rim, 0xd8dee9, 0.04));

  // Inner dark brake disc
  const disc = new T.CylinderGeometry(rimR * 0.85, rimR * 0.85, tube * 0.6, 12);
  disc.rotateZ(Math.PI / 2);
  parts.push(paintGeo(T, disc, 0x2b303c, 0.02));

  // Center hub cap
  const hub = new T.CylinderGeometry(rimR * 0.28, rimR * 0.28, tube * 1.45, 10);
  hub.rotateZ(Math.PI / 2);
  parts.push(paintGeo(T, hub, 0xe5e9f0, 0.05));

  // 5 Chrome Spokes
  for (let s = 0; s < 5; s++) {
    const ang = (s * Math.PI * 2) / 5;
    const spk = new T.BoxGeometry(tube * 1.32, rimR * 0.92, 0.036);
    spk.translate(0, rimR * 0.44, 0);
    spk.rotateX(ang);
    parts.push(paintGeo(T, spk, 0xe2e8f0, 0.05));
  }

  return mergeGeometries(parts, false);
}

function buildCarSet(T, type = 'sedan') {
  const bodyParts = [];
  const detailParts = [];
  const brakeParts = [];

  const isSuv = type === 'suv';
  const isHatch = type === 'hatch';
  const len = isSuv ? 4.45 : (isHatch ? 3.82 : 4.28);
  const wdt = isSuv ? 1.86 : (isHatch ? 1.70 : 1.76);
  const hgt = isSuv ? 1.72 : (isHatch ? 1.48 : 1.44);
  const hl = len * 0.5;
  const hw = wdt * 0.5;

  // 1. Lower Body Side-Profile Shape (X = longitudinal Z, Y = vertical Y)
  let hullPts;
  if (isSuv) {
    hullPts = [
      [-hl, 0.26],
      [hl - 0.14, 0.24],
      [hl + 0.02, 0.26, hl, 0.55],
      [hl - 0.02, 0.86, hl - 0.18, 0.94],
      [hl * 0.38, 0.98],
      [-hl + 0.16, 1.00],
      [-hl, 0.94, -hl - 0.02, 0.56]
    ];
  } else if (isHatch) {
    hullPts = [
      [-hl, 0.24],
      [hl - 0.14, 0.22],
      [hl + 0.02, 0.25, hl, 0.48],
      [hl - 0.04, 0.72, hl - 0.25, 0.80],
      [hl * 0.36, 0.86],
      [-hl + 0.12, 0.88],
      [-hl, 0.82, -hl - 0.02, 0.46]
    ];
  } else {
    // Sedan
    hullPts = [
      [-hl, 0.25],
      [hl - 0.15, 0.22],
      [hl + 0.02, 0.25, hl, 0.48],
      [hl - 0.05, 0.74, hl - 0.28, 0.81],
      [hl * 0.35, 0.86],
      [-hl * 0.55, 0.88],
      [-hl + 0.12, 0.86],
      [-hl, 0.80, -hl - 0.02, 0.48]
    ];
  }
  const hullGeo = extrudeProfile(T, hullPts, wdt, 0.07, 0.08);
  bodyParts.push(paintGeo(T, hullGeo, 0xffffff, 0.08));

  // 2. Greenhouse / Cabin with raked windscreen and pillars
  let cabPts;
  const cabBaseY = isSuv ? 0.90 : 0.79;
  if (isSuv) {
    cabPts = [
      [-hl + 0.18, cabBaseY],
      [hl * 0.36, cabBaseY],
      [hl * 0.14, hgt - 0.05, -0.05, hgt],
      [-hl + 0.38, hgt - 0.02],
      [-hl + 0.18, hgt - 0.06, -hl + 0.14, cabBaseY + 0.1]
    ];
  } else if (isHatch) {
    cabPts = [
      [-hl + 0.16, cabBaseY],
      [hl * 0.35, cabBaseY],
      [hl * 0.08, hgt - 0.04, -0.12, hgt],
      [-hl + 0.42, hgt - 0.03],
      [-hl + 0.18, hgt - 0.12, -hl + 0.12, cabBaseY + 0.08]
    ];
  } else {
    cabPts = [
      [-hl * 0.62, cabBaseY],
      [hl * 0.35, cabBaseY],
      [hl * 0.06, hgt - 0.03, -0.15, hgt],
      [-hl * 0.32, hgt - 0.02],
      [-hl * 0.54, cabBaseY + 0.14, -hl * 0.64, cabBaseY + 0.04]
    ];
  }
  // Dark glass interior block
  const glassBlock = extrudeProfile(T, cabPts, wdt * 0.84, 0.04, 0.05);
  detailParts.push(paintGeo(T, glassBlock, 0x16202e, 0.05));

  // Tinted roof cap + pillars slightly wider/taller on top of glass
  const roofCapPts = cabPts.map(p => {
    if (p.length === 4) return [p[0], p[1] + 0.02, p[2], p[3] + 0.02];
    return [p[0], p[1] + 0.02];
  });
  const roofCap = extrudeProfile(T, roofCapPts, wdt * 0.78, 0.03, 0.03);
  bodyParts.push(paintGeo(T, roofCap, 0xffffff, 0.08));

  // Raked A, B, C Pillars (body-colored strips along glass sides)
  const aPillarL = new T.BoxGeometry(0.06, 0.52, 0.07);
  aPillarL.rotateX(-0.62);
  aPillarL.translate(hw * 0.79, cabBaseY + 0.24, hl * 0.19);
  const aPillarR = aPillarL.clone();
  aPillarR.translate(-hw * 1.58, 0, 0);
  bodyParts.push(paintGeo(T, aPillarL, 0xffffff), paintGeo(T, aPillarR, 0xffffff));

  const bPillarL = new T.BoxGeometry(0.05, 0.46, 0.09);
  bPillarL.translate(hw * 0.82, cabBaseY + 0.24, -0.08);
  const bPillarR = bPillarL.clone();
  bPillarR.translate(-hw * 1.64, 0, 0);
  detailParts.push(paintGeo(T, bPillarL, 0x11151c), paintGeo(T, bPillarR, 0x11151c));

  // 3. Flared Wheel Arches + Dark Wheel Wells
  const wheelZFront = hl * 0.60;
  const wheelZRear = -hl * 0.58;
  const wheelR = isSuv ? 0.36 : 0.32;
  const wheelProto = buildSpokedWheel(T, wheelR, isSuv ? 0.115 : 0.10);

  for (const wz of [wheelZFront, wheelZRear]) {
    for (const side of [-1, 1]) {
      // Wheel Arch Flare (Body colored)
      const arch = new T.TorusGeometry(wheelR + 0.05, 0.065, 8, 16, Math.PI);
      arch.rotateY(Math.PI / 2);
      arch.translate(side * (hw - 0.03), wheelR, wz);
      bodyParts.push(paintGeo(T, arch, 0xffffff, 0.06));

      // Dark wheel well backing
      const well = new T.CylinderGeometry(wheelR + 0.03, wheelR + 0.03, 0.26, 14, 1, false, 0, Math.PI);
      well.rotateZ(Math.PI / 2);
      well.translate(side * (hw - 0.12), wheelR, wz);
      detailParts.push(paintGeo(T, well, 0x0f1115, 0.0));

      // Spoked Wheel
      const w = wheelProto.clone();
      if (side < 0) w.rotateY(Math.PI);
      w.translate(side * (hw - 0.06), wheelR, wz);
      detailParts.push(w);
    }
  }

  // 4. Door Lines & Door Handles (thin dark boxes along flanks)
  for (const side of [-1, 1]) {
    const sx = side * (hw + 0.005);
    const seamV1 = new T.BoxGeometry(0.018, 0.52, 0.018);
    seamV1.translate(sx, 0.56, hl * 0.30);
    const seamV2 = seamV1.clone();
    seamV2.translate(0, 0, -hl * 0.38);
    const seamV3 = seamV1.clone();
    seamV3.translate(0, 0, -hl * 0.78);
    const seamH = new T.BoxGeometry(0.018, 0.018, hl * 1.08);
    seamH.translate(sx, 0.31, -hl * 0.09);
    const handle1 = new T.BoxGeometry(0.035, 0.035, 0.14);
    handle1.translate(sx, 0.72, 0.04);
    const handle2 = handle1.clone();
    handle2.translate(0, 0, -hl * 0.38);
    detailParts.push(
      paintGeo(T, seamV1, 0x14171f),
      paintGeo(T, seamV2, 0x14171f),
      paintGeo(T, seamV3, 0x14171f),
      paintGeo(T, seamH, 0x14171f),
      paintGeo(T, handle1, 0x1e2430),
      paintGeo(T, handle2, 0x1e2430)
    );

    // 5. Side Mirrors (stalk + body-colored housing)
    const stalk = new T.BoxGeometry(0.10, 0.035, 0.04);
    stalk.translate(side * (hw + 0.02), cabBaseY + 0.06, hl * 0.25);
    detailParts.push(paintGeo(T, stalk, 0x181b22));

    const mirHousing = new T.SphereGeometry(0.075, 10, 8);
    mirHousing.scale(1.2, 0.75, 0.65);
    mirHousing.translate(side * (hw + 0.09), cabBaseY + 0.08, hl * 0.24);
    bodyParts.push(paintGeo(T, mirHousing, 0xffffff));
  }

  // 6. Front & Rear Bumpers, Grille, License Plates
  const fBump = new T.BoxGeometry(wdt * 0.96, 0.18, 0.16);
  fBump.translate(0, 0.28, hl + 0.01);
  const rBump = new T.BoxGeometry(wdt * 0.96, 0.20, 0.16);
  rBump.translate(0, 0.30, -hl - 0.01);
  detailParts.push(paintGeo(T, fBump, 0x1b1f26), paintGeo(T, rBump, 0x1b1f26));

  // Front Grille + Chrome Slats
  const grille = new T.BoxGeometry(wdt * 0.50, 0.18, 0.06);
  grille.translate(0, 0.50, hl + 0.02);
  detailParts.push(paintGeo(T, grille, 0x111318));
  for (let g = -1; g <= 1; g++) {
    const slat = new T.BoxGeometry(wdt * 0.48, 0.022, 0.075);
    slat.translate(0, 0.50 + g * 0.05, hl + 0.022);
    detailParts.push(paintGeo(T, slat, 0xd8dee9));
  }

  // White License Plates Front & Rear
  const plateF = new T.BoxGeometry(0.42, 0.10, 0.04);
  plateF.translate(0, 0.30, hl + 0.08);
  const plateR = plateF.clone();
  plateR.translate(0, 0.08, -len - 0.16);
  detailParts.push(paintGeo(T, plateF, 0xf8fafc), paintGeo(T, plateR, 0xf8fafc));

  // 7. Headlights & Tail Lights + Brake Light Overlay
  for (const side of [-1, 1]) {
    const hlBox = new T.BoxGeometry(0.28, 0.13, 0.09);
    hlBox.rotateY(side * 0.18);
    hlBox.translate(side * (hw * 0.68), 0.54, hl - 0.01);
    detailParts.push(paintGeo(T, hlBox, 0xfffbeb));

    const tlBox = new T.BoxGeometry(0.30, 0.14, 0.08);
    tlBox.translate(side * (hw * 0.66), 0.62, -hl + 0.01);
    detailParts.push(paintGeo(T, tlBox, 0xb91c1c));

    // Brake light overlay (slightly proud of tail light for dynamic brake toggle)
    const brkBox = new T.BoxGeometry(0.28, 0.12, 0.04);
    brkBox.translate(side * (hw * 0.66), 0.62, -hl - 0.035);
    brakeParts.push(paintGeo(T, brkBox, 0xff2222));
  }

  // Centre high-mount stop lamp
  const chmsl = new T.BoxGeometry(0.36, 0.045, 0.04);
  chmsl.translate(0, hgt - 0.08, isSedan(type) ? -hl * 0.58 : -hl + 0.16);
  brakeParts.push(paintGeo(T, chmsl, 0xff2222));

  return {
    bodyGeo: mergeGeometries(bodyParts, false),
    detailGeo: mergeGeometries(detailParts, false),
    brakeGeo: mergeGeometries(brakeParts, false)
  };
}

function isSedan(t) {
  return t !== 'suv' && t !== 'hatch';
}

function buildScooterSet(T, withRider = true) {
  const bodyParts = [];
  const detailParts = [];
  const brakeParts = [];

  // Rounded front apron shield (Extruded curved profile)
  const shieldPts = [
    [0.24, 0.24],
    [0.48, 0.26],
    [0.58, 0.52, 0.44, 0.86],
    [0.34, 0.88],
    [0.42, 0.54, 0.24, 0.34]
  ];
  const shield = extrudeProfile(T, shieldPts, 0.42, 0.05, 0.05);
  bodyParts.push(paintGeo(T, shield, 0xffffff, 0.08));

  // Floorboard
  const floor = new T.BoxGeometry(0.38, 0.07, 0.56);
  floor.translate(0, 0.24, 0.04);
  detailParts.push(paintGeo(T, floor, 0x1e222a));

  // Rounded rear engine cowl / side pods (Capsules)
  for (const side of [-1, 1]) {
    const pod = new T.CapsuleGeometry(0.14, 0.42, 8, 12);
    pod.rotateX(Math.PI / 2 - 0.18);
    pod.translate(side * 0.11, 0.44, -0.34);
    bodyParts.push(paintGeo(T, pod, 0xffffff, 0.08));
  }

  // Front mudguard (curved over front wheel)
  const fMud = new T.SphereGeometry(0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  fMud.scale(0.75, 1.0, 1.15);
  fMud.translate(0, 0.24, 0.54);
  bodyParts.push(paintGeo(T, fMud, 0xffffff, 0.08));

  // Rear mudguard
  const rMud = new T.BoxGeometry(0.18, 0.18, 0.12);
  rMud.rotateX(0.35);
  rMud.translate(0, 0.28, -0.68);
  detailParts.push(paintGeo(T, rMud, 0x181b20));

  // Contoured Dual Seat
  const seat = new T.CapsuleGeometry(0.15, 0.44, 8, 12);
  seat.rotateX(Math.PI / 2);
  seat.scale(1.1, 0.65, 1.0);
  seat.translate(0, 0.65, -0.26);
  detailParts.push(paintGeo(T, seat, 0x1c1917));

  // Front Fork Tubes + Steering Stem
  for (const side of [-1, 1]) {
    const fork = new T.CylinderGeometry(0.022, 0.018, 0.58, 8);
    fork.rotateX(-0.24);
    fork.translate(side * 0.08, 0.46, 0.48);
    detailParts.push(paintGeo(T, fork, 0x94a3b8));
  }

  // Handlebar + Grips + Mirrors
  const hBar = new T.CylinderGeometry(0.022, 0.022, 0.58, 8);
  hBar.rotateZ(Math.PI / 2);
  hBar.translate(0, 0.94, 0.36);
  detailParts.push(paintGeo(T, hBar, 0xcbd5e1));

  const cowl = new T.SphereGeometry(0.11, 10, 8);
  cowl.scale(1.4, 0.85, 0.9);
  cowl.translate(0, 0.95, 0.39);
  bodyParts.push(paintGeo(T, cowl, 0xffffff));

  // Round Chrome Headlight
  const hLight = new T.CylinderGeometry(0.075, 0.075, 0.06, 14);
  hLight.rotateX(Math.PI / 2);
  hLight.translate(0, 0.95, 0.46);
  detailParts.push(paintGeo(T, hLight, 0xfffbeb));

  // Exhaust Pipe (right side)
  const exhaust = new T.CylinderGeometry(0.038, 0.048, 0.46, 10);
  exhaust.rotateX(Math.PI / 2 - 0.15);
  exhaust.translate(-0.19, 0.24, -0.44);
  detailParts.push(paintGeo(T, exhaust, 0x64748b));

  // Small White License Plate + Tail/Brake Light
  const sPlate = new T.BoxGeometry(0.16, 0.09, 0.02);
  sPlate.translate(0, 0.36, -0.73);
  detailParts.push(paintGeo(T, sPlate, 0xf8fafc));

  const sTail = new T.BoxGeometry(0.14, 0.08, 0.05);
  sTail.translate(0, 0.54, -0.68);
  detailParts.push(paintGeo(T, sTail, 0xb91c1c));

  const sBrake = new T.BoxGeometry(0.13, 0.07, 0.03);
  sBrake.translate(0, 0.54, -0.71);
  brakeParts.push(paintGeo(T, sBrake, 0xff2222));

  // Spoked Scooter Wheels
  const scWheel = buildSpokedWheel(T, 0.21, 0.065);
  const fw = scWheel.clone();
  fw.translate(0, 0.21, 0.54);
  const rw = scWheel.clone();
  rw.translate(0, 0.21, -0.46);
  detailParts.push(fw, rw);

  // Rider with Helmet for moving scooters
  if (withRider) {
    // Torso
    const torso = new T.CapsuleGeometry(0.14, 0.36, 8, 12);
    torso.rotateX(0.18);
    torso.translate(0, 1.02, -0.14);
    detailParts.push(paintGeo(T, torso, 0x1e3a8a, 0.06));

    // Arms reaching to handlebar
    for (const side of [-1, 1]) {
      const arm = new T.CapsuleGeometry(0.045, 0.32, 6, 8);
      arm.rotateX(1.15);
      arm.rotateY(side * -0.15);
      arm.translate(side * 0.17, 1.04, 0.09);
      detailParts.push(paintGeo(T, arm, 0x2563eb));

      const leg = new T.CapsuleGeometry(0.058, 0.36, 6, 8);
      leg.rotateX(-0.35);
      leg.translate(side * 0.12, 0.56, 0.08);
      detailParts.push(paintGeo(T, leg, 0x1e293b));
    }

    // Helmet + Visor
    const helmet = new T.SphereGeometry(0.155, 14, 12);
    helmet.translate(0, 1.42, -0.06);
    detailParts.push(paintGeo(T, helmet, 0xfacc15, 0.08));

    const visor = new T.SphereGeometry(0.158, 12, 8, -0.9, 1.8, 0.9, 0.8);
    visor.rotateY(Math.PI / 2);
    visor.translate(0, 1.42, -0.04);
    detailParts.push(paintGeo(T, visor, 0x0f172a));
  }

  return {
    bodyGeo: mergeGeometries(bodyParts, false),
    detailGeo: mergeGeometries(detailParts, false),
    brakeGeo: mergeGeometries(brakeParts, false)
  };
}

function buildAutoRickshawSet(T) {
  const bodyParts = [];
  const detailParts = [];
  const brakeParts = [];

  // Iconic Bengaluru/Indian Green lower shell + Yellow canopy hood
  // Lower cowl & rear passenger tub (Green = fixed or tinted; we put green on bodyGeo so palette can tint green shades, and yellow canopy on detailGeo)
  const tubPts = [
    [-1.25, 0.22],
    [0.85, 0.22],
    [1.15, 0.26, 1.12, 0.65],
    [0.98, 0.88, 0.65, 0.92],
    [0.35, 0.88],
    [0.35, 0.45],
    [-0.15, 0.45],
    [-0.20, 0.86],
    [-1.22, 0.88],
    [-1.28, 0.55]
  ];
  const tub = extrudeProfile(T, tubPts, 1.28, 0.05, 0.05);
  bodyParts.push(paintGeo(T, tub, 0xffffff, 0.08));

  // Rounded Yellow Canopy Top + Rear Engine Cover
  const canopyPts = [
    [-1.22, 0.86],
    [-1.12, 1.66, -0.75, 1.72],
    [0.52, 1.72],
    [0.88, 1.66, 0.98, 1.18],
    [0.84, 1.16],
    [0.75, 1.58, 0.48, 1.62],
    [-0.95, 1.62],
    [-1.08, 0.86]
  ];
  const canopy = extrudeProfile(T, canopyPts, 1.24, 0.04, 0.04);
  detailParts.push(paintGeo(T, canopy, 0xfacc15, 0.08));

  // Yellow upper nose band
  const noseBand = new T.BoxGeometry(1.22, 0.24, 0.65);
  noseBand.translate(0, 0.98, 0.72);
  detailParts.push(paintGeo(T, noseBand, 0xfacc15, 0.06));

  // Windscreen glass
  const wScreen = new T.BoxGeometry(1.10, 0.46, 0.05);
  wScreen.rotateX(-0.22);
  wScreen.translate(0, 1.32, 0.90);
  detailParts.push(paintGeo(T, wScreen, 0x1e293b));

  // Passenger bench seat inside
  const bench = new T.BoxGeometry(1.12, 0.28, 0.52);
  bench.translate(0, 0.56, -0.68);
  detailParts.push(paintGeo(T, bench, 0x1c1917));

  // 3 Spoked Wheels (1 front, 2 rear)
  const wProto = buildSpokedWheel(T, 0.22, 0.07);
  const fw = wProto.clone();
  fw.translate(0, 0.22, 0.98);
  const rwL = wProto.clone();
  rwL.translate(0.58, 0.22, -0.82);
  const rwR = wProto.clone();
  rwR.rotateY(Math.PI);
  rwR.translate(-0.58, 0.22, -0.82);
  detailParts.push(fw, rwL, rwR);

  // Single center headlight + twin indicators
  const hl = new T.CylinderGeometry(0.09, 0.09, 0.08, 14);
  hl.rotateX(Math.PI / 2);
  hl.translate(0, 0.66, 1.15);
  detailParts.push(paintGeo(T, hl, 0xfffbeb));

  // Rear tail/brake lights + license plate
  for (const side of [-1, 1]) {
    const tl = new T.BoxGeometry(0.18, 0.10, 0.06);
    tl.translate(side * 0.42, 0.48, -1.27);
    detailParts.push(paintGeo(T, tl, 0xb91c1c));

    const brk = new T.BoxGeometry(0.16, 0.09, 0.04);
    brk.translate(side * 0.42, 0.48, -1.30);
    brakeParts.push(paintGeo(T, brk, 0xff2222));
  }
  const plate = new T.BoxGeometry(0.32, 0.10, 0.03);
  plate.translate(0, 0.38, -1.27);
  detailParts.push(paintGeo(T, plate, 0xfef08a));

  return {
    bodyGeo: mergeGeometries(bodyParts, false),
    detailGeo: mergeGeometries(detailParts, false),
    brakeGeo: mergeGeometries(brakeParts, false)
  };
}

function buildTempoSet(T) {
  const bodyParts = [];
  const detailParts = [];
  const brakeParts = [];

  const len = 5.45;
  const wdt = 2.02;
  const hgt = 2.38;
  const hl = len * 0.5;
  const hw = wdt * 0.5;

  // High-roof Tempo Traveller van profile
  const vanPts = [
    [-hl, 0.30],
    [hl - 0.12, 0.28],
    [hl + 0.04, 0.32, hl, 0.85],
    [hl - 0.04, 1.15, hl - 0.26, 1.32],
    [hl - 0.58, 1.98, hl - 0.82, hgt - 0.08],
    [hl - 1.10, hgt],
    [-hl + 0.28, hgt],
    [-hl + 0.04, hgt - 0.05, -hl, hgt - 0.45],
    [-hl - 0.02, 0.65]
  ];
  const vanBody = extrudeProfile(T, vanPts, wdt, 0.08, 0.08);
  bodyParts.push(paintGeo(T, vanBody, 0xffffff, 0.06));

  // Panoramic dark glass window band + raked front windscreen
  const fWind = new T.BoxGeometry(wdt * 0.88, 0.74, 0.08);
  fWind.rotateX(-0.34);
  fWind.translate(0, 1.62, hl - 0.44);
  detailParts.push(paintGeo(T, fWind, 0x131c29));

  const sideWin = new T.BoxGeometry(wdt + 0.03, 0.62, len * 0.68);
  sideWin.translate(0, 1.64, -0.35);
  detailParts.push(paintGeo(T, sideWin, 0x131c29));

  const rWind = new T.BoxGeometry(wdt * 0.82, 0.58, 0.06);
  rWind.translate(0, 1.64, -hl - 0.01);
  detailParts.push(paintGeo(T, rWind, 0x131c29));

  // Window pillars (body colored)
  for (let p = -2; p <= 1; p++) {
    const pil = new T.BoxGeometry(wdt + 0.045, 0.64, 0.09);
    pil.translate(0, 1.64, p * 0.92 - 0.1);
    bodyParts.push(paintGeo(T, pil, 0xffffff));
  }

  // Roof AC unit pod
  const acPod = new T.BoxGeometry(1.15, 0.18, 1.45);
  acPod.translate(0, hgt + 0.08, -0.2);
  bodyParts.push(paintGeo(T, acPod, 0xffffff));

  // Heavy-duty Spoked Wheels + Arches
  const wheelR = 0.39;
  const wProto = buildSpokedWheel(T, wheelR, 0.12);
  for (const wz of [hl * 0.58, -hl * 0.56]) {
    for (const side of [-1, 1]) {
      const arch = new T.TorusGeometry(wheelR + 0.05, 0.07, 8, 16, Math.PI);
      arch.rotateY(Math.PI / 2);
      arch.translate(side * (hw - 0.02), wheelR, wz);
      detailParts.push(paintGeo(T, arch, 0x1e242d));

      const w = wProto.clone();
      if (side < 0) w.rotateY(Math.PI);
      w.translate(side * (hw - 0.06), wheelR, wz);
      detailParts.push(w);
    }
  }

  // Bumpers, Grille, Side Mirrors, Door Lines
  const fBump = new T.BoxGeometry(wdt * 0.98, 0.24, 0.18);
  fBump.translate(0, 0.36, hl + 0.02);
  const rBump = fBump.clone();
  rBump.translate(0, 0, -len - 0.04);
  const grille = new T.BoxGeometry(wdt * 0.62, 0.32, 0.06);
  grille.translate(0, 0.78, hl + 0.02);
  detailParts.push(
    paintGeo(T, fBump, 0x181c24),
    paintGeo(T, rBump, 0x181c24),
    paintGeo(T, grille, 0x11141a)
  );
  for (const sd of [-1, 1]) {
    const hlp = new T.BoxGeometry(0.36, 0.16, 0.06); hlp.translate(sd * (hw - 0.30), 0.80, hl + 0.06);
    const tlp = new T.BoxGeometry(0.16, 0.34, 0.05); tlp.translate(sd * (hw - 0.08), 0.95, -hl - 0.04);
    detailParts.push(paintGeo(T, hlp, 0xfff3b0), paintGeo(T, tlp, 0xc81e1e));
  }

  const plateF = new T.BoxGeometry(0.46, 0.11, 0.04);
  plateF.translate(0, 0.36, hl + 0.10);
  const plateR = plateF.clone();
  plateR.translate(0, 0.12, -len - 0.18);
  detailParts.push(paintGeo(T, plateF, 0xfef08a), paintGeo(T, plateR, 0xfef08a));

  for (const side of [-1, 1]) {
    const mir = new T.BoxGeometry(0.12, 0.26, 0.08);
    mir.translate(side * (hw + 0.10), 1.42, hl - 0.52);
    detailParts.push(paintGeo(T, mir, 0x181c24));

    const hlBox = new T.BoxGeometry(0.32, 0.18, 0.08);
    hlBox.translate(side * (hw * 0.72), 0.76, hl + 0.01);
    detailParts.push(paintGeo(T, hlBox, 0xfffbeb));

    const tlBox = new T.BoxGeometry(0.22, 0.42, 0.08);
    tlBox.translate(side * (hw * 0.80), 0.82, -hl - 0.01);
    detailParts.push(paintGeo(T, tlBox, 0xb91c1c));

    const brkBox = new T.BoxGeometry(0.20, 0.38, 0.04);
    brkBox.translate(side * (hw * 0.80), 0.82, -hl - 0.045);
    brakeParts.push(paintGeo(T, brkBox, 0xff2222));
  }

  return {
    bodyGeo: mergeGeometries(bodyParts, false),
    detailGeo: mergeGeometries(detailParts, false),
    brakeGeo: mergeGeometries(brakeParts, false)
  };
}

function normalizeRoadSegs(roadSegs, solidFn, minLen = 5) {
  const valid = [];
  for (let i = 0; i < roadSegs.length; i++) {
    const s = roadSegs[i];
    if (!s) continue;
    const x1 = s.x1 ?? s[0] ?? 0;
    const z1 = s.z1 ?? s[1] ?? 0;
    const x2 = s.x2 ?? s[2] ?? 0;
    const z2 = s.z2 ?? s[3] ?? 0;
    const width = s.width ?? s[6] ?? 8.2;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < minLen) continue;
    const ux = dx / len;
    const uz = dz / len;
    const mx = (x1 + x2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    if (solidFn && solidFn(mx, mz)) continue;
    valid.push({
      x1, z1, x2, z2,
      mx, mz,
      width,
      len,
      ux, uz,
      oneway: !!s.oneway,
      name: s.name || ''
    });
  }
  if (valid.length === 0) {
    valid.push({
      x1: -133, z1: -440, x2: -133, z2: -180,
      mx: -133, mz: -310, width: 10, len: 260, ux: 0, uz: 1, name: '100 Feet Road'
    });
  }
  return valid;
}

export function createTraffic({
  THREE: T = THREE,
  scene,
  roadSegs = [],
  solidFn = () => 0,
  nightUniform,
  getAuto,
  count = 140
}) {
  const totalCount = Math.max(140, count || 140);
  const group = new T.Group();
  scene.add(group);

  const validSegs = normalizeRoadSegs(roadSegs, solidFn);

  // Build high-poly vehicle geometry sets (Body tinted + Detail fixed + Brake emissive)
  const sedanSet = buildCarSet(T, 'sedan');
  const suvSet = buildCarSet(T, 'suv');
  const scooterSet = buildScooterSet(T, true);
  const autoSet = buildAutoRickshawSet(T);
  const tempoSet = buildTempoSet(T);

  const bodyMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.34,
    metalness: 0.28
  });
  const detailMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.48,
    metalness: 0.22
  });
  const brakeMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.3,
    metalness: 0.1,
    emissive: new T.Color(0xff1a1a),
    emissiveIntensity: 1.35
  });

  // Allocate counts across the 5 vehicle types
  const nSedan = Math.round(totalCount * 0.36);
  const nSuv = Math.round(totalCount * 0.20);
  const nScooter = Math.round(totalCount * 0.14);
  const nAuto = Math.round(totalCount * 0.16);
  const nTempo = Math.max(4, totalCount - (nSedan + nSuv + nScooter + nAuto));

  const typeDefs = [
    { key: 'sedan', set: sedanSet, max: nSedan, halfLen: 2.35, minSpeed: 5.5, maxSpeed: 9.0, palette: [0xb9bdc2, 0xf1f1ee, 0x3a4148, 0x6e1f1f, 0x2c3e50, 0x8a8f94, 0x5c4033, 0x1c1e22] },
    { key: 'suv', set: suvSet, max: nSuv, halfLen: 2.50, minSpeed: 5.2, maxSpeed: 8.6, palette: [0xe4e4e0, 0x22262b, 0x4a5058, 0x5e1a1a, 0x24344d, 0x6b5b3e, 0xaeb3b8] },
    { key: 'scooter', set: scooterSet, max: nScooter, halfLen: 1.05, minSpeed: 4.2, maxSpeed: 7.5, palette: [0x4a5568, 0x8a2f2f, 0xd6d3ce, 0x33507a, 0x3f6a63, 0x8a6d2f, 0x5a4a68] },
    { key: 'auto', set: autoSet, max: nAuto, halfLen: 1.55, minSpeed: 3.4, maxSpeed: 6.4, palette: [0x15803d, 0x166534, 0x14532d, 0x1f7a43] },
    { key: 'tempo', set: tempoSet, max: nTempo, halfLen: 3.00, minSpeed: 3.2, maxSpeed: 6.8, palette: [0xeceae4, 0xe2e0d8, 0xcfd2d4, 0xe8dcc0] }
  ];

  // Create 2 InstancedMeshes per vehicle type (Body + Detail) + 1 shared or per-type Brake InstancedMesh
  // To keep draw calls around ~12 total, we use Body + Detail per type (10 meshes) + 2 brake meshes (cars/vans/autos vs scooters) or per-type brake
  const meshesToUpdate = [];
  const colTmp = new T.Color();

  for (let t = 0; t < typeDefs.length; t++) {
    const td = typeDefs[t];
    td.bodyInst = new T.InstancedMesh(td.set.bodyGeo, bodyMat, td.max);
    td.detailInst = new T.InstancedMesh(td.set.detailGeo, detailMat, td.max);
    td.brakeInst = new T.InstancedMesh(td.set.brakeGeo, brakeMat, td.max);

    td.bodyInst.castShadow = true;
    td.bodyInst.receiveShadow = true;
    td.detailInst.castShadow = true;
    td.bodyInst.frustumCulled = false;
    td.detailInst.frustumCulled = false;
    td.brakeInst.frustumCulled = false;

    group.add(td.bodyInst, td.detailInst, td.brakeInst);
    meshesToUpdate.push(td.bodyInst, td.detailInst, td.brakeInst);
  }

  // Helper to get player state safely
  function readPlayer() {
    const raw = getAuto ? getAuto() : null;
    const px = (raw && typeof raw.x === 'number') ? raw.x : -133;
    const pz = (raw && typeof raw.z === 'number') ? raw.z : -345;
    const pyaw = (raw && typeof raw.yaw === 'number') ? raw.yaw
      : ((raw && typeof raw.heading === 'number') ? raw.heading
      : ((raw && typeof raw.rotY === 'number') ? raw.rotY : 0));
    return { x: px, z: pz, hx: Math.sin(pyaw), hz: Math.cos(pyaw) };
  }

  // Pick a road segment & lane position within [minDist, maxDist] of (px, pz), optionally biased ahead of heading
  function pickRoadPlacementRaw(px, pz, hx, hz, minDist, maxDist, biasAhead, seedVal, allowCone) {
    let bestSeg = validSegs[0];
    let bestT = 0.5;
    let bestScore = -1e9;

    const trials = Math.min(validSegs.length, 28);
    const startIdx = Math.floor(hash(seedVal, px + pz, 11) * validSegs.length);

    for (let k = 0; k < trials; k++) {
      const seg = validSegs[(startIdx + k * 5) % validSegs.length];
      const tCand = 0.08 + hash(seedVal + k, seg.mx, 23) * 0.84;
      const cx = seg.x1 + seg.ux * seg.len * tCand;
      const cz = seg.z1 + seg.uz * seg.len * tCand;
      const dx = cx - px;
      const dz = cz - pz;
      const dist = Math.hypot(dx, dz);

      let score = 0;
      if (dist >= minDist && dist <= maxDist) {
        score += 200 - Math.abs(dist - (minDist + maxDist) * 0.5);
      } else {
        score -= Math.abs(dist - (minDist + maxDist) * 0.5);
      }

      if (dist > 1) {
        const dot = (dx * hx + dz * hz) / dist;
        // no visible pop-in: a recycled vehicle must not materialize inside the camera's
        // forward half-cone (hx/hz come from the live camera via getAuto). HARD reject, not a
        // score penalty: the 28-trial stride samples one array-neighborhood, so a soft penalty
        // can still lose to nothing and let an in-view spawn win. If every trial is in-cone the
        // caller falls back to the unconstrained best (last resort only).
        if (!allowCone && dot > 0.5 && dist < 350) continue;
        if (biasAhead) score += dot * 95;
      }

      if (solidFn && solidFn(cx, cz)) {
        score -= 1000;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSeg = seg;
        bestT = tCand;
      }
    }

    return { seg: bestSeg, t: bestT, score: bestScore };
  }

  function pickRoadPlacement(px, pz, hx, hz, minDist, maxDist, biasAhead, seedVal) {
    const r = pickRoadPlacementRaw(px, pz, hx, hz, minDist, maxDist, biasAhead, seedVal, false);
    const used = r.score > -1e8 ? r : pickRoadPlacementRaw(px, pz, hx, hz, minDist, maxDist, biasAhead, seedVal + 31.7, true);
    if (typeof window !== 'undefined') { // DEBUG: pop-in investigation (strip before preview)
      const L = window.__pickLog = window.__pickLog || [];
      window.__pickN=(window.__pickN||0)+1;
      if (true) {
        const cx = used.seg.x1 + used.seg.ux * used.seg.len * used.t, cz = used.seg.z1 + used.seg.uz * used.seg.len * used.t;
        const dx = cx - px, dz = cz - pz, dd = Math.hypot(dx, dz) || 1;
        const BAD = dd2 => dd2 <= 350 && (dx * hx + dz * hz) / dd2 > 0.5;
        const ent = { n: window.__pickN, band: minDist + '-' + maxDist, d: +dd.toFixed(0), dot: +((dx * hx + dz * hz) / dd).toFixed(2), fb: used !== r ? 1 : 0 }; if (BAD(dd)) ent.bad = 1; if (ent.bad || window.__pickN % 25 === 0) L.push(ent); if (L.length > 200) L.splice(0, L.length - 200);
      }
    }
    return used;
  }

  // Compute left-hand traffic lane offset (India keep-left rule)
  function computeLanePos(seg, t, dir) {
    // Preserve stable inner lane offset on doubled roads so junctions never jump 4.2m
    const laneOffset = Math.min(2.05, Math.max(1.35, seg.width * 0.14));
    // Forward vector is (ux * dir, uz * dir). Left-hand side normal in XZ (where +Z is South/North and yaw=atan2(x,z)):
    // Right of (+ux, +uz) is (-uz, ux), Left is (+uz, -ux)
    const x = seg.x1 + seg.ux * seg.len * t + seg.uz * laneOffset * dir;
    const z = seg.z1 + seg.uz * seg.len * t - seg.ux * laneOffset * dir;
    const yaw = Math.atan2(seg.ux * dir, seg.uz * dir);
    return { x, z, yaw };
  }

  const trafficUnits = [];
  const p0 = readPlayer();

  // Collect nearby segments (40m to 220m from initial player pos) so startup traffic is guaranteed visible
  const startupSegs = [];
  for (let i = 0; i < validSegs.length; i++) {
    const s = validSegs[i];
    // Closest point on segment to player
    const apx = p0.x - s.x1;
    const apz = p0.z - s.z1;
    const proj = T.MathUtils.clamp((apx * s.ux + apz * s.uz) / s.len, 0, 1);
    const cx = s.x1 + s.ux * s.len * proj;
    const cz = s.z1 + s.uz * s.len * proj;
    const d = Math.hypot(cx - p0.x, cz - p0.z);
    if (d <= 220) {
      startupSegs.push(s);
    }
  }
  const poolSegs = startupSegs.length > 0 ? startupSegs : validSegs;

  let globalIdx = 0;
  for (let t = 0; t < typeDefs.length; t++) {
    const td = typeDefs[t];
    for (let subIdx = 0; subIdx < td.max; subIdx++) {
      const i = globalIdx++;
      const hex = td.palette[i % td.palette.length];
      colTmp.setHex(hex);
      td.bodyInst.setColorAt(subIdx, colTmp);

      // Spread evenly across nearby segments within 40..220m ahead and behind
      const seg = poolSegs[i % poolSegs.length];
      const dir = (i % 2 === 0) ? 1 : -1;
      const slotCount = Math.max(2, Math.ceil(totalCount / poolSegs.length));
      const slot = Math.floor(i / poolSegs.length) % slotCount;
      let tParam = 0.08 + ((slot + 0.5) / slotCount) * 0.84;
      tParam = (tParam + hash(i, subIdx, 7) * 0.09) % 0.88 + 0.06;

      // Ensure within 40..220m of player at startup; if too close or too far, re-pick
      let pos = computeLanePos(seg, tParam, dir);
      const dist0 = Math.hypot(pos.x - p0.x, pos.z - p0.z);
      let chosenSeg = seg;
      if (dist0 < 28 || dist0 > 225 || (solidFn && solidFn(pos.x, pos.z))) {
        const picked = pickRoadPlacement(p0.x, p0.z, p0.hx, p0.hz, 40, 220, false, i * 13.7);
        chosenSeg = picked.seg;
        tParam = picked.t;
        pos = computeLanePos(chosenSeg, tParam, dir);
      }

      const maxSpd = td.minSpeed + hash(i, t, 31) * (td.maxSpeed - td.minSpeed);
      trafficUnits.push({
        td,
        subIdx,
        seg: chosenSeg,
        t: tParam,
        dir,
        speed: maxSpd * 0.85,
        maxSpeed: maxSpd,
        halfLen: td.halfLen,
        braking: false,
        x: pos.x,
        z: pos.z,
        yaw: pos.yaw,
        kx: 0, kz: 0, kvx: 0, kvz: 0, ks: 0, ksv: 0, ky: 0, kvy: 0, cool: 0
      });
    }
    td.bodyInst.instanceColor.needsUpdate = true;
  }

  const m4 = new T.Matrix4();
  const mBrake = new T.Matrix4();
  const q4 = new T.Quaternion();
  const v3 = new T.Vector3();
  const s3 = new T.Vector3(1.12, 1.12, 1.12);
  const sBrakeOff = new T.Vector3(0.0001, 0.0001, 0.0001);
  const yAxis = new T.Vector3(0, 1, 0);

  function findConnectedSegment(oldSeg, exitX, exitZ, prevUx, prevUz) {
    let bestSeg = null;
    let bestDir = 1;
    let bestScore = -1e9;

    for (let i = 0; i < validSegs.length; i++) {
      const s = validSegs[i];
      if (s === oldSeg && validSegs.length > 1) continue;

      const d1 = Math.hypot(s.x1 - exitX, s.z1 - exitZ);
      const d2 = Math.hypot(s.x2 - exitX, s.z2 - exitZ);

      if (d1 < 22) {
        const align = s.ux * prevUx + s.uz * prevUz;
        const score = 30 - d1 + align * 8;
        if (score > bestScore) {
          bestScore = score;
          bestSeg = s;
          bestDir = 1;
        }
      }
      if (d2 < 22) {
        const align = (-s.ux) * prevUx + (-s.uz) * prevUz;
        const score = 30 - d2 + align * 8;
        if (score > bestScore) {
          bestScore = score;
          bestSeg = s;
          bestDir = -1;
        }
      }
    }
    return bestSeg ? { seg: bestSeg, dir: bestDir } : null;
  }

  function update(dt = 0.016, hour = 17.8) {
    const safeDt = Math.min(0.1, Math.max(0.001, dt || 0.016));
    const player = readPlayer();
    const isNight = (hour >= 18.2 || hour <= 6.2);
    brakeMat.emissiveIntensity = isNight ? 1.85 : 1.35;

    // 1. Group units by (seg, dir) so vehicles slow down and queue behind a leader
    const laneMap = new Map();
    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      let segList = laneMap.get(tu.seg);
      if (!segList) {
        segList = { f: [], r: [] };
        laneMap.set(tu.seg, segList);
      }
      if (tu.dir === 1) segList.f.push(tu);
      else segList.r.push(tu);
    }

    // 2. Evaluate leader gaps & braking along each lane
    for (const [, lanes] of laneMap) {
      // Forward lane (dir = +1): higher t is ahead
      if (lanes.f.length > 1) {
        lanes.f.sort((a, b) => a.t - b.t);
      }
      for (let i = 0; i < lanes.f.length; i++) {
        const u = lanes.f[i];
        let targetSpd = u.maxSpeed;
        let braking = false;
        if (i + 1 < lanes.f.length) {
          const leader = lanes.f[i + 1];
          const centerDist = (leader.t - u.t) * u.seg.len;
          const gap = centerDist - (leader.halfLen + u.halfLen);
          if (gap < 9.5) {
            braking = true;
            if (gap < 2.2) {
              targetSpd = 0;
            } else {
              targetSpd = Math.min(u.maxSpeed, leader.speed * ((gap - 1.8) / 7.7));
            }
          }
        }
        // Also slow down if player auto is directly ahead in the same lane
        const dpX = player.x - u.x;
        const dpZ = player.z - u.z;
        const fwdDot = dpX * u.seg.ux + dpZ * u.seg.uz;
        const latDot = Math.abs(-dpX * u.seg.uz + dpZ * u.seg.ux);
        if (fwdDot > 0 && fwdDot < 14 && latDot < 2.6) {
          braking = true;
          targetSpd = Math.min(targetSpd, Math.max(0, (fwdDot - (u.halfLen + 3.0)) * 0.9));
        }

        u.braking = braking || (u.speed - targetSpd > 0.45);
        const accel = targetSpd < u.speed ? 7.5 : 3.2;
        u.speed += T.MathUtils.clamp(targetSpd - u.speed, -accel * safeDt, accel * safeDt);
        u.speed = Math.max(0, u.speed);
      }

      // Reverse/Oncoming lane (dir = -1): lower t is ahead
      if (lanes.r.length > 1) {
        lanes.r.sort((a, b) => b.t - a.t);
      }
      for (let i = 0; i < lanes.r.length; i++) {
        const u = lanes.r[i];
        let targetSpd = u.maxSpeed;
        let braking = false;
        if (i + 1 < lanes.r.length) {
          const leader = lanes.r[i + 1];
          const centerDist = (u.t - leader.t) * u.seg.len;
          const gap = centerDist - (leader.halfLen + u.halfLen);
          if (gap < 9.5) {
            braking = true;
            if (gap < 2.2) {
              targetSpd = 0;
            } else {
              targetSpd = Math.min(u.maxSpeed, leader.speed * ((gap - 1.8) / 7.7));
            }
          }
        }
        const dpX = player.x - u.x;
        const dpZ = player.z - u.z;
        const fwdDot = (dpX * u.seg.ux + dpZ * u.seg.uz) * u.dir;
        const latDot = Math.abs(-dpX * u.seg.uz + dpZ * u.seg.ux);
        if (fwdDot > 0 && fwdDot < 12 && latDot < 2.4) {
          braking = true;
          targetSpd = Math.min(targetSpd, Math.max(0, (fwdDot - 4.0) * 0.8));
        }

        u.braking = braking || (u.speed - targetSpd > 0.45);
        const accel = targetSpd < u.speed ? 7.5 : 3.2;
        u.speed += T.MathUtils.clamp(targetSpd - u.speed, -accel * safeDt, accel * safeDt);
        u.speed = Math.max(0, u.speed);
      }
    }

    // 3. Advance positions, transition segments, recycle distant units, and write matrices
    for (let i = 0; i < trafficUnits.length; i++) {
      const tu = trafficUnits[i];
      if (tu.seg.oneway) tu.dir = 1;
      let forceRecycle = false;
      tu.t += (tu.dir * tu.speed * safeDt) / tu.seg.len;
      tu.__transCd = (tu.__transCd || 0) - (tu.__transCd > 0 ? 1 : 0);
      if (tu.__transCd > 0 && (tu.t > 0.995 || tu.t < 0.005)) { tu.t = T.MathUtils.clamp(tu.t, 0.005, 0.995); tu.__transCd = 0; }

      // Segment boundary transition
      if (!(tu.__transCd > 0) && (tu.dir === 1 ? tu.t > 0.97 : tu.t < 0.03)) {
        const exitX = tu.t > 0.5 ? tu.seg.x2 : tu.seg.x1;
        const exitZ = tu.t > 0.5 ? tu.seg.z2 : tu.seg.z1;
        const fUx = tu.seg.ux * tu.dir;
        const fUz = tu.seg.uz * tu.dir;
        const next = findConnectedSegment(tu.seg, exitX, exitZ, fUx, fUz);
        const nxt = next && !(next.seg.oneway && next.dir !== 1) ? next : null;
        let jumpOk = !!nxt; let jumpD = -1; let gapLon = 0;
        if (nxt) { const cp = computeLanePos(tu.seg, T.MathUtils.clamp(tu.t, 0, 1), tu.dir); const np2 = computeLanePos(nxt.seg, nxt.dir === 1 ? 0 : 1, nxt.dir); const dxj = np2.x - cp.x, dzj = np2.z - cp.z; gapLon = dxj * fUx + dzj * fUz; const gapLat = -dxj * fUz + dzj * fUx; jumpD = Math.hypot(dxj, dzj); if (Math.abs(gapLat) > 3.5 || gapLon < -2 || gapLon > 18) jumpOk = false; }
        if (typeof window !== 'undefined') { const W = window.__trc = window.__trc || { trans: 0, failNext: 0, failJump: 0, held: 0, recycled: 0, log: [] }; if (nxt && jumpOk) W.trans++; else { if (!nxt) W.failNext++; else W.failJump++; if (W.log.length < 24) W.log.push({ seg: tu.seg.name, t: +tu.t.toFixed(3), dir: tu.dir, ow: tu.seg.oneway ? 1 : 0, nxt: nxt ? nxt.seg.name : null, jumpD: +jumpD.toFixed(2), exit: [ +exitX.toFixed(1), +exitZ.toFixed(1) ] }); } }
        if (nxt && jumpOk) {
          // Continuity-first entry: project the CURRENT rendered position onto the new
          // segment's axis (computeLanePos t is geometric along p1->p2 regardless of dir),
          // then accept only if the ACTUAL clamped entry renders within 3.5m of where the
          // unit was this frame. Otherwise fall through to the existing fail path so a
          // discontinuous junction never produces a visible one-frame blink.
          const cpT = T.MathUtils.clamp(tu.t, 0, 1);
          const cp2 = computeLanePos(tu.seg, cpT, tu.dir);
          // chained handoff mid-blend: use the DRAWN pose (lane + residual blend), not the
          // pure lane pose, so a second transition on a short segment carries the leftover
          // offset instead of snapping it away, and the 9m accept test sees the true jump
          const drawnX = cp2.x + (tu.bx || 0), drawnZ = cp2.z + (tu.bz || 0);
          const drawnYaw = cp2.yaw + (tu.byaw || 0);
          const tProj = ((drawnX - nxt.seg.x1) * nxt.seg.ux + (drawnZ - nxt.seg.z1) * nxt.seg.uz) / (nxt.seg.len || 1);
          const tC = T.MathUtils.clamp(tProj, 0.005, 0.995);
          const npA = computeLanePos(nxt.seg, tC, nxt.dir);
          const realJump = Math.hypot(npA.x - drawnX, npA.z - drawnZ);
          if (realJump <= 9 && (nxt.dir === 1 ? tC <= 0.96 : tC >= 0.04)) {
            const prevYaw = drawnYaw;
            tu.seg = nxt.seg;
            tu.dir = nxt.dir;
            tu.__site = 'trans';
            // continuity blend: start the new lane exactly where the unit rendered this
            // frame and decay the residual offset over ~1.5s, so the unit visibly DRIVES
            // across the junction gap instead of blinking. Applied to tu.x/tu.z below,
            // which solid() also reads, so collider and render stay in sync.
            tu.bx = drawnX - npA.x;
            tu.bz = drawnZ - npA.z;
            let dy = prevYaw - npA.yaw;
            while (dy > Math.PI) dy -= 2 * Math.PI;
            while (dy < -Math.PI) dy += 2 * Math.PI;
            tu.byaw = dy;
            // a short cooldown replaces the old positional clamp: entry lands at the true
            // projected point for rendered continuity, and the boundary check is skipped
            // for ~1.5s so the unit cannot instantly re-trigger a transition at the entry
            // (previously avoided by clamping t, which introduced the visible blink)
            tu.__transCd = 45;
            tu.t = tC;
          } else {
            jumpOk = false;
            if (typeof window !== 'undefined' && window.__trc) { window.__trc.trans--; window.__trc.failJump++; }
          }
        }
        if (!(nxt && jumpOk)) {
          if (tu.seg.oneway) {
            forceRecycle = true;
          } else {
            tu.dir *= -1;
            tu.t = T.MathUtils.clamp(tu.t, 0.04, 0.96);
          }
        }
      }

      let pos = computeLanePos(tu.seg, tu.t, tu.dir);

      // Recycle if further than 260m from player OR inside a solid cell -> place 80..200m ahead of player heading
      const dx = pos.x - player.x;
      const dz = pos.z - player.z;
      const dist = Math.hypot(dx, dz);
      const wantsRecycle = forceRecycle || dist > 320 || (solidFn && solidFn(pos.x, pos.z));
      if (typeof window !== 'undefined' && wantsRecycle) { window.__trc = window.__trc || { trans:0,failNext:0,failJump:0,held:0,recycled:0,log:[] }; if (dist <= 200 && tu.lastSeg) window.__trc.held++; else window.__trc.recycled++; }
      if (wantsRecycle && dist <= 200 && tu.lastSeg) {
        // never pop a vehicle in or out where the player can see it: hold at the last good spot until the player is far
        tu.__held = (tu.__held || 0) + 1; tu.__why = forceRecycle ? 'force' : (dist > 320 ? 'dist' : 'solid');
        tu.seg = tu.lastSeg; tu.t = tu.lastT; tu.speed = 0; tu.dir = tu.lastDir; tu.__site = 'hold'; tu.ox = (tu.ox || 0) + tu.bx; tu.oz = (tu.oz || 0) + tu.bz; tu.oyaw = (tu.oyaw || 0) + (tu.byaw || 0); tu.bx = 0; tu.bz = 0; tu.byaw = 0; tu.__transCd = 0;
        pos = computeLanePos(tu.seg, tu.t, tu.dir);
      } else if (wantsRecycle) {
        const picked = pickRoadPlacement(player.x, player.z, player.hx, player.hz, 210, 300, true, i + tu.t * 100);
        const cand = computeLanePos(picked.seg, picked.t, picked.seg.oneway ? 1 : ((i % 2 === 0) ? 1 : -1));
        if (Math.hypot(cand.x - player.x, cand.z - player.z) >= 190) {
          tu.seg = picked.seg; tu.__site = 'pick';
          tu.t = picked.t;
          tu.dir = picked.seg.oneway ? 1 : ((i % 2 === 0) ? 1 : -1);
          tu.speed = tu.maxSpeed * 0.8;
          if (typeof window !== 'undefined') { const R = window.__rcLog = window.__rcLog || []; if (R.length < 300) R.push({ i, d: +Math.hypot(cand.x - player.x, cand.z - player.z).toFixed(0) }); } // DEBUG strip
          tu.ox = tu.oz = tu.oyaw = 0; tu.bx = tu.bz = tu.byaw = 0; tu.__transCd = 0;
          pos = computeLanePos(tu.seg, tu.t, tu.dir);
        } else if (tu.lastSeg) { tu.seg = tu.lastSeg; tu.t = tu.lastT; tu.dir = tu.lastDir; tu.speed = 0; tu.__site = 'revert'; tu.ox = (tu.ox || 0) + tu.bx; tu.oz = (tu.oz || 0) + tu.bz; tu.oyaw = (tu.oyaw || 0) + (tu.byaw || 0); tu.bx = 0; tu.bz = 0; tu.byaw = 0; tu.__transCd = 0; pos = computeLanePos(tu.seg, tu.t, tu.dir); }
      }

      if (typeof window !== 'undefined' && typeof tu.x === 'number') { const J = window.__jumpLog = window.__jumpLog || []; const jdx = pos.x - tu.x, jdz = pos.z - tu.z; if (Math.hypot(jdx, jdz) > 40 && J.length < 200) J.push({ i, site: tu.__site || 'none', tseg: tu.seg && tu.seg.name || '', from: [+tu.x.toFixed(0), +tu.z.toFixed(0)], to: [+pos.x.toFixed(0), +pos.z.toFixed(0)] }); } // DEBUG strip
      tu.lastSeg = tu.seg; tu.lastT = tu.t; tu.lastDir = tu.dir;
      // impact kick: damped spring, quick hop, spin decay. The offset is steadily
      // baked into a persistent displacement (ox/oz/oyaw) so a struck vehicle
      // STAYS where the impact left it instead of springing back to its lane.
      if (tu.kx || tu.kz || tu.kvx || tu.kvz || tu.ks || tu.ksv || tu.ky > 0 || tu.kvy > 0 || tu.cool > 0) {
        // free slide with friction, NO restoring spring: the vehicle lands where the hit sends it
        const fr = Math.exp(-3.2 * safeDt), frs = Math.exp(-4.5 * safeDt);
        tu.ox = (tu.ox || 0) + tu.kvx * safeDt; tu.oz = (tu.oz || 0) + tu.kvz * safeDt;
        tu.oyaw = (tu.oyaw || 0) + tu.ksv * safeDt;
        tu.kvx *= fr; tu.kvz *= fr; tu.ksv *= frs;
        if (tu.ky > 0 || tu.kvy > 0) { tu.kvy -= 26 * safeDt; tu.ky += tu.kvy * safeDt; if (tu.ky < 0) { tu.ky = 0; tu.kvy = 0; } }
        if (tu.cool > 0) tu.cool -= safeDt;
        if (Math.abs(tu.kvx) + Math.abs(tu.kvz) < 0.05) { tu.kvx = 0; tu.kvz = 0; }
        if (Math.abs(tu.ksv) < 0.05) tu.ksv = 0;
      }
      // impact state owns the unit's displacement: cancel any transition blend so the
      // collision sweep's lane-space tests and the rendered/knocked position never diverge
      if (tu.kx || tu.kz || tu.kvx || tu.kvz || tu.ks || tu.ksv || tu.ky > 0 || tu.kvy > 0 || tu.cool > 0 || tu.wreck) { if (tu.bx || tu.bz || tu.byaw) { tu.ox = (tu.ox || 0) + tu.bx; tu.oz = (tu.oz || 0) + tu.bz; tu.oyaw = (tu.oyaw || 0) + (tu.byaw || 0); tu.bx = 0; tu.bz = 0; tu.byaw = 0; } }
      if (tu.bx || tu.bz) { const bl = Math.hypot(tu.bx, tu.bz), dd = 6.5 * safeDt; if (bl <= dd) { tu.bx = 0; tu.bz = 0; } else { tu.bx *= (bl - dd) / bl; tu.bz *= (bl - dd) / bl; } }
      if (tu.byaw) { const ay = Math.abs(tu.byaw), dy2 = 2.2 * safeDt; tu.byaw = ay <= dy2 ? 0 : tu.byaw * (ay - dy2) / ay; }
      tu.x = pos.x + (tu.ox || 0) + (tu.kx || 0) + (tu.bx || 0);
      tu.z = pos.z + (tu.oz || 0) + (tu.kz || 0) + (tu.bz || 0);
      tu.yaw = pos.yaw + (tu.oyaw || 0) + (tu.ks || 0) + (tu.byaw || 0);

      q4.setFromAxisAngle(yAxis, tu.yaw);
      v3.set(tu.x, tu.ky || 0, tu.z);
      m4.compose(v3, q4, s3);

      tu.td.bodyInst.setMatrixAt(tu.subIdx, m4);
      tu.td.detailInst.setMatrixAt(tu.subIdx, m4);

      if (tu.braking || isNight) {
        tu.td.brakeInst.setMatrixAt(tu.subIdx, m4);
      } else {
        mBrake.compose(v3, q4, sBrakeOff);
        tu.td.brakeInst.setMatrixAt(tu.subIdx, mBrake);
      }
    }

    for (let m = 0; m < meshesToUpdate.length; m++) {
      meshesToUpdate[m].instanceMatrix.needsUpdate = true;
    }
  }

  // Run one initial update step so matrices are immediately populated at frame 0
  update(0.016, 17.8);

  const HW = { sedan: 1.05, suv: 1.1, scooter: 0.55, auto: 0.9, tempo: 1.2 };
  function solid(x, z) {
    for (let i = 0; i < trafficUnits.length; i++) {
      const u = trafficUnits[i];
      const dx = x - u.x, dz = z - u.z;
      if (dx * dx + dz * dz > 49) continue;
      const s1 = Math.sin(u.yaw), c1 = Math.cos(u.yaw);
      const lx = dx * c1 - dz * s1, lz = dx * s1 + dz * c1;
      if (Math.abs(lx) < (HW[u.td.key] || 1.0) * 1.1 && Math.abs(lz) < u.halfLen * 1.12) return true;
    }
    return false;
  }

  // shove the nearest unit (collision impact reaction)
  function kickAt(x, z, dx, dz, power) {
    let best = null, bestD = 3.2 * 3.2;
    for (let i = 0; i < trafficUnits.length; i++) {
      const u = trafficUnits[i];
      const ddx = u.x - x, ddz = u.z - z;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < bestD) { bestD = d2; best = u; }
    }
    if (!best || best.cool > 0) return false;
    const airborne = (best.ky || 0) > 0.02; // never stack a second launch mid-flight
    const mass = best.halfLen < 1.5 ? 1.5 : (best.halfLen > 2.8 ? 0.7 : 1.0);
    const p2 = power * mass;
    best.kvx += dx * p2;
    best.kvz += dz * p2;
    const side = (best.x - x) * dz - (best.z - z) * dx;
    best.ksv += (side >= 0 ? 1 : -1) * p2 * 0.6;
    // user bar: a struck vehicle must visibly leave the ground, not just shove sideways
    if (!airborne) best.kvy = Math.min(12, Math.max(best.kvy, 4.5 + p2 * 1.15));
    best.cool = 0.55;
    return true;
  }

  return { group, update, solid, units: trafficUnits, kickAt, __segs: roadSegs, __validSegs: validSegs, __findNext: findConnectedSegment };
}

export function createParkedVehicles({
  THREE: T = THREE,
  scene,
  roadSegs = [],
  solidFn = () => 0,
  nightUniform,
  seed = 42,
  getAuto
}) {
  const group = new T.Group();
  scene.add(group);

  const validSegs = normalizeRoadSegs(roadSegs, solidFn);
  const obstructionSegs = normalizeRoadSegs(roadSegs, null, 6); // junction-mouth shorts included: never let verge spots leak onto their lanes

  // 1. Build geometry sets for parked vehicle types
  const hatchSet = buildCarSet(T, 'hatch');
  const sedanSet = buildCarSet(T, 'sedan');
  const suvSet = buildCarSet(T, 'suv');
  const autoSet = buildAutoRickshawSet(T);
  const scooterSet = buildScooterSet(T, false);
  const bikeSet = buildSpokedWheel(T, 0.32, 0.08); // fallback/placeholder or standalone bike representation if needed, or use scooterSet for bikes

  const bodyMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.36,
    metalness: 0.26
  });
  const detailMat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.50,
    metalness: 0.20
  });

  // Helper checks
  function isOnAnyRoad(px, pz, ignoreSeg) {
    const obsList = (typeof obstructionSegs !== 'undefined') ? obstructionSegs : validSegs;
    let leftPar = false, rightPar = false;
    for (let i = 0; i < obsList.length; i++) {
      const s = obsList[i];
      const apx = px - s.x1;
      const apz = pz - s.z1;
      const proj = (apx * s.ux + apz * s.uz) / s.len;
      if (proj < -0.08 || proj > 1.08) continue;
      const clamped = T.MathUtils.clamp(proj, 0, 1);
      const cx = s.x1 + s.ux * s.len * clamped;
      const cz = s.z1 + s.uz * s.len * clamped;
      const d = Math.hypot(px - cx, pz - cz);
      if (s !== ignoreSeg && d < s.width * 0.5 + 1.8) return true;
      if (ignoreSeg && Math.abs(s.ux * ignoreSeg.ux + s.uz * ignoreSeg.uz) > 0.88 && d < 26) {
        const cr = (px - s.x1) * ignoreSeg.uz - (pz - s.z1) * ignoreSeg.ux;
        if (cr > 1.5) leftPar = true;
        else if (cr < -1.5) rightPar = true;
      }
    }
    return leftPar && rightPar;
  }

  function isClearOfSolids(px, pz, halfFootprint) {
    if (!solidFn) return true;
    if (solidFn(px, pz)) return false;
    if (solidFn(px + halfFootprint, pz)) return false;
    if (solidFn(px - halfFootprint, pz)) return false;
    if (solidFn(px, pz + halfFootprint)) return false;
    if (solidFn(px, pz - halfFootprint)) return false;
    return true;
  }

  // Precompute ALL spots across the map
  const allSpots = [];
  const spatialGrid = new Map();
  const cellSize = 40;

  function addToGrid(spot) {
    const cx = Math.floor(spot.x / cellSize);
    const cz = Math.floor(spot.z / cellSize);
    const key = `${cx},${cz}`;
    let cell = spatialGrid.get(key);
    if (!cell) {
      cell = [];
      spatialGrid.set(key, cell);
    }
    spot.cellKey = key;
    cell.push(spot);
  }

  for (let i = 0; i < validSegs.length; i++) {
    const s = validSegs[i];
    if (s.len < 15) continue;
    const baseYaw = Math.atan2(s.ux, s.uz);

    const isDense = s.name && (
      s.name.includes('100 Feet') ||
      s.name.includes('12th Main') ||
      s.name.includes('Chinmaya')
    );
    const step = isDense ? 5.5 : 9.5;

    for (let d = 5; d < s.len - 5; d += step + hash(s.x1 + d, s.z1, seed) * 2.5) {
      for (const side of [-1, 1]) {
        // Outer verge placement
        const vergeOff = s.width * 0.5 + 2.65;
        const px = s.x1 + s.ux * d + s.uz * vergeOff * side;
        const pz = s.z1 + s.uz * d - s.ux * vergeOff * side;

        if (Math.hypot(px - (-133), pz - (-345)) < 16) continue;
        if (!isClearOfSolids(px, pz, 1.45)) continue;
        if (isOnAnyRoad(px, pz, s)) continue;

        const h = hash(px, pz, seed);
        const dirYaw = (s.oneway || side === 1) ? baseYaw : baseYaw + Math.PI;

        // Classify type: hatch, sedan, suv, autoRickshaw, scooter, bike
        let type = 'hatch';
        let colorIdx = Math.floor(h * 99) % 7;
        if (h > 0.82) type = 'suv';
        else if (h > 0.65) type = 'sedan';
        else if (h > 0.45) type = 'autoRickshaw';
        else if (h > 0.20) type = 'scooter';
        else if (h > 0.10) type = 'bike';
        else type = 'hatch';

        const spot = {
          x: px,
          z: pz,
          yaw: dirYaw + (h - 0.5) * 0.12,
          type,
          colorIdx,
          ox: 0, oz: 0, ky: 0, oyaw: 0, vx: 0, vz: 0, vy: 0, vaw: 0, cool: 0, m: null, idx: -1
        };
        allSpots.push(spot);
        addToGrid(spot);
      }
    }
  }

  // Define capacities as requested: hatch 70, sedan 50, suv 30, autoRickshaw 24, scooter 110, bike 40
  const capacities = {
    hatch: 70,
    sedan: 50,
    suv: 30,
    autoRickshaw: 24,
    scooter: 110,
    bike: 40
  };

  const palettes = {
    hatch: [0x8a929a, 0xd6d9dc, 0x2e343a, 0x7a2424, 0x2a3f5c, 0x4a5a58, 0x7a5a2a],
    sedan: [0xb9bdc2, 0xf1f1ee, 0x3a4148, 0x6e1f1f, 0x2c3e50, 0x8a8f94, 0x5c1f1f],
    suv: [0xe4e4e0, 0x22262b, 0x4a5058, 0x5e1a1a, 0x24344d, 0x6b5b3e, 0xaeb3b8],
    autoRickshaw: [0x15803d, 0x166534, 0x14532d, 0x1f7a43],
    scooter: [0xd6d3ce, 0x4a6a8a, 0x8a2f3f, 0x2e343a, 0x5a5a6e, 0x3f6a5a],
    bike: [0x1a1c20, 0x334155, 0x64748b, 0x94a3b8]
  };

  const typeDefs = [
    { key: 'hatch', set: hatchSet, max: capacities.hatch },
    { key: 'sedan', set: sedanSet, max: capacities.sedan },
    { key: 'suv', set: suvSet, max: capacities.suv },
    { key: 'autoRickshaw', set: autoSet, max: capacities.autoRickshaw },
    { key: 'scooter', set: scooterSet, max: capacities.scooter },
    { key: 'bike', set: scooterSet, max: capacities.bike } // reuse scooter set or compact geo for bike
  ];

  const meshes = {};
  for (const td of typeDefs) {
    const bodyInst = new T.InstancedMesh(td.set.bodyGeo, bodyMat, td.max);
    const detailInst = new T.InstancedMesh(td.set.detailGeo, detailMat, td.max);
    bodyInst.castShadow = true;
    detailInst.castShadow = true;
    bodyInst.frustumCulled = false;
    detailInst.frustumCulled = false;
    bodyInst.count = 0;
    detailInst.count = 0;
    group.add(bodyInst, detailInst);
    meshes[td.key] = { bodyInst, detailInst };
  }

  const m4 = new T.Matrix4();
  const q4 = new T.Quaternion();
  const v3 = new T.Vector3();
  const s3 = new T.Vector3(1.12, 1.12, 1.12);
  const yAxis = new T.Vector3(0, 1, 0);
  const colC = new T.Color();
  const hiddenMatrix = new T.Matrix4().makeScale(0, 0, 0);

  let accumDt = 0;

  function refreshStreaming(forced = false) {
    let px = -133;
    let pz = -345;
    if (getAuto) {
      const auto = getAuto();
      if (auto && typeof auto.x === 'number') px = auto.x;
      if (auto && typeof auto.z === 'number') pz = auto.z;
    }

    // Gather spots within 130m using spatial grid
    const centerCellX = Math.floor(px / cellSize);
    const centerCellZ = Math.floor(pz / cellSize);
    const nearbySpots = [];
    const radiusCells = Math.ceil(130 / cellSize);

    for (let cx = centerCellX - radiusCells; cx <= centerCellX + radiusCells; cx++) {
      for (let cz = centerCellZ - radiusCells; cz <= centerCellZ + radiusCells; cz++) {
        const cell = spatialGrid.get(`${cx},${cz}`);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const sp = cell[i];
          const distSq = (sp.x - px) * (sp.x - px) + (sp.z - pz) * (sp.z - pz);
          if (distSq <= 130 * 130) {
            nearbySpots.push({ spot: sp, distSq });
          }
        }
      }
    }

    // Sort by distance (nearest first)
    nearbySpots.sort((a, b) => a.distSq - b.distSq);

    // Group by type and fill up to capacity
    const typeBuckets = {
      hatch: [],
      sedan: [],
      suv: [],
      autoRickshaw: [],
      scooter: [],
      bike: []
    };

    for (let i = 0; i < nearbySpots.length; i++) {
      const item = nearbySpots[i];
      const t = item.spot.type;
      if (typeBuckets[t] && typeBuckets[t].length < capacities[t]) {
        typeBuckets[t].push(item.spot);
      }
    }

    // Update InstancedMeshes
    for (const sp of instancedSpots) { sp.m = null; sp.idx = -1; }
    instancedSpots.length = 0;
    for (const td of typeDefs) {
      const key = td.key;
      const list = typeBuckets[key] || [];
      const m = meshes[key];
      const maxCap = capacities[key];
      const palette = palettes[key];

      m.bodyInst.count = list.length;
      m.detailInst.count = list.length;

      for (let i = 0; i < maxCap; i++) {
        if (i < list.length) {
          const sp = list[i];
          q4.setFromAxisAngle(yAxis, sp.yaw + (sp.oyaw || 0));
          v3.set(sp.x + (sp.ox || 0), sp.ky || 0, sp.z + (sp.oz || 0));
          m4.compose(v3, q4, s3);
          sp.m = m; sp.idx = i;
          instancedSpots.push(sp);
          m.bodyInst.setMatrixAt(i, m4);
          m.detailInst.setMatrixAt(i, m4);

          const hex = palette[sp.colorIdx % palette.length];
          colC.setHex(hex);
          m.bodyInst.setColorAt(i, colC);
        } else {
          // Hide unused instances
          m.bodyInst.setMatrixAt(i, hiddenMatrix);
          m.detailInst.setMatrixAt(i, hiddenMatrix);
        }
      }

      m.bodyInst.instanceMatrix.needsUpdate = true;
      m.detailInst.instanceMatrix.needsUpdate = true;
      if (m.bodyInst.instanceColor) m.bodyInst.instanceColor.needsUpdate = true;
    }
  }

  const instancedSpots = [];
  const activeParked = new Set();
  if (typeof window !== 'undefined') window.__parkedSpots = () => instancedSpots.map(sp => ({ x: +sp.x.toFixed(1), z: +sp.z.toFixed(1), type: sp.type, yaw: +sp.yaw.toFixed(2) }));

  // Initial populate
  refreshStreaming(true);

  function update(dt = 0.016) {
    if (activeParked.size) {
      for (const sp of activeParked) {
        // free slide with friction, NO restoring spring: it stays where the impact leaves it
        const fr = Math.exp(-3.2 * dt), frs = Math.exp(-4.5 * dt);
        sp.x += sp.vx * dt; sp.z += sp.vz * dt; sp.yaw += sp.vaw * dt;
        sp.vx *= fr; sp.vz *= fr; sp.vaw *= frs;
        sp.ox = sp.oz = sp.oyaw = 0;
        if (sp.ky > 0 || sp.vy > 0) { sp.vy -= 26 * dt; sp.ky += sp.vy * dt; if (sp.ky < 0) { sp.ky = 0; sp.vy = 0; } }
        sp.cool -= dt;
        if (sp.m && sp.idx >= 0) {
          q4.setFromAxisAngle(yAxis, sp.yaw + sp.oyaw);
          v3.set(sp.x + sp.ox, sp.ky, sp.z + sp.oz);
          m4.compose(v3, q4, s3);
          sp.m.bodyInst.setMatrixAt(sp.idx, m4);
          sp.m.detailInst.setMatrixAt(sp.idx, m4);
          sp.m.bodyInst.instanceMatrix.needsUpdate = true;
          sp.m.detailInst.instanceMatrix.needsUpdate = true;
        }
        if (sp.cool <= 0 && Math.abs(sp.vx) + Math.abs(sp.vz) + Math.abs(sp.vaw) < 0.05 && Math.abs(sp.ox) + Math.abs(sp.oz) + Math.abs(sp.oyaw) < 0.01 && sp.ky === 0) {
          sp.ox = sp.oz = sp.oyaw = 0; sp.vx = sp.vz = sp.vaw = 0;
          activeParked.delete(sp);
          // the impact moved it for real: keep collision lookup correct across cells
          const nc = Math.floor(sp.x / cellSize) + ',' + Math.floor(sp.z / cellSize);
          if (sp.cellKey !== nc) {
            const oldCell = spatialGrid.get(sp.cellKey);
            if (oldCell) { const oi = oldCell.indexOf(sp); if (oi >= 0) oldCell.splice(oi, 1); }
            let nCell = spatialGrid.get(nc); if (!nCell) { nCell = []; spatialGrid.set(nc, nCell); }
            nCell.push(sp); sp.cellKey = nc;
          }
        }
      }
    }
    accumDt += dt;
    if (accumDt >= 0.35) {
      accumDt = 0;
      refreshStreaming(false);
    }
  }

  // shove the nearest parked vehicle (collision impact reaction)
  function kickAt(x, z, dx, dz, power) {
    const cx = Math.floor(x / cellSize), cz = Math.floor(z / cellSize);
    let best = null, bestD = 3.0 * 3.0;
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      const cell = spatialGrid.get(`${i},${j}`);
      if (!cell) continue;
      for (let k = 0; k < cell.length; k++) {
        const sp = cell[k];
        const ddx = sp.x - x, ddz = sp.z - z;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < bestD) { bestD = d2; best = sp; }
      }
    }
    if (!best || best.cool > 0) return false;
    const airborne = (best.ky || 0) > 0.02;
    const light = (best.type === 'scooter' || best.type === 'bike') ? 1.6 : (best.type === 'autoRickshaw' ? 1.1 : 0.7);
    const p = power * light;
    best.vx += dx * p; best.vz += dz * p;
    const side = (best.x - x) * dz - (best.z - z) * dx;
    best.vaw += (side >= 0 ? 1 : -1) * p * 0.65;
    // same visible-airborne bar for parked vehicles
    if (!airborne) best.vy = Math.min(12, Math.max(best.vy, 4 + p * 1.05));
    best.cool = 0.55;
    activeParked.add(best);
    return true;
  }

  const HALF = { hatch: [0.95, 2.25], sedan: [1.0, 2.55], suv: [1.1, 2.55], autoRickshaw: [0.85, 1.6], scooter: [0.5, 1.05], bike: [0.45, 1.05] };
  function solid(x, z) {
    const cx = Math.floor(x / cellSize), cz = Math.floor(z / cellSize);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      const cell = spatialGrid.get(`${i},${j}`);
      if (!cell) continue;
      for (let k = 0; k < cell.length; k++) {
        const sp = cell[k];
        const dx = x - sp.x, dz = z - sp.z;
        if (dx * dx + dz * dz > 25) continue;
        const h = HALF[sp.type] || [0.9, 2.1];
        const s1 = Math.sin(sp.yaw), c1 = Math.cos(sp.yaw);
        const lx = dx * c1 - dz * s1, lz = dx * s1 + dz * c1;
        if (Math.abs(lx) < h[0] && Math.abs(lz) < h[1]) return true;
      }
    }
    return false;
  }

  // Does a circle (x,z,r) overlap any parked-vehicle footprint? Full generated spot list, rotated type half-extents (scoped extraction from collision worker v25, reference only - physics candidate stays separate)
  function overlaps(x, z, r = 0) {
    for (const sp of allSpots) {
      const dx = x - sp.x, dz = z - sp.z;
      if (dx * dx + dz * dz > 36) continue;
      const h = HALF[sp.type] || [0.9, 2.1], s1 = Math.sin(sp.yaw), c1 = Math.cos(sp.yaw);
      const lx = dx * c1 - dz * s1, lz = dx * s1 + dz * c1;
      if (Math.abs(lx) < h[0] + r && Math.abs(lz) < h[1] + r) return true;
    }
    return false;
  }
  return { group, update, solid, kickAt, overlaps };
}
