// ===== Necklace physics core (Verlet + PBD, 3D capsules, top-down) =====
const R = 4;          // chain radius (world px)
const D = 8;          // link length
// chains that are built differently: thick Cuban-style gold uses fat, long links
const CHAIN_SIZE = { kihei: { r: 6.5, d: 12 } };
function sizeOf(kind) { return CHAIN_SIZE[kind] || { r: R, d: D }; }
const SUB = 8;        // substeps per frame
const DT = 1 / 60 / SUB;
let GRAV_ACC = 300;  // low gravity: piles stay put instead of creeping
const VMAX = 1.8;     // max move per substep (anti-tunnelling)
const GRAB_STEP = 1.1;
let SLIP = 0.06;   // link stretch at which a finger starts to slip
const SLEEP = 40;
const NEAR_HELD = 25;   // links either side of a finger that follow it without easing
const WAKE_EASE = 4;   // frames a woken link takes to get going
const WAKE_SPEED = 60;  // px/s it may move during that time   // substeps of stillness before a link stops being simulated
const GRAB_W = 0.06;  // grabbed point is heavy, but the chain can still hold it back
const LIFT = 30;
const LIFT_TIME = 0.3; // seconds to lift a grabbed link
const MU = 3.0;      // chain-on-chain friction
const FRIC_MAX = 0.35; // px a single contact may drag per substep: more than this and links can be pushed through each other
let MU_TRAY = 3.0;   // chain-on-velvet friction
let GROUND_KEEP = 0.85; // velocity kept per substep when lying on the tray

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

