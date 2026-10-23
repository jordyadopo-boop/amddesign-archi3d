/**
 * preloader — l'intro : un plan 2D se trace vu du ciel, les murs montent, le drone décolle vers l'accueil.
 * Jouée une fois par visite (sessionStorage) ; ensuite simple fondu. Bouton « Passer l'intro ».
 * Émet window 'preloader:done' (le hero lance alors son entrée).
 */
import { gsap, stopScroll, startScroll, reducedMotion } from '../core/motion.js';
import { worldReady } from './world.js';

const seen = () => { try { return sessionStorage.getItem('amdIntro') === '1'; } catch { return true; } };

export default async function init(el) {
  const root = document.documentElement;
  const pct = el.querySelector('[data-pre-pct]');
  const step = el.querySelector('[data-pre-step]');
  const skip = el.querySelector('[data-pre-skip]');
  const steps = JSON.parse(el.dataset.steps || '[]');
  const full = !seen() && !reducedMotion;
  scrollTo(0, 0);
  stopScroll();

  let world = null, done = false;
  const count = { v: 0 };
  const counter = gsap.to(count, { v: 100, duration: full ? 6.2 : 1, ease: 'none',
    onUpdate: () => { pct.textContent = String(Math.round(count.v)).padStart(3, '0'); } });
  const setStep = (i) => {
    if (!steps[i]) return;
    step.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> ${steps[i]}`;
    gsap.fromTo(step, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 });
  };

  const finish = () => {
    if (done) return; done = true;
    counter.progress(1);
    try { sessionStorage.setItem('amdIntro', '1'); } catch { /* stockage indisponible */ }
    el.classList.add('show-brand');
    gsap.timeline({ delay: full ? 1.1 : 0.2 })
      .to(el, { opacity: 0, duration: 0.9, ease: 'power2.inOut' })
      .add(() => {
        el.remove(); root.classList.remove('is-loading'); startScroll();
        window.dispatchEvent(new Event('preloader:done'));
      });
  };
  skip?.addEventListener('click', () => { world?.skipIntro(); finish(); });

  // Attendre le monde (créé par le module world, chargé en parallèle)
  for (let i = 0; i < 60 && !worldReady(); i++) await new Promise((r) => setTimeout(r, 50));
  world = await (worldReady() || null);

  if (!full || !world) { setTimeout(finish, full ? 1600 : 300); return; }
  setStep(0);
  el.classList.add('is-transparent');
  setTimeout(() => setStep(1), 2100);
  setTimeout(() => setStep(2), 3700);
  await world.intro();
  finish();
}
