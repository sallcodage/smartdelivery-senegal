// Mise en page des rapports PDF (PDFKit) aux couleurs de SmartDelivery.
const PDFDocument = require('pdfkit');

const VERT = '#16a34a';
const NUIT = '#0b1c14';
const GRIS = '#64748b';
const FOND = '#f4f6f5';
const MARGE = 50;

const nombre = (n) => (n == null ? '—' : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
const fcfa = (n) => (n == null ? '—' : `${nombre(n)} FCFA`);
const pourcent = (n) => (n == null ? '—' : `${String(n).replace('.', ',')} %`);
const decimal = (n, d = 1) => (n == null ? '—' : String(Math.round(n * 10 ** d) / 10 ** d).replace('.', ','));
const duree = (min) => (min == null ? '—' : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`);
const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Dakar' });

function nouveauDocument(titre) {
  return new PDFDocument({
    size: 'A4', margin: MARGE, bufferPages: true,
    info: { Title: titre, Author: 'SmartDelivery Sénégal', Creator: 'SmartDelivery (PDFKit)' },
  });
}

const largeurUtile = (doc) => doc.page.width - 2 * MARGE;

function verifierPlace(doc, hauteur) {
  if (doc.y + hauteur > doc.page.height - MARGE - 30) doc.addPage();
}

// Logo dessiné (épingle verte), sans fichier image
function logo(doc, x, y) {
  doc.save().translate(x, y).scale(0.5);
  doc.path('M32 3C19 3 8.5 13.3 8.5 26.1 8.5 43.6 32 61 32 61s23.5-17.4 23.5-34.9C55.5 13.3 45 3 32 3z').fill(VERT);
  doc.circle(32, 26, 15).fill('#ffffff');
  doc.roundedRect(22.5, 17.5, 9, 8, 2).fill(VERT);
  doc.circle(24.5, 34, 3.2).fill(VERT).circle(39.5, 34, 3.2).fill(VERT);
  doc.restore();
}

function entete(doc, { titre, periode, generation, auteur }) {
  doc.rect(0, 0, doc.page.width, 110).fill(NUIT);
  logo(doc, MARGE, 28);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text('SmartDelivery', MARGE + 40, 34, { continued: true })
    .fillColor('#34c06c').text(' Sénégal');
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9).text('Plateforme de livraison · Rapport généré automatiquement', MARGE + 40, 54);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(titre, MARGE, 78);
  doc.fillColor(NUIT).font('Helvetica').fontSize(10);
  doc.y = 128;
  doc.text(`Période : ${periode}`, MARGE).text(`Généré le ${generation} par ${auteur}`, { continued: false });
  doc.moveDown(1);
}

function section(doc, titre) {
  verifierPlace(doc, 60);
  doc.moveDown(0.6);
  doc.fillColor(VERT).font('Helvetica-Bold').fontSize(13).text(titre, MARGE);
  const y = doc.y + 2;
  doc.moveTo(MARGE, y).lineTo(MARGE + largeurUtile(doc), y).lineWidth(1).strokeColor('#a7eabf').stroke();
  doc.moveDown(0.6).fillColor(NUIT).font('Helvetica').fontSize(10);
}

// Grille d'indicateurs : [{ libelle, valeur }] sur 3 colonnes
function grilleKpi(doc, cartes) {
  const colonnes = 3; const ecart = 10;
  const largeur = (largeurUtile(doc) - ecart * (colonnes - 1)) / colonnes; const hauteur = 52;
  for (let i = 0; i < cartes.length; i += colonnes) {
    verifierPlace(doc, hauteur + ecart);
    const y = doc.y;
    cartes.slice(i, i + colonnes).forEach((c, j) => {
      const x = MARGE + j * (largeur + ecart);
      doc.roundedRect(x, y, largeur, hauteur, 6).fill(FOND);
      doc.fillColor(NUIT).font('Helvetica-Bold').fontSize(15).text(c.valeur, x + 10, y + 9, { width: largeur - 20 });
      doc.fillColor(GRIS).font('Helvetica').fontSize(8.5).text(c.libelle, x + 10, y + 31, { width: largeur - 20 });
    });
    doc.y = y + hauteur + ecart;
  }
  doc.x = MARGE;
}

// Tableau avec en-tête vert, lignes alternées et saut de page automatique
function tableau(doc, colonnes, lignes) {
  const total = colonnes.reduce((t, c) => t + c.largeur, 0);
  const echelle = largeurUtile(doc) / total;
  const larg = colonnes.map((c) => c.largeur * echelle);
  const hauteur = 20;
  const ligneEntete = () => {
    const y = doc.y;
    doc.rect(MARGE, y, largeurUtile(doc), hauteur).fill(VERT);
    let x = MARGE;
    colonnes.forEach((c, i) => {
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5).text(c.titre, x + 5, y + 6, { width: larg[i] - 10, align: c.align || 'left', lineBreak: false, ellipsis: true });
      x += larg[i];
    });
    doc.y = y + hauteur;
  };
  verifierPlace(doc, hauteur * 3);
  ligneEntete();
  if (!lignes.length) {
    doc.fillColor(GRIS).font('Helvetica-Oblique').fontSize(9).text('Aucune donnée sur cette période.', MARGE + 5, doc.y + 6);
    doc.moveDown(1);
    return;
  }
  lignes.forEach((ligne, k) => {
    if (doc.y + hauteur > doc.page.height - MARGE - 30) { doc.addPage(); ligneEntete(); }
    const y = doc.y;
    if (k % 2) doc.rect(MARGE, y, largeurUtile(doc), hauteur).fill(FOND);
    let x = MARGE;
    ligne.forEach((v, i) => {
      doc.fillColor(NUIT).font('Helvetica').fontSize(8.5).text(String(v ?? '—'), x + 5, y + 6, { width: larg[i] - 10, align: colonnes[i].align || 'left', lineBreak: false, ellipsis: true });
      x += larg[i];
    });
    doc.y = y + hauteur;
  });
  doc.x = MARGE;
  doc.moveDown(0.5);
}

// Histogramme simple : [{ libelle, valeur }]
function histogramme(doc, donnees, { legende, formater = nombre } = {}) {
  const hauteur = 150; const largeur = largeurUtile(doc);
  verifierPlace(doc, hauteur + 40);
  const y0 = doc.y; const max = Math.max(1, ...donnees.map((d) => d.valeur));
  const pas = largeur / Math.max(1, donnees.length); const barre = Math.max(2, Math.min(28, pas * 0.65));
  doc.moveTo(MARGE, y0 + hauteur).lineTo(MARGE + largeur, y0 + hauteur).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
  const etiquetteTous = Math.ceil(donnees.length / 10);
  donnees.forEach((d, i) => {
    const h = (d.valeur / max) * (hauteur - 15);
    const x = MARGE + i * pas + (pas - barre) / 2;
    if (h > 0) doc.rect(x, y0 + hauteur - h, barre, h).fill(VERT);
    if (d.valeur > 0 && donnees.length <= 16) {
      doc.fillColor(NUIT).fontSize(7).text(formater(d.valeur), x - 15, y0 + hauteur - h - 10, { width: barre + 30, align: 'center' });
    }
    if (i % etiquetteTous === 0) doc.fillColor(GRIS).fontSize(7).text(d.libelle, MARGE + i * pas - 10, y0 + hauteur + 4, { width: pas + 20, align: 'center' });
  });
  doc.y = y0 + hauteur + 18;
  if (legende) doc.fillColor(GRIS).font('Helvetica-Oblique').fontSize(8).text(legende, MARGE);
  doc.x = MARGE;
  doc.moveDown(0.5).font('Helvetica');
}

function paragraphes(doc, lignes) {
  lignes.forEach((t) => {
    verifierPlace(doc, 30);
    doc.fillColor(NUIT).font('Helvetica').fontSize(10).text(`•  ${t}`, MARGE, doc.y, { width: largeurUtile(doc), lineGap: 2 });
    doc.moveDown(0.3);
  });
}

// Pied de page sur toutes les pages (numérotation « Page x / y »)
function piedsDePage(doc) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const bas = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // écrire dans la marge sans créer de nouvelle page
    doc.fillColor(GRIS).font('Helvetica').fontSize(8)
      .text('SmartDelivery Sénégal · Données issues de la base PostgreSQL de la plateforme', MARGE, doc.page.height - 35, { lineBreak: false })
      .text(`Page ${i + 1} / ${count}`, MARGE, doc.page.height - 35, { width: largeurUtile(doc), align: 'right', lineBreak: false });
    doc.page.margins.bottom = bas;
  }
}

module.exports = {
  nouveauDocument, entete, section, grilleKpi, tableau, histogramme, paragraphes, piedsDePage,
  format: { nombre, fcfa, pourcent, decimal, duree, dateFr },
};
