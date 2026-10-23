/**
 * fx-cursor — curseur « viseur d'architecte » : réticule, lignes de construction qui traversent l'écran,
 * coordonnées en direct ; s'ouvre en cadre sur les éléments cliquables. Pointeur fin uniquement.
 */
import { gsap, finePointer, reducedMotion } from '../core/motion.js';

export default function init(el) {
  if (!finePointer || reducedMotion) { el.remove(); return; }
  const ring = el.querySelector('[data-cur-ring]');
  const coords = el.querySelector('[data-cur-xy]');
  const hx = el.querySelector('[data-cur-h]'), vy = el.querySelector('[data-cur-v]');
  const qx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
  const qy = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
  document.documentElement.classList.add('has-cursor');
  addEventListener('pointermove', (e) => {
    el.classList.add('is-on');
    qx(e.clientX); qy(e.clientY);
    hx.style.transform = `translateY(${e.clientY}px)`;
    vy.style.transform = `translateX(${e.clientX}px)`;
    coords.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 16}px)`;
    coords.textContent = `X ${String(Math.round(e.clientX)).padStart(4, '0')} · Y ${String(Math.round(e.clientY + scrollY)).padStart(5, '0')}`;
    const hot = e.target.closest('a, button, input, select, textarea, label, [data-cursor]');
    el.classList.toggle('is-hot', !!hot);
  }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
  addEventListener('pointerdown', () => el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
}
