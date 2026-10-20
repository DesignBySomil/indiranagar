// src/icons.js
import * as THREE from 'three';
import { makeSign, makeEmissiveSignMaterial, makeNeonMaterial, nightUniform } from './materials.js';

export function buildIcons(world, scene, nightU = nightUniform, solid = () => 0) {
  const group = new THREE.Group();
  scene.add(group);

  const animatedItems = [];

  // Guard: never place roadside icons inside ANY carriageway or within 25m of player spawn (-133, -345)
  const roadSegs = [];
  if (world && world.roads) {
    const widths = { 5: 17, 4: 13, 3: 9, 2: 6.5, 1: 4.5 };
    for (const r of world.roads) {
      const w = widths[r.k] || 7;
      for (let i = 0; i < r.p.length - 1; i++) {
        roadSegs.push([r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], w]);
      }
    }
  }

  function isOnRoadOrSpawn(x, z, clearance = 2.0) {
    if (Math.hypot(x - (-133), z - (-345)) < 26) return true;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const halfW = s[4] * 0.5 + clearance;
      if (x < Math.min(s[0], s[2]) - halfW || x > Math.max(s[0], s[2]) + halfW) continue;
      if (z < Math.min(s[1], s[3]) - halfW || z > Math.max(s[1], s[3]) + halfW) continue;
      const dx = s[2] - s[0], dz = s[3] - s[1];
      const L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (s[0] + dx * t), z - (s[1] + dz * t));
      if (d < halfW) return true;
    }
    return false;
  }

  function findRoadsideSpot(tx, tz, maxRadius = 24) {
    if (!isOnRoadOrSpawn(tx, tz, 2.5)) return { x: tx, z: tz };
    for (let r = 6; r <= maxRadius; r += 3) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const cx = tx + Math.cos(a) * r;
        const cz = tz + Math.sin(a) * r;
        if (!isOnRoadOrSpawn(cx, cz, 2.5)) return { x: cx, z: cz };
      }
    }
    return { x: tx + 16, z: tz };
  }

  // ---------- 1. Namma Metro Purple Line Viaduct & Animated 6-Coach Train ----------
  try {
    const metroGroup = new THREE.Group();
    const concMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.82 });
    const purpStripMat = makeNeonMaterial(0x8b3dff, 1.5);

    // Viaduct along CMH / Old Madras axis (x: -220..260 at z: -270)
    const spanX1 = -220, spanX2 = 260, spanZ = -270;
    const spanLen = spanX2 - spanX1;

    for (let x = spanX1; x <= spanX2; x += 26) {
      if (Math.hypot(x - (-133), spanZ - (-345)) < 25) continue;
      // Place pillars cleanly outside carriageway if needed, or straddle with high 9.2m clearance
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, 9.2, 14), concMat);
      pier.position.set(x, 4.6, spanZ);
      pier.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 8.2), concMat);
      cap.position.set(x, 8.8, spanZ);
      metroGroup.add(pier, cap);
    }

    const deck = new THREE.Mesh(new THREE.BoxGeometry(spanLen + 16, 1.35, 8.4), concMat);
    deck.position.set((spanX1 + spanX2) / 2, 9.6, spanZ);
    deck.castShadow = deck.receiveShadow = true;
    const bandF = new THREE.Mesh(new THREE.BoxGeometry(spanLen + 16, 0.38, 8.6), purpStripMat);
    bandF.position.set((spanX1 + spanX2) / 2, 9.65, spanZ);
    metroGroup.add(deck, bandF);

    // 6-Coach Purple & White Namma Metro Train running on deck (y = 11.2m)
    const trainGroup = new THREE.Group();
    const coachWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.2 });
    const coachWin = makeNeonMaterial(0xfff0b3, 1.4);

    for (let c = 0; c < 6; c++) {
      const cx = (c - 2.5) * 11.4;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(10.6, 2.7, 3.1), coachWhite);
      hull.position.set(cx, 1.35, 0);
      hull.castShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.65, 0.52, 3.16), purpStripMat);
      stripe.position.set(cx, 1.15, 0);
      const winBand = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.68, 3.18), coachWin);
      winBand.position.set(cx, 1.72, 0);
      trainGroup.add(hull, stripe, winBand);
    }
    trainGroup.position.set(0, 10.35, spanZ);
    metroGroup.add(trainGroup);
    group.add(metroGroup);

    animatedItems.push((dt, t) => {
      const cycle = (t % 40) / 40; // Full back-and-forth cycle every 40s
      const wave = Math.sin(cycle * Math.PI * 2);
      trainGroup.position.x = ((spanX1 + spanX2) / 2) + wave * (spanLen * 0.44);
    });
  } catch (e) { console.warn('Metro icon skipped:', e); }

  // ---------- 2. Glen's Bakehouse (x = -120, z = -300 on 100 Feet Road) ----------
  try {
    const pos = findRoadsideSpot(-120, -300);
    const g = new THREE.Group();
    g.position.set(pos.x, 0, pos.z);
    g.rotation.y = -Math.PI / 2;

    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 8.5, 11), new THREE.MeshStandardMaterial({ color: 0xf7efe1, roughness: 0.75 }));
    wall.position.y = 4.25;
    wall.castShadow = true;
    g.add(wall);

    // Red & white striped bakehouse awning + warm pastry display glow
    for (let i = -5; i <= 5; i++) {
      const st = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.22, 2.0),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xc81e1e : 0xffffff, roughness: 0.6 })
      );
      st.position.set(i * 0.95, 3.2, 6.2);
      st.rotation.x = 0.28;
      g.add(st);
    }

    const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 2.5), makeNeonMaterial(0xffcf78, 1.5));
    windowGlow.position.set(0, 1.7, 5.55);
    const signTex = makeSign("GLEN'S BAKEHOUSE", '#991b1b', '#fffbeb', '800 42px Georgia, serif', 512, 128, 'CUPCAKES · COFFEE · SOURDOUGH', '#fde68a');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.75, 0.3), makeEmissiveSignMaterial(signTex, 1.7));
    sign.position.set(0, 4.7, 5.65);

    g.add(windowGlow, sign);
    group.add(g);
  } catch (e) { console.warn('Glens skipped:', e); }

  // ---------- 3. Koshy's-style Old Bangalore Cafe (x = -95, z = -200) ----------
  try {
    const pos = findRoadsideSpot(-95, -200);
    const g = new THREE.Group();
    g.position.set(pos.x, 0, pos.z);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(15, 8.0, 12), new THREE.MeshStandardMaterial({ color: 0xf3e5ab, roughness: 0.8 }));
    wall.position.y = 4.0;
    wall.castShadow = true;
    g.add(wall);

    // Colonial verandah arches & warm ceiling fan interior glow
    const archGlow = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.0), makeNeonMaterial(0xffd480, 1.35));
    archGlow.position.set(0, 1.9, 6.04);
    g.add(archGlow);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    for (let x = -5.5; x <= 5.5; x += 2.75) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.6, 0.55), pillarMat);
      col.position.set(x, 1.8, 6.2);
      g.add(col);
    }

    const sTex = makeSign("KOSHY'S PARADE CAFE", '#064e3b', '#fef08a', '800 40px Georgia, serif', 512, 128, 'OLD BANGALORE HERITAGE · EST 1940', '#ffffff');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1.85, 0.3), makeEmissiveSignMaterial(sTex, 1.65));
    sign.position.set(0, 5.2, 6.2);
    g.add(sign);
    group.add(g);
  } catch (e) { console.warn('Koshys skipped:', e); }

  // ---------- 4. Shiv Sagar / Hoysala Darshini + Queue of Customers (x = -330, z = 165) ----------
  try {
    const pos = findRoadsideSpot(-330, 165);
    const g = new THREE.Group();
    g.position.set(pos.x, 0, pos.z);

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(14, 9.0, 12), new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.75 }));
    bldg.position.y = 4.5;
    bldg.castShadow = true;
    g.add(bldg);

    const sTex = makeSign('SHIV SAGAR DARSHINI', '#15803d', '#fef08a', '900 44px sans-serif', 512, 128, 'MASALA DOSA · FILTER COFFEE · PAV BHAJI', '#ffffff');
    const sign = new THREE.Mesh(new THREE.BoxGeometry(11.0, 2.1, 0.35), makeEmissiveSignMaterial(sTex, 1.8));
    sign.position.set(0, 4.4, 6.2);
    g.add(sign);

    // Queue of cartoon customers waiting outside for masala dosa
    for (let q = 0; q < 6; q++) {
      const cust = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.65, 0.26), new THREE.MeshStandardMaterial({ color: q % 2 ? 0x2563eb : 0xd97706 }));
      torso.position.y = 0.75;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd4946a }));
      head.position.y = 1.24;
      cust.add(torso, head);
      cust.position.set(-3.5 + q * 1.15, 0, 7.2);
      g.add(cust);
    }
    group.add(g);
  } catch (e) { console.warn('Shiv Sagar skipped:', e); }

  // ---------- 5. Church Street Pub Neon Sign Clusters (x = -35, z = 744 & x = 605.4, z = 579) ----------
  try {
    const s1 = makeEmissiveSignMaterial(makeSign('CHURCH STREET SOCIAL', '#18181b', '#ff6b2b', '900 42px sans-serif', 512, 128, 'CRAFT COCKTAILS & GIGS', '#ff6b2b'), 2.1);
    const s2 = makeEmissiveSignMaterial(makeSign('THE BIERE CLUB', '#0f172a', '#38bdf8', '900 46px sans-serif', 512, 128, 'BENGALURU CRAFT BREWERY', '#facc15'), 2.1);

    for (const [px, pz] of [[-35, 744], [605.4, 579]]) {
      const spot = findRoadsideSpot(px + 9, pz - 8);
      const arch = new THREE.Group();
      arch.position.set(spot.x, 0, spot.z);
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7.5, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      pL.position.set(-3.4, 3.75, 0);
      const pR = pL.clone();
      pR.position.set(3.4, 3.75, 0);

      const b1 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.5, 0.3), s1);
      b1.position.set(0, 6.8, 0);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.5, 0.3), s2);
      b2.position.set(0, 5.0, 0);
      arch.add(pL, pR, b1, b2);
      group.add(arch);
    }
  } catch (e) { console.warn('Pub neon clusters skipped:', e); }

  // ---------- 6. Football Turf (40x24m at x = 420, z = 130, shifted if overlapping buildings) ----------
  try {
    let tx = 420, tz = 130;
    for (let r = 0; r <= 90; r += 12) {
      let found = false;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const cx = 420 + Math.cos(a) * r;
        const cz = 130 + Math.sin(a) * r;
        if (!solid(cx, cz) && !solid(cx + 15, cz) && !solid(cx - 15, cz) && !isOnRoadOrSpawn(cx, cz, 8)) {
          tx = cx; tz = cz; found = true; break;
        }
      }
      if (found) break;
    }

    const turfGroup = new THREE.Group();
    turfGroup.position.set(tx, 0.08, tz);

    // Canvas astro-turf pitch texture with white touchlines, centre circle, penalty boxes
    const tc = document.createElement('canvas');
    tc.width = 512; tc.height = 320;
    const tctx = tc.getContext('2d');
    for (let i = 0; i < 8; i++) {
      tctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534';
      tctx.fillRect(i * 64, 0, 64, 320);
    }
    tctx.strokeStyle = '#ffffff';
    tctx.lineWidth = 5;
    tctx.strokeRect(16, 16, 480, 288);
    tctx.beginPath(); tctx.moveTo(256, 16); tctx.lineTo(256, 304); tctx.stroke();
    tctx.beginPath(); tctx.arc(256, 160, 42, 0, Math.PI * 2); tctx.stroke();
    tctx.strokeRect(16, 85, 68, 150);
    tctx.strokeRect(428, 85, 68, 150);

    const pitchTex = new THREE.CanvasTexture(tc);
    pitchTex.colorSpace = THREE.SRGBColorSpace;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.8 }));
    pitch.rotation.x = -Math.PI / 2;
    PitchReceive: pitch.receiveShadow = true;
    turfGroup.add(pitch);

    // Goalposts & 4 Floodlight Towers
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    for (const gx of [-19, 19]) {
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 4.6), postMat);
      crossbar.position.set(gx, 2.2, 0);
      turfGroup.add(crossbar);
    }

    const floodMat = makeNeonMaterial(0xfffbeb, 2.4);
    for (const [fx, fz] of [[-19, -11.5], [19, -11.5], [-19, 11.5], [19, 11.5]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 11, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      pole.position.set(fx, 5.5, fz);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.4), floodMat);
      lamp.position.set(fx, 11.1, fz);
      turfGroup.add(pole, lamp);
    }

    // Small kids playing football on the turf
    const kids = [];
    for (let k = 0; k < 6; k++) {
      const kid = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.22, 0.55, 4, 8),
        new THREE.MeshStandardMaterial({ color: k < 3 ? 0xef4444 : 0x3b82f6 })
      );
      kid.position.set((k - 2.5) * 4, 0.55, (k % 2 ? 3 : -3));
      turfGroup.add(kid);
      kids.push({ mesh: kid, baseX: (k - 2.5) * 4, baseZ: (k % 2 ? 3 : -3), phase: k * 1.3 });
    }
    animatedItems.push((dt, t) => {
      for (const k of kids) {
        k.mesh.position.x = k.baseX + Math.sin(t * 2.2 + k.phase) * 4.5;
        k.mesh.position.z = k.baseZ + Math.cos(t * 1.7 + k.phase) * 3.2;
      }
    });

    group.add(turfGroup);
  } catch (e) { console.warn('Football turf skipped:', e); }

  // ---------- 7. Giant RCB Cricket Bat+Ball Billboard & Chinnaswamy Traffic Joke (x = 480, z = -280) ----------
  try {
    const pos = findRoadsideSpot(480, -280, 32);
    const rcbGroup = new THREE.Group();
    rcbGroup.position.set(pos.x, 0, pos.z);

    // Twin steel hoarding posts
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
    for (const px of [-4.2, 4.2]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 11, 10), steelMat);
      p.position.set(px, 5.5, 0);
      rcbGroup.add(p);
    }

    const rcbTex = makeSign('RCB: EE SALA CUP NAMDE!', '#111111', '#ef4444', '900 42px sans-serif', 512, 160, 'PLAY BOLD · BENGALURU ROYAL CHALLENGERS', '#facc15');
    const board = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.8, 0.45), makeEmissiveSignMaterial(rcbTex, 1.9));
    board.position.set(0, 9.2, 0);
    rcbGroup.add(board);

    // Giant 3D Cartoon Cricket Bat + Red Leather Ball mounted atop the billboard
    const batBlade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.2, 0.32), new THREE.MeshStandardMaterial({ color: 0xd99b52, roughness: 0.5 }));
    batBlade.position.set(4.8, 11.2, 0.4);
    batBlade.rotation.z = -0.35;
    const batHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    batHandle.position.set(5.8, 13.8, 0.4);
    batHandle.rotation.z = -0.35;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 12), makeNeonMaterial(0xdc2626, 1.4));
    ball.position.set(2.8, 11.6, 0.55);
    rcbGroup.add(batBlade, batHandle, ball);

    // Chinnaswamy distance joke signpost right next to it
    const chinTex = makeSign('CHINNASWAMY 6.4 KM', '#14532d', '#ffffff', '800 38px sans-serif', 512, 128, 'BY AUTO: TRAFFIC 3 HRS (WALK FASTER)', '#facc15');
    const chinSign = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.65, 0.25), makeEmissiveSignMaterial(chinTex, 1.5));
    chinSign.position.set(0, 4.2, 0.3);
    rcbGroup.add(chinSign);

    group.add(rcbGroup);
  } catch (e) { console.warn('RCB icon skipped:', e); }

  // ---------- 8. Comic Hoardings, Auto Stands & "Meter Haaku" Boards Along 100 Feet Road ----------
  try {
    const hoardings = [
      { x: -108, z: -430, title: 'NAMMA BENGALURU', sub: 'WEATHER 10/10 · TRAFFIC 0/10', bg: '#7c2d12', fg: '#fef08a' },
      { x: -162, z: -245, title: 'TRAFFIC POLICE: SLOW DOWN', sub: 'CAMERA AHEAD · WEAR HELMET GURU', bg: '#1e3a8a', fg: '#ffffff' },
      { x: -108, z: -120, title: 'BIRYANI BOSS INDIRANAGAR', sub: 'EXTRA ALOO? NOT IN BENGALURU!', bg: '#881337', fg: '#fde047' },
      { x: -162, z: 45,   title: 'FILTER COFFEE NATION', sub: 'BY-TWO COFFEE · FROTHY & STRONG', bg: '#451a03', fg: '#fed7aa' },
      { x: -108, z: 185,  title: 'CAUTION: CRATER POTHOLE', sub: 'FREE BACK MASSAGE NEXT 200M', bg: '#b45309', fg: '#111111' },
      { x: -162, z: -475, title: 'AUTO STAND · INDIRANAGAR', sub: 'METER HAAKU GURU · NO OLA/UBER', bg: '#facc15', fg: '#111111' },
      { x: 265,  z: 580,  title: 'AUTO STAND · 12TH MAIN', sub: 'ONE-AND-HALF AFTER 10 PM ONLY', bg: '#15803d', fg: '#fef08a' }
    ];

    const postMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 });

    for (const h of hoardings) {
      const safe = findRoadsideSpot(h.x, h.z, 26);
      if (isOnRoadOrSpawn(safe.x, safe.z, 2.0)) continue;

      const hg = new THREE.Group();
      hg.position.set(safe.x, 0, safe.z);
      hg.rotation.y = safe.x > -133 ? -Math.PI / 2 : Math.PI / 2;

      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 6.2, 8), postMat);
      p1.position.set(-2.4, 3.1, 0);
      const p2 = p1.clone();
      p2.position.set(2.4, 3.1, 0);

      const tex = makeSign(h.title, h.bg, h.fg, '900 36px sans-serif', 512, 128, h.sub, h.fg);
      const board = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.8, 0.26), makeEmissiveSignMaterial(tex, 1.6));
      board.position.set(0, 5.5, 0);

      hg.add(p1, p2, board);
      group.add(hg);
    }
  } catch (e) { console.warn('Hoardings skipped:', e); }

  let elapsed = 0;
  function update(dt, hour = 17.8) {
    elapsed += dt;
    for (let i = 0; i < animatedItems.length; i++) {
      animatedItems[i](dt, elapsed, hour);
    }
  }

  return { group, update };
}
