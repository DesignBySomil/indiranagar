// src/stops.js
import * as THREE from 'three';
import { STOP_LIST } from './stopsdata.js';
import { makeSign, makeEmissiveSignMaterial, makeNeonMaterial } from './materials.js';

export const STOPS_CSS = `
#stops-hud {
  position: fixed; top: 16px; right: 18px; z-index: 30;
  display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
  font-family: "Bricolage Grotesque", system-ui, sans-serif; color: #f8fafc;
  pointer-events: none;
}
.shud-row {
  display: flex; gap: 8px; align-items: center; pointer-events: auto;
}
.shud-pill {
  background: rgba(12, 16, 28, 0.86); border: 1px solid rgba(255,255,255,0.16);
  backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 999px;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
}
.shud-pill b { color: #facc15; font-size: 14px; }
.shud-btn {
  cursor: pointer; background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #111; border: none; font-weight: 800; padding: 6px 14px;
  border-radius: 999px; font-size: 13px; box-shadow: 0 4px 14px rgba(245,158,11,0.4);
  transition: transform 0.15s ease;
}
.shud-btn:hover { transform: scale(1.05); }
#combo-wrap {
  width: 190px; height: 8px; background: rgba(15,23,42,0.8);
  border-radius: 99px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15);
  display: none;
}
#combo-bar {
  height: 100%; width: 100%; background: linear-gradient(90deg, #38bdf8, #f43f5e, #facc15);
  transition: width 0.1s linear;
}
#stop-card-v2 {
  position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%) translateY(130%);
  width: min(460px, 92vw); background: rgba(13, 17, 30, 0.94);
  border: 2px solid #facc15; border-radius: 18px; padding: 16px 20px;
  color: #f8fafc; font-family: "Bricolage Grotesque", system-ui, sans-serif;
  box-shadow: 0 18px 45px rgba(0,0,0,0.65); z-index: 45;
  transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
#stop-card-v2.on { transform: translateX(-50%) translateY(0); }
.sc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.sc-chip {
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 3px 9px; border-radius: 99px; background: #facc15; color: #111;
}
.sc-title { font-size: 22px; font-weight: 900; margin: 2px 0 8px; color: #fff; }
.sc-line { font-size: 13px; line-height: 1.45; margin: 4px 0; color: #cbd5e1; }
.sc-line strong { color: #fef08a; }
.sc-driver {
  margin-top: 8px; padding: 8px 11px; background: rgba(250, 204, 21, 0.12);
  border-left: 3px solid #facc15; border-radius: 6px; font-style: italic; font-size: 13px; color: #fde68a;
}
.sc-actions {
  margin-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.sc-actions button {
  cursor: pointer; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.1); color: #fff; padding: 5px 10px; font-size: 12px; font-weight: 700;
}
.sc-actions button:hover { background: rgba(255,255,255,0.2); }
#passport-modal {
  position: fixed; inset: 0; background: rgba(6, 9, 18, 0.84);
  backdrop-filter: blur(8px); z-index: 80; display: none;
  align-items: center; justify-content: center; padding: 20px;
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
}
#passport-modal.on { display: flex; }
.pp-box {
  background: #fdf6e3; color: #1e293b; width: min(760px, 95vw); max-height: 86vh;
  border-radius: 20px; border: 4px solid #78350f; padding: 22px; overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0,0,0,0.75);
}
.pp-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #b45309; padding-bottom: 12px; }
.pp-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px; margin-top: 16px;
}
.pp-stamp {
  border: 2px dashed #cbd5e1; border-radius: 14px; padding: 12px; min-height: 105px;
  display: flex; flex-direction: column; justify-content: space-between;
  background: rgba(255,255,255,0.55); position: relative;
}
.pp-stamp.stamped {
  border: 3px solid var(--ink, #b91c1c); background: #fffbeb;
  box-shadow: inset 0 0 0 2px rgba(185,28,28,0.12);
}
.pp-ink {
  font-weight: 900; font-size: 14px; color: var(--ink, #b91c1c);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.pp-meta { font-size: 11px; color: #64748b; font-weight: 600; }
#polaroid-modal {
  position: fixed; inset: 0; background: rgba(255,255,255,0.92); z-index: 90;
  display: none; align-items: center; justify-content: center;
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
}
#polaroid-modal.on { display: flex; background: rgba(8, 11, 22, 0.85); transition: background 0.35s ease; }
.pol-frame {
  background: #ffffff; padding: 16px 16px 22px; border-radius: 8px;
  box-shadow: 0 25px 55px rgba(0,0,0,0.7); text-align: center; max-width: 440px;
  transform: rotate(-1.5deg);
}
.pol-frame img { width: 100%; border-radius: 4px; display: block; border: 1px solid #e2e8f0; }
.pol-cap { font-size: 18px; font-weight: 800; color: #1e293b; margin: 12px 0 8px; }
`;

