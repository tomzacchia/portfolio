/* Skills constellation — starry night sky with an orbiting satellite.
 * Everything is drawn on one <canvas id="sky">; labels are DOM nodes in #labels.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Config                                                              */
  /* ------------------------------------------------------------------ */

  const DEFAULTS = {
    starDensity: 60,     // background stars per million px²
    starOpacity: 0.8,    // max opacity of background stars (0–1)
    tailSpeed: 1.8,        // multiplier for tail animation (dashes, wobble, sparks)
    satSpeed: 200,       // satellite speed along trajectory, px / second
    glowIntensity: 1,    // multiplier for skill-star glow
    glowDuration: 1.1,   // seconds the strong glow takes to fade
  };

  const STORAGE_KEY = 'skyPortfolioSettings.v1';

  // Constellation layout: x/y are 0–1 inside the "constellation box"
  // (centered, occupying the upper ~2/3 of the screen). Tweak freely.
  const SKILLS = [
    { name: 'React',               color: '#61dafb', x: 0.00, y: 0.70 },
    { name: 'Typescript',                  color: '#ff8fc1', x: 0.20, y: 0.18 },
    { name: 'NodeJS',              color: '#9be15d', x: 0.47, y: 0.62 },
    { name: 'AWS',                 color: '#ffb347', x: 0.71, y: 0.08 },
    { name: 'Product Engineering', color: '#b9a2ff', x: 1.00, y: 0.44 },
  ];

  const BOX = { left: 0.10, width: 0.80, top: 0.10, height: 0.50 }; // fractions of viewport → stays in top 2/3
  const PATH_CURVATURE = 1.0;   // 1 = standard smooth curve through the stars; >1 = rounder, more elliptical sweeps
  const SAMPLES_PER_SEGMENT = 120;
  const TAIL_LENGTH = 240;      // px
  const SAT_COLOR = [240, 201, 135];

  /* ------------------------------------------------------------------ */
  /* Setup                                                               */
  /* ------------------------------------------------------------------ */

  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  const labelsEl = document.getElementById('labels');

  let settings = loadSettings();
  let W = 0, H = 0, dpr = 1;
  let bgStars = [];
  let skills = [];       // skills with pixel positions + runtime state
  let path = null;       // sampled trajectory
  let clock = 0;         // seconds since (re)start
  let sat = { s: 0, done: false };
  let sparks = [];
  let sparkAcc = 0;
  let last = performance.now();

  // build label elements once
  const labelEls = SKILLS.map((sk) => {
    const el = document.createElement('div');
    el.className = 'label';
    el.style.setProperty('--c', sk.color);
    const span = document.createElement('span');
    span.textContent = sk.name;
    el.appendChild(span);
    labelsEl.appendChild(el);
    return el;
  });

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...DEFAULTS, ...raw };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /* Layout: canvas size, background stars, skill positions, trajectory  */
  /* ------------------------------------------------------------------ */

  function layout() {
    const prevFrac = path && path.total ? sat.s / path.total : 0;

    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildBackgroundStars();
    placeSkills();
    buildPath();
    sat.s = clamp(prevFrac, 0, 1) * path.total;
    placeLabels();
  }

  function buildBackgroundStars() {
    const count = Math.round((settings.starDensity * W * H) / 1e6);
    const rnd = mulberry32(20261105);
    bgStars = [];
    for (let i = 0; i < count; i++) {
      const roll = rnd();
      const r = roll < 0.72 ? 0.8 : roll < 0.93 ? 1.2 : 1.8;
      bgStars.push({
        x: rnd() * W,
        y: rnd() * H,
        r,
        base: 0.45 + rnd() * 0.55,
        phase: rnd() * Math.PI * 2,
        rate: 0.4 + rnd() * 1.2,
      });
    }
  }

  function placeSkills() {
    const bx = W * BOX.left, bw = W * BOX.width;
    const by = H * BOX.top, bh = H * BOX.height;
    const prev = skills;
    skills = SKILLS.map((sk, i) => ({
      ...sk,
      px: bx + (sk.x) * bw,
      py: by + (sk.y) * bh,
      rgb: hexToRgb(sk.color),
      glowT: prev[i] ? prev[i].glowT : null,       // clock time when satellite arrived
      labelShown: prev[i] ? prev[i].labelShown : false,
      s: 0,                                         // arc-length position on path (set in buildPath)
    }));
  }

  // Smooth curve through the stars (Catmull-Rom → cubic Béziers), preceded by an
  // off-screen entry point so the satellite flies in. Gives gentle, slightly
  // elliptical sweeps between stars rather than straight lines.
  function buildPath() {
    const entry = { x: -80, y: skills[0].py - H * 0.14 };
    const P = [entry, ...skills.map((s) => ({ x: s.px, y: s.py }))];
    const k = PATH_CURVATURE / 6;

    const xs = [], ys = [], ss = [];
    let acc = 0;
    const skillS = [];

    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
      const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
      for (let j = 0; j < SAMPLES_PER_SEGMENT; j++) {
        const t = j / SAMPLES_PER_SEGMENT, u = 1 - t;
        const x = u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x;
        const y = u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y;
        if (xs.length) acc += Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]);
        xs.push(x); ys.push(y); ss.push(acc);
      }
      // end point of this segment is the next skill star; added as first sample of next segment,
      // except for the final one which we append below
      if (i === P.length - 2) {
        acc += Math.hypot(p2.x - xs[xs.length - 1], p2.y - ys[ys.length - 1]);
        xs.push(p2.x); ys.push(p2.y); ss.push(acc);
      }
    }
    // arc-length position of each skill star = sample index (i+1)*N
    skills.forEach((sk, i) => {
      const idx = Math.min((i + 1) * SAMPLES_PER_SEGMENT, ss.length - 1);
      sk.s = ss[idx];
      sk.idx = idx;
      skillS.push(sk.s);
    });

    path = { xs, ys, ss, total: acc, skillS };
  }

  function placeLabels() {
    skills.forEach((sk, i) => {
      const el = labelEls[i];
      el.style.left = sk.px + 'px';
      el.style.top = (sk.py + 10) + 'px';
      el.classList.toggle('left', sk.px > W * 0.78);
      el.classList.toggle('visible', sk.labelShown);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Path queries                                                        */
  /* ------------------------------------------------------------------ */

  // position + heading at arc-length s
  function posAt(s, out) {
    const { xs, ys, ss, total } = path;
    s = clamp(s, 0, total);
    let lo = 0, hi = ss.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ss[mid] <= s) lo = mid; else hi = mid;
    }
    const span = ss[hi] - ss[lo] || 1;
    const f = (s - ss[lo]) / span;
    out.x = lerp(xs[lo], xs[hi], f);
    out.y = lerp(ys[lo], ys[hi], f);
    const a = Math.max(0, lo - 2), b = Math.min(xs.length - 1, hi + 2);
    out.ang = Math.atan2(ys[b] - ys[a], xs[b] - xs[a]);
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Animation control                                                   */
  /* ------------------------------------------------------------------ */

  function restart() {
    clock = 0;
    sat = { s: 0, done: false };
    sparks = [];
    sparkAcc = 0;
    skills.forEach((sk) => { sk.glowT = null; sk.labelShown = false; });
    labelEls.forEach((el) => el.classList.remove('visible'));
  }

  function update(dt) {
    clock += dt;

    if (!sat.done) {
      const remaining = path.total - sat.s;
      const ease = clamp(remaining / 160, 0.12, 1); // gentle deceleration into the last star
      sat.s += settings.satSpeed * ease * dt;
      if (path.total - sat.s < 0.5) { sat.s = path.total; sat.done = true; }
    }

    // arrivals → start glow, then show label once the glow has faded
    skills.forEach((sk, i) => {
      if (sk.glowT === null && sat.s >= sk.s - 0.5) sk.glowT = clock;
      if (sk.glowT !== null && !sk.labelShown && clock - sk.glowT >= settings.glowDuration * 0.85 + 0.15) {
        sk.labelShown = true;
        labelEls[i].classList.add('visible');
      }
    });

    updateSparks(dt);
  }

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  const tmp = { x: 0, y: 0, ang: 0 };
  const tmp2 = { x: 0, y: 0, ang: 0 };

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackgroundStars();
    drawTrajectory();
    skills.forEach((sk, i) => drawSkillStar(sk, i));
    drawTail();
    drawSparks();
    posAt(sat.s, tmp);
    drawSatellite(tmp.x, tmp.y, tmp.ang);
  }

  function drawBackgroundStars() {
    const maxA = settings.starOpacity;
    for (const st of bgStars) {
      const tw = 0.78 + 0.22 * Math.sin(clock * st.rate + st.phase);
      ctx.globalAlpha = clamp(maxA * st.base * tw, 0, 1);
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // The path the satellite has already travelled, from the first star onward.
  function drawTrajectory() {
    const { xs, ys, ss } = path;
    for (let j = 1; j < skills.length; j++) {
      const a = skills[j - 1], b = skills[j];
      if (sat.s <= a.s) break;
      const end = Math.min(sat.s, b.s);

      const g = ctx.createLinearGradient(a.px, a.py, b.px, b.py);
      g.addColorStop(0, `rgba(${a.rgb.join(',')},0.55)`);
      g.addColorStop(1, `rgba(${b.rgb.join(',')},0.55)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(xs[a.idx], ys[a.idx]);
      for (let i = a.idx + 1; i <= b.idx && ss[i] <= end; i++) ctx.lineTo(xs[i], ys[i]);
      if (end < b.s) { posAt(end, tmp2); ctx.lineTo(tmp2.x, tmp2.y); }
      ctx.stroke();
    }
  }

  // Strength of glow g(age): quick rise → strong peak → fade to a soft resting glow
  function glowValue(sk, i) {
    if (sk.glowT === null) return 0;
    const I = settings.glowIntensity;
    const peak = 1.8 * I, rest = 0.5 * I;
    const age = clock - sk.glowT;
    const rise = 0.18;
    let g;
    if (age < rise) {
      g = peak * (age / rise);
    } else {
      const u = clamp((age - rise) / settings.glowDuration, 0, 1);
      g = rest + (peak - rest) * (1 - u) * (1 - u);
    }
    return g * (1 + 0.06 * Math.sin(clock * 2 + i)); // faint shimmer
  }

  function drawSkillStar(sk, i) {
    const { px: x, py: y, rgb } = sk;
    const c = rgb.join(',');
    const g = glowValue(sk, i);

    if (g > 0.01) {
      const R = 22 + 34 * g;
      const a = clamp(0.75 * g, 0, 1);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, R);
      grad.addColorStop(0, `rgba(${c},${a})`);
      grad.addColorStop(0.35, `rgba(${c},${a * 0.35})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fill();
    }

    // "+" — plain before arrival, longer & brighter with glow
    const arm = 6 + 9 * g;
    const alpha = sk.glowT === null ? 0.7 : clamp(0.85 + 0.15 * g, 0, 1);
    const lg1 = ctx.createLinearGradient(x - arm, y, x + arm, y);
    const lg2 = ctx.createLinearGradient(x, y - arm, x, y + arm);
    for (const lg of [lg1, lg2]) {
      lg.addColorStop(0, `rgba(${c},0)`);
      lg.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
      lg.addColorStop(1, `rgba(${c},0)`);
    }
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    if (sk.glowT === null) {
      ctx.strokeStyle = `rgba(${c},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm);
      ctx.stroke();
    } else {
      ctx.strokeStyle = lg1;
      ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y); ctx.stroke();
      ctx.strokeStyle = lg2;
      ctx.beginPath(); ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${clamp(0.8 + 0.2 * g, 0, 1)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + 1.4 * Math.min(g, 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---- tail ---- */

  function tailFactor() {
    return clamp((path.total - sat.s) / 160, 0, 1);
  }

  function drawTail() {
    const f = tailFactor();
    if (f <= 0.01) return;
    const len = TAIL_LENGTH * f;
    const N = 56;
    const ts = settings.tailSpeed;
    const [r0, g0, b0] = SAT_COLOR;
    const dashPeriod = 30, dashOn = 15;
    const flow = clock * 110 * ts;

    ctx.lineCap = 'round';
    let prev = null;

    for (let i = 0; i < N; i++) {
      const d0 = (len * i) / N, d1 = (len * (i + 1)) / N;
      const k = 1 - i / N;                    // 1 at satellite → 0 at tail end
      const p0 = posAt(sat.s - d0, tmp);
      const x0 = p0.x, y0 = p0.y, ang0 = p0.ang;
      const p1 = posAt(sat.s - d1, tmp2);
      const x1 = p1.x, y1 = p1.y, ang1 = p1.ang;

      // lateral wobble that travels backward along the tail
      const wob = (d, ang) => Math.sin(d * 0.07 - clock * 7 * ts) * 1.6 * (d / len);
      const n0x = -Math.sin(ang0), n0y = Math.cos(ang0);
      const n1x = -Math.sin(ang1), n1y = Math.cos(ang1);
      const w0 = wob(d0, ang0), w1 = wob(d1, ang1);

      // core streak: gold → greyish → fades into the night
      const mix = i / N;
      const cr = Math.round(lerp(r0, 110, mix));
      const cg = Math.round(lerp(g0, 105, mix));
      const cb = Math.round(lerp(b0, 140, mix));
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.95 * Math.pow(k, 1.25) * f})`;
      ctx.lineWidth = 1 + 3.4 * k;
      ctx.beginPath();
      ctx.moveTo(x0 + n0x * w0, y0 + n0y * w0);
      ctx.lineTo(x1 + n1x * w1, y1 + n1y * w1);
      ctx.stroke();

      // dashed flanking lines that stream away from the satellite
      const dm = (d0 + d1) / 2;
      const phase = (((dm - flow) % dashPeriod) + dashPeriod) % dashPeriod;
      if (phase < dashOn) {
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.75 * Math.pow(k, 1.4) * f})`;
        for (const side of [-1, 1]) {
          const o0 = side * (8 + d0 * 0.045) + w0 * 0.6;
          const o1 = side * (8 + d1 * 0.045) + w1 * 0.6;
          ctx.beginPath();
          ctx.moveTo(x0 + n0x * o0, y0 + n0y * o0);
          ctx.lineTo(x1 + n1x * o1, y1 + n1y * o1);
          ctx.stroke();
        }
      }
      prev = p1;
    }
  }

  /* ---- sparks (little specks drifting off the tail) ---- */

  function updateSparks(dt) {
    const ts = settings.tailSpeed;
    const f = tailFactor();

    if (!sat.done && f > 0.05 && sparks.length < 140) {
      sparkAcc += dt * 26 * ts;
      while (sparkAcc >= 1) {
        sparkAcc -= 1;
        const d = 12 + Math.random() * TAIL_LENGTH * 0.85 * f;
        const p = posAt(sat.s - d, tmp);
        const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);
        const off = (Math.random() - 0.5) * 22;
        const back = 8 + Math.random() * 22;
        sparks.push({
          x: p.x + nx * off,
          y: p.y + ny * off,
          vx: -Math.cos(p.ang) * back + nx * (Math.random() - 0.5) * 8,
          vy: -Math.sin(p.ang) * back + ny * (Math.random() - 0.5) * 8,
          life: 0,
          max: 0.7 + Math.random() * 0.9,
          r: 0.7 + Math.random() * 0.9,
        });
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.max) { sparks.splice(i, 1); continue; }
      s.x += s.vx * ts * dt;
      s.y += s.vy * ts * dt;
    }
  }

  function drawSparks() {
    ctx.fillStyle = `rgb(${SAT_COLOR.join(',')})`;
    for (const s of sparks) {
      ctx.globalAlpha = 0.8 * (1 - s.life / s.max);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- satellite ---- */

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPanel(side) {
    // local frame: +x = direction of travel, panels extend along ±y
    const x = -6, w = 12, y0 = 9, len = 22;
    const y = side > 0 ? y0 : -y0 - len;
    ctx.fillStyle = '#1b2650';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.rect(x, y, w, len);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + len);
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(x, y + (len * i) / 3); ctx.lineTo(x + w, y + (len * i) / 3);
    }
    ctx.stroke();
  }

  function drawSatellite(x, y, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    // soft halo
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    // panels + struts
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 7); ctx.lineTo(0, 9);
    ctx.moveTo(0, -7); ctx.lineTo(0, -9);
    ctx.stroke();
    drawPanel(1);
    drawPanel(-1);

    // body
    rr(-14, -8, 28, 16, 5);
    ctx.fillStyle = `rgb(${SAT_COLOR.join(',')})`;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // little antenna arc
    // ctx.lineWidth = 1.8;
    // ctx.beginPath();
    // ctx.arc(11, -9, 6, -Math.PI * 0.15, Math.PI * 0.55);
    // ctx.stroke();

    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                           */
  /* ------------------------------------------------------------------ */

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Settings panel                                                      */
  /* ------------------------------------------------------------------ */

  const fmt = {
    starDensity:   (v) => `${Math.round(v)}`,
    starOpacity:   (v) => (+v).toFixed(2),
    tailSpeed:     (v) => `${(+v).toFixed(1)}×`,
    satSpeed:      (v) => `${Math.round(v)} px/s`,
    glowIntensity: (v) => `${(+v).toFixed(1)}×`,
    glowDuration:  (v) => `${(+v).toFixed(1)} s`,
  };

  const panel = document.getElementById('settings');
  const toggleBtn = document.getElementById('settings-toggle');
  const inputs = Object.keys(DEFAULTS).reduce((acc, key) => {
    acc[key] = document.getElementById(key);
    return acc;
  }, {});

  function syncOutput(key) {
    const out = document.querySelector(`output[for="${key}"]`);
    if (out) out.textContent = fmt[key](inputs[key].value);
  }

  function fillInputs(values) {
    for (const key of Object.keys(inputs)) {
      inputs[key].value = values[key];
      syncOutput(key);
    }
  }

  function openPanel() {
    fillInputs(settings); // discard any un-applied edits
    document.body.classList.add('panel-open');
    panel.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    inputs.starDensity.focus({ preventScroll: true });
  }
  function closePanel() {
    document.body.classList.remove('panel-open');
    panel.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus({ preventScroll: true });
  }

  toggleBtn.addEventListener('click', openPanel);
  document.getElementById('settings-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('panel-open')) closePanel();
  });

  for (const key of Object.keys(inputs)) {
    inputs[key].addEventListener('input', () => syncOutput(key));
  }

  document.getElementById('settings-reset').addEventListener('click', () => fillInputs(DEFAULTS));

  document.getElementById('settings-apply').addEventListener('click', () => {
    const next = {};
    for (const key of Object.keys(inputs)) next[key] = parseFloat(inputs[key].value);
    settings = { ...DEFAULTS, ...next };
    saveSettings();
    layout();      // regenerates background stars with the new density
    restart();     // replays the animation from the beginning
    placeLabels();
    closePanel();
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(layout);
  });

  layout();
  restart();
  placeLabels();
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
})();
