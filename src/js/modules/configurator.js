/**
 * configurator — la fiche projet : 4 étapes, une planche vivante (esquisse 2D/3D générée depuis les réponses
 * + cartouche d'architecte), export PDF et envoi WhatsApp. Données lues dans config.js (BRIEF).
 */
import { BRIEF } from '../config.js';
import { gsap, reducedMotion } from '../core/motion.js';
import { waLink } from '../core/whatsapp.js';
import { PlanView, HALF_PI, lerp } from '../plan/view.js';
import { sketch } from '../plan/models.js';
import { load, save, ensureNumber, dateFr, levelsCount, sketchKind, normalizePhone, whatsappMessage } from '../projet/brief.js';

export default function init(el) {
  const s = load();
  const form = el.querySelector('[data-form]');
  const steps = [...el.querySelectorAll('[data-step]')];
  const crumbs = [...el.querySelectorAll('[data-goto]')];
  const err = el.querySelector('[data-error]');
  const prev = el.querySelector('[data-prev]'), next = el.querySelector('[data-next]');
  const done = el.querySelector('[data-done]');
  let step = 0;

  // ---------- Options générées depuis config.js ----------
  el.querySelectorAll('[data-options]').forEach((box) => {
    const list = BRIEF[box.dataset.options], name = box.dataset.name, multi = box.hasAttribute('data-multi');
    box.setAttribute('role', multi ? 'group' : 'radiogroup');
    box.innerHTML = list.map((v) => `<label class="opt"><input type="${multi ? 'checkbox' : 'radio'}" name="${name}" value="${v}"><span>${v}</span></label>`).join('');
  });
  el.querySelectorAll('[data-select]').forEach((sel) => { sel.innerHTML = BRIEF[sel.dataset.select].map((v) => `<option>${v}</option>`).join(''); });

  // ---------- État ⇄ formulaire ----------
  const fill = () => {
    form.querySelectorAll('input[type=radio]').forEach((i) => { i.checked = s[i.name] === i.value; });
    form.querySelectorAll('input[type=checkbox]').forEach((i) => { i.checked = s[i.name].includes(i.value); });
    ['lieu', 'note', 'name', 'phone', 'email', 'company', 'style', 'surface'].forEach((k) => { if (form.elements[k]) form.elements[k].value = s[k]; });
    el.querySelector('[data-rooms-out]').textContent = s.rooms;
    el.querySelector('[data-surface-out]').textContent = `${s.surface} m²`;
  };
  const read = () => {
    const f = form.elements;
    s.missions = [...form.querySelectorAll('input[name=missions]:checked')].map((i) => i.value);
    ['type', 'terrain', 'levels', 'budget', 'delay'].forEach((k) => { const c = form.querySelector(`input[name=${k}]:checked`); if (c) s[k] = c.value; });
    ['lieu', 'note', 'name', 'phone', 'email', 'company', 'style'].forEach((k) => { s[k] = f[k].value.trim(); });
    s.surface = Number(f.surface.value);
  };
  fill();

  // ---------- Planche : cartouche + esquisse ----------
  const C = (k) => el.querySelector(`[data-c="${k}"]`);
  ensureNumber(s);
  const cart = () => {
    C('type').textContent = s.type; C('lieu').textContent = s.lieu || '—';
    C('surface').textContent = `${s.surface} m²`; C('levels').textContent = s.levels;
    C('name').textContent = s.name || '—'; C('date').textContent = dateFr(); C('number').textContent = s.number;
  };
  const canvas = el.querySelector('[data-sketch]');
  const view = new PlanView(canvas, { gold: '#c8902e', grey: '#9a958e', ink: '#d9d2c6' });
  let model = null, key = '', anim = { draw: 0 }, ext = 1, extT = 1, yaw = -0.7;
  const rebuild = () => {
    const k = `${s.surface}|${s.levels}|${s.type}`;
    if (k === key) return;
    key = k;
    model = sketch({ surface: s.surface, levels: levelsCount(s.levels), kind: sketchKind(s.type) });
    anim.draw = 0;
    gsap.to(anim, { draw: 1, duration: reducedMotion ? 0 : 1.6, ease: 'power2.inOut', overwrite: true });
  };
  el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    extT = b.dataset.view === '3d' ? 1 : 0;
    el.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('is-active', x === b));
  }));
  new ResizeObserver(() => view.resize()).observe(canvas);
  gsap.ticker.add((t, dt) => {
    ext = lerp(ext, extT, Math.min(1, dt / 400));
    if (!reducedMotion) yaw += dt / 1000 * 0.12;
    view.render(model, { draw: anim.draw, ext, pitch: lerp(HALF_PI, 0.62, ext), yaw, zoom: 0.78, alpha: 1, grid: 1, px: view.w / 2, py: view.h * 0.54 });
  });

  const sync = () => { read(); save(s); cart(); rebuild(); el.querySelector('[data-surface-out]').textContent = `${s.surface} m²`; };
  form.addEventListener('input', sync);
  form.addEventListener('change', sync);
  el.querySelector('[data-stepper="rooms"]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    s.rooms = Math.min(12, Math.max(0, s.rooms + Number(b.dataset.d)));
    el.querySelector('[data-rooms-out]').textContent = s.rooms; save(s);
  });
  sync();

  // ---------- Étapes ----------
  const validate = (i) => {
    err.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    if (i === 0 && !s.missions.length) { err.textContent = 'Choisissez au moins une mission.'; return false; }
    if (i === 3) {
      const bad = [];
      if (!s.name) bad.push(form.elements.name);
      const ph = normalizePhone(s.phone);
      if (!ph) bad.push(form.elements.phone); else { s.phone = ph; form.elements.phone.value = ph; save(s); }
      if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) bad.push(form.elements.email);
      if (bad.length) {
        bad.forEach((x) => x.setAttribute('aria-invalid', 'true'));
        err.textContent = 'Vérifiez votre nom, votre numéro WhatsApp (10 chiffres) et votre e-mail.';
        bad[0].focus();
        return false;
      }
    }
    return true;
  };
  const go = (i, force = false) => {
    if (!force && i > step && !validate(step)) return;
    step = Math.max(0, Math.min(3, i));
    steps.forEach((f, k) => { f.hidden = k !== step; });
    crumbs.forEach((b, k) => { b.toggleAttribute('aria-current', k === step); if (k === step) b.setAttribute('aria-current', 'step'); b.classList.toggle('is-done', k < step); });
    prev.hidden = step === 0;
    next.textContent = step === 3 ? 'Terminer ma fiche' : 'Suivant →';
    done.hidden = true;
    extT = step === 0 ? 0 : 1;
    el.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('is-active', (x.dataset.view === '3d') === (extT === 1)));
    if (!reducedMotion) gsap.from(steps[step], { opacity: 0, x: 30, duration: 0.6 });
  };
  crumbs.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.goto))));
  prev.addEventListener('click', () => go(step - 1, true));
  next.addEventListener('click', () => {
    if (step < 3) { go(step + 1); return; }
    if (!validate(3)) return;
    done.hidden = false;
    next.hidden = true;
    if (!reducedMotion) gsap.from(done.children, { y: 20, opacity: 0, stagger: 0.1, duration: 0.7 });
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  go(0, true);

  // ---------- Export ----------
  el.querySelector('[data-wa]').addEventListener('click', () => {
    read(); ensureNumber(s); save(s);
    window.open(waLink(whatsappMessage(s)), '_blank', 'noopener');
  });
  el.querySelector('[data-pdf]').addEventListener('click', async (e) => {
    const btn = e.currentTarget; read(); ensureNumber(s); save(s);
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Préparation du PDF…';
    try {
      const { createPdf } = await import('../projet/pdf.js');
      const blob = await createPdf(s, canvas.toDataURL('image/png'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `Fiche-projet-${s.number}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (er) { console.error(er); err.textContent = 'Le PDF n’a pas pu être créé. Envoyez votre fiche sur WhatsApp.'; }
    btn.disabled = false; btn.textContent = label;
  });
}
