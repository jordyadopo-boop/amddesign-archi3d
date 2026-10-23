/** fx-magnetic — le bouton est attiré par le pointeur, puis revient avec un léger rebond. */
import { gsap, finePointer, reducedMotion } from '../core/motion.js';

export default function init(el) {
  if (!finePointer || reducedMotion) return;
  const k = Number(el.dataset.magnetic || 0.3);
  const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
  const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
  el.addEventListener('pointermove', (e) => {
    const b = el.getBoundingClientRect();
    qx((e.clientX - b.left - b.width / 2) * k); qy((e.clientY - b.top - b.height / 2) * k);
  });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' }));
}
