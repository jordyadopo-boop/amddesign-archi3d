/** hero — entrée de l'accueil après l'intro : accroche « encrée », mot CONSTRUIRE qui se trace en or. */
import { gsap, SplitText, reducedMotion } from '../core/motion.js';

export default function init(el) {
  const title = el.querySelector('[data-hero-title]');
  const bits = el.querySelectorAll('[data-hero-anim]');
  if (reducedMotion) return;
  const split = SplitText.create(title, { type: 'lines,chars', mask: 'lines' });
  gsap.set([split.chars, bits], { opacity: 0 });
  const play = () => gsap.timeline()
    .fromTo(split.chars, { yPercent: 110, opacity: 1 }, { yPercent: 0, duration: 1.1, stagger: 0.022 })
    .fromTo(bits, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, '-=0.6')
    .fromTo(el.querySelectorAll('[data-hero-draw] path'), { drawSVG: 0 }, { drawSVG: '100%', duration: 1.4 }, '-=1.2');
  if (document.querySelector('[data-module~="preloader"]')) addEventListener('preloader:done', play, { once: true });
  else play();
}
