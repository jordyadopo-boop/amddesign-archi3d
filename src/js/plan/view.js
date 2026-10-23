/**
 * Rendu filaire 2D / 3D d'un modèle (plan/models.js) sur un canvas 2D, sans WebGL.
 * Utilisé par l'esquisse vivante de la fiche projet et comme repli quand WebGL est indisponible.
 * state : { draw 0→1 (tracé au traceur), ext 0→1 (plan → volume), pitch, yaw, zoom, px, py, alpha, grid }
 */
export const HALF_PI = Math.PI / 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const lerp = (a, b, t) => a + (b - a) * t;

export class PlanView {
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
