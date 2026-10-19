// ===== Game (3D view) =====
const W = 560, H = 880;          // velvet: room to lay untangled chains out
const FW = 300, FH = 500;         // area the camera frames at the start
const OX = (360 - W) / 2, OY = (640 - H) / 2; // level data was made on a 360x640 tray
/*LEVELS*/
const GEMS = [0x9e0b22, 0x0f3592, 0x0a6b43, 0x5a1d8e, 0xb86e06]; // ruby, sapphire, emerald, amethyst, topaz
const METAL = {
  gold:   { color: 0xe0b04a, metal: 1.0, rough: 0.28 },
  silver: { color: 0xd4d9e2, metal: 1.0, rough: 0.24 },
  rose:   { color: 0xe7a68e, metal: 1.0, rough: 0.3 },
  pearl:  { color: 0xf3ecdf, metal: 0.0, rough: 0.22 },
  kihei:  { color: 0xf2b230, metal: 1.0, rough: 0.16 },
};

const $ = id => document.getElementById(id);
const cvs = $('c');
let sim, level = 0, state = 'menu', frame = 0, t0 = 0, elapsed = 0, started = false, crossings = 0;
const pointers = new Map(); // pointerId -> { g, hold }

function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
function bestOf(i) { const v = store('hodoke3-best-' + i); return v ? +v : null; }
function fmt(ms) { const s = ms / 1000; const m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(1).padStart(4, '0'); }
function decode(b64) {
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(u8.buffer), f = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 20 - (i % 3 === 0 ? OX : i % 3 === 1 ? OY : 0);
  return f;
}

// ---------- three.js scene ----------
// world mapping: sim (x, y, z-up) -> three (x - W/2, z, y - H/2)
const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x120e22, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 10, 5000);

// soft studio environment so metal has something to reflect
(function makeEnv() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#fff6e6'); gr.addColorStop(0.35, '#b9a8d8'); gr.addColorStop(0.55, '#3b2d5c'); gr.addColorStop(1, '#120c20');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(40, 18, 60, 14); g.fillRect(160, 24, 50, 10);
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.encoding = THREE.sRGBEncoding;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
})();

scene.add(new THREE.HemisphereLight(0xe8ddff, 0x1a1030, 0.35));
const sun = new THREE.DirectionalLight(0xfff3dd, 1.6);
sun.position.set(-160, 520, -260);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -310, right: 310, top: 470, bottom: -470, near: 50, far: 1400 });
sun.shadow.bias = -0.0008; sun.shadow.radius = 3;
scene.add(sun);

// velvet tray
(function makeTray() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 503;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(160, 240, 10, 160, 252, 380);
  rg.addColorStop(0, '#3a2b60'); rg.addColorStop(0.6, '#251b44'); rg.addColorStop(1, '#16102a');
  g.fillStyle = rg; g.fillRect(0, 0, 320, 503);
  const img = g.getImageData(0, 0, 320, 503), d = img.data; let seed = 7;
  for (let i = 0; i < d.length; i += 4) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; const n = ((seed >> 16) & 31) - 15; d[i] += n * 0.7; d[i + 1] += n * 0.6; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const brass = new THREE.MeshStandardMaterial({ color: 0x2e1f0a, metalness: 0, roughness: 0.75, envMapIntensity: 0 });
  const t = 12, h = 16;
  for (const [w, d2, x, z] of [[W + 2 * t, t, 0, -H / 2 - t / 2], [W + 2 * t, t, 0, H / 2 + t / 2], [t, H, -W / 2 - t / 2, 0], [t, H, W / 2 + t / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d2), brass); m.position.set(x, h / 2 - 2, z); m.receiveShadow = true; scene.add(m);
  }
})();

// instanced chain parts, rebuilt per level
let linkMeshes = [], pearlMeshes = [], extras = [];
const linkGeo = new THREE.TorusGeometry(2.95, 1.05, 6, 14);
const pearlGeo = new THREE.SphereGeometry(4.3, 14, 10);
// 喜平 (Cuban) links: fat, flattened, packed tight and twisted so they lie like a heavy rope of gold
const kiheiGeo = new THREE.TorusGeometry(4.0, 2.5, 8, 20);
kiheiGeo.scale(1, 1, 0.55);
// stones: each necklace gets its own cut. All lie flat, top facing up, the end that hangs away from the chain toward +Z.
function flatExtrude(shape, depth) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 1.1, bevelSize: 0.9, bevelSegments: 2, curveSegments: 14 });
  geo.center(); geo.rotateX(-Math.PI / 2); geo.computeVertexNormals(); return geo;
}
const GEM_GEOS = {
  heart: (() => { const h = new THREE.Shape(); h.moveTo(0, -5.6); h.bezierCurveTo(-7.5, -0.6, -4, 5.2, 0, 2.4); h.bezierCurveTo(4, 5.2, 7.5, -0.6, 0, -5.6); return flatExtrude(h, 1.6); })(),
  drop: (() => { const d = new THREE.Shape(); d.moveTo(0, 6); d.bezierCurveTo(1.4, 3, 4.4, 0.6, 4.4, -1.6); d.absarc(0, -1.6, 4.4, 0, Math.PI, true); d.bezierCurveTo(-4.4, 0.6, -1.4, 3, 0, 6); return flatExtrude(d, 1.6); })(),
  square: (() => { const q = new THREE.Shape(), a = 3.6, r = 1.2; q.moveTo(-a + r, -a); q.lineTo(a - r, -a); q.quadraticCurveTo(a, -a, a, -a + r); q.lineTo(a, a - r); q.quadraticCurveTo(a, a, a - r, a); q.lineTo(-a + r, a); q.quadraticCurveTo(-a, a, -a, a - r); q.lineTo(-a, -a + r); q.quadraticCurveTo(-a, -a, -a + r, -a); return flatExtrude(q, 1.6); })(),
  round: (() => { const g = new THREE.LatheGeometry([new THREE.Vector2(0, -2.6), new THREE.Vector2(5.2, 0.2), new THREE.Vector2(5.0, 0.9), new THREE.Vector2(3.2, 2.2), new THREE.Vector2(0, 2.2)], 12); g.computeVertexNormals(); return g; })(),
  oval: (() => { const g = new THREE.LatheGeometry([new THREE.Vector2(0, -2.2), new THREE.Vector2(4.4, 0.2), new THREE.Vector2(4.2, 0.8), new THREE.Vector2(2.6, 2.0), new THREE.Vector2(0, 2.0)], 12); g.scale(0.8, 1, 1.25); g.computeVertexNormals(); return g; })(),
};
const GEM_CUTS = ['heart', 'round', 'drop', 'square', 'oval'];
const bailGeo = new THREE.TorusGeometry(2.2, 0.7, 6, 14);
const claspGeo = new THREE.TorusGeometry(4.2, 1.5, 8, 18);
const ringGeo = new THREE.TorusGeometry(3.8, 1.1, 6, 16);
const matCache = {};
function metalMat(kind) {
  if (matCache[kind]) return matCache[kind];
  const m = METAL[kind];
  return matCache[kind] = new THREE.MeshStandardMaterial({ color: m.color, metalness: m.metal, roughness: m.rough, envMapIntensity: 1.2 });
}
const cursorMat = new THREE.MeshBasicMaterial({ color: 0xf1e8d8, transparent: true, opacity: 0.85, depthTest: false });
const holdMat = new THREE.MeshBasicMaterial({ color: 0xd1ab55, transparent: true, opacity: 0.9, depthTest: false });
const cursorGeo = new THREE.RingGeometry(9, 11, 28);

function buildChains() {
  for (const m of [...linkMeshes, ...pearlMeshes, ...extras]) { scene.remove(m); if (m.dispose) m.dispose(); }
  for (const f of effects) f.cleanup(); effects.length = 0;
  linkMeshes = []; pearlMeshes = []; extras = [];
  kindOf = new Array(sim.N); sim.chains.forEach(c => { for (let i = c.start; i < c.start + c.n; i++) kindOf[i] = c.kind; });
  sim.chains.forEach((c, ci) => {
    const nSeg = c.n - 1;
    if (c.kind === 'pearl') {
      const m = new THREE.InstancedMesh(pearlGeo, metalMat('pearl'), c.n);
      m.castShadow = m.receiveShadow = true; m.userData = { chain: c }; scene.add(m); pearlMeshes.push(m);
    } else {
      const kh = c.kind === 'kihei';
      const m = new THREE.InstancedMesh(kh ? kiheiGeo : linkGeo, metalMat(c.kind), nSeg);
      m.castShadow = m.receiveShadow = true; m.userData = { chain: c, kihei: kh }; scene.add(m); linkMeshes.push(m);
    }
    // pendant hanging from the middle of the chain on a small bail
    const big = c.r / R;
    if (c.kind !== 'kihei') {
    const cut = GEM_CUTS[ci % GEM_CUTS.length];
    const gem = new THREE.Mesh(GEM_GEOS[cut], new THREE.MeshStandardMaterial({ color: GEMS[ci % GEMS.length], metalness: 0.35, roughness: 0.12, envMapIntensity: 1.3, emissive: GEMS[ci % GEMS.length], emissiveIntensity: 0.12, flatShading: cut === 'round' || cut === 'oval' }));
    gem.scale.setScalar(1.2); gem.castShadow = true; gem.userData = { at: c.start + (c.n >> 1), chain: c, hang: 10 }; scene.add(gem); extras.push(gem);
    const bail = new THREE.Mesh(bailGeo, metalMat(c.kind === 'pearl' ? 'gold' : c.kind)); bail.castShadow = true;
    bail.userData = { at: c.start + (c.n >> 1), chain: c, hang: 3.2, bail: true }; scene.add(bail); extras.push(bail);
    }
    const clasp = new THREE.Mesh(claspGeo, metalMat(c.kind === 'pearl' ? 'gold' : c.kind)); clasp.castShadow = true; clasp.scale.setScalar(big);
    clasp.userData = { at: c.start, next: c.start + 1, chain: c }; scene.add(clasp); extras.push(clasp);
    const ring = new THREE.Mesh(ringGeo, metalMat(c.kind === 'pearl' ? 'gold' : c.kind)); ring.castShadow = true; ring.scale.setScalar(big);
    ring.userData = { at: c.start + c.n - 1, next: c.start + c.n - 2, chain: c }; scene.add(ring); extras.push(ring);
  });
}

