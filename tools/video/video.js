/**
 * Vidéo de présentation AMD Design (60 s, 1920×1080, 30 i/s).
 * Composition déterministe : window.__render(t) place la caméra du monde 3D et cale la typographie (GSAP) sur t.
 * Le rendu image par image est fait par tools/video/render.mjs, puis assemblé avec la voix off par ffmpeg.
 */
import * as THREE from 'three';
import { gsap, SplitText } from '../../src/js/core/motion.js';
import { createWorld } from '../../src/js/world/world.js';
import { SERVICES } from '../../src/js/config.js';

const FH = 4.2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const lerp = (a, b, t) => a + (b - a) * t;
const V = (a) => new THREE.Vector3(...a);
const $ = (s) => document.querySelector(s);

const ICONS = {
  etude: 'M6 42h36M10 42V18l14-10 14 10v24M18 42V28h12v14',
  chantier: 'M8 42h32M12 42V14h10v28M22 20h14v22M6 14h20M16 6v8',
  renovation: 'M8 40l14-14M20 12l16 16M28 6l14 14-6 6-14-14zM6 42l4-8 4 4z',
  urbanisme: 'M6 10l12-4 12 4 12-4v32l-12 4-12-4-12 4zM18 6v32M30 10v32',
  permis: 'M12 4h18l8 8v32H12zM30 4v8h8M18 22h14M18 30h14M18 38h8',
  '3d': 'M24 4l18 10v20L24 44 6 34V14zM6 14l18 10 18-10M24 24v20',
};
const SVC_TIMES = [18.0, 24.5, 28.7, 32.7, 35.9, 39.8];
const SVC_FLOOR = ['R+8 · Atelier', 'R+5 · Chantier', 'R+7 · Exposition', 'Vue aérienne', 'R+1 · Archives', 'R+6 · Salle 3D'];

const VERTICAL = new URLSearchParams(location.search).has('v');
if (VERTICAL) document.documentElement.classList.add('vertical');

