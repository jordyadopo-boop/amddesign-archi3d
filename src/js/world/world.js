/**
 * Le monde d'AMD Design : une seule scène 3D, fixe derrière tout le site, vue à travers la caméra d'un drone.
 * Scénario (une section = un plan du drone) :
 *   duplex de l'intro (plan 2D → 3D) → approche au-dessus des croquis, la Tour AMD apparaît derrière le grand bâtiment
 *   → entrée par la terrasse du dernier étage → descente par la cage d'ascenseur, pièce après pièce, jusqu'aux fondations.
 *
 * API : const world = await createWorld(canvas, { mobile, reduced, base })
 *   world.setKeyframes([{ name, y }])  positions de défilement des sections (data-cam)
 *   world.setZoneProgress(name, p)     avancement local d'une section (data-cam-progress)
 *   world.intro() → Promise ; world.skipIntro()
 *   window 'world:hud' { alt, heading, lat, lon, label, zone, night, speed, level }
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FilmShader } from './film.js';
import { gsap } from '../core/motion.js';
import { createKit, SHARED } from './kit.js';
import { createOutside } from './outside.js';
import { createTower, FH, levelName } from './tower.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const v3 = (a) => new THREE.Vector3(...a);

const TOWER = [10, -140];
const ABIDJAN = { lat: 5.36, lon: -4.008 };

export async function createWorld(canvas, { mobile = false, reduced = false, base = '/', snap = false } = {}) {
  // ---------- Rendu ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.localClippingEnabled = true;

  // Fond argentique : noir chaud, les plans transparents s'effacent dans le brouillard noir (lumière additive).
  const scene = new THREE.Scene();
  const BG = { day: new THREE.Color(0x15151a), night: new THREE.Color(0x0b0b0d) };
  scene.background = BG.day.clone();
  scene.fog = new THREE.Fog(0x000000, SHARED.fogNear.value, SHARED.fogFar.value);
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 900);

  // ---------- Décors ----------
  const kit = createKit();
  const { M } = kit;
  const outside = createOutside(kit, scene, { towerAt: TOWER });
  const tower = createTower(kit, { x: TOWER[0], z: TOWER[1], base });
  scene.add(tower.group);

  // ---------- Plans du drone ----------
  const SHOTS = {
    duplex: { pos: [24, 6.5, 30], look: [-4, 11, -60], night: 0, drift: 0.35, label: 'Duplex R+1 · le plan devient volume' },
    approche: { pos: [-40, 30, -52], look: [10, 26, -140], night: 0.4, drift: 0.3, label: 'Approche · la Tour AMD' },
    atelier: { ...tower.shots.atelier, night: 0.7, drift: 0.1, label: 'R+8 · Atelier de conception', ...tower.entryVia('atelier') },
    expo: { ...tower.shots.expo, night: 0.75, drift: 0.1, label: 'R+7 · Salle d’exposition', ...tower.outsideVia('atelier', 'expo') },
    salle3d: { ...tower.shots.salle3d, night: 0.8, drift: 0.08, label: 'R+6 · Salle 3D', ...tower.outsideVia('expo', 'salle3d') },
    chantier: { ...tower.shots.chantier, night: 0.85, drift: 0.1, label: 'R+5 · Étage en chantier', ...tower.outsideVia('salle3d', 'chantier') },
    reunion: { ...tower.shots.reunion, night: 0.9, drift: 0.1, label: 'R+3 · Salle de réunion', ...tower.outsideVia('chantier', 'reunion') },
    archives: { ...tower.shots.archives, night: 0.95, drift: 0.1, label: 'R+1 · Archives de plans', ...tower.outsideVia('reunion', 'archives') },
    hall: { ...tower.shots.hall, night: 1, drift: 0.1, label: 'RDC · Hall d’accueil', ...tower.outsideVia('archives', 'hall') },
    soussol: { ...tower.shots.soussol, night: 1, drift: 0.06, label: 'SS-1 · Les fondations', ...tower.outsideVia('hall', 'soussol') },
  };

  // ---------- Halo doré des lumières la nuit ----------
  // Rendu « argentique » : grain, étalonnage, vignettage, voile de lumière (desktop et mobile)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let bloom = null;
  if (!mobile) {
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.6, 0.82);
    composer.addPass(bloom);
  }
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  // ---------- Ambiance : du crépuscule à la nuit, les vitres s'allument ----------
  function setNight(n, inside) {
    scene.background.copy(BG.day).lerp(BG.night, n);
    M.glassLit.uniforms.glow.value = lerp(0, 0.5, smooth((n - 0.15) / 0.6));
    M.glassLit.uniforms.opacity.value = lerp(0.04, 0.12, smooth((n - 0.15) / 0.6));
    M.water.uniforms.glow.value = lerp(0, 0.8, n);
    if (bloom) bloom.strength = lerp(0.3, inside ? 0.3 : 0.6, n);
    SHARED.fade.value = lerp(SHARED.fade.value, inside ? 0.6 : 1, 0.08);
  }

  // ---------- Vol ----------
  let keys = [];
  const zoneP = {};
  const cam = { pos: v3(SHOTS.duplex.pos), look: v3(SHOTS.duplex.look), night: 0 };
  const want = { pos: cam.pos.clone(), look: cam.look.clone(), night: 0, label: SHOTS.duplex.label, zone: 'duplex' };
  let piloted = true, roll = 0, speed = 0;
  const prev = new THREE.Vector3();

  const curves = new Map();
  /** Trajet a → b : par les points de passage de b (entrée, cage d'ascenseur) ou en vol libre avec prise d'altitude. */
  function route(aName, bName, t) {
    const a = SHOTS[aName], b = SHOTS[bName];
    if (b.via) {
      const key = `${aName}>${bName}`;
      if (!curves.has(key)) {
        curves.set(key, {
          p: new THREE.CatmullRomCurve3([v3(a.pos), ...b.via.map(v3), v3(b.pos)], false, 'centripetal'),
          l: new THREE.CatmullRomCurve3([v3(a.look), ...b.viaLook.map(v3), v3(b.look)], false, 'centripetal'),
        });
      }
      const c = curves.get(key), e = smooth(t);
      return { pos: c.p.getPoint(e), look: c.l.getPoint(e), night: lerp(a.night, b.night, e) };
    }
    const e = smooth(t);
    const pos = v3(a.pos).lerp(v3(b.pos), e);
    pos.y += Math.sin(Math.PI * t) * Math.min(40, v3(a.pos).distanceTo(v3(b.pos)) * 0.18);
    const look = v3(a.look).lerp(v3(b.look), smooth(clamp((t - 0.1) / 0.8)));
    return { pos, look, night: lerp(a.night, b.night, e) };
  }

  const yAxis = new THREE.Vector3(0, 1, 0);
  function track(y) {
    if (!keys.length) return;
    let i = 0;
    while (i < keys.length - 1 && y >= keys[i + 1].y) i++;
    const next = keys[i + 1];
    if (!next || y <= keys[0].y) {
      const k = keys[y <= keys[0].y ? 0 : i], s = SHOTS[k.name];
      want.pos.set(...s.pos); want.look.set(...s.look); want.night = s.night; want.label = s.label; want.zone = k.name;
      return;
    }
    const local = (y - keys[i].y) / (next.y - keys[i].y);
    // Plateau de lecture (le drone flâne autour du sujet), puis transition vers le plan suivant
    const t = clamp((local - 0.3) / 0.6);
    const f = route(keys[i].name, next.name, t);
    const a = SHOTS[keys[i].name];
    const drift = (local - 0.15) * a.drift * (1 - smooth(t * 3));
    const off = f.pos.clone().sub(f.look).applyAxisAngle(yAxis, drift);
    want.pos.copy(f.look).add(off); want.look.copy(f.look); want.night = f.night;
    const near = t < 0.5 ? keys[i] : next;
    want.label = SHOTS[near.name].label; want.zone = near.name;
  }

  // ---------- Intro : le plan du duplex se trace, les murs montent, le drone décolle ----------
  const { duplex, introSketch, drone } = outside;
  const intro = { draw: 1, build: 1, drone: 1 };
  function applyBuild() {
    const b = smooth(intro.build);
    duplex.solids.scale.y = Math.max(0.001, b);
    duplex.solids.visible = b > 0.002;
    duplex.plan.geometry.setDrawRange(0, Math.floor(duplex.plan.geometry.attributes.position.count * clamp(intro.draw)));
    introSketch.visible = intro.build > 0.02 && intro.build < 0.999;
    introSketch.material.opacity = 0.9 * Math.sin(Math.PI * intro.build);
  }
  let introTl = null;
  function playIntro() {
    if (reduced) return Promise.resolve();
    piloted = false;
    Object.assign(intro, { draw: 0, build: 0, drone: 0 }); applyBuild();
    cam.pos.set(0.5, 58, 1.5); cam.look.set(0, 0, 0); cam.night = 0.1;
    return new Promise((resolve) => {
      const p0 = cam.pos.clone(), l0 = cam.look.clone(), fly = { t: 0 };
      introTl = gsap.timeline({ onUpdate: applyBuild, onComplete: () => { piloted = true; introTl = null; resolve(); } })
        .to(intro, { draw: 1, duration: 2, ease: 'power2.inOut' })
        .to(intro, { build: 1, duration: 1.8, ease: 'power3.inOut' }, '+=0.1')
        .to(fly, { t: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: () => {
          cam.pos.copy(p0).lerp(v3(SHOTS.duplex.pos), fly.t); cam.pos.y += Math.sin(Math.PI * fly.t) * 10;
          cam.look.copy(l0).lerp(v3(SHOTS.duplex.look), fly.t);
          cam.night = lerp(0.1, 0, fly.t);
        } }, '-=1.1')
        .to(intro, { drone: 1, duration: 1.4, ease: 'power2.out' }, '-=1.2');
    });
  }

  // ---------- Boucle ----------
  const timer = new THREE.Timer();
  let running = true, hudTick = 0;
  document.addEventListener('visibilitychange', () => { running = document.visibilityState === 'visible'; if (running) timer.reset?.(); });
  const droneHome = new THREE.Vector3(8, 7.2, 16), droneAway = new THREE.Vector3(-6, 30, -90);

  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    timer.update();
    const dt = Math.min(0.05, timer.getDelta()) || 0.016, t = timer.getElapsed();

    if (piloted) {
      track(window.scrollY);
      const instant = reduced || snap;
      cam.pos.lerp(want.pos, instant ? 1 : 1 - Math.exp(-dt * 2.6));
      cam.look.lerp(want.look, instant ? 1 : 1 - Math.exp(-dt * 3.2));
      cam.night = lerp(cam.night, want.night, instant ? 1 : 1 - Math.exp(-dt * 1.5));
    }
    const lvl = tower.inside(cam.pos), inside = lvl !== null;

    // Flottement du drone, regard qui suit la souris, inclinaison dans les virages
    const amp = inside ? 0.4 : 1;
    const bob = reduced ? 0 : (Math.sin(t * 0.9) * 0.3 + Math.sin(t * 2.3) * 0.07) * amp;
    camera.position.copy(cam.pos); camera.position.y += bob;
    const look = cam.look.clone();
    const right = new THREE.Vector3().subVectors(look, camera.position).cross(yAxis).normalize();
    camera.up.copy(yAxis);
    camera.lookAt(look);
    const vel = camera.position.clone().sub(prev).divideScalar(dt);
    prev.copy(camera.position);
    speed = lerp(speed, Math.min(vel.length(), 60), 0.1);
    roll = lerp(roll, clamp(-vel.dot(right) * 0.006, -0.1, 0.1), 1 - Math.exp(-dt * 2));
    if (!reduced) camera.rotateZ(roll + Math.sin(t * 0.6) * 0.003 * amp);
    const fov = (innerWidth < 760 ? 54 : 38) + (inside ? 14 : 0);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 1 - Math.exp(-dt * 2)); camera.updateProjectionMatrix(); }

    setNight(cam.night, inside);


    // Le petit drone : il attend devant le duplex, puis file vers la tour (on voit alors ce qu'il voit)
    const lead = keys.length > 1 ? clamp(window.scrollY / Math.max(1, keys[1].y - keys[0].y) * 1.5) : 0;
    const dp = droneHome.clone().lerp(droneAway, smooth(lead));
    dp.y += Math.sin(t * 2.1) * 0.15;
    drone.position.copy(dp);
    drone.visible = intro.drone > 0.01 && lead < 0.97;
    drone.scale.setScalar(1.6 * intro.drone);
    drone.rotation.set(lead > 0 ? -0.25 : Math.sin(t * 1.3) * 0.05, Math.PI + 0.35 + Math.sin(t * 0.5) * 0.15, Math.sin(t * 1.7) * 0.06);

    outside.update(t);
    tower.update(t, zoneP);

    film.uniforms.uTime.value = t;
    film.uniforms.uGrain.value = reduced ? 0.05 : 0.09;
    film.uniforms.uLeak.value = lerp(film.uniforms.uLeak.value, reduced ? 0 : clamp((speed - 6) / 30) * 0.45, 1 - Math.exp(-dt * 4));
    film.uniforms.uLeakPos.value = 0.25 + 0.2 * Math.sin(t * 0.21);
    composer.render();

    if (++hudTick % 6 === 0) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      const lat = ABIDJAN.lat - camera.position.z / 111320;
      const lon = ABIDJAN.lon + camera.position.x / (111320 * Math.cos(lat * Math.PI / 180));
      window.dispatchEvent(new CustomEvent('world:hud', { detail: {
        alt: camera.position.y, heading: (Math.atan2(dir.x, -dir.z) * 180 / Math.PI + 360) % 360,
        lat, lon, label: want.label, zone: want.zone, night: cam.night, speed,
        level: inside ? levelName(lvl) : null,
      } }));
    }
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }
  addEventListener('resize', resize);
  setNight(0, false);
  // Précompile tous les shaders et rend une première image : l'intro démarre ensuite sans à-coup.
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
  try { await renderer.compileAsync(scene, camera); } catch { /* compilation au premier rendu */ }
  composer.render();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  frame();

  return {
    setKeyframes(k) { keys = k.filter((x) => SHOTS[x.name]); },
    setZoneProgress(name, p) { zoneP[name] = p; },
    intro: playIntro,
    skipIntro() { if (introTl) introTl.progress(1); },
  };
}