const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const _s = new THREE.Vector3(1.55, 1, 1);
const _sK = new THREE.Vector3(1.95, 1, 1);
const _twistA = new THREE.Matrix4().makeRotationX(0.75), _twistB = new THREE.Matrix4().makeRotationX(-0.75);
function basisAlong(ax, ay, az, bx, by, bz, standing) {
  // segment direction in three coords
  _x.set(bx - ax, bz - az, by - ay); const l = _x.length() || 1; _x.multiplyScalar(1 / l);
  _y.copy(_up).addScaledVector(_x, -_x.dot(_up)); if (_y.lengthSq() < 1e-6) _y.set(1, 0, 0); _y.normalize();
  _z.crossVectors(_x, _y);
  // torus lies in its local XY plane: lying flat -> plane (x, z); standing -> plane (x, y)
  if (standing) _m.makeBasis(_x, _y, _z); else { _y.negate(); _m.makeBasis(_x, _z, _y); }
  return l;
}
const c0 = e => e.userData.chain.start, c1 = e => e.userData.chain.start + e.userData.chain.n - 1;
function syncChains() {
  const { px, py, pz, sa, sb } = sim;
  for (const m of linkMeshes) {
    const c = m.userData.chain;
    if (c.removed) continue;
    const kh = m.userData.kihei;
    for (let k = 0; k < c.n - 1; k++) {
      const a = c.start + k, b = a + 1;
      basisAlong(px[a], py[a], pz[a], px[b], py[b], pz[b], kh ? 0 : k & 1);
      if (kh) { _m.multiply(k & 1 ? _twistA : _twistB); _m.scale(_sK); } else _m.scale(_s);
      _m.setPosition((px[a] + px[b]) / 2 - W / 2, (pz[a] + pz[b]) / 2, (py[a] + py[b]) / 2 - H / 2);
      m.setMatrixAt(k, _m);
    }
    m.instanceMatrix.needsUpdate = true;
  }
  for (const m of pearlMeshes) {
    const c = m.userData.chain;
    if (c.removed) continue;
    for (let k = 0; k < c.n; k++) {
      const i = c.start + k; _m.makeTranslation(px[i] - W / 2, pz[i], py[i] - H / 2); m.setMatrixAt(k, _m);
    }
    m.instanceMatrix.needsUpdate = true;
  }
  for (const e of extras) {
    if (e.userData.chain.removed) continue;
    const i = e.userData.at;
    if (e.userData.next !== undefined) {
      const j = e.userData.next;
      basisAlong(px[j], py[j], pz[j], px[i], py[i], pz[i], 0);
      e.quaternion.setFromRotationMatrix(_m);
      const dx = px[i] - px[j], dy = py[i] - py[j], l = Math.hypot(dx, dy) || 1;
      e.position.set(px[i] + dx / l * 4 - W / 2, pz[i], py[i] + dy / l * 4 - H / 2);
    } else {
      // pendant: lies beside the chain, pointing away from it
      const a = Math.max(c0(e), i - 1), b = Math.min(c1(e), i + 1);
      let dx = px[b] - px[a], dy = py[b] - py[a]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const nx = -dy, ny = dx, h = e.userData.hang;
      e.position.set(px[i] + nx * h - W / 2, Math.max(R * 0.5, pz[i] - 1.5) + (e.userData.bail ? 1.2 : 0), py[i] + ny * h - H / 2);
      if (e.userData.bail) e.rotation.set(0, Math.atan2(dx, dy), 0);
      else e.rotation.set(0, Math.atan2(nx, ny), 0);
    }
  }
}