class Sim {
  constructor(W, H, spec, seed, preset) {
    this.W = W; this.H = H;
    const rnd = mulberry32(seed);
    this.rnd = rnd;
    const total = spec.chains.reduce((s, c) => s + c.links + 1, 0);
    this.N = total;
    this.px = new Float64Array(total); this.py = new Float64Array(total); this.pz = new Float64Array(total);
    this.ox = new Float64Array(total); this.oy = new Float64Array(total); this.oz = new Float64Array(total);
    this.w = new Float64Array(total).fill(1);
    this.chains = [];
    const sa = [], sb = [], sc = [], sk = [];
    let base = 0;
    const cx = W / 2, cy = H / 2;
    const Rxy = 14 + Math.sqrt(total) * 1.5;
    const Zmax = R + 30 + total * 0.35;
    this.pocket = { cx, cy, r: Rxy, z: Zmax };
    const placed = [];
    for (let ci = 0; ci < spec.chains.length; ci++) {
      const c = spec.chains[ci];
      const n = c.links + 1;
      const { r: cr, d: cd } = sizeOf(c.kind);
      let x = cx + (rnd() - 0.5) * Rxy, y = cy + (rnd() - 0.5) * Rxy, z = R + rnd() * (Zmax - R);
      let dx = rnd() - 0.5, dy = rnd() - 0.5, dz = rnd() - 0.5;
      for (let k = 0; k < n; k++) {
        if (k > 0 && !preset) {
          let best = null, bestD = -1;
          for (let tr = 0; tr < 48; tr++) {
            let ex = dx + (rnd() - 0.5) * 1.3, ey = dy + (rnd() - 0.5) * 1.3, ez = dz + (rnd() - 0.5) * 1.3;
            const ddx = cx - x, ddy = cy - y, ddz = (R + Zmax) / 2 - z;
            const rr = Math.hypot(ddx, ddy);
            if (rr > Rxy * 0.7) { ex += ddx / rr * 0.9; ey += ddy / rr * 0.9; }
            if (z > Zmax - 10 || z < R + 6) ez += ddz * 0.04;
            const l = Math.hypot(ex, ey, ez) || 1;
            ex /= l; ey /= l; ez /= l;
            const qx = x + ex * cd, qy = y + ey * cd, qz = Math.max(cr, Math.min(Zmax, z + ez * cd));
            let mn = 1e9;
            for (let j = 0; j < placed.length; j++) {
              const p = placed[j];
              if (p.c === ci && p.k >= k - 2) continue;
              const d2 = (p.x - qx) ** 2 + (p.y - qy) ** 2 + (p.z - qz) ** 2;
              if (d2 < mn) mn = d2;
            }
            mn = Math.sqrt(mn);
            if (mn > bestD) { bestD = mn; best = [qx, qy, qz, ex, ey, ez]; }
            if (mn >= 2.4 * cr) break;
          }
          [x, y, z, dx, dy, dz] = best;
        }
        const i = base + k;
        if (preset) { x = preset[i * 3]; y = preset[i * 3 + 1]; z = preset[i * 3 + 2]; }
        this.px[i] = this.ox[i] = x; this.py[i] = this.oy[i] = y; this.pz[i] = this.oz[i] = z;
        if (!preset) placed.push({ x, y, z, c: ci, k });
        if (k < n - 1) { sa.push(i); sb.push(i + 1); sc.push(ci); sk.push(k); }
      }
      this.chains.push({ start: base, n, kind: c.kind, r: cr, d: cd });
      base += n;
    }
    this.sa = Int32Array.from(sa); this.sb = Int32Array.from(sb);
    this.sc = Int32Array.from(sc); this.sk = Int32Array.from(sk);
    this.S = sa.length;
    this.rad = new Float64Array(total); this.len = new Float64Array(this.S); this.srad = new Float64Array(this.S);
    for (const ch of this.chains) for (let i = ch.start; i < ch.start + ch.n; i++) this.rad[i] = ch.r;
    for (let q = 0; q < this.S; q++) { const ch = this.chains[sc[q]]; this.len[q] = ch.d; this.srad[q] = ch.r; }
    this.broken = new Uint8Array(this.S);
    this.stretch = new Float32Array(this.S);
    // spatial grid
    // grid cells must cover the largest contact reach (two half-links plus both radii)
    const maxR = Math.max(...this.chains.map(ch => ch.r)), maxD = Math.max(...this.chains.map(ch => ch.d));
    this.C = Math.max(16, Math.ceil(16 * (maxD + 2 * maxR + 0.5) / (D + 2 * R + 0.5)));
    this.gw = Math.ceil(W / this.C) + 1; this.gh = Math.ceil(H / this.C) + 1;
    this.head = new Int32Array(this.gw * this.gh);
    this.next = new Int32Array(this.S);
    this.grabs = [];
    this.held = new Uint8Array(total);
    this.gone = new Uint8Array(total); // belongs to a necklace already taken away
    this.touch = new Uint8Array(total); // resting on another link this substep
    this.rest = new Uint16Array(total);
    this.waking = new Uint16Array(total); // substeps of gentle start left after waking up
    this.nearHeld = new Uint8Array(total); // on a held chain close to the finger: never eased   // substeps spent (almost) still
    this.awake = new Uint8Array(sa.length);
    this.twoPass = sa.length < 300;
    // big tangles use fewer, larger substeps to stay at 60fps
    this.sub = sa.length < 300 ? SUB : 6;
    const dt = 1 / 60 / this.sub;
    this.grav = GRAV_ACC * dt * dt;
    this.vmax = VMAX * SUB / this.sub;
    this.gstep = GRAB_STEP * SUB / this.sub;
    this.box = null; // confinement used while generating a tangle
    this.maxStretch = 0;
  }

  setGrab(i, x, y, z) {
    const g = { i, tx: x, ty: y, tz: z === undefined ? LIFT : z };
    this.held[i]++; this.w[i] = GRAB_W; this.rest[i] = 0; this.grabs.push(g); return g;
  }
  release(g) {
    const k = this.grabs.indexOf(g); if (k < 0) return;
    this.grabs.splice(k, 1);
    if (--this.held[g.i] <= 0) { this.held[g.i] = 0; this.w[g.i] = 1; this.ox[g.i] = this.px[g.i]; this.oy[g.i] = this.py[g.i]; this.oz[g.i] = this.pz[g.i]; }
  }
  releaseAll() { for (const g of this.grabs.slice()) this.release(g); }

