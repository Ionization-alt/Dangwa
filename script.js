const cv = document.getElementById('scene');
const ctx = cv.getContext('2d');
const typed = document.getElementById('typed');
const hint = document.getElementById('hint');

const CAPTION = 'Flowers For You Erha betch.';
const CW = 8, CH = 13, RAMP = '.:-=+*#%@';
const PAL = {
  red:   ['#3d050c', '#7d0d19', '#b8192a', '#e83a47', '#ff8a93'],
  pink:  ['#6b1f3a', '#b04068', '#e0709a', '#f7a3c2', '#ffd6e5'],
  green: ['#12461f', '#1f7a36', '#35a853', '#66d884', '#a6f0b8'],
};
const PETAL = ['#d6202f', '#ee3d4a', '#f06a8c', '#ff9fbd'];

let W, H, dpr, G;
const m = { x: 0, y: 0, sx: 0, sy: 0, active: false };
const paper = document.createElement('canvas');
const pctx = paper.getContext('2d');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
const rnd = (a, b) => a + Math.random() * (b - a);
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

function geo() {
  const S = Math.min(H * 0.53, W * 0.72);
  return { S, cx: W / 2, cy: H * 0.05 + 0.58 * S };
}

function setFont(c, px, bold) { c.font = `${bold ? 'bold ' : ''}${px}px "Courier New", monospace`; }

/* ---------- static wrapping paper (drawn once per resize) ---------- */
function buildPaper() {
  paper.width = W * dpr; paper.height = H * dpr;
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
  setFont(pctx, CH - 1, false);
  const { S, cx, cy } = G;

  // ruffled paper fan behind the roses
  const fx = cx, fy = cy - 0.04 * S;
  for (let gy = Math.floor((fy - 0.7 * S) / CH); gy < (fy + 0.6 * S) / CH; gy++) {
    for (let gx = Math.floor((fx - 0.75 * S) / CW); gx < (fx + 0.75 * S) / CW; gx++) {
      const px = gx * CW, py = gy * CH, dx = (px - fx) / (0.64 * S), dy = (py - fy) / (0.52 * S);
      const d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const edge = 1 + 0.05 * Math.cos(15 * ang);
      if (d > edge) continue;
      const rim = d > edge - 0.07;
      const h = hash(gx, gy);
      pctx.fillStyle = rim ? '#e6ebf5' : (h > 0.55 ? '#8f9ab0' : '#6a7489');
      pctx.fillText(rim ? 'o' : (h > 0.8 ? ':' : '.'), px, py);
    }
  }

  // cone of paper below
  const y0 = cy + 0.10 * S, y1 = cy + 0.76 * S;
  for (let gy = Math.floor(y0 / CH); gy <= y1 / CH; gy++) {
    const py = gy * CH, u = (py - y0) / (y1 - y0);
    const hw = S * (0.48 * Math.pow(1 - u, 0.9) + 0.03);
    for (let gx = Math.floor((cx - hw) / CW); gx <= (cx + hw) / CW; gx++) {
      const px = gx * CW, dx = px - cx;
      if (Math.abs(dx) > hw) continue;
      const edge = Math.abs(dx) > hw - CW * 1.3;
      const fold = Math.sin(dx / hw * 4.5 + u * 2.5);
      pctx.fillStyle = edge ? '#f2f5fb' : (fold > 0.4 ? '#c9d1e2' : '#8e99b0');
      pctx.fillText(edge ? (dx < 0 ? '/' : '\\') : (fold > 0.4 ? ':' : (fold < -0.5 ? '|' : '.')), px, py);
    }
  }
}

function resize() {
  W = innerWidth; H = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  G = geo();
  m.sx = m.x = W / 2; m.sy = m.y = H / 2;
  buildPaper();
}
addEventListener('resize', resize);
resize();

/* ---------- roses & leaves ---------- */
const ROSES = [
  [-.40, -.10, .17, 'red'], [-.22, -.30, .17, 'red'], [0, -.36, .18, 'pink'], [.23, -.30, .17, 'pink'], [.40, -.10, .17, 'red'],
  [-.20, -.10, .20, 'pink'], [.05, -.14, .21, 'red'], [.28, -.06, .18, 'red'],
  [-.30, .10, .17, 'red'], [-.06, .08, .19, 'red'], [.20, .12, .17, 'pink'], [-.10, .28, .14, 'red'], [.12, .30, .13, 'red'],
].map(([dx, dy, r, pal], i) => ({ dx, dy, r, pal: PAL[pal], t0: 0.3 + i * 0.35, ph: rnd(0, 6.28), t: 0,
  ox: 0, oy: 0, vx: 0, vy: 0, hov: 0, pulse: 0 }));

const LEAVES = [
  [-.52, .08, .24, -0.6, .07], [.54, .06, .24, 0.6, .07], [-.38, .30, .21, -0.95, .06], [.40, .30, .21, 0.95, .06],
  [0, -.48, .20, -1.57, .06], [-.32, -.44, .19, -1.15, .06], [.32, -.44, .19, -1.99, .06],
];

