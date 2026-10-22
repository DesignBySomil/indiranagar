// Drivable Domlur flyover: two one-way carriageways with ramps, built from OpenStreetMap centrelines
// (Map data (c) OpenStreetMap contributors, ODbL). Heights are design approximations, not surveyed values.
export const DECK_H = 7.2;      // deck height above road (design approximation)
export const RAMP_UP = 80;      // metres of ramp at the north end (approximation)
export const RAMP_DOWN = 120;   // metres of ramp at the south end (approximation)
const HALF_W = 3.3;             // carriageway half width
const STEP = 3;                 // sampling step along centreline (m)
const ss = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

function resample(pts) {
  const X = [], Z = [], S = [];
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / STEP));
    for (let k = 0; k < n; k++) { const t = k / n; X.push(x1 + (x2 - x1) * t); Z.push(z1 + (z2 - z1) * t); S.push(s + L * t); }
    s += L;
  }
  X.push(pts[pts.length - 1][0]); Z.push(pts[pts.length - 1][1]); S.push(s);
  const total = s;
  const H = S.map((d) => DECK_H * ss(d / RAMP_UP) * ss((total - d) / RAMP_DOWN));
  return { X, Z, S, H, total };
}

export function createOverpass({ THREE, scene, decks }) {
  const lanes = [resample(decks.sb), resample(decks.nb)];
  let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9;
  for (const l of lanes) for (let i = 0; i < l.X.length; i++) { bx0 = Math.min(bx0, l.X[i]); bx1 = Math.max(bx1, l.X[i]); bz0 = Math.min(bz0, l.Z[i]); bz1 = Math.max(bz1, l.Z[i]); }
  bx0 -= 8; bx1 += 8; bz0 -= 8; bz1 += 8;

  // nearest centreline sample (by segment) within half width: returns { h, lat, slope } or null
  function probe(x, z, r = HALF_W) {
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return null;
    let best = null, bd = r;
    for (const l of lanes) {
      const n = l.X.length;
      for (let i = 0; i < n - 1; i++) {
        const x1 = l.X[i], z1 = l.Z[i], dx = l.X[i + 1] - x1, dz = l.Z[i + 1] - z1;
        const L2 = dx * dx + dz * dz || 1;
        let t = ((x - x1) * dx + (z - z1) * dz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
        if (d < bd) { bd = d; const Lh = Math.sqrt(L2); best = { h: l.H[i] + (l.H[i + 1] - l.H[i]) * t, lat: d, slope: (l.H[i + 1] - l.H[i]) / Lh, tx: dx / Lh, tz: dz / Lh }; }
      }
    }
    return best;
  }

  // ----- geometry -----
  const concMat = new THREE.MeshStandardMaterial({ color: 0x9a9893, roughness: 0.92, metalness: 0.0 });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.95, metalness: 0.0 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.8 });
  const geos = { conc: { p: [], i: [] }, road: { p: [], i: [] }, line: { p: [], i: [] } };
  function strip(g, A, B, flip) {
    const base = g.p.length / 3;
    for (let k = 0; k < A.length; k++) { g.p.push(A[k][0], A[k][1], A[k][2], B[k][0], B[k][1], B[k][2]); }
    for (let k = 0; k < A.length - 1; k++) {
      const a = base + k * 2, b = a + 1, c = a + 2, d = a + 3;
      if (flip) g.i.push(a, c, b, b, c, d); else g.i.push(a, b, c, b, d, c);
    }
  }
  const pier = [];
  for (let li = 0; li < lanes.length; li++) {
    const l = lanes[li], n = l.X.length;
    const off = (i, o, dy) => {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let tx = l.X[b] - l.X[a], tz = l.Z[b] - l.Z[a]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      return [l.X[i] + -tz * o, l.H[i] + dy, l.Z[i] + tx * o];
    };
    const row = (o, dy) => Array.from({ length: n }, (_, i) => off(i, o, dy));
    const W = HALF_W, T = 1.1, PH = 0.95, PT = 0.38;
    // surface
    strip(geos.road, row(-W, 0.0), row(W, 0.0), false);
    // edge lines
    strip(geos.line, row(-W + 0.45, 0.02), row(-W + 0.6, 0.02), false);
    strip(geos.line, row(W - 0.6, 0.02), row(W - 0.45, 0.02), false);
    // slab sides and underside
    strip(geos.conc, row(-W, 0.0), row(-W, -T), false);
    strip(geos.conc, row(W, -T), row(W, 0.0), false);
    strip(geos.conc, row(-W, -T), row(W, -T), false);
    // parapets (inner face, top, outer face) both sides
    for (const sgn of [-1, 1]) {
      const o1 = sgn * W, o2 = sgn * (W + PT);
      const inner = sgn < 0 ? [row(o1, 0), row(o1, PH)] : [row(o1, PH), row(o1, 0)];
      strip(geos.conc, inner[0], inner[1], false);
      strip(geos.conc, row(o1, PH), row(o2, PH), sgn > 0);
      const outer = sgn < 0 ? [row(o2, PH), row(o2, 0)] : [row(o2, 0), row(o2, PH)];
      strip(geos.conc, outer[0], outer[1], false);
    }
    // piers under the elevated part
    for (let i = 4; i < n - 4; i += 8) if (l.H[i] > 3.5) pier.push([l.X[i], l.Z[i], l.H[i], li]);
  }
  const group = new THREE.Group();
  group.name = 'overpass';
  const mk = (g, mat, shadow) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
    geo.setIndex(g.i); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; group.add(m);
    return m;
  };
  mk(geos.conc, new THREE.MeshStandardMaterial({ color: 0x9a9893, roughness: 0.92, side: THREE.DoubleSide }), true);
  mk(geos.road, new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.95, side: THREE.DoubleSide }), false);
  mk(geos.line, new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.8, side: THREE.DoubleSide }), false);
  const pierGeo = new THREE.CylinderGeometry(0.95, 1.1, 1, 12);
  const piers = new THREE.InstancedMesh(pierGeo, concMat, pier.length);
  const capGeo = new THREE.BoxGeometry(1, 0.9, 1);
  const caps = new THREE.InstancedMesh(capGeo, concMat, pier.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  pier.forEach(([x, z, h], i) => {
    const ph = Math.max(0.5, h - 1.1 - 0.9);
    ps.set(x, ph / 2, z); sc.set(1, ph, 1); m4.compose(ps, q.identity(), sc); piers.setMatrixAt(i, m4);
    ps.set(x, h - 1.1 - 0.45, z); sc.set(8.2, 1, 3.2); m4.compose(ps, q.identity(), sc); caps.setMatrixAt(i, m4);
  });
  piers.castShadow = caps.castShadow = true; piers.receiveShadow = caps.receiveShadow = true;
  group.add(piers, caps);
  scene.add(group);

  // ground-level pier collision (circles), used only when the car is at ground level
  function pierSolid(x, z) {
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return false;
    for (let i = 0; i < pier.length; i++) { const p = pier[i]; if ((x - p[0]) ** 2 + (z - p[1]) ** 2 < 1.45 * 1.45) return true; }
    return false;
  }
  const bridgeVolumes = [];
  for (const l of lanes) for (let i = 0; i < l.X.length; i += 6) if (l.H[i] > 3) bridgeVolumes.push({ x: l.X[i], z: l.Z[i], r: 9, clearanceY: 6 });

  // Which deck height applies to a car at ground y? Returns deck h when the car is on the deck (or on the ramp), else null.
  function deckAt(x, z, y) {
    const p = probe(x, z);
    if (!p) return null;
    if (Math.abs(p.h - y) < 1.6) return p;
    return null;
  }
  // under-deck headroom for the camera: max y the camera may take at (x, z) when the car is at ground level
  function ceilingAt(x, z) {
    const p = probe(x, z, HALF_W + 1.2);
    return p && p.h > 2.5 ? p.h - 1.1 - 0.5 : Infinity;
  }
  return { group, probe, deckAt, pierSolid, ceilingAt, bridgeVolumes, lanes, bounds: [bx0, bz0, bx1, bz1] };
}
