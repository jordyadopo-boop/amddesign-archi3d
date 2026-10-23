/**
 * fx-calque — un papier calque portant le croquis recouvre le rendu 3D : on l'efface au doigt ou à la souris
 * pour révéler la réalité, et le calque se redessine lentement. Bouton data-calque-reveal : tout révéler.
 * Contient : <img data-calque-sketch> (le croquis) et le rendu en dessous ; un <canvas> est ajouté.
 */
import { gsap, reducedMotion } from '../core/motion.js';

export default function init(el) {
  const sketch = el.querySelector('[data-calque-sketch]');
  const canvas = document.createElement('canvas');
  canvas.className = 'calque__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, last = null, healing = true;
  const paper = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f4f1ec'; ctx.fillRect(0, 0, w, h);
    if (sketch.complete && sketch.naturalWidth) {
      const r = Math.max(w / sketch.naturalWidth, h / sketch.naturalHeight);
      const iw = sketch.naturalWidth * r, ih = sketch.naturalHeight * r;
      ctx.drawImage(sketch, (w - iw) / 2, (h - ih) / 2, iw, ih);
    }
  };
  const resize = () => {
    const b = el.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); w = b.width; h = b.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paper();
  };
  sketch.decode?.().then(resize).catch(resize);
  new ResizeObserver(resize).observe(el);

  const erase = (x, y) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(70, w * 0.09);
    ctx.beginPath(); ctx.moveTo(last?.x ?? x, last?.y ?? y); ctx.lineTo(x, y); ctx.stroke();
    last = { x, y };
  };
  const pos = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  canvas.addEventListener('pointerdown', (e) => { last = null; erase(...pos(e)); el.classList.add('is-touched'); });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) erase(...pos(e)); });
  canvas.addEventListener('pointerleave', () => { last = null; });

  // Le calque se redessine lentement (le croquis revient) quand on ne touche plus.
  let quiet = 0;
  canvas.addEventListener('pointermove', () => { quiet = 0; });
  if (!reducedMotion) gsap.ticker.add((t, dt) => {
    quiet += dt;
    if (!healing || quiet < 1800) return;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalAlpha = 0.012;
    ctx.fillStyle = '#f4f1ec'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  });

  el.querySelector('[data-calque-reveal]')?.addEventListener('click', (e) => {
    const open = !el.classList.contains('is-revealed');
    el.classList.toggle('is-revealed', open);
    healing = !open;
    e.currentTarget.textContent = open ? 'Revenir au croquis' : 'Révéler le rendu';
    if (!open) resize();
  });
}
