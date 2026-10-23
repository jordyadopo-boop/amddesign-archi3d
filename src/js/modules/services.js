/** services — génère les fiches services depuis config.js ; les icônes se tracent à l'apparition. */
import { SERVICES } from '../config.js';

const ICONS = {
  etude: 'M6 42h36M10 42V18l14-10 14 10v24M18 42V28h12v14',
  chantier: 'M8 42h32M12 42V14h10v28M22 20h14v22M6 14h20M16 6v8',
  renovation: 'M8 40l14-14M20 12l16 16M28 6l14 14-6 6-14-14zM6 42l4-8 4 4z',
  urbanisme: 'M6 10l12-4 12 4 12-4v32l-12 4-12-4-12 4zM18 6v32M30 10v32',
  permis: 'M12 4h18l8 8v32H12zM30 4v8h8M18 22h14M18 30h14M18 38h8',
  '3d': 'M24 4l18 10v20L24 44 6 34V14zM6 14l18 10 18-10M24 24v20',
};

export default function init(el) {
  el.innerHTML = SERVICES.map((s, i) => `
    <article class="svc panel" data-module="fx-tilt">
      <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
      <svg class="svc__ico" viewBox="0 0 48 48" aria-hidden="true" data-draw><path d="${ICONS[s.id]}"/></svg>
      <h3>${s.title}</h3>
      <p>${s.text}</p>
    </article>`).join('');
  // Les fiches injectées portent elles-mêmes des modules : on les charge.
  const loaders = import.meta.glob('./fx-tilt.js');
  el.querySelectorAll('[data-module="fx-tilt"]').forEach((c) => loaders['./fx-tilt.js']().then((m) => m.default(c)));
}
