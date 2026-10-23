/**
 * Modèles d'architecture partagés par le plan 2D (plan/view.js) et le monde 3D du drone (world/).
 * Unités : mètres. Plan : x vers l'est, y vers le sud ; z = hauteur.
 * Traits (k) : bit 0 = couleur (0 or, 1 gris) ; bits 1-2 = mode (0 toujours, 1 en 3D seulement, 2 en plan seulement).
 * En plus des traits, chaque modèle garde ses primitives (murs, volumes, baies, palmiers) pour la 3D pleine.
 */
const HALF_PI = Math.PI / 2;
const lerp = (a, b, t) => a + (b - a) * t;

export class Model {
  constructor(name, grid = 1) {
    this.name = name; this.grid = grid;
    this.segs = []; this.labels = []; this.dims = [];
    this.walls = []; this.boxes = []; this.wins = []; this.palms = [];
  }
  line(x1, y1, z1, x2, y2, z2, k = 0) { this.segs.push([x1, y1, z1, x2, y2, z2, k]); return this; }
  wall(x1, y1, x2, y2, h, k = 0, z0 = 0) {
    this.walls.push([x1, y1, x2, y2, h, z0, k]);
    const k3 = (k & 1) | 2;
    return this.line(x1, y1, z0, x2, y2, z0, k).line(x1, y1, h, x2, y2, h, k3)
      .line(x1, y1, z0, x1, y1, h, k3).line(x2, y2, z0, x2, y2, h, k3);
  }
  rect(x, y, w, d, z, k = 0) {
    return this.line(x, y, z, x + w, y, z, k).line(x + w, y, z, x + w, y + d, z, k)
      .line(x + w, y + d, z, x, y + d, z, k).line(x, y + d, z, x, y, z, k);
  }
  box(x, y, w, d, z0, z1, k = 0, role = 'solid') {
    this.boxes.push([x, y, w, d, z0, z1, k, role]);
    const k3 = (k & 1) | 2;
    this.rect(x, y, w, d, z0, k).rect(x, y, w, d, z1, k3);
    [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach(([a, b]) => this.line(a, b, z0, a, b, z1, k3));
    return this;
  }
  door(cx, cy, r, aClosed, aOpen) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = lerp(aClosed, aOpen, i / n), b = lerp(aClosed, aOpen, (i + 1) / n);
      this.line(cx + r * Math.cos(a), cy + r * Math.sin(a), 0, cx + r * Math.cos(b), cy + r * Math.sin(b), 0, 5);
    }
    return this.line(cx, cy, 0, cx + r * Math.cos(aOpen), cy + r * Math.sin(aOpen), 0, 4);
  }
  win(x1, y1, x2, y2, zb, zt) {
    const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L * 0.15, ny = (x2 - x1) / L * 0.15;
    this.line(x1 + nx, y1 + ny, 0, x2 + nx, y2 + ny, 0, 5).line(x1 - nx, y1 - ny, 0, x2 - nx, y2 - ny, 0, 5);
    if (zt <= zb) return this;
    this.wins.push([x1, y1, x2, y2, zb, zt]);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return this.line(x1, y1, zb, x2, y2, zb, 3).line(x1, y1, zt, x2, y2, zt, 3)
      .line(x1, y1, zb, x1, y1, zt, 3).line(x2, y2, zb, x2, y2, zt, 3).line(mx, my, zb, mx, my, zt, 3);
  }
  circle(cx, cy, r, z, k, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      this.line(cx + r * Math.cos(a), cy + r * Math.sin(a), z, cx + r * Math.cos(b), cy + r * Math.sin(b), z, k);
    }
    return this;
  }
  palm(x, y, s = 1) {
    this.palms.push([x, y, s]);
    this.circle(x, y, 1.3 * s, 0, 5).line(x, y, 0, x + 0.3 * s, y, 5 * s, 3);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      this.line(x + 0.3 * s, y, 5 * s, x + 0.3 * s + 1.8 * s * Math.cos(a), y + 1.8 * s * Math.sin(a), 4 * s, 3);
    }
    return this;
  }
  label(x, y, t) { this.labels.push([x, y, t]); return this; }
  dim(x1, y1, x2, y2, t) { this.dims.push([x1, y1, x2, y2, t]); return this; }
  done() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, h = 0;
    this.segs.forEach((s) => {
      x0 = Math.min(x0, s[0], s[3]); x1 = Math.max(x1, s[0], s[3]);
      y0 = Math.min(y0, s[1], s[4]); y1 = Math.max(y1, s[1], s[4]);
      h = Math.max(h, s[2], s[5]);
    });
    this.bounds = [x0, y0, x1, y1]; this.height = h;
    this.cx = (x0 + x1) / 2; this.cy = (y0 + y1) / 2;
    this.r = Math.hypot(x1 - x0, y1 - y0) / 2;
    // Ordre de tracé « traceur » : le sol d'abord, puis de gauche à droite.
    this.segs.sort((a, b) => (Math.min(a[2], a[5]) > 0) - (Math.min(b[2], b[5]) > 0) || (a[0] + a[1]) - (b[0] + b[1]));
    return this;
  }
}

export function villa() {
  const m = new Model('Villa R+1'), H = 3;
  [[0, 0, 18, 0], [0, 0, 0, 12], [18, 0, 18, 12], [0, 12, 8, 12], [9.2, 12, 18, 12]].forEach((w) => m.wall(...w, H));
  [[0, 5, 2, 5], [3, 5, 6, 5], [6, 0, 6, 5], [10, 0, 10, 5], [6, 3, 7.5, 3], [8.5, 3, 10, 3],
    [12, 0, 12, 2.5], [12, 3.5, 12, 8.5], [12, 9.5, 12, 12], [12, 6, 18, 6]].forEach((w) => m.wall(...w, H, 1));
  m.door(8, 12, 1.2, 0, -HALF_PI).door(2, 5, 1, 0, -HALF_PI).door(7.5, 3, 1, 0, -HALF_PI)
    .door(12, 2.5, 1, HALF_PI, 0).door(12, 8.5, 1, HALF_PI, 0);
  m.win(1, 12, 7, 12, 0.1, 2.6).win(1.5, 0, 4.5, 0, 1.1, 2.2).win(7, 0, 9, 0, 1.6, 2.2)
    .win(18, 1.5, 18, 4.5, 1, 2.2).win(18, 7.5, 18, 10.5, 1, 2.2).win(13.5, 12, 16.5, 12, 1, 2.2);
  m.box(-0.4, -0.4, 18.8, 12.8, 3, 3.3, 3, 'slab').box(4, 0, 14, 7, 3.3, 6.3, 2, 'upper').box(3.6, -0.6, 15, 8.2, 6.3, 6.6, 2, 'slab');
  m.win(5, 7, 11, 7, 3.6, 5.9).win(18, 1, 18, 6, 3.8, 5.8).box(10, 12, 7, 3, 2.6, 2.8, 3, 'pergola');
  m.box(2, 14, 8, 3.5, -1.2, 0, 1, 'pool').palm(-2.5, 15).palm(20, 15.5, 1.1).palm(-2, -2.5, 0.9);
  m.label(3, 2.5, 'Cuisine').label(5, 8.5, 'Séjour').label(8, 1.5, 'SdB').label(15, 3, 'Ch. 1')
    .label(15, 9, 'Ch. 2').label(6, 15.75, 'Piscine').label(13.5, 13.5, 'Terrasse');
  m.dim(0, -1.6, 18, -1.6, '18,00').dim(-1.6, 0, -1.6, 12, '12,00').dim(2, 18.4, 10, 18.4, '8,00');
  return m.done();
}

export function tower(F = 7) {
  const m = new Model(`Immeuble R+${F - 1}`), h = 3.2, H = F * h;
  [[0, 0, 16, 0], [16, 0, 16, 11], [16, 11, 0, 11], [0, 11, 0, 0]].forEach((w) => m.wall(...w, H));
  m.box(6.5, 3.5, 3, 4, 0, H + 2.4, 0, 'core');
  for (let i = 0; i < 8; i++) m.line(6.8, 3.8 + i * 0.42, 0, 8.2, 3.8 + i * 0.42, 0, 5);
  [[6, 0, 6, 3], [6, 4.2, 6, 11], [10, 0, 10, 6], [10, 7, 10, 11], [0, 5.5, 3, 5.5], [13, 5.5, 16, 5.5]].forEach((w) => m.wall(...w, h, 1));
  m.door(6, 3, 1, HALF_PI, Math.PI).door(10, 6, 1, HALF_PI, 0);
  for (let k = 1; k <= F; k++) {
    const z = k * h;
    m.rect(0, 0, 16, 11, z, 2);
    if (k < F) {
      m.box(1, 11, 14, 1.4, z - 0.2, z, 3, 'balcony');
      for (let x = 1.2; x < 15; x += 3.4) m.win(x, 0, x + 1.6, 0, z - h + 0.9, z - 0.6).win(x, 11, x + 1.6, 11, z - h + 0.3, z - 0.5);
    }
  }
  for (let x = 2; x < 16; x += 2) m.line(x, 0, 0, x, 0, H, 3).line(x, 11, 0, x, 11, H, 3);
  for (let y = 2.75; y < 11; y += 2.75) m.line(0, y, 0, 0, y, H, 3).line(16, y, 0, 16, y, H, 3);
  m.box(-0.3, -0.3, 16.6, 11.6, H, H + 1, 2, 'slab');
  m.label(3, 2.7, 'Ch. A').label(3, 8.3, 'Séjour A').label(8, 9.2, 'Palier').label(14.5, 2.7, 'Ch. B').label(12.5, 8.8, 'Séjour B');
  m.dim(0, -1.6, 16, -1.6, '16,00').dim(-1.6, 0, -1.6, 11, '11,00');
  return m.done();
}

