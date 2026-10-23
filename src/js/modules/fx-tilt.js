/** fx-tilt — la carte s'incline en 3D vers le pointeur, un reflet doré la traverse. */
import { gsap, finePointer, reducedMotion } from '../core/motion.js';

export default function init(el) {
  if (!finePointer || reducedMotion) return;
  const max = Number(el.dataset.tilt || 8);
  gsap.set(el, { transformPerspective: 900 });
  const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
  const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
  el.addEventListener('pointermove', (e) => {
    const b = el.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    ry((x - 0.5) * max * 2); rx((0.5 - y) * max * 2);
    el.style.setProperty('--mx', `${x * 100}%`); el.style.setProperty('--my', `${y * 100}%`);
  });
  el.addEventListener('pointerleave', () => { rx(0); ry(0); });
}
