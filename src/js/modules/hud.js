/**
 * hud — l'écran de contrôle du drone : viseur, enregistrement, altitude, cap, vitesse,
 * coordonnées GPS (Abidjan) et nom de la zone survolée. Purement décoratif (aria-hidden).
 */
const dms = (v, pos, neg) => {
  const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = ((a - d) * 3600 - m * 60).toFixed(1);
  return `${d}°${String(m).padStart(2, '0')}'${s.padStart(4, '0')}"${v >= 0 ? pos : neg}`;
};

export default function init(el) {
  const $ = (k) => el.querySelector(`[data-hud="${k}"]`);
  const alt = $('alt'), cap = $('cap'), spd = $('spd'), gps = $('gps'), zone = $('zone'), time = $('time'), lvl = $('lvl');
  let level = null;
  let label = '';
  const t0 = performance.now();
  addEventListener('world:hud', ({ detail: d }) => {
    alt.textContent = `${d.alt < 0 ? '−' : ''}${Math.abs(d.alt).toFixed(1).padStart(5, '0')} m`;
    cap.textContent = `${String(Math.round(d.heading)).padStart(3, '0')}°`;
    spd.textContent = `${(d.speed * 3.6).toFixed(0).padStart(2, '0')} km/h`;
    gps.textContent = `${dms(d.lat, 'N', 'S')}  ${dms(d.lon, 'E', 'O')}`;
    const s = Math.floor((performance.now() - t0) / 1000);
    time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (d.label !== label) {
      label = d.label;
      zone.classList.remove('is-in'); void zone.offsetWidth;
      zone.textContent = label; zone.classList.add('is-in');
    }
    if (d.level !== level) {
      level = d.level;
      el.classList.toggle('is-inside', !!level);
      if (level) { lvl.textContent = level; lvl.classList.remove('is-in'); void lvl.offsetWidth; lvl.classList.add('is-in'); }
    }
    el.style.setProperty('--night', d.night.toFixed(2));
  });
  addEventListener('preloader:done', () => el.classList.add('is-on'));
  if (!document.querySelector('[data-module~="preloader"]')) el.classList.add('is-on');
}
