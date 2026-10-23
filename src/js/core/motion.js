/**
 * Moteur d'animation partagé : GSAP + plugins + Lenis (défilement fluide « vol de drone »).
 * Tous les modules importent gsap/ScrollTrigger d'ici pour partager la même instance.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
CustomEase.create('trait', '0.22, 1, 0.36, 1');
gsap.defaults({ ease: 'trait', duration: 1 });

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const isMobile = window.matchMedia('(max-width: 760px)').matches;

let lenis = null;

export function initSmoothScroll() {
  if (reducedMotion || lenis) return lenis;
  lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(500, 33);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70, duration: 2.2 });
    history.replaceState(null, '', id);
  });
  return lenis;
}

export const getLenis = () => lenis;
export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin };
