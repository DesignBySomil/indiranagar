#!/usr/bin/env python3
"""
Deterministic patcher for DesignBySomil/indiranagar (live base commit f2fdd76).
Usage:
  python3 apply_patches.py --stage A   # Apply Priority A (double-width roads & environment coherence)
  python3 apply_patches.py --stage B   # Apply Priority B (lateral path-clearing impact physics & life.js exports)
  python3 apply_patches.py --stage AB  # Apply both Stage A and Stage B (default)
"""

import argparse
import pathlib
import sys


def read_file(root: pathlib.Path, rel_path: str) -> str:
    p = root / rel_path
    if not p.is_file():
        raise FileNotFoundError(f"Missing target file: {p}")
    return p.read_text(encoding="utf-8")


def write_file(root: pathlib.Path, rel_path: str, content: str) -> None:
    p = root / rel_path
    p.write_text(content, encoding="utf-8")
    print(f"  [OK] Wrote {rel_path}")


def replace_exact(src: str, old: str, new: str, label: str) -> str:
    cnt = src.count(old)
    if cnt == 0:
        raise RuntimeError(f"[FAIL] Anchor not found for: {label}")
    if cnt > 1:
        raise RuntimeError(f"[FAIL] Ambiguous anchor ({cnt} matches) for: {label}")
    print(f"  [PATCH] Applied {label}")
    return src.replace(old, new, 1)


# ==============================================================================
# STAGE A: PRIORITY A — DOUBLE ROAD WIDTHS & COHERENT CORRIDOR ARCHITECTURE
# ==============================================================================

