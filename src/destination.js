// src/destination.js
import * as THREE from 'three';

export const DESTINATION_CSS = `
#dest-panel {
  position: fixed;
  top: 16px;
  left: 18px;
  z-index: 44;
  width: min(330px, 88vw);
  background: rgba(12, 16, 28, 0.92);
  border: 2px solid rgba(250, 204, 21, 0.75);
  border-radius: 16px;
  color: #f8fafc;
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  overflow: visible;
}
.dp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.dp-title {
  font-weight: 900;
  font-size: 14px;
  color: #facc15;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dp-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
#dest-panel.collapsed .dp-body {
  display: none;
}
.dp-field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dp-field label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}
.dp-field input {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 8px;
  padding: 7px 10px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.dp-field input:focus {
  border-color: #facc15;
}
.dp-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 185px;
  overflow-y: auto;
  background: #0f172a;
  border: 1px solid #475569;
  border-radius: 8px;
  margin-top: 3px;
  z-index: 60;
  display: none;
  box-shadow: 0 12px 28px rgba(0,0,0,0.7);
}
.dp-list.open { display: block; }
.dp-item {
  padding: 7px 10px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.dp-item:hover { background: rgba(250, 204, 21, 0.18); }
.dp-chip {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 99px;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  font-weight: 700;
}
.dp-fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(250, 204, 21, 0.1);
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
}
.dp-fare-row b { color: #facc15; font-size: 15px; }
.dp-btns {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}
.dp-btn {
  flex: 1;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  font-weight: 800;
  font-size: 12px;
  font-family: inherit;
}
.dp-btn-go { background: #22c55e; color: #052e16; }
.dp-btn-haggle { background: #f59e0b; color: #111; }
.dp-btn-cancel { background: #ef4444; color: #fff; display: none; }
#dest-speech {
  margin-top: 4px;
  font-size: 12px;
  font-style: italic;
  color: #fde68a;
  min-height: 16px;
}
`;

const DRIVER_RIDE_LINES = [
  'Bengaluru traffic, sir, please bear with me!',
  'Taking the smooth left lane, meter is running!',
  'Once we cross the 100 Feet Road signal, we reach in two minutes!',
  'Watch out for this speed breaker, holding the handlebar tight!',
  'Autopilot engaged, friend - sit back and enjoy the breeze!'
];

