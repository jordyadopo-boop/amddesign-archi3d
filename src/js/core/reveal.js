/**
 * Animations déclaratives (attributs HTML) :
 *  data-reveal[="up|fade|left|right|scale"]  apparition ; data-reveal-delay
 *  data-reveal-stagger                         enfants en cascade
 *  data-split                                  titre « encré » : lettres tracées puis remplies
 *  data-draw                                   traits SVG (path, line, rect…) dessinés à l'apparition
 *  data-count="12"                             compteur (data-count-suffix)
 * Le contenu reste visible sans JS et en mouvement réduit (on anime depuis l'état visible).
 */
import { gsap, ScrollTrigger, SplitText, reducedMotion } from './motion.js';

export function initReveals(root = document) {
  if (reducedMotion) return;

  root.querySelectorAll('[data-split]:not([data-split-done])').forEach((el) => {
    el.setAttribute('data-split-done', '');
    SplitText.create(el, {
      type: 'lines,words,chars', linesClass: 'split-line', mask: 'lines', autoSplit: true,
      onSplit(self) {
        return gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
          .from(self.chars, { yPercent: 105, duration: 1, stagger: 0.016 })
          .from(self.chars, { '--ink': 0, duration: 1.2, stagger: 0.016, ease: 'power2.inOut' }, 0.25);
      },
    });
  });

  root.querySelectorAll('[data-reveal]:not([data-reveal-done])').forEach((el) => {
    el.setAttribute('data-reveal-done', '');
    const kind = el.dataset.reveal || 'up';
    const from = { opacity: 0, duration: 1.2 };
    if (kind === 'up') from.y = 50;
    if (kind === 'left') from.x = -70;
    if (kind === 'right') from.x = 70;
    if (kind === 'scale') Object.assign(from, { scale: 0.94, filter: 'blur(8px)' });
    gsap.from(el, { ...from, delay: Number(el.dataset.revealDelay || 0), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  root.querySelectorAll('[data-reveal-stagger]:not([data-reveal-done])').forEach((el) => {
    el.setAttribute('data-reveal-done', '');
    gsap.from(el.children, {
      opacity: 0, y: 44, duration: 1.1, stagger: Number(el.dataset.revealStagger || 0.09),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  root.querySelectorAll('[data-draw]:not([data-draw-done])').forEach((el) => {
    el.setAttribute('data-draw-done', '');
    const strokes = el.querySelectorAll('path, line, polyline, rect, circle');
    gsap.from(strokes, { drawSVG: 0, duration: 1.6, stagger: 0.08, ease: 'power2.inOut',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  root.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count), suffix = el.dataset.countSuffix || '';
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = String(Math.round(o.v)).padStart(String(end).length, '0') + suffix; } });
  });
}

export const refresh = () => ScrollTrigger.refresh();