export function site() {
  const m = new Model('Plan de masse', 2);
  [13, 16].forEach((y) => m.line(-3, y, 0, 47, y, 0, 1));
  [[13, 16], [29, 32]].forEach(([a, b]) => { m.line(a, -3, 0, a, 33, 0, 1); m.line(b, -3, 0, b, 33, 0, 1); });
  for (let x = -2; x < 47; x += 3) m.line(x, 14.5, 0, x + 1.4, 14.5, 0, 5);
  [[1, 1, 7, 5, 9], [1, 8, 11, 4, 6], [17, 1, 5, 11, 18], [23.5, 2, 4.5, 4.5, 12], [33, 1, 10, 11, 4],
    [1, 17, 5, 5, 7], [7, 17, 5, 5, 7], [1, 24, 5, 5, 7], [7, 24, 5, 5, 7], [33, 17, 4, 12, 15], [39, 17, 4, 12, 21]]
    .forEach(([x, y, w, d, h]) => m.box(x, y, w, d, 0, h, 0, 'building'));
  m.rect(17, 17, 11, 12, 0, 1);
  [[19.5, 19.5], [25.5, 19.5], [22.5, 23], [19.5, 26.5], [25.5, 26.5]].forEach(([x, y]) => m.palm(x, y, 0.8));
  m.label(6.5, 3.5, 'Lot A').label(19.5, 6.5, 'Lot B').label(38, 6.5, 'Lot C').label(6.5, 23, 'Lot D').label(22.5, 30, 'Parc').label(38, 30.5, 'Lot F');
  m.dim(0, -4.5, 44, -4.5, '44,00').dim(-4.5, 0, -4.5, 30, '30,00');
  return m.done();
}

/** Esquisse générée à partir des réponses de la fiche projet (surface, niveaux, type). */
export function sketch({ surface = 180, levels = 1, kind = 'villa' } = {}) {
  const lv = Math.max(1, levels), h = 3.1;
  const area = Math.max(40, surface / lv);
  const w = Math.round(Math.sqrt(area * 1.5) * 10) / 10, d = Math.round((area / w) * 10) / 10;
  const m = new Model(kind === 'immeuble' ? `Immeuble R+${lv - 1}` : lv > 1 ? `Villa R+${lv - 1}` : 'Villa plain-pied');
  m.wall(0, 0, w, 0, h).wall(w, 0, w, d, h).wall(w, d, w * 0.55, d, h).wall(w * 0.45, d, 0, d, h).wall(0, d, 0, 0, h);
  m.door(w * 0.45, d, (w * 0.1), 0, -HALF_PI);
  m.wall(w * 0.4, 0, w * 0.4, d * 0.4, h, 1).wall(w * 0.4, d * 0.55, w * 0.4, d, h, 1).wall(w * 0.4, d * 0.5, w, d * 0.5, h, 1);
  m.door(w * 0.4, d * 0.4, d * 0.15, HALF_PI, 0);
  m.win(w * 0.08, d, w * 0.32, d, 0.2, 2.5).win(w * 0.6, 0, w * 0.9, 0, 1, 2.2).win(w, d * 0.15, w, d * 0.4, 1, 2.2);
  for (let k = 1; k < lv; k++) {
    const z = k * h;
    m.box(-0.3, -0.3, w + 0.6, d + 0.6, z - 0.25, z, 3, 'slab');
    m.wall(0, 0, w, 0, z + h, 2, z).wall(w, 0, w, d, z + h, 2, z).wall(w, d, 0, d, z + h, 2, z).wall(0, d, 0, 0, z + h, 2, z);
    m.win(w * 0.1, d, w * 0.45, d, z + 0.4, z + 2.4).win(w * 0.6, 0, w * 0.9, 0, z + 1, z + 2.2);
  }
  m.box(-0.5, -0.5, w + 1, d + 1, lv * h, lv * h + 0.35, 2, 'slab');
  m.label(w * 0.2, d * 0.3, 'Séjour').label(w * 0.7, d * 0.25, 'Ch. 1').label(w * 0.7, d * 0.75, 'Ch. 2');
  m.dim(0, -1.6, w, -1.6, w.toFixed(2).replace('.', ',')).dim(-1.6, 0, -1.6, d, d.toFixed(2).replace('.', ','));
  return m.done();
}