  pick(x, y, radius) {
    let best = -1, bz = -1e9;
    const r2 = radius * radius;
    for (let i = 0; i < this.N; i++) {
      const d2 = (this.px[i] - x) ** 2 + (this.py[i] - y) ** 2;
      if (d2 < r2 && !this.gone[i]) {
        const score = this.pz[i] * 2 - Math.sqrt(d2);
        if (score > bz) { bz = score; best = i; }
      }
    }
    return best;
  }

  buildGrid() {
    const { C, gw, head, next, px, py, sa, sb } = this;
    head.fill(-1);
    for (let s = 0; s < this.S; s++) {
      if (this.broken[s]) continue;
      const mx = (px[sa[s]] + px[sb[s]]) * 0.5, my = (py[sa[s]] + py[sb[s]]) * 0.5;
      const gx = Math.max(0, Math.min(gw - 1, (mx / C) | 0));
      const gy = Math.max(0, Math.min(this.gh - 1, (my / C) | 0));
      const h = gy * gw + gx;
      next[s] = head[h]; head[h] = s;
    }
  }

  solveConstraints(rev) {
    const { px, py, pz, w, sa, sb, S } = this;
    for (let q = 0; q < S; q++) {
      const s = rev ? S - 1 - q : q;
      if (this.broken[s]) continue;
      if (!this.awake[s]) continue;
      const a = sa[s], b = sb[s];
      const wa = w[a], wb = w[b];
      const ws = wa + wb; if (ws === 0) continue;
      const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
      const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const k = (l - this.len[s]) / l / ws;
      px[a] += dx * k * wa; py[a] += dy * k * wa; pz[a] += dz * k * wa;
      px[b] -= dx * k * wb; py[b] -= dy * k * wb; pz[b] -= dz * k * wb;
    }
  }

  // metal doesn't stretch: hard limit, the grabbed point gets dragged back too
  strainLimit(rev) {
    const { px, py, pz, sa, sb, S, held } = this;
    for (let q = 0; q < S; q++) {
      const s = rev ? S - 1 - q : q;
      if (this.broken[s]) continue;
      const LIM = this.len[s] * 1.04;
      const a = sa[s], b = sb[s];
      const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
      const l = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (l <= LIM) continue;
      const wa = held[a] ? 0.5 : 1, wb = held[b] ? 0.5 : 1;
      const k = (l - LIM) / l / (wa + wb);
      px[a] += dx * k * wa; py[a] += dy * k * wa; pz[a] += dz * k * wa;
      px[b] -= dx * k * wb; py[b] -= dy * k * wb; pz[b] -= dz * k * wb;
    }
  }