async function boot() {
  const world = await createWorld($('#world'), { mobile: false, reduced: false, base: '/', manual: true });
  const T = world.tower, S = world.shots;
  const W = (L, x, y, z) => T.toWorld(L, x, L * FH + y, z);
  const push = (shot, k) => V(shot.pos).lerp(V(shot.look), k);

  // ---------- Plans de caméra : [début, fin, fonction(u) → { pos, look, fov, night, … }] ----------
  const hero = { pos: [24, 6.5, 30], look: [-4, 11, -60] };
  const approach = new THREE.CatmullRomCurve3([V(hero.pos), V([-30, 26, -40]), V([-34, 34, -80]), V(W(8, -8, 7, 50))], false, 'centripetal');
  const approachLook = new THREE.CatmullRomCurve3([V(hero.look), V([0, 20, -120]), V([8, 28, -140]), V(W(8, 0, 2, 0))], false, 'centripetal');
  const orbit = (center, r, h, a) => [center[0] + r * Math.sin(a), h, center[2] + r * Math.cos(a)];
  const holo = W(6, -5.5, 1.2, 2.5);
  const towerC = [10, 26, -140];
  const shots = [
    [0, 7.9, (u, t) => { const a = 0.15 + t * 0.06, h = lerp(64, 44, ease(clamp((t - 2.5) / 5.4))); return { pos: [2 * Math.sin(a), h, 2 * Math.cos(a)], look: [0, 0, 0], fov: 40, night: 0.1 }; }],
    [7.9, 11.9, (u) => { const e = ease(u); const p = V([2 * Math.sin(0.62), 44, 2 * Math.cos(0.62)]).lerp(V(hero.pos), e); p.y += Math.sin(Math.PI * u) * 10; return { pos: p.toArray(), look: V([0, 0, 0]).lerp(V(hero.look), ease(clamp(u * 1.3))).toArray(), fov: 38, night: lerp(0.1, 0, u) }; }],
    [11.9, 18.0, (u) => { const e = ease(u); return { pos: approach.getPoint(e).toArray(), look: approachLook.getPoint(e).toArray(), fov: 38, night: lerp(0, 0.45, u), roll: Math.sin(u * Math.PI) * -0.05 }; }],
    [18.0, 24.5, (u) => { const a = V(W(8, -7, 2.4, 16)), b = push(S.atelier, 0.22); return { pos: a.lerp(b, ease(clamp(u * 1.6))).toArray(), look: S.atelier.look, fov: lerp(56, 50, ease(u)), night: 0.6 }; }],
    [24.5, 28.7, (u) => { const a = V(W(5, -9, 2.2, 15)), b = push(S.chantier, 0.15); return { pos: a.lerp(b, ease(clamp(u * 1.5))).toArray(), look: S.chantier.look, fov: lerp(58, 50, ease(u)), night: 0.65 }; }],
    [28.7, 32.7, (u) => { const c = S.expo.look, p = V(S.expo.pos).sub(V(c)).applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(-0.25, 0.25, ease(u))).add(V(c)); return { pos: p.toArray(), look: c, fov: 50, night: 0.7 }; }],
    [32.7, 35.9, (u) => ({ pos: V([70, 150, 30]).lerp(V([30, 118, -40]), ease(u)).toArray(), look: V([10, 0, -80]).lerp(V([10, 0, -110]), ease(u)).toArray(), fov: 40, night: 0.65 })],
    [35.9, 39.8, (u) => { const b = push(S.archives, 0.25); return { pos: V(S.archives.pos).lerp(b, ease(u)).toArray(), look: S.archives.look, fov: 50, night: 0.8 }; }],
    [39.8, 45.4, (u) => { const a = lerp(-0.9, 0.7, ease(u)); return { pos: orbit(holo, lerp(6.5, 4.5, ease(u)), holo[1] + lerp(2.2, 1.2, u), a + Math.atan2(holo[0] - 10, holo[2] + 140)), look: [holo[0], holo[1] + 0.4, holo[2]], fov: 46, night: 0.85, zone: { salle3d: clamp(u * 1.2) } }; }],
    [45.4, 53.3, (u) => ({ pos: orbit(towerC, 78, lerp(24, 36, u), lerp(0.4, 1.3, u)), look: towerC, fov: 38, night: 1 })],
    [53.3, 60.5, (u) => ({ pos: V([-20, 70, 100]).lerp(V([-34, 104, 140]), ease(u)).toArray(), look: [8, 12, -110], fov: 40, night: 1 })],
  ];
  const camAt = (t) => {
    const s = shots.find(([a, b]) => t >= a && t < b) || shots[shots.length - 1];
    const u = clamp((t - s[0]) / (s[1] - s[0]));
    const st = s[2](u, t);
    // Zoom « punch » à chaque coupe : on entre légèrement serré et on se pose
    const since = t - s[0];
    st.fov = (st.fov ?? 38) + (s[0] > 0 ? 7 * (1 - ease(clamp(since / 0.7))) : 0);
    // Vertical 9:16 : champ plus large pour garder le sujet dans le cadre
    if (VERTICAL) st.fov = Math.min(85, st.fov * 1.6);
    return st;
  };
  const droneAt = (t) => {
    if (t < 9.8 || t > 15) return null;
    const u = clamp((t - 9.8) / 5.2);
    const p = V([9, 6.6, 18]).lerp(V([-8, 30, -100]), ease(clamp((u - 0.25) / 0.75)));
    p.y += Math.sin(t * 2.1) * 0.12;
    return { pos: p.toArray(), alpha: smooth(clamp((t - 9.8) / 0.6)), pitch: u > 0.25 ? -0.25 : 0, yaw: Math.PI + 0.35 };
  };

  // ---------- Typographie et habillage (GSAP, en pause : piloté par __render) ----------
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const logoPaths = document.querySelectorAll('#logo path');
  tl.set('#black', { opacity: 1 }, 0)
    .fromTo(logoPaths, { drawSVG: 0 }, { drawSVG: '100%', duration: 1.6, stagger: 0.12, ease: 'power2.inOut' }, 0.3)
    .from('#logo .win rect', { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.06 }, 1.5)
    .from('.logo-word', { opacity: 0, letterSpacing: '1.2em', duration: 1.2 }, 1.4)
    .from('.logo-rule', { scaleX: 0, duration: 1 }, 1.7)
    .to('#logo', { opacity: 0, scale: 1.08, filter: 'blur(6px)', duration: 0.6, ease: 'power2.in' }, 2.7)
    .to('#black', { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 2.8)
    .from('.chrome', { opacity: 0, duration: 0.8 }, 3);
  const pills = document.querySelectorAll('#pillars span');
  tl.set('#pillars', { opacity: 1 }, 0).set(pills, { opacity: 0 }, 0)
    .fromTo(pills, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.95 }, 3.3)
    .from('#pillars i', { scale: 0, duration: 0.4, stagger: 0.95 }, 3.8)
    .to('#pillars', { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in' }, 7.4);
  const title = SplitText.create('#title', { type: 'lines,words', linesClass: 'line', mask: 'lines' });
  tl.set('#title', { opacity: 1 }, 0).set(title.words, { yPercent: 110 }, 0)
    .to(title.words, { yPercent: 0, duration: 0.9, stagger: 0.07 }, 8.0)
    .to('#title', { opacity: 0, y: -40, duration: 0.6, ease: 'power2.in' }, 11.4);
  tl.set('#idea', { opacity: 1 }, 0).set(['.idea__a', '.idea__b'], { opacity: 0 }, 0)
    .fromTo('.idea__a', { opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0.2em', duration: 1.2 }, 12.3)
    .fromTo('.idea__b', { opacity: 0, scale: 1.35, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2 }, 13.1)
    .to('#idea', { opacity: 0, scale: 0.92, duration: 0.6, ease: 'power2.in' }, 17.1);
  tl.set('#svc', { opacity: 0 }, 0);
  SVC_TIMES.forEach((s, i) => {
    const end = (SVC_TIMES[i + 1] ?? 45.4) - 0.35;
    tl.fromTo('#svc', { opacity: 0, x: -70 }, { opacity: 1, x: 0, duration: 0.6, immediateRender: false }, s + 0.15)
      .fromTo('.svc__frame i', { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, stagger: 0.05, immediateRender: false }, s + 0.2)
      .fromTo('[data-ico]', { drawSVG: 0 }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut', immediateRender: false }, s + 0.35)
      .fromTo('.svc__t', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, immediateRender: false }, s + 0.35)
      .fromTo('.svc__p', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, immediateRender: false }, s + 0.55)
      .to('#svc', { opacity: 0, x: 40, duration: 0.3, ease: 'power2.in' }, end);
  });
  // Balayages dorés aux coupes de plan (aucun flash)
  [7.9, 18.0, 24.5, 28.7, 32.7, 35.9, 39.8, 45.4, 53.3].forEach((c) => {
    tl.fromTo('#wipe', { x: -40, opacity: 1 }, { x: 1960, duration: 0.55, ease: 'power2.inOut', immediateRender: false }, c - 0.3)
      .set('#wipe', { opacity: 0 }, c + 0.26);
  });
  // Le site dans un navigateur en 3D
  const imgs = document.querySelectorAll('#screen img');
  tl.set('#site', { opacity: 0 }, 0)
    .to('#dim', { opacity: 0.5, duration: 0.6 }, 45.2)
    .set('#site', { opacity: 1 }, 45.3)
    .fromTo('#browser', { rotateX: 32, rotateY: -26, scale: 0.62, y: 160, opacity: 0 }, { rotateX: 9, rotateY: -12, scale: 0.86, y: 0, opacity: 1, duration: 1.4, ease: 'power3.out' }, 45.3)
    .to('#browser', { rotateX: 4, rotateY: 10, scale: 0.9, duration: 7, ease: 'none' }, 46.7)
;
  const seq = [[45.4, 47.4, '0% 0%', 1.0, 1.1], [47.4, 48.9, '50% 30%', 1.12, 1.0], [48.9, 50.3, '50% 60%', 1.0, 1.14], [50.3, 51.5, '70% 40%', 1.1, 1.0], [51.5, 53.4, '30% 30%', 1.0, 1.16]];
  seq.forEach(([a, b, origin, s0, s1], i) => {
    tl.fromTo(imgs[i], { opacity: 0, scale: s0, transformOrigin: origin }, { opacity: 1, duration: 0.35, ease: 'none', immediateRender: false }, a)
      .to(imgs[i], { scale: s1, duration: b - a, ease: 'none' }, a)
      .to(imgs[i], { opacity: 0, duration: 0.35, ease: 'none' }, b - 0.05);
  });
  tl.fromTo('#pointer', { x: 980, y: 760, opacity: 0 }, { x: 1260, y: 46, opacity: 1, duration: 1.1, ease: 'power2.inOut', immediateRender: false }, 50.2)
    .to('#pointer', { scale: 0.8, duration: 0.12, yoyo: true, repeat: 1 }, 51.3)
    .to('#pointer', { x: 520, y: 520, duration: 1.2, ease: 'power2.inOut' }, 51.7)
    .to('#site', { opacity: 0, scale: 0.94, duration: 0.6, ease: 'power2.in' }, 53.0);
  // Fin
  tl.set('#end', { opacity: 0 }, 0).set('#end', { opacity: 1 }, 53.4)
    .to('#dim', { opacity: 0.62, duration: 0.5 }, 53.3)
    .from('.end__script', { opacity: 0, y: 30, duration: 0.9 }, 53.5)
    .from('.end__t', { opacity: 0, y: 40, duration: 0.9 }, 54.1)
    .fromTo('.logo-svg--end path', { drawSVG: 0 }, { drawSVG: '100%', duration: 1.4, stagger: 0.1, ease: 'power2.inOut', immediateRender: false }, 54.7)
    .from('.end__url', { opacity: 0, letterSpacing: '0.4em', duration: 1 }, 55.5)
    .from('.end__tel', { opacity: 0, y: 20, duration: 0.8 }, 56.1)
    .from('.end__motto', { opacity: 0, duration: 0.8 }, 56.9)
    .to('#black', { opacity: 1, duration: 0.8, ease: 'power2.in' }, 59.2)
    .set({}, {}, 60);

  const labels = [[0, ''], [3, 'Plan RDC · Éch. 1/100'], [7.9, 'Duplex R+1'], [11.9, 'Approche · Tour AMD'], ...SVC_TIMES.map((s, i) => [s, SVC_FLOOR[i]]), [45.4, 'www.amddesign-archi3d.com'], [53.3, 'De l’idée à la réalité']];
  // Sous-titres anglais, calés sur la voix off
  const SUBS = [
    [0.8, 2.9, 'AMD Design.'],
    [3.2, 7.6, 'Architecture, building, urban planning… and 3D.'],
    [7.9, 11.6, 'Designing today to build a better tomorrow.'],
    [12.0, 17.5, 'From the first line to the last detail, we guide you from idea to reality.'],
    [18.1, 24.2, 'Architectural design: custom plans tailored to your needs and budget.'],
    [24.6, 28.5, 'Construction and rigorous site supervision.'],
    [28.8, 32.5, 'Renovation and rehabilitation of your spaces.'],
    [32.8, 35.7, 'Sustainable urban planning and development.'],
    [36.0, 39.6, 'Permits and approvals: we handle your files.'],
    [39.9, 45.0, 'And 3D modelling: see your project before it is built.'],
    [45.6, 52.8, 'Explore our world and describe your project in minutes at amddesign-archi3d.com'],
    [53.4, 57.9, 'Have a project? Entrust it to AMD Design.'],
  ];
  const subs = $('#subs');
  const svc = $('#svc');
  let lastSvc = -1;

  window.__render = (t) => {
    const st = camAt(t);
    const d = droneAt(t);
    world.drive({ t, ...st, draw: t < 3 ? 0 : ease(clamp((t - 3.2) / 3)), build: ease(clamp((t - 6.1) / 2)), drone: d });
    const si = SVC_TIMES.reduce((acc, s, i) => (t >= s ? i : acc), -1);
    if (si !== lastSvc && si >= 0) {
      lastSvc = si;
      const s = SERVICES[si];
      svc.querySelector('[data-n]').textContent = String(si + 1).padStart(2, '0');
      svc.querySelector('[data-floor]').textContent = SVC_FLOOR[si];
      svc.querySelector('[data-ico]').setAttribute('d', ICONS[s.id]);
      svc.querySelector('[data-t]').textContent = s.title;
      svc.querySelector('[data-p]').textContent = s.text;
    }
    tl.seek(t, false);
    subs.textContent = (SUBS.find(([a, b]) => t >= a && t <= b) || [, , ''])[2];
    $('#label').textContent = labels.reduce((acc, [a, l]) => (t >= a ? l : acc), '');
    const f = Math.floor(t * 30);
    $('#tc').textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
  };
  await document.fonts.ready;
  window.__render(0);
  window.__ready = true;
}
boot();