def apply_stage_a(root: pathlib.Path) -> None:
    print("=== Applying Stage A (Double-Width Roads & Coherent Environment) ===")

    # --------------------------------------------------------------------------
    # 1. src/street.js
    # --------------------------------------------------------------------------
    street = read_file(root, "src/street.js")

    street_old_1 = """export function buildStreet(world, scene, nightUniform, solidFn, extras = null) {
  const roadSegs = [];
  const lampSpots = [];
  const vendorSpots = [];
  const parkedSpots = [];
  const bridgeVolumes = [];
  const speedBreakers = [];
  const solid = solidFn || (() => 0);

  // Dusty green/tan Bangalore ground plane
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x57534d, roughness: 0.97, metalness: 0.0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Real Bangalore road widths: single carriageway 1-lane each way (~7m residential, ~10.5m 12th Main/CMH),
  // 100 Feet Road as two separated one-way carriageways (2 lanes each, pale concrete) with narrow 0.5m concrete divider
  // User rule (2026-10-23): ONLY 2-lane roads - one lane each way, no 3/4-lane roads.
  const widthMap = { 5: 7.6, 4: 7.2, 3: 7.0, 2: 6.6, 1: 5.5 };

  const pos = [], col = [], uvs = [], idx = [];
  const fpPos = [], fpCol = [], fpUvs = [], fpIdx = [];
  const kbPos = [], kbUvs = [], kbIdx = [];
  const dp = [], dCol = [], di = [];
  const divPos = [], divIdx = [];
  const patchPos = [], patchCol = [], patchIdx = [];
  const potholeSpots = [];
  const utilityPoles = [];
  const metroPiers = [], metroDecks = [], cmhSegs = [], cmhCands = [];
  let gantryRef = null;

  let v = 0, fpV = 0, kbV = 0, dv = 0, divV = 0, patV = 0;

  // 100 Feet Road: two OSM one-way carriageways. Pre-pass finds the opposite carriageway so the gap becomes a narrow median.
  // User rule (2-lane roads, one lane each way): the raw OSM pair sits 10-30m apart, which reads as a
  // 4-lane-wide corridor from driver height. Narrow the corridor at the source polyline so the two
  // carriageways sit GAP100 apart (5.2m each + 1.2m median) - one divided 2-lane road.
  const W100 = 5.2; // 100 Feet Road: one-way carriageway pair, 1 lane each = 2 lanes total (user rule)
  const GAP100 = W100 + 1.2;
  const medianQuads = [];
  const medianKerbs = [], medianStrips = [];
  let hundredSegs = [];
  const nbrSide = new Map();
  const collectHundred = () => {
    hundredSegs = [];
    world.roads.forEach((r, ri) => {
      if (!(r.n && r.n.includes('100 Feet'))) return;
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.2) continue;
        hundredSegs.push({ ri, i, x1: ax, z1: az, x2: bx, z2: bz, ux: (bx - ax) / L, uz: (bz - az) / L, L });
      }
    });
  };
  const pairHundred = (emit) => {
    for (const a of hundredSegs) {
      const nx = -a.uz, nz = a.ux;
      const mx = (a.x1 + a.x2) / 2, mz = (a.z1 + a.z2) / 2;
      let best = null;
      for (const b of hundredSegs) {
        if (b.ri === a.ri) continue;
        if (Math.abs(a.ux * b.ux + a.uz * b.uz) < 0.9) continue;
        const rx = (b.x1 + b.x2) / 2 - mx, rz = (b.z1 + b.z2) / 2 - mz;
        const along = rx * a.ux + rz * a.uz, perp = rx * nx + rz * nz;
        if (Math.abs(perp) < 5 || Math.abs(perp) > 30 || Math.abs(along) > (a.L + b.L) / 2) continue;
        if (!best || Math.abs(perp) < Math.abs(best.perp)) best = { b, perp };
      }
      if (!best) continue;
      const sg = Math.sign(best.perp);
      nbrSide.set(a.ri + ':' + a.i, sg);
      if (!emit) { nbrPerp.set(a.ri + ':' + a.i, best.perp); continue; }
      if (a.ri < best.b.ri) {
        const o1 = sg * W100 / 2, o2 = best.perp - sg * W100 / 2;
        if (Math.abs(o2) > Math.abs(o1)) {
          medianQuads.push([a.x1 + nx * o1, a.z1 + nz * o1, a.x1 + nx * o2, a.z1 + nz * o2, a.x2 + nx * o1, a.z2 + nz * o1, a.x2 + nx * o2, a.z2 + nz * o2]);
          // kerb edges at each carriageway + raised central divider strip, so the narrow median reads as a divider
          const oM = (o1 + o2) / 2;
          medianKerbs.push([a.x1 + nx * o1, a.z1 + nz * o1, a.x2 + nx * o1, a.z2 + nz * o1]);
          medianKerbs.push([a.x1 + nx * o2, a.z1 + nz * o2, a.x2 + nx * o2, a.z2 + nz * o2]);
          medianStrips.push([a.x1 + nx * oM, a.z1 + nz * oM, a.x2 + nx * oM, a.z2 + nz * oM]);
        }
      }
    }
  };
  const nbrPerp = new Map();
  collectHundred();
  pairHundred(false); // measure original pair separation
  {
    const done = new Set();
    for (const a of hundredSegs) {
      const perp = nbrPerp.get(a.ri + ':' + a.i);
      if (perp === undefined) continue;
      const sh = Math.max(0, (Math.abs(perp) - GAP100) / 2);
      if (sh <= 0) continue;
      const sgn = Math.sign(perp);
      const sx = -a.uz * sgn * sh, sz = a.ux * sgn * sh;
      const rp = world.roads[a.ri].p;
      for (const pi of [a.i, a.i + 1]) {
        const k2 = a.ri + ':' + pi;
        if (done.has(k2)) continue;
        done.add(k2);
        rp[pi][0] += sx; rp[pi][1] += sz;
      }
    }
  }
  nbrSide.clear();
  collectHundred();
  pairHundred(true); // rebuild pairs + median quads on the narrowed corridor"""

    street_new_1 = """export const ROAD_WIDTH_MAP = { 5: 15.2, 4: 14.4, 3: 14.0, 2: 13.2, 1: 11.0 };
export const W100 = 10.4; // 2x 5.2m per carriageway (1 lane each way = 2 lanes total)
export const GAP100 = W100 + 1.4; // 10.4m carriageway + 1.4m raised concrete divider
export const WCMH = 9.6;  // 2x 4.8m per carriageway
export const GAPCMH = WCMH + 3.2; // 9.6m carriageway + 3.2m Namma Metro pier median

export function getRoadWidth(r) {
  const n = (r && r.n) || '';
  if (n.includes('100 Feet')) return W100;
  if (n.includes('Chinmaya') || n.includes('CMH') || n.includes('Old Madras')) return WCMH;
  return ROAD_WIDTH_MAP[r && r.k] || 14.0;
}

export function prepareRoadCorridors(world) {
  if (!world || world.__corridorsPrepared) return world;
  world.__corridorsPrepared = true;

  // 1. Align 100 Feet Road and CMH Road paired carriageways BEFORE infill/city/street
  const alignPairedCorridor = (matchFn, targetGap, minPerp, maxPerp) => {
    const segs = [];
    world.roads.forEach((r, ri) => {
      if (!matchFn(r)) return;
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.2) continue;
        segs.push({ ri, i, x1: ax, z1: az, x2: bx, z2: bz, ux: (bx - ax) / L, uz: (bz - az) / L, L });
      }
    });

    const nbrPerp = new Map();
    for (const a of segs) {
      const nx = -a.uz, nz = a.ux;
      const mx = (a.x1 + a.x2) * 0.5, mz = (a.z1 + a.z2) * 0.5;
      let best = null;
      for (const b of segs) {
        if (b.ri === a.ri) continue;
        if (Math.abs(a.ux * b.ux + a.uz * b.uz) < 0.88) continue;
        const rx = (b.x1 + b.x2) * 0.5 - mx, rz = (b.z1 + b.z2) * 0.5 - mz;
        const along = rx * a.ux + rz * a.uz, perp = rx * nx + rz * nz;
        if (Math.abs(perp) < minPerp || Math.abs(perp) > maxPerp || Math.abs(along) > (a.L + b.L) * 0.55) continue;
        if (!best || Math.abs(perp) < Math.abs(best.perp)) best = { b, perp };
      }
      if (best) nbrPerp.set(a.ri + ':' + a.i, best.perp);
    }

    const done = new Set();
    for (const a of segs) {
      const perp = nbrPerp.get(a.ri + ':' + a.i);
      if (perp === undefined) continue;
      const sh = (Math.abs(perp) - targetGap) * 0.5;
      if (Math.abs(sh) < 0.05) continue;
      const sgn = Math.sign(perp);
      const sx = -a.uz * sgn * sh, sz = a.ux * sgn * sh;
      const rp = world.roads[a.ri].p;
      for (const pi of [a.i, a.i + 1]) {
        const k2 = a.ri + ':' + pi;
        if (done.has(k2)) continue;
        done.add(k2);
        rp[pi][0] += sx;
        rp[pi][1] += sz;
      }
    }
  };

  alignPairedCorridor(r => Boolean(r.n && r.n.includes('100 Feet')), GAP100, 4, 34);
  alignPairedCorridor(r => Boolean(r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'))), GAPCMH, 4, 26);

  // 2. Build spatial index of final widened road segments
  const G = 28;
  const segGrid = new Map();
  for (let ri = 0; ri < world.roads.length; ri++) {
    const r = world.roads[ri];
    if (!r.p || r.p.length < 2) continue;
    const w = getRoadWidth(r);
    const fw = r.k >= 4 ? 2.3 : (r.k >= 2 ? 1.5 : 0.8);
    const clearHalf = w * 0.5 + fw + 0.55;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      if (L < 0.2) continue;
      const seg = { x1, z1, x2, z2, dx, dz, L, L2: L * L, ux: dx / L, uz: dz / L, w, clearHalf, k: r.k || 2 };
      const mnx = Math.min(x1, x2) - clearHalf - 8;
      const mxx = Math.max(x1, x2) + clearHalf + 8;
      const mnz = Math.min(z1, z2) - clearHalf - 8;
      const mxz = Math.max(z1, z2) + clearHalf + 8;
      for (let gx = Math.floor(mnx / G); gx <= Math.floor(mxx / G); gx++) {
        for (let gz = Math.floor(mnz / G); gz <= Math.floor(mxz / G); gz++) {
          const key = gx + ',' + gz;
          let cell = segGrid.get(key);
          if (!cell) segGrid.set(key, cell = []);
          cell.push(seg);
        }
      }
    }
  }

  const inPoly = (pts, x, z) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };

  // 3. Coherent rigid setback of existing building footprints out of widened carriageways + footpaths
  const keptBuildings = [];
  for (const b of world.buildings) {
    if (!b.p || b.p.length < 4) continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0;
    const nPts = b.p.length - 1;
    for (let i = 0; i < nPts; i++) {
      const q = b.p[i];
      x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]);
      z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]);
      cx += q[0]; cz += q[1];
    }
    cx /= nPts; cz /= nPts;

    const near = new Set();
    for (let gx = Math.floor(x0 / G); gx <= Math.floor(x1 / G); gx++) {
      for (let gz = Math.floor(z0 / G); gz <= Math.floor(z1 / G); gz++) {
        const cell = segGrid.get(gx + ',' + gz);
        if (cell) for (let k = 0; k < cell.length; k++) near.add(cell[k]);
      }
    }
    if (near.size === 0) {
      keptBuildings.push(b);
      continue;
    }

    const diag = Math.hypot(x1 - x0, z1 - z0);
    if (diag > 36) {
      let insideLen = 0;
      for (const s of near) {
        if (s.L >= 16 && inPoly(b.p, (s.x1 + s.x2) * 0.5, (s.z1 + s.z2) * 0.5)) insideLen += s.L;
      }
      if (insideLen >= 30) {
        keptBuildings.push(b);
        continue;
      }
    }

    let shiftX = 0, shiftZ = 0;
    for (let pass = 0; pass < 2; pass++) {
      const curCx = cx + shiftX, curCz = cz + shiftZ;
      for (const s of near) {
        const tc = Math.max(0, Math.min(1, ((curCx - s.x1) * s.dx + (curCz - s.z1) * s.dz) / s.L2));
        const rcx = s.x1 + s.dx * tc, rcz = s.z1 + s.dz * tc;
        let nx = curCx - rcx, nz = curCz - rcz;
        const nd = Math.hypot(nx, nz);
        if (nd < 0.001) {
          nx = -s.uz; nz = s.ux;
        } else {
          nx /= nd; nz /= nd;
        }

        let maxPen = 0;
        for (let i = 0; i < nPts; i++) {
          const vx = b.p[i][0] + shiftX, vz = b.p[i][1] + shiftZ;
          const tv = Math.max(0, Math.min(1, ((vx - s.x1) * s.dx + (vz - s.z1) * s.dz) / s.L2));
          const px = s.x1 + s.dx * tv, pz = s.z1 + s.dz * tv;
          const d = Math.hypot(vx - px, vz - pz);
          const sideDot = (vx - px) * nx + (vz - pz) * nz;
          const signedD = sideDot >= 0 ? d : -d;
          const pen = s.clearHalf - signedD;
          if (pen > maxPen) maxPen = pen;
        }
        if (maxPen > 0 && maxPen < 14.5) {
          shiftX += nx * maxPen;
          shiftZ += nz * maxPen;
        }
      }
    }

    if (shiftX !== 0 || shiftZ !== 0) {
      for (let i = 0; i < nPts; i++) {
        b.p[i][0] += shiftX;
        b.p[i][1] += shiftZ;
      }
      b.p[nPts][0] = b.p[0][0];
      b.p[nPts][1] = b.p[0][1];
    }

    let stillInsideCarriageway = false;
    for (let i = 0; i < nPts; i++) {
      const vx = b.p[i][0], vz = b.p[i][1];
      for (const s of near) {
        const tv = Math.max(0, Math.min(1, ((vx - s.x1) * s.dx + (vz - s.z1) * s.dz) / s.L2));
        const px = s.x1 + s.dx * tv, pz = s.z1 + s.dz * tv;
        const d = Math.hypot(vx - px, vz - pz);
        if (d < s.w * 0.5 + 0.8) {
          let ox = vx - px, oz = vz - pz;
          const ol = Math.hypot(ox, oz) || 1;
          ox /= ol; oz /= ol;
          b.p[i][0] = px + ox * s.clearHalf;
          b.p[i][1] = pz + oz * s.clearHalf;
        }
      }
    }
    b.p[nPts][0] = b.p[0][0];
    b.p[nPts][1] = b.p[0][1];

    let ncx = 0, ncz = 0;
    for (let i = 0; i < nPts; i++) { ncx += b.p[i][0]; ncz += b.p[i][1]; }
    ncx /= nPts; ncz /= nPts;
    for (const s of near) {
      const tc = Math.max(0, Math.min(1, ((ncx - s.x1) * s.dx + (ncz - s.z1) * s.dz) / s.L2));
      if (Math.hypot(ncx - (s.x1 + s.dx * tc), ncz - (s.z1 + s.dz * tc)) < s.w * 0.5 + 0.6) {
        stillInsideCarriageway = true;
        break;
      }
    }
    if (!stillInsideCarriageway) keptBuildings.push(b);
  }
  world.buildings = keptBuildings;
  return world;
}

export function buildStreet(world, scene, nightUniform, solidFn, extras = null) {
  prepareRoadCorridors(world);
  const roadSegs = [];
  const lampSpots = [];
  const vendorSpots = [];
  const parkedSpots = [];
  const bridgeVolumes = [];
  const speedBreakers = [];
  const solid = solidFn || (() => 0);

  // Dusty green/tan Bangalore ground plane
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x57534d, roughness: 0.97, metalness: 0.0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const widthMap = ROAD_WIDTH_MAP;

  const pos = [], col = [], uvs = [], idx = [];
  const fpPos = [], fpCol = [], fpUvs = [], fpIdx = [];
  const kbPos = [], kbUvs = [], kbIdx = [];
  const dp = [], dCol = [], di = [];
  const divPos = [], divIdx = [];
  const patchPos = [], patchCol = [], patchIdx = [];
  const potholeSpots = [];
  const utilityPoles = [];
  const metroPiers = [], metroDecks = [], cmhSegs = [], cmhCands = [];
  let gantryRef = null;

  let v = 0, fpV = 0, kbV = 0, dv = 0, divV = 0, patV = 0;

  const medianQuads = [];
  const medianKerbs = [], medianStrips = [];
  let hundredSegs = [];
  const nbrSide = new Map();
  const collectHundred = () => {
    hundredSegs = [];
    world.roads.forEach((r, ri) => {
      if (!(r.n && r.n.includes('100 Feet'))) return;
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, az] = r.p[i], [bx, bz] = r.p[i + 1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 0.2) continue;
        hundredSegs.push({ ri, i, x1: ax, z1: az, x2: bx, z2: bz, ux: (bx - ax) / L, uz: (bz - az) / L, L });
      }
    });
  };
  const pairHundred = () => {
    for (const a of hundredSegs) {
      const nx = -a.uz, nz = a.ux;
      const mx = (a.x1 + a.x2) / 2, mz = (a.z1 + a.z2) / 2;
      let best = null;
      for (const b of hundredSegs) {
        if (b.ri === a.ri) continue;
        if (Math.abs(a.ux * b.ux + a.uz * b.uz) < 0.9) continue;
        const rx = (b.x1 + b.x2) / 2 - mx, rz = (b.z1 + b.z2) / 2 - mz;
        const along = rx * a.ux + rz * a.uz, perp = rx * nx + rz * nz;
        if (Math.abs(perp) < 5 || Math.abs(perp) > 34 || Math.abs(along) > (a.L + b.L) / 2) continue;
        if (!best || Math.abs(perp) < Math.abs(best.perp)) best = { b, perp };
      }
      if (!best) continue;
      const sg = Math.sign(best.perp);
      nbrSide.set(a.ri + ':' + a.i, sg);
      if (a.ri < best.b.ri) {
        const o1 = sg * W100 / 2, o2 = best.perp - sg * W100 / 2;
        if (Math.abs(o2) > Math.abs(o1)) {
          medianQuads.push([a.x1 + nx * o1, a.z1 + nz * o1, a.x1 + nx * o2, a.z1 + nz * o2, a.x2 + nx * o1, a.z2 + nz * o1, a.x2 + nx * o2, a.z2 + nz * o2]);
          const oM = (o1 + o2) / 2;
          medianKerbs.push([a.x1 + nx * o1, a.z1 + nz * o1, a.x2 + nx * o1, a.z2 + nz * o1]);
          medianKerbs.push([a.x1 + nx * o2, a.z1 + nz * o2, a.x2 + nx * o2, a.z2 + nz * o2]);
          medianStrips.push([a.x1 + nx * oM, a.z1 + nz * oM, a.x2 + nx * oM, a.z2 + nz * oM]);
        }
      }
    }
  };
  collectHundred();
  pairHundred();"""

    street = replace_exact(street, street_old_1, street_new_1, "street.js: prepareRoadCorridors & W100/WCMH/widthMap")

    street_old_2 = """    // User rule (2026-10-23): 2 lanes TOTAL per road, one each way. Divided corridors
    // (100 Ft, CMH/metro) are one-way single-lane carriageway pairs around the median.
    const w = is100Ft ? W100 : (isCMH ? 4.8 : (widthMap[r.k] || 7.0)); // CMH: carriageway pair with a median that holds the metro piers"""

    street_new_2 = """    const w = getRoadWidth(r);"""
    street = replace_exact(street, street_old_2, street_new_2, "street.js: main road loop width")

    street_old_3 = """  for (const [cx, cz, yaw, rj] of cmhCands) {
    let bd = 1e9, bx = 0, bz = 0, bRi = -1;
    for (const [x1, z1, x2, z2, rk] of cmhSegs) {
      if (rk === rj) continue;
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cz - z1) * dz) / L2));
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(cx - px, cz - pz);
      if (d < bd) { bd = d; bx = px; bz = pz; bRi = rk; }
    }
    if (bd < 4 || bd > 22) continue; // no opposite carriageway nearby: no viaduct here
    const mx = (cx + bx) / 2, mz = (cz + bz) / 2;
    if (metroDecks.some(p => Math.hypot(p[0] - mx, p[1] - mz) < 20)) continue;
    metroDecks.push([mx, mz, yaw]);
    // direction from this carriageway to its opposite = across the median
    let px = bx - cx, pz = bz - cz; const pl = Math.hypot(px, pz) || 1; px /= pl; pz /= pl;
    const HWC = 2.4; // carriageway half-width for the CMH/100 Ft class roads (1 lane each)
    const medianGap = bd - 2 * HWC; // physical clear strip between the carriageway edges
    if (medianGap >= 2.4) {
      // genuine median: single slim central column wholly inside the median strip (>=0.3m clear of both carriageway edges)
      // - unless a third drivable way passes too close
      if (distToRoads(mx, mz, [cx, cz], [bx, bz]) >= 4.95) metroPiers.push([mx, mz, yaw, medianGap]);
      else metroDecks.pop();
    } else {
      // no real median: long-span the viaduct - no ground piers at all beside the lanes.
      // (portal columns hugging the carriageway edges were rejected as lane-side obstacles)
    }
  }"""

    street_new_3 = """  for (const [cx, cz, yaw, rj] of cmhCands) {
    let bd = 1e9, bx = 0, bz = 0, bRi = -1;
    for (const [x1, z1, x2, z2, rk] of cmhSegs) {
      if (rk === rj) continue;
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cz - z1) * dz) / L2));
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(cx - px, cz - pz);
      if (d < bd) { bd = d; bx = px; bz = pz; bRi = rk; }
    }
    if (bd < 6 || bd > 28) continue;
    const mx = (cx + bx) / 2, mz = (cz + bz) / 2;
    if (metroDecks.some(p => Math.hypot(p[0] - mx, p[1] - mz) < 20)) continue;
    metroDecks.push([mx, mz, yaw]);
    const HWC = WCMH * 0.5;
    const medianGap = bd - 2 * HWC;
    if (medianGap >= 2.2) {
      if (distToRoads(mx, mz, [cx, cz], [bx, bz]) >= HWC + 2.2) metroPiers.push([mx, mz, yaw, medianGap]);
      else metroDecks.pop();
    }
  }"""

    street = replace_exact(street, street_old_3, street_new_3, "street.js: CMH metro pier median gap")

    street_old_4 = """    for (const sz of [-11, 11]) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(7.5, 7.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 }));
      stair.position.set(-10, 3.7, sz);
      stair.rotation.z = 0;
      stGroup.add(stair);
    }"""

    street_new_4 = """    for (const sz of [-14.5, 14.5]) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(7.5, 7.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 }));
      stair.position.set(-10, 3.7, sz);
      stair.rotation.z = 0;
      stGroup.add(stair);
    }"""

    street = replace_exact(street, street_old_4, street_new_4, "street.js: station stair clearance")

    street_old_5 = """      for (const s of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.95, len), culvMat);
        wall.position.set(s * 4.4, 0.48, 0);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, len), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        stripe.position.set(s * 4.4, 0.82, 0);
        rbg.add(wall, stripe);
      }"""

    street_new_5 = """      for (const s of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.95, len), culvMat);
        wall.position.set(s * 7.6, 0.48, 0);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, len), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        stripe.position.set(s * 7.6, 0.82, 0);
        rbg.add(wall, stripe);
      }"""

    street = replace_exact(street, street_old_5, street_new_5, "street.js: roadBridge parapet width")

    street_old_6 = """  for (const r of world.roads) {
    const rw = (r.n && r.n.includes('100 Feet')) ? W100 : ((r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'))) ? 4.8 : (widthMap[r.k] || 7.0));
    const fw = r.k >= 4 ? 2.3 : 1.5;"""

    street_new_6 = """  for (const r of world.roads) {
    const rw = getRoadWidth(r);
    const fw = r.k >= 4 ? 2.3 : 1.5;"""

    street = replace_exact(street, street_old_6, street_new_6, "street.js: legacy treeSpots rw lookup")

    street_old_7 = """  // Street Lamps
  for (const r of world.roads) {
    if (r.k < 3) continue;
    const rw = (r.n && r.n.includes('100 Feet')) ? W100 : ((r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'))) ? 4.8 : (widthMap[r.k] || 7.0));
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      for (let s = 6; s < L; s += 32) {
        const side = i % 2 ? 1 : -1;
        const off = (rw / 2 + 1.1) * side;
        const lx = x1 + (dx * s) / L - (dz / L) * off;
        const lz = z1 + (dz * s) / L + (dx / L) * off;
        const yaw = Math.atan2(-dz * side, dx * side);
        if (isInCarriageway(lx, lz)) continue;
        lampSpots.push({ x: lx + Math.cos(yaw) * 1.1, z: lz - Math.sin(yaw) * 1.1, poleX: lx, poleZ: lz, yaw, h: 6.05 });
      }
    }
  }"""

    street_new_7 = """  // Street Lamps
  for (const r of world.roads) {
    if (r.k < 3) continue;
    const is100 = Boolean(r.n && r.n.includes('100 Feet'));
    const rw = getRoadWidth(r);
    const riLamp = world.roads.indexOf(r);
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
      const medS = is100 ? (nbrSide.get(riLamp + ':' + i) || 0) : 0;
      for (let s = 6; s < L; s += 32) {
        const side = medS !== 0 ? (medS > 0 ? -1 : 1) : (i % 2 ? 1 : -1);
        const off = (rw / 2 + 1.1) * side;
        const lx = x1 + (dx * s) / L - (dz / L) * off;
        const lz = z1 + (dz * s) / L + (dx / L) * off;
        const yaw = Math.atan2(-dz * side, dx * side);
        if (isInCarriageway(lx, lz)) continue;
        lampSpots.push({ x: lx + Math.cos(yaw) * 1.1, z: lz - Math.sin(yaw) * 1.1, poleX: lx, poleZ: lz, yaw, h: 6.05 });
      }
    }
  }"""

    street = replace_exact(street, street_old_7, street_new_7, "street.js: street lamps outer verge")
    write_file(root, "src/street.js", street)

    # --------------------------------------------------------------------------
    # 2. src/main.js (Stage A hunks)
    # --------------------------------------------------------------------------
    main_js = read_file(root, "src/main.js")

    main_old_1 = """import { buildStreet } from './street.js';"""
    main_new_1 = """import { buildStreet, prepareRoadCorridors, getRoadWidth } from './street.js';"""
    main_js = replace_exact(main_js, main_old_1, main_new_1, "main.js: import prepareRoadCorridors & getRoadWidth")

    main_old_2 = """// push a brand plot off the carriageway and face it at the nearest road
function plotBesideRoad(x, z) {
  let best = 1e9, nx = x, nz = z;
  for (const r of world.roads) {
    if (r.k < 2) continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; nx = px; nz = pz; }
    }
  }
  const want = 15;
  let ox = x, oz = z;
  if (best < want) {
    let vx = x - nx, vz = z - nz; const vl = Math.hypot(vx, vz);
    if (vl < 0.5) { vx = 1; vz = 0; } else { vx /= vl; vz /= vl; }
    ox = nx + vx * want; oz = nz + vz * want;
  }
  return { x: ox, z: oz, yaw: Math.atan2(nx - ox, nz - oz) };
}
const brandPlots = {};

function setupLandmarks() {
  const used = new Set();
  for (const item of STOP_LIST) {
    const { name, tag, brand } = item;
    if (brand && STOP_PLACES[name]) {
      const sp = STOP_PLACES[name];
      const pl = brandPlots[name] || plotBesideRoad(sp.x, sp.z);
      const model = buildBrandStore(name, THREE, nightUniform);
      model.position.set(pl.x, 0, pl.z);
      model.rotation.y = pl.yaw;
      brandGroup.add(model);
      stops.push({ p: { n: name, t: tag.toLowerCase(), x: pl.x, z: pl.z }, tag, road: sp.road, brand: true });
      continue;
    }
    if (name === 'Indiranagar Metro' && extras && extras.station && extras.station.pts) {
      const pts = extras.station.pts;
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      stops.push({ p: { n: name, t: 'station', x: cx, z: cz }, tag, road: nearestRoadInfo(cx, cz).name || 'CMH Road', brand: false });
      continue;
    }
    const searchName = name === 'Indiranagar Metro' ? 'Indiranagar station' : name;
    const lmExact = LANDMARKS_DATA.find(l => l.name === searchName);
    let p = world.pois.find(q => q.n === searchName && !used.has(q));
    if (!p && lmExact) p = { n: name, t: lmExact.type, x: lmExact.x, z: lmExact.z };
    if (!p) continue;
    used.add(p);
    const rInfo = nearestRoadInfo(p.x, p.z);
    const road = lmExact ? lmExact.nearestRoad : rInfo.name;
    const yaw = lmExact ? lmExact.faceYaw : rInfo.yaw;
    const model = buildLandmark(searchName, THREE);
    model.position.set(p.x, 0, p.z);
    model.rotation.y = yaw;
    scene.add(model);
    stops.push({ p: { n: name, t: p.t, x: p.x, z: p.z }, tag, road, brand: false });
  }
}"""

    main_new_2 = """// push a brand/landmark plot off the doubled carriageway + footpath and face it at the nearest road
function plotBesideRoad(x, z) {
  let best = 1e9, nx = x, nz = z, bestW = 14.0;
  for (const r of world.roads) {
    if (r.k < 2) continue;
    const rw = getRoadWidth(r);
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; nx = px; nz = pz; bestW = rw; }
    }
  }
  const want = Math.max(17.5, bestW * 0.5 + 8.5);
  let ox = x, oz = z;
  if (best < want) {
    let vx = x - nx, vz = z - nz; const vl = Math.hypot(vx, vz);
    if (vl < 0.5) { vx = 1; vz = 0; } else { vx /= vl; vz /= vl; }
    ox = nx + vx * want; oz = nz + vz * want;
  }
  return { x: ox, z: oz, yaw: Math.atan2(nx - ox, nz - oz) };
}
const brandPlots = {};

function setupLandmarks() {
  const used = new Set();
  for (const item of STOP_LIST) {
    const { name, tag, brand } = item;
    if (brand && STOP_PLACES[name]) {
      const sp = STOP_PLACES[name];
      const pl = brandPlots[name] || plotBesideRoad(sp.x, sp.z);
      const model = buildBrandStore(name, THREE, nightUniform);
      model.position.set(pl.x, 0, pl.z);
      model.rotation.y = pl.yaw;
      brandGroup.add(model);
      stops.push({ p: { n: name, t: tag.toLowerCase(), x: pl.x, z: pl.z }, tag, road: sp.road, brand: true });
      continue;
    }
    if (name === 'Indiranagar Metro' && extras && extras.station && extras.station.pts) {
      const pts = extras.station.pts;
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      stops.push({ p: { n: name, t: 'station', x: cx, z: cz }, tag, road: nearestRoadInfo(cx, cz).name || 'CMH Road', brand: false });
      continue;
    }
    const searchName = name === 'Indiranagar Metro' ? 'Indiranagar station' : name;
    const lmExact = LANDMARKS_DATA.find(l => l.name === searchName);
    let p = world.pois.find(q => q.n === searchName && !used.has(q));
    if (!p && lmExact) p = { n: name, t: lmExact.type, x: lmExact.x, z: lmExact.z };
    if (!p) continue;
    used.add(p);
    const pl = plotBesideRoad(p.x, p.z);
    const lx = pl.x, lz = pl.z;
    if (lmExact) { lmExact.x = lx; lmExact.z = lz; }
    const rInfo = nearestRoadInfo(lx, lz);
    const road = lmExact ? lmExact.nearestRoad : rInfo.name;
    const yaw = lmExact ? lmExact.faceYaw : rInfo.yaw;
    const model = buildLandmark(searchName, THREE);
    model.position.set(lx, 0, lz);
    model.rotation.y = yaw;
    scene.add(model);
    stops.push({ p: { n: name, t: p.t, x: lx, z: lz }, tag, road, brand: false });
  }
}"""

    main_js = replace_exact(main_js, main_old_2, main_new_2, "main.js: plotBesideRoad & setupLandmarks")

    main_old_3 = """  world.roads.push({ k: 3, n: 'Old Airport Road', p: LEELA_ACCESS_ROAD });
  (function infill() {
    const WM = { 5: 14.5, 4: 10.5, 3: 8.2, 2: 7, 1: 5.5 };
    const segs = [];
    for (const r of world.roads) {
      if (!r.p || r.p.length < 2) continue;
      const hw = ((r.n || '').includes('100 Feet') ? 10 : (WM[r.k] || 7)) / 2 + 3.2;
      for (let i = 0; i < r.p.length - 1; i++) segs.push([r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], hw]);
    }"""

    main_new_3 = """  world.roads.push({ k: 3, n: 'Old Airport Road', p: LEELA_ACCESS_ROAD });
  prepareRoadCorridors(world);
  for (const lm of LANDMARKS_DATA) {
    const adj = plotBesideRoad(lm.x, lm.z);
    lm.x = adj.x; lm.z = adj.z;
  }
  (function infill() {
    const segs = [];
    for (const r of world.roads) {
      if (!r.p || r.p.length < 2) continue;
      const fw = r.k >= 4 ? 2.3 : 1.5;
      const hw = getRoadWidth(r) * 0.5 + fw + 2.8;
      for (let i = 0; i < r.p.length - 1; i++) segs.push([r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], hw]);
    }"""

    main_js = replace_exact(main_js, main_old_3, main_new_3, "main.js: boot prepareRoadCorridors & infill widths")
    write_file(root, "src/main.js", main_js)

    # --------------------------------------------------------------------------
    # 3. src/city.js
    # --------------------------------------------------------------------------
    city_js = read_file(root, "src/city.js")

    city_old_1 = """    if (area > 32) {
      const comm = commEarly;
      if (comm.dist < 30 && comm.dist > 7) {
        shopFronts.push({ x: cx, z: cz, rx: comm.rx, rz: comm.rz, dist: comm.dist, h, yaw: comm.yaw, r });
      }
    }"""

    city_new_1 = """    if (area > 32) {
      const comm = commEarly;
      if (comm.dist < 36 && comm.dist > 10.5) {
        shopFronts.push({ x: cx, z: cz, rx: comm.rx, rz: comm.rz, dist: comm.dist, h, yaw: comm.yaw, r });
      }
    }"""

    city_js = replace_exact(city_js, city_old_1, city_new_1, "city.js: shopFronts distance window")

    city_old_2 = """  const nearRoad = (px, pz, lim) => {
    for (const r of world.roads) {
      const p = r.p;
      for (let j = 0; j < p.length - 1; j++) {
        const ax = p[j][0], az = p[j][1], bx = p[j + 1][0], bz = p[j + 1][1];
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
        if (Math.hypot(px - ax - dx * t, pz - az - dz * t) < lim) return true;
      }
    }
    return false;
  };
  const maxSigns = Math.min(shopFronts.length, 320);
  for (let i = 0; i < maxSigns; i++) {
    const sf = shopFronts[i];
    // Position signboard just outside the building wall along the vector from building centre to nearest road point
    const wallPush = Math.max(3.5, sf.dist - 8.2);
    const sx = sf.x + Math.sin(sf.yaw) * wallPush;
    const sz = sf.z + Math.cos(sf.yaw) * wallPush;

    if (nearRoad(sx, sz, 9.5)) continue;"""

    city_new_2 = """  const nearRoad = (px, pz) => {
    for (const r of world.roads) {
      const p = r.p;
      const rw = (r.n && r.n.includes('100 Feet')) ? 10.4
        : ((r.n && (r.n.includes('Chinmaya') || r.n.includes('CMH') || r.n.includes('Old Madras'))) ? 9.6
        : ({ 5: 15.2, 4: 14.4, 3: 14.0, 2: 13.2, 1: 11.0 }[r.k] || 14.0));
      const lim = rw * 0.5 + 2.4;
      for (let j = 0; j < p.length - 1; j++) {
        const ax = p[j][0], az = p[j][1], bx = p[j + 1][0], bz = p[j + 1][1];
        const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
        if (Math.hypot(px - ax - dx * t, pz - az - dz * t) < lim) return true;
      }
    }
    return false;
  };
  const maxSigns = Math.min(shopFronts.length, 320);
  for (let i = 0; i < maxSigns; i++) {
    const sf = shopFronts[i];
    const wallPush = Math.max(3.2, sf.dist - 10.8);
    const sx = sf.x + Math.sin(sf.yaw) * wallPush;
    const sz = sf.z + Math.cos(sf.yaw) * wallPush;

    if (nearRoad(sx, sz)) continue;"""

    city_js = replace_exact(city_js, city_old_2, city_new_2, "city.js: signboard road clearance")
    write_file(root, "src/city.js", city_js)

    # --------------------------------------------------------------------------
    # 4. src/trees.js
    # --------------------------------------------------------------------------
    trees_js = read_file(root, "src/trees.js")

    trees_old_1 = """  // Check if (x, z) is within 14m of another road segment's centreline (junction zone) or inside ANY carriageway
  function checkJunctionOrCarriageway(x, z, ownSegIdx) {
    const ownSeg = roadSegs[ownSegIdx];
    const ownName = ownSeg ? (ownSeg.name ?? ownSeg[4] ?? '') : '';

    for (let i = 0; i < roadSegs.length; i++) {
      if (i === ownSegIdx) continue;
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const rw = s.width ?? s[6] ?? 7.5;
      const sName = s.name ?? s[4] ?? '';

      const margin = 14.5;
      if (x < Math.min(x1, x2) - margin || x > Math.max(x1, x2) + margin) continue;
      if (z < Math.min(z1, z2) - margin || z > Math.max(z1, z2) + margin) continue;

      const dx = x2 - x1, dz = z2 - z1;
      const L2 = dx * dx + dz * dz || 1;
      const t = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));

      // Never place inside any road's carriageway + kerb buffer
      if (d < rw * 0.5 + 1.8) return true;

      // Skip junction zones within 14m of a cross-road centreline
      const sharesEndpoint =
        Math.hypot(x1 - (ownSeg.x1 ?? ownSeg[0]), z1 - (ownSeg.z1 ?? ownSeg[1])) < 1.5 ||
        Math.hypot(x1 - (ownSeg.x2 ?? ownSeg[2]), z1 - (ownSeg.z2 ?? ownSeg[3])) < 1.5 ||
        Math.hypot(x2 - (ownSeg.x1 ?? ownSeg[0]), z2 - (ownSeg.z1 ?? ownSeg[1])) < 1.5 ||
        Math.hypot(x2 - (ownSeg.x2 ?? ownSeg[2]), z2 - (ownSeg.z2 ?? ownSeg[3])) < 1.5;

      if (!sharesEndpoint || (sName !== ownName)) {
        if (d < 14.0) return true;
      }
    }
    return false;
  }

  function isUnderBridge(x, z) {
    for (let i = 0; i < bridgeVolumes.length; i++) {
      const b = bridgeVolumes[i];
      if (Math.hypot(x - b.x, z - b.z) < (b.r || 18) + 4.0) return true;
    }
    return false;
  }

  // True when parallel roads lie on BOTH sides within 20 m (i.e. the strip between two carriageways)
  function isBetweenCarriageways(x, z) {
    let best = null, bd = 1e9;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
      const tt = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / (L * L), 0, 1);
      const d = Math.hypot(x - (x1 + dx * tt), z - (z1 + dz * tt));
      if (d < bd) { bd = d; best = { ux: dx / L, uz: dz / L }; }
    }
    if (!best) return false;
    let left = false, right = false;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      if (Math.abs(ux * best.ux + uz * best.uz) < 0.9) continue;
      const tt = T.MathUtils.clamp(((x - x1) * ux + (z - z1) * uz) / L, 0, 1);
      const d = Math.hypot(x - (x1 + dx * tt), z - (z1 + dz * tt));
      if (d > 20) continue;
      const cr = (x - x1) * uz - (z - z1) * ux;
      if (cr > 2.5) left = true; else if (cr < -2.5) right = true;
    }
    return left && right;
  }

  // Place roadside trees along both sides of roads: dense on 100 Feet Road, CMH Road, 12th Main, sparser on side streets
  for (let idx = 0; idx < roadSegs.length; idx++) {
    const s = roadSegs[idx];
    const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
    const name = s.name ?? s[4] ?? '';
    const kind = s.kind ?? s[5] ?? 2;
    const width = s.width ?? s[6] ?? 7.0;

    const dx = x2 - x1, dz = z2 - z1;
    const L = Math.hypot(dx, dz);
    if (L < 11) continue;
    const ux = dx / L, uz = dz / L;

    const isPrimeAvenue =
      name.includes('100 Feet') ||
      name.includes('Chinmaya') ||
      name.includes('CMH') ||
      name.includes('12th Main') ||
      name.includes('80 Feet') ||
      kind >= 4;

    const baseStep = isPrimeAvenue ? 9.5 : 13.5;
    const minSpacing = isPrimeAvenue ? 8.2 : 11.2;

    for (let dist = 5.5; dist < L - 4.5; dist += baseStep + hash(x1 + dist, z1, seed) * 5.2) {
      for (const side of [-1, 1]) {
        const hVal = hash(x1 * side + dist, z1 - dist, seed);
        if (!isPrimeAvenue && hVal < 0.36) continue;

        // Verge offset: width/2 + 2.2m to 4.5m from road centreline
        const vergeOff = width * 0.5 + 3.9 + hash(z1 + dist, x1 * side, seed) * 1.6;
        const tx = x1 + ux * dist - uz * vergeOff * side;
        const tz = z1 + uz * dist + ux * vergeOff * side;

        // Keep player spawn (-133, -345) clear
        if (Math.hypot(tx - (-133), tz - (-345)) < 34) continue;

        // Check building footprints (solidFn) with a small clearance buffer
        if (
          solidFn(tx, tz) ||
          solidFn(tx + 1.4, tz) ||
          solidFn(tx - 1.4, tz) ||
          solidFn(tx, tz + 1.4) ||
          solidFn(tx, tz - 1.4)
        ) continue;

        if (isUnderBridge(tx, tz)) continue;
        if (isBetweenCarriageways(tx, tz)) continue;
        if (isTooCloseToOtherTree(tx, tz, minSpacing)) continue;
        if (checkJunctionOrCarriageway(tx, tz, idx)) continue;

        // Yaw pointing inward from the kerb toward the road centreline
        const roadInwardYaw = Math.atan2(uz * side, -ux * side);
        const overhangsRoad = hVal > 0.62; // ~38% of crowns lean out over the kerb/carriageway

        // Species selection: 0 = Samanea saman (Rain Tree), 1 = Gulmohar (Flame red-orange), 2 = Ficus/Copper-pod
        const spRand = hash(tx, tz, seed + 7);
        const species = spRand < 0.72 ? 0 : (spRand < 0.88 ? 1 : 2);

        registerTreeSpot({
          x: tx,
          z: tz,
          roadInwardYaw,
          overhangsRoad,
          species,
          scaleXZ: 0.75 + hash(tz, tx, seed) * 0.42, // Crown radius ~5m to 8m
          scaleY: 0.82 + hash(tx + 9, tz, seed) * 0.38, // Total height ~9m to 13m
          hasBand: hVal > 0.42,
          hasGuard: isPrimeAvenue && hVal < 0.52
        });
      }
    }
  }"""

    trees_new_1 = """  function checkJunctionOrCarriageway(x, z, ownSegIdx) {
    const ownSeg = roadSegs[ownSegIdx];
    const ownName = ownSeg ? (ownSeg.name ?? ownSeg[4] ?? '') : '';

    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const rw = s.width ?? s[6] ?? 14.0;
      const sName = s.name ?? s[4] ?? '';

      const margin = rw * 0.5 + 8.5;
      if (x < Math.min(x1, x2) - margin || x > Math.max(x1, x2) + margin) continue;
      if (z < Math.min(z1, z2) - margin || z > Math.max(z1, z2) + margin) continue;

      const dx = x2 - x1, dz = z2 - z1;
      const L2 = dx * dx + dz * dz || 1;
      const t = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));

      if (d < rw * 0.5 + 1.65) return true;
      if (i === ownSegIdx) continue;

      const sharesEndpoint =
        Math.hypot(x1 - (ownSeg.x1 ?? ownSeg[0]), z1 - (ownSeg.z1 ?? ownSeg[1])) < 1.5 ||
        Math.hypot(x1 - (ownSeg.x2 ?? ownSeg[2]), z1 - (ownSeg.z2 ?? ownSeg[3])) < 1.5 ||
        Math.hypot(x2 - (ownSeg.x1 ?? ownSeg[0]), z2 - (ownSeg.z1 ?? ownSeg[1])) < 1.5 ||
        Math.hypot(x2 - (ownSeg.x2 ?? ownSeg[2]), z2 - (ownSeg.z2 ?? ownSeg[3])) < 1.5;

      if (!sharesEndpoint || (sName !== ownName)) {
        if (d < rw * 0.5 + 5.5) return true;
      }
    }
    return false;
  }

  function isUnderBridge(x, z) {
    for (let i = 0; i < bridgeVolumes.length; i++) {
      const b = bridgeVolumes[i];
      if (Math.hypot(x - b.x, z - b.z) < (b.r || 18) + 4.0) return true;
    }
    return false;
  }

  function isBetweenCarriageways(x, z) {
    let best = null, bd = 1e9;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
      const tt = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / (L * L), 0, 1);
      const d = Math.hypot(x - (x1 + dx * tt), z - (z1 + dz * tt));
      if (d < bd) { bd = d; best = { ux: dx / L, uz: dz / L }; }
    }
    if (!best) return false;
    let left = false, right = false;
    for (let i = 0; i < roadSegs.length; i++) {
      const s = roadSegs[i];
      const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      if (Math.abs(ux * best.ux + uz * best.uz) < 0.88) continue;
      const tt = T.MathUtils.clamp(((x - x1) * ux + (z - z1) * uz) / L, 0, 1);
      const d = Math.hypot(x - (x1 + dx * tt), z - (z1 + dz * tt));
      if (d > 28) continue;
      const cr = (x - x1) * uz - (z - z1) * ux;
      if (cr > 2.2) left = true; else if (cr < -2.2) right = true;
    }
    return left && right;
  }

  for (let idx = 0; idx < roadSegs.length; idx++) {
    const s = roadSegs[idx];
    const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
    const name = s.name ?? s[4] ?? '';
    const kind = s.kind ?? s[5] ?? 2;
    const width = s.width ?? s[6] ?? 14.0;

    const dx = x2 - x1, dz = z2 - z1;
    const L = Math.hypot(dx, dz);
    if (L < 11) continue;
    const ux = dx / L, uz = dz / L;

    const isPrimeAvenue =
      name.includes('100 Feet') ||
      name.includes('Chinmaya') ||
      name.includes('CMH') ||
      name.includes('12th Main') ||
      name.includes('80 Feet') ||
      kind >= 4;

    const baseStep = isPrimeAvenue ? 9.5 : 13.5;
    const minSpacing = isPrimeAvenue ? 8.2 : 11.2;
    const fw = kind >= 4 ? 2.3 : 1.5;

    for (let dist = 5.5; dist < L - 4.5; dist += baseStep + hash(x1 + dist, z1, seed) * 5.2) {
      for (const side of [-1, 1]) {
        const hVal = hash(x1 * side + dist, z1 - dist, seed);
        if (!isPrimeAvenue && hVal < 0.36) continue;

        let tx = 0, tz = 0, placed = false;
        const jitter = hash(z1 + dist, x1 * side, seed) * 0.9;
        for (const extraOff of [fw + 0.55 + jitter, fw * 0.72 + 0.35, fw + 1.45]) {
          const vergeOff = width * 0.5 + extraOff;
          const cx = x1 + ux * dist - uz * vergeOff * side;
          const cz = z1 + uz * dist + ux * vergeOff * side;
          if (Math.hypot(cx - (-133), cz - (-345)) < 34) break;
          if (
            solidFn(cx, cz) ||
            solidFn(cx + 1.1, cz) ||
            solidFn(cx - 1.1, cz) ||
            solidFn(cx, cz + 1.1) ||
            solidFn(cx, cz - 1.1)
          ) continue;
          if (isUnderBridge(cx, cz)) continue;
          if (isBetweenCarriageways(cx, cz)) continue;
          if (isTooCloseToOtherTree(cx, cz, minSpacing)) continue;
          if (checkJunctionOrCarriageway(cx, cz, idx)) continue;
          tx = cx; tz = cz; placed = true;
          break;
        }
        if (!placed) continue;

        const roadInwardYaw = Math.atan2(uz * side, -ux * side);
        const overhangsRoad = hVal > 0.62;
        const spRand = hash(tx, tz, seed + 7);
        const species = spRand < 0.72 ? 0 : (spRand < 0.88 ? 1 : 2);

        registerTreeSpot({
          x: tx,
          z: tz,
          roadInwardYaw,
          overhangsRoad,
          species,
          scaleXZ: 0.75 + hash(tz, tx, seed) * 0.42,
          scaleY: 0.82 + hash(tx + 9, tz, seed) * 0.38,
          hasBand: hVal > 0.42,
          hasGuard: isPrimeAvenue && hVal < 0.52
        });
      }
    }
  }"""

    trees_js = replace_exact(trees_js, trees_old_1, trees_new_1, "trees.js: doubled-width verge & junction placement")
    write_file(root, "src/trees.js", trees_js)

    # --------------------------------------------------------------------------
    # 5. src/people.js (Stage A hunks)
    # --------------------------------------------------------------------------
    people_js = read_file(root, "src/people.js")

    people_old_1 = """  // Compute valid footpath/verge offset strictly between 3.4m and 6.0m from road centreline
  function pointOnAnyCarriageway(x, z) {
    for (let i = 0; i < roadSegs.length; i++) {
      const r = roadSegs[i];
      const x1 = r.x1 ?? r[0], z1 = r.z1 ?? r[1], x2 = r.x2 ?? r[2], z2 = r.z2 ?? r[3];
      if (x < Math.min(x1, x2) - 9 || x > Math.max(x1, x2) + 9 || z < Math.min(z1, z2) - 9 || z > Math.max(z1, z2) + 9) continue;
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
      const w = r.width ?? r[6] ?? 7;
      if (d < w * 0.5 + 0.4) return true;
    }
    return false;
  }
  function offsetClear(seg, off) {
    for (const t of [0.05, 0.3, 0.55, 0.8, 0.95]) {
      const p = evalFootpathPoint(seg, t, off);
      if (pointOnAnyCarriageway(p.x, p.z)) return false;
    }
    return true;
  }
  function computeFootpathOffset(seg, side, seedVal) {
    const minOff = Math.max(3.4, seg.width * 0.5 + 0.65);
    const maxOff = Math.min(6.0, Math.max(minOff + 0.4, seg.width * 0.5 + 1.85));
    const mag = T.MathUtils.clamp(minOff + hash(seedVal, seg.mx, 19) * (maxOff - minOff), 3.4, 6.0);
    if (offsetClear(seg, mag * side)) return mag * side;
    if (offsetClear(seg, -mag * side)) return -mag * side;
    return mag * side;
  }"""

    people_new_1 = """  function pointOnAnyCarriageway(x, z) {
    for (let i = 0; i < roadSegs.length; i++) {
      const r = roadSegs[i];
      const x1 = r.x1 ?? r[0], z1 = r.z1 ?? r[1], x2 = r.x2 ?? r[2], z2 = r.z2 ?? r[3];
      const w = r.width ?? r[6] ?? 14.0;
      const bound = w * 0.5 + 2.0;
      if (x < Math.min(x1, x2) - bound || x > Math.max(x1, x2) + bound || z < Math.min(z1, z2) - bound || z > Math.max(z1, z2) + bound) continue;
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = T.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / L2, 0, 1);
      const d = Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
      if (d < w * 0.5 + 0.4) return true;
    }
    return false;
  }
  function offsetClear(seg, off) {
    for (const t of [0.05, 0.3, 0.55, 0.8, 0.95]) {
      const p = evalFootpathPoint(seg, t, off);
      if (pointOnAnyCarriageway(p.x, p.z)) return false;
    }
    return true;
  }
  function computeFootpathOffset(seg, side, seedVal) {
    const minOff = seg.width * 0.5 + 0.65;
    const maxOff = seg.width * 0.5 + 1.85;
    const mag = minOff + hash(seedVal, seg.mx, 19) * (maxOff - minOff);
    if (offsetClear(seg, mag * side)) return mag * side;
    if (offsetClear(seg, -mag * side)) return -mag * side;
    return mag * side;
  }"""

    people_js = replace_exact(people_js, people_old_1, people_new_1, "people.js: footpath offset for doubled widths")

    people_old_2 = """  // Static Street Vendors standing by pushcarts on wide verges
  const vendorSpots = [];
  for (let i = 0; i < walkSegs.length && vendorSpots.length < 14; i++) {
    const s = walkSegs[i];
    if (s.len < 28) continue;
    for (const frac of [0.28, 0.72]) {
      if (vendorSpots.length >= 14) break;
      const side = (i % 2 === 0) ? 1 : -1;
      const vOff = Math.min(5.8, Math.max(4.1, s.width * 0.5 + 1.45)) * side;
      const vx = s.x1 + s.ux * s.len * frac - s.uz * vOff;
      const vz = s.z1 + s.uz * s.len * frac + s.ux * vOff;
      if (Math.hypot(vx - (-133), vz - (-345)) < 16) continue;
      if (!isSolidSafe(vx, vz) || !isSolidSafe(vx + 0.9, vz + 0.9) || !isSolidSafe(vx - 0.9, vz - 0.9)) continue;
      if (avoidFn(vx, vz, 1.1)) continue; // keep vendor carts out of parked-vehicle footprints (cart 1.15x1.65 -> r1.1)
      vendorSpots.push({ x: vx, z: vz, yaw: Math.atan2(s.ux, s.uz) });
    }
  }"""

    people_new_2 = """  // Static Street Vendors standing by pushcarts on wide verges
  const vendorSpots = [];
  for (let i = 0; i < walkSegs.length && vendorSpots.length < 14; i++) {
    const s = walkSegs[i];
    if (s.len < 28) continue;
    for (const frac of [0.28, 0.72]) {
      if (vendorSpots.length >= 14) break;
      const side = (i % 2 === 0) ? 1 : -1;
      const vOff = (s.width * 0.5 + 1.45) * side;
      const vx = s.x1 + s.ux * s.len * frac - s.uz * vOff;
      const vz = s.z1 + s.uz * s.len * frac + s.ux * vOff;
      if (Math.hypot(vx - (-133), vz - (-345)) < 16) continue;
      if (pointOnAnyCarriageway(vx, vz)) continue;
      if (!isSolidSafe(vx, vz) || !isSolidSafe(vx + 0.9, vz + 0.9) || !isSolidSafe(vx - 0.9, vz - 0.9)) continue;
      if (avoidFn(vx, vz, 1.1)) continue;
      vendorSpots.push({ x: vx, z: vz, yaw: Math.atan2(s.ux, s.uz) });
    }
  }"""

    people_js = replace_exact(people_js, people_old_2, people_new_2, "people.js: vendorSpots verge offset")
    write_file(root, "src/people.js", people_js)

    # --------------------------------------------------------------------------
    # 6. src/vehicles.js (Stage A hunks)
    # --------------------------------------------------------------------------
    vehicles_js = read_file(root, "src/vehicles.js")

    vehicles_old_1 = """  // Compute left-hand traffic lane offset (India keep-left rule)
  function computeLanePos(seg, t, dir) {
    // Keep strictly on the road carriageway, well clear of footpaths
    const laneOffset = Math.min(2.05, Math.max(1.35, seg.width * 0.22));"""

    vehicles_new_1 = """  // Compute left-hand traffic lane offset (India keep-left rule)
  function computeLanePos(seg, t, dir) {
    // Preserve stable inner lane offset on doubled roads so junctions never jump 4.2m
    const laneOffset = Math.min(2.05, Math.max(1.35, seg.width * 0.14));"""

    vehicles_js = replace_exact(vehicles_js, vehicles_old_1, vehicles_new_1, "vehicles.js: computeLanePos stable offset")

    vehicles_old_2 = """  // Helper checks
  function isOnAnyRoad(px, pz, ignoreSeg) {
    const obsList = (typeof obstructionSegs !== 'undefined') ? obstructionSegs : validSegs;
    for (let i = 0; i < obsList.length; i++) {
      const s = obsList[i];
      if (s === ignoreSeg) continue;
      const apx = px - s.x1;
      const apz = pz - s.z1;
      const proj = (apx * s.ux + apz * s.uz) / s.len;
      if (proj < -0.05 || proj > 1.05) continue;
      const clamped = T.MathUtils.clamp(proj, 0, 1);
      const cx = s.x1 + s.ux * s.len * clamped;
      const cz = s.z1 + s.uz * s.len * clamped;
      const d = Math.hypot(px - cx, pz - cz);
      if (d < s.width * 0.5 + 1.8) return true;
    }
    return false;
  }"""

    vehicles_new_2 = """  // Helper checks
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
  }"""

    vehicles_js = replace_exact(vehicles_js, vehicles_old_2, vehicles_new_2, "vehicles.js: parked isOnAnyRoad & median exclusion")
    write_file(root, "src/vehicles.js", vehicles_js)

    # --------------------------------------------------------------------------
    # 7. src/life.js (Stage A hunk)
    # --------------------------------------------------------------------------
    life_js = read_file(root, "src/life.js")

    life_old_1 = """  function computeLeftLanePos(seg, t, dir, extraOffset = 0) {
    const laneCenter = seg.divided ? seg.width * 0.24 : seg.width * 0.23;
    const offsetLeft = laneCenter + extraOffset;
    const lx = seg.uz * dir * offsetLeft;
    const lz = -seg.ux * dir * offsetLeft;
    return {
      x: seg.x1 + seg.ux * seg.len * t + lx,
      z: seg.z1 + seg.uz * seg.len * t + lz,
      yaw: Math.atan2(seg.ux * dir, seg.uz * dir)
    };
  }"""

    life_new_1 = """  function computeLeftLanePos(seg, t, dir, extraOffset = 0) {
    const laneCenter = Math.min(2.15, Math.max(1.45, seg.width * 0.14));
    const offsetLeft = laneCenter + extraOffset;
    const lx = seg.uz * dir * offsetLeft;
    const lz = -seg.ux * dir * offsetLeft;
    return {
      x: seg.x1 + seg.ux * seg.len * t + lx,
      z: seg.z1 + seg.uz * seg.len * t + lz,
      yaw: Math.atan2(seg.ux * dir, seg.uz * dir)
    };
  }"""

    life_js = replace_exact(life_js, life_old_1, life_new_1, "life.js: computeLeftLanePos stable offset")
    write_file(root, "src/life.js", life_js)
    print("=== Stage A Complete ===\n")


