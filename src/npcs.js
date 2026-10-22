// src/npcs.js
import * as THREE from 'three';
import { nightUniform } from './materials.js';

const NPC_CAST = [
  { name: 'Raju Anna', role: 'tea', shirt: 0xd97706, pant: 0x334155, acc: 'chai', lines: ['Hot ginger chai is ready, friend!', 'Take this cutting chai on the house - +₹25 energy tip!', 'The stove has been going since 5 AM, sir!'] },
  { name: 'Constable Gowda', role: 'cop', shirt: 0xc2a36b, pant: 0x9a7b4f, acc: 'cophat', lines: ['Hey, auto! Keep to the left lane, no overtaking on 12th Main!', 'Are your documents in order? Drive smooth, +25 XP!', 'Do not jump the signal at the CMH junction!'] },
  { name: 'Lakshmi Akka', role: 'flower', shirt: 0xe11d48, pant: 0xbe123c, acc: 'garland', lines: ['Fresh Mysuru jasmine, sir, take some!', 'Tie this jasmine garland on your auto meter - +50% Luck Buff active!', 'God bless you, may your day go well!'] },
  { name: 'Karthik (Delivery)', role: 'delivery', shirt: 0xf97316, pant: 0x1e293b, acc: 'helmet', lines: ['My scooter is punctured! Please drop this hot biryani parcel at Meghana Biryani fast!', 'The 10-minute timer is ticking, rush to the stop!', 'Five-star rating if you make it in time!'] },
  { name: 'Manju (Auto Union)', role: 'autodriver', shirt: 0xb89d64, pant: 0x27272a, acc: 'chai', lines: ['Hello boss! The Indiranagar stand is packed today!', 'If a passenger calls for Koramangala, ask for one and a half fare!', 'Take this shortcut tip - +30 XP!'] },
  { name: 'Ibrahim Bhai', role: 'autodriver', shirt: 0xb89d64, pant: 0x1e293b, acc: 'none', lines: ['Hello friend! I cleaned the spark plug, this auto flies like a rocket!', 'Go easy over the concrete patch on 100 Feet Road!', 'Come, let us share a chai!'] },
  { name: 'Meghana (Student)', role: 'student', shirt: 0x8b5cf6, pant: 0x1e3a8a, acc: 'bag', lines: ['Bro, Nike queue is already down the staircase!', 'Fest rehearsal at Indiranagar club, full tired!', 'Cool auto bro, love the yellow canopy!'] },
  { name: 'Arjun (Student)', role: 'student', shirt: 0x06b6d4, pant: 0x0f172a, acc: 'bag', lines: ['Just hopped off Purple Line at Indiranagar Metro!', 'Third Wave cold brew is keeping my semester alive.', 'Honk that horn one more time anna!'] },
  { name: 'Priya & Bruno', role: 'dogwalker', shirt: 0x10b981, pant: 0x1f2937, acc: 'dog', lines: ['Bruno loves chasing autos on Defence Colony lanes!', 'Shh Bruno, good boy, stay on the footpath!', 'Indiranagar tree canopy is the best walk in Bengaluru.'] },
  { name: 'Madesha (Elaneer)', role: 'coconut', shirt: 0x16a34a, pant: 0x4b5563, acc: 'coconut', lines: ['Maddur tender coconut, friend, sweet water!', 'Drink tender coconut, cool down your engine - +₹20!', 'In this heat, tender coconut is the best medicine!'] },
  { name: 'Venkatesh (Paper)', role: 'paper', shirt: 0x3b82f6, pant: 0x334155, acc: 'paper', lines: ['Deccan Herald, Prajavani, Vijayavani - fresh headlines!', 'Read the Indiranagar flyover news, friend!', 'Finished the 6 AM round, now time for a chai!'] },
  { name: 'Bahadur (Security)', role: 'guard', shirt: 0x1d4ed8, pant: 0x172554, acc: 'cophat', lines: ['Hello sir! No parking in front of the building gate!', 'Madam, please park the car to the side!', 'Night duty means staying fully alert, sir!'] },
  { name: 'Rohan (Techie)', role: 'techie', shirt: 0x0284c7, pant: 0x1e293b, acc: 'bag', lines: ['Standup call on Zoom while walking to Third Wave Coffee!', 'Production deploy broke right at golden hour bro.', 'Can your auto beat 100 Feet Road traffic?'] },
  { name: 'Subramanya Uncle', role: 'elder', shirt: 0xf8fafc, pant: 0xd6d3d1, acc: 'umbrella', lines: ['In 1978 Indiranagar was full of orchards and bungalows!', 'MTR masala dosa tastes the same even today!', 'Drive gently, there is a speed breaker ahead!'] },
  { name: 'Chef Naveen', role: 'vendor', shirt: 0xffffff, pant: 0x18181b, acc: 'chai', lines: ['Fresh filter decoction brewing at Sri Udupi Park!', 'Ghee roast smell goes two cross roads away!', 'Auto drivers get priority token here!'] },
  { name: 'Divya (Designer)', role: 'techie', shirt: 0xec4899, pant: 0x1e293b, acc: 'bag', lines: ['Sketching the red-brick facade outside Toit!', '12th Main boutiques have the nicest pastel walls.', 'Love how the street lamps glow at dusk!'] },
  { name: 'Suresh (Courier)', role: 'delivery', shirt: 0xeab308, pant: 0x1f2937, acc: 'helmet', lines: ['CMH Road cross numbers confuse even Google Maps guru!', 'Drop this urgent parcel at Adidas 12th Main!', 'Bonus tip if you reach before the signal turns!'] },
  { name: 'Ananya (Musician)', role: 'student', shirt: 0xa855f7, pant: 0x0f172a, acc: 'bag', lines: ['Acoustic gig tonight near 80 Feet Road!', 'Bengaluru breeze + filter coffee = best songwriting mood.', 'See you at Indiranagar Social later!'] },
  // 6 Kerbside Hailing Passengers ('!' marker, board back seat, pay distance fare + smooth tip)
  { name: 'Kavitha Madam', role: 'passenger', dest: 'MTR 1924', shirt: 0xd946ef, pant: 0x701a75, acc: 'bag', lines: ['Auto! I need to go to MTR 1924, and I will add +30 on the meter!', 'Please go a little faster, my family is waiting for dosa!'] },
  { name: 'Vikram (Founder)', role: 'passenger', dest: 'Toit', shirt: 0x2563eb, pant: 0x0f172a, acc: 'bag', lines: ['Boss, please drop me at Toit! Investor pitch over craft beer!', 'No potholes please, my laptop is open!'] },
  { name: 'Nandini', role: 'passenger', dest: 'Indiranagar station', shirt: 0x14b8a6, pant: 0x115e59, acc: 'bag', lines: ['Please take me to Indiranagar Metro Station! My train is in 4 minutes!', 'Go full speed and I will tip extra!'] },
  { name: 'Zoya', role: 'passenger', dest: 'Burma Burma Restaurant & Tea Room', shirt: 0xf43f5e, pant: 0x881337, acc: 'bag', lines: ['Shall we go to Burma Burma on 12th Main? One and a half fare is fine!', 'Take the left turn here, the traffic is lighter that way!'] },
  { name: 'Harish Uncle', role: 'passenger', dest: 'Sri Udupi Park', shirt: 0xfef08a, pant: 0x713f12, acc: 'umbrella', lines: ['Please take me to Sri Udupi Park, it is coffee time!', 'Drive smoothly and I will double the tip!'] },
  { name: 'Deepak', role: 'passenger', dest: 'Nike', shirt: 0x22c55e, pant: 0x14532d, acc: 'none', lines: ['Hey, take me to Nike on 100 Feet Road! My friends are waiting!', 'Honk the horn and pull over to the side!'] }
];

