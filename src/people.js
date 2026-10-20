// src/people.js
import * as THREE from 'three';

export function createCrowd({ THREE: T = THREE, scene, roadSegs = [], solidFn = () => 0, getAuto, nightUniform, count = 120 }) {
  const group = new T.Group();
  scene.add(group);

  const torsoGeo = new T.BoxGeometry(0.38, 0.62, 0.24);
  const headGeo = new T.SphereGeometry(0.16, 8, 8);
  const legGeo = new T.BoxGeometry(0.14, 0.52, 0.14);
  const armGeo = new T.BoxGeometry(0.12, 0.50, 0.12);

  const shirtMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 });
  const pantMat = new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const skinMat = new T.MeshStandardMaterial({ color: 0xd4946a, roughness: 0.65 });

  const torsoInst = new T.InstancedMesh(torsoGeo, shirtMat, count);
  const headInst = new T.InstancedMesh(headGeo, skinMat, count);
  const legLInst = new T.InstancedMesh(legGeo, pantMat, count);
  const legRInst = new T.InstancedMesh(legGeo, pantMat, count);
  const armLInst = new T.InstancedMesh(armGeo, shirtMat, count);
  const armRInst = new T.InstancedMesh(armGeo, shirtMat, count);

  torsoInst.castShadow = true;
  group.add(torsoInst, headInst, legLInst, legRInst, armLInst, armRInst);

  const shirtPalette = [0xe11d48, 0x2563eb, 0x16a34a, 0xd97706, 0x9333ea, 0x0891b2, 0xfacc15, 0xf43f5e];
  const colC = new T.Color();

  const walkSegs = roadSegs.filter(s => (s.kind ?? s[5] ?? 3) >= 2);
  const peds = [];

  for (let i = 0; i < count; i++) {
    const seg = walkSegs[(i * 3) % walkSegs.length] || { x1: 0, z1: 0, x2: 10, z2: 10, width: 8.2 };
    const side = i % 2 ? 1 : -1;
    const width = seg.width ?? seg[6] ?? 8.2;
    // Verge offset 3.4 to 6m from road centreline (never on carriageway)
    const kerbOff = (width * 0.5 + 1.8) * side;

    colC.setHex(shirtPalette[i % shirtPalette.length]);
    torsoInst.setColorAt(i, colC);
    armLInst.setColorAt(i, colC);
    armRInst.setColorAt(i, colC);

    peds.push({
      seg,
      t: (i * 0.17) % 0.94,
      dir: i % 2 === 0 ? 1 : -1,
      kerbOff,
      speed: 1.2,
      phase: i * 0.95,
      x: 0, z: 0, yaw: 0
    });
  }

  torsoInst.instanceColor.needsUpdate = true;
  armLInst.instanceColor.needsUpdate = true;
  armRInst.instanceColor.needsUpdate = true;

  const m4 = new T.Matrix4(), q4 = new T.Quaternion(), vPos = new T.Vector3(), s3 = new T.Vector3(1, 1, 1);
  const yAxis = new T.Vector3(0, 1, 0), xAxis = new T.Vector3(1, 0, 0);

  function update(dt, hour = 17.8) {
    const pAuto = getAuto ? getAuto() : { x: 0, z: 0 };
    const tSec = performance.now() * 0.001;

    for (let i = 0; i < count; i++) {
      const p = peds[i];
      const x1 = p.seg.x1 ?? p.seg[0], z1 = p.seg.z1 ?? p.seg[1], x2 = p.seg.x2 ?? p.seg[2], z2 = p.seg.z2 ?? p.seg[3];
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len, uz = dz / len;

      p.t += (p.dir * p.speed * dt) / len;
      if (p.t > 0.96) { p.t = 0.96; p.dir = -1; }
      if (p.t < 0.04) { p.t = 0.04; p.dir = 1; }

      p.x = x1 + ux * len * p.t - uz * p.kerbOff;
      p.z = z1 + uz * len * p.t + ux * p.kerbOff;
      p.yaw = Math.atan2(ux * p.dir, uz * p.dir);

      q4.setFromAxisAngle(yAxis, p.yaw);
      vPos.set(p.x, 0.82, p.z);
      m4.compose(vPos, q4, s3);
      torsoInst.setMatrixAt(i, m4);

      vPos.set(p.x, 1.32, p.z);
      m4.compose(vPos, q4, s3);
      headInst.setMatrixAt(i, m4);

      const swing = Math.sin(tSec * 6.5 + p.phase) * 0.42;
      const qLegL = q4.clone().multiply(new T.Quaternion().setFromAxisAngle(xAxis, swing));
      vPos.set(p.x - Math.cos(p.yaw) * 0.09, 0.28, p.z + Math.sin(p.yaw) * 0.09);
      m4.compose(vPos, qLegL, s3);
      legLInst.setMatrixAt(i, m4);

      const qLegR = q4.clone().multiply(new T.Quaternion().setFromAxisAngle(xAxis, -swing));
      vPos.set(p.x + Math.cos(p.yaw) * 0.09, 0.28, p.z - Math.sin(p.yaw) * 0.09);
      m4.compose(vPos, qLegR, s3);
      legRInst.setMatrixAt(i, m4);

      const qArmL = q4.clone().multiply(new T.Quaternion().setFromAxisAngle(xAxis, -swing * 0.7));
      vPos.set(p.x - Math.cos(p.yaw) * 0.24, 0.95, p.z + Math.sin(p.yaw) * 0.24);
      m4.compose(vPos, qArmL, s3);
      armLInst.setMatrixAt(i, m4);

      const qArmR = q4.clone().multiply(new T.Quaternion().setFromAxisAngle(xAxis, swing * 0.7));
      vPos.set(p.x + Math.cos(p.yaw) * 0.24, 0.95, p.z - Math.sin(p.yaw) * 0.24);
      m4.compose(vPos, qArmR, s3);
      armRInst.setMatrixAt(i, m4);
    }

    torsoInst.instanceMatrix.needsUpdate = true;
    headInst.instanceMatrix.needsUpdate = true;
    legLInst.instanceMatrix.needsUpdate = true;
    legRInst.instanceMatrix.needsUpdate = true;
    armLInst.instanceMatrix.needsUpdate = true;
    armRInst.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
