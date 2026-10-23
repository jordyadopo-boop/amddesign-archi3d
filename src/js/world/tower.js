/**
 * La Tour AMD : 10 niveaux (sous-sol → R+8), façades vitrées, cage d'ascenseur ouverte par laquelle descend le drone.
 * Chaque niveau visité est une pièce de l'agence, liée à une section du site :
 *   R+8 atelier (services) · R+7 exposition (réalisations) · R+6 salle 3D (rendu) · R+5 étage en chantier (processus)
 *   R+3 salle de réunion (engagement) · R+1 archives de plans (FAQ) · RDC hall d'accueil (projet) · SS-1 fondations (contact)
 * Coordonnées locales : x ∈ [-13, 13], z ∈ [-10, 10] (façade sud = +z, côté caméra), cage x ∈ [5, 10], z ∈ [-8, -3].
 */
import * as THREE from 'three';
import { villa, tower as towerModel, site } from '../plan/models.js';

export const FH = 4.2;
export const LEVELS = { atelier: 8, expo: 7, salle3d: 6, chantier: 5, reunion: 3, archives: 1, hall: 0, soussol: -1 };
const W = 26, D = 20, HOLE = { x0: 5, x1: 10, z0: -8, z1: -3 };
export const SHAFT = { x: 7.5, z: -5.5 };
export const levelName = (L) => (L < 0 ? `SS${L}` : L === 0 ? 'RDC' : `R+${L}`);

