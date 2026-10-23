/** header — en-tête fixe : se rétracte en descendant, réapparaît en remontant, lien actif, menu mobile, jauge de vol. */
import { ScrollTrigger, getLenis } from '../core/motion.js';

export default function init(el) {
  const burger = el.querySelector('[data-burger]');
  const nav = el.querySelector('[data-nav]');
  const bar = el.querySelector('[data-progress]');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    el.classList.toggle('is-scrolled', y > 30);
    el.classList.toggle('is-hidden', y > 300 && y > lastY && !nav.classList.contains('is-open'));
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('menu-open', open);
    open ? getLenis()?.stop() : getLenis()?.start();
  };
  burger.addEventListener('click', () => toggle(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) toggle(false); });

  nav.querySelectorAll('a[href*="#"]').forEach((a) => {
    const id = a.getAttribute('href').split('#')[1];
    const sec = id && document.getElementById(id);
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (st) => a.classList.toggle('is-active', st.isActive) });
  });
}
