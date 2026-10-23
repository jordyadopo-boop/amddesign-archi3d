/** gallery — réalisations filtrables (générées depuis config.js) + visionneuse plein écran au clavier. */
import { PROJECTS, PROJECT_FILTERS } from '../config.js';
import { gsap, ScrollTrigger, reducedMotion } from '../core/motion.js';

const img = (f) => `${import.meta.env.BASE_URL}img/${f}`;

export default function init(el) {
  const bar = el.querySelector('[data-filters]');
  const grid = el.querySelector('[data-grid]');
  const box = el.querySelector('[data-lightbox]');
  bar.innerHTML = PROJECT_FILTERS.map(([k, l], i) =>
    `<button type="button" class="chip${i ? '' : ' is-active'}" data-f="${k}" aria-pressed="${!i}">${l}</button>`).join('');
  grid.innerHTML = PROJECTS.map((p, i) => `
    <figure class="work" data-cat="${p.cat}" data-i="${i}">
      <span class="work__edge" aria-hidden="true"><b>AMD 400</b><span>${String(i + 1).padStart(2, '0')}A</span><span>▸ ${i * 2 + 12}</span></span>
      <button type="button" class="work__btn" aria-label="Agrandir : ${p.title}">
        <img src="${img(p.img)}" alt="${p.title}" loading="lazy" decoding="async">
      </button>
      <figcaption><b>${p.title}</b><span>${p.tag}</span></figcaption>
    </figure>`).join('');
  const works = [...grid.children];

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    bar.querySelectorAll('[data-f]').forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    const f = b.dataset.f;
    const show = works.filter((w) => f === 'all' || w.dataset.cat === f);
    works.forEach((w) => { w.hidden = !show.includes(w); });
    if (!reducedMotion) gsap.fromTo(show, { opacity: 0, y: 30, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.9, stagger: 0.06 });
    ScrollTrigger.refresh();
  });

  // Visionneuse
  const bImg = box.querySelector('img'), bCap = box.querySelector('figcaption');
  let cur = 0;
  const visible = () => works.filter((w) => !w.hidden);
  const show = (i) => {
    const list = visible(); cur = (i + list.length) % list.length;
    const p = PROJECTS[list[cur].dataset.i];
    bImg.src = img(p.img); bImg.alt = p.title; bCap.textContent = `${p.title} · ${p.tag}`;
  };
  const open = (w) => { show(visible().indexOf(w)); box.showModal(); };
  grid.addEventListener('click', (e) => { const w = e.target.closest('.work'); if (w) open(w); });
  box.querySelector('[data-prev]').addEventListener('click', () => show(cur - 1));
  box.querySelector('[data-next]').addEventListener('click', () => show(cur + 1));
  box.querySelector('[data-close]').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });

  // Les vignettes apparaissent comme un tirage de plan qui sort du traceur
  if (!reducedMotion) gsap.from(works, { clipPath: 'inset(0 0 100% 0)', y: 40, duration: 1.2, stagger: 0.08,
    scrollTrigger: { trigger: grid, start: 'top 85%', toggleActions: 'play none none none' } });
}
