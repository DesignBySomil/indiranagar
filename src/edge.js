// Opaque neon boundary wall exactly on the car's collision limit (main.js clamps auto to MAP +/- margin).
export function createMapEdge({ THREE, scene, MAP, margin = 28 }) {
  const x0 = MAP.x0 + margin, x1 = MAP.x1 - margin, z0 = MAP.z0 + margin, z1 = MAP.z1 - margin;
  const g = new THREE.Group(); g.name = 'mapEdgeWall';
  const H = 16, T = 0.6, off = 2.55; // face sits 2.0 m beyond the clamp = the car footprint front extent (hitA uses up to 1.95 m ahead of centre)
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#12002a'; x.fillRect(0, 0, 256, 256);
  const grd = x.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#ff2bd6'); grd.addColorStop(0.5, '#7a2bff'); grd.addColorStop(1, '#00e5ff');
  x.fillStyle = grd; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#12002a';
  for (let i = 0; i < 256; i += 64) x.fillRect(i, 0, 6, 256);
  for (let j = 0; j < 256; j += 64) x.fillRect(0, j, 256, 6);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 12); x.fillRect(0, 244, 256, 12);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  const mk = (len) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(len / 8, 1); return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false }); };
  const seg = (cx, cz, lx, lz) => {
    const len = Math.max(lx, lz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(lx, H, lz), mk(len));
    m.position.set(cx, H / 2, cz); g.add(m);
  };
  const W = x1 - x0 + 2 * off, D = z1 - z0 + 2 * off;
  seg((x0 + x1) / 2, z0 - off, W, T); seg((x0 + x1) / 2, z1 + off, W, T);
  seg(x0 - off, (z0 + z1) / 2, T, D); seg(x1 + off, (z0 + z1) / 2, T, D);
  scene.add(g);
  return { group: g, bounds: { x0, x1, z0, z1 } };
}