// ---------- untangled necklace: glow, lift, shrink into sparkles ----------
const effects = [];
const sparkTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,0.9)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
// native haptics inside the app (Capacitor), plain vibration elsewhere
const NativeHaptics = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) || null;
function hapticTap() { const h = NativeHaptics(); try { if (h) h.impact({ style: 'LIGHT' }); else if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
function hapticSuccess() { const h = NativeHaptics(); try { if (h) h.notification({ type: 'SUCCESS' }); else if (navigator.vibrate) navigator.vibrate([18, 40, 28]); } catch (e) {} }
let audio = null;
let master = null, noiseBuf = null, muted = false;
try { muted = localStorage.getItem('hodoke-muted') === '1'; } catch (e) {}
function unlockAudio() {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const comp = audio.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
      master = audio.createGain(); master.gain.value = muted ? 0 : 1;
      master.connect(comp).connect(audio.destination);
      noiseBuf = audio.createBuffer(1, audio.sampleRate * 0.25, audio.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (audio.state === 'suspended') audio.resume();
  } catch (e) {}
}
function setMuted(m) {
  muted = m; try { localStorage.setItem('hodoke-muted', m ? '1' : '0'); } catch (e) {}
  if (master) master.gain.value = m ? 0 : 1;
  $('soundBtn').textContent = m ? '音 オフ' : '音 オン';
  $('soundBtn').setAttribute('aria-pressed', String(!m));
}

// ---- chain sounds: tiny metallic clicks synthesised from what the links are doing ----
// gold rings a little lower and warmer, silver brighter, pearls give a soft clack
const VOICE = {
  gold:   { lo: 5200, hi: 9500, q: 22, dec: 0.022, ping: 0.12 },
  rose:   { lo: 5000, hi: 9000, q: 22, dec: 0.02, ping: 0.1 },
  silver: { lo: 6500, hi: 11500, q: 26, dec: 0.026, ping: 0.16 },
  pearl:  { lo: 2400, hi: 4200, q: 8, dec: 0.012, ping: 0 },
  kihei:  { lo: 2200, hi: 5200, q: 12, dec: 0.035, ping: 0.06 },
};
function grain(kind, vol, pan) {
  const v = VOICE[kind] || VOICE.gold, t = audio.currentTime + Math.random() * 0.012;
  const src = audio.createBufferSource(); src.buffer = noiseBuf;
  const bp = audio.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = v.lo + Math.random() * (v.hi - v.lo); bp.Q.value = v.q;
  const g = audio.createGain(), dec = v.dec * (0.6 + Math.random() * 0.8);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  let node = src.connect(bp).connect(g);
  if (audio.createStereoPanner) { const p = audio.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
  node.connect(master);
  src.start(t, Math.random() * 0.2, dec + 0.02);
  // now and then a link rings: a short high sine on top of the click
  if (Math.random() < v.ping) {
    const o = audio.createOscillator(), og = audio.createGain();
    o.frequency.value = 7000 + Math.random() * 5000;
    og.gain.setValueAtTime(vol * 0.12, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.04);
    o.connect(og).connect(master); o.start(t); o.stop(t + 0.13);
  }
}
let soundBudget = 0;
function chainSounds() {
  if (!audio || muted || audio.state !== 'running' || !sim) return;
  const { px, py, pz, ox, oy, oz, touch, rest, gone } = sim, scale = 60 * sim.sub;
  const act = {}; let total = 0, panSum = 0;
  for (let i = 0; i < sim.N; i++) {
    if (gone[i] || rest[i] >= 40 || !touch[i]) continue; // only links rubbing against other links
    const v = Math.hypot(px[i] - ox[i], py[i] - oy[i], pz[i] - oz[i]) * scale;
    if (v < 12) continue;
    const e = Math.min(1, (v - 12) / 220);
    const k = kindOf[i]; act[k] = (act[k] || 0) + e; total += e; panSum += e * (px[i] / W * 2 - 1);
  }
  if (total <= 0) { soundBudget = 0; return; }
  // number of clicks this frame grows with the motion, softly capped
  soundBudget += Math.min(2.5, Math.sqrt(total) * 0.55);
  const pan = Math.max(-0.8, Math.min(0.8, panSum / total));
  const vol = Math.min(0.07, 0.018 + total * 0.0025);
  const kinds = Object.keys(act);
  while (soundBudget >= 1) {
    soundBudget -= 1;
    let r = Math.random() * total, k = kinds[0];
    for (const q of kinds) { r -= act[q]; if (r <= 0) { k = q; break; } }
    grain(k, vol * (0.5 + Math.random() * 0.6), pan + (Math.random() - 0.5) * 0.4);
  }
}
let kindOf = [];
function pickSound(i, down) {
  if (!audio || muted) return;
  const k = kindOf[i] || 'gold';
  grain(k, down ? 0.05 : 0.035, 0); if (down) setTimeout(() => grain(k, 0.025, 0), 35);
}
function chime() {
  if (!audio) return;
  const t = audio.currentTime;
  [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, k) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const st = t + k * 0.07;
    g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.16, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, st + 1.3);
    o.connect(g).connect(master); o.start(st); o.stop(st + 1.4);
  });
}
function vanish(ci) {
  const c = sim.chains[ci];
  // centre of the necklace
  let cx = 0, cy = 0, cz = 0;
  for (let i = c.start; i < c.start + c.n; i++) { cx += sim.px[i]; cy += sim.py[i]; cz += sim.pz[i]; }
  cx = cx / c.n - W / 2; cz = cy / c.n - H / 2;
  const pivot = new THREE.Vector3(cx, 0, cz);
  sim.removeChain(ci);
  const meshes = [...linkMeshes, ...pearlMeshes].filter(m => m.userData.chain === c);
  const ext = extras.filter(e => e.userData.chain === c).map(e => ({ e, p: e.position.clone(), s: e.scale.clone() }));
  const glowMats = [];
  for (const m of [...meshes, ...ext.map(x => x.e)]) {
    const mat = m.material.clone(); mat.transparent = true; mat.emissive = new THREE.Color(0xffe2a0); mat.emissiveIntensity = 0;
    m.material = mat; glowMats.push(mat); m.castShadow = false;
  }
  // sparkles that burst from along the chain
  const NS = 90, pos = new Float32Array(NS * 3), vel = [];
  for (let k = 0; k < NS; k++) {
    const i = c.start + ((Math.random() * c.n) | 0);
    pos[k * 3] = sim.px[i] - W / 2; pos[k * 3 + 1] = sim.pz[i] + 2; pos[k * 3 + 2] = sim.py[i] - H / 2;
    const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60;
    vel.push([Math.cos(a) * sp, 60 + Math.random() * 90, Math.sin(a) * sp]);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sm = new THREE.PointsMaterial({ size: 9, map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9b8 });
  const pts = new THREE.Points(sg, sm); scene.add(pts);
  // a ring of light spreading over the velvet
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(cx, 1, cz); scene.add(ring);
  chime();
  hapticSuccess();
  const fx = {
    t: 0,
    update(dt) {
      this.t += dt;
      const t = this.t;
      // 0-0.35s glow and float, 0.35-1.1s shrink upward into light
      const glow = Math.min(1, t / 0.35);
      const shrink = t < 0.35 ? 1 : Math.max(0, 1 - Math.pow((t - 0.35) / 0.75, 2));
      const lift = 18 * glow + 60 * Math.max(0, t - 0.35);
      for (const mat of glowMats) { mat.emissiveIntensity = 0.9 * glow; mat.opacity = Math.max(0, Math.min(1, shrink * 1.4)); }
      for (const m of meshes) { m.scale.setScalar(shrink); m.position.set(pivot.x * (1 - shrink), lift, pivot.z * (1 - shrink)); }
      for (const x of ext) { x.e.position.set(pivot.x + (x.p.x - pivot.x) * shrink, x.p.y * shrink + lift, pivot.z + (x.p.z - pivot.z) * shrink); x.e.scale.copy(x.s).multiplyScalar(Math.max(0.001, shrink)); }
      const a = sg.attributes.position.array;
      for (let k = 0; k < NS; k++) { a[k * 3] += vel[k][0] * dt; a[k * 3 + 1] += vel[k][1] * dt; a[k * 3 + 2] += vel[k][2] * dt; vel[k][1] -= 90 * dt; vel[k][0] *= 0.98; vel[k][2] *= 0.98; }
      sg.attributes.position.needsUpdate = true;
      sm.opacity = Math.max(0, 1 - t / 1.4); sm.size = 9 + 6 * Math.sin(Math.min(1, t / 1.4) * Math.PI);
      const rr = 10 + t * 170; ring.scale.setScalar(rr); ring.material.opacity = Math.max(0, 0.7 * (1 - t / 0.9));
      return t < 1.5;
    },
    cleanup() {
      for (const m of meshes) m.visible = false;
      for (const x of ext) x.e.visible = false;
      scene.remove(pts); sg.dispose(); sm.dispose(); scene.remove(ring); ring.geometry.dispose(); ring.material.dispose();
    },
  };
  effects.push(fx);
}

// finger markers
const markers = [];
function syncMarkers() {
  let k = 0;
  for (const p of pointers.values()) {
    let m = markers[k];
    if (!m) { m = new THREE.Mesh(cursorGeo, cursorMat); m.rotation.x = -Math.PI / 2; m.renderOrder = 10; scene.add(m); markers.push(m); }
    const i = p.g.i; m.visible = true; m.material = p.hold ? holdMat : cursorMat;
    m.position.set(sim.px[i] - W / 2, sim.pz[i] + 0.5, sim.py[i] - H / 2);
    k++;
  }
  for (; k < markers.length; k++) markers[k].visible = false;
}

// ---------- camera (orbit around a point on the tray) ----------
const view = { x: 0, z: 0, yaw: 0, pitch: 0.30, d: 1000, fit: 1000, fitAll: 2000 };
const PITCH_MIN = 0.0, PITCH_MAX = 1.15;
let viewShift = 0;
function applyView() {
  view.d = Math.max(view.fit * 0.18, Math.min(view.fitAll, view.d));
  view.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, view.pitch));
  view.x = Math.max(-W / 2, Math.min(W / 2, view.x)); view.z = Math.max(-H / 2, Math.min(H / 2, view.z));
  const sp = Math.sin(view.pitch), cp = Math.cos(view.pitch);
  camera.position.set(view.x + view.d * sp * Math.sin(view.yaw), view.d * cp, view.z + view.d * sp * Math.cos(view.yaw));
  // keep "up" on screen pointing away from the viewer even when looking straight down
  camera.up.set(-Math.sin(view.yaw), 0, -Math.cos(view.yaw)).multiplyScalar(cp).add(new THREE.Vector3(0, sp, 0)).normalize();
  camera.lookAt(view.x, 0, view.z);
  camera.updateMatrixWorld();
}
function resetView() {
  Object.assign(view, { x: 0, z: 0, yaw: 0, pitch: 0.30, d: view.fit });
  applyView();
}
function resize() {
  const r = cvs.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  const tb = document.querySelector('.topbar').getBoundingClientRect();
  const top = Math.max(40, tb.bottom - r.top), bottom = 20, usable = (r.height - top - bottom) / r.height;
  const tf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const needV = (FH / 2 + 24) / (tf * usable), needH = (FW / 2 + 18) / (tf * camera.aspect);
  const fit = Math.max(needV, needH) * 1.04 + 40;
  view.fitAll = Math.max((H / 2 + 30) / (tf * usable), (W / 2 + 30) / (tf * camera.aspect)) * 1.05 + 40;
  const first = view.fit === 1000 && view.d === 1000;
  view.d *= fit / view.fit; view.fit = fit;
  if (first) view.d = fit;
  // shift the picture so the tray sits between the HUD and the buttons
  viewShift = (top - bottom) / 2;
  camera.setViewOffset(r.width, r.height, 0, viewShift, r.width, r.height);
  camera.updateProjectionMatrix();
  applyView();
}
window.addEventListener('resize', resize);