  solveCollisions() {
    this.buildGrid();
    const { px, py, pz, ox, oy, oz, w, sa, sb, sc, sk, C, gw, gh, head, next, awake } = this;
    const { len, srad } = this;
    for (let s = 0; s < this.S; s++) {
      if (this.broken[s]) continue;
      const awS = awake[s];
      const a0 = sa[s], a1 = sb[s];
      const mx = (px[a0] + px[a1]) * 0.5, my = (py[a0] + py[a1]) * 0.5;
      const gx = (mx / C) | 0, gy = (my / C) | 0;
      for (let yy = Math.max(0, gy - 1); yy <= Math.min(gh - 1, gy + 1); yy++)
        for (let xx = Math.max(0, gx - 1); xx <= Math.min(gw - 1, gx + 1); xx++) {
          for (let t = head[yy * gw + xx]; t !== -1; t = next[t]) {
            if (t <= s) continue;
            if (!awS && !awake[t]) continue;
            if (sc[t] === sc[s] && Math.abs(sk[t] - sk[s]) <= 2) continue;
            const b0 = sa[t], b1 = sb[t];
            const qx = mx - (px[b0] + px[b1]) * 0.5, qy = my - (py[b0] + py[b1]) * 0.5;
            const minD = srad[s] + srad[t], minD2 = minD * minD;
            const reach = (len[s] + len[t]) * 0.5 * 1.05 + minD + 0.5;
            if (qx * qx + qy * qy > reach * reach) continue;
            const qz = (pz[a0] + pz[a1] - pz[b0] - pz[b1]) * 0.5;
            if (qz > reach || qz < -reach) continue;
            // closest points between segments
            const d1x = px[a1] - px[a0], d1y = py[a1] - py[a0], d1z = pz[a1] - pz[a0];
            const d2x = px[b1] - px[b0], d2y = py[b1] - py[b0], d2z = pz[b1] - pz[b0];
            const rx = px[a0] - px[b0], ry = py[a0] - py[b0], rz = pz[a0] - pz[b0];
            const A = d1x * d1x + d1y * d1y + d1z * d1z, E = d2x * d2x + d2y * d2y + d2z * d2z;
            const F = d2x * rx + d2y * ry + d2z * rz, Cc = d1x * rx + d1y * ry + d1z * rz;
            const B = d1x * d2x + d1y * d2y + d1z * d2z;
            const den = A * E - B * B;
            let u = den > 1e-8 ? Math.min(1, Math.max(0, (B * F - Cc * E) / den)) : 0.5;
            let v = (B * u + F) / E;
            if (v < 0) { v = 0; u = Math.min(1, Math.max(0, -Cc / A)); }
            else if (v > 1) { v = 1; u = Math.min(1, Math.max(0, (B - Cc) / A)); }
            const cax = px[a0] + d1x * u, cay = py[a0] + d1y * u, caz = pz[a0] + d1z * u;
            const cbx = px[b0] + d2x * v, cby = py[b0] + d2y * v, cbz = pz[b0] + d2z * v;
            let nx = cax - cbx, ny = cay - cby, nz = caz - cbz;
            const d2 = nx * nx + ny * ny + nz * nz;
            if (d2 >= minD2) continue;
            // sticky normal: which side were they on at the start of this substep?
            let pxn = (ox[a0] + (ox[a1] - ox[a0]) * u) - (ox[b0] + (ox[b1] - ox[b0]) * v);
            let pyn = (oy[a0] + (oy[a1] - oy[a0]) * u) - (oy[b0] + (oy[b1] - oy[b0]) * v);
            let pzn = (oz[a0] + (oz[a1] - oz[a0]) * u) - (oz[b0] + (oz[b1] - oz[b0]) * v);
            const pl = Math.sqrt(pxn * pxn + pyn * pyn + pzn * pzn);
            let d;
            if (pl > 1e-3) {
              nx = pxn / pl; ny = pyn / pl; nz = pzn / pl;
              d = (cax - cbx) * nx + (cay - cby) * ny + (caz - cbz) * nz; // signed separation along old normal
              if (d >= minD) continue;
            } else {
              d = Math.sqrt(d2);
              if (d < 1e-5) { nx = 0; ny = 0; nz = 1; d = 0; } else { nx /= d; ny /= d; nz /= d; }
            }
            const pen = minD - d;
            this.touch[a0] = this.touch[a1] = this.touch[b0] = this.touch[b1] = 1;
            const wa0 = w[a0], wa1 = w[a1], wb0 = w[b0], wb1 = w[b1];
            const ca0 = (1 - u) * wa0, ca1 = u * wa1, cb0 = (1 - v) * wb0, cb1 = v * wb1;
            const sw = (1 - u) * ca0 + u * ca1 + (1 - v) * cb0 + v * cb1;
            if (sw < 1e-8) continue;
            const lam = pen / sw;
            px[a0] += nx * lam * ca0; py[a0] += ny * lam * ca0; pz[a0] += nz * lam * ca0;
            px[a1] += nx * lam * ca1; py[a1] += ny * lam * ca1; pz[a1] += nz * lam * ca1;
            px[b0] -= nx * lam * cb0; py[b0] -= ny * lam * cb0; pz[b0] -= nz * lam * cb0;
            px[b1] -= nx * lam * cb1; py[b1] -= ny * lam * cb1; pz[b1] -= nz * lam * cb1;
            // friction: damp tangential relative motion at the contact
            const vax = (px[a0] - ox[a0]) * (1 - u) + (px[a1] - ox[a1]) * u;
            const vay = (py[a0] - oy[a0]) * (1 - u) + (py[a1] - oy[a1]) * u;
            const vaz = (pz[a0] - oz[a0]) * (1 - u) + (pz[a1] - oz[a1]) * u;
            const vbx = (px[b0] - ox[b0]) * (1 - v) + (px[b1] - ox[b1]) * v;
            const vby = (py[b0] - oy[b0]) * (1 - v) + (py[b1] - oy[b1]) * v;
            const vbz = (pz[b0] - oz[b0]) * (1 - v) + (pz[b1] - oz[b1]) * v;
            let tx = vax - vbx, ty = vay - vby, tz = vaz - vbz;
            const vn = tx * nx + ty * ny + tz * nz;
            tx -= vn * nx; ty -= vn * ny; tz -= vn * nz;
            const fl = Math.min(MU * pen, Math.hypot(tx, ty, tz), FRIC_MAX);
            const tl = Math.hypot(tx, ty, tz);
            if (tl > 1e-6) {
              const k = fl / tl / sw;
              tx *= k; ty *= k; tz *= k;
              px[a0] -= tx * ca0; py[a0] -= ty * ca0; pz[a0] -= tz * ca0;
              px[a1] -= tx * ca1; py[a1] -= ty * ca1; pz[a1] -= tz * ca1;
              px[b0] += tx * cb0; py[b0] += ty * cb0; pz[b0] += tz * cb0;
              px[b1] += tx * cb1; py[b1] += ty * cb1; pz[b1] += tz * cb1;
            }
          }
        }
    }
  }

