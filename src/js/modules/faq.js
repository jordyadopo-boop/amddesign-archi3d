/** faq — accordéon accessible (details/summary) avec ouverture animée ; une seule question ouverte à la fois. */
import { gsap, reducedMotion } from '../core/motion.js';

export default function init(el) {
  const items = [...el.querySelectorAll('details')];
  items.forEach((d) => {
    const body = d.querySelector('.faq__a');
    d.querySelector('summary').addEventListener('click', (e) => {
      if (reducedMotion) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: 0.5, onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
      } else {
        items.filter((o) => o !== d && o.open).forEach((o) => o.querySelector('summary').click());
        d.open = true;
        gsap.from(body, { height: 0, opacity: 0, duration: 0.6 });
      }
    });
  });
}
