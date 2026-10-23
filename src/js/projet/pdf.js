/**
 * Fiche projet en PDF (jsPDF, chargé à la demande) : en-tête AMD Design, réponses, esquisse,
 * cartouche d'architecte et lien WhatsApp cliquable.
 */
import { BRAND } from '../config.js';
import { lines, dateFr, whatsappMessage } from './brief.js';
import { waLink } from '../core/whatsapp.js';

const GOLD = [200, 144, 46], INK = [30, 30, 30], MUTED = [110, 106, 100], PAPER = [247, 245, 242];
const clean = (t) => String(t).replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[  ]/g, ' ').replace(/−/g, '-');

export async function createPdf(s, sketchDataUrl) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16;

  // En-tête anthracite
  pdf.setFillColor(...INK); pdf.rect(0, 0, W, 38, 'F');
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.6); pdf.line(M, 38, W - M, 38);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(...PAPER);
  pdf.text('AMD', M, 20);
  pdf.setTextColor(...GOLD); pdf.text('DESIGN', M + 22, 20);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(200, 196, 190);
  pdf.text(clean('ARCHITECTURE • BÂTIMENT • URBANISME • 3D').replace(/•/g, '-'), M, 28);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(...PAPER);
  pdf.text('FICHE PROJET', W - M, 18, { align: 'right' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...GOLD);
  pdf.text(`N° ${s.number}`, W - M, 25, { align: 'right' });
  pdf.setTextColor(200, 196, 190); pdf.text(clean(dateFr()), W - M, 31, { align: 'right' });

  // Réponses
  let y = 50;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...GOLD);
  pdf.text('LE PROJET', M, y); y += 6;
  pdf.setFontSize(9.5);
  for (const [k, v] of lines(s)) {
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED); pdf.text(clean(k), M, y);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...INK);
    const wrapped = pdf.splitTextToSize(clean(v), 62);
    pdf.text(wrapped, M + 34, y);
    y += 5.6 * wrapped.length;
  }
  if (s.note) {
    y += 3;
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...GOLD); pdf.setFontSize(10); pdf.text('EN QUELQUES MOTS', M, y); y += 6;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...INK); pdf.setFontSize(9.5);
    const w = pdf.splitTextToSize(clean(s.note), 96);
    pdf.text(w.slice(0, 12), M, y); y += 5 * Math.min(12, w.length);
  }
  y += 4;
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...GOLD); pdf.setFontSize(10); pdf.text("MAÎTRE D'OUVRAGE".replace('Î', 'I'), M, y); y += 6;
  pdf.setFontSize(9.5);
  for (const [k, v] of [['Nom', s.name], ['Structure', s.company], ['WhatsApp', s.phone], ['E-mail', s.email]]) {
    if (!v) continue;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...MUTED); pdf.text(k, M, y);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...INK); pdf.text(clean(v), M + 34, y); y += 5.6;
  }

  // Esquisse (planche de droite)
  const sx = 116, sy = 46, sw = W - M - sx;
  let sh = 96;
  if (sketchDataUrl) { const ip = pdf.getImageProperties(sketchDataUrl); sh = Math.min(110, (sw * ip.height) / ip.width); }
  pdf.setFillColor(28, 28, 28); pdf.rect(sx, sy, sw, sh, 'F');
  if (sketchDataUrl) pdf.addImage(sketchDataUrl, 'PNG', sx + 1, sy + 1, sw - 2, sh - 2, undefined, 'FAST');
  pdf.setDrawColor(...GOLD); pdf.setLineWidth(0.4); pdf.rect(sx, sy, sw, sh);
  pdf.setFontSize(7); pdf.setTextColor(...MUTED); pdf.setFont('helvetica', 'normal');
  pdf.text('Esquisse indicative, non contractuelle', sx, sy + sh + 4);

  // Cartouche
  const cy = 250, ch = 26;
  pdf.setDrawColor(...INK); pdf.setLineWidth(0.4); pdf.rect(M, cy, W - 2 * M, ch);
  const cols = [M, M + 52, M + 100, M + 140, W - M];
  cols.slice(1, -1).forEach((x) => pdf.line(x, cy, x, cy + ch));
  pdf.line(M + 52, cy + ch / 2, W - M, cy + ch / 2);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...INK); pdf.text('AMD', M + 5, cy + 12);
  pdf.setTextColor(...GOLD); pdf.text('DESIGN', M + 19, cy + 12);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(...MUTED); pdf.text("De l'idée à la réalité".replace('é', 'e').replace('é', 'e'), M + 5, cy + 19);
  const cell = (x, yy, label, value) => {
    pdf.setFontSize(6); pdf.setTextColor(...MUTED); pdf.text(label.toUpperCase(), x + 2, yy + 4);
    pdf.setFontSize(8.5); pdf.setTextColor(...INK); pdf.setFont('helvetica', 'bold');
    pdf.text(pdf.splitTextToSize(clean(value || '-'), 36)[0], x + 2, yy + 10); pdf.setFont('helvetica', 'normal');
  };
  cell(cols[1], cy, 'Projet', s.type); cell(cols[2], cy, 'Lieu', s.lieu); cell(cols[3], cy, 'N° de fiche', s.number);
  cell(cols[1], cy + ch / 2, "Maitre d'ouvrage", s.name); cell(cols[2], cy + ch / 2, 'Surface', `${s.surface} m2 · ${s.levels}`.replace('·', '-'));
  cell(cols[3], cy + ch / 2, 'Date', new Date().toLocaleDateString('fr-FR'));

  // Pied : contacts, lien WhatsApp, mention
  pdf.setFontSize(8); pdf.setTextColor(...INK); pdf.setFont('helvetica', 'normal');
  pdf.text(`${BRAND.phones.join('  /  ')}  -  ${BRAND.email}`, M, 284);
  pdf.setTextColor(...GOLD); pdf.setFont('helvetica', 'bold');
  pdf.textWithLink('> Envoyer cette fiche sur WhatsApp', W - M - 58, 284, { url: waLink(whatsappMessage(s)) });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(...MUTED);
  pdf.text("Document indicatif : il ne constitue ni un devis ni un contrat. AMD Design vous recontacte pour etudier votre projet.", M, 290);
  return pdf.output('blob');
}
