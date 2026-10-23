// Boundary wall on the car's collision limit (main.js clamps auto to MAP +/- margin).
// Plain pink, semi-transparent barrier: reads as an uncrossable boundary, not a building. No grid, stripes or glow bars.
export function createMapEdge({ THREE, scene, MAP, margin = 28 }) {
  const x0 = MAP.x0 + margin, x1 = MAP.x1 - margin, z0 = MAP.z0 + margin, z1 = MAP.z1 - margin;
  const g = new THREE.Group(); g.name = 'mapEdgeWall';
  const H = 16, T = 0.6, off = 2.55; // face sits 2.0 m beyond the clamp = the car footprint front extent (hitA uses up to 1.95 m ahead of centre)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff4fc3, // plain pink
    transparent: true,
    opacity: 0.42,
    toneMapped: false,
    fog: false,
    side: THREE.DoubleSide
  });
  const seg = (cx, cz, lx, lz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lx, H, lz), mat);
    m.position.set(cx, H / 2, cz); g.add(m);
  };
  const W = x1 - x0 + 2 * off, D = z1 - z0 + 2 * off;
  seg((x0 + x1) / 2, z0 - off, W, T); seg((x0 + x1) / 2, z1 + off, W, T);
  seg(x0 - off, (z0 + z1) / 2, T, D); seg(x1 + off, (z0 + z1) / 2, T, D);
  scene.add(g);
  return { group: g, bounds: { x0, x1, z0, z1 } };
}