function makeNpcBubbleCanvas() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 176;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { c, ctx: c.getContext('2d'), tex };
}

const NPC_CARD_CSS = `
#npc-card{position:fixed;left:50%;top:72px;transform:translateX(-50%);z-index:30;width:min(420px,calc(100vw - 32px));box-sizing:border-box;padding:12px 16px 13px;border-radius:18px;background:rgba(12,16,28,.92);border:2px solid #facc15;color:#f8fafc;font:600 15px/1.35 system-ui,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.5);backdrop-filter:blur(8px);cursor:pointer;display:none;text-align:left;-webkit-tap-highlight-color:transparent}
#npc-card.on{display:block}
#npc-card .hd{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px}
#npc-card .nm{color:#facc15;font:800 15px "Bricolage Grotesque",system-ui,sans-serif}
#npc-card .pr{color:#0c101c;background:#38bdf8;border-radius:999px;padding:4px 11px;font:800 12px system-ui,sans-serif;white-space:nowrap}
#npc-card .tx{font-size:14px;color:#e8eef6}
@media (max-width:720px){#npc-card{top:104px}}
`;
let npcCard = null, npcCardActions = null;
function ensureNpcCard() {
  if (npcCard || typeof document === 'undefined') return npcCard;
  const st = document.createElement('style'); st.textContent = NPC_CARD_CSS; document.head.appendChild(st);
  npcCard = document.createElement('button'); npcCard.id = 'npc-card'; npcCard.type = 'button';
  npcCard.innerHTML = '<div class="hd"><span class="nm"></span><span class="pr"></span></div><div class="tx"></div>';
  document.body.appendChild(npcCard);
  const fire = (e) => { e.preventDefault(); e.stopPropagation(); if (npcCardActions) npcCardActions(); };
  npcCard.addEventListener('click', fire);
  npcCard.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  return npcCard;
}
function showNpcCard(name, line, prompt) {
  const c = ensureNpcCard(); if (!c) return;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches;
  const pr = coarse ? prompt.replace('[E] ', 'Tap · ') : prompt;
  c.querySelector('.nm').textContent = name;
  c.querySelector('.pr').textContent = pr;
  c.querySelector('.tx').textContent = line;
  c.classList.add('on');
}
function hideNpcCard() { if (npcCard) npcCard.classList.remove('on'); }

