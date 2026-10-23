/**
 * Boîte à outils du monde 3D, style « plans transparents argentiques » :
 * aucune surface pleine — des volumes en verre fantôme (lumière additive, reflet sur les bords),
 * des traits argent, des accents or, des espaces verts teintés. Pas d'ombres, pas de tri de transparence :
 * le rendu reste net sous tous les angles.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Uniformes partagés par toutes les matières fantômes (brouillard, intensité globale). */
export const SHARED = {
  fogNear: { value: 150 },
  fogFar: { value: 520 },
  fade: { value: 1 },
};

const GHOST_VS = /* glsl */`
  uniform float fogNear, fogFar;
  varying vec3 vN; varying vec3 vV; varying float vFog;
  #include <clipping_planes_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mvPosition.xyz);
    vFog = smoothstep(fogNear, fogFar, -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }`;
const GHOST_FS = /* glsl */`
  uniform vec3 color; uniform float opacity, rim, glow, fade;
  varying vec3 vN; varying vec3 vV; varying float vFog;
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float a = (opacity + rim * pow(f, 2.2)) * (1.0 - vFog) * fade;
    gl_FragColor = vec4(color * (1.0 + glow), a);
  }`;

/** Verre fantôme : faces très légères, plus présentes sur les bords (effet maquette en verre). */
export function ghost(color, { opacity = 0.05, rim = 0.18, glow = 0, edge = 0xd9dee3, edgeOpacity = 0.5 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) }, opacity: { value: opacity }, rim: { value: rim }, glow: { value: glow },
      fogNear: SHARED.fogNear, fogFar: SHARED.fogFar, fade: SHARED.fade,
    },
    vertexShader: GHOST_VS, fragmentShader: GHOST_FS,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  m.userData.edge = edge; m.userData.edgeOpacity = edgeOpacity;
  return m;
}

/** Trait additif (argent, or, vert…) qui s'efface dans le brouillard noir. */
export const stroke = (color, opacity = 0.5) => new THREE.LineBasicMaterial({
  color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
});

