/**
 * world — le monde 3D survolé en drone, fixe derrière tout le site.
 * Chaque section porte data-cam="<plan>" (voir SHOTS dans world/world.js) ; data-cam-progress
 * transmet en plus son avancement au monde (chantier qui monte, plan de coupe qui balaie…).
 * Sans WebGL : repli sur le fond de plans 2D (plan/view.js).
 */
import { ScrollTrigger, reducedMotion, isMobile } from '../core/motion.js';

function webgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

let ready;
/** Promesse du monde (ou null en repli), utilisée par le préchargeur. */
export const worldReady = () => ready;

export default function init(canvas) {
  ready = (async () => {
    if (!webgl()) { document.documentElement.classList.add('no-webgl'); (await import('./plans-fallback.js')).default(canvas); return null; }
    const { createWorld } = await import('../world/world.js');
    const world = await createWorld(canvas, { mobile: isMobile, reduced: reducedMotion });
    const sections = [...document.querySelectorAll('[data-cam]')];
    const measure = () => {
      world.setKeyframes(sections.map((s) => ({
        name: s.dataset.cam,
        y: Math.max(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2),
      })));
    };
    measure();
    ScrollTrigger.addEventListener('refresh', measure);
    addEventListener('load', measure);
    sections.filter((s) => s.hasAttribute('data-cam-progress')).forEach((s) => {
      ScrollTrigger.create({ trigger: s, start: 'top 85%', end: 'bottom 40%',
        onUpdate: (st) => world.setZoneProgress(s.dataset.cam, st.progress) });
    });
    document.documentElement.classList.add('has-world');
    return world;
  })().catch((err) => { console.error('[world]', err); return null; });
  return ready;
}
