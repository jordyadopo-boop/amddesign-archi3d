/**
 * La Tour AMD — une forme qui n'existe pas : dix plateaux en « super-ellipse » qui pivotent et se renflent
 * d'un étage à l'autre (la tour se vrille), une couronne en spirale, un noyau vitré où deux cabines d'ascenseur
 * montent et descendent, et un ascenseur panoramique extérieur. Tout est en plans transparents :
 * façades vitrées (montants, lisses), carreaux au sol, mobilier en verre fantôme.
 *
 * Pièces visitées (une par section) :
 *   R+8 atelier · R+7 exposition · R+6 salle 3D · R+5 étage en chantier · R+3 réunion · R+1 archives · RDC hall · SS-1 fondations
 * Le drone sort par la façade, descend en spirale le long de la tour et rentre par l'étage suivant.
 */
import * as THREE from 'three';
import { villa, tower as towerModel, site } from '../plan/models.js';

export const FH = 4.2;
export const LEVELS = { atelier: 8, expo: 7, salle3d: 6, chantier: 5, reunion: 3, archives: 1, hall: 0, soussol: -1 };
const A = 13, B = 10, N = 4, TWIST = 0.17;
export const levelName = (L) => (L < 0 ? `SS${L}` : L === 0 ? 'RDC' : `R+${L}`);
const angleOf = (L) => L * TWIST;
const scaleOf = (L) => 1 + 0.12 * Math.sin(Math.PI * (L + 1) / 10);

/** Contour en super-ellipse (coins très arrondis). */
function outline(s, n = 64) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    pts.push([s * A * Math.sign(c) * Math.abs(c) ** (2 / N), s * B * Math.sign(sn) * Math.abs(sn) ** (2 / N)]);
  }
  return pts;
}
/** Demi-largeur de la super-ellipse à une ordonnée donnée. */
const halfWidth = (a, b, z) => a * Math.max(0, 1 - Math.abs(z / b) ** N) ** (1 / N);

