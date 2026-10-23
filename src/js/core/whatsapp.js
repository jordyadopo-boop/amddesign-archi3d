import { BRAND } from '../config.js';

/** Lien WhatsApp vers AMD Design avec message prérempli. */
export const waLink = (text = '', number = BRAND.whatsapp) =>
  `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telLink = (tel) => `tel:+225${tel.replace(/\s/g, '')}`;