  bounds() {
    const { px, py, pz, W, H, box } = this;
    const { ox, oy, held } = this;
    for (let i = 0; i < this.N; i++) {
      const ri = this.rad[i];
      if (pz[i] < ri) {
        // Coulomb friction with the velvet: the harder it is pressed down, the less it slides
        const press = ri - pz[i];
        pz[i] = ri;
        if (!held[i] && this.w[i] > 0) {
          const dx = px[i] - ox[i], dy = py[i] - oy[i], d = Math.hypot(dx, dy);
          const hold = MU_TRAY * press;
          if (d <= hold) { px[i] = ox[i]; py[i] = oy[i]; }
          else { const k = hold / d; px[i] -= dx * k; py[i] -= dy * k; }
        }
      }
      if (px[i] < ri) px[i] = ri; else if (px[i] > W - ri) px[i] = W - ri;
      if (py[i] < ri) py[i] = ri; else if (py[i] > H - ri) py[i] = H - ri;
      if (box) {
        const dx = px[i] - box.cx, dy = py[i] - box.cy, d = Math.hypot(dx, dy);
        if (d > box.r) { px[i] = box.cx + dx / d * box.r; py[i] = box.cy + dy / d * box.r; }
        if (pz[i] > box.z) pz[i] = box.z;
      }
    }
  }

