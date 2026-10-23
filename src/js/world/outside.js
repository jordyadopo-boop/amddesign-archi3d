/**
 * Le décor extérieur en plans transparents : trame, avenues (bordures, trottoirs, marquages, passages piétons, rond-point),
 * espaces verts (parc et étang, pelouses, haies, alignements d'arbres), parking, limites de parcelles,
 * duplex de l'intro et ses voisins, croquis filaires, grand bâtiment à la croix dorée, quartier, grue, petit drone.
 */
import * as THREE from 'three';
import { villa, tower, site } from '../plan/models.js';

export const DUPLEX = [0, 0];
export const PHARE = [22, -84];

export function createOutside(kit, scene, { towerAt }) {
  const { M, L, place, Bucket, lines, palmGeo, treeGeo, buildModel, buildSketch, rnd } = kit;
  const [TX, TZ] = towerAt;

  // ---------- Trame d'architecte ----------
  const grid = new THREE.GridHelper(1000, 250, 0x8a8f94, 0x3a3d40);
  grid.material = Object.assign(L.silver.clone(), { opacity: 0.12, vertexColors: true });
  const gridMajor = new THREE.GridHelper(1000, 25, 0xc8902e, 0xc8902e);
  gridMajor.material = Object.assign(L.gold.clone(), { opacity: 0.18, vertexColors: true });
  scene.add(grid, gridMajor);

  // ---------- Voirie ----------
  const fills = new Bucket(), curb = [], walk = [], marks = [], zebra = [];
  const seg = (arr, a, b) => arr.push(a[0], 0.05, a[1], b[0], 0.05, b[1]);
  function road(x1, z1, x2, z2, w = 11, cuts = []) {
    const len = Math.hypot(x2 - x1, z2 - z1), dx = (x2 - x1) / len, dz = (z2 - z1) / len, nx = -dz, nz = dx;
    fills.add(M.road, place(new THREE.BoxGeometry(len, 0.02, w), (x1 + x2) / 2, 0.01, (z1 + z2) / 2, -Math.atan2(z2 - z1, x2 - x1)));
    // Bordures et trottoirs, interrompus aux carrefours
    const spans = [];
    let t0 = 0;
    for (const c of cuts.sort((a, b) => a - b)) { spans.push([t0, c - w / 2 - 3]); t0 = c + w / 2 + 3; }
    spans.push([t0, len]);
    for (const [a, b] of spans) {
      if (b <= a) continue;
      for (const off of [w / 2, -w / 2]) {
        seg(curb, [x1 + dx * a + nx * off, z1 + dz * a + nz * off], [x1 + dx * b + nx * off, z1 + dz * b + nz * off]);
        const o2 = off + Math.sign(off) * 3;
        seg(walk, [x1 + dx * a + nx * o2, z1 + dz * a + nz * o2], [x1 + dx * b + nx * o2, z1 + dz * b + nz * o2]);
      }
      for (let t = a; t < b - 3; t += 7) seg(marks, [x1 + dx * t, z1 + dz * t], [x1 + dx * (t + 3.5), z1 + dz * (t + 3.5)]);
    }
    // Passages piétons de part et d'autre de chaque carrefour
    for (const c of cuts) for (const s of [-1, 1]) {
      const t = c + s * (w / 2 + 1.6);
      for (let k = -w / 2 + 0.6; k < w / 2 - 0.4; k += 1.1) {
        const px = x1 + dx * t + nx * k, pz = z1 + dz * t + nz * k;
        seg(zebra, [px - dx * 1.2, pz - dz * 1.2], [px + dx * 1.2, pz + dz * 1.2]);
        seg(zebra, [px - dx * 1.2 + nx * 0.5, pz - dz * 1.2 + nz * 0.5], [px + dx * 1.2 + nx * 0.5, pz + dz * 1.2 + nz * 0.5]);
      }
    }
  }
  const XS = [-20, 46], ZS = [24, -112, -175];
  for (const z of ZS) road(-220, z, 240, z, 11, XS.map((x) => x + 220));
  for (const x of XS) road(x, 70, x, -260, 11, ZS.map((z) => 70 - z));
  // Rond-point paysager devant la tour
  const rp = [], [rx, rz] = [-20, -112];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2, b = (i + 1) / 48 * Math.PI * 2;
    for (const r of [5, 10.5]) seg(rp, [rx + r * Math.cos(a), rz + r * Math.sin(a)], [rx + r * Math.cos(b), rz + r * Math.sin(b)]);
  }
  fills.add(M.grass, place(new THREE.CylinderGeometry(5, 5, 0.06, 32), rx, 0.03, rz));
  palmGeo(fills, rx, rz, 1.2);
  scene.add(fills.build(new THREE.Group(), { edges: false }),
    lines(curb, L.road), lines(walk, Object.assign(L.silver.clone(), { opacity: 0.22 })),
    lines(marks, Object.assign(L.road.clone(), { opacity: 0.4 })), lines(zebra, Object.assign(L.road.clone(), { opacity: 0.55 })),
    lines(rp, L.road));

  // ---------- Espaces verts ----------
  const green = new Bucket(), hedge = [], paths = [], bounds = [];
  const lawn = (x, z, w, d) => green.add(M.grass, place(new THREE.BoxGeometry(w, 0.05, d), x, 0.025, z));
  const rect = (arr, x, z, w, d) => { const a = [x - w / 2, z - d / 2], b = [x + w / 2, z - d / 2], c = [x + w / 2, z + d / 2], e = [x - w / 2, z + d / 2]; seg(arr, a, b); seg(arr, b, c); seg(arr, c, e); seg(arr, e, a); };
  const dashed = (arr, x, z, w, d) => {
    const pts = [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2], [x - w / 2, z - d / 2]];
    for (let i = 0; i < 4; i++) {
      const [a, b] = [pts[i], pts[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = 0; t < len; t += 2.4) {
        const u = t / len, v = Math.min(1, (t + 1.2) / len);
        seg(arr, [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v]);
      }
    }
  };
  // Parc et étang (à l'ouest)
  lawn(-105, 22, 70, 56);
  rect(hedge, -105, 22, 70, 56);
  const pond = new THREE.CylinderGeometry(9, 9, 0.08, 40); pond.scale(1.5, 1, 1);
  green.add(M.water, place(pond, -98, 0.05, 26));
  for (let i = 0; i < 64; i++) { // allées courbes
    const a = i / 64 * Math.PI * 2, b = (i + 1) / 64 * Math.PI * 2;
    seg(paths, [-98 + 21 * Math.cos(a), 26 + 15 * Math.sin(a)], [-98 + 21 * Math.cos(b), 26 + 15 * Math.sin(b)]);
  }
  seg(paths, [-140, 22], [-119, 24]); seg(paths, [-77, 28], [-70, 30]);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 24 + rnd() * 8;
    const tx = -105 + Math.cos(a) * r * 1.2, tz = 22 + Math.sin(a) * r * 0.75;
    if (Math.abs(tx + 105) < 34 && Math.abs(tz - 22) < 27) treeGeo(green, tx, tz, 0.8 + rnd() * 0.5);
  }
  // Pelouses et limites des parcelles de villas
  lawn(DUPLEX[0], DUPLEX[1] + 2, 30, 30); dashed(bounds, DUPLEX[0], DUPLEX[1] + 2, 32, 32);
  [[-38, 4], [36, -2], [-36, -40], [34, -42]].forEach(([x, z]) => { lawn(x, z, 26, 28); dashed(bounds, x, z, 28, 30); rect(hedge, x, z, 27, 29); });
  // Parvis de la tour : alignements d'arbres
  for (let x = -10; x <= 36; x += 6.5) { treeGeo(green, x, -118.5, 0.7); treeGeo(green, x, -168.5, 0.7); }
  lawn(TX, TZ, 50, 46); dashed(bounds, TX, TZ, 54, 50);
  // Alignements de palmiers le long des avenues
  for (let z = 50; z > -250; z -= 14) if (!ZS.some((zz) => Math.abs(zz - z) < 10)) { palmGeo(green, -29, z, 1); palmGeo(green, -11, z - 7, 0.95); }
  for (let x = -200; x < 230; x += 16) if (!XS.some((xx) => Math.abs(xx - x) < 10)) palmGeo(green, x, 33, 0.95);
  scene.add(green.build(new THREE.Group()), lines(hedge, L.green), lines(paths, Object.assign(L.silver.clone(), { opacity: 0.3 })),
    lines(bounds, Object.assign(L.silver.clone(), { opacity: 0.28 })));

  // ---------- Parking (à l'est de la tour) ----------
  const pk = [], cars = new Bucket();
  rect(pk, 74, -143, 38, 44);
  for (let row = 0; row < 2; row++) for (let i = 0; i <= 14; i++) {
    const x = 56 + i * 2.6, z0 = -163 + row * 26;
    seg(pk, [x, z0], [x, z0 + 5.2]);
    if (i < 14 && rnd() < 0.55) {
      cars.add(M.car, place(new THREE.BoxGeometry(1.8, 0.8, 4.2), x + 1.3, 0.55, z0 + 2.6));
      cars.add(M.car, place(new THREE.BoxGeometry(1.6, 0.55, 2.2), x + 1.3, 1.2, z0 + 2.8));
    }
  }
  scene.add(lines(pk, Object.assign(L.road.clone(), { opacity: 0.4 })), cars.build(new THREE.Group()));

  // ---------- Duplex de l'intro et ses voisins ----------
  const V = villa(); V.name = 'Duplex R+1';
  const duplex = buildModel(V, { x: DUPLEX[0], z: DUPLEX[1], lit: 0.75 });
  const introSketch = buildSketch(V, { gold: true });
  duplex.group.add(introSketch); introSketch.visible = false;
  [[-38, 4, 0.08], [36, -2, -0.06], [-36, -40, Math.PI], [34, -42, Math.PI + 0.1]].forEach(([x, z, r]) => scene.add(buildModel(V, { x, z, rot: r, lit: 0.65 }).group));
  scene.add(duplex.group);

  // ---------- Croquis : l'idée ----------
  scene.add(
    buildSketch(tower(9), { x: -52, z: -52, rot: 0.25 }),
    buildSketch(tower(6), { x: -68, z: -30, rot: -0.1 }),
    buildSketch(tower(12), { x: -62, z: -80, rot: 0.1 }),
    buildSketch(site(), { x: -88, z: -62, s: 0.7, gold: true }),
  );

  // ---------- Le grand bâtiment à la croix lumineuse ----------
  const phare = new THREE.Group();
  phare.position.set(PHARE[0], 0, PHARE[1]);
  const pb = new Bucket();
  pb.add(M.concrete, place(new THREE.BoxGeometry(26, 30, 16), 0, 15, 0));
  pb.add(M.concrete, place(new THREE.BoxGeometry(12, 16, 13), -19.5, 8, 2));
  pb.add(M.concrete, place(new THREE.BoxGeometry(10, 22, 11), 18.5, 11, -1));
  pb.add(M.glassLit, place(new THREE.BoxGeometry(22, 26, 0.3), 0, 15, 8.05));
  for (let f = 3; f < 16; f += 3.4) pb.add(M.glassLit, place(new THREE.BoxGeometry(12.2, 1.4, 13.2), -19.5, f, 2));
  for (let f = 3; f < 22; f += 3.4) pb.add(M.glass, place(new THREE.BoxGeometry(10.2, 1.4, 11.2), 18.5, f, -1));
  pb.build(phare);
  const cross = new Bucket();
  cross.add(M.cross, place(new THREE.BoxGeometry(1.7, 21, 0.6), 0, 15, 8.3));
  cross.add(M.cross, place(new THREE.BoxGeometry(13, 1.7, 0.6), 0, 19.5, 8.3));
  const crossG = cross.build(new THREE.Group());
  const mull = [];
  for (let x = -11; x <= 11; x += 2.2) mull.push(x, 2, 8.25, x, 28, 8.25);
  for (let y = 2; y <= 28; y += 3) mull.push(-11, y, 8.25, 11, y, 8.25);
  phare.add(crossG, lines(mull, Object.assign(L.silver.clone(), { opacity: 0.22 })));
  scene.add(phare);

  // ---------- Quartier ----------
  [buildModel(site(), { x: 96, z: -60, rot: Math.PI / 2, lit: 0.55, plan: false }),
    buildModel(tower(7), { x: -48, z: -146, rot: 0.1, lit: 0.6, plan: false }),
    buildModel(tower(10), { x: -52, z: -205, rot: -0.2, lit: 0.6, plan: false }),
    buildModel(tower(5), { x: 76, z: -205, rot: 0.3, lit: 0.6, plan: false }),
    buildModel(tower(8), { x: 100, z: -140, rot: -0.15, lit: 0.6, plan: false }),
  ].forEach((b) => scene.add(b.group));

  // ---------- Grue à tour dorée ----------
  const crane = new THREE.Group();
  crane.position.set(TX - 26, 0, TZ - 8);
  const H = 58, cb = new Bucket(), lat = [];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c]) => cb.add(M.gold, place(new THREE.BoxGeometry(0.2, H, 0.2), a, H / 2, c)));
  for (let y = 0; y < H; y += 2) lat.push(-1, y, -1, 1, y + 2, -1, 1, y, 1, -1, y + 2, 1, -1, y, 1, -1, y + 2, -1, 1, y, -1, 1, y + 2, 1);
  cb.add(M.dark, place(new THREE.BoxGeometry(3.2, 2.4, 2.8), 0, H + 1.2, 0));
  cb.build(crane);
  crane.add(lines(lat, Object.assign(L.gold.clone(), { opacity: 0.8 })));
  const jib = new THREE.Group();
  jib.position.y = H + 2.4;
  const jb = new Bucket(), jl = [];
  jb.add(M.gold, place(new THREE.BoxGeometry(56, 0.28, 0.28), 18, 0, -0.7));
  jb.add(M.gold, place(new THREE.BoxGeometry(56, 0.28, 0.28), 18, 0, 0.7));
  jb.add(M.gold, place(new THREE.BoxGeometry(56, 0.28, 0.28), 18, 1.6, 0));
  jb.add(M.concrete, place(new THREE.BoxGeometry(3.5, 2.2, 2.2), -9, -0.7, 0));
  for (let x = -10; x < 46; x += 2) jl.push(x, 0, -0.7, x + 2, 1.6, 0, x, 0, 0.7, x + 2, 1.6, 0);
  jl.push(0, 7, 0, 36, 1.6, 0, 0, 7, 0, -10, 0.6, 0, 0, 0, 0, 0, 7, 0);
  jb.build(jib);
  jib.add(lines(jl, Object.assign(L.gold.clone(), { opacity: 0.8 })));
  const load = new THREE.Group();
  load.position.set(30, 0, 0);
  load.add(lines([0, 0, 0, 0, -14, 0], L.silver));
  const lb = new Bucket(); lb.add(M.white, place(new THREE.BoxGeometry(7, 0.45, 1.2), 0, -14.4, 0)); lb.build(load);
  jib.add(load);
  crane.add(jib);
  scene.add(crane);

  // ---------- Le petit drone ----------
  const drone = new THREE.Group();
  const db = new Bucket();
  db.add(M.dark, place(new THREE.BoxGeometry(0.5, 0.16, 0.7), 0, 0, 0));
  db.add(M.gold, place(new THREE.BoxGeometry(0.3, 0.05, 0.4), 0, 0.1, 0));
  db.add(M.dark, place(new THREE.SphereGeometry(0.1, 10, 6), 0, -0.1, 0.32));
  for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    db.add(M.dark, place(new THREE.BoxGeometry(0.06, 0.05, 0.75), ax * 0.28, 0, az * 0.28, Math.atan2(ax, az)));
    db.add(M.dark, place(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), ax * 0.52, 0.06, az * 0.52));
  }
  db.build(drone);
  const rotors = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([ax, az]) => {
    const r = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), M.gold);
    r.rotation.x = -Math.PI / 2; r.position.set(ax * 0.52, 0.12, az * 0.52);
    drone.add(r); return r;
  });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.led);
  led.position.set(0, 0, 0.36); drone.add(led);
  drone.scale.setScalar(1.6);
  scene.add(drone);

  function update(t) {
    jib.rotation.y = Math.sin(t * 0.1) * 0.8 - 0.6;
    load.position.x = 30 + Math.sin(t * 0.17) * 6;
    rotors.forEach((r, i) => { r.rotation.z = t * 40 * (i % 2 ? 1 : -1); r.scale.setScalar(0.85 + 0.15 * Math.sin(t * 60 + i)); });
    led.visible = Math.sin(t * 6) > 0;
  }

  return { duplex, introSketch, drone, update, crossMat: M.cross };
}
