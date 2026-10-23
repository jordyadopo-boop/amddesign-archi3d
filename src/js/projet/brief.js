/**
 * La fiche projet : état (persisté dans le navigateur), numéro, message WhatsApp.
 * Aucune donnée n'est envoyée nulle part sans action du visiteur.
 */
import { BRIEF, BRAND } from '../config.js';

const KEY = 'amdBrief';
const today = () => new Date();
const pad = (n) => String(n).padStart(2, '0');

export const defaults = () => ({
  type: BRIEF.types[0], missions: [BRIEF.missions[0]], terrain: BRIEF.terrain[0], lieu: '',
  surface: 180, levels: BRIEF.levels[1], rooms: 3, style: BRIEF.styles[0],
  budget: BRIEF.budgets[0], delay: BRIEF.delays[1], note: '',
  name: '', phone: '', email: '', company: '', number: '',
});

export function load() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return defaults(); }
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ } }

export function ensureNumber(s) {
  if (!s.number) {
    const d = today();
    const id = Math.random().toString(36).slice(2, 6).toUpperCase();
    s.number = `AMD-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${id}`;
  }
  return s.number;
}

export const dateFr = (d = today()) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
export const levelsCount = (lv) => Math.max(1, BRIEF.levels.indexOf(lv) + 1);
export const sketchKind = (type) => (/immeuble|bureaux/i.test(type) ? 'immeuble' : 'villa');

/** Numéro ivoirien : 10 chiffres (+225 / 00225 accepté). */
export function normalizePhone(v) {
  let d = String(v || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+225')) d = d.slice(4); else if (d.startsWith('00225')) d = d.slice(5);
  d = d.replace(/\D/g, '');
  return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : null;
}

export function lines(s) {
  return [
    ['Projet', s.type],
    ['Missions', s.missions.join(', ') || '—'],
    ['Terrain', s.terrain],
    ['Localisation', s.lieu || '—'],
    ['Surface souhaitée', `${s.surface} m²`],
    ['Niveaux', s.levels],
    ['Chambres', String(s.rooms)],
    ['Style', s.style],
    ['Budget indicatif', s.budget],
    ['Démarrage', s.delay],
  ];
}

export function whatsappMessage(s) {
  const out = [
    `Bonjour ${BRAND.name}, voici ma fiche projet n° ${s.number}.`,
    '',
    ...lines(s).map(([k, v]) => `• ${k} : ${v}`),
    s.note ? `\nMon projet : ${s.note}` : '',
    '',
    `Nom : ${s.name}`,
    s.company ? `Structure : ${s.company}` : '',
    `WhatsApp : ${s.phone}`,
    s.email ? `E-mail : ${s.email}` : '',
  ];
  return out.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').trim();
}
