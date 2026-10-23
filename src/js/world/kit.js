/**
 * Boîte à outils du monde 3D : matières (palette de la plaquette), fusion des géométries par matière,
 * traits, palmiers, et constructeurs de modèles (plan/models.js) en 3D pleine ou en croquis filaire.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createKit() {
  // ---------- Matières (palette de la plaquette) ----------
  const M = {
    white: new THREE.MeshStandardMaterial({ color: 0xf2eee7, roughness: 0.84 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x9a968f, roughness: 0.92 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc8902e, metalness: 0.6, roughness: 0.35, emissive: 0xc8902e, emissiveIntensity: 0 }),
    glassLit: new THREE.MeshStandardMaterial({ color: 0x141b22, metalness: 0.8, roughness: 0.15, emissive: 0xffb347, emissiveIntensity: 0 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x141b22, metalness: 0.85, roughness: 0.12 }),
    cross: new THREE.MeshBasicMaterial({ color: 0xffc46a }),
    water: new THREE.MeshStandardMaterial({ color: 0x2c7f8c, roughness: 0.06, metalness: 0.3, emissive: 0x19a7bd, emissiveIntensity: 0 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3b5236, roughness: 0.8, side: THREE.DoubleSide }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6e5d48, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x3f4b37, roughness: 1 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x2a2927, roughness: 1 }),
    road: new THREE.MeshStandardMaterial({ color: 0x1f1f1e, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.9 }),
    // Intérieurs de la tour
    pane: new THREE.MeshStandardMaterial({ color: 0x2a3a44, metalness: 0.6, roughness: 0.08, transparent: true, opacity: 0.28, depthWrite: false }),
    vitrine: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a5a3e, roughness: 0.7 }),
    oak: new THREE.MeshStandardMaterial({ color: 0xb08a62, roughness: 0.75 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x6f6a63, roughness: 0.55, metalness: 0.05 }),
    raw: new THREE.MeshStandardMaterial({ color: 0x8b877f, roughness: 0.95 }),
    basement: new THREE.MeshStandardMaterial({ color: 0x45423e, roughness: 0.95 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.95 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
    led: new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  };
  const L = {
    gold: new THREE.LineBasicMaterial({ color: 0xc8902e, transparent: true, opacity: 0.55, fog: true }),
    plan: new THREE.LineBasicMaterial({ color: 0xe0ad55, transparent: true, opacity: 0.9 }),
    sketch: new THREE.LineBasicMaterial({ color: 0xf4efe6, transparent: true, opacity: 0.8 }),
    sketchGold: new THREE.LineBasicMaterial({ color: 0xc8902e, transparent: true, opacity: 0.9 }),
  };

  // ---------- Outils de construction ----------
  const dummy = new THREE.Object3D();
  const place = (geo, x, y, z, ry = 0, rx = 0, rz = 0) => {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    return geo.applyMatrix4(dummy.matrix);
  };
  /** Regroupe des géométries par matière, puis fusionne : un seul appel de rendu par matière. */
  class Bucket {
    constructor() { this.parts = new Map(); }
    add(mat, geo) { if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(geo); }
    build(group, { shadows = true, clip = null } = {}) {
      for (const [mat, geos] of this.parts) {
        const mesh = new THREE.Mesh(mergeGeometries(geos), clip ? Object.assign(mat.clone(), { clippingPlanes: [clip] }) : mat);
        mesh.castShadow = shadows; mesh.receiveShadow = true;
        group.add(mesh);
      }
      return group;
    }
  }
  const lines = (pts, mat) => {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, mat);
  };
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  function palmGeo(b, x, z, s) {
    const lean = (rnd() - 0.5) * 0.25;
    b.add(M.trunk, place(new THREE.CylinderGeometry(0.11 * s, 0.2 * s, 5.2 * s, 6), x, 2.6 * s, z, 0, lean, lean));
    const topX = x + Math.sin(lean) * 2.6 * s, topZ = z - Math.sin(lean) * 2.6 * s, topY = 5.15 * s;
    for (let i = 0; i < 8; i++) {
      const g = new THREE.PlaneGeometry(0.7 * s, 3 * s, 1, 6);
      const p = g.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const t = (p.getY(v) / (3 * s)) + 0.5;
        p.setY(v, t * 3 * s); p.setZ(v, -t * t * 1.4 * s); p.setX(v, p.getX(v) * (1 - t * 0.7));
      }
      g.computeVertexNormals();
      dummy.position.set(topX, topY, topZ); dummy.rotation.set(-1.05, i / 8 * Math.PI * 2 + rnd() * 0.3, 0, 'YXZ'); dummy.updateMatrix();
      b.add(M.leaf, g.applyMatrix4(dummy.matrix));
    }
  }

  /**
   * Construit un modèle en 3D pleine : murs, volumes, baies vitrées, palmiers, + traits dorés.
   * Retourne { group, solids, edges, plan } ; plan = traits du plan au sol (tracés au traceur).
   */
  function buildModel(m, { x = 0, z = 0, rot = 0, mat = M.white, lit = 0.6, edges = 0.45, clip = null, plan = true } = {}) {
    const group = new THREE.Group();
    group.position.set(x, 0, z); group.rotation.y = rot;
    const b = new Bucket();
    const ox = m.cx, oy = m.cy;
    for (const [x1, y1, x2, y2, h, z0] of m.walls) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      b.add(mat, place(new THREE.BoxGeometry(len + 0.25, h - z0, 0.25), (x1 + x2) / 2 - ox, (z0 + h) / 2, (y1 + y2) / 2 - oy, -Math.atan2(y2 - y1, x2 - x1)));
    }
    for (const [bx, by, w, d, z0, z1, , role] of m.boxes) {
      const cx = bx + w / 2 - ox, cz = by + d / 2 - oy;
      if (role === 'pool') {
        b.add(M.water, place(new THREE.BoxGeometry(w, 0.05, d), cx, -0.08, cz));
        b.add(M.stone, place(new THREE.BoxGeometry(w + 1.2, 0.06, d + 1.2), cx, -0.12, cz));
      } else if (role === 'pergola') {
        for (let i = 0; i <= 7; i++) b.add(M.gold, place(new THREE.BoxGeometry(0.12, 0.2, d), bx + i * (w / 7) - ox, z1, cz));
        [[bx, by + d], [bx + w, by + d]].forEach(([px, py]) => b.add(M.gold, place(new THREE.BoxGeometry(0.15, z1, 0.15), px - ox, z1 / 2, py - oy)));
      } else {
        b.add(role === 'building' && mat === M.white ? M.white : mat, place(new THREE.BoxGeometry(w, Math.max(0.05, z1 - z0), d), cx, (z0 + z1) / 2, cz));
        // Bandeaux vitrés sur les immeubles du quartier
        if (role === 'building' && z1 > 5) {
          for (let f = 1.3; f < z1 - 0.8; f += 3.2) b.add(rnd() < lit ? M.glassLit : M.glass, place(new THREE.BoxGeometry(w + 0.08, 1.3, d + 0.08), cx, f + 0.65, cz));
        }
      }
    }
    for (const [x1, y1, x2, y2, zb, zt] of m.wins) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      b.add(rnd() < lit ? M.glassLit : M.glass, place(new THREE.BoxGeometry(len, zt - zb, 0.34), (x1 + x2) / 2 - ox, (zb + zt) / 2, (y1 + y2) / 2 - oy, -Math.atan2(y2 - y1, x2 - x1)));
    }
    for (const [px, py, s] of m.palms) palmGeo(b, px - ox, py - oy, s);
    const solids = b.build(new THREE.Group(), { clip });
    group.add(solids);

    // Traits : arêtes 3D (dorées) et plan au sol (2D)
    const e = [], p = [];
    for (const sg of m.segs) {
      const mode = sg[6] >> 1;
      const a = [sg[0] - ox, sg[2], sg[1] - oy], c = [sg[3] - ox, sg[5], sg[4] - oy];
      if (mode !== 2 && !(sg[2] === 0 && sg[5] === 0)) e.push(...a, ...c);
      if ((mode === 0 || mode === 2) && sg[2] <= 0 && sg[5] <= 0) p.push(a[0], 0.04, a[2], c[0], 0.04, c[2]);
    }
    const edgeLines = lines(e, L.gold.clone());
    edgeLines.material.opacity = edges;
    group.add(edgeLines);
    let planLines = null;
    if (plan) { planLines = lines(p, L.plan.clone()); group.add(planLines); }
    return { group, solids, edges: edgeLines, plan: planLines };
  }

  /** Croquis filaire (comme sur la plaquette) : traits qui dépassent, sans matière. */
  function buildSketch(m, { x = 0, z = 0, rot = 0, s = 1, gold = false } = {}) {
    const pts = [];
    const ox = m.cx, oy = m.cy;
    for (const sg of m.segs) {
      if ((sg[6] >> 1) === 2) continue;
      const a = new THREE.Vector3(sg[0] - ox, sg[2], sg[1] - oy), c = new THREE.Vector3(sg[3] - ox, sg[5], sg[4] - oy);
      const d = c.clone().sub(a);
      if (d.lengthSq() < 1e-6) continue;
      const over = d.clone().setLength(0.5 + rnd() * 0.9);
      pts.push(...a.clone().sub(over).toArray(), ...c.clone().add(over).toArray());
    }
    const l = lines(pts, gold ? L.sketchGold : L.sketch);
    l.position.set(x, 0, z); l.rotation.y = rot; l.scale.setScalar(s);
    return l;
  }
  return { M, L, place, Bucket, lines, rnd, palmGeo, buildModel, buildSketch };
}