let lastCol = '';
function txt(ch, x, y, col) {
  if (col !== lastCol) { ctx.fillStyle = col; lastCol = col; }
  ctx.fillText(ch, x, y);
}

function drawLeaf(l, t) {
  const { S, cx, cy } = G;
  const b = ease((t - 0.2) / 2);
  if (b <= 0) return;
  const len = l[2] * S * b, wid = l[4] * S * b;
  const ang = l[3] + Math.sin(t * 0.8 + l[0] * 9) * 0.05;
  const x = cx + l[0] * S, y = cy + l[1] * S, ca = Math.cos(ang), sa = Math.sin(ang);
  const R = Math.max(len, wid);
  for (let gy = Math.floor((y - R) / CH); gy <= (y + R) / CH; gy++) {
    for (let gx = Math.floor((x - R) / CW); gx <= (x + R) / CW; gx++) {
      const dx = gx * CW - x, dy = gy * CH - y;
      const u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const e = (u / len) ** 2 + (v / wid) ** 2;
      if (e > 1 || u < 0) continue;
      const mid = Math.abs(v) < wid * 0.14;
      const b2 = mid ? 0.95 : 0.35 + 0.45 * (1 - e) + 0.15 * Math.sin(u * 0.4 + Math.abs(v) * 0.2);
      txt(mid ? '|' : RAMP[Math.floor(clamp(b2, 0, 0.99) * RAMP.length)], gx * CW, gy * CH, PAL.green[Math.floor(clamp(b2, 0, 0.99) * 5)]);
    }
  }
}

function rosePos(f) {
  return { x: G.cx + f.dx * G.S + f.ox, y: G.cy + f.dy * G.S + f.oy + Math.sin(f.t + f.ph) * 2 };
}

function drawRose(f, t) {
  const bl = ease((t - f.t0) / 2);
  if (bl <= 0) return;
  const R = f.r * G.S * bl * (1 + 0.05 * f.hov + 0.18 * f.pulse);
  const { x, y } = rosePos(f);
  const spin = f.ph + t * 0.05 + f.pulse * 1.5;
  for (let gy = Math.floor((y - R) / CH); gy <= (y + R) / CH; gy++) {
    for (let gx = Math.floor((x - R) / CW); gx <= (x + R) / CW; gx++) {
      const dx = gx * CW - x, dy = gy * CH - y;
      const d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      if (d > R * (0.93 + 0.07 * Math.cos(5 * ang + f.ph))) continue;
      const k = d / R;
      let fr = (k * 3.3 + ang / 6.283 + spin) % 1; if (fr < 0) fr += 1;
      let b = 0.50 + 0.22 * (-dx * 0.6 - dy * 0.8) / R + 0.22 * (1 - k) + 0.1 * f.hov;
      if (fr < 0.17) b *= 0.5; else if (fr > 0.84) b += 0.14;
      if (k > 0.9) b *= 0.7;
      b = clamp(b, 0, 0.99);
      txt(RAMP[Math.floor(b * RAMP.length)], gx * CW, gy * CH, f.pal[Math.floor(b * 5)]);
    }
  }
}

/* ---------- ribbon ---------- */
function drawRibbon(t) {
  const { S, cx, cy } = G, y = cy + 0.64 * S, a = ease((t - 3) / 1.5);
  if (a <= 0) return;
  ctx.globalAlpha = a; lastCol = '';
  setFont(ctx, CH + 4, true);
  txt('<(@)>', cx, y, '#f0b429');
  setFont(ctx, CH + 1, true);
  txt('/   \\', cx, y + 15, '#e08a1e'); txt('/     \\', cx, y + 28, '#c9701a');
  txt('||', cx, y + 0.17 * S, PAL.green[2]); txt('||', cx, y + 0.17 * S + 13, PAL.green[1]);
  ctx.globalAlpha = 1;
}

/* ---------- stars, sparkles, petals ---------- */
const stars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), z: rnd(0.2, 1), ph: rnd(0, 6.28) }));
const sparks = Array.from({ length: 14 }, () => ({ x: rnd(0.08, 0.92), y: rnd(0.08, 0.82), s: rnd(8, 18), ph: rnd(0, 6.28) }));
const pops = [];
const petals = [];

function sparkle(x, y, s, a) {
  ctx.globalAlpha = a; ctx.strokeStyle = '#ffe6ef'; ctx.lineWidth = 1; ctx.beginPath();
  const d = s * 0.5;
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
  ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x - d, y + d); ctx.lineTo(x + d, y - d);
  ctx.stroke(); ctx.globalAlpha = 1;
}

function addPetals(x, y, n) {
  for (let i = 0; i < n && petals.length < 70; i++)
    petals.push({ x: x + rnd(-14, 14), y: y + rnd(-8, 8), vy: rnd(22, 55), vx: rnd(-14, 14), rot: rnd(0, 6.28),
      vr: rnd(-2, 2), s: rnd(11, 19), c: PETAL[Math.floor(rnd(0, 4))], ph: rnd(0, 6.28), age: 0 });
}

