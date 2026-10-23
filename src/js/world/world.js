/**
 * Le monde d'AMD Design : une seule scène 3D, fixe derrière tout le site, que l'on survole en drone.
 * Les décors reprennent la plaquette : croquis filaires (l'idée), plans au sol, chantier et grue,
 * résidence de villas blanches et palmiers, bâtiment béton/verre à la croix dorée qui s'illumine la nuit (la réalité).
 *
 * API : const world = await createWorld(canvas, { mobile, reduced })
 *   world.setKeyframes([{ name, y }])  positions de défilement des sections (data-cam)
 *   world.setZoneProgress(name, p)     avancement local d'une section (chantier, coupe…)
 *   world.intro()                      → Promise : plan 2D tracé → murs qui montent → décollage
 *   world.skipIntro()
 *   window 'world:hud' { alt, heading, lat, lon, zone, night, speed }
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gsap } from '../core/motion.js';
import { villa, tower, site } from '../plan/models.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

/** Points de vue du drone, un par section (data-cam). night : 0 jour → 1 nuit. */
export const SHOTS = {
  residence: { pos: [44, 30, 52], look: [2, 1, 2], night: 0, label: 'Résidence · villas R+1' },
  croquis: { pos: [-48, 7, 10], look: [-74, 15, -22], night: 0.08, label: 'Croquis · l’idée' },
  phare: { pos: [36, 16, -14], look: [64, 15, -64], night: 0.3, label: 'Réalisations · quartier' },
  coupe: { pos: [80, 15, 26], look: [104, 6, 0], night: 0.38, label: 'Coupe 3D · plan → volume' },
  engagement: { pos: [-6, 34, 30], look: [0, 0, -6], night: 0.45, label: 'Résidence · vue aérienne' },
  chantier: { pos: [26, 18, 86], look: [58, 10, 54], night: 0.55, label: 'Chantier · bâtiment' },
  masse: { pos: [24, 175, 70], look: [24, 0, -2], night: 0.7, label: 'Plan de masse · urbanisme' },
  nuit: { pos: [70, 7, -18], look: [64, 15, -64], night: 1, label: 'La réalité · de nuit' },
  envol: { pos: [-20, 80, 110], look: [16, 0, 0], night: 1, label: 'Abidjan · Côte d’Ivoire' },
};

const ZONES = {
  residence: [0, 0], croquis: [-74, -24], phare: [64, -66], coupe: [104, 0], chantier: [58, 54],
};

const ABIDJAN = { lat: 5.36, lon: -4.008 };