function drawNpcBubble(b, name, roleBadge, line, promptText = '[E] Talk') {
  const ctx = b.ctx;
  ctx.clearRect(0, 0, 512, 176);

  // Rounded speech card
  ctx.fillStyle = 'rgba(12, 16, 28, 0.94)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(14, 10, 484, 134, 20);
  ctx.fill();
  ctx.stroke();

  // Pointer triangle
  ctx.beginPath();
  ctx.moveTo(240, 144);
  ctx.lineTo(256, 168);
  ctx.lineTo(272, 144);
  ctx.closePath();
  ctx.fill();

  // Name & badge
  ctx.fillStyle = '#facc15';
  ctx.font = '800 22px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(name, 34, 42);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(promptText, 478, 42);

  // Dialogue text (word-wrapped 2 lines)
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 21px sans-serif';
  ctx.textAlign = 'left';
  const words = line.split(' ');
  let l1 = '', l2 = '';
  for (const w of words) {
    if ((l1 + w).length < 40) l1 += (l1 ? ' ' : '') + w;
    else l2 += (l2 ? ' ' : '') + w;
  }
  ctx.fillText(l1, 34, 82, 444);
  if (l2) ctx.fillText(l2, 34, 114, 444);

  b.tex.needsUpdate = true;
}

function makeMarkerTexture(symbol = '!', bg = '#facc15', fg = '#111111') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(64, 64, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = '900 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNPCs({
  THREE: T = THREE,
  scene,
  camera,
  world,
  vendorSpots = [],
  roadSegs = [],
  getAuto,
  playerCar = null,
  stops = [],
  ui = {},
  addXP = () => {},
  addCoins = () => {}
}) {
  const root = new T.Group();
  scene.add(root);

  const skinMat = new T.MeshStandardMaterial({ color: 0xd4946a, roughness: 0.65 });
  const hairMat = new T.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  const phoneMat = new T.MeshBasicMaterial({ color: 0x7dd3fc });
  const hailMarkerMat = new T.SpriteMaterial({ map: makeMarkerTexture('!', '#facc15', '#111'), transparent: true, depthWrite: false });
  const questMarkerMat = new T.SpriteMaterial({ map: makeMarkerTexture('★', '#38bdf8', '#111'), transparent: true, depthWrite: false });

  // Build 1.8m stylized readable character mesh with articulated arms, legs & role accessories
  function buildCharacterMesh(cfg) {
    const g = new T.Group();
    const shirtMat = new T.MeshStandardMaterial({ color: cfg.shirt, roughness: 0.6 });
    const pantMat = new T.MeshStandardMaterial({ color: cfg.pant, roughness: 0.75 });

    // Legs (0.76m tall)
    const legGeo = new T.BoxGeometry(0.19, 0.72, 0.20);
    legGeo.translate(0, -0.36, 0);
    const legL = new T.Mesh(legGeo, pantMat);
    legL.position.set(-0.13, 0.74, 0);
    const legR = new T.Mesh(legGeo, pantMat);
    legR.position.set(0.13, 0.74, 0);
    g.add(legL, legR);

    // Torso (0.66m tall)
    const torso = new T.Mesh(new T.BoxGeometry(0.50, 0.66, 0.30), shirtMat);
    torso.position.y = 1.07;
    torso.castShadow = true;
    g.add(torso);

    // Head & Hair (~1.82m top height)
    const head = new T.Mesh(new T.SphereGeometry(0.21, 12, 10), skinMat);
    head.position.y = 1.60;
    head.castShadow = true;
    const hair = new T.Mesh(new T.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 1.63;
    g.add(head, hair);

    // Articulated Arms
    const armGeo = new T.BoxGeometry(0.15, 0.58, 0.15);
    armGeo.translate(0, -0.26, 0);
    const armL = new T.Mesh(armGeo, shirtMat);
    armL.position.set(-0.34, 1.32, 0);
    const armR = new T.Mesh(armGeo, shirtMat);
    armR.position.set(0.34, 1.32, 0);
    g.add(armL, armR);

    // Night-time glowing smartphone screen in left hand
    const phone = new T.Mesh(new T.BoxGeometry(0.10, 0.16, 0.03), phoneMat);
    phone.position.set(0, -0.52, 0.12);
    phone.rotation.x = -0.7;
    phone.visible = false;
    armL.add(phone);

    // Role Accessories
    if (cfg.acc === 'cophat') {
      const brim = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.06, 12), new T.MeshStandardMaterial({ color: 0x854d0e }));
      brim.position.y = 1.78;
      g.add(brim);
    } else if (cfg.acc === 'helmet') {
      const helm = new T.Mesh(new T.SphereGeometry(0.24, 12, 10), new T.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }));
      helm.position.y = 1.62;
      g.add(helm);
    } else if (cfg.acc === 'umbrella') {
      const stick = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.9, 6), hairMat);
      stick.position.set(0, -0.2, 0.15);
      const canopy = new T.Mesh(new T.ConeGeometry(0.65, 0.28, 10), new T.MeshStandardMaterial({ color: 0x1e293b }));
      canopy.position.set(0, 0.25, 0.15);
      armR.add(stick, canopy);
    } else if (cfg.acc === 'bag') {
      const bag = new T.Mesh(new T.BoxGeometry(0.38, 0.44, 0.22), new T.MeshStandardMaterial({ color: 0x1e293b }));
      bag.position.set(0, 1.08, -0.24);
      g.add(bag);
    } else if (cfg.acc === 'garland') {
      const gar = new T.Mesh(new T.TorusGeometry(0.16, 0.045, 8, 14), new T.MeshStandardMaterial({ color: 0xfef08a }));
      gar.position.set(0, -0.5, 0.12);
      armR.add(gar);
    } else if (cfg.acc === 'chai') {
      const cup = new T.Mesh(new T.CylinderGeometry(0.06, 0.045, 0.14, 8), new T.MeshStandardMaterial({ color: 0xfef3c7 }));
      cup.position.set(0, -0.5, 0.12);
      armR.add(cup);
    } else if (cfg.acc === 'dog') {
      const dog = new T.Group();
      const dMat = new T.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
      const dBody = new T.Mesh(new T.BoxGeometry(0.32, 0.32, 0.68), dMat);
      dBody.position.y = 0.32;
      const dHead = new T.Mesh(new T.BoxGeometry(0.26, 0.26, 0.30), dMat);
      dHead.position.set(0, 0.50, 0.35);
      dog.add(dBody, dHead);
      dog.position.set(0.65, 0, 0.35);
      g.add(dog);
    }

    // Floating marker for passengers ('!') or quest givers ('★')
    let marker = null;
    if (cfg.role === 'passenger' || cfg.role === 'delivery' || cfg.role === 'tea' || cfg.role === 'flower') {
      marker = new T.Sprite(cfg.role === 'passenger' ? hailMarkerMat : questMarkerMat);
      marker.scale.set(0.85, 0.85, 1);
      marker.position.set(0, 2.35, 0);
      g.add(marker);
    }

    return { group: g, legL, legR, armL, armR, head, phone, marker };
  }

  // Filter usable footpath segments near active areas of Indiranagar
  const walkSegs = roadSegs.filter(s => s.kind >= 3 && Math.hypot(s.x1 - (-133), s.z1 - (-345)) < 680);
  const npcs = [];

  NPC_CAST.forEach((cfg, idx) => {
    const built = buildCharacterMesh(cfg);
    root.add(built.group);

    let x = -120, z = -310, yaw = 0, seg = null;
    if ((cfg.role === 'tea' || cfg.role === 'flower' || cfg.role === 'coconut') && vendorSpots[idx % Math.max(1, vendorSpots.length)]) {
      const vs = vendorSpots[idx % vendorSpots.length];
      x = vs.x; z = vs.z; yaw = vs.yaw;
    } else if (walkSegs.length) {
      seg = walkSegs[(idx * 5) % walkSegs.length];
      const side = idx % 2 ? 1 : -1;
      const kerbOff = (seg.width * 0.5 + 1.35) * side;
      const t = 0.2 + (idx % 5) * 0.15;
      const dx = seg.x2 - seg.x1, dz = seg.z2 - seg.z1, L = Math.hypot(dx, dz) || 1;
      const ux = dx / L, uz = dz / L;
      x = seg.x1 + ux * L * t - uz * kerbOff;
      z = seg.z1 + uz * L * t + ux * kerbOff;
      yaw = Math.atan2(ux, uz);
    }

    built.group.position.set(x, 0, z);
    built.group.rotation.y = yaw;

    npcs.push({
      id: idx,
      ...cfg,
      mesh: built.group,
      legL: built.legL,
      legR: built.legR,
      armL: built.armL,
      armR: built.armR,
      phone: built.phone,
      marker: built.marker,
      seg,
      t: 0.25 + (idx % 4) * 0.15,
      dir: idx % 2 === 0 ? 1 : -1,
      kerbSide: idx % 2 ? 1 : -1,
      stationary: cfg.role === 'tea' || cfg.role === 'flower' || cfg.role === 'coconut' || cfg.role === 'cop' || cfg.role === 'guard' || cfg.role === 'passenger',
      x,
      z,
      yaw,
      lineIdx: 0,
      rewardClaimed: false,
      boarded: false,
      phase: idx * 0.8
    });
  });

  // Shared floating speech bubble sprite above whichever NPC the player is near
  const bubbleData = makeNpcBubbleCanvas();
  const bubbleSprite = new T.Sprite(new T.SpriteMaterial({ map: bubbleData.tex, transparent: true, depthWrite: false, fog: false }));
  bubbleSprite.scale.set(8.8, 3.0, 1);
  bubbleSprite.visible = false;
  root.add(bubbleSprite);

  // Active Passenger / Delivery Ride state
  let activePassenger = null;
  let rideStartPos = new T.Vector2();
  let rideTargetStop = null;
  let luckBuff = 1.0;
  let closestNpc = null;

  // Back-seat passenger mesh attached inside the player's auto when a passenger boards
  const seatedPassenger = buildCharacterMesh({ shirt: 0xd946ef, pant: 0x1e293b, acc: 'bag', role: 'seated' });
  seatedPassenger.legL.rotation.x = -Math.PI / 2;
  seatedPassenger.legR.rotation.x = -Math.PI / 2;
  seatedPassenger.group.scale.setScalar(0.76);
  seatedPassenger.group.position.set(0, 0.22, -0.68);
  seatedPassenger.group.visible = false;
  if (playerCar) playerCar.add(seatedPassenger.group);
  else root.add(seatedPassenger.group);

  function notify(title, sub, text) {
    if (ui && typeof ui.showCard === 'function') ui.showCard(title, sub, text);
  }

  function interact() {
    if (!closestNpc) return false;
    const npc = closestNpc;
    const line = npc.lines[npc.lineIdx % npc.lines.length];
    npc.lineIdx++;

    // Role rewards & Passenger Boarding
    if (npc.role === 'tea' && !npc.rewardClaimed) {
      npc.rewardClaimed = true;
      addCoins(25);
      addXP(30);
      notify('Chai Break · +₹25 & +30 XP', npc.name, line);
    } else if (npc.role === 'flower' && !npc.rewardClaimed) {
      npc.rewardClaimed = true;
      luckBuff = 1.5;
      addXP(40);
      notify('Mallige Luck Buff · +50% Fare Bonus!', npc.name, line);
    } else if (npc.role === 'cop' && !npc.rewardClaimed) {
      npc.rewardClaimed = true;
      addXP(35);
      notify('Traffic Police Check · +35 XP', npc.name, line);
    } else if (npc.role === 'delivery' && !activePassenger) {
      const destName = npc.name.includes('Suresh') ? 'Adidas' : 'Meghana Biryani';
      const target = stops.find(s => s.p.n === destName) || stops[0];
      if (target) {
        activePassenger = npc;
        rideTargetStop = target;
        const a = getAuto ? getAuto() : { x: npc.x, z: npc.z };
        rideStartPos.set(a.x, a.z);
        notify('Express Parcel Quest!', `Drop at ${target.p.n}`, `${npc.name}: "${line}"`);
      }
    } else if (npc.role === 'passenger' && !activePassenger) {
      const target = stops.find(s => s.p.n === npc.dest) || stops[Math.floor(Math.random() * stops.length)];
      if (target) {
        activePassenger = npc;
        npc.boarded = true;
        npc.mesh.visible = false;
        seatedPassenger.group.visible = true;
        rideTargetStop = target;
        const a = getAuto ? getAuto() : { x: npc.x, z: npc.z };
        rideStartPos.set(a.x, a.z);
        notify('Passenger Boarded!', `Drop ${npc.name} at ${target.p.n}`, `"${npc.lines[0]}"`);
      }
    } else {
      addXP(10);
      notify('Indiranagar Voices · +10 XP', npc.name, line);
    }

    showNpcCard(npc.name, npc.lines[npc.lineIdx % npc.lines.length], npc.role === 'passenger' && !npc.boarded ? '[E] Pick Up' : '[E] Next');
    return true;
  }

  ensureNpcCard(); npcCardActions = () => interact();
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') interact();
  });

  function update(dt, nowMs = performance.now(), hour = 17.8) {
    const tSec = nowMs * 0.001;
    const isNight = nightUniform.value > 0.45;
    const autoState = getAuto ? getAuto() : { x: 0, z: 0, v: 0, speed: 0 };
    const spd = Math.abs(autoState.speed ?? autoState.v ?? 0);

    // Check active passenger drop-off at destination stop
    if (activePassenger && rideTargetStop) {
      const dStop = Math.hypot(autoState.x - rideTargetStop.p.x, autoState.z - rideTargetStop.p.z);
      if (dStop < 15.0 && spd < 6.0) {
        const distDriven = Math.max(60, Math.hypot(rideTargetStop.p.x - rideStartPos.x, rideTargetStop.p.y - rideStartPos.y));
        const baseFare = Math.round((45 + distDriven * 0.32) * luckBuff);
        const smoothTip = spd < 3.5 ? 30 : 15;
        const totalRs = baseFare + smoothTip;
        const xpEarned = 120;

        addCoins(totalRs);
        addXP(xpEarned);
        notify(
          `Drop Complete · +₹${totalRs} & +${xpEarned} XP`,
          `${activePassenger.name} → ${rideTargetStop.p.n}`,
          `Meter Fare ₹${baseFare} + Smooth Tip ₹${smoothTip}! "romba thanks anna, super driving!"`
        );

        if (activePassenger.boarded) {
          activePassenger.boarded = false;
          activePassenger.x = rideTargetStop.p.x + 6;
          activePassenger.z = rideTargetStop.p.z + 6;
          activePassenger.mesh.position.set(activePassenger.x, 0, activePassenger.z);
          activePassenger.mesh.visible = true;
          // Assign a new random destination for next hail
          const nextStop = stops[(stops.indexOf(rideTargetStop) + 3) % Math.max(1, stops.length)];
          if (nextStop) activePassenger.dest = nextStop.p.n;
        }
        seatedPassenger.group.visible = false;
        activePassenger = null;
        rideTargetStop = null;
      }
    }

    let bestDist = 7.2;
    closestNpc = null;

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];
      if (npc.boarded) continue;

      // Fewer walkers late at night; active ones show glowing phone screen
      if (isNight && i % 4 === 3 && npc.role !== 'cop' && npc.role !== 'guard' && npc.role !== 'passenger') {
        npc.mesh.visible = false;
        continue;
      }
      npc.mesh.visible = true;
      npc.phone.visible = isNight && (npc.role === 'student' || npc.role === 'techie' || npc.role === 'passenger');

      // Walk along footpath for non-stationary NPCs
      if (!npc.stationary && npc.seg) {
        const dx = npc.seg.x2 - npc.seg.x1, dz = npc.seg.z2 - npc.seg.z1;
        const len = Math.hypot(dx, dz) || 1;
        const ux = dx / len, uz = dz / len;

        npc.t += (npc.dir * 1.35 * dt) / len;
        if (npc.t > 0.94) { npc.t = 0.94; npc.dir = -1; }
        if (npc.t < 0.06) { npc.t = 0.06; npc.dir = 1; }

        const kerbOff = (npc.seg.width * 0.5 + 1.35) * npc.kerbSide;
        npc.x = npc.seg.x1 + ux * len * npc.t - uz * kerbOff;
        npc.z = npc.seg.z1 + uz * len * npc.t + ux * kerbOff;
        npc.yaw = Math.atan2(ux * npc.dir, uz * npc.dir);

        const swing = Math.sin(tSec * 6.5 + npc.phase) * 0.48;
        npc.legL.rotation.x = swing;
        npc.legR.rotation.x = -swing;
        npc.armL.rotation.x = isNight && npc.phone.visible ? -0.65 : -swing * 0.7;
        npc.armR.rotation.x = swing * 0.7;
      } else {
        npc.legL.rotation.x = 0;
        npc.legR.rotation.x = 0;
        // Passengers wave their right arm to hail the auto
        if (npc.role === 'passenger') {
          npc.armR.rotation.z = -2.3 + Math.sin(tSec * 7.0 + npc.phase) * 0.35;
        } else {
          npc.armR.rotation.x = Math.sin(tSec * 2.2 + npc.phase) * 0.12;
        }
      }

      if (npc.marker) {
        npc.marker.position.y = 2.35 + Math.sin(tSec * 4.5 + npc.phase) * 0.12;
      }

      const d = Math.hypot(npc.x - autoState.x, npc.z - autoState.z);
      if (d < 10.0) {
        // Face the player when close
        npc.mesh.rotation.y = Math.atan2(autoState.x - npc.x, autoState.z - npc.z);
      } else {
        npc.mesh.rotation.y = npc.yaw;
      }
      npc.mesh.position.set(npc.x, 0, npc.z);

      if (d < bestDist && spd < 5.5) {
        bestDist = d;
        closestNpc = npc;
      }
    }

    if (closestNpc) {
      const prompt = closestNpc.role === 'passenger'
        ? `[E] Pick Up → ${closestNpc.dest}`
        : '[E] Talk';
      showNpcCard(closestNpc.name, closestNpc.lines[closestNpc.lineIdx % closestNpc.lines.length], prompt);
    } else {
      hideNpcCard();
    }
  }

  return {
    update,
    npcs,
    interact,
    get activePassenger() { return activePassenger; },
    get rideTargetStop() { return rideTargetStop; }
  };
}