const CATEGORY_COLORS = {
  Brewpub: 0xf59e0b,
  Brewery: 0xf59e0b,
  Brewhouse: 0xf59e0b,
  Coffee: 0xfff1c2,
  Tiffin: 0xf97316,
  'South Indian': 0xf97316,
  Biryani: 0xef4444,
  Burgers: 0xeab308,
  Asian: 0xec4899,
  Burmese: 0x10b981,
  Pizza: 0xf43f5e,
  Italian: 0x22c55e,
  'Namma Metro': 0x38bdf8,
  Social: 0xa855f7,
  'Climbing Gym': 0xf97316,
  'Fintech Office': 0xe2e8f0,
  'Luxury Hotel': 0xd4af37,
  Sportswear: 0xfacc15,
  Merch: 0xfde047,
  Denim: 0xef4444,
  Footwear: 0x3b82f6
};

const STOP_COPY = {
  'Toit': {
    order: 'Tintin Toit Witbier & wood-fired Margherita pizza.',
    fact: 'Landmark red-brick craft microbrewery at the 100 Feet Road & CMH junction.',
    driver: 'Guru, Friday evening illi drop maadidre 100 Feet Road full jam guaranteed!'
  },
  'Truffles': {
    order: 'All-American Cheese Burger & Ferrero Rocher shake.',
    fact: 'One of Bengaluru’s busiest casual burger spots on 100 Feet Road.',
    driver: 'College hudugaru queue nillodu nodi, burger ge ishtu craze aa?!'
  },
  'MTR 1924': {
    order: 'Crispy red-chutney Masala Dosa, Rava Idli & filter coffee in a silver tumbler.',
    fact: 'Mavalli Tiffin Rooms heritage South Indian dining tradition dating back to 1924.',
    driver: 'First-u bilisi filter kaapi kudidre ne auto gear smooth aagi bidodu!'
  },
  'Indiranagar station': {
    order: 'Tap your Namma Metro card for the Purple Line towards MG Road & Majestic.',
    fact: 'Elevated Namma Metro Purple Line station linking east and west Bengaluru.',
    driver: 'Metro bandmele last-mile drop ge nam auto ne king, meter matra kelbedi!'
  },
  'Swami Vivekananda Road station': {
    order: 'Quick Purple Line hop or grab roadside elaneer outside the concourse.',
    fact: 'Major Purple Line terminal hub at the Old Madras Road edge of Indiranagar.',
    driver: 'SV Road signal daatodu andre Everest hattidange sir!'
  },
  'Burma Burma Restaurant & Tea Room': {
    order: 'Oh No Khow Suey, Samosa Soup & Mandalay Laphet Thoke tea-leaf salad.',
    fact: 'All-vegetarian Burmese kitchen and artisanal tea room on 12th Main Road.',
    driver: 'Chai andre nam roadside cutting chai, ivaradu imported tea leaf salad ante!'
  },
  'Indiranagar Social': {
    order: 'Long Island Iced Tea & Gunpowder Baby Potatoes.',
    fact: 'Industrial co-working cafe by day and high-energy neighbourhood bar by night.',
    driver: 'Laptop hidkondu hogtare, raatri aadmele dance aadtare — double fare fix!'
  },
  'Arena Brewhouse': {
    order: 'House craft wheat ale under the glass pyramid roof.',
    fact: 'Recognisable for its striking geometric pyramid architecture near 100 Feet Road.',
    driver: 'Egypt pyramid nodakke flight yaake sir, nam Indiranagar alle ide nodi!'
  },
  'Meghana Biryani': {
    order: 'Spicy Meghana Special Boneless Biryani on banana leaf.',
    fact: 'Iconic Andhra-style biryani destination near CMH Road with green delivery bags.',
    driver: 'Aa biryani vasanege hasivu start aaythu, ondu parcel namಗೂ ಹೇಳಿ ಸಾರ್!'
  },
  "Pizza 4P's": {
    order: 'House-made Burrata & Quattro Formaggi wood-fired pizza.',
    fact: 'Farm-to-table Japanese-Italian pizzeria on Indiranagar Double Road.',
    driver: 'Cheese melinda cheese haaktare, booking sigoke vaara munche try maadbeku!'
  },
  'Jamie Oliver Kitchen': {
    order: 'Gennaro’s Tagliatelle Bolognese & artisan garlic bread.',
    fact: 'All-day Italian dining with a breezy terrace along 12th Main Road.',
    driver: '12th Main alli verity verity restaurant-galu, parking matra devare gati!'
  },
  'Third Wave': {
    order: 'Sea Salt Mocha or classic Chikkamagaluru pour-over.',
    fact: 'Homegrown Bengaluru specialty coffee roaster born right in Indiranagar.',
    driver: 'Laptop open maadi mooru gante ondu coffee kuditare, adakke Third Wave!'
  },
  'The Fatty Bao': {
    order: 'Char Siu Bao & smoky ramen bowls on the rooftop.',
    fact: 'Vibrant Asian gastrobar perched above 12th Main Road.',
    driver: 'Idli tara kಾಣುತ್ತೆ aadre bao ante, swalpa spicy haakri!'
  },
  'Sri Udupi Park': {
    order: 'Ghee Roast Dosa, Goli Baje & steaming By-Two Filter Coffee.',
    fact: 'Classic pure-veg darshini serving quick tiffins on 100 Feet Road.',
    driver: 'Auto driver-galige official pit-stop idu, by-two kaapi ಹೇಳಿ guru!'
  },
  'Chin Lung Brewery': {
    order: 'Chilli Chicken & chilled draught pitcher on the terrace.',
    fact: 'Long-running casual Bengaluru restobar and brewery hangout.',
    driver: 'Old Bangalore styleadda, pocket-friendly matte full lively!'
  },
  'Starbucks': {
    order: 'Java Chip Frappuccino & warm cinnamon roll.',
    fact: 'Corner cafe landmark on the bustling 12th Main promenade.',
    driver: 'Cup mele hesaru தಪ್ಪಾಗಿ baritare, aadru photo tegeyokke full rush!'
  },
  'The Glass House': {
    order: 'Artisanal small plates & botanical cocktails.',
    fact: 'Sunlit conservatory-style dining space in the heart of Indiranagar.',
    driver: 'Full glass building sir, kallu esedre kashta, mellage drive maadona!'
  },
  'Smoke House Deli': {
    order: 'Truffle Mac & Cheese and smoked burgers.',
    fact: 'Whimsical hand-illustrated white-walled European deli on 100 Feet Road.',
    driver: 'Gode mele ella drawing maadidare, ಒಳಗೆ ಹೋದ್ರೆ ಪ್ಯಾರಿಸ್ ಫೀಲ್!'
  },
  'Chai Point': {
    order: 'Ginger Masala Chai flask & warm Bun Maska.',
    fact: 'Bengaluru-founded neighbourhood chai cafe for quick rainy-evening breaks.',
    driver: 'Malegaladalli ಬಿಸಿ ಬಿಸಿ ಶುಂಠಿ ಚಾ ಸಿಕ್ಕಿದ್ರೆ ಸ್ವರ್ಗ ನೇ ಗುರು!'
  }
};
for (const it of STOP_LIST) STOP_COPY[it.name] = { order: it.order, fact: it.fact, driver: it.driver };

