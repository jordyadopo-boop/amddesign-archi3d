/**
 * Le décor extérieur : sol tramé et avenues, duplex de l'intro (plan 2D → 3D) et ses voisins,
 * croquis filaires (l'idée), grand bâtiment béton/verre à la croix dorée (plaquette), quartier,
 * grue à tour près de la Tour AMD, et le petit drone que l'on suit au départ.
 */
import * as THREE from 'three';
import { villa, tower, site } from '../plan/models.js';

export const DUPLEX = [0, 0];
export const PHARE = [-10, -88];

export function createOutside(kit, scene, { towerAt }) {
  const { M, L, place, Bucket, lines, palmGeo, buildModel, buildSketch } = kit;
  const [TX, TZ] = towerAt;

  // ---------- Sol, trame d'architecte, avenues ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  const grid = new THREE.GridHelper(1000, 200, 0xc8902e, 0x5a5550);
  grid.material.transparent = true; grid.material.opacity = 0.14; grid.position.y = 0.01;
  const gridMajor = new THREE.GridHelper(1000, 20, 0xc8902e, 0xc8902e);
  gridMajor.material.transparent = true; gridMajor.material.opacity = 0.2; gridMajor.position.y = 0.015;
  scene.add(ground, grid, gridMajor);

  const roads = new Bucket(), dashes = [];
  const road = (x1, z1, x2, z2, w = 10) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = -Math.atan2(z2 - z1, x2 - x1);
    roads.add(M.road, place(new THREE.BoxGeometry(len, 0.04, w), (x1 + x2) / 2, 0.02, (z1 + z2) / 2, ang));
    for (let t = 0; t < len; t += 6) {
      const a = t / len, c = Math.min(1, (t + 3) / len);
      dashes.push(x1 + (x2 - x1) * a, 0.06, z1 + (z2 - z1) * a, x1 + (x2 - x1) * c, 0.06, z1 + (z2 - z1) * c);
    }
  };
  road(-200, 24, 220, 24); road(-20, 60, -20, -240); road(-200, -112, 220, -112); road(46, 24, 46, -240); road(-200, -175, 220, -175);
  scene.add(roads.build(new THREE.Group(), { shadows: false }), lines(dashes, Object.assign(L.gold.clone(), { opacity: 0.35 })));
  // Alignements de palmiers le long des avenues
  const avenue = new Bucket();
  for (let z = 50; z > -230; z -= 14) { palmGeo(avenue, -27, z, 1.05); palmGeo(avenue, -13, z - 7, 1); }
  for (let x = -180; x < 210; x += 16) if (Math.abs(x + 20) > 12) palmGeo(avenue, x, 31, 0.95);
  scene.add(avenue.build(new THREE.Group()));

  // ---------- Le duplex de l'intro (architecture moderne) et ses voisins ----------
  const V = villa();
  V.name = 'Duplex R+1';
  const duplex = buildModel(V, { x: DUPLEX[0], z: DUPLEX[1], lit: 0.75, edges: 0.35 });
  const introSketch = buildSketch(V, { gold: true });
  duplex.group.add(introSketch);
  introSketch.visible = false;
  const lots = new Bucket();
  lots.add(M.grass, place(new THREE.BoxGeometry(30, 0.06, 30), DUPLEX[0], 0.03, DUPLEX[1] + 2));
  const neighbors = [[-38, 4, 0.08], [36, -2, -0.06], [-36, -40, Math.PI], [34, -42, Math.PI + 0.1]].map(([x, z, r]) => {
    lots.add(M.grass, place(new THREE.BoxGeometry(26, 0.06, 28), x, 0.03, z));
    return buildModel(V, { x, z, rot: r, lit: 0.65, edges: 0.25, plan: false });
  });
  neighbors.forEach((n) => scene.add(n.group));
  scene.add(duplex.group, lots.build(new THREE.Group()));

  // ---------- Croquis : l'idée ----------
  scene.add(
    buildSketch(tower(9), { x: -52, z: -52, rot: 0.25 }),
    buildSketch(tower(6), { x: -68, z: -30, rot: -0.1 }),
    buildSketch(tower(12), { x: -60, z: -80, rot: 0.1 }),
    buildSketch(site(), { x: -85, z: -60, s: 0.7, gold: true }),
  );

  // ---------- Le grand bâtiment béton/verre à la croix lumineuse ----------
  const phare = new THREE.Group();
  phare.position.set(PHARE[0], 0, PHARE[1]);
  const pb = new Bucket();
  pb.add(M.concrete, place(new THREE.BoxGeometry(26, 30, 16), 0, 15, 0));
  pb.add(M.concrete, place(new THREE.BoxGeometry(14, 16, 14), -21, 8, 2));
  pb.add(M.concrete, place(new THREE.BoxGeometry(12, 22, 12), 20, 11, -1));
  pb.add(M.glassLit, place(new THREE.BoxGeometry(22, 26, 0.3), 0, 15, 8.05));
  pb.add(M.dark, place(new THREE.BoxGeometry(27, 1.2, 17), 0, 30.6, 0));
  for (let f = 3; f < 16; f += 3.4) pb.add(M.glassLit, place(new THREE.BoxGeometry(14.2, 1.4, 14.2), -21, f, 2));
  for (let f = 3; f < 22; f += 3.4) pb.add(M.glass, place(new THREE.BoxGeometry(12.2, 1.4, 12.2), 20, f, -1));
  pb.build(phare);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.7, 21, 0.6), M.cross);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(13, 1.7, 0.6), M.cross);
  crossV.position.set(0, 15, 8.3); crossH.position.set(0, 19.5, 8.3);
  const mull = [];
  for (let x = -11; x <= 11; x += 2.2) mull.push(x, 2, 8.25, x, 28, 8.25);
  for (let y = 2; y <= 28; y += 3) mull.push(-11, y, 8.25, 11, y, 8.25);
  phare.add(crossV, crossH, lines(mull, Object.assign(L.gold.clone(), { opacity: 0.25 })));
  scene.add(phare);

  // ---------- Quartier autour de la tour ----------
  [buildModel(site(), { x: 74, z: -150, rot: Math.PI / 2, lit: 0.55, edges: 0.2, plan: false }),
    buildModel(tower(7), { x: -42, z: -150, rot: 0.1, lit: 0.6, edges: 0.25, plan: false }),
    buildModel(tower(10), { x: -48, z: -205, rot: -0.2, lit: 0.6, edges: 0.25, plan: false }),
    buildModel(tower(5), { x: 72, z: -70, rot: 0.3, lit: 0.6, edges: 0.25, plan: false }),
  ].forEach((b) => scene.add(b.group));

  // ---------- Grue à tour dorée, à côté de la Tour AMD ----------
  const crane = new THREE.Group();
  crane.position.set(TX + 24, 0, TZ + 4);
  const H = 54, cb = new Bucket(), lat = [];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => cb.add(M.gold, place(new THREE.BoxGeometry(0.2, H, 0.2), a, H / 2, c)));
  for (let y = 0; y < H; y += 2) lat.push(-1, y, -1, 1, y + 2, -1, 1, y, 1, -1, y + 2, 1, -1, y, 1, -1, y + 2, -1, 1, y, -1, 1, y + 2, 1);
  cb.add(M.dark, place(new THREE.BoxGeometry(3.2, 2.4, 2.8), 0, H + 1.2, 0));
  cb.add(M.raw, place(new THREE.BoxGeometry(6, 1, 6), 0, 0.5, 0));
  cb.build(crane);
  crane.add(lines(lat, Object.assign(L.gold.clone(), { opacity: 0.95 })));
  const jib = new THREE.Group();
  jib.position.y = H + 2.4;
  const jb = new Bucket(), jl = [];
  jb.add(M.gold, place(new THREE.BoxGeometry(56, 0.28, 0.28), 18, 0, -0.7));
  jb.add(M.gold, place(new THREE.BoxGeometry(56, 0.28, 0.28), 18, 0, 0.7));
  jb.add(M.gold, place(new THREE.BoxGeometry(56, 0.28, 0.28), 18, 1.6, 0));
  jb.add(M.concrete, place(new THREE.BoxGeometry(3.5, 2.2, 2.2), -9, -0.7, 0));
  jb.add(M.gold, place(new THREE.BoxGeometry(0.3, 7, 0.3), 0, 3.5, 0));
  for (let x = -10; x < 46; x += 2) jl.push(x, 0, -0.7, x + 2, 1.6, 0, x, 0, 0.7, x + 2, 1.6, 0);
  jl.push(0, 7, 0, 36, 1.6, 0, 0, 7, 0, -10, 0.6, 0);
  jb.build(jib);
  jib.add(lines(jl, Object.assign(L.gold.clone(), { opacity: 0.95 })));
  const load = new THREE.Group();
  load.position.set(30, 0, 0);
  load.add(lines([0, 0, 0, 0, -14, 0], Object.assign(L.sketch.clone(), { opacity: 0.7 })));
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.45, 1.2), M.white);
  beam.position.y = -14.4; beam.castShadow = true;
  load.add(beam);
  jib.add(load);
  crane.add(jib);
  scene.add(crane);

  // ---------- Le petit drone ----------
  const drone = new THREE.Group();
  const db = new Bucket();
  db.add(M.dark, place(new THREE.BoxGeometry(0.5, 0.16, 0.7), 0, 0, 0));
  db.add(M.gold, place(new THREE.BoxGeometry(0.3, 0.05, 0.4), 0, 0.1, 0));
  db.add(M.dark, place(new THREE.SphereGeometry(0.1, 12, 8), 0, -0.1, 0.32));
  for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    db.add(M.dark, place(new THREE.BoxGeometry(0.06, 0.05, 0.75), ax * 0.28, 0, az * 0.28, Math.atan2(ax, az)));
    db.add(M.dark, place(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), ax * 0.52, 0.06, az * 0.52));
  }
  db.build(drone);
  const rotors = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ax, az]) => {
    const r = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({ color: 0xc8902e, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(ax * 0.52, 0.12, az * 0.52);
    drone.add(r); return r;
  });
  const ledF = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M.led);
  ledF.position.set(0, 0, 0.36); drone.add(ledF);
  drone.scale.setScalar(1.6);
  scene.add(drone);

  function update(t) {
    jib.rotation.y = Math.sin(t * 0.1) * 0.8 + 2.4;
    load.position.x = 30 + Math.sin(t * 0.17) * 6;
    rotors.forEach((r, i) => { r.rotation.z = t * 40 * (i % 2 ? 1 : -1); r.material.opacity = 0.25 + 0.15 * Math.sin(t * 60 + i); });
    crossV.scale.x = 1 + Math.sin(t * 2) * 0.02;
  }

  return { duplex, introSketch, drone, update, phare };
}
