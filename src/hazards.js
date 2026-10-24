// Potholes give a camera bump; puddles splash with light, continuous rolling resistance.
export function createHazards({ THREE: T, scene, roadSegs, solidFn = () => 0 }) {
  const group = new T.Group();
  let seed = 1337;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const potholes = [], puddles = [];
  for (const s of roadSegs) {
    const x1 = s.x1, z1 = s.z1, x2 = s.x2, z2 = s.z2;
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 12 || !s.name) continue;
    const ux = (x2 - x1) / L, uz = (z2 - z1) / L, nx = uz, nz = -ux;
    const half = Math.max(1.5, s.width / 2 - 1.6);
    for (let d = 6 + rnd() * 20; d < L - 4; d += 26 + rnd() * 34) {
      const off = (rnd() * 2 - 1) * half;
      const x = x1 + ux * d + nx * off, z = z1 + uz * d + nz * off;
      if (solidFn(x, z)) continue;
      if (rnd() < 0.55) potholes.push({ x, z, r: 0.55 + rnd() * 0.35 });
      else puddles.push({ x, z, r: 1.1 + rnd() * 1.3 });
    }
  }
  const geo = new T.CircleGeometry(1, 20); geo.rotateX(-Math.PI / 2);
  const potMat = new T.MeshStandardMaterial({ color: 0x3a3733, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const pudMat = new T.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.55, metalness: 0.0, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
  const potI = new T.InstancedMesh(geo, potMat, Math.max(1, potholes.length));
  const pudI = new T.InstancedMesh(geo, pudMat, Math.max(1, puddles.length));
  const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3();
  potholes.forEach((p, i) => { m4.compose(v.set(p.x, 0.045, p.z), q, sc.set(p.r, 1, p.r * 0.8)); potI.setMatrixAt(i, m4); });
  puddles.forEach((p, i) => { m4.compose(v.set(p.x, 0.05, p.z), q, sc.set(p.r, 1, p.r * 0.7)); pudI.setMatrixAt(i, m4); });
  potI.frustumCulled = pudI.frustumCulled = false;
  group.add(potI, pudI); scene.add(group);

  // splash particles
  const N = 40, pos = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) vel.push(new T.Vector3());
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(pos, 3));
  const splash = new T.Points(sg, new T.PointsMaterial({ color: 0xc9d6e2, size: 0.22, transparent: true, opacity: 0.8, depthWrite: false }));
  splash.visible = false; splash.frustumCulled = false; scene.add(splash);
  let splashT = 0, lastPot = -1, lastPud = -1, shake = 0;

  function update(dt, auto) {
    let pi = -1, ui = -1;
    for (let i = 0; i < potholes.length; i++) { const p = potholes[i]; const dx = auto.x - p.x, dz = auto.z - p.z; if (dx * dx + dz * dz < (p.r + 0.7) * (p.r + 0.7)) { pi = i; break; } }
    for (let i = 0; i < puddles.length; i++) { const p = puddles[i]; const dx = auto.x - p.x, dz = auto.z - p.z; if (dx * dx + dz * dz < (p.r + 0.5) * (p.r + 0.5)) { ui = i; break; } }
    if (pi >= 0 && pi !== lastPot && Math.abs(auto.v) > 1.5) { shake = 0.22; }
    lastPot = pi;
    if (ui >= 0) {
      // Fixed, mild resistance instead of multiplicative brake-jabs on every frame.
      auto.v -= Math.sign(auto.v) * Math.min(Math.abs(auto.v), 0.35 * dt);
      if (ui !== lastPud && Math.abs(auto.v) > 1.5) {
        splashT = 0.8; splash.visible = true;
        for (let i = 0; i < N; i++) { pos[i * 3] = auto.x; pos[i * 3 + 1] = 0.2; pos[i * 3 + 2] = auto.z; vel[i].set((Math.random() - 0.5) * 4, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 4); }
      }
    }
    lastPud = ui;
    if (splashT > 0) {
      splashT -= dt;
      for (let i = 0; i < N; i++) { vel[i].y -= 9 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] = Math.max(0.05, pos[i * 3 + 1] + vel[i].y * dt); pos[i * 3 + 2] += vel[i].z * dt; }
      sg.attributes.position.needsUpdate = true;
      if (splashT <= 0) splash.visible = false;
    }
    shake = Math.max(0, shake - dt);
    return shake > 0 ? Math.sin(performance.now() * 0.05) * shake * 0.25 : 0;
  }
  return { group, update, potholes, puddles };
}