export function createTower(kit, { x: TX, z: TZ, base = '/' }) {
  const { M, L, place, Bucket, lines, palmGeo, buildModel, buildSketch } = kit;
  const group = new THREE.Group();
  group.position.set(TX, 0, TZ);
  const tex = new THREE.TextureLoader();
  const loadTex = (f) => { const t = tex.load(base + f); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const seg = (arr, a, b) => arr.push(...a, ...b);
  const top = 9 * FH;

  /** Plan 2D (traits du sol) d'un modèle, à plat, centré, mis à l'échelle. */
  const planLines = (m, s, mat = L.plan) => {
    const p = [];
    for (const sg of m.segs) {
      const mode = sg[6] >> 1;
      if ((mode === 0 || mode === 2) && sg[2] <= 0 && sg[5] <= 0) p.push((sg[0] - m.cx) * s, 0, (sg[1] - m.cy) * s, (sg[3] - m.cx) * s, 0, (sg[4] - m.cy) * s);
    }
    return lines(p, mat);
  };

  // ---------- Plateaux : dalle, façade vitrée, montants, carreaux, réglettes ----------
  const levels = {};
  for (let Lv = -1; Lv <= 9; Lv++) {
    const lg = new THREE.Group();
    lg.position.y = Lv * FH; lg.rotation.y = angleOf(Lv);
    group.add(lg); levels[Lv] = lg;
    const s = Lv < 0 ? 1 : scaleOf(Lv);
    const ring = outline(s);
    // Dalle
    const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const slab = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false, curveSegments: 1 });
    slab.rotateX(-Math.PI / 2); slab.translate(0, -0.35, 0);
    const sb = new Bucket();
    sb.add(Lv === 9 ? M.dark : M.concrete, slab);
    if (Lv === 9) { sb.build(lg); break; }
    // Façade : vitrage en panneaux, montants et lisses
    const open = Lv === LEVELS.chantier;
    const h0 = 0.05, h1 = FH - 0.4;
    const pos = [], nor = [], mul = [], edge = [];
    ring.forEach(([x1, z1], i) => {
      const [x2, z2] = ring[(i + 1) % ring.length];
      const nx = z2 - z1, nz = -(x2 - x1), ln = Math.hypot(nx, nz) || 1;
      if (!open && Lv >= 0) {
        pos.push(x1, h0, z1, x2, h0, z2, x2, h1, z2, x1, h0, z1, x2, h1, z2, x1, h1, z1);
        for (let k = 0; k < 6; k++) nor.push(nx / ln, 0, nz / ln);
        if (i % 2 === 0) seg(mul, [x1, h0, z1], [x1, h1, z1]);
        seg(mul, [x1, 1.0, z1], [x2, 1.0, z2]);
      }
      seg(edge, [x1, FH - 0.36, z1], [x2, FH - 0.36, z2]);
    });
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      lg.add(new THREE.Mesh(g, Lv === 0 ? M.glass : M.pane));
      lg.add(lines(mul, Object.assign(L.silver.clone(), { opacity: 0.32 })));
    }
    lg.add(lines(edge, Object.assign(L.silver.clone(), { opacity: 0.25 })));
    // Voiles du sous-sol
    if (Lv < 0) {
      const wall = [];
      ring.forEach(([x1, z1], i) => { const [x2, z2] = ring[(i + 1) % ring.length]; seg(wall, [x1, 0, z1], [x1, FH, z1]); seg(wall, [x1, 0, z1], [x2, 0, z2]); });
      lg.add(lines(wall, Object.assign(L.silver.clone(), { opacity: 0.18 })));
    }
    // Carreaux du sol
    const tiles = [], step = Lv === LEVELS.chantier ? 2.4 : 0.9, a = A * s * 0.985, b = B * s * 0.985;
    for (let z = -b + step / 2; z < b; z += step) { const w = halfWidth(a, b, z); seg(tiles, [-w, 0.02, z], [w, 0.02, z]); }
    for (let x = -a + step / 2; x < a; x += step) { const w = halfWidth(b, a, x); seg(tiles, [x, 0.02, -w], [x, 0.02, w]); }
    lg.add(lines(tiles, Lv < 0 ? Object.assign(L.tile.clone(), { opacity: 0.07 }) : L.tile));
    // Réglettes lumineuses au plafond
    if (!open) for (const [lx, lz] of [[-7, 4], [7, 4], [-7, -5], [7, -5]]) sb.add(M.lamp, place(new THREE.BoxGeometry(3.4, 0.04, 0.18), lx, FH - 0.45, lz));
    sb.build(lg);
  }

  // ---------- Couronne en spirale et arêtes lumineuses ----------
  const crown = [], ledRing = [];
  for (let k = 0; k <= 7; k++) {
    const s = scaleOf(9) * (1 - k * 0.12), y = top + k * 1.5, a = angleOf(9 + k * 0.6);
    const ring = outline(s, 48).map(([x, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)]);
    ring.forEach((p, i) => { seg(k === 0 ? ledRing : crown, p, ring[(i + 1) % ring.length]); if (k < 7 && i % 6 === 0) { const s2 = scaleOf(9) * (1 - (k + 1) * 0.12), a2 = angleOf(9 + (k + 1) * 0.6); const q = outline(s2, 48)[i]; seg(crown, p, [q[0] * Math.cos(a2) + q[1] * Math.sin(a2), y + 1.5, -q[0] * Math.sin(a2) + q[1] * Math.cos(a2)]); } });
  }
  seg(crown, [0, top + 10.5, 0], [0, top + 22, 0]);
  group.add(lines(crown, Object.assign(L.gold.clone(), { opacity: 0.7 })), lines(ledRing, Object.assign(L.plan.clone(), { opacity: 1 })));
  // Arêtes vrillées : on relie les « coins » de chaque plateau d'un étage à l'autre
  const spine = [];
  for (const i of [8, 24, 40, 56]) for (let Lv = 0; Lv < 9; Lv++) {
    const p = outline(scaleOf(Lv))[i], q = outline(scaleOf(Lv + 1))[i];
    const a1 = angleOf(Lv), a2 = angleOf(Lv + 1);
    seg(spine, [p[0] * Math.cos(a1) + p[1] * Math.sin(a1), Lv * FH, -p[0] * Math.sin(a1) + p[1] * Math.cos(a1)],
      [q[0] * Math.cos(a2) + q[1] * Math.sin(a2), (Lv + 1) * FH, -q[0] * Math.sin(a2) + q[1] * Math.cos(a2)]);
  }
  group.add(lines(spine, Object.assign(L.plan.clone(), { opacity: 0.75 })));

  // ---------- Noyau vitré et ses deux ascenseurs ----------
  const core = new Bucket(), coreL = [];
  core.add(M.glass, place(new THREE.BoxGeometry(6, top + FH, 5), 0, (top - FH) / 2, 0));
  for (const [cx, cz] of [[-3, -2.5], [3, -2.5], [3, 2.5], [-3, 2.5]]) seg(coreL, [cx, -FH, cz], [cx, top + 3, cz]);
  core.build(group);
  group.add(lines(coreL, Object.assign(L.cyan.clone(), { opacity: 0.5 })));
  const cabin = () => {
    const g = new THREE.Group(), b = new Bucket();
    b.add(M.gold, place(new THREE.BoxGeometry(2.3, 2.6, 2.3), 0, 1.3, 0));
    b.add(M.lamp, place(new THREE.BoxGeometry(1.6, 0.04, 1.6), 0, 2.55, 0));
    b.build(g); group.add(g); return g;
  };
  const cabins = [cabin(), cabin()];
  cabins[0].position.set(-1.5, 0, 0); cabins[1].position.set(1.5, 0, 0);
  // Ascenseur panoramique extérieur (tube vitré + passerelles)
  const PX = 17.5, PZ = -8;
  const tube = [], bridges = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; seg(tube, [PX + 1.8 * Math.cos(a), -FH, PZ + 1.8 * Math.sin(a)], [PX + 1.8 * Math.cos(a), top + 2, PZ + 1.8 * Math.sin(a)]); }
  for (let Lv = -1; Lv <= 9; Lv++) {
    const y = Lv * FH;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2; seg(tube, [PX + 1.8 * Math.cos(a), y, PZ + 1.8 * Math.sin(a)], [PX + 1.8 * Math.cos(b), y, PZ + 1.8 * Math.sin(b)]); }
    if (Lv >= 0 && Lv < 9) { const d = Math.hypot(PX, PZ), ux = -PX / d, uz = -PZ / d; for (const o of [-0.8, 0.8]) seg(bridges, [PX + ux * 1.8 - uz * o, y, PZ + uz * 1.8 + ux * o], [PX + ux * 6 - uz * o, y, PZ + uz * 6 + ux * o]); }
  }
  group.add(lines(tube, Object.assign(L.cyan.clone(), { opacity: 0.45 })), lines(bridges, Object.assign(L.silver.clone(), { opacity: 0.4 })));
  const pano = new THREE.Group(), pb = new Bucket();
  pb.add(M.glassLit, place(new THREE.CylinderGeometry(1.5, 1.5, 3, 16, 1, true), 0, 1.5, 0));
  pb.add(M.gold, place(new THREE.CylinderGeometry(1.55, 1.55, 0.15, 16), 0, 0.05, 0));
  pb.add(M.gold, place(new THREE.CylinderGeometry(1.55, 1.55, 0.15, 16), 0, 3, 0));
  pb.build(pano); pano.position.set(PX, 0, PZ); group.add(pano);

  // ---------- Pièces (dans le repère de chaque plateau ; le noyau occupe le centre) ----------
  const room = (Lv) => { const g = new THREE.Group(); levels[Lv].add(g); return g; };
  const plant = (b, x, z, s = 0.35) => { b.add(M.stone, place(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 10), x, 0.3, z)); palmGeo(b, x, z, s); };

  // R+8 · Atelier de conception
  {
    const g = room(LEVELS.atelier), b = new Bucket();
    [[-9, 1, 0.2], [-6.5, -4, -0.3], [6.5, -4.5, 0.4], [8.5, 1, -0.1]].forEach(([tx, tz, r]) => {
      for (const [lx, lz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) b.add(M.dark, place(new THREE.BoxGeometry(0.06, 0.95, 0.06), tx + lx, 0.47, tz + lz, r));
      b.add(M.paper, place(new THREE.BoxGeometry(2.6, 0.04, 1.6), tx, 1.0, tz, r, -0.22));
      b.add(M.leather, place(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 12), tx, 0.72, tz + 1.4));
      const pl = planLines(villa(), 0.11); pl.position.set(tx, 1.03, tz); pl.rotation.set(-0.22, r, 0, 'YXZ'); g.add(pl);
    });
    [-7, -3.6, 3.6, 7].forEach((px, i) => {
      b.add(M.paper, place(new THREE.BoxGeometry(2.6, 1.7, 0.03), px, 1.9, -7.4));
      b.add(M.dark, place(new THREE.BoxGeometry(0.05, 1.1, 0.05), px, 0.55, -7.4));
      const pl = planLines(i % 2 ? site() : towerModel(), i % 2 ? 0.045 : 0.1); pl.position.set(px, 1.9, -7.37); pl.rotation.x = Math.PI / 2; g.add(pl);
    });
    b.add(M.white, place(new THREE.BoxGeometry(3.4, 0.8, 1.8), 4.5, 0.4, 5.5));
    b.add(M.dark, place(new THREE.BoxGeometry(2, 0.9, 1.2), -10.5, 0.45, -3));
    plant(b, -10.5, 5); plant(b, 10.5, -5);
    b.build(g);
    const maq = buildSketch(towerModel(9), { gold: true }); maq.scale.setScalar(0.07); maq.position.set(4.5, 0.82, 5.5); g.add(maq);
  }

  // R+7 · Salle d'exposition : maquettes sous vitrine, tirages
  {
    const g = room(LEVELS.expo), b = new Bucket(), v = new Bucket();
    const minis = [[villa(), 0.07], [towerModel(7), 0.045], [site(), 0.028], [towerModel(4), 0.05], [villa(), 0.06]];
    [[-8, 2.5], [-6.5, -3.5], [6.5, -3.5], [8, 2.5], [-1, 6]].forEach(([px, pz], i) => {
      b.add(M.white, place(new THREE.BoxGeometry(1.4, 1.05, 1.4), px, 0.52, pz));
      v.add(M.vitrine, place(new THREE.BoxGeometry(1.42, 1.1, 1.42), px, 1.6, pz));
      const mm = buildModel(minis[i][0], { lit: 0.6, plan: i === 2 });
      mm.group.scale.setScalar(minis[i][1]); mm.group.position.set(px, 1.06, pz); g.add(mm.group);
    });
    for (let i = 0; i < 4; i++) {
      const fx = -7.5 + i * (i > 1 ? 4.6 : 3.6) + (i > 1 ? 3 : 0);
      b.add(M.dark, place(new THREE.BoxGeometry(2.9, 2, 0.08), fx, 1.95, -7.6));
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.8), new THREE.MeshBasicMaterial({ map: loadTex(`img/projet-${i + 1}.svg`), transparent: true, opacity: 0.75, depthWrite: false }));
      art.position.set(fx, 1.95, -7.54); g.add(art);
    }
    b.build(g); v.build(g);
  }

  // R+6 · Salle 3D : table holographique où le duplex se construit
  const holo = new THREE.Group();
  {
    const g = room(LEVELS.salle3d), b = new Bucket();
    b.add(M.dark, place(new THREE.CylinderGeometry(1.6, 1.8, 0.9, 32), -5.5, 0.45, 2.5));
    b.add(M.lamp, place(new THREE.CylinderGeometry(1.55, 1.55, 0.03, 32), -5.5, 0.92, 2.5));
    b.add(M.fabric, place(new THREE.BoxGeometry(3.2, 0.45, 1), -8.5, 0.32, -2.5, 0.4));
    b.add(M.fabric, place(new THREE.BoxGeometry(3.2, 0.6, 0.25), -8.7, 0.75, -3, 0.4));
    b.add(M.leather, place(new THREE.BoxGeometry(1, 0.45, 1), -2, 0.3, 5.5, -0.6));
    b.add(M.fabric, place(new THREE.BoxGeometry(2.8, 0.45, 1), 6, 0.32, 3.5, -0.3));
    b.add(M.oak, place(new THREE.BoxGeometry(6, 0.02, 3.4), -7, 0.01, 0));
    for (const [sx, sz] of [[-4, -7.6], [0.5, -7.8], [5, -7.6]]) b.add(M.dark, place(new THREE.BoxGeometry(3.6, 2.1, 0.08), sx, 1.7, sz));
    for (let k = 0; k < 4; k++) b.add(M.oak, place(new THREE.BoxGeometry(3, 0.05, 0.4), 9, 0.4 + k * 0.6, -5, 0.6));
    plant(b, 10, 2); plant(b, -11, 4);
    b.build(g);
    const V = villa();
    const hm = buildSketch(V, { gold: true }); hm.scale.setScalar(0.12);
    const hs = buildModel(V, { lit: 0.9, plan: true }); hs.group.scale.setScalar(0.12);
    holo.add(hm, hs.group); holo.position.set(-5.5, 1.05, 2.5); holo.userData.solid = hs.solids;
    g.add(holo);
    // Faisceau de projection
    const beam = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; seg(beam, [-5.5 + 1.5 * Math.cos(a), 0.95, 2.5 + 1.5 * Math.sin(a)], [-5.5 + 0.2 * Math.cos(a), 2.6, 2.5 + 0.2 * Math.sin(a)]); }
    g.add(lines(beam, Object.assign(L.plan.clone(), { opacity: 0.25 })));
  }

  // R+5 · Étage en chantier : poteaux bruts, attentes, palettes, coffrages, filets, baladeuses
  {
    const g = room(LEVELS.chantier), b = new Bucket(), reb = [];
    const s = scaleOf(LEVELS.chantier);
    outline(s, 16).forEach(([x, z]) => {
      b.add(M.raw, place(new THREE.BoxGeometry(0.5, FH, 0.5), x * 0.92, FH / 2, z * 0.92));
      for (let k = 0; k < 4; k++) seg(reb, [x * 0.92 - 0.15 + (k % 2) * 0.3, FH, z * 0.92 - 0.15 + (k > 1) * 0.3], [x * 0.92 - 0.15 + (k % 2) * 0.3, FH + 1.3, z * 0.92 - 0.15 + (k > 1) * 0.3]);
    });
    [[-8, 3], [-6.6, 3], [-8, 4.4], [6, -5], [7.4, -5], [6.5, 4]].forEach(([px, pz], i) => {
      b.add(M.wood, place(new THREE.BoxGeometry(1.2, 0.15, 1.2), px, 0.08, pz));
      for (let k = 0; k < 3 + (i % 3); k++) b.add(M.stone, place(new THREE.BoxGeometry(1.1, 0.22, 1.1), px, 0.27 + k * 0.23, pz));
    });
    for (let i = 0; i < 5; i++) b.add(M.wood, place(new THREE.BoxGeometry(1.2, 2.4, 0.05), -6 + i * 1.3, 1.2, -7, 0, 0.18));
    b.add(M.gold, place(new THREE.BoxGeometry(1.6, 0.9, 0.9), -3, 0.45, 6));
    b.add(M.raw, place(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), 3, 0.5, 6.5));
    outline(s * 1.04, 48).forEach(([x, z], i, r) => { const [x2, z2] = r[(i + 1) % r.length]; for (const y of [0.5, 1.1]) seg(reb, [x, y, z], [x2, y, z2]); if (i % 3 === 0) seg(reb, [x, 0, z], [x, 1.2, z]); });
    for (let i = 0; i < 6; i++) { const bx = -9 + i * 3.6; seg(reb, [bx, FH - 0.3, 0.5], [bx + 3.6, FH - 0.3, 0.5]); b.add(M.led, place(new THREE.SphereGeometry(0.12, 8, 6), bx, FH - 0.6, 0.5)); }
    b.build(g);
    g.add(lines(reb, Object.assign(L.gold.clone(), { opacity: 0.85 })));
  }

  // R+4 et R+2 · plateaux de bureaux
  for (const Lv of [4, 2]) {
    const g = room(Lv), b = new Bucket();
    for (const [dx, dz] of [[-9, -4], [-9, 0], [-9, 4], [-5.5, -6], [-5.5, 5.5], [5.5, -6], [5.5, 5.5], [9, -4], [9, 0], [9, 4]]) {
      b.add(M.oak, place(new THREE.BoxGeometry(2.4, 0.05, 1.2), dx, 0.75, dz));
      b.add(M.dark, place(new THREE.BoxGeometry(0.9, 0.5, 0.05), dx, 1.05, dz - 0.4));
      b.add(M.fabric, place(new THREE.BoxGeometry(0.55, 0.9, 0.55), dx, 0.45, dz + 0.9));
    }
    plant(b, -11, -6); plant(b, 11, 6);
    b.build(g);
  }

  // R+3 · Salle de réunion : grande table, 4 suspensions dorées (les 4 valeurs)
  {
    const g = room(LEVELS.reunion), b = new Bucket();
    b.add(M.wood, place(new THREE.BoxGeometry(7.5, 0.08, 2.2), -4, 0.76, 5));
    b.add(M.dark, place(new THREE.BoxGeometry(1, 0.72, 1), -6.5, 0.36, 5));
    b.add(M.dark, place(new THREE.BoxGeometry(1, 0.72, 1), -1.5, 0.36, 5));
    for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
      b.add(M.fabric, place(new THREE.BoxGeometry(0.6, 0.5, 0.6), -7.2 + i * 1.6, 0.25, 5 + side * 1.6));
      b.add(M.fabric, place(new THREE.BoxGeometry(0.6, 0.6, 0.1), -7.2 + i * 1.6, 0.8, 5 + side * 1.9));
    }
    [-7, -5, -3, -1].forEach((lx) => {
      b.add(M.gold, place(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), lx, FH - 1.1, 5));
      b.add(M.gold, place(new THREE.ConeGeometry(0.4, 0.35, 16, 1, true), lx, FH - 1.9, 5));
      b.add(M.lamp, place(new THREE.CircleGeometry(0.36, 16), lx, FH - 2.07, 5, 0, Math.PI / 2));
    });
    b.add(M.dark, place(new THREE.BoxGeometry(4, 2.2, 0.08), -4, 1.9, -7.4));
    b.add(M.oak, place(new THREE.BoxGeometry(5, 0.8, 0.5), 6, 0.4, -6.4, 0.5));
    b.add(M.fabric, place(new THREE.BoxGeometry(2.6, 0.45, 0.9), 8, 0.3, 3, -0.4));
    plant(b, -11, -4); plant(b, 10.5, 6); plant(b, 2.5, 7.5, 0.3);
    b.build(g);
  }

  // R+1 · Archives : rayonnages de plans roulés, meubles à plans, table de lecture
  {
    const g = room(LEVELS.archives), b = new Bucket();
    for (const [x0, rz] of [[-10, -6.5], [-10, -4], [4, -6.5], [4, -4]]) {
      for (let s = 0; s < 4; s++) b.add(M.oak, place(new THREE.BoxGeometry(6, 0.05, 0.9), x0 + 3, 0.3 + s * 0.65, rz));
      for (const ex of [x0, x0 + 6]) b.add(M.dark, place(new THREE.BoxGeometry(0.06, 2.5, 0.9), ex, 1.25, rz));
      for (let s = 0; s < 4; s++) for (let k = 0; k < 6; k++) b.add(k % 3 ? M.paper : M.stone, place(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8), x0 + 0.5 + k * 1, 0.4 + s * 0.65, rz, 0, Math.PI / 2));
    }
    b.add(M.dark, place(new THREE.BoxGeometry(3, 0.9, 1.5), 7, 0.45, 4));
    b.add(M.oak, place(new THREE.BoxGeometry(2.8, 0.06, 1.6), -6, 0.8, 4.5));
    b.add(M.paper, place(new THREE.BoxGeometry(1.8, 0.01, 1.2), -6, 0.84, 4.5));
    plant(b, -11, 3); plant(b, 11, -2);
    b.build(g);
    const pl = planLines(villa(), 0.08); pl.position.set(-6, 0.86, 4.5); g.add(pl);
  }

  // RDC · Hall d'accueil : comptoir, logo doré, palmiers, portiques, auvent
  {
    const g = room(LEVELS.hall), b = new Bucket();
    b.add(M.white, place(new THREE.BoxGeometry(6, 1.1, 1.2), 0, 0.55, 5));
    b.add(M.gold, place(new THREE.BoxGeometry(6.05, 0.08, 1.25), 0, 1.12, 5));
    b.add(M.fabric, place(new THREE.BoxGeometry(2.6, 0.45, 0.9), -8, 0.3, 2));
    b.add(M.fabric, place(new THREE.BoxGeometry(2.6, 0.45, 0.9), 8, 0.3, 2));
    for (const tx of [-2.4, -0.8, 0.8, 2.4]) b.add(M.dark, place(new THREE.BoxGeometry(0.2, 1, 1.2), tx, 0.5, 7.5));
    b.add(M.glass, place(new THREE.BoxGeometry(8, 0.2, 4), 0, FH - 0.6, 12));
    b.build(g);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.84), new THREE.MeshBasicMaterial({ map: loadTex('brand/logo-light.svg'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    logo.position.set(0, 2.2, 2.55); g.add(logo);
    const pb2 = new Bucket(); [[-10, -5], [-10, 6], [10, 6], [10, -5]].forEach(([px, pz]) => plant(pb2, px, pz, 0.6)); pb2.build(g);
  }

  // SS-1 · Les fondations : parking, voitures, rampe, pieux sous le radier
  {
    const g = room(LEVELS.soussol), b = new Bucket(), mk = [];
    for (let i = -4; i <= 4; i++) { seg(mk, [i * 2.6, 0.02, 3], [i * 2.6, 0.02, 8]); seg(mk, [i * 2.6, 0.02, -8], [i * 2.6, 0.02, -3.2]); }
    seg(mk, [-11, 0.02, 1.5], [11, 0.02, 1.5]);
    for (const [cx, cz] of [[-6.5, 5.5], [-1.3, 5.5], [3.9, 5.5], [-6.5, -5.6], [6.5, -5.6]]) {
      b.add(M.car, place(new THREE.BoxGeometry(1.8, 0.75, 4.2), cx, 0.5, cz));
      b.add(M.car, place(new THREE.BoxGeometry(1.6, 0.55, 2.2), cx, 1.1, cz + 0.2));
    }
    b.add(M.raw, place(new THREE.BoxGeometry(4, 0.3, 9), 9.5, 2, 0, 0, 0.42));
    for (const px of [-9, -4.5, 4.5, 9]) for (const pz of [-6, 6]) {
      b.add(M.raw, place(new THREE.CylinderGeometry(0.45, 0.45, 10, 10), px, -5, pz));
      seg(mk, [px - 0.45, 0, pz], [px - 0.45, -10, pz]); seg(mk, [px + 0.45, 0, pz], [px + 0.45, -10, pz]);
    }
    b.add(M.raw, place(new THREE.BoxGeometry(22, 0.8, 16), 0, -0.4, 0));
    b.build(g);
    g.add(lines(mk, Object.assign(L.plan.clone(), { opacity: 0.8 })));
  }

  // ---------- Points de vue et trajets (coordonnées monde) ----------
  const toWorld = (Lf, x, y, z) => {
    const a = angleOf(Lf);
    return [TX + x * Math.cos(a) + z * Math.sin(a), y, TZ - x * Math.sin(a) + z * Math.cos(a)];
  };
  const shot = (name, pos, look) => {
    const Lv = LEVELS[name], y = Lv * FH;
    return { pos: toWorld(Lv, pos[0], y + pos[1], pos[2]), look: toWorld(Lv, look[0], y + look[1], look[2]) };
  };
  const shots = {
    atelier: shot('atelier', [-6.5, 2, 7.2], [1.5, 0.9, -3]),
    expo: shot('expo', [-6, 1.9, 7.2], [1, 1.2, -4]),
    salle3d: shot('salle3d', [-1.5, 2.1, 7.6], [-5.5, 1.1, 1.5]),
    chantier: shot('chantier', [-6, 1.8, 7.6], [2, 1.6, -3]),
    reunion: shot('reunion', [1.5, 2, 8], [-4, 1, 4]),
    archives: shot('archives', [-2, 1.9, 7.8], [-4, 1.1, -3]),
    hall: shot('hall', [-6, 1.8, 9.5], [0, 1.7, 3]),
    soussol: shot('soussol', [-7, 1.6, 8], [0, -2.5, 0]),
  };
  /** Sortie par la façade, descente en spirale autour de la tour, entrée par l'étage suivant. */
  const outsideVia = (a, b) => {
    const La = LEVELS[a], Lb = LEVELS[b], ya = La * FH, yb = Lb * FH, Lm = (La + Lb) / 2;
    return {
      via: [toWorld(La, -6, ya + 2.2, 17), toWorld(Lm + 0.4, -14, (ya + yb) / 2 + 2.5, 22), toWorld(Lb, -6, yb + 2.2, 17), toWorld(Lb, -6, yb + 1.9, 10.5)],
      viaLook: [toWorld(La, 0, ya + 1, 0), toWorld(Lm, 0, (ya + yb) / 2, 0), toWorld(Lb, 0, yb + 1.2, 0), toWorld(Lb, -2, yb + 1.2, 0)],
    };
  };
  const entryVia = (name) => {
    const Lv = LEVELS[name], y = Lv * FH;
    return { via: [toWorld(Lv, -8, y + 6, 46), toWorld(Lv, -7, y + 2.6, 18), toWorld(Lv, -6.5, y + 2.1, 10.5)],
      viaLook: [toWorld(Lv, 0, y + 3, 0), toWorld(Lv, 0, y + 1.5, 0), toWorld(Lv, 0, y + 1, -2)] };
  };
  /** Le drone est-il à l'intérieur de la tour ? (repère du plateau courant) */
  const inside = (p) => {
    const Lv = Math.floor((p.y + 0.3) / FH);
    if (Lv < -1 || Lv > 8) return null;
    const a = angleOf(Lv), dx = p.x - TX, dz = p.z - TZ;
    const x = dx * Math.cos(a) - dz * Math.sin(a), z = dx * Math.sin(a) + dz * Math.cos(a);
    const s = Lv < 0 ? 1 : scaleOf(Lv);
    return Math.abs(x / (A * s)) ** N + Math.abs(z / (B * s)) ** N < 1 ? Lv : null;
  };

  // ---------- Vie de la tour : ascenseurs, hologramme ----------
  const seqs = [[0, 3, 8, 5, 1, 6, -1, 2], [8, 4, 0, 7, 2, -1, 5, 3]];
  function update(t, zoneP) {
    cabins.forEach((c, i) => {
      const period = 4.2, k = Math.floor((t + i * 1.7) / period), f = ((t + i * 1.7) % period) / period;
      const from = seqs[i][k % 8], to = seqs[i][(k + 1) % 8];
      const e = THREE.MathUtils.smoothstep(f, 0.25, 0.85);
      c.position.y = (from + (to - from) * e) * FH;
    });
    const u = (Math.sin(t * 0.22) * 0.5 + 0.5);
    pano.position.y = THREE.MathUtils.smootherstep(u, 0, 1) * (9 * FH) - FH;
    holo.rotation.y = t * 0.35;
    const p = THREE.MathUtils.clamp((zoneP.salle3d ?? 0.5) * 1.4, 0, 1);
    holo.userData.solid.scale.y = Math.max(0.001, p);
  }

  return { group, shots, outsideVia, entryVia, update, inside, top };
}
