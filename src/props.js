// Knockable street props (lamp poles, trees): rigid topple about the base, away from the driving line.
// Items are lists of instanced-mesh parts with their base matrices; the topple rotates every part about the base point.
export function createKnockProps({ THREE, items }) {
  const CELL = 12;
  const grid = new Map();
  const active = new Set();
  const key = (i, j) => i + ',' + j;
  for (const it of items) {
    it.state = 0; // 0 upright, 1 falling, 2 down
    it.th = 0; it.w = 0; it.bounced = false;
    const k = key(Math.floor(it.x / CELL), Math.floor(it.z / CELL));
    let c = grid.get(k); if (!c) { c = []; grid.set(k, c); } c.push(it);
  }
  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), mC = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = new THREE.Vector3();
  const dirty = new Set();

  function near(x, z, fn) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      const c = grid.get(key(i, j)); if (c) for (const it of c) fn(it);
    }
  }
  // only upright props block; a toppled prop no longer sits in the lane
  function solid(x, z) {
    let hit = false;
    near(x, z, it => { if (!hit && it.state === 0 && Math.hypot(x - it.x, z - it.z) < it.r) hit = true; });
    return hit;
  }
  function kickAt(x, z, dx, dz, power) {
    let best = null, bd = 1e9;
    near(x, z, it => { if (it.state !== 0) return; const d = Math.hypot(x - it.x, z - it.z); if (d < it.r + 0.3 && d < bd) { bd = d; best = it; } });
    if (!best) return false;
    const side = (best.x - x) * dz - (best.z - z) * dx;
    const sgn = side >= 0 ? 1 : -1;
    let fx = -dz * sgn * 0.8 + dx * 0.6, fz = dx * sgn * 0.8 + dz * 0.6;
    const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
    best.fx = fx; best.fz = fz;
    best.state = 1; best.th = 0.02; best.w = Math.max(0.6, power * 0.45) / (best.mass || 1);
    active.add(best);
    return true;
  }
  function apply(it) {
    ax.set(it.fz, 0, -it.fx);
    q.setFromAxisAngle(ax, it.th);
    mA.makeTranslation(-it.x, 0, -it.z);
    mB.makeRotationFromQuaternion(q);
    mC.makeTranslation(it.x, 0, it.z);
    mB.premultiply(mC).multiply(mA); // T(base) R T(-base)
    for (const p of it.parts) {
      mC.copy(mB).multiply(p.base);
      p.inst.setMatrixAt(p.idx, mC); dirty.add(p.inst);
    }
  }
  function update(dt) {
    if (!active.size) return;
    for (const it of active) {
      const max = it.max || 1.45;
      it.w += (4.2 * Math.sin(Math.min(it.th, 1.5)) + 1.2) * dt / (it.mass || 1);
      it.th += it.w * dt;
      if (it.th >= max) {
        it.th = max;
        if (!it.bounced && it.w > 1.2) { it.bounced = true; it.w = -it.w * 0.25; }
        else { it.state = 2; it.w = 0; active.delete(it); }
      }
      apply(it);
    }
    for (const m of dirty) m.instanceMatrix.needsUpdate = true;
    dirty.clear();
  }
  return { solid, kickAt, update, items, get activeCount() { return active.size; } };
}