export function createKit() {
  // ---------- Matières (palette : argent, or, vert d'eau, cyan) ----------
  const M = {
    white: ghost(0xdfe3e6, { opacity: 0.025, rim: 0.1 }),
    concrete: ghost(0xc4c8cc, { opacity: 0.018, rim: 0.07, edgeOpacity: 0.4 }),
    dark: ghost(0x9aa0a6, { opacity: 0.03, rim: 0.12, edgeOpacity: 0.35 }),
    gold: ghost(0xc8902e, { opacity: 0.12, rim: 0.3, edge: 0xe0ad55, edgeOpacity: 0.85 }),
    glass: ghost(0x9fc6d6, { opacity: 0.015, rim: 0.12, edge: 0xb9d4de, edgeOpacity: 0.32 }),
    glassLit: ghost(0xffc46a, { opacity: 0.05, rim: 0.22, edge: 0xffd08a, edgeOpacity: 0.4 }),
    cross: ghost(0xffc46a, { opacity: 0.6, rim: 0.15, glow: 0, edge: 0xffe0a8, edgeOpacity: 1 }),
    water: ghost(0x4fb3c8, { opacity: 0.16, rim: 0.2, edge: 0x7fd0e0, edgeOpacity: 0.6 }),
    leaf: ghost(0x79b86f, { opacity: 0.07, rim: 0.2, edge: 0x8fca84, edgeOpacity: 0.45 }),
    trunk: ghost(0xb59b78, { opacity: 0.12, rim: 0.1, edge: 0xb59b78, edgeOpacity: 0.4 }),
    grass: ghost(0x5d9a55, { opacity: 0.07, rim: 0, edge: 0x6fae66, edgeOpacity: 0.35 }),
    road: ghost(0x8a8f94, { opacity: 0.03, rim: 0, edge: 0x8a8f94, edgeOpacity: 0.2 }),
    stone: ghost(0xd9d2c5, { opacity: 0.05, rim: 0.15 }),
    pane: ghost(0x9fc6d6, { opacity: 0.012, rim: 0.12, edge: 0xb9d4de, edgeOpacity: 0.25 }),
    vitrine: ghost(0xffffff, { opacity: 0.02, rim: 0.35, edge: 0xffffff, edgeOpacity: 0.4 }),
    wood: ghost(0xc9a27a, { opacity: 0.06, rim: 0.18, edge: 0xd2ae88, edgeOpacity: 0.5 }),
    oak: ghost(0xd8b48a, { opacity: 0.06, rim: 0.18, edge: 0xdcbc96, edgeOpacity: 0.5 }),
    fabric: ghost(0xb7b0a8, { opacity: 0.06, rim: 0.2, edge: 0xc9c2b9, edgeOpacity: 0.45 }),
    leather: ghost(0xd08a4a, { opacity: 0.08, rim: 0.2, edge: 0xe0a060, edgeOpacity: 0.55 }),
    paper: ghost(0xf4f1ec, { opacity: 0.08, rim: 0.1, edge: 0xf4f1ec, edgeOpacity: 0.55 }),
    raw: ghost(0xa9a49c, { opacity: 0.05, rim: 0.2, edge: 0xbab4ab, edgeOpacity: 0.45 }),
    basement: ghost(0x8a8580, { opacity: 0.03, rim: 0.12, edge: 0x9a958e, edgeOpacity: 0.35 }),
    floor: ghost(0xc4c8cc, { opacity: 0.02, rim: 0.05, edge: 0xc4c8cc, edgeOpacity: 0.3 }),
    lamp: ghost(0xffe2b0, { opacity: 0.3, rim: 0.1, glow: 0, edge: 0xffe2b0, edgeOpacity: 0.9 }),
    led: ghost(0xffb347, { opacity: 0.55, rim: 0.1, glow: 0, edge: 0xffc46a, edgeOpacity: 1 }),
    car: ghost(0xb9d4de, { opacity: 0.05, rim: 0.25, edge: 0xc9dde5, edgeOpacity: 0.55 }),
  };
  const L = {
    silver: stroke(0xd9dee3, 0.45),
    gold: stroke(0xc8902e, 0.55),
    plan: stroke(0xe0ad55, 0.85),
    sketch: stroke(0xf4efe6, 0.75),
    sketchGold: stroke(0xc8902e, 0.9),
    green: stroke(0x7fbf73, 0.55),
    road: stroke(0xe9ecef, 0.5),
    tile: stroke(0xc4c8cc, 0.12),
    cyan: stroke(0x7fd0e0, 0.6),
  };

  // ---------- Outils ----------
  const dummy = new THREE.Object3D();
  const place = (geo, x, y, z, ry = 0, rx = 0, rz = 0) => {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    return geo.applyMatrix4(dummy.matrix);
  };
  const lines = (pts, mat) => {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, mat);
  };
  const edgeCache = new Map();
  const edgeMat = (m) => {
    const key = `${m.userData.edge}|${m.userData.edgeOpacity}`;
    if (!edgeCache.has(key)) edgeCache.set(key, stroke(m.userData.edge ?? 0xd9dee3, m.userData.edgeOpacity ?? 0.5));
    return edgeCache.get(key);
  };
  /** Regroupe par matière, fusionne, et ajoute les arêtes (le « trait » de la maquette). */
  class Bucket {
    constructor() { this.parts = new Map(); }
    add(mat, geo) {
      const g = geo.index ? geo : geo;
      if (!this.parts.has(mat)) this.parts.set(mat, []);
      this.parts.get(mat).push(g);
      return this;
    }
    build(group, { edges = true, clip = null } = {}) {
      for (const [mat, geos] of this.parts) {
        const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
        const m = clip ? Object.assign(mat.clone(), { clippingPlanes: [clip], clipping: true }) : mat;
        if (clip) { m.uniforms = { ...mat.uniforms }; m.userData = mat.userData; }
        group.add(new THREE.Mesh(merged, m));
        if (edges && mat.userData.edgeOpacity > 0) group.add(new THREE.LineSegments(new THREE.EdgesGeometry(merged, 28), edgeMat(mat)));
      }
      return group;
    }
  }
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
      dummy.position.set(topX, topY, topZ); dummy.rotation.set(-1.05, i / 8 * Math.PI * 2 + rnd() * 0.3, 0, 'YXZ'); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      b.add(M.leaf, g.applyMatrix4(dummy.matrix));
    }
  }
  /** Arbre feuillu stylisé : tronc + houppier facetté. */
  function treeGeo(b, x, z, s = 1) {
    b.add(M.trunk, place(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.4 * s, 5), x, 1.2 * s, z));
    const crown = new THREE.IcosahedronGeometry(1.7 * s, 0);
    crown.scale(1, 0.85 + rnd() * 0.3, 1);
    b.add(M.leaf, place(crown, x, 3.3 * s, z, rnd() * 3));
  }

  /**
   * Construit un modèle (plan/models.js) en volumes fantômes + plan au sol.
   * Retourne { group, solids, edges, plan }.
   */
  function buildModel(m, { x = 0, z = 0, rot = 0, mat = M.white, lit = 0.6, clip = null, plan = true } = {}) {
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
        b.add(M.water, place(new THREE.BoxGeometry(w, Math.max(0.05, z1 - z0), d), cx, (z0 + z1) / 2, cz));
      } else if (role === 'pergola') {
        for (let i = 0; i <= 7; i++) b.add(M.gold, place(new THREE.BoxGeometry(0.12, 0.2, d), bx + i * (w / 7) - ox, z1, cz));
        [[bx, by + d], [bx + w, by + d]].forEach(([px, py]) => b.add(M.gold, place(new THREE.BoxGeometry(0.15, z1, 0.15), px - ox, z1 / 2, py - oy)));
      } else {
        b.add(mat, place(new THREE.BoxGeometry(w, Math.max(0.05, z1 - z0), d), cx, (z0 + z1) / 2, cz));
        if (role === 'building' && z1 > 5) {
          for (let f = 1.3; f < z1 - 0.8; f += 3.2) b.add(rnd() < lit ? M.glassLit : M.glass, place(new THREE.BoxGeometry(w + 0.08, 1.3, d + 0.08), cx, f + 0.65, cz));
        }
      }
    }
    for (const [x1, y1, x2, y2, zb, zt] of m.wins) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      b.add(rnd() < lit ? M.glassLit : M.glass, place(new THREE.BoxGeometry(len, zt - zb, 0.3), (x1 + x2) / 2 - ox, (zb + zt) / 2, (y1 + y2) / 2 - oy, -Math.atan2(y2 - y1, x2 - x1)));
    }
    for (const [px, py, s] of m.palms) palmGeo(b, px - ox, py - oy, s);
    const solids = b.build(new THREE.Group(), { clip });
    group.add(solids);
    const p = [];
    for (const sg of m.segs) {
      const mode = sg[6] >> 1;
      if ((mode === 0 || mode === 2) && sg[2] <= 0 && sg[5] <= 0) p.push(sg[0] - ox, 0.06, sg[1] - oy, sg[3] - ox, 0.06, sg[4] - oy);
    }
    let planLines = null;
    if (plan) { planLines = lines(p, L.plan.clone()); group.add(planLines); }
    return { group, solids, plan: planLines };
  }

  /** Croquis filaire : traits qui dépassent, sans matière. */
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
    const l = lines(pts, gold ? L.sketchGold.clone() : L.sketch.clone());
    l.position.set(x, 0, z); l.rotation.y = rot; l.scale.setScalar(s);
    return l;
  }

  return { M, L, place, Bucket, lines, rnd, palmGeo, treeGeo, buildModel, buildSketch, ghost, stroke };
}
