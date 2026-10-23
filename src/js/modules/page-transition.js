/**
 * page-transition — entre deux pages, une feuille de plan glisse sur l'écran (trame, cartouche, logo tracé),
 * puis se retire sur la nouvelle page. Liens internes .html uniquement.
 */
import { gsap, reducedMotion } from '../core/motion.js';

const KEY = 'amdNav';

export default function init(el) {
  const label = el.querySelector('[data-pt-label]');
  let from = null;
  try { from = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch { /* */ }
  if (from && !reducedMotion) {
    label.textContent = document.title.split('·')[0].trim();
    gsap.set(el, { yPercent: 0, visibility: 'visible' });
    gsap.to(el, { yPercent: -100, duration: 1.1, ease: 'power4.inOut', delay: 0.25, onComplete: () => gsap.set(el, { visibility: 'hidden' }) });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || reducedMotion) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !/(\.html|\/)$/.test(url.pathname)) return;
    e.preventDefault();
    label.textContent = a.dataset.ptLabel || a.textContent.trim();
    try { sessionStorage.setItem(KEY, '1'); } catch { /* */ }
    gsap.set(el, { yPercent: 100, visibility: 'visible' });
    el.querySelectorAll('path').forEach((p) => gsap.fromTo(p, { drawSVG: 0 }, { drawSVG: '100%', duration: 0.9, delay: 0.3 }));
    gsap.to(el, { yPercent: 0, duration: 0.85, ease: 'power4.inOut', onComplete: () => { location.href = url.href; } });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(el, { visibility: 'hidden' }); });
}