export function createTower(kit, { x: TX, z: TZ, base = '/' }) {
  const { M, L, place, Bucket, lines, palmGeo, buildModel } = kit;
  const group = new THREE.Group();
  group.position.set(TX, 0, TZ);
  const tex = new THREE.TextureLoader();
  const loadTex = (f) => { const t = tex.load(base + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

  /** Plan 2D (traits du sol) d'un modèle, à plat dans XZ, centré, mis à l'échelle. */
  const planLines = (m, s, mat = L.plan) => {
    const p = [];
    for (const sg of m.segs) {
      const mode = sg[6] >> 1;
      if ((mode === 0 || mode === 2) && sg[2] <= 0 && sg[5] <= 0) p.push((sg[0] - m.cx) * s, 0, (sg[1] - m.cy) * s, (sg[3] - m.cx) * s, 0, (sg[4] - m.cy) * s);
    }
    return lines(p, mat);
  };
  const slabMat = (Lv) => (Lv === LEVELS.chantier ? M.raw : Lv < 0 ? M.basement : Lv === LEVELS.atelier || Lv === LEVELS.reunion ? M.oak : Lv === 0 ? M.stone : M.floor);

  // ---------- Structure ----------
  const shell = new Bucket();
  const glass = new Bucket();
  const lights = new Bucket();
  const mull = [];
  for (let Lv = -1; Lv <= 9; Lv++) {
    const y = Lv * FH;
    const sm = Lv === 9 ? M.dark : slabMat(Lv);
    if (Lv === -1 || Lv === 9) shell.add(sm, place(new THREE.BoxGeometry(W, 0.4, D), 0, y - 0.2, 0));
    else {
      // Dalle percée pour la cage d'ascenseur
      shell.add(sm, place(new THREE.BoxGeometry(HOLE.x0 + 13, 0.4, D), (-13 + HOLE.x0) / 2, y - 0.2, 0));
      shell.add(sm, place(new THREE.BoxGeometry(13 - HOLE.x1, 0.4, D), (HOLE.x1 + 13) / 2, y - 0.2, 0));
      shell.add(sm, place(new THREE.BoxGeometry(HOLE.x1 - HOLE.x0, 0.4, HOLE.z0 + 10), SHAFT.x, y - 0.2, (-10 + HOLE.z0) / 2));
      shell.add(sm, place(new THREE.BoxGeometry(HOLE.x1 - HOLE.x0, 0.4, 10 - HOLE.z1), SHAFT.x, y - 0.2, (HOLE.z1 + 10) / 2));
    }
    if (Lv === 9) break;
    // Allège sombre en nez de dalle (signature de la façade)
    if (Lv >= 0) {
      shell.add(M.dark, place(new THREE.BoxGeometry(W + 0.5, 0.7, 0.3), 0, y + 0.05, D / 2 + 0.15));
      shell.add(M.dark, place(new THREE.BoxGeometry(W + 0.5, 0.7, 0.3), 0, y + 0.05, -D / 2 - 0.15));
      shell.add(M.dark, place(new THREE.BoxGeometry(0.3, 0.7, D + 0.5), W / 2 + 0.15, y + 0.05, 0));
      shell.add(M.dark, place(new THREE.BoxGeometry(0.3, 0.7, D + 0.5), -W / 2 - 0.15, y + 0.05, 0));
    }
    const colMat = Lv === LEVELS.chantier ? M.raw : M.white;
    for (const cx of [-13, -6.5, 0, 6.5, 13]) for (const cz of [-10, 10]) shell.add(colMat, place(new THREE.BoxGeometry(0.55, FH, 0.55), cx, y + FH / 2, cz));
    for (const cz of [-3.3, 3.3]) for (const cx of [-13, 13]) shell.add(colMat, place(new THREE.BoxGeometry(0.55, FH, 0.55), cx, y + FH / 2, cz));
    const h = FH - 0.4, gy = y + 0.2 + h / 2;
    if (Lv < 0) {
      // Voiles de soutènement du sous-sol
      shell.add(M.basement, place(new THREE.BoxGeometry(W, FH, 0.4), 0, y + FH / 2, -D / 2));
      shell.add(M.basement, place(new THREE.BoxGeometry(0.4, FH, D), -W / 2, y + FH / 2, 0));
      shell.add(M.basement, place(new THREE.BoxGeometry(0.4, FH, D), W / 2, y + FH / 2, 0));
      shell.add(M.basement, place(new THREE.BoxGeometry(W, FH, 0.4), 0, y + FH / 2, D / 2));
    } else if (Lv !== LEVELS.chantier) {
      glass.add(M.pane, place(new THREE.BoxGeometry(W, h, 0.06), 0, gy, -D / 2));
      glass.add(M.pane, place(new THREE.BoxGeometry(0.06, h, D), -W / 2, gy, 0));
      glass.add(M.pane, place(new THREE.BoxGeometry(0.06, h, D), W / 2, gy, 0));
      if (Lv !== LEVELS.atelier) glass.add(M.pane, place(new THREE.BoxGeometry(W, h, 0.06), 0, gy, D / 2));
      for (let mx = -13; mx <= 13; mx += 2.6) mull.push(mx, y, D / 2 + 0.05, mx, y + FH, D / 2 + 0.05, mx, y, -D / 2 - 0.05, mx, y + FH, -D / 2 - 0.05);
      for (let mz = -10; mz <= 10; mz += 2.5) mull.push(W / 2 + 0.05, y, mz, W / 2 + 0.05, y + FH, mz, -W / 2 - 0.05, y, mz, -W / 2 - 0.05, y + FH, mz);
    }
    // Éclairage : réglettes au plafond (halo doré la nuit)
    if (Lv !== LEVELS.chantier) for (const lx of [-8, -1.5]) lights.add(Lv < 0 ? M.lamp : M.lamp, place(new THREE.BoxGeometry(Lv < 0 ? 5 : 3.6, 0.05, 0.25), lx, y + FH - 0.42, Lv < 0 ? 0 : 2));
  }
  // Couronne et arêtes lumineuses
  const top = 9 * FH;
  shell.add(M.dark, place(new THREE.BoxGeometry(18, 5, 13), -2, top + 2.5, -1));
  glass.add(M.glassLit, place(new THREE.BoxGeometry(18.2, 1.2, 13.2), -2, top + 2.6, -1));
  lights.add(M.led, place(new THREE.BoxGeometry(18.4, 0.18, 0.18), -2, top + 5.05, 5.6));
  for (const sx of [-13.3, 13.3]) lights.add(M.led, place(new THREE.BoxGeometry(0.2, top + 0.2, 0.2), sx, top / 2, D / 2 + 0.3));
  shell.build(group); glass.build(group, { shadows: false }); lights.build(group, { shadows: false });
  group.add(lines(mull, Object.assign(L.gold.clone(), { opacity: 0.3 })));
  // Cage d'ascenseur : rails dorés et nez de trémie
  const rails = [];
  for (const [rx, rz] of [[HOLE.x0, HOLE.z0], [HOLE.x1, HOLE.z0], [HOLE.x0, HOLE.z1], [HOLE.x1, HOLE.z1]]) rails.push(rx, -FH, rz, rx, top, rz);
  for (let Lv = 0; Lv <= 8; Lv++) {
    const y = Lv * FH + 0.02;
    rails.push(HOLE.x0, y, HOLE.z0, HOLE.x1, y, HOLE.z0, HOLE.x1, y, HOLE.z0, HOLE.x1, y, HOLE.z1, HOLE.x1, y, HOLE.z1, HOLE.x0, y, HOLE.z1, HOLE.x0, y, HOLE.z1, HOLE.x0, y, HOLE.z0);
  }
  group.add(lines(rails, Object.assign(L.plan.clone(), { opacity: 0.85 })));

  // ---------- Pièces ----------
  const room = (Lv) => { const g = new THREE.Group(); g.position.y = Lv * FH; group.add(g); return g; };

  // R+8 · Atelier de conception : tables à dessin, plans épinglés, maquette
  {
    const g = room(LEVELS.atelier), b = new Bucket();
    [-9.5, -4.5, 0.5].forEach((tx) => {
      for (const [lx, lz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) b.add(M.dark, place(new THREE.BoxGeometry(0.06, 0.95, 0.06), tx + lx, 0.47, 1 + lz));
      b.add(M.paper, place(new THREE.BoxGeometry(2.6, 0.05, 1.6), tx, 1.0, 1, 0, -0.22));
      b.add(M.leather, place(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 12), tx, 0.72, 2.3));
      b.add(M.dark, place(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), tx, 0.36, 2.3));
      const pl = planLines(villa(), 0.11);
      pl.position.set(tx, 1.04, 1); pl.rotation.x = -0.22; g.add(pl);
    });
    [-11, -7.4, -3.8, -0.2].forEach((px, i) => {
      b.add(M.paper, place(new THREE.BoxGeometry(2.6, 1.7, 0.03), px + 1.3, 2.2, -9.6));
      const pl = planLines(i % 2 ? site() : towerModel(), i % 2 ? 0.045 : 0.1);
      pl.position.set(px + 1.3, 2.2, -9.57); pl.rotation.x = Math.PI / 2; g.add(pl);
    });
    b.add(M.white, place(new THREE.BoxGeometry(2.4, 0.9, 1.6), -8, 0.45, 6.5));
    b.add(M.oak, place(new THREE.BoxGeometry(3.4, 0.08, 1.8), 1, 0.8, 6.8));
    b.build(g);
    const maq = buildModel(towerModel(9), { lit: 0.7, edges: 0.6, plan: false });
    maq.group.scale.setScalar(0.06); maq.group.position.set(-8, 0.9, 6.5); g.add(maq.group);
    // Garde-corps de la terrasse d'entrée (façade sud ouverte)
    g.add(lines([-13, 1.05, 10.2, 13, 1.05, 10.2, -13, 0.5, 10.2, 13, 0.5, 10.2], Object.assign(L.plan.clone(), { opacity: 0.7 })));
  }

  // R+7 · Salle d'exposition : maquettes sous vitrine, tirages encadrés
  {
    const g = room(LEVELS.expo), b = new Bucket(), v = new Bucket();
    const minis = [[villa(), 0.07], [towerModel(7), 0.045], [site(), 0.028], [towerModel(4), 0.05]];
    [-10, -6, -2, 2].forEach((px, i) => {
      b.add(M.white, place(new THREE.BoxGeometry(1.4, 1.05, 1.4), px, 0.52, 2));
      v.add(M.vitrine, place(new THREE.BoxGeometry(1.42, 1.1, 1.42), px, 1.6, 2));
      const mm = buildModel(minis[i][0], { lit: 0.6, edges: 0.5, plan: i === 2 });
      mm.group.scale.setScalar(minis[i][1]); mm.group.position.set(px, 1.06, 2); g.add(mm.group);
      lights.add(M.lamp, place(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), px, FH - 0.42, 2));
    });
    for (let i = 0; i < 4; i++) {
      const fx = -10.5 + i * 3.6;
      b.add(M.dark, place(new THREE.BoxGeometry(2.9, 2, 0.08), fx, 2.15, -9.6));
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.8), new THREE.MeshStandardMaterial({ map: loadTex(`img/projet-${i + 1}.svg`), roughness: 0.9 }));
      art.position.set(fx, 2.15, -9.54); g.add(art);
    }
    for (let i = 0; i < 2; i++) {
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.8), new THREE.MeshStandardMaterial({ map: loadTex(`img/projet-${i + 5}.svg`), roughness: 0.9 }));
      art.position.set(-12.6, 2.15, -4 + i * 4.5); art.rotation.y = Math.PI / 2; g.add(art);
    }
    b.build(g); v.build(g, { shadows: false });
  }

  // R+6 · Salle 3D : la pièce est à moitié filaire, à moitié réelle (plan de coupe qui balaie)
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), TX);
  const cutFrame = lines([0, 0, -9.5, 0, FH - 0.4, -9.5, 0, FH - 0.4, -9.5, 0, FH - 0.4, 9.5, 0, FH - 0.4, 9.5, 0, 0, 9.5, 0, 0, 9.5, 0, 0, -9.5], Object.assign(L.plan.clone(), { opacity: 1 }));
  {
    const g = room(LEVELS.salle3d), b = new Bucket(), edges = [];
    const add = (mat, geo) => { b.add(mat, geo); edges.push(new THREE.EdgesGeometry(geo, 25)); };
    add(M.fabric, place(new THREE.BoxGeometry(3.2, 0.45, 1), -7, 0.42, -2));
    add(M.fabric, place(new THREE.BoxGeometry(3.2, 0.6, 0.25), -7, 0.85, -2.45));
    add(M.fabric, place(new THREE.BoxGeometry(0.25, 0.55, 1), -8.55, 0.6, -2));
    add(M.fabric, place(new THREE.BoxGeometry(0.25, 0.55, 1), -5.45, 0.6, -2));
    add(M.oak, place(new THREE.BoxGeometry(1.8, 0.08, 1), -7, 0.42, -0.2));
    add(M.leather, place(new THREE.BoxGeometry(1, 0.45, 1), -4, 0.4, 0.3, -0.6));
    add(M.oak, place(new THREE.BoxGeometry(2.6, 0.08, 1.3), -1, 0.78, 1.5));
    for (const [cx, cz] of [[-2, 0.5], [0, 0.5], [-2, 2.5], [0, 2.5]]) add(M.dark, place(new THREE.BoxGeometry(0.5, 0.9, 0.5), cx, 0.45, cz));
    for (let s = 0; s < 4; s++) add(M.oak, place(new THREE.BoxGeometry(3, 0.05, 0.4), -10.2, 0.4 + s * 0.6, -9.3));
    add(M.white, place(new THREE.BoxGeometry(0.4, 0.9, 0.4), -11.5, 0.45, 3));
    add(M.dark, place(new THREE.BoxGeometry(3.4, 1.9, 0.08), -7, 2, -9.5));
    add(M.oak, place(new THREE.BoxGeometry(6, 0.02, 3.4), -6.5, 0.01, -1));
    b.build(g, { clip });
    g.add(new THREE.LineSegments(
      edges.reduce((acc, e) => { acc.push(...e.attributes.position.array); return acc; }, []).length
        ? new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edges.flatMap((e) => [...e.attributes.position.array]), 3))
        : new THREE.BufferGeometry(),
      Object.assign(L.plan.clone(), { opacity: 0.95 })));
    const pb = new Bucket(); palmGeo(pb, -11.5, 3, 0.32); pb.build(g, { clip });
    g.add(cutFrame);
  }

  // R+5 · Étage en chantier : béton brut, attentes d'armatures, palettes, coffrages, baladeuses
  {
    const g = room(LEVELS.chantier), b = new Bucket(), reb = [];
    for (const cx of [-13, -6.5, 0, 6.5, 13]) for (const cz of [-10, 10]) for (let k = 0; k < 4; k++) reb.push(cx - 0.18 + (k % 2) * 0.36, FH, cz - 0.18 + (k > 1) * 0.36, cx - 0.18 + (k % 2) * 0.36, FH + 1.2, cz - 0.18 + (k > 1) * 0.36);
    [[-9, 3], [-7.5, 3], [-9, 4.3], [2, -6], [3.3, -6]].forEach(([px, pz], i) => {
      b.add(M.wood, place(new THREE.BoxGeometry(1.2, 0.15, 1.2), px, 0.08, pz));
      for (let k = 0; k < 3 + (i % 2); k++) b.add(M.stone, place(new THREE.BoxGeometry(1.1, 0.22, 1.1), px, 0.27 + k * 0.23, pz));
    });
    for (let i = 0; i < 4; i++) b.add(M.wood, place(new THREE.BoxGeometry(1.2, 2.4, 0.05), -2 + i * 1.3, 1.2, -9, 0, 0.18));
    b.add(M.gold, place(new THREE.BoxGeometry(1.6, 0.9, 0.9), -4, 0.45, 5));
    // Échafaudage en façade sud et baladeuses
    for (let sx = -13; sx <= 13; sx += 2.6) reb.push(sx, 0, 11.2, sx, FH + 2, 11.2, sx, 0, 12.2, sx, FH + 2, 12.2);
    for (const sy of [0.1, 1.1, 2.1, 3.1]) reb.push(-13, sy, 11.2, 13, sy, 11.2, -13, sy, 12.2, 13, sy, 12.2);
    for (let i = 0; i < 6; i++) {
      const bx = -11 + i * 4;
      reb.push(bx, FH - 0.3, 0, bx + 4, FH - 0.3, 0);
      lights.add(M.led, place(new THREE.SphereGeometry(0.12, 8, 6), bx, FH - 0.6, 0));
    }
    b.build(g);
    g.add(lines(reb, Object.assign(L.gold.clone(), { opacity: 0.9 })));
  }

  // R+4 et R+2 · plateaux de bureaux (traversés pendant la descente)
  for (const Lv of [4, 2]) {
    const g = room(Lv), b = new Bucket();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const dx = -11 + c * 3.6, dz = -6 + r * 4.5;
      b.add(M.oak, place(new THREE.BoxGeometry(2.8, 0.05, 1.2), dx, 0.75, dz));
      b.add(M.dark, place(new THREE.BoxGeometry(0.9, 0.5, 0.05), dx, 1.05, dz - 0.4));
      b.add(M.fabric, place(new THREE.BoxGeometry(0.55, 0.9, 0.55), dx, 0.45, dz + 0.9));
    }
    b.build(g);
  }

  // R+3 · Salle de réunion : grande table, 4 suspensions dorées (les 4 valeurs)
  {
    const g = room(LEVELS.reunion), b = new Bucket();
    b.add(M.wood, place(new THREE.BoxGeometry(7.5, 0.08, 2.2), -4, 0.76, -1));
    b.add(M.dark, place(new THREE.BoxGeometry(1, 0.72, 1), -6.5, 0.36, -1));
    b.add(M.dark, place(new THREE.BoxGeometry(1, 0.72, 1), -1.5, 0.36, -1));
    for (let i = 0; i < 5; i++) for (const side of [-1, 1]) {
      b.add(M.fabric, place(new THREE.BoxGeometry(0.6, 0.5, 0.6), -7.2 + i * 1.6, 0.25, -1 + side * 1.6));
      b.add(M.fabric, place(new THREE.BoxGeometry(0.6, 0.6, 0.1), -7.2 + i * 1.6, 0.8, -1 + side * 1.9));
    }
    [-7, -5, -3, -1].forEach((lx) => {
      b.add(M.gold, place(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), lx, FH - 1.1, -1));
      b.add(M.gold, place(new THREE.ConeGeometry(0.4, 0.35, 16, 1, true), lx, FH - 1.9, -1));
      lights.add(M.lamp, place(new THREE.CircleGeometry(0.36, 16), lx, FH - 2.07, -1, 0, Math.PI / 2));
    });
    b.add(M.dark, place(new THREE.BoxGeometry(4, 2.2, 0.08), -4, 2, -9.5));
    b.add(M.oak, place(new THREE.BoxGeometry(5, 0.8, 0.5), -4, 0.4, -9.2));
    b.build(g);
    const pb = new Bucket(); palmGeo(pb, -11.5, -8, 0.35); palmGeo(pb, 2.5, 7.5, 0.3); pb.build(g);
  }

  // R+1 · Archives : rayonnages de plans roulés, meuble à plans, table de lecture
  {
    const g = room(LEVELS.archives), b = new Bucket();
    for (let r = 0; r < 4; r++) {
      const rz = -8.5 + r * 2.6;
      for (let s = 0; s < 4; s++) b.add(M.oak, place(new THREE.BoxGeometry(8, 0.05, 0.9), -7, 0.3 + s * 0.65, rz));
      for (const ex of [-11, -3]) b.add(M.dark, place(new THREE.BoxGeometry(0.06, 2.5, 0.9), ex, 1.25, rz));
      for (let s = 0; s < 4; s++) for (let k = 0; k < 9; k++) b.add(k % 3 ? M.paper : M.stone, place(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8), -10.5 + k * 0.9, 0.4 + s * 0.65, rz, 0, Math.PI / 2));
    }
    b.add(M.dark, place(new THREE.BoxGeometry(3, 0.9, 1.5), 1.5, 0.45, 4));
    b.add(M.oak, place(new THREE.BoxGeometry(2.8, 0.06, 1.6), -6, 0.8, 5.5));
    b.add(M.paper, place(new THREE.BoxGeometry(1.8, 0.01, 1.2), -6, 0.84, 5.5));
    b.build(g);
    const pl = planLines(villa(), 0.08); pl.position.set(-6, 0.86, 5.5); g.add(pl);
  }

  // RDC · Hall d'accueil : comptoir au logo doré, palmiers, entrée vitrée
  {
    const g = room(LEVELS.hall), b = new Bucket();
    b.add(M.white, place(new THREE.BoxGeometry(6, 1.1, 1.2), -2, 0.55, -3));
    b.add(M.gold, place(new THREE.BoxGeometry(6.05, 0.08, 1.25), -2, 1.12, -3));
    b.add(M.dark, place(new THREE.BoxGeometry(8, 3, 0.1), -2, 1.9, -9.4));
    b.add(M.fabric, place(new THREE.BoxGeometry(2.6, 0.45, 0.9), -9, 0.3, 4));
    b.add(M.fabric, place(new THREE.BoxGeometry(2.6, 0.5, 0.2), -9, 0.7, 3.6));
    b.build(g);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.84), new THREE.MeshBasicMaterial({ map: loadTex('brand/logo-light.svg'), transparent: true }));
    logo.position.set(-2, 2.1, -9.33); g.add(logo);
    const logo2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.88), new THREE.MeshBasicMaterial({ map: loadTex('brand/logo.svg'), transparent: true }));
    logo2.position.set(-2, 0.6, -2.38); g.add(logo2);
    const pb = new Bucket(); [[-12, -8], [-12, 8.5], [11.5, 8.5]].forEach(([px, pz]) => palmGeo(pb, px, pz, 0.62)); pb.build(g);
  }

  // SS-1 · Les fondations : parking, dalle vitrée sur les pieux, terre
  {
    const g = room(LEVELS.soussol), b = new Bucket(), mk = [];
    for (let i = -4; i <= 4; i++) mk.push(i * 2.8, 0.02, 2, i * 2.8, 0.02, 7.5);
    mk.push(-12, 0.02, 0.6, 12, 0.02, 0.6);
    for (const px of [-10, -5, 0]) for (const pz of [-7.5, -3.5]) {
      b.add(M.raw, place(new THREE.CylinderGeometry(0.45, 0.45, 9, 12), px, -4.7, pz));
      mk.push(px - 0.45, -0.4, pz, px - 0.45, -9, pz, px + 0.45, -0.4, pz, px + 0.45, -9, pz);
    }
    b.add(M.raw, place(new THREE.BoxGeometry(12.5, 0.6, 6.5), -5, -0.6, -5.5));
    const earth = new THREE.Mesh(new THREE.BoxGeometry(W, 9.5, D), new THREE.MeshStandardMaterial({ color: 0x2b2117, roughness: 1, side: THREE.BackSide }));
    earth.position.set(0, -5.2, 0); g.add(earth);
    b.build(g);
    g.add(lines(mk, Object.assign(L.plan.clone(), { opacity: 0.9 })));
    const v = new Bucket();
    v.add(M.vitrine, place(new THREE.BoxGeometry(12.6, 0.05, 7), -5, 0.02, -5.5));
    v.build(g, { shadows: false });
  }

  /** Point de vue de chaque pièce (coordonnées monde). */
  const W3 = (x, y, z) => [TX + x, y, TZ + z];
  const shot = (name, pos, look) => {
    const y = LEVELS[name] * FH;
    return { pos: W3(pos[0], y + pos[1], pos[2]), look: W3(look[0], y + look[1], look[2]) };
  };
  const shots = {
    atelier: shot('atelier', [-11.5, 1.8, 8.6], [-2, 1, -4]),
    expo: shot('expo', [-11, 1.7, 8.4], [-3, 1.5, -6]),
    salle3d: shot('salle3d', [-10.8, 2, 8.2], [-3, 0.9, -2]),
    chantier: shot('chantier', [-12, 1.7, 8.8], [3, 2, -4]),
    reunion: shot('reunion', [-11.5, 1.8, 7.8], [-3, 0.9, -2]),
    archives: shot('archives', [-11, 1.7, 8.8], [-4, 1.2, -3]),
    hall: shot('hall', [-9, 1.7, 9], [-2, 1.6, -5]),
    soussol: shot('soussol', [-11, 1.6, 7.5], [-4, -3.5, -4]),
  };
  /** Trajet entre deux pièces : on rejoint la cage, on descend, on ressort dans la pièce. */
  const shaftVia = (a, b) => {
    const ya = LEVELS[a] * FH, yb = LEVELS[b] * FH;
    return {
      via: [W3(1, ya + 1.9, 1), W3(SHAFT.x, ya + 1.4, SHAFT.z + 1.2), W3(SHAFT.x, yb + 2.4, SHAFT.z + 1.2), W3(0, yb + 1.9, 2)],
      viaLook: [W3(SHAFT.x, ya + 0.5, SHAFT.z), W3(SHAFT.x, ya - 4, SHAFT.z - 0.2), W3(SHAFT.x, yb - 0.5, SHAFT.z - 0.3), W3(-3, yb + 1.2, -3)],
    };
  };

  function update(t, zoneP) {
    const cut = THREE.MathUtils.lerp(-12, 11, THREE.MathUtils.smoothstep(zoneP.salle3d ?? 0.4, 0, 1));
    clip.constant = TX + cut;
    cutFrame.position.x = cut;
  }

  return { group, shots, shaftVia, update, top };
}