  substep() {
    const { px, py, pz, ox, oy, oz } = this;
    for (let i = 0; i < this.N; i++) {
      if (this.held[i]) continue;
      if (this.rest[i] >= SLEEP) { ox[i] = px[i]; oy[i] = py[i]; oz[i] = pz[i]; continue; }
      let vx = px[i] - ox[i], vy = py[i] - oy[i], vz = pz[i] - oz[i];
      if (this.waking[i] && this.nearHeld[i]) this.waking[i] = 0;
      if (this.waking[i]) {
        // just woke up: bleed off the stored push instead of springing
        this.waking[i]--;
        const cap = WAKE_SPEED / 60 / this.sub;
        vx *= 0.6; vy *= 0.6; vz *= 0.6;
        const v = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (v > cap) { const k = cap / v; vx *= k; vy *= k; vz *= k; }
      }
      if (pz[i] <= this.rad[i] + 0.6) { vx *= this.gk || (this.gk = Math.pow(GROUND_KEEP, SUB / this.sub)); vy *= this.gk; } else { vx *= 0.995; vy *= 0.995; vz *= 0.995; }
      const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (sp > this.vmax) { const k = this.vmax / sp; vx *= k; vy *= k; vz *= k; }
      ox[i] = px[i]; oy[i] = py[i]; oz[i] = pz[i];
      px[i] += vx; py[i] += vy; pz[i] += vz - this.grav;
    }
    this.touch.fill(0);
    const rest = this.rest, sa = this.sa, sb = this.sb, aw = this.awake;
    for (let q = 0; q < this.S; q++) aw[q] = (rest[sa[q]] < SLEEP || rest[sb[q]] < SLEEP) ? 1 : 0;
    for (const gr of this.grabs) {
      const g = gr.i;
      ox[g] = px[g]; oy[g] = py[g]; oz[g] = pz[g];
      let dx = gr.tx - px[g], dy = gr.ty - py[g], dz = gr.tz - pz[g];
      const l = Math.hypot(dx, dy);
      const st = (gr.step || GRAB_STEP) * SUB / this.sub;
      if (l > st) { dx *= st / l; dy *= st / l; }
      if (gr.step) { if (dz > st) dz = st; else if (dz < -st) dz = -st; }
      else {
        // lift over LIFT_TIME with an ease-in-out curve so the chain is raised, not flicked
        if (gr.lt === undefined) { gr.lt = 0; gr.z0 = pz[g]; }
        gr.lt = Math.min(1, gr.lt + 1 / (60 * this.sub * LIFT_TIME));
        const e = gr.lt * gr.lt * (3 - 2 * gr.lt);
        dz = gr.z0 + (gr.tz - gr.z0) * e - pz[g];
      }
      gr.bx = px[g]; gr.by = py[g]; gr.bz = pz[g];
      px[g] += dx; py[g] += dy; pz[g] += dz;
    }
    this.solveConstraints(false);
    this.solveConstraints(true);
    this.solveCollisions();
    this.solveConstraints(false);
    this.solveConstraints(true);
    if (this.twoPass) this.solveCollisions();
    this.strainLimit(false);
    this.strainLimit(true);
    this.strainLimit(false);
    this.strainLimit(true);
    this.solveCollisions();
    this.bounds();
    // taut chain: the finger slips instead of stretching the metal
    for (const gr of this.grabs) {
      const g = gr.i;
      const ch = this.chainOf(g);
      let mx = 0;
      for (let k = Math.max(ch.start, g - 4); k < Math.min(ch.start + ch.n - 1, g + 4); k++) {
        const l = Math.hypot(px[k + 1] - px[k], py[k + 1] - py[k], pz[k + 1] - pz[k]) / ch.d - 1;
        if (l > mx) mx = l;
      }
      gr.taut = mx;
      this.w[g] = mx > SLIP ? 1 : GRAB_W; // slipping finger gives way to the chain
      if (mx > SLIP * 1.6) {
        const back = Math.min(1, (mx - SLIP * 1.6) / 0.05);
        px[g] += (gr.bx - px[g]) * back; py[g] += (gr.by - py[g]) * back; pz[g] += (gr.bz - pz[g]) * back;
      }
    }
    for (let i = 0; i < this.N; i++) {
      const m = Math.abs(px[i] - ox[i]) + Math.abs(py[i] - oy[i]) + Math.abs(pz[i] - oz[i]);
      const supported = pz[i] <= this.rad[i] + 0.6 || this.touch[i];
      if (this.held[i] || m > (supported ? 0.03 : 0.004)) {
        if (rest[i] >= SLEEP) this.waking[i] = WAKE_EASE * this.sub;
        this.rest[i] = 0;
      }
      else if (rest[i] < 60000) rest[i]++;
    }
  }
  wakeAll() { this.rest.fill(0); }
  // take a finished necklace off the tray: it stops colliding and is never picked again
  removeChain(ci) {
    const c = this.chains[ci]; if (c.removed) return;
    c.removed = true;
    for (let k = 0; k < c.n - 1; k++) this.broken[this.chainSeg(ci) + k] = 1;
    for (let i = c.start; i < c.start + c.n; i++) { this.held[i] = 1; this.w[i] = 0; this.gone[i] = 1; }
  }
  chainSeg(ci) { let s = 0; for (let k = 0; k < ci; k++) s += this.chains[k].n - 1; return s; }
  chainOf(i) { for (const c of this.chains) if (i < c.start + c.n) return c; return this.chains[this.chains.length - 1]; }