export function createDestinationMode({
  THREE: T = THREE,
  scene,
  world,
  roadSegs = [],
  stops = [],
  auto,
  solidFn = () => 0,
  getTraffic = () => [],
  onHorn = () => {},
  ui = {},
  onArrive = () => {}
}) {
  if (typeof document !== 'undefined' && !document.getElementById('dest-mode-css')) {
    const st = document.createElement('style');
    st.id = 'dest-mode-css';
    st.textContent = DESTINATION_CSS;
    document.head.appendChild(st);
  }

  // ---------- 1. Build Deduplicated Top-400 Indiranagar Places List (Stops First) ----------
  const places = [];
  const seenNames = new Set();

  for (const s of stops) {
    if (s && s.p && s.p.n && !seenNames.has(s.p.n.toLowerCase())) {
      seenNames.add(s.p.n.toLowerCase());
      places.push({
        name: s.p.n,
        type: s.tag || s.p.t || 'Landmark',
        x: s.p.x,
        z: s.p.z,
        isStop: true,
        stopRef: s
      });
    }
  }

  if (world && Array.isArray(world.pois)) {
    for (const p of world.pois) {
      if (!p.n || seenNames.has(p.n.toLowerCase())) continue;
      seenNames.add(p.n.toLowerCase());
      places.push({
        name: p.n,
        type: (p.t || 'Place').replace(/_/g, ' '),
        x: p.x,
        z: p.z,
        isStop: false,
        stopRef: null
      });
      if (places.length >= 400) break;
    }
  }

  // ---------- 2. Build Road Graph (Snap Endpoints within 3.2m) & A* Pathfinding ----------
  const nodes = []; // { x, z, adj: [{ to, cost, seg }] }

  function getOrCreateNode(x, z) {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.hypot(nodes[i].x - x, nodes[i].z - z) < 3.2) return i;
    }
    nodes.push({ x, z, adj: [] });
    return nodes.length - 1;
  }

  for (let i = 0; i < roadSegs.length; i++) {
    const s = roadSegs[i];
    const x1 = s.x1 ?? s[0], z1 = s.z1 ?? s[1], x2 = s.x2 ?? s[2], z2 = s.z2 ?? s[3];
    const kind = s.kind ?? s[5] ?? 2;
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.5) continue;

    const u = getOrCreateNode(x1, z1);
    const v = getOrCreateNode(x2, z2);
    if (u === v) continue;

    // Respect road rank: prefer higher-rank collector/arterial roads slightly
    const weight = len * (kind >= 4 ? 0.85 : (kind === 3 ? 0.95 : 1.15));
    nodes[u].adj.push({ to: v, cost: weight, len, seg: s });
    nodes[v].adj.push({ to: u, cost: weight, len, seg: s });
  }

  function nearestNode(x, z) {
    let best = 0, bestD = 1e9;
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(nodes[i].x - x, nodes[i].z - z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function findRouteAStar(startX, startZ, destX, destZ) {
    if (!nodes.length) return [{ x: startX, z: startZ }, { x: destX, z: destZ }];
    const startIdx = nearestNode(startX, startZ);
    const goalIdx = nearestNode(destX, destZ);
    if (startIdx === goalIdx) return [{ x: startX, z: startZ }, { x: destX, z: destZ }];

    const gScore = new Float32Array(nodes.length).fill(1e9);
    const fScore = new Float32Array(nodes.length).fill(1e9);
    const cameFrom = new Int32Array(nodes.length).fill(-1);
    const closed = new Uint8Array(nodes.length);
    const open = [startIdx];

    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(nodes[startIdx].x - nodes[goalIdx].x, nodes[startIdx].z - nodes[goalIdx].z);

    while (open.length > 0) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i++) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
      }
      const cur = open.splice(bestPos, 1)[0];
      if (cur === goalIdx) break;
      closed[cur] = 1;

      const edges = nodes[cur].adj;
      for (let i = 0; i < edges.length; i++) {
        const nb = edges[i].to;
        if (closed[nb]) continue;
        const tentG = gScore[cur] + edges[i].cost;
        if (tentG < gScore[nb]) {
          cameFrom[nb] = cur;
          gScore[nb] = tentG;
          fScore[nb] = tentG + Math.hypot(nodes[nb].x - nodes[goalIdx].x, nodes[nb].z - nodes[goalIdx].z);
          if (!open.includes(nb)) open.push(nb);
        }
      }
    }

    const rawPts = [];
    let curr = goalIdx;
    while (curr !== -1) {
      rawPts.push({ x: nodes[curr].x, z: nodes[curr].z });
      if (curr === startIdx) break;
      curr = cameFrom[curr];
    }
    rawPts.reverse();

    if (rawPts.length < 2) {
      rawPts.push({ x: destX, z: destZ });
    } else {
      rawPts.push({ x: destX, z: destZ });
    }

    // Offset waypoints 1.8m to the LEFT side of each segment direction (India left-hand driving)
    const leftPts = [];
    for (let i = 0; i < rawPts.length; i++) {
      const p = rawPts[i];
      const next = rawPts[Math.min(rawPts.length - 1, i + 1)];
      const prev = rawPts[Math.max(0, i - 1)];
      const dx = next.x - prev.x, dz = next.z - prev.z;
      const L = Math.hypot(dx, dz) || 1;
      const leftNx = dz / L, leftNz = -dx / L;
      const offset = (i === rawPts.length - 1) ? 0 : 1.8;
      leftPts.push({ x: p.x + leftNx * offset, z: p.z + leftNz * offset });
    }
    return leftPts;
  }

  // ---------- 3. 3D Glowing Animated Route Ribbon & Destination Beacon ----------
  const routeGroup = new T.Group();
  scene.add(routeGroup);

  const ribbonUniforms = {
    uTime: { value: 0 },
    uColor: { value: new T.Color(0x38bdf8) }
  };

  const ribbonMat = new T.ShaderMaterial({
    uniforms: ribbonUniforms,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float dash = smoothstep(0.15, 0.55, sin(vUv.y * 22.0 - uTime * 8.0));
        float alpha = pow(edge, 1.3) * (0.25 + 0.75 * dash) * 0.85;
        gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.92, 0.4), dash * 0.35), alpha);
      }
    `
  });

  let ribbonMesh = null;
  const destBeacon = new T.Mesh(
    new T.CylinderGeometry(1.1, 1.3, 68, 16, 1, true),
    new T.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.36, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })
  );
  destBeacon.position.y = 34;
  destBeacon.visible = false;
  routeGroup.add(destBeacon);

  function buildRouteRibbonGeometry(pts) {
    if (ribbonMesh) {
      routeGroup.remove(ribbonMesh);
      ribbonMesh.geometry.dispose();
      ribbonMesh = null;
    }
    if (!pts || pts.length < 2) return;

    const pos = [], uvs = [], idx = [];
    let v = 0, distAcc = 0;
    const halfW = 0.68, y = 0.19;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const L = Math.hypot(dx, dz);
      if (L < 0.2) continue;
      const nx = (-dz / L) * halfW, nz = (dx / L) * halfW;

      pos.push(
        a.x + nx, y, a.z + nz,
        a.x - nx, y, a.z - nz,
        b.x + nx, y, b.z + nz,
        b.x - nx, y, b.z - nz
      );
      uvs.push(0, distAcc * 0.12, 1, distAcc * 0.12, 0, (distAcc + L) * 0.12, 1, (distAcc + L) * 0.12);
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 4;
      distAcc += L;
    }

    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    ribbonMesh = new T.Mesh(geo, ribbonMat);
    routeGroup.add(ribbonMesh);
  }

  // ---------- 4. Top-Left Collapsible Destination Panel UI ----------
  const panel = document.createElement('div');
  panel.id = 'dest-panel';
  panel.innerHTML = `
    <div class="dp-header" id="dp-toggle">
      <div class="dp-title">🛺 Auto Meter & Autopilot</div>
      <span style="font-size:11px;color:#cbd5e1" id="dp-arrow">▼</span>
    </div>
    <div class="dp-body">
      <div class="dp-field">
        <label>From</label>
        <input type="text" id="dp-from" value="Current Location" autocomplete="off" />
        <div class="dp-list" id="dp-from-list"></div>
      </div>
      <div class="dp-field">
        <label>To (Indiranagar Destination)</label>
        <input type="text" id="dp-to" placeholder="Search Toit, MTR, Metro, 12th Main..." autocomplete="off" />
        <div class="dp-list" id="dp-to-list"></div>
      </div>
      <div class="dp-fare-row">
        <span>Est. Meter (<span id="dp-km">0.8</span> km)</span>
        <b id="dp-fare">₹42</b>
      </div>
      <div class="dp-btns">
        <button class="dp-btn dp-btn-haggle" id="dp-haggle">💬 Haggle</button>
        <button class="dp-btn dp-btn-go" id="dp-go">Go by Auto</button>
        <button class="dp-btn dp-btn-cancel" id="dp-cancel">Stop Autopilot</button>
      </div>
      <div id="dest-speech">"Where to drop sir? Meter haaktini!"</div>
    </div>
  `;
  document.body.appendChild(panel);

  const fromInput = document.getElementById('dp-from');
  const toInput = document.getElementById('dp-to');
  const fromList = document.getElementById('dp-from-list');
  const toList = document.getElementById('dp-to-list');
  const kmEl = document.getElementById('dp-km');
  const fareEl = document.getElementById('dp-fare');
  const speechEl = document.getElementById('dest-speech');
  const goBtn = document.getElementById('dp-go');
  const cancelBtn = document.getElementById('dp-cancel');

  let selectedFrom = null; // null = current auto position
  let selectedTo = places[0] || { name: 'Toit', x: -148.9, z: -377.2, type: 'Brewpub', isStop: true, stopRef: stops[0] };
  toInput.value = selectedTo.name;

  let currentFare = 45;
  let haggledForDest = false;
  let routePoints = [];
  let isActive = false;
  let wpIdx = 0;
  let junctionPauseTimer = 0;
  // (stray typo line removed)
  let speechTimer = 0;

  function computeEstimate() {
    const sx = selectedFrom ? selectedFrom.x : auto.x;
    const sz = selectedFrom ? selectedFrom.z : auto.z;
    const tx = selectedTo ? selectedTo.x : auto.x;
    const tz = selectedTo ? selectedTo.z : auto.z;
    const distMeters = Math.hypot(tx - sx, tz - sz) * 1.28; // Manhattan road factor
    const km = Math.max(0.25, distMeters / 1000);
    kmEl.textContent = km.toFixed(2);
    currentFare = Math.round(30 + km * 15);
    fareEl.textContent = `₹${currentFare}`;
    auto.liveFare = currentFare;
    haggledForDest = false;
  }
  computeEstimate();

  function bindAutocomplete(inputEl, listEl, onPick, allowCurrent = false) {
    function renderItems(q) {
      const query = q.trim().toLowerCase();
      listEl.innerHTML = '';
      if (allowCurrent && ('current location'.includes(query) || !query)) {
        const curDiv = document.createElement('div');
        curDiv.className = 'dp-item';
        curDiv.innerHTML = `<span>📍 Current Location</span><span class="dp-chip">GPS</span>`;
        curDiv.addEventListener('mousedown', () => {
          inputEl.value = 'Current Location';
          listEl.classList.remove('open');
          onPick(null);
        });
        listEl.appendChild(curDiv);
      }

      const matches = places.filter(p => !query || p.name.toLowerCase().includes(query) || p.type.toLowerCase().includes(query)).slice(0, 35);
      for (const p of matches) {
        const item = document.createElement('div');
        item.className = 'dp-item';
        item.innerHTML = `<span>${p.isStop ? '★ ' : ''}${p.name}</span><span class="dp-chip">${p.type}</span>`;
        item.addEventListener('mousedown', () => {
          inputEl.value = p.name;
          listEl.classList.remove('open');
          onPick(p);
        });
        listEl.appendChild(item);
      }
      listEl.classList.add('open');
    }

    inputEl.addEventListener('focus', () => renderItems(inputEl.value === 'Current Location' ? '' : inputEl.value));
    inputEl.addEventListener('input', () => renderItems(inputEl.value));
    inputEl.addEventListener('blur', () => setTimeout(() => listEl.classList.remove('open'), 160));
  }

  bindAutocomplete(fromInput, fromList, (p) => { selectedFrom = p; computeEstimate(); }, true);
  bindAutocomplete(toInput, toList, (p) => { if (p) { selectedTo = p; computeEstimate(); } }, false);

  document.getElementById('dp-toggle').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    document.getElementById('dp-arrow').textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
  });

  // 50/50 Haggle button
  document.getElementById('dp-haggle').addEventListener('click', () => {
    if (haggledForDest) {
      speechEl.textContent = '"Friend, the rate is already fixed! Let us go!"';
      return;
    }
    haggledForDest = true;
    if (Math.random() < 0.5) {
      currentFare = Math.max(30, Math.round(currentFare * 0.8));
      fareEl.textContent = `₹${currentFare} (Bargained!)`;
      speechEl.textContent = `"Okay sir, I will take you for ₹${currentFare}, hop in!"`;
    } else {
      currentFare = Math.round(currentFare * 1.25);
      fareEl.textContent = `₹${currentFare} (One-and-Half!)`;
      speechEl.textContent = `"No way, there is traffic on 100 Feet Road, ₹${currentFare} is final!"`;
    }
    auto.liveFare = currentFare;
  });

  function startAutopilot() {
    if (!selectedTo) return;
    if (selectedFrom) {
      auto.x = selectedFrom.x + 4;
      auto.z = selectedFrom.z + 4;
    }
    routePoints = findRouteAStar(auto.x, auto.z, selectedTo.x, selectedTo.z);
    buildRouteRibbonGeometry(routePoints);
    destBeacon.position.set(selectedTo.x, 34, selectedTo.z);
    destBeacon.visible = true;

    isActive = true;
    wpIdx = 0;
    goBtn.style.display = 'none';
    cancelBtn.style.display = 'block';
    speechEl.textContent = `"Autopilot ON → ${selectedTo.name}. Press WASD anytime to take over!"`;
  }

  function cancel(reasonText = '"Manual control restored — drive your way, friend!"') {
    if (!isActive && !ribbonMesh) return;
    isActive = false;
    goBtn.style.display = 'block';
    cancelBtn.style.display = 'none';
    destBeacon.visible = false;
    if (ribbonMesh) {
      routeGroup.remove(ribbonMesh);
      ribbonMesh.geometry.dispose();
      ribbonMesh = null;
    }
    routePoints = [];
    speechEl.textContent = reasonText;
  }

  goBtn.addEventListener('click', startAutopilot);
  cancelBtn.addEventListener('click', () => cancel());

  function openPanel() {
    panel.classList.remove('collapsed');
    document.getElementById('dp-arrow').textContent = '▼';
  }

  let junctionCooldown = 0;

  function update(dt, input) {
    ribbonUniforms.uTime.value += dt;
    if (!isActive || !selectedTo || routePoints.length === 0) return;

    // Any manual key press or joystick input immediately cancels autopilot and restores manual driving
    if (input && (Math.abs(input.thr) > 0.05 || Math.abs(input.str) > 0.05)) {
      cancel('"Manual steering detected — Autopilot disengaged!"');
      return;
    }

    const distToDest = Math.hypot(selectedTo.x - auto.x, selectedTo.z - auto.z);
    if (distToDest < 8.0) {
      // Smooth arrival within 8m
      input.thr = auto.v > 0.6 ? -1.0 : 0.0;
      input.str = 0.0;
      if (Math.abs(auto.v) < 1.8) {
        auto.v = 0;
        const arrivedStop = selectedTo.stopRef || { p: { n: selectedTo.name, t: selectedTo.type, x: selectedTo.x, z: selectedTo.z }, tag: selectedTo.type, road: 'Indiranagar' };
        const paidFare = currentFare;
        cancel(`"Arrived at ${selectedTo.name}! Meter Fare: ₹${paidFare} paid!"`);
        if (ui && typeof ui.showCard === 'function') {
          ui.showCard('Destination Reached · ₹' + paidFare, selectedTo.name, 'Autopilot drop complete! Smooth left-lane ride.');
        }
        onArrive(arrivedStop, paidFare);
      }
      return;
    }

    // Advance pure-pursuit waypoint index
    while (wpIdx < routePoints.length - 1 && Math.hypot(routePoints[wpIdx].x - auto.x, routePoints[wpIdx].z - auto.z) < 7.5) {
      wpIdx++;
      // Occasional 2-second junction pause at intermediate intersections
      if (wpIdx < routePoints.length - 2 && junctionCooldown <= 0 && Math.random() < 0.25) {
        junctionPauseTimer = 2.0;
        junctionCooldown = 14.0;
        speechEl.textContent = '"Checking right-left at cross road junction..."';
      }
    }

    if (junctionCooldown > 0) junctionCooldown -= dt;
    if (junctionPauseTimer > 0) {
      junctionPauseTimer -= dt;
      input.thr = auto.v > 0.4 ? -0.9 : 0;
      input.str = 0;
      return;
    }

    // Periodic funny Bangalore traffic banter
    speechTimer -= dt;
    if (speechTimer <= 0) {
      speechTimer = 9.5;
      speechEl.textContent = `"${DRIVER_RIDE_LINES[Math.floor(Math.random() * DRIVER_RIDE_LINES.length)]}"`;
    }

    // Pure-pursuit target lookahead
    const target = routePoints[wpIdx];
    const dx = target.x - auto.x, dz = target.z - auto.z;
    const desiredYaw = Math.atan2(dx, dz);
    let angDiff = desiredYaw - auto.a;
    while (angDiff > Math.PI) angDiff -= Math.PI * 2;
    while (angDiff < -Math.PI) angDiff += Math.PI * 2;

    // Obstacle avoidance check via getTraffic()
    let obstacleSlow = 1.0;
    let avoidSteer = 0;
    const obstacles = getTraffic ? getTraffic() : [];
    const fwdX = Math.sin(auto.a), fwdZ = Math.cos(auto.a);
    const rightX = Math.cos(auto.a), rightZ = -Math.sin(auto.a);

    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const ox = ob.x - auto.x, oz = ob.z - auto.z;
      const ahead = ox * fwdX + oz * fwdZ;
      const lat = ox * rightX + oz * rightZ;
      if (ahead > 1.2 && ahead < 13.0 && Math.abs(lat) < (ob.radius || 1.4) + 1.3) {
        obstacleSlow = Math.min(obstacleSlow, ahead < 5.5 ? 0.0 : 0.42);
        avoidSteer = lat >= 0 ? 0.55 : -0.55;
        if (Math.random() < dt * 0.8) onHorn();
      }
    }

    const steerCmd = T.MathUtils.clamp(angDiff * 1.65 + avoidSteer, -1, 1);
    const curveFactor = 1.0 - Math.min(0.55, Math.abs(angDiff) * 0.5);
    const approachFactor = distToDest < 24 ? Math.max(0.35, distToDest / 24) : 1.0;
    const targetSpeed = Math.min(14.0, 13.8 * curveFactor * approachFactor * obstacleSlow);

    input.str = steerCmd;
    if (auto.v < targetSpeed - 0.4) input.thr = 0.88;
    else if (auto.v > targetSpeed + 0.8) input.thr = -0.75;
    else input.thr = 0.15;
  }

  return {
    update,
    get active() { return isActive; },
    get route() { return routePoints; },
    openPanel,
    cancel
  };
}