function drawBackdrop(t) {
  lastCol = ''; setFont(ctx, CH - 4, false);
  for (const s of stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.ph);
    ctx.globalAlpha = 0.15 + 0.85 * tw * s.z;
    txt(tw > 0.85 ? '*' : '.', s.x * W + (m.sx - W / 2) * s.z * -0.03, s.y * H + (m.sy - H / 2) * s.z * -0.03, tw > 0.8 ? '#fff' : '#9aa0c8');
  }
  ctx.globalAlpha = 1;
  for (const s of sparks) {
    const p = Math.pow(Math.max(0, Math.sin(t * 1.3 + s.ph)), 3);
    if (p > 0.02) sparkle(s.x * W, s.y * H, s.s * p, p);
  }
}

function drawPetals(dt) {
  setFont(ctx, 20, true);
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.age += dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    p.x += (p.vx + Math.sin(p.age * 2 + p.ph) * 26) * dt;
    if (p.y > H + 20) { petals.splice(i, 1); continue; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = clamp(p.age * 2, 0, 1) * clamp((H - p.y) / 120, 0, 1);
    ctx.fillStyle = p.c; ctx.font = `bold ${p.s * 1.6}px "Courier New", monospace`;
    ctx.fillText(p.s > 15 ? ')' : '(', 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1; lastCol = '';
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.age += dt;
    if (p.age > 0.9) { pops.splice(i, 1); continue; }
    const u = p.age / 0.9; sparkle(p.x, p.y, p.s * Math.sin(u * Math.PI), 1 - u);
  }
}

/* ---------- input ---------- */
addEventListener('pointermove', e => { m.x = e.clientX; m.y = e.clientY; m.active = true; });
addEventListener('pointerleave', () => { m.active = false; });
addEventListener('pointerdown', e => {
  m.x = m.sx = e.clientX; m.y = m.sy = e.clientY; m.active = true;
  hint.classList.add('hide');
  const hit = ROSES.find(f => { const p = rosePos(f); return Math.hypot(e.clientX - p.x, e.clientY - p.y) < f.r * G.S; });
  if (hit) { hit.pulse = 1; const p = rosePos(hit); addPetals(p.x, p.y, 9); }
  else addPetals(e.clientX, e.clientY, 5);
  for (let i = 0; i < 4; i++) pops.push({ x: e.clientX + rnd(-40, 40), y: e.clientY + rnd(-40, 40), s: rnd(10, 22), age: -i * 0.08 });
});

/* ---------- caption ---------- */
let typedLen = 0;
setTimeout(function tick() {
  typed.textContent = CAPTION.slice(0, ++typedLen);
  if (typedLen < CAPTION.length) setTimeout(tick, 45);
}, 4200);

/* ---------- main loop ---------- */
const T0 = performance.now() / 1000;
let last = performance.now(), spawn = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000 - T0;
  ctx.clearRect(0, 0, W, H);
  const k = 1 - Math.exp(-dt * 8);
  m.sx += (m.x - m.sx) * k; m.sy += (m.y - m.sy) * k;

  if (m.active) {
    const g = ctx.createRadialGradient(m.sx, m.sy, 0, m.sx, m.sy, 170);
    g.addColorStop(0, 'rgba(255,120,160,.16)'); g.addColorStop(1, 'rgba(255,120,160,0)');
    ctx.fillStyle = g; ctx.fillRect(m.sx - 170, m.sy - 170, 340, 340); lastCol = '';
  }

  drawBackdrop(t);
  ctx.drawImage(paper, 0, 0, W, H);
  lastCol = ''; setFont(ctx, CH - 1, false);
  LEAVES.forEach(l => drawLeaf(l, t));

  for (const f of ROSES) {
    f.t = t;
    const p = rosePos(f);
    const tx = m.active ? clamp((m.sx - p.x) * 0.05, -14, 14) : 0;
    const ty = m.active ? clamp((m.sy - p.y) * 0.03, -8, 8) : 0;
    f.vx += ((tx - f.ox) * 60 - f.vx * 9) * dt; f.vy += ((ty - f.oy) * 60 - f.vy * 9) * dt;
    f.ox += f.vx * dt; f.oy += f.vy * dt;
    const over = m.active && Math.hypot(m.sx - p.x, m.sy - p.y) < f.r * G.S ? 1 : 0;
    f.hov += (over - f.hov) * (1 - Math.exp(-dt * 10));
    f.pulse *= Math.exp(-dt * 3);
  }
  lastCol = '';
  [...ROSES].sort((a, b) => a.dy - b.dy).forEach(f => drawRose(f, t));

  drawRibbon(t);

  if (t - spawn > 0.7 && t > 3) { spawn = t; const f = ROSES[Math.floor(rnd(0, ROSES.length))]; const p = rosePos(f); addPetals(p.x, p.y + 10, 1); }
  drawPetals(dt);

  if (m.active) { ctx.font = '16px sans-serif'; txt('♥', m.sx, m.sy, '#fff'); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