  markNearHeld() {
    this.nearHeld.fill(0);
    for (const gr of this.grabs) {
      const c = this.chainOf(gr.i);
      const a = Math.max(c.start, gr.i - NEAR_HELD), b = Math.min(c.start + c.n - 1, gr.i + NEAR_HELD);
      for (let j = a; j <= b; j++) this.nearHeld[j] = 1;
    }
  }

  step() {
    this.markNearHeld();
    let mx = 0, ms = -1;
    for (let k = 0; k < this.sub; k++) this.substep();
    const { px, py, pz, sa, sb } = this;
    for (let s = 0; s < this.S; s++) {
      if (this.broken[s]) { this.stretch[s] = 0; continue; }
      const a = sa[s], b = sb[s];
      const l = Math.hypot(px[b] - px[a], py[b] - py[a], pz[b] - pz[a]);
      const st = l / this.len[s] - 1;
      this.stretch[s] = st;
      if (st > mx) { mx = st; ms = s; }
    }
    this.maxStretch = mx; this.maxSeg = ms;
    return mx;
  }


  // number of crossings in the top-down projection
  crossings() {
    this.buildGrid();
    const { px, py, sa, sb, sc, sk, C, gw, gh, head, next } = this;
    let count = 0;
    const flags = this.crossFlag || (this.crossFlag = new Uint8Array(this.S));
    flags.fill(0);
    for (let s = 0; s < this.S; s++) {
      if (this.broken[s]) continue;
      const a0 = sa[s], a1 = sb[s];
      const mx = (px[a0] + px[a1]) * 0.5, my = (py[a0] + py[a1]) * 0.5;
      const gx = (mx / C) | 0, gy = (my / C) | 0;
      for (let yy = Math.max(0, gy - 1); yy <= Math.min(gh - 1, gy + 1); yy++)
        for (let xx = Math.max(0, gx - 1); xx <= Math.min(gw - 1, gx + 1); xx++)
          for (let t = head[yy * gw + xx]; t !== -1; t = next[t]) {
            if (t <= s) continue;
            if (sc[t] === sc[s] && Math.abs(sk[t] - sk[s]) <= 1) continue;
            const b0 = sa[t], b1 = sb[t];
            const o1 = orient(px[a0], py[a0], px[a1], py[a1], px[b0], py[b0]);
            const o2 = orient(px[a0], py[a0], px[a1], py[a1], px[b1], py[b1]);
            const o3 = orient(px[b0], py[b0], px[b1], py[b1], px[a0], py[a0]);
            const o4 = orient(px[b0], py[b0], px[b1], py[b1], px[a1], py[a1]);
            if (o1 * o2 < 0 && o3 * o4 < 0) { count++; flags[s] = 1; flags[t] = 1; }
          }
    }
    return count;
  }

  energy() {
    let e = 0;
    for (let i = 0; i < this.N; i++) e += Math.abs(this.px[i] - this.ox[i]) + Math.abs(this.py[i] - this.oy[i]) + Math.abs(this.pz[i] - this.oz[i]);
    return e / this.N;
  }
}
function orient(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }

if (typeof module !== 'undefined') module.exports = { setTune: (a, b, c) => { SLIP = a; GROUND_KEEP = b; if (c !== undefined) GRAV_ACC = c; }, Sim, R, D, LIFT, mulberry32 };