// ---------- input ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), proj = new THREE.Vector3();
function setNdcXY(cx, cy) { const r = cvs.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); return r; }
function setNdc(e) { return setNdcXY(e.clientX, e.clientY); }
function floorAt(cx, cy, height = 0) {
  setNdcXY(cx, cy); ray.setFromCamera(ndc, camera); plane.constant = -height;
  return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
}
function onPlane(e, height) {
  const h = floorAt(e.clientX, e.clientY, height); if (!h) return null;
  return [Math.max(R, Math.min(W - R, h.x + W / 2)), Math.max(R, Math.min(H - R, h.z + H / 2))];
}
function pickAt(e) {
  const r = setNdc(e);
  const sx = e.clientX - r.left, sy = e.clientY - r.top, lim = 28;
  let best = -1, bs = 1e9;
  for (let i = 0; i < sim.N; i++) {
    proj.set(sim.px[i] - W / 2, sim.pz[i], sim.py[i] - H / 2).project(camera);
    const x = (proj.x + 1) / 2 * r.width, y = (1 - proj.y) / 2 * r.height;
    const d = Math.hypot(x - sx, y - sy);
    if (d > lim) continue;
    const score = d - sim.pz[i] * 0.6; // prefer the link on top
    if (score < bs) { bs = score; best = i; }
  }
  return best;
}

