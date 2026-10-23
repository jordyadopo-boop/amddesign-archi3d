/* AMD Design — moteur de plans 2D / 3D filaires (Canvas, sans dépendance).
   Types de traits (k) : bit 0 = couleur (0 or, 1 gris) ; bits 1-2 = mode (0 toujours, 1 3D seule, 2 plan 2D seul). */
(() => {
  'use strict';
  const HALF_PI = Math.PI / 2;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Modèles ----------
  class Model {
    constructor(name, grid = 1) { this.name = name; this.grid = grid; this.segs = []; this.labels = []; this.dims = []; }
    line(x1, y1, z1, x2, y2, z2, k = 0) { this.segs.push([x1, y1, z1, x2, y2, z2, k]); return this; }
    wall(x1, y1, x2, y2, h, k = 0, z0 = 0) {
      const k3 = (k & 1) | 2;
      return this.line(x1, y1, z0, x2, y2, z0, k).line(x1, y1, h, x2, y2, h, k3)
        .line(x1, y1, z0, x1, y1, h, k3).line(x2, y2, z0, x2, y2, h, k3);
    }
    rect(x, y, w, d, z, k = 0) {
      return this.line(x, y, z, x + w, y, z, k).line(x + w, y, z, x + w, y + d, z, k)
        .line(x + w, y + d, z, x, y + d, z, k).line(x, y + d, z, x, y, z, k);
    }
    box(x, y, w, d, z0, z1, k = 0) {
      const k3 = (k & 1) | 2;
      this.rect(x, y, w, d, z0, k).rect(x, y, w, d, z1, k3);
      [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach(([a, b]) => this.line(a, b, z0, a, b, z1, k3));
      return this;
    }
    // Porte : arc de débattement + vantail ouvert (plan 2D uniquement)
    door(cx, cy, r, aClosed, aOpen) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = lerp(aClosed, aOpen, i / n), b = lerp(aClosed, aOpen, (i + 1) / n);
        this.line(cx + r * Math.cos(a), cy + r * Math.sin(a), 0, cx + r * Math.cos(b), cy + r * Math.sin(b), 0, 5);
      }
      return this.line(cx, cy, 0, cx + r * Math.cos(aOpen), cy + r * Math.sin(aOpen), 0, 4);
    }
    // Fenêtre : symbole en plan + cadre et meneau en 3D
    win(x1, y1, x2, y2, zb, zt) {
      const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L * .15, ny = (x2 - x1) / L * .15;
      this.line(x1 + nx, y1 + ny, 0, x2 + nx, y2 + ny, 0, 5).line(x1 - nx, y1 - ny, 0, x2 - nx, y2 - ny, 0, 5);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return this.line(x1, y1, zb, x2, y2, zb, 3).line(x1, y1, zt, x2, y2, zt, 3)
        .line(x1, y1, zb, x1, y1, zt, 3).line(x2, y2, zb, x2, y2, zt, 3).line(mx, my, zb, mx, my, zt, 3);
    }
    circle(cx, cy, r, z, k) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
        this.line(cx + r * Math.cos(a), cy + r * Math.sin(a), z, cx + r * Math.cos(b), cy + r * Math.sin(b), z, k);
      }
      return this;
    }
    palm(x, y, s = 1) {
      this.circle(x, y, 1.3 * s, 0, 5).line(x, y, 0, x + .3 * s, y, 5 * s, 3);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        this.line(x + .3 * s, y, 5 * s, x + .3 * s + 1.8 * s * Math.cos(a), y + 1.8 * s * Math.sin(a), 4 * s, 3);
      }
      return this;
    }
    label(x, y, t) { this.labels.push([x, y, t]); return this; }
    dim(x1, y1, x2, y2, t) { this.dims.push([x1, y1, x2, y2, t]); return this; }
    done() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      this.segs.forEach(s => { x0 = Math.min(x0, s[0], s[3]); x1 = Math.max(x1, s[0], s[3]); y0 = Math.min(y0, s[1], s[4]); y1 = Math.max(y1, s[1], s[4]); });
      this.bounds = [x0, y0, x1, y1];
      this.cx = (x0 + x1) / 2; this.cy = (y0 + y1) / 2;
      this.r = Math.hypot(x1 - x0, y1 - y0) / 2;
      // Ordre de tracé « traceur » : du sol vers le haut, puis de gauche à droite
      this.segs.sort((a, b) => (Math.min(a[2], a[5]) > 0) - (Math.min(b[2], b[5]) > 0) || (a[0] + a[1]) - (b[0] + b[1]));
      return this;
    }
  }

  function villa() {
    const m = new Model('Villa R+1'), H = 3;
    [[0, 0, 18, 0], [0, 0, 0, 12], [18, 0, 18, 12], [0, 12, 8, 12], [9.2, 12, 18, 12]].forEach(w => m.wall(...w, H));
    [[0, 5, 2, 5], [3, 5, 6, 5], [6, 0, 6, 5], [10, 0, 10, 5], [6, 3, 7.5, 3], [8.5, 3, 10, 3],
     [12, 0, 12, 2.5], [12, 3.5, 12, 8.5], [12, 9.5, 12, 12], [12, 6, 18, 6]].forEach(w => m.wall(...w, H, 1));
    m.door(8, 12, 1.2, 0, -HALF_PI).door(2, 5, 1, 0, -HALF_PI).door(7.5, 3, 1, 0, -HALF_PI)
     .door(12, 2.5, 1, HALF_PI, 0).door(12, 8.5, 1, HALF_PI, 0);
    m.win(1, 12, 7, 12, .1, 2.6).win(1.5, 0, 4.5, 0, 1.1, 2.2).win(7, 0, 9, 0, 1.6, 2.2)
     .win(18, 1.5, 18, 4.5, 1, 2.2).win(18, 7.5, 18, 10.5, 1, 2.2).win(13.5, 12, 16.5, 12, 1, 2.2);
    // Étage en porte-à-faux, dalles et pergola (visibles en 3D)
    m.box(-.4, -.4, 18.8, 12.8, 3, 3.3, 3).box(4, 0, 14, 7, 3.3, 6.3, 2).box(3.6, -.6, 15, 8.2, 6.3, 6.6, 2);
    m.win(5, 7, 11, 7, 3.6, 5.9).win(18, 1, 18, 6, 3.8, 5.8).box(10, 12, 7, 3, 0, 2.8, 3);
    m.box(2, 14, 8, 3.5, -1.2, 0, 1).palm(-2.5, 15).palm(20, 15.5, 1.1).palm(-2, -2.5, .9);
    m.label(3, 2.5, 'Cuisine').label(5, 8.5, 'Séjour').label(8, 1.5, 'SdB').label(15, 3, 'Ch. 1')
     .label(15, 9, 'Ch. 2').label(6, 15.75, 'Piscine').label(13.5, 13.5, 'Terrasse');
    m.dim(0, -1.6, 18, -1.6, '18,00').dim(-1.6, 0, -1.6, 12, '12,00').dim(2, 18.4, 10, 18.4, '8,00');
    return m.done();
  }

  function tower() {
    const m = new Model('Immeuble R+6'), F = 7, h = 3.2, H = F * h;
    [[0, 0, 16, 0], [16, 0, 16, 11], [16, 11, 0, 11], [0, 11, 0, 0]].forEach(w => m.wall(...w, H));
    m.box(6.5, 3.5, 3, 4, 0, H + 2.4, 0);
    for (let i = 0; i < 8; i++) m.line(6.8, 3.8 + i * .42, 0, 8.2, 3.8 + i * .42, 0, 5);
    [[6, 0, 6, 3], [6, 4.2, 6, 11], [10, 0, 10, 6], [10, 7, 10, 11], [0, 5.5, 3, 5.5], [13, 5.5, 16, 5.5]].forEach(w => m.wall(...w, h, 1));
    m.door(6, 3, 1, HALF_PI, Math.PI).door(10, 6, 1, HALF_PI, 0);
    for (let k = 1; k <= F; k++) {
      const z = k * h;
      m.rect(0, 0, 16, 11, z, 2);
      if (k < F) m.line(1, 11, z, 1, 12.4, z, 3).line(1, 12.4, z, 15, 12.4, z, 3).line(15, 12.4, z, 15, 11, z, 3);
    }
    for (let x = 2; x < 16; x += 2) m.line(x, 0, 0, x, 0, H, 3).line(x, 11, 0, x, 11, H, 3);
    for (let y = 2.75; y < 11; y += 2.75) m.line(0, y, 0, 0, y, H, 3).line(16, y, 0, 16, y, H, 3);
    for (let x = 1.2; x < 15; x += 3.4) m.win(x, 0, x + 1.6, 0, 0, 0).win(x, 11, x + 1.6, 11, 0, 0);
    m.box(-.3, -.3, 16.6, 11.6, H, H + 1, 2);
    m.label(3, 2.7, 'Ch. A').label(3, 8.3, 'Séjour A').label(8, 9.2, 'Palier').label(14.5, 2.7, 'Ch. B').label(12.5, 8.8, 'Séjour B');
    m.dim(0, -1.6, 16, -1.6, '16,00').dim(-1.6, 0, -1.6, 11, '11,00');
    return m.done();
  }

  function site() {
    const m = new Model('Plan de masse', 2);
    [13, 16].forEach(y => m.line(-3, y, 0, 47, y, 0, 1));
    [[13, 16], [29, 32]].forEach(([a, b]) => { m.line(a, -3, 0, a, 33, 0, 1); m.line(b, -3, 0, b, 33, 0, 1); });
    for (let x = -2; x < 47; x += 3) m.line(x, 14.5, 0, x + 1.4, 14.5, 0, 5);
    [[1, 1, 7, 5, 9], [1, 8, 11, 4, 6], [17, 1, 5, 11, 18], [23.5, 2, 4.5, 4.5, 12], [33, 1, 10, 11, 4],
     [1, 17, 5, 5, 7], [7, 17, 5, 5, 7], [1, 24, 5, 5, 7], [7, 24, 5, 5, 7], [33, 17, 4, 12, 15], [39, 17, 4, 12, 21]]
      .forEach(([x, y, w, d, h]) => m.box(x, y, w, d, 0, h));
    m.rect(17, 17, 11, 12, 0, 1);
    [[19.5, 19.5], [25.5, 19.5], [22.5, 23], [19.5, 26.5], [25.5, 26.5]].forEach(([x, y]) => m.palm(x, y, .8));
    m.label(6.5, 3.5, 'Lot A').label(19.5, 6.5, 'Lot B').label(38, 6.5, 'Lot C').label(6.5, 23, 'Lot D').label(22.5, 30, 'Parc').label(38, 30.5, 'Lot F');
    m.dim(0, -4.5, 44, -4.5, '44,00').dim(-4.5, 0, -4.5, 30, '30,00');
    return m.done();
  }

  const MODELS = { villa: villa(), tower: tower(), site: site() };

  // ---------- Rendu ----------
  class PlanView {
    constructor(canvas, colors) {
      this.c = canvas; this.x = canvas.getContext('2d'); this.colors = colors;
      this.resize();
    }
    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = this.c.clientWidth; this.h = this.c.clientHeight;
      this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
    }
    render(m, s) {
      const ctx = this.x, { gold, grey, ink } = this.colors;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      if (!m || s.alpha < .005 || s.draw < .001) return;
      const cY = Math.cos(s.yaw), sY = Math.sin(s.yaw), cP = Math.cos(s.pitch), sP = Math.sin(s.pitch);
      const dist = m.r * 3.2, base = s.zoom * Math.min(this.w, this.h) * .5 / m.r, e = s.ext;
      const P = (X, Y, Z) => {
        X -= m.cx; Y -= m.cy; Z *= e;
        const xr = X * cY - Y * sY, yr = X * sY + Y * cY;
        const k = base * dist / (dist - (yr * cP + Z * sP));
        return [s.px + xr * k, s.py + (yr * sP - Z * cP) * k];
      };

      // Trame du sol (papier millimétré en perspective)
      const [bx0, by0, bx1, by1] = m.bounds, g = m.grid, mg = g * 4;
      const gx0 = Math.floor((bx0 - mg) / g) * g, gx1 = Math.ceil((bx1 + mg) / g) * g;
      const gy0 = Math.floor((by0 - mg) / g) * g, gy1 = Math.ceil((by1 + mg) / g) * g;
      const grid = new Path2D(), gridMajor = new Path2D();
      const gl = (path, a, b) => { path.moveTo(...a); path.lineTo(...b); };
      for (let x = gx0; x <= gx1; x += g) gl(Math.round(x / g) % 5 ? grid : gridMajor, P(x, gy0, 0), P(x, gy1, 0));
      for (let y = gy0; y <= gy1; y += g) gl(Math.round(y / g) % 5 ? grid : gridMajor, P(gx0, y, 0), P(gx1, y, 0));
      const ga = s.alpha * clamp(s.draw * 3) * s.grid;
      ctx.lineWidth = .5; ctx.strokeStyle = grey;
      ctx.globalAlpha = ga * .12; ctx.stroke(grid);
      ctx.globalAlpha = ga * .25; ctx.stroke(gridMajor);

      // Traits du modèle, tracés progressivement
      const paths = [0, 1, 2, 3, 4, 5].map(() => new Path2D());
      const n = m.segs.length, reveal = s.draw * n;
      for (let i = 0; i < n && i < reveal; i++) {
        const sg = m.segs[i], k = sg[6], mode = k >> 1;
        if ((mode === 1 && e < .01) || (mode === 2 && e > .99)) continue;
        const f = Math.min(1, reveal - i);
        const a = P(sg[0], sg[1], sg[2]);
        const b = f < 1 ? P(lerp(sg[0], sg[3], f), lerp(sg[1], sg[4], f), lerp(sg[2], sg[5], f)) : P(sg[3], sg[4], sg[5]);
        paths[k].moveTo(a[0], a[1]); paths[k].lineTo(b[0], b[1]);
      }
      paths.forEach((p, k) => {
        const mode = k >> 1, ma = mode === 0 ? 1 : mode === 1 ? e : 1 - e;
        if (ma < .01) return;
        ctx.globalAlpha = s.alpha * ma * (k & 1 ? .55 : 1);
        ctx.strokeStyle = k & 1 ? grey : gold;
        ctx.lineWidth = k & 1 ? .8 : 1.3;
        ctx.stroke(p);
      });

      // Cotes et noms des pièces
      const ta = s.alpha * clamp((s.draw - .75) / .25);
      if (ta < .01) return;
      ctx.font = '600 9px Montserrat, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      ctx.globalAlpha = ta * (.35 + .65 * (1 - e));
      ctx.strokeStyle = gold; ctx.fillStyle = gold; ctx.lineWidth = .8;
      m.dims.forEach(([x1, y1, x2, y2, t]) => {
        const a = P(x1, y1, 0), b = P(x2, y2, 0);
        let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        [a, b].forEach(p => { ctx.moveTo(p[0] - 4, p[1] + 4); ctx.lineTo(p[0] + 4, p[1] - 4); });
        ctx.stroke();
        if (ang > HALF_PI || ang < -HALF_PI) ang += Math.PI;
        ctx.save(); ctx.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); ctx.rotate(ang);
        ctx.fillText(t, 0, -8); ctx.restore();
      });
      ctx.globalAlpha = ta * (1 - e); ctx.fillStyle = ink;
      if (ctx.globalAlpha > .01) m.labels.forEach(([x, y, t]) => { const p = P(x, y, 0); ctx.fillText(t.toUpperCase(), p[0], p[1]); });
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Intro ----------
  function intro(onEnd) {
    const el = document.getElementById('intro');
    if (!el || document.documentElement.classList.contains('no-intro')) { onEnd(); return; }
    const view = new PlanView(document.getElementById('introCanvas'), { gold: '#c8902e', grey: '#9a9a9a', ink: '#d9d4cc' });
    const pct = document.getElementById('introPct'), step = document.getElementById('introStep');
    const steps = [[0, '<b>01</b> Plan 2D · Éch. 1/100'], [2.1, '<b>02</b> Modélisation 3D'], [3.6, '<b>03</b> De l’idée à la réalité']];
    let t0 = null, ended = false, stepIdx = -1, raf;
    const finish = () => {
      if (ended) return; ended = true;
      try { sessionStorage.setItem('amdIntro', '1'); } catch (e) { /* stockage indisponible */ }
      el.classList.add('intro--out');
      document.documentElement.classList.remove('intro-lock');
      onEnd();
      setTimeout(() => { cancelAnimationFrame(raf); el.remove(); }, 1100);
    };
    document.getElementById('introSkip').addEventListener('click', finish);
    addEventListener('resize', () => view.resize());
    const frame = (now) => {
      if (t0 === null) t0 = now;
      const t = (now - t0) / 1000, mobile = view.w < 760;
      const tilt = ease((t - 2.1) / 1.4), out = ease((t - 3.4) / 1);
      view.render(MODELS.villa, {
        draw: ease((t - .2) / 1.8), ext: tilt, pitch: lerp(HALF_PI, .62, tilt),
        yaw: -1 * ease((t - 2.1) / 2.8) - t * .03, alpha: 1, grid: 1,
        zoom: lerp(mobile ? .95 : .8, mobile ? .8 : .62, out),
        px: view.w / 2, py: view.h * lerp(.5, .4, out)
      });
      pct.textContent = String(Math.round(clamp(t / 4.4) * 100)).padStart(3, '0');
      const si = steps.reduce((acc, s, i) => t >= s[0] ? i : acc, 0);
      if (si !== stepIdx) { stepIdx = si; step.innerHTML = steps[si][1]; step.classList.remove('is-in'); void step.offsetWidth; step.classList.add('is-in'); }
      if (t > 3.6) el.classList.add('show-brand');
      if (t > 5.1) finish();
      if (!ended || t < 6.5) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  // ---------- Fond dynamique ----------
  function background() {
    const canvas = document.getElementById('bgPlan');
    if (!canvas) return () => {};
    const view = new PlanView(canvas, { gold: '#c8902e', grey: '#8f8f8f', ink: '#8f8f8f' });
    const hud = document.getElementById('hud');
    const sections = [...document.querySelectorAll('[data-plan]')];
    const cur = { draw: 0, ext: 1, pitch: .6, yaw: -1, zoom: .75, alpha: 1, grid: 1, px: 0, py: 0 };
    let model = null, target = 'villa', mode = '3d', scrollP = 0, mx = 0, smx = 0, started = false, last = 0, hudText = '';

    const pickSection = () => {
      const mid = innerHeight / 2;
      let best = sections[0], bd = Infinity;
      sections.forEach(s => {
        const r = s.getBoundingClientRect();
        const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (d < bd) { bd = d; best = s; }
      });
      [target, mode] = best.dataset.plan.split(' ');
      if (mode === 'scroll') {
        const r = best.getBoundingClientRect();
        scrollP = clamp((innerHeight * .75 - r.top) / (r.height * .9));
      }
    };
    addEventListener('scroll', pickSection, { passive: true });
    addEventListener('resize', () => { view.resize(); pickSection(); });
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; }, { passive: true });
    pickSection();

    const frame = (now) => {
      const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      const want = MODELS[target];
      // Changement de modèle : on efface le plan au traceur, puis on redessine le suivant
      if (model !== want) {
        cur.draw = Math.max(0, cur.draw - dt * (reduce ? 99 : 1.6));
        if (cur.draw === 0) model = want;
      } else if (started) {
        cur.draw = Math.min(1, cur.draw + dt * (reduce ? 99 : .55));
      }
      const ext = mode === '2d' ? 0 : mode === 'scroll' ? ease(scrollP) : 1;
      const k = reduce ? 1 : Math.min(1, dt * 2.2);
      cur.ext = lerp(cur.ext, ext, k);
      cur.pitch = lerp(cur.pitch, lerp(HALF_PI, .6, ext), k);
      smx = lerp(smx, mx, Math.min(1, dt * 3));
      if (!reduce) cur.yaw += dt * .045;
      const mobile = view.w < 900;
      cur.px = view.w * (mobile ? .5 : .7); cur.py = view.h * (mobile ? .5 : .55);
      cur.zoom = mobile ? .85 : .72;
      cur.alpha = mobile ? .45 : .7;
      view.render(model, { ...cur, yaw: cur.yaw + smx * .35 + scrollY * .00025 });

      if (hud && model) {
        const txt = (mode === 'scroll' ? `Plan 2D → 3D · ${Math.round(ext * 100)} %` : mode === '2d' ? 'Plan 2D · Éch. 1/100' : 'Vue 3D') + ' · ' + model.name;
        if (txt !== hudText) { hudText = txt; hud.lastElementChild.textContent = txt; }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return () => { started = true; };
  }

  const start = background();
  intro(start);
})();