const LEVEL_TITLES = [
  [0,    'Auto Rookie'],
  [250,  'Meter Maama'],
  [600,  '100 Feet Road Flyer'],
  [1100, 'Gully Guru'],
  [1800, 'Won-and-Half Master'],
  [2600, 'Namma Bengaluru Legend']
];

const SAVE_KEY = 'indiranagar-save';

export function createStopsGame({ THREE: T = THREE, scene, camera, renderer, world, stops = [], getAuto, ui = {} }) {
  // Inject CSS if not already present
  if (typeof document !== 'undefined' && !document.getElementById('stops-game-css')) {
    const st = document.createElement('style');
    st.id = 'stops-game-css';
    st.textContent = STOPS_CSS;
    document.head.appendChild(st);
  }

  // Load persisted save
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {};
  } catch { saved = {}; }

  const state = {
    xp: saved.xp || 0,
    coins: saved.coins || 100,
    level: 1,
    title: 'Auto Rookie',
    combo: 1,
    comboTimer: 0,
    bestStreak: saved.bestStreak || 1,
    favouriteStop: saved.favouriteStop || 'Toit',
    visitedMap: saved.visitedMap || {},
    goldAuto: Boolean(saved.goldAuto),
    activeStop: null,
    cleanDriveTimer: 0
  };

  function computeLevel(xp) {
    let lv = 1, title = LEVEL_TITLES[0][1];
    for (let i = 0; i < LEVEL_TITLES.length; i++) {
      if (xp >= LEVEL_TITLES[i][0]) {
        lv = i + 1;
        title = LEVEL_TITLES[i][1];
      }
    }
    state.level = lv;
    state.title = title;
  }
  computeLevel(state.xp);

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        xp: state.xp,
        coins: state.coins,
        bestStreak: state.bestStreak,
        favouriteStop: state.favouriteStop,
        visitedMap: state.visitedMap,
        goldAuto: state.goldAuto
      }));
    } catch {}
  }

  // ---------- WebAudio Fanfare, Coin Ping, Combo Riser & Secret Jingle ----------
  let AC = null;
  function getAC() {
    if (!AC) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) AC = new Ctx();
    }
    if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
    return AC;
  }

  function playArrivalFanfare(combo = 1, isSecret = false) {
    const ctx = getAC();
    if (!ctx) return;
    const notes = isSecret ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [440, 554.37, 659.25, 880];
    const pitchMult = 1 + (combo - 1) * 0.06;
    notes.forEach((f, idx) => {
      const t = ctx.currentTime + idx * 0.075;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = isSecret ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f * pitchMult, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.48);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.5);
    });
    // Coin ping overtone
    const ct = ctx.currentTime + 0.28;
    const co = ctx.createOscillator(), cg = ctx.createGain();
    co.type = 'sine';
    co.frequency.setValueAtTime(1567.98, ct);
    co.frequency.setValueAtTime(2093.0, ct + 0.06);
    cg.gain.setValueAtTime(0.12, ct);
    cg.gain.exponentialRampToValueAtTime(0.001, ct + 0.35);
    co.connect(cg);
    cg.connect(ctx.destination);
    co.start(ct);
    co.stop(ct + 0.38);
  }

  // ---------- Build HUD, Stop Card, Passport & Polaroid DOM ----------
  const hudWrap = document.createElement('div');
  hudWrap.id = 'stops-hud';
  hudWrap.innerHTML = `
    <div class="shud-row">
      <div class="shud-pill" id="shud-lvl">Lv.1 · Auto Rookie</div>
      <div class="shud-pill">XP <b id="shud-xp">0</b></div>
      <div class="shud-pill">₹ <b id="shud-coins">100</b></div>
      <button class="shud-btn" id="btn-passport">Passport (P)</button>
    </div>
    <div class="shud-row">
      <div class="shud-pill" id="shud-combo" style="display:none">Combo <b id="shud-mult">x1</b></div>
      <div id="combo-wrap"><div id="combo-bar"></div></div>
    </div>
  `;
  document.body.appendChild(hudWrap);

  const cardEl = document.createElement('div');
  cardEl.id = 'stop-card-v2';
  cardEl.innerHTML = `
    <div class="sc-head">
      <span class="sc-chip" id="sc-chip">Brewpub</span>
      <span style="font-size:12px;font-weight:800;color:#4ade80" id="sc-reward">+100 XP · +₹50</span>
    </div>
    <div class="sc-title" id="sc-title">Toit</div>
    <div class="sc-line"><strong>Order this:</strong> <span id="sc-order"></span></div>
    <div class="sc-line"><strong>Local fact:</strong> <span id="sc-fact"></span></div>
    <div class="sc-driver" id="sc-driver"></div>
    <div class="sc-actions">
      <button id="btn-fav">★ Pin Favourite (+50% ₹)</button>
      <button id="btn-photo">Photo Moment (F)</button>
      <button id="btn-sc-close">Drive On</button>
    </div>
  `;
  document.body.appendChild(cardEl);

  const passModal = document.createElement('div');
  passModal.id = 'passport-modal';
  passModal.innerHTML = `
    <div class="pp-box">
      <div class="pp-top">
        <div>
          <div style="font-size:12px;font-weight:800;color:#b45309;letter-spacing:0.08em">OFFICIAL BENGALURU AUTO UNION</div>
          <div style="font-size:24px;font-weight:900">Indiranagar Stamp Passport</div>
        </div>
        <button class="shud-btn" id="btn-pp-close">Close (P)</button>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:13px;font-weight:700;color:#475569">
        <span id="pp-progress">Stamps: 0 / 0</span>
        <span id="pp-best">Best Streak: x1</span>
        <span id="pp-fav">Favourite: Toit</span>
      </div>
      <div class="pp-grid" id="pp-grid"></div>
    </div>
  `;
  document.body.appendChild(passModal);

  const polModal = document.createElement('div');
  polModal.id = 'polaroid-modal';
  polModal.innerHTML = `
    <div class="pol-frame">
      <img id="pol-img" alt="Indiranagar Snapshot" />
      <div class="pol-cap" id="pol-cap">Toit · Indiranagar</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <a id="pol-dl" class="shud-btn" download="indiranagar-postcard.png" style="text-decoration:none">Download PNG</a>
        <button class="shud-btn" id="btn-pol-close" style="background:#e2e8f0">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(polModal);

  // ---------- 3D Beacons, Chevron Shader Rings, Attached Neon Brackets & Particles ----------
  const root = new T.Group();
  scene.add(root);

  const pillarGeo = new T.CylinderGeometry(1.15, 1.45, 75, 18, 1, true);
  pillarGeo.translate(0, 37.5, 0);

  const pillarVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const pillarFrag = `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uVisited;
    uniform float uFlash;
    varying vec2 vUv;
    void main() {
      float grad = pow(1.0 - vUv.y, 1.85);
      float shimmer = 0.72 + 0.28 * sin(vUv.x * 25.1327 + uTime * 3.2 - vUv.y * 12.0);
      float baseAlpha = mix(0.34, 0.07, uVisited);
      vec3 col = mix(uColor, vec3(1.0), uFlash);
      gl_FragColor = vec4(col * shimmer, grad * (baseAlpha + uFlash * 0.65));
    }
  `;

  const ringGeo = new T.RingGeometry(6.8, 8.8, 48);
  ringGeo.rotateX(-Math.PI / 2);

  const ringVert = `
    varying vec2 vPos;
    void main() {
      vPos = position.xz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const ringFrag = `
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uVisited;
    varying vec2 vPos;
    void main() {
      float r = length(vPos);
      float ang = atan(vPos.y, vPos.x);
      // Rotating chevron segments
      float chev = sin(ang * 12.0 - r * 3.2 + uTime * 4.5);
      float mask = smoothstep(-0.1, 0.35, chev);
      vec3 col = mix(uColor, vec3(0.95, 0.78, 0.32), uVisited * 0.75);
      float alpha = mix(0.45 + 0.45 * mask, 0.28, uVisited);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  // Choose 1 deterministic secret stop (Arena Brewhouse or index 6)
  const secretIdx = stops.findIndex(s => s.p.n.includes('Arena')) !== -1
    ? stops.findIndex(s => s.p.n.includes('Arena'))
    : Math.min(6, Math.max(0, stops.length - 1));

  // Pool of 3 PointLights for the 3 nearest stops
  const stopLights = [];
  for (let i = 0; i < 3; i++) {
    const pl = new T.PointLight(0xffffff, 0, 26, 1.6);
    root.add(pl);
    stopLights.push(pl);
  }

  // Rising spark particles (shared across all stops)
  const SPARKS_PER_STOP = 10;
  const totalSparks = stops.length * SPARKS_PER_STOP;
  const sparkPos = new Float32Array(totalSparks * 3);
  const sparkCol = new Float32Array(totalSparks * 3);
  const sparkMeta = [];

  const bracketMat = new T.MeshStandardMaterial({ color: 0x1e242b, metalness: 0.7, roughness: 0.4 });
  const cTmp = new T.Color();

  stops.forEach((s, idx) => {
    const hex = CATEGORY_COLORS[s.tag] || 0x38e07b;
    s.colorHex = '#' + cTmp.setHex(hex).getHexString();
    s.secret = idx === secretIdx;
    s.got = Boolean(state.visitedMap[s.p.n]);
    s.revealed = !s.secret || s.got;
    s.flash = 0;

    const pMat = new T.ShaderMaterial({
      uniforms: {
        uColor: { value: new T.Color(hex) },
        uTime: { value: 0 },
        uVisited: { value: s.got ? 1.0 : 0.0 },
        uFlash: { value: 0.0 }
      },
      vertexShader: pillarVert,
      fragmentShader: pillarFrag,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending
    });

    const rMat = new T.ShaderMaterial({
      uniforms: {
        uColor: { value: new T.Color(hex) },
        uTime: { value: 0 },
        uVisited: { value: s.got ? 1.0 : 0.0 }
      },
      vertexShader: ringVert,
      fragmentShader: ringFrag,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending
    });

    const beamMesh = new T.Mesh(pillarGeo, pMat);
    beamMesh.position.set(s.p.x, 0, s.p.z);
    const ringMesh = new T.Mesh(ringGeo, rMat);
    ringMesh.position.set(s.p.x, 0.34, s.p.z);
    root.add(beamMesh, ringMesh);

    s.beam = beamMesh;
    s.ring = ringMesh;
    s.pMat = pMat;
    s.rMat = rMat;

    // Physically mounted projecting neon sign bracket near stop
    const signGroup = new T.Group();
    signGroup.position.set(s.p.x + 5.2, 0, s.p.z + 5.2);
    const post = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 5.2, 8), bracketMat);
    post.position.y = 2.6;
    const arm = new T.Mesh(new T.BoxGeometry(2.2, 0.1, 0.1), bracketMat);
    arm.position.set(1.0, 4.7, 0);
    const signTex = makeSign(s.p.n.toUpperCase(), '#111420', s.colorHex, '900 38px sans-serif', 384, 96, s.tag.toUpperCase(), s.colorHex);
    const signBoard = new T.Mesh(new T.BoxGeometry(3.2, 0.9, 0.18), makeEmissiveSignMaterial(signTex, 2.1));
    signBoard.position.set(1.2, 4.2, 0);
    const neonRim = new T.Mesh(new T.BoxGeometry(3.32, 1.0, 0.12), makeNeonMaterial(hex, 2.2));
    neonRim.position.copy(signBoard.position);
    signGroup.add(post, arm, signBoard, neonRim);
    root.add(signGroup);

    // Initialise rising sparks around stop
    cTmp.setHex(hex);
    for (let k = 0; k < SPARKS_PER_STOP; k++) {
      const gi = idx * SPARKS_PER_STOP + k;
      const ang = (k / SPARKS_PER_STOP) * Math.PI * 2;
      const rad = 6.2 + (k % 3) * 0.8;
      sparkPos[gi * 3] = s.p.x + Math.cos(ang) * rad;
      sparkPos[gi * 3 + 1] = (k * 1.4) % 14.0;
      sparkPos[gi * 3 + 2] = s.p.z + Math.sin(ang) * rad;
      sparkCol[gi * 3] = cTmp.r;
      sparkCol[gi * 3 + 1] = cTmp.g;
      sparkCol[gi * 3 + 2] = cTmp.b;
      sparkMeta.push({ baseX: sparkPos[gi * 3], baseZ: sparkPos[gi * 3 + 2], speed: 2.2 + (k % 4) * 0.6, phase: k });
    }
  });

  const sparkGeo = new T.BufferGeometry();
  sparkGeo.setAttribute('position', new T.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new T.BufferAttribute(sparkCol, 3));
  const sparkPoints = new T.Points(
    sparkGeo,
    new T.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending })
  );
  sparkPoints.frustumCulled = false;
  root.add(sparkPoints);

  // Arrival Shockwave Ring + Confetti Burst + Floating "+XP / +₹" Sprite
  const shockRing = new T.Mesh(
    new T.RingGeometry(1.0, 1.8, 40),
    new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })
  );
  shockRing.rotation.x = -Math.PI / 2;
  shockRing.visible = false;
  root.add(shockRing);

  const BURST_COUNT = 45;
  const burstPos = new Float32Array(BURST_COUNT * 3);
  const burstVel = [];
  for (let i = 0; i < BURST_COUNT; i++) burstVel.push(new T.Vector3());
  const burstGeo = new T.BufferGeometry();
  burstGeo.setAttribute('position', new T.BufferAttribute(burstPos, 3));
  const burstPoints = new T.Points(
    burstGeo,
    new T.PointsMaterial({ color: 0xfacc15, size: 0.55, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })
  );
  burstPoints.visible = false;
  root.add(burstPoints);

  const floatCanvas = document.createElement('canvas');
  floatCanvas.width = 512; floatCanvas.height = 128;
  const floatTex = new T.CanvasTexture(floatCanvas);
  floatTex.colorSpace = T.SRGBColorSpace;
  const floatSprite = new T.Sprite(new T.SpriteMaterial({ map: floatTex, transparent: true, depthWrite: false, fog: false }));
  floatSprite.scale.set(11, 2.8, 1);
  floatSprite.visible = false;
  root.add(floatSprite);

  let arrivalAnim = { timer: 0, shake: 0 };
  let cardTimer = 0;

  function updateHUD() {
    computeLevel(state.xp);
    const elLvl = document.getElementById('shud-lvl');
    const elXp = document.getElementById('shud-xp');
    const elCoins = document.getElementById('shud-coins');
    const elFound = ui.$ ? ui.$('found') : document.getElementById('found');
    const elTotal = ui.$ ? ui.$('total') : document.getElementById('total');

    if (elLvl) elLvl.textContent = `Lv.${state.level} · ${state.title}`;
    if (elXp) elXp.textContent = state.xp;
    if (elCoins) elCoins.textContent = state.coins;

    const visitedCount = stops.filter(s => s.got).length;
    if (elFound) elFound.textContent = visitedCount;
    if (elTotal) elTotal.textContent = stops.length;
  }
  updateHUD();

  function showStopCard(stop, xpGain, coinGain, tipBonus) {
    state.activeStop = stop;
    const copy = STOP_COPY[stop.p.n] || {
      order: 'House special filter coffee & local snacks.',
      fact: `A beloved Indiranagar neighbourhood spot along ${stop.road || 'the main strip'}.`,
      driver: 'Namma Indiranagar alli idu super spot sir, meter mele 20 extra kodri!'
    };

    const chip = document.getElementById('sc-chip');
    if (chip) {
      chip.textContent = (stop.secret ? '★ SECRET · ' : '') + stop.tag;
      chip.style.background = stop.colorHex;
    }
    document.getElementById('sc-reward').style.display = 'none';
    document.getElementById('btn-fav').style.display = 'none';
    document.getElementById('sc-title').textContent = stop.p.n;
    document.getElementById('sc-order').textContent = copy.order;
    document.getElementById('sc-fact').textContent = copy.fact;
    document.getElementById('sc-driver').textContent = `"${copy.driver}"`;
    document.getElementById('btn-fav').textContent =
      state.favouriteStop === stop.p.n ? '★ Pinned Favourite (+50% ₹)' : '☆ Pin as Favourite (+50% ₹)';

    cardEl.classList.add('on');
    cardTimer = 8.5;
  }

  function renderPassport() {
    const grid = document.getElementById('pp-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const visitedCount = stops.filter(s => s.got).length;
    document.getElementById('pp-progress').textContent = `Stamps Collected: ${visitedCount} / ${stops.length}`;
    document.getElementById('pp-best').textContent = `Best Combo Streak: x${state.bestStreak}`;
    document.getElementById('pp-fav').textContent = `Favourite Order: ${state.favouriteStop}`;

    stops.forEach((s, i) => {
      const div = document.createElement('div');
      const vInfo = state.visitedMap[s.p.n];
      div.className = 'pp-stamp' + (s.got ? ' stamped' : '');
      div.style.setProperty('--ink', s.colorHex);
      div.style.transform = `rotate(${((i % 5) - 2) * 1.4}deg)`;

      if (s.got) {
        div.innerHTML = `
          <div class="pp-ink">✓ ${s.p.n}</div>
          <div class="pp-meta">${s.tag} · ${s.road || 'Indiranagar'}</div>
          <div class="pp-meta" style="color:${s.colorHex}">STAMPED · ${vInfo.date || 'Today'}</div>
        `;
      } else {
        div.innerHTML = `
          <div class="pp-ink" style="color:#94a3b8">${s.secret && !s.revealed ? '??? SECRET STOP' : s.p.n}</div>
          <div class="pp-meta">${s.tag}</div>
          <div class="pp-meta">UNVISITED</div>
        `;
      }
      grid.appendChild(div);
    });
  }

  function openPassport(force) {
    const isOpen = passModal.classList.contains('on');
    const next = typeof force === 'boolean' ? force : !isOpen;
    if (next) {
      renderPassport();
      passModal.classList.add('on');
    } else {
      passModal.classList.remove('on');
    }
  }

  function toggleFavourite() {
    if (!state.activeStop) return;
    state.favouriteStop = state.activeStop.p.n;
    saveState();
    const btn = document.getElementById('btn-fav');
    if (btn) btn.textContent = '★ Pinned Favourite (+50% ₹)';
  }

  function takePhotoMoment() {
    const stopName = state.activeStop ? state.activeStop.p.n : 'Indiranagar 100 Feet Road';
    const glCanvas = (renderer && renderer.domElement) || document.getElementById('c');
    if (!glCanvas) return;

    const out = document.createElement('canvas');
    out.width = 640; out.height = 440;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 640, 440);
    try {
      ctx.drawImage(glCanvas, 20, 20, 600, 340);
    } catch {}
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${stopName} · Indiranagar`, 320, 396);
    ctx.font = '600 14px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Namma Auto Diary · ${new Date().toLocaleDateString()}`, 320, 420);

    const url = out.toDataURL('image/png');
    document.getElementById('pol-img').src = url;
    document.getElementById('pol-dl').href = url;
    document.getElementById('pol-cap').textContent = `${stopName} · Indiranagar`;
    polModal.classList.add('on');
  }

  document.getElementById('btn-passport').addEventListener('click', () => openPassport());
  document.getElementById('btn-pp-close').addEventListener('click', () => openPassport(false));
  document.getElementById('btn-fav').addEventListener('click', toggleFavourite);
  document.getElementById('btn-photo').addEventListener('click', takePhotoMoment);
  document.getElementById('btn-sc-close').addEventListener('click', () => cardEl.classList.remove('on'));
  document.getElementById('btn-pol-close').addEventListener('click', () => polModal.classList.remove('on'));

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') openPassport();
    if (e.code === 'KeyF' && cardEl.classList.contains('on')) takePhotoMoment();
  });

  function triggerStopArrival(s) {
    s.got = true;
    s.revealed = true;
    s.flash = 1.0;
    s.pMat.uniforms.uVisited.value = 1.0;
    s.rMat.uniforms.uVisited.value = 1.0;

    if (state.comboTimer > 0) {
      state.combo = Math.min(5, state.combo + 1);
    } else {
      state.combo = 1;
    }
    state.comboTimer = 90.0;
    state.bestStreak = Math.max(state.bestStreak, state.combo);

    const favMult = state.favouriteStop === s.p.n ? 1.5 : 1.0;
    const tipBonus = state.cleanDriveTimer >= 1.5;
    const xpGain = (s.secret ? 200 : 100) * state.combo;
    const coinGain = Math.round((s.secret ? 90 : 45) * state.combo * favMult) + (tipBonus ? 25 : 0);

    state.xp += xpGain;
    state.coins += coinGain;
    state.visitedMap[s.p.n] = { date: new Date().toLocaleDateString() };

    if (stops.every(st => st.got)) {
      state.goldAuto = true;
      state.xp += 500;
      state.coins += 300;
    }

    saveState();
    updateHUD();
    playArrivalFanfare(state.combo, s.secret);
    showStopCard(s, xpGain, coinGain, tipBonus);

    // 3D Shockwave + Confetti Burst + Rising Floating Text
    arrivalAnim.timer = 1.8;
    arrivalAnim.shake = 0.35;
    shockRing.position.set(s.p.x, 0.45, s.p.z);
    shockRing.scale.setScalar(1);
    shockRing.material.opacity = 0.95;
    shockRing.visible = true;

    for (let i = 0; i < BURST_COUNT; i++) {
      burstPos[i * 3] = s.p.x;
      burstPos[i * 3 + 1] = 1.8;
      burstPos[i * 3 + 2] = s.p.z;
      const a = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 8;
      burstVel[i].set(Math.cos(a) * spd, 7 + Math.random() * 7, Math.sin(a) * spd);
    }
    burstGeo.attributes.position.needsUpdate = true;
    burstPoints.material.opacity = 1;
    burstPoints.visible = true;

    const fctx = floatCanvas.getContext('2d');
    fctx.clearRect(0, 0, 512, 128);
    fctx.font = '900 44px sans-serif';
    fctx.textAlign = 'center';
    fctx.strokeStyle = '#000';
    fctx.lineWidth = 8;
    const txt = `+${xpGain} XP  ·  +₹${coinGain}`;
    fctx.strokeText(txt, 256, 72);
    fctx.fillStyle = '#fde047';
    fctx.fillText(txt, 256, 72);
    floatTex.needsUpdate = true;
    floatSprite.position.set(s.p.x, 4.0, s.p.z);
    floatSprite.material.opacity = 1;
    floatSprite.visible = true;
  }

  function update(dt, nowMs = performance.now()) {
    const tSec = nowMs * 0.001;
    const autoState = getAuto ? getAuto() : { x: 0, z: 0, v: 0 };
    state.cleanDriveTimer += dt;

    // Combo timer bar
    if (state.comboTimer > 0) {
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      const cw = document.getElementById('combo-wrap');
      const cb = document.getElementById('combo-bar');
      const cm = document.getElementById('shud-combo');
      const mu = document.getElementById('shud-mult');
      if (cw && cb && cm && mu) {
        cw.style.display = 'block';
        cm.style.display = 'flex';
        mu.textContent = 'x' + state.combo;
        cb.style.width = ((state.comboTimer / 90) * 100).toFixed(1) + '%';
      }
      if (state.comboTimer <= 0) {
        state.combo = 1;
        if (cw) cw.style.display = 'none';
        if (cm) cm.style.display = 'none';
      }
    }

    if (cardTimer > 0) {
      cardTimer -= dt;
      if (cardTimer <= 0) cardEl.classList.remove('on');
    }

    // Update rising spark particles
    const sArr = sparkGeo.attributes.position.array;
    for (let i = 0; i < totalSparks; i++) {
      const m = sparkMeta[i];
      let y = sArr[i * 3 + 1] + m.speed * dt;
      if (y > 14.0) y = 0.4;
      sArr[i * 3] = m.baseX + Math.sin(tSec * 2.0 + m.phase) * 0.35;
      sArr[i * 3 + 1] = y;
      sArr[i * 3 + 2] = m.baseZ + Math.cos(tSec * 2.0 + m.phase) * 0.35;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    // Rank stops by distance for PointLight pooling + arrival check
    const nearest = [];
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      s.pMat.uniforms.uTime.value = tSec;
      s.rMat.uniforms.uTime.value = tSec;
      if (s.flash > 0) {
        s.flash = Math.max(0, s.flash - dt * 1.8);
        s.pMat.uniforms.uFlash.value = s.flash;
      }

      const d = Math.hypot(s.p.x - autoState.x, s.p.z - autoState.z);
      if (s.secret && d < 120) s.revealed = true;
      if (!s.got && d < 13.5) triggerStopArrival(s);
      nearest.push({ s, d });
    }

    nearest.sort((a, b) => a.d - b.d);
    for (let i = 0; i < 3; i++) {
      const pl = stopLights[i];
      if (nearest[i] && nearest[i].d < 65) {
        const st = nearest[i].s;
        pl.color.set(st.colorHex);
        pl.position.set(st.p.x, 3.2, st.p.z);
        pl.intensity = st.got ? 4 : 18;
      } else {
        pl.intensity = 0;
      }
    }

    // Update arrival burst & shockwave
    if (arrivalAnim.timer > 0) {
      arrivalAnim.timer -= dt;
      const p = 1.0 - arrivalAnim.timer / 1.8;
      shockRing.scale.setScalar(1 + p * 14);
      shockRing.material.opacity = Math.max(0, 1 - p * 1.2);

      const bp = burstGeo.attributes.position.array;
      for (let i = 0; i < BURST_COUNT; i++) {
        burstVel[i].y -= 18 * dt;
        bp[i * 3] += burstVel[i].x * dt;
        bp[i * 3 + 1] = Math.max(0.2, bp[i * 3 + 1] + burstVel[i].y * dt);
        bp[i * 3 + 2] += burstVel[i].z * dt;
      }
      burstGeo.attributes.position.needsUpdate = true;
      burstPoints.material.opacity = Math.max(0, 1 - p);

      floatSprite.position.y += dt * 2.8;
      floatSprite.material.opacity = Math.max(0, 1 - p * 0.9);

      if (arrivalAnim.shake > 0 && camera) {
        arrivalAnim.shake = Math.max(0, arrivalAnim.shake - dt * 1.2);
        camera.position.y += (Math.random() - 0.5) * arrivalAnim.shake;
      }

      if (arrivalAnim.timer <= 0) {
        shockRing.visible = false;
        burstPoints.visible = false;
        floatSprite.visible = false;
      }
    }
  }

  return {
    update,
    stops,
    state,
    openPassport,
    toggleFavourite,
    takePhotoMoment
  };
}