// camera gestures: fingers that land on empty velvet move the view, fingers on a chain grab it
const camPts = new Map(); // pointerId -> { x, y, mode }
let gest = null;
function camList() { return [...camPts.values()]; }
function beginGesture() {
  const l = camList();
  if (l.length >= 2) {
    const [a, b] = l;
    gest = { two: true, dist: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  } else if (l.length === 1) {
    const a = l[0];
    gest = { two: false, mode: a.mode, x: a.x, y: a.y, anchor: floorAt(a.x, a.y) };
  } else gest = null;
}
function zoomAround(cx, cy, factor) {
  const before = floorAt(cx, cy);
  view.d /= factor; applyView();
  const after = floorAt(cx, cy);
  if (before && after) { view.x += before.x - after.x; view.z += before.z - after.z; applyView(); }
}
function moveGesture() {
  const l = camList(); if (!gest) return;
  if (gest.two && l.length >= 2) {
    const [a, b] = l;
    const dist = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const pivot = floorAt(gest.mx, gest.my); // everything turns and zooms around the spot between the fingers
    // pinch: zoom
    if (gest.dist > 10 && dist > 10) view.d /= dist / gest.dist;
    // twist: turn the tray
    let da = ang - gest.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
    view.yaw += da;
    // both fingers sliding up/down together: tilt, like Google Maps
    view.pitch -= (my - gest.my) * 0.006;
    applyView();
    const now = floorAt(gest.mx, gest.my);
    if (pivot && now) { view.x += pivot.x - now.x; view.z += pivot.z - now.z; applyView(); }
    Object.assign(gest, { dist, ang, mx, my });
  } else if (!gest.two && l.length === 1) {
    const a = l[0];
    if (gest.mode === 'orbit') {
      view.yaw -= (a.x - gest.x) * 0.008; view.pitch -= (a.y - gest.y) * 0.006; applyView();
    } else if (gest.anchor) {
      // pan: keep the velvet under the finger
      const now = floorAt(a.x, a.y);
      if (now) { view.x += gest.anchor.x - now.x; view.z += gest.anchor.z - now.z; applyView(); }
    }
    gest.x = a.x; gest.y = a.y;
  }
}

cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('pointerdown', e => {
  unlockAudio();
  if (state === 'menu' || pointers.size + camPts.size >= 3) return;
  const isMouse = e.pointerType === 'mouse';
  const i = state === 'play' ? pickAt(e) : -1;
  // a touch on empty space, or a middle-button drag, moves the camera
  if (i < 0 || (isMouse && e.button === 1)) {
    if (pointers.size > 0) return; // holding a chain: ignore stray touches
    const mode = isMouse && (e.button === 2 || e.button === 1 || e.shiftKey) ? 'orbit' : 'pan';
    camPts.set(e.pointerId, { x: e.clientX, y: e.clientY, mode });
    try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
    beginGesture(); e.preventDefault(); return;
  }
  if (camPts.size > 0) return; // mid camera gesture
  const hold = isMouse && e.button === 2;
  const g = sim.setGrab(i, sim.px[i], sim.py[i], hold ? R : undefined);
  pointers.set(e.pointerId, { g, hold });
  pickSound(i, true); hapticTap();
  try { cvs.setPointerCapture(e.pointerId); } catch (err) {}
  if (!started) { started = true; t0 = performance.now(); }
  unlockAudio();
  e.preventDefault();
});
cvs.addEventListener('pointermove', e => {
  const c = camPts.get(e.pointerId);
  if (c) { c.x = e.clientX; c.y = e.clientY; moveGesture(); return; }
  const p = pointers.get(e.pointerId); if (!p) return;
  p.cx = e.clientX; p.cy = e.clientY;
  const q = onPlane(e, p.g.tz); if (!q) return;
  p.g.tx = q[0]; p.g.ty = q[1];
});
function endPointer(e) {
  if (camPts.delete(e.pointerId)) { beginGesture(); return; }
  const p = pointers.get(e.pointerId); if (!p) return; pointers.delete(e.pointerId); if (sim) sim.release(p.g);
  pickSound(p.g.i, false);
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('wheel', e => {
  e.preventDefault();
  zoomAround(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

// ---------- game flow ----------
function makeSim(L) {
  const spec = { chains: L.chains.map(([kind, links]) => ({ kind, links })) };
  return new Sim(W, H, spec, 1, L._pos || (L._pos = decode(L.pos)));
}
function buildLevels() {
  const box = $('levels'); box.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const b = bestOf(i);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'lv';
    el.innerHTML = `<span class="no">${i + 1}</span><span><div class="nm">${L.name}</div><div class="ds">${L.desc}</div></span><span class="bt ${b ? 'done' : ''}">${b ? '最速 ' + fmt(b) : '未クリア'}</span>`;
    el.onclick = () => start(i);
    box.appendChild(el);
  });
}
function start(i) {
  level = i; sim = makeSim(LEVELS[i]); buildChains(); pointers.clear(); camPts.clear(); gest = null; resetView();
  state = 'play'; frame = 0; started = false; elapsed = 0;
  $('lvlName').innerHTML = `${LEVELS[i].name}<small>LEVEL ${i + 1}</small>`;
  $('menu').hidden = true; $('win').hidden = true; $('time').textContent = '0:00.0';
  crossings = sim.crossings(); $('cross').textContent = crossings;
  showToast('結び目は、引くほど締まります', 2600);
}
let toastTimer;
function showToast(t, ms = 2200) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.style.opacity = 0, ms); }

let acc = 0, last = performance.now();
function tick(now) {
  acc += Math.min(50, now - last); last = now;
  // never run more than one physics step per displayed frame: slow devices get slow motion, not a stutter spiral
  if (acc >= 1000 / 60) { acc = Math.min(acc - 1000 / 60, 1000 / 60); update(); }
  if (sim) {
    for (const p of pointers.values()) if (p.cx !== undefined) { const q = onPlane({ clientX: p.cx, clientY: p.cy }, p.g.tz); if (q) { p.g.tx = q[0]; p.g.ty = q[1]; } }
    syncChains(); syncMarkers();
  }
  const dtE = Math.min(0.05, (now - (tick.lastE || now)) / 1000); tick.lastE = now;
  for (let k = effects.length - 1; k >= 0; k--) if (!effects[k].update(dtE)) { effects[k].cleanup(); effects.splice(k, 1); }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
function update() {
  if (!sim || state === 'menu') return;
  frame++; sim.step(); chainSounds();
  if (state !== 'play') return;
  if (started) { elapsed = performance.now() - t0; $('time').textContent = fmt(elapsed); }
  if (frame % 6 === 0) {
    crossings = sim.crossings(); $('cross').textContent = crossings;
    $('crossBox').classList.toggle('zero', crossings === 0);
    if (started) checkFree();
  }
}
// a necklace with no crossings at all (with itself or others), not held, for a moment: it's free
function checkFree() {
  const held = new Set(); for (const p of pointers.values()) held.add(sim.chainOf(p.g.i));
  let seg = 0, left = 0;
  sim.chains.forEach((c, ci) => {
    const n = c.n - 1;
    if (!c.removed) {
      let crossed = false;
      for (let k = seg; k < seg + n; k++) if (sim.crossFlag[k]) { crossed = true; break; }
      c.freeFrames = (!crossed && !held.has(c)) ? (c.freeFrames || 0) + 6 : 0;
      if (c.freeFrames >= 36) {
        vanish(ci);
        const remain = sim.chains.filter(q => !q.removed).length;
        if (remain > 0) showToast(`ほどけた！　あと ${remain} 本`, 1800);
      } else left++;
    }
    seg += n;
  });
  if (left === 0 && state === 'play') { state = 'clearing'; showToast('ぜんぶ、ほどけた', 1600); setTimeout(win, 1500); }
}
function win() {
  state = 'over';
  const prev = bestOf(level), isBest = !prev || elapsed < prev;
  if (isBest) store('hodoke3-best-' + level, String(Math.round(elapsed)));
  $('winRes').innerHTML = `<b>${fmt(elapsed)}</b>${isBest ? '　自己ベスト' : '　最速 ' + fmt(prev)}<br>${LEVELS[level].name}をほどきました。`;
  $('nextBtn').hidden = level >= LEVELS.length - 1;
  $('win').hidden = false;
}
function openMenu() {
  for (const p of pointers.values()) sim && sim.release(p.g);
  pointers.clear(); buildLevels(); $('menu').hidden = false; $('win').hidden = true;
  if (state !== 'over') state = 'menu';
}
$('menuBtn').onclick = openMenu; $('winMenu').onclick = openMenu;
$('retryBtn').onclick = () => start(level);
$('viewBtn').onclick = () => resetView();
$('soundBtn').onclick = () => { unlockAudio(); setMuted(!muted); };
setMuted(muted);
$('nextBtn').onclick = () => start(Math.min(LEVELS.length - 1, level + 1));

// leaving the app (home button, call...) pauses the clock and the sound
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = performance.now();
    for (const p of pointers.values()) sim && sim.release(p.g); pointers.clear(); camPts.clear(); gest = null;
    try { audio && audio.suspend(); } catch (e) {}
  } else {
    if (hiddenAt && started) t0 += performance.now() - hiddenAt;
    hiddenAt = 0; last = performance.now(); acc = 0;
    try { audio && !muted && audio.resume(); } catch (e) {}
  }
});
// status bar: light text over the dark velvet, drawn over the page
try { const sb = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar; if (sb) { sb.setStyle({ style: 'DARK' }); sb.setOverlaysWebView({ overlay: true }); } } catch (e) {}