export async function createWorld(canvas, { mobile = false, reduced = false } = {}) {
  // ---------- Rendu ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, window.innerWidth / window.innerHeight, 0.5, 900);

  // Ciel en dégradé (horizon doré → zénith), qui passe du jour à la nuit.
  const skyU = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
  }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0x000000, 120, 420);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2927, 1);
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  const moon = new THREE.DirectionalLight(0x8fa6d6, 0);
  moon.position.set(-80, 120, 40);
  scene.add(hemi, sun, sun.target, moon);

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

  // ---------- Sol, trame, routes ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(1000, 200, 0xc8902e, 0x5a5550);
  grid.material.transparent = true; grid.material.opacity = 0.16; grid.position.y = 0.01;
  const gridMajor = new THREE.GridHelper(1000, 20, 0xc8902e, 0xc8902e);
  gridMajor.material.transparent = true; gridMajor.material.opacity = 0.22; gridMajor.position.y = 0.015;
  scene.add(grid, gridMajor);

  const roads = new Bucket(), dashes = [];
  const road = (x1, z1, x2, z2, w = 9) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = -Math.atan2(z2 - z1, x2 - x1);
    roads.add(M.road, place(new THREE.BoxGeometry(len, 0.04, w), (x1 + x2) / 2, 0.02, (z1 + z2) / 2, ang));
    for (let t = 0; t < len; t += 6) {
      const a = t / len, c = Math.min(1, (t + 3) / len);
      dashes.push(lerp(x1, x2, a), 0.06, lerp(z1, z2, a), lerp(x1, x2, c), 0.06, lerp(z1, z2, c));
    }
  };
  road(-160, 26, 200, 26); road(30, -160, 30, 160); road(-160, -46, 200, -46); road(-30, -160, -30, 26); road(86, 26, 86, 160);
  scene.add(roads.build(new THREE.Group(), { shadows: false }), lines(dashes, Object.assign(L.gold.clone(), { opacity: 0.35 })));

  // ---------- 1. Résidence de villas blanches (vue aérienne de la plaquette) ----------
  const residence = new THREE.Group();
  const V = villa();
  const villas = [];
  const lots = new Bucket();
  [[0, 0, 0], [-25, 2, 0], [0, -30, Math.PI], [-25, -28, Math.PI]].forEach(([x, z, r], i) => {
    const v = buildModel(V, { x, z, rot: r, lit: 0.7, edges: 0.35 });
    villas.push(v); residence.add(v.group);
    lots.add(M.grass, place(new THREE.BoxGeometry(24, 0.06, 26), x, 0.03, z + (r ? -1 : 1)));
    if (i === 0) v.group.add(buildSketch(V, { gold: true }));
  });
  for (let i = 0; i < 9; i++) palmGeo(lots, -40 + i * 6.5, 15 + (i % 2) * 2.5, 1 + (i % 3) * 0.1);
  residence.add(lots.build(new THREE.Group()));
  const introSketch = villas[0].group.children[villas[0].group.children.length - 1];
  introSketch.visible = false;
  scene.add(residence);

  // ---------- 2. Croquis : l'idée (immeubles en traits, plans au sol) ----------
  const croquis = new THREE.Group();
  const [cqx, cqz] = ZONES.croquis;
  croquis.add(buildSketch(tower(9), { x: cqx, z: cqz }), buildSketch(tower(6), { x: cqx - 22, z: cqz + 6, rot: 0.3 }),
    buildSketch(tower(12), { x: cqx + 20, z: cqz - 10, rot: -0.2 }), buildSketch(site(), { x: cqx - 6, z: cqz + 40, s: 0.6, gold: true }));
  const bigPlan = buildModel(villa(), { x: cqx + 8, z: cqz + 22, rot: 0.2, plan: true });
  bigPlan.solids.visible = false; bigPlan.edges.visible = false; bigPlan.group.scale.setScalar(1.6);
  croquis.add(bigPlan.group);
  scene.add(croquis);

  // ---------- 3. Le phare : béton et verre, croix lumineuse (couverture de la plaquette) + quartier ----------
  const phare = new THREE.Group();
  const [phx, phz] = ZONES.phare;
  const pb = new Bucket();
  pb.add(M.concrete, place(new THREE.BoxGeometry(26, 34, 16), 0, 17, 0));
  pb.add(M.concrete, place(new THREE.BoxGeometry(14, 18, 14), -21, 9, 2));
  pb.add(M.concrete, place(new THREE.BoxGeometry(12, 24, 12), 20, 12, -1));
  pb.add(M.glassLit, place(new THREE.BoxGeometry(22, 30, 0.3), 0, 17, 8.05));
  pb.add(M.dark, place(new THREE.BoxGeometry(27, 1.2, 17), 0, 34.6, 0));
  for (let f = 3; f < 18; f += 3.4) pb.add(M.glassLit, place(new THREE.BoxGeometry(12.2, 1.4, 14.2), -21, f, 2));
  for (let f = 3; f < 24; f += 3.4) pb.add(M.glass, place(new THREE.BoxGeometry(12.2, 1.4, 12.2), 20, f, -1));
  pb.build(phare);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.7, 24, 0.6), M.cross);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(14, 1.7, 0.6), M.cross);
  crossV.position.set(0, 17, 8.3); crossH.position.set(0, 22, 8.3);
  const mull = [];
  for (let x = -11; x <= 11; x += 2.2) mull.push(x, 2, 8.25, x, 32, 8.25);
  for (let y = 2; y <= 32; y += 3) mull.push(-11, y, 8.25, 11, y, 8.25);
  phare.add(crossV, crossH, lines(mull, Object.assign(L.gold.clone(), { opacity: 0.25 })));
  phare.position.set(phx, 0, phz);
  scene.add(phare);
  const district = buildModel(site(), { x: phx + 6, z: phz + 48, rot: Math.PI, lit: 0.55, edges: 0.25, plan: false });
  const district2 = buildModel(tower(7), { x: phx - 40, z: phz - 8, rot: 0.15, lit: 0.6, edges: 0.3, plan: false });
  scene.add(district.group, district2.group);

  // ---------- 4. Coupe 3D : le volume se « solidifie » derrière un plan de coupe ----------
  const [cpx, cpz] = ZONES.coupe;
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), cpx);
  const coupe = buildModel(tower(4), { x: cpx, z: cpz, lit: 0.6, edges: 0.85, clip });
  const cutFrame = lines([0, 0, -9, 0, 15, -9, 0, 15, -9, 0, 15, 9, 0, 15, 9, 0, 0, 9, 0, 0, 9, 0, 0, -9], Object.assign(L.plan.clone(), { opacity: 0.9 }));
  scene.add(coupe.group, cutFrame);

  // ---------- 5. Chantier : étages qui montent, grue dorée ----------
  const chantier = new THREE.Group();
  const [chx, chz] = ZONES.chantier;
  chantier.position.set(chx, 0, chz);
  const floors = [];
  const FL = 8, fh = 3.3;
  for (let i = 0; i < FL; i++) {
    const fb = new Bucket();
    fb.add(M.white, place(new THREE.BoxGeometry(20, 0.35, 14), 0, fh * (i + 1), 0));
    for (let cx = -9; cx <= 9; cx += 6) for (let cz = -6; cz <= 6; cz += 6) fb.add(M.stone, place(new THREE.BoxGeometry(0.45, fh, 0.45), cx, fh * i + fh / 2, cz));
    const fg = fb.build(new THREE.Group());
    const sc = [];
    [[-10.6, -7.6], [10.6, -7.6], [10.6, 7.6], [-10.6, 7.6]].forEach(([a, c], k, arr) => {
      const [a2, c2] = arr[(k + 1) % 4];
      sc.push(a, fh * i, c, a, fh * (i + 1), c, a, fh * (i + 1), c, a2, fh * (i + 1), c2, a, fh * i, c, a2, fh * (i + 1), c2);
    });
    fg.add(lines(sc, Object.assign(L.gold.clone(), { opacity: 0.6 })));
    fg.scale.y = 0.001; fg.visible = false;
    chantier.add(fg); floors.push(fg);
  }
  const base = new Bucket();
  base.add(M.stone, place(new THREE.BoxGeometry(24, 0.3, 18), 0, 0.15, 0));
  base.build(chantier);
  // Grue à tour : mât en treillis, flèche, contre-flèche, câble
  const crane = new THREE.Group();
  crane.position.set(-16, 0, -12);
  const cb = new Bucket(), lat = [];
  const H = 40;
  [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]].forEach(([a, c]) => cb.add(M.gold, place(new THREE.BoxGeometry(0.18, H, 0.18), a, H / 2, c)));
  for (let y = 0; y < H; y += 1.8) {
    lat.push(-0.9, y, -0.9, 0.9, y + 1.8, -0.9, 0.9, y, 0.9, -0.9, y + 1.8, 0.9, -0.9, y, 0.9, -0.9, y + 1.8, -0.9, 0.9, y, -0.9, 0.9, y + 1.8, 0.9);
  }
  cb.add(M.dark, place(new THREE.BoxGeometry(3, 2.2, 2.6), 0, H + 1.1, 0));
  cb.build(crane);
  crane.add(lines(lat, Object.assign(L.gold.clone(), { opacity: 0.95 })));
  const jib = new THREE.Group();
  jib.position.y = H + 2.2;
  const jb = new Bucket(), jl = [];
  jb.add(M.gold, place(new THREE.BoxGeometry(44, 0.25, 0.25), 15, 0, -0.6));
  jb.add(M.gold, place(new THREE.BoxGeometry(44, 0.25, 0.25), 15, 0, 0.6));
  jb.add(M.gold, place(new THREE.BoxGeometry(44, 0.25, 0.25), 15, 1.4, 0));
  jb.add(M.concrete, place(new THREE.BoxGeometry(3, 2, 2), -11, -0.6, 0));
  jb.add(M.gold, place(new THREE.BoxGeometry(0.3, 6, 0.3), 0, 3, 0));
  for (let x = -12; x < 37; x += 2) jl.push(x, 0, -0.6, x + 2, 1.4, 0, x, 0, 0.6, x + 2, 1.4, 0);
  jl.push(0, 6, 0, 30, 1.4, 0, 0, 6, 0, -12, 0.5, 0);
  jb.build(jib);
  jib.add(lines(jl, Object.assign(L.gold.clone(), { opacity: 0.95 })));
  const cable = lines([24, 0, 0, 24, -18, 0], Object.assign(L.sketch.clone(), { opacity: 0.7 }));
  const load = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 1.2), M.white);
  load.position.set(24, -18.4, 0); load.castShadow = true;
  jib.add(cable, load);
  crane.add(jib);
  chantier.add(crane);
  scene.add(chantier);

  // ---------- Post-traitement : halo doré des lumières la nuit ----------
  let composer = null, bloom = null;
  if (!mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.6, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---------- Ambiance jour → nuit ----------
  const C = {
    dayTop: new THREE.Color(0x8ea3b4), dayHor: new THREE.Color(0xf0d6a8),
    nightTop: new THREE.Color(0x07090d), nightHor: new THREE.Color(0x2e2214),
    dayHemi: new THREE.Color(0xdfe6ee), nightHemi: new THREE.Color(0x2b3550),
  };
  function setNight(n) {
    const dusk = Math.sin(clamp(n) * Math.PI);
    skyU.top.value.copy(C.dayTop).lerp(C.nightTop, n);
    skyU.horizon.value.copy(C.dayHor).lerp(C.nightHor, n).offsetHSL(0, 0.08 * dusk, -0.05 * dusk);
    scene.fog.color.copy(skyU.horizon.value);
    hemi.color.copy(C.dayHemi).lerp(C.nightHemi, n);
    hemi.intensity = lerp(1.15, 0.35, n);
    sun.intensity = lerp(2.6, 0, smooth(n * 1.25));
    sun.color.setHSL(0.09, 0.8, lerp(0.82, 0.6, n));
    moon.intensity = lerp(0, 0.5, smooth((n - 0.5) * 2));
    M.glassLit.emissiveIntensity = lerp(0.05, 2.4, smooth((n - 0.2) / 0.6));
    M.water.emissiveIntensity = lerp(0, 0.9, smooth((n - 0.4) / 0.5));
    M.gold.emissiveIntensity = lerp(0, 0.25, n);
    renderer.toneMappingExposure = lerp(1.05, 1.15, n);
    if (bloom) bloom.strength = lerp(0.25, 1.05, n);
  }

  // ---------- Vol du drone ----------
  let keys = [];          // [{ name, y }]
  const zoneP = {};
  const cam = { pos: new THREE.Vector3(...SHOTS.residence.pos), look: new THREE.Vector3(...SHOTS.residence.look), night: 0 };
  const want = { pos: cam.pos.clone(), look: cam.look.clone(), night: 0, label: SHOTS.residence.label, zone: 'residence' };
  let mouse = { x: 0, y: 0 }, sm = { x: 0, y: 0 };
  let piloted = true;      // false pendant l'intro (la caméra est animée par GSAP)
  let roll = 0, speed = 0;
  const prev = new THREE.Vector3();

  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  const v3 = (a) => new THREE.Vector3(...a);
  /** Point du trajet entre deux plans : on monte en altitude entre deux zones éloignées (vol, pas travelling). */
  function flight(a, b, t) {
    const e = smooth(t);
    const p = v3(a.pos).lerp(v3(b.pos), e);
    const dist = v3(a.pos).distanceTo(v3(b.pos));
    p.y += Math.sin(Math.PI * t) * Math.min(60, dist * 0.22);
    const look = v3(a.look).lerp(v3(b.look), smooth(clamp((t - 0.1) / 0.8)));
    return { pos: p, look, night: lerp(a.night, b.night, e) };
  }

  function track(y) {
    if (!keys.length) return;
    let i = 0;
    while (i < keys.length - 1 && y >= keys[i + 1].y) i++;
    const a = SHOTS[keys[i].name], next = keys[i + 1];
    if (!next || y <= keys[0].y) {
      const s = SHOTS[keys[y <= keys[0].y ? 0 : i].name];
      want.pos.set(...s.pos); want.look.set(...s.look); want.night = s.night;
      want.label = s.label; want.zone = keys[y <= keys[0].y ? 0 : i].name;
      return;
    }
    const b = SHOTS[next.name];
    const local = (y - keys[i].y) / (next.y - keys[i].y);
    // Plateau de lecture : le drone flâne autour du sujet, puis vole vers le suivant.
    const t = clamp((local - 0.35) / 0.55);
    const f = flight(a, b, t);
    // Flânerie : léger arc autour du sujet pendant la lecture
    const drift = (local - 0.2) * 0.35 * (1 - t);
    const off = f.pos.clone().sub(f.look);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), drift);
    want.pos.copy(f.look).add(off); want.look.copy(f.look); want.night = f.night;
    const near = t < 0.5 ? keys[i] : next;
    want.label = SHOTS[near.name].label; want.zone = near.name;
  }

  // ---------- Intro : plan 2D → murs qui montent → décollage ----------
  const introState = { draw: 1, build: 1 };
  function applyBuild() {
    villas.forEach((v, i) => {
      const b = smooth(clamp(introState.build * 1.6 - i * 0.2));
      v.solids.scale.y = Math.max(0.001, b);
      v.solids.visible = b > 0.002;
      v.edges.material.opacity = 0.35 * b;
      if (v.plan) v.plan.geometry.setDrawRange(0, Math.floor(v.plan.geometry.attributes.position.count * clamp(introState.draw * 1.3 - i * 0.1)));
    });
    introSketch.visible = introState.build > 0.02 && introState.build < 0.999;
    introSketch.material.opacity = 0.9 * Math.sin(Math.PI * introState.build);
  }
  let introTl = null;
  function intro() {
    if (reduced) return Promise.resolve();
    piloted = false;
    introState.draw = 0; introState.build = 0; applyBuild();
    cam.pos.set(0.5, 62, 1.5); cam.look.set(0, 0, 0); cam.night = 0.12;
    return new Promise((resolve) => {
      const target = { ...SHOTS.residence };
      const p0 = cam.pos.clone(), l0 = cam.look.clone();
      const fly = { t: 0 };
      introTl = gsap.timeline({ onUpdate: applyBuild, onComplete: () => { piloted = true; introTl = null; resolve(); } })
        .to(introState, { draw: 1, duration: 2, ease: 'power2.inOut' })
        .to(introState, { build: 1, duration: 1.8, ease: 'power3.inOut' }, '+=0.1')
        .to(fly, {
          t: 1, duration: 2.6, ease: 'power2.inOut',
          onUpdate: () => {
            cam.pos.copy(p0).lerp(v3(target.pos), fly.t); cam.pos.y += Math.sin(Math.PI * fly.t) * 12;
            cam.look.copy(l0).lerp(v3(target.look), fly.t);
            cam.night = lerp(0.12, 0, fly.t);
          },
        }, '-=1.1');
    });
  }
  function skipIntro() { if (introTl) introTl.progress(1); }

  // ---------- Boucle ----------
  const clock = new THREE.Clock();
  const up = new THREE.Vector3(0, 1, 0);
  let running = true, hudTick = 0;
  document.addEventListener('visibilitychange', () => { running = document.visibilityState === 'visible'; if (running) clock.getDelta(); });

  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;

    if (piloted) {
      track(window.scrollY);
      const k = reduced ? 1 : 1 - Math.exp(-dt * 2.4);
      cam.pos.lerp(want.pos, k); cam.look.lerp(want.look, 1 - Math.exp(-dt * 3));
      cam.night = lerp(cam.night, want.night, reduced ? 1 : 1 - Math.exp(-dt * 1.5));
    }
    sm.x = lerp(sm.x, mouse.x, 1 - Math.exp(-dt * 2)); sm.y = lerp(sm.y, mouse.y, 1 - Math.exp(-dt * 2));

    // Flottement du drone + inclinaison dans les virages + regard qui suit la souris
    const bob = reduced ? 0 : Math.sin(t * 0.9) * 0.35 + Math.sin(t * 2.3) * 0.08;
    camera.position.copy(cam.pos); camera.position.y += bob;
    const look = cam.look.clone();
    const right = new THREE.Vector3().subVectors(look, camera.position).cross(up).normalize();
    look.addScaledVector(right, sm.x * 4).addScaledVector(up, -sm.y * 3);
    camera.up.copy(up);
    camera.lookAt(look);
    const vel = camera.position.clone().sub(prev).divideScalar(dt || 0.016);
    prev.copy(camera.position);
    const vx = vel.dot(right);
    speed = lerp(speed, vel.length(), 0.1);
    roll = lerp(roll, clamp(-vx * 0.006, -0.12, 0.12), 1 - Math.exp(-dt * 2));
    if (!reduced) camera.rotateZ(roll + Math.sin(t * 0.6) * 0.004);

    setNight(cam.night);

    // Soleil et ombres qui suivent la zone survolée
    sun.target.position.copy(cam.look).setY(0);
    sun.position.copy(sun.target.position).add(new THREE.Vector3(-70, 85, 45));

    // Vie du monde : grue qui pivote, câble, chantier qui monte, plan de coupe qui balaie
    jib.rotation.y = Math.sin(t * 0.12) * 0.9 + 0.4;
    const cp = zoneP.chantier ?? 0;
    floors.forEach((f, i) => {
      const s = smooth(cp * FL * 1.15 - i);
      f.visible = s > 0.002 || i === 0;
      f.scale.y = i === 0 ? Math.max(0.15, s) : Math.max(0.001, s);
    });
    const cut = lerp(-9, 9, smooth(zoneP.coupe ?? 0.5));
    clip.constant = cpx + cut;
    cutFrame.position.set(cpx + cut, 0, cpz);
    crossV.scale.x = crossH.scale.y = 1 + Math.sin(t * 2) * 0.02 * cam.night;

    if (composer) composer.render(); else renderer.render(scene, camera);

    if (++hudTick % 6 === 0) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      const lat = ABIDJAN.lat - camera.position.z / 111320;
      const lon = ABIDJAN.lon + camera.position.x / (111320 * Math.cos(lat * Math.PI / 180));
      window.dispatchEvent(new CustomEvent('world:hud', { detail: {
        alt: camera.position.y, heading: (Math.atan2(dir.x, -dir.z) * 180 / Math.PI + 360) % 360,
        lat, lon, label: want.label, zone: want.zone, night: cam.night, speed,
      } }));
    }
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.fov = w < 760 ? 52 : 38; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
  }
  addEventListener('resize', resize);
  setNight(0);
  frame();

  return {
    setKeyframes(k) { keys = k; },
    setZoneProgress(name, p) { zoneP[name] = p; },
    intro, skipIntro,
  };
}
