(() => {
  'use strict';
  const WA_NUMBER = '2250757662091';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Header au scroll + parallaxe légère du hero
  const header = $('#header');
  const heroBg = $('.hero__bg');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (heroBg && y < window.innerHeight) heroBg.style.transform = `translateY(${y * 0.25}px) scale(1.05)`;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu mobile
  const burger = $('#burger');
  const nav = $('#nav');
  const toggleMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => toggleMenu(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  // Animations au scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });

  // Galerie filtrable
  const works = $$('.work');
  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter').forEach(b => b.classList.toggle('is-active', b === btn));
    const f = btn.dataset.filter;
    works.forEach(w => w.classList.toggle('is-hidden', f !== 'all' && w.dataset.cat !== f));
  }));

  // Lightbox
  const lb = $('#lightbox');
  const lbImg = $('img', lb);
  const lbCap = $('figcaption', lb);
  let current = 0;
  const visible = () => works.filter(w => !w.classList.contains('is-hidden'));
  const show = (i) => {
    const list = visible();
    current = (i + list.length) % list.length;
    const img = $('img', list[current]);
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbCap.textContent = img.alt;
  };
  works.forEach(w => w.addEventListener('click', () => {
    show(visible().indexOf(w));
    lb.hidden = false; document.body.style.overflow = 'hidden';
  }));
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
  $('.lightbox__close', lb).addEventListener('click', close);
  $('.lightbox__prev', lb).addEventListener('click', () => show(current - 1));
  $('.lightbox__next', lb).addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  // Slider avant / après
  const ba = $('#ba');
  const range = $('#baRange');
  if (ba && range) range.addEventListener('input', () => ba.style.setProperty('--pos', `${range.value}%`));

  // Formulaire → WhatsApp
  const form = $('#devisForm');
  const error = $('#formError');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const missing = $$('[required]', form).filter(el => !el.value.trim());
    $$('.is-invalid', form).forEach(el => el.classList.remove('is-invalid'));
    missing.forEach(el => el.classList.add('is-invalid'));
    if (missing.length) { error.textContent = 'Merci de renseigner le type de projet, votre nom et votre numéro WhatsApp.'; return; }
    error.textContent = '';
    const lines = [
      'Bonjour AMD Design, je souhaite un devis.',
      '',
      `• Type de projet : ${d.type}`,
      d.surface && `• Surface : ${d.surface} m²`,
      d.budget && `• Budget : ${d.budget}`,
      d.lieu && `• Localisation : ${d.lieu}`,
      `• Nom : ${d.nom}`,
      `• WhatsApp : ${d.tel}`,
      d.msg && `\n${d.msg}`
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines)}`, '_blank', 'noopener');
  });

  $('#year').textContent = new Date().getFullYear();
})();