// ---------- banner ad (app only) ----------
// IDs below are Google's public TEST units. Replace with your own from AdMob before release
// (and set testing to false). See README "広告".
const ADS = {
  testing: true,
  android: 'ca-app-pub-3940256099942544/9214589741',
  ios: 'ca-app-pub-3940256099942544/2435281174',
};
function setAdSpace(h) {
  // reserve the banner's height plus a gap, so no button or chain sits right next to the ad
  document.documentElement.style.setProperty('--ad-h', h > 0 ? `calc(${Math.ceil(h)}px + 24px + env(safe-area-inset-bottom, 0px))` : '0px');
  requestAnimationFrame(resize);
}
async function startAds() {
  const cap = window.Capacitor, AdMob = cap && cap.Plugins && cap.Plugins.AdMob;
  if (!AdMob || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  const platform = cap.getPlatform();
  setAdSpace(56); // typical adaptive banner height; corrected once the ad reports its size
  try {
    // privacy first: consent form where the law needs one (EU etc.), then Apple's tracking prompt
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable && info.status === 'REQUIRED') await AdMob.showConsentForm();
    if (platform === 'ios') {
      const t = await AdMob.trackingAuthorizationStatus();
      if (t.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }
    await AdMob.initialize({ initializeForTesting: ADS.testing });
    AdMob.addListener('bannerAdSizeChanged', s => setAdSpace(s && s.height ? s.height : 0));
    await AdMob.showBanner({ adId: ADS[platform], adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: ADS.testing });
  } catch (e) {
    console.warn('ads unavailable', e);
    setAdSpace(0);
  }
}

buildLevels(); resize();
setTimeout(startAds, 400);
sim = makeSim(LEVELS[Math.min(3, LEVELS.length - 1)]); buildChains();
requestAnimationFrame(tick);
